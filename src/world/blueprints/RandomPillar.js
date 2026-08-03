export const RandomPillarProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "RANDOM PILLAR",
        prob: 0.95, build: (x, z) => {
            const pillar = buildWall(0.5 + (random() * 2.0), 0.5 + (random() * 2.0), env.sharedWallMat);
            pillar.position.set(x * env.cellSize, 1.5, z * env.cellSize);
            addGeometry(pillar);
        }
    };
};
