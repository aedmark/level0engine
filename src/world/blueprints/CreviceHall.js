/**
 * [ROLE] Generates a narrow single-gap corridor cell, splitting the wall into two thick slabs (or a central pillar at a dead end).
 * [WHY] Adds a squeeze-through traversal variant distinct from a standard open corridor.
 * [STATE] Stateless; returns a configuration object with a build function. `prob: 0` means it's only placed by explicit reference, not random rolls.
 * [DEPENDS] Depends on env properties and context functions like addGeometry, buildWall, and isWall.
 */
export const CreviceHallProfile = (env, ctx) => {
    const { addGeometry, buildWall, isWall } = ctx;
    return {
        name: "CREVICE_HALL",
        prob: 0,
        build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;

            const pathZ = !isWall(x, z+1) || !isWall(x, z-1);
            const pathX = !isWall(x+1, z) || !isWall(x-1, z);

            const gap = 1.0;
            const wallThickness = (env.cellSize - gap) / 2;



            if (pathZ && !pathX) {
                const w1 = buildWall(wallThickness, env.cellSize, env.sharedWallMat);
                w1.position.set(cx - (env.cellSize/2) + (wallThickness/2), 1.5, cz);
                w1.userData.isEntityBlocker = true;
                addGeometry(w1);
                
                const w2 = buildWall(wallThickness, env.cellSize, env.sharedWallMat);
                w2.position.set(cx + (env.cellSize/2) - (wallThickness/2), 1.5, cz);
                w2.userData.isEntityBlocker = true;
                addGeometry(w2);


            } else if (pathX && !pathZ) {
                const w1 = buildWall(env.cellSize, wallThickness, env.sharedWallMat);
                w1.position.set(cx, 1.5, cz - (env.cellSize/2) + (wallThickness/2));
                w1.userData.isEntityBlocker = true;
                addGeometry(w1);
                
                const w2 = buildWall(env.cellSize, wallThickness, env.sharedWallMat);
                w2.position.set(cx, 1.5, cz + (env.cellSize/2) - (wallThickness/2));
                w2.userData.isEntityBlocker = true;
                addGeometry(w2);


            } else {
                const pillarSize = 1.8;
                const p = buildWall(pillarSize, pillarSize, env.sharedWallMat);
                p.position.set(cx, 1.5, cz);
                p.userData.isEntityBlocker = true;

                p.rotation.y = ctx.random() * Math.PI;
                p.updateMatrixWorld();
                addGeometry(p);
            }
        }
    };
};
