export const RoundPillarProfile = (env, ctx) => {
    const {random, buildCylinder, addGeometry} = ctx;
    return {
        name: "ROUND PILLAR",
        prob: 0.0187, build: (x, z) => {
            if (ctx.markPermeable) ctx.markPermeable(x, z);
            let maxRadius = 1.25;
            if (ctx.isWall && (!ctx.isWall(x-1, z) || !ctx.isWall(x+1, z) || !ctx.isWall(x, z-1) || !ctx.isWall(x, z+1))) {
                maxRadius = 0.85;
            }
            const radius = 0.25 + (random() * (maxRadius - 0.25));
            const pillar = buildCylinder(radius, radius, 3.0, 16, env.sharedWallMat);
            pillar.position.set(x * env.cellSize, 1.5, z * env.cellSize);
            addGeometry(pillar);
        }
    };
};
