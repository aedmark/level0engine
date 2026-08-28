export const CratesProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "CRATES",
        prob: 0.074, build: (x, z) => {
            const dir = Math.floor(random() * 4);
            const isZ = dir % 2 === 0;
            const sign = (dir > 1) ? 1 : -1;
            const longWall = buildWall(isZ ? 0.6 : env.cellSize * 0.8, isZ ? env.cellSize * 0.8 : 0.6, env.sharedWallMat);
            longWall.position.set(x * env.cellSize + (isZ ? sign * 1.2 : 0), 1.5, z * env.cellSize + (isZ ? 0 : sign * 1.2));
            longWall.userData.isEntityBlocker = true;
            addGeometry(longWall);
            const shortWall = buildWall(isZ ? env.cellSize * 0.6 : 0.6, isZ ? 0.6 : env.cellSize * 0.6, env.sharedWallMat);
            const sOffsetX = isZ ? (sign * 1.2) - (env.cellSize * 0.3) : sign * 1.2;
            const sOffsetZ = isZ ? sign * 1.2 : (sign * 1.2) - (env.cellSize * 0.3);
            shortWall.position.set(x * env.cellSize + sOffsetX, 1.5, z * env.cellSize + sOffsetZ);
            shortWall.userData.isEntityBlocker = true;
            addGeometry(shortWall);
            if (random() > 0.5) {
                if (!env.cartonGeo) {
                    env.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                    env.geoCache.set(env.cartonGeo.uuid, true);
                }
                const stackN = 2 + (random() > 0.6 ? 1 : 0);
                const byaw = random() * Math.PI;
                const cartonPool = env.cartonMats || [env.fileBoxMat];
                for (let ci = 0; ci < stackN; ci++) {
                    const carton = new THREE.Mesh(env.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                    carton.scale.set(1.2 - ci * 0.12, 1.1, 1.2 - ci * 0.12);
                    carton.position.set(
                        x * env.cellSize + (random() - 0.5) * 0.12,
                        0.275 + ci * 0.55,
                        z * env.cellSize + (random() - 0.5) * 0.12
                    );
                    carton.rotation.y = byaw + (random() - 0.5) * 0.5;
                    carton.userData.isEntityBlocker = true;
                    addGeometry(carton);
                }
            }
        }
    };
};
