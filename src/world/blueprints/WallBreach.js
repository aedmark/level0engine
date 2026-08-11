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
                grp.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isEntityBlocker = true;
                        ctx.addGeometry(child);
                    }
                });
            };

            const FRAME_CUTOFF = 3 / 7;
            if (breachType > FRAME_CUTOFF) {
                if (!env.doorFrameMat) {
                    env.doorFrameMat = (env.pittedMetalMat || env.metalMat).clone();
                    env.doorFrameMat.metalness = 0.2;
                    env.doorFrameMat.roughness = 0.7;
                }
                if (!env.doorFrameGeo) {
                    const g = new THREE.Group();
                    const pGeo = new THREE.BoxGeometry(0.2, 3.0, 0.6);
                    const p1 = new THREE.Mesh(pGeo, env.doorFrameMat);
                    p1.position.set(-1.2, 1.5, 0);
                    g.add(p1);
                    const p2 = new THREE.Mesh(pGeo, env.doorFrameMat);
                    p2.position.set(1.2, 1.5, 0);
                    g.add(p2);
                    const tGeo = new THREE.BoxGeometry(2.6, 0.2, 0.6);
                    const t1 = new THREE.Mesh(tGeo, env.doorFrameMat);
                    t1.position.set(0, 2.9, 0);
                    g.add(t1);
                    env.doorFrameGeo = g;
                }
                const frame = env.doorFrameGeo.clone();
                addGroupToStaging(frame);
            } else {
                const OPENING_W = 1.2;
                const SILL_H = 0.6;
                const HEAD_Y = 1.8;
                const jambW = (env.cellSize - OPENING_W) / 2;
                const headH = 3.0 - HEAD_Y;
                const ccx = x * env.cellSize;
                const ccz = z * env.cellSize;

                const nOpen = !isWallCell(x, z - 1);
                const sOpen = !isWallCell(x, z + 1);
                const eOpen = !isWallCell(x + 1, z);
                const wOpen = !isWallCell(x - 1, z);

                const sill = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, SILL_H);
                sill.position.set(ccx, SILL_H / 2, ccz);
                sill.userData.isEntityBlocker = true;
                ctx.addGeometry(sill);

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

                const addDoor = (isX, sign) => {
                    const px = ccx + (isX ? sign * faceOffset : 0);
                    const pz = ccz + (isX ? 0 : sign * faceOffset);
                    ctx.addGrate(px, (SILL_H + HEAD_Y) / 2, pz, isX, {
                        width: snap(OPENING_W - GRATE_GAP),
                        height: snap((HEAD_Y - SILL_H) - GRATE_GAP),
                        thickness: 0.1,
                        hinged: true,
                        openSign: isX ? sign : -sign,
                        mat: env.doorMat,
                        isMiniDoor: true
                    });
                };

                if (nOpen && !isBreach(x, z - 1)) addDoor(false, -1);
                if (sOpen && !isBreach(x, z + 1)) addDoor(false, 1);
                if (eOpen && !isBreach(x + 1, z)) addDoor(true, 1);
                if (wOpen && !isBreach(x - 1, z)) addDoor(true, -1);
            }
        }
    };
};
