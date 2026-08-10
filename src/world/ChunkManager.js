/**
 * [ROLE] Tracks which chunks should be loaded around the player and drives their generation, staging, and eviction.
 * [WHY] The maze is infinite; only a bounded window of chunks around the player can exist as live geometry at once.
 * [STATE] Class instance wraps the `env` object, reading/writing env.currentChunkCoords and the chunk cache as the player moves.
 * [DEPENDS] Pulls in TheArchitect and a set of low-probability blueprint profiles (WallBreach, CrawlspaceHall, CreviceHall, RideQueueHall, BreakerPodiumSpawn).
 */
import TheArchitect from "../core/TheArchitect.js";
import {spawnBreakerPodium} from './blueprints/BreakerPodiumSpawn.js';
import {WallBreachProfile} from './blueprints/WallBreach.js';
import {CrawlspaceHallProfile} from './blueprints/CrawlspaceHall.js';
import {CreviceHallProfile} from './blueprints/CreviceHall.js';
import {RideQueueHallProfile} from './blueprints/RideQueueHall.js';

/**
 * Cell coordinates get packed into a single number rather than a `${x},${z}` template string.
 * The occupancy / wall / path sets below are probed tens of thousands of times per chunk, and a
 * string key costs an allocation plus a string hash on every one of them. CELL_KEY_SPAN bounds
 * |z|; past that the packing would alias, which is ~16.7 million world units from the origin --
 * far beyond anything reachable by warping.
 */
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
                minX: startX * env.cellSize + 2,
                maxX: startX * env.cellSize + 58,
                minZ: startZ * env.cellSize + 2,
                maxZ: startZ * env.cellSize + 58,
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
                    
                    const pathThemeRoll = random();
                    let pathTheme = null;
                    if (pathThemeRoll > 0.75) pathTheme = 'CRAWLSPACE_HALL';
                    else if (pathThemeRoll > 0.50) pathTheme = 'CREVICE_HALL';
                    else if (pathThemeRoll > 0.25) pathTheme = 'RIDE_QUEUE_HALL';

                    const cX = startX + Math.floor(env.chunkSize/2);
                    const cZ = startZ + Math.floor(env.chunkSize/2);
                    const pathGrid = new Map();
                    
                    const carvePath = (tx, tz) => {
                        let currX = cX;
                        let currZ = cZ;
                        let failsafe = 0;
                        while ((currX !== tx || currZ !== tz) && failsafe < 200) {
                            pathGrid.set(cellKey(currX, currZ), true);
                            const dx = tx - currX;
                            const dz = tz - currZ;
                            if (Math.abs(dx) > Math.abs(dz)) {
                                currX += Math.sign(dx);
                                if (random() > 0.5 && dz !== 0) currZ += Math.sign(dz);
                                else if (random() > 0.8) currZ += (random() > 0.5 ? 1 : -1);
                            } else {
                                currZ += Math.sign(dz);
                                if (random() > 0.5 && dx !== 0) currX += Math.sign(dx);
                                else if (random() > 0.8) currX += (random() > 0.5 ? 1 : -1);
                            }
                            failsafe++;
                        }
                        pathGrid.set(cellKey(tx, tz), true);
                    };
                    
                    carvePath(startX + 7, startZ);
                    carvePath(startX + 7, startZ + env.chunkSize - 1);
                    carvePath(startX, startZ + 7);
                    carvePath(startX + env.chunkSize - 1, startZ + 7);
                    
                    if (env.airlocks) {
                        for (const airlock of env.airlocks) {
                            const chunkCx = (startX + env.chunkSize/2) * env.cellSize;
                            const chunkCz = (startZ + env.chunkSize/2) * env.cellSize;
                            const dx = airlock.chamberCenter.x - chunkCx;
                            const dz = airlock.chamberCenter.z - chunkCz;
                            if (Math.abs(dx) <= env.chunkSize * env.cellSize && Math.abs(dz) <= env.chunkSize * env.cellSize) {
                                const wox = Math.round(airlock.outerPos.x / env.cellSize);
                                const woz = Math.round(airlock.outerPos.z / env.cellSize);
                                carvePath(wox, woz);
                            }
                        }
                    }

                    ctx.isWall = (wx, wz) => {
                        const key = cellKey(wx, wz);
                        if (isWallGrid.has(key)) return isWallGrid.get(key);
                        
                        let zx = wx * 0.15;
                        let zy = wz * 0.15;
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
                        let isW = iter > 6;
                        const flipSeed = (env.baseSeed + (wx * 104729) + (wz * 1299827)) >>> 0;
                        const flipRand = ((flipSeed * 1664525 + 1013904223) >>> 0) / 4294967296.0;
                        if (flipRand > 0.70) isW = !isW;

                        let isOnPath = pathGrid.has(key);
                        let isNearPath = isOnPath;
                        if (!isNearPath) {
                            for (let ox = -1; ox <= 1; ox++) {
                                for (let oz = -1; oz <= 1; oz++) {
                                    if (pathGrid.has(cellKey(wx + ox, wz + oz))) {
                                        isNearPath = true;
                                        break;
                                    }
                                }
                                if (isNearPath) break;
                            }
                        }

                        if (isNearPath) isW = true;

                        const cx_id = Math.floor(wx / env.chunkSize);
                        const cz_id = Math.floor(wz / env.chunkSize);
                        const lx = wx - (cx_id * env.chunkSize);
                        const lz = wz - (cz_id * env.chunkSize);

                        const isSpawnClear = (cx_id === 0 && cz_id === 0) && (lx <= 4 && lz <= 4);
                        if (isSpawnClear) isW = false;

                        if (isOnPath && !isSpawnClear) {
                            if (pathTheme) {
                                forcedStructuresGrid.set(key, pathTheme);
                            }
                            isW = false;
                        }

                        isWallGrid.set(key, isW);
                        return isW;
                    };
                    
                    ctx.setWall = (wx, wz, val) => isWallGrid.set(cellKey(wx, wz), val);
                    ctx.forceStructure = (wx, wz, name) => forcedStructuresGrid.set(cellKey(wx, wz), name);
                    ctx.getForcedStructure = (wx, wz) => forcedStructuresGrid.get(cellKey(wx, wz));

                    if (!isMacroStructure) {
                        const size = env.chunkSize;
                        const grid = new Int8Array(size * size);
                        const q = [];

                        for (let lx = 0; lx < size; lx++) {
                            for (let lz = 0; lz < size; lz++) {
                                if (!ctx.isWall(startX + lx, startZ + lz)) {
                                    grid[lz * size + lx] = 1;
                                    if (lx === 7 || lz === 7 || lx === 3 || lx === 11 || lz === 3 || lz === 11) {
                                        grid[lz * size + lx] = 2;
                                        q.push({lx, lz});
                                    }
                                }
                            }
                        }

                        if (env.airlocks) {
                            for (const airlock of env.airlocks) {
                                const chunkCx = (startX + size/2) * env.cellSize;
                                const chunkCz = (startZ + size/2) * env.cellSize;
                                const dx = airlock.chamberCenter.x - chunkCx;
                                const dz = airlock.chamberCenter.z - chunkCz;

                                if (Math.abs(dx) <= size * env.cellSize && Math.abs(dz) <= size * env.cellSize) {
                                    const wox = Math.round(airlock.outerPos.x / env.cellSize);
                                    const woz = Math.round(airlock.outerPos.z / env.cellSize);

                                    let clearX = [];
                                    let clearZ = [];
                                    if (airlock.spansX) {
                                        clearX = [wox - 1, wox, wox + 1];
                                        const dir = airlock.outSign;
                                        clearZ = [woz, woz + dir, woz + dir * 2, woz + dir * 3];
                                    } else {
                                        clearZ = [woz - 1, woz, woz + 1];
                                        const dir = airlock.outSign;
                                        clearX = [wox, wox + dir, wox + dir * 2, wox + dir * 3];
                                    }

                                    for (const cx of clearX) {
                                        for (const cz of clearZ) {
                                            const lx = cx - startX;
                                            const lz = cz - startZ;
                                            if (lx >= 0 && lx < size && lz >= 0 && lz < size) {
                                                ctx.setWall(cx, cz, false);
                                                ctx.forceStructure(cx, cz, null);
                                                if (grid[lz * size + lx] !== 2) {
                                                    grid[lz * size + lx] = 2;
                                                    q.push({lx, lz});
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        const totalCells = size * size;
                        const INF = 1 << 30;
                        const bfsDist = new Int32Array(totalCells).fill(INF);
                        const bfsParent = new Int32Array(totalCells).fill(-1);
                        let dqBuf = new Int32Array(totalCells * 8);
                        let dqHead = totalCells * 4;
                        let dqTail = dqHead;
                        const recentre = () => {
                            const used = dqTail - dqHead;
                            const next = new Int32Array(Math.max(dqBuf.length * 2, used * 4));
                            const start = (next.length - used) >> 1;
                            next.set(dqBuf.subarray(dqHead, dqTail), start);
                            dqBuf = next;
                            dqHead = start;
                            dqTail = start + used;
                        };
                        const pushFront = (v) => {
                            if (dqHead === 0) recentre();
                            dqBuf[--dqHead] = v;
                        };
                        const pushBack = (v) => {
                            if (dqTail === dqBuf.length) recentre();
                            dqBuf[dqTail++] = v;
                        };
                        for (const seed of q) {
                            const idx = seed.lz * size + seed.lx;
                            if (bfsDist[idx] === INF) {
                                bfsDist[idx] = 0;
                                pushBack(idx);
                            }
                        }
                        while (dqHead < dqTail) {
                            const idx = dqBuf[dqHead++];
                            const clx = idx % size;
                            const clz = (idx - clx) / size;
                            const d = bfsDist[idx];
                            const neighbors = [[clx + 1, clz], [clx - 1, clz], [clx, clz + 1], [clx, clz - 1]];
                            for (const [nlx, nlz] of neighbors) {
                                if (nlx < 0 || nlz < 0 || nlx >= size || nlz >= size) continue;
                                const nIdx = nlz * size + nlx;
                                const cost = grid[nIdx] === 0 ? 1 : 0;
                                const nd = d + cost;
                                if (nd < bfsDist[nIdx]) {
                                    bfsDist[nIdx] = nd;
                                    bfsParent[nIdx] = idx;
                                    if (cost === 0) {
                                        pushFront(nIdx);
                                    } else {
                                        pushBack(nIdx);
                                    }
                                }
                            }
                        }

                        const forcedOpen = new Set();
                        for (let idx = 0; idx < totalCells; idx++) {
                            if (grid[idx] === 0 || bfsDist[idx] <= 0) continue;
                            let cur = idx;
                            let guard = 0;
                            while (cur !== -1 && bfsDist[cur] > 0 && guard < totalCells) {
                                if (grid[cur] === 0) forcedOpen.add(cur);
                                cur = bfsParent[cur];
                                guard++;
                            }
                        }
                        for (const idx of forcedOpen) {
                            const lx = idx % size;
                            const lz = (idx - lx) / size;
                            const gx = startX + lx;
                            const gz = startZ + lz;
                            ctx.setWall(gx, gz, false);
                            ctx.forceStructure(gx, gz, 'breach');
                        }
                    }
                }

                let isWall = ctx.isWall(x, z);
                const damp = env._dampAt(x, z);
                if (isWall) {
                    wallCells.add(cellKey(x, z));
                    const forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
                    const structRoll = random();
                    const structure = forcedName ? structuralMatrix.find(s => s.name === forcedName) : structuralMatrix.find(s => structRoll >= s.prob);
                    if (structure) {
                        structure.build(x, z);
                    } else {
                        solidWallCells.add(cellKey(x, z));
                        const wall = ctx.buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                        wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                        ctx.addGeometry(wall);
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
        await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
        if (env.activeChunks.has(hash)) {
            chunkGroup.userData.contentReady = true;
        }
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

        const forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
        if (forcedName === 'breach') {
            hasTallObstacle = true;
            const breachProfile = WallBreachProfile(env, ctx);
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
        
        const floorRoll = random();
        if (!hasTallObstacle && floorRoll > 0.80 && !isArtery) {
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
            // Compile the finished chunk, not just the batch that came through staging. Plenty of
            // content never passes through stagingMeshes at all -- buildVendingMachine does
            // chunkGroup.add(body) directly, as do sector foundations, void canopies, entrance
            // hallways, observers and grates. Compiling only tempGroup left those materials to
            // link lazily on the first frame that drew them, which is precisely the 1652ms
            // getProgramParameter spike measured on Atrium entry.
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
        // Traverses rather than walking direct children: nested content (a vending machine's
        // emissive panel parented to its body, furniture groups, hallway set pieces) carries
        // materials of its own, and those are exactly the ones that used to slip through.
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
        // Forced visible for the duration. r128's compile walks the graph to find what to
        // initialise, so an invisible group could be skipped; restored immediately afterwards so
        // the caller keeps ownership of real visibility.
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