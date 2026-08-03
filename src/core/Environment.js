import ProceduralTextureFactory from '../aesthetics/ProceduralTextureFactory.js';
import EntityManager from '../entities/EntityManager.js';
import SpatialHashGrid from '../math/SpatialHashGrid.js';
import TheArchitect from './TheArchitect.js';
import LumenGrid from '../aesthetics/LumenGrid.js';
import SECTORS, {DEFAULT_DUST, DEFAULT_EXHAUST, DEFAULT_AMBIENT, MIN_AMBIENT} from '../world/Sectors.js';
import MaterialLibrary from '../aesthetics/MaterialLibrary.js';
import StructureKit from '../world/StructureKit.js';
import SetPieces from '../world/SetPieces.js';
import InteractionController from '../player/InteractionController.js';
import {setPodiumScan, setPodiumSpent, SCAN_DURATION} from '../world/BreakerPodium.js';
import RenderEngine from './RenderEngine.js';

export default class Environment {
    get anomaly() {
        return this.entityManager ? this.entityManager.activeEntity : null;
    }

    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.fixtureData = [];
        this.idlingCars = [];
        this.hangingCables = [];
        this.spatialGrid = new SpatialHashGrid(4);
        this.wallBoxes = [];
        this.chunkSize = 16;
        this.renderDistance = RenderEngine.getSavedRenderDistance();
        this.activeChunks = new Map();
        this.currentChunkCoords = {x: null, z: null, qx: null, qz: null};
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
        this._dustColor = new THREE.Color();
        this._exhaustColor = new THREE.Color();
        this.blackoutChunks = new Set();
        this.macroZones = new Map();
        this.pointsOfInterest = [];
        this._breakerHuntHops = undefined;
        this.breakerScan = null;
        this._scanDir = new THREE.Vector3();
        this._scanAim = new THREE.Vector3();
        document.addEventListener('somatic-interact-release', () => {
            if (this.breakerScan) this.breakerScan.held = false;
        });
        this._macroChunkHashes = new Set();
        this._sectorBags = null;
        this.macroSpawnExclusionRadius = 3;
        this.macroMinSpacingChunks = 2;
        this._pendingMacroContent = new Map();
        this.structureKit = new StructureKit(this);
        this.setPieces = new SetPieces(this);
        this.interactionController = new InteractionController(this);
    }

    async setup() {
        const bootFlash = document.getElementById('flash-overlay');
        if (bootFlash) {
            bootFlash.style.transition = 'none';
            bootFlash.style.backgroundColor = '#000';
            bootFlash.style.opacity = '1';
            const loadingInd = document.getElementById('loading-indicator');
            if (loadingInd) loadingInd.style.display = 'block';
        }
        await new Promise(resolve => setTimeout(resolve, 0));
        const assets = await ProceduralTextureFactory.generateAssets();
        Object.assign(this, assets);
        const {carpetTexture, ceilingTexture, ceilingBumpTexture} = assets;
        carpetTexture.repeat.set(16, 16);
        ceilingTexture.repeat.set(16, 16);
        ceilingBumpTexture.repeat.set(16, 16);
        this.carpetMat = new THREE.MeshStandardMaterial({
            map: carpetTexture,
            roughness: 1.0,
            bumpMap: carpetTexture,
            bumpScale: 0.015
        });
        this.ceilMat = new THREE.MeshStandardMaterial({
            map: ceilingTexture,
            color: 0xffffff,
            emissive: 0x857752,
            roughness: 0.92,
            bumpMap: ceilingBumpTexture,
            bumpScale: 0.02
        });
        this.ceilMatHall = this.ceilMat.clone();
        this.ceilMatHall.map = ceilingTexture.clone();
        this.ceilMatHall.map.repeat.set(1, 1);
        this.ceilMatHall.map.needsUpdate = true;
        this.ceilMatHall.bumpMap = ceilingBumpTexture.clone();
        this.ceilMatHall.bumpMap.repeat.set(1, 1);
        this.ceilMatHall.bumpMap.needsUpdate = true;
        if (this.serverMat) {
            this.serverMat.metalness = 0.0;
            this.serverMat.roughness = 0.95;
        }
        if (this.ventMat) {
            this.ventMat.metalness = 0.4;
            this.ventMat.roughness = 0.3;
        }
        if (this.metalMat) {
            this.metalMat.metalness = 0.6;
            this.metalMat.roughness = 0.5;
            this.metalMat.map = null;
            this.metalMat.bumpMap = this.corrosionBumpTexture || null;
            this.metalMat.bumpScale = 0.012;
            this.metalMat.needsUpdate = true;
        }
        const particleCanvas = document.createElement('canvas');
        particleCanvas.width = 64;
        particleCanvas.height = 64;
        const particleCtx = particleCanvas.getContext('2d');
        const gradient = particleCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        particleCtx.fillStyle = gradient;
        particleCtx.fillRect(0, 0, 64, 64);
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
            size: 0.4,
            map: particleTex,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
            alphaTest: 0.001
        });
        this.dustCloud = new THREE.Points(dustGeo, dustMat);
        this.scene.add(this.dustCloud);
        const exhaustGeo = new THREE.BufferGeometry();
        const exhaustCount = 2000;
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
        this.lumenGrid = new LumenGrid(this.scene, RenderEngine.getSavedShadowQuality());
        this.entityManager = new EntityManager(this.scene, this.camera, this.player, this);
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
        const shadowQuality = RenderEngine.getSavedShadowQuality();
        this.flashlight = new THREE.SpotLight(0xffe8b3, 0.0, 45.0, Math.PI / 7, 0.5, 2.0);
        this.flashlight.position.set(0.3, -0.3, 0);
        this.flashlight.target.position.set(0.3, -0.3, -1);
        this.flashlight.castShadow = shadowQuality !== 'off';
        this.flashlight.shadow.mapSize.width = shadowQuality === 'low' ? 256 : 512;
        this.flashlight.shadow.mapSize.height = shadowQuality === 'low' ? 256 : 512;
        this.flashlight.shadow.camera.near = 0.1;
        this.flashlight.shadow.camera.far = 45;
        this.flashlight.shadow.bias = -0.002;
        this.flashlight.shadow.normalBias = 0.02;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.baseFogDensity = 0.05;
        this.generate();
        const toggleBtn = document.getElementById('menuToggleBtn');
        const toggleMenu = (e) => {
            e.preventDefault();
            const panel = document.querySelector('.control-panel');
            const isHidden = window.getComputedStyle(panel).display === 'none';
            panel.style.display = isHidden ? 'block' : 'none';
        };
        toggleBtn.addEventListener('pointerdown', toggleMenu);
        document.addEventListener('keydown', (e) => {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
            if (e.code === 'Tab') toggleMenu(e);
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
            this.engine.baseExposure = Number(e.target.value) / 100;
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
            if (hit && hit.userData.type === 'valve') {
                if (hit.userData.active) return;
                hit.userData.active = true;
                document.dispatchEvent(new CustomEvent('somatic-valve', {detail: {distSq: 1.0, intensity: 1.5}}));
                if (!this.steamTex) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                    grad.addColorStop(0, 'rgba(200, 220, 255, 0.5)');
                    grad.addColorStop(0.4, 'rgba(200, 220, 255, 0.15)');
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, 64, 64);
                    this.steamTex = new THREE.CanvasTexture(canvas);
                    this.steamMatTemplate = new THREE.SpriteMaterial({
                        map: this.steamTex, color: 0xffffff, transparent: true,
                        depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5
                    });
                }
                const steamGroup = new THREE.Group();
                const steamCount = 20;
                for (let i = 0; i < steamCount; i++) {
                    const sprite = new THREE.Sprite(this.steamMatTemplate.clone());
                    sprite.userData = {
                        life: Math.random(),
                        speed: 2.0 + Math.random() * 2.0,
                        spreadX: (Math.random() - 0.5) * 1.5,
                        spreadZ: (Math.random() - 0.5) * 1.5,
                        baseScale: 0.3 + Math.random() * 0.3
                    };
                    sprite.position.set(0, sprite.userData.life * 1.5, 0);
                    steamGroup.add(sprite);
                }
                hit.add(steamGroup);
                if (!this.steamGroups) this.steamGroups = [];
                this.steamGroups.push({group: steamGroup});
                return;
            }
            if (hit && hit.userData.type === 'breaker') {
                if (!hit.userData.active) return;
                hit.userData.active = false;
                this._triggerBreaker(hit);
            } else if (hit && hit.userData.type === 'exit_switch') {
                if (!hit.userData.active) this._beginBreakerScan(hit);
            } else if (hit && hit.userData.type === 'grate' && hit.userData.active) {
                hit.userData.active = false;
                document.dispatchEvent(new CustomEvent('somatic-vent', {detail: {distSq: 1.0, intensity: 1.5}}));
            } else if (hit && hit.userData.type === 'exit_key' && hit.userData.active) {
                hit.userData.active = false;
                hit.visible = false;
                this.player.inventory.hasExitKey = true;
                this.player.updateObjectives();
                document.dispatchEvent(new CustomEvent('somatic-item', {detail: {distSq: 1.0, intensity: 0.8}}));
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

    updateChunks(playerPos) {
        const activeCellSize = this.cellSize || 4;
        const chunkW = this.chunkSize * activeCellSize;
        const chunkX = Math.floor(playerPos.x / chunkW);
        const chunkZ = Math.floor(playerPos.z / chunkW);
        
        let quadX = 0;
        let quadZ = 0;
        if (this.renderDistance === 0) {
            const localX = playerPos.x - (chunkX * chunkW);
            const localZ = playerPos.z - (chunkZ * chunkW);
            quadX = localX > chunkW / 2 ? 1 : -1;
            quadZ = localZ > chunkW / 2 ? 1 : -1;
        }

        if (this.currentChunkCoords.x === chunkX && 
            this.currentChunkCoords.z === chunkZ &&
            this.currentChunkCoords.qx === quadX &&
            this.currentChunkCoords.qz === quadZ) return;
            
        this.currentChunkCoords.x = chunkX;
        this.currentChunkCoords.z = chunkZ;
        this.currentChunkCoords.qx = quadX;
        this.currentChunkCoords.qz = quadZ;
        
        const chunksToKeep = new Set();
        
        if (this.renderDistance === 0) {
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const targetX = chunkX + (i === 1 ? quadX : 0);
                    const targetZ = chunkZ + (j === 1 ? quadZ : 0);
                    const hash = `${targetX},${targetZ}`;
                    chunksToKeep.add(hash);
                    if (!this.activeChunks.has(hash) && !this.queuedHashes.has(hash)) {
                        this.chunkQueue.push({x: targetX, z: targetZ, hash: hash});
                        this.queuedHashes.add(hash);
                    }
                }
            }
        } else {
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
        }
        this.chunksToKeep = chunksToKeep;
        this.processChunkQueue().catch(err => console.error('Chunk queue processing failed:', err));
        const deadHashes = new Set();
        const chunksToDispose = [];
        for (const [hash, chunkGroup] of this.activeChunks.entries()) {
            if (!chunksToKeep.has(hash)) {
                deadHashes.add(hash);
                this.scene.remove(chunkGroup);
                chunksToDispose.push(chunkGroup);
                this.activeChunks.delete(hash);
                this.blackoutChunks.delete(hash);
                this.spatialGrid.removeByChunk(hash);
                this._pendingMacroContent.delete(hash);
            }
        }
        if (chunksToDispose.length > 0) {
            this._asyncDisposeChunks(chunksToDispose).catch(console.error);
        }
        if (deadHashes.size > 0) {
            deadHashes.forEach(h => {
                this.macroZones.delete(h);
                if (this._annexKeypadChunks) this._annexKeypadChunks.delete(h);
            });
            this._pruneDeadChunkEntries(this.walls, deadHashes, w => w.userData.chunkHash);
            this._pruneDeadChunkEntries(this.fixtureData, deadHashes, f => f.chunkHash);
            this._pruneDeadChunkEntries(this.idlingCars, deadHashes, c => c.chunkHash);
            this._pruneDeadChunkEntries(this.hangingCables, deadHashes, c => c.chunkHash);
            this._pruneDeadChunkEntries(this.interactiveDoors, deadHashes, d => d.userData.chunkHash);
            if (this.airlocks) {
                this._pruneDeadChunkEntries(this.airlocks, deadHashes, a => a.chunkHash);
            }
            if (this.interactables) {
                this._pruneDeadChunkEntries(this.interactables, deadHashes, i => i.userData.chunkHash);
            }
            if (this.animators) {
                this._pruneDeadChunkEntries(this.animators, deadHashes, i => i.userData.chunkHash);
            }
            if (this.observers) {
                this._pruneDeadChunkEntries(this.observers, deadHashes, o => o.userData.chunkHash);
            }
            if (this.pointsOfInterest) {
                this._pruneDeadChunkEntries(this.pointsOfInterest, deadHashes, p => p.chunkHash);
            }
        }
    }

    _pruneDeadChunkEntries(arr, deadHashes, getHash) {
        let write = 0;
        for (let read = 0; read < arr.length; read++) {
            const item = arr[read];
            if (!deadHashes.has(getHash(item))) {
                arr[write++] = item;
            }
        }
        arr.length = write;
    }

    async processChunkQueue() {
        if (this.isBuildingChunk) return;
        this.isBuildingChunk = true;
        try {
            while (this.chunkQueue.length > 0) {
                const chunk = this.chunkQueue.shift();
                this.queuedHashes.delete(chunk.hash);
                if (this.chunksToKeep && this.chunksToKeep.has(chunk.hash)) {
                    const genT0 = performance.now();
                    await this.buildChunk(chunk.x, chunk.z, chunk.hash);
                    const genMs = performance.now() - genT0;
                    if (!this.genStats) this.genStats = {count: 0, totalMs: 0, worstMs: 0, lastMs: 0};
                    this.genStats.count++;
                    this.genStats.totalMs += genMs;
                    this.genStats.lastMs = genMs;
                    if (genMs > this.genStats.worstMs) this.genStats.worstMs = genMs;
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        } finally {
            this.isBuildingChunk = false;
        }
        if (this.isSpawning) {
            this.isSpawning = false;
            
            if (this.needsSafeSpawn) {
                this.needsSafeSpawn = false;
                const chunkW = 64;
                const cX = Math.floor(this.camera.position.x / chunkW);
                const cZ = Math.floor(this.camera.position.z / chunkW);
                const baseX = cX * chunkW;
                const baseZ = cZ * chunkW;
                
                const testPoints = [{ x: this.camera.position.x, z: this.camera.position.z }];
                for (let r = 1; r <= 6; r++) {
                    for (let x = -r; x <= r; x++) {
                        for (let z = -r; z <= r; z++) {
                            if (Math.abs(x) === r || Math.abs(z) === r) {
                                testPoints.push({ x: baseX + 32 + x * 4 + 2, z: baseZ + 32 + z * 4 + 2 });
                            }
                        }
                    }
                }
                
                for (const pt of testPoints) {
                    const radius = 0.5;
                    const nearby = this.spatialGrid.getNearby(pt.x, pt.z, radius);
                    let overlap = false;
                    for (let i = 0; i < nearby.length; i++) {
                        const box = nearby[i];
                        if (box.max.x > pt.x - radius && box.min.x < pt.x + radius &&
                            box.max.y > 0.1 && box.min.y < 1.8 &&
                            box.max.z > pt.z - radius && box.min.z < pt.z + radius) {
                            overlap = true;
                            break;
                        }
                    }
                    if (!overlap) {
                        this.camera.position.set(pt.x, 1.6, pt.z);
                        break;
                    }
                }
            }

            const flash = document.getElementById('flash-overlay');
            if (flash) {
                flash.style.transition = 'opacity 2.0s ease-in';
                flash.style.opacity = '0';
                setTimeout(() => {
                    if (flash.style.opacity === '0') {
                        flash.style.backgroundColor = '#fff';
                        const loadingInd = document.getElementById('loading-indicator');
                        if (loadingInd) loadingInd.style.display = 'none';
                    }
                }, 2050);
            }
        }
    }

    async _asyncDisposeChunks(chunks) {
        let disposeStartTime = performance.now();
        const meshes = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunkGroup = chunks[i];
            meshes.length = 0;
            chunkGroup.traverse((child) => meshes.push(child));
            for (let j = 0; j < meshes.length; j++) {
                const child = meshes[j];
                if (child.isInstancedMesh) child.dispose();
                if (child.geometry && !this.sharedAssets.has(child.geometry.uuid) && !this.geoCache.has(child.geometry.uuid)) {
                    child.geometry.dispose();
                }
                if (Array.isArray(child.material)) {
                    for (let m = 0; m < child.material.length; m++) {
                        const mat = child.material[m];
                        if (!this.sharedAssets.has(mat.uuid)) mat.dispose();
                    }
                } else if (child.material && !this.sharedAssets.has(child.material.uuid)) {
                    child.material.dispose();
                }
                if (performance.now() - disposeStartTime > 3.0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    disposeStartTime = performance.now();
                }
            }
        }
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
        const stagingMeshes = [];
        const ctx = this._createChunkHelpers(hash, chunkGroup, stagingMeshes, random);
        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        let isMacroStructure = random() > 0.60 &&
            Math.max(Math.abs(chunkX), Math.abs(chunkZ)) >= this.macroSpawnExclusionRadius;
        if (isMacroStructure) {
            const spacing = this.macroMinSpacingChunks;
            let tooCloseToAnotherMacro = false;
            for (let dx = -spacing; dx <= spacing && !tooCloseToAnotherMacro; dx++) {
                for (let dz = -spacing; dz <= spacing; dz++) {
                    if (dx === 0 && dz === 0) continue;
                    if (this._macroChunkHashes.has(`${chunkX + dx},${chunkZ + dz}`)) {
                        tooCloseToAnotherMacro = true;
                        break;
                    }
                }
            }
            if (tooCloseToAnotherMacro) {
                isMacroStructure = false;
            } else {
                this._macroChunkHashes.add(hash);
            }
        }
        const structuralMatrix = isMacroStructure ? null : TheArchitect.getStructuralMatrix.call(this, ctx);
        const sectorMatrix = isMacroStructure ? TheArchitect.getSectorMatrix.call(this, ctx) : null;
        let activeSector = null;
        let sectorMaze = null;
        let chunkBreakerCount = 0;
        let cHeight = 3.0;
        const breakerPositions = [];
        if (isMacroStructure) {
            const isExitPhase = this.player && this.player.objectives && this.player.objectives.fixed >= this.player.objectives.total &&
                this.player.inventory.hasExitKey && !this.player.objectives.escaped;
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
                foundation.castShadow = false;
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
            floor.castShadow = false;
            chunkGroup.add(floor);
        }
        if (!usesVoidCeiling) {
            const ceil = new THREE.Mesh(ceilGeo, this.ceilMat);
            ceil.rotation.x = Math.PI / 2;
            ceil.position.set(startX * this.cellSize + centerOffset, cHeight, startZ * this.cellSize + centerOffset);
            ceil.castShadow = false;
            ceil.receiveShadow = true;
            chunkGroup.add(ceil);
        } else {
            if (!this.voidShroudMat) {
                this.voidShroudMat = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide});
                this.sharedAssets.add(this.voidShroudMat.uuid);
            }
            if (!this.voidShroudWhiteMat) {
                this.voidShroudWhiteMat = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide});
                this.sharedAssets.add(this.voidShroudWhiteMat.uuid);
            }
            const isAtriumVoid = activeSector && activeSector.id === "ATRIUM";
            const shroudMat = isAtriumVoid ? this.voidShroudWhiteMat : this.voidShroudMat;
            const canopyY = isAtriumVoid ? 66.0 : 9.0;
            const span = this.chunkSize * this.cellSize;
            const canopy = new THREE.Mesh(this._planeGeo(span, span), shroudMat);
            canopy.rotation.x = Math.PI / 2;
            canopy.position.set(startX * this.cellSize + centerOffset, canopyY, startZ * this.cellSize + centerOffset);
            canopy.castShadow = true;
            chunkGroup.add(canopy);
            const skirtBottom = isAtriumVoid ? 55.6 : 2.85;
            const skirtTop = canopyY + 0.15;
            const skirtCenterY = (skirtBottom + skirtTop) / 2;
            const skirtHeight = skirtTop - skirtBottom;
            const skirtGeo = this._planeGeo(span, skirtHeight);
            const cxw0 = startX * this.cellSize + centerOffset;
            const czw0 = startZ * this.cellSize + centerOffset;
            const skirtInset = centerOffset - (this.cellSize / 2) - 0.05;
            for (let side = 0; side < 4; side++) {
                const skirt = new THREE.Mesh(skirtGeo, shroudMat);
                if (side === 0) skirt.position.set(cxw0, skirtCenterY, czw0 - skirtInset);
                else if (side === 1) skirt.position.set(cxw0, skirtCenterY, czw0 + skirtInset);
                else if (side === 2) {
                    skirt.position.set(cxw0 - skirtInset, skirtCenterY, czw0);
                    skirt.rotation.y = Math.PI / 2;
                } else {
                    skirt.position.set(cxw0 + skirtInset, skirtCenterY, czw0);
                    skirt.rotation.y = Math.PI / 2;
                }
                skirt.castShadow = true;
                chunkGroup.add(skirt);
            }
            if (isChasm) {
                const floorVoidY = -100.0;
                const floorVoid = new THREE.Mesh(this._planeGeo(span, span), shroudMat);
                floorVoid.rotation.x = -Math.PI / 2;
                floorVoid.position.set(cxw0, floorVoidY, czw0);
                chunkGroup.add(floorVoid);
                const lowerSkirtBottom = floorVoidY - 0.15;
                const lowerSkirtTop = 0.15;
                const lowerSkirtCenterY = (lowerSkirtBottom + lowerSkirtTop) / 2;
                const lowerSkirtHeight = lowerSkirtTop - lowerSkirtBottom;
                const lowerSkirtGeo = this._planeGeo(span, lowerSkirtHeight);
                for (let side = 0; side < 4; side++) {
                    const lowerSkirt = new THREE.Mesh(lowerSkirtGeo, shroudMat);
                    if (side === 0) lowerSkirt.position.set(cxw0, lowerSkirtCenterY, czw0 - skirtInset);
                    else if (side === 1) lowerSkirt.position.set(cxw0, lowerSkirtCenterY, czw0 + skirtInset);
                    else if (side === 2) {
                        lowerSkirt.position.set(cxw0 - skirtInset, lowerSkirtCenterY, czw0);
                        lowerSkirt.rotation.y = Math.PI / 2;
                    } else {
                        lowerSkirt.position.set(cxw0 + skirtInset, lowerSkirtCenterY, czw0);
                        lowerSkirt.rotation.y = Math.PI / 2;
                    }
                    chunkGroup.add(lowerSkirt);
                }
            }
        }
        const occupied = new Set();
        ctx.markOccupied = (ox, oz) => occupied.add(`${ox},${oz}`);
        ctx.isOccupied = (ox, oz) => occupied.has(`${ox},${oz}`);
        if (isMacroStructure && activeSector) {
            const hallwayNeedsFloor = activeSector.id === "CHASM";
            const hallwayNeedsCeiling = activeSector.id !== "ARCHIVE" && activeSector.id !== "IMPOUND" && activeSector.id !== "ATRIUM" && activeSector.id !== "CHASM";
            this._buildEntranceHallways(chunkGroup, hash, startX, startZ, activeSector.id, ctx, hallwayNeedsFloor, hallwayNeedsCeiling, sectorMaze);
            const edge = this.chunkSize - 1;
            let shellStartTime = performance.now();
            for (let x = startX; x < startX + this.chunkSize; x++) {
                for (let z = startZ; z < startZ + this.chunkSize; z++) {
                    const localX = x - startX;
                    const localZ = z - startZ;
                    if (localX !== 0 && localX !== edge && localZ !== 0 && localZ !== edge) continue;
                    if (ctx.isOccupied(x, z)) continue;
                    if (performance.now() - shellStartTime > 5.0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                        shellStartTime = performance.now();
                        if (!this.activeChunks.has(hash)) return;
                    }
                    activeSector.build(x, z, localX, localZ, typeof sectorMaze !== 'undefined' ? sectorMaze : null);
                }
            }
            if (stagingMeshes.length > 0) {
                await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
                stagingMeshes.length = 0;
            }
        }
        const interiorArgs = {
            hash, chunkGroup, stagingMeshes, ctx, random, chunkX, chunkZ, startX, startZ,
            isMacroStructure, activeSector, sectorMaze, structuralMatrix
        };
        if (isMacroStructure && activeSector) {
            chunkGroup.userData.contentReady = false;
            this._pendingMacroContent.set(hash, interiorArgs);
            return;
        }
        await this._buildChunkInterior(interiorArgs);
    }

    async _buildChunkInterior(args) {
        const {
            hash, chunkGroup, stagingMeshes, ctx, random, chunkX, chunkZ, startX, startZ,
            isMacroStructure, activeSector, sectorMaze, structuralMatrix
        } = args;
        const cx = Math.sin(this.baseSeed) * 0.8;
        const cy = Math.cos(this.baseSeed * 0.5) * 0.8;
        let chunkBreakerCount = 0;
        const breakerPositions = [];
        const wallCells = new Set();
        const isWallCell = (wx, wz) => wallCells.has(`${wx},${wz}`);
        let chunkStartTime = performance.now();
        for (let x = startX; x < startX + this.chunkSize; x++) {
            for (let z = startZ; z < startZ + this.chunkSize; z++) {
                if (!this.activeChunks.has(hash)) return;
                if (performance.now() - chunkStartTime > 5.0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    chunkStartTime = performance.now();
                    if (!this.activeChunks.has(hash)) return;
                }
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
                const inNRing = localZ === 3 && localX >= 3 && localX <= 11;
                const inSRing = localZ === 11 && localX >= 3 && localX <= 11;
                const inWRing = localX === 3 && localZ >= 3 && localZ <= 11;
                const inERing = localX === 11 && localZ >= 3 && localZ <= 11;
                const inNPath = localX === 7 && localZ <= 3;
                const inSPath = localX === 7 && localZ >= 11;
                const inWPath = localZ === 7 && localX <= 3;
                const inEPath = localZ === 7 && localX >= 11;
                const isArtery = inNRing || inSRing || inWRing || inERing || inNPath || inSPath || inWPath || inEPath;
                const isBlocker = localX >= 5 && localX <= 9 && localZ >= 5 && localZ <= 9;
                const isSpawnClear = (chunkX === 0 && chunkZ === 0) && (localX <= 3 && localZ <= 3);
                if (isBlocker) isWall = true;
                if (isArtery || isSpawnClear) isWall = false;
                const damp = this._dampAt(x, z);
                if (isWall) {
                    wallCells.add(`${x},${z}`);
                    const structRoll = random();
                    const structure = structuralMatrix.find(s => structRoll >= s.prob);
                    if (structure) structure.build(x, z);
                    this._placeWallMold(x, z, random, ctx.addGeometry, damp);
                } else {
                    let hasTallObstacle = false;
                    const stainRoll = random();
                    const floorRoll = random();
                    if (stainRoll < (damp > 0.60 ? 0.32 : 0.035)) {
                        const offsetX = (random() - 0.5) * 2.0;
                        const offsetZ = (random() - 0.5) * 2.0;
                        const rotY = random() * Math.PI * 2;
                        const scale = (0.4 + (random() * 0.6)) * (0.8 + damp * 0.5);
                        const stain = new THREE.Mesh(this.moldGeo, this.moldMat);
                        stain.position.set(x * this.cellSize + offsetX, 0.01, z * this.cellSize + offsetZ);
                        stain.rotation.y = rotY;
                        stain.scale.set(scale, scale, scale);
                        ctx.addGeometry(stain);

                    } else if (floorRoll > 0.80 && !isArtery) {
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
                        const activeMat = this.getPooledMazeLightMaterial(isBroken);
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
                        }
                    } else if (!hasTallObstacle && random() > 0.95 && chunkBreakerCount < 3 && !isArtery) {
                        const px = x * this.cellSize;
                        const pz = z * this.cellSize;
                        const mountSide = isWallCell(x, z - 1) ? 'N' : (isWallCell(x - 1, z) ? 'W' : null);
                        let isTooClose = mountSide === null;
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
                            const half = this.cellSize / 2;
                            const breakerGroup = new THREE.Group();
                            if (mountSide === 'N') {
                                breakerGroup.position.set(px, 1.5, pz - half + 0.11);
                            } else {
                                breakerGroup.position.set(px - half + 0.11, 1.5, pz);
                                breakerGroup.rotation.y = Math.PI / 2;
                            }
                            const shellMat = this.breakerPanelMat || this.pittedMetalMat;
                            const breakerBase = new THREE.Mesh(this.breakerBaseGeo, shellMat);
                            breakerBase.position.set(0, 0, -0.025);
                            breakerGroup.add(breakerBase);
                            const breakerDoor = new THREE.Mesh(this.breakerDoorGeo, shellMat);
                            breakerDoor.position.set(-0.3, 0, 0.102);
                            const breakerHandle = new THREE.Mesh(this.breakerHandleGeo, this.breakerHandleMat);
                            breakerHandle.position.set(0.5, 0, 0.05);
                            breakerDoor.add(breakerHandle);
                            breakerGroup.add(breakerDoor);
                            breakerGroup.userData = {type: 'breaker', chunkHash: hash, active: true, door: breakerDoor};
                            chunkGroup.add(breakerGroup);
                            this.interactables.push(breakerGroup);
                        }
                    }
                }
            }
        }
        if (performance.now() - chunkStartTime > 5.0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!this.activeChunks.has(hash)) return;
        }
        await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
        if (this.activeChunks.has(hash)) {
            chunkGroup.userData.contentReady = true;
        }
    }

    beginMacroChunkContent(hash) {
        const args = this._pendingMacroContent.get(hash);
        if (!args) return;
        this._pendingMacroContent.delete(hash);
        this._buildChunkInterior(args).catch(err => console.error('Macro chunk content build failed:', err));
    }

    isMacroChunkContentReady(hash) {
        if (this._pendingMacroContent.has(hash)) return false;
        const chunkGroup = this.activeChunks.get(hash);
        if (!chunkGroup) return true;
        return chunkGroup.userData.contentReady !== false;
    }

    updateInteractives(playerPos, delta) {
        return this.interactionController.updateInteractives(playerPos, delta);
    }

    _resolveActiveSector(cameraPos) {
        let activeSector = "NORMAL";
        let targetFog = this._sectorFog("NORMAL");
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
        return {activeSector, targetFog};
    }

    updateEntity(playerPos, delta, time) {
        this._sectorFrame = this._resolveActiveSector(playerPos);
        return this.entityManager.update(delta, time, this._stickySectorId || 'NORMAL');
    }

    updateLights(time) {
        const isChasm = this._stickySectorId === 'CHASM';
        if (this.fixtureData) {
            for (let i = 0; i < this.fixtureData.length; i++) {
                const fixture = this.fixtureData[i];
                if (fixture.isTowBeacon) {
                    const angle = time * fixture.sweepSpeed + fixture.sweepPhase;
                    if (!fixture.targetPos) fixture.targetPos = new THREE.Vector3();
                    fixture.targetPos.x = fixture.position.x + Math.cos(angle) * 10.0;
                    fixture.targetPos.z = fixture.position.z + Math.sin(angle) * 10.0;
                    fixture.targetPos.y = fixture.position.y - 1.0;
                    continue;
                }
                if (fixture.isLighthouse) {
                    if (!isChasm) {
                        fixture.currentIntensity = 0.0;
                        fixture.targetIntensity = 0.0;
                        if (fixture.volumetricMesh) fixture.volumetricMesh.visible = false;
                        if (fixture.housingMesh) fixture.housingMesh.visible = false;
                        continue;
                    } else if (fixture.volumetricMesh && !fixture.volumetricMesh.visible) {
                        fixture.currentIntensity = fixture.baseIntensity;
                        fixture.targetIntensity = fixture.baseIntensity;
                        fixture.volumetricMesh.visible = true;
                        if (fixture.housingMesh) fixture.housingMesh.visible = true;
                    }
                    const angle = time * fixture.sweepSpeed + fixture.sweepPhase;
                    fixture.targetPos.x = fixture.position.x + Math.cos(angle) * 10.0;
                    fixture.targetPos.z = fixture.position.z + Math.sin(angle) * 10.0;
                    fixture.targetPos.y = 0.0;
                    if (fixture.volumetricMesh) {
                        fixture.volumetricMesh.lookAt(fixture.targetPos);
                    }
                    if (fixture.housingMesh) {
                        fixture.housingMesh.rotation.y = Math.atan2(fixture.targetPos.x - fixture.position.x, fixture.targetPos.z - fixture.position.z);
                    }
                }
            }
        }
        const cameraPos = this.camera.position;
        if (!this.audioRaycaster) {
            this.audioRaycaster = new THREE.Raycaster();
            this.audioDirection = new THREE.Vector3();
        }
        const currentChunkHash = `${this.currentChunkCoords.x},${this.currentChunkCoords.z}`;
        const lumenData = this.lumenGrid.update(cameraPos, this.fixtureData, time, currentChunkHash);
        const darknessPressure = lumenData.darknessPressure;
        const nearestFixture = lumenData.nearestFixture;
        const minLightDistSq = lumenData.minLightDistSq;
        this.player.darknessPressure = darknessPressure;
        const minLightDist = nearestFixture ? Math.sqrt(minLightDistSq) : Infinity;
        if (this.currentGlare === undefined) this.currentGlare = 0.0;
        if (this.currentGlareColor === undefined) this.currentGlareColor = new THREE.Color(1, 1, 1);
        if (!this.engine.glareColor) this.engine.glareColor = new THREE.Color(1, 1, 1);
        let glareTarget = 0.0;
        let targetGlareColor = this.currentGlareColor;
        this._glareDot = -1.0;
        if (nearestFixture && minLightDist > 1.0) {
            if (!this._camDir) this._camDir = new THREE.Vector3();
            this.camera.getWorldDirection(this._camDir);
            if (!this._glareDir) this._glareDir = new THREE.Vector3();
            this._glareDir.subVectors(nearestFixture.position, cameraPos).normalize();
            const dot = this._camDir.dot(this._glareDir);
            this._glareDot = dot;
            if (dot > 0.95) {
                let beamAlign = 1.0;
                let distFactor = 1.0 / (1.0 + minLightDist * 0.2);
                if (nearestFixture.targetPos) {
                    if (!this._lightBeamDir) this._lightBeamDir = new THREE.Vector3();
                    this._lightBeamDir.subVectors(nearestFixture.targetPos, nearestFixture.position).normalize();
                    if (!this._playerFromLight) this._playerFromLight = new THREE.Vector3();
                    this._playerFromLight.subVectors(cameraPos, nearestFixture.position).normalize();
                    beamAlign = this._lightBeamDir.dot(this._playerFromLight);
                } else if (nearestFixture.isArchiveLight) {
                    if (!this._archiveGlareDownDir) this._archiveGlareDownDir = new THREE.Vector3(0, -1, 0);
                    if (!this._playerFromLight) this._playerFromLight = new THREE.Vector3();
                    this._playerFromLight.subVectors(cameraPos, nearestFixture.position).normalize();
                    beamAlign = this._archiveGlareDownDir.dot(this._playerFromLight);
                    distFactor = Math.max(0.0, 1.0 - (minLightDist / 5.0));
                }
                if (beamAlign > 0.3) {
                    const intensity = nearestFixture.currentIntensity || nearestFixture.baseIntensity || 1.0;
                    const angleFactor = (dot - 0.95) * 20.0;
                    const directionalFactor = (nearestFixture.targetPos || nearestFixture.isArchiveLight)
                        ? Math.max(0, (beamAlign - 0.3) * 1.42) : 1.0;
                    let targetVal = intensity * distFactor * angleFactor * directionalFactor * 0.2;
                    
                    if (targetVal > 0.0) {
                        if (!this._glareRaycaster) this._glareRaycaster = new THREE.Raycaster();
                        this._glareRaycaster.set(cameraPos, this._glareDir);
                        const localBoxes = this.spatialGrid.getNearby(cameraPos.x, cameraPos.z, minLightDist);
                        const ray = this._glareRaycaster.ray;
                        const distSqLimit = minLightDistSq;
                        let isHit = false;
                        if (!this._glareHitTarget) this._glareHitTarget = new THREE.Vector3();
                        for (let i = 0; i < localBoxes.length; i++) {
                            if (localBoxes[i].isInvisibleBlocker) continue;
                            if (ray.intersectBox(localBoxes[i], this._glareHitTarget)) {
                                if (cameraPos.distanceToSquared(this._glareHitTarget) < distSqLimit) {
                                    isHit = true;
                                    break;
                                }
                            }
                        }
                        if (isHit) {
                            targetVal = 0.0;
                        } else {
                            if (nearestFixture.material && nearestFixture.material.emissive) {
                                targetGlareColor = nearestFixture.material.emissive;
                            }
                        }
                    }
                    glareTarget = targetVal;
                }
            }
        }
        this.currentGlare += (glareTarget - this.currentGlare) * 0.1;
        this.currentGlareColor.lerp(targetGlareColor, 0.1);
        this._glareRaw = glareTarget;
        this._glareDist = minLightDist;

        const PUPIL_CONSTRICT_RATE = 0.80;
        const PUPIL_DILATE_RATE = 0.28;
        const PUPIL_SATURATION = 0.25;
        const PUPIL_MAX_ATTENUATION = 0.85;
        const PUPIL_MAX_DIM = 0.30;
        const dt = this._lastGlareTime === undefined
            ? 0.016
            : Math.min(0.1, Math.max(0.0, time - this._lastGlareTime));
        this._lastGlareTime = time;
        if (this.pupilAdapt === undefined) this.pupilAdapt = 0.0;
        const adaptTarget = Math.min(1.0, this.currentGlare / PUPIL_SATURATION);
        const adaptRate = adaptTarget > this.pupilAdapt ? PUPIL_CONSTRICT_RATE : PUPIL_DILATE_RATE;
        this.pupilAdapt += (adaptTarget - this.pupilAdapt) * (1.0 - Math.exp(-adaptRate * dt));

        this.engine.glare = this.currentGlare * (1.0 - this.pupilAdapt * PUPIL_MAX_ATTENUATION);
        this.engine.glareColor.copy(this.currentGlareColor);
        if (this.engine.renderer && this.engine.baseExposure !== undefined) {
            this.engine.renderer.toneMappingExposure =
                this.engine.baseExposure * (1.0 - this.pupilAdapt * PUPIL_MAX_DIM);
        }
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
        const {activeSector, targetFog} = this._sectorFrame || this._resolveActiveSector(cameraPos);
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
        const flashlightIsLit = this.player.flashlightActive && this.flashlight && this.flashlight.intensity > 0.1;
        const darknessRatio = Math.min(1.0, darknessPressure * 0.4) * (flashlightIsLit ? 0.35 : 1.0);
        if (!this._finalFogColor) this._finalFogColor = new THREE.Color();
        const finalTargetColor = this._finalFogColor.copy(this._targetFogColor).lerp(this._blackColor, darknessRatio);
        const colorRate = this._targetFogColor.equals(this._baseFogColor) ? 0.25 : 0.15;
        this.scene.fog.color.lerp(finalTargetColor, colorRate);
        this.scene.background.lerp(finalTargetColor, colorRate);
        if (this.dustCloud) {
            const dust = (SECTORS[activeSector] && SECTORS[activeSector].dust) || DEFAULT_DUST;
            this.dustCloud.position.copy(cameraPos);
            this.dustCloud.rotation.y = time * 0.025;
            const positions = this.dustCloud.geometry.attributes.position.array;
            if (dust.drift === 'horizontal') {
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] += 0.18;
                    if (positions[i] > 15.0) positions[i] -= 30.0;
                    positions[i + 2] += 0.05;
                    if (positions[i + 2] > 15.0) positions[i + 2] -= 30.0;
                }
            } else {
                const driftY = dust.driftY;
                const turbulence = dust.turbulence || 0.0;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += driftY * (1.0 - turbulence * ((i % 11) / 11));
                    if (positions[i + 1] > 15.0) positions[i + 1] -= 30.0;
                    else if (positions[i + 1] < -15.0) positions[i + 1] += 30.0;
                }
            }
            this.dustCloud.geometry.attributes.position.needsUpdate = true;
            const isCrawling = this.player.isCrawling;
            const targetDustOpacity = isCrawling ? dust.crawlOpacity : dust.baseOpacity;
            const targetDustSize = isCrawling ? dust.crawlSize : dust.baseSize;
            this.dustCloud.material.opacity += (targetDustOpacity - this.dustCloud.material.opacity) * 0.05;
            this.dustCloud.material.size += (targetDustSize - this.dustCloud.material.size) * 0.05;
            this._dustColor.setHex(dust.color);
            this.dustCloud.material.color.lerp(this._dustColor, 0.05);
        }
        if (this.exhaustCloud) {
            const exhaust = (SECTORS[activeSector] && SECTORS[activeSector].exhaust) || DEFAULT_EXHAUST;
            this.exhaustCloud.position.copy(cameraPos);
            this.exhaustCloud.rotation.y = time * exhaust.spinY;
            this.exhaustCloud.rotation.x = time * exhaust.spinX;
            const exhaustRate = exhaust.opacity > this.exhaustMat.opacity ? 0.08 : 0.20;
            this.exhaustMat.opacity += (exhaust.opacity - this.exhaustMat.opacity) * exhaustRate;
            this._exhaustColor.setHex(exhaust.color);
            this.exhaustMat.color.lerp(this._exhaustColor, 0.05);
            if (this.exhaustMat.opacity > 0.01) {
                this.exhaustMat.size = exhaust.baseSize + Math.sin(time * exhaust.pulseRate) * exhaust.pulseDepth;
            }
        }
        const anomalyPressure = this.player.anomalyPressure || 0;
        if (this.interactables && this.player && this.player.updateObjectives) {
            let nearestDistSq = Infinity;
            const isExitPhase = this.player.objectives.fixed >= this.player.objectives.total;
            if (isExitPhase && !this.player.inventory.hasExitKey) {
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
                    if (this._currentTargetPoi && this._currentTargetPoi.active) {
                        this._currentTargetPoi = null;
                    }
                    
                    if (!this._currentTargetPoi) {
                        let nearestPoiDistSq = Infinity;
                        for (let i = 0; i < this.pointsOfInterest.length; i++) {
                            const poi = this.pointsOfInterest[i];
                            if (poi.active) continue;
                            const dx = cameraPos.x - poi.x;
                            const dz = cameraPos.z - poi.z;
                            const dSq = dx * dx + dz * dz;
                            if (dSq < nearestPoiDistSq) {
                                nearestPoiDistSq = dSq;
                                this._currentTargetPoi = poi;
                            }
                        }
                    }
                    
                    if (this._currentTargetPoi) {
                        const dx = cameraPos.x - this._currentTargetPoi.x;
                        const dz = cameraPos.z - this._currentTargetPoi.z;
                        const distSq = dx * dx + dz * dz;
                        
                        if (distSq < 9.0) {
                            this._currentTargetPoi.active = true;
                            this._currentTargetPoi = null;
                            this._breakerHuntHops--;
                        } else {
                            nearestDistSq = distSq;
                            targetIsPoi = true;
                        }
                    }
                } else {
                    this._currentTargetPoi = null;
                }
                
                if (!targetIsPoi) {
                    if (this._currentTargetSwitch && this._currentTargetSwitch.userData.active) {
                        this._currentTargetSwitch = null;
                    }
                    
                    if (!this._currentTargetSwitch) {
                        let minDSq = Infinity;
                        for (let i = 0; i < this.interactables.length; i++) {
                            const item = this.interactables[i];
                            if (item.userData.type === 'exit_switch' && item.userData.active === false) {
                                const dSq = cameraPos.distanceToSquared(item.position);
                                if (dSq < minDSq) {
                                    minDSq = dSq;
                                    this._currentTargetSwitch = item;
                                }
                            }
                        }
                    }
                    
                    if (this._currentTargetSwitch) {
                        nearestDistSq = cameraPos.distanceToSquared(this._currentTargetSwitch.position);
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
            let targetIntensity = this.player.flashlightActive ? 2.2 : 0.0;
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
            const row = SECTORS[activeSector];
            const sectorAmbient = row && row.ambient !== undefined ? row.ambient : DEFAULT_AMBIENT;
            const targetAmbient = Math.max(MIN_AMBIENT, sectorAmbient * (1.0 - darknessPressure * 0.5));
            this.engine.ambientLight.intensity += (targetAmbient - this.engine.ambientLight.intensity) * 0.05;
            if (this.engine.globalShadowLight) {
                let targetShadow = this._stickySectorId === "SERVER" ? 0.05 : 0.40;
                if (this._stickySectorId === "ATRIUM") targetShadow = 0.0;
                targetShadow = Math.max(0.0, targetShadow - (darknessPressure * 0.4));
                this.engine.globalShadowLight.intensity += (targetShadow - this.engine.globalShadowLight.intensity) * 0.05;
            }
            if (this.glowMat) {
                let targetGlowOpacity = Math.max(0.0, 1.0 - (darknessPressure * 0.4));
                if (this._stickySectorId === "IMPOUND" || this._stickySectorId === "CHASM" || this._stickySectorId === "ATRIUM") targetGlowOpacity = 0.0;
                else if (this._stickySectorId === "ARCHIVE") targetGlowOpacity = 0.15;
                else if (this._stickySectorId === "INCINERATOR") targetGlowOpacity = 0.1;
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
        this.hangingCables = [];
        this.interactables = [];
        this.animators = [];
        this.steamClouds = [];
        this.interactiveDoors = [];
        this.airlocks = [];
        this.macroZones.clear();
        this.spatialGrid.clear();
        this.currentChunkCoords = {x: null, z: null, qx: null, qz: null};
        this.blackoutChunks.clear();
        this.observers = [];
        this._globalSwitches = [];
        this.pointsOfInterest = [];
        this._breakerHuntHops = this._rollHuntHops();
        this._runSalt32 = (Math.random() * 4294967296) >>> 0;
        this._macroChunkHashes = new Set();
        this._sectorBags = null;
        this._pendingMacroContent.clear();
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
            if (warpHappened) {
                if (this.anomaly) this.anomaly.reset(warpX + 32, 1.5, warpZ + 32);
            }
        } else {
            this.player.coherence = 1.0;
            if (this.anomaly) this.anomaly.reset(32, 1.5, 32);
            const chunkW = 64;
            const cX = Math.floor(this.camera.position.x / chunkW);
            const cZ = Math.floor(this.camera.position.z / chunkW);
            this.camera.position.set(cX * chunkW + 34, 1.6, cZ * chunkW + 34);
            this.needsSafeSpawn = true;
        }
        const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
        this.baseSeed = 0;
        for (let i = 0; i < seedString.length; i++) {
            this.baseSeed = ((this.baseSeed << 5) - this.baseSeed) + seedString.charCodeAt(i);
            this.baseSeed |= 0;
        }
        this.cellSize = 4;
        MaterialLibrary.injectMaterials(this);
        this._architecturalMats = null;
    }

    _generateSectorMaze(randomFn) {
        return this.setPieces.generateSectorMaze(randomFn);
    }

    async _compileInstances(hash, chunkGroup, stagingMeshes, randomFn) {
        let compileStartTime = performance.now();
        const instancedGroups = new Map();
        for (let i = 0; i < stagingMeshes.length; i++) {
            const mesh = stagingMeshes[i];
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
            if (performance.now() - compileStartTime > 5.0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                compileStartTime = performance.now();
            }
        }
        const dummyColor = new THREE.Color();
        const groups = Array.from(instancedGroups.values());
        
        const tempGroup = new THREE.Group();
        
        for (let i = 0; i < groups.length; i++) {
            if (performance.now() - compileStartTime > 5.0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                compileStartTime = performance.now();
            }
            const group = groups[i];
            const isDecal = !Array.isArray(group.material) && (group.material === this.moldMat || group.material === this.ceilingStainMat || group.material === this.glowMat || group.material === this.moldCreepMat);
            if (group.meshes.length > 1 && !Array.isArray(group.material)) {
                const iMesh = new THREE.InstancedMesh(group.geometry, group.material, group.meshes.length);
                if (!isDecal) {
                    iMesh.castShadow = (group.material !== this.fenceMat && !group.material.userData.noShadow);
                    iMesh.receiveShadow = true;
                }
                iMesh.userData.chunkHash = hash;
                const isStructural = this._isArchitectural(group.material);
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
                tempGroup.add(iMesh);
                if (!isDecal) this.walls.push(iMesh);
            } else {
                for (let j = 0; j < group.meshes.length; j++) {
                    const mesh = group.meshes[j];
                    mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                    if (!isDecal) {
                        mesh.castShadow = (!Array.isArray(group.material) && group.material !== this.fenceMat && !group.material.userData.noShadow);
                        mesh.receiveShadow = true;
                        this.walls.push(mesh);
                    }
                    tempGroup.add(mesh);
                }
            }
            if (performance.now() - compileStartTime > 5.0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                compileStartTime = performance.now();
            }
        }
        
        if (this.activeChunks.has(hash)) {
            if (typeof this.engine.renderer.compileAsync === 'function') {
                await this.engine.renderer.compileAsync(tempGroup, this.camera, this.scene);
                if (!this.activeChunks.has(hash)) return;
                while (tempGroup.children.length > 0) {
                    chunkGroup.add(tempGroup.children[0]);
                }
            } else {
                while (tempGroup.children.length > 0) {
                    chunkGroup.add(tempGroup.children[0]);
                }
                this.engine.renderer.compile(this.scene, this.camera);
            }
        }
    }

    _dampAt(x, z) {
        return this._dampOctave(x * 0.11, z * 0.11) * 0.62
            + this._dampOctave(x * 0.31, z * 0.31) * 0.38;
    }

    _dampOctave(fx, fz) {
        const x0 = Math.floor(fx), z0 = Math.floor(fz);
        const tx = fx - x0, tz = fz - z0;
        const sx = tx * tx * (3 - 2 * tx);
        const sz = tz * tz * (3 - 2 * tz);
        const a = this._dampHash(x0, z0);
        const b = this._dampHash(x0 + 1, z0);
        const c = this._dampHash(x0, z0 + 1);
        const d = this._dampHash(x0 + 1, z0 + 1);
        const top = a + (b - a) * sx;
        return top + ((c + (d - c) * sx) - top) * sz;
    }

    _dampHash(ix, iz) {
        let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    _placeWallMold(x, z, random, addGeometry, damp) {
        if (!this.moldCreepMat || !this.moldCreepGeos || !this.moldCreepGeos.length) return;
        if (damp + (random() - 0.5) * 0.12 < 0.545) return;
        const out = (this.cellSize / 2) + 0.03;
        const cx = x * this.cellSize;
        const cz = z * this.cellSize;
        if (!this._moldProbe) this._moldProbe = new THREE.Vector3();
        const probe = this._moldProbe;
        const BOARD_TOP = 3.02 * (512 - 480) / 512;

        const geoH = this.moldCreepHeight;
        const BOTTOM = BOARD_TOP - geoH * this.moldCreepSeepFrac;

        const solidBehind = (px, pz) => {
            probe.set(px, BOARD_TOP + 0.15, pz);
            const boxes = this.spatialGrid.getNearby(px, pz, 0.6);
            for (let i = 0; i < boxes.length; i++) {
                const b = boxes[i];
                if (b.isInvisibleBlocker) continue;
                if (b.containsPoint && b.containsPoint(probe)) return true;
            }
            return false;
        };

        const cell = this.cellSize;
        const geos = this.moldCreepGeos;

        const anchorsOn = (f) => {
            const r = f * (Math.PI / 2);
            const s = Math.sin(r), c = Math.cos(r);
            const found = [];
            for (const sign of [-1, 1]) {
                const ax = c * sign, az = -s * sign;
                if (solidBehind(cx + s * cell + ax * cell, cz + c * cell + az * cell)) {
                    if (random() < 0.75) {
                        found.push({slide: sign * (cell / 2 - 0.15), toward: sign, jitter: 0.25, weight: 1.3 + (random() * 0.4 - 0.2), corner: true});
                    }
                } else if (!solidBehind(cx + s * (out - 0.25) + ax * cell, cz + c * (out - 0.25) + az * cell)) {
                    if (random() < 0.3) {
                        found.push({slide: sign * (cell / 2 - 0.7), toward: sign, jitter: 0.5, weight: 1.0 + (random() * 0.4 - 0.2), corner: false});
                    }
                }
            }
            return found;
        };

        const order = [0, 1, 2, 3];
        for (let i = 3; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            const t = order[i];
            order[i] = order[j];
            order[j] = t;
        }

        let face = -1;
        let anchors = [];
        for (const f of order) {
            const r = f * (Math.PI / 2);
            if (!solidBehind(cx + Math.sin(r) * (out - 0.25), cz + Math.cos(r) * (out - 0.25))) continue;
            const found = anchorsOn(f);
            if (found.length) {
                face = f;
                anchors = found;
                break;
            }
            if (face < 0) face = f;
        }
        if (face < 0) return;
        const rotY = face * (Math.PI / 2);
        const sinY = Math.sin(rotY), cosY = Math.cos(rotY);

        if (damp > 0.55) {
            const count = Math.floor(random() * 3);
            for(let k=0; k<count; k++) {
                anchors.push({slide: (random() - 0.5) * (cell - 1.5), toward: 0, jitter: 0.6, weight: 0.85 + random() * 0.3, corner: false});
            }
        }
        if (!anchors.length) return;

        for (const anchor of anchors) {
            const flip = random() > 0.5 ? 1 : -1;
            const sx = (0.6 + random() * 0.7) * anchor.weight * (0.85 + damp * 0.4);
            const half = (1.5 * sx) * 0.42;
            const slide = anchor.corner
                ? anchor.toward * Math.max(0, cell / 2 - half)
                : anchor.slide + (random() - 0.5) * anchor.jitter;
            const px = cx + sinY * out + cosY * slide;
            const pz = cz + cosY * out - sinY * slide;
            const inward = 0.25;
            let hung = true;
            for (let e = -1; e <= 1; e++) {
                if (e === anchor.toward && e !== 0) continue;
                const ex = px + cosY * half * e - sinY * inward;
                const ez = pz - sinY * half * e - cosY * inward;
                if (!solidBehind(ex, ez)) {
                    hung = false;
                    break;
                }
            }
            if (!hung) continue;
            const mold = new THREE.Mesh(geos[Math.floor(random() * geos.length)], this.moldCreepMat);
            mold.position.set(px, BOTTOM + geoH / 2, pz);
            mold.rotation.y = rotY;
            mold.scale.set(flip * sx, 1, 1);
            addGeometry(mold);

            if (anchor.corner) {
                const f_adj = (face + anchor.toward + 4) % 4;
                const rotY_adj = f_adj * (Math.PI / 2);
                const sinY_adj = Math.sin(rotY_adj), cosY_adj = Math.cos(rotY_adj);
                if (!solidBehind(cx + sinY_adj * (out - 0.25), cz + cosY_adj * (out - 0.25))) continue;
                const slide_adj = -slide;
                const flip_adj = random() > 0.5 ? 1 : -1;
                const px_adj = cx + sinY_adj * out + cosY_adj * slide_adj;
                const pz_adj = cz + cosY_adj * out - sinY_adj * slide_adj;

                const mold_adj = new THREE.Mesh(geos[Math.floor(random() * geos.length)], this.moldCreepMat);
                mold_adj.position.set(px_adj, BOTTOM + geoH / 2, pz_adj);
                mold_adj.rotation.y = rotY_adj;
                mold_adj.scale.set(flip_adj * sx, 1, 1);
                addGeometry(mold_adj);
            }
        }
    }

    _createChunkHelpers(hash, chunkGroup, stagingMeshes, random) {
        return this.structureKit.createChunkHelpers(hash, chunkGroup, stagingMeshes, random);
    }

    getPooledLightMaterial(isBroken) {
        if (!this._pooledLightMats) {
            this._pooledLightMats = {normal: [], broken: []};
            for (let i = 0; i < 16; i++) {
                const nMat = this.baseLightMat.clone();
                if (this.sharedAssets) this.sharedAssets.add(nMat.uuid);
                this._pooledLightMats.normal.push(nMat);
                const bMat = this.baseBrokenLightMat.clone();
                if (this.sharedAssets) this.sharedAssets.add(bMat.uuid);
                this._pooledLightMats.broken.push(bMat);
            }
            this._poolIndex = 0;
        }
        this._poolIndex = (this._poolIndex + 1) % 16;
        return isBroken ? this._pooledLightMats.broken[this._poolIndex] : this._pooledLightMats.normal[this._poolIndex];
    }

    getPooledMazeLightMaterial(isBroken) {
        if (!this._pooledMazeLightMats) {
            this._pooledMazeLightMats = {normal: [], broken: []};
            for (let i = 0; i < 16; i++) {
                const nMat = this.matteLightMat.clone();
                if (this.sharedAssets) this.sharedAssets.add(nMat.uuid);
                this._pooledMazeLightMats.normal.push(nMat);
                const bMat = this.matteBrokenLightMat.clone();
                if (this.sharedAssets) this.sharedAssets.add(bMat.uuid);
                this._pooledMazeLightMats.broken.push(bMat);
            }
            this._mazePoolIndex = 0;
        }
        this._mazePoolIndex = (this._mazePoolIndex + 1) % 16;
        return isBroken ? this._pooledMazeLightMats.broken[this._mazePoolIndex] : this._pooledMazeLightMats.normal[this._mazePoolIndex];
    }

    _buildEntranceHallways(chunkGroup, hash, startX, startZ, sectorId, ctx, needsFloor, needsCeiling, maze) {
        return this.setPieces.buildEntranceHallways(chunkGroup, hash, startX, startZ, sectorId, ctx, needsFloor, needsCeiling, maze);
    }

    _buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign) {
        return this.setPieces.buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign);
    }

    _buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling, sectorId, buildWalls = true) {
        return this.setPieces.buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling, sectorId, buildWalls);
    }

    _buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx) {
        return this.setPieces.buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx);
    }

    _buildCheckpointColumn(x, z, hash, ctx) {
        return this.setPieces.buildCheckpointColumn(x, z, hash, ctx);
    }

    _buildCheckpointCageLight(chunkGroup, hash, stagingMeshes, px, pz, rotY, flickerOffset, isFaulty, getLightMaterial, colorHex, emissiveHex, intensity) {
        return this.setPieces.buildCheckpointCageLight(chunkGroup, hash, stagingMeshes, px, pz, rotY, flickerOffset, isFaulty, getLightMaterial, colorHex, emissiveHex, intensity);
    }

    _buildImpoundItem(px, pz, kind, ctx) {
        return this.setPieces.buildImpoundItem(px, pz, kind, ctx);
    }

    _updateSliderDoor(door, playerPos, delta) {
        return this.interactionController.updateSliderDoor(door, playerPos, delta);
    }

    _updateAirlockDoor(doorObj, delta) {
        return this.interactionController.updateAirlockDoor(doorObj, delta);
    }

    _updateAirlock(airlock, playerPos, delta) {
        return this.interactionController.updateAirlock(airlock, playerPos, delta);
    }

    shatterFixture(fixture) {
        return this.interactionController.shatterFixture(fixture);
    }

    _rollHuntHops() {
        const r = Math.random();
        if (r < 0.10) return 0;
        if (r < 0.60) return 1;
        return 2;
    }

    _beginBreakerScan(podium) {
        if (this.breakerScan && this.breakerScan.podium === podium) return;
        this._abortBreakerScan();
        this.breakerScan = {podium: podium, t: 0, held: true};
        setPodiumScan(podium, 0);
        document.dispatchEvent(new CustomEvent('somatic-scan-start', {detail: {distSq: 1.0, intensity: 0.5}}));
    }

    _abortBreakerScan() {
        const scan = this.breakerScan;
        if (!scan) return;
        this.breakerScan = null;
        if (!scan.podium.userData.active) setPodiumScan(scan.podium, 0);
    }

    _updateBreakerScan(playerPos, delta) {
        const scan = this.breakerScan;
        if (!scan) return;
        const podium = scan.podium;
        if (podium.userData.active || !podium.parent) {
            this._abortBreakerScan();
            return;
        }
        if (!scan.held) {
            this._abortBreakerScan();
            return;
        }
        if (podium.position.distanceToSquared(playerPos) > 9.0) {
            this._abortBreakerScan();
            return;
        }
        if (this.camera) {
            this.camera.getWorldDirection(this._scanDir);
            this._scanAim.subVectors(podium.position, playerPos).normalize();
            if (this._scanDir.dot(this._scanAim) < 0.70) {
                this._abortBreakerScan();
                return;
            }
        }
        scan.t = Math.min(1, scan.t + delta / SCAN_DURATION);
        setPodiumScan(podium, scan.t);
        if (scan.t >= 1) {
            this.breakerScan = null;
            podium.userData.active = true;
            setPodiumSpent(podium);
            this._activateExitSwitch(podium);
        }
    }

    _activateExitSwitch(podium) {
        this.player.objectives.fixed++;
        this.player.updateObjectives();
        this._breakerHuntHops = this._rollHuntHops();
        document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 0.1, intensity: 1.5}}));
        if (this.engine.ambientLight) {
            this.engine.ambientLight.intensity = 2.0;
        }
    }

    _triggerBreaker(podium) {
                const chunkHash = podium.userData.chunkHash;
                const isBlackout = this.blackoutChunks.has(chunkHash);
                if (podium.userData.door && !podium.userData.doorOpen) {
                    podium.userData.door.rotation.y = -Math.PI / 1.5;
                    podium.userData.doorOpen = true;
                }
                document.dispatchEvent(new CustomEvent('somatic-breaker', {detail: {distSq: 1.0, intensity: 2.0}}));
                if (!isBlackout) {
                    this.blackoutChunks.add(chunkHash);
                    this.fixtureData.forEach(fixture => {
                        if (fixture.chunkHash === chunkHash && !fixture.isDead && !fixture.isLighthouse && !fixture.isArchiveLight) {
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
                        if (fixture.chunkHash === chunkHash && !fixture.isLighthouse && !fixture.isArchiveLight) {
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
    }

    _cacheGeo(key, make) {
        return this.structureKit.cacheGeo(key, make);
    }

    _buildPallet() {
        if (!this.palletWoodMat) {
            this.palletWoodMat = new THREE.MeshStandardMaterial({color: 0x8b7355, roughness: 0.9});
            if (this.sharedAssets) this.sharedAssets.add(this.palletWoodMat.uuid);
        }
        const pallet = new THREE.Group();
        const slatGeo = this._boxGeo(1.5, 0.025, 0.18);
        const runnerGeo = this._boxGeo(0.12, 0.12, 1.4);
        for (let i = 0; i < 5; i++) {
            const topSlat = new THREE.Mesh(slatGeo, this.palletWoodMat);
            topSlat.position.set(0, 0.1575, -0.6 + (i * 0.3));
            pallet.add(topSlat);
        }
        for (let i = 0; i < 3; i++) {
            const botSlat = new THREE.Mesh(slatGeo, this.palletWoodMat);
            botSlat.position.set(0, 0.0125, -0.6 + (i * 0.6));
            pallet.add(botSlat);
        }
        for (let i = 0; i < 3; i++) {
            const runner = new THREE.Mesh(runnerGeo, this.palletWoodMat);
            runner.position.set(-0.6 + (i * 0.6), 0.085, 0);
            pallet.add(runner);
        }
        return pallet;
    }

    _buildHangingBowlLight(chunkGroup, hash, cx, cz, random, getLightMaterial) {
        const bowlRadius = 0.4;
        const rimY = 2.65;
        const domeTopY = rimY + bowlRadius;
        const wireLen = 3.0;
        const wireGeo = this._cacheGeo('archiveWire', () => new THREE.CylinderGeometry(0.012, 0.012, wireLen, 5));
        const wire = new THREE.Mesh(wireGeo, this.metalMat);
        wire.position.set(cx, domeTopY + wireLen / 2, cz);
        chunkGroup.add(wire);
        wire.updateMatrixWorld(true);
        this.walls.push(wire);
        const bowlGeo = this._cacheGeo('archiveBowl', () => new THREE.SphereGeometry(bowlRadius, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2));
        if (!this.archiveBowlMat) {
            this.archiveBowlMat = this.rustMat.clone();
            this.archiveBowlMat.side = THREE.DoubleSide;
            this.sharedAssets.add(this.archiveBowlMat.uuid);
        }
        const bowl = new THREE.Mesh(bowlGeo, this.archiveBowlMat);
        bowl.position.set(cx, rimY, cz);
        chunkGroup.add(bowl);
        bowl.updateMatrixWorld(true);
        this.walls.push(bowl);
        const bulbRadius = 0.08;
        const bulbGeo = this._cacheGeo('archiveBulb', () => new THREE.SphereGeometry(bulbRadius, 8, 6));
        const bulbMat = getLightMaterial(0xd8b276, 0xc89858, false);
        bulbMat.map = null;
        bulbMat.emissiveMap = null;
        const bulbY = domeTopY - bulbRadius;
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(cx, bulbY, cz);
        bulb.userData.chunkHash = hash;
        chunkGroup.add(bulb);
        bulb.updateMatrixWorld(true);
        this.walls.push(bulb);
        this.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(cx, bulbY, cz),
            flickerOffset: random() * 500,
            material: bulbMat,
            isFaulty: true,
            isArchiveLight: true,
            isShadowCaster: true,
            baseIntensity: 1.5,
            targetIntensity: 1.5,
            currentIntensity: 1.5
        });
    }

    _buildAtriumLight(chunkGroup, hash, cx, cz, random, getLightMaterial) {
        const globeRadius = 0.75;
        const pipeLen = 14.0; 
        const pipeGeo = this._cacheGeo('atriumPipe', () => new THREE.CylinderGeometry(0.04, 0.04, pipeLen, 8));
        
        if (!this.atriumPipeMat) {
            this.atriumPipeMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8, metalness: 0.5});
            this.sharedAssets.add(this.atriumPipeMat.uuid);
        }
        
        const pipe = new THREE.Mesh(pipeGeo, this.atriumPipeMat);
        const globeY = 4.2 + globeRadius;
        pipe.position.set(cx, globeY + pipeLen / 2, cz);
        chunkGroup.add(pipe);
        pipe.updateMatrixWorld(true);
        this.walls.push(pipe);
        
        const globeGeo = this._cacheGeo('atriumGlobe', () => new THREE.SphereGeometry(globeRadius, 24, 16));
        const activeMat = getLightMaterial(0xfff8ee, 0xffeebb, false);
        const globe = new THREE.Mesh(globeGeo, activeMat);
        globe.position.set(cx, globeY, cz);
        chunkGroup.add(globe);
        
        this.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(cx, globeY, cz),
            flickerOffset: random() * 500,
            material: activeMat,
            isFaulty: random() > 0.95,
            baseIntensity: 0.9,
            targetIntensity: 0.9,
            currentIntensity: 0.9
        });
    }

    _buildCeilingPanelLight(chunkGroup, hash, px, pz, random, getLightMaterial, colorHex, emissiveHex, intensity, faultyThreshold) {
        const activeMat = getLightMaterial(colorHex, emissiveHex, false);
        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
        panel.position.set(px, 2.98, pz);
        chunkGroup.add(panel);
        this.walls.push(panel);
        this.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(px, 2.8, pz),
            flickerOffset: random() * 500,
            material: activeMat,
            isFaulty: random() > faultyThreshold,
            baseIntensity: intensity,
            targetIntensity: intensity,
            currentIntensity: intensity
        });
    }

    _registerInteractable(mesh, hash) {
        if (!this.interactables) this.interactables = [];
        this.interactables.push(mesh);
        const box = new THREE.Box3().setFromObject(mesh);
        box.chunkHash = hash;
        mesh.userData.box = box;
        this.spatialGrid.insert(box);
        return box;
    }

    _buildPipeCornerDressing(chunkGroup, addGeometry, random, x, z, openE, openS, openN, openW, offset, pipeY, mountY, junctionY, onJunction) {
        let hasPipes = false;
        if (openE) {
            const pipeE = new THREE.Mesh(this.pipeGeo, this.pipeMat || this.rustMat);
            pipeE.position.set(x * this.cellSize + (this.cellSize / 2) + offset, pipeY, z * this.cellSize + offset);
            addGeometry(pipeE);
            hasPipes = true;
        }
        if (openS) {
            const pipeS = new THREE.Mesh(this.pipeGeo, this.pipeMat || this.rustMat);
            pipeS.rotation.y = Math.PI / 2;
            pipeS.position.set(x * this.cellSize + offset, pipeY, z * this.cellSize + (this.cellSize / 2) + offset);
            addGeometry(pipeS);
            hasPipes = true;
        }
        if (hasPipes || openN || openW) {
            const mount = new THREE.Mesh(this.pipeMountGeo, this.pipeMat || this.rustMat);
            mount.position.set(x * this.cellSize + offset, mountY, z * this.cellSize + offset);
            addGeometry(mount);
            if (random() > 0.1) {
                const junction = new THREE.Mesh(this.pipeJunctionGeo, this.pipeMat || this.rustMat);
                junction.position.set(x * this.cellSize + offset, junctionY, z * this.cellSize + offset);
                addGeometry(junction);
                if (onJunction) onJunction();
            }
        }
    }

    _boxGeo(w, h, d) {
        return this.structureKit.boxGeo(w, h, d);
    }

    _planeGeo(w, h) {
        return this.structureKit.planeGeo(w, h);
    }

    _isArchitectural(mat) {
        if (!mat || Array.isArray(mat)) return false;
        if (!this._architecturalMats) {
            const set = new Set();
            for (const key of Object.keys(this)) {
                const v = this[key];
                if (v && v.isMaterial && /(?:Wall|Floor|Ceiling|Rail)Mat$/.test(key)) set.add(v);
            }
            for (const m of [this.sharedWallMat, this.headerMat, this.marbleMat, this.structMat]) {
                if (m) set.add(m);
            }
            this._architecturalMats = set;
        }
        return this._architecturalMats.has(mat);
    }

    _sectorFog(id) {
        const s = SECTORS[id];
        return (s && s.fog !== undefined) ? s.fog : 0.05;
    }

    getSectorBounds(sectorId) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        let found = false;
        for (const zone of this.macroZones.values()) {
            if (zone.id !== sectorId) continue;
            found = true;
            if (zone.minX < minX) minX = zone.minX;
            if (zone.maxX > maxX) maxX = zone.maxX;
            if (zone.minZ < minZ) minZ = zone.minZ;
            if (zone.maxZ > maxZ) maxZ = zone.maxZ;
        }
        return found ? {minX, maxX, minZ, maxZ} : null;
    }

    captureAsset() {
        this.engine.render();
        const dataURL = this.engine.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `backrooms_asset_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }
}