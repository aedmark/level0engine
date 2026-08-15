/**
 * [ROLE] Generates central blocks or cross-shaped obstacles within a cell.
 * [WHY] Breaks up line of sight and player movement to make navigation more maze-like.
 * [STATE] Stateless blueprint generator.
 * [DEPENDS] Environment size properties and context geometry builders.
 */
export const BlockyObstructionProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "BLOCKY OBSTRUCTION",
        prob: 0.1207, build: (x, z) => {
            const isStraight = random() > 0.5;
            const blockW = 1.85;
            const offset = 1.075;
            if (isStraight) {
                const isZ = random() > 0.5;
                const w1 = isZ ? blockW : env.cellSize;
                const d1 = isZ ? env.cellSize : blockW;
                const block1 = buildWall(w1, d1, env.sharedWallMat);
                block1.position.set(x * env.cellSize - (isZ ? offset : 0), 1.5, z * env.cellSize - (isZ ? 0 : offset));
                block1.userData.isEntityBlocker = true;
                addGeometry(block1);
                const block2 = buildWall(w1, d1, env.sharedWallMat);
                block2.position.set(x * env.cellSize + (isZ ? offset : 0), 1.5, z * env.cellSize + (isZ ? 0 : offset));
                block2.userData.isEntityBlocker = true;
                addGeometry(block2);
            } else {
                const flipX = random() > 0.5 ? 1 : -1;
                const flipZ = random() > 0.5 ? 1 : -1;
                const innerBlock = buildWall(blockW, blockW, env.sharedWallMat);
                innerBlock.position.set(x * env.cellSize + (flipX * offset), 1.5, z * env.cellSize + (flipZ * offset));
                innerBlock.userData.isEntityBlocker = true;
                addGeometry(innerBlock);
                const wallX = buildWall(blockW, env.cellSize, env.sharedWallMat);
                wallX.position.set(x * env.cellSize - (flipX * offset), 1.5, z * env.cellSize);
                wallX.userData.isEntityBlocker = true;
                addGeometry(wallX);
                const wallZ = buildWall(env.cellSize, blockW, env.sharedWallMat);
                wallZ.position.set(x * env.cellSize, 1.5, z * env.cellSize - (flipZ * offset));
                wallZ.userData.isEntityBlocker = true;
                addGeometry(wallZ);
            }
        }
    };
};
