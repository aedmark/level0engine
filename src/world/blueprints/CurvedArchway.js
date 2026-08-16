export const CurvedArchwayProfile = (env, ctx) => {
    const {random, buildArchCutout, addGeometry} = ctx;
    return {
        name: "CURVED ARCHWAY",
        prob: 0.01, build: (x, z) => {
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
            const springHeight = 3.0 - archHeight;

            if (buildArchCutout) {
                const arch = buildArchCutout(radius, pillarThickness, archHeight, env.cellSize, springHeight, env.sharedWallMat);
                arch.position.set(cx, 0, cz);
                if (!isAlignedZ) {
                    arch.rotation.y = Math.PI / 2;
                }
                arch.userData.isEntityBlocker = true;
                arch.userData.noCollision = true;
                addGeometry(arch);
                ctx.addArchCutoutColliders(arch, radius, pillarThickness, archHeight, env.cellSize, springHeight);

                const jambOffset = outerX - pillarThickness / 2;
                for (const side of [-1, 1]) {
                    ctx.addBaseboardBox(
                        cx + (isAlignedZ ? side * jambOffset : 0),
                        cz + (isAlignedZ ? 0 : side * jambOffset),
                        isAlignedZ ? pillarThickness : env.cellSize,
                        isAlignedZ ? env.cellSize : pillarThickness
                    );
                }
            }
        }
    };
};
