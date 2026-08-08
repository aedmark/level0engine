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

            // Removed the black pipe generation per user request

            if (!env.hazardTapeMat) {
                env.hazardTapeMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.9 });
                if (env.sharedAssets) env.sharedAssets.add(env.hazardTapeMat.uuid);
            }
            const tapeGeoZ = env._cacheGeo('crawl_tape_z', () => new THREE.BoxGeometry(env.cellSize, 0.05, 0.05));
            const tapeGeoX = env._cacheGeo('crawl_tape_x', () => new THREE.BoxGeometry(0.05, 0.05, env.cellSize));
            const t1 = new THREE.Mesh(tapeGeoZ, env.hazardTapeMat);
            t1.position.set(x * env.cellSize, 1.225, z * env.cellSize + env.cellSize / 2 - 0.025);
            const t2 = new THREE.Mesh(tapeGeoZ, env.hazardTapeMat);
            t2.position.set(x * env.cellSize, 1.225, z * env.cellSize - env.cellSize / 2 + 0.025);
            const t3 = new THREE.Mesh(tapeGeoX, env.hazardTapeMat);
            t3.position.set(x * env.cellSize + env.cellSize / 2 - 0.025, 1.225, z * env.cellSize);
            const t4 = new THREE.Mesh(tapeGeoX, env.hazardTapeMat);
            t4.position.set(x * env.cellSize - env.cellSize / 2 + 0.025, 1.225, z * env.cellSize);
            addGeometry(t1); addGeometry(t2); addGeometry(t3); addGeometry(t4);
        }
    };
};
