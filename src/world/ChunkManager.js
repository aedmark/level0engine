import TheArchitect from "../core/TheArchitect.js";
import StructureKit from "./StructureKit.js";
import {spawnBreakerPodium} from './blueprints/BreakerPodiumSpawn.js';
import {spawnElevatorCar} from './blueprints/ElevatorSpawn.js';
import {EmptyDoorFrameProfile} from './blueprints/EmptyDoorFrame.js';
import {CrawlspaceDuctProfile} from './blueprints/CrawlspaceDuct.js';
import {CrawlspaceHallProfile} from './blueprints/CrawlspaceHall.js';
import {CreviceHallProfile} from './blueprints/CreviceHall.js';
import {RideQueueHallProfile} from './blueprints/RideQueueHall.js';
import {ArchHallProfile} from './blueprints/ArchHall.js';
import BootController from '../ui/BootController.js';
import * as SectorPlacement from './SectorPlacement.js';

const CELL_KEY_SPAN = 4194304;
const cellKey = (x, z) => x * (CELL_KEY_SPAN * 2) + z;

const CHUNK_PROFILE_PHASES = ['worker', 'cells', 'breach', 'instances', 'shadow', 'warm', 'yielded'];

const BLOCKING_LINKS_PER_FRAME = 4;
const MASKED_LINKS_PER_FRAME = 16;

const _urlFlags = new URLSearchParams(location.search);
const FORCE_NO_PARALLEL = _urlFlags.has('noparallel');
const LINK_PROFILE = FORCE_NO_PARALLEL || _urlFlags.has('linkprofile');

const SHADOW_PROBE_BATCH = 1;

const ALL_PROBE_FORMS = new Set(['plain', 'instanced', 'coloured']);

export default class ChunkManager {
    constructor(env) {
        this.env = env;
    }

    _profBegin(hash) {
        const p = {hash, t0: performance.now()};
        for (const k of CHUNK_PROFILE_PHASES) p[k] = 0;
        this._prof = p;
        return p;
    }

    _profAdd(phase, ms) {
        if (this._prof) this._prof[phase] += ms;
    }

    _profEnd() {
        const p = this._prof;
        if (!p) return;
        this._prof = null;
        const env = this.env;
        const total = performance.now() - p.t0;
        p.total = Math.round(total);
        for (const k of CHUNK_PROFILE_PHASES) p[k] = Math.round(p[k]);
        if (!env.genStats) env.genStats = {count: 0, totalMs: 0, worstMs: 0, lastMs: 0};
        const stats = env.genStats;
        if (!stats.phases) {
            stats.phases = {};
            for (const k of CHUNK_PROFILE_PHASES) stats.phases[k] = 0;
        }
        for (const k of CHUNK_PROFILE_PHASES) stats.phases[k] += p[k];
        if (!stats.worstProfile || total > stats.worstProfile.total) stats.worstProfile = p;
    }

