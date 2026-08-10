import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const DuctOrVentProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
    return {
        name: "DUCT OR VENT",
        prob: 0.40, build: (x, z) => {
            let isFloorLevel = random() > 0.75;

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
                    const topH = 3.0 - holeH;
                    const sideW = (env.cellSize - holeW) / 2;
                    const sideOffset = (env.cellSize / 2) - (sideW / 2);
                    const liningH = 0.05;
                    const sideH = holeH - (liningH * 2);

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

                    const nw = buildWall(sideW, sideW, env.sharedWallMat);
                    nw.position.set(cx - sideOffset, 1.5, cz - sideOffset);
                    addWall(nw);

                    const ne = buildWall(sideW, sideW, env.sharedWallMat);
                    ne.position.set(cx + sideOffset, 1.5, cz - sideOffset);
                    addWall(ne);

                    const sw = buildWall(sideW, sideW, env.sharedWallMat);
                    sw.position.set(cx - sideOffset, 1.5, cz + sideOffset);
                    addWall(sw);

                    const se = buildWall(sideW, sideW, env.sharedWallMat);
                    se.position.set(cx + sideOffset, 1.5, cz + sideOffset);
                    addWall(se);

                    const hubRoof = buildWall(holeW, holeW, env.sharedWallMat, topH, holeH);
                    hubRoof.position.set(cx, holeH + topH / 2, cz);
                    addGeometry(hubRoof);

                    const hubFloor = buildWall(holeW, holeW, env.ductMat, liningH);
                    hubFloor.position.set(cx, liningH / 2, cz);
                    addGeometry(hubFloor);

                    const hubCeil = buildWall(holeW, holeW, env.ductMat, liningH);
                    hubCeil.position.set(cx, holeH - liningH / 2, cz);
                    addGeometry(hubCeil);

                    if (nConn) {
                        const r = buildWall(holeW, sideW, env.sharedWallMat, topH, holeH);
                        r.position.set(cx, holeH + topH / 2, cz - sideOffset);
                        addGeometry(r);
                        const f = buildWall(holeW, sideW, env.ductMat, liningH);
                        f.position.set(cx, liningH / 2, cz - sideOffset);
                        addGeometry(f);
                        const c = buildWall(holeW, sideW, env.ductMat, liningH);
                        c.position.set(cx, holeH - liningH / 2, cz - sideOffset);
                        addGeometry(c);
                        const ll = buildWall(liningH, sideW, env.ductMat, sideH);
                        ll.position.set(cx - (holeW / 2) + (liningH / 2), holeH / 2, cz - sideOffset);
                        addGeometry(ll);
                        const lr = buildWall(liningH, sideW, env.ductMat, sideH);
                        lr.position.set(cx + (holeW / 2) - (liningH / 2), holeH / 2, cz - sideOffset);
                        addGeometry(lr);
                    } else {
                        const b = buildWall(holeW, sideW, env.sharedWallMat);
                        b.position.set(cx, 1.5, cz - sideOffset);
                        addWall(b);
                        const l = buildWall(holeW, liningH, env.ductMat, sideH);
                        l.position.set(cx, holeH / 2, cz - sideOffset + (sideW / 2) - (liningH / 2));
                        addGeometry(l);
                    }

                    if (sConn) {
                        const r = buildWall(holeW, sideW, env.sharedWallMat, topH, holeH);
                        r.position.set(cx, holeH + topH / 2, cz + sideOffset);
                        addGeometry(r);
                        const f = buildWall(holeW, sideW, env.ductMat, liningH);
                        f.position.set(cx, liningH / 2, cz + sideOffset);
                        addGeometry(f);
                        const c = buildWall(holeW, sideW, env.ductMat, liningH);
                        c.position.set(cx, holeH - liningH / 2, cz + sideOffset);
                        addGeometry(c);
                        const ll = buildWall(liningH, sideW, env.ductMat, sideH);
                        ll.position.set(cx - (holeW / 2) + (liningH / 2), holeH / 2, cz + sideOffset);
                        addGeometry(ll);
                        const lr = buildWall(liningH, sideW, env.ductMat, sideH);
                        lr.position.set(cx + (holeW / 2) - (liningH / 2), holeH / 2, cz + sideOffset);
                        addGeometry(lr);
                    } else {
                        const b = buildWall(holeW, sideW, env.sharedWallMat);
                        b.position.set(cx, 1.5, cz + sideOffset);
                        addWall(b);
                        const l = buildWall(holeW, liningH, env.ductMat, sideH);
                        l.position.set(cx, holeH / 2, cz + sideOffset - (sideW / 2) + (liningH / 2));
                        addGeometry(l);
                    }

                    if (wConn) {
                        const r = buildWall(sideW, holeW, env.sharedWallMat, topH, holeH);
                        r.position.set(cx - sideOffset, holeH + topH / 2, cz);
                        addGeometry(r);
                        const f = buildWall(sideW, holeW, env.ductMat, liningH);
                        f.position.set(cx - sideOffset, liningH / 2, cz);
                        addGeometry(f);
                        const c = buildWall(sideW, holeW, env.ductMat, liningH);
                        c.position.set(cx - sideOffset, holeH - liningH / 2, cz);
                        addGeometry(c);
                        const ll = buildWall(sideW, liningH, env.ductMat, sideH);
                        ll.position.set(cx - sideOffset, holeH / 2, cz - (holeW / 2) + (liningH / 2));
                        addGeometry(ll);
                        const lr = buildWall(sideW, liningH, env.ductMat, sideH);
                        lr.position.set(cx - sideOffset, holeH / 2, cz + (holeW / 2) - (liningH / 2));
                        addGeometry(lr);
                    } else {
                        const b = buildWall(sideW, holeW, env.sharedWallMat);
                        b.position.set(cx - sideOffset, 1.5, cz);
                        addWall(b);
                        const l = buildWall(liningH, holeW, env.ductMat, sideH);
                        l.position.set(cx - sideOffset + (sideW / 2) - (liningH / 2), holeH / 2, cz);
                        addGeometry(l);
                    }

                    if (eConn) {
                        const r = buildWall(sideW, holeW, env.sharedWallMat, topH, holeH);
                        r.position.set(cx + sideOffset, holeH + topH / 2, cz);
                        addGeometry(r);
                        const f = buildWall(sideW, holeW, env.ductMat, liningH);
                        f.position.set(cx + sideOffset, liningH / 2, cz);
                        addGeometry(f);
                        const c = buildWall(sideW, holeW, env.ductMat, liningH);
                        c.position.set(cx + sideOffset, holeH - liningH / 2, cz);
                        addGeometry(c);
                        const ll = buildWall(sideW, liningH, env.ductMat, sideH);
                        ll.position.set(cx + sideOffset, holeH / 2, cz - (holeW / 2) + (liningH / 2));
                        addGeometry(ll);
                        const lr = buildWall(sideW, liningH, env.ductMat, sideH);
                        lr.position.set(cx + sideOffset, holeH / 2, cz + (holeW / 2) - (liningH / 2));
                        addGeometry(lr);
                    } else {
                        const b = buildWall(sideW, holeW, env.sharedWallMat);
                        b.position.set(cx + sideOffset, 1.5, cz);
                        addWall(b);
                        const l = buildWall(liningH, holeW, env.ductMat, sideH);
                        l.position.set(cx + sideOffset - (sideW / 2) + (liningH / 2), holeH / 2, cz);
                        addGeometry(l);
                    }

                    const grateOffset = (env.cellSize / 2) - 0.07;
                    if (ctx.addGrate) {
                        if (cell.exits.N) ctx.addGrate(cx, 0.35, cz - grateOffset, false);
                        if (cell.exits.S) ctx.addGrate(cx, 0.35, cz + grateOffset, false);
                        if (cell.exits.E) ctx.addGrate(cx + grateOffset, 0.35, cz, true);
                        if (cell.exits.W) ctx.addGrate(cx - grateOffset, 0.35, cz, true);
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
