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
