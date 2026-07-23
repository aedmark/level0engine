// IncineratorSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const IncineratorSector = (env, ctx) => {
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
                id: "INCINERATOR",
                foundationMat: env.diamondPlateMat || env.rustMat,
                ceilingMat: env.incinCeilingMat || null,
                build: (x, z, localX, localZ, maze) => {
                    const edge = env.chunkSize - 1;
                    const isDoorwayNS = localX === 7 && (localZ === 0 || localZ === edge);
                    const isDoorwayEW = localZ === 7 && (localX === 0 || localX === edge);
                    const isDoorway = isDoorwayNS || isDoorwayEW;
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.sharedWallMat, "INCINERATOR")) {
                        if (!isDoorway) {
                            const lEdge = env.chunkSize - 1;
                            const liners = [];
                            if (localX === 0) liners.push([1, 0]);
                            if (localX === lEdge) liners.push([-1, 0]);
                            if (localZ === 0) liners.push([0, 1]);
                            if (localZ === lEdge) liners.push([0, -1]);
                            const isCorner = (localX === 0 || localX === lEdge) && (localZ === 0 || localZ === lEdge);
                            if (isCorner) {
                                const sxp = localX === 0 ? 1 : -1;
                                const szp = localZ === 0 ? 1 : -1;
                                const post = buildWall(0.4, 0.4, env.rustMat, 3.0);
                                post.position.set(x * env.cellSize + sxp * 2.2, 1.5, z * env.cellSize + szp * 2.2);
                                addGeometry(post);
                            } else {
                                for (let li = 0; li < liners.length; li++) {
                                    const ldx = liners[li][0], ldz = liners[li][1];
                                    const liner = buildWall(ldx !== 0 ? 0.4 : env.cellSize, ldz !== 0 ? 0.4 : env.cellSize, env.rustMat, 3.0);
                                    liner.position.set(x * env.cellSize + ldx * 2.2, 1.5, z * env.cellSize + ldz * 2.2);
                                    addGeometry(liner);
                                }
                            }
                        } else {
                            const spansX = isDoorwayNS;
                            const dcx = x * env.cellSize;
                            const dcz = z * env.cellSize;
                            const outSign = (localZ === 0 || localX === 0) ? -1 : 1;
                            const lampMat = env.baseLightMat.clone();
                            lampMat.color.setHex(0xff3300);
                            lampMat.emissive.setHex(0xff1100);
                            const lamp = new THREE.Mesh(env._boxGeo(0.3, 0.12, 0.18), lampMat);
                            if (spansX) lamp.position.set(dcx, 2.5, dcz + outSign * 0.5);
                            else lamp.position.set(dcx + outSign * 0.5, 2.5, dcz);
                            const lampLight = new THREE.PointLight(0xff2200, 1.2, 6.0, 2.0);
                            lampLight.position.set(0, -0.2, 0);
                            lamp.add(lampLight);
                            lamp.userData.chunkHash = hash;
                            chunkGroup.add(lamp);
                            env.walls.push(lamp);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: lamp.position.clone(),
                                flickerOffset: random() * 500,
                                material: lampMat,
                                lightObj: lampLight,
                                isFaulty: true,
                                baseIntensity: 1.0,
                                targetIntensity: 1.0,
                                currentIntensity: 1.0
                            });
                        }
                        return;
                    }
                    const ductMat = env.ventMat || env.metalMat || env.rustMat;
                    if (!env.emberGrilleMat) {
                        env.emberGrilleMat = new THREE.MeshStandardMaterial({
                            color: 0x2a1005, emissive: 0xff5500, emissiveIntensity: 1.2, roughness: 0.9
                        });
                        env.sharedAssets.add(env.emberGrilleMat.uuid);
                    }
                    if (!env.valveGeo) {
                        env.valveGeo = new THREE.TorusGeometry(0.17, 0.03, 6, 12);
                        env.geoCache.set(env.valveGeo.uuid, true);
                    }
                    const cxw = x * env.cellSize, czw = z * env.cellSize;
                    const isW = (lx, lz) => {
                        if (lx < 0 || lx >= env.chunkSize || lz < 0 || lz >= env.chunkSize) {
                            return !((lx === 7 && (lz === -1 || lz === env.chunkSize)) || (lz === 7 && (lx === -1 || lx === env.chunkSize)));
                        }
                        return maze ? maze[lx][lz] : false;
                    };
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const block = buildWall(env.cellSize, env.cellSize, env.rustMat, 3.0);
                        block.position.set(cxw, 1.5, czw);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        const buildSconce = (nx, nz) => {
                            const fx = cxw + nx * 2.0;
                            const fz = czw + nz * 2.0;
                            const activeMat = ctx.getLightMaterial(0xff5522, 0xff2200, false);
                            const housing = buildWall(nx !== 0 ? 0.16 : 0.8, nz !== 0 ? 0.16 : 0.8, env.rustMat, 0.5);
                            housing.position.set(fx + nx * 0.08, 1.5, fz + nz * 0.08);
                            addGeometry(housing);
                            const plate = buildWall(nx !== 0 ? 0.1 : 0.55, nz !== 0 ? 0.1 : 0.55, activeMat, 0.32);
                            plate.position.set(fx + nx * 0.21, 1.5, fz + nz * 0.21);
                            plate.userData.chunkHash = hash;
                            const pLight = new THREE.PointLight(0xff2200, 1.5, 8.0, 2.0);
                            pLight.position.set(nx * 0.4, 0, nz * 0.4);
                            plate.add(pLight);
                            chunkGroup.add(plate);
                            plate.updateMatrixWorld(true);
                            env.walls.push(plate);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(fx + nx * 0.4, 1.5, fz + nz * 0.4),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                lightObj: pLight,
                                isFaulty: random() > 0.8,
                                baseIntensity: 1.2,
                                targetIntensity: 1.2,
                                currentIntensity: 1.2
                            });
                        };
                        if (!isW(localX - 1, localZ) && random() > 0.55) buildSconce(-1, 0);
                        if (!isW(localX + 1, localZ) && random() > 0.55) buildSconce(1, 0);
                        if (!isW(localX, localZ - 1) && random() > 0.55) buildSconce(0, -1);
                        if (!isW(localX, localZ + 1) && random() > 0.55) buildSconce(0, 1);
                        return;
                    }
                    const wN = isW(localX, localZ - 1);
                    const wS = isW(localX, localZ + 1);
                    const wE = isW(localX + 1, localZ);
                    const wW = isW(localX - 1, localZ);
                    const throughNS = !wN || !wS;
                    const throughEW = !wE || !wW;
                    if (throughNS) {
                        const spine = buildWall(1.1, env.cellSize, ductMat, 0.4);
                        spine.position.set(cxw, 2.78, czw);
                        addGeometry(spine);
                        if ((localX + localZ) % 2 === 0) {
                            const grille = buildWall(0.5, 0.5, env.emberGrilleMat, 0.06);
                            grille.position.set(cxw, 2.57, czw);
                            addGeometry(grille);
                        }
                    }
                    if (throughEW) {
                        const spine = buildWall(env.cellSize, 1.1, ductMat, 0.4);
                        spine.position.set(cxw, 2.78, czw);
                        addGeometry(spine);
                        if ((localX + localZ) % 2 === 1) {
                            const grille = buildWall(0.5, 0.5, env.emberGrilleMat, 0.06);
                            grille.position.set(cxw, 2.57, czw);
                            addGeometry(grille);
                        }
                    }
                    if (throughNS && throughEW) {
                        for (let as = -1; as <= 1; as += 2) {
                            const riser = buildWall(0.7, 0.7, ductMat, 1.15);
                            riser.position.set(cxw + as * 1.65, 2.0, czw);
                            addGeometry(riser);
                        }
                        const bridge = buildWall(env.cellSize, 0.7, ductMat, 0.4);
                        bridge.position.set(cxw, 2.75, czw);
                        addGeometry(bridge);
                    }
                    if (!throughNS && !throughEW && random() > 0.4) {
                        const count = 1 + Math.floor(random() * 3);
                        for (let pi = 0; pi < count; pi++) {
                            const pox = (random() - 0.5) * 1.6, poz = (random() - 0.5) * 1.6;
                            const ps = 0.8 + random() * 1.6;
                            const pipe = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                            pipe.position.set(cxw + pox, 1.5, czw + poz);
                            pipe.scale.set(ps, 1.0, ps);
                            addGeometry(pipe);
                            if (random() > 0.6) {
                                const valve = new THREE.Mesh(env.valveGeo, env.metalMat);
                                valve.rotation.x = Math.PI / 2;
                                valve.position.set(cxw + pox, 1.0 + random() * 1.0, czw + poz);
                                addGeometry(valve);
                            }
                        }
                    }
                    if (localZ % 2 === 1) {
                        const hPipe = new THREE.Mesh(env.pipeGeo, env.rustMat);
                        hPipe.position.set(cxw, 2.72, czw + 1.2);
                        addGeometry(hPipe);
                    }
                    if (localX % 2 === 1) {
                        const hPipe2 = new THREE.Mesh(env.pipeGeo, env.rustMat);
                        hPipe2.rotation.y = Math.PI / 2;
                        hPipe2.position.set(cxw + 1.2, 2.85, czw);
                        addGeometry(hPipe2);
                    }
                    if (localZ % 2 === 1 && localX % 2 === 1) {
                        const joint = new THREE.Mesh(env.pipeJointGeo, env.metalMat);
                        joint.position.set(cxw + 1.2, 2.785, czw + 1.2);
                        addGeometry(joint);
                    }
                    if (localZ % 2 === 1 && localX % 2 === 0) {
                        const mnt = new THREE.Mesh(env.pipeMountGeo, env.rustMat);
                        mnt.position.set(cxw, 2.88, czw + 1.2);
                        addGeometry(mnt);
                    }
                    if (localX % 2 === 1 && localZ % 2 === 0) {
                        const mnt2 = new THREE.Mesh(env.pipeMountGeo, env.rustMat);
                        mnt2.position.set(cxw + 1.2, 2.94, czw);
                        addGeometry(mnt2);
                    }
                }
            };
};
