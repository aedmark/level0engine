import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import * as OfficeFurniture from '../OfficeFurniture.js';
import * as ClinicFurniture from '../ClinicFurniture.js';
import { buildBreakerPodium, setPodiumBroken } from '../BreakerPodium.js';
import { attachPropGlow } from '../PropGlow.js';
import { PROP_GLOW } from '../NarrativeProps.js';

const generateAnnexChunk = (env, hash, random) => {
    if (!env._annexChunkGrids) env._annexChunkGrids = new Map();
    if (env._annexChunkGrids.has(hash)) return env._annexChunkGrids.get(hash);

    const size = env.chunkSize;
    const grid = Array.from({length: size}, () => new Array(size).fill(1));

    const carve = (cx, cz) => {
        grid[cx][cz] = 0;
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        for (const [dx, dz] of dirs) {
            const nx = cx + dx, nz = cz + dz;
            if (nx > 0 && nx < size - 1 && nz > 0 && nz < size - 1 && grid[nx][nz] === 1) {
                grid[cx + dx/2][cz + dz/2] = 0;
                carve(nx, nz);
            }
        }
    };
    carve(7, 7);

    const isDeadEnd = (cx, cz) => {
        let openCount = 0;
        if (grid[cx-1][cz] === 0) openCount++;
        if (grid[cx+1][cz] === 0) openCount++;
        if (grid[cx][cz-1] === 0) openCount++;
        if (grid[cx][cz+1] === 0) openCount++;
        return openCount === 1;
    };

    const deadEnds = [];
    for (let x = 1; x < size - 1; x += 2) {
        for (let z = 1; z < size - 1; z += 2) {
            if (grid[x][z] === 0 && isDeadEnd(x, z)) {
                deadEnds.push({x, z});
            }
        }
    }

    let lockedRoom = null;
    if (!env.lockedRoomSpawned && deadEnds.length > 0) {
        env.lockedRoomSpawned = true;
        const de = deadEnds[Math.floor(random() * deadEnds.length)];
        const {x, z} = de;
        let nx = x, nz = z;
        if (grid[x-1][z] === 0) nx = x-1;
        else if (grid[x+1][z] === 0) nx = x+1;
        else if (grid[x][z-1] === 0) nz = z-1;
        else if (grid[x][z+1] === 0) nz = z+1;

        lockedRoom = {x, z, nx, nz};
        grid[nx][nz] = 3;
        grid[x][z] = 4;
    }

    const bays = [];
    let attempts = 0;
    while (bays.length < 3 && attempts < 50) {
        attempts++;
        const bx = 3 + Math.floor(random() * 4) * 2;
        const bz = 3 + Math.floor(random() * 4) * 2;

        if (lockedRoom && Math.abs(lockedRoom.x - bx) <= 2 && Math.abs(lockedRoom.z - bz) <= 2) continue;

        let overlap = false;
        for (const b of bays) {
            if (Math.abs(b.x - bx) <= 4 && Math.abs(b.z - bz) <= 4) {
                overlap = true;
                break;
            }
        }
        if (!overlap) {
            bays.push({x: bx, z: bz});
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (grid[bx + i][bz + j] !== 3 && grid[bx + i][bz + j] !== 4) {
                        grid[bx + i][bz + j] = 0;
                    }
                }
            }
            grid[bx][bz] = 2;
        }
    }

    const data = { grid, bays, lockedRoom };
    env._annexChunkGrids.set(hash, data);
    return data;
};

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
            if (ctx.buildPerimeter(x, z, localX, localZ, env.annexWallMat || env.sharedWallMat, "ANNEX")) return;

            const chunkData = generateAnnexChunk(env, hash, random);
            const { grid, bays, lockedRoom } = chunkData;

            const ox = x * env.cellSize, oz = z * env.cellSize;
            const cellType = grid[localX][localZ];

            if (!env.laptopScreenMat) {
                env.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
                env.sharedAssets.add(env.laptopScreenMat.uuid);
            }
            if (!env.exitKeyMat) {
                env.exitKeyMat = new THREE.MeshStandardMaterial({
                    color: 0xb8912f, roughness: 0.32, metalness: 0.95,
                    emissive: 0x3a2c08, emissiveIntensity: 0.6
                });
                env.sharedAssets.add(env.exitKeyMat.uuid);
            }

            const spawnLaptop = (px, pz, yaw) => {
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
                lap.position.set(px, 0.93, pz);
                lap.rotation.y = yaw;
                lap.userData = {
                    type: 'document',
                    chunkHash: hash,
                    active: true,
                    zone: 'ANNEX',
                    docId: 'PC_' + Math.floor(random() * 9999)
                };
                chunkGroup.add(lap);
                lap.updateMatrixWorld(true);
                attachPropGlow(env, lap, hash, {...PROP_GLOW.laptop, flickerOffset: random() * 500});
                env._registerInteractable(lap, hash);
            };

            const spawnDocument = (px, pz, yaw) => {
                const doc = new THREE.Mesh(env.documentGeo, env.documentMat);
                doc.position.set(px, 0.931, pz);
                doc.rotation.y = yaw;
                doc.userData = {
                    type: 'document',
                    chunkHash: hash,
                    active: true,
                    zone: 'ANNEX',
                    docId: 'LOG_' + Math.floor(random() * 9999)
                };
                chunkGroup.add(doc);
                env._registerInteractable(doc, hash);
            };

            const spawnDesk = (px, pz, yaw, hasLaptop) => {
                const desk = buildTable(px, 0, pz);
                desk.rotation.y = yaw;
                addFurniture(desk);
                if (hasLaptop) {
                    spawnLaptop(px, pz, yaw);
                } else if (random() > 0.5) {
                    spawnDocument(px + (random() - 0.5) * 0.4, pz + (random() - 0.5) * 0.4, random() * Math.PI);
                }
            };

            if (cellType === 1) {
                const wall = buildWall(env.cellSize, env.cellSize, env.annexWallMat || env.sharedWallMat);
                wall.position.set(ox, 1.5, oz);
                wall.userData.isEntityBlocker = true;
                addGeometry(wall);
                return;
            }

            if (cellType === 3) {
                const spansX = (lockedRoom.nz !== lockedRoom.z);
                const gapW = 1.4;
                const sideW = (env.cellSize - gapW) / 2;

                if (spansX) {
                    for (let s = -1; s <= 1; s += 2) {
                        const side = buildWall(sideW, env.cellSize, env.annexWallMat || env.sharedWallMat);
                        side.position.set(ox + s * (gapW / 2 + sideW / 2), 1.5, oz);
                        side.userData.isEntityBlocker = true;
                        addGeometry(side);
                    }
                    const header = buildWall(gapW, env.cellSize, env.annexWallMat || env.sharedWallMat, 0.35);
                    header.position.set(ox, 2.825, oz);
                    addGeometry(header);

                    const doorW = 1.4, doorT = 0.1;
                    const doorGeo = env._cacheGeo('hingedDoor:X', () => {
                        const g = new THREE.BoxGeometry(doorW, 2.65, doorT);
                        g.translate(doorW / 2, 0, doorT / 2);
                        return g;
                    });
                    const doorMesh = new THREE.Mesh(doorGeo, env.annexDoorMat || env.doorMat);
                    if (ctx.buildDoorKnob) {
                        const handle = ctx.buildDoorKnob(0.1, false);
                        handle.position.set(1.30, 0.0, 0.05);
                        doorMesh.add(handle);
                    }
                    doorMesh.position.set(ox - doorW / 2, 1.325, oz);
                    doorMesh.userData = { chunkHash: hash, closedRot: 0, currentRot: 0, codeLocked: true };
                    doorMesh.castShadow = doorMesh.receiveShadow = true;
                    chunkGroup.add(doorMesh);
                    env.interactiveDoors.push(doorMesh);
                    env.walls.push(doorMesh);
                    doorMesh.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(doorMesh);
                    dBox.chunkHash = hash;
                    doorMesh.userData.box = dBox;
                    env.spatialGrid.insert(dBox);

                    const pad = new THREE.Group();
                    const padBody = new THREE.Mesh(env._boxGeo(0.16, 0.22, 0.05), env.baseHousingMat);
                    pad.add(padBody);
                    const padGlow = new THREE.Mesh(env._planeGeo(0.1, 0.14), env.laptopScreenMat);
                    padGlow.position.z = 0.026;
                    pad.add(padGlow);
                    pad.position.set(ox + 1.0, 1.35, oz + 0.18);
                    pad.traverse((ch) => ch.userData.chunkHash = hash);
                    chunkGroup.add(pad);
                    pad.updateMatrixWorld(true);
                } else {
                    for (let s = -1; s <= 1; s += 2) {
                        const side = buildWall(env.cellSize, sideW, env.annexWallMat || env.sharedWallMat);
                        side.position.set(ox, 1.5, oz + s * (gapW / 2 + sideW / 2));
                        side.userData.isEntityBlocker = true;
                        addGeometry(side);
                    }
                    const header = buildWall(env.cellSize, gapW, env.annexWallMat || env.sharedWallMat, 0.35);
                    header.position.set(ox, 2.825, oz);
                    addGeometry(header);

                    const doorW = 1.4, doorT = 0.1;
                    const doorGeo = env._cacheGeo('hingedDoor:Z', () => {
                        const g = new THREE.BoxGeometry(doorT, 2.65, doorW);
                        g.translate(doorT / 2, 0, doorW / 2);
                        return g;
                    });
                    const doorMesh = new THREE.Mesh(doorGeo, env.annexDoorMatZ || env.annexDoorMat || env.doorMat);
                    if (ctx.buildDoorKnob) {
                        const handle = ctx.buildDoorKnob(0.1, true);
                        handle.position.set(0.05, 0.0, 1.30);
                        doorMesh.add(handle);
                    }
                    doorMesh.position.set(ox, 1.325, oz - doorW / 2);
                    doorMesh.userData = { chunkHash: hash, closedRot: 0, currentRot: 0, codeLocked: true, useXApproach: true };
                    doorMesh.castShadow = doorMesh.receiveShadow = true;
                    chunkGroup.add(doorMesh);
                    env.interactiveDoors.push(doorMesh);
                    env.walls.push(doorMesh);
                    doorMesh.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(doorMesh);
                    dBox.chunkHash = hash;
                    doorMesh.userData.box = dBox;
                    env.spatialGrid.insert(dBox);

                    const pad = new THREE.Group();
                    const padBody = new THREE.Mesh(env._boxGeo(0.16, 0.22, 0.05), env.baseHousingMat);
                    pad.add(padBody);
                    const padGlow = new THREE.Mesh(env._planeGeo(0.1, 0.14), env.laptopScreenMat);
                    padGlow.position.z = 0.026;
                    pad.add(padGlow);
                    pad.position.set(ox + 0.18, 1.35, oz + 1.0);
                    pad.rotation.y = Math.PI / 2;
                    pad.traverse((ch) => ch.userData.chunkHash = hash);
                    chunkGroup.add(pad);
                    pad.updateMatrixWorld(true);
                }
                return;
            }

            if (cellType === 4) {
                const table = buildTable(ox, 0, oz);
                addFurniture(table);

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
                keyGroup.position.set(ox, 0.93, oz);
                keyGroup.rotation.y = random() * Math.PI;
                keyGroup.userData = {type: 'exit_key', chunkHash: hash, active: true};
                chunkGroup.add(keyGroup);
                keyGroup.updateMatrixWorld(true);
                env._registerInteractable(keyGroup, hash);

                const batGroup = new THREE.Group();
                batGroup.add(env.batteryPrefab.clone());
                const bGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                bGlow.scale.set(0.15, 0.15, 0.15);
                bGlow.position.y = 0.01;
                batGroup.add(bGlow);
                batGroup.position.set(ox - 0.5, 0.93, oz);
                batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                chunkGroup.add(batGroup);
                env.interactables.push(batGroup);

                return;
            }

            if ((localX + localZ) % 3 === 0 && random() > 0.6) {
                env._buildCeilingPanelLight(chunkGroup, hash, ox, oz, random, ctx.getLightMaterial, 0xd6cc98, 0xffeebb, 0.32, 0.8);
            }

            if (cellType === 2) {
                spawnDesk(ox - 0.8, oz - 0.8, 0, random() > 0.3);
                spawnDesk(ox + 0.8, oz - 0.8, 0, random() > 0.3);
                spawnDesk(ox - 0.8, oz + 0.8, 0, random() > 0.3);
                spawnDesk(ox + 0.8, oz + 0.8, 0, random() > 0.3);

                const cab = OfficeFurniture.buildFilingCabinet(env, random, ox, 0, oz, random() * Math.PI);
                addFurniture(cab);
                return;
            }

            if (cellType === 0) {
                const myBay = bays.find(b => Math.abs(b.x - localX) === 1 && Math.abs(b.z - localZ) === 1);
                if (myBay) {
                    const dx = myBay.x - localX;
                    const dz = myBay.z - localZ;
                    const yaw = Math.atan2(dx, dz);
                    spawnDesk(ox, oz, yaw, true);
                    return;
                }

                if (random() < 0.03) {
                    const cooler = OfficeFurniture.buildWaterCooler(env, ox, 0, oz, random() * Math.PI);
                    addFurniture(cooler);
                } else if (random() < 0.03) {
                    const obj = buildBreakerPodium(env, hash, random);
                    obj.position.set(ox, 0, oz);
                    obj.rotation.y = random() * Math.PI;
                    setPodiumBroken(obj);
                    addFurniture(obj);
                }
            }
        }
    };
};