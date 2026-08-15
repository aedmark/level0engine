/**
 * [ROLE] Tracks which chunks should be loaded around the player and drives their generation, staging, and eviction.
 * [WHY] The maze is infinite; only a bounded window of chunks around the player can exist as live geometry at once.
 * [STATE] Class instance wraps the `env` object, reading/writing env.currentChunkCoords and the chunk cache as the player moves.
 * [DEPENDS] Pulls in TheArchitect and a set of low-probability blueprint profiles (WallBreach, CrawlspaceHall, CreviceHall, RideQueueHall, BreakerPodiumSpawn).
 */
import TheArchitect from "../core/TheArchitect.js";
import StructureKit from "./StructureKit.js";
import {spawnBreakerPodium} from './blueprints/BreakerPodiumSpawn.js';
import {EmptyDoorFrameProfile} from './blueprints/EmptyDoorFrame.js';
import {CrawlspaceDuctProfile} from './blueprints/CrawlspaceDuct.js';
import {CrawlspaceHallProfile} from './blueprints/CrawlspaceHall.js';
import {CreviceHallProfile} from './blueprints/CreviceHall.js';
import {RideQueueHallProfile} from './blueprints/RideQueueHall.js';
import BootController from '../ui/BootController.js';

const CELL_KEY_SPAN = 4194304;
const cellKey = (x, z) => x * (CELL_KEY_SPAN * 2) + z;

