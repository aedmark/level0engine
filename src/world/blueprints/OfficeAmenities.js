import * as OfficeFurniture from '../OfficeFurniture.js';

/**
 * [ROLE] Spawns various office amenities (water coolers, potted plants, filing cabinets) in a cell.
 * [WHY] Populates the generic maze with recognizable props to enhance the office atmosphere.
 * [STATE] Stateless generator.
 * [DEPENDS] OfficeFurniture builder functions and context.
 */
export const OfficeAmenitiesProfile = (env, ctx) => {
    const {random, addFurniture} = ctx;
    return {
        name: "OFFICE AMENITIES",
        prob: 0.15, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            
            // Randomly offset from the center of the cell
            const px = cx + (random() - 0.5) * 1.5;
            const pz = cz + (random() - 0.5) * 1.5;
            
            const roll = random();
            if (roll > 0.5) {
                const rotY = random() * Math.PI * 2;
                addFurniture(OfficeFurniture.buildWaterCooler(env, px, 0, pz, rotY));
            } else {
                const rotY = random() * Math.PI * 2;
                addFurniture(OfficeFurniture.buildFilingCabinet(env, random, px, 0, pz, rotY));
            }
        }
    };
};
