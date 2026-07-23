// BoardroomSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const BoardroomSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildChair,
        buildTable,
        buildCouch,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;

    return {
                id: "BOARDROOM",
                foundationMat: env.boardTileMat || env.tileMat,
                ceilingMat: env.clinicMat,
                build: (x, z, localX, localZ) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.boardWallMat || env.sharedWallMat, "BOARDROOM")) return;
                    const bx = x * env.cellSize, bz = z * env.cellSize;
                    const glass = env.glassMat || env.fabricMat;
                    const isC = (v) => v === 3 || v === 7 || v === 11;
                    const last = env.chunkSize - 2;
                    const edge = env.chunkSize - 1;
                    const foyerDepth = 2;
                    const foyerHalfWidth = 1;
                    const isFoyer = (lx, lz) =>
                        (lz <= foyerDepth && Math.abs(lx - 7) <= foyerHalfWidth) ||
                        (lz >= edge - foyerDepth && Math.abs(lx - 7) <= foyerHalfWidth) ||
                        (lx <= foyerDepth && Math.abs(lz - 7) <= foyerHalfWidth) ||
                        (lx >= edge - foyerDepth && Math.abs(lz - 7) <= foyerHalfWidth);
                    const isHallway = (lx, lz) => isC(lx) || isC(lz) || isFoyer(lx, lz);
                    const cellHash = (gx, gz) => {
                        const h = Math.sin(gx * 127.1 + gz * 311.7 + (env.baseSeed % 4096) * 0.618) * 43758.5453;
                        return h - Math.floor(h);
                    };
                    const isBowl = (gx, gz, lx, lz) =>
                        lx >= 1 && lx <= last && lz >= 1 && lz <= last &&
                        !isHallway(lx, lz) && cellHash(gx, gz) < 0.10;
                    const ceilingPanel = (px, pz) => {
                        const activeMat = ctx.getLightMaterial(0xe8f2ff, 0xd8e8ff, false);
                        const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
                        panel.position.set(px, 2.98, pz);
                        chunkGroup.add(panel);
                        env.walls.push(panel);
                        env.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(px, 2.8, pz),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.9,
                            baseIntensity: 0.65,
                            targetIntensity: 0.65,
                            currentIntensity: 0.65
                        });
                    };
                    if (isHallway(localX, localZ)) {
                        const junction = isC(localX) && isC(localZ);
                        if (!junction && (localX + localZ) % 2 === 0 && random() > 0.30) {
                            ceilingPanel(bx, bz);
                        } else if (junction && random() > 0.5) {
                            ceilingPanel(bx, bz);
                        }
                        if (isFoyer(localX, localZ) && !isC(localX) && !isC(localZ)) {
                            const inNSFoyer = (localZ <= foyerDepth || localZ >= edge - foyerDepth) && Math.abs(localX - 7) <= foyerHalfWidth;
                            const inWEFoyer = (localX <= foyerDepth || localX >= edge - foyerDepth) && Math.abs(localZ - 7) <= foyerHalfWidth;
                            let rotY = null;
                            if (inNSFoyer && Math.abs(localX - 7) === foyerHalfWidth) {
                                rotY = (localX < 7) ? Math.PI / 2 : -Math.PI / 2;
                            } else if (inWEFoyer && Math.abs(localZ - 7) === foyerHalfWidth) {
                                rotY = (localZ < 7) ? 0 : Math.PI;
                            }
                            if (rotY !== null && random() > 0.45) {
                                addFurniture(buildCouch(bx, 0, bz, rotY));
                            }
                        }
                        return;
                    }
                    const bowlHere = isBowl(x, z, localX, localZ);
                    const post = (px, pz, thick = 0.22) => {
                        const p = buildWall(thick, thick, env.metalMat, 3.0);
                        p.position.set(px, 1.5, pz);
                        addGeometry(p);
                    };
                    const pane = (alongX, px, pz, len) => {
                        if (len < 0.2) return;
                        const g = buildWall(alongX ? len : 0.06, alongX ? 0.06 : len, glass, 2.6);
                        g.position.set(px, 1.42, pz);
                        addGeometry(g);
                    };
                    const rails = (alongX, px, pz, len) => {
                        const sill = buildWall(alongX ? len : 0.22, alongX ? 0.22 : len, env.metalMat, 0.12);
                        sill.position.set(px, 0.06, pz);
                        addGeometry(sill);
                        const head = buildWall(alongX ? len : 0.22, alongX ? 0.22 : len, env.metalMat, 0.3);
                        head.position.set(px, 2.83, pz);
                        addGeometry(head);
                    };
                    const hangDoor = (alongX, hx, hz, closedRot) => {
                        const doorGeo = env._cacheGeo('vestibuleDoor', () => {
                            const g = new THREE.BoxGeometry(1.0, 2.55, 0.07);
                            g.translate(0.5, 0, 0);
                            return g;
                        });
                        const door = new THREE.Mesh(doorGeo, glass);
                        door.position.set(hx, 1.315, hz);
                        door.rotation.y = closedRot;
                        door.castShadow = door.receiveShadow = true;
                        door.userData = {chunkHash: hash, closedRot: closedRot, currentRot: closedRot};
                        chunkGroup.add(door);
                        env.interactiveDoors.push(door);
                        env.walls.push(door);
                        door.updateMatrixWorld();
                        const dBox = new THREE.Box3().setFromObject(door);
                        dBox.chunkHash = hash;
                        door.userData.box = dBox;
                        env.spatialGrid.insert(dBox);
                    };
                    const glassFace = (alongX, faceC, latC, len, withDoor) => {
                        const half = len / 2;
                        if (alongX) {
                            rails(true, latC, faceC, len);
                            post(latC - half + 0.11, faceC, 0.22);
                            post(latC + half - 0.11, faceC, 0.22);
                            if (withDoor) {
                                const dl = bx - 0.55, dr = bx + 0.55;
                                const lStart = latC - half + 0.22;
                                const rEnd = latC + half - 0.22;
                                pane(true, (lStart + dl) / 2, faceC, dl - lStart);
                                pane(true, (dr + rEnd) / 2, faceC, rEnd - dr);
                                post(dl, faceC, 0.1);
                                post(dr, faceC, 0.1);
                                hangDoor(true, bx - 0.5, faceC, 0);
                            } else {
                                pane(true, latC, faceC, len - 0.44);
                                post(latC, faceC, 0.1);
                            }
                        } else {
                            rails(false, faceC, latC, len);
                            post(faceC, latC - half + 0.11, 0.22);
                            post(faceC, latC + half - 0.11, 0.22);
                            if (withDoor) {
                                const dl = bz - 0.55, dr = bz + 0.55;
                                const lStart = latC - half + 0.22;
                                const rEnd = latC + half - 0.22;
                                pane(false, faceC, (lStart + dl) / 2, dl - lStart);
                                pane(false, faceC, (dr + rEnd) / 2, rEnd - dr);
                                post(faceC, dl, 0.1);
                                post(faceC, dr, 0.1);
                                hangDoor(false, faceC, bz + 0.5, Math.PI / 2);
                            } else {
                                pane(false, faceC, latC, len - 0.44);
                                post(faceC, latC, 0.1);
                            }
                        }
                    };
                    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                    const inSuite = (lx, lz) => lx >= 1 && lx <= last && lz >= 1 && lz <= last && !isHallway(lx, lz);
                    const corridorFaces = (lx, lz) => dirs.filter(([ddx, ddz]) => {
                        const nx = lx + ddx, nz = lz + ddz;
                        return nx >= 1 && nx <= last && nz >= 1 && nz <= last && isHallway(nx, nz);
                    });
                    const hasOwnDoor = (gx, gz, lx, lz) =>
                        corridorFaces(lx, lz).length > 0 && !isBowl(gx, gz, lx, lz) && cellHash(gx + 31, gz + 17) < 0.35;
                    const egress = (gx, gz, lx, lz) => {
                        const cf = corridorFaces(lx, lz);
                        if (cf.length) {
                            if (cellHash(gx + 31, gz + 17) < 0.35) {
                                return {door: cf[Math.floor(cellHash(gx + 7, gz + 13) * cf.length)]};
                            }
                            const dn = dirs.filter(([ddx, ddz]) => {
                                const nx = lx + ddx, nz = lz + ddz;
                                return inSuite(nx, nz) && hasOwnDoor(gx + ddx, gz + ddz, nx, nz);
                            });
                            if (dn.length) return {open: dn[Math.floor(cellHash(gx + 7, gz + 13) * dn.length)]};
                            return {door: cf[Math.floor(cellHash(gx + 7, gz + 13) * cf.length)]};
                        }
                        const bf = dirs.filter(([ddx, ddz]) => {
                            const nx = lx + ddx, nz = lz + ddz;
                            return inSuite(nx, nz) && corridorFaces(nx, nz).length > 0 && !isBowl(gx + ddx, gz + ddz, nx, nz);
                        });
                        if (!bf.length) return {};
                        return {open: bf[Math.floor(cellHash(gx + 7, gz + 13) * bf.length)]};
                    };
                    const myEgress = bowlHere ? {} : egress(x, z, localX, localZ);
                    for (let d = 0; d < 4; d++) {
                        const dx = dirs[d][0], dz = dirs[d][1];
                        const nlx = localX + dx, nlz = localZ + dz;
                        if (nlx < 1 || nlx > last || nlz < 1 || nlz > last) continue;
                        const alongX = dz !== 0;
                        const negLat = alongX ? localX - 1 : localZ - 1;
                        const posLat = alongX ? localX + 1 : localZ + 1;
                        const cornerExt = alongX ? 0.92 : 0.88;
                        const extNeg = (negLat >= 1 && (alongX ? isHallway(negLat, localZ) : isHallway(localX, negLat))) ? cornerExt : 0;
                        const extPos = (posLat <= last && (alongX ? isHallway(posLat, localZ) : isHallway(localX, posLat))) ? cornerExt : 0;
                        if (isHallway(nlx, nlz)) {
                            const faceC = alongX ? bz + dz * 2.8 : bx + dx * 2.8;
                            const len = env.cellSize + extNeg + extPos;
                            const latC = (alongX ? bx : bz) + (extPos - extNeg) / 2;
                            for (let e = -1; e <= 1; e += 2) {
                                const latEdge = (e < 0 ? negLat : posLat);
                                if (latEdge >= 1 && latEdge <= last) continue;
                                const startXw = x - localX, startZw = z - localZ;
                                const permGX = alongX ? latEdge : nlx;
                                const permGZ = alongX ? nlz : latEdge;
                                if (ctx.isOccupied && ctx.isOccupied(startXw + permGX, startZw + permGZ)) continue;
                                const retLat = (alongX ? bx : bz) + e * 2;
                                const retFace = (alongX ? bz : bx) + (alongX ? dz : dx) * 2.4;
                                const ret = buildWall(alongX ? 0.2 : 0.8, alongX ? 0.8 : 0.2, env.boardWallMat || env.sharedWallMat, 3.0);
                                ret.position.set(alongX ? retLat : retFace, 1.5, alongX ? retFace : retLat);
                                addGeometry(ret);
                            }
                            const adjLen = len - (extNeg === 0 ? 0.1 : 0) - (extPos === 0 ? 0.1 : 0);
                            const adjLatC = latC + (extNeg === 0 ? 0.05 : 0) - (extPos === 0 ? 0.05 : 0);
                            const isDoorFace = myEgress.door && myEgress.door[0] === dx && myEgress.door[1] === dz;
                            if (bowlHere) {
                                glassFace(alongX, faceC, adjLatC, adjLen, false);
                            } else if (isDoorFace) {
                                glassFace(alongX, faceC, adjLatC, adjLen, true);
                            } else if (random() < 0.18) {
                                glassFace(alongX, faceC, adjLatC, adjLen, false);
                            } else {
                                const wall = buildWall(alongX ? adjLen : 0.2, alongX ? 0.2 : adjLen, env.boardWallMat || env.sharedWallMat, 3.0);
                                wall.position.set(alongX ? adjLatC : faceC, 1.5, alongX ? faceC : adjLatC);
                                addGeometry(wall);
                            }
                        } else if (dx === 1 || dz === 1) {
                            const faceC = alongX ? bz + 2 : bx + 2;
                            const len = env.cellSize + extNeg + extPos;
                            const latC = (alongX ? bx : bz) + (extPos - extNeg) / 2;
                            const adjLen = len - (extNeg === 0 ? 0.1 : 0) - (extPos === 0 ? 0.1 : 0);
                            const adjLatC = latC + (extNeg === 0 ? 0.05 : 0) - (extPos === 0 ? 0.05 : 0);
                            const neighborBowl = isBowl(x + dx, z + dz, nlx, nlz);
                            if (bowlHere || neighborBowl) {
                                glassFace(alongX, faceC, adjLatC, adjLen, false);
                            } else {
                                const nbEgress = egress(x + dx, z + dz, nlx, nlz);
                                const forcedOpen =
                                    (myEgress.open && myEgress.open[0] === dx && myEgress.open[1] === dz) ||
                                    (nbEgress.open && nbEgress.open[0] === -dx && nbEgress.open[1] === -dz);
                                const roll = random();
                                if (forcedOpen || roll < 0.35) {
                                } else if (roll < 0.78) {
                                    glassFace(alongX, faceC, adjLatC, adjLen, false);
                                } else {
                                    const wall = buildWall(alongX ? adjLen : 0.15, alongX ? 0.15 : adjLen, env.boardWallMat || env.sharedWallMat, 3.0);
                                    wall.position.set(alongX ? adjLatC : faceC, 1.5, alongX ? faceC : adjLatC);
                                    addGeometry(wall);
                                }
                            }
                        }
                    }
                    if (inSuite(localX + 1, localZ) && inSuite(localX, localZ + 1) && inSuite(localX + 1, localZ + 1)) {
                        post(bx + 2, bz + 2, 0.24);
                    }
                    if (bowlHere) {
                        if (random() > 0.45) {
                            addFurniture(buildChair(bx + (random() - 0.5) * 1.2, 0, bz + (random() - 0.5) * 1.2, random() * Math.PI * 2));
                        } else {
                            const crtGroup = new THREE.Group();
                            const body = new THREE.Mesh(env.terminalBodyGeo, env.baseHousingMat);
                            const screen = new THREE.Mesh(env._boxGeo(0.45, 0.35, 0.05), env.baseHousingMat);
                            screen.position.set(0, 0, 0.26);
                            crtGroup.add(body, screen);
                            crtGroup.position.set(bx, 0.28, bz);
                            crtGroup.rotation.y = random() * Math.PI * 2;
                            addFurniture(crtGroup);
                        }
                        if (random() > 0.6) ceilingPanel(bx, bz);
                        return;
                    }
                    const dress = random();
                    if (dress < 0.45) {
                        const longX = random() > 0.5;
                        const confTable = new THREE.Group();
                        const top = new THREE.Mesh(env._boxGeo(longX ? 3.2 : 1.4, 0.08, longX ? 1.4 : 3.2), env.woodMat);
                        top.position.y = 0.82;
                        confTable.add(top);
                        for (let e = -1; e <= 1; e += 2) {
                            const ped = new THREE.Mesh(env.tableBaseGeo, env.structMat);
                            ped.position.set(longX ? e * 1.1 : 0, 0.4, longX ? 0 : e * 1.1);
                            confTable.add(ped);
                        }
                        confTable.position.set(bx, 0, bz);
                        addFurniture(confTable);
                        const sideOff = 1.15;
                        for (let sc = -1; sc <= 1; sc += 2) {
                            for (let sp = -1; sp <= 1; sp += 2) {
                                if (random() > 0.25) {
                                    const cxp = bx + (longX ? sp * 0.9 : sc * sideOff);
                                    const czp = bz + (longX ? sc * sideOff : sp * 0.9);
                                    const face = longX
                                        ? (sc > 0 ? Math.PI : 0)
                                        : (sc > 0 ? -Math.PI / 2 : Math.PI / 2);
                                    addFurniture(buildChair(cxp, 0, czp, face));
                                }
                            }
                        }
                        if (random() > 0.55) {
                            const crtGroup = new THREE.Group();
                            const body = new THREE.Mesh(env.terminalBodyGeo, env.baseHousingMat);
                            body.position.set(0, 0.2, 0);
                            const screen = new THREE.Mesh(env._boxGeo(0.45, 0.35, 0.05), env.crtScreenMat);
                            screen.position.set(0, 0.2, 0.26);
                            crtGroup.add(body, screen);
                            crtGroup.position.set(bx, 0.825, bz);
                            crtGroup.rotation.y = random() * Math.PI * 2;
                            chunkGroup.add(crtGroup);
                            crtGroup.updateMatrixWorld(true);
                            body.userData.chunkHash = hash;
                            screen.userData.chunkHash = hash;
                            stagingMeshes.push(body, screen);
                        }
                    } else if (dress < 0.57) {
                        const felled = buildChair(bx + (random() - 0.5) * 2.0, 0, bz + (random() - 0.5) * 2.0, random() * Math.PI * 2);
                        felled.rotation.z = (random() > 0.5 ? 1 : -1) * Math.PI / 2;
                        felled.position.y = 0.38;
                        addFurniture(felled);
                    }
                    if (random() > 0.62) ceilingPanel(bx, bz);
                }
            };
};
