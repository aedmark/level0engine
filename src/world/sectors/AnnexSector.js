import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import * as OfficeFurniture from '../OfficeFurniture.js';
import * as ClinicFurniture from '../ClinicFurniture.js';
import { buildBreakerPodium, setPodiumBroken } from '../BreakerPodium.js';
import {illuminateDucts} from '../../core/LightLayers.js';

/**
 * [ROLE] Defines the generation logic for the "Annex" sector.
 * [WHY] Provides office-like spaces, corridors, and interactive elements (keypads, doors) to simulate an administrative area.
 * [STATE] Stateless factory. Returns a builder object that modifies the world generation environment.
 * [DEPENDS] Depends on `env` and `ctx` provided by the sector generation pipeline, utilizing builder functions for geometry and interactions.
 */
export const AnnexSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildTable,
        addFurniture,
        chunkGroup,
        hash
    } = ctx;
    return {
        id: "ANNEX",
        foundationMat: env.annexFloorMat || env.sharedWallMat,
        ceilingMat: env.annexCeilingMat || env.sharedWallMat,
        build: (x, z, localX, localZ) => {
            const edge = env.chunkSize - 1;
            const isDoorwayNS = localX === 7 && (localZ === 0 || localZ === edge);
            const isDoorwayEW = localZ === 7 && (localX === 0 || localX === edge);
            const isDoorway = isDoorwayNS || isDoorwayEW;

            if (isDoorway) return;

            if (ctx.buildPerimeter(x, z, localX, localZ, env.annexWallMat || env.sharedWallMat, "ANNEX")) return;
            const ox = x * env.cellSize, oz = z * env.cellSize;
            const isCorr = (lx, lz) => lx > 0 && lx < env.chunkSize - 1 && lz > 0 && lz < env.chunkSize - 1 &&
                (lx === 7 || lz === 3 || lz === 7 || lz === 11);
                
            const isOffice = (lx, lz) => !isCorr(lx, lz) && lx > 0 && lx < env.chunkSize - 1 && lz > 0 && lz < env.chunkSize - 1 &&
                (isCorr(lx, lz - 1) || isCorr(lx, lz + 1) || isCorr(lx - 1, lz) || isCorr(lx + 1, lz));

            const spawnWallFurniture = (cx, cz, wDx, wDz) => {
                const px = cx + wDx * (env.cellSize / 2 - 0.4);
                const pz = cz + wDz * (env.cellSize / 2 - 0.4);
                let faceYaw = 0;
                if (wDx === -1) faceYaw = Math.PI / 2;
                else if (wDx === 1) faceYaw = -Math.PI / 2;
                else if (wDz === -1) faceYaw = 0;
                else if (wDz === 1) faceYaw = Math.PI;

                const roll = random();
                let obj;
                if (roll < 0.09) {
                    obj = OfficeFurniture.buildWaterCooler(env, px, 0, pz, faceYaw);
                } else if (roll < 0.18) {
                    obj = OfficeFurniture.buildPottedPlant(env, px, 0, pz);
                } else if (roll < 0.27) {
                    obj = OfficeFurniture.buildFilingCabinet(env, random, px, 0, pz, faceYaw);
                } else if (roll < 0.36) {
                    obj = ClinicFurniture.buildWaitingBench(env);
                    obj.position.set(px, 0, pz);
                    obj.rotation.y = faceYaw;
                } else if (roll < 0.45) {
                    const bbPx = cx + wDx * (env.cellSize / 2 - 0.05);
                    const bbPz = cz + wDz * (env.cellSize / 2 - 0.05);
                    obj = OfficeFurniture.buildBulletinBoard(env, random, bbPx, 1.5, bbPz, faceYaw);
                } else if (roll < 0.54) {
                    obj = ClinicFurniture.buildClinicBed(env);
                    obj.position.set(px, 0, pz);
                    obj.rotation.y = faceYaw;
                } else if (roll < 0.63) {
                    obj = ClinicFurniture.buildIVPole(env);
                    obj.position.set(px, 0, pz);
                } else if (roll < 0.72) {
                    obj = ClinicFurniture.buildHeartMonitor(env);
                    obj.position.set(px, 0, pz);
                    obj.rotation.y = faceYaw;
                } else if (roll < 0.81) {
                    obj = ClinicFurniture.buildWheelchair(env);
                    obj.position.set(px, 0, pz);
                    obj.rotation.y = faceYaw;
                } else if (roll < 0.90) {
                    obj = ClinicFurniture.buildWaterFountain(env);
                    obj.position.set(px, 0, pz);
                    obj.rotation.y = faceYaw;
                } else {
                    obj = buildBreakerPodium(env, hash, random);
                    obj.position.set(px, 0, pz);
                    obj.rotation.y = faceYaw;
                    setPodiumBroken(obj);
                }
                
                if (obj) addFurniture(obj);
            };

            if (isCorr(localX, localZ)) {
                if ((localX + localZ) % 2 === 0 && random() > 0.1) {
                    env._buildCeilingPanelLight(chunkGroup, hash, ox, oz, random, ctx.getLightMaterial, 0xd6cc98, 0xffeebb, 0.32, 0.8);
                }
                const r = random();
                if (r > 0.4) {
                    let wallDx = 0, wallDz = 0;
                    if (!isCorr(localX - 1, localZ) && !isOffice(localX - 1, localZ)) { wallDx = -1; }
                    else if (!isCorr(localX + 1, localZ) && !isOffice(localX + 1, localZ)) { wallDx = 1; }
                    else if (!isCorr(localX, localZ - 1) && !isOffice(localX, localZ - 1)) { wallDz = -1; }
                    else if (!isCorr(localX, localZ + 1) && !isOffice(localX, localZ + 1)) { wallDz = 1; }
                    
                    if (wallDx !== 0 || wallDz !== 0) {
                        spawnWallFurniture(ox, oz, wallDx, wallDz);
                    }
                }
                return;
            }
            const corrEdges = [];
            if (isCorr(localX, localZ - 1)) corrEdges.push([0, -1]);
            if (isCorr(localX, localZ + 1)) corrEdges.push([0, 1]);
            if (isCorr(localX - 1, localZ)) corrEdges.push([-1, 0]);
            if (isCorr(localX + 1, localZ)) corrEdges.push([1, 0]);
            if (corrEdges.length === 0) {
                const block = buildWall(env.cellSize, env.cellSize, env.annexWallMat || env.sharedWallMat);
                block.position.set(ox, 1.5, oz);
                block.userData.isEntityBlocker = true;
                addGeometry(block);
                return;
            }
            const dd = corrEdges[Math.floor(random() * corrEdges.length)];
            const edges = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            for (let ei = 0; ei < edges.length; ei++) {
                const ex = edges[ei][0], ez = edges[ei][1];
                if (ex === dd[0] && ez === dd[1]) continue;
                const nx = localX + ex, nz = localZ + ez;
                let buildIt;
                if (isCorr(nx, nz)) buildIt = true;
                else if (isOffice(nx, nz)) buildIt = (ez === -1 || ex === -1);
                else buildIt = false;
                let shiftX = 0, shiftZ = 0;
                if (ex === 0 && ez === -1) shiftX = 0.125;
                if (ex === 1 && ez === 0) shiftZ = 0.125;
                if (ex === 0 && ez === 1) shiftX = -0.125;
                if (ex === -1 && ez === 0) shiftZ = -0.125;
                if (buildIt) {
                    const wallSeg = buildWall(ex === 0 ? env.cellSize : 0.25, ex === 0 ? 0.25 : env.cellSize, env.annexWallMat || env.sharedWallMat);
                    wallSeg.position.set(ox + ex * 2 + shiftX, 1.5, oz + ez * 2 + shiftZ);
                    wallSeg.userData.isEntityBlocker = true;
                    addGeometry(wallSeg);
                }
            }
            const spansX = dd[1] !== 0;
            const wx = ox + dd[0] * 2, wz = oz + dd[1] * 2;
            const isOpenable = random() < 0.35;
            if (!env._annexKeypadChunks) env._annexKeypadChunks = new Set();
            const isKeypad = !isOpenable && !env._annexKeypadChunks.has(hash) && random() < 0.35;
            if (isKeypad) env._annexKeypadChunks.add(hash);
            if (!env.laptopScreenMat) {
                env.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
                env.sharedAssets.add(env.laptopScreenMat.uuid);
            }
            for (let s = -1; s <= 1; s += 2) {
                let isLong = false;
                if (spansX) {
                    isLong = (s === 1 && dd[1] === -1) || (s === -1 && dd[1] === 1);
                } else {
                    isLong = (s === 1 && dd[0] === 1) || (s === -1 && dd[0] === -1);
                }
                const w = isLong ? 1.325 : 1.075;
                const cDist = 0.8 + w / 2;
                const stub = buildWall(spansX ? w : 0.25, spansX ? 0.25 : w, env.annexWallMat || env.sharedWallMat);
                stub.position.set(wx + (spansX ? s * cDist : 0), 1.5, wz + (spansX ? 0 : s * cDist));
                stub.userData.isEntityBlocker = true;
                addGeometry(stub);
            }
            const header = buildWall(spansX ? 1.6 : 0.25, spansX ? 0.25 : 1.6, env.annexFrameMat || env.metalMat, 0.35);
            header.position.set(wx, 2.825, wz);
            addGeometry(header);
            for (let s = -1; s <= 1; s += 2) {
                const jamb = new THREE.Mesh(env._boxGeo(spansX ? 0.1 : 0.3, 2.65, spansX ? 0.3 : 0.1), env.annexFrameMat || env.metalMat);
                jamb.position.set(wx + (spansX ? s * 0.75 : 0), 1.325, wz + (spansX ? 0 : s * 0.75));
                addGeometry(jamb);
            }
            const doorW = 1.4, doorT = 0.1;
            let doorGeo, doorMesh;
            let doorMatArr;
            if (spansX) {
                const mat = env.annexDoorMat || env.doorMat;
                if (Array.isArray(mat) && mat.length >= 6) {
                    doorMatArr = [...mat];
                    if (dd[1] === -1) {
                        doorMatArr[4] = mat[5];
                        doorMatArr[5] = mat[4];
                    }
                } else {
                    doorMatArr = mat;
                }

                doorGeo = env._cacheGeo('hingedDoor:X', () => {
                    const g = new THREE.BoxGeometry(doorW, 2.65, doorT);
                    g.translate(doorW / 2, 0, doorT / 2);
                    return g;
                });
                doorMesh = new THREE.Mesh(doorGeo, doorMatArr);
                doorMesh.position.set(wx - doorW / 2, 1.325, wz);
                doorMesh.userData = (isOpenable || isKeypad) ? {
                    chunkHash: hash,
                    closedRot: 0,
                    currentRot: 0
                } : {chunkHash: hash};
            } else {
                const mat = env.annexDoorMatZ || env.annexDoorMat || env.doorMat;
                if (Array.isArray(mat) && mat.length >= 6) {
                    doorMatArr = [...mat];
                    if (dd[0] === -1) {
                        doorMatArr[0] = mat[1];
                        doorMatArr[1] = mat[0];
                    }
                } else {
                    doorMatArr = mat;
                }

                doorGeo = env._cacheGeo('hingedDoor:Z', () => {
                    const g = new THREE.BoxGeometry(doorT, 2.65, doorW);
                    g.translate(doorT / 2, 0, doorW / 2);
                    return g;
                });
                doorMesh = new THREE.Mesh(doorGeo, doorMatArr);
                doorMesh.position.set(wx, 1.325, wz - doorW / 2);
                doorMesh.userData = (isOpenable || isKeypad) ? {
                    chunkHash: hash,
                    closedRot: 0,
                    currentRot: 0,
                    useXApproach: true
                } : {chunkHash: hash};
            }
            if (isKeypad) doorMesh.userData.codeLocked = true;
            doorMesh.castShadow = doorMesh.receiveShadow = true;
            chunkGroup.add(doorMesh);
            if (isOpenable || isKeypad) env.interactiveDoors.push(doorMesh);
            env.walls.push(doorMesh);
            doorMesh.updateMatrixWorld();
            const dBox = new THREE.Box3().setFromObject(doorMesh);
            dBox.chunkHash = hash;
            if (isOpenable || isKeypad) doorMesh.userData.box = dBox;
            env.spatialGrid.insert(dBox);
            if (isKeypad) {
                const pad = new THREE.Group();
                const padBody = new THREE.Mesh(env._boxGeo(0.16, 0.22, 0.05), env.baseHousingMat);
                pad.add(padBody);
                const padGlow = new THREE.Mesh(env._planeGeo(0.1, 0.14), env.laptopScreenMat);
                padGlow.position.z = 0.026;
                pad.add(padGlow);
                pad.position.set(
                    wx + (spansX ? 1.0 : dd[0] * 0.18),
                    1.35,
                    wz + (spansX ? dd[1] * 0.18 : 1.0)
                );
                pad.rotation.y = spansX ? (dd[1] > 0 ? 0 : Math.PI) : (dd[0] > 0 ? Math.PI / 2 : -Math.PI / 2);
                pad.traverse((ch) => {
                    ch.userData.chunkHash = hash;
                });
                chunkGroup.add(pad);
                pad.updateMatrixWorld(true);
                const sX = ox - dd[0] * 0.9, sZ = oz - dd[1] * 0.9;
                if (!env.interactables) env.interactables = [];
                const batGroup = new THREE.Group();
                batGroup.add(env.batteryPrefab.clone());
                const bGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                bGlow.scale.set(0.15, 0.15, 0.15);
                bGlow.position.y = 0.01;
                batGroup.add(bGlow);
                batGroup.position.set(sX, 0.1, sZ);
                batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                chunkGroup.add(batGroup);
                env.interactables.push(batGroup);
                const aGroup = new THREE.Group();
                aGroup.add(env.almondPrefab.clone());
                const aGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                aGlow.scale.set(0.15, 0.15, 0.15);
                aGlow.position.y = 0.01;
                aGroup.add(aGlow);
                aGroup.position.set(ox + (dd[1] !== 0 ? 0.9 : 0), 0.1, oz + (dd[0] !== 0 ? 0.9 : 0));
                aGroup.userData = {type: 'almond', chunkHash: hash, active: true};
                chunkGroup.add(aGroup);
                env.interactables.push(aGroup);
                if (!env.exitKeyMat) {
                    env.exitKeyMat = new THREE.MeshStandardMaterial({
                        color: 0xb8912f, roughness: 0.32, metalness: 0.95,
                        emissive: 0x3a2c08, emissiveIntensity: 0.6
                    });
                    env.sharedAssets.add(env.exitKeyMat.uuid);
                }
                const keyGroup = new THREE.Group();
                const bow = new THREE.Mesh(env._boxGeo(0.11, 0.012, 0.07), env.exitKeyMat);
                bow.position.set(-0.05, 0, 0);
                keyGroup.add(bow);
                const shaft = new THREE.Mesh(env._boxGeo(0.16, 0.01, 0.018), env.exitKeyMat);
                shaft.position.set(0.07, 0, 0);
                keyGroup.add(shaft);
                const bit = new THREE.Mesh(env._boxGeo(0.022, 0.01, 0.045), env.exitKeyMat);
                bit.position.set(0.13, 0, 0.028);
                keyGroup.add(bit);
                const kGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                kGlow.scale.set(0.16, 0.16, 0.16);
                kGlow.position.y = 0.01;
                keyGroup.add(kGlow);
                keyGroup.position.set(ox, 0.06, oz);
                keyGroup.rotation.y = random() * Math.PI;
                keyGroup.userData = {type: 'exit_key', chunkHash: hash, active: true};
                chunkGroup.add(keyGroup);
                keyGroup.updateMatrixWorld(true);
                env._registerInteractable(keyGroup, hash);
                return;
            }
            if (!isOpenable) return;
            const contentRoll = random();
            if (contentRoll < 0.5) {
                const deskX = ox - dd[0] * 1.0, deskZ = oz - dd[1] * 1.0;
                addFurniture(buildTable(deskX, 0, deskZ));
                const spawnRoll = random();
                if (spawnRoll < 0.5) {
                    const lap = new THREE.Group();
                    const lapBase = new THREE.Mesh(env._boxGeo(0.36, 0.025, 0.26), env.baseHousingMat);
                    lap.add(lapBase);
                    const lapScreen = new THREE.Mesh(env._cacheGeo('lapScreen', () => {
                        const g = new THREE.BoxGeometry(0.36, 0.24, 0.02);
                        g.translate(0, 0.12, 0);
                        return g;
                    }), env.baseHousingMat);
                    lapScreen.position.set(0, 0.01, -0.12);
                    lapScreen.rotation.x = -0.35;
                    const glow = new THREE.Mesh(env._planeGeo(0.3, 0.18), env.laptopScreenMat);
                    glow.position.set(0, 0.13, 0.012);
                    lapScreen.add(glow);
                    lap.add(lapScreen);
                    const laptopLight = new THREE.PointLight(0xa8ffd0, 0.8, 2.5, 2.0);
                    illuminateDucts(laptopLight);
                    laptopLight.position.set(0, 0.2, 0.1);
                    lap.add(laptopLight);
                    lap.position.set(deskX, 0.93, deskZ);
                    lap.rotation.y = Math.atan2(dd[0], dd[1]);
                    lap.userData = {
                        type: 'document',
                        chunkHash: hash,
                        active: true,
                        zone: 'ANNEX',
                        docId: 'PC_' + Math.floor(random() * 9999)
                    };
                    chunkGroup.add(lap);
                    lap.updateMatrixWorld(true);
                    env._registerInteractable(lap, hash);
                } else if (spawnRoll < 0.75) {
                    const tapeGroup = new THREE.Group();
                    if (!env.tapeGeo) {
                        env.tapeGeo = new THREE.BoxGeometry(0.18, 0.04, 0.12);
                        env.geoCache.set(env.tapeGeo.uuid, true);
                    }
                    const tapeBody = new THREE.Mesh(env.tapeGeo, env.baseHousingMat);
                    tapeBody.position.set(0, 0.02, 0);
                    tapeGroup.add(tapeBody);
                    const recLight = new THREE.Mesh(env._boxGeo(0.02, 0.02, 0.02), env.hazardMat);
                    recLight.material = new THREE.MeshBasicMaterial({color: 0xff0000});
                    recLight.position.set(0.06, 0.04, -0.04);
                    tapeGroup.add(recLight);
                    const pointLight = new THREE.PointLight(0xff0000, 1.0, 1.5, 2.0);
                    illuminateDucts(pointLight);
                    pointLight.position.set(0.06, 0.05, -0.04);
                    tapeGroup.add(pointLight);
                    tapeGroup.position.set(deskX, 0.93, deskZ);
                    tapeGroup.rotation.y = random() * Math.PI;
                    tapeGroup.userData = {
                        type: 'document',
                        chunkHash: hash,
                        active: true,
                        zone: 'ANNEX',
                        docId: 'TAPE_' + Math.floor(random() * 9999)
                    };
                    chunkGroup.add(tapeGroup);
                    env._registerInteractable(tapeGroup, hash);
                }
            } else if (contentRoll < 0.75) {
                const doc = new THREE.Mesh(env.documentGeo, env.documentMat);
                doc.position.set(ox + (random() - 0.5) * 1.6, 0.035, oz + (random() - 0.5) * 1.6);
                doc.rotation.y = random() * Math.PI;
                doc.userData = {
                    type: 'document',
                    chunkHash: hash,
                    active: true,
                    zone: 'ANNEX',
                    docId: 'LOG_' + Math.floor(random() * 9999)
                };
                chunkGroup.add(doc);
                env._registerInteractable(doc, hash);
            } else if (contentRoll < 0.9 && env.cartonGeo) {
                const cartonPool = env.cartonMats || [env.fileBoxMat];
                const cbx = ox + (random() - 0.5) * 1.4;
                const cbz = oz + (random() - 0.5) * 1.4;
                const cbYaw = random() * Math.PI;
                for (let ci = 0; ci < 1 + Math.floor(random() * 2); ci++) {
                    const fb = new THREE.Mesh(env.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                    fb.position.set(cbx + (random() - 0.5) * 0.08, 0.25 + ci * 0.5, cbz + (random() - 0.5) * 0.08);
                    fb.rotation.y = cbYaw + (random() - 0.5) * 0.3;
                    addGeometry(fb);
                }
            }
            
            if (random() > 0.25) {
                const validWalls = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(w => w[0] !== dd[0] || w[1] !== dd[1]);
                if (validWalls.length > 0) {
                    const fw = validWalls[Math.floor(random() * validWalls.length)];
                    spawnWallFurniture(ox, oz, fw[0], fw[1]);
                }
            }
        }
    };
};