    updateChunks(playerPos) {
        const env = this.env;
        const activeCellSize = env.cellSize || 4;
        const chunkW = env.chunkSize * activeCellSize;
        const chunkX = Math.floor(playerPos.x / chunkW);
        const chunkZ = Math.floor(playerPos.z / chunkW);

        let quadX = 0;
        let quadZ = 0;
        if (env.renderDistance === 0) {
            const localX = playerPos.x - (chunkX * chunkW);
            const localZ = playerPos.z - (chunkZ * chunkW);
            quadX = localX > chunkW / 2 ? 1 : -1;
            quadZ = localZ > chunkW / 2 ? 1 : -1;
        }

        if (env.currentChunkCoords.x === chunkX &&
            env.currentChunkCoords.z === chunkZ &&
            env.currentChunkCoords.qx === quadX &&
            env.currentChunkCoords.qz === quadZ) return;

        env.currentChunkCoords.x = chunkX;
        env.currentChunkCoords.z = chunkZ;
        env.currentChunkCoords.qx = quadX;
        env.currentChunkCoords.qz = quadZ;

        const chunksToKeep = new Set();

        if (env.renderDistance === 0) {
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const targetX = chunkX + (i === 1 ? quadX : 0);
                    const targetZ = chunkZ + (j === 1 ? quadZ : 0);
                    const hash = `${targetX},${targetZ}`;
                    chunksToKeep.add(hash);
                    if (!env.activeChunks.has(hash) && !env.queuedHashes.has(hash)) {
                        env.chunkQueue.push({x: targetX, z: targetZ, hash: hash});
                        env.queuedHashes.add(hash);
                    }
                }
            }
        } else {
            for (let x = -env.renderDistance; x <= env.renderDistance; x++) {
                for (let z = -env.renderDistance; z <= env.renderDistance; z++) {
                    const targetX = chunkX + x;
                    const targetZ = chunkZ + z;
                    const hash = `${targetX},${targetZ}`;
                    chunksToKeep.add(hash);
                    if (!env.activeChunks.has(hash) && !env.queuedHashes.has(hash)) {
                        env.chunkQueue.push({x: targetX, z: targetZ, hash: hash});
                        env.queuedHashes.add(hash);
                    }
                }
            }
        }
        if (env._currentTargetPoi && env._currentTargetPoi.chunkHash) {
            chunksToKeep.add(env._currentTargetPoi.chunkHash);
        }
        env.chunksToKeep = chunksToKeep;
        this.processChunkQueue().catch(err => console.error('Chunk queue processing failed:', err));
        const deadHashes = new Set();
        const chunksToDispose = [];
        for (const [hash, chunkGroup] of env.activeChunks.entries()) {
            if (!chunksToKeep.has(hash)) {
                deadHashes.add(hash);
                env.scene.remove(chunkGroup);
                chunksToDispose.push(chunkGroup);
                env.activeChunks.delete(hash);
                env.blackoutChunks.delete(hash);
                env.spatialGrid.removeByChunk(hash);
                env._pendingMacroContent.delete(hash);
            }
        }
        if (chunksToDispose.length > 0) {
            this._asyncDisposeChunks(chunksToDispose).catch(console.error);
        }
        if (deadHashes.size > 0) {
            deadHashes.forEach(h => {
                env.macroZones.delete(h);
                if (env._annexKeypadChunks) env._annexKeypadChunks.delete(h);
            });
            this._pruneDeadChunkEntries(env.walls, deadHashes, w => w.userData.chunkHash);
            this._pruneDeadChunkEntries(env.fixtureData, deadHashes, f => f.chunkHash);
            this._pruneDeadChunkEntries(env.idlingCars, deadHashes, c => c.chunkHash);
            this._pruneDeadChunkEntries(env.hangingCables, deadHashes, c => c.chunkHash);
            this._pruneDeadChunkEntries(env.interactiveDoors, deadHashes, d => d.userData.chunkHash);
            if (env.airlocks) {
                this._pruneDeadChunkEntries(env.airlocks, deadHashes, a => a.chunkHash);
            }
            if (env.interactables) {
                this._pruneDeadChunkEntries(env.interactables, deadHashes, i => i.userData.chunkHash);
            }
            if (env.animators) {
                this._pruneDeadChunkEntries(env.animators, deadHashes, i => i.userData.chunkHash);
            }
            if (env.observers) {
                this._pruneDeadChunkEntries(env.observers, deadHashes, o => o.userData.chunkHash);
            }
            if (env.pointsOfInterest) {
                this._pruneDeadChunkEntries(env.pointsOfInterest, deadHashes, p => p.chunkHash);
            }
        }
    }
    _pruneDeadChunkEntries(arr, deadHashes, getHash) {
        const env = this.env;
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
        const env = this.env;
        if (env.isBuildingChunk) return;
        env.isBuildingChunk = true;
        try {
            while (env.chunkQueue.length > 0) {
                const chunk = env.chunkQueue.shift();
                env.queuedHashes.delete(chunk.hash);
                if (env.chunksToKeep && env.chunksToKeep.has(chunk.hash)) {
                    const genT0 = performance.now();
                    await this.buildChunk(chunk.x, chunk.z, chunk.hash);
                    this._profEnd();
                    const genMs = performance.now() - genT0;
                    if (!env.genStats) env.genStats = {count: 0, totalMs: 0, worstMs: 0, lastMs: 0};
                    env.genStats.count++;
                    env.genStats.totalMs += genMs;
                    env.genStats.lastMs = genMs;
                    if (genMs > env.genStats.worstMs) env.genStats.worstMs = genMs;
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        } finally {
            env.isBuildingChunk = false;
        }
        if (env.isSpawning) {
            env.isSpawning = false;

            const elevator = env._spawnElevator;
            if (elevator && elevator.placePlayer && elevator.placement) {
                elevator.placePlayer = false;
                env.needsSafeSpawn = false;
                env.camera.position.set(elevator.placement.x, 1.6, elevator.placement.z);
                env.camera.rotation.set(0, elevator.placement.rotationY, 0, 'YXZ');
                if (env.player) {
                    env.player.velocity.set(0, 0, 0);
                    if (env.player._lastRotY !== undefined) env.player._lastRotY = elevator.placement.rotationY;
                }
            }

            if (env.needsSafeSpawn) {
                env.needsSafeSpawn = false;
                const chunkW = 64;
                const cX = Math.floor(env.camera.position.x / chunkW);
                const cZ = Math.floor(env.camera.position.z / chunkW);
                const baseX = cX * chunkW;
                const baseZ = cZ * chunkW;

                const testPoints = [{ x: env.camera.position.x, z: env.camera.position.z }];
                for (let r = 1; r <= 6; r++) {
                    for (let x = -r; x <= r; x++) {
                        for (let z = -r; z <= r; z++) {
                            if (Math.abs(x) === r || Math.abs(z) === r) {
                                testPoints.push({ x: env.camera.position.x + x * 4, z: env.camera.position.z + z * 4 });
                            }
                        }
                    }
                }

                for (const pt of testPoints) {
                    const radius = 0.5;
                    const nearby = env.spatialGrid.getNearby(pt.x, pt.z, radius);
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
                        env.camera.position.set(pt.x, 1.6, pt.z);
                        break;
                    }
                }
            }

            const bootCtrl = BootController.getInstance();
            if (!bootCtrl || bootCtrl.isComplete) {
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
    }
    async _asyncDisposeChunks(chunks) {
        const env = this.env;
        let disposeStartTime = performance.now();
        const meshes = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunkGroup = chunks[i];
            meshes.length = 0;
            chunkGroup.traverse((child) => meshes.push(child));
            for (let j = 0; j < meshes.length; j++) {
                const child = meshes[j];
                if (child.isInstancedMesh) child.dispose();
                if (child.geometry && !env.sharedAssets.has(child.geometry.uuid) && !env.geoCache.has(child.geometry.uuid)) {
                    child.geometry.dispose();
                }
                if (Array.isArray(child.material)) {
                    for (let m = 0; m < child.material.length; m++) {
                        const mat = child.material[m];
                        if (!env.sharedAssets.has(mat.uuid)) {
                            this._forgetMaterialPrograms(mat);
                            mat.dispose();
                        }
                    }
                } else if (child.material && !env.sharedAssets.has(child.material.uuid)) {
                    this._forgetMaterialPrograms(child.material);
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
        const env = this.env;
        this._profBegin(hash);
        const chunkGroup = new THREE.Group();
        env.scene.add(chunkGroup);
        env.activeChunks.set(hash, chunkGroup);
        let prngSeed = (env.baseSeed + (chunkX * 104729) + (chunkZ * 1299827)) >>> 0;
        const random = () => {
            prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
            return prngSeed / 4294967296.0;
        };
        const stagingMeshes = [];
        const ctx = env._createChunkHelpers(hash, chunkGroup, stagingMeshes, random);
        const startX = chunkX * env.chunkSize;
        const startZ = chunkZ * env.chunkSize;
        const placement = SectorPlacement.placementConfig(env);
        const isMacroStructure = SectorPlacement.isMacroChunk(placement, chunkX, chunkZ);
        if (isMacroStructure) env._macroChunkHashes.add(hash);
        const structuralMatrix = isMacroStructure ? null : TheArchitect.getStructuralMatrix.call(env, ctx);
        const sectorMatrix = isMacroStructure ? TheArchitect.getSectorMatrix.call(env, ctx) : null;
        let activeSector = null;
        let sectorMaze = null;
        let chunkBreakerCount = 0;
        let cHeight = 3.0;
        const breakerPositions = [];
        if (isMacroStructure) {
            const isExitPhase = env.player && env.player.objectives && env.player.objectives.fixed >= env.player.objectives.total &&
                env.player.inventory.hasExitKey && !env.player.objectives.escaped;

            const pool = sectorMatrix.filter(s => s.id !== "EXIT").map(s => s.id);
            let activeSectorId = SectorPlacement.sectorIdFor(placement, pool, chunkX, chunkZ);

            if (isExitPhase && SectorPlacement.isExitChunk(placement, chunkX, chunkZ)) {
                activeSectorId = "EXIT";
            }
            env.discoveredSectors.set(hash, activeSectorId);
            activeSector = sectorMatrix.find(s => s.id === activeSectorId);
            if (activeSector && activeSector.id === "IMPOUND") cHeight = 20.0;
            env.macroZones.set(hash, {
                id: activeSector.id,
                fog: env.atmosphereManager._sectorFog(activeSector.id),
                minX: startX * env.cellSize + 8,
                maxX: startX * env.cellSize + 56,
                minZ: startZ * env.cellSize + 8,
                maxZ: startZ * env.cellSize + 56,
                startX: startX,
                startZ: startZ
            });
            if (["ARCHIVE", "SERVER", "MAINTENANCE", "IMPOUND", "ATRIUM", "CHASM", "CLINIC", "INCINERATOR"].includes(activeSector.id)) {
                sectorMaze = env._generateSectorMaze(random);
            }
            if (activeSector.foundationMat) {
                const innerSize = (env.chunkSize - 2) * env.cellSize;
                const foundationGeo = env._planeGeo(innerSize, innerSize);
                const foundation = new THREE.Mesh(foundationGeo, activeSector.foundationMat);
                foundation.rotation.x = -Math.PI / 2;
                const centerOffset = (env.chunkSize * env.cellSize) / 2 - (env.cellSize / 2);
                foundation.position.set(startX * env.cellSize + centerOffset, 0.02, startZ * env.cellSize + centerOffset);
                foundation.receiveShadow = true;
                foundation.castShadow = false;
                chunkGroup.add(foundation);
            }
            if (activeSector.ceilingMat) {
                const cInner = (env.chunkSize - 2) * env.cellSize;
                const cGeo = env._planeGeo(cInner, cInner);
                const cPlane = new THREE.Mesh(cGeo, activeSector.ceilingMat);
                cPlane.rotation.x = Math.PI / 2;
                const cOffset = (env.chunkSize * env.cellSize) / 2 - (env.cellSize / 2);
                cPlane.position.set(startX * env.cellSize + cOffset, cHeight - 0.02, startZ * env.cellSize + cOffset);
                cPlane.receiveShadow = true;
                chunkGroup.add(cPlane);
            }
        }
        const isChasm = activeSector && activeSector.id === "CHASM";
        const usesVoidCeiling = activeSector && (activeSector.id === "CHASM" || activeSector.id === "ATRIUM" || activeSector.id === "ARCHIVE");
        const centerOffset = (env.chunkSize * env.cellSize) / 2 - (env.cellSize / 2);
        const floorGeo = env._planeGeo(env.chunkSize * env.cellSize, env.chunkSize * env.cellSize);
        const ceilGeo = floorGeo;
        if (!isChasm) {
            const floor = new THREE.Mesh(floorGeo, env.carpetMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(startX * env.cellSize + centerOffset, 0, startZ * env.cellSize + centerOffset);
            floor.receiveShadow = true;
            floor.castShadow = false;
            chunkGroup.add(floor);
        }
        if (!usesVoidCeiling) {
            const ceil = new THREE.Mesh(ceilGeo, env.ceilMat);
            ceil.rotation.x = Math.PI / 2;
            ceil.position.set(startX * env.cellSize + centerOffset, cHeight, startZ * env.cellSize + centerOffset);
            ceil.castShadow = false;
            ceil.receiveShadow = true;
            chunkGroup.add(ceil);
        } else {
            if (!env.voidShroudMat) {
                env.voidShroudMat = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide});
                env.sharedAssets.add(env.voidShroudMat.uuid);
            }
            if (!env.voidShroudWhiteMat) {
                env.voidShroudWhiteMat = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide});
                env.sharedAssets.add(env.voidShroudWhiteMat.uuid);
            }
            const isAtriumVoid = activeSector && activeSector.id === "ATRIUM";
            const shroudMat = isAtriumVoid ? env.voidShroudWhiteMat : env.voidShroudMat;
            const canopyY = isAtriumVoid ? 66.0 : 9.0;
            const span = env.chunkSize * env.cellSize;
            const canopy = new THREE.Mesh(env._planeGeo(span, span), shroudMat);
            canopy.rotation.x = Math.PI / 2;
            canopy.position.set(startX * env.cellSize + centerOffset, canopyY, startZ * env.cellSize + centerOffset);
            canopy.castShadow = true;
            chunkGroup.add(canopy);
            const skirtBottom = isAtriumVoid ? 55.6 : 2.85;
            const skirtTop = canopyY + 0.15;
            const skirtCenterY = (skirtBottom + skirtTop) / 2;
            const skirtHeight = skirtTop - skirtBottom;
            const skirtGeo = env._planeGeo(span, skirtHeight);
            const cxw0 = startX * env.cellSize + centerOffset;
            const czw0 = startZ * env.cellSize + centerOffset;
            const skirtInset = centerOffset - (env.cellSize / 2) - 0.05;
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
                const floorVoid = new THREE.Mesh(env._planeGeo(span, span), shroudMat);
                floorVoid.rotation.x = -Math.PI / 2;
                floorVoid.position.set(cxw0, floorVoidY, czw0);
                chunkGroup.add(floorVoid);
                const lowerSkirtBottom = floorVoidY - 0.15;
                const lowerSkirtTop = 0.15;
                const lowerSkirtCenterY = (lowerSkirtBottom + lowerSkirtTop) / 2;
                const lowerSkirtHeight = lowerSkirtTop - lowerSkirtBottom;
                const lowerSkirtGeo = env._planeGeo(span, lowerSkirtHeight);
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
        ctx.markOccupied = (ox, oz) => occupied.add(cellKey(ox, oz));
        ctx.isOccupied = (ox, oz) => occupied.has(cellKey(ox, oz));
        if (isMacroStructure && activeSector) {
            const hallwayNeedsFloor = activeSector.id === "CHASM";
            const hallwayNeedsCeiling = activeSector.id !== "ARCHIVE" && activeSector.id !== "IMPOUND" && activeSector.id !== "ATRIUM" && activeSector.id !== "CHASM";
            env._buildEntranceHallways(chunkGroup, hash, startX, startZ, activeSector.id, ctx, hallwayNeedsFloor, hallwayNeedsCeiling, sectorMaze);
            const edge = env.chunkSize - 1;
            let shellStartTime = performance.now();
            for (let x = startX; x < startX + env.chunkSize; x++) {
                for (let z = startZ; z < startZ + env.chunkSize; z++) {
                    const localX = x - startX;
                    const localZ = z - startZ;
                    if (localX !== 0 && localX !== edge && localZ !== 0 && localZ !== edge) continue;
                    if (ctx.isOccupied(x, z)) continue;
                    if (performance.now() - shellStartTime > 5.0) {
                        this.warmChunkMaterials(chunkGroup);
                        await new Promise(resolve => setTimeout(resolve, 0));
                        shellStartTime = performance.now();
                        if (!env.activeChunks.has(hash)) return;
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
            env._pendingMacroContent.set(hash, interiorArgs);
            return;
        }
        await this._buildChunkInterior(interiorArgs);
    }
    async _buildChunkInterior(args) {
        const env = this.env;
        const {
            hash, chunkGroup, stagingMeshes, ctx, random, chunkX, chunkZ, startX, startZ,
            isMacroStructure, activeSector, sectorMaze, structuralMatrix
        } = args;
        const cx = Math.sin(env.baseSeed) * 0.8;
        const cy = Math.cos(env.baseSeed * 0.5) * 0.8;
        const emptyState = { chunkBreakerCount: 0, spawnedVirtualBreaker: false };
        const breakerPositions = [];
        const wallCells = new Set();
        const isWallCell = (wx, wz) => wallCells.has(cellKey(wx, wz));
        const solidWallCells = new Set();
        const isSolidWallCell = (wx, wz) => solidWallCells.has(cellKey(wx, wz));
        let chunkStartTime = performance.now();
        let cellsAccum = 0;
        for (let x = startX; x < startX + env.chunkSize; x++) {
            for (let z = startZ; z < startZ + env.chunkSize; z++) {
                if (!env.activeChunks.has(hash)) return;
                if (performance.now() - chunkStartTime > 5.0) {
                    cellsAccum += performance.now() - chunkStartTime;
                    const wt0 = performance.now();
                    this.warmChunkMaterials(chunkGroup);
                    const wt1 = performance.now();
                    await new Promise(resolve => setTimeout(resolve, 0));
                    const wt2 = performance.now();
                    this._profAdd('warm', wt1 - wt0);
                    this._profAdd('yielded', wt2 - wt1);
                    this._profAdd('cells', cellsAccum);
                    cellsAccum = 0;
                    chunkStartTime = performance.now();
                    if (!env.activeChunks.has(hash)) return;
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
                if (!ctx.isWall) {
                    const forcedStructuresGrid = new Map();
                    const isWallGrid = new Map();
                    const doorwayPlans = new Map();
                    ctx.getDoorwayPlan = (px, pz) => doorwayPlans.get(cellKey(px, pz)) || null;

                    if (!this.worker) {
                        this.worker = new Worker(new URL('./ChunkWorker.js', import.meta.url));
                        this.workerResolvers = new Map();
                        this.worker.onmessage = (e) => {
                            const { hash, isWallGrid, forcedStructuresGrid, doorwayPlans } = e.data;
                            const resolver = this.workerResolvers.get(hash);
                            if (resolver) {
                                resolver({
                                    isWallGrid: new Map(isWallGrid),
                                    forcedStructuresGrid: new Map(forcedStructuresGrid),
                                    doorwayPlans: new Map(doorwayPlans)
                                });
                                this.workerResolvers.delete(hash);
                            }
                        };
                    }

                    const airlocksCopy = env.airlocks ? env.airlocks.map(a => ({
                        outerPos: {x: a.outerPos.x, z: a.outerPos.z},
                        chamberCenter: {x: a.chamberCenter.x, z: a.chamberCenter.z},
                        outSign: a.outSign,
                        spansX: a.spansX
                    })) : null;

                    const workerT0 = performance.now();
                    const mathData = await new Promise(resolve => {
                        this.workerResolvers.set(hash, resolve);
                        this.worker.postMessage({
                            hash, chunkX, chunkZ, startX, startZ,
                            chunkSize: env.chunkSize, cellSize: env.cellSize,
                            baseSeed: env.baseSeed, cx, cy,
                            airlocks: airlocksCopy
                        });
                    });
                    this._profAdd('worker', performance.now() - workerT0);
                    chunkStartTime = performance.now();

                    ctx.isWall = (wx, wz) => mathData.isWallGrid.get(cellKey(wx, wz)) || false;
                    ctx.isAirlockApron = (wx, wz) => this._isAirlockApron(wx, wz);
                    ctx.setWall = (wx, wz, val) => {
                        mathData.isWallGrid.set(cellKey(wx, wz), val);
                        if (!val) {
                            const clearX = wx * env.cellSize;
                            const clearZ = wz * env.cellSize;
                            const halfCell = env.cellSize * 0.5;
                            for (let i = stagingMeshes.length - 1; i >= 0; i--) {
                                const m = stagingMeshes[i];
                                if (m.userData.baseboardOwner) {
                                    continue;
                                } else if (m.userData.isDefaultWall && m.userData.cellX === wx && m.userData.cellZ === wz) {
                                    ctx.retireStagedMesh(m);
                                } else if (m.userData.wallSpan) {
                                    const clearance = ctx.spanClearanceToCell(m, wx, wz);
                                    if (clearance >= m.userData.wallSpan.length) continue;
                                    if (clearance < 0.05) ctx.retireStagedMesh(m);
                                    else ctx.retractSpanWall(m, clearance);
                                } else if (m.userData.noCollision || m.userData.isMiniDoor) {
                                    continue;
                                } else if (
                                    Math.abs(m.position.x - clearX) < halfCell &&
                                    Math.abs(m.position.z - clearZ) < halfCell
                                ) {
                                    ctx.retireStagedMesh(m);
                                }
                            }
                        }
                    };
                    ctx.forceStructure = (wx, wz, name) => mathData.forcedStructuresGrid.set(cellKey(wx, wz), name);
                    ctx.getForcedStructure = (wx, wz) => mathData.forcedStructuresGrid.get(cellKey(wx, wz));
                    ctx.isLowClearance = (wx, wz) =>
                        mathData.forcedStructuresGrid.get(cellKey(wx, wz)) === 'CRAWLSPACE_HALL';
                    ctx.getDoorwayPlan = (px, pz) => mathData.doorwayPlans.get(cellKey(px, pz)) || null;

                    const elevator = env._spawnElevator;
                    if (elevator && elevator.chunkHash === hash && (elevator.cellX === null || elevator.cellX === undefined)) {
                        let bestX = null, bestZ = null;
                        let fallbackX = null, fallbackZ = null;
                        for (let cx = startX; cx < startX + env.chunkSize; cx++) {
                            for (let cz = startZ; cz < startZ + env.chunkSize; cz++) {
                                if (!ctx.isWall(cx, cz) && !ctx.isOccupied(cx, cz) && !ctx.isAirlockApron(cx, cz)) {
                                    if (fallbackX === null) { fallbackX = cx; fallbackZ = cz; }
                                    let open = 0;
                                    if (!ctx.isWall(cx, cz + 1)) open++;
                                    if (!ctx.isWall(cx + 1, cz)) open++;
                                    if (!ctx.isWall(cx, cz - 1)) open++;
                                    if (!ctx.isWall(cx - 1, cz)) open++;
                                    if (open === 1) {
                                        bestX = cx; bestZ = cz;
                                        break;
                                    }
                                }
                            }
                            if (bestX !== null) break;
                        }
                        if (bestX !== null) {
                            elevator.cellX = bestX; elevator.cellZ = bestZ;
                        } else if (fallbackX !== null) {
                            elevator.cellX = fallbackX; elevator.cellZ = fallbackZ;
                        }
                    }
                }

                let isWall = ctx.isWall(x, z);
                const damp = env._dampAt(x, z);
                if (isWall) {
                    wallCells.add(cellKey(x, z));
                    const forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
                    const structRoll = random();
                    const structure = forcedName
                        ? structuralMatrix.find(s => s.name === forcedName)
                        : TheArchitect.selectStructure(structuralMatrix, structRoll);
                    let built = false;
                    if (structure && !(this._isAirlockApron(x, z) && structure.name === "CRATES OR STAIRWAY")) {
                        built = structure.build(x, z) !== false;
                    }
                    if (!built) {
                        solidWallCells.add(cellKey(x, z));
                        ctx.buildDefaultWall(x, z);
                    }
                } else {
                    this._buildEmptyCell({
                        x, z, env, ctx, random, hash, chunkGroup, localX, localZ,
                        isWallCell, isSolidWallCell, breakerPositions
                    }, emptyState);
                }
            }
        }
        this._profAdd('cells', cellsAccum + (performance.now() - chunkStartTime));
        if (performance.now() - chunkStartTime > 5.0) {
            this.warmChunkMaterials(chunkGroup);
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!env.activeChunks.has(hash)) return;
        }
        const breachT0 = performance.now();
        if (env._breachWalls && env._breachWalls.length > 0) {
            const toRemoveGroup = [];
            const toRemoveStaging = [];
            for (const wall of env._breachWalls) {
                if (wall.userData.retired) continue;
                if (wall.userData.chunkHash !== hash) continue;
                wall.updateMatrixWorld(true);
                if (!wall.geometry.boundingBox) wall.geometry.computeBoundingBox();
                const box = wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
                const span = wall.userData.wallSpan;
                let clearance = span ? span.length : Infinity;

                if (span) {
                    for (const cell of ctx.claimedCells.values()) {
                        clearance = Math.min(clearance, ctx.spanClearanceToCell(wall, cell.x, cell.z));
                    }
                }

                const checkList = [...chunkGroup.children, ...stagingMeshes];
                for (const child of checkList) {
                    if (toRemoveGroup.includes(child) || toRemoveStaging.includes(child)) continue;
                    let isFixture = false;
                    if (child.userData.type === 'grate') isFixture = true;
                    if (child.userData.type === 'door') isFixture = true;
                    if (child.userData.type === 'hatch') isFixture = true;
                    if (child.userData.isMiniDoor) isFixture = true;
                    if (child.geometry === env.sharedPanelGeo) isFixture = true;
                    if (child.isLight) isFixture = true;

                    if (isFixture) {
                        child.updateMatrixWorld(true);
                        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                        const childBox = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
                        if (box.intersectsBox(childBox)) {
                            if (span) {
                                clearance = Math.min(clearance, ctx.spanClearanceToBox(wall, childBox));
                            } else if (chunkGroup.children.includes(child)) {
                                toRemoveGroup.push(child);
                            } else {
                                toRemoveStaging.push(child);
                            }
                        }
                    }
                }

                if (span && clearance < span.length) {
                    if (clearance < 0.05) ctx.retireStagedMesh(wall);
                    else ctx.retractSpanWall(wall, clearance);
                }
            }
            toRemoveGroup.forEach(c => {
                chunkGroup.remove(c);
                if (env.walls) {
                    const idx = env.walls.indexOf(c);
                    if (idx > -1) env.walls.splice(idx, 1);
                }
            });
            toRemoveStaging.forEach(c => {
                const idx = stagingMeshes.indexOf(c);
                if (idx > -1) stagingMeshes.splice(idx, 1);
            });
            if (env.fixtureData) {
                env.fixtureData = env.fixtureData.filter(f => {
                    for (const wall of env._breachWalls) {
                        if (wall.userData.retired) continue;
                        const box = wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
                        if (box.containsPoint(f.position)) return false;
                    }
                    return true;
                });
            }
            env._breachWalls = [];
        }
        this._profAdd('breach', performance.now() - breachT0);

        const instT0 = performance.now();
        await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
        this._profAdd('instances', performance.now() - instT0);

        const shadowT0 = performance.now();
        for (let pass = 0; pass < 150 && this._shadowQueue && this._shadowQueue.length > 0; pass++) {
            this.drainShadowPrewarm(8.0);
            if (!env.activeChunks.has(hash)) return;
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        this._profAdd('shadow', performance.now() - shadowT0);
        if (env.activeChunks.has(hash)) {
            chunkGroup.userData.contentReady = true;
        }
    }

    _airlockApron(airlock) {
        const env = this.env;
        const wox = Math.round(airlock.outerPos.x / env.cellSize);
        const woz = Math.round(airlock.outerPos.z / env.cellSize);
        const dir = airlock.outSign;
        if (airlock.spansX) {
            return {
                clearX: [wox - 1, wox, wox + 1],
                clearZ: [woz, woz + dir, woz + dir * 2, woz + dir * 3]
            };
        }
        return {
            clearX: [wox, wox + dir, wox + dir * 2, wox + dir * 3],
            clearZ: [woz - 1, woz, woz + 1]
        };
    }

    _isAirlockApron(x, z) {
        const airlocks = this.env.airlocks;
        if (!airlocks) return false;
        for (let i = 0; i < airlocks.length; i++) {
            const {clearX, clearZ} = this._airlockApron(airlocks[i]);
            if (clearX.indexOf(x) !== -1 && clearZ.indexOf(z) !== -1) return true;
        }
        return false;
    }

    _buildEmptyCell(args, state) {
        const { x, z, env, ctx, random, hash, chunkGroup, localX, localZ, isWallCell, isSolidWallCell, breakerPositions } = args;
        let hasTallObstacle = false;

        const elevator = env._spawnElevator;
        if (elevator && elevator.chunkHash === hash) {
            const anchored = elevator.cellX !== null && elevator.cellX !== undefined;
            if (!anchored || (x === elevator.cellX && z === elevator.cellZ)) {
                const placement = spawnElevatorCar(env, ctx, x, z, elevator.exitIndex);
                elevator.cellX = placement.cellX;
                elevator.cellZ = placement.cellZ;
                elevator.exitIndex = placement.exitIndex;
                elevator.placement = placement;
                env.elevatorAnchor = {
                    cellX: placement.cellX,
                    cellZ: placement.cellZ,
                    exitIndex: placement.exitIndex,
                    seed: env.baseSeed
                };
                return;
            }
        }

        if (!state.spawnedVirtualBreaker && env._virtualBreaker && env._virtualBreaker.chunkHash === hash && !env._virtualBreaker.spawned) {
            spawnBreakerPodium(env, ctx, x, z);
            env._virtualBreaker.spawned = true;
            env._virtualBreaker.mesh = env.interactables[env.interactables.length - 1];
            state.spawnedVirtualBreaker = true;
            hasTallObstacle = true;
        }

        let forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
        const YIELDS_TO_DUCT = ["empty_door_frame", "CRAWLSPACE_HALL"];
        const DUCT_STRUCTURES = ["DUCT OR VENT", "CRAWLSPACE_DUCT", "TUNNEL BURST"];
        if (forcedName && YIELDS_TO_DUCT.includes(forcedName) && ctx.getForcedStructure) {
            const abuttingDuct =
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x + 1, z)) ||
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x - 1, z)) ||
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x, z + 1)) ||
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x, z - 1));
            if (abuttingDuct) forcedName = null;
        }

        if (forcedName === 'empty_door_frame') {
            hasTallObstacle = true;
            const breachProfile = EmptyDoorFrameProfile(env, ctx);
            breachProfile.build(x, z, isWallCell);
        } else if (forcedName === 'CRAWLSPACE_HALL') {
            hasTallObstacle = true;
            const crawlProfile = CrawlspaceHallProfile(env, ctx);
            crawlProfile.build(x, z, isWallCell);
        } else if (forcedName === 'CREVICE_HALL') {
            hasTallObstacle = true;
            const creviceProfile = CreviceHallProfile(env, ctx);
            creviceProfile.build(x, z, isWallCell);
        } else if (forcedName === 'RIDE_QUEUE_HALL') {
            hasTallObstacle = true;
            const rideProfile = RideQueueHallProfile(env, ctx);
            rideProfile.build(x, z, isWallCell);
        } else if (forcedName === 'ARCH_HALL') {
            hasTallObstacle = true;
            const archProfile = ArchHallProfile(env, ctx);
            archProfile.build(x, z, isWallCell);
        }

        const inNRing = localZ === 3 && localX >= 3 && localX <= 11;
        const inSRing = localZ === 11 && localX >= 3 && localX <= 11;
        const inWRing = localX === 3 && localZ >= 3 && localZ <= 11;
        const inERing = localX === 11 && localZ >= 3 && localZ <= 11;
        const inNPath = localX === 7 && localZ <= 3;
        const inSPath = localX === 7 && localZ >= 11;
        const inWPath = localZ === 7 && localX <= 3;
        const inEPath = localZ === 7 && localX >= 11;
        const isArtery = inNRing || inSRing || inWRing || inERing || inNPath || inSPath || inWPath || inEPath;
        const isAirlockApproach = this._isAirlockApron(x, z);

        const floorRoll = random();
        let isNearFixture = false;
        if (ctx.getForcedStructure) {
            const fixtures = ["HINGED DOORWAY", "DUCT OR VENT", "HATCH", "AIRLOCK", "empty_door_frame", "CRAWLSPACE_DUCT"];
            if (fixtures.includes(ctx.getForcedStructure(x + 1, z))) isNearFixture = true;
            else if (fixtures.includes(ctx.getForcedStructure(x - 1, z))) isNearFixture = true;
            else if (fixtures.includes(ctx.getForcedStructure(x, z + 1))) isNearFixture = true;
            else if (fixtures.includes(ctx.getForcedStructure(x, z - 1))) isNearFixture = true;
        }
        
        if (!hasTallObstacle && floorRoll > 0.80 && !isArtery && !isAirlockApproach && !isNearFixture) {
            hasTallObstacle = true;
            const divW = random() > 0.5 ? env.cellSize * 0.8 : env.cellSize * 0.2;
            const divD = divW === env.cellSize * 0.8 ? env.cellSize * 0.2 : env.cellSize * 0.8;
            const divider = ctx.buildWall(divW, divD, env.sharedWallMat);
            divider.position.set(x * env.cellSize, 1.5, z * env.cellSize);
            ctx.addGeometry(divider);
            if (random() > 0.6) {
                const isWide = divW > divD;
                const clearX = isWide ? 0.0 : 1.2;
                const clearZ = isWide ? 1.2 : 0.0;
                const rot = isWide ? 0 : -Math.PI / 2;
                const chair = ctx.buildChair(x * env.cellSize + clearX, 0, z * env.cellSize + clearZ, rot);
                ctx.addFurniture(chair);
            }
        }
        if (!hasTallObstacle && random() > 0.20) {
            const isBroken = random() > 0.60;
            const isRotated = random() > 0.5;
            const posX = (x * env.cellSize);
            const posZ = (z * env.cellSize);
            const activeMat = env.getPooledMazeLightMaterial(isBroken);
            const matArray = [
                env.baseHousingMat, env.baseHousingMat, env.baseHousingMat,
                activeMat, env.baseHousingMat, env.baseHousingMat
            ];
            const panel = new THREE.Mesh(env.sharedPanelGeo, matArray);
            panel.position.set(posX, 2.98, posZ);
            if (isRotated) panel.rotation.y = Math.PI / 2;
            panel.userData.chunkHash = hash;
            chunkGroup.add(panel);
            env.walls.push(panel);
            if (!isBroken) {
                const isTracked = random() > 0.85;
                env.fixtureData.push({
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
        } else if (!hasTallObstacle && random() > 0.95 && state.chunkBreakerCount < 3 && !isArtery) {
            const px = x * env.cellSize;
            const pz = z * env.cellSize;
            const mountSide = isSolidWallCell(x, z - 1) ? 'N' : (isSolidWallCell(x - 1, z) ? 'W' : null);
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
                state.chunkBreakerCount++;
                breakerPositions.push({x: px, z: pz});
                const half = env.cellSize / 2;
                const breakerGroup = new THREE.Group();
                if (mountSide === 'N') {
                    breakerGroup.position.set(px, 1.5, pz - half + 0.11);
                } else {
                    breakerGroup.position.set(px - half + 0.11, 1.5, pz);
                    breakerGroup.rotation.y = Math.PI / 2;
                }
                const shellMat = env.breakerPanelMat || env.pittedMetalMat;
                const breakerBase = new THREE.Mesh(env.breakerBaseGeo, shellMat);
                breakerBase.position.set(0, 0, -0.025);
                breakerGroup.add(breakerBase);
                const breakerDoor = new THREE.Mesh(env.breakerDoorGeo, shellMat);
                breakerDoor.position.set(-0.3, 0, 0.102);
                const breakerHandle = new THREE.Mesh(env.breakerHandleGeo, env.breakerHandleMat);
                breakerHandle.position.set(0.5, 0, 0.05);
                breakerDoor.add(breakerHandle);
                breakerGroup.add(breakerDoor);
                breakerGroup.userData = {type: 'breaker', chunkHash: hash, active: true, door: breakerDoor};
                chunkGroup.add(breakerGroup);
                env.interactables.push(breakerGroup);
            }
        }
    }

    beginMacroChunkContent(hash) {
        const env = this.env;
        const args = env._pendingMacroContent.get(hash);
        if (!args) return;
        env._pendingMacroContent.delete(hash);
        env.isBuildingMacroInterior = true;
        this._profBegin(hash);
        this._buildChunkInterior(args)
            .catch(err => console.error('Macro chunk content build failed:', err))
            .finally(() => {
                this._profEnd();
                env.isBuildingMacroInterior = false;
            });
    }
    isMacroChunkContentReady(hash) {
        const env = this.env;
        if (env._pendingMacroContent.has(hash)) return false;
        const chunkGroup = env.activeChunks.get(hash);
        if (!chunkGroup) return true;
        return chunkGroup.userData.contentReady !== false;
    }
    async _compileInstances(hash, chunkGroup, stagingMeshes, randomFn) {
        const env = this.env;
        let compileStartTime = performance.now();
        const byGeometry = new Map();
        const groups = [];
        for (let i = 0; i < stagingMeshes.length; i++) {
            const mesh = stagingMeshes[i];
            let byMaterial = byGeometry.get(mesh.geometry);
            if (byMaterial === undefined) {
                byMaterial = new Map();
                byGeometry.set(mesh.geometry, byMaterial);
            }
            let matKey = mesh.material;
            if (Array.isArray(matKey)) {
                matKey = 'A';
                for (let m = 0; m < mesh.material.length; m++) matKey += mesh.material[m].uuid;
            }
            let group = byMaterial.get(matKey);
            if (group === undefined) {
                group = {geometry: mesh.geometry, material: mesh.material, meshes: []};
                byMaterial.set(matKey, group);
                groups.push(group);
            }
            group.meshes.push(mesh);
            if (performance.now() - compileStartTime > 5.0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                compileStartTime = performance.now();
            }
        }
        const dummyColor = new THREE.Color();

        const tempGroup = new THREE.Group();

        for (let i = 0; i < groups.length; i++) {
            if (performance.now() - compileStartTime > 5.0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                compileStartTime = performance.now();
            }
            const group = groups[i];
            const isDecal = !Array.isArray(group.material) && (group.material === env.glowMat);
            if (group.meshes.length > 1 && !Array.isArray(group.material)) {
                const iMesh = new THREE.InstancedMesh(group.geometry, group.material, group.meshes.length);
                if (!isDecal) {
                    iMesh.castShadow = (group.material !== env.fenceMat && !group.material.userData.noShadow);
                    iMesh.receiveShadow = true;
                }
                iMesh.userData.chunkHash = hash;
                const isStructural = env._isArchitectural(group.material);
                const needsColor = !isStructural && !isDecal;
                group.meshes.forEach((mesh, index) => {
                    iMesh.setMatrixAt(index, mesh.matrixWorld);
                    if (needsColor) {
                        const shade = 0.85 + (randomFn() * 0.15);
                        dummyColor.setRGB(shade, shade * 0.95, shade * 0.90);
                        iMesh.setColorAt(index, dummyColor);
                    }
                    mesh.visible = false;
                });
                iMesh.instanceMatrix.needsUpdate = true;
                if (needsColor && iMesh.instanceColor) iMesh.instanceColor.needsUpdate = true;
                tempGroup.add(iMesh);
                if (!isDecal) env.walls.push(iMesh);
            } else {
                for (let j = 0; j < group.meshes.length; j++) {
                    const mesh = group.meshes[j];
                    mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                    if (!isDecal) {
                        mesh.castShadow = (!Array.isArray(group.material) && group.material !== env.fenceMat && !group.material.userData.noShadow);
                        mesh.receiveShadow = true;
                        env.walls.push(mesh);
                    }
                    tempGroup.add(mesh);
                }
            }
            if (performance.now() - compileStartTime > 5.0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                compileStartTime = performance.now();
            }
        }

        if (env.activeChunks.has(hash)) {
            while (tempGroup.children.length > 0) {
                chunkGroup.add(tempGroup.children[0]);
            }
            this.warmChunkMaterials(chunkGroup);
        }
    }

    warmChunkMaterials(chunkGroup) {
        const unwarmed = this._unwarmedMaterials(chunkGroup);
        if (unwarmed !== null) this.warmMaterialVariants(unwarmed, false);
    }

    static _warmableOnMeshProbe(material) {
        return !!material && material.isMaterial === true
            && !material.isSpriteMaterial
            && !material.isPointsMaterial
            && !material.isLineBasicMaterial
            && !material.isLineDashedMaterial;
    }

    queueShadowPrewarm(materials) {
        if (!materials) return;
        if (!this._shadowQueue) { this._shadowQueue = []; this._shadowQueued = new Set(); }
        const isMap = materials instanceof Map;
        const entries = isMap ? materials : new Map([...materials].map(m => [m, ALL_PROBE_FORMS]));
        for (const [material, forms] of entries) {
            if (!ChunkManager._warmableOnMeshProbe(material)) continue;
            for (const form of forms) {
                const key = ChunkManager._warmKey(material, form);
                if (this._shadowQueued.has(key)) continue;
                this._shadowQueued.add(key);
                this._shadowQueue.push({material, form});
            }
        }
    }

    _shadowProbeRig() {
        const env = this.env;
        if (this._shadowRig) return this._shadowRig;
        const point = new THREE.PointLight(0xffffff, 1, 10);
        point.castShadow = true;
        point.shadow.mapSize.set(64, 64);
        point.position.set(1, 1, 1);
        const spot = new THREE.SpotLight(0xffffff, 1, 10);
        spot.castShadow = true;
        spot.shadow.mapSize.set(64, 64);
        spot.position.set(1, 1, 1);
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20);
        camera.position.set(0, 0, 3);
        if (!env._probeGeo) env._probeGeo = new THREE.PlaneGeometry(0.001, 0.001);

        const group = new THREE.Group();
        const slots = [];
        for (let i = 0; i < SHADOW_PROBE_BATCH; i++) {
            const coloured = new THREE.InstancedMesh(env._probeGeo, null, 1);
            coloured.setColorAt(0, ChunkManager._probeColor());
            const plain = new THREE.Mesh(env._probeGeo, null);
            const instanced = new THREE.InstancedMesh(env._probeGeo, null, 1);
            const byForm = {plain, instanced, coloured};
            for (const mesh of [plain, instanced, coloured]) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.frustumCulled = false;
                mesh.visible = false;
                group.add(mesh);
            }
            slots.push(byForm);
        }

        this._shadowRig = {
            point, spot, camera, group, slots,
            target: new THREE.WebGLRenderTarget(4, 4),
            scoped: [point, spot, spot.target, group]
        };
        return this._shadowRig;
    }

    drainShadowPrewarm(budgetMs = 2.0) {
        const queue = this._shadowQueue;
        if (!queue || queue.length === 0) return 0;
        const env = this.env;
        const renderer = env.engine && env.engine.renderer;
        if (!renderer) return 0;

        const rig = this._shadowProbeRig();
        const scene = env.scene;
        const savedChildren = scene.children;
        const savedTarget = renderer.getRenderTarget();
        const savedEnabled = renderer.shadowMap.enabled;
        const savedAuto = renderer.shadowMap.autoUpdate;
        let warmed = 0;
        const start = performance.now();
        try {
            scene.children = rig.scoped;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.autoUpdate = true;
            renderer.setRenderTarget(rig.target);
            do {
                let filled = 0;
                const active = [];
                while (filled < rig.slots.length && queue.length > 0) {
                    const entry = queue.pop();
                    if (!entry || !entry.material) break;
                    const probe = rig.slots[filled][entry.form] || rig.slots[filled].plain;
                    probe.material = entry.material;
                    probe.visible = true;
                    active.push(probe);
                    filled++;
                }
                if (filled === 0) break;
                rig.point.shadow.needsUpdate = true;
                rig.spot.shadow.needsUpdate = true;
                renderer.render(scene, rig.camera);
                for (const p of active) {
                    p.material = null;
                    p.visible = false;
                }
                warmed += filled;
            } while (queue.length > 0 && performance.now() - start < budgetMs);
        } catch (err) {
            console.warn('Shadow prewarm failed:', err && err.stack ? err.stack : err);
        } finally {
            for (const slot of rig.slots) {
                for (const p of [slot.plain, slot.instanced, slot.coloured]) {
                    p.material = null;
                    p.visible = false;
                }
            }
            renderer.setRenderTarget(savedTarget);
            renderer.shadowMap.enabled = savedEnabled;
            renderer.shadowMap.autoUpdate = savedAuto;
            scene.children = savedChildren;
        }
        return warmed;
    }

    warmMaterialVariants(materials, drainNow = false) {
        const env = this.env;
        if (!materials || materials.size === 0) return;
        this.queueShadowPrewarm(materials);
        if (!env._programKeepAlive) env._programKeepAlive = [];
        if (!env._warmedMaterials) env._warmedMaterials = new Set();
        if (!env._probeGeo) env._probeGeo = new THREE.PlaneGeometry(0.001, 0.001);
        const keepAlive = env._programKeepAlive;
        const batch = new THREE.Group();

        const isMap = materials instanceof Map;
        const entries = isMap ? materials : new Map([...materials].map(m => [m, ALL_PROBE_FORMS]));

        for (const [material, forms] of entries) {
            for (const form of forms) {
                env._warmedMaterials.add(ChunkManager._warmKey(material, form));
                const clone = material.clone();
                keepAlive.push(clone);
                if (form === 'plain') {
                    batch.add(new THREE.Mesh(env._probeGeo, clone));
                } else if (form === 'instanced') {
                    batch.add(new THREE.InstancedMesh(env._probeGeo, clone, 1));
                } else {
                    const colouredMesh = new THREE.InstancedMesh(env._probeGeo, clone, 1);
                    colouredMesh.setColorAt(0, ChunkManager._probeColor());
                    batch.add(colouredMesh);
                }
            }
        }
        this._scopedCompile(batch, drainNow);
    }

    static _warmKey(material, form) {
        return `${material.uuid}${material.version}|${form}`;
    }

    static _probeColor() {
        if (!ChunkManager.__probeColor) ChunkManager.__probeColor = new THREE.Color(1, 1, 1);
        return ChunkManager.__probeColor;
    }

    _unwarmedMaterials(group) {
        const env = this.env;
        if (!env._warmedMaterials) env._warmedMaterials = new Set();
        const warmed = env._warmedMaterials;
        let unwarmed = null;
        const note = (material, form) => {
            if (!material || !material.isMaterial) return;
            if (warmed.has(ChunkManager._warmKey(material, form))) return;
            if (!unwarmed) unwarmed = new Map();
            let forms = unwarmed.get(material);
            if (!forms) { forms = new Set(); unwarmed.set(material, forms); }
            forms.add(form);
        };
        group.traverse((obj) => {
            const material = obj.material;
            if (!material) return;
            const form = obj.isInstancedMesh
                ? (obj.instanceColor ? 'coloured' : 'instanced')
                : 'plain';
            if (Array.isArray(material)) {
                for (let m = 0; m < material.length; m++) note(material[m], form);
            } else {
                note(material, form);
            }
        });
        return unwarmed;
    }

    _scopedCompile(group, drainNow = false) {
        const env = this.env;
        const scene = env.scene;
        const saved = scene.children;
        const scoped = [];
        for (let i = 0; i < saved.length; i++) {
            const child = saved[i];
            if (child.isLight || child.isCamera) scoped.push(child);
        }
        scoped.push(group);
        scene.children = scoped;
        const wasVisible = group.visible;
        group.visible = true;
        try {
            env.engine.renderer.compile(scene, env.camera);
        } finally {
            group.visible = wasVisible;
            scene.children = saved;
        }
        if (drainNow) this._drainProgramLinks();
    }
    _drainProgramLinks(budgetMs = Infinity, stallMasked = false) {
        const renderer = this.env.engine.renderer;
        const programs = renderer.info.programs;
        if (!programs) return 0;
        if (!this._drainedPrograms) this._drainedPrograms = new WeakSet();
        if (this._parallelExt === undefined) {
            const gl = renderer.getContext();
            this._parallelExt = FORCE_NO_PARALLEL
                ? null
                : (gl.getExtension('KHR_parallel_shader_compile') || null);
            this._gl = gl;
            if (FORCE_NO_PARALLEL) {
                console.warn('[LINKPROF] ?noparallel — forcing the blocking link path.');
            }
        }
        const ext = this._parallelExt;
        const gl = this._gl;
        const polling = ext !== null && budgetMs !== Infinity;
        const limit = (ext === null && budgetMs !== Infinity)
            ? (stallMasked ? MASKED_LINKS_PER_FRAME : BLOCKING_LINKS_PER_FRAME)
            : Infinity;
        const start = performance.now();
        let drained = 0;
        for (let i = 0; i < programs.length; i++) {
            if (drained >= limit) break;
            const program = programs[i];
            if (!program || typeof program.getUniforms !== 'function') continue;
            if (this._drainedPrograms.has(program)) continue;
            if (polling && program.program &&
                !gl.getProgramParameter(program.program, ext.COMPLETION_STATUS_KHR)) continue;
            this._drainedPrograms.add(program);
            program.getUniforms();
            program.getAttributes();
            drained++;
            if (performance.now() - start > budgetMs) break;
        }
        if (LINK_PROFILE && drained > 0) {
            const prof = this._linkProf || (this._linkProf = {links: 0, ms: 0, calls: 0});
            prof.links += drained;
            prof.ms += performance.now() - start;
            prof.calls++;
            if (Math.floor(prof.links / 25) !== Math.floor((prof.links - drained) / 25)) {
                console.log(`[LINKPROF] links=${prof.links} calls=${prof.calls} ` +
                    `total=${prof.ms.toFixed(1)}ms per-link=${(prof.ms / prof.links).toFixed(3)}ms ` +
                    `parallelExt=${ext !== null} cap=${limit}`);
            }
        }
        return drained;
    }

    _forgetMaterialPrograms(material) {
        const warmed = this.env._warmedMaterials;
        if (!warmed) return;
        for (const form of ALL_PROBE_FORMS) {
            warmed.delete(ChunkManager._warmKey(material, form));
        }
    }

}