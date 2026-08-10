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

            // The third variant (rubble pillars under a sagging extruded header) used to take
            // breachType <= 0.3. Its share is handed to the two survivors in the 0.4 : 0.3 ratio
            // they already had, so the mix you encounter stays as it was rather than skewing.
            const FRAME_CUTOFF = 3 / 7;
            if (breachType > FRAME_CUTOFF) {
                if (!env.doorFrameMat) {
                    // pittedMetalMat/metalMat are metalness 0.75+ and the scene has no
                    // envMap, so they rely on a nearby LumenGrid fixture for any visible
                    // specular -- fine for props that spawn paired with a light, but this
                    // frame can land anywhere a wall could, with no such guarantee. Under
                    // ambient/hemisphere light alone a high-metalness surface reads as
                    // near-black (physically correct PBR, but looked like a rendering
                    // glitch here). Clone the base material and dial metalness down /
                    // roughness up so it stays legible in ambient light like the walls
                    // around it, without touching the shared material other lit props use.
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

                // The slot runs along local Z, so that's the direction you crawl: world Z while
                // rot is 0, world X once the group is turned a quarter. Extra cells are claimed
                // along that same axis, which makes the crawl deeper rather than wider.
                const alongX = isRotated;

                // Mostly one cell, so a breach still reads as a hole punched through a wall
                // rather than a corridor in its own right; sometimes two, occasionally three.
                const spanTarget = random() > 0.72 ? (random() > 0.6 ? 3 : 2) : 1;

                const cells = [{cx: x, cz: z}];
                if (spanTarget > 1) {
                    const mod = alongX
                        ? ((x % env.chunkSize) + env.chunkSize) % env.chunkSize
                        : ((z % env.chunkSize) + env.chunkSize) % env.chunkSize;
                    const firstDir = random() > 0.5 ? 1 : -1;
                    for (const dir of [firstDir, -firstDir]) {
                        if (cells.length > 1) break;
                        // Kept inside the chunk. Geometry is staged under this chunk's hash and
                        // unloads with it, so a segment spilling over the boundary would vanish
                        // on this chunk's schedule while the neighbour rebuilt its own cell on
                        // top of it.
                        const room = dir > 0 ? (env.chunkSize - 1 - mod) : mod;
                        for (let i = 1; i < spanTarget && i <= room; i++) {
                            const nx = x + (alongX ? dir * i : 0);
                            const nz = z + (alongX ? 0 : dir * i);
                            // The main loop marks every cell occupied as it handles it and skips
                            // anything already marked, so this both avoids stacking onto geometry
                            // that has already been built and reserves the cell from whatever
                            // would otherwise be placed there later.
                            if (ctx.isOccupied && ctx.isOccupied(nx, nz)) break;
                            if (ctx.isWall && ctx.isWall(nx, nz)) break;
                            if (ctx.markOccupied) ctx.markOccupied(nx, nz);
                            cells.push({cx: nx, cz: nz});
                        }
                    }
                    // Ascending world order along the travel axis is also ascending local Z, so
                    // after this the ends of the run are simply the first and last entries.
                    cells.sort((a, b) => alongX ? a.cx - b.cx : a.cz - b.cz);
                }

                const jambW = (env.cellSize - OPENING_W) / 2;
                const headH = 3.0 - HEAD_Y;

                cells.forEach(cell => {
                    const ccx = cell.cx * env.cellSize;
                    const ccz = cell.cz * env.cellSize;

                    // The sill is the only floor-touching piece, so it goes through buildWall to
                    // pick up the baseboardFootprint tag. That requires a *world* transform on
                    // the mesh itself, since addGeometry's baseboard math reads mesh.position and
                    // mesh.rotation.y directly and ignores parent transforms, so it can't ride
                    // along inside the group.
                    const sill = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, SILL_H);
                    sill.position.set(ccx, SILL_H / 2, ccz);
                    sill.rotation.y = rot;
                    sill.userData.isEntityBlocker = true;
                    ctx.addGeometry(sill);

                    // Jambs and header go through buildWall rather than raw BoxGeometry for two
                    // reasons. buildWall inflates every piece by 0.02, so mixing the two left the
                    // sill standing proud of the wall above it as a visible lip. And buildWall
                    // rescales V by h/3 offset by yOffset/3, so each piece continues the wallpaper
                    // from where the one below it ended -- raw geometry stretched a full 0-1 span
                    // over its own height, which made the pattern tile finer above the sill.
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

                // Both ends get a grate, so a span is sealed at each mouth rather than open at
                // the back. They spawn shut and blocking, on the engine's standard grate
                // contract: the player pries one open with 'E' and InteractionController clears
                // the collider. Interactable rather than fixed because breach cells are what
                // forcedOpen carves to guarantee connectivity -- a permanently sealed one would
                // dead-end a route the pathfinder assumed was walkable. Hinged so it swings out
                // of the opening; the fall-flat animation spins the panel about its own centre,
                // which sends it through the wall it's mounted in. openSign flips the swing on
                // the far mouth so that one opens outward too instead of into the crawl.
                const GRATE_GAP = 0.12;
                // Rounded for the same reason buildWall rounds its own dims: boxGeo caches on a
                // raw string key, and 1.2 - 0.12 stringifies as 1.0799999999999998, which would
                // sit in the cache as a near-duplicate of an otherwise identical 1.08 box.
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
