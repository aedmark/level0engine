import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const TheOutpostProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, chunkGroup, hash} = ctx;
    return {
        name: "THE OUTPOST",
        prob: 0.0016, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (ctx.markOccupied) ctx.markOccupied(x, z);
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
                    const p1 = buildWall(isZ ? pW : thick, isZ ? thick : pW, env.sharedWallMat);
                    p1.position.set(cx + (isZ ? -pOff : sign * off), 1.5, cz + (isZ ? sign * off : -pOff));
                    addGeometry(p1);
                    const p2 = buildWall(isZ ? pW : thick, isZ ? thick : pW, env.sharedWallMat);
                    p2.position.set(cx + (isZ ? pOff : sign * off), 1.5, cz + (isZ ? sign * off : pOff));
                    addGeometry(p2);
                    const head = buildWall(isZ ? gap : thick, isZ ? thick : gap, env.sharedWallMat, 0.4, 2.6);
                    head.position.set(cx + (isZ ? 0 : sign * off), 2.8, cz + (isZ ? sign * off : 0));
                    addGeometry(head);
                } else {
                    const w = buildWall(isZ ? env.cellSize : thick, isZ ? thick : env.cellSize, env.sharedWallMat);
                    w.position.set(cx + (isZ ? 0 : sign * off), 1.5, cz + (isZ ? sign * off : 0));
                    addGeometry(w);
                }
            }
            const blockBox = new AABB(
                new Vec3(cx - env.cellSize / 2, 0, cz - env.cellSize / 2),
                new Vec3(cx + env.cellSize / 2, 3.0, cz + env.cellSize / 2)
            );
            blockBox.isEntityBlocker = true;
            blockBox.isInvisibleBlocker = true;
            blockBox.chunkHash = hash;
            env.spatialGrid.insert(blockBox);
            const floor = new THREE.Mesh(env._planeGeo(env.cellSize - thick, env.cellSize - thick), env.tileMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(cx, 0.02, cz);
            addGeometry(floor);
            const roof = buildWall(3.9, 3.9, env.structMat, 0.2);
            roof.position.set(cx, 2.9, cz);
            addGeometry(roof);
            const cotX = (dir === 1) ? -0.8 : (dir === 3 ? 0.8 : 0);
            const cotZ = (dir === 0) ? 0.8 : (dir === 2 ? -0.8 : 0);
            const cotRot = (dir === 0 || dir === 2) ? Math.PI / 2 : 0;
            const addCotPart = (geo, mat, dx, dy, dz) => {
                const mesh = new THREE.Mesh(geo, mat);
                const s = Math.sin(cotRot);
                const c = Math.cos(cotRot);
                mesh.position.set(cx + cotX + (dx * c + dz * s), dy, cz + cotZ + (-dx * s + dz * c));
                mesh.rotation.y = cotRot;
                addGeometry(mesh);
            };

            const cotMat = env.fabricMat.clone();
            cotMat.color.setHex(0x4b5320);

            addCotPart(env._boxGeo(0.8, 0.02, 1.8), cotMat, 0, 0.4, 0);
            const legGeo = env._boxGeo(0.06, 0.4, 0.06);
            addCotPart(legGeo, env.woodMat, -0.37, 0.2, -0.87);
            addCotPart(legGeo, env.woodMat, 0.37, 0.2, -0.87);
            addCotPart(legGeo, env.woodMat, -0.37, 0.2, 0.87);
            addCotPart(legGeo, env.woodMat, 0.37, 0.2, 0.87);
            const sideRailGeo = env._boxGeo(0.06, 0.06, 1.8);
            addCotPart(sideRailGeo, env.woodMat, -0.37, 0.37, 0);
            addCotPart(sideRailGeo, env.woodMat, 0.37, 0.37, 0);
            const endRailGeo = env._boxGeo(0.8, 0.06, 0.06);
            addCotPart(endRailGeo, env.woodMat, 0, 0.37, -0.87);
            addCotPart(endRailGeo, env.woodMat, 0, 0.37, 0.87);

            const bagMat = env.fabricMat.clone();
            bagMat.color.setHex(0x3a4b60);
            addCotPart(env._boxGeo(0.7, 0.12, 0.35), bagMat, 0, 0.47, -0.7);

            const almondGroup = new THREE.Group();
            const almondMesh = env.almondPrefab.clone();
            almondGroup.add(almondMesh);
            const aGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
            aGlow.scale.set(0.15, 0.15, 0.15);
            aGlow.position.y = 0.01;
            almondGroup.add(aGlow);
            const as = Math.sin(cotRot), ac = Math.cos(cotRot);
            const adx = 0.2, adz = 0.2;
            almondGroup.position.set(cx + cotX + (adx * ac + adz * as), 0.41, cz + cotZ + (-adx * as + adz * ac));
            almondGroup.rotation.y = random() * Math.PI;
            almondGroup.userData = {type: 'almond', chunkHash: hash, active: true};
            chunkGroup.add(almondGroup);
            if (!env.interactables) env.interactables = [];
            env.interactables.push(almondGroup);
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
