export const HingedDoorwayProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, chunkGroup, hash} = ctx;
    return {
        name: "HINGED DOORWAY",
        prob: 0.78, build: (x, z) => {
            const pW = 1.2, offset = (env.cellSize / 2) - (pW / 2), gap = env.cellSize - (pW * 2);
            const p1 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p1.position.set(x * env.cellSize - offset, 1.5, z * env.cellSize);
            addGeometry(p1);
            const p2 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p2.position.set(x * env.cellSize + offset, 1.5, z * env.cellSize);
            addGeometry(p2);
            const top = new THREE.Mesh(env._boxGeo(gap, 0.3, env.cellSize), env.headerMat);
            top.position.set(x * env.cellSize, 2.85, z * env.cellSize);
            addGeometry(top);
            const frameMat = env.woodMat;
            const jambL = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.32), frameMat);
            jambL.position.set(x * env.cellSize - 0.75, 1.325, z * env.cellSize + 1.85);
            addGeometry(jambL);
            const jambR = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.32), frameMat);
            jambR.position.set(x * env.cellSize + 0.75, 1.325, z * env.cellSize + 1.85);
            addGeometry(jambR);
            const jambT = new THREE.Mesh(env._boxGeo(1.6, 0.1, 0.32), frameMat);
            jambT.position.set(x * env.cellSize, 2.70, z * env.cellSize + 1.85);
            addGeometry(jambT);
            const doorGeo = env._cacheGeo('hingedDoor:X', () => {
                const g = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                g.translate(0.7, 0, 0.05);
                return g;
            });
            const door = new THREE.Mesh(doorGeo, env.doorMat);
            door.position.set(x * env.cellSize - 0.7, 1.325, z * env.cellSize + 1.85);
            door.castShadow = door.receiveShadow = true;
            door.userData = {
                chunkHash: hash,
                closedRot: 0,
                currentRot: 0
            };
            chunkGroup.add(door);
            env.interactiveDoors.push(door);
            env.walls.push(door);
            door.updateMatrixWorld();
            const dBox = new THREE.Box3().setFromObject(door);
            dBox.chunkHash = hash;
            door.userData.box = dBox;
            env.spatialGrid.insert(dBox);

            if (ctx.setWall) {
                const rx = Math.floor(random() * 3) + 2; 
                const rz = Math.floor(random() * 3) + 2; 
                let minX = x;
                let maxX = minX + rx - 1;
                let minZ = z + 1;
                let maxZ = z + rz;

                const chunkX = Math.floor(x / env.chunkSize);
                const chunkZ = Math.floor(z / env.chunkSize);
                const startX = chunkX * env.chunkSize;
                const startZ = chunkZ * env.chunkSize;
                const endX = startX + env.chunkSize - 1;
                const endZ = startZ + env.chunkSize - 1;

                maxX = Math.min(endX, maxX);
                maxZ = Math.min(endZ, maxZ);

                for (let px = minX - 1; px <= maxX + 1; px++) {
                    for (let pz = minZ - 1; pz <= maxZ + 1; pz++) {
                        const isBorder = (px < minX || px > maxX || pz > maxZ);
                        if (isBorder) {
                            if (px !== x || pz !== z) {
                                ctx.setWall(px, pz, true);
                                if (px < x || (px === x && pz < z)) {
                                    const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                                    wall.position.set(px * env.cellSize, 1.5, pz * env.cellSize);
                                    addGeometry(wall);
                                }
                            }
                        } else {
                            ctx.setWall(px, pz, false);
                        }
                    }
                }

                if (ctx.forceStructure && random() > 0.70) {
                    if (maxZ + 1 <= endZ) {
                        const backWallX = minX + Math.floor(random() * (maxX - minX + 1));
                        ctx.forceStructure(backWallX, maxZ + 1, "HINGED DOORWAY");
                    }
                }
            }
        }
    };
};
