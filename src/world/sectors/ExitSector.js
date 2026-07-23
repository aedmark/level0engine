// ExitSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const ExitSector = (env, ctx) => {
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
                id: "EXIT",
                foundationMat: env.tileMat,
                ceilingMat: env.structMat,
                build: (x, z, localX, localZ) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.structMat, "EXIT")) return;
                    const isPathX = localZ === 7;
                    const isPathZ = localX === 7;
                    if (localX >= 5 && localX <= 9 && localZ >= 5 && localZ <= 9) {
                        if (localX === 5 || localX === 9 || localZ === 5 || localZ === 9) {
                            if ((localX === 7 && isPathZ) || (localZ === 7 && isPathX)) {
                            } else {
                                const wall = buildWall(env.cellSize, env.cellSize, env.metalMat);
                                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                                wall.userData.isEntityBlocker = true;
                                addGeometry(wall);
                            }
                        } else if (localX === 7 && localZ === 7) {
                            const elevator = new THREE.Mesh(env._boxGeo(env.cellSize * 0.8, 3.0, env.cellSize * 0.8), env.rustMat);
                            elevator.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                            elevator.userData = {type: 'exit', chunkHash: hash, active: true};
                            chunkGroup.add(elevator);
                            if (!env.interactables) env.interactables = [];
                            env.interactables.push(elevator);
                            const pad = new THREE.Mesh(env._boxGeo(env.cellSize * 0.85, 0.8, env.cellSize * 0.85), env.metalMat);
                            pad.position.set(0, -0.2, 0);
                            elevator.add(pad);
                            const light = new THREE.Mesh(env._boxGeo(env.cellSize * 0.9, 0.4, env.cellSize * 0.9), env.hazardMat);
                            light.material = new THREE.MeshBasicMaterial({color: 0x55ff55});
                            pad.add(light);
                            const eBox = new THREE.Box3().setFromObject(elevator);
                            eBox.chunkHash = hash;
                            eBox.isEntityBlocker = true;
                            env.spatialGrid.insert(eBox);
                        }
                    } else if (isPathX || isPathZ) {
                    } else {
                        const block = buildWall(env.cellSize, env.cellSize, env.structMat);
                        block.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                    }
                }
            };
};
