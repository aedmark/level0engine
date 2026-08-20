export const CratesOrElevatorProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "CRATES OR ELEVATOR",
        prob: 0.0754, build: (x, z) => {
            const structureType = random();
            if (structureType > 0.40) {
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
            } else {
                const isMagic = random() > 0.60;
                
                const nC = ctx.isWall && !ctx.isWall(x, z - 1);
                const sC = ctx.isWall && !ctx.isWall(x, z + 1);
                const wC = ctx.isWall && !ctx.isWall(x - 1, z);
                const eC = ctx.isWall && !ctx.isWall(x + 1, z);
                
                const openDirs = [];
                if (sC) openDirs.push(0);
                if (eC) openDirs.push(1);
                if (nC) openDirs.push(2);
                if (wC) openDirs.push(3);
                
                let dir;
                if (openDirs.length > 0) {
                    dir = openDirs[Math.floor(random() * openDirs.length)];
                } else {
                    dir = Math.floor(random() * 4);
                    if (ctx.setWall) {
                        if (dir === 0) ctx.setWall(x, z + 1, false);
                        else if (dir === 1) ctx.setWall(x + 1, z, false);
                        else if (dir === 2) ctx.setWall(x, z - 1, false);
                        else if (dir === 3) ctx.setWall(x - 1, z, false);
                    }
                }

                if (ctx.markOccupied) {
                    if (dir === 0) ctx.markOccupied(x, z + 1);
                    else if (dir === 1) ctx.markOccupied(x + 1, z);
                    else if (dir === 2) ctx.markOccupied(x, z - 1);
                    else if (dir === 3) ctx.markOccupied(x - 1, z);
                }

                const isZ = dir % 2 === 0;
                const wallH = 4.5;
                const wallY = 2.25;
                const w1 = buildWall(isZ ? 0.5 : env.cellSize, isZ ? env.cellSize : 0.5, env.sharedWallMat, wallH);
                w1.position.set(x * env.cellSize + (isZ ? -(env.cellSize / 2) + 0.25 : 0), wallY, z * env.cellSize + (isZ ? 0 : -(env.cellSize / 2) + 0.25));
                addGeometry(w1);
                
                const w2 = buildWall(isZ ? 0.5 : env.cellSize, isZ ? env.cellSize : 0.5, env.sharedWallMat, wallH);
                w2.position.set(x * env.cellSize + (isZ ? (env.cellSize / 2) - 0.25 : 0), wallY, z * env.cellSize + (isZ ? 0 : (env.cellSize / 2) - 0.25));
                addGeometry(w2);
                
                const w3 = buildWall(isZ ? env.cellSize : 0.5, isZ ? 0.5 : env.cellSize, env.sharedWallMat, wallH);
                const backOffset = (env.cellSize / 2) - 0.25;
                const sign = (dir === 2 || dir === 3) ? 1 : -1;
                w3.position.set(x * env.cellSize + (isZ ? 0 : sign * backOffset), wallY, z * env.cellSize + (isZ ? sign * backOffset : 0));
                addGeometry(w3);
                
                // Elevator ceiling
                const ceil = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, 0.5);
                ceil.position.set(x * env.cellSize, wallH - 0.25, z * env.cellSize);
                addGeometry(ceil);

                // Elevator floor
                const floor = new THREE.Mesh(env._boxGeo(env.cellSize - 1.0, 0.2, env.cellSize - 1.0), env.structMat);
                floor.position.set(x * env.cellSize, 0.1, z * env.cellSize);
                addGeometry(floor, isMagic);
            }
        }
    };
};
