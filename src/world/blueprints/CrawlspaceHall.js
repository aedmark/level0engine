export const CrawlspaceHallProfile = (env, ctx) => {
    const { addGeometry, random } = ctx;
    return {
        name: "CRAWLSPACE_HALL",
        prob: 0,
        build: (x, z) => {
            const dropHeight = 1.8;
            const yCenter = 3.0 - (dropHeight / 2);
            
            const dropGeo = env._cacheGeo('crawlspace_drop', () => {
                return new THREE.BoxGeometry(env.cellSize, dropHeight, env.cellSize);
            });
            
            const dropMesh = new THREE.Mesh(dropGeo, env.ceilingMat || env.sharedWallMat);
            dropMesh.position.set(x * env.cellSize, yCenter, z * env.cellSize);
            dropMesh.userData.isEntityBlocker = true;
            addGeometry(dropMesh);

            if (random() > 0.5) {
                const pipeGeo = env._cacheGeo('crawlspace_pipe', () => {
                    return new THREE.CylinderGeometry(0.1, 0.1, env.cellSize, 8);
                });
                const pipe = new THREE.Mesh(pipeGeo, env.pittedMetalMat || env.metalMat);
                pipe.rotation.z = Math.PI / 2;
                if (random() > 0.5) pipe.rotation.y = Math.PI / 2;
                pipe.position.set(x * env.cellSize, 1.1, z * env.cellSize);
                addGeometry(pipe);
            }
        }
    };
};
