import TheArchitect from "../core/TheArchitect.js";
import {spawnBreakerPodium} from './blueprints/BreakerPodiumSpawn.js';
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
                        if (!env.sharedAssets.has(mat.uuid)) mat.dispose();
                    }
                } else if (child.material && !env.sharedAssets.has(child.material.uuid)) {
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
        ctx.markOccupied = (ox, oz) => occupied.add(`${ox},${oz}`);
        ctx.isOccupied = (ox, oz) => occupied.has(`${ox},${oz}`);
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
        let chunkBreakerCount = 0;
        const breakerPositions = [];
        const wallCells = new Set();
        const isWallCell = (wx, wz) => wallCells.has(`${wx},${wz}`);
        const solidWallCells = new Set();
        const isSolidWallCell = (wx, wz) => solidWallCells.has(`${wx},${wz}`);
        let chunkStartTime = performance.now();
        let spawnedVirtualBreaker = false;
        for (let x = startX; x < startX + env.chunkSize; x++) {
            for (let z = startZ; z < startZ + env.chunkSize; z++) {
                if (!env.activeChunks.has(hash)) return;
                if (performance.now() - chunkStartTime > 5.0) {
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
                    const isWallGrid = new Map();
                    ctx.isWall = (wx, wz) => {
                        const key = `${wx},${wz}`;
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
                        
                        const cx_id = Math.floor(wx / env.chunkSize);
                        const cz_id = Math.floor(wz / env.chunkSize);
                        const lx = wx - (cx_id * env.chunkSize);
                        const lz = wz - (cz_id * env.chunkSize);
                        const inNRing = lz === 3 && lx >= 3 && lx <= 11;
                        const inSRing = lz === 11 && lx >= 3 && lx <= 11;
                        const inWRing = lx === 3 && lz >= 3 && lz <= 11;
                        const inERing = lx === 11 && lz >= 3 && lz <= 11;
                        const inNPath = lx >= 6 && lx <= 8 && lz <= 3;
                        const inSPath = lx >= 6 && lx <= 8 && lz >= 11;
                        const inWPath = lz >= 6 && lz <= 8 && lx <= 3;
                        const inEPath = lz >= 6 && lz <= 8 && lx >= 11;
                        const isArtery = inNRing || inSRing || inWRing || inERing || inNPath || inSPath || inWPath || inEPath;
                        const isBlocker = lx >= 5 && lx <= 9 && lz >= 5 && lz <= 9;
                        const isSpawnClear = (cx_id === 0 && cz_id === 0) && (lx <= 3 && lz <= 3);
                        if (isBlocker) isW = true;
                        if (isArtery || isSpawnClear) isW = false;
                        
                        isWallGrid.set(key, isW);
                        return isW;
                    };
                    ctx.setWall = (wx, wz, val) => isWallGrid.set(`${wx},${wz}`, val);
                    const forcedStructuresGrid = new Map();
                    ctx.forceStructure = (wx, wz, name) => forcedStructuresGrid.set(`${wx},${wz}`, name);
                    ctx.getForcedStructure = (wx, wz) => forcedStructuresGrid.get(`${wx},${wz}`);
                    
                    if (!isMacroStructure) {
                        const size = env.chunkSize;
                        const grid = new Int8Array(size * size);
                        const q = [];
                        
                        for (let lx = 0; lx < size; lx++) {
                            for (let lz = 0; lz < size; lz++) {
                                if (!ctx.isWall(startX + lx, startZ + lz)) {
                                    grid[lz * size + lx] = 1; // Empty
                                    if (lx === 7 || lz === 7 || lx === 3 || lx === 11 || lz === 3 || lz === 11) {
                                        grid[lz * size + lx] = 2; // Artery
                                        q.push({lx, lz});
                                    }
                                }
                            }
                        }
                        
                        // Carve path for airlocks
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
                        
                        // Flood-fill from arteries
                        const dirs = [{x:1,z:0}, {x:-1,z:0}, {x:0,z:1}, {x:0,z:-1}];
                        while (q.length > 0) {
                            const {lx, lz} = q.pop();
                            for (const d of dirs) {
                                const nx = lx + d.x, nz = lz + d.z;
                                if (nx >= 0 && nx < size && nz >= 0 && nz < size && grid[nz * size + nx] === 1) {
                                    grid[nz * size + nx] = 2;
                                    q.push({lx: nx, lz: nz});
                                }
                            }
                        }
                        
                        // Find enclosed pockets
                        for (let lx = 0; lx < size; lx++) {
                            for (let lz = 0; lz < size; lz++) {
                                if (grid[lz * size + lx] === 1) {
                                    const pocket = [];
                                    const pq = [{lx, lz}];
                                    grid[lz * size + lx] = 3;
                                    pocket.push({lx, lz});
                                    
                                    let touchesEdge = false;
                                    while (pq.length > 0) {
                                        const curr = pq.pop();
                                        if (curr.lx === 0 || curr.lx === size - 1 || curr.lz === 0 || curr.lz === size - 1) {
                                            touchesEdge = true;
                                        }
                                        for (const d of dirs) {
                                            const nx = curr.lx + d.x, nz = curr.lz + d.z;
                                            if (nx >= 0 && nx < size && nz >= 0 && nz < size && grid[nz * size + nx] === 1) {
                                                grid[nz * size + nx] = 3;
                                                pocket.push({lx: nx, lz: nz});
                                                pq.push({lx: nx, lz: nz});
                                            }
                                        }
                                    }
                                    
                                    if (touchesEdge) continue; // Likely connects in next chunk
                                    
                                    // Find shortest wall to artery network
                                    let bestWall = null;
                                    for (const p of pocket) {
                                        for (const d of dirs) {
                                            const nx = p.lx + d.x, nz = p.lz + d.z;
                                            if (nx > 0 && nx < size - 1 && nz > 0 && nz < size - 1 && grid[nz * size + nx] === 0) {
                                                const nnx = nx + d.x, nnz = nz + d.z;
                                                if (nnx >= 0 && nnx < size && nnz >= 0 && nnz < size && grid[nnz * size + nnx] === 2) {
                                                    bestWall = {lx: nx, lz: nz};
                                                    break;
                                                }
                                            }
                                        }
                                        if (bestWall) break;
                                    }
                                    
                                    if (bestWall) {
                                        ctx.setWall(startX + bestWall.lx, startZ + bestWall.lz, false);
                                        ctx.forceStructure(startX + bestWall.lx, startZ + bestWall.lz, 'breach');
                                        grid[bestWall.lz * size + bestWall.lx] = 2;
                                        for (const p of pocket) grid[p.lz * size + p.lx] = 2;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // WARNING: The following if/else block controls cell evaluation for walls vs empty space.
                // Do NOT accidentally remove the `} else {` block here, as it will break variable scoping 
                // and cause syntax errors if block-scoped variables share names across the branches.
                let isWall = ctx.isWall(x, z);
                const damp = env._dampAt(x, z);
                if (isWall) {
                    wallCells.add(`${x},${z}`);
                    const forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
                    const structRoll = random();
                    const structure = forcedName ? structuralMatrix.find(s => s.name === forcedName) : structuralMatrix.find(s => structRoll >= s.prob);
                    if (structure) {
                        structure.build(x, z);
                    } else {
                        solidWallCells.add(`${x},${z}`);
                        const wall = ctx.buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                        wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                        ctx.addGeometry(wall);
                    }
                } else {
                    let hasTallObstacle = false;
                    
                    if (!spawnedVirtualBreaker && env._virtualBreaker && env._virtualBreaker.chunkHash === hash && !env._virtualBreaker.spawned) {
                        spawnBreakerPodium(env, ctx, x, z);
                        env._virtualBreaker.spawned = true;
                        env._virtualBreaker.mesh = env.interactables[env.interactables.length - 1];
                        spawnedVirtualBreaker = true;
                        hasTallObstacle = true;
                    }
                    
                    const forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
                    if (forcedName === 'breach') {
                        hasTallObstacle = true;
                        const breachType = random();
                        const isRotated = isWallCell(x - 1, z) || isWallCell(x + 1, z);
                        const rot = isRotated ? Math.PI / 2 : 0;
                        const px = x * env.cellSize;
                        const pz = z * env.cellSize;
                        
                        const addGroupToStaging = (grp) => {
                            grp.position.set(px, 0, pz);
                            grp.rotation.y = rot;
                            grp.updateMatrixWorld(true);
                            grp.traverse(child => {
                                if (child.isMesh) {
                                    child.userData.isEntityBlocker = true; // ensure wall pieces block entities
                                    ctx.addGeometry(child);
                                }
                            });
                        };
                        
                        if (breachType > 0.6) {
                            // Door frame
                            if (!env.doorFrameGeo) {
                                const g = new THREE.Group();
                                const pGeo = new THREE.BoxGeometry(0.2, 3.0, 0.6);
                                const p1 = new THREE.Mesh(pGeo, env.pittedMetalMat || env.metalMat);
                                p1.position.set(-1.2, 1.5, 0);
                                g.add(p1);
                                const p2 = new THREE.Mesh(pGeo, env.pittedMetalMat || env.metalMat);
                                p2.position.set(1.2, 1.5, 0);
                                g.add(p2);
                                const tGeo = new THREE.BoxGeometry(2.6, 0.2, 0.6);
                                const t1 = new THREE.Mesh(tGeo, env.pittedMetalMat || env.metalMat);
                                t1.position.set(0, 2.9, 0);
                                g.add(t1);
                                env.doorFrameGeo = g;
                            }
                            const frame = env.doorFrameGeo.clone();
                            addGroupToStaging(frame);
                        } else if (breachType > 0.3) {
                            // Vent opening
                            const wallG = new THREE.Group();
                            const bGeo = new THREE.BoxGeometry(env.cellSize, 0.6, env.cellSize);
                            const b1 = new THREE.Mesh(bGeo, env.sharedWallMat);
                            b1.position.set(0, 0.3, 0);
                            wallG.add(b1);
                            
                            const sGeo = new THREE.BoxGeometry((env.cellSize - 1.2) / 2, 2.4, env.cellSize);
                            const s1 = new THREE.Mesh(sGeo, env.sharedWallMat);
                            s1.position.set(-(env.cellSize/2) + sGeo.parameters.width/2, 1.8, 0);
                            const s2 = new THREE.Mesh(sGeo, env.sharedWallMat);
                            s2.position.set((env.cellSize/2) - sGeo.parameters.width/2, 1.8, 0);
                            wallG.add(s1);
                            wallG.add(s2);
                            
                            const tGeo = new THREE.BoxGeometry(1.2, 3.0 - 1.8, env.cellSize);
                            const t1 = new THREE.Mesh(tGeo, env.sharedWallMat);
                            t1.position.set(0, 1.8 + tGeo.parameters.height/2, 0);
                            wallG.add(t1);
                            
                            const grateGeo = new THREE.BoxGeometry(1.16, 1.16, 0.1);
                            const grateMat = env.cartLatticeMat || env.pittedMetalMat;
                            const grate = new THREE.Mesh(grateGeo, grateMat);
                            grate.position.set(0, 1.2, 0);
                            grate.rotation.x = Math.PI / 2 + 0.4;
                            grate.position.z = 1.0;
                            wallG.add(grate);
                            
                            addGroupToStaging(wallG);
                        } else {
                            // Crevice / broken wall
                            const wallG = new THREE.Group();
                            const sGeo1 = new THREE.BoxGeometry(1.0, 3.0, env.cellSize);
                            const sGeo2 = new THREE.BoxGeometry(1.4, 3.0, env.cellSize);
                            const s1 = new THREE.Mesh(sGeo1, env.sharedWallMat);
                            s1.position.set(-1.5, 1.5, 0);
                            s1.rotation.y = (random() - 0.5) * 0.4;
                            const s2 = new THREE.Mesh(sGeo2, env.sharedWallMat);
                            s2.position.set(1.3, 1.5, 0);
                            s2.rotation.y = (random() - 0.5) * 0.4;
                            wallG.add(s1);
                            wallG.add(s2);
                            
                            const tGeo = new THREE.BoxGeometry(1.6, 1.0, env.cellSize);
                            const t1 = new THREE.Mesh(tGeo, env.sharedWallMat);
                            t1.position.set(0, 2.5, 0);
                            t1.rotation.z = (random() - 0.5) * 0.4;
                            wallG.add(t1);
                            
                            addGroupToStaging(wallG);
                        }
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
                    } else if (!hasTallObstacle && random() > 0.95 && chunkBreakerCount < 3 && !isArtery) {
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
                            chunkBreakerCount++;
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
            }
        }
        if (performance.now() - chunkStartTime > 5.0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!env.activeChunks.has(hash)) return;
        }
        await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
        if (env.activeChunks.has(hash)) {
            chunkGroup.userData.contentReady = true;
        }
    }
    beginMacroChunkContent(hash) {
        const env = this.env;
        const args = env._pendingMacroContent.get(hash);
        if (!args) return;
        env._pendingMacroContent.delete(hash);
        this._buildChunkInterior(args).catch(err => console.error('Macro chunk content build failed:', err));
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
            if (typeof env.engine.renderer.compileAsync === 'function') {
                await env.engine.renderer.compileAsync(tempGroup, env.camera, env.scene);
                if (!env.activeChunks.has(hash)) return;
                while (tempGroup.children.length > 0) {
                    chunkGroup.add(tempGroup.children[0]);
                }
            } else {
                while (tempGroup.children.length > 0) {
                    chunkGroup.add(tempGroup.children[0]);
                }
                env.engine.renderer.compile(env.scene, env.camera);
            }
        }
    }

}