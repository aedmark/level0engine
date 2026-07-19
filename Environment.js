// Environment.js
// LEVEL 0 ENVIRONMENT & MEMORY MANAGER

import ProceduralTextureFactory from './ProceduralTextureFactory.js';
import Anomaly from './Anomaly.js';
import SpatialHashGrid from './SpatialHashGrid.js';
import TheArchitect from './TheArchitect.js';
import LumenGrid from './LumenGrid.js';
import { Vector3, Box3, Raycaster, Matrix3, Matrix4, Color } from './EngineMath.js';
import { Group, Mesh, InstancedMesh, BoxGeometry, MeshBasicMaterial, CanvasTexture, MeshStandardMaterial, SpotLight } from './EngineScenegraph.js';

export default class Environment {
    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.fixtureData = [];
        this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
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
        this._lightSortCache = (a, b) => a.distSq - b.distSq;
        this.blackoutChunks = new Set();
    }

    updateChunks(playerPos) {
        const activeCellSize = this.cellSize || 4;
        const chunkX = Math.floor(playerPos.x / (this.chunkSize * activeCellSize));
        const chunkZ = Math.floor(playerPos.z / (this.chunkSize * activeCellSize));
        if (this.currentChunkCoords.x === chunkX && this.currentChunkCoords.z === chunkZ) return;
        this.currentChunkCoords.x = chunkX;
        this.currentChunkCoords.z = chunkZ;
        const chunksToKeep = new Set();
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const targetX = chunkX + x;
                const targetZ = chunkZ + z;
                const hash = `${targetX},${targetZ}`;
                chunksToKeep.add(hash);
                if (!this.activeChunks.has(hash) && !this.chunkQueue.some(q => q.hash === hash)) {
                    this.chunkQueue.push({x: targetX, z: targetZ, hash: hash});
                }
            }
        }
        this.processChunkQueue();
        const deadHashes = new Set();
        for (const [hash, chunkGroup] of this.activeChunks.entries()) {
            if (!chunksToKeep.has(hash)) {
                deadHashes.add(hash);
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
                this.blackoutChunks.delete(hash);
                this.spatialGrid.removeByChunk(hash);
            }
        }
        if (deadHashes.size > 0) {
            this.walls = this.walls.filter(w => !deadHashes.has(w.userData.chunkHash));
            this.fixtureData = this.fixtureData.filter(f => !deadHashes.has(f.chunkHash));
            this.interactiveDoors = this.interactiveDoors.filter(d => !deadHashes.has(d.userData.chunkHash));
            if (this.interactables) {
                this.interactables = this.interactables.filter(i => !deadHashes.has(i.userData.chunkHash));
            }
            if (this.observers) {
                this.observers = this.observers.filter(o => !deadHashes.has(o.userData.chunkHash));
            }
        }
    }

    shatterFixture(fixture) {
        fixture.isDead = true;
        fixture.baseIntensity = 0.0;
        fixture.currentIntensity = 0.0;
        if (fixture.material) {
            fixture.material.emissiveIntensity = 0.0;
            if (fixture.material.color) fixture.material.color.setHex(0x222222);
            if (fixture.material.emissive) fixture.material.emissive.setHex(0x000000);
        }
        const pDistSq = this.camera.position.distanceToSquared(fixture.position);
        if (pDistSq < 625.0) {
            document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: pDistSq, intensity: 1.2}}));
        }
    }

    updateInteractives(playerPos, delta) {
        this.interactiveDoors.forEach(door => {
            const pDistSq = playerPos.distanceToSquared(door.position);
            if (pDistSq > 400.0 && !door.userData.isLatched && !door.userData.entityOpen) return;
            const playerOpen = door.userData.playerOpen === true;
            const entityOpen = door.userData.entityOpen === true;
            door.userData.entityOpen = false;
            if (playerOpen && pDistSq > 100.0) {
                door.userData.playerOpen = false;
            }
            const isOpen = playerOpen || entityOpen;
            let targetRot = door.userData.closedRot;
            if (isOpen) {
                if (!door.userData.isLatched) {
                    const triggerPos = (entityOpen && !playerOpen) ? this.anomaly.group.position : playerPos;
                    const isZDoor = Math.abs(door.userData.closedRot) < 0.1 || Math.abs(door.userData.closedRot - Math.PI) < 0.1;
                    const swingAngle = Math.PI / 2.2;
                    let desiredRot = door.userData.closedRot;
                    if (isZDoor) {
                        const approachZ = triggerPos.z - door.position.z;
                        desiredRot = approachZ < 0 ? (door.userData.closedRot + swingAngle) : (door.userData.closedRot - swingAngle);
                    } else {
                        const approachX = triggerPos.x - door.position.x;
                        desiredRot = approachX < 0 ? (door.userData.closedRot - swingAngle) : (door.userData.closedRot + swingAngle);
                    }
                    door.userData.latchedRot = desiredRot;
                    door.userData.isLatched = true;
                    door.userData.swingSpeed = (entityOpen && !playerOpen) ? 35.0 : 8.0;
                    const intensity = (entityOpen && !playerOpen) ? 1.0 : 0.25;
                    document.dispatchEvent(new CustomEvent('somatic-door', {
                        detail: {distSq: pDistSq, intensity: intensity}
                    }));
                }
                targetRot = door.userData.latchedRot;
            } else {
                door.userData.isLatched = false;
                door.userData.swingSpeed = 8.0;
            }
            const rotDiff = targetRot - door.userData.currentRot;
            if (Math.abs(rotDiff) > 0.001) {
                door.userData.currentRot += rotDiff * door.userData.swingSpeed * delta;
                door.rotation.y = door.userData.currentRot;
                if (door.userData.box && isOpen) {
                    if (!door.userData.box.isEmpty()) door.userData.box.makeEmpty();
                }
            } else if (door.userData.currentRot !== targetRot) {
                door.userData.currentRot = targetRot;
                door.rotation.y = targetRot;
                if (!isOpen && door.userData.box) {
                    door.updateMatrixWorld(true);
                    if (!door.userData.baseBox) {
                        door.geometry.computeBoundingBox();
                        door.userData.baseBox = door.geometry.boundingBox.clone();
                    }
                    door.userData.box.copy(door.userData.baseBox).applyMatrix4(door.matrixWorld);
                }
            }
        });
        if (this.interactables) {
            this.interactables.forEach(obj => {
                if (obj.userData.type === 'grate' && !obj.userData.active) {
                    const targetRot = -Math.PI / 2;
                    const diff = obj.userData.blocksX ? (targetRot - obj.rotation.z) : (targetRot - obj.rotation.x);
                    if (Math.abs(diff) > 0.01) {
                        if (obj.userData.blocksX) obj.rotation.z += diff * 15.0 * delta;
                        else obj.rotation.x += diff * 15.0 * delta;
                        obj.position.y += (0.05 - obj.position.y) * 15.0 * delta;
                        if (obj.userData.box && !obj.userData.box.isEmpty()) {
                            obj.userData.box.makeEmpty();
                        }
                    }
                }
            });
        }
        if (this.observers) {
            for (let i = this.observers.length - 1; i >= 0; i--) {
                const obs = this.observers[i];
                if (!obs.userData.active) continue;
                const distSq = playerPos.distanceToSquared(obs.position);
                let beingLookedAt = false;
                if (distSq < 625.0) {
                    if (!this._sharedToObs) this._sharedToObs = new Vector3();
                    if (!this._sharedLookDir) this._sharedLookDir = new Vector3();
                    this._sharedToObs.subVectors(obs.position, playerPos).normalize();
                    this._sharedLookDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
                    if (this._sharedLookDir.dot(this._sharedToObs) > 0.90) beingLookedAt = true;
                }
                if (distSq < 36.0 || (beingLookedAt && this.player.flashlightActive && distSq < 400.0)) {
                    obs.userData.fade -= delta * 1.2;
                    if (obs.userData.fade <= 0) {
                        obs.userData.active = false;
                        obs.visible = false;
                        if (this.player.coherence > 0.1) this.player.coherence -= 0.05;
                        const isLaugh = Math.random() > 0.85;
                        document.dispatchEvent(new CustomEvent('somatic-lost', {
                            detail: {distSq: distSq, isLaugh: isLaugh, intensity: isLaugh ? 2.0 : 0.6}
                        }));
                        if (Math.random() > 0.8 && this.interactables) {
                            const almondGroup = new Group();
                            almondGroup.add(this.almondPrefab.clone());
                            const aGlow = new Mesh(this.glowGeo, this.glowMat);
                            aGlow.scale.set(0.15, 0.15, 0.15);
                            aGlow.position.y = 0.01;
                            almondGroup.add(aGlow);
                            almondGroup.position.copy(obs.position);
                            almondGroup.position.y = 0.1;
                            almondGroup.userData = {type: 'almond', chunkHash: obs.userData.chunkHash, active: true};
                            obs.parent.add(almondGroup);
                            this.interactables.push(almondGroup);
                        }
                    } else {
                        obs.material.opacity = obs.userData.fade;
                        obs.position.x += (Math.random() - 0.5) * delta * 0.5;
                        obs.position.z += (Math.random() - 0.5) * delta * 0.5;
                    }
                } else if (distSq < 900.0) {
                    obs.lookAt(playerPos.x, obs.position.y, playerPos.z);
                }
            }
        }
    }

    async processChunkQueue() {
        if (this.isBuildingChunk) return;
        this.isBuildingChunk = true;
        while (this.chunkQueue.length > 0) {
            const chunk = this.chunkQueue.shift();
            const currentX = Math.floor(this.camera.position.x / (this.chunkSize * 4));
            const currentZ = Math.floor(this.camera.position.z / (this.chunkSize * 4));
            if (Math.abs(chunk.x - currentX) <= this.renderDistance && Math.abs(chunk.z - currentZ) <= this.renderDistance) {
                await this.buildChunk(chunk.x, chunk.z, chunk.hash);
            }
        }
        this.isBuildingChunk = false;
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
    }

    setup() {
        const rawAssets = ProceduralTextureFactory.generateAssets();

        // --- TEXTURE WRAPPING ---
        this.wallTexture = new CanvasTexture(rawAssets.wallCanvas);
        this.wallTexture.wrapS = THREE.RepeatWrapping;
        this.wallTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.wallTexture.repeat.set(4, 1);

        const headerTexture = new CanvasTexture(rawAssets.headerCanvas);
        headerTexture.wrapS = headerTexture.wrapT = THREE.RepeatWrapping;
        headerTexture.repeat.set(4, 0.1);
        headerTexture.offset.set(0, 0.9);
        this.headerMat = new MeshStandardMaterial({
            map: headerTexture,
            roughness: 0.8,
            bumpMap: headerTexture,
            bumpScale: 0.01
        });

        const structTexture = new CanvasTexture(rawAssets.structCanvas);
        structTexture.wrapS = structTexture.wrapT = THREE.RepeatWrapping;
        structTexture.repeat.set(2, 2);
        this.structMat = new MeshStandardMaterial({
            map: structTexture,
            roughness: 1.0,
            bumpMap: structTexture,
            bumpScale: 0.02
        });

        const woodTexture = new CanvasTexture(rawAssets.woodCanvas);
        this.woodMat = new MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.9,
            bumpMap: woodTexture,
            bumpScale: 0.015
        });

        const doorTexture = new CanvasTexture(rawAssets.doorCanvas);
        const doorBackTexture = new CanvasTexture(rawAssets.doorBackCanvas);
        const doorMatFront = new MeshStandardMaterial({map: doorTexture, roughness: 0.9});
        const doorMatBack = new MeshStandardMaterial({map: doorBackTexture, roughness: 0.9});
        const doorMatEdge = new MeshStandardMaterial({map: woodTexture, roughness: 0.9});
        this.doorMat = [doorMatEdge, doorMatEdge, doorMatEdge, doorMatEdge, doorMatFront, doorMatBack];

        const carpetTexture = new CanvasTexture(rawAssets.carpetCanvas);
        carpetTexture.wrapS = carpetTexture.wrapT = THREE.RepeatWrapping;
        carpetTexture.magFilter = THREE.NearestFilter;
        carpetTexture.minFilter = THREE.NearestMipmapLinearFilter;
        carpetTexture.repeat.set(16, 16);
        this.carpetMat = new MeshStandardMaterial({
            map: carpetTexture,
            roughness: 1.0,
            bumpMap: carpetTexture,
            bumpScale: 0.015
        });

        const ceilingTexture = new CanvasTexture(rawAssets.ceilingCanvas);
        ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
        ceilingTexture.repeat.set(128, 128);
        this.ceilMat = new MeshStandardMaterial({
            map: ceilingTexture,
            color: 0xffffff,
            emissive: 0x444444,
            roughness: 0.9,
            bumpMap: ceilingTexture,
            bumpScale: 0.005
        });

        const tileTexture = new CanvasTexture(rawAssets.tileCanvas);
        tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;
        tileTexture.repeat.set(16, 16);
        this.tileMat = new MeshStandardMaterial({map: tileTexture, roughness: 0.1, metalness: 0.6});

        const clinicTex = new CanvasTexture(rawAssets.clinicCanvas);
        clinicTex.wrapS = clinicTex.wrapT = THREE.RepeatWrapping;
        clinicTex.repeat.set(32, 32);
        const clinicBumpTex = new CanvasTexture(rawAssets.clinicBumpCanvas);
        clinicBumpTex.wrapS = clinicBumpTex.wrapT = THREE.RepeatWrapping;
        clinicBumpTex.repeat.set(32, 32);
        this.clinicMat = new MeshStandardMaterial({
            map: clinicTex,
            bumpMap: clinicBumpTex,
            bumpScale: 0.015,
            roughness: 0.1,
            metalness: 0.15
        });

        const moldTexture = new CanvasTexture(rawAssets.moldCanvas);
        this.moldMat = new MeshStandardMaterial({
            map: moldTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.12,
            roughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        this.moldGeo = new THREE.PlaneGeometry(3, 3);
        this.moldGeo.rotateX(-Math.PI / 2);

        const ceilStainTexture = new CanvasTexture(rawAssets.ceilStainCanvas);
        this.ceilingStainMat = new MeshStandardMaterial({
            map: ceilStainTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.15,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        this.ceilingStainGeo = new THREE.PlaneGeometry(3, 3);
        this.ceilingStainGeo.rotateX(Math.PI / 2);

        const fabricTexture = new CanvasTexture(rawAssets.fabricCanvas);
        fabricTexture.wrapS = fabricTexture.wrapT = THREE.RepeatWrapping;
        fabricTexture.repeat.set(4, 4);
        this.fabricMat = new MeshStandardMaterial({
            map: fabricTexture,
            roughness: 0.98,
            bumpMap: fabricTexture,
            bumpScale: 0.05
        });

        const mossTexture = new CanvasTexture(rawAssets.mossCanvas);
        mossTexture.wrapS = mossTexture.wrapT = THREE.RepeatWrapping;
        mossTexture.repeat.set(32, 32);
        this.mossMat = new MeshStandardMaterial({map: mossTexture, roughness: 1.0});

        const ventTexture = new CanvasTexture(rawAssets.ventCanvas);
        ventTexture.wrapS = ventTexture.wrapT = THREE.RepeatWrapping;
        ventTexture.repeat.set(1, 1);
        this.ventMat = new MeshStandardMaterial({
            map: ventTexture,
            roughness: 0.7,
            metalness: 0.4,
            bumpMap: ventTexture,
            bumpScale: 0.02
        });

        const serverTexture = new CanvasTexture(rawAssets.serverCanvas);
        serverTexture.wrapS = serverTexture.wrapT = THREE.RepeatWrapping;
        serverTexture.repeat.set(4, 1);
        this.serverMat = new MeshStandardMaterial({map: serverTexture, roughness: 0.2, metalness: 0.3});

        const lightTexture = new CanvasTexture(rawAssets.lightCanvas);
        this.baseLightMat = new MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.1
        });
        this.baseBrokenLightMat = new MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0x8c9296,
            emissive: 0x1a1f24,
            emissiveIntensity: 1.0,
            roughness: 0.8
        });
        this.baseHousingMat = new MeshStandardMaterial({color: 0x1a1a1a, roughness: 0.9});

        const fenceTex = new CanvasTexture(rawAssets.fenceCanvas);
        fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
        fenceTex.repeat.set(12, 12);
        this.waterMat = new MeshStandardMaterial({
            map: fenceTex,
            roughness: 0.4,
            metalness: 0.9,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });

        const hazardTexture = new CanvasTexture(rawAssets.hazardCanvas);
        hazardTexture.wrapS = hazardTexture.wrapT = THREE.RepeatWrapping;
        hazardTexture.repeat.set(2, 2);
        this.hazardMat = new MeshStandardMaterial({map: hazardTexture, roughness: 0.8});

        const glowTexture = new CanvasTexture(rawAssets.glowCanvas);
        this.glowMat = new MeshBasicMaterial({
            map: glowTexture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            polygonOffset: true,
            polygonOffsetFactor: -2
        });
        this.glowGeo = new THREE.PlaneGeometry(3.8, 3.8);
        this.glowGeo.rotateX(-Math.PI / 2);

        const tagTexture = new CanvasTexture(rawAssets.tagCanvas);
        this.tagMat = new MeshBasicMaterial({
            map: tagTexture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        this.tagGeo = new THREE.PlaneGeometry(0.5, 0.5);

        const voidTexture = new CanvasTexture(rawAssets.masterNoise);
        voidTexture.wrapS = voidTexture.wrapT = THREE.RepeatWrapping;
        this.voidMat = new MeshStandardMaterial({
            color: 0x020202,
            roughness: 0.15,
            metalness: 0.8,
            bumpMap: voidTexture,
            bumpScale: 0.08
        });

        this.rustMat = new MeshStandardMaterial({color: 0x3a1c14, roughness: 1.0, metalness: 0.3});

        this.metalMat = new MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.6,
            metalness: 0.4,
            map: structTexture,
            bumpMap: structTexture,
            bumpScale: 0.02
        });

        const almondTexture = new CanvasTexture(rawAssets.almondCanvas);
        this.almondMat = new MeshStandardMaterial({map: almondTexture, roughness: 0.8});

        const applyOpt = (item) => {
            if (item && item.isTexture) {
                item.anisotropy = 16;
                item.colorSpace = THREE.SRGBColorSpace;
            }
            if (item && item.map && item.map.isTexture) {
                item.map.anisotropy = 16;
                item.map.colorSpace = THREE.SRGBColorSpace;
            }
            if (item && item.emissiveMap && item.emissiveMap.isTexture) {
                item.emissiveMap.anisotropy = 16;
                item.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            }
        };

        const matsToOpt = [
            this.wallTexture, this.headerMat, this.structMat, this.woodMat, ...this.doorMat,
            this.carpetMat, this.ceilMat, this.tileMat, this.clinicMat, this.moldMat,
            this.ceilingStainMat, this.fabricMat, this.mossMat, this.ventMat, this.serverMat,
            this.baseLightMat, this.baseBrokenLightMat, this.baseHousingMat, this.waterMat,
            this.hazardMat, this.glowMat, this.tagMat, this.voidMat, this.rustMat, this.metalMat, this.almondMat
        ];

        matsToOpt.forEach(item => applyOpt(item));


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
        const exhaustGeo = new THREE.BufferGeometry();
        const exhaustCount = 450;
        const exhaustPos = new Float32Array(exhaustCount * 3);
        for (let i = 0; i < exhaustCount * 3; i++) {
            exhaustPos[i] = (Math.random() - 0.5) * 30.0;
        }
        exhaustGeo.setAttribute('position', new THREE.BufferAttribute(exhaustPos, 3));
        this.exhaustMat = new THREE.PointsMaterial({
            color: 0x00ffcc,
            size: 0.08,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.exhaustCloud = new THREE.Points(exhaustGeo, this.exhaustMat);
        this.scene.add(this.exhaustCloud);
        this.lumenGrid = new LumenGrid(this.scene, this.isMobile);
        this.anomaly = new Anomaly(this.scene, this.camera, this.player, this);
        this.tagPool = [];
        this.tagIndex = 0;
        this.tagGroup = new Group();
        for (let i = 0; i < 50; i++) {
            const tag = new Mesh(this.tagGeo, this.tagMat);
            tag.visible = false;
            this.tagGroup.add(tag);
            this.tagPool.push(tag);
        }
        this.scene.add(this.tagGroup);
        this.scene.add(this.camera);
        this.flashlight = new SpotLight(0xffe8b3, 0.0, 45.0, Math.PI / 7, 0.5, 2.0);
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
        this.tagRaycaster = new Raycaster();
        document.addEventListener('somatic-tag', () => {
            this.tagRaycaster.set(this.camera.position, this.camera.getWorldDirection(new Vector3()));
            const intersects = this.tagRaycaster.intersectObjects(this.walls, false);
            if (intersects.length > 0 && intersects[0].distance < 3.0) {
                const hit = intersects[0];
                const tag = this.tagPool[this.tagIndex];
                tag.visible = true;
                tag.position.copy(hit.point);
                let normal = hit.face ? hit.face.normal.clone() : new Vector3(0, 0, 1);
                if (hit.object && hit.object.isInstancedMesh && hit.instanceId !== undefined) {
                    const instanceMatrix = new Matrix4();
                    hit.object.getMatrixAt(hit.instanceId, instanceMatrix);
                    const normalMatrix = new Matrix3().getNormalMatrix(instanceMatrix);
                    normal.applyMatrix3(normalMatrix).normalize();
                } else if (hit.object) {
                    const normalMatrix = new Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    normal.applyMatrix3(normalMatrix).normalize();
                }
                tag.lookAt(hit.point.clone().add(normal));
                tag.rotateZ((Math.random() - 0.5) * 0.4);
                this.tagIndex = (this.tagIndex + 1) % this.tagPool.length;
            }
        });
        this._interactDir = new Vector3();
        document.addEventListener('somatic-interact', (e) => {
            let hit = null;
            let closestDistSq = 9.0;
            const checkObj = (obj) => {
                const distSq = obj.position.distanceToSquared(e.detail.position);
                if (distSq < closestDistSq) {
                    this._interactDir.subVectors(obj.position, e.detail.position).normalize();
                    if (e.detail.direction.dot(this._interactDir) > 0.75) {
                        closestDistSq = distSq;
                        hit = obj;
                    }
                }
            };
            if (this.interactables) this.interactables.forEach(checkObj);
            if (this.interactiveDoors) this.interactiveDoors.forEach(checkObj);
            if (hit && hit.userData.closedRot !== undefined) {
                hit.userData.playerOpen = !hit.userData.playerOpen;
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 1.0, intensity: 0.5}}));
                return;
            }
            if (hit && hit.userData.type === 'breaker') {
                if (!hit.userData.active) return;
                hit.userData.active = false;
                const chunkHash = hit.userData.chunkHash;
                const isBlackout = this.blackoutChunks.has(chunkHash);
                if (hit.userData.door && !hit.userData.doorOpen) {
                    hit.userData.door.rotation.y = -Math.PI / 1.5;
                    hit.userData.doorOpen = true;
                }
                document.dispatchEvent(new CustomEvent('somatic-breaker', {detail: {distSq: 1.0, intensity: 2.0}}));
                if (!isBlackout) {
                    this.blackoutChunks.add(chunkHash);
                    this.fixtureData.forEach(fixture => {
                        if (fixture.chunkHash === chunkHash && !fixture.isDead) {
                            fixture.originalFaulty = fixture.isFaulty;
                            fixture.baseIntensity = 2.5;
                            fixture.targetIntensity = 2.5;
                            fixture.currentIntensity = 2.5;
                            fixture.isDead = true;
                            if (fixture.isFake && fixture.material) fixture.material.emissiveIntensity = 2.0;
                            if (fixture.material && fixture.material.color && !fixture.originalColor) {
                                fixture.originalColor = fixture.material.color.getHex();
                                fixture.originalEmissive = fixture.material.emissive.getHex();
                            }
                            clearTimeout(fixture.flickerTimer);
                            clearTimeout(fixture.restoreTimer);
                            fixture.flickerTimer = setTimeout(() => {
                                fixture.baseIntensity = 0.0;
                                fixture.targetIntensity = 0.0;
                                fixture.currentIntensity = 0.0;
                                if (fixture.material && fixture.originalColor) {
                                    fixture.material.color.setHex(0x333333);
                                    fixture.material.emissive.setHex(0x000000);
                                    fixture.material.emissiveIntensity = 0.0;
                                }
                            }, 200 + Math.random() * 600);
                            fixture.restoreTimer = setTimeout(() => {
                                this.blackoutChunks.delete(chunkHash);
                                fixture.isDead = false;
                                fixture.isFaulty = fixture.originalFaulty !== undefined ? fixture.originalFaulty : false;
                                fixture.baseIntensity = fixture.isFake ? 0.0 : 0.6;
                                fixture.targetIntensity = fixture.baseIntensity;
                                fixture.currentIntensity = fixture.baseIntensity;
                                if (fixture.material && fixture.originalColor) {
                                    fixture.material.color.setHex(fixture.originalColor);
                                    fixture.material.emissive.setHex(fixture.originalEmissive);
                                    if (fixture.isFake) fixture.material.emissiveIntensity = 0.4;
                                }
                            }, 25000 + Math.random() * 10000);
                        }
                    });
                } else {
                    this.blackoutChunks.delete(chunkHash);
                    this.fixtureData.forEach(fixture => {
                        if (fixture.chunkHash === chunkHash) {
                            clearTimeout(fixture.flickerTimer);
                            clearTimeout(fixture.restoreTimer);
                            fixture.isDead = false;
                            fixture.isFaulty = fixture.originalFaulty !== undefined ? fixture.originalFaulty : false;
                            fixture.baseIntensity = fixture.isFake ? 0.0 : 0.6;
                            fixture.targetIntensity = fixture.baseIntensity;
                            fixture.currentIntensity = fixture.baseIntensity;
                            if (fixture.material && fixture.originalColor) {
                                fixture.material.color.setHex(fixture.originalColor);
                                fixture.material.emissive.setHex(fixture.originalEmissive);
                                if (fixture.isFake) fixture.material.emissiveIntensity = 0.4;
                            }
                        }
                    });
                }
            } else if (hit && hit.userData.type === 'exit_switch') {
                if (!hit.userData.active) {
                    hit.userData.active = true;
                    hit.children[0].material = new MeshBasicMaterial({color: 0x55ff55});
                    this.player.objectives.fixed++;
                    this.player.updateObjectives();
                    document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 0.1, intensity: 1.5}}));
                    if (this.engine.ambientLight) {
                        this.engine.ambientLight.intensity = 2.0;
                    }
                }
            } else if (hit && hit.userData.type === 'grate' && hit.userData.active) {
                hit.userData.active = false;
                document.dispatchEvent(new CustomEvent('somatic-vent', {detail: {distSq: 1.0, intensity: 1.5}}));
            } else if (hit && hit.userData.type === 'battery' && hit.userData.active) {
                if (this.player.inventory.batteries < this.player.MAX_BATTERIES) {
                    hit.userData.active = false;
                    hit.visible = false;
                    document.dispatchEvent(new Event('somatic-pickup-battery'));
                }
            } else if (hit && hit.userData.type === 'almond' && hit.userData.active) {
                if (this.player.inventory.almondWater < this.player.MAX_ALMOND_WATER) {
                    hit.userData.active = false;
                    hit.visible = false;
                    document.dispatchEvent(new Event('somatic-pickup-almond'));
                }
            } else if (hit && hit.userData.type === 'exit' && hit.userData.active) {
                hit.userData.active = false;
                this.player.objectives.escaped = true;
                this.player.objectiveUI.innerHTML = '> SECTOR BREACHED.<br>> DESCENDING TO DEEPER LAYER...';
                this.player.objectiveUI.style.color = '#aa55ff';
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 0.1, intensity: 3.0}}));
                if (this.engine.ambientLight) this.engine.ambientLight.intensity = 5.0;
                const flash = document.getElementById('flash-overlay');
                if (flash) {
                    flash.style.transition = 'opacity 3.0s ease-in';
                    flash.style.backgroundColor = '#000';
                    flash.style.opacity = '1';
                    setTimeout(() => {
                        this.player.objectives.fixed = 0;
                        this.player.objectives.escaped = false;
                        this.player.updateObjectives();
                        this.generate(true);
                    }, 3500);
                }
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
        this.interactables = [];
        this.spatialGrid.clear();
        this.currentChunkCoords = {x: null, z: null};
        this.blackoutChunks.clear();
        this.observers = [];
        this._globalSwitches = [];
        if (this.tagPool) {
            this.tagPool.forEach(tag => tag.visible = false);
            this.tagIndex = 0;
        }
        this.chunkQueue = [];
        this.isBuildingChunk = false;
        this.player.velocity.set(0, 0, 0);
        if (isWarp) {
            const signX = Math.random() > 0.5 ? 1 : -1;
            const signZ = Math.random() > 0.5 ? 1 : -1;
            const warpX = this.camera.position.x + (signX * (1500 + Math.random() * 2000));
            const warpZ = this.camera.position.z + (signZ * (1500 + Math.random() * 2000));
            this.camera.position.set(warpX, 1.6, warpZ);
            this.anomaly.reset(warpX + 32, 1.5, warpZ + 32);
        } else {
            this.camera.position.set(0, 1.6, 0);
            this.anomaly.reset(32, 1.5, 32);
            const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
            this.baseSeed = 0;
            for (let i = 0; i < seedString.length; i++) {
                this.baseSeed = ((this.baseSeed << 5) - this.baseSeed) + seedString.charCodeAt(i);
                this.baseSeed |= 0;
            }
        }
        this.cellSize = 4;
        if (!this.sharedWallGeo) {
            this.sharedWallGeo = new BoxGeometry(this.cellSize + 0.02, 3, this.cellSize + 0.02);
            this.sharedWallMat = new MeshStandardMaterial({
                map: this.wallTexture,
                color: 0xffffff,
                roughness: 0.6,
                bumpMap: this.wallTexture,
                bumpScale: 0.010
            });
            this.sharedPanelGeo = new BoxGeometry(0.98, 0.05, 1.98);
            this.pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, this.cellSize, 8);
            this.pipeGeo.rotateZ(Math.PI / 2);
            this.pipeJointGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8);
            this.pipeJointGeo.rotateZ(Math.PI / 2);
            this.pipeJunctionGeo = new BoxGeometry(0.28, 0.28, 0.28);
            this.pipeMountGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
            this.vPipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8);
            this.rustMat = new MeshStandardMaterial({
                color: 0x6b6358,
                emissive: 0x222222,
                roughness: 0.4,
                metalness: 0.85,
                bumpMap: this.structMat.map,
                bumpScale: 0.015
            });
            this.cushionGeo = new BoxGeometry(0.8, 0.15, 0.8);
            this.backrestGeo = new BoxGeometry(0.8, 0.8, 0.15);
            this.legGeo = new BoxGeometry(0.1, 0.4, 0.1);
            this.tableTopGeo = new BoxGeometry(1.2, 0.05, 1.2);
            this.tableBaseGeo = new BoxGeometry(0.5, 0.8, 0.5);
            this.wallVentMat = this.ventMat.clone();
            this.wallVentMat.map = this.ventMat.map.clone();
            this.wallVentMat.map.repeat.set(1, 1);
            this.serverFloorMat = this.ventMat.clone();
            this.serverFloorMat.map = this.ventMat.map.clone();
            this.serverFloorMat.map.repeat.set(64, 32);
            this.breakerBaseGeo = new BoxGeometry(0.6, 0.8, 0.20);
            this.breakerDoorGeo = new BoxGeometry(0.6, 0.8, 0.05);
            this.breakerDoorGeo.translate(0.3, 0, 0);
            this.geoCache = new Map();
            this.almondPrefab = new Group();
            const aBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16);
            const aNeckGeo = new THREE.CylinderGeometry(0.012, 0.035, 0.05, 16);
            const aCapGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.015, 12);
            const aBody = new Mesh(aBodyGeo, this.almondMat);
            aBody.position.y = 0.06;
            const aNeck = new Mesh(aNeckGeo, this.clinicMat);
            aNeck.position.y = 0.12 + 0.025;
            const aCap = new Mesh(aCapGeo, this.metalMat);
            aCap.position.y = 0.12 + 0.05 + 0.0075;
            this.almondPrefab.add(aBody, aNeck, aCap);
            this.batteryPrefab = new Group();
            const bBodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16);
            const bRimGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.015, 16);
            const bTermGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12);
            const bBody = new Mesh(bBodyGeo, this.hazardMat);
            bBody.position.y = 0.08;
            const bTopRim = new Mesh(bRimGeo, this.metalMat);
            bTopRim.position.y = 0.16 - 0.0075;
            const bBotRim = new Mesh(bRimGeo, this.metalMat);
            bBotRim.position.y = 0.0075;
            const bTerm = new Mesh(bTermGeo, this.metalMat);
            bTerm.position.y = 0.16 + 0.01;
            this.batteryPrefab.add(bBody, bTopRim, bBotRim, bTerm);
            this.observerMat = new MeshBasicMaterial({color: 0x010101, transparent: true, opacity: 0.85});
            this.observerGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.9, 8);
            this.observers = [];
            this.sharedAssets = new Set();
            Object.values(this).forEach(v => {
                if (v && v.isGeometry) this.sharedAssets.add(v.uuid);
                if (v && v.isMaterial) this.sharedAssets.add(v.uuid);
            });
        }
    }

    _createChunkHelpers(hash, chunkGroup, stagingMeshes, random) {
        let hasOasis = random() > 0.95;
        return {
            random,
            hash,
            chunkGroup,
            stagingMeshes,
            playerPos: this.camera.position,
            claimOasis: () => {
                if (hasOasis) {
                    hasOasis = false;
                    return true;
                }
                return false;
            },
            buildWall: (w, d, mat, h = 3.0, yOffset = 0) => {
                w = Math.round(w * 20) / 20;
                d = Math.round(d * 20) / 20;
                h = Math.round(h * 20) / 20;
                yOffset = Math.round(yOffset * 20) / 20;
                const key = `${w}_${h}_${d}_${yOffset}`;
                let geo = this.geoCache.get(key);
                if (!geo) {
                    geo = new BoxGeometry(w + 0.02, h, d + 0.02);
                    const uv = geo.attributes.uv;
                    for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (d / this.cellSize));
                    for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (w / this.cellSize));
                    if (h !== 3.0 || yOffset > 0) {
                        const vStart = yOffset / 3.0;
                        const vRange = h / 3.0;
                        for (let i = 0; i < 8; i++) uv.setY(i, vStart + uv.getY(i) * vRange);
                        for (let i = 16; i < 24; i++) uv.setY(i, vStart + uv.getY(i) * vRange);
                    }
                    if (h !== 3.0 && yOffset === 0) {
                        for (let i = 8; i < 16; i++) uv.setY(i, uv.getY(i) * (h / 3.0));
                    }
                    this.geoCache.set(key, geo);
                    this.geoCache.set(geo.uuid, true);
                }
                return new Mesh(geo, mat);
            },
            addGeometry: (mesh, isWarp = false) => {
                mesh.userData.chunkHash = hash;
                mesh.updateMatrixWorld(true);
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
                box.chunkHash = hash;
                if (mesh.userData.isEntityBlocker) box.isEntityBlocker = true;
                if (isWarp) box.isWarpZone = true;
                this.spatialGrid.insert(box);
                stagingMeshes.push(mesh);
            },
            addFurniture: (group) => {
                if (Math.abs(group.position.x) < 4.0 && Math.abs(group.position.z) < 4.0) return;
                group.userData.chunkHash = hash;
                group.updateMatrixWorld(true);
                const box = new Box3().setFromObject(group);
                const localBoxes = this.spatialGrid.getNearby(group.position.x, group.position.z, 2.0);
                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].intersectsBox(box)) return;
                }
                box.chunkHash = hash;
                this.spatialGrid.insert(box);
                group.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.chunkHash = hash;
                        child.updateMatrixWorld(true);
                        stagingMeshes.push(child);
                    }
                });
            },
            addObserver: (px, pz) => {
                const obs = new Mesh(this.observerGeo, this.observerMat.clone());
                obs.position.set(px, 0.95, pz);
                obs.userData = {chunkHash: hash, active: true, fade: 0.85};
                chunkGroup.add(obs);
                this.observers.push(obs);
            },
            addGrate: (px, py, pz, blocksX) => {
                const localBoxes = this.spatialGrid.getNearby(px, pz, 1.0);
                for (let i = 0; i < localBoxes.length; i++) {
                    const b = localBoxes[i];
                    if (b.isGrate) {
                        const dist = Math.abs(b.meshRef.position.x - px) + Math.abs(b.meshRef.position.z - pz);
                        if (dist < 0.1) {
                            if (b.meshRef.parent) {
                                b.meshRef.parent.remove(b.meshRef);
                            }
                            this.interactables = this.interactables.filter(item => item !== b.meshRef);
                            b.isGrate = false;
                            return;
                        }
                    }
                }
                const grateGeo = new BoxGeometry(blocksX ? 0.05 : 1.16, 0.65, blocksX ? 1.16 : 0.05);
                const grate = new Mesh(grateGeo, this.wallVentMat);
                grate.position.set(px, py, pz);
                grate.userData = {type: 'grate', active: true, chunkHash: hash, blocksX: blocksX};
                chunkGroup.add(grate);
                this.interactables.push(grate);
                const grateBox = new Box3().setFromObject(grate);
                grateBox.chunkHash = hash;
                grateBox.isGrate = true;
                grateBox.meshRef = grate;
                grate.userData.box = grateBox;
                this.spatialGrid.insert(grateBox);
            },
            buildChair: (x, y, z, rotY) => {
                const group = new Group();
                const seat = new Mesh(this.cushionGeo, this.fabricMat);
                seat.position.set(0, 0.4, 0);
                group.add(seat);
                const back = new Mesh(this.backrestGeo, this.fabricMat);
                back.position.set(0, 0.8, -0.3);
                group.add(back);
                const l1 = new Mesh(this.legGeo, this.structMat);
                l1.position.set(0.3, 0.2, 0.3);
                group.add(l1);
                const l2 = new Mesh(this.legGeo, this.structMat);
                l2.position.set(-0.3, 0.2, 0.3);
                group.add(l2);
                const l3 = new Mesh(this.legGeo, this.structMat);
                l3.position.set(0.3, 0.2, -0.3);
                group.add(l3);
                const l4 = new Mesh(this.legGeo, this.structMat);
                l4.position.set(-0.3, 0.2, -0.3);
                group.add(l4);
                group.position.set(x, y, z);
                group.rotation.y = rotY;
                return group;
            },
            buildTable: (x, y, z) => {
                const group = new Group();
                const top = new Mesh(this.tableTopGeo, this.woodMat);
                top.position.set(0, 0.8, 0);
                group.add(top);
                const base = new Mesh(this.tableBaseGeo, this.structMat);
                base.position.set(0, 0.4, 0);
                group.add(base);
                group.position.set(x, y, z);
                return group;
            },
            buildPerimeter: (x, z, localX, localZ, inDir, outDir, wallMat) => {
                const isPerimeter = localX === 0 || localX === this.chunkSize - 1 || localZ === 0 || localZ === this.chunkSize - 1;
                if (!isPerimeter) return false;
                let isDoorway = false;
                if (localX === 7 && (localZ === 0 || localZ === this.chunkSize - 1)) isDoorway = true;
                if (localZ === 7 && (localX === 0 || localX === this.chunkSize - 1)) isDoorway = true;
                if (!isDoorway) {
                    const key = `${this.cellSize}_3.0_${this.cellSize}_0`;
                    let geo = this.geoCache.get(key);
                    if (!geo) {
                        geo = new BoxGeometry(this.cellSize + 0.02, 3.0, this.cellSize + 0.02);
                        this.geoCache.set(key, geo);
                        this.geoCache.set(geo.uuid, true);
                    }
                    const wall = new Mesh(geo, wallMat || this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    wall.userData.chunkHash = hash;
                    wall.updateMatrixWorld(true);
                    if (!wall.geometry.boundingBox) wall.geometry.computeBoundingBox();
                    const box = wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
                    box.chunkHash = hash;
                    box.isEntityBlocker = true;
                    this.spatialGrid.insert(box);
                    stagingMeshes.push(wall);
                    return true;
                }
                return false;
            }
        };
    }

    async buildChunk(chunkX, chunkZ, hash) {
        const chunkGroup = new Group();
        this.scene.add(chunkGroup);
        this.activeChunks.set(hash, chunkGroup);
        let structuralShift = 0;
        if (this.player && this.player.paranoia > 0.6) {
            structuralShift = Math.floor(this.player.paranoia * 1000) * (chunkX % 2 === 0 ? 1 : -1);
        }
        let prngSeed = (this.baseSeed + structuralShift + (chunkX * 104729) + (chunkZ * 1299827)) >>> 0;
        const random = () => {
            prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
            return prngSeed / 4294967296.0;
        };
        const cx = Math.sin(this.baseSeed) * 0.8;
        const cy = Math.cos(this.baseSeed * 0.5) * 0.8;
        const stagingMeshes = [];
        const ctx = this._createChunkHelpers(hash, chunkGroup, stagingMeshes, random);
        const structuralMatrix = TheArchitect.getStructuralMatrix.call(this, ctx);
        const sectorMatrix = TheArchitect.getSectorMatrix.call(this, ctx);
        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        const isMacroStructure = random() > 0.70 && (Math.abs(chunkX) > 0 || Math.abs(chunkZ) > 0);
        let activeSector = null;
        let sectorMaze = null;
        let chunkBreakerCount = 0;
        const breakerPositions = [];
        const hashVal = Math.abs((chunkX * 104729) + (chunkZ * 1299827));
        const inDir = hashVal % 4;
        const outDir = (hashVal + 1 + (hashVal % 3)) % 4;
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
            if (["THE ARCHIVE", "THE SERVER FARM", "THE MAINTENANCE SHAFTS", "THE POOLROOMS"].includes(activeSector.name)) {
                sectorMaze = this._generateSectorMaze(random, inDir, outDir);
            }
            if (activeSector.foundationMat) {
                const foundationGeo = new THREE.PlaneGeometry(this.chunkSize * this.cellSize, this.chunkSize * this.cellSize);
                const foundation = new Mesh(foundationGeo, activeSector.foundationMat);
                foundation.rotation.x = -Math.PI / 2;
                const centerOffset = (this.chunkSize * this.cellSize) / 2 - (this.cellSize / 2);
                foundation.position.set(startX * this.cellSize + centerOffset, 0.02, startZ * this.cellSize + centerOffset);
                foundation.receiveShadow = true;
                foundation.updateMatrixWorld(true);
                chunkGroup.add(foundation);
            }
        }
        const isChasm = activeSector && activeSector.name === "THE CHASM";
        const centerOffset = (this.chunkSize * this.cellSize) / 2 - (this.cellSize / 2);
        const floorGeo = new THREE.PlaneGeometry(this.chunkSize * this.cellSize, this.chunkSize * this.cellSize);
        const ceilGeo = new THREE.PlaneGeometry(this.chunkSize * this.cellSize, this.chunkSize * this.cellSize);
        if (!isMacroStructure && !isChasm) {
            const floor = new Mesh(floorGeo, this.carpetMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(startX * this.cellSize + centerOffset, 0, startZ * this.cellSize + centerOffset);
            floor.receiveShadow = true;
            floor.updateMatrixWorld(true);
            chunkGroup.add(floor);
        }
        if (!isChasm && (!activeSector || activeSector.name !== "THE OVERGROWN ATRIUM")) {
            const ceil = new Mesh(ceilGeo, this.ceilMat);
            ceil.rotation.x = Math.PI / 2;
            ceil.position.set(startX * this.cellSize + centerOffset, 3, startZ * this.cellSize + centerOffset);
            ceil.updateMatrixWorld(true);
            chunkGroup.add(ceil);
        }
        let chunkStartTime = performance.now();
        const occupied = new Set();
        ctx.markOccupied = (ox, oz) => occupied.add(`${ox},${oz}`);
        ctx.isOccupied = (ox, oz) => occupied.has(`${ox},${oz}`);
        for (let x = startX; x < startX + this.chunkSize; x++) {
            for (let z = startZ; z < startZ + this.chunkSize; z++) {
                if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
                if (ctx.isOccupied(x, z)) continue;
                ctx.markOccupied(x, z);
                const localX = x - startX;
                const localZ = z - startZ;
                if (isMacroStructure) {
                    activeSector.build(x, z, localX, localZ, typeof sectorMaze !== 'undefined' ? sectorMaze : null, inDir, outDir);
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
                        const stain = new Mesh(this.moldGeo, this.moldMat);
                        stain.position.set(x * this.cellSize + offsetX, 0.01, z * this.cellSize + offsetZ);
                        stain.rotation.y = rotY;
                        stain.scale.set(scale, scale, scale);
                        ctx.addGeometry(stain);
                        if (offsetX > 0.8) {
                            const ceilingStain = new Mesh(this.ceilingStainGeo, this.ceilingStainMat);
                            ceilingStain.position.set(x * this.cellSize + offsetZ, 2.99, z * this.cellSize - offsetX);
                            ceilingStain.rotation.y = rotY + 1.5;
                            ceilingStain.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
                            ctx.addGeometry(ceilingStain);
                        }
                    } else if (floorRoll > 0.80) {
                        hasTallObstacle = true;
                        const divW = random() > 0.5 ? this.cellSize * 0.8 : this.cellSize * 0.2;
                        const divD = divW === this.cellSize * 0.8 ? this.cellSize * 0.2 : this.cellSize * 0.8;
                        const divider = ctx.buildWall(divW, divD, this.sharedWallMat);
                        divider.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        ctx.addGeometry(divider);
                        if (random() > 0.6) {
                            const isWide = divW > divD;
                            const clearX = isWide ? 0.0 : 1.2;
                            const clearZ = isWide ? 1.2 : 0.0;
                            const rot = isWide ? 0 : -Math.PI / 2;
                            const chair = ctx.buildChair(x * this.cellSize + clearX, 0, z * this.cellSize + clearZ, rot);
                            ctx.addFurniture(chair);
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
                        const panel = new Mesh(this.sharedPanelGeo, matArray);
                        panel.position.set(posX, 2.98, posZ);
                        if (isRotated) panel.rotation.y = Math.PI / 2;
                        panel.userData.chunkHash = hash;
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        if (!isBroken) {
                            const isTracked = random() > 0.85;
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new Vector3(posX, 2.8, posZ),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: isTracked ? (random() > 0.75) : false,
                                baseIntensity: isTracked ? 0.6 : 0.0,
                                targetIntensity: isTracked ? 0.6 : 0.0,
                                currentIntensity: isTracked ? 0.6 : 0.0,
                                isFake: !isTracked
                            });
                            if (!isTracked) {
                                const glow = new Mesh(this.glowGeo, this.glowMat);
                                glow.position.set(posX, 0.03, posZ);
                                glow.userData.chunkHash = hash;
                                glow.updateMatrixWorld(true);
                                stagingMeshes.push(glow);
                            }
                        }
                    } else if (!hasTallObstacle && random() > 0.95 && chunkBreakerCount < 3) {
                        const px = x * this.cellSize;
                        const pz = z * this.cellSize;
                        let isTooClose = false;
                        for (let b = 0; b < breakerPositions.length; b++) {
                            const dx = px - breakerPositions[b].x;
                            const dz = pz - breakerPositions[b].z;
                            if (dx * dx + dz * dz < 256.0) {
                                isTooClose = true;
                                break;
                            }
                        }
                        if (ctx.playerPos) {
                            const dxPlayer = px - ctx.playerPos.x;
                            const dzPlayer = pz - ctx.playerPos.z;
                            if (dxPlayer * dxPlayer + dzPlayer * dzPlayer < 1600.0) {
                                isTooClose = true;
                            }
                        }
                        if (!isTooClose) {
                            chunkBreakerCount++;
                            breakerPositions.push({x: px, z: pz});
                            const pillar = new Mesh(new BoxGeometry(0.8, 3.0, 0.8), this.structMat);
                            pillar.position.set(px, 1.5, pz);
                            chunkGroup.add(pillar);
                            const breakerGroup = new Group();
                            breakerGroup.position.set(px, 1.5, pz + 0.525);
                            const breakerBase = new Mesh(this.breakerBaseGeo, this.rustMat);
                            breakerBase.position.set(0, 0, -0.025);
                            breakerGroup.add(breakerBase);
                            const breakerDoor = new Mesh(this.breakerDoorGeo, this.hazardMat);
                            breakerDoor.position.set(-0.3, 0, 0.102);
                            breakerGroup.add(breakerDoor);
                            breakerGroup.userData = {type: 'breaker', chunkHash: hash, active: true, door: breakerDoor};
                            chunkGroup.add(breakerGroup);
                            this.interactables.push(breakerGroup);
                            const pBox = new Box3().setFromObject(pillar);
                            pBox.chunkHash = hash;
                            this.spatialGrid.insert(pBox);
                        }
                    }
                }
            }
            if (performance.now() - chunkStartTime > 8.0) {
                await new Promise(resolve => requestAnimationFrame(resolve));
                chunkStartTime = performance.now();
            }
        }
        this._compileInstances(hash, chunkGroup, stagingMeshes, random);
    }

    _generateSectorMaze(randomFn, inDir, outDir) {
        const maze = Array(this.chunkSize).fill().map(() => Array(this.chunkSize).fill(true));
        const carve = (cx, cz) => {
            maze[cx][cz] = false;
            const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
            dirs.sort(() => randomFn() - 0.5);
            for (let [dx, dz] of dirs) {
                const nx = cx + dx, nz = cz + dz;
                if (nx > 0 && nx < this.chunkSize - 1 && nz > 0 && nz < this.chunkSize - 1 && maze[nx][nz]) {
                    maze[cx + dx / 2][cz + dz / 2] = false;
                    carve(nx, nz);
                }
            }
        };
        carve(7, 7);
        for (let i = 0; i < 20; i++) {
            let rx = Math.floor(randomFn() * (this.chunkSize - 4)) + 2;
            let rz = Math.floor(randomFn() * (this.chunkSize - 4)) + 2;
            maze[rx][rz] = false;
        }
        maze[7][0] = false;
        maze[7][1] = false;
        maze[15][7] = false;
        maze[14][7] = false;
        maze[7][15] = false;
        maze[7][14] = false;
        maze[0][7] = false;
        maze[1][7] = false;
        return maze;
    }

    _compileInstances(hash, chunkGroup, stagingMeshes, randomFn) {
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
        const dummyColor = new Color();
        instancedGroups.forEach(group => {
            const isDecal = group.material === this.moldMat || group.material === this.ceilingStainMat || group.material === this.glowMat;
            if (group.meshes.length > 1) {
                const iMesh = new InstancedMesh(group.geometry, group.material, group.meshes.length);
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
                        const shade = 0.85 + (randomFn() * 0.15);
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
        return this.anomaly.update(delta, time);
    }

    updateLights(time) {
        const cameraPos = this.camera.position;
        if (!this.audioRaycaster) {
            this.audioRaycaster = new Raycaster();
            this.audioDirection = new Vector3();
        }
        const lumenData = this.lumenGrid.update(cameraPos, this.fixtureData, time);
        const darknessPressure = lumenData.darknessPressure;
        const nearestFixture = lumenData.nearestFixture;
        const minLightDistSq = lumenData.minLightDistSq;
        this.player.darknessPressure = darknessPressure;
        const minLightDist = nearestFixture ? Math.sqrt(minLightDistSq) : Infinity;
        if (nearestFixture && minLightDist > 1.0) {
            if (time - this.lastAudioOcclusionTime > 0.1) {
                this.audioDirection.subVectors(nearestFixture.position, cameraPos).normalize();
                this.audioRaycaster.set(cameraPos, this.audioDirection);
                if (!this._rayTarget) this._rayTarget = new Vector3();
                let isHit = false;
                const localBoxes = this.spatialGrid.getNearby(cameraPos.x, cameraPos.z, Math.min(minLightDist, 15.0));
                const ray = this.audioRaycaster.ray;
                const distSqLimit = minLightDist * minLightDist;
                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].isInvisibleBlocker) continue;
                    if (ray.intersectBox(localBoxes[i], this._rayTarget)) {
                        if (cameraPos.distanceToSquared(this._rayTarget) < distSqLimit) {
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

        let structuralShift = 0;
        if (this.player && this.player.coherence < 0.4) {
            structuralShift = Math.floor((1.0 - this.player.coherence) * 1000) * (pChunkX % 2 === 0 ? 1 : -1);
        }

        let pSeed = (this.baseSeed + structuralShift + (pChunkX * 104729) + (pChunkZ * 1299827)) >>> 0;
        const pRandom = () => {
            pSeed = (pSeed * 1664525 + 1013904223) >>> 0;
            return pSeed / 4294967296.0;
        };
        const dummyOasisRoll = pRandom();
        const isMacroLoc = pRandom() > 0.70 && (Math.abs(pChunkX) > 0 || Math.abs(pChunkZ) > 0);
        const sectorRoll = pRandom();
        let activeSector = "NORMAL";
        let targetFog = 0.05;
        if (isMacroLoc) {
            if (sectorRoll <= 0.12) {
                activeSector = "POOLROOMS";
                targetFog = 0.08;
            } else if (sectorRoll <= 0.24) {
                activeSector = "CLINIC";
                targetFog = 0.03;
            } else if (sectorRoll <= 0.36) {
                activeSector = "BOARDROOM";
                targetFog = 0.015;
            } else if (sectorRoll <= 0.48) {
                activeSector = "ARCHIVE";
                targetFog = 0.12;
            } else if (sectorRoll <= 0.60) {
                activeSector = "SERVER";
                targetFog = 0.08;
            } else if (sectorRoll <= 0.70) {
                activeSector = "MAINTENANCE";
                targetFog = 0.10;
            } else if (sectorRoll <= 0.76) {
                activeSector = "CHASM";
                targetFog = 0.015;
            } else if (sectorRoll <= 0.82) {
                activeSector = "INCINERATOR";
                targetFog = 0.25;
            } else if (sectorRoll <= 0.88) {
                activeSector = "ATRIUM";
                targetFog = 0.18;
            } else {
                activeSector = "CHECKPOINT";
                targetFog = 0.05;
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
            const targetDustOpacity = this.player.isCrawling ? 0.35 : 0.10;
            const targetDustSize = this.player.isCrawling ? 0.08 : 0.05;
            this.dustCloud.material.opacity += (targetDustOpacity - this.dustCloud.material.opacity) * 0.05;
            this.dustCloud.material.size += (targetDustSize - this.dustCloud.material.size) * 0.05;
        }
        if (this.exhaustCloud) {
            this.exhaustCloud.position.copy(cameraPos);
            this.exhaustCloud.rotation.y = time * -0.07;
            this.exhaustCloud.rotation.x = time * 0.04;
            const targetExhaustOpacity = (activeSector === "INCINERATOR") ? 0.85 : ((activeSector === "SERVER") ? 0.35 : 0.0);
            this.exhaustMat.opacity += (targetExhaustOpacity - this.exhaustMat.opacity) * 0.02;
            if (this.exhaustMat.opacity > 0.01) {
                this.exhaustMat.size = 0.08 + (Math.sin(time * 12.0) * 0.02);
            }
        }
        const anomalyPressure = this.player.anomalyPressure || 0;
        if (this.interactables && this.player && this.player.updateObjectives) {
            let nearestDist = Infinity;
            const isExitPhase = this.player.objectives.fixed >= this.player.objectives.total;
            const targetType = isExitPhase ? 'exit' : 'exit_switch';
            for (let i = 0; i < this.interactables.length; i++) {
                const item = this.interactables[i];
                const isValidTarget = isExitPhase ? item.userData.active === true : item.userData.active === false;
                if (item.userData.type === targetType && isValidTarget) {
                    const dist = cameraPos.distanceTo(item.position);
                    if (dist < nearestDist) nearestDist = dist;
                }
            }
            let signalText = nearestDist < 1000 ? `${nearestDist.toFixed(1)}m` : 'WEAK - RELOCATE';
            if (anomalyPressure > 0.05 && nearestDist < 1000) {
                signalText = Math.random() < (anomalyPressure * 1.5) ? 'ERR!_m' : signalText;
            }
            this.player.updateObjectives(signalText);
        }
        if (this.flashlight) {
            let targetIntensity = this.player.flashlightActive ? 1.1 : 0.0;
            if (this.player.flashlightActive) {
                const batteryFactor = Math.min(1.0, this.player.flashlightBattery / 30.0);
                targetIntensity *= (0.1 + 0.9 * batteryFactor);
                if (this.player.flashlightBattery < 15.0 && Math.random() > 0.8) {
                    targetIntensity *= 0.1;
                }
            }
            this.flashlight.intensity += (targetIntensity - this.flashlight.intensity) * 0.4;
        }
        const playerSpeed = Math.sqrt((this.player.velocity.x * this.player.velocity.x) + (this.player.velocity.z * this.player.velocity.z));
        if (this.engine.ambientLight) {
            const baseAmbient = 0.85;
            const minAmbient = 0.005;
            const targetAmbient = Math.max(minAmbient, baseAmbient - (darknessPressure * 0.4));
            this.engine.ambientLight.intensity += (targetAmbient - this.engine.ambientLight.intensity) * 0.05;
            if (this.glowMat) {
                const targetGlowOpacity = Math.max(0.0, 1.0 - (darknessPressure * 0.4));
                this.glowMat.opacity += (targetGlowOpacity - this.glowMat.opacity) * 0.1;
            }
            if (!this._baseEnvColor) this._baseEnvColor = new Color(0xa89f68);
            if (!this._blackColor) this._blackColor = new Color(0x000000);
            const darknessRatio = Math.min(1.0, darknessPressure * 0.4);
            const targetColor = this._baseEnvColor.clone().lerp(this._blackColor, darknessRatio);
            this.scene.background.lerp(targetColor, 0.05);
            this.scene.fog.color.lerp(targetColor, 0.05);
        }
        return {
            minLightDist,
            isOccluded,
            activeSector,
            anomalyPressure,
            playerSpeed,
            playerExhaustion: this.player.exhaustion,
            isBlackout: this.blackoutChunks.size > 0
        };
    }
}