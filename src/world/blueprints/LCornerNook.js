export const LCornerNookProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildTable, addFurniture} = ctx;
    return {
        name: "L-CORNER NOOK",
        prob: 0.65, build: (x, z) => {
            const w1 = buildWall(env.cellSize, 0.5, env.sharedWallMat);
            w1.position.set(x * env.cellSize, 1.5, z * env.cellSize - (env.cellSize / 2) + 0.25);
            addGeometry(w1);
            const w2 = buildWall(0.5, env.cellSize, env.sharedWallMat);
            w2.position.set(x * env.cellSize - (env.cellSize / 2) + 0.25, 1.5, z * env.cellSize);
            addGeometry(w2);
            if (random() > 0.6) {
                const table = buildTable(x * env.cellSize + 0.5, 0, z * env.cellSize + 0.5);
                addFurniture(table);
            }
        }
    };
};
