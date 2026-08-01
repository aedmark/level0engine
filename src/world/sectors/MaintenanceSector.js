import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

/**
 * A procedural sector generator characterized by tight crawlspaces, scattered tools, and hazard trims.
 *
 * This sector heavily utilizes the `addFurniture` context helper. Furniture
 * like the toolbox carts and pipe stacks are added to a centralized furniture array rather
 * than directly to the `chunkGroup`, allowing the `Environment` class to defer their rendering
 * or apply special LOD (Level of Detail) culling to small props to save performance.
 */
export const MaintenanceSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        addFurniture,
        chunkGroup,
        hash
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
                        if (lx === 7 && (lz === -1 || lz === env.chunkSize)) return false;
                        if (lz === 7 && (lx === -1 || lx === env.chunkSize)) return false;
                        return true;
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
                env._buildPipeCornerDressing(chunkGroup, addGeometry, random, x, z, openE, openS, openN, openW, offset, 2.8, 2.925, 2.8, () => {
                    if (random() > 0.85) {
                        const valveGroup = new THREE.Group();
                        const stemGeo = env._cacheGeo('maintValveStem', () => new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8));
                        const stem = new THREE.Mesh(stemGeo, env.rustMat);
                        stem.position.y = 0.1;
                        const wheelGeo = env._cacheGeo('maintValveWheel', () => new THREE.TorusGeometry(0.22, 0.04, 12, 24));
                        const wheel = new THREE.Mesh(wheelGeo, env.valveMat || env.rustMat);
                        wheel.position.y = 0.2;
                        wheel.rotation.x = Math.PI / 2;
                        valveGroup.add(stem, wheel);
                        valveGroup.position.set(x * env.cellSize + offset, 2.8, z * env.cellSize + offset);
                        const validDirs = ['down'];
                        if (!openE) validDirs.push('east');
                        if (!openS) validDirs.push('south');
                        const dir = validDirs[Math.floor(random() * validDirs.length)];
                        if (dir === 'down') {
                            valveGroup.rotation.x = Math.PI;
                        } else if (dir === 'east') {
                            valveGroup.rotation.z = -Math.PI * 0.75;
                        } else if (dir === 'south') {
                            valveGroup.rotation.x = Math.PI * 0.75;
                        }
                        valveGroup.translateY(0.1);
                        valveGroup.userData = {type: 'valve', active: false, wheel: wheel, chunkHash: hash};
                        if (env.interactables) env.interactables.push(valveGroup);
                        chunkGroup.add(valveGroup);
                    }
                    if (env.leakStainGeo && random() > 0.5) {
                        const stain = new THREE.Mesh(env.leakStainGeo, env.leakStainMat);
                        stain.position.set(x * env.cellSize + offset, 0.025, z * env.cellSize + offset);
                        stain.rotation.y = random() * Math.PI * 2;
                        const sc = 0.7 + random() * 0.6;
                        stain.scale.set(sc, sc, sc);
                        addGeometry(stain);
                        if (random() > 0.3) {
                            const coneGroup = new THREE.Group();
                            const coneGeo = env._cacheGeo('maintCautionConeBody', () => {
                                const g = new THREE.CylinderGeometry(0.05, 0.25, 0.85, 16);
                                g.translate(0, 0.425, 0);
                                return g;
                            });
                            const baseGeo = env._cacheGeo('maintCautionConeBase', () => {
                                const g = new THREE.BoxGeometry(0.55, 0.05, 0.55);
                                g.translate(0, 0.025, 0);
                                return g;
                            });
                            const coneMat = env.cautionConeMat || env.hazardMat;
                            const coneBaseMat = env.cautionConeBaseMat || coneMat;
                            const coneBody = new THREE.Mesh(coneGeo, coneMat);
                            const coneBase = new THREE.Mesh(baseGeo, coneBaseMat);
                            coneGroup.add(coneBody, coneBase);
                            const jx = (random() * 1.0) - 0.1;
                            const jz = (random() * 1.0) - 0.1;
                            coneGroup.position.set(x * env.cellSize + offset + jx, 0.0, z * env.cellSize + offset + jz);
                            coneGroup.rotation.order = 'YXZ';
                            coneGroup.rotation.y = random() * Math.PI * 2;
                            const isTipped = random() > 0.8;
                            if (isTipped) {
                                coneGroup.rotation.x = Math.PI / 2 + 0.258;
                                coneGroup.position.y = 0.266;
                            }
                            coneGroup.userData = {
                                type: 'cone',
                                tipped: isTipped,
                                fallProgress: isTipped ? 1.0 : 0.0,
                                active: true
                            };
                            if (env.animators) env.animators.push(coneGroup);
                            chunkGroup.add(coneGroup);
                        }
                    }
                });
                const wallSides = [];
                if (wN) wallSides.push([0, -1]);
                if (wS) wallSides.push([0, 1]);
                if (wE) wallSides.push([1, 0]);
                if (wW) wallSides.push([-1, 0]);
                if (wallSides.length > 0) {
                    wallSides.forEach(([csx, csz]) => {
                        if (random() > 0.85) {
                            const isBreaker = random() > 0.5;
                            const perp = csx !== 0 ? [0, 1] : [1, 0];
                            const clx = x * env.cellSize + csx * ((env.cellSize / 2) - 0.1);
                            const clz = z * env.cellSize + csz * ((env.cellSize / 2) - 0.1);
                            const facing = Math.atan2(-csx, -csz);
                            if (isBreaker) {
                                const boxGroup = new THREE.Group();
                                const boxGeo = env._cacheGeo('maintBreakerBox', () => new THREE.BoxGeometry(0.6, 0.8, 0.2));
                                const boxMesh = new THREE.Mesh(boxGeo, env.pittedMetalMat);
                                const handleGeo = env._cacheGeo('maintBreakerHandle', () => new THREE.BoxGeometry(0.05, 0.2, 0.05));
                                const handle = new THREE.Mesh(handleGeo, env.metalMat);
                                handle.position.set(0.15, 0, 0.0);
                                const breakerDoor = new THREE.Mesh(env.breakerDoorGeo, env.pittedMetalMat);
                                breakerDoor.position.set(-0.3, 0, 0.102);
                                const doorHandle = new THREE.Mesh(env.breakerHandleGeo, env.breakerHandleMat);
                                doorHandle.position.set(0.5, 0, 0.05);
                                breakerDoor.add(doorHandle);
                                boxGroup.add(boxMesh, handle, breakerDoor);
                                boxGroup.position.set(clx, 1.4, clz);
                                boxGroup.rotation.y = facing;
                                boxGroup.userData = {
                                    type: 'breaker',
                                    active: true,
                                    chunkHash: hash,
                                    handle: handle,
                                    door: breakerDoor
                                };
                                if (env.interactables) env.interactables.push(boxGroup);
                                chunkGroup.add(boxGroup);
                            } else {
                                const ventGroup = new THREE.Group();
                                const frameGroup = new THREE.Group();
                                const frameHGeo = env._cacheGeo('maintVentFrameH', () => new THREE.BoxGeometry(1.2, 0.1, 0.1));
                                const frameVGeo = env._cacheGeo('maintVentFrameV', () => new THREE.BoxGeometry(0.1, 1.0, 0.1));
                                const frameTop = new THREE.Mesh(frameHGeo, env.rustMat);
                                frameTop.position.y = 0.55;
                                const frameBot = new THREE.Mesh(frameHGeo, env.rustMat);
                                frameBot.position.y = -0.55;
                                const frameLeft = new THREE.Mesh(frameVGeo, env.rustMat);
                                frameLeft.position.x = -0.55;
                                const frameRight = new THREE.Mesh(frameVGeo, env.rustMat);
                                frameRight.position.x = 0.55;
                                frameGroup.add(frameTop, frameBot, frameLeft, frameRight);
                                frameGroup.position.z = 0.05;
                                const ductGeo = env._cacheGeo('maintVentDuct', () => {
                                    const g = new THREE.CircleGeometry(0.55, 16);
                                    return g;
                                });
                                const duct = new THREE.Mesh(ductGeo, env.voidShroudMat || env.baseHousingMat);
                                duct.position.z = 0.01;
                                const fanGroup = new THREE.Group();
                                const bladeGeo = env._cacheGeo('maintVentBlade', () => new THREE.BoxGeometry(1.0, 0.15, 0.02));
                                const blade1 = new THREE.Mesh(bladeGeo, env.metalMat);
                                const blade2 = new THREE.Mesh(bladeGeo, env.metalMat);
                                blade2.rotation.z = Math.PI / 2;
                                const hubGeo = env._cacheGeo('maintVentHub', () => {
                                    const g = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12);
                                    g.rotateX(Math.PI / 2);
                                    return g;
                                });
                                const hub = new THREE.Mesh(hubGeo, env.rustMat);
                                fanGroup.add(blade1, blade2, hub);
                                fanGroup.position.z = 0.03;
                                const grilleGroup = new THREE.Group();
                                const barGeoH = env._cacheGeo('maintVentBarH', () => new THREE.BoxGeometry(1.1, 0.02, 0.02));
                                const barGeoV = env._cacheGeo('maintVentBarV', () => new THREE.BoxGeometry(0.02, 1.1, 0.02));
                                for (let j = -0.4; j <= 0.4; j += 0.2) {
                                    const barH = new THREE.Mesh(barGeoH, env.rustMat);
                                    barH.position.y = j;
                                    const barV = new THREE.Mesh(barGeoV, env.rustMat);
                                    barV.position.x = j;
                                    grilleGroup.add(barH, barV);
                                }
                                grilleGroup.position.z = 0.11;
                                ventGroup.add(frameGroup, duct, fanGroup, grilleGroup);
                                ventGroup.position.set(clx, 1.8, clz);
                                ventGroup.rotation.y = facing;
                                ventGroup.userData = {
                                    type: 'ventFan',
                                    active: true,
                                    fanMesh: fanGroup,
                                    spinSpeed: 2.0 + random() * 4.0
                                };
                                chunkGroup.add(ventGroup);
                                if (env.animators) env.animators.push(ventGroup);
                            }
                        }
                    });
                }
                if (wallSides.length > 0 && wallSides.length < 4 && random() < 0.75) {
                    const [csx, csz] = wallSides[Math.floor(random() * wallSides.length)];
                    const perp = csx !== 0 ? [0, 1] : [1, 0];
                    const jitter = (random() - 0.5) * 1.6;
                    const clx = x * env.cellSize + csx * 1.35 + perp[0] * jitter;
                    const clz = z * env.cellSize + csz * 1.35 + perp[1] * jitter;
                    const facing = Math.atan2(-csx, -csz);
                    const roll = random();
                    if (roll < 0.42) {
                        const stackGroup = new THREE.Group();
                        const pallet = env._buildPallet();
                        stackGroup.add(pallet);
                        const stackGeo = env._cacheGeo('maintPipeStack', () => {
                            const g = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 12);
                            g.rotateZ(Math.PI / 2);
                            return g;
                        });
                        const pr = 0.12;
                        const rowH = pr * 1.732;
                        const rows = [
                            [-2 * pr, 0, 2 * pr],
                            [-pr, pr],
                            [0]
                        ];
                        const pipeBaseY = 0.17;
                        rows.forEach((row, ri) => {
                            row.forEach((soz) => {
                                const seg = new THREE.Mesh(stackGeo, env.rustMat);
                                seg.position.set((random() - 0.5) * 0.1, pipeBaseY + pr + ri * rowH, soz);
                                seg.rotation.x = (random() - 0.5) * 0.05;
                                stackGroup.add(seg);
                            });
                        });
                        const bandGeo = env._cacheGeo('maintPipeBand', () => {
                            const g = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 3);
                            g.rotateZ(Math.PI / 2);
                            g.rotateX(-Math.PI / 2);
                            return g;
                        });
                        if (!env.blackMat) env.blackMat = new THREE.MeshStandardMaterial({
                            color: 0x111111,
                            roughness: 0.8
                        });
                        [-0.6, 0.6].forEach(bx => {
                            const band = new THREE.Mesh(bandGeo, env.blackMat);
                            band.position.set(bx, pipeBaseY + pr + rowH / 3, 0);
                            band.scale.set(1, 1.25, 1.15);
                            stackGroup.add(band);
                        });
                        stackGroup.position.set(
                            (x * env.cellSize) + csx * 0.7 + perp[0] * (random() - 0.5) * 0.4,
                            0,
                            (z * env.cellSize) + csz * 0.7 + perp[1] * (random() - 0.5) * 0.4
                        );
                        stackGroup.rotation.y = facing + (random() - 0.5) * 0.15;
                        stackGroup.scale.set(1.1, 1.1, 1.1);
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
                        spool.scale.set(1.5, 1.5, 1.5);
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
                            env.toolboxMat = new THREE.MeshStandardMaterial({
                                color: 0xa33322,
                                roughness: 0.6,
                                metalness: 0.2
                            });
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
                        cart.scale.set(1.5, 1.5, 1.5);
                        addFurniture(cart);
                    }
                }
                if (random() > 0.7) {
                    const fixtureMat = ctx.getLightMaterial(0xff5500, 0xee4400, false);
                    const beaconGeo = env._cacheGeo('maintBeacon', () => new THREE.CylinderGeometry(0.15, 0.1, 0.2, 12));
                    const mesh = new THREE.Mesh(beaconGeo, fixtureMat);
                    mesh.position.set(x * env.cellSize, 2.9, z * env.cellSize);
                    const lightY = 2.8;
                    chunkGroup.add(mesh);
                    env.walls.push(mesh);
                    env.fixtureData.push({
                        chunkHash: hash,
                        position: new THREE.Vector3(x * env.cellSize, lightY, z * env.cellSize),
                        flickerOffset: random() * 500,
                        material: fixtureMat,
                        isFaulty: false,
                        isTowBeacon: true,
                        isSpot: true,
                        spotAngle: Math.PI / 3,
                        spotPenumbra: 0.8,
                        sweepSpeed: 4.0 + random() * 2.0,
                        sweepPhase: random() * Math.PI * 2,
                        baseIntensity: 1.0,
                        targetIntensity: 1.0,
                        currentIntensity: 1.0
                    });
                }
            }
        }
    };
};