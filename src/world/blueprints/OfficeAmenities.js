import * as OfficeFurniture from '../OfficeFurniture.js';

/**
 * [ROLE] Spawns lounge amenities (couches, potted plants) in a cell.
 * [WHY] Populates the generic maze with recognizable props to enhance the office atmosphere.
 * [STATE] Stateless generator.
 * [DEPENDS] OfficeFurniture builder functions and context.
 */
export const OfficeAmenitiesProfile = (env, ctx) => {
    const {random, addFurniture, buildCouch, buildWall, addGeometry} = ctx;
    return {
        name: "LOUNGE AMENITIES",
        prob: 0.15, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            
            // Randomly offset from the center of the cell
            const px = cx + (random() - 0.5) * 1.5;
            const pz = cz + (random() - 0.5) * 1.5;
            
            const roll = random();
            if (roll > 0.9) {
                if (random() > 0.5 && buildCouch) {
                    const rotY = random() * Math.PI * 2;
                    addFurniture(buildCouch(px, 0, pz, rotY));
                } else {
                    addFurniture(OfficeFurniture.buildPottedPlant(env, px, 0, pz));
                }
            } else {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                addGeometry(wall);
            }
        }
    };
};
