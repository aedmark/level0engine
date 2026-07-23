// MaintenanceSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const MaintenanceSector = (env, ctx) => {
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
                id: "MAINTENANCE",
                foundationMat: env.serverFloorMat,
                ceilingMat: env.structMat,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.structMat, "MAINTENANCE")) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const block = buildWall(env.cellSize, env.cellSize, env.structMat);
                        block.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                    } else {
                        const isW = (lx, lz) => {
                            if (lx < 0 || lx >= env.chunkSize || lz < 0 || lz >= env.chunkSize) {
                                return !((lx === 7 && (lz === -1 || lz === env.chunkSize)) || (lz === 7 && (lx === -1 || lx === env.chunkSize)));
                            }
                            return maze[lx][lz];
                        };
                        const wN = isW(localX, localZ - 1);
                        const wS = isW(localX, localZ + 1);
                        const wE = isW(localX + 1, localZ);
                        const wW = isW(localX - 1, localZ);
                        const tOff = (env.cellSize / 2) - 0.2;
                        if (wN) {
                            const extW = !isW(localX - 1, localZ - 1);
                            const extE = !isW(localX + 1, localZ - 1);
                            const len = env.cellSize + (extW ? 0.4 : 0) + (extE ? 0.4 : 0);
                            const cx = (extE ? 0.2 : 0) - (extW ? 0.2 : 0);
                            const trim = new THREE.Mesh(env._boxGeo(len, 0.1, 0.4), env.hazardMat);
                            trim.position.set(x * env.cellSize + cx, 0.050, z * env.cellSize - tOff);
                            addGeometry(trim);
                        }
                        if (wS) {
                            const extW = !isW(localX - 1, localZ + 1);
                            const extE = !isW(localX + 1, localZ + 1);
                            const len = env.cellSize + (extW ? 0.4 : 0) + (extE ? 0.4 : 0);
                            const cx = (extE ? 0.2 : 0) - (extW ? 0.2 : 0);
                            const trim = new THREE.Mesh(env._boxGeo(len, 0.1, 0.4), env.hazardMat);
                            trim.position.set(x * env.cellSize + cx, 0.050, z * env.cellSize + tOff);
                            addGeometry(trim);
                        }
                        if (wE) {
                            const extN = !isW(localX + 1, localZ - 1);
                            const extS = !isW(localX + 1, localZ + 1);
                            const len = env.cellSize + (extN ? 0.4 : 0) + (extS ? 0.4 : 0);
                            const cz = (extS ? 0.2 : 0) - (extN ? 0.2 : 0);
                            const trim = new THREE.Mesh(env._boxGeo(0.4, 0.1, len), env.hazardMat);
                            trim.position.set(x * env.cellSize + tOff, 0.051, z * env.cellSize + cz);
                            addGeometry(trim);
                        }
                        if (wW) {
                            const extN = !isW(localX - 1, localZ - 1);
                            const extS = !isW(localX - 1, localZ + 1);
                            const len = env.cellSize + (extN ? 0.4 : 0) + (extS ? 0.4 : 0);
                            const cz = (extS ? 0.2 : 0) - (extN ? 0.2 : 0);
                            const trim = new THREE.Mesh(env._boxGeo(0.4, 0.1, len), env.hazardMat);
                            trim.position.set(x * env.cellSize - tOff, 0.051, z * env.cellSize + cz);
                            addGeometry(trim);
                        }
                        const openE = !wE;
                        const openS = !wS;
                        const openN = !wN;
                        const openW = !wW;
                        const offset = -1.1;
                        let hasPipes = false;
                        if (openE) {
                            const pipeE = new THREE.Mesh(env.pipeGeo, env.rustMat);
                            pipeE.position.set(x * env.cellSize + (env.cellSize / 2) + offset, 2.8, z * env.cellSize + offset);
                            addGeometry(pipeE);
                            hasPipes = true;
                        }
                        if (openS) {
                            const pipeS = new THREE.Mesh(env.pipeGeo, env.rustMat);
                            pipeS.rotation.y = Math.PI / 2;
                            pipeS.position.set(x * env.cellSize + offset, 2.8, z * env.cellSize + (env.cellSize / 2) + offset);
                            addGeometry(pipeS);
                            hasPipes = true;
                        }
                        if (hasPipes || openN || openW) {
                            const mount = new THREE.Mesh(env.pipeMountGeo, env.rustMat);
                            mount.position.set(x * env.cellSize + offset, 2.925, z * env.cellSize + offset);
                            addGeometry(mount);
                            if (random() > 0.1) {
                                const junction = new THREE.Mesh(env.pipeJunctionGeo, env.rustMat);
                                junction.position.set(x * env.cellSize + offset, 2.8, z * env.cellSize + offset);
                                addGeometry(junction);
                                if (env.leakStainGeo && random() > 0.5) {
                                    const stain = new THREE.Mesh(env.leakStainGeo, env.leakStainMat);
                                    stain.position.set(x * env.cellSize + offset, 0.025, z * env.cellSize + offset);
                                    stain.rotation.y = random() * Math.PI * 2;
                                    const sc = 0.7 + random() * 0.6;
                                    stain.scale.set(sc, sc, sc);
                                    addGeometry(stain);
                                }
                            }
                        }
                        const wallSides = [];
                        if (wN) wallSides.push([0, -1]);
                        if (wS) wallSides.push([0, 1]);
                        if (wE) wallSides.push([1, 0]);
                        if (wW) wallSides.push([-1, 0]);
                        if (wallSides.length > 0 && wallSides.length < 4 && random() < 0.75) {
                            const [csx, csz] = wallSides[Math.floor(random() * wallSides.length)];
                            const perp = csx !== 0 ? [0, 1] : [1, 0];
                            const jitter = (random() - 0.5) * 1.6;
                            const clx = x * env.cellSize + csx * 1.35 + perp[0] * jitter;
                            const clz = z * env.cellSize + csz * 1.35 + perp[1] * jitter;
                            const facing = Math.atan2(-csx, -csz);
                            const roll = random();
                            if (roll < 0.42) {
                                const pr = 0.1, plen = 2.4;
                                const stackGeo = env._cacheGeo('maintPipeStack', () => {
                                    const g = new THREE.CylinderGeometry(pr, pr, plen, 10);
                                    g.rotateZ(Math.PI / 2);
                                    return g;
                                });
                                const stackGroup = new THREE.Group();
                                const rowH = pr * Math.sqrt(3);
                                const rows = [
                                    [-2 * pr, 0, 2 * pr],
                                    [-pr, pr],
                                    [0]
                                ];
                                rows.forEach((row, ri) => {
                                    row.forEach((sox) => {
                                        const seg = new THREE.Mesh(stackGeo, env.rustMat);
                                        seg.position.set(sox, pr + ri * rowH, (random() - 0.5) * 0.1);
                                        seg.rotation.x = (random() - 0.5) * 0.12;
                                        stackGroup.add(seg);
                                    });
                                });
                                stackGroup.position.set(clx, 0, clz);
                                stackGroup.rotation.y = facing + (random() - 0.5) * 0.3;
                                addFurniture(stackGroup);
                            } else if (roll < 0.44) {
                                const discGeo = env._cacheGeo('maintSpoolDisc', () => new THREE.CylinderGeometry(0.65, 0.65, 0.07, 20));
                                const coreGeo = env._cacheGeo('maintSpoolCore', () => new THREE.CylinderGeometry(0.16, 0.18, 0.58, 12));
                                const spool = new THREE.Group();
                                const discA = new THREE.Mesh(discGeo, env.woodMat);
                                discA.position.y = 0.29;
                                const discB = new THREE.Mesh(discGeo, env.woodMat);
                                discB.position.y = -0.29;
                                const core = new THREE.Mesh(coreGeo, env.rustMat);
                                spool.add(discA, discB, core);
                                spool.rotation.z = Math.PI / 2;
                                spool.position.set(clx, 0.65, clz);
                                spool.rotation.y = random() * Math.PI * 2;
                                addFurniture(spool);
                                if (random() > 0.4) {
                                    const cableGeo = env._cacheGeo('maintTrailCable', () => {
                                        const g = new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6);
                                        g.rotateZ(Math.PI / 2);
                                        return g;
                                    });
                                    const cable = new THREE.Mesh(cableGeo, env.baseHousingMat);
                                    cable.position.set(clx + perp[0] * 1.05, 0.035, clz + perp[1] * 1.05);
                                    cable.rotation.y = facing + Math.PI / 2 + (random() - 0.5) * 0.4;
                                    addFurniture(cable);
                                }
                            } else {
                                if (!env.toolboxMat) {
                                    env.toolboxMat = new THREE.MeshStandardMaterial({color: 0xa33322, roughness: 0.6, metalness: 0.2});
                                    env.sharedAssets.add(env.toolboxMat.uuid);
                                }
                                const cart = new THREE.Group();
                                const shelfTopY = 0.9, shelfLowY = 0.48, casterR = 0.07;
                                const shelf = new THREE.Mesh(env._boxGeo(0.85, 0.05, 0.55), env.metalMat);
                                shelf.position.y = shelfTopY;
                                cart.add(shelf);
                                const lower = new THREE.Mesh(env._boxGeo(0.85, 0.05, 0.55), env.metalMat);
                                lower.position.y = shelfLowY;
                                cart.add(lower);
                                const casterGeo = env._cacheGeo('maintCasterWheel', () => new THREE.CylinderGeometry(casterR, casterR, 0.05, 10));
                                for (let lx2 = -1; lx2 <= 1; lx2 += 2) for (let lz2 = -1; lz2 <= 1; lz2 += 2) {
                                    const leg = new THREE.Mesh(env._boxGeo(0.05, shelfTopY - casterR * 2, 0.05), env.metalMat);
                                    leg.position.set(lx2 * 0.38, casterR + (shelfTopY - casterR * 2) / 2, lz2 * 0.24);
                                    cart.add(leg);
                                    const caster = new THREE.Mesh(casterGeo, env.baseHousingMat);
                                    caster.rotation.x = Math.PI / 2;
                                    caster.position.set(lx2 * 0.38, casterR, lz2 * 0.24);
                                    cart.add(caster);
                                }
                                const toolbox = new THREE.Mesh(env._boxGeo(0.5, 0.28, 0.35), env.toolboxMat);
                                toolbox.position.set(-0.1, shelfTopY + 0.16, 0);
                                cart.add(toolbox);
                                for (let w = 0; w < 2; w++) {
                                    const wrench = new THREE.Mesh(env._boxGeo(0.35, 0.035, 0.06), env.rustMat);
                                    wrench.position.set(0.22, shelfTopY + 0.03, -0.15 + w * 0.3);
                                    wrench.rotation.y = (random() - 0.5) * 0.6;
                                    cart.add(wrench);
                                }
                                cart.position.set(clx, 0, clz);
                                cart.rotation.y = facing + (random() - 0.5) * 0.5;
                                addFurniture(cart);
                            }
                        }
                        if (random() > 0.7) {
                            const activeMat = ctx.getLightMaterial(0xffaa00, 0xaa5500, false);
                            const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
                            panel.position.set(x * env.cellSize, 2.98, z * env.cellSize);
                            chunkGroup.add(panel);
                            env.walls.push(panel);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * env.cellSize, 2.8, z * env.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: true,
                                baseIntensity: 0.25,
                                targetIntensity: 0.25,
                                currentIntensity: 0.25
                            });
                        }
                    }
                }
            };
};
