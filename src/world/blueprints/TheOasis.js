/**
 * [ROLE] Generates a guaranteed safe zone (checkpoint) with restorative items (almond water, batteries).
 * [WHY] Provides a pacing break, safe harbor, and reward point for the player during exploration.
 * [STATE] Integrates tightly with global state; checks `claimOasis` to ensure only one oasis is built. Pushes interactables to tracking lists.
 * [DEPENDS] Requires specific prefabs (almond water, batteries), lighting updates, and entity grid insertion.
 */
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const TheOasisProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildTable, chunkGroup, hash, stagingMeshes} = ctx;
    return {
        name: "THE OASIS",
        prob: 0.00, build: (x, z) => {
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
                // Walls used to be 0.5 thick, flush against the cell boundary, which only
                // left ~0.9 units of clearance between the table (1.2 footprint, so 0.6 to
                // each edge) and the wall's inner face. The player's collision radius is
                // 0.4 (0.8 diameter), so that clearance had ~0.09 units of margin once the
                // wall's own +0.02 padding is accounted for — technically non-zero, but far
                // too tight to reliably walk through, which is what read as an invisible
                // wall on whichever side the player happened to try. Thinner walls (0.3)
                // free up a real, comfortable margin on all three sides.
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
                const almondGroup = new THREE.Group();
                const almondMesh = env.almondPrefab.clone();
                almondGroup.add(almondMesh);
                const aGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                aGlow.scale.set(0.15, 0.15, 0.15);
                aGlow.position.y = 0.01;
                almondGroup.add(aGlow);
                almondGroup.position.set(cx - 0.3, 0.93, cz);
                almondGroup.rotation.y = (random() - 0.5) * 0.8;
                almondGroup.userData = {type: 'almond', chunkHash: hash, active: true};
                chunkGroup.add(almondGroup);
                if (!env.interactables) env.interactables = [];
                env.interactables.push(almondGroup);
                const batGroup = new THREE.Group();
                const batMesh = env.batteryPrefab.clone();
                batGroup.add(batMesh);
                const bGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                bGlow.scale.set(0.20, 0.20, 0.20);
                bGlow.position.y = 0.01;
                batGroup.add(bGlow);
                batGroup.position.set(cx + 0.3, 0.93, cz);
                batGroup.rotation.y = (random() - 0.5) * 0.8;
                batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                chunkGroup.add(batGroup);
                env.interactables.push(batGroup);
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
                // Was built directly off env.sharedWallGeo, bypassing buildWall — that
                // skipped the baseboardFootprint tagging buildWall does, so this wall
                // (a filler wall standing in for an oasis already claimed elsewhere)
                // silently never got a baseboard. Routing through buildWall matches the
                // standard filler wall path (ChunkManager.js) and picks it back up.
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                addGeometry(wall);
            }
        }
    };
};
