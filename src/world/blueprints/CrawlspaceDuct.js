import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {makeDuctDoorMat} from '../../core/DuctLighting.js';

export const CrawlspaceDuctProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;

    const buildDuctLining = (w, d, mat, h, opts = {}) => {
        const q = (v) => Math.round(v * 1000) / 1000;
        w = q(w); d = q(d); h = q(h);
        const bleedY = opts.bleedY || 0;
        const horizontal = !!opts.horizontal;
        const uvFitV = !!opts.uvFitV;
        const key = `ductlin_${w}_${h}_${d}_${bleedY}_${horizontal ? 1 : 0}_${uvFitV ? 1 : 0}`;
        let geo = env.geoCache && env.geoCache.get(key);
        if (!geo) {
            geo = new THREE.BoxGeometry(w, h + bleedY, d);
            const uv = geo.attributes.uv;
            if (horizontal) {
                for (let i = 8; i < 16; i++) {
                    uv.setX(i, uv.getX(i) * (w / env.cellSize));
                    uv.setY(i, uv.getY(i) * (d / env.cellSize));
                }
            } else {
                const vScale = uvFitV ? 1 : (h / 3.0);
                for (let i = 0; i < 8; i++) {
                    uv.setX(i, uv.getX(i) * (d / env.cellSize));
                    uv.setY(i, uv.getY(i) * vScale);
                }
                for (let i = 16; i < 24; i++) {
                    uv.setX(i, uv.getX(i) * (w / env.cellSize));
                    uv.setY(i, uv.getY(i) * vScale);
                }
            }
            if (env.geoCache) {
                env.geoCache.set(key, geo);
                env.geoCache.set(geo.uuid, true);
            }
        }
        return new THREE.Mesh(geo, mat);
    };

    const ductFloorMat = () => env.ductFloorMat || env.ductWallMat;
    const ductCeilingMat = () => env.ductCeilingMat || env.ductWallMat;
    return {
        name: "CRAWLSPACE_DUCT",
        prob: 0.0862, build: (x, z) => {
            let isFloorLevel = random() > 0.50;
            const addGeometry = ctx.addGeometry;

            const startX = Math.floor(x / env.chunkSize) * env.chunkSize;
            const startZ = Math.floor(z / env.chunkSize) * env.chunkSize;

            const network = new Map();
            let numExits = 0;
            const maxTiles = 15;
            const maxExits = 3 + Math.floor(random() * 2);

            const getOpposite = (dir) => {
                if (dir === 'N') return 'S';
                if (dir === 'S') return 'N';
                if (dir === 'E') return 'W';
                if (dir === 'W') return 'E';
                return null;
            };

            const cellKey = (cx, cz) => `${cx}_${cz}`;

            const openable = (nx, nz) => !!(ctx.isWall && !ctx.isWall(nx, nz)
                && !(ctx.isAirlockApron && ctx.isAirlockApron(nx, nz))
                && !(ctx.isLowClearance && ctx.isLowClearance(nx, nz)));

            const initialExits = {N: false, S: false, E: false, W: false};
            const startOpenings = [];
            if (openable(x, z - 1)) startOpenings.push('N');
            if (openable(x, z + 1)) startOpenings.push('S');
            if (openable(x + 1, z)) startOpenings.push('E');
            if (openable(x - 1, z)) startOpenings.push('W');

            if (startOpenings.length === 0) {
                isFloorLevel = false;
            } else {
                initialExits[startOpenings[Math.floor(random() * startOpenings.length)]] = true;
                numExits++;
            }

            if (isFloorLevel) {
                network.set(cellKey(x, z), {
                    x, z,
                    connections: {N: false, S: false, E: false, W: false},
                    exits: initialExits
                });

                const q = [];
                const addFrontier = (cx, cz, fromDir) => {
                    if (cx < startX || cx >= startX + env.chunkSize) return;
                    if (cz < startZ || cz >= startZ + env.chunkSize) return;
                    q.push({x: cx, z: cz, cameFrom: fromDir});
                };

                if (ctx.isWall && ctx.isWall(x, z - 1)) addFrontier(x, z - 1, 'S');
                if (ctx.isWall && ctx.isWall(x, z + 1)) addFrontier(x, z + 1, 'N');
                if (ctx.isWall && ctx.isWall(x + 1, z)) addFrontier(x + 1, z, 'W');
                if (ctx.isWall && ctx.isWall(x - 1, z)) addFrontier(x - 1, z, 'E');

                while (q.length > 0 && network.size < maxTiles) {
                    let idx = q.length - 1;
                    if (random() < 0.4) idx = Math.floor(random() * q.length);
                    const cell = q.splice(idx, 1)[0];
                    const key = cellKey(cell.x, cell.z);

                    const prevCellX = cell.x + (cell.cameFrom === 'E' ? 1 : cell.cameFrom === 'W' ? -1 : 0);
                    const prevCellZ = cell.z + (cell.cameFrom === 'S' ? 1 : cell.cameFrom === 'N' ? -1 : 0);
                    const pKey = cellKey(prevCellX, prevCellZ);
                    const p = network.get(pKey);

                    if (network.has(key)) {
                        if (p && random() < 0.25) {
                            p.connections[getOpposite(cell.cameFrom)] = true;
                            network.get(key).connections[cell.cameFrom] = true;
                        }
                        continue;
                    }

                    if (ctx.isWall && !ctx.isWall(cell.x, cell.z)) {
                        if (openable(cell.x, cell.z) && p && numExits < maxExits) {
                            p.exits[getOpposite(cell.cameFrom)] = true;
                            numExits++;
                        }
                        continue;
                    }

                    if (ctx.isOccupied && ctx.isOccupied(cell.x, cell.z)) {
                        continue;
                    }

                    if (p) {
                        p.connections[getOpposite(cell.cameFrom)] = true;
                    }

                    const newCell = {
                        x: cell.x, z: cell.z,
                        connections: {N: false, S: false, E: false, W: false},
                        exits: {N: false, S: false, E: false, W: false}
                    };
                    newCell.connections[cell.cameFrom] = true;
                    network.set(key, newCell);

                    if (ctx.isWall) {
                        addFrontier(cell.x, cell.z - 1, 'S');
                        addFrontier(cell.x, cell.z + 1, 'N');
                        addFrontier(cell.x + 1, cell.z, 'W');
                        addFrontier(cell.x - 1, cell.z, 'E');
                    }
                }

                let pruned = true;
                while (pruned) {
                    pruned = false;
                    for (const [key, cell] of network.entries()) {
                        let connCount = 0;
                        if (cell.connections.N) connCount++;
                        if (cell.connections.S) connCount++;
                        if (cell.connections.E) connCount++;
                        if (cell.connections.W) connCount++;

                        let exitCount = 0;
                        if (cell.exits.N) exitCount++;
                        if (cell.exits.S) exitCount++;
                        if (cell.exits.E) exitCount++;
                        if (cell.exits.W) exitCount++;

                        if (connCount === 1 && exitCount === 0) {
                            if (cell.connections.N) {
                                const nKey = cellKey(cell.x, cell.z - 1);
                                if (network.has(nKey)) network.get(nKey).connections.S = false;
                            }
                            if (cell.connections.S) {
                                const nKey = cellKey(cell.x, cell.z + 1);
                                if (network.has(nKey)) network.get(nKey).connections.N = false;
                            }
                            if (cell.connections.E) {
                                const nKey = cellKey(cell.x + 1, cell.z);
                                if (network.has(nKey)) network.get(nKey).connections.W = false;
                            }
                            if (cell.connections.W) {
                                const nKey = cellKey(cell.x - 1, cell.z);
                                if (network.has(nKey)) network.get(nKey).connections.E = false;
                            }
                            network.delete(key);
                            pruned = true;
                        }
                    }
                }

                const MIN_EXIT_SPREAD = 3;
                const cellDist = (c) => Math.abs(c.x - x) + Math.abs(c.z - z);
                let farthestExit = 0;
                for (const cell of network.values()) {
                    if (cell.exits.N || cell.exits.S || cell.exits.E || cell.exits.W) {
                        farthestExit = Math.max(farthestExit, cellDist(cell));
                    }
                }

                if (farthestExit < MIN_EXIT_SPREAD) {
                    const candidates = [];
                    for (const cell of network.values()) {
                        const sides = [
                            ['N', cell.x, cell.z - 1], ['S', cell.x, cell.z + 1],
                            ['E', cell.x + 1, cell.z], ['W', cell.x - 1, cell.z]
                        ];
                        for (const [dir, nx, nz] of sides) {
                            if (!cell.exits[dir] && openable(nx, nz)) {
                                candidates.push({cell, dir, d: cellDist(cell)});
                            }
                        }
                    }
                    candidates.sort((a, b) => b.d - a.d);
                    if (candidates.length && candidates[0].d > farthestExit) {
                        candidates[0].cell.exits[candidates[0].dir] = true;
                    }
                }

                let totalRemainingExits = 0;
                for (const cell of network.values()) {
                    if (cell.exits.N) totalRemainingExits++;
                    if (cell.exits.S) totalRemainingExits++;
                    if (cell.exits.E) totalRemainingExits++;
                    if (cell.exits.W) totalRemainingExits++;
                }

                if (network.size <= 1 || totalRemainingExits < 2) {
                    isFloorLevel = false;
                }
            }

            if (isFloorLevel) {
                const holeW = 1.2;
                const holeH = 1.2;
                const ductY = 0.6;
                const topH = 3.0 - (ductY + holeH);
                const sideW = (env.cellSize - holeW) / 2;
                const sideOffset = (env.cellSize / 2) - (sideW / 2);
                const liningT = 0.04;

                const TEAR_H = 0.12;
                const TEAR_T = 0.004;
                const TEAR_PROUD = 0.002;
                const innerFace = holeW / 2 - liningT;
                const tearCentreY = ductY + 0.04 + TEAR_H / 2;
                const tearInset = TEAR_PROUD + TEAR_T / 2;

                const addTornEdge = (px, pz, spanX, spanZ) => {
                    if (!env.ductTornMat) return;
                    const strip = buildDuctLining(spanX, spanZ, env.ductTornMat, TEAR_H, {uvFitV: true});
                    strip.position.set(px, tearCentreY, pz);
                    addGeometry(strip);
                };

                const addWall = (mesh) => {
                    mesh.userData.isEntityBlocker = true;
                    addGeometry(mesh);
                };

                for (const [key, cell] of network.entries()) {
                    const cx = cell.x * env.cellSize;
                    const cz = cell.z * env.cellSize;

                    if (ctx.markOccupied) ctx.markOccupied(cell.x, cell.z);
                    if (ctx.claimCell) ctx.claimCell(cell.x, cell.z);
                    if (ctx.setWall) ctx.setWall(cell.x, cell.z, false);

                    const nConn = cell.connections.N || cell.exits.N;
                    const sConn = cell.connections.S || cell.exits.S;
                    const eConn = cell.connections.E || cell.exits.E;
                    const wConn = cell.connections.W || cell.exits.W;

                    const corners = [
                        {x: cx - sideOffset, z: cz - sideOffset},
                        {x: cx + sideOffset, z: cz - sideOffset},
                        {x: cx - sideOffset, z: cz + sideOffset},
                        {x: cx + sideOffset, z: cz + sideOffset}
                    ];
                    for (const pos of corners) {
                        const pillar = buildWall(sideW, sideW, env.sharedWallMat);
                        pillar.position.set(pos.x, 1.5, pos.z);
                        addWall(pillar);
                    }

                    if (ductY > 0) {
                        const hubFloorStruct = buildWall(holeW, holeW, env.sharedWallMat, ductY, 0);
                        hubFloorStruct.position.set(cx, ductY / 2, cz);
                        addGeometry(hubFloorStruct);
                    }

                    const hubRoofStruct = buildWall(holeW, holeW, env.sharedWallMat, topH, ductY + holeH);
                    hubRoofStruct.position.set(cx, ductY + holeH + topH / 2, cz);
                    addGeometry(hubRoofStruct);

                    const hubFloorLining = buildDuctLining(holeW, holeW, ductFloorMat(), liningT, {horizontal: true, bleedY: 0.02});
                    hubFloorLining.position.set(cx, ductY + liningT / 2, cz);
                    addGeometry(hubFloorLining);

                    const hubRoofLining = buildDuctLining(holeW, holeW, ductCeilingMat(), liningT, {horizontal: true, bleedY: 0.02});
                    hubRoofLining.position.set(cx, ductY + holeH - liningT / 2, cz);
                    addGeometry(hubRoofLining);

                    const cLining1 = buildDuctLining(liningT, liningT, env.ductWallMat, holeH);
                    cLining1.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                    addGeometry(cLining1);

                    const cLining2 = buildDuctLining(liningT, liningT, env.ductWallMat, holeH);
                    cLining2.position.set(cx + holeW / 2 - liningT / 2, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                    addGeometry(cLining2);

                    const cLining3 = buildDuctLining(liningT, liningT, env.ductWallMat, holeH);
                    cLining3.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz + holeW / 2 - liningT / 2);
                    addGeometry(cLining3);

                    const cLining4 = buildDuctLining(liningT, liningT, env.ductWallMat, holeH);
                    cLining4.position.set(cx + holeW / 2 - liningT / 2, ductY + holeH / 2, cz + holeW / 2 - liningT / 2);
                    addGeometry(cLining4);

                    const branches = [
                        {dir: 'N', conn: nConn, x: cx, z: cz - sideOffset, w: holeW, d: sideW, isZ: false},
                        {dir: 'S', conn: sConn, x: cx, z: cz + sideOffset, w: holeW, d: sideW, isZ: false},
                        {dir: 'E', conn: eConn, x: cx + sideOffset, z: cz, w: sideW, d: holeW, isZ: true},
                        {dir: 'W', conn: wConn, x: cx - sideOffset, z: cz, w: sideW, d: holeW, isZ: true}
                    ];

                    for (const branch of branches) {
                        if (branch.conn) {
                            if (ductY > 0) {
                                const bFloor = buildWall(branch.w, branch.d, env.sharedWallMat, ductY, 0);
                                bFloor.position.set(branch.x, ductY / 2, branch.z);
                                addGeometry(bFloor);
                            }

                            const bRoof = buildWall(branch.w, branch.d, env.sharedWallMat, topH, ductY + holeH);
                            bRoof.position.set(branch.x, ductY + holeH + topH / 2, branch.z);
                            addGeometry(bRoof);

                            const adjW = 1.2;
                            const adjH = holeH;
                            const adjT = 0.04;

                            const lDepth = branch.d;
                            const lWidth = branch.w;
                            const lFloor = buildDuctLining(branch.isZ ? lWidth : adjW, branch.isZ ? adjW : lDepth, ductFloorMat(), adjT, {horizontal: true, bleedY: 0.02});
                            const lRoof = buildDuctLining(branch.isZ ? lWidth : adjW, branch.isZ ? adjW : lDepth, ductCeilingMat(), adjT, {horizontal: true, bleedY: 0.02});
                            const lSide1 = buildDuctLining(branch.isZ ? lWidth : adjT, branch.isZ ? adjT : lDepth, env.ductWallMat, adjH);
                            const lSide2 = buildDuctLining(branch.isZ ? lWidth : adjT, branch.isZ ? adjT : lDepth, env.ductWallMat, adjH);

                            if (!branch.isZ) {
                                lFloor.position.set(branch.x, ductY + 0.02, branch.z);
                                lRoof.position.set(branch.x, ductY + holeH - 0.02, branch.z);
                                lSide1.position.set(branch.x - 0.58, ductY + holeH / 2, branch.z);
                                lSide2.position.set(branch.x + 0.58, ductY + holeH / 2, branch.z);
                            } else {
                                lFloor.position.set(branch.x, ductY + 0.02, branch.z);
                                lRoof.position.set(branch.x, ductY + holeH - 0.02, branch.z);
                                lSide1.position.set(branch.x, ductY + holeH / 2, branch.z - 0.58);
                                lSide2.position.set(branch.x, ductY + holeH / 2, branch.z + 0.58);
                            }
                            addGeometry(lFloor);
                            addGeometry(lRoof);
                            addGeometry(lSide1);
                            addGeometry(lSide2);

                            if (!branch.isZ) {
                                addTornEdge(branch.x - innerFace + tearInset, branch.z, TEAR_T, lDepth);
                                addTornEdge(branch.x + innerFace - tearInset, branch.z, TEAR_T, lDepth);
                            } else {
                                addTornEdge(branch.x, branch.z - innerFace + tearInset, lWidth, TEAR_T);
                                addTornEdge(branch.x, branch.z + innerFace - tearInset, lWidth, TEAR_T);
                            }
                        } else {
                            const block = buildWall(branch.w, branch.d, env.sharedWallMat);
                            block.position.set(branch.x, 1.5, branch.z);
                            addWall(block);

                            const capSpan = holeW - liningT * 2;
                            const capOff = holeW / 2 - liningT / 2;
                            const capLining = buildDuctLining(branch.isZ ? liningT : capSpan, branch.isZ ? capSpan : liningT, env.ductWallMat, holeH);
                            capLining.position.set(
                                branch.isZ ? cx + Math.sign(branch.x - cx) * capOff : cx,
                                ductY + holeH / 2,
                                branch.isZ ? cz : cz + Math.sign(branch.z - cz) * capOff
                            );
                            addGeometry(capLining);

                            const capFace = innerFace - tearInset;
                            addTornEdge(
                                branch.isZ ? cx + Math.sign(branch.x - cx) * capFace : cx,
                                branch.isZ ? cz : cz + Math.sign(branch.z - cz) * capFace,
                                branch.isZ ? TEAR_T : capSpan,
                                branch.isZ ? capSpan : TEAR_T
                            );
                        }
                    }

                    const faceOffset = (env.cellSize / 2) - 0.04;
                    const GRATE_GAP = 0.12;
                    const snap = (v) => Math.round(v * 10000) / 10000;
                    const doorW = holeW - GRATE_GAP;
                    const doorH = holeH - GRATE_GAP;
                    const frameMat = env.woodMat || env.sharedWallMat;
                    const frameD = 0.12;
                    const frameT = 0.10;

                    const addDoor = (isX, sign) => {
                        const px = cx + (isX ? sign * faceOffset : 0);
                        const pz = cz + (isX ? 0 : sign * faceOffset);
                        
                        ctx.addGrate(px, ductY + holeH / 2, pz, isX, {
                            width: snap(doorW),
                            height: snap(doorH),
                            thickness: 0.1,
                            hinged: true,
                            openSign: isX ? sign : -sign,
                            mat: makeDuctDoorMat(env.doorMat, isX, sign),
                            isMiniDoor: true
                        });

                        const addTrim = (tw, th, tx, ty, tz) => {
                            const trim = buildWall(isX ? frameD : tw, isX ? tw : frameD, frameMat, th, ty);
                            trim.position.set(cx + tx, ty + th / 2, cz + tz);
                            trim.userData.isEntityBlocker = true;
                            ctx.addGeometry(trim);
                        };

                        const frameDepthOffset = sign * faceOffset;
                        const jambX = isX ? frameDepthOffset : 0;
                        const jambZ = isX ? 0 : frameDepthOffset;
                        const sideTrimOffset = holeW / 2 - frameT / 2;

                        const railInset = frameT + 0.02;
                        const jambY = ductY + railInset;
                        const jambH = holeH - railInset * 2;

                        addTrim(frameT, jambH, jambX + (isX ? 0 : sideTrimOffset), jambY, jambZ + (isX ? sideTrimOffset : 0));
                        addTrim(frameT, jambH, jambX - (isX ? 0 : sideTrimOffset), jambY, jambZ - (isX ? sideTrimOffset : 0));
                        addTrim(holeW, frameT, jambX, ductY + holeH - frameT, jambZ);
                        addTrim(holeW, frameT, jambX, ductY, jambZ);
                    };

                    if (ctx.addGrate) {
                        if (cell.exits.N) addDoor(false, -1);
                        if (cell.exits.S) addDoor(false, 1);
                        if (cell.exits.E) addDoor(true, 1);
                        if (cell.exits.W) addDoor(true, -1);
                    }
                }
            } else {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                wall.userData.isDefaultWall = true;
                wall.userData.cellX = x;
                wall.userData.cellZ = z;
                addGeometry(wall);
            }
        }
    };
};