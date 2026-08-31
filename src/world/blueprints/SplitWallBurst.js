export const SplitWallBurstProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "SPLIT WALL BURST",
        prob: 0.0414, build: (x, z) => {
            const isClearExit = (cx, cz) => ctx.isWall && !ctx.isWall(cx, cz) && !(ctx.isAirlockApron && ctx.isAirlockApron(cx, cz)) && !(ctx.isLowClearance && ctx.isLowClearance(cx, cz));
            const nC = isClearExit(x, z - 1);
            const sC = isClearExit(x, z + 1);
            const wC = isClearExit(x - 1, z);
            const eC = isClearExit(x + 1, z);

            let dirZ = random() > 0.5;
            if (nC || sC) dirZ = true;
            else if (wC || eC) dirZ = false;

            if (!nC && !wC && !sC && !eC) {
                const wall = ctx.buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                addGeometry(wall);
                return;
            }

            const rawBurst = Math.floor(random() * 4) + 1;
            const modX = ((x % env.chunkSize) + env.chunkSize) % env.chunkSize;
            const modZ = ((z % env.chunkSize) + env.chunkSize) % env.chunkSize;
            const burstLength = Math.min(rawBurst, dirZ ? env.chunkSize - modZ : env.chunkSize - modX);

            if (ctx.setWall) {
                if (dirZ) ctx.setWall(x, z + burstLength, false);
                else ctx.setWall(x + burstLength, z, false);
            }

            const straightTileMat = () => env.subwayTileMatsStraight
                ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
                : env.sharedWallMat;
            const isArchNeighbor = (gx, gz, dx, dz) =>
                !!ctx.getForcedStructure && ctx.getForcedStructure(gx + dx, gz + dz) === 'ARCH_HALL';
            const matsWithOuter = (faceIndex, gx, gz, dx, dz) => {
                const arr = [env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat];
                if (isArchNeighbor(gx, gz, dx, dz)) arr[faceIndex] = straightTileMat();
                return arr;
            };

            const wallW = (env.cellSize - 0.3) / 2;
            const offset = (wallW / 2) + 0.15;
            for (let i = 0; i < burstLength; i++) {
                const segX = x + (dirZ ? 0 : i);
                const segZ = z + (dirZ ? i : 0);
                if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                const block1 = buildWall(dirZ ? wallW : env.cellSize, dirZ ? env.cellSize : wallW,
                    dirZ ? matsWithOuter(1, segX, segZ, -1, 0) : matsWithOuter(5, segX, segZ, 0, -1));
                block1.position.set(segX * env.cellSize + (dirZ ? -offset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : -offset));
                block1.userData.isEntityBlocker = true;
                addGeometry(block1);
                const block2 = buildWall(dirZ ? wallW : env.cellSize, dirZ ? env.cellSize : wallW,
                    dirZ ? matsWithOuter(0, segX, segZ, 1, 0) : matsWithOuter(4, segX, segZ, 0, 1));
                block2.position.set(segX * env.cellSize + (dirZ ? offset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : offset));
                block2.userData.isEntityBlocker = true;
                addGeometry(block2);
            }
        }
    };
};
