export const CompressionArchwayProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "THE COMPRESSION ARCHWAY",
        prob: 0.0043, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            const isAlignedZ = random() > 0.5;
            const pillarThickness = 0.8;
            const overheadHeight = 1.0;
            const verticalClearance = 3.0 - overheadHeight;
            const matL = env.subwayTileMats ? env.subwayTileMats[Math.floor(random() * env.subwayTileMats.length)] : env.structMat;
            const supportLeft = buildWall(isAlignedZ ? pillarThickness : env.cellSize, isAlignedZ ? env.cellSize : pillarThickness, matL, verticalClearance, 0);
            supportLeft.position.set(cx + (isAlignedZ ? -1.6 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : -1.6));
            supportLeft.userData.isEntityBlocker = true;
            addGeometry(supportLeft);
            const matR = env.subwayTileMats ? env.subwayTileMats[Math.floor(random() * env.subwayTileMats.length)] : env.structMat;
            const supportRight = buildWall(isAlignedZ ? pillarThickness : env.cellSize, isAlignedZ ? env.cellSize : pillarThickness, matR, verticalClearance, 0);
            supportRight.position.set(cx + (isAlignedZ ? 1.6 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : 1.6));
            supportRight.userData.isEntityBlocker = true;
            addGeometry(supportRight);
            const matT = env.subwayTileMats ? env.subwayTileMats[Math.floor(random() * env.subwayTileMats.length)] : env.structMat;
            const overheadBeam = buildWall(env.cellSize, env.cellSize, matT, overheadHeight, verticalClearance);
            overheadBeam.position.set(cx, verticalClearance + (overheadHeight / 2), cz);
            overheadBeam.userData.isEntityBlocker = true;
            addGeometry(overheadBeam);
        }
    };
};
