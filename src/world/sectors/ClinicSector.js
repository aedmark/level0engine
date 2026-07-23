// ClinicSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const ClinicSector = (env, ctx) => {
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
                id: "CLINIC",
                foundationMat: env.clinicMat,
                ceilingMat: env.clinicMat,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.sharedWallMat, "CLINIC")) return;
                    const cx0 = x * env.cellSize, cz0 = z * env.cellSize;
                    const wallAt = (lx, lz) => (lx < 0 || lx > 15 || lz < 0 || lz > 15) ? true : (maze ? maze[lx][lz] === true : false);
                    const decal = (mesh) => {
                        mesh.userData.chunkHash = hash;
                        mesh.updateMatrixWorld(true);
                        stagingMeshes.push(mesh);
                    };
                    const hangCurtain = (alongZ, px, pz, width) => {
                        const track = new THREE.Mesh(env._boxGeo(alongZ ? 0.06 : width, 0.08, alongZ ? width : 0.06), env.metalMat);
                        track.position.set(px, 2.52, pz);
                        decal(track);
                        const curtain = new THREE.Mesh(env._boxGeo(alongZ ? 0.05 : width - 0.2, 2.2, alongZ ? width - 0.2 : 0.05), env.fabricMat);
                        curtain.position.set(px, 1.36, pz);
                        curtain.rotation.y = (random() - 0.5) * 0.06;
                        decal(curtain);
                    };
                    const ivPole = (px, pz) => {
                        const pole = new THREE.Mesh(env._boxGeo(0.08, 2.0, 0.08), env.rustMat);
                        pole.position.set(px, 1.0, pz);
                        addGeometry(pole);
                    };
                    if (maze && maze[localX][localZ]) {
                        const zRun = wallAt(localX, localZ - 1) || wallAt(localX, localZ + 1);
                        const xRun = wallAt(localX - 1, localZ) || wallAt(localX + 1, localZ);
                        const alongZ = zRun && !xRun ? true : (xRun && !zRun ? false : ((localX + localZ) % 2 === 0));
                        const openDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx2, dz2]) => !wallAt(localX + dx2, localZ + dz2));
                        const roll = random();
                        if (roll < 0.14 && openDirs.length > 0) {
                            const [odx, odz] = openDirs[Math.floor(random() * openDirs.length)];
                            const back = buildWall(odx !== 0 ? 0.3 : env.cellSize, odx !== 0 ? env.cellSize : 0.3, env.sharedWallMat, 3.0);
                            back.position.set(cx0 - odx * 1.85, 1.5, cz0 - odz * 1.85);
                            addGeometry(back);
                            for (let s = -1; s <= 1; s += 2) {
                                const sw = buildWall(odx !== 0 ? 3.7 : 0.3, odx !== 0 ? 0.3 : 3.7, env.sharedWallMat, 3.0);
                                sw.position.set(cx0 + (odx !== 0 ? -odx * 0.15 : s * 1.85), 1.5, cz0 + (odx !== 0 ? s * 1.85 : -odz * 0.15));
                                addGeometry(sw);
                            }
                            const cot = new THREE.Group();
                            const cotFrame = new THREE.Mesh(env._boxGeo(1.0, 0.5, 2.0), env.structMat);
                            cotFrame.position.y = 0.25;
                            const mattress = new THREE.Mesh(env._boxGeo(0.9, 0.15, 1.9), env.fabricMat);
                            mattress.position.y = 0.575;
                            cot.add(cotFrame, mattress);
                            if (odx !== 0) cot.rotation.y = Math.PI / 2;
                            cot.position.set(cx0 - odx * 0.55, 0, cz0 - odz * 0.55);
                            addFurniture(cot);
                            ivPole(cx0 + (odz !== 0 ? 1.3 : -odx * 0.2), cz0 + (odx !== 0 ? 1.3 : -odz * 0.2));
                            hangCurtain(odx !== 0, cx0 + odx * 1.6, cz0 + odz * 1.6, 3.6);
                        } else if (roll < 0.27) {
                            hangCurtain(alongZ, cx0, cz0, env.cellSize);
                            if (random() > 0.6) {
                                hangCurtain(alongZ, cx0 + (alongZ ? 0.7 : 0), cz0 + (alongZ ? 0 : 0.7), env.cellSize);
                            }
                        } else if (roll < 0.38) {
                            const segLen = 1.8;
                            for (let s = -1; s <= 1; s += 2) {
                                const seg = buildWall(alongZ ? 1.2 : segLen, alongZ ? segLen : 1.2, env.sharedWallMat, 3.0);
                                seg.position.set(cx0 + (alongZ ? 0 : s * 1.1), 1.5, cz0 + (alongZ ? s * 1.1 : 0));
                                addGeometry(seg);
                            }
                        } else {
                            const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, 3.0);
                            wall.position.set(cx0, 1.5, cz0);
                            addGeometry(wall);
                            for (const [dx2, dz2] of openDirs) {
                                const rail = new THREE.Mesh(env._boxGeo(dz2 !== 0 ? 3.9 : 0.07, 0.14, dz2 !== 0 ? 0.07 : 3.9), env.rustMat);
                                rail.position.set(cx0 + dx2 * 2.06, 0.95, cz0 + dz2 * 2.06);
                                decal(rail);
                            }
                        }
                        return;
                    }
                    const gateApproach = (localX === 7 && (localZ <= 2 || localZ >= 13)) || (localZ === 7 && (localX <= 2 || localX >= 13));
                    const corrX = !wallAt(localX - 1, localZ) || !wallAt(localX + 1, localZ);
                    const obRoll = gateApproach ? 1.0 : random();
                    const isCollapse = obRoll >= 0.12 && obRoll < 0.135;
                    if (!isCollapse && (localX + localZ) % 2 === 0 && random() > 0.5) {
                        const activeMat = ctx.getLightMaterial(0xd0e8ff, 0xa0d0ff, false);
                        const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
                        panel.position.set(cx0, 2.98, cz0);
                        chunkGroup.add(panel);
                        env.walls.push(panel);
                        env.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(cx0, 2.8, cz0),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.6,
                            baseIntensity: 0.5,
                            targetIntensity: 0.5,
                            currentIntensity: 0.5
                        });
                    }
                    if (gateApproach) return;
                    if (obRoll < 0.12) {
                        const gurney = new THREE.Group();
                        const bed = new THREE.Mesh(env._boxGeo(1.0, 0.12, 2.0), env.structMat);
                        bed.position.y = 0.75;
                        const gMat = new THREE.Mesh(env._boxGeo(0.95, 0.12, 1.9), env.fabricMat);
                        gMat.position.y = 0.87;
                        gurney.add(bed, gMat);
                        for (let e = -1; e <= 1; e += 2) {
                            const legs = new THREE.Mesh(env._boxGeo(0.9, 0.75, 0.06), env.metalMat);
                            legs.position.set(0, 0.375, e * 0.85);
                            gurney.add(legs);
                        }
                        gurney.rotation.y = (corrX ? 0 : Math.PI / 2) + (random() - 0.5) * 0.9;
                        gurney.position.set(cx0 + (random() - 0.5) * 1.2, 0, cz0 + (random() - 0.5) * 1.2);
                        addFurniture(gurney);
                        if (random() > 0.5) ivPole(cx0 + (random() - 0.5) * 2.5, cz0 + (random() - 0.5) * 2.5);
                    } else if (isCollapse) {
                        const travelX = corrX;
                        const depth = 2.6;
                        const massW = travelX ? depth : env.cellSize;
                        const massD = travelX ? env.cellSize : depth;
                        
                        if (!env.darkHoleMat) env.darkHoleMat = new THREE.MeshBasicMaterial({color: 0x010101});
                        const hole = new THREE.Mesh(env._boxGeo(massW - 0.2, 0.1, massD - 0.2), env.darkHoleMat);
                        hole.position.set(cx0, 2.96, cz0);
                        decal(hole);
                        
                        const rubbleBase = buildWall(massW - 0.2, massD - 0.2, env.structMat, 1.5);
                        rubbleBase.position.set(cx0, 0.75, cz0);
                        rubbleBase.rotation.set((random()-0.5)*0.1, (random()-0.5)*0.1, (random()-0.5)*0.1);
                        addGeometry(rubbleBase);
                        
                        for(let c = 0; c < 5; c++) {
                             const cW = 0.5 + random();
                             const cH = 0.5 + random();
                             const cD = 0.5 + random();
                             const chunk = new THREE.Mesh(env._boxGeo(cW, cH, cD), env.structMat);
                             chunk.position.set(cx0 + (random()-0.5)*1.5, cH/2 + random()*0.8, cz0 + (random()-0.5)*1.5);
                             chunk.rotation.set(random()*Math.PI, random()*Math.PI, random()*Math.PI);
                             addGeometry(chunk);
                        }

                        if (!env.collapseRebarGeo) {
                            env.collapseRebarGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 5);
                            env.geoCache.set(env.collapseRebarGeo.uuid, true);
                        }
                        for (let i = 0; i < 4; i++) {
                            const bar = new THREE.Mesh(env.collapseRebarGeo, env.rustMat);
                            bar.position.set(cx0 + (random()-0.5)*1.5, 1.0 + random()*1.5, cz0 + (random()-0.5)*1.5);
                            bar.rotation.set((random() - 0.5) * 1.5, random() * Math.PI, (random() - 0.5) * 1.5);
                            decal(bar);
                        }
                        
                        const duct = new THREE.Mesh(env._boxGeo(0.5, 1.2, 0.5), env.metalMat);
                        duct.position.set(cx0 + (random() - 0.5) * 0.8, 2.4, cz0 + (random() - 0.5) * 0.8);
                        duct.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3);
                        decal(duct);
                        
                        if (!env.fallenTileGeo) {
                            env.fallenTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                            env.geoCache.set(env.fallenTileGeo.uuid, true);
                        }
                        const tileCount = 3 + Math.floor(random() * 4);
                        for (let i = 0; i < tileCount; i++) {
                            const tile = new THREE.Mesh(env.fallenTileGeo, env.ceilMat);
                            tile.position.set(cx0 + (random() - 0.5) * 2.8, 0.03 + random() * 0.3, cz0 + (random() - 0.5) * 2.8);
                            tile.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
                            decal(tile);
                        }
                    } else if (obRoll < 0.32) {
                        for (let s = -1; s <= 1; s += 2) {
                            const screen = new THREE.Mesh(env._boxGeo(corrX ? 0.1 : 2.6, 2.4, corrX ? 2.6 : 0.1), env.fabricMat);
                            screen.position.set(
                                cx0 + (corrX ? s * 0.9 : s * 1.0),
                                1.2,
                                cz0 + (corrX ? s * 1.0 : s * 0.9)
                            );
                            screen.rotation.y = (random() - 0.5) * 0.5;
                            addGeometry(screen);
                        }
                    } else if (obRoll < 0.42) {
                        const chairCount = 1 + Math.floor(random() * 2);
                        for (let i = 0; i < chairCount; i++) {
                            addFurniture(buildChair(cx0 + (random() - 0.5) * 2.2, 0, cz0 + (random() - 0.5) * 2.2, random() * Math.PI * 2));
                        }
                        if (random() > 0.5) {
                            if (!env.cartonGeo) {
                                env.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                                env.geoCache.set(env.cartonGeo.uuid, true);
                            }
                            const cartonPool = env.cartonMats || [env.fileBoxMat];
                            const mBox = new THREE.Mesh(env.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                            mBox.rotation.y = random() * Math.PI;
                            mBox.position.set(cx0 + (random() - 0.5) * 2.0, 0.25, cz0 + (random() - 0.5) * 2.0);
                            addGeometry(mBox);
                        }
                    } else if (obRoll < 0.50) {
                        const mold = new THREE.Mesh(env.moldGeo, env.moldMat);
                        mold.position.set(cx0 + (random() - 0.5) * 1.5, 0.015, cz0 + (random() - 0.5) * 1.5);
                        mold.rotation.y = random() * Math.PI * 2;
                        decal(mold);
                    }
                }
            };
};
