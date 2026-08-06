/**
 * [ROLE] Generates a rounded corner layout with an optional chair.
 * [WHY] Adds spatial variety with smooth curves instead of sharp corners.
 * [STATE] Stateless; returns a configuration object with a build function.
 * [DEPENDS] Depends on env properties and context functions like buildCurvedCornerBlock, buildChair.
 */
export const RoundAlcoveProfile = (env, ctx) => {
    const {random, buildCurvedCornerBlock, addGeometry, buildChair, addFurniture} = ctx;
    return {
        name: "ROUND ALCOVE",
        prob: 0.55, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            
            // Build the block
            const block = buildCurvedCornerBlock(env.cellSize, env.sharedWallMat);
            
            // Randomly rotate to one of the 4 corners, and stand it upright
            const angle = Math.floor(random() * 4) * (Math.PI / 2);
            block.rotation.set(-Math.PI / 2, angle, 0, 'YXZ');
            
            block.position.set(cx, 1.5, cz);
            block.userData.isEntityBlocker = true;
            addGeometry(block);
            
            if (random() > 0.5) {
                // Place chair in the cutout
                // The cutout is at (-size/2, +size/2) in XZ before rotation Y.
                // Let's just place it near the center of the cell and face it outward.
                const rot = random() * Math.PI * 2;
                const chair = buildChair(cx, 0, cz, rot);
                addFurniture(chair);
            }
        }
    };
};
