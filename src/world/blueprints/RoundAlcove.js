/**
 * [ROLE] Generates a rounded corner layout with an optional chair.
 * [WHY] Adds spatial variety with smooth curves instead of sharp corners.
 * [STATE] Stateless; returns a configuration object with a build function.
 * [DEPENDS] Depends on env properties and context functions like buildCurvedCornerBlock, buildChair.
 */
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const RoundAlcoveProfile = (env, ctx) => {
    const {random, buildCurvedCornerBlock, addGeometry, buildChair, addFurniture, addCurvedAlcoveBaseboard} = ctx;
    return {
        name: "ROUND ALCOVE",
        prob: 0.55, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;

            const neighbors = {
                px: ctx.isWall(x + 1, z),
                nx: ctx.isWall(x - 1, z),
                pz: ctx.isWall(x, z + 1),
                nz: ctx.isWall(x, z - 1)
            };

            const scores = [
                (neighbors.px ? 1 : 0) + (neighbors.nz ? 1 : 0), // 0: +X, -Z
                (neighbors.nz ? 1 : 0) + (neighbors.nx ? 1 : 0), // 1: -Z, -X
                (neighbors.nx ? 1 : 0) + (neighbors.pz ? 1 : 0), // 2: -X, +Z
                (neighbors.pz ? 1 : 0) + (neighbors.px ? 1 : 0)  // 3: +Z, +X
            ];

            const maxScore = Math.max(...scores);

            // If it's an island with no adjacent walls, fallback to a standard wall
            if (maxScore === 0) {
                const wall = ctx.buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(cx, 1.5, cz);
                wall.userData.isEntityBlocker = true;
                ctx.addGeometry(wall);
                return;
            }

            const bestAngles = [];
            for (let i = 0; i < 4; i++) {
                if (scores[i] === maxScore) bestAngles.push(i);
            }

            const chosenIndex = bestAngles[Math.floor(random() * bestAngles.length)];
            const angle = chosenIndex * (Math.PI / 2);

            // Build the block
            const block = buildCurvedCornerBlock(env.cellSize, env.sharedWallMat);

            // Rotate so it stands upright and aligns with walls
            block.rotation.set(-Math.PI / 2, 0, angle, 'XYZ');

            block.position.set(cx, 1.5, cz);
            block.userData.noCollision = true; // Prevent the full 4x4 bounding box from being inserted

            const tBox = 0.3;
            const halfSize = env.cellSize / 2;
            const colliders = [];

            if (chosenIndex === 0) {
                colliders.push(new AABB(new Vec3(cx + halfSize - tBox, 0, cz - halfSize), new Vec3(cx + halfSize, 3.0, cz + halfSize)));
                colliders.push(new AABB(new Vec3(cx - halfSize, 0, cz - halfSize), new Vec3(cx + halfSize, 3.0, cz - halfSize + tBox)));
            } else if (chosenIndex === 1) {
                colliders.push(new AABB(new Vec3(cx - halfSize, 0, cz - halfSize), new Vec3(cx + halfSize, 3.0, cz - halfSize + tBox)));
                colliders.push(new AABB(new Vec3(cx - halfSize, 0, cz - halfSize), new Vec3(cx - halfSize + tBox, 3.0, cz + halfSize)));
            } else if (chosenIndex === 2) {
                colliders.push(new AABB(new Vec3(cx - halfSize, 0, cz - halfSize), new Vec3(cx - halfSize + tBox, 3.0, cz + halfSize)));
                colliders.push(new AABB(new Vec3(cx - halfSize, 0, cz + halfSize - tBox), new Vec3(cx + halfSize, 3.0, cz + halfSize)));
            } else if (chosenIndex === 3) {
                colliders.push(new AABB(new Vec3(cx - halfSize, 0, cz + halfSize - tBox), new Vec3(cx + halfSize, 3.0, cz + halfSize)));
                colliders.push(new AABB(new Vec3(cx + halfSize - tBox, 0, cz - halfSize), new Vec3(cx + halfSize, 3.0, cz + halfSize)));
            }

            for (const box of colliders) {
                box.isEntityBlocker = true;
                box.chunkHash = ctx.hash;
                env.spatialGrid.insert(box);
            }

            addGeometry(block);
            addCurvedAlcoveBaseboard(cx, cz, angle);

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