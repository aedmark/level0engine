// Environment.js
// LEVEL 0 ENVIRONMENT & MEMORY MANAGER

import ProceduralTextureFactory from './ProceduralTextureFactory.js';
import Anomaly from './Anomaly.js';
import SpatialHashGrid from './SpatialHashGrid.js';
import TheArchitect from './TheArchitect.js';
import LumenGrid from './LumenGrid.js';
import SECTORS from './Sectors.js';
export default class Environment {
    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.fixtureData = [];
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
        this.queuedHashes = new Set();
        this.isBuildingChunk = false;
        this.isSpawning = false;
        this._lightSortCache = (a, b) => a.distSq - b.distSq;
        this.blackoutChunks = new Set();
        this.macroZones = new Map();
        this.pointsOfInterest = [];
        this._breakerHuntHops = undefined;
        this._macroChunkHashes = new Set();
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
            deadHashes.forEach(h => {
                this.macroZones.delete(h);
                if (this._annexKeypadChunks) this._annexKeypadChunks.delete(h);
            });
            this.walls = this.walls.filter(w => !deadHashes.has(w.userData.chunkHash));
            this.fixtureData = this.fixtureData.filter(f => !deadHashes.has(f.chunkHash));
            this.interactiveDoors = this.interactiveDoors.filter(d => !deadHashes.has(d.userData.chunkHash));
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
    _updateSliderDoor(door, playerPos, delta) {
        const ud = door.userData;
        const pDistSq = playerPos.distanceToSquared(door.position);
        const entityOpen = ud.entityOpen === true;
        ud.entityOpen = false;
        if (pDistSq > 900.0 && ud.progress === 0 && !entityOpen) return;
        const shouldOpen = entityOpen || pDistSq < 20.0;
        const target = shouldOpen ? 1.0 : 0.0;
        const travelAxis = ud.spansX ? 'z' : 'x';
        const playerOutside = ((playerPos[travelAxis] - door.position[travelAxis]) * ud.outSign) > 0;
        if (target !== ud.lastTarget) {
            ud.lastTarget = target;
            if (target === 1.0) ud.openedFromOutside = playerOutside;
            document.dispatchEvent(new CustomEvent('somatic-door', {
                detail: {distSq: pDistSq, intensity: shouldOpen ? 0.7 : 0.45, variant: 'blast'}
            }));
        }
        let approaching = false;
        const mvx = this._playerMoveX || 0;
        const mvz = this._playerMoveZ || 0;
        const moveSq = mvx * mvx + mvz * mvz;
        const minStep = 0.5 * delta;
        if (moveSq > minStep * minStep) {
            const dx = door.position.x - playerPos.x;
            const dz = door.position.z - playerPos.z;
            const dLen = Math.sqrt(dx * dx + dz * dz) || 1.0;
            approaching = ((mvx * dx + mvz * dz) / (Math.sqrt(moveSq) * dLen)) > 0.45;
        }
        if (ud.sectorId && pDistSq < 30.0 && ud.openedFromOutside && (ud.lastTarget === 1 || ud.progress > 0)) {
            if ((playerOutside && approaching) || (!playerOutside && pDistSq < 20.0)) {
                this._doorSectorForce = ud.sectorId;
            }
        }
        if (ud.progress === target) return;
        const speed = entityOpen ? 3.0 : 0.9;
        const dir = target > ud.progress ? 1 : -1;
        ud.progress = Math.max(0, Math.min(1, ud.progress + dir * speed * delta));
        const t = ud.progress;
        const eased = t * t * (3 - 2 * t);
        const axis = ud.spansX ? 'x' : 'z';
        for (let i = 0; i < 2; i++) {
            const p = ud.panels[i];
            p.position[axis] = ud.baseOffsets[i] + ud.signs[i] * eased * ud.slideDist;
        }
        this.lumenGrid.shadowsDirty = true;
        if (ud.progress > 0.12) {
            if (!ud.box.isEmpty()) ud.box.makeEmpty();
        } else if (ud.progress === 0) {
            if (ud.box.isEmpty()) ud.box.copy(ud.closedBox);
        }
        if (ud.progress === 1 || ud.progress === 0) {
            document.dispatchEvent(new CustomEvent('somatic-door', {
                detail: {distSq: pDistSq, intensity: ud.progress === 0 ? 0.9 : 0.5, variant: 'blast'}
            }));
        }
    }
    updateInteractives(playerPos, delta) {
        if (!this._prevPlayerPos) this._prevPlayerPos = playerPos.clone();
        this._playerMoveX = playerPos.x - this._prevPlayerPos.x;
        this._playerMoveZ = playerPos.z - this._prevPlayerPos.z;
        this._prevPlayerPos.copy(playerPos);
        this.interactiveDoors.forEach(door => {
            if (door.userData.isSlider) {
                this._updateSliderDoor(door, playerPos, delta);
                return;
            }
            if (door.userData.codeLocked) door.userData.entityOpen = false;
            const pDistSq = playerPos.distanceToSquared(door.position);
            if (pDistSq > 400.0 && !door.userData.isLatched && !door.userData.entityOpen) return;
            const playerOpen = door.userData.playerOpen === true;
            const entityOpen = door.userData.entityOpen === true;
            door.userData.entityOpen = false;
            const isOpen = playerOpen || entityOpen;
            let targetRot = door.userData.closedRot;
            if (isOpen) {
                if (!door.userData.isLatched) {
                    const triggerPos = (entityOpen && !playerOpen) ? this.anomaly.group.position : playerPos;
                    const isZDoor = Math.abs(door.userData.closedRot) < 0.1 || Math.abs(door.userData.closedRot - Math.PI) < 0.1;
                    const swingAngle = Math.PI / 2.2;
                    let desiredRot;
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
                this.lumenGrid.shadowsDirty = true;
                if (door.userData.box && isOpen) {
                    if (!door.userData.box.isEmpty()) door.userData.box.makeEmpty();
                }
                if (pDistSq < 2.5) {
                    const pushDist = Math.sqrt(pDistSq) || 0.1;
                    const pushStrength = (2.5 - pDistSq) * 15.0;
                    const pushX = ((playerPos.x - door.position.x) / pushDist) * pushStrength;
                    const pushZ = ((playerPos.z - door.position.z) / pushDist) * pushStrength;
                    const cosY = Math.cos(this.camera.rotation.y);
                    const sinY = Math.sin(this.camera.rotation.y);
                    const localVx = pushX * cosY - pushZ * sinY;
                    const localVz = pushX * sinY + pushZ * cosY;
                    this.player.velocity.x -= localVx;
                    this.player.velocity.z += localVz;
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
                        this.lumenGrid.shadowsDirty = true;
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
                    if (!this._sharedToObs) this._sharedToObs = new THREE.Vector3();
                    if (!this._sharedLookDir) this._sharedLookDir = new THREE.Vector3();
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
                            const almondGroup = new THREE.Group();
                            almondGroup.add(this.almondPrefab.clone());
                            const aGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
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
            this.queuedHashes.delete(chunk.hash);
            const currentX = Math.floor(this.camera.position.x / (this.chunkSize * 4));
            const currentZ = Math.floor(this.camera.position.z / (this.chunkSize * 4));
            if (Math.abs(chunk.x - currentX) <= this.renderDistance && Math.abs(chunk.z - currentZ) <= this.renderDistance) {
                // Instrumentation: wall-clock per chunk build. Builds yield to
                // rAF internally, so this is elapsed time, not blocked time —
                // read it alongside the HITCH line in the debug HUD, which
                // catches the actual dropped frames.
                const genT0 = performance.now();
                await this.buildChunk(chunk.x, chunk.z, chunk.hash);
                const genMs = performance.now() - genT0;
                if (!this.genStats) this.genStats = {count: 0, totalMs: 0, worstMs: 0, lastMs: 0};
                this.genStats.count++;
                this.genStats.totalMs += genMs;
                this.genStats.lastMs = genMs;
                if (genMs > this.genStats.worstMs) this.genStats.worstMs = genMs;
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
                const tz = (zone.startZ + 1) * this.cellSize;
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
                if (obj.userData.isSlider) return;
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
                // The elevator no longer descends on touch. The case must be
                // filed first — main.js runs the Inquest and adjudicates.
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
        this.interactables = [];
        this.macroZones.clear();
        this.spatialGrid.clear();
        this.currentChunkCoords = {x: null, z: null};
        this.blackoutChunks.clear();
        this.observers = [];
        this._globalSwitches = [];
        this.pointsOfInterest = [];
        this._breakerHuntHops = this._rollHuntHops();
        // Run salt: re-rolled every generation, deliberately unseeded. POIs
        // fold this into their own local stream, so a replayed seed keeps its
        // maze but deals different anomalies. Nothing else may consume it.
        this._runSalt32 = (Math.random() * 4294967296) >>> 0;
        this._macroChunkHashes = new Set();
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
                color: 0x4a433a,
                emissive: 0x111111,
                roughness: 0.8,
                metalness: 0.3,
                bumpMap: this.structMat.map,
                bumpScale: 0.03
            });
            const dpCanvas = document.createElement('canvas');
            dpCanvas.width = dpCanvas.height = 256;
            const dpc = dpCanvas.getContext('2d');
            dpc.fillStyle = '#33343a';
            dpc.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 60; i++) {
                dpc.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
                dpc.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 30, 1 + Math.random() * 3);
            }
            for (let gy = 0; gy < 8; gy++) {
                for (let gx = 0; gx < 8; gx++) {
                    dpc.save();
                    dpc.translate(gx * 32 + 16, gy * 32 + 16);
                    dpc.rotate(((gx + gy) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4);
                    for (let k = -1; k <= 1; k++) {
                        dpc.fillStyle = '#4a4c55';
                        dpc.strokeStyle = '#22232a';
                        dpc.beginPath();
                        dpc.rect(-10, k * 9 - 2.5, 20, 5);
                        dpc.fill();
                        dpc.stroke();
                        dpc.fillStyle = 'rgba(255,255,255,0.10)';
                        dpc.fillRect(-10, k * 9 - 2.5, 20, 1.5);
                    }
                    dpc.restore();
                }
            }
            const dpTex = new THREE.CanvasTexture(dpCanvas);
            dpTex.wrapS = dpTex.wrapT = THREE.RepeatWrapping;
            dpTex.repeat.set(14, 14);
            this.diamondPlateMat = new THREE.MeshStandardMaterial({
                map: dpTex, bumpMap: dpTex, bumpScale: 0.05, metalness: 0.25, roughness: 0.75
            });
            const ccv = document.createElement('canvas');
            ccv.width = ccv.height = 256;
            const cpx = ccv.getContext('2d');
            cpx.fillStyle = '#191411';
            cpx.fillRect(0, 0, 256, 256);
            for (let py = 0; py < 4; py++) {
                for (let px = 0; px < 4; px++) {
                    const shade = 18 + Math.floor(Math.random() * 14);
                    cpx.fillStyle = `rgb(${shade + 6},${shade},${Math.max(0, shade - 4)})`;
                    cpx.fillRect(px * 64 + 1, py * 64 + 1, 62, 62);
                    cpx.fillStyle = '#0d0b09';
                    [[6, 6], [58, 6], [6, 58], [58, 58], [32, 6], [6, 32], [58, 32], [32, 58]].forEach(rv => {
                        cpx.beginPath();
                        cpx.arc(px * 64 + rv[0], py * 64 + rv[1], 2.2, 0, Math.PI * 2);
                        cpx.fill();
                    });
                    cpx.fillStyle = 'rgba(255,255,255,0.06)';
                    [[6, 6], [58, 6], [6, 58], [58, 58]].forEach(rv => {
                        cpx.beginPath();
                        cpx.arc(px * 64 + rv[0] - 0.7, py * 64 + rv[1] - 0.7, 1.0, 0, Math.PI * 2);
                        cpx.fill();
                    });
                }
            }
            cpx.strokeStyle = '#0a0908';
            cpx.lineWidth = 2;
            for (let i = 0; i <= 4; i++) {
                cpx.beginPath();
                cpx.moveTo(i * 64, 0);
                cpx.lineTo(i * 64, 256);
                cpx.stroke();
                cpx.beginPath();
                cpx.moveTo(0, i * 64);
                cpx.lineTo(256, i * 64);
                cpx.stroke();
            }
            for (let i = 0; i < 10; i++) {
                const sx = Math.random() * 256, sy = Math.random() * 256, sr = 20 + Math.random() * 45;
                const sGrad = cpx.createRadialGradient(sx, sy, 2, sx, sy, sr);
                sGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
                sGrad.addColorStop(1, 'rgba(0,0,0,0)');
                cpx.fillStyle = sGrad;
                cpx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
            }
            cpx.strokeStyle = 'rgba(220,80,20,0.5)';
            cpx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                let ex = Math.random() * 256, ey = Math.random() * 256;
                cpx.beginPath();
                cpx.moveTo(ex, ey);
                for (let s = 0; s < 5; s++) {
                    ex += (Math.random() - 0.5) * 22;
                    ey += (Math.random() - 0.5) * 22;
                    cpx.lineTo(ex, ey);
                }
                cpx.stroke();
            }
            const ceilTex = new THREE.CanvasTexture(ccv);
            ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
            ceilTex.repeat.set(7, 7);
            this.incinCeilingMat = new THREE.MeshStandardMaterial({
                map: ceilTex, bumpMap: ceilTex, bumpScale: 0.03, metalness: 0.3, roughness: 0.9
            });
            const btc = document.createElement('canvas');
            btc.width = btc.height = 256;
            const btx = btc.getContext('2d');
            btx.fillStyle = '#b3aea4';
            btx.fillRect(0, 0, 256, 256);
            for (let ty = 0; ty < 2; ty++) {
                for (let tx = 0; tx < 2; tx++) {
                    const sh = 172 + Math.floor(Math.random() * 14);
                    btx.fillStyle = `rgb(${sh},${sh - 3},${sh - 10})`;
                    btx.fillRect(tx * 128 + 2, ty * 128 + 2, 124, 124);
                }
            }
            for (let i = 0; i < 40; i++) {
                btx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
                btx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 40, 1);
            }
            btx.strokeStyle = '#8d887e';
            btx.lineWidth = 3;
            btx.strokeRect(0, 0, 256, 256);
            btx.beginPath();
            btx.moveTo(128, 0);
            btx.lineTo(128, 256);
            btx.stroke();
            btx.beginPath();
            btx.moveTo(0, 128);
            btx.lineTo(256, 128);
            btx.stroke();
            const btTex = new THREE.CanvasTexture(btc);
            btTex.wrapS = btTex.wrapT = THREE.RepeatWrapping;
            btTex.repeat.set(14, 14);
            this.boardTileMat = new THREE.MeshStandardMaterial({map: btTex, roughness: 0.35, metalness: 0.1});
            this.glassMat = new THREE.MeshStandardMaterial({
                color: 0xbfe3ef, transparent: true, opacity: 0.22,
                roughness: 0.08, metalness: 0.1, depthWrite: false
            });
            const bkc = document.createElement('canvas');
            bkc.width = 256;
            bkc.height = 128;
            const bkx = bkc.getContext('2d');
            bkx.fillStyle = '#17130f';
            bkx.fillRect(0, 0, 256, 128);
            const spinePalette = ['#6b3a34', '#3e4a63', '#5a5e46', '#7a6748', '#54504e', '#463b52', '#70543a', '#33413e'];
            let spineX = 0;
            while (spineX < 252) {
                const sw = 6 + Math.floor(Math.random() * 9);
                if (Math.random() > 0.08) {
                    const sh = 96 + Math.floor(Math.random() * 28);
                    bkx.fillStyle = spinePalette[Math.floor(Math.random() * spinePalette.length)];
                    bkx.fillRect(spineX, 128 - sh, sw, sh);
                    bkx.fillStyle = 'rgba(255,255,255,0.08)';
                    bkx.fillRect(spineX, 128 - sh, 1, sh);
                    bkx.fillStyle = 'rgba(0,0,0,0.35)';
                    bkx.fillRect(spineX + sw - 1, 128 - sh, 1, sh);
                    if (Math.random() > 0.5) {
                        bkx.fillStyle = 'rgba(210,190,140,0.35)';
                        bkx.fillRect(spineX + 1, 128 - sh + 8 + Math.floor(Math.random() * 20), sw - 2, 2);
                    }
                }
                spineX += sw + 1;
            }
            const bkTex = new THREE.CanvasTexture(bkc);
            bkTex.wrapS = bkTex.wrapT = THREE.RepeatWrapping;
            bkTex.repeat.set(3, 1);
            this.bookRowMat = new THREE.MeshStandardMaterial({map: bkTex, roughness: 0.9, metalness: 0.0});
            const fbc = document.createElement('canvas');
            fbc.width = fbc.height = 128;
            const fbx = fbc.getContext('2d');
            fbx.fillStyle = '#b59a6d';
            fbx.fillRect(0, 0, 128, 128);
            fbx.fillStyle = 'rgba(0,0,0,0.12)';
            fbx.fillRect(0, 0, 128, 8);
            fbx.fillRect(0, 56, 128, 6);
            fbx.fillStyle = '#e8e2d2';
            fbx.fillRect(38, 72, 52, 26);
            fbx.strokeStyle = '#8a7a55';
            fbx.strokeRect(38, 72, 52, 26);
            fbx.fillStyle = 'rgba(60,50,30,0.5)';
            fbx.fillRect(44, 80, 40, 2);
            fbx.fillRect(44, 86, 28, 2);
            const fbTex = new THREE.CanvasTexture(fbc);
            this.fileBoxMat = new THREE.MeshStandardMaterial({map: fbTex, roughness: 0.85, metalness: 0.0});
            const mvc = document.createElement('canvas');
            mvc.width = mvc.height = 128;
            const mvx = mvc.getContext('2d');
            mvx.fillStyle = '#a97e52';
            mvx.fillRect(0, 0, 128, 128);
            mvx.fillStyle = 'rgba(0,0,0,0.10)';
            mvx.fillRect(0, 118, 128, 10);
            mvx.fillRect(0, 0, 4, 128);
            mvx.fillRect(124, 0, 4, 128);
            mvx.fillStyle = 'rgba(196,178,142,0.85)';
            mvx.fillRect(0, 18, 128, 14);
            mvx.fillStyle = 'rgba(0,0,0,0.18)';
            mvx.fillRect(0, 24, 128, 2);
            mvx.strokeStyle = '#2a2118';
            mvx.lineWidth = 3;
            mvx.beginPath();
            mvx.moveTo(24, 76);
            mvx.lineTo(52, 72);
            mvx.lineTo(78, 78);
            mvx.lineTo(102, 74);
            mvx.stroke();
            mvx.lineWidth = 2;
            mvx.beginPath();
            mvx.moveTo(30, 92);
            mvx.lineTo(66, 90);
            mvx.lineTo(88, 94);
            mvx.stroke();
            mvx.fillStyle = '#2a2118';
            mvx.beginPath();
            mvx.moveTo(112, 52);
            mvx.lineTo(106, 62);
            mvx.lineTo(118, 62);
            mvx.closePath();
            mvx.fill();
            mvx.fillRect(110, 62, 4, 10);
            const mvTex = new THREE.CanvasTexture(mvc);
            this.movingBoxMat = new THREE.MeshStandardMaterial({map: mvTex, roughness: 0.85, metalness: 0.0});
            const bnc = document.createElement('canvas');
            bnc.width = bnc.height = 128;
            const bnx = bnc.getContext('2d');
            bnx.fillStyle = '#b08d5a';
            bnx.fillRect(0, 0, 128, 128);
            bnx.fillStyle = 'rgba(0,0,0,0.12)';
            bnx.fillRect(0, 0, 128, 6);
            bnx.fillRect(0, 122, 128, 6);
            bnx.fillStyle = '#241a10';
            bnx.fillRect(44, 12, 40, 13);
            bnx.fillStyle = '#1c4f8f';
            bnx.beginPath();
            bnx.ellipse(64, 74, 40, 26, 0, 0, Math.PI * 2);
            bnx.fill();
            bnx.fillStyle = '#f7d64a';
            bnx.beginPath();
            bnx.ellipse(64, 74, 29, 17, 0, 0, Math.PI * 2);
            bnx.fill();
            bnx.strokeStyle = '#1c4f8f';
            bnx.lineWidth = 3;
            bnx.beginPath();
            bnx.moveTo(48, 78);
            bnx.quadraticCurveTo(64, 62, 80, 78);
            bnx.stroke();
            const bnTex = new THREE.CanvasTexture(bnc);
            this.bananaBoxMat = new THREE.MeshStandardMaterial({map: bnTex, roughness: 0.85, metalness: 0.0});
            const pcc = document.createElement('canvas');
            pcc.width = pcc.height = 128;
            const pcx2 = pcc.getContext('2d');
            pcx2.fillStyle = '#8f6a42';
            pcx2.fillRect(0, 0, 128, 128);
            pcx2.fillStyle = '#2b2b2e';
            pcx2.fillRect(0, 16, 128, 16);
            pcx2.strokeStyle = '#e8e8ea';
            pcx2.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                pcx2.beginPath();
                pcx2.moveTo(8 + i * 16, 20);
                pcx2.lineTo(14 + i * 16, 24);
                pcx2.lineTo(8 + i * 16, 28);
                pcx2.stroke();
            }
            pcx2.fillStyle = '#efece4';
            pcx2.fillRect(30, 56, 68, 48);
            pcx2.fillStyle = 'rgba(40,40,40,0.6)';
            pcx2.fillRect(36, 62, 44, 2);
            pcx2.fillRect(36, 68, 30, 2);
            pcx2.fillStyle = '#1a1a1a';
            let barX = 36;
            while (barX < 90) {
                const bw = 1 + Math.floor(Math.random() * 3);
                pcx2.fillRect(barX, 84, bw, 14);
                barX += bw + 1 + Math.floor(Math.random() * 3);
            }
            pcx2.strokeStyle = '#c8771f';
            pcx2.lineWidth = 3;
            pcx2.beginPath();
            pcx2.moveTo(40, 44);
            pcx2.quadraticCurveTo(64, 54, 88, 44);
            pcx2.stroke();
            pcx2.fillStyle = '#c8771f';
            pcx2.beginPath();
            pcx2.moveTo(88, 38);
            pcx2.lineTo(94, 45);
            pcx2.lineTo(85, 48);
            pcx2.closePath();
            pcx2.fill();
            const pcTex = new THREE.CanvasTexture(pcc);
            this.parcelBoxMat = new THREE.MeshStandardMaterial({map: pcTex, roughness: 0.85, metalness: 0.0});
            this.cartonMats = [this.fileBoxMat, this.movingBoxMat, this.bananaBoxMat, this.parcelBoxMat];
            const flc = document.createElement('canvas');
            flc.width = flc.height = 128;
            const flx = flc.getContext('2d');
            flx.fillStyle = '#2c3d24';
            flx.fillRect(0, 0, 128, 128);
            const leafShades = ['#3a5230', '#243620', '#4a6238', '#31452a', '#556b3e'];
            for (let i = 0; i < 260; i++) {
                flx.fillStyle = leafShades[Math.floor(Math.random() * leafShades.length)];
                flx.beginPath();
                flx.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 7, 0, Math.PI * 2);
                flx.fill();
            }
            flx.fillStyle = 'rgba(0,0,0,0.18)';
            for (let i = 0; i < 40; i++) {
                flx.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 10, 1 + Math.random() * 3);
            }
            const flTex = new THREE.CanvasTexture(flc);
            flTex.wrapS = flTex.wrapT = THREE.RepeatWrapping;
            this.foliageMat = new THREE.MeshStandardMaterial({map: flTex, roughness: 0.95, metalness: 0.0});
            const fvc = document.createElement('canvas');
            fvc.width = 256;
            fvc.height = 128;
            const fvx = fvc.getContext('2d');
            const fvGrad = fvx.createLinearGradient(0, 0, 0, 128);
            fvGrad.addColorStop(0, '#000000');
            fvGrad.addColorStop(0.55, '#020402');
            fvGrad.addColorStop(1, '#060c05');
            fvx.fillStyle = fvGrad;
            fvx.fillRect(0, 0, 256, 128);
            const fvRows = [
                {c: '#0a120a', n: 90, hMin: 18, hMax: 34},
                {c: '#0e1a0b', n: 55, hMin: 30, hMax: 52},
                {c: '#132410', n: 32, hMin: 46, hMax: 74}
            ];
            for (let ri = 0; ri < fvRows.length; ri++) {
                const row = fvRows[ri];
                fvx.strokeStyle = row.c;
                for (let i = 0; i < row.n; i++) {
                    const sx0 = Math.random() * 256;
                    const sh = row.hMin + Math.random() * (row.hMax - row.hMin);
                    fvx.lineWidth = 1 + Math.random() * 2;
                    fvx.beginPath();
                    fvx.moveTo(sx0, 128);
                    fvx.lineTo(sx0 + (Math.random() - 0.5) * 6, 128 - sh);
                    fvx.stroke();
                }
            }
            const fvTex = new THREE.CanvasTexture(fvc);
            fvTex.wrapS = fvTex.wrapT = THREE.RepeatWrapping;
            this.farVoidMat = new THREE.MeshBasicMaterial({map: fvTex});
            this.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
            this.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
            this.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            this.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
            this.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
            this.wallVentMat = this.ventMat.clone();
            this.wallVentMat.map = this.ventMat.map.clone();
            this.wallVentMat.map.repeat.set(1, 1);
            this.serverFloorMat = this.ventMat.clone();
            this.serverFloorMat.map = this.ventMat.map.clone();
            this.serverFloorMat.map.repeat.set(64, 32);
            this.breakerBaseGeo = new THREE.BoxGeometry(0.6, 0.8, 0.20);
            this.breakerDoorGeo = new THREE.BoxGeometry(0.6, 0.8, 0.05);
            this.breakerDoorGeo.translate(0.3, 0, 0);
            this.crtScreenMat = new THREE.MeshStandardMaterial({
                color: 0xffb000,
                emissive: 0xffb000,
                emissiveIntensity: 0.8,
                roughness: 0.2
            });
            this.documentMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.0
            });
            this.terminalBodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
            this.documentGeo = new THREE.PlaneGeometry(0.2, 0.3);
            this.documentGeo.rotateX(-Math.PI / 2);
            this.geoCache = new Map();
            this.almondPrefab = new THREE.Group();
            const aBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16);
            const aNeckGeo = new THREE.CylinderGeometry(0.012, 0.035, 0.05, 16);
            const aCapGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.015, 12);
            const aBody = new THREE.Mesh(aBodyGeo, this.almondMat);
            aBody.position.y = 0.06;
            const aNeck = new THREE.Mesh(aNeckGeo, this.clinicMat);
            aNeck.position.y = 0.12 + 0.025;
            const aCap = new THREE.Mesh(aCapGeo, this.metalMat);
            aCap.position.y = 0.12 + 0.05 + 0.0075;
            this.almondPrefab.add(aBody, aNeck, aCap);
            this.batteryPrefab = new THREE.Group();
            const bBodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16);
            const bRimGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.015, 16);
            const bTermGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12);
            const bBody = new THREE.Mesh(bBodyGeo, this.hazardMat);
            bBody.position.y = 0.08;
            const bTopRim = new THREE.Mesh(bRimGeo, this.metalMat);
            bTopRim.position.y = 0.16 - 0.0075;
            const bBotRim = new THREE.Mesh(bRimGeo, this.metalMat);
            bBotRim.position.y = 0.0075;
            const bTerm = new THREE.Mesh(bTermGeo, this.metalMat);
            bTerm.position.y = 0.16 + 0.01;
            this.batteryPrefab.add(bBody, bTopRim, bBotRim, bTerm);
            this.observerMat = new THREE.MeshBasicMaterial({color: 0x010101, transparent: true, opacity: 0.85});
            this.observerGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.9, 8);
            this.observers = [];
            this.sharedAssets = new Set();
            Object.values(this).forEach(v => {
                if (v && v.isGeometry) this.sharedAssets.add(v.uuid);
                if (v && v.isMaterial) this.sharedAssets.add(v.uuid);
            });
        }
    }
    // Zone-builder geometry cache: identical shapes share one geometry so
    // _compileInstances can batch them by uuid instead of drawing solos.
    // Keys are exact dims (all deterministic), so the cache stays bounded.
    _cacheGeo(key, make) {
        let geo = this.geoCache.get(key);
        if (!geo) {
            geo = make();
            this.geoCache.set(key, geo);
            this.geoCache.set(geo.uuid, true);
        }
        return geo;
    }
    _boxGeo(w, h, d) {
        return this._cacheGeo(`B:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
    }
    _planeGeo(w, h) {
        return this._cacheGeo(`P:${w}:${h}`, () => new THREE.PlaneGeometry(w, h));
    }
    _createChunkHelpers(hash, chunkGroup, stagingMeshes, random) {
        let hasOasis = random() > 0.95;
        const helpers = {
            random,
            runSalt32: this._runSalt32 || 0,
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
            getLightMaterial: (colorHex, emissiveHex, isBroken = false) => {
                if (!this._lightMatPool) this._lightMatPool = new Map();
                const key = `${colorHex}_${emissiveHex}_${isBroken}`;
                if (!this._lightMatPool.has(key)) {
                    const mat = (isBroken ? this.baseBrokenLightMat : this.baseLightMat).clone();
                    mat.color.setHex(colorHex);
                    mat.emissive.setHex(emissiveHex);
                    this.sharedAssets.add(mat.uuid);
                    this._lightMatPool.set(key, mat);
                }
                return this._lightMatPool.get(key);
            },
            buildWall: (w, d, mat, h = 3.0, yOffset = 0) => {
                w = Math.round(w * 20) / 20;
                d = Math.round(d * 20) / 20;
                h = Math.round(h * 20) / 20;
                yOffset = Math.round(yOffset * 20) / 20;
                const key = `${w}_${h}_${d}_${yOffset}`;
                let geo = this.geoCache.get(key);
                if (!geo) {
                    geo = new THREE.BoxGeometry(w + 0.02, h, d + 0.02);
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
                return new THREE.Mesh(geo, mat);
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
                const box = new THREE.Box3().setFromObject(group);
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
                const obs = new THREE.Mesh(this.observerGeo, this.observerMat.clone());
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
                const grateGeo = this._boxGeo(blocksX ? 0.05 : 1.16, 0.65, blocksX ? 1.16 : 0.05);
                const grate = new THREE.Mesh(grateGeo, this.wallVentMat);
                grate.position.set(px, py, pz);
                grate.userData = {type: 'grate', active: true, chunkHash: hash, blocksX: blocksX};
                chunkGroup.add(grate);
                this.interactables.push(grate);
                const grateBox = new THREE.Box3().setFromObject(grate);
                grateBox.chunkHash = hash;
                grateBox.isGrate = true;
                grateBox.meshRef = grate;
                grate.userData.box = grateBox;
                this.spatialGrid.insert(grateBox);
            },
            buildChair: (x, y, z, rotY) => {
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
            },
            buildTable: (x, y, z) => {
                const group = new THREE.Group();
                const top = new THREE.Mesh(this.tableTopGeo, this.woodMat);
                top.position.set(0, 0.8, 0);
                group.add(top);
                const base = new THREE.Mesh(this.tableBaseGeo, this.structMat);
                base.position.set(0, 0.4, 0);
                group.add(base);
                group.position.set(x, y, z);
                return group;
            },
            buildPerimeter: (x, z, localX, localZ, inDir, outDir, wallMat, sectorId) => {
                const isPerimeter = localX === 0 || localX === this.chunkSize - 1 || localZ === 0 || localZ === this.chunkSize - 1;
                if (!isPerimeter) return false;
                if (sectorId && helpers.markOccupied) helpers.markOccupied(x, z);
                const edge = this.chunkSize - 1;
                const isDoorwayNS = localX === 7 && (localZ === 0 || localZ === edge);
                const isDoorwayEW = localZ === 7 && (localX === 0 || localX === edge);
                const isDoorway = isDoorwayNS || isDoorwayEW;
                if (!isDoorway) {
                    const key = `${this.cellSize}_3.0_${this.cellSize}_0`;
                    let geo = this.geoCache.get(key);
                    if (!geo) {
                        geo = new THREE.BoxGeometry(this.cellSize + 0.02, 3.0, this.cellSize + 0.02);
                        this.geoCache.set(key, geo);
                        this.geoCache.set(geo.uuid, true);
                    }
                    const wall = new THREE.Mesh(geo, wallMat || this.sharedWallMat);
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
        return helpers;
    }

    // ── THE MAN DOOR + CHECKPOINT SIDE ROOMS ─────────────────────────
    // Carves a storage/surprise pocket into the checkpoint's solid fill.
    // The pocket's three non-door faces back onto neighbouring solid
    // blocks (the caller guarantees this), so we only build the fourth
    // wall — the one facing the corridor arm — with a gray steel fire
    // door (the "man door") set into it. All randomness is a pure hash
    // of the cell (ckHash) so the PRNG stream for the rest of the chunk
    // is untouched: every non-room cell renders exactly as before.
    _buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx) {
        const {buildWall, addGeometry, chunkGroup, hash} = ctx;
        const cs = this.cellSize;
        const cx0 = x * cs, cz0 = z * cs;
        // direction from the room toward the corridor arm (door faces this way)
        const dir = flankV ? (localX === 6 ? 1 : -1) : (localZ === 6 ? 1 : -1);
        const bx = cx0 + (flankV ? dir * (cs / 2) : 0);   // door-wall boundary
        const bz = cz0 + (flankV ? 0 : dir * (cs / 2));
        const doorW = 1.4, doorT = 0.1;
        const frameMat = this.annexFrameMat || this.metalMat;
        const leafMat = this.annexDoorMat || this.doorMat;

        // ── the door wall: two solid stubs, a steel frame, a hazard lintel ──
        if (flankV) {
            for (let s = -1; s <= 1; s += 2) {
                const stub = buildWall(0.25, 1.2, this.structMat);
                stub.position.set(bx, 1.5, cz0 + s * 1.4);
                stub.userData.isEntityBlocker = true;
                addGeometry(stub);
            }
            const header = buildWall(0.25, 1.6, frameMat, 0.35);
            header.position.set(bx, 2.825, cz0);
            addGeometry(header);
            for (let s = -1; s <= 1; s += 2) {
                const jamb = new THREE.Mesh(this._boxGeo(0.3, 2.65, 0.1), frameMat);
                jamb.position.set(bx, 1.325, cz0 + s * 0.75);
                addGeometry(jamb);
            }
            const mark = new THREE.Mesh(this._boxGeo(0.04, 0.14, 1.5), this.hazardMat);
            mark.position.set(bx + dir * 0.15, 2.5, cz0);
            addGeometry(mark);
        } else {
            for (let s = -1; s <= 1; s += 2) {
                const stub = buildWall(1.2, 0.25, this.structMat);
                stub.position.set(cx0 + s * 1.4, 1.5, bz);
                stub.userData.isEntityBlocker = true;
                addGeometry(stub);
            }
            const header = buildWall(1.6, 0.25, frameMat, 0.35);
            header.position.set(cx0, 2.825, bz);
            addGeometry(header);
            for (let s = -1; s <= 1; s += 2) {
                const jamb = new THREE.Mesh(this._boxGeo(0.1, 2.65, 0.3), frameMat);
                jamb.position.set(cx0 + s * 0.75, 1.325, bz);
                addGeometry(jamb);
            }
            const mark = new THREE.Mesh(this._boxGeo(1.5, 0.14, 0.04), this.hazardMat);
            mark.position.set(cx0, 2.5, bz + dir * 0.15);
            addGeometry(mark);
        }

        // ── the man door leaf (gray steel, hinged, interactive) ──
        let doorMesh;
        if (flankV) {
            const g = this._cacheGeo('hingedDoor:Z', () => {
                const gg = new THREE.BoxGeometry(doorT, 2.65, doorW);
                gg.translate(doorT / 2, 0, doorW / 2);
                return gg;
            });
            doorMesh = new THREE.Mesh(g, leafMat);
            doorMesh.position.set(bx, 1.325, cz0 - doorW / 2);
            doorMesh.userData = {chunkHash: hash, closedRot: -Math.PI / 2, currentRot: -Math.PI / 2};
        } else {
            const g = this._cacheGeo('hingedDoor:X', () => {
                const gg = new THREE.BoxGeometry(doorW, 2.65, doorT);
                gg.translate(doorW / 2, 0, doorT / 2);
                return gg;
            });
            doorMesh = new THREE.Mesh(g, leafMat);
            doorMesh.position.set(cx0 - doorW / 2, 1.325, bz);
            doorMesh.userData = {chunkHash: hash, closedRot: 0, currentRot: 0};
        }
        doorMesh.castShadow = doorMesh.receiveShadow = true;
        chunkGroup.add(doorMesh);
        this.interactiveDoors.push(doorMesh);
        this.walls.push(doorMesh);
        doorMesh.updateMatrixWorld();
        const dBox = new THREE.Box3().setFromObject(doorMesh);
        dBox.chunkHash = hash;
        doorMesh.userData.box = dBox;
        this.spatialGrid.insert(dBox);

        // ── interior anchor frame (nx/nz points at the back wall) ──
        const nx = flankV ? -dir : 0, nz = flankV ? 0 : -dir;   // toward back wall
        const tx = flankV ? 0 : 1, tz = flankV ? 1 : 0;         // lateral axis
        const at = (fwd, lat) => [cx0 + nx * fwd + tx * lat, cz0 + nz * fwd + tz * lat];
        const place = (mesh, px, py, pz) => { mesh.position.set(px, py, pz); addGeometry(mesh); };
        const cartonGeo = this._cacheGeo('ckRoomCarton', () => new THREE.BoxGeometry(0.5, 0.42, 0.5));
        const cartons = this.cartonMats || [this.fileBoxMat];
        const carton = (fwd, lat, y) => {
            const [px, pz] = at(fwd, lat);
            const m = new THREE.Mesh(cartonGeo, cartons[Math.floor(ckHash(localX + fwd, localZ + lat, 9) * cartons.length)]);
            place(m, px, y, pz);
        };

        const roll = ckHash(localX, localZ, 7);
        let lit = true;
        if (roll < 0.45) {
            // ── STORAGE: a steel shelf unit against the back wall ──
            for (const sy of [0.45, 1.15, 1.85, 2.5]) {
                const shelf = new THREE.Mesh(this._boxGeo(flankV ? 0.5 : 2.6, 0.05, flankV ? 2.6 : 0.5), this.metalMat);
                const [px, pz] = at(1.55, 0);
                place(shelf, px, sy, pz);
            }
            for (let p = -1; p <= 1; p += 2) {
                const post = new THREE.Mesh(this._boxGeo(0.06, 2.6, 0.06), this.metalMat);
                const [px, pz] = at(1.55, p * 1.1);
                place(post, px, 1.3, pz);
            }
            const spots = [[1.55, -0.9, 0.7], [1.55, 0.0, 0.7], [1.55, 0.9, 0.7], [1.55, -0.5, 1.4], [1.55, 0.6, 1.4], [1.0, 1.0, 0.37]];
            for (const [f, l, y] of spots) if (ckHash(localX + l * 3, localZ + f * 3, 4) > 0.25) carton(f, l, y);
        } else if (roll < 0.70) {
            // ── OVERFLOW: pallet, stacked cartons, a lone drum ──
            const [px, pz] = at(1.3, -0.6);
            const pallet = new THREE.Mesh(this._boxGeo(1.2, 0.12, 1.2), this.woodMat);
            place(pallet, px, 0.06, pz);
            for (let c = 0; c < 3; c++) for (let s = 0; s < 1 + Math.floor(ckHash(localX + c, localZ, c + 1) * 3); s++)
                carton(1.3 + (c - 1) * 0.0, -0.6 + (c - 1) * 0.45, 0.3 + s * 0.44);
            const drumGeo = this._cacheGeo('ckRoomDrum', () => new THREE.CylinderGeometry(0.29, 0.29, 0.92, 10));
            const drum = new THREE.Mesh(drumGeo, this.rustMat);
            const [dx, dz] = at(1.4, 1.1);
            place(drum, dx, 0.46, dz);
        } else if (roll < 0.87) {
            // ── SUPPLY CACHE: a genuine reward — battery + almond water ──
            const [tx0, tz0] = at(1.4, 0);
            const tableTop = new THREE.Mesh(this._boxGeo(flankV ? 0.7 : 1.4, 0.06, flankV ? 1.4 : 0.7), this.metalMat);
            place(tableTop, tx0, 0.78, tz0);
            for (let lxs = -1; lxs <= 1; lxs += 2) for (let lzs = -1; lzs <= 1; lzs += 2) {
                const leg = new THREE.Mesh(this._boxGeo(0.05, 0.78, 0.05), this.metalMat);
                place(leg, tx0 + lxs * (flankV ? 0.28 : 0.6), 0.39, tz0 + lzs * (flankV ? 0.6 : 0.28));
            }
            if (!this.interactables) this.interactables = [];
            const drop = (prefab, type, fwd, lat) => {
                const [px, pz] = at(fwd, lat);
                const grp = new THREE.Group();
                grp.add(prefab.clone());
                const glow = new THREE.Mesh(this.glowGeo, this.glowMat);
                glow.scale.set(0.15, 0.15, 0.15);
                glow.position.y = 0.01;
                grp.add(glow);
                grp.position.set(px, 0.85, pz);
                grp.userData = {type, chunkHash: hash, active: true};
                grp.traverse(ch => { ch.userData.chunkHash = hash; });
                chunkGroup.add(grp);
                this.interactables.push(grp);
            };
            drop(this.batteryPrefab, 'battery', 1.4, -0.3);
            if (ckHash(localX, localZ, 2) > 0.4) drop(this.almondPrefab, 'almond', 1.4, 0.3);
        } else {
            // ── SURPRISE: a lone chair facing the dark back wall, no light ──
            lit = false;
            const [sx, sz] = at(1.3, (ckHash(localX, localZ, 6) - 0.5) * 1.2);
            const seat = new THREE.Mesh(this._boxGeo(0.45, 0.06, 0.45), this.structMat);
            place(seat, sx, 0.45, sz);
            const back = new THREE.Mesh(this._boxGeo(flankV ? 0.06 : 0.45, 0.5, flankV ? 0.45 : 0.06), this.structMat);
            place(back, sx + nx * 0.2, 0.72, sz + nz * 0.2);
            for (let lxs = -1; lxs <= 1; lxs += 2) for (let lzs = -1; lzs <= 1; lzs += 2) {
                const leg = new THREE.Mesh(this._boxGeo(0.05, 0.45, 0.05), this.metalMat);
                place(leg, sx + lxs * 0.18, 0.22, sz + lzs * 0.18);
            }
        }

        // ── ceiling light (dark rooms stay dark) ──
        if (lit) {
            const activeMat = this.baseLightMat.clone();
            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
            panel.position.set(cx0, 2.98, cz0);
            chunkGroup.add(panel);
            this.walls.push(panel);
            this.fixtureData.push({
                chunkHash: hash,
                position: new THREE.Vector3(cx0, 2.8, cz0),
                flickerOffset: ckHash(localX, localZ, 5) * 500,
                material: activeMat,
                isFaulty: ckHash(localX, localZ, 8) > 0.75,
                baseIntensity: 0.6,
                targetIntensity: 0.6,
                currentIntensity: 0.6
            });
        }
    }

    // ── THE CHECKPOINT CORE: a giant column of monitors + cables ─────
    // Replaces the old squeeze-partition at the arms' crossing with a
    // floor-to-ceiling equipment stack: a monitor wall on all four faces,
    // a cable trunk feeding the ceiling, and coils pooled at the base.
    // The 1.3u core carries collision (entity blocker); ~1.35u of walkable
    // margin stays open on every side, so it still reads as the bottleneck.
    // Deterministic (pure hash of the chunk) — no PRNG draws.
    _buildCheckpointColumn(x, z, hash, ctx) {
        const {addGeometry, stagingMeshes} = ctx;
        const cs = this.cellSize;
        const cx = x * cs, cz = z * cs;
        const decor = (m) => { m.userData.chunkHash = hash; m.updateMatrixWorld(true); stagingMeshes.push(m); };
        const sHash = (i) => {
            let h = (hash ^ Math.imul(i + 1, 2654435761)) >>> 0;
            h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
            return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
        };
        if (!this.laptopScreenMat) {
            this.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
            this.sharedAssets.add(this.laptopScreenMat.uuid);
        }

        // core equipment column — collision + entity blocker, floor to ceiling
        const coreW = 1.3;
        const core = new THREE.Mesh(this._boxGeo(coreW, 3.0, coreW), this.baseHousingMat);
        core.position.set(cx, 1.5, cz);
        core.userData.isEntityBlocker = true;
        addGeometry(core);
        const plinth = new THREE.Mesh(this._boxGeo(1.5, 0.3, 1.5), this.metalMat);
        plinth.position.set(cx, 0.15, cz);
        decor(plinth);
        const cap = new THREE.Mesh(this._boxGeo(1.5, 0.2, 1.5), this.metalMat);
        cap.position.set(cx, 2.9, cz);
        decor(cap);

        // monitor wall — a grid of screens (some live, most dead) on 4 faces
        const faces = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const rows = [0.8, 1.4, 2.0, 2.55];
        const colsOff = [-0.32, 0.32];
        let idx = 0;
        for (const [nx, nz] of faces) {
            const onZ = nz !== 0;
            for (const ry of rows) {
                for (const co of colsOff) {
                    idx++;
                    const live = sHash(idx) > 0.55;
                    const px = cx + (onZ ? co : nx * (coreW / 2 + 0.05));
                    const pz = cz + (onZ ? nz * (coreW / 2 + 0.05) : co);
                    const bezel = new THREE.Mesh(
                        onZ ? this._boxGeo(0.58, 0.5, 0.04) : this._boxGeo(0.04, 0.5, 0.58),
                        this.baseHousingMat);
                    bezel.position.set(
                        cx + (onZ ? co : nx * (coreW / 2 + 0.02)),
                        ry,
                        cz + (onZ ? nz * (coreW / 2 + 0.02) : co));
                    decor(bezel);
                    const screen = new THREE.Mesh(
                        onZ ? this._boxGeo(0.5, 0.42, 0.03) : this._boxGeo(0.03, 0.42, 0.5),
                        live ? this.laptopScreenMat : this.crtScreenMat);
                    screen.position.set(px, ry, pz);
                    decor(screen);
                }
            }
        }

        // cable trunk climbing one corner into the ceiling
        const trunk = new THREE.Mesh(this._boxGeo(0.22, 3.2, 0.22), this.metalMat);
        trunk.position.set(cx + 0.55, 1.6, cz + 0.55);
        decor(trunk);

        // loose cables draping from the ceiling down the column
        const cableGeo = this._cacheGeo('ckColCable', () => new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6));
        for (let i = 0; i < 6; i++) {
            const len = 1.2 + sHash(100 + i) * 1.6;
            const ang = (i / 6) * Math.PI * 2;
            const r = coreW / 2 + 0.14 + sHash(200 + i) * 0.1;
            const cable = new THREE.Mesh(cableGeo, i % 2 ? this.rustMat : this.metalMat);
            cable.position.set(cx + Math.cos(ang) * r, 3.0 - len / 2, cz + Math.sin(ang) * r);
            cable.scale.y = len;
            decor(cable);
        }

        // cable coils pooled at the base
        const loopGeo = this._cacheGeo('ckColLoop', () => new THREE.TorusGeometry(0.4, 0.04, 6, 12));
        for (let i = 0; i < 3; i++) {
            const loop = new THREE.Mesh(loopGeo, this.rustMat);
            loop.position.set(cx + (sHash(300 + i) - 0.5) * 0.7, 0.34 + i * 0.05, cz + (sHash(310 + i) - 0.5) * 0.7);
            loop.rotation.x = Math.PI / 2;
            decor(loop);
        }
    }

    // ── IMPOUND YARD ITEMS: the big stuff in the pens ────────────────
    // Procedural impounded property — cars (some up on blocks), skid-
    // mounted machinery, and stacked tires — assembled from boxes and
    // cylinders on shared materials. Placed as a group via addFurniture
    // so it gets one collision box and skips if it would foul a fence.
    // Returns true once an attempt is made (placement may still be
    // culled by the overlap guard, which is fine — it just leaves a gap).
    _buildImpoundItem(px, pz, kind, ctx) {
        const {addFurniture, chunkGroup, hash, random} = ctx;
        if (!this._impPaintMats) {
            const mk = (c) => {
                const m = new THREE.MeshStandardMaterial({color: c, roughness: 0.72, metalness: 0.25});
                this.sharedAssets.add(m.uuid);
                return m;
            };
            this._impPaintMats = [mk(0x7a2f28), mk(0x2f4a63), mk(0x8f9295), mk(0x3d523c), mk(0x9a8352), mk(0x6a3d2a)];
        }
        if (!this._impTireMat) {
            this._impTireMat = new THREE.MeshStandardMaterial({color: 0x161618, roughness: 0.95, metalness: 0.0});
            this.sharedAssets.add(this._impTireMat.uuid);
        }
        const glass = this.glassMat || this.crtScreenMat;
        const wheelGeo = this._cacheGeo('impWheel', () => new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14));
        const g = new THREE.Group();

        if (kind === 'car') {
            const paint = this._impPaintMats[Math.floor(random() * this._impPaintMats.length)];
            const along = random() > 0.5;
            const L = 3.4, W = 1.7;
            const lx = along ? L : W, lz = along ? W : L;
            const body = new THREE.Mesh(this._boxGeo(lx, 0.62, lz), paint);
            body.position.y = 0.6;
            const cabin = new THREE.Mesh(this._boxGeo(along ? L * 0.52 : W * 0.86, 0.56, along ? W * 0.86 : L * 0.52), paint);
            cabin.position.y = 1.12;
            const win = new THREE.Mesh(this._boxGeo(along ? L * 0.5 : W * 0.9, 0.42, along ? W * 0.9 : L * 0.5), glass);
            win.position.y = 1.13;
            g.add(body, win, cabin);
            const onBlocks = random() > 0.7;
            const halfL = (along ? L : W) / 2 - 0.5, halfW = (along ? W : L) / 2;
            for (const sl of [-1, 1]) for (const sw of [-1, 1]) {
                const wx = along ? sl * halfL : sw * halfW;
                const wz = along ? sw * halfW : sl * halfL;
                if (onBlocks && sl < 0) {
                    const blk = new THREE.Mesh(this._boxGeo(0.42, 0.3, 0.42), this.structMat);
                    blk.position.set(wx, 0.15, wz);
                    g.add(blk);
                } else {
                    const wheel = new THREE.Mesh(wheelGeo, this._impTireMat);
                    wheel.position.set(wx, 0.36, wz);
                    if (along) wheel.rotation.x = Math.PI / 2; else wheel.rotation.z = Math.PI / 2;
                    g.add(wheel);
                }
            }
            g.position.set(px + (random() - 0.5) * 0.4, 0, pz + (random() - 0.5) * 0.4);
            g.rotation.y = (random() - 0.5) * 0.3;
            addFurniture(g);
            // impound tag on the hood — keeps the case-file document flowing
            if (random() > 0.4) {
                const tag = new THREE.Mesh(this.documentGeo, this.documentMat);
                tag.position.set(g.position.x, 1.02, g.position.z);
                tag.rotation.y = random() * Math.PI;
                tag.userData = {type: 'document', chunkHash: hash, active: true, zone: 'IMPOUND', docId: 'TAG_' + Math.floor(random() * 9999)};
                chunkGroup.add(tag);
                if (!this.interactables) this.interactables = [];
                this.interactables.push(tag);
                const tBox = new THREE.Box3().setFromObject(tag);
                tBox.chunkHash = hash;
                tag.userData.box = tBox;
                this.spatialGrid.insert(tBox);
            }
            return true;
        }

        if (kind === 'machine') {
            const skid = new THREE.Mesh(this._boxGeo(1.7, 0.16, 1.1), this.rustMat);
            skid.position.y = 0.08;
            const bodyM = new THREE.Mesh(this._boxGeo(1.4, 0.85, 0.9), this.metalMat);
            bodyM.position.y = 0.6;
            const tank = new THREE.Mesh(this._cacheGeo('impTank', () => new THREE.CylinderGeometry(0.34, 0.34, 1.3, 14)), this.metalMat);
            tank.rotation.z = Math.PI / 2;
            tank.position.set(0.05, 1.15, 0);
            const pipe = new THREE.Mesh(this._cacheGeo('impExhaust', () => new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8)), this.rustMat);
            pipe.position.set(-0.6, 1.25, 0.32);
            const ctrl = new THREE.Mesh(this._boxGeo(0.5, 0.45, 0.07), this.hazardMat);
            ctrl.position.set(0, 0.72, 0.5);
            g.add(skid, bodyM, tank, pipe, ctrl);
            g.position.set(px + (random() - 0.5) * 0.5, 0, pz + (random() - 0.5) * 0.5);
            g.rotation.y = random() * Math.PI * 2;
            addFurniture(g);
            return true;
        }

        // kind === 'tires'
        const tGeo = this._cacheGeo('impTireStack', () => new THREE.CylinderGeometry(0.42, 0.42, 0.24, 16));
        const n = 3 + Math.floor(random() * 4);
        const bx = (random() - 0.5) * 1.2, bz = (random() - 0.5) * 1.2;
        for (let i = 0; i < n; i++) {
            const t = new THREE.Mesh(tGeo, this._impTireMat);
            t.position.set(bx + (random() - 0.5) * 0.06, 0.13 + i * 0.24, bz + (random() - 0.5) * 0.06);
            t.rotation.y = random() * Math.PI;
            g.add(t);
        }
        g.position.set(px, 0, pz);
        addFurniture(g);
        return true;
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
        const breakerPositions = [];
        const hashVal = Math.abs((chunkX * 104729) + (chunkZ * 1299827));
        const inDir = hashVal % 4;
        const outDir = (hashVal + 1 + (hashVal % 3)) % 4;
        if (isMacroStructure) {
            const isExitPhase = this.player && this.player.objectives && this.player.objectives.fixed >= this.player.objectives.total &&
                this.player.hasVisitedAnnex && !this.player.objectives.escaped;
            const sectorRoll = random();
            const validSectors = sectorMatrix.filter(s => {
                if (isExitPhase) return s.id !== "CHECKPOINT";
                return s.id !== "EXIT";
            });
            const sectorIndex = Math.floor(sectorRoll * validSectors.length);
            activeSector = validSectors[sectorIndex];
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
            if (["ARCHIVE", "SERVER", "MAINTENANCE", "IMPOUND", "ATRIUM", "CHASM", "CLINIC"].includes(activeSector.id)) {
                sectorMaze = this._generateSectorMaze(random, inDir, outDir);
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
                cPlane.position.set(startX * this.cellSize + cOffset, 2.98, startZ * this.cellSize + cOffset);
                cPlane.receiveShadow = true;
                chunkGroup.add(cPlane);
            }
        }
        const isChasm = activeSector && activeSector.id === "CHASM";
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
        if (!isChasm && (!activeSector || activeSector.id !== "ATRIUM")) {
            const ceil = new THREE.Mesh(ceilGeo, this.ceilMat);
            ceil.rotation.x = Math.PI / 2;
            ceil.position.set(startX * this.cellSize + centerOffset, 3, startZ * this.cellSize + centerOffset);
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
        if (isMacroStructure) {
            const hallwayNeedsFloor = activeSector.id === "CHASM";
            const hallwayNeedsCeiling = activeSector.id === "CHASM" || activeSector.id === "ATRIUM";
            this._buildEntranceHallways(chunkGroup, hash, startX, startZ, activeSector.id, ctx, hallwayNeedsFloor, hallwayNeedsCeiling);
        }
        for (let x = startX; x < startX + this.chunkSize; x++) {
            for (let z = startZ; z < startZ + this.chunkSize; z++) {
                if (!isMacroStructure && Math.abs(x) < 2 && Math.abs(z) < 2) continue;
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
        // Hermetic threshold model: a single sliding blast door sits exactly on the
        // zone's chunk boundary. No concrete corridor is carved into the zone's own
        // interior anymore - whatever is immediately behind the door belongs entirely
        // to that sector's own build() logic, same as it was before entrance hallways
        // existed. This avoids generic "hallway" geometry bleeding into every zone.
        const edge = this.chunkSize - 1;
        const sides = [
            {spansX: true, boundary: 0, dir: 1},
            {spansX: true, boundary: edge, dir: -1},
            {spansX: false, boundary: 0, dir: 1},
            {spansX: false, boundary: edge, dir: -1}
        ];
        for (const side of sides) {
            const spansX = side.spansX;
            const outSign = side.dir === 1 ? -1 : 1;
            const cellAt = (local) => ({
                x: startX + (spansX ? 7 : local),
                z: startZ + (spansX ? local : 7)
            });
            const outer = cellAt(side.boundary);
            ctx.markOccupied(outer.x, outer.z);
            this._buildBlastDoor(chunkGroup, hash, outer.x * this.cellSize, outer.z * this.cellSize, spansX, sectorId, outSign);
        }
    }
    _buildBlastDoor(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign) {
        const addGeometry = (mesh) => {
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            box.chunkHash = hash;
            box.isEntityBlocker = true;
            this.spatialGrid.insert(box);
            chunkGroup.add(mesh);
            this.walls.push(mesh);
        };
        const bWall = (w, h, d, mat) => {
            const key = `door_${w}_${h}_${d}`;
            let geo = this.geoCache.get(key);
            if (!geo) {
                geo = new THREE.BoxGeometry(w, h, d);
                this.geoCache.set(key, geo);
                this.geoCache.set(geo.uuid, true);
            }
            return new THREE.Mesh(geo, mat);
        };
        const jambA = bWall(spansX ? 0.5 : 0.7, 3.0, spansX ? 0.7 : 0.5, this.structMat);
        jambA.position.set(dcx - (spansX ? 1.75 : 0), 1.5, dcz - (spansX ? 0 : 1.75));
        addGeometry(jambA);
        const jambB = bWall(spansX ? 0.5 : 0.7, 3.0, spansX ? 0.7 : 0.5, this.structMat);
        jambB.position.set(dcx + (spansX ? 1.75 : 0), 1.5, dcz + (spansX ? 0 : 1.75));
        addGeometry(jambB);
        const header = bWall(spansX ? 3.0 : 0.7, 0.4, spansX ? 0.7 : 3.0, this.metalMat);
        header.position.set(dcx, 2.8, dcz);
        addGeometry(header);
        const inSign = outSign * -1;
        const awkL = 3.0;
        const awning = bWall(spansX ? this.cellSize : awkL, 0.05, spansX ? awkL : this.cellSize, this.metalMat);
        awning.position.set(
            dcx + (spansX ? 0 : inSign * 1.5),
            2.95,
            dcz + (spansX ? inSign * 1.5 : 0)
        );
        addGeometry(awning);
        for (let cs = -1; cs <= 1; cs += 2) {
            const clad = bWall(spansX ? 0.4 : 1.7, 3.0, spansX ? 1.7 : 0.4, this.structMat);
            clad.position.set(
                dcx + (spansX ? cs * 1.8 : inSign * 1.2),
                1.5,
                dcz + (spansX ? inSign * 1.2 : cs * 1.8)
            );
            addGeometry(clad);
        }
        const doorGroup = new THREE.Group();
        doorGroup.position.set(dcx, 0, dcz);
        const getDoorGeo = (name, w, h, d) => {
            const key = `${name}_${spansX}`;
            let geo = this.geoCache.get(key);
            if (!geo) {
                geo = new THREE.BoxGeometry(w, h, d);
                this.geoCache.set(key, geo);
                this.geoCache.set(geo.uuid, true);
            }
            return geo;
        };
        const panelGeo = spansX
            ? getDoorGeo('doorPanel', 1.58, 2.6, 0.24)
            : getDoorGeo('doorPanel', 0.24, 2.6, 1.58);
        const stripeGeo = spansX
            ? getDoorGeo('doorStripe', 0.14, 2.6, 0.26)
            : getDoorGeo('doorStripe', 0.26, 2.6, 0.14);
        const ribGeo = spansX
            ? getDoorGeo('doorRib', 1.58, 0.08, 0.28)
            : getDoorGeo('doorRib', 0.28, 0.08, 1.58);
        const mkPanel = (side) => {
            const p = new THREE.Mesh(panelGeo, this.metalMat);
            if (spansX) p.position.set(side * 0.76, 1.3, 0);
            else p.position.set(0, 1.3, side * 0.76);
            const stripe = new THREE.Mesh(stripeGeo, this.hazardMat);
            if (spansX) stripe.position.set(-side * 0.72, 0, 0);
            else stripe.position.set(0, 0, -side * 0.72);
            p.add(stripe);
            for (let ry = -1; ry <= 1; ry += 2) {
                const rib = new THREE.Mesh(ribGeo, this.structMat);
                rib.position.set(0, ry * 0.75, 0);
                p.add(rib);
            }
            p.castShadow = p.receiveShadow = true;
            p.userData.chunkHash = hash;
            doorGroup.add(p);
            return p;
        };
        const panelL = mkPanel(-1);
        const panelR = mkPanel(1);
        chunkGroup.add(doorGroup);
        doorGroup.updateMatrixWorld(true);
        this.walls.push(panelL, panelR);
        const doorBox = new THREE.Box3();
        if (spansX) {
            doorBox.min.set(dcx - 1.55, 0.0, dcz - 0.25);
            doorBox.max.set(dcx + 1.55, 2.6, dcz + 0.25);
        } else {
            doorBox.min.set(dcx - 0.25, 0.0, dcz - 1.55);
            doorBox.max.set(dcx + 0.25, 2.6, dcz + 1.55);
        }
        doorBox.chunkHash = hash;
        this.spatialGrid.insert(doorBox);
        const slideAxis = spansX ? 'x' : 'z';
        doorGroup.userData = {
            chunkHash: hash,
            isSlider: true,
            spansX: spansX,
            panels: [panelL, panelR],
            baseOffsets: [panelL.position[slideAxis], panelR.position[slideAxis]],
            signs: [-1, 1],
            slideDist: 1.62,
            progress: 0,
            lastTarget: 0,
            box: doorBox,
            closedBox: doorBox.clone(),
            sectorId: sectorId,
            outSign: outSign
        };
        this.interactiveDoors.push(doorGroup);
    }
    _buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling) {
        const addGeometry = (mesh) => {
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            box.chunkHash = hash;
            box.isEntityBlocker = true;
            this.spatialGrid.insert(box);
            chunkGroup.add(mesh);
            this.walls.push(mesh);
        };
        const wallKey = `hallwayWall_${spansX}`;
        let wallGeo = this.geoCache.get(wallKey);
        if (!wallGeo) {
            wallGeo = new THREE.BoxGeometry(spansX ? 0.4 : this.cellSize, 3.0, spansX ? this.cellSize : 0.4);
            this.geoCache.set(wallKey, wallGeo);
            this.geoCache.set(wallGeo.uuid, true);
        }
        for (const side of [-1, 1]) {
            const wall = new THREE.Mesh(wallGeo, this.structMat);
            if (spansX) wall.position.set(cx + side * 1.75, 1.5, cz);
            else wall.position.set(cx, 1.5, cz + side * 1.75);
            addGeometry(wall);
        }
        if (needsFloor || needsCeiling) {
            const floorKey = 'hallwayFloorCeil';
            let floorGeo = this.geoCache.get(floorKey);
            if (!floorGeo) {
                floorGeo = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
                this.geoCache.set(floorKey, floorGeo);
                this.geoCache.set(floorGeo.uuid, true);
            }
            if (needsFloor) {
                const floor = new THREE.Mesh(floorGeo, this.tileMat);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(cx, 0.01, cz);
                addGeometry(floor);
            }
            if (needsCeiling) {
                const ceil = new THREE.Mesh(floorGeo, this.ceilMat);
                ceil.rotation.x = Math.PI / 2;
                ceil.position.set(cx, 2.99, cz);
                addGeometry(ceil);
            }
        }
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
        this._stickySectorId = activeSector === "NORMAL" ? null : activeSector;
        if (activeSector === "ANNEX" && this.player && !this.player.hasVisitedAnnex) {
            this.player.hasVisitedAnnex = true;
            this.player.updateObjectives();
        }
        if (this._doorSectorForce) {
            activeSector = this._doorSectorForce;
            targetFog = this._sectorFog(activeSector);
            this._doorSectorForce = null;
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
            this.dustCloud.rotation.y = time * 0.05;
            this.dustCloud.rotation.z = time * 0.02;
            const inArchive = activeSector === "ARCHIVE";
            const targetDustOpacity = this.player.isCrawling ? (inArchive ? 0.45 : 0.35) : (inArchive ? 0.30 : 0.10);
            const targetDustSize = this.player.isCrawling ? (inArchive ? 0.09 : 0.08) : (inArchive ? 0.07 : 0.05);
            this.dustCloud.material.opacity += (targetDustOpacity - this.dustCloud.material.opacity) * 0.05;
            this.dustCloud.material.size += (targetDustSize - this.dustCloud.material.size) * 0.05;
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
            // Min-search runs on squared distances; sqrt fires exactly once at
            // the display boundary. The radar reads the same, the loop pays less.
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
        }
        if (this.fixtureData) {
            for (let i = 0; i < this.fixtureData.length; i++) {
                const fix = this.fixtureData[i];
                if (fix.lightObj) {
                    fix.lightObj.intensity = fix.currentIntensity;
                }
            }
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