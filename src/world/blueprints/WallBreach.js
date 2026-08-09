/**
 * [ROLE] Generates a breached wall opening (a broken door frame or rubble gap) in place of a solid wall cell.
 * [WHY] Gives the maze visual variety and alternate routes where a wall would otherwise be a dead, uniform surface.
 * [STATE] Stateless; returns a configuration object with a build function. `prob: 0` means it's only placed by explicit reference, not random rolls.
 * [DEPENDS] Depends on env properties and context functions like addGeometry, buildWall, buildSaggingHeader, random, the caller's isWallCell, and env.pittedMetalMat/metalMat (cloned into env.doorFrameMat for ambient-lit visibility).
 */
export const WallBreachProfile = (env, ctx) => {
    const { random, buildWall, buildSaggingHeader } = ctx;
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

            if (breachType > 0.6) {
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
            } else if (breachType > 0.3) {
                const wallG = new THREE.Group();
                const bGeo = new THREE.BoxGeometry(env.cellSize, 0.6, env.cellSize);
                const b1 = new THREE.Mesh(bGeo, env.sharedWallMat);
                b1.position.set(0, 0.3, 0);
                wallG.add(b1);

                const sGeo = new THREE.BoxGeometry((env.cellSize - 1.2) / 2, 2.4, env.cellSize);
                const s1 = new THREE.Mesh(sGeo, env.sharedWallMat);
                s1.position.set(-(env.cellSize/2) + sGeo.parameters.width/2, 1.8, 0);
                const s2 = new THREE.Mesh(sGeo, env.sharedWallMat);
                s2.position.set((env.cellSize/2) - sGeo.parameters.width/2, 1.8, 0);
                wallG.add(s1);
                wallG.add(s2);

                const tGeo = new THREE.BoxGeometry(1.2, 3.0 - 1.8, env.cellSize);
                const t1 = new THREE.Mesh(tGeo, env.sharedWallMat);
                t1.position.set(0, 1.8 + tGeo.parameters.height/2, 0);
                wallG.add(t1);

                const grateGeo = new THREE.BoxGeometry(1.16, 1.16, 0.08);
                const grateMat = env.cartLatticeMat || env.pittedMetalMat;
                const gratePivot = new THREE.Group();
                gratePivot.position.set(-0.58, 1.2, (env.cellSize / 2) - 0.04);
                gratePivot.rotation.y = Math.PI * 0.42;
                const grate = new THREE.Mesh(grateGeo, grateMat);
                grate.position.set(0.58, 0, 0);
                gratePivot.add(grate);
                wallG.add(gratePivot);

                if (!env.hazardTapeMat) {
                    env.hazardTapeMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.9 });
                    env.hazardTapeMat.userData.noShadow = true;
                }
                const stripeUnitGeo = env._cacheGeo('hazard_tape_unit', () => new THREE.BoxGeometry(1, 0.06, 0.08));
                const stripeY = 1.8 - 0.04;
                const stripeWidth = 1.1;
                [-1, 1].forEach(sign => {
                    const strip = new THREE.Mesh(stripeUnitGeo, env.hazardTapeMat);
                    strip.scale.set(stripeWidth, 1, 1);
                    strip.position.set(0, stripeY, sign * (env.cellSize / 2 - 0.06));
                    strip.userData.noCollision = true;
                    wallG.add(strip);
                });

                addGroupToStaging(wallG);
            } else {
                // Built with buildWall (not raw Mesh+BoxGeometry) so these get the same
                // UV rescale-to-cellSize treatment as every other wall -- the wallpaper
                // used to tile at the wrong frequency here -- and so the floor-touching
                // pieces (s1/s2) pick up buildWall's baseboardFootprint tag and actually
                // get a baseboard like a normal wall does. Since that requires *world*
                // position/rotation on the mesh itself (addGeometry's baseboard math reads
                // mesh.position/mesh.rotation.y directly, not a parent transform), these are
                // placed directly rather than as Group children the way addGroupToStaging
                // expects -- toWorld() reproduces the same px/pz + rot placement by hand.
                // The random cant on all three pieces is deliberate: this is rubble, not a
                // clean opening, and it's meant to look like it's leaning.
                const rotAxis = new THREE.Vector3(0, 1, 0);
                const toWorld = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(rotAxis, rot).add(new THREE.Vector3(px, 0, pz));

                const s1 = buildWall(1.0, env.cellSize, env.sharedWallMat);
                s1.position.copy(toWorld(-1.5, 1.5, 0));
                s1.rotation.y = rot + (random() - 0.5) * 0.4;
                s1.userData.isEntityBlocker = true;
                ctx.addGeometry(s1);

                const s2 = buildWall(1.4, env.cellSize, env.sharedWallMat);
                s2.position.copy(toWorld(1.3, 1.5, 0));
                s2.rotation.y = rot + (random() - 0.5) * 0.4;
                s2.userData.isEntityBlocker = true;
                ctx.addGeometry(s2);

                // A flat crooked box here read as a rendering glitch rather than damage.
                // buildSaggingHeader sags along the full cell depth (env.cellSize/2 half-span)
                // -- the direction the player actually walks through the breach -- dipping to
                // a forced-crouch clearance at the midpoint (1.5 world units, comfortably in
                // the 1.3-2.5 crouch band, see PlayerController's maxAvailableHeight check)
                // and flush with the pillars at both ends of the passage. crossWidth (1.6)
                // is the opening's width, constant across the sag -- the ceiling settles
                // straight down along your path, it doesn't lean to one side of the doorway.
                // Left un-rotated (aside from `rot`) since a roll on an asymmetric arc would
                // throw its flush ends out of alignment with s1/s2.
                const t1 = buildSaggingHeader(env.cellSize / 2, 1.0, 0.5, 1.6, env.sharedWallMat);
                t1.position.copy(toWorld(0, 2.0, 0));
                t1.rotation.y = rot;
                t1.userData.isEntityBlocker = true;
                ctx.addGeometry(t1);
            }
        }
    };
};
