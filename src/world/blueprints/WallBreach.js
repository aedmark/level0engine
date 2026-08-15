/**
 * [ROLE] Generates a breached wall opening (a broken door frame or a grated crawl gap) in place of a solid wall cell.
 * [WHY] Gives the maze visual variety and alternate routes where a wall would otherwise be a dead, uniform surface.
 * [STATE] Stateless; returns a configuration object with a build function. `prob: 0` means it's only placed by explicit reference, not random rolls.
 * [DEPENDS] Depends on env properties and context functions like addGeometry, addGrate, buildWall, random, the caller's isWallCell, and env.pittedMetalMat/metalMat (cloned into env.doorFrameMat for ambient-lit visibility).
 */
export const WallBreachProfile = (env, ctx) => {
    const { random, buildWall } = ctx;
    return {
        name: "breach",
        prob: 0,
        build: (x, z, isWallCell) => {
            const breachType = random();
            const isRotated = isWallCell(x, z - 1) || isWallCell(x, z + 1);
            const rot = isRotated ? Math.PI / 2 : 0;
            const px = x * env.cellSize;
            const pz = z * env.cellSize;

            const addGroupToStaging = (grp) => {
                grp.position.set(px, 0, pz);
                grp.rotation.y = rot;
                grp.updateMatrixWorld(true);
                const children = [...grp.children];
                for (const child of children) {
                    if (child.isMesh) {
                        child.userData.isEntityBlocker = true;
                        
                        // Detach to apply world transform properly to position/rotation
                        grp.remove(child);
                        child.applyMatrix4(grp.matrixWorld);
                        
                        ctx.addGeometry(child);
                    }
                }
            };

            const FRAME_CUTOFF = 3 / 7;
            if (breachType > FRAME_CUTOFF) {
                const startX = Math.floor(x / env.chunkSize) * env.chunkSize;
                const startZ = Math.floor(z / env.chunkSize) * env.chunkSize;
                const inChunk = (cx, cz) => cx >= startX && cx < startX + env.chunkSize && cz >= startZ && cz < startZ + env.chunkSize;

                const blockers = ["breach", "CREVICE_HALL", "HINGED DOORWAY", "DUCT OR VENT", "HATCH", "CRATES OR STAIRWAY"];
                let dLeft = 0;
                while (dLeft < 5) {
                    const chkX = isRotated ? x : x - (dLeft + 1);
                    const chkZ = isRotated ? z + (dLeft + 1) : z;
                    if (!inChunk(chkX, chkZ)) break;
                    const forced = ctx.getForcedStructure ? ctx.getForcedStructure(chkX, chkZ) : null;
                    if (isWallCell(chkX, chkZ) || blockers.includes(forced)) break;
                    dLeft++;
                }

                let dRight = 0;
                while (dRight < 5) {
                    const chkX = isRotated ? x : x + (dRight + 1);
                    const chkZ = isRotated ? z - (dRight + 1) : z;
                    if (!inChunk(chkX, chkZ)) break;
                    const forced = ctx.getForcedStructure ? ctx.getForcedStructure(chkX, chkZ) : null;
                    if (isWallCell(chkX, chkZ) || blockers.includes(forced)) break;
                    dRight++;
                }

                const g = new THREE.Group();
                const baseStubW = (env.cellSize - 1.4) / 2;
                
                const leftW = baseStubW + dLeft * env.cellSize;
                const stub1 = buildWall(leftW, 0.2, env.sharedWallMat, 3.0, 0);
                stub1.position.set(-0.7 - leftW / 2, 1.5, 0);
                g.add(stub1);
                
                const rightW = baseStubW + dRight * env.cellSize;
                const stub2 = buildWall(rightW, 0.2, env.sharedWallMat, 3.0, 0);
                stub2.position.set(0.7 + rightW / 2, 1.5, 0);
                g.add(stub2);
                
                env._breachWalls = env._breachWalls || [];
                env._breachWalls.push(stub1, stub2);

                const headW = 1.4;
                const head1 = buildWall(headW, 0.2, env.sharedWallMat, 0.4, 2.6);
                head1.position.set(0, 2.8, 0);
                g.add(head1);
                
                const frameMat = env.woodMat || env.sharedWallMat;
                const jamb1 = buildWall(0.1, 0.24, frameMat, 2.67, 0);
                jamb1.position.set(-headW / 2 + 0.05, 1.335, 0);
                g.add(jamb1);
                
                const jamb2 = buildWall(0.1, 0.24, frameMat, 2.67, 0);
                jamb2.position.set(headW / 2 - 0.05, 1.335, 0);
                g.add(jamb2);
                
                const topJamb = buildWall(headW - 0.2, 0.24, frameMat, 0.1, 2.62);
                topJamb.position.set(0, 2.62, 0);
                g.add(topJamb);
                
                addGroupToStaging(g);
            } else {
                const OPENING_W = 1.2;
                const SILL_H = 0.0;
                const HEAD_Y = 2.2;
                const jambW = (env.cellSize - OPENING_W) / 2;
                const headH = 3.0 - HEAD_Y;
                const ccx = x * env.cellSize;
                const ccz = z * env.cellSize;

                const nOpen = !isWallCell(x, z - 1);
                const sOpen = !isWallCell(x, z + 1);
                const eOpen = !isWallCell(x + 1, z);
                const wOpen = !isWallCell(x - 1, z);

                if (SILL_H > 0) {
                    const sill = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, SILL_H);
                    sill.userData.baseboardFootprint = {w: env.cellSize, d: env.cellSize, h: SILL_H};
                    sill.position.set(ccx, SILL_H / 2, ccz);
                    sill.userData.isEntityBlocker = true;
                    ctx.addGeometry(sill);
                }

                const header = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, headH, HEAD_Y);
                header.position.set(ccx, HEAD_Y + headH / 2, ccz);
                header.userData.isEntityBlocker = true;
                ctx.addGeometry(header);

                const corners = [
                    {x: -1, z: -1}, {x: 1, z: -1}, {x: -1, z: 1}, {x: 1, z: 1}
                ];
                corners.forEach(c => {
                    const pillar = buildWall(jambW, jambW, env.sharedWallMat, HEAD_Y - SILL_H, SILL_H);
                    pillar.position.set(ccx + c.x * (env.cellSize / 2 - jambW / 2), (HEAD_Y + SILL_H) / 2, ccz + c.z * (env.cellSize / 2 - jambW / 2));
                    pillar.userData.isEntityBlocker = true;
                    if (SILL_H === 0) {
                        pillar.userData.baseboardFootprint = {w: jambW, d: jambW, h: HEAD_Y - SILL_H};
                    }
                    ctx.addGeometry(pillar);
                });

                const fillClosedFace = (isX, sign) => {
                    const fw = isX ? jambW : OPENING_W;
                    const fd = isX ? OPENING_W : jambW;
                    const fill = buildWall(fw, fd, env.sharedWallMat, HEAD_Y - SILL_H, SILL_H);
                    const fx = isX ? sign * (env.cellSize / 2 - jambW / 2) : 0;
                    const fz = isX ? 0 : sign * (env.cellSize / 2 - jambW / 2);
                    fill.position.set(ccx + fx, (HEAD_Y + SILL_H) / 2, ccz + fz);
                    fill.userData.isEntityBlocker = true;
                    if (SILL_H === 0) {
                        fill.userData.baseboardFootprint = {w: fw, d: fd, h: HEAD_Y - SILL_H};
                    }
                    ctx.addGeometry(fill);
                };

                if (!nOpen) fillClosedFace(false, -1);
                if (!sOpen) fillClosedFace(false, 1);
                if (!eOpen) fillClosedFace(true, 1);
                if (!wOpen) fillClosedFace(true, -1);

                const GRATE_GAP = 0.12;
                const snap = (v) => Math.round(v * 10000) / 10000;
                const faceOffset = (env.cellSize / 2) - 0.04;
                const isBreach = (bx, bz) => ctx.getForcedStructure && ctx.getForcedStructure(bx, bz) === 'breach';

                const frameMat = env.woodMat || env.sharedWallMat;
                const frameD = 0.1;
                const frameT = GRATE_GAP / 2;
                const doorW = OPENING_W - GRATE_GAP;
                const doorH = (HEAD_Y - SILL_H) - GRATE_GAP;

                const addDoor = (isX, sign) => {
                    const px = ccx + (isX ? sign * faceOffset : 0);
                    const pz = ccz + (isX ? 0 : sign * faceOffset);
                    
                    ctx.addGrate(px, (SILL_H + HEAD_Y) / 2, pz, isX, {
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
                        trim.position.set(ccx + tx, ty + th / 2, ccz + tz);
                        trim.userData.isEntityBlocker = true;
                        ctx.addGeometry(trim);
                    };

                    const frameDepthOffset = sign * faceOffset;
                    const jambX = isX ? frameDepthOffset : 0;
                    const jambZ = isX ? 0 : frameDepthOffset;
                    const sideOffset = OPENING_W / 2 - frameT / 2;
                    
                    addTrim(frameT, doorH, jambX + (isX ? 0 : sideOffset), SILL_H + frameT, jambZ + (isX ? sideOffset : 0));
                    addTrim(frameT, doorH, jambX - (isX ? 0 : sideOffset), SILL_H + frameT, jambZ - (isX ? sideOffset : 0));
                    
                    addTrim(OPENING_W, frameT, jambX, HEAD_Y - frameT, jambZ);
                    addTrim(OPENING_W, frameT, jambX, SILL_H, jambZ);
                };

                if (nOpen && !isBreach(x, z - 1)) addDoor(false, -1);
                if (sOpen && !isBreach(x, z + 1)) addDoor(false, 1);
                if (eOpen && !isBreach(x + 1, z)) addDoor(true, 1);
                if (wOpen && !isBreach(x - 1, z)) addDoor(true, -1);
            }
        }
    };
};
