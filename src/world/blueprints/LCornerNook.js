export const LCornerNookProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildTable, addFurniture} = ctx;
    return {
        name: "L-CORNER NOOK",
        prob: 0.0842, build: (x, z) => {
            const straightTileMat = () => env.subwayTileMatsStraight
                ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
                : env.sharedWallMat;
            const isArchNeighbor = (dx, dz) =>
                !!ctx.getForcedStructure && ctx.getForcedStructure(x + dx, z + dz) === 'ARCH_HALL';
            const matsWithOuter = (faceIndex, dx, dz) => {
                const arr = [env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat];
                if (isArchNeighbor(dx, dz)) arr[faceIndex] = straightTileMat();
                return arr;
            };

            const w1 = buildWall(env.cellSize, 0.5, matsWithOuter(5, 0, -1));
            w1.position.set(x * env.cellSize, 1.5, z * env.cellSize - (env.cellSize / 2) + 0.25);
            addGeometry(w1);
            const w2 = buildWall(0.5, env.cellSize, matsWithOuter(1, -1, 0));
            w2.position.set(x * env.cellSize - (env.cellSize / 2) + 0.25, 1.5, z * env.cellSize);
            addGeometry(w2);
            if (random() > 0.6) {
                const table = buildTable(x * env.cellSize + 0.5, 0, z * env.cellSize + 0.5);
                addFurniture(table);
            }
        }
    };
};
