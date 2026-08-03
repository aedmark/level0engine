import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const DuctOrVentProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
    return {
        name: "DUCT OR VENT",
        prob: 0.40, build: (x, z) => {
            const face = Math.floor(random() * 4);
            const tunnelOnZ = (face === 0 || face === 1);
            const isFloorLevel = random() > 0.3;
            if (isFloorLevel) {
                const holeW = 1.2;
                const holeH = 0.7;
                const topH = 3.0 - holeH;
                const sideW = (env.cellSize - holeW) / 2;
                const sideOffset = (env.cellSize / 2) - (sideW / 2);
                const liningH = 0.05;
                const sideH = holeH - (liningH * 2);
                const sideOffsetLining = (holeW / 2) - (liningH / 2);
                const isCorner = random() > 0.4;
                if (isCorner) {
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const flipX = random() > 0.5 ? 1 : -1;
                    const flipZ = random() > 0.5 ? 1 : -1;
                    const outer = buildWall(sideW, sideW, env.sharedWallMat);
                    outer.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - sideW / 2)), 1.5, z * env.cellSize - (flipZ * (env.cellSize / 2 - sideW / 2)));
                    addGeometry(outer);
                    const full = buildWall(sideW, env.cellSize, env.sharedWallMat);
                    full.position.set(x * env.cellSize + (flipX * (env.cellSize / 2 - sideW / 2)), 1.5, z * env.cellSize);
                    addGeometry(full);
                    const innerW = env.cellSize - sideW;
                    const inner = buildWall(innerW, sideW, env.sharedWallMat);
                    inner.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - innerW / 2)), 1.5, z * env.cellSize + (flipZ * (env.cellSize / 2 - sideW / 2)));
                    addGeometry(inner);
                    const roof1 = buildWall(holeW, innerW, env.sharedWallMat, topH, holeH);
                    roof1.position.set(x * env.cellSize, holeH + topH / 2, z * env.cellSize - (flipZ * (env.cellSize / 2 - innerW / 2)));
                    addGeometry(roof1);
                    const roof2 = buildWall(sideW, holeW, env.sharedWallMat, topH, holeH);
                    roof2.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - sideW / 2)), holeH + topH / 2, z * env.cellSize);
                    addGeometry(roof2);
                    const floor1 = buildWall(holeW, innerW, env.ductMat, liningH);
                    floor1.position.set(x * env.cellSize, liningH / 2, z * env.cellSize - (flipZ * (env.cellSize / 2 - innerW / 2)));
                    addGeometry(floor1);
                    const floor2 = buildWall(sideW, holeW, env.ductMat, liningH);
                    floor2.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - sideW / 2)), liningH / 2, z * env.cellSize);
                    addGeometry(floor2);
                    const ceil1 = buildWall(holeW, innerW, env.ductMat, liningH);
                    ceil1.position.set(x * env.cellSize, holeH - liningH / 2, z * env.cellSize - (flipZ * (env.cellSize / 2 - innerW / 2)));
                    addGeometry(ceil1);
                    const ceil2 = buildWall(sideW, holeW, env.ductMat, liningH);
                    ceil2.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - sideW / 2)), holeH - liningH / 2, z * env.cellSize);
                    addGeometry(ceil2);
                    const lOuterX = buildWall(liningH, sideW, env.ductMat, sideH);
                    lOuterX.position.set(x * env.cellSize - (flipX * (holeW / 2 - liningH / 2)), holeH / 2, z * env.cellSize - (flipZ * (env.cellSize / 2 - sideW / 2)));
                    addGeometry(lOuterX);
                    const lOuterZ = buildWall(sideW, liningH, env.ductMat, sideH);
                    lOuterZ.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - sideW / 2)), holeH / 2, z * env.cellSize - (flipZ * (holeW / 2 - liningH / 2)));
                    addGeometry(lOuterZ);
                    const lInnerX = buildWall(liningH, innerW, env.ductMat, sideH);
                    lInnerX.position.set(x * env.cellSize + (flipX * (holeW / 2 - liningH / 2)), holeH / 2, z * env.cellSize - (flipZ * (env.cellSize / 2 - innerW / 2)));
                    addGeometry(lInnerX);
                    const lInnerZ = buildWall(innerW, liningH, env.ductMat, sideH);
                    lInnerZ.position.set(x * env.cellSize - (flipX * (env.cellSize / 2 - innerW / 2)), holeH / 2, z * env.cellSize + (flipZ * (holeW / 2 - liningH / 2)));
                    addGeometry(lInnerZ);
                    const blockBox = new AABB(
                        new Vec3(x * env.cellSize - env.cellSize / 2, 0, z * env.cellSize - env.cellSize / 2),
                        new Vec3(x * env.cellSize + env.cellSize / 2, 3.0, z * env.cellSize + env.cellSize / 2)
                    );
                    blockBox.isEntityBlocker = true;
                    blockBox.isInvisibleBlocker = true;
                    blockBox.chunkHash = hash;
                    env.spatialGrid.insert(blockBox);
                    const grateOffset = (env.cellSize / 2) - 0.07;
                    ctx.addGrate(x * env.cellSize, 0.35, z * env.cellSize - (flipZ * grateOffset), false);
                    ctx.addGrate(x * env.cellSize - (flipX * grateOffset), 0.35, z * env.cellSize, true);
                } else {
                    const rawBurst = Math.floor(random() * 3) + 1;
                    const modX = ((x % env.chunkSize) + env.chunkSize) % env.chunkSize;
                    const modZ = ((z % env.chunkSize) + env.chunkSize) % env.chunkSize;
                    const burstLength = Math.min(rawBurst, tunnelOnZ ? env.chunkSize - modZ : env.chunkSize - modX);
                    for (let i = 0; i < burstLength; i++) {
                        const segX = x + (tunnelOnZ ? 0 : i);
                        const segZ = z + (tunnelOnZ ? i : 0);
                        if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                        const w1 = tunnelOnZ ? sideW : env.cellSize;
                        const d1 = tunnelOnZ ? env.cellSize : sideW;
                        const side1 = buildWall(w1, d1, env.sharedWallMat);
                        side1.position.set(segX * env.cellSize + (tunnelOnZ ? -sideOffset : 0), 1.5, segZ * env.cellSize + (tunnelOnZ ? 0 : -sideOffset));
                        addGeometry(side1);
                        const side2 = buildWall(w1, d1, env.sharedWallMat);
                        side2.position.set(segX * env.cellSize + (tunnelOnZ ? sideOffset : 0), 1.5, segZ * env.cellSize + (tunnelOnZ ? 0 : sideOffset));
                        addGeometry(side2);
                        const topW = tunnelOnZ ? holeW : env.cellSize;
                        const topD = tunnelOnZ ? env.cellSize : holeW;
                        const top = buildWall(topW, topD, env.sharedWallMat, topH, holeH);
                        top.position.set(segX * env.cellSize, holeH + (topH / 2), segZ * env.cellSize);
                        addGeometry(top);
                        const linW = tunnelOnZ ? holeW : env.cellSize + 0.02;
                        const linD = tunnelOnZ ? env.cellSize + 0.02 : holeW;
                        const liningFloor = buildWall(linW, linD, env.ductMat, liningH);
                        liningFloor.position.set(segX * env.cellSize, liningH / 2, segZ * env.cellSize);
                        addGeometry(liningFloor);
                        const liningCeil = buildWall(linW, linD, env.ductMat, liningH);
                        liningCeil.position.set(segX * env.cellSize, holeH - (liningH / 2), segZ * env.cellSize);
                        addGeometry(liningCeil);
                        const liningSideW = tunnelOnZ ? liningH : linW;
                        const liningSideD = tunnelOnZ ? linD : liningH;
                        const liningLeft = buildWall(liningSideW, liningSideD, env.ductMat, sideH);
                        liningLeft.position.set(segX * env.cellSize + (tunnelOnZ ? -sideOffsetLining : 0), holeH / 2, segZ * env.cellSize + (tunnelOnZ ? 0 : -sideOffsetLining));
                        addGeometry(liningLeft);
                        const liningRight = buildWall(liningSideW, liningSideD, env.ductMat, sideH);
                        liningRight.position.set(segX * env.cellSize + (tunnelOnZ ? sideOffsetLining : 0), holeH / 2, segZ * env.cellSize + (tunnelOnZ ? 0 : sideOffsetLining));
                        addGeometry(liningRight);
                        const blockBox = new AABB(
                            new Vec3(segX * env.cellSize - (tunnelOnZ ? holeW / 2 : env.cellSize / 2), 0, segZ * env.cellSize - (tunnelOnZ ? env.cellSize / 2 : holeW / 2)),
                            new Vec3(segX * env.cellSize + (tunnelOnZ ? holeW / 2 : env.cellSize / 2), 3.0, segZ * env.cellSize + (tunnelOnZ ? env.cellSize / 2 : holeW / 2))
                        );
                        blockBox.isEntityBlocker = true;
                        blockBox.isInvisibleBlocker = true;
                        blockBox.chunkHash = hash;
                        env.spatialGrid.insert(blockBox);
                        const grateOffset = (env.cellSize / 2) - 0.07;
                        if (i === 0) {
                            if (tunnelOnZ) ctx.addGrate(segX * env.cellSize, 0.35, segZ * env.cellSize - grateOffset, false);
                            else ctx.addGrate(segX * env.cellSize - grateOffset, 0.35, segZ * env.cellSize, true);
                        }
                        if (i === burstLength - 1) {
                            if (tunnelOnZ) ctx.addGrate(segX * env.cellSize, 0.35, segZ * env.cellSize + grateOffset, false);
                            else ctx.addGrate(segX * env.cellSize + grateOffset, 0.35, segZ * env.cellSize, true);
                        }
                    }
                }
            } else {
                const wall = new THREE.Mesh(env.sharedWallGeo, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                addGeometry(wall);
                const fCx = Math.sin(env.baseSeed) * 0.8;
                const fCy = Math.cos(env.baseSeed * 0.5) * 0.8;
                const probablyOpen = (nx, nz) => {
                    let fzx = nx * 0.15, fzy = nz * 0.15, fiter = 0;
                    let fzx2 = fzx * fzx, fzy2 = fzy * fzy;
                    while (fzx2 + fzy2 < 4 && fiter < 15) {
                        fzy = 2 * fzx * fzy + fCy;
                        fzx = fzx2 - fzy2 + fCx;
                        fzx2 = fzx * fzx;
                        fzy2 = fzy * fzy;
                        fiter++;
                    }
                    return fiter <= 6;
                };
                const openFaces = [];
                if (probablyOpen(x, z + 1)) openFaces.push(0);
                if (probablyOpen(x, z - 1)) openFaces.push(1);
                if (probablyOpen(x + 1, z)) openFaces.push(2);
                if (probablyOpen(x - 1, z)) openFaces.push(3);
                const ventFace = openFaces.length > 0
                    ? openFaces[Math.floor(random() * openFaces.length)]
                    : face;
                const ventGeo = env._boxGeo(1.2, 0.6, 0.05);
                const vent = new THREE.Mesh(ventGeo, env.wallVentMat);
                const finalOffset = (env.cellSize / 2) + 0.06;
                if (ventFace === 0) {
                    vent.position.set(x * env.cellSize, 2.6, z * env.cellSize + finalOffset);
                } else if (ventFace === 1) {
                    vent.position.set(x * env.cellSize, 2.6, z * env.cellSize - finalOffset);
                } else if (ventFace === 2) {
                    vent.rotation.y = Math.PI / 2;
                    vent.position.set(x * env.cellSize + finalOffset, 2.6, z * env.cellSize);
                } else {
                    vent.rotation.y = Math.PI / 2;
                    vent.position.set(x * env.cellSize - finalOffset, 2.6, z * env.cellSize);
                }
                addGeometry(vent);
            }
        }
    };
};
