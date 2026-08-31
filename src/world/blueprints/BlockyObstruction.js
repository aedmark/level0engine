export const BlockyObstructionProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "BLOCKY OBSTRUCTION",
        prob: 0.0873, build: (x, z) => {
            const isStraight = random() > 0.5;
            const blockW = 1.5;
            const offset = 1.25;

            const straightTileMat = () => env.subwayTileMatsStraight
                ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
                : env.sharedWallMat;
            const isArchNeighbor = (dx, dz) =>
                !!ctx.getForcedStructure && ctx.getForcedStructure(x + dx, z + dz) === 'ARCH_HALL';
            const matsWithOuter = (faceIndices, dirs) => {
                const arr = [env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat];
                for (let i = 0; i < faceIndices.length; i++) {
                    if (isArchNeighbor(dirs[i][0], dirs[i][1])) arr[faceIndices[i]] = straightTileMat();
                }
                return arr;
            };

            if (isStraight) {
                const isZ = random() > 0.5;
                const w1 = isZ ? blockW : env.cellSize;
                const d1 = isZ ? env.cellSize : blockW;
                const block1 = buildWall(w1, d1, isZ ? matsWithOuter([1], [[-1, 0]]) : matsWithOuter([5], [[0, -1]]));
                block1.position.set(x * env.cellSize - (isZ ? offset : 0), 1.5, z * env.cellSize - (isZ ? 0 : offset));
                block1.userData.isEntityBlocker = true;
                addGeometry(block1);
                const block2 = buildWall(w1, d1, isZ ? matsWithOuter([0], [[1, 0]]) : matsWithOuter([4], [[0, 1]]));
                block2.position.set(x * env.cellSize + (isZ ? offset : 0), 1.5, z * env.cellSize + (isZ ? 0 : offset));
                block2.userData.isEntityBlocker = true;
                addGeometry(block2);
            } else {
                const flipX = random() > 0.5 ? 1 : -1;
                const flipZ = random() > 0.5 ? 1 : -1;
                const innerBlock = buildWall(blockW, blockW, matsWithOuter(
                    [flipX > 0 ? 0 : 1, flipZ > 0 ? 4 : 5],
                    [[flipX, 0], [0, flipZ]]
                ));
                innerBlock.position.set(x * env.cellSize + (flipX * offset), 1.5, z * env.cellSize + (flipZ * offset));
                innerBlock.userData.isEntityBlocker = true;
                addGeometry(innerBlock);
                const wallX = buildWall(blockW, env.cellSize, matsWithOuter([-flipX > 0 ? 0 : 1], [[-flipX, 0]]));
                wallX.position.set(x * env.cellSize - (flipX * offset), 1.5, z * env.cellSize);
                wallX.userData.isEntityBlocker = true;
                addGeometry(wallX);
                const wallZ = buildWall(env.cellSize, blockW, matsWithOuter([-flipZ > 0 ? 4 : 5], [[0, -flipZ]]));
                wallZ.position.set(x * env.cellSize, 1.5, z * env.cellSize - (flipZ * offset));
                wallZ.userData.isEntityBlocker = true;
                addGeometry(wallZ);
            }
        }
    };
};
