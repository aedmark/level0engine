
import * as SectorPlacement from './SectorPlacement.js';
import TheArchitect from '../core/TheArchitect.js';
import { spawnElevatorCar } from './ElevatorSpawn.js';
import { setMacroZone } from './ZoneBounds.js';
import { isAirlockApron } from './AirlockApron.js';
import { buildEmptyCell } from './LightingSpawns.js';

const cellKey = (x, z) => x * (4194304 * 2) + z;

export default class ChunkBuilder {
    constructor(env, manager) {
        this.env = env;
        this.manager = manager;
    }

    async buildChunk(chunkX, chunkZ, hash) {
        const env = this.env;
        this.manager._profBegin(hash);
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
        let acmeLevelMazes = null;
        let chunkBreakerCount = 0;
        let cHeight = 3.0;
        const breakerPositions = [];
        if (isMacroStructure) {
            const isExitPhase = env.player && env.player.objectives && env.player.objectives.fixed >= env.player.objectives.total &&
                env.player.inventory.hasExitKey && !env.player.objectives.escaped;

            const pool = sectorMatrix.filter(s => s.id !== "EXIT").map(s => s.id);
            let activeSectorId = env.discoveredSectors.get(hash) || SectorPlacement.sectorIdFor(placement, pool, chunkX, chunkZ);

            if (isExitPhase) {
                if (!env.dynamicExitHash && !env.discoveredSectors.has(hash)) {
                    env.dynamicExitHash = hash;
                }
                if (env.dynamicExitHash === hash || SectorPlacement.isExitChunk(placement, chunkX, chunkZ)) {
                    activeSectorId = "EXIT";
                }
            }
            env.discoveredSectors.set(hash, activeSectorId);
            activeSector = sectorMatrix.find(s => s.id === activeSectorId);
            if (activeSector && activeSector.ceilingHeight !== undefined) cHeight = activeSector.ceilingHeight;
            setMacroZone(env, hash, startX, startZ, activeSector);
            if (activeSector.hasMaze) {
                sectorMaze = env._generateSectorMaze(random);
            }
            if (activeSector.multiLevelMaze) {
                acmeLevelMazes = [];
                for (let i = -activeSector.multiLevelMaze; i <= activeSector.multiLevelMaze; i++) {
                    acmeLevelMazes.push(i === 0 ? sectorMaze : env._generateSectorMaze(random));
                }
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
        const isChasm = activeSector && activeSector.voidFloorY !== undefined;
        const usesVoidCeiling = activeSector && activeSector.voidCeiling !== undefined;
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
            const shroudMat = activeSector.voidCeiling.white ? env.voidShroudWhiteMat : env.voidShroudMat;
            const canopyY = activeSector.voidCeiling.y;
            const span = env.chunkSize * env.cellSize;
            const canopy = new THREE.Mesh(env._planeGeo(span, span), shroudMat);
            canopy.rotation.x = Math.PI / 2;
            canopy.position.set(startX * env.cellSize + centerOffset, canopyY, startZ * env.cellSize + centerOffset);
            canopy.castShadow = true;
            chunkGroup.add(canopy);
            const skirtBottom = canopyY < 20 ? 2.85 : (canopyY < 40 ? 7.85 : (canopyY < 70 ? 55.6 : 0.15));
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
                const floorVoidY = activeSector.voidFloorY;
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
            const hallwayNeedsFloor = activeSector.hallwayNeedsFloor || false;
            const hallwayNeedsCeiling = activeSector.hallwayNeedsCeiling !== undefined ? activeSector.hallwayNeedsCeiling : true;
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
                        this.manager.warmChunkMaterials(chunkGroup);
                        await new Promise(resolve => setTimeout(resolve, 0));
                        shellStartTime = performance.now();
                        if (!env.activeChunks.has(hash)) return;
                    }
                    activeSector.build(x, z, localX, localZ, typeof sectorMaze !== 'undefined' ? sectorMaze : null, acmeLevelMazes);
                }
            }
            if (stagingMeshes.length > 0) {
                await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
                stagingMeshes.length = 0;
            }
        }
        const interiorArgs = {
            hash, chunkGroup, stagingMeshes, ctx, random, chunkX, chunkZ, startX, startZ,
            isMacroStructure, activeSector, sectorMaze, acmeLevelMazes, structuralMatrix
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
            isMacroStructure, activeSector, sectorMaze, acmeLevelMazes, structuralMatrix
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
                    this.manager.warmChunkMaterials(chunkGroup);
                    const wt1 = performance.now();
                    await new Promise(resolve => setTimeout(resolve, 0));
                    const wt2 = performance.now();
                    this.manager._profAdd('warm', wt1 - wt0);
                    this.manager._profAdd('yielded', wt2 - wt1);
                    this.manager._profAdd('cells', cellsAccum);
                    cellsAccum = 0;
                    chunkStartTime = performance.now();
                    if (!env.activeChunks.has(hash)) return;
                }
                if (!isMacroStructure && Math.abs(x) < 2 && Math.abs(z) < 2) continue;
                const localX = x - startX;
                const localZ = z - startZ;
                if (isMacroStructure) {
                    if (ctx.isOccupied(x, z)) continue;
                    activeSector.build(x, z, localX, localZ, typeof sectorMaze !== 'undefined' ? sectorMaze : null, acmeLevelMazes);
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
                            const { hash, isWallGrid, forcedStructuresGrid, doorwayPlans, error } = e.data;
                            if (error) console.error(`[ChunkWorker] chunk ${hash} generated with empty fallback grids after an internal error:`, error);
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
                        this.worker.onerror = (err) => {
                            console.error('[ChunkWorker] uncaught worker error, unblocking pending chunk builds with empty fallback grids:', err.message || err);
                            for (const resolver of this.workerResolvers.values()) {
                                resolver({isWallGrid: new Map(), forcedStructuresGrid: new Map(), doorwayPlans: new Map()});
                            }
                            this.workerResolvers.clear();
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
                    this.manager._profAdd('worker', performance.now() - workerT0);
                    chunkStartTime = performance.now();

                    ctx.isWall = (wx, wz) => mathData.isWallGrid.get(cellKey(wx, wz)) || false;
                    ctx.isAirlockApron = (wx, wz) => isAirlockApron(wx, wz);
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

                }

                let isWall = ctx.isWall(x, z);
                const damp = env._dampAt(x, z);
                let debugLabel = null;
                if (isWall) {
                    wallCells.add(cellKey(x, z));
                    const forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
                    const structRoll = random();
                    const structure = forcedName
                        ? structuralMatrix.find(s => s.name === forcedName)
                        : TheArchitect.selectStructure(structuralMatrix, structRoll);
                    let built = false;
                    if (structure && !(isAirlockApron(x, z) && structure.name === "CRATES")) {
                        built = structure.build(x, z) !== false;
                    }
                    if (!built) {
                        solidWallCells.add(cellKey(x, z));
                        ctx.buildDefaultWall(x, z);
                    }
                    if (window.EDMARK_DEBUG_MODE) debugLabel = (built && structure) ? structure.name : 'SOLID WALL';
                } else {
                    if (window.EDMARK_DEBUG_MODE) debugLabel = (ctx.getForcedStructure && ctx.getForcedStructure(x, z)) || 'OPEN';
                    buildEmptyCell(this.manager, {
                        x, z, env, ctx, random, hash, chunkGroup, localX, localZ,
                        isWallCell, isSolidWallCell, breakerPositions
                    }, emptyState);
                }
                if (debugLabel) this.manager._addDebugCellLabel(chunkGroup, x, z, debugLabel, hash);
            }
        }
        
        const elevator = env._spawnElevator;
        if (elevator && elevator.chunkHash === hash) {
            let placedX = elevator.cellX, placedZ = elevator.cellZ;
            let anchored = placedX !== null && placedX !== undefined;
            
            if (!anchored) {
                let bestX = null, bestZ = null;
                let fallbackX = null, fallbackZ = null;
                for (let cx = startX + 1; cx < startX + env.chunkSize - 1; cx++) {
                    for (let cz = startZ + 1; cz < startZ + env.chunkSize - 1; cz++) {
                        if (!ctx.isWall(cx, cz) && !ctx.isOccupied(cx, cz) && !ctx.isAirlockApron(cx, cz)) {
                            if (fallbackX === null) { fallbackX = cx; fallbackZ = cz; }
                            let openCount = 0;
                            let openNx = null, openNz = null;
                            const neighbors = [
                                {nx: cx, nz: cz + 1}, {nx: cx + 1, nz: cz},
                                {nx: cx, nz: cz - 1}, {nx: cx - 1, nz: cz}
                            ];
                            for (const {nx, nz} of neighbors) {
                                if (!ctx.isWall(nx, nz)) {
                                    openCount++;
                                    openNx = nx; openNz = nz;
                                }
                            }
                            if (openCount === 1) {
                                if (!ctx.isOccupied(openNx, openNz) && (!ctx.getForcedStructure || !ctx.getForcedStructure(openNx, openNz))) {
                                    bestX = cx; bestZ = cz;
                                    break;
                                }
                            }
                        }
                    }
                    if (bestX !== null) break;
                }
                if (bestX !== null) {
                    placedX = bestX; placedZ = bestZ;
                } else if (fallbackX !== null) {
                    placedX = fallbackX; placedZ = fallbackZ;
                }
            }
            if (placedX !== null && placedX !== undefined) {
                const placement = spawnElevatorCar(env, ctx, placedX, placedZ, elevator.exitIndex);
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
            }
        }

        this.manager._profAdd('cells', cellsAccum + (performance.now() - chunkStartTime));
        if (performance.now() - chunkStartTime > 5.0) {
            this.manager.warmChunkMaterials(chunkGroup);
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
                if (!env._scratchBox) env._scratchBox = new THREE.Box3();
                env._scratchBox.copy(wall.geometry.boundingBox).applyMatrix4(wall.matrixWorld);
                const box = env._scratchBox;
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
                        if (!env._scratchChildBox) env._scratchChildBox = new THREE.Box3();
                        env._scratchChildBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
                        const childBox = env._scratchChildBox;
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
                        if (!env._scratchBox) env._scratchBox = new THREE.Box3();
                        env._scratchBox.copy(wall.geometry.boundingBox).applyMatrix4(wall.matrixWorld);
                        if (env._scratchBox.containsPoint(f.position)) return false;
                    }
                    return true;
                });
            }
            env._breachWalls = [];
        }
        this.manager._profAdd('breach', performance.now() - breachT0);

        const instT0 = performance.now();
        await this._compileInstances(hash, chunkGroup, stagingMeshes, random);
        this.manager._profAdd('instances', performance.now() - instT0);

        const shadowT0 = performance.now();
        for (let pass = 0; pass < 150 && this._shadowQueue && this._shadowQueue.length > 0; pass++) {
            this.manager.drainShadowPrewarm(8.0);
            if (!env.activeChunks.has(hash)) return;
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        this.manager._profAdd('shadow', performance.now() - shadowT0);
        if (env.activeChunks.has(hash)) {
            chunkGroup.userData.contentReady = true;
        }
    }

    beginMacroChunkContent(hash) {
        const env = this.env;
        const args = env._pendingMacroContent.get(hash);
        if (!args) return;
        env._pendingMacroContent.delete(hash);
        env.isBuildingMacroInterior = true;
        this.manager._profBegin(hash);
        this._buildChunkInterior(args)
            .catch(err => console.error('Macro chunk content build failed:', err))
            .finally(() => {
                this.manager._profEnd();
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
            } else if (mesh.userData.noShadow) {
                matKey = matKey.uuid + '_NS';
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
            if (!group.material || (Array.isArray(group.material) && group.material.some(m => !m))) {
                console.warn('[ChunkManager] Skipping instanced group with a missing material (failed texture load?):', group.geometry);
                continue;
            }
            const isDecal = !Array.isArray(group.material) && (group.material === env.glowMat);
            if (group.meshes.length > 1 && !Array.isArray(group.material)) {
                const iMesh = new THREE.InstancedMesh(group.geometry, group.material, group.meshes.length);
                if (!isDecal) {
                    iMesh.castShadow = (group.material !== env.fenceMat && !group.material.userData.noShadow && group.meshes.every(m => !m.userData.noShadow));
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
                iMesh.computeBoundingSphere();
                if (needsColor && iMesh.instanceColor) iMesh.instanceColor.needsUpdate = true;
                tempGroup.add(iMesh);
                if (!isDecal) env.walls.push(iMesh);
            } else {
                for (let j = 0; j < group.meshes.length; j++) {
                    const mesh = group.meshes[j];
                    mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                    if (!isDecal) {
                        mesh.castShadow = (!Array.isArray(group.material) && group.material !== env.fenceMat && !group.material.userData.noShadow && !mesh.userData.noShadow);
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
            this.manager.warmChunkMaterials(chunkGroup);
        }
    }
}
