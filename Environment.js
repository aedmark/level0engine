//Environment.js
// LEVEL 0 ENVIRONMENT & MEMORY MANAGER

import ProceduralTextureFactory from './ProceduralTextureFactory.js';

class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    insert(box) {
        const startX = Math.floor(box.min.x / this.cellSize);
        const startZ = Math.floor(box.min.z / this.cellSize);
        const endX = Math.floor(box.max.x / this.cellSize);
        const endZ = Math.floor(box.max.z / this.cellSize);
        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                const key = `${x},${z}`;
                if (!this.cells.has(key)) this.cells.set(key, new Set());
                this.cells.get(key).add(box);
            }
        }
    }

    removeByChunk(chunkHash) {
        for (const [key, cell] of this.cells.entries()) {
            for (const box of cell) {
                if (box.chunkHash === chunkHash) cell.delete(box);
            }
            if (cell.size === 0) this.cells.delete(key);
        }
    }

    getNearby(x, z, radius) {
        if (!this.queryCache) this.queryCache = [];
        if (!this.seenBoxes) this.seenBoxes = new Set();
        this.queryCache.length = 0;
        this.seenBoxes.clear();
        const startX = Math.floor((x - radius) / this.cellSize);
        const startZ = Math.floor((z - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const endZ = Math.floor((z + radius) / this.cellSize);
        for (let cx = startX; cx <= endX; cx++) {
            for (let cz = startZ; cz <= endZ; cz++) {
                const cell = this.cells.get(`${cx},${cz}`);
                if (cell) {
                    for (const box of cell) {
                        if (!this.seenBoxes.has(box)) {
                            this.seenBoxes.add(box);
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
                if (!this.activeChunks.has(hash)) {
                    this.buildChunk(targetX, targetZ, hash);
                }
            }
        }
        for (const [hash, chunkGroup] of this.activeChunks.entries()) {
            if (!chunksToKeep.has(hash)) {
                this.scene.remove(chunkGroup);
                chunkGroup.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(m => {
                            m.dispose();
                            if (m.map) m.map.dispose();
                            if (m.emissiveMap) m.emissiveMap.dispose();
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
            const distSq = playerPos.distanceToSquared(door.position);
            const isOpen = distSq < 12.25;
            let targetRot = door.userData.closedRot;
            if (isOpen) {
                if (!door.userData.isLatched) {
                    const approachZ = playerPos.z - door.position.z;
                    door.userData.latchedRot = approachZ < 0 ? -(Math.PI / 2) : (Math.PI / 2);
                    door.userData.isLatched = true;
                }
                targetRot = door.userData.latchedRot;
            } else {
                door.userData.isLatched = false;
            }
            door.userData.currentRot += (targetRot - door.userData.currentRot) * 8.0 * delta;
            door.rotation.y = door.userData.currentRot;
            if (door.userData.box) {
                door.updateMatrixWorld();
                door.userData.box.setFromObject(door);
                if (isOpen && Math.abs(door.userData.currentRot - door.userData.openRot) < 0.1) {
                    door.userData.box.makeEmpty();
                }
            }
        });
    }

    setup() {
        const assets = ProceduralTextureFactory.generateAssets();
        Object.assign(this, assets);
        const {carpetTexture, ceilingTexture} = assets;
        carpetTexture.repeat.set(75, 75);
        const floorGeo = new THREE.PlaneGeometry(300, 300);
        const floorMat = new THREE.MeshStandardMaterial({map: carpetTexture, roughness: 1.0});
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
        ceilingTexture.repeat.set(300, 300);
        const ceilGeo = new THREE.PlaneGeometry(300, 300);
        const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTexture, roughness: 0.9});
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
            const light = new THREE.PointLight(0xfff5c2, 0, radius);
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
        document.getElementById('headBobToggle').addEventListener('change', (e) => {
            this.player.enableHeadBob = e.target.checked;
        });
        document.getElementById('captureBtn').addEventListener('click', () => {
            const flash = document.getElementById('flash-overlay');
            flash.style.transition = 'none';
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.transition = 'opacity 0.8s ease-out';
                flash.style.opacity = '0';
            }, 50);
            setTimeout(() => this.captureAsset(), 10);
        });
    }

    generate() {
        this.activeChunks.forEach((chunkGroup) => {
            this.scene.remove(chunkGroup);
            chunkGroup.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        });
        this.activeChunks.clear();
        this.walls = [];
        this.fixtureData = [];
        this.spatialGrid.cells.clear();
        this.currentChunkCoords = {x: null, z: null};
        this.camera.position.set(0, 1.6, 0);
        this.player.velocity.set(0, 0, 0);
        this.entityActive = true;
        this.entityGroup.position.set(32, 1.5, 32);
        this.entityTarget.copy(this.entityGroup.position);
        const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
        this.baseSeed = 0;
        for (let i = 0; i < seedString.length; i++) {
            this.baseSeed = ((this.baseSeed << 5) - this.baseSeed) + seedString.charCodeAt(i);
            this.baseSeed |= 0;
        }
        this.cellSize = 4;
        if (!this.sharedWallGeo) {
            this.sharedWallGeo = new THREE.BoxGeometry(this.cellSize + 0.02, 3, this.cellSize + 0.02);
            this.sharedWallMat = new THREE.MeshStandardMaterial({
                map: this.wallTexture,
                color: 0xffffff,
                roughness: 0.8
            });
            this.sharedPanelGeo = new THREE.BoxGeometry(0.98, 0.05, 1.98);
            this.pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, this.cellSize, 8);
            this.pipeGeo.rotateZ(Math.PI / 2);
            this.pipeJointGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
            this.pipeJointGeo.rotateZ(Math.PI / 2);
            this.rustMat = new THREE.MeshStandardMaterial({color: 0x2a1515, roughness: 0.9, metalness: 0.6});
            this.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
            this.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
            this.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            this.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
            this.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
        }
    }

    buildChunk(chunkX, chunkZ, hash) {
        const chunkGroup = new THREE.Group();
        this.scene.add(chunkGroup);
        this.activeChunks.set(hash, chunkGroup);
        let prngSeed = this.baseSeed + (chunkX * 104729) + (chunkZ * 1299827);
        const random = () => {
            let x = Math.sin(prngSeed++) * 10000;
            return x - Math.floor(x);
        };
        const cx = Math.sin(this.baseSeed) * 0.8;
        const cy = Math.cos(this.baseSeed * 0.5) * 0.8;
        const buildWall = (w, d, mat) => {
            const geo = new THREE.BoxGeometry(w + 0.02, 3.0, d + 0.02);
            const uv = geo.attributes.uv;
            for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (d / this.cellSize));
            for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (w / this.cellSize));
            return new THREE.Mesh(geo, mat);
        };
        const stagingMeshes = [];
        const addGeometry = (mesh) => {
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(mesh);
            box.chunkHash = hash;
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
                        addGeometry(step);
                    }
                }
            },
            {
                prob: 0.40, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
                    const ventDir = Math.floor(random() * 2);
                    const ventGeo = new THREE.BoxGeometry(ventDir === 0 ? 1.2 : this.cellSize + 0.1, 0.4, ventDir === 0 ? this.cellSize + 0.1 : 1.2);
                    const vent = new THREE.Mesh(ventGeo, this.ventMat);
                    vent.position.set(x * this.cellSize, random() > 0.5 ? 2.6 : 0.4, z * this.cellSize);
                    addGeometry(vent);
                }
            },
            {
                prob: 0.35, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
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
                foundationMat: this.clinicMat,
                build: (x, z, localX, localZ) => {
                    if (localX % 6 === 3 && localZ % 6 === 3) {
                        const pillar = buildWall(this.cellSize, this.cellSize, this.clinicMat);
                        pillar.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(pillar);
                    }
                    if (localX % 4 === 2 && localZ % 4 === 2 && random() > 0.4) {
                        const pSize = this.cellSize * 0.8;
                        const rimThick = 0.2;
                        const pHeight = 0.4;
                        const rimScaleY = pHeight / 3.0;

                        const rimN = buildWall(pSize, rimThick, this.clinicMat);
                        rimN.position.set(x * this.cellSize, pHeight/2, z * this.cellSize - pSize/2 + rimThick/2);
                        rimN.scale.y = rimScaleY;
                        addGeometry(rimN);

                        const rimS = buildWall(pSize, rimThick, this.clinicMat);
                        rimS.position.set(x * this.cellSize, pHeight/2, z * this.cellSize + pSize/2 - rimThick/2);
                        rimS.scale.y = rimScaleY;
                        addGeometry(rimS);

                        const rimE = buildWall(rimThick, pSize - rimThick*2, this.clinicMat);
                        rimE.position.set(x * this.cellSize + pSize/2 - rimThick/2, pHeight/2, z * this.cellSize);
                        rimE.scale.y = rimScaleY;
                        addGeometry(rimE);

                        const rimW = buildWall(rimThick, pSize - rimThick*2, this.clinicMat);
                        rimW.position.set(x * this.cellSize - pSize/2 + rimThick/2, pHeight/2, z * this.cellSize);
                        rimW.scale.y = rimScaleY;
                        addGeometry(rimW);

                        const waterGeo = new THREE.PlaneGeometry(pSize - rimThick, pSize - rimThick);
                        const water = new THREE.Mesh(waterGeo, this.waterMat);
                        water.rotation.x = -Math.PI / 2;
                        water.position.set(x * this.cellSize, pHeight - 0.05, z * this.cellSize);
                        chunkGroup.add(water);
                    }
                    if (localX % 6 === 0 && localZ % 6 === 0 && random() > 0.4) {
                        const activeMat = this.baseLightMat.clone();
                        activeMat.color.setHex(0xaaffff);
                        activeMat.emissive.setHex(0x44aaff);
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: false,
                            baseIntensity: 0.4,
                            targetIntensity: 0.4,
                            currentIntensity: 0.4
                        });
                    }
                }
            },
            {
                name: "THE CLINIC",
                prob: 0.16,
                foundationMat: this.clinicMat,
                build: (x, z, localX, localZ) => {
                    let isClinicWall = false;
                    if (localX % 5 === 0 && localZ % 5 === 0 && localX > 1 && localX < 14 && localZ > 1 && localZ < 14) {
                        isClinicWall = true;
                        const divW = random() > 0.5 ? this.cellSize : 0.1;
                        const divD = divW === 0.1 ? this.cellSize : 0.1;
                        const divider = new THREE.Mesh(new THREE.BoxGeometry(divW, 2.0, divD), this.fabricMat);
                        divider.position.set(x * this.cellSize, 1.0, z * this.cellSize);
                        addGeometry(divider);
                        const chair = buildChair(x * this.cellSize + 0.8, 0, z * this.cellSize + 0.8, random() * Math.PI);
                        addFurniture(chair);
                    }
                    if (!isClinicWall && localX % 4 === 2 && localZ % 4 === 2 && random() > 0.4) {
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
                            isFaulty: random() > 0.5,
                            baseIntensity: 0.5,
                            targetIntensity: 0.5,
                            currentIntensity: 0.5
                        });
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
                build: (x, z, localX, localZ) => {
                    let isArchivePillar = false;
                    if (localX % 3 === 0 && localZ % 3 === 0 && localX > 0 && localZ > 0 && localX < 15 && localZ < 15) {
                        isArchivePillar = true;
                        const pillar = buildWall(this.cellSize * 0.8, this.cellSize * 0.8, this.sharedWallMat);
                        pillar.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(pillar);
                    }
                    if (!isArchivePillar && localX % 4 === 2 && localZ % 4 === 2 && random() > 0.5) {
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
            },
            {
                name: "THE SERVER FARM",
                prob: 0.17,
                foundationMat: this.ventMat,
                build: (x, z, localX, localZ) => {
                    if (localX % 4 >= 1 && localX % 4 <= 2 && localZ > 1 && localZ < 14) {
                        const rack = buildWall(this.cellSize, this.cellSize, this.serverMat);
                        rack.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(rack);
                        if (localX % 4 === 1) {
                            const pipe = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipe.rotation.y = Math.PI / 2;
                            pipe.position.set(x * this.cellSize - (this.cellSize / 2) + 0.1, 2.9, z * this.cellSize);
                            addGeometry(pipe);
                            const joint = new THREE.Mesh(this.pipeJointGeo, this.rustMat);
                            joint.rotation.y = Math.PI / 2;
                            joint.position.set(x * this.cellSize - (this.cellSize / 2) + 0.1, 2.9, z * this.cellSize - (this.cellSize / 2));
                            addGeometry(joint);
                        }
                        if (localX % 4 === 2) {
                            const pipe = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipe.rotation.y = Math.PI / 2;
                            pipe.position.set(x * this.cellSize + (this.cellSize / 2) - 0.1, 2.9, z * this.cellSize);
                            addGeometry(pipe);
                            const joint = new THREE.Mesh(this.pipeJointGeo, this.rustMat);
                            joint.rotation.y = Math.PI / 2;
                            joint.position.set(x * this.cellSize + (this.cellSize / 2) - 0.1, 2.9, z * this.cellSize - (this.cellSize / 2));
                            addGeometry(joint);
                        }
                    }
                    if (localX % 4 === 0 && localZ % 3 === 0 && random() > 0.3) {
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
            },
            {
                name: "THE MAINTENANCE SHAFTS",
                prob: 0.08,
                foundationMat: this.ventMat,
                build: (x, z, localX, localZ) => {
                    if (localX % 3 === 0 || localZ % 3 === 0) {
                        const isNode = localX % 3 === 0 && localZ % 3 === 0;
                        const w = isNode ? this.cellSize * 0.9 : this.cellSize;
                        const d = isNode ? this.cellSize * 0.9 : 0.4;
                        const wall = buildWall(w, isNode ? d : (localX % 3 === 0 ? this.cellSize : 0.4), isNode ? this.hazardMat : this.structMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(wall);

                        if (!isNode && random() > 0.5) {
                            const pipe = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipe.rotation.y = localX % 3 === 0 ? 0 : Math.PI / 2;
                            pipe.position.set(x * this.cellSize, 2.8, z * this.cellSize);
                            addGeometry(pipe);
                        }
                    } else if (localX % 3 === 1 && localZ % 3 === 1 && random() > 0.8) {
                        const activeMat = this.baseBrokenLightMat.clone();
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                        chunkGroup.add(panel);
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
                    activeSector.build(x, z, localX, localZ);
                    continue;
                }
                let zx = x * 0.15;
                let zy = z * 0.15;
                let iter = 0;
                while (zx * zx + zy * zy < 4 && iter < 15) {
                    let xt = zx * zx - zy * zy + cx;
                    zy = 2 * zx * zy + cy;
                    zx = xt;
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
        const dummy = new THREE.Object3D();
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
                group.meshes.forEach((mesh, index) => {
                    mesh.matrixWorld.decompose(dummy.position, dummy.quaternion, dummy.scale);
                    dummy.updateMatrix();
                    iMesh.setMatrixAt(index, dummy.matrix);
                    const isStructural = group.material === this.sharedWallMat || group.material === this.headerMat;
                    if (!isStructural && !isDecal) {
                        const shade = 0.85 + (random() * 0.15);
                        dummyColor.setRGB(shade, shade * 0.95, shade * 0.90);
                        iMesh.setColorAt(index, dummyColor);
                    } else {
                        dummyColor.setRGB(1, 1, 1);
                        iMesh.setColorAt(index, dummyColor);
                    }
                });
                iMesh.instanceMatrix.needsUpdate = true;
                if (iMesh.instanceColor) iMesh.instanceColor.needsUpdate = true;
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
            this.entityTarget.copy(playerPos);
            this.player.isChased = true;
        } else {
            this.player.isChased = false;
            if (Math.random() < 0.02) {
                this.entityTarget.x += (Math.random() - 0.5) * 15.0;
                this.entityTarget.z += (Math.random() - 0.5) * 15.0;
            }
        }
        const dir = new THREE.Vector3().subVectors(this.entityTarget, this.entityGroup.position);
        dir.y = 0;
        const distToTarget = dir.length();
        if (distToTarget > 0.1) {
            dir.normalize();
            const speed = distToPlayerSq < 225.0 ? 4.2 : 2.0;
            this.entityGroup.position.addScaledVector(dir, speed * delta);
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
                const intensityScalar = i < 15 ? 1.0 : 0.35;
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
                this.audioRaycaster.far = minLightDist;
                const hits = this.audioRaycaster.intersectObjects(this.walls);
                this.currentOcclusionState = hits.length > 0;
                this.lastAudioOcclusionTime = time;
            }
        } else {
            this.currentOcclusionState = false;
        }
        let isOccluded = this.currentOcclusionState;
        const pChunkX = Math.floor(cameraPos.x / (this.chunkSize * this.cellSize));
        const pChunkZ = Math.floor(cameraPos.z / (this.chunkSize * this.cellSize));
        let pSeed = this.baseSeed + (pChunkX * 104729) + (pChunkZ * 1299827);
        const pRandom = () => {
            let x = Math.sin(pSeed++) * 10000;
            return x - Math.floor(x);
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
            } else {
                activeSector = "ATRIUM";
                targetFog = 0.18;
            }
        }
        if (this.baseFogDensity !== undefined) {
            this.baseFogDensity += (targetFog - this.baseFogDensity) * 0.02;
            const fogBreath = Math.sin(time * 0.05) * (this.baseFogDensity * 0.3);
            this.scene.fog.density = this.baseFogDensity + fogBreath;
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