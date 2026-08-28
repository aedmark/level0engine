export const BlockyObstructionProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "BLOCKY OBSTRUCTION",
        prob: 0.1007, build: (x, z) => {
            const isStraight = random() > 0.5;
            // blockW/offset keep each piece's outer edge flush with the cell boundary
            // (offset + blockW/2 == cellSize/2) while opening a full 1.0-unit gap between
            // opposing pieces (2 * (offset - blockW/2)) - the old 1.85/1.075 pairing left only
            // 0.3, well under the player's 0.8-unit squeeze threshold, so both the straight
            // corridor and the pinwheel obstruction silently forced an unmarked crevice-squeeze.
            const blockW = 1.5;
            const offset = 1.25;
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
