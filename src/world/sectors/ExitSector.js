import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {placeEphemera} from '../NarrativeProps.js';

export const ExitSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        chunkGroup,
        hash
    } = ctx;
    return {
        id: "EXIT",
        foundationMat: env.exitFloorMat || env.tileMat,
        ceilingMat: env.exitCeilingMat || env.structMat,
        build: (x, z, localX, localZ) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.exitWallMat || env.structMat, "EXIT")) return;
            const isPathX = localZ === 7;
            const isPathZ = localX === 7;
            
            const addLight = () => {
                const housing = new THREE.Mesh(env._boxGeo(0.8, 0.2, 0.8), env.metalMat);
                housing.position.set(x * env.cellSize, 2.9, z * env.cellSize); // Attached to ceiling
                chunkGroup.add(housing);

                const light = new THREE.Mesh(env._boxGeo(0.6, 0.2, 0.6), new THREE.MeshBasicMaterial({color: 0xff1111}));
                light.position.set(0, -0.1, 0);
                housing.add(light);
                
                const pLight = new THREE.PointLight(0xff1111, 2.5, 20); // Boosted intensity and range
                pLight.position.set(0, -0.3, 0);
                pLight.castShadow = true;
                housing.add(pLight);
            };

            if (localX >= 5 && localX <= 9 && localZ >= 5 && localZ <= 9) {
                if (localX === 5 || localX === 9 || localZ === 5 || localZ === 9) {
                    if ((localX === 7 && isPathZ) || (localZ === 7 && isPathX)) {
                    } else {
                        const wall = buildWall(env.cellSize, env.cellSize, env.exitWallMat || env.metalMat);
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
                } else {
                    placeEphemera(env, ctx, "EXIT", x * env.cellSize, z * env.cellSize);
                    if ((localX === 6 || localX === 8) && (localZ === 6 || localZ === 8)) {
                        addLight();
                    }
                }
            } else if (isPathX || isPathZ) {
                // Add suspended trusses and warning lights every other cell
                if ((isPathX && localX % 2 === 0 && localX < 5) || (isPathZ && localZ % 2 === 0 && localZ < 5) || 
                    (isPathX && localX % 2 === 1 && localX > 9) || (isPathZ && localZ % 2 === 1 && localZ > 9)) {
                    
                    addLight();
                }

                // Add route arrows pointing to the center elevator
                if (env.exitArrowMat && ((isPathX && (localX < 5 || localX > 9)) || (isPathZ && (localZ < 5 || localZ > 9)))) {
                    if ((isPathX && localX % 2 === 0) || (isPathZ && localZ % 2 === 0)) {
                        const arrowMesh = new THREE.Mesh(env._planeGeo(3.5, 3.5), env.exitArrowMat);
                        arrowMesh.rotation.x = -Math.PI / 2;
                        arrowMesh.position.set(x * env.cellSize, 0.03, z * env.cellSize);
                        
                        // Rotate to point to center room
                        if (isPathX && localX < 5) arrowMesh.rotation.z = -Math.PI / 2;
                        else if (isPathX && localX > 9) arrowMesh.rotation.z = Math.PI / 2;
                        else if (isPathZ && localZ < 5) arrowMesh.rotation.z = Math.PI;
                        else if (isPathZ && localZ > 9) arrowMesh.rotation.z = 0;

                        addGeometry(arrowMesh);
                    }
                }
            } else {
                const block = buildWall(env.cellSize, env.cellSize, env.exitWallMat || env.structMat);
                block.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                block.userData.isEntityBlocker = true;
                addGeometry(block);
            }
        }
    };
};