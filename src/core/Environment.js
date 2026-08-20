import ChunkManager from '../world/ChunkManager.js';
import AtmosphereManager from '../aesthetics/AtmosphereManager.js';
import ProceduralTextureFactory from '../aesthetics/ProceduralTextureFactory.js';
import EntityManager from '../entities/EntityManager.js';
import SpatialHashGrid from '../math/SpatialHashGrid.js';
import TheArchitect from './TheArchitect.js';
import LumenGrid from '../aesthetics/LumenGrid.js';
import SECTORS, {DEFAULT_DUST, DEFAULT_EXHAUST, DEFAULT_AMBIENT, MIN_AMBIENT} from '../world/Sectors.js';
import MaterialLibrary from '../aesthetics/MaterialLibrary.js';
import StructureKit from '../world/StructureKit.js';
import SetPieces from '../world/SetPieces.js';
import * as SectorPlacement from '../world/SectorPlacement.js';
import InteractionController from '../player/InteractionController.js';
import {setPodiumScan, setPodiumSpent, SCAN_DURATION} from '../world/BreakerPodium.js';
import RenderEngine from './RenderEngine.js';
import ShaderWarmup from './ShaderWarmup.js';
import BootController from '../ui/BootController.js';

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
        this.consumedProps = new Set();
        document.addEventListener('somatic-run-reset', () => {
            this.consumedProps.clear();
            this.elevatorAnchor = null;
            this.wantsElevatorSpawn = true;
        });
        this.localFixtures = [];
        this.lastAudioOcclusionTime = 0;
        this.currentOcclusionState = false;
        this.chunkQueue = [];
        this.queuedHashes = new Set();
        this.isBuildingChunk = false;
        this.isBuildingMacroInterior = false;
        this.isSpawning = false;
        this._lightSortCache = (a, b) => a.distSq - b.distSq;
        this._dustColor = new THREE.Color();
        this._exhaustColor = new THREE.Color();
        this.blackoutChunks = new Set();
        this.macroZones = new Map();
        this.discoveredSectors = new Map();
        this.pointsOfInterest = [];
        this._breakerHuntHops = undefined;
        this.breakerScan = null;
        this._scanDir = new THREE.Vector3();
        this._scanAim = new THREE.Vector3();

        this._macroChunkHashes = new Set();
        this._placementCfg = null;
        this.macroSpawnExclusionRadius = 1;
        this.macroMinSpacingChunks = 2;
        this._pendingMacroContent = new Map();
        this.structureKit = new StructureKit(this);
        this.setPieces = new SetPieces(this);
        this.interactionController = new InteractionController(this);
        this.chunkManager = new ChunkManager(this);
        this.atmosphereManager = new AtmosphereManager(this);
    }

    async setup() {
        const bootCtrl = BootController.getInstance();
        bootCtrl.setPhase('ASSETS');
        await new Promise(resolve => setTimeout(resolve, 0));
        const coreAssetsStart = performance.now();
        const assets = await ProceduralTextureFactory.generateAssets((fraction, name) => {
            bootCtrl.setPhaseProgress(fraction, `MOUNTING ASSET: ${name}`);
        });
        bootCtrl.addLog(`CORE ASSETS LOADED (${Math.round(performance.now() - coreAssetsStart)}ms)`);
        Object.assign(this, assets);
        const {carpetTexture, ceilingTexture, ceilingBumpTexture} = assets;
        carpetTexture.repeat.set(16, 16);
        ceilingTexture.repeat.set(20, 20);
        ceilingBumpTexture.repeat.set(20, 20);
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
        this.lumenGrid = new LumenGrid(this, RenderEngine.getSavedShadowQuality());
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
        bootCtrl.setPhase('GRID');
        const generateStart = performance.now();
        this.generate();
        bootCtrl.setPhaseProgress(1, `WORLD MESH GRID GENERATED [SEED: 0x${(this.baseSeed >>> 0).toString(16).toUpperCase()}] (${Math.round(performance.now() - generateStart)}ms)`);

        bootCtrl.setPhase('BLUEPRNT');
        const sectorAssetsStart = performance.now();
        await ProceduralTextureFactory.lazyLoadSectorAssets(this, (i, total, name, ms) => {
            bootCtrl.setPhaseProgress((i / total) * 0.33, `SECTOR TEXTURE BUNDLE [${name}] BUILT (${ms}ms)`);
        }).catch(err => {
            console.error('[BOOT] lazyLoadSectorAssets failed:', err);
            bootCtrl.addLog(`SECTOR TEXTURE BUNDLE BUILD FAILED: ${err && err.message}`);
        });
        bootCtrl.addLog(`ALL SECTOR TEXTURE BUNDLES READY (${Math.round(performance.now() - sectorAssetsStart)}ms)`);

        const warmupStart = performance.now();
        await ShaderWarmup.run(this, (fraction, msg) => {
            bootCtrl.setPhaseProgress(0.33 + fraction * 0.67, msg);
        });
        bootCtrl.addLog(`SHADER MATERIAL WARMUP DONE (${Math.round(performance.now() - warmupStart)}ms)`);

        const toggleBtn = document.getElementById('menuToggleBtn');
        const toggleMenu = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            const panel = document.querySelector('.control-panel');
            const isHidden = window.getComputedStyle(panel).display === 'none';
            panel.style.display = isHidden ? 'block' : 'none';
            
            if (this.player && this.player.input) {
                this.player.input.state.isReading = isHidden;
                if (isHidden) {
                    document.dispatchEvent(new Event('somatic-close-document'));
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    const vc = document.getElementById('virtual-cursor');
                    if (vc) vc.classList.remove('active');
                } else {
                    document.body.requestPointerLock()?.catch(() => {});
                }
            }
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
            const val = Number(e.target.value) / 100;
            this.engine.baseExposure = val;
            if (this.engine.renderer) {
                this.engine.renderer.toneMappingExposure = val;
            }
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
                try { localStorage.setItem('level0_tutorial_unlocked', '1'); } catch(e) {}
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 1.0, intensity: 0.8}}));
            }
        });
        document.addEventListener('somatic-keypad-cancel', () => {
            this._keypadDoor = null;
        });
    }









    updateInteractives(playerPos, delta) {
        return this.interactionController.updateInteractives(playerPos, delta);
    }

    _resolveActiveSector(cameraPos) {
        let activeSector = "NORMAL";
        let targetFog = this.atmosphereManager._sectorFog("NORMAL");
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
            targetFog = this.atmosphereManager._sectorFog(activeSector);
            this._doorSectorForce = null;
            this.isSectorTransitioning = true;
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


    _pickSpawnChunk(cX, cZ) {
        const cfg = SectorPlacement.placementConfig(this);
        if (!SectorPlacement.isMacroChunk(cfg, cX, cZ)) return {x: cX, z: cZ};
        for (let r = 1; r <= 8; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                    if (!SectorPlacement.isMacroChunk(cfg, cX + dx, cZ + dz)) {
                        return {x: cX + dx, z: cZ + dz};
                    }
                }
            }
        }
        return {x: cX, z: cZ};
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
                        if (!this.sharedAssets.has(m.uuid)) {
                            this.chunkManager._forgetMaterialPrograms(m);
                            m.dispose();
                        }
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
        this.discoveredSectors.clear();
        this.spatialGrid.clear();
        this.currentChunkCoords = {x: null, z: null, qx: null, qz: null};
        this.blackoutChunks.clear();
        this.observers = [];
        this._globalSwitches = [];
        this.pointsOfInterest = [];
        this._breakerHuntHops = this.interactionController.rollHuntHops();
        this._runSalt32 = (Math.random() * 4294967296) >>> 0;
        this._macroChunkHashes = new Set();
        this._spawnElevator = null;
        this._placementCfg = null;
        this._pendingMacroContent.clear();
        if (this.tagPool) {
            this.tagPool.forEach(tag => tag.visible = false);
            this.tagIndex = 0;
        }
        this.chunkQueue = [];
        this.isBuildingChunk = false;
        this.player.velocity.set(0, 0, 0);
        const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
        this.baseSeed = 0;
        for (let i = 0; i < seedString.length; i++) {
            this.baseSeed = ((this.baseSeed << 5) - this.baseSeed) + seedString.charCodeAt(i);
            this.baseSeed |= 0;
        }
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
            const spawn = this._pickSpawnChunk(
                Math.floor(this.camera.position.x / chunkW),
                Math.floor(this.camera.position.z / chunkW)
            );
            const cX = spawn.x;
            const cZ = spawn.z;
            this.camera.position.set(cX * chunkW + 6, 1.6, cZ * chunkW + 6);
            this.needsSafeSpawn = true;
            if (this.wantsElevatorSpawn) {
                this.wantsElevatorSpawn = false;
                this._spawnElevator = {
                    chunkHash: `${cX},${cZ}`,
                    cellX: null,
                    cellZ: null,
                    exitIndex: null,
                    placePlayer: true,
                    placement: null
                };
            }
        }
        if (this.elevatorAnchor && this.elevatorAnchor.seed !== this.baseSeed) {
            this.elevatorAnchor = null;
        }
        if (!this._spawnElevator && this.elevatorAnchor) {
            const a = this.elevatorAnchor;
            this._spawnElevator = {
                chunkHash: `${Math.floor(a.cellX / this.chunkSize)},${Math.floor(a.cellZ / this.chunkSize)}`,
                cellX: a.cellX,
                cellZ: a.cellZ,
                exitIndex: a.exitIndex,
                placePlayer: false,
                placement: null
            };
        }
        this.cellSize = 4;
        MaterialLibrary.injectMaterials(this);
        this._architecturalMats = null;
    }

    _generateSectorMaze(randomFn) {
        return this.setPieces.generateSectorMaze(randomFn);
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











    _cacheGeo(key, make) {
        return this.structureKit.cacheGeo(key, make);
    }

    _buildPallet() {
        return this.setPieces.buildPallet();
    }

    _buildHangingBowlLight(chunkGroup, hash, cx, cz, random, getLightMaterial) {
        return this.setPieces.buildHangingBowlLight(chunkGroup, hash, cx, cz, random, getLightMaterial);
    }

    _buildAtriumLight(chunkGroup, hash, cx, cz, random, getLightMaterial) {
        return this.setPieces.buildAtriumLight(chunkGroup, hash, cx, cz, random, getLightMaterial);
    }

    _buildCeilingPanelLight(chunkGroup, hash, px, pz, random, getLightMaterial, colorHex, emissiveHex, intensity, faultyThreshold) {
        return this.setPieces.buildCeilingPanelLight(chunkGroup, hash, px, pz, random, getLightMaterial, colorHex, emissiveHex, intensity, faultyThreshold);
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
        return this.setPieces.buildPipeCornerDressing(chunkGroup, addGeometry, random, x, z, openE, openS, openN, openW, offset, pipeY, mountY, junctionY, onJunction);
    }

    _boxGeo(w, h, d) {
        return this.structureKit.boxGeo(w, h, d);
    }

    _planeGeo(w, h) {
        return this.structureKit.planeGeo(w, h);
    }

    _cylinderGeo(rt, rb, h, rs) {
        return this.structureKit.cylinderGeo(rt, rb, h, rs);
    }

    _isArchitectural(mat) {
        if (!mat || Array.isArray(mat)) return false;
        if (!this._architecturalMats) {
            const set = new Set();
            for (const key of Object.keys(this)) {
                const v = this[key];
                if (v && v.isMaterial && /(?:Wall|Floor|Ceiling|Rail)Mat$/.test(key)) set.add(v);
            }
            for (const m of [this.sharedWallMat, this.headerMat, this.marbleMat, this.structMat, this.baseboardMat, this.baseboardTrimMat]) {
                if (m) set.add(m);
            }
            this._architecturalMats = set;
        }
        return this._architecturalMats.has(mat);
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
    updateChunks(playerPos) { return this.chunkManager.updateChunks(playerPos); }
    processChunkQueue() { return this.chunkManager.processChunkQueue(); }
    buildChunk(chunkX, chunkZ, hash) { return this.chunkManager.buildChunk(chunkX, chunkZ, hash); }
    drainShadowPrewarm(budgetMs) { return this.chunkManager.drainShadowPrewarm(budgetMs); }
    drainProgramLinks(budgetMs, stallMasked) { return this.chunkManager._drainProgramLinks(budgetMs, stallMasked); }
    beginMacroChunkContent(hash) { return this.chunkManager.beginMacroChunkContent(hash); }
    isMacroChunkContentReady(hash) { return this.chunkManager.isMacroChunkContentReady(hash); }
    
    updateLights(time) { return this.atmosphereManager.updateLights(time); }

}