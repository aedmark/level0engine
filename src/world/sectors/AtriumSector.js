// AtriumSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const AtriumSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildChair,
        buildTable,
        buildCouch,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;

    return {
                id: "ATRIUM",
                foundationMat: env.dirtMat,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.sharedWallMat, "ATRIUM")) {
                        if (env.farVoidMat) {
                            if (!env.fieldPlaneGeo) {
                                env.fieldPlaneGeo = new THREE.PlaneGeometry(env.cellSize + 0.02, 3.0);
                                env.geoCache.set(env.fieldPlaneGeo.uuid, true);
                            }
                            const lEdge = env.chunkSize - 1;
                            const faces = [];
                            if (localX === 0) faces.push([1, 0, Math.PI / 2]);
                            if (localX === lEdge) faces.push([-1, 0, -Math.PI / 2]);
                            if (localZ === 0) faces.push([0, 1, 0]);
                            if (localZ === lEdge) faces.push([0, -1, Math.PI]);
                            for (let fi = 0; fi < faces.length; fi++) {
                                const pane = new THREE.Mesh(env.fieldPlaneGeo, env.farVoidMat);
                                pane.position.set(x * env.cellSize + faces[fi][0] * 2.05, 1.5, z * env.cellSize + faces[fi][1] * 2.05);
                                pane.rotation.y = faces[fi][2];
                                pane.userData.chunkHash = hash;
                                ctx.chunkGroup.add(pane);
                                pane.updateMatrixWorld(true);
                            }
                        }
                        return;
                    }
                    const gx = x * env.cellSize, gz = z * env.cellSize;
                    if (localX === 7 && localZ === 7) {
                        const innerSpan = (env.chunkSize - 2) * env.cellSize;
                        const skyGeo = env._planeGeo(innerSpan, innerSpan);
                        const sky = new THREE.Mesh(skyGeo, env.nightSkyMat);
                        sky.rotation.x = Math.PI / 2;
                        // Corn blocks are 4.0 tall (see below), so 4.6 left the starfield
                        // hovering just 0.6 units above the stalks - practically a low tin roof.
                        // Pushed it up to 8.0, still shy of the outer void canopy at 9.0.
                        sky.position.set(gx + 2, 8.0, gz + 2);
                        ctx.chunkGroup.add(sky);
                        const fullSpan = env.chunkSize * env.cellSize;
                        const capNS = env._boxGeo(fullSpan, 0.06, env.cellSize);
                        const capEW = env._boxGeo(env.cellSize, 0.06, innerSpan);
                        for (let s = -1; s <= 1; s += 2) {
                            const capA = new THREE.Mesh(capNS, env.metalMat);
                            capA.position.set(gx + 2, 2.99, gz + 2 + s * (fullSpan / 2 - env.cellSize / 2));
                            addGeometry(capA);
                            const capB = new THREE.Mesh(capEW, env.metalMat);
                            capB.position.set(gx + 2 + s * (fullSpan / 2 - env.cellSize / 2), 2.99, gz + 2);
                            addGeometry(capB);
                        }
                    }
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const blockerGeo = env._cacheGeo('cornBlocker', () => new THREE.CylinderGeometry(env.cellSize / 2 - 0.2, env.cellSize / 2 - 0.2, 4.0, 8));
                        if (!env._invisibleMat) env._invisibleMat = new THREE.MeshBasicMaterial({visible: false});
                        const blocker = new THREE.Mesh(blockerGeo, env._invisibleMat);
                        blocker.position.set(gx, 2.0, gz);
                        blocker.userData.isEntityBlocker = true;
                        addGeometry(blocker);

                        const stalkCount = 7 + Math.floor(random() * 5);
                        const stalkGeo = env._cacheGeo('cornStalk', () => new THREE.CylinderGeometry(0.15, 0.15, 4.0, 6));
                        for(let i=0; i<stalkCount; i++) {
                            const stalk = new THREE.Mesh(stalkGeo, env.cornMat);
                            stalk.position.set(
                                gx + (random() - 0.5) * (env.cellSize - 0.5),
                                2.0 + (random() - 0.5) * 0.2,
                                gz + (random() - 0.5) * (env.cellSize - 0.5)
                            );
                            stalk.rotation.set((random()-0.5)*0.2, random()*Math.PI, (random()-0.5)*0.2);
                            stalk.castShadow = true;
                            stalk.receiveShadow = true;
                            ctx.chunkGroup.add(stalk);
                        }
                        if (random() > 0.95) {
                            const scarecrow = new THREE.Group();
                            const spine = new THREE.Mesh(env.vPipeGeo, env.woodMat);
                            spine.scale.set(1.5, 1.2, 1.5);
                            spine.position.set(0, 0.5, 0);
                            const cross = new THREE.Mesh(env.vPipeGeo, env.woodMat);
                            cross.scale.set(1.0, 0.6, 1.0);
                            cross.rotation.z = Math.PI / 2;
                            cross.position.set(0, 1.5, 0);
                            const headGeo = env._cacheGeo('scarecrowHead', () => new THREE.BoxGeometry(0.6, 0.6, 0.6));
                            const head = new THREE.Mesh(headGeo, env.fabricMat);
                            head.position.set(0, 2.0, 0);
                            head.rotation.set(0.2, random() * Math.PI, 0.1);
                            scarecrow.add(spine, cross, head);
                            scarecrow.position.set(gx + (random() - 0.5), 2.0, gz + (random() - 0.5));
                            const leanDir = random() * Math.PI * 2;
                            scarecrow.rotation.set(Math.cos(leanDir) * 0.15, random() * Math.PI, Math.sin(leanDir) * 0.15);
                            ctx.chunkGroup.add(scarecrow);
                        } else if (random() > 0.8) {
                            const pole = new THREE.Mesh(env.vPipeGeo, env.woodMat);
                            pole.scale.set(1.5, 1.2, 1.5);
                            const leanDir = random() * Math.PI * 2;
                            pole.rotation.set(Math.cos(leanDir) * 0.15, 0, Math.sin(leanDir) * 0.15);
                            pole.position.set(gx + (random() - 0.5) * 1.5, 2.5, gz + (random() - 0.5) * 1.5);
                            addGeometry(pole);
                        }
                    } else {
                        if (random() > 0.96) {
                            if (random() > 0.5) {
                                const barrow = new THREE.Group();
                                const trayGeo = env._cacheGeo('barrowTray', () => new THREE.BoxGeometry(1.0, 0.4, 1.4));
                                const tray = new THREE.Mesh(trayGeo, env.rustMat);
                                tray.position.set(0, 0.5, 0);
                                const handleGeo = env._cacheGeo('barrowHandle', () => new THREE.CylinderGeometry(0.05, 0.05, 2.0));
                                const h1 = new THREE.Mesh(handleGeo, env.woodMat);
                                h1.rotation.x = Math.PI / 2;
                                h1.position.set(0.4, 0.3, -0.2);
                                const h2 = new THREE.Mesh(handleGeo, env.woodMat);
                                h2.rotation.x = Math.PI / 2;
                                h2.position.set(-0.4, 0.3, -0.2);
                                const wheelGeo = env._cacheGeo('barrowWheel', () => new THREE.CylinderGeometry(0.25, 0.25, 0.1));
                                const wheel = new THREE.Mesh(wheelGeo, env.rustMat);
                                wheel.rotation.z = Math.PI / 2;
                                wheel.position.set(0, 0.25, 0.8);
                                barrow.add(tray, h1, h2, wheel);
                                barrow.position.set(gx + (random() - 0.5) * 1.5, 0.05, gz + (random() - 0.5) * 1.5);
                                barrow.rotation.y = random() * Math.PI * 2;
                                if (random() > 0.7) {
                                    barrow.rotation.z = Math.PI / 2;
                                    barrow.position.y += 0.4;
                                }
                                ctx.chunkGroup.add(barrow);
                            } else {
                                const scythe = new THREE.Group();
                                const pole = new THREE.Mesh(env.vPipeGeo, env.woodMat);
                                pole.scale.set(0.8, 0.6, 0.8);
                                const bladeGeo = env._cacheGeo('scytheBlade', () => new THREE.BoxGeometry(0.1, 0.8, 0.05));
                                const blade = new THREE.Mesh(bladeGeo, env.metalMat);
                                blade.position.set(0.4, 0.8, 0);
                                blade.rotation.z = Math.PI / 2;
                                scythe.add(pole, blade);
                                scythe.position.set(gx + (random() - 0.5) * 1.5, 0.06, gz + (random() - 0.5) * 1.5);
                                scythe.rotation.set(Math.PI / 2, random() * Math.PI, 0);
                                ctx.chunkGroup.add(scythe);
                            }
                        }
                    }
                }
            };
};
