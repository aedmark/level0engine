// ImpoundSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const ImpoundSector = (env, ctx) => {
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
                id: "IMPOUND",
                foundationMat: env.structMat,
                ceilingMat: env.impoundCeilingMat || env.clinicMat,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.impoundWallMat || env.sharedWallMat, "IMPOUND", 20.0)) {
                        return;
                    }
                    const px = x * env.cellSize, pz = z * env.cellSize;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const FENCE_H = 1.8, FENCE_SCALE = FENCE_H / 3.0;
                        if (!env.fenceGeoX) {
                            env.fenceGeoX = new THREE.BoxGeometry(env.cellSize, FENCE_H, 0.05);
                            env.geoCache.set(env.fenceGeoX.uuid, true);
                            env.fenceGeoZ = new THREE.BoxGeometry(0.05, FENCE_H, env.cellSize);
                            env.geoCache.set(env.fenceGeoZ.uuid, true);
                        }
                        const mwWall = (dx, dz) => {
                            const nx = localX + dx, nz = localZ + dz;
                            return nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze && maze[nx][nz];
                        };
                        const cPillar = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                        cPillar.scale.set(1, FENCE_SCALE, 1);
                        cPillar.position.set(px + (env.cellSize / 2), FENCE_H / 2, pz + (env.cellSize / 2));
                        addGeometry(cPillar);
                        if (!mwWall(-1, 0)) {
                            const endPillar = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                            endPillar.scale.set(1, FENCE_SCALE, 1);
                            endPillar.position.set(px - (env.cellSize / 2), FENCE_H / 2, pz + (env.cellSize / 2));
                            addGeometry(endPillar);
                        }
                        if (!mwWall(0, -1)) {
                            const endPillar = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                            endPillar.scale.set(1, FENCE_SCALE, 1);
                            endPillar.position.set(px + (env.cellSize / 2), FENCE_H / 2, pz - (env.cellSize / 2));
                            addGeometry(endPillar);
                        }
                        const buildFenceRun = (alongX) => {
                            const fx = px + (alongX ? 0 : env.cellSize / 2);
                            const fz = pz + (alongX ? env.cellSize / 2 : 0);
                            if (random() > 0.85) {
                                for (let s = -1; s <= 1; s += 2) {
                                    const stub = new THREE.Mesh(env._boxGeo(alongX ? 1.3 : 0.05, FENCE_H, alongX ? 0.05 : 1.3), env.fenceMat);
                                    stub.position.set(fx + (alongX ? s * 1.35 : 0), FENCE_H / 2, fz + (alongX ? 0 : s * 1.35));
                                    addGeometry(stub);
                                    const gatePost = new THREE.Mesh(env.vPipeGeo, env.metalMat);
                                    gatePost.scale.set(0.7, 0.75 * FENCE_SCALE, 0.7);
                                    gatePost.position.set(fx + (alongX ? s * 0.7 : 0), 1.12 * FENCE_SCALE, fz + (alongX ? 0 : s * 0.7));
                                    addGeometry(gatePost);
                                }
                                const gateGeo = env._cacheGeo(`impGate:${alongX ? 'X' : 'Z'}`, () => {
                                    const g = new THREE.BoxGeometry(alongX ? 1.4 : 0.05, 2.2 * FENCE_SCALE, alongX ? 0.05 : 1.4);
                                    g.translate(alongX ? 0.7 : 0, 0, alongX ? 0 : 0.7);
                                    return g;
                                });
                                const gate = new THREE.Mesh(gateGeo, env.fenceMat);
                                gate.position.set(fx - (alongX ? 0.7 : 0), 1.15 * FENCE_SCALE, fz - (alongX ? 0 : 0.7));
                                gate.rotation.y = (random() > 0.5 ? 1 : -1) * (0.3 + random() * 1.0);
                                gate.userData.chunkHash = hash;
                                gate.updateMatrixWorld(true);
                                stagingMeshes.push(gate);
                            } else {
                                const fence = new THREE.Mesh(alongX ? env.fenceGeoX : env.fenceGeoZ, env.fenceMat);
                                fence.position.set(fx, FENCE_H / 2, fz);
                                if (random() > (alongX ? 0.1 : 0.2)) fence.userData.isEntityBlocker = true;
                                addGeometry(fence);
                                const rail = new THREE.Mesh(env._boxGeo(alongX ? env.cellSize : 0.07, 0.07, alongX ? 0.07 : env.cellSize), env.rustMat);
                                rail.position.set(fx, FENCE_H - 0.04, fz);
                                addGeometry(rail);
                            }
                        };
                        buildFenceRun(true);
                        buildFenceRun(false);
                    } else {
                        const edgeInner = env.chunkSize - 2;
                        if (localX > 1 && localX < edgeInner && localZ > 1 && localZ < edgeInner && random() > 0.88) {
                            const mastHeight = 7.5;
                            const mast = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                            mast.scale.set(1.5, mastHeight, 1.5);
                            mast.position.set(px + env.cellSize/2, mastHeight/2, pz + env.cellSize/2);
                            addGeometry(mast);
                            
                            const crossGeo = env._boxGeo(2.4, 0.2, 0.2);
                            const crossbar = new THREE.Mesh(crossGeo, env.rustMat);
                            crossbar.position.set(px + env.cellSize/2, mastHeight, pz + env.cellSize/2);
                            
                            const dx = 7 - localX;
                            const dz = 7 - localZ;
                            const rotY = Math.atan2(dx, dz);
                            crossbar.rotation.y = rotY;
                            addGeometry(crossbar);
                            
                            const activeMat = ctx.getLightMaterial(0xffaa55, 0xffaa55, false);
                            const lampGeo = env._boxGeo(1.8, 0.6, 0.4);
                            const lamp = new THREE.Mesh(lampGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat]);
                            lamp.position.set(px + env.cellSize/2, mastHeight + 0.3, pz + env.cellSize/2);
                            lamp.rotation.order = 'YXZ';
                            lamp.rotation.set(Math.PI / 4, rotY, 0);
                            chunkGroup.add(lamp);
                            env.walls.push(lamp);
                            
                            const lx = (px + env.cellSize/2) + Math.sin(rotY) * 0.8;
                            const lz = (pz + env.cellSize/2) + Math.cos(rotY) * 0.8;
                            
                            const tx = lx + Math.sin(rotY) * 10.0;
                            const tz = lz + Math.cos(rotY) * 10.0;
                            const targetPos = new THREE.Vector3(tx, 0, tz);
                            
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(lx, mastHeight, lz),
                                isSpot: true,
                                targetPos: targetPos,
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.9,
                                baseIntensity: 5.5,
                                targetIntensity: 5.5,
                                currentIntensity: 5.5,
                                distance: 35.0
                            });
                            return;
                        }
                        const mw = (dx, dz) => {
                            const nx = localX + dx, nz = localZ + dz;
                            return nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze && maze[nx][nz];
                        };
                        const pocketWalls = (mw(1, 0) ? 1 : 0) + (mw(-1, 0) ? 1 : 0) + (mw(0, 1) ? 1 : 0) + (mw(0, -1) ? 1 : 0);
                        let placedBig = false;
                        if (pocketWalls >= 1 && random() > 0.58) {
                            const pick = random();
                            const kind = pick < 0.46 ? 'car' : (pick < 0.74 ? 'machine' : 'tires');
                            placedBig = env._buildImpoundItem(px, pz, kind, {addFurniture, chunkGroup, hash, random});
                        }
                        if (!placedBig && pocketWalls >= 2 && random() > 0.7) {
                            const hoard = random();
                            if (hoard < 0.5 && env.cartonGeo) {
                                const cartonPool = env.cartonMats || [env.fileBoxMat];
                                const hbx = px + (random() - 0.5) * 1.2;
                                const hbz = pz + (random() - 0.5) * 1.2;
                                const hYaw = random() * Math.PI;
                                const hN = 1 + Math.floor(random() * 3);
                                for (let ci = 0; ci < hN; ci++) {
                                    const fb = new THREE.Mesh(env.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                    fb.position.set(hbx + (random() - 0.5) * 0.08, 0.25 + ci * 0.5, hbz + (random() - 0.5) * 0.08);
                                    fb.rotation.y = hYaw + (random() - 0.5) * 0.3;
                                    addGeometry(fb);
                                }
                                if (random() > 0.5) {
                                    const tag = new THREE.Mesh(env.documentGeo, env.documentMat);
                                    tag.position.set(hbx, hN * 0.5 + 0.01, hbz);
                                    tag.rotation.y = random() * Math.PI;
                                    tag.userData = {
                                        type: 'document',
                                        chunkHash: hash,
                                        active: true,
                                        zone: 'IMPOUND',
                                        docId: 'TAG_' + Math.floor(random() * 9999)
                                    };
                                    chunkGroup.add(tag);
                                    if (!env.interactables) env.interactables = [];
                                    env.interactables.push(tag);
                                    const tBox = new THREE.Box3().setFromObject(tag);
                                    tBox.chunkHash = hash;
                                    tag.userData.box = tBox;
                                    env.spatialGrid.insert(tBox);
                                }
                            } else if (hoard < 0.75) {
                                addFurniture(buildTable(px, 0, pz));
                            } else {
                                addFurniture(buildChair(px + 0.4, 0, pz, random() * Math.PI * 2));
                                addFurniture(buildChair(px - 0.5, 0, pz + 0.3, random() * Math.PI * 2));
                            }
                        }
                        // Removed ceiling light fixtures per user request
                    }
                }
            };
};
