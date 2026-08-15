/**
 * [ROLE] Generates a corner alcove layout with an optional chair.
 * [WHY] Adds spatial variety to the generated level, avoiding repetitive open spaces.
 * [STATE] Stateless; returns a configuration object with a build function.
 * [DEPENDS] Depends on env properties like cellSize, sharedWallMat, and context functions like random, buildWall, buildChair.
 */
export const AlcoveCornerProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildChair, addFurniture} = ctx;
    return {
        name: "ALCOVE CORNER",
        prob: 0.05, build: (x, z) => {
            const back = buildWall(env.cellSize, 0.5, env.sharedWallMat);
            back.position.set(x * env.cellSize, 1.5, z * env.cellSize - (env.cellSize / 2) + 0.25);
            addGeometry(back);
            const side = buildWall(0.5, env.cellSize / 2, env.sharedWallMat);
            side.position.set(x * env.cellSize - (env.cellSize / 2) + 0.25, 1.5, z * env.cellSize - (env.cellSize / 4));
            addGeometry(side);
            if (random() > 0.5) {
                const rot = random() > 0.5 ? -Math.PI / 2 : Math.PI / 2;
                const chair = buildChair(x * env.cellSize + 0.5, 0, z * env.cellSize - 0.5, rot);
                addFurniture(chair);
            }
        }
    };
};
