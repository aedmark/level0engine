import {archBorderMats} from './ArchBorderMats.js';

export const LCornerNookProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildTable, addFurniture} = ctx;
    return {
        name: "L-CORNER NOOK",
        prob: 0.0842, build: (x, z) => {
            const w1 = buildWall(env.cellSize, 0.5, archBorderMats(env, ctx, random, x, z, env.sharedWallMat, [{index: 5, dx: 0, dz: -1}]));
            w1.position.set(x * env.cellSize, 1.5, z * env.cellSize - (env.cellSize / 2) + 0.25);
            addGeometry(w1);
            const w2 = buildWall(0.5, env.cellSize, archBorderMats(env, ctx, random, x, z, env.sharedWallMat, [{index: 1, dx: -1, dz: 0}]));
            w2.position.set(x * env.cellSize - (env.cellSize / 2) + 0.25, 1.5, z * env.cellSize);
            addGeometry(w2);
            if (random() > 0.6) {
                const table = buildTable(x * env.cellSize + 0.5, 0, z * env.cellSize + 0.5);
                addFurniture(table);
            }
        }
    };
};
