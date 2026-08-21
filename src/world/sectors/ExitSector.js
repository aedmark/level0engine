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
                housing.position.set(x * env.cellSize, 2.9, z * env.cellSize);
                chunkGroup.add(housing);

                const light = new THREE.Mesh(env._boxGeo(0.6, 0.2, 0.6), new THREE.MeshBasicMaterial({color: 0xff1111}));
                light.position.set(0, -0.1, 0);
                housing.add(light);
                
                const pLight = new THREE.PointLight(0xff1111, 2.5, 20);
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
                    const elevator = new THREE.Group();
                    elevator.position.set(x * env.cellSize, 0, z * env.cellSize);
                    chunkGroup.add(elevator);

                    const glassMat = new THREE.MeshStandardMaterial({color: 0x88ccff, transparent: true, opacity: 0.3, metalness: 0.8, roughness: 0.1});
                    const glowingSignMat = new THREE.MeshBasicMaterial({color: 0x55ff55});

                    const basePad = new THREE.Mesh(env._cylinderGeo(env.cellSize * 0.45, env.cellSize * 0.45, 0.4, 16), env.diamondPlateMat || env.metalMat);
                    basePad.position.set(0, 0.2, 0);
                    elevator.add(basePad);
                    
                    const ringLight = new THREE.Mesh(env._cylinderGeo(env.cellSize * 0.4, env.cellSize * 0.4, 0.45, 16), glowingSignMat);
                    ringLight.position.set(0, 0.2, 0);
                    elevator.add(ringLight);

                    const hullRadius = env.cellSize * 0.38;
                    const hullHeight = 2.8;
                    const hullY = 0.4 + hullHeight / 2;
                    const hullMat = env.incinWallMat || env.rustMat;
                    
                    const doubleHullMat = hullMat.clone();
                    doubleHullMat.side = THREE.DoubleSide;

                    const hullBot = new THREE.Mesh(env._cylinderGeo(hullRadius, hullRadius, 0.2, 16), hullMat);
                    hullBot.position.set(0, 0.4 + 0.1, 0);
                    elevator.add(hullBot);

                    const thetaStart = Math.PI / 8;
                    const thetaLength = 14 * Math.PI / 8;
                    const hullMidGeo = new THREE.CylinderGeometry(hullRadius, hullRadius, 2.4, 14, 1, true, thetaStart, thetaLength);
                    const hullMid = new THREE.Mesh(hullMidGeo, doubleHullMat);
                    hullMid.position.set(0, 0.6 + 1.2, 0);
                    elevator.add(hullMid);

                    const hullTop = new THREE.Mesh(env._cylinderGeo(hullRadius, hullRadius, 0.2, 16), hullMat);
                    hullTop.position.set(0, 3.0 + 0.1, 0);
                    elevator.add(hullTop);

                    const doorGroup = new THREE.Group();
                    doorGroup.position.set(0, hullY, hullRadius - 0.2);
                    doorGroup.userData = {type: 'exit', chunkHash: hash, active: true};
                    elevator.add(doorGroup);
                    
                    if (!env.interactables) env.interactables = [];
                    env.interactables.push(doorGroup);

                    const frameMat = env.exitDoorFrameMat || env.blackIronMat || env.metalMat;

                    const fWidth = 1.6;
                    const fHeight = 2.4;
                    const fDepth = 0.6;
                    const fThick = 0.2;

                    const frameTop = new THREE.Mesh(env._boxGeo(fWidth, fThick, fDepth), frameMat);
                    frameTop.position.set(0, fHeight / 2 - fThick / 2, 0);
                    doorGroup.add(frameTop);

                    const frameBottom = new THREE.Mesh(env._boxGeo(fWidth, fThick, fDepth), frameMat);
                    frameBottom.position.set(0, -fHeight / 2 + fThick / 2, 0);
                    doorGroup.add(frameBottom);

                    const frameLeft = new THREE.Mesh(env._boxGeo(fThick, fHeight - fThick * 2, fDepth), frameMat);
                    frameLeft.position.set(-fWidth / 2 + fThick / 2, 0, 0);
                    doorGroup.add(frameLeft);

                    const frameRight = new THREE.Mesh(env._boxGeo(fThick, fHeight - fThick * 2, fDepth), frameMat);
                    frameRight.position.set(fWidth / 2 - fThick / 2, 0, 0);
                    doorGroup.add(frameRight);

                    const frameMid = new THREE.Mesh(env._boxGeo(fThick / 2, fHeight - fThick * 2, fDepth), frameMat);
                    frameMid.position.set(0, 0, 0);
                    doorGroup.add(frameMid);

                    const glassW = (fWidth - fThick * 2 - fThick / 2) / 2;
                    const glassH = fHeight - fThick * 2;
                    const glassThickness = 0.1;

                    const glass1 = new THREE.Mesh(env._boxGeo(glassW, glassH, glassThickness), glassMat);
                    glass1.position.set(-0.325, 0, 0);
                    doorGroup.add(glass1);

                    const glass2 = new THREE.Mesh(env._boxGeo(glassW, glassH, glassThickness), glassMat);
                    glass2.position.set(0.325, 0, 0);
                    doorGroup.add(glass2);

                    const portLeft = new THREE.Mesh(env._cylinderGeo(0.5, 0.5, 0.4, 12), hullMat);
                    portLeft.rotation.z = Math.PI / 2;
                    portLeft.position.set(-hullRadius, hullY + 0.2, 0);
                    elevator.add(portLeft);
                    
                    const portLeftGlass = new THREE.Mesh(env._cylinderGeo(0.4, 0.4, 0.1, 12), glassMat);
                    portLeftGlass.rotation.z = Math.PI / 2;
                    portLeftGlass.position.set(-hullRadius, hullY + 0.2, 0);
                    elevator.add(portLeftGlass);

                    const portRight = new THREE.Mesh(env._cylinderGeo(0.5, 0.5, 0.4, 12), hullMat);
                    portRight.rotation.z = Math.PI / 2;
                    portRight.position.set(hullRadius, hullY + 0.2, 0);
                    elevator.add(portRight);
                    
                    const portRightGlass = new THREE.Mesh(env._cylinderGeo(0.4, 0.4, 0.1, 12), glassMat);
                    portRightGlass.rotation.z = Math.PI / 2;
                    portRightGlass.position.set(hullRadius, hullY + 0.2, 0);
                    elevator.add(portRightGlass);

                    const domeY = hullY + hullHeight / 2;
                    const dome = new THREE.Mesh(new THREE.SphereGeometry(hullRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hullMat);
                    dome.position.set(0, domeY, 0);
                    elevator.add(dome);

                    const topPad = new THREE.Mesh(env._cylinderGeo(env.cellSize * 0.45, env.cellSize * 0.45, 0.4, 16), env.diamondPlateMat || env.metalMat);
                    topPad.position.set(0, domeY, 0);
                    elevator.add(topPad);
                    
                    const topRingLight = new THREE.Mesh(env._cylinderGeo(env.cellSize * 0.4, env.cellSize * 0.4, 0.45, 16), glowingSignMat);
                    topRingLight.position.set(0, domeY, 0);
                    elevator.add(topRingLight);

                    const roof1 = new THREE.Mesh(env._boxGeo(1.8, 0.2, 1.8), env.diamondPlateMat || env.metalMat);
                    roof1.position.set(0, domeY + 0.1, 0);
                    elevator.add(roof1);
                    
                    const roof2 = new THREE.Mesh(env._boxGeo(1.4, 0.4, 1.4), env.blackIronMat || env.metalMat);
                    roof2.position.set(0, domeY + 0.4, 0);
                    elevator.add(roof2);

                    const signBox = new THREE.Mesh(env._boxGeo(1.5, 0.2, 1.5), glowingSignMat);
                    signBox.position.set(0, domeY + 0.3, 0);
                    elevator.add(signBox);
                    
                    const roof3 = new THREE.Mesh(env._boxGeo(1.0, 0.1, 1.0), env.diamondPlateMat || env.metalMat);
                    roof3.position.set(0, domeY + 0.65, 0);
                    elevator.add(roof3);

                    const antennaBase = new THREE.Mesh(env._cylinderGeo(0.1, 0.2, 0.3, 8), env.blackIronMat || env.metalMat);
                    antennaBase.position.set(0, domeY + 0.85, 0);
                    elevator.add(antennaBase);
                    
                    const antennaPole = new THREE.Mesh(env._cylinderGeo(0.02, 0.02, 1.5, 4), env.diamondPlateMat || env.metalMat);
                    antennaPole.position.set(0, domeY + 1.75, 0);
                    elevator.add(antennaPole);

                    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glowingSignMat);
                    antennaTip.position.set(0, domeY + 2.5, 0);
                    elevator.add(antennaTip);

                    const intLight = new THREE.PointLight(0x55ff55, 1.5, 10);
                    intLight.position.set(0, hullY, 0);
                    elevator.add(intLight);

                    const eBox = new THREE.Box3();
                    const halfCell = env.cellSize / 2;
                    eBox.min.set(x * env.cellSize - halfCell, 0, z * env.cellSize - halfCell);
                    eBox.max.set(x * env.cellSize + halfCell, 5, z * env.cellSize + halfCell);
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
                if ((isPathX && localX % 2 === 0 && localX < 5) || (isPathZ && localZ % 2 === 0 && localZ < 5) ||
                    (isPathX && localX % 2 === 1 && localX > 9) || (isPathZ && localZ % 2 === 1 && localZ > 9)) {
                    
                    addLight();
                }

                if (env.exitArrowMat && ((isPathX && (localX < 5 || localX > 9)) || (isPathZ && (localZ < 5 || localZ > 9)))) {
                    if ((isPathX && localX % 2 === 0) || (isPathZ && localZ % 2 === 0)) {
                        const arrowMesh = new THREE.Mesh(env._planeGeo(3.5, 3.5), env.exitArrowMat);
                        arrowMesh.rotation.x = -Math.PI / 2;
                        arrowMesh.position.set(x * env.cellSize, 0.03, z * env.cellSize);

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