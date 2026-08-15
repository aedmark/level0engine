export const PartitionHeaderProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "PARTITION HEADER",
        prob: 0.0215, build: (x, z) => {
            const isZ = random() > 0.5;
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