export default class ChunkManager {
    constructor(env) {
        this.env = env;
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
        const chunkGroup = new THREE.Group();
        env.scene.add(chunkGroup);
        env.activeChunks.set(hash, chunkGroup);
        let structuralShift = 0;
        if (env.player && env.player.paranoia > 0.6) {
            structuralShift = Math.floor(env.player.paranoia * 1000) * (chunkX % 2 === 0 ? 1 : -1);
        }
        let prngSeed = (env.baseSeed + structuralShift + (chunkX * 104729) + (chunkZ * 1299827)) >>> 0;
        const random = () => {
            prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
            return prngSeed / 4294967296.0;
        };
        const stagingMeshes = [];
        const ctx = env._createChunkHelpers(hash, chunkGroup, stagingMeshes, random);
        const startX = chunkX * env.chunkSize;
        const startZ = chunkZ * env.chunkSize;
        let isMacroStructure = false;
        if (env.discoveredSectors.has(hash)) {
            isMacroStructure = true;
            env._macroChunkHashes.add(hash);
        } else {
            isMacroStructure = random() > 0.60 &&
                Math.max(Math.abs(chunkX), Math.abs(chunkZ)) >= env.macroSpawnExclusionRadius;
            if (isMacroStructure) {
                const spacing = env.macroMinSpacingChunks;
                let tooCloseToAnotherMacro = false;
                for (let dx = -spacing; dx <= spacing && !tooCloseToAnotherMacro; dx++) {
                    for (let dz = -spacing; dz <= spacing; dz++) {
                        if (dx === 0 && dz === 0) continue;
                        if (env._macroChunkHashes.has(`${chunkX + dx},${chunkZ + dz}`)) {
                            tooCloseToAnotherMacro = true;
                            break;
                        }
                    }
                }
                if (tooCloseToAnotherMacro) {
                    isMacroStructure = false;
                } else {
                    env._macroChunkHashes.add(hash);
                }
            }
        }
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
            const poolKey = isExitPhase ? 'exit' : 'normal';
            let activeSectorId;
            if (env.discoveredSectors.has(hash)) {
                activeSectorId = env.discoveredSectors.get(hash);
            } else {
                if (!env._sectorBags) env._sectorBags = {};
                if (!env._sectorBags[poolKey] || env._sectorBags[poolKey].length === 0) {
                    const ids = sectorMatrix
                        .filter(s => isExitPhase ? s.id !== "CHECKPOINT" : s.id !== "EXIT")
                        .map(s => s.id);
                    for (let i = ids.length - 1; i > 0; i--) {
                        const j = Math.floor(random() * (i + 1));
                        const tmp = ids[i];
                        ids[i] = ids[j];
                        ids[j] = tmp;
                    }
                    env._sectorBags[poolKey] = ids;
                }
                activeSectorId = env._sectorBags[poolKey].pop();
                env.discoveredSectors.set(hash, activeSectorId);
            }
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
        for (let x = startX; x < startX + env.chunkSize; x++) {
            for (let z = startZ; z < startZ + env.chunkSize; z++) {
                if (!env.activeChunks.has(hash)) return;
                if (performance.now() - chunkStartTime > 5.0) {
                    this.warmChunkMaterials(chunkGroup);
                    await new Promise(resolve => setTimeout(resolve, 0));
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

                    let structuralShift = 0;
                    if (env.player && env.player.paranoia > 0.6) {
                        structuralShift = Math.floor(env.player.paranoia * 1000) * (chunkX % 2 === 0 ? 1 : -1);
                    }

                    const airlocksCopy = env.airlocks ? env.airlocks.map(a => ({
                        outerPos: {x: a.outerPos.x, z: a.outerPos.z},
                        chamberCenter: {x: a.chamberCenter.x, z: a.chamberCenter.z},
                        outSign: a.outSign,
                        spansX: a.spansX
                    })) : null;

                    const mathData = await new Promise(resolve => {
                        this.workerResolvers.set(hash, resolve);
                        this.worker.postMessage({
                            hash, chunkX, chunkZ, startX, startZ,
                            chunkSize: env.chunkSize, cellSize: env.cellSize,
                            baseSeed: env.baseSeed, cx, cy, structuralShift,
                            airlocks: airlocksCopy
                        });
                    });

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
                                if (m.userData.isDefaultWall && m.userData.cellX === wx && m.userData.cellZ === wz) {
                                    stagingMeshes.splice(i, 1);
                                } else if (m.userData.noCollision || m.userData.isMiniDoor) {
                                    continue;
                                } else if (
                                    Math.abs(m.position.x - clearX) < halfCell &&
                                    Math.abs(m.position.z - clearZ) < halfCell
                                ) {
                                    stagingMeshes.splice(i, 1);
                                }
                            }
                        }
                    };
                    ctx.forceStructure = (wx, wz, name) => mathData.forcedStructuresGrid.set(cellKey(wx, wz), name);
                    ctx.getForcedStructure = (wx, wz) => mathData.forcedStructuresGrid.get(cellKey(wx, wz));
                    /**
                     * True where an open cell has had its headroom dropped below standing height.
                     *
                     * [WHY] Duct blueprints use this to refuse an exit. A grate opening into a
                     * crawl-height corridor leaves nowhere to stand up and line yourself up with
                     * the hatch -- you arrive already crouched, in a space too low to rise in. The
                     * pathTheme pass themes a whole corridor run this way in a quarter of chunks,
                     * and ducts take roughly a fifth of all wall cells, so the two meet often.
                     *
                     * Answerable here because CRAWLSPACE_HALL is assigned in the pre-pass, well
                     * before any duct rolls its structure -- a randomly placed duct can still see
                     * the hall coming even though the reverse is not true.
                     */
                    ctx.isLowClearance = (wx, wz) =>
                        mathData.forcedStructuresGrid.get(cellKey(wx, wz)) === 'CRAWLSPACE_HALL';
                    ctx.getDoorwayPlan = (px, pz) => mathData.doorwayPlans.get(cellKey(px, pz)) || null;
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
                    /** [WHY] A blueprint may decline the cell by returning false -- The Oasis does
                     * this once its chunk already has one. Treat that exactly like no match at all
                     * and fall through to a plain wall, so declining never leaves a hole and never
                     * grows a second untagged wall implementation. */
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
        if (performance.now() - chunkStartTime > 5.0) {
            this.warmChunkMaterials(chunkGroup);
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!env.activeChunks.has(hash)) return;
        }
        if (env._breachWalls && env._breachWalls.length > 0) {
            const toRemoveGroup = [];
            const toRemoveStaging = [];
            for (const wall of env._breachWalls) {
                wall.updateMatrixWorld(true);
                if (!wall.geometry.boundingBox) wall.geometry.computeBoundingBox();
                const box = wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
                
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
                            if (chunkGroup.children.includes(child)) toRemoveGroup.push(child);
                            else toRemoveStaging.push(child);
                        }
                    }
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
                        const box = wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
                        if (box.containsPoint(f.position)) return false;
                    }
                    return true;
                });
            }
            env._breachWalls = [];
        }
        await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
        if (env.activeChunks.has(hash)) {
            chunkGroup.userData.contentReady = true;
        }
    }

    /**
     * Lays out hinged doorways and the corridors behind them, before any geometry is staged.
     *
     * This has to happen in the pre-pass. Carving from inside the build loop could only ever
     * claim cells the loop had not yet reached -- x-major iteration, so the half-plane ahead
     * of the cursor -- which pinned every door to a +Z facing. Nothing is built yet here, so
     * a run is free to head in any of the four directions.
     *
     * A plan reserves three kinds of cell: the corridor itself (opened), the alcove recesses
     * hanging off it (left as wall so their profiles read as a shallow nook), and a seal of
     * plain wall around the whole thing. The seal is the point of the exercise -- unforced
     * border cells roll the full structural matrix and land on header gaps, vents and tunnels,
     * which perforates the space and reduces the door to decoration.
     *
     * @param {Object} ctx - Chunk helper context (isWall/setWall/forceStructure/markOccupied)
     * @param {Function} random - The chunk's seeded RNG
     * @param {number} startX - Chunk origin cell X
     * @param {number} startZ - Chunk origin cell Z
     * @param {number} size - Chunk size in cells
     * @param {Function} cellKey - Cell coordinate hasher
     * @param {Map} outPlans - Receives cellKey -> {rot, facing} for each planted door
     */
    _planDoorways(ctx, random, startX, startZ, size, cellKey, outPlans) {
        const DOORWAY_RATE = 0.08;
        const RUN_MIN = 4;
        const RUN_MAX = 8;
        const SOLID = "SOLID FILL";
        const DIRS = [{dx: 0, dz: 1}, {dx: 1, dz: 0}, {dx: 0, dz: -1}, {dx: -1, dz: 0}];

        const endX = startX + size - 1;
        const endZ = startZ + size - 1;
        const inChunk = (cx, cz) => cx >= startX && cx <= endX && cz >= startZ && cz <= endZ;
        const reserved = new Set();
        const approaches = new Set();

        for (let cx = startX; cx <= endX; cx++) {
            for (let cz = startZ; cz <= endZ; cz++) {
                if (reserved.has(cellKey(cx, cz))) continue;
                if (ctx.getForcedStructure && ctx.getForcedStructure(cx, cz)) continue;
                /** [WHY] Redundant today -- apron cells are non-wall, so the next line already
                 *  rejects them as seeds -- and deliberately kept. It states the intent where a
                 *  reader looks for it, and it costs no `random()` draw because both checks sit
                 *  above the DOORWAY_RATE roll, so adding it does not shift any seed. */
                if (this._isAirlockApron(cx, cz)) continue;
                if (!ctx.isWall(cx, cz)) continue;
                if (random() > DOORWAY_RATE) continue;

                const offset = Math.floor(random() * DIRS.length);
                let plan = null;
                let dir = null;
                for (let d = 0; d < DIRS.length && !plan; d++) {
                    const cand = DIRS[(d + offset) % DIRS.length];
                    const approachX = cx - cand.dx;
                    const approachZ = cz - cand.dz;
                    if (!inChunk(approachX, approachZ)) continue;
                    if (ctx.isWall(approachX, approachZ)) continue;
                    plan = this._planDoorwayRun(ctx, random, cx, cz, cand, inChunk, cellKey, reserved, approaches, RUN_MIN, RUN_MAX);
                    if (plan) dir = cand;
                }
                if (!plan) continue;

                const key = (a, b) => cellKey(a, b);
                const apply = (p, dx, dz, facing) => {
                    p.corridor.forEach(c => {
                        ctx.setWall(c.cx, c.cz, false);
                        ctx.forceStructure(c.cx, c.cz, null);
                        reserved.add(key(c.cx, c.cz));
                    });
                    p.alcoves.forEach(c => {
                        ctx.setWall(c.cx, c.cz, true);
                        ctx.forceStructure(c.cx, c.cz, random() > 0.5 ? "ALCOVE CORNER" : "ROUND ALCOVE");
                        reserved.add(key(c.cx, c.cz));
                    });
                    p.seal.forEach(c => {
                        ctx.setWall(c.cx, c.cz, true);
                        ctx.forceStructure(c.cx, c.cz, SOLID);
                        reserved.add(key(c.cx, c.cz));
                    });
                    ctx.setWall(dx, dz, true);
                    ctx.forceStructure(dx, dz, "HINGED DOORWAY");
                    reserved.add(key(dx, dz));
                    reserved.add(key(dx - facing.dx, dz - facing.dz));
                    approaches.add(key(dx - facing.dx, dz - facing.dz));
                    outPlans.set(key(dx, dz), {rot: Math.atan2(facing.dx, facing.dz), facing});
                };

                apply(plan, cx, cz, dir);

                let pending = plan.terminus;
                let chainBudget = 2;
                while (pending) {
                    const t = pending;
                    pending = null;
                    if (t.name !== "HINGED DOORWAY") {
                        ctx.setWall(t.cx, t.cz, t.name === "DUCT OR VENT" || t.name === "CRAWLSPACE_DUCT");
                        ctx.forceStructure(t.cx, t.cz, t.name);
                        reserved.add(key(t.cx, t.cz));
                        break;
                    }
                    const nextPlan = chainBudget-- > 0
                        ? this._planDoorwayRun(ctx, random, t.cx, t.cz, t.heading, inChunk, cellKey, reserved, approaches, RUN_MIN, RUN_MAX)
                        : null;
                    if (!nextPlan) {
                        const exits = ["CRAWLSPACE_HALL", "CRAWLSPACE_HALL", "CRAWLSPACE_HALL", "empty_door_frame", "DUCT OR VENT", "DUCT OR VENT", "DUCT OR VENT", "CREVICE_HALL", "CRAWLSPACE_DUCT", "CRAWLSPACE_DUCT", "CRAWLSPACE_DUCT"];
                        t.name = exits[Math.floor(random() * exits.length)];
                        ctx.setWall(t.cx, t.cz, t.name === "DUCT OR VENT" || t.name === "CRAWLSPACE_DUCT");
                        ctx.forceStructure(t.cx, t.cz, t.name);
                        reserved.add(key(t.cx, t.cz));
                        break;
                    }
                    apply(nextPlan, t.cx, t.cz, t.heading);
                    pending = nextPlan.terminus;
                }
            }
        }
    }

    /**
     * Walks one winding run out from a doorway, gathering the corridor, its alcove recesses,
     * the seal around both, and how it ends. Returns null if there isn't room for a run worth
     * having, which lets the caller try another facing.
     */
    _planDoorwayRun(ctx, random, doorX, doorZ, dir, inChunk, cellKey, reserved, approaches, runMin, runMax) {
        const claimed = new Set();
        const key = (a, b) => cellKey(a, b);
        const approachX = doorX - dir.dx;
        const approachZ = doorZ - dir.dz;
        const isApproach = (cx, cz) => cx === approachX && cz === approachZ;
        const touchesApproach = (cx, cz) => {
            if (Math.abs(cx - approachX) + Math.abs(cz - approachZ) === 1) return true;
            return approaches.has(key(cx + 1, cz)) || approaches.has(key(cx - 1, cz)) ||
                   approaches.has(key(cx, cz + 1)) || approaches.has(key(cx, cz - 1));
        };
        /** [WHY] The apron test belongs here rather than at the call site because `free` is the
         *  single chokepoint every corridor cell and every alcove passes through. The airlock
         *  clearance runs earlier in the pre-pass and marks its cells with `forceStructure(null)`,
         *  which is falsy -- so the seed filter's `getForcedStructure` check waves them through,
         *  and a run seeded on an ordinary wall elsewhere in the chunk was free to wind straight
         *  across the approach the clearance exists to keep empty. Measured before this line:
         *  4.4 of the apron's 12 cells rebuilt on an average chunk. */
        const free = (cx, cz) => inChunk(cx, cz) &&
            !this._isAirlockApron(cx, cz) &&
            !reserved.has(key(cx, cz)) && !claimed.has(key(cx, cz)) &&
            !isApproach(cx, cz) &&
            !(cx === doorX && cz === doorZ);
        const contacts = (cx, cz) => {
            let n = 0;
            if (claimed.has(key(cx + 1, cz))) n++;
            if (claimed.has(key(cx - 1, cz))) n++;
            if (claimed.has(key(cx, cz + 1))) n++;
            if (claimed.has(key(cx, cz - 1))) n++;
            return n;
        };

        let cur = {cx: doorX + dir.dx, cz: doorZ + dir.dz};
        if (!free(cur.cx, cur.cz) || touchesApproach(cur.cx, cur.cz)) return null;

        const corridor = [cur];
        const alcoves = [];
        claimed.add(key(cur.cx, cur.cz));
        let heading = {dx: dir.dx, dz: dir.dz};
        const runLength = runMin + Math.floor(random() * (runMax - runMin + 1));

        for (let step = 1; step < runLength; step++) {
            const left = {dx: -heading.dz, dz: heading.dx};
            const right = {dx: heading.dz, dz: -heading.dx};
            const options = random() > 0.62
                ? (random() > 0.5 ? [left, right, heading] : [right, left, heading])
                : [heading, left, right];
            let advanced = null;
            for (const cand of options) {
                const nx = cur.cx + cand.dx;
                const nz = cur.cz + cand.dz;
                if (!free(nx, nz) || contacts(nx, nz) > 1 || touchesApproach(nx, nz)) continue;
                advanced = {cand, nx, nz};
                break;
            }
            if (!advanced) break;

            if (advanced.cand.dx !== heading.dx || advanced.cand.dz !== heading.dz) {
                const nook = {cx: cur.cx + heading.dx, cz: cur.cz + heading.dz};
                if (free(nook.cx, nook.cz) && random() > 0.35) {
                    claimed.add(key(nook.cx, nook.cz));
                    alcoves.push(nook);
                }
            }
            heading = advanced.cand;
            cur = {cx: advanced.nx, cz: advanced.nz};
            corridor.push(cur);
            claimed.add(key(cur.cx, cur.cz));
        }

        if (corridor.length < 2) return null;

        const sealSet = new Set();
        const seal = [];
        corridor.concat(alcoves).forEach(c => {
            for (let ox = -1; ox <= 1; ox++) {
                for (let oz = -1; oz <= 1; oz++) {
                    if (!ox && !oz) continue;
                    const sx = c.cx + ox;
                    const sz = c.cz + oz;
                    if (!inChunk(sx, sz)) continue;
                    if (claimed.has(key(sx, sz))) continue;
                    if (sx === doorX && sz === doorZ) continue;
                    if (isApproach(sx, sz)) continue;
                    /** [WHY] Seal cells are walls, and a seal landing in the apron is a wall
                     *  planted in the middle of the cleared approach. `SOLID FILL` was the single
                     *  largest intruder at 3.96 cells per chunk. */
                    if (this._isAirlockApron(sx, sz)) continue;
                    if (reserved.has(key(sx, sz))) continue;
                    if (sealSet.has(key(sx, sz))) continue;
                    sealSet.add(key(sx, sz));
                    seal.push({cx: sx, cz: sz});
                }
            }
        });

        let terminus = null;
        const last = corridor[corridor.length - 1];
        const beyond = {cx: last.cx + heading.dx, cz: last.cz + heading.dz};
        /** [WHY] `beyond` is one cell past the corridor and never passes through `free`, so it
         *  needs the apron test spelled out. This is the path that put a HINGED DOORWAY inside a
         *  cleared approach on ~10% of chunks -- a door standing in open floor with no wall
         *  around it, because the clearance had already removed everything it would have hung in.
         *  Refusing the terminus here just dead-ends the run, which is one of the three endings
         *  a run is already allowed to have, so nothing downstream needs to change. */
        if (inChunk(beyond.cx, beyond.cz) && !reserved.has(key(beyond.cx, beyond.cz)) &&
            !claimed.has(key(beyond.cx, beyond.cz)) && !isApproach(beyond.cx, beyond.cz) &&
            !this._isAirlockApron(beyond.cx, beyond.cz)) {
            const endRoll = random();
            if (endRoll > 0.60) {
                terminus = {cx: beyond.cx, cz: beyond.cz, name: "HINGED DOORWAY", heading};
            } else if (endRoll > 0.05) {
                const exits = ["CRAWLSPACE_HALL", "CRAWLSPACE_HALL", "CRAWLSPACE_HALL", "empty_door_frame", "DUCT OR VENT", "DUCT OR VENT", "DUCT OR VENT", "CREVICE_HALL", "CRAWLSPACE_DUCT", "CRAWLSPACE_DUCT", "CRAWLSPACE_DUCT"];
                terminus = {cx: beyond.cx, cz: beyond.cz, name: exits[Math.floor(random() * exits.length)], heading};
            }
        }

        return {corridor, alcoves, seal, terminus, heading};
    }

    /**
     * The cells kept clear in front of an airlock: 3 wide by 4 deep, running
     * outward from the outer door. Single source of truth for both the wall-grid
     * clearance and the empty-cell obstacle suppression, so the two can't drift.
     * @param {Object} airlock - Entry from env.airlocks
     * @returns {{clearX: number[], clearZ: number[]}} Cell coords, in grid units
     */
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

    /**
     * True if a cell sits in any active airlock's approach apron.
     * @param {number} x - Cell X in grid units
     * @param {number} z - Cell Z in grid units
     */
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

        if (!state.spawnedVirtualBreaker && env._virtualBreaker && env._virtualBreaker.chunkHash === hash && !env._virtualBreaker.spawned) {
            spawnBreakerPodium(env, ctx, x, z);
            env._virtualBreaker.spawned = true;
            env._virtualBreaker.mesh = env.interactables[env.interactables.length - 1];
            state.spawnedVirtualBreaker = true;
            hasTallObstacle = true;
        }

        let forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
        /**
         * A cell that would block or cramp a neighbouring duct mouth gives up its treatment.
         *
         * [WHY] Duct blueprints already refuse to open a grate into a crawl-height cell, but that
         * only helps when the duct rolls at random -- a duct placed here on purpose, as the
         * terminus of a corridor run, would just lose its only exit and collapse into plain wall,
         * taking the set piece with it. So when both sides were placed deliberately, the corridor
         * treatment is the one that yields: the cell reverts to full height, leaving somewhere to
         * stand up and line yourself up with the hatch.
         *
         * CRAWLSPACE_HALL matters most here because pathTheme themes whole corridor runs with it,
         * so a hall very often lands right where a duct wants its door.
         */
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
        this._buildChunkInterior(args)
            .catch(err => console.error('Macro chunk content build failed:', err))
            .finally(() => { env.isBuildingMacroInterior = false; });
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

    /**
     * [ROLE] Ensures everything currently parented under `chunkGroup` has linked programs.
     * [WHY] Called before every yield in the build loops, not just at the end. The loops yield
     *       every 5ms and animate() renders during those yields, so a chunk is on screen and being
     *       drawn while it is still filling in. Anything a sector adds straight to chunkGroup --
     *       vending machines, foundations, void canopies, entrance hallways -- would otherwise be
     *       drawn before its program was linked, and that first draw blocks for as long as the
     *       link takes.
     * [NOTE] An earlier attempt hid the chunk for the whole build instead. That worked, but it
     *        also meant the ~9 chunks queued on entering a sector all stayed invisible until each
     *        finished, so the world blinked out for a second or two once the sector-load screen
     *        lifted. Warming per yield keeps the original progressive fill-in.
     */
    warmChunkMaterials(chunkGroup) {
        const unwarmed = this._unwarmedMaterials(chunkGroup);
        if (unwarmed !== null) this.warmMaterialVariants(unwarmed);
    }

    /**
     * [ROLE] Guarantees every (material, instancing variant) pair has a fully linked program.
     * [WHY] renderer.compile() cannot do this on its own: it dedupes per material, calling
     *       initMaterial once for whichever object it reached first. A material used by both a
     *       plain Mesh and an InstancedMesh in the same chunk therefore gets only one of its two
     *       programs compiled, and the other links on the first frame that draws it -- measured at
     *       200-400ms hitches while simply walking through fresh chunks. Compiling one explicit
     *       probe per variant sidesteps the dedupe entirely.
     * [WHY-2] The probes are retained for the life of the page. three refcounts programs per
     *       material, so when a chunk is evicted and its materials disposed the program would
     *       otherwise be destroyed and need relinking the next time that permutation appears.
     *       A retained clone keeps the refcount above zero.
     * [NOTE] The chunk's own material instances are deliberately not compiled here. They share a
     *        cache key with their probe, so their first draw is a cache hit with no link.
     */
    warmMaterialVariants(materials) {
        const env = this.env;
        if (!materials || materials.size === 0) return;
        if (!env._programKeepAlive) env._programKeepAlive = [];
        if (!env._warmedMaterials) env._warmedMaterials = new Set();
        if (!env._probeGeo) env._probeGeo = new THREE.PlaneGeometry(0.001, 0.001);
        const keepAlive = env._programKeepAlive;
        const batch = new THREE.Group();
        for (const material of materials) {
            env._warmedMaterials.add(material.uuid + material.version);
            const plain = material.clone();
            keepAlive.push(plain);
            batch.add(new THREE.Mesh(env._probeGeo, plain));

            const instanced = material.clone();
            keepAlive.push(instanced);
            batch.add(new THREE.InstancedMesh(env._probeGeo, instanced, 1));

            const coloured = material.clone();
            keepAlive.push(coloured);
            const colouredMesh = new THREE.InstancedMesh(env._probeGeo, coloured, 1);
            colouredMesh.setColorAt(0, ChunkManager._probeColor());
            batch.add(colouredMesh);
        }
        this._scopedCompile(batch);
    }

    static _probeColor() {
        if (!ChunkManager.__probeColor) ChunkManager.__probeColor = new THREE.Color(1, 1, 1);
        return ChunkManager.__probeColor;
    }

    /**
     * [ROLE] Returns the materials in `group` that have not been warmed yet, or null when there is
     *        nothing new and the whole compile can be skipped -- the common case once the world
     *        has been running for a bit.
     * [WHY] Tracked per material rather than per (material, variant): warmMaterialVariants always
     *       builds all three variants, so a material is either fully covered or not covered at all.
     *       An earlier version tracked variants separately, which meant a material first seen as a
     *       plain Mesh was marked done and then linked again the first time it appeared instanced.
     */
    _unwarmedMaterials(group) {
        const env = this.env;
        if (!env._warmedMaterials) env._warmedMaterials = new Set();
        const warmed = env._warmedMaterials;
        let unwarmed = null;
        const note = (material) => {
            if (warmed.has(material.uuid + material.version)) return;
            (unwarmed || (unwarmed = new Set())).add(material);
        };
        group.traverse((obj) => {
            const material = obj.material;
            if (!material) return;
            if (Array.isArray(material)) {
                for (let m = 0; m < material.length; m++) note(material[m]);
            } else {
                note(material);
            }
        });
        return unwarmed;
    }

    /**
     * [ROLE] Compiles `group` against the live lighting rig without walking the rest of the scene.
     * [WHY] r128's renderer.compile() traverses everything under the scene it is handed. Passing
     *       env.scene meant every chunk build re-visited every mesh in every live chunk. The
     *       program permutation only depends on the lights (and the camera, which carries the
     *       flashlight), so swapping children to just those plus the new batch produces an
     *       identical compile for a fraction of the traversal.
     * [HACK] Reaches into scene.children directly. Nothing else can run during the synchronous
     *        compile call, and the array is restored in a finally block.
     */
    _scopedCompile(group) {
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
        this._drainProgramLinks();
    }

    /**
     * [ROLE] Forces every issued shader link to finish now, while the sector-load freeze screen is
     *        still up, instead of on the next frame that happens to draw the new material.
     * [WHY] renderer.compile() calls gl.linkProgram but never waits on the result, and with
     *       checkShaderErrors off nothing else does either -- r128 only blocks when
     *       WebGLProgram.getUniforms() lazily asks for ACTIVE_UNIFORMS, which is the first *draw*.
     *       Measured: one frame spending 1604ms across 16 getProgramParameter calls right after an
     *       Atrium chunk landed, with the shadow pass at 1ms and buffer uploads not even
     *       registering. Draining here keeps the cost inside the build, where the loading screen
     *       already covers it, and because every linkProgram in the batch has been issued before
     *       the first blocking query the driver is free to have linked them in parallel.
     * [NOTE] getUniforms/getAttributes memoise internally, so re-touching known programs is free --
     *        no bookkeeping needed on our side.
     */
    _drainProgramLinks() {
        const programs = this.env.engine.renderer.info.programs;
        if (!programs) return;
        for (let i = 0; i < programs.length; i++) {
            const program = programs[i];
            if (!program || typeof program.getUniforms !== 'function') continue;
            program.getUniforms();
            program.getAttributes();
        }
    }

    /**
     * [WHY] A disposed material must drop out of the warmed set, or a later material that happened
     *       to reuse its uuid would be skipped. The program itself survives regardless -- the
     *       retained probe clone in _programKeepAlive holds the reference.
     */
    _forgetMaterialPrograms(material) {
        const warmed = this.env._warmedMaterials;
        if (warmed) warmed.delete(material.uuid + material.version);
    }

}