export const SteppedBurstProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
    return {
        name: "STEPPED BURST",
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

            const sideW = 1.0;
            const sideOffset = (env.cellSize / 2) - (sideW / 2);
            const roofW = env.cellSize - (sideW * 2);
            const roofH = 1.8;
            for (let i = 0; i < burstLength; i++) {
                const segX = x + (dirZ ? 0 : i);
                const segZ = z + (dirZ ? i : 0);
                if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                const side1 = buildWall(dirZ ? sideW : env.cellSize, dirZ ? env.cellSize : sideW,
                    dirZ ? matsWithOuter(1, segX, segZ, -1, 0) : matsWithOuter(5, segX, segZ, 0, -1));
                side1.position.set(segX * env.cellSize + (dirZ ? -sideOffset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : -sideOffset));
                addGeometry(side1);
                const side2 = buildWall(dirZ ? sideW : env.cellSize, dirZ ? env.cellSize : sideW,
                    dirZ ? matsWithOuter(0, segX, segZ, 1, 0) : matsWithOuter(4, segX, segZ, 0, 1));
                side2.position.set(segX * env.cellSize + (dirZ ? sideOffset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : sideOffset));
                addGeometry(side2);
                const roof = buildWall(dirZ ? roofW : env.cellSize, dirZ ? env.cellSize : roofW, env.sharedWallMat, roofH, 1.2);
                roof.position.set(segX * env.cellSize, 1.2 + (roofH / 2), segZ * env.cellSize);
                addGeometry(roof);
                const blockBox = new THREE.Box3(
                    new THREE.Vector3(segX * env.cellSize - (dirZ ? roofW / 2 : env.cellSize / 2), 0, segZ * env.cellSize - (dirZ ? env.cellSize / 2 : roofW / 2)),
                    new THREE.Vector3(segX * env.cellSize + (dirZ ? roofW / 2 : env.cellSize / 2), 3.0, segZ * env.cellSize + (dirZ ? env.cellSize / 2 : roofW / 2))
                );
                blockBox.isEntityBlocker = true;
                blockBox.isInvisibleBlocker = true;
                blockBox.chunkHash = hash;
                env.spatialGrid.insert(blockBox);
            }
        }
    };
};
