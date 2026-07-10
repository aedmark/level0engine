//Environment.js
// LEVEL 0 ENVIRONMENT & MEMORY MANAGER

import ProceduralTextureFactory from './ProceduralTextureFactory.js';

class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.chunkMap = new Map();
        this.queryId = 0;
        this.queryCache = [];
    }

    insert(box) {
        const startX = Math.floor(box.min.x / this.cellSize);
        const startZ = Math.floor(box.min.z / this.cellSize);
        const endX = Math.floor(box.max.x / this.cellSize);
        const endZ = Math.floor(box.max.z / this.cellSize);

        if (box.chunkHash) {
            if (!this.chunkMap.has(box.chunkHash)) this.chunkMap.set(box.chunkHash, new Set());
            this.chunkMap.get(box.chunkHash).add(box);
        }

        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                const key = (x << 16) | (z & 0xFFFF);
                if (!this.cells.has(key)) this.cells.set(key, new Set());
                this.cells.get(key).add(box);
            }
        }
    }

    removeByChunk(chunkHash) {
        const boxes = this.chunkMap.get(chunkHash);
        if (!boxes) return;

        for (const box of boxes) {
            const startX = Math.floor(box.min.x / this.cellSize);
            const startZ = Math.floor(box.min.z / this.cellSize);
            const endX = Math.floor(box.max.x / this.cellSize);
            const endZ = Math.floor(box.max.z / this.cellSize);

            for (let x = startX; x <= endX; x++) {
                for (let z = startZ; z <= endZ; z++) {
                    const key = (x << 16) | (z & 0xFFFF);
                    const cell = this.cells.get(key);
                    if (cell) {
                        cell.delete(box);
                        if (cell.size === 0) this.cells.delete(key);
                    }
                }
            }
        }
        this.chunkMap.delete(chunkHash);
    }

    getNearby(x, z, radius) {
        this.queryCache.length = 0;
        this.queryId++;
        const startX = Math.floor((x - radius) / this.cellSize);
        const startZ = Math.floor((z - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const endZ = Math.floor((z + radius) / this.cellSize);
        for (let cx = startX; cx <= endX; cx++) {
            for (let cz = startZ; cz <= endZ; cz++) {
                const key = (cx << 16) | (cz & 0xFFFF);
                const cell = this.cells.get(key);
                if (cell) {
                    for (const box of cell) {
                        if (box._queryId !== this.queryId) {
                            box._queryId = this.queryId;
                            this.queryCache.push(box);
                        }
                    }
                }
            }
        }
        return this.queryCache;
    }
}

export default class Environment {
    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.lightPool = [];
        this.fixtureData = [];
        this.maxActiveLights = 40;
        this.spatialGrid = new SpatialHashGrid(4);
        this.wallBoxes = [];
        this.chunkSize = 16;
        this.renderDistance = 1;
        this.activeChunks = new Map();
        this.currentChunkCoords = {x: null, z: null};
        this.interactiveDoors = [];
        this.localFixtures = [];
        this.lastAudioOcclusionTime = 0;
        this.currentOcclusionState = false;
        this.chunkQueue = [];
        this.isBuildingChunk = false;
        this.isSpawning = false;
    }

    updateChunks(playerPos) {
        const chunkX = Math.floor(playerPos.x / (this.chunkSize * 4));
        const chunkZ = Math.floor(playerPos.z / (this.chunkSize * 4));
        if (this.currentChunkCoords.x === chunkX && this.currentChunkCoords.z === chunkZ) return;
        this.currentChunkCoords.x = chunkX;
        this.currentChunkCoords.z = chunkZ;
        if (this.floor && this.ceiling) {
            const shiftX = chunkX * (this.chunkSize * 4);
            const shiftZ = chunkZ * (this.chunkSize * 4);
            this.floor.position.set(shiftX, 0, shiftZ);
            this.ceiling.position.set(shiftX, 3, shiftZ);
        }
        const chunksToKeep = new Set();
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const targetX = chunkX + x;
                const targetZ = chunkZ + z;
                const hash = `${targetX},${targetZ}`;
                chunksToKeep.add(hash);
                if (!this.activeChunks.has(hash) && !this.chunkQueue.some(q => q.hash === hash)) {
                    this.chunkQueue.push({ x: targetX, z: targetZ, hash: hash });
                }
            }
        }

        this.processChunkQueue();

        for (const [hash, chunkGroup] of this.activeChunks.entries()) {
            if (!chunksToKeep.has(hash)) {
                this.scene.remove(chunkGroup);
                chunkGroup.traverse((child) => {
                    if (child.isInstancedMesh) child.dispose();
                    if (child.geometry && !this.sharedAssets.has(child.geometry.uuid) && !this.geoCache.has(child.geometry.uuid)) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(m => {
                            if (!this.sharedAssets.has(m.uuid)) m.dispose();
                        });
                    }
                });
                this.activeChunks.delete(hash);
                this.walls = this.walls.filter(w => w.userData.chunkHash !== hash);
                this.fixtureData = this.fixtureData.filter(f => f.chunkHash !== hash);
                this.spatialGrid.removeByChunk(hash);
                this.interactiveDoors = this.interactiveDoors.filter(d => d.userData.chunkHash !== hash);
            }
        }
    }

    updateInteractives(playerPos, delta) {
        this.interactiveDoors.forEach(door => {
            const pDistSq = playerPos.distanceToSquared(door.position);
            const eDistSq = this.entityActive ? this.entityGroup.position.distanceToSquared(door.position) : Infinity;
            const playerOpen = pDistSq < 12.25;
            const entityOpen = eDistSq < 16.0;
            const isOpen = playerOpen || entityOpen;
            let targetRot = door.userData.closedRot;
            if (isOpen) {
                if (!door.userData.isLatched) {
                    if (door.userData.swingConstraint === undefined) {
                        door.userData.swingConstraint = 0;
                        const cx = door.position.x;
                        const cz = door.position.z;

                        const localBoxes = this.spatialGrid.getNearby(cx, cz, 2.0);

                        const testBoxNegZ = new THREE.Box3(new THREE.Vector3(cx - 0.1, 0, cz - 1.4), new THREE.Vector3(cx + 0.1, 3.0, cz));
                        const testBoxPosZ = new THREE.Box3(new THREE.Vector3(cx - 0.1, 0, cz), new THREE.Vector3(cx + 0.1, 3.0, cz + 1.4));

                        let blockNegZ = false;
                        let blockPosZ = false;

                        for (let i = 0; i < localBoxes.length; i++) {
                            const b = localBoxes[i];
                            if (b === door.userData.box) continue;
                            if (b.intersectsBox(testBoxNegZ)) blockNegZ = true;
                            if (b.intersectsBox(testBoxPosZ)) blockPosZ = true;
                        }

                        if (blockNegZ && !blockPosZ) door.userData.swingConstraint = -(Math.PI / 2);
                        else if (blockPosZ && !blockNegZ) door.userData.swingConstraint = (Math.PI / 2);
                    }

                    const triggerZ = (entityOpen && !playerOpen) ? this.entityGroup.position.z : playerPos.z;
                    const approachZ = triggerZ - door.position.z;

                    let desiredRot = approachZ < 0 ? -(Math.PI / 2) : (Math.PI / 2);

                    if (door.userData.swingConstraint !== 0) desiredRot = door.userData.swingConstraint;

                    door.userData.latchedRot = desiredRot;
                    door.userData.isLatched = true;
                    door.userData.swingSpeed = (entityOpen && !playerOpen) ? 35.0 : 8.0;
                    const intensity = (entityOpen && !playerOpen) ? 1.0 : 0.25;
                    document.dispatchEvent(new CustomEvent('somatic-door', { detail: { distSq: pDistSq, intensity: intensity } }));
                }
                targetRot = door.userData.latchedRot;
            } else {
                door.userData.isLatched = false;
                door.userData.swingSpeed = 8.0;
            }
            door.userData.currentRot += (targetRot - door.userData.currentRot) * door.userData.swingSpeed * delta;
            door.rotation.y = door.userData.currentRot;
            if (door.userData.box) {
                if (isOpen) {
                    door.userData.box.makeEmpty();
                } else {
                    door.updateMatrixWorld();
                    if (!door.userData.baseBox) {
                        door.geometry.computeBoundingBox();
                        door.userData.baseBox = door.geometry.boundingBox.clone();
                    }
                    door.userData.box.copy(door.userData.baseBox).applyMatrix4(door.matrixWorld);
                }
            }
        });
    }

    async processChunkQueue() {
        if (this.isBuildingChunk) return;
        if (this.chunkQueue.length === 0) {
            if (this.isSpawning) {
                this.isSpawning = false;
                const flash = document.getElementById('flash-overlay');
                if (flash) {
                    flash.style.transition = 'opacity 2.0s ease-in';
                    flash.style.opacity = '0';
                    setTimeout(() => {
                        if (flash.style.opacity === '0') flash.style.backgroundColor = '#fff';
                    }, 2050);
                }
            }
            return;
        }

        this.isBuildingChunk = true;
        const chunk = this.chunkQueue.shift();
        const currentX = Math.floor(this.camera.position.x / (this.chunkSize * 4));
        const currentZ = Math.floor(this.camera.position.z / (this.chunkSize * 4));
        if (Math.abs(chunk.x - currentX) <= this.renderDistance && Math.abs(chunk.z - currentZ) <= this.renderDistance) {
            await this.buildChunk(chunk.x, chunk.z, chunk.hash);
        }
        this.isBuildingChunk = false;
        this.processChunkQueue();
    }

    setup() {
        const assets = ProceduralTextureFactory.generateAssets();
        Object.assign(this, assets);
        const {carpetTexture, ceilingTexture} = assets;
        carpetTexture.repeat.set(75, 75);
        const floorGeo = new THREE.PlaneGeometry(300, 300);
        const floorMat = new THREE.MeshStandardMaterial({map: carpetTexture, roughness: 1.0, bumpMap: carpetTexture, bumpScale: 0.015});
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
        ceilingTexture.repeat.set(300, 300);
        const ceilGeo = new THREE.PlaneGeometry(300, 300);
        const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTexture, roughness: 0.9, bumpMap: ceilingTexture, bumpScale: 0.01});
        this.ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        this.ceiling.rotation.x = Math.PI / 2;
        this.ceiling.position.y = 3;
        this.scene.add(this.ceiling);
        const dustGeo = new THREE.BufferGeometry();
        const dustCount = 600;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount * 3; i++) {
            dustPos[i] = (Math.random() - 0.5) * 30.0;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.10,
            depthWrite: false
        });
        this.dustCloud = new THREE.Points(dustGeo, dustMat);
        this.scene.add(this.dustCloud);
        for (let i = 0; i < this.maxActiveLights; i++) {
            const radius = i < 10 ? 20 : 30;
            const light = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            if (i < 10) {
                light.castShadow = true;
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 20;
                light.shadow.bias = -0.0001;
                light.shadow.normalBias = 0.05;
            }
            this.scene.add(light);
            this.lightPool.push(light);
        }
        this.entityGroup = new THREE.Group();
        const nullMat = new THREE.MeshBasicMaterial({color: 0x000000});
        const coreGeo = new THREE.IcosahedronGeometry(0.6, 0);
        this.entityCore = new THREE.Mesh(coreGeo, nullMat);
        this.entityGroup.add(this.entityCore);
        this.entityShards = [];
        for (let i = 0; i < 4; i++) {
            const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.2, 0), nullMat);
            this.entityShards.push({
                mesh: shard,
                speed: Math.random() * 2.0 + 1.0,
                offset: Math.random() * Math.PI * 2
            });
            this.entityGroup.add(shard);
        }
        this.scene.add(this.entityGroup);
        this.entityActive = false;
        this.entityTarget = new THREE.Vector3();

        this.tagPool = [];
        this.tagIndex = 0;
        this.tagGroup = new THREE.Group();
        for(let i = 0; i < 50; i++) {
            const tag = new THREE.Mesh(this.tagGeo, this.tagMat);
            tag.visible = false;
            this.tagGroup.add(tag);
            this.tagPool.push(tag);
        }
        this.scene.add(this.tagGroup);

        this.scene.add(this.camera);
        this.flashlight = new THREE.SpotLight(0xffe8b3, 0.0, 45.0, Math.PI / 7, 0.5, 2.0);
        this.flashlight.position.set(0.3, -0.3, 0);
        this.flashlight.target.position.set(0.3, -0.3, -1);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 512;
        this.flashlight.shadow.mapSize.height = 512;
        this.flashlight.shadow.camera.near = 0.1;
        this.flashlight.shadow.camera.far = 45;
        this.flashlight.shadow.bias = -0.002;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.baseFogDensity = 0.05;
        this.generate();
        const toggleBtn = document.getElementById('menuToggleBtn');
        const toggleMenu = (e) => {
            e.preventDefault();
            const panel = document.querySelector('.control-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };
        toggleBtn.addEventListener('pointerdown', toggleMenu);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') toggleMenu(e);
        });
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generate();
        });
        document.getElementById('fogSlider').addEventListener('input', (e) => {
            this.baseFogDensity = e.target.value / 100;
        });
        document.getElementById('fovSlider').addEventListener('input', (e) => {
            this.camera.fov = Number(e.target.value);
            this.camera.updateProjectionMatrix();
        });
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.player.speedMultiplier = Number(e.target.value) / 100;
        });
        document.getElementById('aspectSelect').addEventListener('change', (e) => {
            const val = e.target.value;
            this.engine.aspectRatio = val === 'auto' ? 'auto' : parseFloat(val);
            this.engine.resize();
        });
        document.getElementById('resolutionSelect').addEventListener('change', (e) => {
            this.engine.resolutionScale = parseFloat(e.target.value);
            this.engine.resize();
        });
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            if (window.acoustics) window.acoustics.setVolume(Number(e.target.value) / 100);
        });
        document.getElementById('gammaSlider').addEventListener('input', (e) => {
            this.engine.renderer.toneMappingExposure = Number(e.target.value) / 100;
        });
        document.getElementById('headBobToggle').addEventListener('change', (e) => {
            this.player.enableHeadBob = e.target.checked;
        });
        const capture = () => {
            const flash = document.getElementById('flash-overlay');
            if (!flash) return;
            flash.style.transition = 'none';
            flash.style.backgroundColor = '#fff';
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.transition = 'opacity 0.8s ease-out';
                flash.style.opacity = '0';
            }, 50);
            setTimeout(() => this.captureAsset(), 10);
        };
        document.getElementById('captureBtn').addEventListener('click', capture);
        document.addEventListener('capture-screenshot', capture);

        this.tagRaycaster = new THREE.Raycaster();
        document.addEventListener('somatic-tag', () => {
            this.tagRaycaster.set(this.camera.position, this.camera.getWorldDirection(new THREE.Vector3()));
            const intersects = this.tagRaycaster.intersectObjects(this.walls, false);

            if (intersects.length > 0 && intersects[0].distance < 3.0) {
                const hit = intersects[0];
                const tag = this.tagPool[this.tagIndex];
                tag.visible = true;
                tag.position.copy(hit.point);

                let normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);

                if (hit.object && hit.object.isInstancedMesh && hit.instanceId !== undefined) {
                    const instanceMatrix = new THREE.Matrix4();
                    hit.object.getMatrixAt(hit.instanceId, instanceMatrix);
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(instanceMatrix);
                    normal.applyMatrix3(normalMatrix).normalize();
                } else if (hit.object) {
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    normal.applyMatrix3(normalMatrix).normalize();
                }

                tag.lookAt(hit.point.clone().add(normal));
                tag.rotateZ((Math.random() - 0.5) * 0.4);

                this.tagIndex = (this.tagIndex + 1) % this.tagPool.length;
            }
        });
    }

    generate(isWarp = false) {
        const flash = document.getElementById('flash-overlay');
        if (flash) {
            flash.style.transition = 'none';
            flash.style.backgroundColor = '#000';
            flash.style.opacity = '1';
        }
        this.isSpawning = true;
        this.activeChunks.forEach((chunkGroup) => {
            this.scene.remove(chunkGroup);
            chunkGroup.traverse((child) => {
                if (child.isInstancedMesh) child.dispose();
                if (child.geometry && !this.sharedAssets.has(child.geometry.uuid) && (!this.geoCache || !this.geoCache.has(child.geometry.uuid))) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(m => {
                        if (!this.sharedAssets.has(m.uuid)) m.dispose();
                    });
                }
            });
        });
        this.activeChunks.clear();
        this.walls = [];
        this.fixtureData = [];
        this.spatialGrid.cells.clear();
        this.currentChunkCoords = {x: null, z: null};

        if (this.tagPool) {
            this.tagPool.forEach(tag => tag.visible = false);
            this.tagIndex = 0;
        }
        this.chunkQueue = [];
        this.isBuildingChunk = false;
        this.player.velocity.set(0, 0, 0);
        this.entityActive = true;
        this.entityBreadcrumbs = [];
        this.entityBacktrackTimer = 0;
        this.breadcrumbTimer = 0;

        if (isWarp) {
            const signX = Math.random() > 0.5 ? 1 : -1;
            const signZ = Math.random() > 0.5 ? 1 : -1;
            const warpX = this.camera.position.x + (signX * (1500 + Math.random() * 2000));
            const warpZ = this.camera.position.z + (signZ * (1500 + Math.random() * 2000));
            this.camera.position.set(warpX, 1.6, warpZ);
            this.entityGroup.position.set(warpX + 32, 1.5, warpZ + 32);
            this.entityTarget.copy(this.entityGroup.position);
        } else {
            this.camera.position.set(0, 1.6, 0);
            this.entityGroup.position.set(32, 1.5, 32);
            this.entityTarget.copy(this.entityGroup.position);

            const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
            this.baseSeed = 0;
            for (let i = 0; i < seedString.length; i++) {
                this.baseSeed = ((this.baseSeed << 5) - this.baseSeed) + seedString.charCodeAt(i);
                this.baseSeed |= 0;
            }
        }
        this.cellSize = 4;
        if (!this.sharedWallGeo) {
            this.sharedWallGeo = new THREE.BoxGeometry(this.cellSize + 0.02, 3, this.cellSize + 0.02);
            this.sharedWallMat = new THREE.MeshStandardMaterial({
                map: this.wallTexture,
                color: 0xffffff,
                roughness: 0.6,
                bumpMap: this.wallTexture,
                bumpScale: 0.010
            });
            this.sharedPanelGeo = new THREE.BoxGeometry(0.98, 0.05, 1.98);
            this.pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, this.cellSize, 8);
            this.pipeGeo.rotateZ(Math.PI / 2);
            this.pipeJointGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8);
            this.pipeJointGeo.rotateZ(Math.PI / 2);
            this.pipeJunctionGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
            this.pipeMountGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
            this.vPipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8);
            this.rustMat = new THREE.MeshStandardMaterial({
                color: 0x6b6358,
                emissive: 0x222222,
                roughness: 0.4,
                metalness: 0.85,
                bumpMap: this.structMat.map,
                bumpScale: 0.015
            });
            this.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
            this.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
            this.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            this.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
            this.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
            this.wallVentMat = this.ventMat.clone();
            this.wallVentMat.map = this.ventMat.map.clone();
            this.wallVentMat.map.repeat.set(2, 0.5);
            this.geoCache = new Map();
            this.sharedAssets = new Set();
            Object.values(this).forEach(v => {
                if (v && v.isGeometry) this.sharedAssets.add(v.uuid);
                if (v && v.isMaterial) this.sharedAssets.add(v.uuid);
            });
        }
    }

    async buildChunk(chunkX, chunkZ, hash) {
        const chunkGroup = new THREE.Group();
        this.scene.add(chunkGroup);
        this.activeChunks.set(hash, chunkGroup);

        let prngSeed = (this.baseSeed + (chunkX * 104729) + (chunkZ * 1299827)) >>> 0;
        const random = () => {
            prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
            return prngSeed / 4294967296.0;
        };
        const cx = Math.sin(this.baseSeed) * 0.8;
        const cy = Math.cos(this.baseSeed * 0.5) * 0.8;
        const buildWall = (w, d, mat, h = 3.0) => {
            const key = `${w}_${h}_${d}`;
            let geo = this.geoCache.get(key);
            if (!geo) {
                geo = new THREE.BoxGeometry(w + 0.02, h, d + 0.02);
                const uv = geo.attributes.uv;
                for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (d / this.cellSize));
                for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (w / this.cellSize));
                if (h !== 3.0) {
                    for (let i = 8; i < 16; i++) uv.setY(i, uv.getY(i) * (h / 3.0));
                }
                this.geoCache.set(key, geo);
                this.geoCache.set(geo.uuid, true);
            }
            return new THREE.Mesh(geo, mat);
        };
        const stagingMeshes = [];
        const addGeometry = (mesh, isWarp = false) => {
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            box.chunkHash = hash;
            if (mesh.userData.isEntityBlocker) box.isEntityBlocker = true;
            if (isWarp) box.isWarpZone = true;
            this.spatialGrid.insert(box);
            stagingMeshes.push(mesh);
        };
        const addFurniture = (group) => {
            if (Math.abs(group.position.x) < 4.0 && Math.abs(group.position.z) < 4.0) return;
            group.userData.chunkHash = hash;
            group.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(group);
            box.chunkHash = hash;
            this.spatialGrid.insert(box);
            group.traverse((child) => {
                if (child.isMesh) {
                    child.userData.chunkHash = hash;
                    child.updateMatrixWorld(true);
                    stagingMeshes.push(child);
                }
            });
        };
        const buildChair = (x, y, z, rotY) => {
            const group = new THREE.Group();
            const seat = new THREE.Mesh(this.cushionGeo, this.fabricMat);
            seat.position.set(0, 0.4, 0);
            group.add(seat);
            const back = new THREE.Mesh(this.backrestGeo, this.fabricMat);
            back.position.set(0, 0.8, -0.3);
            group.add(back);
            const l1 = new THREE.Mesh(this.legGeo, this.structMat);
            l1.position.set(0.3, 0.2, 0.3);
            group.add(l1);
            const l2 = new THREE.Mesh(this.legGeo, this.structMat);
            l2.position.set(-0.3, 0.2, 0.3);
            group.add(l2);
            const l3 = new THREE.Mesh(this.legGeo, this.structMat);
            l3.position.set(0.3, 0.2, -0.3);
            group.add(l3);
            const l4 = new THREE.Mesh(this.legGeo, this.structMat);
            l4.position.set(-0.3, 0.2, -0.3);
            group.add(l4);
            group.position.set(x, y, z);
            group.rotation.y = rotY;
            return group;
        };
        const buildTable = (x, y, z) => {
            const group = new THREE.Group();
            const top = new THREE.Mesh(this.tableTopGeo, this.woodMat);
            top.position.set(0, 0.8, 0);
            group.add(top);
            const base = new THREE.Mesh(this.tableBaseGeo, this.structMat);
            base.position.set(0, 0.4, 0);
            group.add(base);
            group.position.set(x, y, z);
            return group;
        };
        const structuralMatrix = [
            {
                prob: 0.95, build: (x, z) => {
                    const pillar = buildWall(0.5 + (random() * 2.0), 0.5 + (random() * 2.0), this.sharedWallMat);
                    pillar.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(pillar);
                }
            },
            {
                prob: 0.92, build: (x, z) => {
                    const colCount = Math.floor(random() * 3) + 2;
                    for (let i = 0; i < colCount; i++) {
                        const support = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                        const scale = (0.1 + random() * 0.15) / 0.12;
                        support.scale.set(scale, 1, scale);
                        const offsetX = (random() - 0.5) * 2.0;
                        const offsetZ = (random() - 0.5) * 2.0;
                        support.position.set(x * this.cellSize + offsetX, 1.5, z * this.cellSize + offsetZ);
                        support.rotation.y = random() * Math.PI;
                        addGeometry(support);
                    }
                }
            },
            {
                prob: 0.90, build: (x, z) => {
                    const pW = 0.8, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.86, build: (x, z) => {
                    const isZ = random() > 0.5;
                    const pW = 0.6;
                    const offset = (this.cellSize / 2) - (pW / 2);
                    const p1 = buildWall(isZ ? pW : this.cellSize, isZ ? this.cellSize : pW, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - (isZ ? offset : 0), 1.5, z * this.cellSize - (isZ ? 0 : offset));
                    addGeometry(p1);
                    const p2 = buildWall(isZ ? pW : this.cellSize, isZ ? this.cellSize : pW, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + (isZ ? offset : 0), 1.5, z * this.cellSize + (isZ ? 0 : offset));
                    addGeometry(p2);
                    const header = buildWall(isZ ? this.cellSize - (pW*2) : this.cellSize, isZ ? this.cellSize : this.cellSize - (pW*2), this.headerMat, 0.8);
                    header.position.set(x * this.cellSize, 2.6, z * this.cellSize);
                    addGeometry(header);
                }
            },
            {
                prob: 0.82, build: (x, z) => {
                    const pW = 1.2, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                    const frameMat = this.structMat;
                    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.65, 0.32), frameMat);
                    jambL.position.set(x * this.cellSize - 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambL);
                    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.65, 0.32), frameMat);
                    jambR.position.set(x * this.cellSize + 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambR);
                    const jambT = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.32), frameMat);
                    jambT.position.set(x * this.cellSize, 2.70, z * this.cellSize + 1.85);
                    addGeometry(jambT);
                    const doorGeo = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                    doorGeo.translate(0.7, 0, 0);
                    const door = new THREE.Mesh(doorGeo, this.doorMat);
                    door.position.set(x * this.cellSize - 0.7, 1.325, z * this.cellSize + 1.85);
                    door.castShadow = door.receiveShadow = true;
                    door.userData = {
                        chunkHash: hash,
                        closedRot: 0,
                        currentRot: 0
                    };
                    chunkGroup.add(door);
                    this.interactiveDoors.push(door);
                    this.walls.push(door);
                    door.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(door);
                    dBox.chunkHash = hash;
                    door.userData.box = dBox;
                    this.spatialGrid.insert(dBox);
                }
            },
            {
                prob: 0.74, build: (x, z) => {
                    const dir = Math.floor(random() * 2), offset = (this.cellSize / 2) - 0.25;
                    const w1 = dir === 0 ? 0.5 : this.cellSize, d1 = dir === 0 ? this.cellSize : 0.5;
                    const gapW = dir === 0 ? this.cellSize - 1.0 : this.cellSize,
                        gapD = dir === 0 ? this.cellSize : this.cellSize - 1.0;
                    const p1 = buildWall(w1, d1, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - (dir === 0 ? offset : 0), 1.5, z * this.cellSize - (dir === 1 ? offset : 0));
                    addGeometry(p1);
                    const p2 = buildWall(w1, d1, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + (dir === 0 ? offset : 0), 1.5, z * this.cellSize + (dir === 1 ? offset : 0));
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gapW, 0.3, gapD), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.65, build: (x, z) => {
                    const w1 = buildWall(this.cellSize, 0.5, this.sharedWallMat);
                    w1.position.set(x * this.cellSize, 1.5, z * this.cellSize - (this.cellSize / 2) + 0.25);
                    addGeometry(w1);
                    const w2 = buildWall(0.5, this.cellSize, this.sharedWallMat);
                    w2.position.set(x * this.cellSize - (this.cellSize / 2) + 0.25, 1.5, z * this.cellSize);
                    addGeometry(w2);
                    if (random() > 0.6) {
                        const table = buildTable(x * this.cellSize + 0.5, 0, z * this.cellSize + 0.5);
                        addFurniture(table);
                    }
                }
            },
            {
                prob: 0.60, build: (x, z) => {
                    const isZ = random() > 0.5;
                    const halfWall = buildWall(isZ ? 0.2 : this.cellSize, isZ ? this.cellSize : 0.2, this.fabricMat, 1.2);
                    halfWall.position.set(x * this.cellSize, 0.6, z * this.cellSize);
                    addGeometry(halfWall);
                    if (random() > 0.4) {
                        const desk = buildTable(x * this.cellSize + (isZ ? 0.8 : 0), 0, z * this.cellSize + (isZ ? 0 : 0.8));
                        addFurniture(desk);
                    }
                }
            },
            {
                prob: 0.55, build: (x, z) => {
                    const back = buildWall(this.cellSize, 0.5, this.sharedWallMat);
                    back.position.set(x * this.cellSize, 1.5, z * this.cellSize - (this.cellSize / 2) + 0.25);
                    addGeometry(back);
                    const side = buildWall(0.5, this.cellSize / 2, this.sharedWallMat);
                    side.position.set(x * this.cellSize - (this.cellSize / 2) + 0.25, 1.5, z * this.cellSize - (this.cellSize / 4));
                    addGeometry(side);
                    if (random() > 0.5) {
                        const rot = random() > 0.5 ? -Math.PI / 2 : Math.PI / 2;
                        const chair = buildChair(x * this.cellSize + 0.5, 0, z * this.cellSize - 0.5, rot);
                        addFurniture(chair);
                    }
                }
            },
            {
                prob: 0.48, build: (x, z) => {
                    if (random() > 0.25) return;
                    const isMagic = random() > 0.75;
                    const dir = Math.floor(random() * 4);
                    const isZ = dir % 2 === 0;
                    const w1 = buildWall(isZ ? 0.5 : this.cellSize, isZ ? this.cellSize : 0.5, this.sharedWallMat);
                    w1.position.set(x * this.cellSize + (isZ ? -(this.cellSize / 2) + 0.25 : 0), 1.5, z * this.cellSize + (isZ ? 0 : -(this.cellSize / 2) + 0.25));
                    addGeometry(w1);
                    const w2 = buildWall(isZ ? 0.5 : this.cellSize, isZ ? this.cellSize : 0.5, this.sharedWallMat);
                    w2.position.set(x * this.cellSize + (isZ ? (this.cellSize / 2) - 0.25 : 0), 1.5, z * this.cellSize + (isZ ? 0 : (this.cellSize / 2) - 0.25));
                    addGeometry(w2);
                    const w3 = buildWall(isZ ? this.cellSize : 0.5, isZ ? 0.5 : this.cellSize, this.sharedWallMat);
                    const backOffset = (this.cellSize / 2) - 0.25;
                    const sign = (dir === 2 || dir === 3) ? 1 : -1;
                    w3.position.set(x * this.cellSize + (isZ ? 0 : sign * backOffset), 1.5, z * this.cellSize + (isZ ? sign * backOffset : 0));
                    addGeometry(w3);
                    const stepCount = 10;
                    const stepDepth = (this.cellSize - 0.5) / stepCount;
                    const stepHeight = 3.0 / stepCount;
                    const innerW = this.cellSize - 1.0;
                    for (let s = 0; s < stepCount; s++) {
                        const h = (s + 1) * stepHeight;
                        const wX = isZ ? innerW : stepDepth;
                        const wZ = isZ ? stepDepth : innerW;
                        const step = new THREE.Mesh(new THREE.BoxGeometry(wX, h, wZ), this.structMat);
                        let offset = (this.cellSize / 2) - (stepDepth / 2) - (s * stepDepth);
                        if (dir === 2 || dir === 3) offset = -offset;
                        const posX = x * this.cellSize + (isZ ? 0 : offset);
                        const posZ = z * this.cellSize + (isZ ? offset : 0);
                        step.position.set(posX, h / 2, posZ);
                        const isTopStep = (s === stepCount - 1);
                        addGeometry(step, isMagic && isTopStep);
                    }
                }
            },
            {
                prob: 0.44, build: (x, z) => {
                    const core = buildWall(1.2, 1.2, this.structMat);
                    core.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(core);
                    for(let i = 0; i < 4; i++) {
                        if (random() > 0.2) {
                            const pipe = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                            const px = (i < 2) ? 0.75 : -0.75;
                            const pz = (i % 2 === 0) ? 0.75 : -0.75;
                            pipe.position.set(x * this.cellSize + px, 1.5, z * this.cellSize + pz);
                            addGeometry(pipe);
                        }
                    }
                }
            },
            {
                prob: 0.40, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
                    const ventGeo = new THREE.BoxGeometry(1.2, 0.6, 0.1);
                    const vent = new THREE.Mesh(ventGeo, this.wallVentMat);
                    const face = Math.floor(random() * 4);
                    const offset = (this.cellSize / 2) + 0.02;
                    const heightY = random() > 0.5 ? 2.6 : 0.4;
                    if (face === 0) {
                        vent.position.set(x * this.cellSize, heightY, z * this.cellSize + offset);
                    } else if (face === 1) {
                        vent.position.set(x * this.cellSize, heightY, z * this.cellSize - offset);
                    } else if (face === 2) {
                        vent.rotation.y = Math.PI / 2;
                        vent.position.set(x * this.cellSize + offset, heightY, z * this.cellSize);
                    } else {
                        vent.rotation.y = Math.PI / 2;
                        vent.position.set(x * this.cellSize - offset, heightY, z * this.cellSize);
                    }
                    addGeometry(vent);
                }
            },
            {
                prob: 0.35, build: (x, z) => {
                    const dir = Math.floor(random() * 2);
                    const isZ = dir === 0;
                    const w1 = isZ ? 1.75 : this.cellSize;
                    const d1 = isZ ? this.cellSize : 1.75;
                    const offset = (1.75 / 2) + 0.25;

                    const block1 = buildWall(w1, d1, this.structMat);
                    block1.position.set(x * this.cellSize - (isZ ? offset : 0), 1.5, z * this.cellSize - (isZ ? 0 : offset));
                    block1.userData.isEntityBlocker = true;
                    addGeometry(block1);

                    const block2 = buildWall(w1, d1, this.structMat);
                    block2.position.set(x * this.cellSize + (isZ ? offset : 0), 1.5, z * this.cellSize + (isZ ? 0 : offset));
                    block2.userData.isEntityBlocker = true;
                    addGeometry(block2);
                }
            },
            {
                prob: 0.00, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
                }
            }
        ];
        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        const sectorMatrix = [
            {
                name: "THE POOLROOMS",
                prob: 0.16,
                foundationMat: this.structMat,
                build: (x, z, localX, localZ, maze) => {
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const cPillar = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                        cPillar.position.set(x * this.cellSize + (this.cellSize / 2), 1.5, z * this.cellSize + (this.cellSize / 2));
                        addGeometry(cPillar);

                        const fenceGeoX = new THREE.BoxGeometry(this.cellSize, 3.0, 0.05);
                        const fenceX = new THREE.Mesh(fenceGeoX, this.waterMat);
                        fenceX.position.set(x * this.cellSize, 1.5, z * this.cellSize + (this.cellSize / 2));
                        fenceX.userData.isEntityBlocker = true;
                        addGeometry(fenceX);

                        const fenceGeoZ = new THREE.BoxGeometry(0.05, 3.0, this.cellSize);
                        const fenceZ = new THREE.Mesh(fenceGeoZ, this.waterMat);
                        fenceZ.position.set(x * this.cellSize + (this.cellSize / 2), 1.5, z * this.cellSize);
                        fenceZ.userData.isEntityBlocker = true;
                        addGeometry(fenceZ);
                    } else {
                        if (localX % 3 === 0 && localZ % 3 === 0 && random() > 0.5) {
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xffaa55);
                            activeMat.emissive.setHex(0xffaa55);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.5,
                                baseIntensity: 0.5,
                                targetIntensity: 0.5,
                                currentIntensity: 0.5
                            });
                        }
                    }
                }
            },
            {
                name: "THE CLINIC",
                prob: 0.16,
                foundationMat: this.clinicMat,
                build: (x, z, localX, localZ) => {
                    const isPerimeter = localX === 0 || localX === this.chunkSize - 1 || localZ === 0 || localZ === this.chunkSize - 1;
                    const isDoorway = (localX >= 7 && localX <= 8) || (localZ >= 7 && localZ <= 8);
                    if (isPerimeter && !isDoorway) {
                        const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(wall);
                        return;
                    }
                    if (!isPerimeter && !isDoorway) {
                        if (localX % 2 === 1 && localZ % 2 === 1) {
                            const curtain = new THREE.Mesh(new THREE.BoxGeometry(this.cellSize * 0.9, 2.2, 0.05), this.fabricMat);
                            curtain.position.set(x * this.cellSize, 1.1, z * this.cellSize - 1.8);
                            addGeometry(curtain);
                            const cotFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 2.0), this.structMat);
                            cotFrame.position.set(x * this.cellSize, 0.25, z * this.cellSize);
                            addGeometry(cotFrame);
                            const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 1.9), this.fabricMat);
                            mattress.position.set(x * this.cellSize, 0.575, z * this.cellSize);
                            addGeometry(mattress);
                            const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.08), this.rustMat);
                            pole.position.set(x * this.cellSize + 0.8, 1.0, z * this.cellSize + 0.8);
                            addGeometry(pole);
                            if (random() > 0.3) {
                                const chair = buildChair(x * this.cellSize - 0.8, 0, z * this.cellSize + 0.5, random() * Math.PI);
                                addFurniture(chair);
                            }
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xd0e8ff);
                            activeMat.emissive.setHex(0xa0d0ff);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.6,
                                baseIntensity: 0.5,
                                targetIntensity: 0.5,
                                currentIntensity: 0.5
                            });
                        } else {
                            const clutterRoll = random();
                            if (clutterRoll > 0.65) {
                                const isRotated = random() > 0.5;
                                const screenW = isRotated ? 0.1 : this.cellSize * 0.8;
                                const screenD = isRotated ? this.cellSize * 0.8 : 0.1;
                                const screen = new THREE.Mesh(new THREE.BoxGeometry(screenW, 2.4, screenD), this.fabricMat);
                                screen.position.set(x * this.cellSize, 1.2, z * this.cellSize);
                                addGeometry(screen);
                            } else if (clutterRoll > 0.50) {
                                const boxCount = Math.floor(random() * 3) + 1;
                                for(let i = 0; i < boxCount; i++) {
                                    const mBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), this.woodMat);
                                    mBox.position.set(x * this.cellSize + (random() * 0.4 - 0.2), 0.25 + (i * 0.5), z * this.cellSize + (random() * 0.4 - 0.2));
                                    mBox.rotation.y = random() * Math.PI;
                                    mBox.rotation.x = random() > 0.8 ? Math.PI / 2 : 0;
                                    addGeometry(mBox);
                                }
                            } else if (clutterRoll > 0.40) {
                                const chair = buildChair(x * this.cellSize, 0, z * this.cellSize, random() * Math.PI * 2);
                                addFurniture(chair);
                            }
                        }
                    }
                }
            },
            {
                name: "THE BOARDROOM",
                prob: 0.17,
                foundationMat: this.tileMat,
                build: (x, z, localX, localZ) => {
                    const isPerimeter = localX === 0 || localX === this.chunkSize - 1 || localZ === 0 || localZ === this.chunkSize - 1;
                    const isDoorway = (localX >= 7 && localX <= 8) || (localZ >= 7 && localZ <= 8);
                    if (isPerimeter && !isDoorway) {
                        const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(wall);
                    } else if (!isPerimeter && localX >= 3 && localX <= 12 && (localZ === 7 || localZ === 8)) {
                        const table = buildTable(x * this.cellSize, 0, z * this.cellSize);
                        addFurniture(table);
                        if (localZ === 8) {
                            addFurniture(buildChair(x * this.cellSize, 0, z * this.cellSize + 1.2, 0));
                        }
                        if (localZ === 7) {
                            addFurniture(buildChair(x * this.cellSize, 0, z * this.cellSize - 1.2, Math.PI));
                        }
                        if (localX === 3 && localZ === 7) {
                            addFurniture(buildChair(x * this.cellSize - 1.2, 0, z * this.cellSize + 2.0, -Math.PI / 2));
                        }
                        if (localX === 12 && localZ === 8) {
                            addFurniture(buildChair(x * this.cellSize + 1.2, 0, z * this.cellSize - 2.0, Math.PI / 2));
                        }
                        const activeMat = this.baseLightMat.clone();
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.8,
                            baseIntensity: 0.6,
                            targetIntensity: 0.6,
                            currentIntensity: 0.6
                        });
                    }
                }
            },
            {
                name: "THE ARCHIVE",
                prob: 0.17,
                foundationMat: this.structMat,
                build: (x, z, localX, localZ, maze) => {
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const rack = buildWall(this.cellSize * 0.95, this.cellSize * 0.95, this.structMat);
                        rack.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        rack.userData.isEntityBlocker = true;
                        addGeometry(rack);
                        for (let h = 0.4; h < 2.8; h += 0.6) {
                            if (random() > 0.4) {
                                const boxW = 0.5 + random() * 0.5;
                                const box = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.45, 0.65), this.woodMat);
                                box.position.set(x * this.cellSize + (random() * 0.4 - 0.2), h, z * this.cellSize + (random() * 0.4 - 0.2));
                                box.rotation.y = (random() - 0.5) * 0.5;
                                addGeometry(box);
                            }
                        }
                    } else {
                        if (random() > 0.85) {
                            const activeMat = this.baseBrokenLightMat.clone();
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: true,
                                baseIntensity: 0.1,
                                targetIntensity: 0.1,
                                currentIntensity: 0.1
                            });
                        }
                    }
                }
            },
            {
                name: "THE SERVER FARM",
                prob: 0.17,
                foundationMat: this.ventMat,
                build: (x, z, localX, localZ, maze) => {
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const rack = buildWall(this.cellSize * 0.85, this.cellSize * 0.85, this.serverMat);
                        rack.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        rack.userData.isEntityBlocker = true;
                        addGeometry(rack);
                    } else {
                        const openE = localX < this.chunkSize - 1 ? !maze[localX + 1][localZ] : !maze[localX][localZ];
                        const openS = localZ < this.chunkSize - 1 ? !maze[localX][localZ + 1] : !maze[localX][localZ];
                        const openN = localZ > 0 ? !maze[localX][localZ - 1] : !maze[localX][localZ];
                        const openW = localX > 0 ? !maze[localX - 1][localZ] : !maze[localX][localZ];

                        const offset = 0.9;
                        let hasPipes = false;
                        if (openE) {
                            const pipeE = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeE.position.set(x * this.cellSize + (this.cellSize / 2) + offset, 2.75, z * this.cellSize + offset);
                            addGeometry(pipeE);
                            hasPipes = true;
                        }
                        if (openS) {
                            const pipeS = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeS.rotation.y = Math.PI / 2;
                            pipeS.position.set(x * this.cellSize + offset, 2.75, z * this.cellSize + (this.cellSize / 2) + offset);
                            addGeometry(pipeS);
                            hasPipes = true;
                        }

                        if (hasPipes || openN || openW) {
                            const mount = new THREE.Mesh(this.pipeMountGeo, this.rustMat);
                            mount.position.set(x * this.cellSize + offset, 2.9, z * this.cellSize + offset);
                            addGeometry(mount);
                            if (random() > 0.1) {
                                const junction = new THREE.Mesh(this.pipeJunctionGeo, this.rustMat);
                                junction.position.set(x * this.cellSize + offset, 2.75, z * this.cellSize + offset);
                                addGeometry(junction);
                            }
                        }
                        if (random() > 0.8) {
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xff3333);
                            activeMat.emissive.setHex(0xff0000);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.6,
                                baseIntensity: 0.4,
                                targetIntensity: 0.4,
                                currentIntensity: 0.4
                            });
                        }
                    }
                }
            },
            {
                name: "THE MAINTENANCE SHAFTS",
                prob: 0.08,
                foundationMat: this.ventMat,
                build: (x, z, localX, localZ, maze) => {
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                    } else {
                        if (random() > 0.4) {
                            const isZWall = random() > 0.5;
                            const offset = random() > 0.5 ? 1.8 : -1.8;
                            const trim = new THREE.Mesh(new THREE.BoxGeometry(this.cellSize, 0.1, 0.4), this.hazardMat);
                            if (isZWall) {
                                trim.rotation.y = Math.PI / 2;
                                trim.position.set(x * this.cellSize + offset, 0.05, z * this.cellSize);
                            } else {
                                trim.position.set(x * this.cellSize, 0.05, z * this.cellSize + offset);
                            }
                            addGeometry(trim);
                        }
                        const openE = localX < this.chunkSize - 1 ? !maze[localX + 1][localZ] : !maze[localX][localZ];
                        const openS = localZ < this.chunkSize - 1 ? !maze[localX][localZ + 1] : !maze[localX][localZ];
                        const openN = localZ > 0 ? !maze[localX][localZ - 1] : !maze[localX][localZ];
                        const openW = localX > 0 ? !maze[localX - 1][localZ] : !maze[localX][localZ];

                        const offset = -1.1;
                        let hasPipes = false;
                        if (openE) {
                            const pipeE = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeE.position.set(x * this.cellSize + (this.cellSize / 2) + offset, 2.8, z * this.cellSize + offset);
                            addGeometry(pipeE);
                            hasPipes = true;
                        }
                        if (openS) {
                            const pipeS = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeS.rotation.y = Math.PI / 2;
                            pipeS.position.set(x * this.cellSize + offset, 2.8, z * this.cellSize + (this.cellSize / 2) + offset);
                            addGeometry(pipeS);
                            hasPipes = true;
                        }

                        if (hasPipes || openN || openW) {
                            const mount = new THREE.Mesh(this.pipeMountGeo, this.rustMat);
                            mount.position.set(x * this.cellSize + offset, 2.925, z * this.cellSize + offset);
                            addGeometry(mount);
                            if (random() > 0.1) {
                                const junction = new THREE.Mesh(this.pipeJunctionGeo, this.rustMat);
                                junction.position.set(x * this.cellSize + offset, 2.8, z * this.cellSize + offset);
                                addGeometry(junction);
                            }
                        }
                        if (random() > 0.7) {
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xffaa00);
                            activeMat.emissive.setHex(0xaa5500);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: true,
                                baseIntensity: 0.25,
                                targetIntensity: 0.25,
                                currentIntensity: 0.25
                            });
                        }
                    }
                }
            },
            {
                name: "THE OVERGROWN ATRIUM",
                prob: 0.09,
                foundationMat: this.mossMat,
                build: (x, z, localX, localZ) => {
                    if (random() > 0.45) {
                        const w = 0.4 + (random() * 0.8);
                        const d = 0.4 + (random() * 0.8);
                        const trunk = buildWall(w, d, this.woodMat);
                        const offsetX = (random() - 0.5) * 2.0;
                        const offsetZ = (random() - 0.5) * 2.0;
                        trunk.position.set(x * this.cellSize + offsetX, 1.5, z * this.cellSize + offsetZ);
                        trunk.rotation.y = random() * Math.PI;
                        addGeometry(trunk);
                        if (random() > 0.20) {
                            const cHeight = 0.4 + random() * 0.4;
                            const canopyGeo = new THREE.BoxGeometry(this.cellSize * (1.2 + random()), cHeight, this.cellSize * (1.2 + random()));
                            const canopy = new THREE.Mesh(canopyGeo, this.fabricMat);
                            canopy.position.set(x * this.cellSize + offsetX, 3.0 - (cHeight / 2), z * this.cellSize + offsetZ);
                            canopy.rotation.y = random() * Math.PI;
                            canopy.castShadow = true;
                            chunkGroup.add(canopy);
                        }
                    }
                    if (random() > 0.90) {
                        const activeMat = this.baseBrokenLightMat.clone();
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 0.05, z * this.cellSize);
                        chunkGroup.add(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(x * this.cellSize, 0.5, z * this.cellSize),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: true,
                            baseIntensity: 0.15,
                            targetIntensity: 0.15,
                            currentIntensity: 0.15
                        });
                    }
                }
            }
        ];
        const isMacroStructure = random() > 0.90 && (Math.abs(chunkX) > 0 || Math.abs(chunkZ) > 0);
        let activeSector = null;
        let sectorMaze = null;
        if (isMacroStructure) {
            const sectorRoll = random();
            let cumulative = 0;
            for (const sector of sectorMatrix) {
                cumulative += sector.prob;
                if (sectorRoll <= cumulative) {
                    activeSector = sector;
                    break;
                }
            }
            if (!activeSector) activeSector = sectorMatrix[0];
            if (activeSector.name === "THE ARCHIVE" || activeSector.name === "THE SERVER FARM" || activeSector.name === "THE MAINTENANCE SHAFTS" || activeSector.name === "THE POOLROOMS") {
                sectorMaze = Array(this.chunkSize).fill().map(() => Array(this.chunkSize).fill(true));
                const carve = (cx, cz) => {
                    sectorMaze[cx][cz] = false;
                    const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
                    dirs.sort(() => random() - 0.5);

                    for (let [dx, dz] of dirs) {
                        const nx = cx + dx, nz = cz + dz;
                        if (nx > 0 && nx < this.chunkSize && nz > 0 && nz < this.chunkSize && sectorMaze[nx][nz]) {
                            sectorMaze[cx + dx/2][cz + dz/2] = false;
                            carve(nx, nz);
                        }
                    }
                };
                carve(1, 1);
                for(let i = 0; i < 20; i++) {
                    let rx = Math.floor(random() * (this.chunkSize - 2)) + 1;
                    let rz = Math.floor(random() * (this.chunkSize - 2)) + 1;
                    sectorMaze[rx][rz] = false;
                }
                for(let i = 1; i < this.chunkSize - 1; i+=3) {
                    sectorMaze[i][0] = false;
                    sectorMaze[i][this.chunkSize - 1] = false;
                    sectorMaze[0][i] = false;
                    sectorMaze[this.chunkSize - 1][i] = false;
                }
            }
            const foundationGeo = new THREE.PlaneGeometry(this.chunkSize * this.cellSize, this.chunkSize * this.cellSize);
            const foundation = new THREE.Mesh(foundationGeo, activeSector.foundationMat);
            foundation.rotation.x = -Math.PI / 2;
            const centerOffset = (this.chunkSize * this.cellSize) / 2 - (this.cellSize / 2);
            foundation.position.set(startX * this.cellSize + centerOffset, 0.02, startZ * this.cellSize + centerOffset);
            foundation.receiveShadow = true;
            chunkGroup.add(foundation);
        }
        for (let x = startX; x < startX + this.chunkSize; x++) {
            for (let z = startZ; z < startZ + this.chunkSize; z++) {
                if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
                const localX = x - startX;
                const localZ = z - startZ;
                if (isMacroStructure) {
                    activeSector.build(x, z, localX, localZ, typeof sectorMaze !== 'undefined' ? sectorMaze : null);
                    continue;
                }
                let zx = x * 0.15;
                let zy = z * 0.15;
                let iter = 0;

                let zx2 = zx * zx;
                let zy2 = zy * zy;
                while (zx2 + zy2 < 4 && iter < 15) {
                    zy = 2 * zx * zy + cy;
                    zx = zx2 - zy2 + cx;
                    zx2 = zx * zx;
                    zy2 = zy * zy;
                    iter++;
                }
                let isWall = iter > 6;
                if (random() > 0.70) isWall = !isWall;
                if (isWall) {
                    const structRoll = random();
                    const structure = structuralMatrix.find(s => structRoll >= s.prob);
                    if (structure) structure.build(x, z);
                } else {
                    let hasTallObstacle = false;
                    const floorRoll = random();
                    if (floorRoll > 0.90) {
                        const offsetX = (random() - 0.5) * 2.0;
                        const offsetZ = (random() - 0.5) * 2.0;
                        const rotY = random() * Math.PI * 2;
                        const scale = 0.4 + (random() * 0.6);
                        const stain = new THREE.Mesh(this.moldGeo, this.moldMat);
                        stain.position.set(x * this.cellSize + offsetX, 0.01, z * this.cellSize + offsetZ);
                        stain.rotation.y = rotY;
                        stain.scale.set(scale, scale, scale);
                        addGeometry(stain);
                        if (offsetX > 0.8) {
                            const ceilingStain = new THREE.Mesh(this.ceilingStainGeo, this.ceilingStainMat);
                            ceilingStain.position.set(x * this.cellSize + offsetZ, 2.99, z * this.cellSize - offsetX);
                            ceilingStain.rotation.y = rotY + 1.5;
                            ceilingStain.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
                            addGeometry(ceilingStain);
                        }
                    } else if (floorRoll > 0.80) {
                        hasTallObstacle = true;
                        const divW = random() > 0.5 ? this.cellSize * 0.8 : this.cellSize * 0.2;
                        const divD = divW === this.cellSize * 0.8 ? this.cellSize * 0.2 : this.cellSize * 0.8;
                        const divider = buildWall(divW, divD, this.sharedWallMat);
                        divider.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(divider);
                        if (random() > 0.6) {
                            const isWide = divW > divD;
                            const clearX = isWide ? 0.0 : 1.2;
                            const clearZ = isWide ? 1.2 : 0.0;
                            const rot = isWide ? 0 : -Math.PI / 2;
                            const chair = buildChair(x * this.cellSize + clearX, 0, z * this.cellSize + clearZ, rot);
                            addFurniture(chair);
                        }
                    }
                    if (!hasTallObstacle && random() > 0.20) {
                        const isBroken = random() > 0.60;
                        const isRotated = random() > 0.5;
                        const posX = (x * this.cellSize);
                        const posZ = (z * this.cellSize);
                        const activeMat = isBroken ? this.baseBrokenLightMat.clone() : this.baseLightMat.clone();
                        const matArray = [
                            this.baseHousingMat, this.baseHousingMat, this.baseHousingMat,
                            activeMat, this.baseHousingMat, this.baseHousingMat
                        ];
                        const panel = new THREE.Mesh(this.sharedPanelGeo, matArray);
                        panel.position.set(posX, 2.98, posZ);
                        if (isRotated) panel.rotation.y = Math.PI / 2;
                        panel.userData.chunkHash = hash;
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        if (!isBroken) {
                            const isTracked = random() > 0.85;
                            if (isTracked) {
                                this.fixtureData.push({
                                    chunkHash: hash,
                                    position: new THREE.Vector3(posX, 2.8, posZ),
                                    flickerOffset: random() * 500,
                                    material: activeMat,
                                    isFaulty: random() > 0.75,
                                    baseIntensity: 0.6,
                                    targetIntensity: 0.6,
                                    currentIntensity: 0.6
                                });
                            } else {
                                const glow = new THREE.Mesh(this.glowGeo, this.glowMat);
                                glow.position.set(posX, 0.03, posZ);
                                glow.userData.chunkHash = hash;
                                glow.updateMatrixWorld(true);
                                stagingMeshes.push(glow);
                            }
                        }
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        const instancedGroups = new Map();
        stagingMeshes.forEach(mesh => {
            const matSig = Array.isArray(mesh.material) ? mesh.material.map(m => m.uuid).join('_') : mesh.material.uuid;
            const sig = `${mesh.geometry.uuid}_${matSig}`;
            if (!instancedGroups.has(sig)) {
                instancedGroups.set(sig, {
                    geometry: mesh.geometry,
                    material: mesh.material,
                    meshes: []
                });
            }
            instancedGroups.get(sig).meshes.push(mesh);
        });
        const dummyColor = new THREE.Color();
        instancedGroups.forEach(group => {
            const isDecal = group.material === this.moldMat || group.material === this.ceilingStainMat || group.material === this.glowMat;
            if (group.meshes.length > 1) {
                const iMesh = new THREE.InstancedMesh(group.geometry, group.material, group.meshes.length);
                if (!isDecal) {
                    iMesh.castShadow = true;
                    iMesh.receiveShadow = true;
                }
                iMesh.userData.chunkHash = hash;

                const isStructural = group.material === this.sharedWallMat || group.material === this.headerMat;
                const needsColor = !isStructural && !isDecal;
                group.meshes.forEach((mesh, index) => {
                    iMesh.setMatrixAt(index, mesh.matrixWorld);
                    if (needsColor) {
                        const shade = 0.85 + (random() * 0.15);
                        dummyColor.setRGB(shade, shade * 0.95, shade * 0.90);
                        iMesh.setColorAt(index, dummyColor);
                    }
                });
                iMesh.instanceMatrix.needsUpdate = true;
                if (needsColor && iMesh.instanceColor) iMesh.instanceColor.needsUpdate = true;
                chunkGroup.add(iMesh);
                if (!isDecal) this.walls.push(iMesh);
            } else {
                const mesh = group.meshes[0];
                mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                if (!isDecal) {
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.walls.push(mesh);
                }
                chunkGroup.add(mesh);
            }
        });
    }

    captureAsset() {
        this.engine.render();
        const dataURL = this.engine.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `backrooms_asset_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }

    updateEntity(playerPos, delta, time) {
        if (!this.entityActive) return;
        if (!this._entDir) {
            this._entDir = new THREE.Vector3();
            this._entToPlayer = new THREE.Vector3();
            this._entLookDir = new THREE.Vector3();
        }
        this.breadcrumbTimer = (this.breadcrumbTimer || 0) + delta;
        if (this.breadcrumbTimer > 0.5 && this.entityBacktrackTimer <= 0) {
            this.breadcrumbTimer = 0;
            this.entityBreadcrumbs.push(this.entityGroup.position.clone());
            if (this.entityBreadcrumbs.length > 20) this.entityBreadcrumbs.shift();
        }
        this.entityCore.rotation.y = time * 0.8;
        this.entityCore.rotation.x = time * 0.5;
        const pulse = 1.0 + Math.sin(time * 4.0) * 0.15;
        this.entityCore.scale.set(pulse, pulse, pulse);
        this.entityShards.forEach((shardData, i) => {
            const panicJitter = this.player.exhaustion > 0.2 ? (Math.random() - 0.5) * this.player.exhaustion * 0.4 : 0;
            const angle = time * shardData.speed + shardData.offset;
            shardData.mesh.position.x = Math.cos(angle) * (1.2 + panicJitter);
            shardData.mesh.position.z = Math.sin(angle) * (1.2 + panicJitter);
            shardData.mesh.position.y = Math.sin(time * 3.0 + i) * 0.4 + panicJitter;
            shardData.mesh.rotation.x += delta * (2.0 + panicJitter * 10);
            shardData.mesh.rotation.y += delta * (3.0 + panicJitter * 10);
        });
        const distToPlayerSq = this.entityGroup.position.distanceToSquared(playerPos);
        if (distToPlayerSq < 0.64) {
            this.player.stamina = this.player.maxStamina;
            this.player.exhaustion = 0.0;
            this.player.isChased = false;
            return {consumed: true};
        }
        if (distToPlayerSq < 1600.0) {
            if (this.entityBacktrackTimer > 0) {
                this.entityBacktrackTimer -= delta;
                if (this.entityBreadcrumbs.length > 0) {
                    const targetCrumb = this.entityBreadcrumbs[this.entityBreadcrumbs.length - 1];
                    this.entityTarget.copy(targetCrumb);
                    if (this.entityGroup.position.distanceToSquared(targetCrumb) < 1.0) {
                        this.entityBreadcrumbs.pop();
                    }
                } else {
                    this.entityBacktrackTimer = 0;
                }
                this.player.isChased = false;
            } else {
                this.entityTarget.copy(playerPos);
                this.player.isChased = true;
            }
        } else {
            this.player.isChased = false;
            if (Math.random() < 0.02) {
                this.entityTarget.x += (Math.random() - 0.5) * 15.0;
                this.entityTarget.z += (Math.random() - 0.5) * 15.0;
            }
        }
        const dir = this._entDir.subVectors(this.entityTarget, this.entityGroup.position);
        dir.y = 0;
        const distToTarget = dir.length();
        let speed = distToPlayerSq < 225.0 ? 4.2 : 2.0;
        let isObserved = false;
        if (this.player.flashlightActive && distToPlayerSq < 625.0) {
            const toEntity = this._entToPlayer.subVectors(this.entityGroup.position, playerPos).normalize();
            const lookDir = this._entLookDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (lookDir.dot(toEntity) > 0.85) {
                isObserved = true;
                speed = 0.0;
                this.player.flashlightBattery = Math.max(0, this.player.flashlightBattery - 25.0 * delta);
                this.entityCore.position.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
            }
        }

        if (!isObserved) {
            this.entityCore.position.set(0, 0, 0);
        }
        if (distToTarget > 0.1) {
            dir.normalize();

            if (!this._entMoveVec) {
                this._entMoveVec = new THREE.Vector3();
                this._entNextPos = new THREE.Vector3();
                this._entBox = new THREE.Box3();
                this._entBoxX = new THREE.Box3();
                this._entBoxZ = new THREE.Box3();
                this._entMin = new THREE.Vector3();
                this._entMax = new THREE.Vector3();
            }

            this._entMoveVec.copy(dir).multiplyScalar(speed * delta);
            this._entNextPos.copy(this.entityGroup.position).add(this._entMoveVec);

            this._entMin.set(this._entNextPos.x - 0.6, 0.0, this._entNextPos.z - 0.6);
            this._entMax.set(this._entNextPos.x + 0.6, 3.0, this._entNextPos.z + 0.6);
            this._entBox.set(this._entMin, this._entMax);

            let blocked = false;
            const localBoxes = this.spatialGrid.getNearby(this._entNextPos.x, this._entNextPos.z, 2.0);
            for (let i = 0; i < localBoxes.length; i++) {
                if (localBoxes[i].isEntityBlocker && this._entBox.intersectsBox(localBoxes[i])) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                this.entityGroup.position.add(this._entMoveVec);
            } else {
                let blockedX = false;
                let blockedZ = false;

                this._entBoxX.copy(this._entBox);
                this._entBoxX.min.z = this.entityGroup.position.z - 0.5;
                this._entBoxX.max.z = this.entityGroup.position.z + 0.5;

                this._entBoxZ.copy(this._entBox);
                this._entBoxZ.min.x = this.entityGroup.position.x - 0.5;
                this._entBoxZ.max.x = this.entityGroup.position.x + 0.5;

                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].isEntityBlocker) {
                        if (!blockedX && this._entBoxX.intersectsBox(localBoxes[i])) blockedX = true;
                        if (!blockedZ && this._entBoxZ.intersectsBox(localBoxes[i])) blockedZ = true;
                    }
                }

                if (!blockedX && blockedZ) {
                    this.entityGroup.position.x += this._entMoveVec.x;
                } else if (!blockedZ && blockedX) {
                    this.entityGroup.position.z += this._entMoveVec.z;
                } else {
                    if (this.entityBacktrackTimer <= 0) {
                        this.entityBacktrackTimer = 5.0;
                    }
                    this.entityGroup.position.x += (Math.random() - 0.5) * speed * delta;
                    this.entityGroup.position.z += (Math.random() - 0.5) * speed * delta;
                }
            }
        }
        this.entityGroup.position.y = 1.5 + Math.sin(time * 2.0) * 0.2;
    }

    updateLights(time) {
        let ambientLightLevel = 0;
        const cameraPos = this.camera.position;
        if (!this.audioRaycaster) {
            this.audioRaycaster = new THREE.Raycaster();
            this.audioDirection = new THREE.Vector3();
        }
        this.localFixtures.length = 0;
        this.fixtureData.forEach(fixture => {
            const dx = Math.abs(cameraPos.x - fixture.position.x);
            const dz = Math.abs(cameraPos.z - fixture.position.z);
            if (dx > 30 || dz > 30) {
                fixture.hasShadow = false;
                return;
            }
            const distSq = (dx * dx) + (dz * dz);
            if (distSq < 900) {
                fixture.distSq = fixture.hasShadow ? distSq - 40.0 : distSq;
                this.localFixtures.push(fixture);
            } else {
                fixture.hasShadow = false;
            }
        });
        this.localFixtures.sort((a, b) => a.distSq - b.distSq);
        this.localFixtures.forEach(fixture => {
            if (fixture.hasShadow) fixture.distSq += 40.0;
            fixture.hasShadow = false;
        });
        let nearestFixture = null;
        let minLightDist = Infinity;
        for (let i = 0; i < this.maxActiveLights; i++) {
            const light = this.lightPool[i];
            const fixture = this.localFixtures[i];
            const activeRadius = i < 15 ? 20 : 30;
            const activeRadiusSq = activeRadius * activeRadius;
            if (fixture && fixture.distSq < activeRadiusSq) {
                if (i < 15) {
                    fixture.hasShadow = true;
                }
                light.position.copy(fixture.position);
                const dist = Math.sqrt(fixture.distSq);
                ambientLightLevel += (activeRadius - dist) / activeRadius;
                if (dist < minLightDist) {
                    minLightDist = dist;
                    nearestFixture = fixture;
                }
                const fadeEnvelope = Math.max(0, Math.min(1, (activeRadius - dist) / 8.0));
                const intensityScalar = i < 15 ? 0.65 : 0.35;
                if (fixture.isFaulty) {
                    if (Math.random() < 0.02) {
                        fixture.targetIntensity = Math.random() < 0.4 ? 0.05 : fixture.baseIntensity + (Math.random() * 0.4);
                    }
                    fixture.currentIntensity += (fixture.targetIntensity - fixture.currentIntensity) * 0.4;
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    fixture.material.emissiveIntensity = Math.max(0.05, fixture.currentIntensity * 0.6);
                } else {
                    light.intensity = (fixture.baseIntensity + (Math.sin(time * 120 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
                    fixture.material.emissiveIntensity = 0.4;
                }
            } else {
                light.intensity = 0;
            }
        }
        if (nearestFixture && minLightDist > 1.0) {
            if (time - this.lastAudioOcclusionTime > 0.1) {
                this.audioDirection.subVectors(nearestFixture.position, cameraPos).normalize();
                this.audioRaycaster.set(cameraPos, this.audioDirection);
                if (!this._rayTarget) this._rayTarget = new THREE.Vector3();
                let isHit = false;
                const localBoxes = this.spatialGrid.getNearby(cameraPos.x, cameraPos.z, minLightDist);
                const ray = this.audioRaycaster.ray;
                for (let i = 0; i < localBoxes.length; i++) {
                    if (ray.intersectBox(localBoxes[i], this._rayTarget)) {
                        if (cameraPos.distanceToSquared(this._rayTarget) < (minLightDist * minLightDist)) {
                            isHit = true;
                            break;
                        }
                    }
                }
                this.currentOcclusionState = isHit;
                this.lastAudioOcclusionTime = time;
            }
        } else {
            this.currentOcclusionState = false;
        }
        let isOccluded = this.currentOcclusionState;
        const pChunkX = Math.floor(cameraPos.x / (this.chunkSize * this.cellSize));
        const pChunkZ = Math.floor(cameraPos.z / (this.chunkSize * this.cellSize));

        let pSeed = (this.baseSeed + (pChunkX * 104729) + (pChunkZ * 1299827)) >>> 0;
        const pRandom = () => {
            pSeed = (pSeed * 1664525 + 1013904223) >>> 0;
            return pSeed / 4294967296.0;
        };

        const isMacroLoc = pRandom() > 0.90 && (Math.abs(pChunkX) > 0 || Math.abs(pChunkZ) > 0);
        const sectorRoll = pRandom();
        let activeSector = "NORMAL";
        let targetFog = 0.05;
        if (isMacroLoc) {
            if (sectorRoll <= 0.16) {
                activeSector = "POOLROOMS";
                targetFog = 0.08;
            } else if (sectorRoll <= 0.32) {
                activeSector = "CLINIC";
                targetFog = 0.03;
            } else if (sectorRoll <= 0.49) {
                activeSector = "BOARDROOM";
                targetFog = 0.015;
            } else if (sectorRoll <= 0.66) {
                activeSector = "ARCHIVE";
                targetFog = 0.12;
            } else if (sectorRoll <= 0.83) {
                activeSector = "SERVER";
                targetFog = 0.08;
            } else if (sectorRoll <= 0.91) {
                activeSector = "MAINTENANCE";
                targetFog = 0.10;
            } else {
                activeSector = "ATRIUM";
                targetFog = 0.18;
            }
        }
        if (this.baseFogDensity !== undefined) {
            if (this.currentFogDensity === undefined) this.currentFogDensity = targetFog;
            const userMultiplier = this.baseFogDensity / 0.05;
            const scaledTargetFog = targetFog * userMultiplier;
            this.currentFogDensity += (scaledTargetFog - this.currentFogDensity) * 0.02;
            const fogBreath = Math.sin(time * 0.05) * (this.currentFogDensity * 0.3);
            this.scene.fog.density = this.currentFogDensity + fogBreath;
        }
        if (this.dustCloud) {
            this.dustCloud.position.copy(cameraPos);
            this.dustCloud.rotation.y = time * 0.05;
            this.dustCloud.rotation.z = time * 0.02;
        }
        let anomalyPressure = 0;
        if (this.entityActive) {
            const distToAnomaly = cameraPos.distanceTo(this.entityGroup.position);
            if (distToAnomaly < 15.0) anomalyPressure = 1.0 - (distToAnomaly / 15.0);
        }
        if (this.flashlight) {
            let targetIntensity = this.player.flashlightActive ? 1.1 : 0.0;
            if (this.player.flashlightActive) {
                const batteryFactor = Math.min(1.0, this.player.flashlightBattery / 30.0);
                targetIntensity *= (0.1 + 0.9 * batteryFactor);
                if (this.player.flashlightBattery < 15.0 && Math.random() > 0.8) {
                    targetIntensity *= 0.1;
                }
                if (anomalyPressure > 0) {
                    const flicker = Math.random() > (0.5 - anomalyPressure * 0.4) ? 0.1 : 1.0;
                    targetIntensity *= flicker * (1.0 - anomalyPressure * 0.7);
                }
            }
            this.flashlight.intensity += (targetIntensity - this.flashlight.intensity) * 0.4;
        }
        const playerSpeed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
        return {
            minLightDist,
            isOccluded,
            activeSector,
            anomalyPressure,
            playerSpeed,
            playerExhaustion: this.player.exhaustion
        };
    }
}