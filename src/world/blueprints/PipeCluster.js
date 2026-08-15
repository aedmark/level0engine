/**
 * [ROLE] Generates a grouping of vertical pipes.
 * [WHY] Adds vertical industrial set dressing, breaking up plain spaces and providing small sightline blockers.
 * [STATE] Stateless generation profile.
 * [DEPENDS] Pipe geometry, pipe material, and context geometry adding functions.
 */
export const PipeClusterProfile = (env, ctx) => {
    const {random, addGeometry} = ctx;
    return {
        name: "PIPE CLUSTER",
        prob: 0.01, build: (x, z) => {
            const colCount = Math.floor(random() * 3) + 2;
            for (let i = 0; i < colCount; i++) {
                const support = new THREE.Mesh(env.vPipeGeo, env.pipeMat || env.rustMat);
                const scale = (0.1 + random() * 0.15) / 0.12;
                support.scale.set(scale, 1, scale);
                const offsetX = (random() - 0.5) * 2.0;
                const offsetZ = (random() - 0.5) * 2.0;
                support.position.set(x * env.cellSize + offsetX, 1.5, z * env.cellSize + offsetZ);
                support.rotation.y = random() * Math.PI;
                addGeometry(support);
            }
        }
    };
};
