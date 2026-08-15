/**
 * [ROLE] Constructs a narrow passage with a lowered header (ceiling beam).
 * [WHY] Tightens the space to frame an entryway or restrict sightlines subtly.
 * [STATE] Stateless blueprint generator.
 * [DEPENDS] Environment cell size and header materials.
 */
export const NarrowHeaderGapProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "NARROW HEADER GAP",
        prob: 0.0431, build: (x, z) => {
            const dir = Math.floor(random() * 2), offset = (env.cellSize / 2) - 0.25;
            const w1 = dir === 0 ? 0.5 : env.cellSize, d1 = dir === 0 ? env.cellSize : 0.5;
            const gapW = dir === 0 ? env.cellSize - 1.0 : env.cellSize,
                gapD = dir === 0 ? env.cellSize : env.cellSize - 1.0;
            const p1 = buildWall(w1, d1, env.sharedWallMat);
            p1.position.set(x * env.cellSize - (dir === 0 ? offset : 0), 1.5, z * env.cellSize - (dir === 1 ? offset : 0));
            addGeometry(p1);
            const p2 = buildWall(w1, d1, env.sharedWallMat);
            p2.position.set(x * env.cellSize + (dir === 0 ? offset : 0), 1.5, z * env.cellSize + (dir === 1 ? offset : 0));
            addGeometry(p2);
            const top = new THREE.Mesh(env._boxGeo(gapW, 0.3, gapD), env.headerMat);
            top.position.set(x * env.cellSize, 2.85, z * env.cellSize);
            addGeometry(top);
        }
    };
};
