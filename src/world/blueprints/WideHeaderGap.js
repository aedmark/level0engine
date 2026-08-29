export const WideHeaderGapProfile = (env, ctx) => {
    const {buildWall, addGeometry} = ctx;
    return {
        name: "WIDE HEADER GAP",
        prob: 0.0094, build: (x, z) => {
            const isWall = ctx.isWall;
            if (!isWall) return false;
            const spansX = isWall(x - 1, z) && isWall(x + 1, z) && !isWall(x, z - 1) && !isWall(x, z + 1);
            const spansZ = isWall(x, z - 1) && isWall(x, z + 1) && !isWall(x - 1, z) && !isWall(x + 1, z);
            if (!spansX && !spansZ) return false;
            
            const isZ = spansX;
            const pW = 0.8, offset = (env.cellSize / 2) - (pW / 2), gap = env.cellSize - (pW * 2);
            
            const p1 = buildWall(isZ ? pW : env.cellSize, isZ ? env.cellSize : pW, env.sharedWallMat);
            p1.position.set(x * env.cellSize - (isZ ? offset : 0), 1.5, z * env.cellSize - (isZ ? 0 : offset));
            addGeometry(p1);
            
            const p2 = buildWall(isZ ? pW : env.cellSize, isZ ? env.cellSize : pW, env.sharedWallMat);
            p2.position.set(x * env.cellSize + (isZ ? offset : 0), 1.5, z * env.cellSize + (isZ ? 0 : offset));
            addGeometry(p2);
            
            const top = new THREE.Mesh(env._boxGeo(isZ ? gap : env.cellSize, 0.3, isZ ? env.cellSize : gap), env.headerMat);
            top.position.set(x * env.cellSize, 2.85, z * env.cellSize);
            addGeometry(top);
        }
    };
};
