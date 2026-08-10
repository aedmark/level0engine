/**
 * [ROLE] Spawns a physical, interactable hinged door inside a frame, at any of four facings.
 * [WHY] Creates discrete room divisions and requires player interaction, controlling pacing.
 * [STATE] Stateless builder, but pushes door entities into environment tracking arrays (interactiveDoors, spatialGrid).
 * [DEPENDS] Shared geometry, chunk groups, grid hashes, door materials, and ctx.getDoorwayPlan for its facing.
 *
 * The corridor behind a door is laid out by ChunkManager's pre-pass, not here. Carving from
 * inside the build loop could only claim cells the loop had not yet reached, which pinned every
 * door to a +Z facing; the planner runs before anything is staged, so it can face any direction.
 * This file just reads the facing back and builds geometry on it.
 */
export const HingedDoorwayProfile = (env, ctx) => {
    const {buildWall, addGeometry, chunkGroup, hash} = ctx;
    return {
        name: "HINGED DOORWAY",
        // The band is kept at its original width even though real placement now comes from the
        // pre-pass. Raising prob out of range would have handed these eight points to the next
        // profile down -- NARROW HEADER GAP would have gone from 4% to 12% of wall cells --
        // silently reshaping the whole level. So the roll still lands here and simply resolves
        // to plain wall when there's no plan behind it.
        prob: 0.78,
        build: (x, z) => {
            const plan = ctx.getDoorwayPlan ? ctx.getDoorwayPlan(x, z) : null;
            if (!plan) {
                // Drawn at random rather than planted by the planner. A door here would open
                // onto whatever the maze happened to leave behind it, with no corridor and no
                // facing, so this cell stays a wall.
                const solid = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                solid.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                addGeometry(solid);
                return;
            }
            const rot = plan.rot;
            const px = x * env.cellSize;
            const pz = z * env.cellSize;

            const rotAxis = new THREE.Vector3(0, 1, 0);
            const toWorld = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz)
                .applyAxisAngle(rotAxis, rot)
                .add(new THREE.Vector3(px, 0, pz));

            // Placed in world space rather than as children of a rotated group: addGeometry's
            // baseboard math reads mesh.position and mesh.rotation.y directly and ignores parent
            // transforms, so a grouped pillar would get its baseboard in the wrong place.
            const pW = 1.2, offset = (env.cellSize / 2) - (pW / 2), gap = env.cellSize - (pW * 2);
            const p1 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p1.position.copy(toWorld(-offset, 1.5, 0));
            p1.rotation.y = rot;
            addGeometry(p1);
            const p2 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p2.position.copy(toWorld(offset, 1.5, 0));
            p2.rotation.y = rot;
            addGeometry(p2);

            const top = new THREE.Mesh(env._boxGeo(gap, 0.3, env.cellSize), env.headerMat);
            top.position.copy(toWorld(0, 2.85, 0));
            top.rotation.y = rot;
            addGeometry(top);

            const frameMat = env.woodMat;
            const jambL = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.32), frameMat);
            jambL.position.copy(toWorld(-0.75, 1.325, 1.85));
            jambL.rotation.y = rot;
            addGeometry(jambL);
            const jambR = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.32), frameMat);
            jambR.position.copy(toWorld(0.75, 1.325, 1.85));
            jambR.rotation.y = rot;
            addGeometry(jambR);
            const jambT = new THREE.Mesh(env._boxGeo(1.6, 0.1, 0.32), frameMat);
            jambT.position.copy(toWorld(0, 2.70, 1.85));
            jambT.rotation.y = rot;
            addGeometry(jambT);

            const doorGeo = env._cacheGeo('hingedDoor:X', () => {
                const g = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                g.translate(0.7, 0, 0.05);
                return g;
            });
            const door = new THREE.Mesh(doorGeo, env.doorMat);
            door.position.copy(toWorld(-0.7, 1.325, 1.85));
            door.rotation.y = rot;
            door.castShadow = door.receiveShadow = true;
            // closedRot carries the facing into InteractionController, which infers from it
            // whether the player's approach is measured along Z (rot 0 or PI) or X (rot +/-PI/2)
            // and swings the leaf away from whichever side they arrive on.
            door.userData = {
                chunkHash: hash,
                closedRot: rot,
                currentRot: rot
            };
            chunkGroup.add(door);
            env.interactiveDoors.push(door);
            env.walls.push(door);
            door.updateMatrixWorld();
            const dBox = new THREE.Box3().setFromObject(door);
            dBox.chunkHash = hash;
            door.userData.box = dBox;
            env.spatialGrid.insert(dBox);
        }
    };
};
