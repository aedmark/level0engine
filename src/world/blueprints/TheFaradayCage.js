
export const TheFaradayCageProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, chunkGroup, hash} = ctx;
    return {
        name: "THE FARADAY CAGE",
        prob: 0.0016, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            
            if (!env._copperSolidMat) {
                env._copperSolidMat = new THREE.MeshStandardMaterial({
                    color: 0x8a5020,
                    metalness: 0.9,
                    roughness: 0.5
                });
                env.sharedAssets.add(env._copperSolidMat.uuid);
            }
            const wallMat = env._copperSolidMat;
            
            const dir = Math.floor(random() * 4);
            const thick = 0.4;
            const off = (env.cellSize / 2) - (thick / 2);
            for (let i = 0; i < 4; i++) {
                const isZ = (i === 0 || i === 2);
                const sign = (i === 1 || i === 2) ? 1 : -1;
                if (i === dir) {
                    const pW = 1.2;
                    const pOff = (env.cellSize / 2) - (pW / 2);
                    const gap = env.cellSize - (pW * 2);
                    const p1 = buildWall(isZ ? pW : thick, isZ ? thick : pW, wallMat);
                    p1.position.set(cx + (isZ ? -pOff : sign * off), 1.5, cz + (isZ ? sign * off : -pOff));
                    addGeometry(p1);
                    const p2 = buildWall(isZ ? pW : thick, isZ ? thick : pW, wallMat);
                    p2.position.set(cx + (isZ ? pOff : sign * off), 1.5, cz + (isZ ? sign * off : pOff));
                    addGeometry(p2);
                    const head = buildWall(isZ ? gap : thick, isZ ? thick : gap, wallMat, 0.4, 2.6);
                    head.position.set(cx + (isZ ? 0 : sign * off), 2.8, cz + (isZ ? sign * off : 0));
                    addGeometry(head);
                } else {
                    const w = buildWall(isZ ? env.cellSize : thick, isZ ? thick : env.cellSize, wallMat);
                    w.position.set(cx + (isZ ? 0 : sign * off), 1.5, cz + (isZ ? sign * off : 0));
                    addGeometry(w);
                }
            }
            const blockBox = new THREE.Box3(
                new THREE.Vector3(cx - env.cellSize / 2, 0, cz - env.cellSize / 2),
                new THREE.Vector3(cx + env.cellSize / 2, 3.0, cz + env.cellSize / 2)
            );
            blockBox.isEntityBlocker = true;
            blockBox.isInvisibleBlocker = true;
            blockBox.chunkHash = hash;
            env.spatialGrid.insert(blockBox);
            
            const floor = new THREE.Mesh(env._planeGeo(env.cellSize - thick, env.cellSize - thick), wallMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(cx, 0.02, cz);
            addGeometry(floor);
            const roof = buildWall(3.9, 3.9, wallMat, 0.2);
            roof.position.set(cx, 2.9, cz);
            addGeometry(roof);
            
            const cotX = (dir === 1) ? -0.8 : (dir === 3 ? 0.8 : 0);
            const cotZ = (dir === 0) ? 0.8 : (dir === 2 ? -0.8 : 0);
            const cotRot = (dir === 0 || dir === 2) ? Math.PI / 2 : 0;
            const addPart = (geo, mat, dx, dy, dz) => {
                const mesh = new THREE.Mesh(geo, mat);
                const s = Math.sin(cotRot);
                const c = Math.cos(cotRot);
                mesh.position.set(cx + cotX + (dx * c + dz * s), dy, cz + cotZ + (-dx * s + dz * c));
                mesh.rotation.y = cotRot;
                addGeometry(mesh);
            };

            const deskMat = env.woodMat;
            const deskGeo = env._boxGeo(1.6, 0.05, 0.8);
            addPart(deskGeo, deskMat, 0, 0.9, 0);
            const legGeo = env._boxGeo(0.05, 0.9, 0.05);
            addPart(legGeo, env.structMat, -0.7, 0.45, -0.3);
            addPart(legGeo, env.structMat, 0.7, 0.45, -0.3);
            addPart(legGeo, env.structMat, -0.7, 0.45, 0.3);
            addPart(legGeo, env.structMat, 0.7, 0.45, 0.3);

            const crtMat = env.baseHousingMat;
            addPart(env._boxGeo(0.6, 0.5, 0.6), crtMat, 0, 1.15, -0.05);

            const screenMat = ctx.getLightMaterial(0x33ff33, 0x11aa11, false);
            addPart(env._boxGeo(0.5, 0.4, 0.02), screenMat, 0, 1.15, 0.26);

            env.fixtureData.push({
                chunkHash: hash,
                position: new THREE.Vector3(cx + cotX, 1.15, cz + cotZ),
                flickerOffset: random() * 100,
                material: screenMat,
                isFaulty: true,
                baseIntensity: 0.6,
                targetIntensity: 0.8,
                currentIntensity: 0.8
            });

            const activeMat = ctx.getLightMaterial(0xe8f4f8, 0xb0d8e8, false);
            const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
            panel.position.set(cx, 2.75, cz);
            chunkGroup.add(panel);
            env.walls.push(panel);
            env.fixtureData.push({
                chunkHash: hash,
                position: new THREE.Vector3(cx, 2.5, cz),
                flickerOffset: 0,
                material: activeMat,
                isFaulty: false,
                baseIntensity: 0.9,
                targetIntensity: 0.9,
                currentIntensity: 0.9
            });
        }
    };
};
