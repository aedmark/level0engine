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
                const rotAxis = new THREE.Vector3(0, 1, 0);
                const toWorld = (cellX, cellZ, lx, ly, lz) => new THREE.Vector3(lx, ly, lz)
                    .applyAxisAngle(rotAxis, rot)
                    .add(new THREE.Vector3(cellX * env.cellSize, 0, cellZ * env.cellSize));

                const alongX = isRotated;

                const spanTarget = random() > 0.72 ? (random() > 0.6 ? 3 : 2) : 1;

                const cells = [{cx: x, cz: z}];
                if (spanTarget > 1) {
                    const mod = alongX
                        ? ((x % env.chunkSize) + env.chunkSize) % env.chunkSize
                        : ((z % env.chunkSize) + env.chunkSize) % env.chunkSize;
                    const firstDir = random() > 0.5 ? 1 : -1;
                    for (const dir of [firstDir, -firstDir]) {
                        if (cells.length > 1) break;
                        const room = dir > 0 ? (env.chunkSize - 1 - mod) : mod;
                        for (let i = 1; i < spanTarget && i <= room; i++) {
                            const nx = x + (alongX ? dir * i : 0);
                            const nz = z + (alongX ? 0 : dir * i);
                            if (ctx.isOccupied && ctx.isOccupied(nx, nz)) break;
                            if (ctx.isWall && ctx.isWall(nx, nz)) break;
                            if (ctx.markOccupied) ctx.markOccupied(nx, nz);
                            cells.push({cx: nx, cz: nz});
                        }
                    }
                    cells.sort((a, b) => alongX ? a.cx - b.cx : a.cz - b.cz);
                }

                const jambW = (env.cellSize - OPENING_W) / 2;
                const headH = 3.0 - HEAD_Y;

                cells.forEach(cell => {
                    const ccx = cell.cx * env.cellSize;
                    const ccz = cell.cz * env.cellSize;

                    const sill = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, SILL_H);
                    sill.position.set(ccx, SILL_H / 2, ccz);
                    sill.rotation.y = rot;
                    sill.userData.isEntityBlocker = true;
                    ctx.addGeometry(sill);

                    const wallG = new THREE.Group();
                    const s1 = buildWall(jambW, env.cellSize, env.sharedWallMat, 3.0 - SILL_H, SILL_H);
                    s1.position.set(-(env.cellSize / 2) + jambW / 2, HEAD_Y, 0);
                    const s2 = buildWall(jambW, env.cellSize, env.sharedWallMat, 3.0 - SILL_H, SILL_H);
                    s2.position.set((env.cellSize / 2) - jambW / 2, HEAD_Y, 0);
                    wallG.add(s1);
                    wallG.add(s2);

                    const t1 = buildWall(OPENING_W, env.cellSize, env.sharedWallMat, headH, HEAD_Y);
                    t1.position.set(0, HEAD_Y + headH / 2, 0);
                    wallG.add(t1);

                    wallG.position.set(ccx, 0, ccz);
                    wallG.rotation.y = rot;
                    wallG.updateMatrixWorld(true);
                    wallG.traverse(child => {
                        if (child.isMesh) {
                            child.userData.isEntityBlocker = true;
                            ctx.addGeometry(child);
                        }
                    });
                });

                const GRATE_GAP = 0.12;
                const snap = (v) => Math.round(v * 10000) / 10000;
                const faceOffset = (env.cellSize / 2) - 0.04;
                const mouths = [
                    {cell: cells[0], sign: -1},
                    {cell: cells[cells.length - 1], sign: 1}
                ];
                mouths.forEach(mouth => {
                    const p = toWorld(mouth.cell.cx, mouth.cell.cz,
                        0, (SILL_H + HEAD_Y) / 2, mouth.sign * faceOffset);
                    ctx.addGrate(p.x, p.y, p.z, isRotated, {
                        width: snap(OPENING_W - GRATE_GAP),
                        height: snap((HEAD_Y - SILL_H) - GRATE_GAP),
                        thickness: 0.08,
                        hinged: true,
                        openSign: mouth.sign,
                        mat: env.cartLatticeMat || env.pittedMetalMat
                    });
                });
            }
        }
    };
};
