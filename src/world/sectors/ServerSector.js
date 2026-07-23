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
