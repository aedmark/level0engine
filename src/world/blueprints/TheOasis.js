
export const TheOasisProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildTable, chunkGroup, hash, stagingMeshes} = ctx;
    return {
        name: "THE OASIS",
        prob: 0.0215, build: (x, z) => {
            if (ctx.claimOasis && ctx.claimOasis(x, z)) {
                const cx = x * env.cellSize;
                const cz = z * env.cellSize;
                const half = env.cellSize / 2;
                let floor;
                if (env.checkpointFloorMat) {
                    const floorGeo = new THREE.PlaneGeometry(env.cellSize, env.cellSize);
                    const uv = floorGeo.attributes.uv;
                    for (let i = 0; i < uv.count; i++) {
                        uv.setXY(i, uv.getX(i) / 14, uv.getY(i) / 14);
                    }
                    uv.needsUpdate = true;
                    floor = new THREE.Mesh(floorGeo, env.checkpointFloorMat);
                } else {
                    floor = new THREE.Mesh(env._planeGeo(env.cellSize, env.cellSize), env.tileMat);
                }
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(cx, 0.01, cz);
                addGeometry(floor);
                const oasisWallMat = env.checkpointWallMat || env.woodMat;
                const wallThick = 0.3;
                const wBack = buildWall(env.cellSize, wallThick, oasisWallMat);
                wBack.position.set(cx, 1.5, cz - half + wallThick / 2);
                wBack.userData.isEntityBlocker = true;
                addGeometry(wBack);
                const wLeft = buildWall(wallThick, env.cellSize, oasisWallMat);
                wLeft.position.set(cx - half + wallThick / 2, 1.5, cz);
                wLeft.userData.isEntityBlocker = true;
                addGeometry(wLeft);
                const wRight = buildWall(wallThick, env.cellSize, oasisWallMat);
                wRight.position.set(cx + half - wallThick / 2, 1.5, cz);
                wRight.userData.isEntityBlocker = true;
                addGeometry(wRight);
                const table = buildTable(cx, 0, cz);
                table.userData.chunkHash = hash;
                table.updateMatrixWorld(true);
                const tBox = new THREE.Box3().setFromObject(table);
                tBox.chunkHash = hash;
                tBox.isEntityBlocker = true;
                env.spatialGrid.insert(tBox);
                table.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.chunkHash = hash;
                        child.updateMatrixWorld(true);
                        stagingMeshes.push(child);
                    }
                });

                const activeMat = ctx.getLightMaterial(0xffeedd, 0xffaa55, false);
                const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
                panel.position.set(cx, 2.98, cz);
                chunkGroup.add(panel);
                env.walls.push(panel);
                env.fixtureData.push({
                    chunkHash: hash,
                    position: new THREE.Vector3(cx, 2.8, cz),
                    flickerOffset: 0,
                    material: activeMat,
                    isFaulty: false,
                    baseIntensity: 0.8,
                    targetIntensity: 0.8,
                    currentIntensity: 0.8,
                    isFake: false
                });
            } else {
                return false;
            }
        }
    };
};
