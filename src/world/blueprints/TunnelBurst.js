/**
 * [ROLE] Forces a linear string of tunnel segments or ventilation shafts.
 * [WHY] Creates localized claustrophobic crawlspaces that disrupt normal room flow.
 * [STATE] Alters context wall state across multiple tiles (a "burst" of blocks).
 * [DEPENDS] Chunk boundary logic, wall setting context functions, AABB grids, and environmental grates.
 */
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const TunnelBurstProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
    return {
        name: "TUNNEL BURST",
        prob: 0.10, build: (x, z) => {
            const typeRoll = random();
            const nC = ctx.isWall && !ctx.isWall(x, z - 1);
            const sC = ctx.isWall && !ctx.isWall(x, z + 1);
            const wC = ctx.isWall && !ctx.isWall(x - 1, z);
            const eC = ctx.isWall && !ctx.isWall(x + 1, z);

            let dirZ = random() > 0.5;
            if (nC || sC) dirZ = true;
            else if (wC || eC) dirZ = false;
            
            if (!nC && !wC && !sC && !eC) {
                // Completely buried, no clear entrance. Abort and build solid wall.
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
                if (dirZ) {
                    if (!nC) ctx.setWall(x, z - 1, false);
                    ctx.setWall(x, z + burstLength, false);
                } else {
                    if (!wC) ctx.setWall(x - 1, z, false);
                    ctx.setWall(x + burstLength, z, false);
                }
            }
            if (typeRoll > 0.66) {
                const tunnelW = 1.2;
                const tunnelH = 0.7;
                const sideW = (env.cellSize - tunnelW) / 2;
                const sideOffset = (env.cellSize / 2) - (sideW / 2);
                const roofH_block = 3.0 - tunnelH;
                const liningH = 0.05;
                const sideH = tunnelH - (liningH * 2);
                const sideOffsetLining = (tunnelW / 2) - (liningH / 2);
                for (let i = 0; i < burstLength; i++) {
                    const segX = x + (dirZ ? 0 : i);
                    const segZ = z + (dirZ ? i : 0);
                    if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                    const side1 = buildWall(dirZ ? sideW : env.cellSize - 0.02, dirZ ? env.cellSize - 0.02 : sideW, env.sharedWallMat);
                    side1.position.set(segX * env.cellSize + (dirZ ? -sideOffset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : -sideOffset));
                    addGeometry(side1);
                    const side2 = buildWall(dirZ ? sideW : env.cellSize - 0.02, dirZ ? env.cellSize - 0.02 : sideW, env.sharedWallMat);
                    side2.position.set(segX * env.cellSize + (dirZ ? sideOffset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : sideOffset));
                    addGeometry(side2);
                    const roof = buildWall(dirZ ? tunnelW : env.cellSize - 0.02, dirZ ? env.cellSize - 0.02 : tunnelW, env.sharedWallMat, roofH_block, tunnelH);
                    roof.position.set(segX * env.cellSize, tunnelH + (roofH_block / 2), segZ * env.cellSize);
                    addGeometry(roof);
                    const liningFloor = buildWall(dirZ ? tunnelW : env.cellSize - 0.02, dirZ ? env.cellSize - 0.02 : tunnelW, env.ductMat, liningH);
                    liningFloor.position.set(segX * env.cellSize, liningH / 2, segZ * env.cellSize);
                    addGeometry(liningFloor);
                    const liningCeil = buildWall(dirZ ? tunnelW : env.cellSize - 0.02, dirZ ? env.cellSize - 0.02 : tunnelW, env.ductMat, liningH);
                    liningCeil.position.set(segX * env.cellSize, tunnelH - (liningH / 2), segZ * env.cellSize);
                    addGeometry(liningCeil);
                    const liningSideW = dirZ ? liningH : env.cellSize - 0.02;
                    const liningSideD = dirZ ? env.cellSize - 0.02 : liningH;
                    const liningLeft = buildWall(liningSideW, liningSideD, env.ductMat, sideH);
                    liningLeft.position.set(segX * env.cellSize + (dirZ ? -sideOffsetLining : 0), tunnelH / 2, segZ * env.cellSize + (dirZ ? 0 : -sideOffsetLining));
                    addGeometry(liningLeft);
                    const liningRight = buildWall(liningSideW, liningSideD, env.ductMat, sideH);
                    liningRight.position.set(segX * env.cellSize + (dirZ ? sideOffsetLining : 0), tunnelH / 2, segZ * env.cellSize + (dirZ ? 0 : sideOffsetLining));
                    addGeometry(liningRight);
                    const blockBox = new AABB(
                        new Vec3(segX * env.cellSize - (dirZ ? tunnelW / 2 : env.cellSize / 2), 0, segZ * env.cellSize - (dirZ ? env.cellSize / 2 : tunnelW / 2)),
                        new Vec3(segX * env.cellSize + (dirZ ? tunnelW / 2 : env.cellSize / 2), 3.0, segZ * env.cellSize + (dirZ ? env.cellSize / 2 : tunnelW / 2))
                    );
                    blockBox.isEntityBlocker = true;
                    blockBox.isInvisibleBlocker = true;
                    blockBox.chunkHash = hash;
                    env.spatialGrid.insert(blockBox);
                    const grateOffset = (env.cellSize / 2) - 0.07;
                    if (i === 0) {
                        if (dirZ) ctx.addGrate(segX * env.cellSize, 0.35, segZ * env.cellSize - grateOffset, false);
                        else ctx.addGrate(segX * env.cellSize - grateOffset, 0.35, segZ * env.cellSize, true);
                    }
                    if (i === burstLength - 1) {
                        if (dirZ) ctx.addGrate(segX * env.cellSize, 0.35, segZ * env.cellSize + grateOffset, false);
                        else ctx.addGrate(segX * env.cellSize + grateOffset, 0.35, segZ * env.cellSize, true);
                    }
                }
            } else if (typeRoll > 0.33) {
                const wallW = (env.cellSize - 0.3) / 2;
                const offset = (wallW / 2) + 0.15;
                for (let i = 0; i < burstLength; i++) {
                    const segX = x + (dirZ ? 0 : i);
                    const segZ = z + (dirZ ? i : 0);
                    if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                    const block1 = buildWall(dirZ ? wallW : env.cellSize, dirZ ? env.cellSize : wallW, env.sharedWallMat);
                    block1.position.set(segX * env.cellSize + (dirZ ? -offset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : -offset));
                    block1.userData.isEntityBlocker = true;
                    addGeometry(block1);
                    const block2 = buildWall(dirZ ? wallW : env.cellSize, dirZ ? env.cellSize : wallW, env.sharedWallMat);
                    block2.position.set(segX * env.cellSize + (dirZ ? offset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : offset));
                    block2.userData.isEntityBlocker = true;
                    addGeometry(block2);
                }
            } else {
                const sideW = 1.0;
                const sideOffset = (env.cellSize / 2) - (sideW / 2);
                const roofW = env.cellSize - (sideW * 2);
                const roofH = 1.8;
                for (let i = 0; i < burstLength; i++) {
                    const segX = x + (dirZ ? 0 : i);
                    const segZ = z + (dirZ ? i : 0);
                    if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                    const side1 = buildWall(dirZ ? sideW : env.cellSize, dirZ ? env.cellSize : sideW, env.sharedWallMat);
                    side1.position.set(segX * env.cellSize + (dirZ ? -sideOffset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : -sideOffset));
                    addGeometry(side1);
                    const side2 = buildWall(dirZ ? sideW : env.cellSize, dirZ ? env.cellSize : sideW, env.sharedWallMat);
                    side2.position.set(segX * env.cellSize + (dirZ ? sideOffset : 0), 1.5, segZ * env.cellSize + (dirZ ? 0 : sideOffset));
                    addGeometry(side2);
                    const roof = buildWall(dirZ ? roofW : env.cellSize, dirZ ? env.cellSize : roofW, env.sharedWallMat, roofH, 1.2);
                    roof.position.set(segX * env.cellSize, 1.2 + (roofH / 2), segZ * env.cellSize);
                    addGeometry(roof);
                    const blockBox = new AABB(
                        new Vec3(segX * env.cellSize - (dirZ ? roofW / 2 : env.cellSize / 2), 0, segZ * env.cellSize - (dirZ ? env.cellSize / 2 : roofW / 2)),
                        new Vec3(segX * env.cellSize + (dirZ ? roofW / 2 : env.cellSize / 2), 3.0, segZ * env.cellSize + (dirZ ? env.cellSize / 2 : roofW / 2))
                    );
                    blockBox.isEntityBlocker = true;
                    blockBox.isInvisibleBlocker = true;
                    blockBox.chunkHash = hash;
                    env.spatialGrid.insert(blockBox);
                }
            }
        }
    };
};
