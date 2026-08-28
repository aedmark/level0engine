import * as OfficeFurniture from '../OfficeFurniture.js';

export const OfficeAmenitiesProfile = (env, ctx) => {
    const {random, addFurniture, buildCouch, buildWall, addGeometry} = ctx;
    return {
        name: "LOUNGE AMENITIES",
        prob: 0.0514, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            
            const px = cx + (random() - 0.5) * 1.5;
            const pz = cz + (random() - 0.5) * 1.5;
            
            const roll = random();
            if (roll > 0.9 && buildCouch) {
                const rotY = random() * Math.PI * 2;
                if (addFurniture(buildCouch(px, 0, pz, rotY))) return true;
            }
            const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
            wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
            addGeometry(wall);
            return true;
        }
    };
};
