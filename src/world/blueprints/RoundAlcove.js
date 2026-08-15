/**
 * [ROLE] Generates a rounded corner layout with an optional chair.
 * [WHY] Adds spatial variety with smooth curves instead of sharp corners.
 * [STATE] Stateless; returns a configuration object with a build function.
 * [DEPENDS] Depends on env properties and context functions like buildCurvedCornerBlock, buildChair.
 */
export const RoundAlcoveProfile = (env, ctx) => {
    const {random, buildCurvedCornerBlock, addGeometry, buildChair, addFurniture, addCurvedAlcoveBaseboard} = ctx;
    return {
        name: "ROUND ALCOVE",
        prob: 0.0538, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;

            const neighbors = {
                px: ctx.isWall(x + 1, z),
                nx: ctx.isWall(x - 1, z),
                pz: ctx.isWall(x, z + 1),
                nz: ctx.isWall(x, z - 1)
            };

            const scores = [
                (neighbors.px ? 1 : 0) + (neighbors.nz ? 1 : 0),
                (neighbors.nz ? 1 : 0) + (neighbors.nx ? 1 : 0),
                (neighbors.nx ? 1 : 0) + (neighbors.pz ? 1 : 0),
                (neighbors.pz ? 1 : 0) + (neighbors.px ? 1 : 0)
            ];

            const maxScore = Math.max(...scores);

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

            const block = buildCurvedCornerBlock(env.cellSize, env.sharedWallMat);

            block.rotation.set(-Math.PI / 2, 0, angle, 'XYZ');

            block.position.set(cx, 1.5, cz);
            block.userData.noCollision = true;

            /** Collision follows the curve rather than the square corner behind it. The previous
             * two edge slabs described a right-angled corner, leaving the whole volume under the
             * bulge walkable. See addCurvedCornerColliders. */
            ctx.addCurvedCornerColliders(block, env.cellSize);

            addGeometry(block);
            addCurvedAlcoveBaseboard(cx, cz, angle);

            if (random() > 0.5) {
                const rot = random() * Math.PI * 2;
                const chair = buildChair(cx, 0, cz, rot);
                addFurniture(chair);
            }
        }
    };
};