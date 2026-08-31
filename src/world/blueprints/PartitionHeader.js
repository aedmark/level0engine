export const PartitionHeaderProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "PARTITION HEADER",
        prob: 0.0187, build: (x, z) => {
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

            const p1 = buildWall(isZ ? pW : env.cellSize, isZ ? env.cellSize : pW,
                isZ ? matsWithOuter(1, -1, 0) : matsWithOuter(5, 0, -1));
            p1.position.set(x * env.cellSize - (isZ ? offset : 0), 1.5, z * env.cellSize - (isZ ? 0 : offset));
            addGeometry(p1);
            const p2 = buildWall(isZ ? pW : env.cellSize, isZ ? env.cellSize : pW,
                isZ ? matsWithOuter(0, 1, 0) : matsWithOuter(4, 0, 1));
            p2.position.set(x * env.cellSize + (isZ ? offset : 0), 1.5, z * env.cellSize + (isZ ? 0 : offset));
            addGeometry(p2);
            const header = buildWall(isZ ? env.cellSize - (pW * 2) : env.cellSize, isZ ? env.cellSize : env.cellSize - (pW * 2), env.headerMat, 0.4, 2.6);
            header.position.set(x * env.cellSize, 2.8, z * env.cellSize);
            addGeometry(header);
        }
    };
};
