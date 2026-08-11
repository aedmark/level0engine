import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const DuctOrVentProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
    return {
        name: "DUCT OR VENT",
        prob: 0.20, build: (x, z) => {
            let isFloorLevel = random() > 0.75;
            const addGeometry = (mesh) => {
                if (isFloorLevel && mesh.userData.baseboardFootprint) {
                    delete mesh.userData.baseboardFootprint;
                }
                ctx.addGeometry(mesh);
            };

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
            if (ctx.isWall && !ctx.isWall(x, z - 1)) { initialExits.N = true; numExits++; }
            if (ctx.isWall && !ctx.isWall(x, z + 1)) { initialExits.S = true; numExits++; }
            if (ctx.isWall && !ctx.isWall(x + 1, z)) { initialExits.E = true; numExits++; }
            if (ctx.isWall && !ctx.isWall(x - 1, z)) { initialExits.W = true; numExits++; }

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
                const holeH = 0.7;
                const ductY = 0.0;
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

                    const hubFloorLining = buildWall(holeW, holeW, env.ductMat, liningT, 0);
                    hubFloorLining.position.set(cx, ductY + liningT / 2, cz);
                    addGeometry(hubFloorLining);

                    const hubRoofLining = buildWall(holeW, holeW, env.ductMat, liningT, 0);
                    hubRoofLining.position.set(cx, ductY + holeH - liningT / 2, cz);
                    addGeometry(hubRoofLining);

                    // Add corner linings to prevent snagging
                    const cLining1 = buildWall(liningT, liningT, env.ductMat, holeH, 0);
                    cLining1.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                    addGeometry(cLining1);
                    
                    const cLining2 = buildWall(liningT, liningT, env.ductMat, holeH, 0);
                    cLining2.position.set(cx + holeW / 2 - liningT / 2, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                    addGeometry(cLining2);
                    
                    const cLining3 = buildWall(liningT, liningT, env.ductMat, holeH, 0);
                    cLining3.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz + holeW / 2 - liningT / 2);
                    addGeometry(cLining3);
                    
                    const cLining4 = buildWall(liningT, liningT, env.ductMat, holeH, 0);
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

                            const lFloor = buildWall(branch.w, branch.d, env.ductMat, liningT, 0);
                            lFloor.position.set(branch.x, ductY + liningT / 2, branch.z);
                            addGeometry(lFloor);

                            const lRoof = buildWall(branch.w, branch.d, env.ductMat, liningT, 0);
                            lRoof.position.set(branch.x, ductY + holeH - liningT / 2, branch.z);
                            addGeometry(lRoof);

                            const lSide1 = buildWall(branch.isZ ? branch.w : liningT, branch.isZ ? liningT : branch.d, env.ductMat, holeH, 0);
                            const lSide2 = buildWall(branch.isZ ? branch.w : liningT, branch.isZ ? liningT : branch.d, env.ductMat, holeH, 0);
                            
                            if (!branch.isZ) {
                                lSide1.position.set(branch.x - holeW / 2 + liningT / 2, ductY + holeH / 2, branch.z);
                                lSide2.position.set(branch.x + holeW / 2 - liningT / 2, ductY + holeH / 2, branch.z);
                            } else {
                                lSide1.position.set(branch.x, ductY + holeH / 2, branch.z - holeW / 2 + liningT / 2);
                                lSide2.position.set(branch.x, ductY + holeH / 2, branch.z + holeW / 2 - liningT / 2);
                            }
                            addGeometry(lSide1);
                            addGeometry(lSide2);
                        } else {
                            const block = buildWall(branch.w, branch.d, env.sharedWallMat);
                            block.position.set(branch.x, 1.5, branch.z);
                            addWall(block);

                            const capLining = buildWall(branch.isZ ? liningT : holeW, branch.isZ ? holeW : liningT, env.ductMat, holeH, 0);
                            
                            if (branch.dir === 'N') capLining.position.set(cx, ductY + holeH / 2, cz - holeW / 2 + liningT / 2);
                            else if (branch.dir === 'S') capLining.position.set(cx, ductY + holeH / 2, cz + holeW / 2 - liningT / 2);
                            else if (branch.dir === 'E') capLining.position.set(cx + holeW / 2 - liningT / 2, ductY + holeH / 2, cz);
                            else if (branch.dir === 'W') capLining.position.set(cx - holeW / 2 + liningT / 2, ductY + holeH / 2, cz);
                            
                            addGeometry(capLining);
                        }
                    }

                    const grateOffset = (env.cellSize / 2) - 0.07;
                    if (ctx.addGrate) {
                        if (cell.exits.N) ctx.addGrate(cx, ductY + holeH / 2, cz - grateOffset, false);
                        if (cell.exits.S) ctx.addGrate(cx, ductY + holeH / 2, cz + grateOffset, false);
                        if (cell.exits.E) ctx.addGrate(cx + grateOffset, ductY + holeH / 2, cz, true);
                        if (cell.exits.W) ctx.addGrate(cx - grateOffset, ductY + holeH / 2, cz, true);
                    }

                    const BASEBOARD_H = 3.0 * (32 / 512);
                    const TRIM_H = 3.0 * (4 / 512);
                    const addManualBaseboardFace = (px, pz, length, isX) => {
                        const bw = isX ? length : 0.06;
                        const bd = isX ? 0.06 : length;
                        
                        const geoBody = env._boxGeo ? env._boxGeo(bw, BASEBOARD_H, bd) : new THREE.BoxGeometry(bw, BASEBOARD_H, bd);
                        const body = new THREE.Mesh(geoBody, env.baseboardMat);
                        body.position.set(px, BASEBOARD_H / 2, pz);
                        body.userData.noCollision = true;
                        ctx.addGeometry(body);

                        const geoTrim = env._boxGeo ? env._boxGeo(bw, TRIM_H, bd) : new THREE.BoxGeometry(bw, TRIM_H, bd);
                        const trim = new THREE.Mesh(geoTrim, env.baseboardTrimMat);
                        trim.position.set(px, BASEBOARD_H + TRIM_H / 2, pz);
                        trim.userData.noCollision = true;
                        ctx.addGeometry(trim);
                    };

                    if (!cell.connections.N) {
                        if (!cell.exits.N) {
                            addManualBaseboardFace(cx, cz - 1.5, 3.06, true);
                        } else {
                            addManualBaseboardFace(cx - 1.5 + sideW/2, cz - 1.5, sideW + 0.06, true);
                            addManualBaseboardFace(cx + 1.5 - sideW/2, cz - 1.5, sideW + 0.06, true);
                        }
                    }
                    if (!cell.connections.S) {
                        if (!cell.exits.S) {
                            addManualBaseboardFace(cx, cz + 1.5, 3.06, true);
                        } else {
                            addManualBaseboardFace(cx - 1.5 + sideW/2, cz + 1.5, sideW + 0.06, true);
                            addManualBaseboardFace(cx + 1.5 - sideW/2, cz + 1.5, sideW + 0.06, true);
                        }
                    }
                    if (!cell.connections.E) {
                        if (!cell.exits.E) {
                            addManualBaseboardFace(cx + 1.5, cz, 3.06, false);
                        } else {
                            addManualBaseboardFace(cx + 1.5, cz - 1.5 + sideW/2, sideW + 0.06, false);
                            addManualBaseboardFace(cx + 1.5, cz + 1.5 - sideW/2, sideW + 0.06, false);
                        }
                    }
                    if (!cell.connections.W) {
                        if (!cell.exits.W) {
                            addManualBaseboardFace(cx - 1.5, cz, 3.06, false);
                        } else {
                            addManualBaseboardFace(cx - 1.5, cz - 1.5 + sideW/2, sideW + 0.06, false);
                            addManualBaseboardFace(cx - 1.5, cz + 1.5 - sideW/2, sideW + 0.06, false);
                        }
                    }
                }
            } else {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                addGeometry(wall);
                const openFaces = [];
                if (ctx.isWall && !ctx.isWall(x, z + 1)) openFaces.push(0);
                if (ctx.isWall && !ctx.isWall(x, z - 1)) openFaces.push(1);
                if (ctx.isWall && !ctx.isWall(x + 1, z)) openFaces.push(2);
                if (ctx.isWall && !ctx.isWall(x - 1, z)) openFaces.push(3);
                
                let ventFace;
                if (openFaces.length > 0) {
                    ventFace = openFaces[Math.floor(random() * openFaces.length)];
                } else {
                    ventFace = Math.floor(random() * 4);
                    if (ctx.setWall) {
                        if (ventFace === 0) ctx.setWall(x, z + 1, false);
                        else if (ventFace === 1) ctx.setWall(x, z - 1, false);
                        else if (ventFace === 2) ctx.setWall(x + 1, z, false);
                        else if (ventFace === 3) ctx.setWall(x - 1, z, false);
                    }
                }

                if (ctx.markOccupied) {
                    if (ventFace === 0) ctx.markOccupied(x, z + 1);
                    else if (ventFace === 1) ctx.markOccupied(x, z - 1);
                    else if (ventFace === 2) ctx.markOccupied(x + 1, z);
                    else if (ventFace === 3) ctx.markOccupied(x - 1, z);
                }

                const ventGeo = env._boxGeo(1.2, 0.6, 0.05);
                const vent = new THREE.Mesh(ventGeo, env.wallVentMat);
                const finalOffset = (env.cellSize / 2) + 0.01;
                if (ventFace === 0) {
                    vent.position.set(x * env.cellSize, 2.6, z * env.cellSize + finalOffset);
                } else if (ventFace === 1) {
                    vent.position.set(x * env.cellSize, 2.6, z * env.cellSize - finalOffset);
                } else if (ventFace === 2) {
                    vent.rotation.y = Math.PI / 2;
                    vent.position.set(x * env.cellSize + finalOffset, 2.6, z * env.cellSize);
                } else {
                    vent.rotation.y = Math.PI / 2;
                    vent.position.set(x * env.cellSize - finalOffset, 2.6, z * env.cellSize);
                }
                addGeometry(vent);
            }
        }
    };
};
