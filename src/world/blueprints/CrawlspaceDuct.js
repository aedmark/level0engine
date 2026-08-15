import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const CrawlspaceDuctProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
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
            const maxExits = 2 + Math.floor(random() * 2);

            const getOpposite = (dir) => {
                if (dir === 'N') return 'S';
                if (dir === 'S') return 'N';
                if (dir === 'E') return 'W';
                if (dir === 'W') return 'E';
                return null;
            };

            const cellKey = (cx, cz) => `${cx}_${cz}`;

            const initialExits = {N: false, S: false, E: false, W: false};
            if (ctx.isWall && !ctx.isWall(x, z - 1) && !(ctx.isAirlockApron && ctx.isAirlockApron(x, z - 1)) && !(ctx.isLowClearance && ctx.isLowClearance(x, z - 1))) { initialExits.N = true; numExits++; }
            if (ctx.isWall && !ctx.isWall(x, z + 1) && !(ctx.isAirlockApron && ctx.isAirlockApron(x, z + 1)) && !(ctx.isLowClearance && ctx.isLowClearance(x, z + 1))) { initialExits.S = true; numExits++; }
            if (ctx.isWall && !ctx.isWall(x + 1, z) && !(ctx.isAirlockApron && ctx.isAirlockApron(x + 1, z)) && !(ctx.isLowClearance && ctx.isLowClearance(x + 1, z))) { initialExits.E = true; numExits++; }
            if (ctx.isWall && !ctx.isWall(x - 1, z) && !(ctx.isAirlockApron && ctx.isAirlockApron(x - 1, z)) && !(ctx.isLowClearance && ctx.isLowClearance(x - 1, z))) { initialExits.W = true; numExits++; }

            if (numExits === 0) {
                isFloorLevel = false;
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
                        if (ctx.isAirlockApron && ctx.isAirlockApron(cell.x, cell.z)) {
                            continue;
                        }
                        if (ctx.isLowClearance && ctx.isLowClearance(cell.x, cell.z)) {
                            continue;
                        }
                        if (p && numExits < maxExits) {
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

                const addWall = (mesh) => {
                    mesh.userData.isEntityBlocker = true;
                    addGeometry(mesh);
                };

                for (const [key, cell] of network.entries()) {
                    const cx = cell.x * env.cellSize;
                    const cz = cell.z * env.cellSize;

                    if (ctx.markOccupied) ctx.markOccupied(cell.x, cell.z);
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

                    const hubFloorLining = buildWall(holeW, holeW, env.ductWallMat, liningT, 0);
                    hubFloorLining.position.set(cx, ductY + liningT / 2, cz);
                    addGeometry(hubFloorLining);

                    const hubRoofLining = buildWall(holeW, holeW, env.ductWallMat, liningT, 0);
                    hubRoofLining.position.set(cx, ductY + holeH - liningT / 2, cz);
                    addGeometry(hubRoofLining);

                    const cLining1 = buildWall(liningT, liningT, env.ductWallMat, holeH, 0);
                    cLining1.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                    addGeometry(cLining1);

                    const cLining2 = buildWall(liningT, liningT, env.ductWallMat, holeH, 0);
                    cLining2.position.set(cx + holeW / 2 - liningT / 2, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                    addGeometry(cLining2);

                    const cLining3 = buildWall(liningT, liningT, env.ductWallMat, holeH, 0);
                    cLining3.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz + holeW / 2 - liningT / 2);
                    addGeometry(cLining3);

                    const cLining4 = buildWall(liningT, liningT, env.ductWallMat, holeH, 0);
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

                            const adjW = 1.08;
                            const adjH = holeH - 0.04;
                            const adjT = 0.04;

                            const lDepth = branch.d - 0.02;
                            const lWidth = branch.w - 0.02;
                            const lFloor = buildWall(branch.isZ ? lWidth : adjW, branch.isZ ? adjW : lDepth, env.ductWallMat, adjT, 0);
                            const lRoof = buildWall(branch.isZ ? lWidth : adjW, branch.isZ ? adjW : lDepth, env.ductWallMat, adjT, 0);
                            const lSide1 = buildWall(branch.isZ ? lWidth : adjT, branch.isZ ? adjT : lDepth, env.ductWallMat, adjH, 0);
                            const lSide2 = buildWall(branch.isZ ? lWidth : adjT, branch.isZ ? adjT : lDepth, env.ductWallMat, adjH, 0);

                            if (!branch.isZ) {
                                lFloor.position.set(branch.x, ductY + 0.03, branch.z);
                                lRoof.position.set(branch.x, ductY + holeH - 0.03, branch.z);
                                lSide1.position.set(branch.x - 0.57, ductY + holeH / 2, branch.z);
                                lSide2.position.set(branch.x + 0.57, ductY + holeH / 2, branch.z);
                            } else {
                                lFloor.position.set(branch.x, ductY + 0.03, branch.z);
                                lRoof.position.set(branch.x, ductY + holeH - 0.03, branch.z);
                                lSide1.position.set(branch.x, ductY + holeH / 2, branch.z - 0.57);
                                lSide2.position.set(branch.x, ductY + holeH / 2, branch.z + 0.57);
                            }
                            addGeometry(lFloor);
                            addGeometry(lRoof);
                            addGeometry(lSide1);
                            addGeometry(lSide2);
                        } else {
                            const block = buildWall(branch.w, branch.d, env.sharedWallMat);
                            block.position.set(branch.x, 1.5, branch.z);
                            addWall(block);

                            const capLining = buildWall(branch.isZ ? liningT : holeW, branch.isZ ? holeW : liningT, env.ductWallMat, holeH, 0);
                            capLining.position.set(
                                branch.x - (branch.isZ ? Math.sign(branch.x - cx) * (branch.w / 2 - liningT / 2) : 0),
                                ductY + holeH / 2,
                                branch.z - (branch.isZ ? 0 : Math.sign(branch.z - cz) * (branch.d / 2 - liningT / 2))
                            );
                            addGeometry(capLining);
                        }
                    }

                    const faceOffset = (env.cellSize / 2) - 0.04;
                    const GRATE_GAP = 0.12;
                    const snap = (v) => Math.round(v * 10000) / 10000;
                    const doorW = holeW - GRATE_GAP;
                    const doorH = holeH - GRATE_GAP;
                    const frameMat = env.woodMat || env.sharedWallMat;
                    const frameD = 0.12;
                    const frameT = 0.08;

                    const addDoor = (isX, sign) => {
                        const px = cx + (isX ? sign * faceOffset : 0);
                        const pz = cz + (isX ? 0 : sign * faceOffset);
                        
                        ctx.addGrate(px, ductY + holeH / 2, pz, isX, {
                            width: snap(doorW),
                            height: snap(doorH),
                            thickness: 0.1,
                            hinged: true,
                            openSign: isX ? sign : -sign,
                            mat: env.doorMat,
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
                        
                        addTrim(frameT, doorH, jambX + (isX ? 0 : sideTrimOffset), ductY + frameT, jambZ + (isX ? sideTrimOffset : 0));
                        addTrim(frameT, doorH, jambX - (isX ? 0 : sideTrimOffset), ductY + frameT, jambZ - (isX ? sideTrimOffset : 0));
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