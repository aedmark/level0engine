/**
 * [ROLE] Generates a rounded archway structure in a single cell.
 * [WHY] Alters vertical space and provides a curved architectural variant.
 * [STATE] Stateless blueprint profile.
 * [DEPENDS] Environment materials, geometry builders, and cell dimensions.
 */
export const CurvedArchwayProfile = (env, ctx) => {
    const {random, buildWall, buildArchCutout, addGeometry} = ctx;
    return {
        name: "CURVED ARCHWAY",
        prob: 0.002, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            
            const neighbors = {
                px: ctx.isWall(x + 1, z),
                nx: ctx.isWall(x - 1, z),
                pz: ctx.isWall(x, z + 1),
                nz: ctx.isWall(x, z - 1)
            };
            
            let isAlignedZ;
            if (!neighbors.pz || !neighbors.nz) {
                isAlignedZ = true;
            } else if (!neighbors.px || !neighbors.nx) {
                isAlignedZ = false;
            } else {
                isAlignedZ = random() > 0.5;
            }
            const pillarThickness = 0.8;
            
            const outerX = env.cellSize / 2;
            const radius = outerX - pillarThickness;
            
            const archHeight = radius + 0.3;
            const verticalClearance = 3.0 - archHeight; 
            
            const supportLeft = buildWall(isAlignedZ ? pillarThickness : env.cellSize, isAlignedZ ? env.cellSize : pillarThickness, env.sharedWallMat, verticalClearance, 0);
            supportLeft.position.set(cx + (isAlignedZ ? -outerX + pillarThickness/2 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : -outerX + pillarThickness/2));
            supportLeft.userData.isEntityBlocker = true;
            addGeometry(supportLeft);
            
            const supportRight = buildWall(isAlignedZ ? pillarThickness : env.cellSize, isAlignedZ ? env.cellSize : pillarThickness, env.sharedWallMat, verticalClearance, 0);
            supportRight.position.set(cx + (isAlignedZ ? outerX - pillarThickness/2 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : outerX - pillarThickness/2));
            supportRight.userData.isEntityBlocker = true;
            addGeometry(supportRight);
            
            if (buildArchCutout) {
                const arch = buildArchCutout(radius, pillarThickness, archHeight, env.cellSize, verticalClearance, env.sharedWallMat);
                arch.position.set(cx, verticalClearance, cz);
                if (!isAlignedZ) {
                    arch.rotation.y = Math.PI / 2;
                }
                arch.userData.isEntityBlocker = true;
                addGeometry(arch);
            }
        }
    };
};
