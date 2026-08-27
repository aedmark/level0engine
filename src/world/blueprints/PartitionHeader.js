export const PartitionHeaderProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "PARTITION HEADER",
        prob: 0.0215, build: (x, z) => {
            // ctx.isWall isn't assigned until the per-cell loop hits its first wall cell, which
            // happens after the whole structural matrix (this factory included) is already built -
            // destructuring it above like the other locals would have captured `undefined`
            // permanently. Read it fresh off ctx here instead, where it's actually populated.
            const isWall = ctx.isWall;
            if (!isWall) return false;
            const spansX = isWall(x - 1, z) && isWall(x + 1, z) && !isWall(x, z - 1) && !isWall(x, z + 1);
            const spansZ = isWall(x, z - 1) && isWall(x, z + 1) && !isWall(x - 1, z) && !isWall(x + 1, z);
            if (!spansX && !spansZ) {
                return false;
            }
            const isZ = spansX;
            const pW = 0.6;
            const offset = (env.cellSize / 2) - (pW / 2);
            const p1 = buildWall(isZ ? pW : env.cellSize, isZ ? env.cellSize : pW, env.sharedWallMat);
            p1.position.set(x * env.cellSize - (isZ ? offset : 0), 1.5, z * env.cellSize - (isZ ? 0 : offset));
            addGeometry(p1);
            const p2 = buildWall(isZ ? pW : env.cellSize, isZ ? env.cellSize : pW, env.sharedWallMat);
            p2.position.set(x * env.cellSize + (isZ ? offset : 0), 1.5, z * env.cellSize + (isZ ? 0 : offset));
            addGeometry(p2);
            const header = buildWall(isZ ? env.cellSize - (pW * 2) : env.cellSize, isZ ? env.cellSize : env.cellSize - (pW * 2), env.headerMat, 0.4, 2.6);
            header.position.set(x * env.cellSize, 2.8, z * env.cellSize);
            addGeometry(header);
        }
    };
};
