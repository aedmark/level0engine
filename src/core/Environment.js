// Environment.js
// LEVEL 0 ENVIRONMENT & MEMORY MANAGER

import ProceduralTextureFactory from '../aesthetics/ProceduralTextureFactory.js';
import Anomaly from '../entities/Anomaly.js';
import SpatialHashGrid from '../math/SpatialHashGrid.js';
import TheArchitect from './TheArchitect.js';
import LumenGrid from '../aesthetics/LumenGrid.js';
import SECTORS from '../world/Sectors.js';
import MaterialLibrary from '../aesthetics/MaterialLibrary.js';
import StructureKit from '../world/StructureKit.js';
import SetPieces from '../world/SetPieces.js';
import InteractionController from '../player/InteractionController.js';

export default class Environment {
    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.fixtureData = [];
        this.idlingCars = [];
        this.spatialGrid = new SpatialHashGrid(4);
        this.wallBoxes = [];
        this.chunkSize = 16;
        this.renderDistance = 1;
        this.activeChunks = new Map();
        this.currentChunkCoords = {x: null, z: null};
        this.interactiveDoors = [];
        this.airlocks = [];
        this.localFixtures = [];
        this.lastAudioOcclusionTime = 0;
        this.currentOcclusionState = false;
        this.chunkQueue = [];
        this.queuedHashes = new Set();
        this.isBuildingChunk = false;
        this.isSpawning = false;
        this._lightSortCache = (a, b) => a.distSq - b.distSq;
        this.blackoutChunks = new Set();
        this.macroZones = new Map();
        this.pointsOfInterest = [];
        this._breakerHuntHops = undefined;
        this._macroChunkHashes = new Set();
        this._sectorBags = null;
        this.structureKit = new StructureKit(this);
        this.setPieces = new SetPieces(this);
        this.interactionController = new InteractionController(this);
    }
    _sectorFog(id) {
        const s = SECTORS[id];
        return (s && s.fog !== undefined) ? s.fog : 0.05;
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
                if (!this.activeChunks.has(hash) && !this.queuedHashes.has(hash)) {
                    this.chunkQueue.push({x: targetX, z: targetZ, hash: hash});
                    this.queuedHashes.add(hash);
                }
            }
        }
        this.processChunkQueue().catch(err => console.error('Chunk queue processing failed:', err));
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
            deadHashes.forEach(h => {
                this.macroZones.delete(h);
                if (this._annexKeypadChunks) this._annexKeypadChunks.delete(h);
            });
            this.walls = this.walls.filter(w => !deadHashes.has(w.userData.chunkHash));
            this.fixtureData = this.fixtureData.filter(f => !deadHashes.has(f.chunkHash));
            this.idlingCars = this.idlingCars.filter(c => !deadHashes.has(c.chunkHash));
            this.interactiveDoors = this.interactiveDoors.filter(d => !deadHashes.has(d.userData.chunkHash));
            if (this.airlocks) {
                this.airlocks = this.airlocks.filter(a => !deadHashes.has(a.chunkHash));
            }
            if (this.interactables) {
                this.interactables = this.interactables.filter(i => !deadHashes.has(i.userData.chunkHash));
            }
            if (this.observers) {
                this.observers = this.observers.filter(o => !deadHashes.has(o.userData.chunkHash));
            }
            if (this.pointsOfInterest) {
                this.pointsOfInterest = this.pointsOfInterest.filter(p => !deadHashes.has(p.chunkHash));
            }
        }
    }
    _rollHuntHops() {
        const r = Math.random();
        if (r < 0.10) return 0;
        if (r < 0.60) return 1;
        return 2;
    }
    shatterFixture(fixture) {
        return this.interactionController.shatterFixture(fixture);
    }
    _updateSliderDoor(door, playerPos, delta) {
        return this.interactionController.updateSliderDoor(door, playerPos, delta);
    }
    updateInteractives(playerPos, delta) {
        return this.interactionController.updateInteractives(playerPos, delta);
    }
    async processChunkQueue() {
        if (this.isBuildingChunk) return;
        this.isBuildingChunk = true;
        try {
            while (this.chunkQueue.length > 0) {
                const chunk = this.chunkQueue.shift();
                this.queuedHashes.delete(chunk.hash);
                const currentX = Math.floor(this.camera.position.x / (this.chunkSize * 4));
                const currentZ = Math.floor(this.camera.position.z / (this.chunkSize * 4));
                if (Math.abs(chunk.x - currentX) <= this.renderDistance && Math.abs(chunk.z - currentZ) <= this.renderDistance) {
                    const genT0 = performance.now();
                    await this.buildChunk(chunk.x, chunk.z, chunk.hash);
                    const genMs = performance.now() - genT0;
                    if (!this.genStats) this.genStats = {count: 0, totalMs: 0, worstMs: 0, lastMs: 0};
                    this.genStats.count++;
                    this.genStats.totalMs += genMs;
                    this.genStats.lastMs = genMs;
                    if (genMs > this.genStats.worstMs) this.genStats.worstMs = genMs;
                    
                    // Yield to the event loop so we don't drop frames during bulk generation
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        } finally {
            this.isBuildingChunk = false;
        }
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
        const assets = ProceduralTextureFactory.generateAssets();
        Object.assign(this, assets);
        const {carpetTexture, ceilingTexture} = assets;
        carpetTexture.repeat.set(16, 16);
        ceilingTexture.repeat.set(128, 128);
        this.carpetMat = new THREE.MeshStandardMaterial({
            map: carpetTexture,
            roughness: 1.0,
            bumpMap: carpetTexture,
            bumpScale: 0.015
        });
        this.ceilMat = new THREE.MeshStandardMaterial({
            map: ceilingTexture,
            color: 0xffffff,
            emissive: 0x444444,
            roughness: 0.9,
            bumpMap: ceilingTexture,
            bumpScale: 0.005
        });
        if (this.serverMat) {
            this.serverMat.metalness = 0.3;
            this.serverMat.roughness = 0.2;
        }
        if (this.ventMat) {
            this.ventMat.metalness = 0.4;
            this.ventMat.roughness = 0.3;
        }
        if (this.metalMat) {
            this.metalMat.metalness = 0.6;
            this.metalMat.roughness = 0.5;
            this.metalMat.map = this.structMat.map;
            this.metalMat.bumpMap = this.structMat.map;
            this.metalMat.bumpScale = 0.03;
        }
        const particleCanvas = document.createElement('canvas');
        particleCanvas.width = 32;
        particleCanvas.height = 32;
        const particleCtx = particleCanvas.getContext('2d');
        const gradient = particleCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        particleCtx.fillStyle = gradient;
        particleCtx.fillRect(0, 0, 32, 32);
        const particleTex = new THREE.CanvasTexture(particleCanvas);

        const dustGeo = new THREE.BufferGeometry();
        const dustCount = 2500;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount * 3; i++) {
            dustPos[i] = (Math.random() - 0.5) * 30.0;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            map: particleTex,
            transparent: true,
            opacity: 0.10,
            depthWrite: false,
            alphaTest: 0.01
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
            map: particleTex,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            alphaTest: 0.01,
            blending: THREE.AdditiveBlending
        });
        this.exhaustCloud = new THREE.Points(exhaustGeo, this.exhaustMat);
        this.scene.add(this.exhaustCloud);
        this.lumenGrid = new LumenGrid(this.scene);
        this.anomaly = new Anomaly(this.scene, this.camera, this.player, this);
        this.tagPool = [];
        this.tagIndex = 0;
        this.tagGroup = new THREE.Group();
        for (let i = 0; i < 50; i++) {
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
        document.getElementById('teleportBtn').addEventListener('click', () => {
            const tx = parseFloat(document.getElementById('teleportX').value);
            const tz = parseFloat(document.getElementById('teleportZ').value);
            if (!isNaN(tx) && !isNaN(tz)) {
                this.camera.position.x = tx;
                this.camera.position.z = tz;
                this.updateChunks(this.camera.position);
            }
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
        document.addEventListener('somatic-teleport-zone', () => {
            if (this.macroZones.size > 0) {
                const zones = Array.from(this.macroZones.values());
                const zone = zones[Math.floor(Math.random() * zones.length)];
                const tx = (zone.startX + 7) * this.cellSize;
                const tz = (zone.startZ + 3) * this.cellSize;
                this.camera.position.set(tx, 1.6, tz);
                console.log(`Teleported to zone: ${zone.id}`);
            } else {
                console.log("No macro zones available to teleport to.");
            }
        });
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
        this._interactDir = new THREE.Vector3();
        document.addEventListener('somatic-keypad-success', () => {
            if (this._keypadDoor) {
                this._keypadDoor.userData.codeLocked = false;
                this._keypadDoor.userData.playerOpen = true;
                this._keypadDoor = null;
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 1.0, intensity: 0.8}}));
            }
        });
        document.addEventListener('somatic-keypad-cancel', () => {
            this._keypadDoor = null;
        });
        document.addEventListener('somatic-interact', (e) => {
            let hit = null;
            let closestDistSq = 9.0;
            const checkObj = (obj) => {
                if (obj.userData.isSlider && !obj.userData.isAirlockDoor) return;
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
            if (hit && hit.userData.isAirlockDoor) {
                hit.userData.playerOpen = true;
                return;
            }
            if (hit && hit.userData.isAirlockSwitch) {
                hit.userData.playerOpen = true;
                return;
            }
            if (hit && hit.userData.codeLocked) {
                this._keypadDoor = hit;
                document.dispatchEvent(new CustomEvent('somatic-keypad', {detail: {}}));
                return;
            }
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
                                if (fixture.lightObj) fixture.lightObj.intensity = 0.0;
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
                                if (fixture.lightObj) fixture.lightObj.intensity = fixture.baseIntensity;
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
                    hit.children[0].material = new THREE.MeshBasicMaterial({color: 0x55ff55});
                    this.player.objectives.fixed++;
                    this.player.updateObjectives();
                    this._breakerHuntHops = this._rollHuntHops();
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
            } else if (hit && hit.userData.type === 'document' && hit.userData.active) {
                document.dispatchEvent(new CustomEvent('somatic-read', {
                    detail: {docId: hit.userData.docId, zone: hit.userData.zone || null}
                }));
            } else if (hit && hit.userData.type === 'exit' && hit.userData.active) {
                document.dispatchEvent(new CustomEvent('somatic-inquest', {detail: {exitRef: hit}}));
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
        this.idlingCars = [];
        this.interactables = [];
        this.macroZones.clear();
        this.spatialGrid.clear();
        this.currentChunkCoords = {x: null, z: null};
        this.blackoutChunks.clear();
        this.observers = [];
        this._globalSwitches = [];
        this.pointsOfInterest = [];
        this._breakerHuntHops = this._rollHuntHops();
        this._runSalt32 = (Math.random() * 4294967296) >>> 0;
        this._macroChunkHashes = new Set();
        this._sectorBags = null;
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
        MaterialLibrary.injectMaterials(this);
    }

    // Geometry cache + the per-chunk ctx helper factory now live in
    // StructureKit.js - these three stay as thin delegators so every existing
    // call site (this._boxGeo, this._cacheGeo, this._createChunkHelpers,
    // including the ones TheArchitect.js calls via .call(this, ctx)) keeps
    // working unchanged.
    _cacheGeo(key, make) {
        return this.structureKit.cacheGeo(key, make);
    }
    _boxGeo(w, h, d) {
        return this.structureKit.boxGeo(w, h, d);
    }
    _planeGeo(w, h) {
        return this.structureKit.planeGeo(w, h);
    }
    _createChunkHelpers(hash, chunkGroup, stagingMeshes, random) {
        return this.structureKit.createChunkHelpers(hash, chunkGroup, stagingMeshes, random);
    }

    _buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx) {
        return this.setPieces.buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx);
    }
    _buildCheckpointColumn(x, z, hash, ctx) {
        return this.setPieces.buildCheckpointColumn(x, z, hash, ctx);
    }
    _buildImpoundItem(px, pz, kind, ctx) {
        return this.setPieces.buildImpoundItem(px, pz, kind, ctx);
    }
    async buildChunk(chunkX, chunkZ, hash) {
        const chunkGroup = new THREE.Group();
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
        structuralMatrix.sort((a, b) => b.prob - a.prob);
        const sectorMatrix = TheArchitect.getSectorMatrix.call(this, ctx);
        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        let isMacroStructure = random() > 0.60 && (Math.abs(chunkX) > 0 || Math.abs(chunkZ) > 0);
        if (isMacroStructure) {
            const neighborHashes = [
                `${chunkX - 1},${chunkZ}`, `${chunkX + 1},${chunkZ}`,
                `${chunkX},${chunkZ - 1}`, `${chunkX},${chunkZ + 1}`
            ];
            if (neighborHashes.some(h => this._macroChunkHashes.has(h))) {
                isMacroStructure = false;
            } else {
                this._macroChunkHashes.add(hash);
            }
        }
        let activeSector = null;
        let sectorMaze = null;
        let chunkBreakerCount = 0;
        let cHeight = 3.0;
        const breakerPositions = [];
        if (isMacroStructure) {
            const isExitPhase = this.player && this.player.objectives && this.player.objectives.fixed >= this.player.objectives.total &&
                this.player.hasVisitedAnnex && !this.player.objectives.escaped;
            const poolKey = isExitPhase ? 'exit' : 'normal';
            if (!this._sectorBags) this._sectorBags = {};
            if (!this._sectorBags[poolKey] || this._sectorBags[poolKey].length === 0) {
                const ids = sectorMatrix
                    .filter(s => isExitPhase ? s.id !== "CHECKPOINT" : s.id !== "EXIT")
                    .map(s => s.id);
                for (let i = ids.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    const tmp = ids[i];
                    ids[i] = ids[j];
                    ids[j] = tmp;
                }
                this._sectorBags[poolKey] = ids;
            }
            const activeSectorId = this._sectorBags[poolKey].pop();
            activeSector = sectorMatrix.find(s => s.id === activeSectorId);
            if (activeSector && activeSector.id === "IMPOUND") cHeight = 20.0;
            this.macroZones.set(hash, {
                id: activeSector.id,
                fog: this._sectorFog(activeSector.id),
                minX: startX * this.cellSize + 2,
                maxX: startX * this.cellSize + 58,
                minZ: startZ * this.cellSize + 2,
                maxZ: startZ * this.cellSize + 58,
                startX: startX,
                startZ: startZ
            });
            if (["ARCHIVE", "SERVER", "MAINTENANCE", "IMPOUND", "ATRIUM", "CHASM", "CLINIC", "INCINERATOR"].includes(activeSector.id)) {
                sectorMaze = this._generateSectorMaze(random);
            }
            if (activeSector.foundationMat) {
                const innerSize = (this.chunkSize - 2) * this.cellSize;
                const foundationGeo = this._planeGeo(innerSize, innerSize);
                const foundation = new THREE.Mesh(foundationGeo, activeSector.foundationMat);
                foundation.rotation.x = -Math.PI / 2;
                const centerOffset = (this.chunkSize * this.cellSize) / 2 - (this.cellSize / 2);
                foundation.position.set(startX * this.cellSize + centerOffset, 0.02, startZ * this.cellSize + centerOffset);
                foundation.receiveShadow = true;
                chunkGroup.add(foundation);
            }
            if (activeSector.ceilingMat) {
                const cInner = (this.chunkSize - 2) * this.cellSize;
                const cGeo = this._planeGeo(cInner, cInner);
                const cPlane = new THREE.Mesh(cGeo, activeSector.ceilingMat);
                cPlane.rotation.x = Math.PI / 2;
                const cOffset = (this.chunkSize * this.cellSize) / 2 - (this.cellSize / 2);
                cPlane.position.set(startX * this.cellSize + cOffset, cHeight - 0.02, startZ * this.cellSize + cOffset);
                cPlane.receiveShadow = true;
                chunkGroup.add(cPlane);
            }
        }
        const isChasm = activeSector && activeSector.id === "CHASM";
        const usesVoidCeiling = activeSector && (activeSector.id === "CHASM" || activeSector.id === "ATRIUM" || activeSector.id === "ARCHIVE");
        const centerOffset = (this.chunkSize * this.cellSize) / 2 - (this.cellSize / 2);
        const floorGeo = this._planeGeo(this.chunkSize * this.cellSize, this.chunkSize * this.cellSize);
        const ceilGeo = floorGeo;
        if (!isChasm) {
            const floor = new THREE.Mesh(floorGeo, this.carpetMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(startX * this.cellSize + centerOffset, 0, startZ * this.cellSize + centerOffset);
            floor.receiveShadow = true;
            chunkGroup.add(floor);
        }

        if (!usesVoidCeiling) {
            const ceil = new THREE.Mesh(ceilGeo, this.ceilMat);
            ceil.rotation.x = Math.PI / 2;
            ceil.position.set(startX * this.cellSize + centerOffset, cHeight, startZ * this.cellSize + centerOffset);
            chunkGroup.add(ceil);
        } else {
            if (!this.voidShroudMat) {
                this.voidShroudMat = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide});
                this.sharedAssets.add(this.voidShroudMat.uuid);
            }
            const span = this.chunkSize * this.cellSize;
            const canopy = new THREE.Mesh(this._planeGeo(span, span), this.voidShroudMat);
            canopy.rotation.x = Math.PI / 2;
            canopy.position.set(startX * this.cellSize + centerOffset, 9.0, startZ * this.cellSize + centerOffset);
            chunkGroup.add(canopy);
            const skirtGeo = this._planeGeo(span, 6.3);
            const cxw0 = startX * this.cellSize + centerOffset;
            const czw0 = startZ * this.cellSize + centerOffset;
            const skirtInset = centerOffset - (this.cellSize / 2) - 0.05;
            for (let side = 0; side < 4; side++) {
                const skirt = new THREE.Mesh(skirtGeo, this.voidShroudMat);
                if (side === 0) skirt.position.set(cxw0, 6.0, czw0 - skirtInset);
                else if (side === 1) skirt.position.set(cxw0, 6.0, czw0 + skirtInset);
                else if (side === 2) { skirt.position.set(cxw0 - skirtInset, 6.0, czw0); skirt.rotation.y = Math.PI / 2; }
                else { skirt.position.set(cxw0 + skirtInset, 6.0, czw0); skirt.rotation.y = Math.PI / 2; }
                chunkGroup.add(skirt);
            }
        }
        let chunkStartTime = performance.now();
        const occupied = new Set();
        ctx.markOccupied = (ox, oz) => occupied.add(`${ox},${oz}`);
        ctx.isOccupied = (ox, oz) => occupied.has(`${ox},${oz}`);
        if (isMacroStructure && activeSector) {
            const hallwayNeedsFloor = activeSector.id === "CHASM";
            const hallwayNeedsCeiling = activeSector.id === "CHASM" || activeSector.id === "ATRIUM" || activeSector.id === "ARCHIVE";
            this._buildEntranceHallways(chunkGroup, hash, startX, startZ, activeSector.id, ctx, hallwayNeedsFloor, hallwayNeedsCeiling);
        }
        for (let x = startX; x < startX + this.chunkSize; x++) {
            for (let z = startZ; z < startZ + this.chunkSize; z++) {
                if (!isMacroStructure && Math.abs(x) < 2 && Math.abs(z) < 2) continue;
                const localX = x - startX;
                const localZ = z - startZ;
                
                if (isMacroStructure) {
                    if (ctx.isOccupied(x, z)) continue;
                    activeSector.build(x, z, localX, localZ, typeof sectorMaze !== 'undefined' ? sectorMaze : null);
                    continue;
                }
                
                if (ctx.isOccupied(x, z)) continue;
                ctx.markOccupied(x, z);

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
                        ctx.addGeometry(stain);
                        if (offsetX > 0.8) {
                            const ceilingStain = new THREE.Mesh(this.ceilingStainGeo, this.ceilingStainMat);
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
                        const panel = new THREE.Mesh(this.sharedPanelGeo, matArray);
                        panel.position.set(posX, 2.98, posZ);
                        if (isRotated) panel.rotation.y = Math.PI / 2;
                        panel.userData.chunkHash = hash;
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        if (!isBroken) {
                            const isTracked = random() > 0.85;
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(posX, 2.8, posZ),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: isTracked ? (random() > 0.75) : false,
                                baseIntensity: isTracked ? 0.6 : 0.0,
                                targetIntensity: isTracked ? 0.6 : 0.0,
                                currentIntensity: isTracked ? 0.6 : 0.0,
                                isFake: !isTracked
                            });
                            if (!isTracked) {
                                const glow = new THREE.Mesh(this.glowGeo, this.glowMat);
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
                            const pillar = new THREE.Mesh(this._boxGeo(0.8, 3.0, 0.8), this.structMat);
                            pillar.position.set(px, 1.5, pz);
                            chunkGroup.add(pillar);
                            const breakerGroup = new THREE.Group();
                            breakerGroup.position.set(px, 1.5, pz + 0.525);
                            const breakerBase = new THREE.Mesh(this.breakerBaseGeo, this.rustMat);
                            breakerBase.position.set(0, 0, -0.025);
                            breakerGroup.add(breakerBase);
                            const breakerDoor = new THREE.Mesh(this.breakerDoorGeo, this.hazardMat);
                            breakerDoor.position.set(-0.3, 0, 0.102);
                            breakerGroup.add(breakerDoor);
                            breakerGroup.userData = {type: 'breaker', chunkHash: hash, active: true, door: breakerDoor};
                            chunkGroup.add(breakerGroup);
                            this.interactables.push(breakerGroup);
                            const pBox = new THREE.Box3().setFromObject(pillar);
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
    _buildEntranceHallways(chunkGroup, hash, startX, startZ, sectorId, ctx, needsFloor, needsCeiling) {
        return this.setPieces.buildEntranceHallways(chunkGroup, hash, startX, startZ, sectorId, ctx, needsFloor, needsCeiling);
    }
    _buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign) {
        return this.setPieces.buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign);
    }
    // Door/airlock interaction state machines now live in
    // InteractionController.js - kept as thin delegators so external callers
    // (main.js calls updateInteractives, Anomaly.js calls shatterFixture) and
    // internal sibling calls (updateInteractives -> _updateAirlock/_updateSliderDoor,
    // _updateAirlock -> _updateAirlockDoor) keep working unchanged.
    _updateAirlockDoor(doorObj, delta) {
        return this.interactionController.updateAirlockDoor(doorObj, delta);
    }
    _updateAirlock(airlock, playerPos, delta) {
        return this.interactionController.updateAirlock(airlock, playerPos, delta);
    }
    // Checkpoint desks/columns, impound vehicles, entrance airlocks and their
    // hallway seals now live in SetPieces.js - kept as thin delegators so
    // every existing call site (this._buildXxx(...), including the ones
    // TheArchitect.js calls under its .call(this, ctx) binding) keeps working.
    _buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling, sectorId) {
        return this.setPieces.buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling, sectorId);
    }
    _generateSectorMaze(randomFn) {
        return this.setPieces.generateSectorMaze(randomFn);
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
        const dummyColor = new THREE.Color();
        instancedGroups.forEach(group => {
            const isDecal = group.material === this.moldMat || group.material === this.ceilingStainMat || group.material === this.glowMat;
            if (group.meshes.length > 1) {
                const iMesh = new THREE.InstancedMesh(group.geometry, group.material, group.meshes.length);
                if (!isDecal) {
                    iMesh.castShadow = (group.material !== this.fenceMat);
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
                mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                if (!isDecal) {
                    mesh.castShadow = (group.material !== this.fenceMat);
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
        if (this.fixtureData) {
            for (let i = 0; i < this.fixtureData.length; i++) {
                const fixture = this.fixtureData[i];
                if (fixture.isLighthouse) {
                    const angle = time * fixture.sweepSpeed + fixture.sweepPhase;
                    fixture.targetPos.x = fixture.position.x + Math.cos(angle) * 10.0;
                    fixture.targetPos.z = fixture.position.z + Math.sin(angle) * 10.0;
                    fixture.targetPos.y = 0.0; // Point beam vertically towards the catwalk path
                }
            }
        }
        const cameraPos = this.camera.position;
        if (!this.audioRaycaster) {
            this.audioRaycaster = new THREE.Raycaster();
            this.audioDirection = new THREE.Vector3();
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
                if (!this._rayTarget) this._rayTarget = new THREE.Vector3();
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
        let activeSector = "NORMAL";
        let targetFog = 0.05;
        for (const zone of this.macroZones.values()) {
            if (cameraPos.x > zone.minX && cameraPos.x < zone.maxX &&
                cameraPos.z > zone.minZ && cameraPos.z < zone.maxZ) {
                activeSector = zone.id;
                targetFog = zone.fog;
                break;
            }
        }
        if (activeSector === "NORMAL" && this._stickySectorId) {
            for (const zone of this.macroZones.values()) {
                if (zone.id === this._stickySectorId &&
                    cameraPos.x > zone.minX - 10 && cameraPos.x < zone.maxX + 10 &&
                    cameraPos.z > zone.minZ - 10 && cameraPos.z < zone.maxZ + 10) {
                    activeSector = zone.id;
                    targetFog = zone.fog;
                    break;
                }
            }
        }
        if (this._doorSectorForce) {
            activeSector = this._doorSectorForce;
            targetFog = this._sectorFog(activeSector);
            this._doorSectorForce = null;
        }
        this._stickySectorId = activeSector === "NORMAL" ? null : activeSector;
        if (activeSector === "ANNEX" && this.player && !this.player.hasVisitedAnnex) {
            this.player.hasVisitedAnnex = true;
            this.player.updateObjectives();
        }
        if (this.baseFogDensity !== undefined) {
            if (this.currentFogDensity === undefined) this.currentFogDensity = targetFog;
            const userMultiplier = this.baseFogDensity / 0.05;
            const scaledTargetFog = targetFog * userMultiplier;
            const fogRate = scaledTargetFog > this.currentFogDensity ? 0.15 : 0.30;
            this.currentFogDensity += (scaledTargetFog - this.currentFogDensity) * fogRate;
            const fogBreath = Math.sin(time * 0.05) * (this.currentFogDensity * 0.3);
            this.scene.fog.density = this.currentFogDensity + fogBreath;
        }
        if (!this._baseFogColor) this._baseFogColor = new THREE.Color(0xa89f68);
        if (!this._targetFogColor) this._targetFogColor = new THREE.Color();
        const sectorRow = SECTORS[activeSector];
        if (sectorRow && sectorRow.fogColor !== undefined) {
            this._targetFogColor.setHex(sectorRow.fogColor);
        } else {
            this._targetFogColor.copy(this._baseFogColor);
        }
        if (!this._blackColor) this._blackColor = new THREE.Color(0x000000);
        const darknessRatio = Math.min(1.0, darknessPressure * 0.4);
        if (!this._finalFogColor) this._finalFogColor = new THREE.Color();
        const finalTargetColor = this._finalFogColor.copy(this._targetFogColor).lerp(this._blackColor, darknessRatio);
        const colorRate = this._targetFogColor.equals(this._baseFogColor) ? 0.25 : 0.15;
        this.scene.fog.color.lerp(finalTargetColor, colorRate);
        this.scene.background.lerp(finalTargetColor, colorRate);
        if (this.dustCloud) {
            this.dustCloud.position.copy(cameraPos);
            
            const inArchive = activeSector === "ARCHIVE";
            const inImpound = activeSector === "IMPOUND";
            const inAnnex = activeSector === "ANNEX";
            const inServer = activeSector === "SERVER";
            const inChasm = activeSector === "CHASM";
            
            this.dustCloud.rotation.y = time * 0.025;
            
            const positions = this.dustCloud.geometry.attributes.position.array;
            const fallSpeed = inImpound ? 0.04 : (inAnnex ? -0.01 : (inChasm ? -0.02 : 0.0025));
            for (let i = 0; i < positions.length; i += 3) {
                if (inServer) {
                    positions[i] += 0.18;
                    if (positions[i] > 15.0) positions[i] -= 30.0;
                    positions[i+2] += 0.05;
                    if (positions[i+2] > 15.0) positions[i+2] -= 30.0;
                } else {
                    positions[i+1] -= fallSpeed;
                    if (positions[i+1] < -15.0) positions[i+1] += 30.0;
                    else if (positions[i+1] > 15.0) positions[i+1] -= 30.0;
                }
            }
            this.dustCloud.geometry.attributes.position.needsUpdate = true;
            
            const baseOpacity = inImpound ? 0.6 : (inArchive ? 0.30 : (inAnnex ? 0.45 : (inServer ? 0.35 : (inChasm ? 0.65 : 0.10))));
            const crawlOpacity = inImpound ? 0.7 : (inArchive ? 0.45 : (inAnnex ? 0.55 : (inServer ? 0.45 : (inChasm ? 0.75 : 0.35))));
            const targetDustOpacity = this.player.isCrawling ? crawlOpacity : baseOpacity;
            
            const baseSize = inImpound ? 0.18 : (inArchive ? 0.07 : (inAnnex ? 0.45 : (inServer ? 0.12 : (inChasm ? 0.35 : 0.05))));
            const crawlSize = inImpound ? 0.22 : (inArchive ? 0.09 : (inAnnex ? 0.50 : (inServer ? 0.16 : (inChasm ? 0.45 : 0.08))));
            const targetDustSize = this.player.isCrawling ? crawlSize : baseSize;
            
            this.dustCloud.material.opacity += (targetDustOpacity - this.dustCloud.material.opacity) * 0.05;
            this.dustCloud.material.size += (targetDustSize - this.dustCloud.material.size) * 0.05;
            
            const targetColor = inAnnex ? 0xe8ddc5 : (inChasm ? 0x2288ff : 0xffffff);
            this.dustCloud.material.color.lerp(new THREE.Color(targetColor), 0.05);
        }
        if (this.exhaustCloud) {
            this.exhaustCloud.position.copy(cameraPos);
            this.exhaustCloud.rotation.y = time * -0.07;
            this.exhaustCloud.rotation.x = time * 0.04;
            const targetExhaustOpacity = (activeSector === "INCINERATOR") ? 0.85 : ((activeSector === "SERVER") ? 0.35 : 0.0);
            const exhaustRate = targetExhaustOpacity > this.exhaustMat.opacity ? 0.08 : 0.20;
            this.exhaustMat.opacity += (targetExhaustOpacity - this.exhaustMat.opacity) * exhaustRate;
            if (this.exhaustMat.opacity > 0.01) {
                this.exhaustMat.size = 0.08 + (Math.sin(time * 12.0) * 0.02);
            }
        }
        const anomalyPressure = this.player.anomalyPressure || 0;
        if (this.interactables && this.player && this.player.updateObjectives) {
            let nearestDistSq = Infinity;
            const isExitPhase = this.player.objectives.fixed >= this.player.objectives.total;
            if (isExitPhase && !this.player.hasVisitedAnnex) {
                for (const zone of this.macroZones.values()) {
                    if (zone.id !== "ANNEX") continue;
                    const nx = Math.max(zone.minX, Math.min(cameraPos.x, zone.maxX));
                    const nz = Math.max(zone.minZ, Math.min(cameraPos.z, zone.maxZ));
                    const dx = cameraPos.x - nx;
                    const dz = cameraPos.z - nz;
                    const dSq = dx * dx + dz * dz;
                    if (dSq < nearestDistSq) nearestDistSq = dSq;
                }
            } else if (isExitPhase) {
                for (let i = 0; i < this.interactables.length; i++) {
                    const item = this.interactables[i];
                    if (item.userData.type === 'exit' && item.userData.active === true) {
                        const dSq = cameraPos.distanceToSquared(item.position);
                        if (dSq < nearestDistSq) nearestDistSq = dSq;
                    }
                }
            } else {
                if (this._breakerHuntHops === undefined) this._breakerHuntHops = this._rollHuntHops();
                let targetIsPoi = false;
                if (this._breakerHuntHops > 0 && this.pointsOfInterest && this.pointsOfInterest.length > 0) {
                    let nearestPoi = null;
                    let nearestPoiDistSq = Infinity;
                    for (let i = 0; i < this.pointsOfInterest.length; i++) {
                        const poi = this.pointsOfInterest[i];
                        if (poi.active) continue;
                        const dx = cameraPos.x - poi.x;
                        const dz = cameraPos.z - poi.z;
                        const dSq = dx * dx + dz * dz;
                        if (dSq < nearestPoiDistSq) { nearestPoiDistSq = dSq; nearestPoi = poi; }
                    }
                    if (nearestPoi) {
                        if (nearestPoiDistSq < 9.0) {
                            nearestPoi.active = true;
                            this._breakerHuntHops--;
                        } else {
                            nearestDistSq = nearestPoiDistSq;
                            targetIsPoi = true;
                        }
                    }
                }
                if (!targetIsPoi) {
                    for (let i = 0; i < this.interactables.length; i++) {
                        const item = this.interactables[i];
                        if (item.userData.type === 'exit_switch' && item.userData.active === false) {
                            const dSq = cameraPos.distanceToSquared(item.position);
                            if (dSq < nearestDistSq) nearestDistSq = dSq;
                        }
                    }
                }
            }
            const nearestDist = Math.sqrt(nearestDistSq);
            let signalText = nearestDist < 1000 ? `${nearestDist.toFixed(1)}m` : 'WEAK - RELOCATE';
            if (anomalyPressure > 0.05 && nearestDist < 1000) {
                signalText = Math.random() < (anomalyPressure * 1.5) ? 'ERR!_m' : signalText;
            }
            this.player.updateObjectives(signalText);
        }
        if (this.flashlight) {
            let targetIntensity = this.player.flashlightActive ? 4.2 : 0.0;
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
            let targetAmbient = Math.max(minAmbient, baseAmbient - (darknessPressure * 0.4));
            if (this._stickySectorId === "IMPOUND" || this._stickySectorId === "CHASM") targetAmbient = 0.0;
            this.engine.ambientLight.intensity += (targetAmbient - this.engine.ambientLight.intensity) * 0.05;
            if (this.glowMat) {
                let targetGlowOpacity = Math.max(0.0, 1.0 - (darknessPressure * 0.4));
                if (this._stickySectorId === "IMPOUND" || this._stickySectorId === "CHASM") targetGlowOpacity = 0.0;
                this.glowMat.opacity += (targetGlowOpacity - this.glowMat.opacity) * 0.1;
            }
        }
        if (this.fixtureData) {
            for (let i = 0; i < this.fixtureData.length; i++) {
                const fix = this.fixtureData[i];
                if (fix.lightObj) {
                    fix.lightObj.intensity = fix.currentIntensity;
                }
            }
        }
        
        let idlingCarDistSq = 999999.0;
        if (this.idlingCars) {
            for (let i = 0; i < this.idlingCars.length; i++) {
                const c = this.idlingCars[i];
                const d = c.position.distanceToSquared(cameraPos);
                if (d < idlingCarDistSq) idlingCarDistSq = d;
            }
        }
        
        return {
            minLightDist,
            isOccluded,
            activeSector,
            anomalyPressure,
            playerSpeed,
            playerExhaustion: this.player.exhaustion,
            isBlackout: this.blackoutChunks.size > 0,
            idlingCarDistSq
        };
    }
}