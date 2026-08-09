export const WallBreachProfile = (env, ctx) => {
    const { random } = ctx;
    return {
        name: "breach",
        prob: 0,
        build: (x, z, isWallCell) => {
            const breachType = random();
            const isRotated = isWallCell(x - 1, z) || isWallCell(x + 1, z);
            const rot = isRotated ? Math.PI / 2 : 0;
            const px = x * env.cellSize;
            const pz = z * env.cellSize;

            const addGroupToStaging = (grp) => {
                grp.position.set(px, 0, pz);
                grp.rotation.y = rot;
                grp.updateMatrixWorld(true);
                grp.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isEntityBlocker = true;
                        ctx.addGeometry(child);
                    }
                });
            };

            if (breachType > 0.6) {
                if (!env.doorFrameGeo) {
                    const g = new THREE.Group();
                    const pGeo = new THREE.BoxGeometry(0.2, 3.0, 0.6);
                    const p1 = new THREE.Mesh(pGeo, env.pittedMetalMat || env.metalMat);
                    p1.position.set(-1.2, 1.5, 0);
                    g.add(p1);
                    const p2 = new THREE.Mesh(pGeo, env.pittedMetalMat || env.metalMat);
                    p2.position.set(1.2, 1.5, 0);
                    g.add(p2);
                    const tGeo = new THREE.BoxGeometry(2.6, 0.2, 0.6);
                    const t1 = new THREE.Mesh(tGeo, env.pittedMetalMat || env.metalMat);
                    t1.position.set(0, 2.9, 0);
                    g.add(t1);
                    env.doorFrameGeo = g;
                }
                const frame = env.doorFrameGeo.clone();
                addGroupToStaging(frame);
            } else if (breachType > 0.3) {
                const wallG = new THREE.Group();
                const bGeo = new THREE.BoxGeometry(env.cellSize, 0.6, env.cellSize);
                const b1 = new THREE.Mesh(bGeo, env.sharedWallMat);
                b1.position.set(0, 0.3, 0);
                wallG.add(b1);

                const sGeo = new THREE.BoxGeometry((env.cellSize - 1.2) / 2, 2.4, env.cellSize);
                const s1 = new THREE.Mesh(sGeo, env.sharedWallMat);
                s1.position.set(-(env.cellSize/2) + sGeo.parameters.width/2, 1.8, 0);
                const s2 = new THREE.Mesh(sGeo, env.sharedWallMat);
                s2.position.set((env.cellSize/2) - sGeo.parameters.width/2, 1.8, 0);
                wallG.add(s1);
                wallG.add(s2);

                const tGeo = new THREE.BoxGeometry(1.2, 3.0 - 1.8, env.cellSize);
                const t1 = new THREE.Mesh(tGeo, env.sharedWallMat);
                t1.position.set(0, 1.8 + tGeo.parameters.height/2, 0);
                wallG.add(t1);

                const grateGeo = new THREE.BoxGeometry(1.16, 1.16, 0.08);
                const grateMat = env.cartLatticeMat || env.pittedMetalMat;
                const gratePivot = new THREE.Group();
                gratePivot.position.set(-0.58, 1.2, (env.cellSize / 2) - 0.04);
                gratePivot.rotation.y = Math.PI * 0.42;
                const grate = new THREE.Mesh(grateGeo, grateMat);
                grate.position.set(0.58, 0, 0);
                gratePivot.add(grate);
                wallG.add(gratePivot);

                if (!env.hazardTapeMat) {
                    env.hazardTapeMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.9 });
                    env.hazardTapeMat.userData.noShadow = true;
                }
                const stripeUnitGeo = env._cacheGeo('hazard_tape_unit', () => new THREE.BoxGeometry(1, 0.06, 0.08));
                const stripeY = 1.8 - 0.04;
                const stripeWidth = 1.1;
                [-1, 1].forEach(sign => {
                    const strip = new THREE.Mesh(stripeUnitGeo, env.hazardTapeMat);
                    strip.scale.set(stripeWidth, 1, 1);
                    strip.position.set(0, stripeY, sign * (env.cellSize / 2 - 0.06));
                    strip.userData.noCollision = true;
                    wallG.add(strip);
                });

                addGroupToStaging(wallG);
            } else {
                const wallG = new THREE.Group();
                const sGeo1 = new THREE.BoxGeometry(1.0, 3.0, env.cellSize);
                const sGeo2 = new THREE.BoxGeometry(1.4, 3.0, env.cellSize);
                const s1 = new THREE.Mesh(sGeo1, env.sharedWallMat);
                s1.position.set(-1.5, 1.5, 0);
                s1.rotation.y = (random() - 0.5) * 0.4;
                const s2 = new THREE.Mesh(sGeo2, env.sharedWallMat);
                s2.position.set(1.3, 1.5, 0);
                s2.rotation.y = (random() - 0.5) * 0.4;
                wallG.add(s1);
                wallG.add(s2);

                const tGeo = new THREE.BoxGeometry(1.6, 1.0, env.cellSize);
                const t1 = new THREE.Mesh(tGeo, env.sharedWallMat);
                t1.position.set(0, 2.5, 0);
                t1.rotation.z = (random() - 0.5) * 0.4;
                wallG.add(t1);

                addGroupToStaging(wallG);
            }
        }
    };
};
