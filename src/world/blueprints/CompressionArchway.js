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
            const tileMat = env.subwayTileMats ? env.subwayTileMats[Math.floor(random() * env.subwayTileMats.length)] : env.structMat;
            const wallMat = env.sharedWallMat;

            const leftSupportMat = [
                isAlignedZ ? tileMat : wallMat,
                wallMat,
                wallMat,
                wallMat,
                isAlignedZ ? wallMat : tileMat,
                wallMat
            ];
            
            const rightSupportMat = [
                wallMat,
                isAlignedZ ? tileMat : wallMat,
                wallMat,
                wallMat,
                wallMat,
                isAlignedZ ? wallMat : tileMat
            ];
            
            const topBeamMat = [
                wallMat,
                wallMat,
                wallMat,
                tileMat,
                wallMat,
                wallMat
            ];

            const supportLeft = buildWall(isAlignedZ ? pillarThickness : env.cellSize, isAlignedZ ? env.cellSize : pillarThickness, leftSupportMat, verticalClearance, 0);
            supportLeft.position.set(cx + (isAlignedZ ? -1.6 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : -1.6));
            supportLeft.userData.isEntityBlocker = true;
            addGeometry(supportLeft);
            
            const supportRight = buildWall(isAlignedZ ? pillarThickness : env.cellSize, isAlignedZ ? env.cellSize : pillarThickness, rightSupportMat, verticalClearance, 0);
            supportRight.position.set(cx + (isAlignedZ ? 1.6 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : 1.6));
            supportRight.userData.isEntityBlocker = true;
            addGeometry(supportRight);
            
            const overheadBeam = buildWall(env.cellSize, env.cellSize, topBeamMat, overheadHeight, verticalClearance);
            overheadBeam.position.set(cx, verticalClearance + (overheadHeight / 2), cz);
            overheadBeam.userData.isEntityBlocker = true;
            addGeometry(overheadBeam);
        }
    };
};
