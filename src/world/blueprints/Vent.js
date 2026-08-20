export const VentProfile = (env, ctx) => {
    const {buildWall, addGeometry} = ctx;
    return {
        name: "VENT",
        prob: 0.0431, build: (x, z) => {
            const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
            wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
            wall.userData.isDefaultWall = true;
            wall.userData.cellX = x;
            wall.userData.cellZ = z;
            addGeometry(wall);
        }
    };
};
