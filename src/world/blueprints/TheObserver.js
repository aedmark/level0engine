/**
 * [ROLE] Spawns a rare invisible observer entity or a blank wall block.
 * [WHY] Adds a subtle, unsettling ambient event (a feeling of being watched) without direct confrontation.
 * [STATE] Stateless generation profile, though it delegates to context methods that mutate world entity lists.
 * [DEPENDS] Access to addObserver context function and cell dimensions.
 */
export const TheObserverProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "THE OBSERVER",
        prob: 0.07, build: (x, z) => {
            if (random() > 0.92 && ctx.addObserver) {
                ctx.addObserver(x * env.cellSize, z * env.cellSize);
                if (ctx.markOccupied) ctx.markOccupied(x, z);
            } else {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                wall.userData.isEntityBlocker = true;
                addGeometry(wall);
            }
        }
    };
};
