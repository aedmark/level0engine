export const NarrowHeaderGapProfile = (env, ctx) => {
    const {buildWall, addGeometry} = ctx;
    return {
        name: "NARROW HEADER GAP",
        prob: 0.0375, build: (x, z) => {
            // ctx.isWall isn't assigned until the per-cell loop hits its first wall cell, which
            // happens after the whole structural matrix (this factory included) is already built -
            // destructuring it above like the other locals would have captured `undefined`
            // permanently. Read it fresh off ctx here instead, where it's actually populated.
            const isWall = ctx.isWall;
            if (!isWall) return false;
            const spansX = isWall(x - 1, z) && isWall(x + 1, z) && !isWall(x, z - 1) && !isWall(x, z + 1);
            const spansZ = isWall(x, z - 1) && isWall(x, z + 1) && !isWall(x - 1, z) && !isWall(x + 1, z);
            if (!spansX && !spansZ) return false;
            
            const isZ = spansX;
            const offset = (env.cellSize / 2) - 0.25;
            const w1 = isZ ? 0.5 : env.cellSize, d1 = isZ ? env.cellSize : 0.5;
            const gapW = isZ ? env.cellSize - 1.0 : env.cellSize;
            const gapD = isZ ? env.cellSize : env.cellSize - 1.0;
            
            const p1 = buildWall(w1, d1, env.sharedWallMat);
            p1.position.set(x * env.cellSize - (isZ ? offset : 0), 1.5, z * env.cellSize - (isZ ? 0 : offset));
            addGeometry(p1);
            
            const p2 = buildWall(w1, d1, env.sharedWallMat);
            p2.position.set(x * env.cellSize + (isZ ? offset : 0), 1.5, z * env.cellSize + (isZ ? 0 : offset));
            addGeometry(p2);
            
            const top = new THREE.Mesh(env._boxGeo(gapW, 0.3, gapD), env.headerMat);
            top.position.set(x * env.cellSize, 2.85, z * env.cellSize);
            addGeometry(top);
        }
    };
};
