export const WideHeaderGapProfile = (env, ctx) => {
    const {buildWall, addGeometry} = ctx;
    return {
        name: "WIDE HEADER GAP",
        prob: 0.90, build: (x, z) => {
            const pW = 0.8, offset = (env.cellSize / 2) - (pW / 2), gap = env.cellSize - (pW * 2);
            const p1 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p1.position.set(x * env.cellSize - offset, 1.5, z * env.cellSize);
            addGeometry(p1);
            const p2 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p2.position.set(x * env.cellSize + offset, 1.5, z * env.cellSize);
            addGeometry(p2);
            const top = new THREE.Mesh(env._boxGeo(gap, 0.3, env.cellSize), env.headerMat);
            top.position.set(x * env.cellSize, 2.85, z * env.cellSize);
            addGeometry(top);
        }
    };
};
