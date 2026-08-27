export const PipeClusterProfile = (env, ctx) => {
    const {random, addGeometry} = ctx;
    return {
        name: "PIPE CLUSTER",
        prob: 0.01, build: (x, z) => {
            if (ctx.markPermeable) ctx.markPermeable(x, z);
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
