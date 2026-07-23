// ServerSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const ServerSector = (env, ctx) => {
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
                id: "SERVER",
                foundationMat: env.serverFloorMat,
                ceilingMat: env.serverFloorMat,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.sharedWallMat, "SERVER")) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const rack = buildWall(env.cellSize * 0.85, env.cellSize * 0.85, env.serverMat);
                        rack.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                        rack.userData.isEntityBlocker = true;
                        addGeometry(rack);
                    } else {
                        const openE = localX < env.chunkSize - 1 ? !maze[localX + 1][localZ] : !maze[localX][localZ];
                        const openS = localZ < env.chunkSize - 1 ? !maze[localX][localZ + 1] : !maze[localX][localZ];
                        const openN = localZ > 0 ? !maze[localX][localZ - 1] : !maze[localX][localZ];
                        const openW = localX > 0 ? !maze[localX - 1][localZ] : !maze[localX][localZ];
                        const offset = 0.9;
                        let hasPipes = false;
                        if (openE) {
                            const pipeE = new THREE.Mesh(env.pipeGeo, env.rustMat);
                            pipeE.position.set(x * env.cellSize + (env.cellSize / 2) + offset, 2.75, z * env.cellSize + offset);
                            addGeometry(pipeE);
                            hasPipes = true;
                        }
                        if (openS) {
                            const pipeS = new THREE.Mesh(env.pipeGeo, env.rustMat);
                            pipeS.rotation.y = Math.PI / 2;
                            pipeS.position.set(x * env.cellSize + offset, 2.75, z * env.cellSize + (env.cellSize / 2) + offset);
                            addGeometry(pipeS);
                            hasPipes = true;
                        }
                        if (hasPipes || openN || openW) {
                            const mount = new THREE.Mesh(env.pipeMountGeo, env.rustMat);
                            mount.position.set(x * env.cellSize + offset, 2.9, z * env.cellSize + offset);
                            addGeometry(mount);
                            if (random() > 0.1) {
                                const junction = new THREE.Mesh(env.pipeJunctionGeo, env.rustMat);
                                junction.position.set(x * env.cellSize + offset, 2.75, z * env.cellSize + offset);
                                addGeometry(junction);
                            }
                        }
                        if (random() > 0.85) {
                            const propType = random();
                            const ox = x * env.cellSize;
                            const oz = z * env.cellSize;
                            const rx = ox + (random() - 0.5) * 1.4;
                            const rz = oz + (random() - 0.5) * 1.4;
                            const ry = random() * Math.PI;

                            if (propType < 0.33) {
                                const pallet = new THREE.Group();
                                if (!env.palletWoodMat) {
                                    env.palletWoodMat = new THREE.MeshStandardMaterial({color: 0x8b7355, roughness: 0.9});
                                    if (env.sharedAssets) env.sharedAssets.add(env.palletWoodMat.uuid);
                                }
                                const slatGeo = env._boxGeo(1.2, 0.02, 0.15);
                                const runnerGeo = env._boxGeo(1.2, 0.1, 0.1);
                                for(let i=0; i<5; i++) {
                                    const topSlat = new THREE.Mesh(slatGeo, env.palletWoodMat);
                                    topSlat.position.set(0, 0.13, -0.5 + (i * 0.25));
                                    pallet.add(topSlat);
                                    const botSlat = new THREE.Mesh(slatGeo, env.palletWoodMat);
                                    botSlat.position.set(0, 0.01, -0.5 + (i * 0.25));
                                    pallet.add(botSlat);
                                }
                                for(let i=0; i<3; i++) {
                                    const runner = new THREE.Mesh(runnerGeo, env.palletWoodMat);
                                    runner.position.set(0, 0.07, -0.5 + (i * 0.5));
                                    pallet.add(runner);
                                }
                                pallet.position.set(rx, 0, rz);
                                pallet.rotation.y = ry;
                                chunkGroup.add(pallet);
                            } else if (propType < 0.66) {
                                const spool = new THREE.Group();
                                if (!env.cat6Mat) {
                                    env.cat6Mat = new THREE.MeshStandardMaterial({color: 0x2266ff, roughness: 0.6});
                                    if (env.sharedAssets) env.sharedAssets.add(env.cat6Mat.uuid);
                                }
                                if (!env.spoolWoodMat) {
                                    env.spoolWoodMat = new THREE.MeshStandardMaterial({color: 0xaa8866, roughness: 0.8});
                                    if (env.sharedAssets) env.sharedAssets.add(env.spoolWoodMat.uuid);
                                }
                                const capGeo = env._cacheGeo('spoolCap', () => new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16));
                                const coreGeo = env._cacheGeo('spoolCore', () => new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16));
                                const cap1 = new THREE.Mesh(capGeo, env.spoolWoodMat);
                                cap1.position.y = 0.22;
                                const cap2 = new THREE.Mesh(capGeo, env.spoolWoodMat);
                                cap2.position.y = -0.22;
                                const cable = new THREE.Mesh(coreGeo, env.cat6Mat);
                                spool.add(cap1, cap2, cable);
                                if (random() > 0.5) {
                                    spool.rotation.z = Math.PI / 2;
                                    spool.position.set(rx, 0.4, rz);
                                } else {
                                    spool.position.set(rx, 0.24, rz);
                                }
                                spool.rotation.y = ry;
                                chunkGroup.add(spool);
                            } else {
                                const cart = new THREE.Group();
                                if (!env.cartMat) {
                                    env.cartMat = new THREE.MeshStandardMaterial({color: 0x222222, metalness: 0.6, roughness: 0.7});
                                    if (env.sharedAssets) env.sharedAssets.add(env.cartMat.uuid);
                                }
                                const shelfGeo = env._boxGeo(0.8, 0.05, 0.5);
                                for(let i=0; i<3; i++) {
                                    const shelf = new THREE.Mesh(shelfGeo, env.cartMat);
                                    shelf.position.y = 0.2 + (i * 0.4);
                                    cart.add(shelf);
                                }
                                const legGeo = env._boxGeo(0.04, 1.0, 0.04);
                                const positions = [[0.38, 0.23], [-0.38, 0.23], [0.38, -0.23], [-0.38, -0.23]];
                                positions.forEach(p => {
                                    const leg = new THREE.Mesh(legGeo, env.cartMat);
                                    leg.position.set(p[0], 0.5, p[1]);
                                    cart.add(leg);
                                });
                                if (random() > 0.5) {
                                    const crt = new THREE.Mesh(env._boxGeo(0.4, 0.3, 0.4), env.baseHousingMat);
                                    crt.position.set(0, 1.175, 0);
                                    cart.add(crt);
                                }
                                cart.position.set(rx, 0, rz);
                                cart.rotation.y = ry;
                                chunkGroup.add(cart);
                            }
                        }
                        if (random() > 0.8) {
                            const activeMat = ctx.getLightMaterial(0xff3333, 0xff0000, false);
                            const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
                            panel.position.set(x * env.cellSize, 2.98, z * env.cellSize);
                            chunkGroup.add(panel);
                            env.walls.push(panel);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * env.cellSize, 2.8, z * env.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.6,
                                baseIntensity: 0.4,
                                targetIntensity: 0.4,
                                currentIntensity: 0.4
                            });
                        }
                    }
                }
            };
};
