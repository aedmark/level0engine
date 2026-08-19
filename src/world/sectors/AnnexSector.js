import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import * as OfficeFurniture from '../OfficeFurniture.js';
import * as ClinicFurniture from '../ClinicFurniture.js';
import { attachPropGlow } from '../PropGlow.js';
import { PROP_GLOW } from '../NarrativeProps.js';

/**
 * Grid cell types for Annex:
 * 0 = Open corridor / hallway
 * 1 = Solid wall
 * 2 = Research Pod interior (tiny writers desk + 60's terminal)
 * 3 = Code-Locked Pod Doorway (leads to locked room with keypad)
 * 4 = Locked Room interior (exit key + battery)
 * 5 = Unlocked Pod Doorway (custom wooden door with glass panel)
 */
const generateAnnexChunk = (env, hash, random) => {
    if (!env._annexChunkGrids) env._annexChunkGrids = new Map();
    if (env._annexChunkGrids.has(hash)) return env._annexChunkGrids.get(hash);

    const size = env.chunkSize; // 15
    const grid = Array.from({length: size}, () => new Array(size).fill(1));

    // 1. OPEN ARTERIAL CORRIDORS FOR AIRLOCK ACCESS
    // North-South corridor (connects (7,0) and (7,14) airlocks)
    for (let z = 1; z <= 13; z++) {
        grid[7][z] = 0;
    }
    // East-West corridor (connects (0,7) and (14,7) airlocks)
    for (let x = 1; x <= 13; x++) {
        grid[x][7] = 0;
    }
    // Central junction hub (6..8, 6..8)
    for (let x = 6; x <= 8; x++) {
        for (let z = 6; z <= 8; z++) {
            grid[x][z] = 0;
        }
    }

    // 2. DEFINE COZY RESEARCH PODS IN QUADRANTS
    // Each pod has: room cells (interior), a doorway cell, and connecting corridor cells
    const podConfigs = [
        // NW Quadrant Pod
        {
            interior: [{x: 3, z: 3}, {x: 3, z: 4}],
            door: {x: 5, z: 3, spansX: false, approachX: true},
            corridors: [{x: 4, z: 3}, {x: 6, z: 3}],
            deskPos: {x: 3, z: 3},
            deskYaw: Math.PI / 2
        },
        // NE Quadrant Pod
        {
            interior: [{x: 11, z: 3}, {x: 11, z: 4}],
            door: {x: 9, z: 3, spansX: false, approachX: true},
            corridors: [{x: 10, z: 3}, {x: 8, z: 3}],
            deskPos: {x: 11, z: 3},
            deskYaw: -Math.PI / 2
        },
        // SW Quadrant Pod
        {
            interior: [{x: 3, z: 11}, {x: 3, z: 10}],
            door: {x: 5, z: 11, spansX: false, approachX: true},
            corridors: [{x: 4, z: 11}, {x: 6, z: 11}],
            deskPos: {x: 3, z: 11},
            deskYaw: Math.PI / 2
        },
        // SE Quadrant Pod
        {
            interior: [{x: 11, z: 11}, {x: 11, z: 10}],
            door: {x: 9, z: 11, spansX: false, approachX: true},
            corridors: [{x: 10, z: 11}, {x: 8, z: 11}],
            deskPos: {x: 11, z: 11},
            deskYaw: -Math.PI / 2
        },
        // North Pod
        {
            interior: [{x: 3, z: 1}],
            door: {x: 3, z: 2, spansX: true, approachX: false},
            corridors: [{x: 4, z: 2}, {x: 5, z: 2}, {x: 6, z: 2}, {x: 7, z: 2}],
            deskPos: {x: 3, z: 1},
            deskYaw: 0
        },
        // South Pod
        {
            interior: [{x: 11, z: 13}],
            door: {x: 11, z: 12, spansX: true, approachX: false},
            corridors: [{x: 10, z: 12}, {x: 9, z: 12}, {x: 8, z: 12}, {x: 7, z: 12}],
            deskPos: {x: 11, z: 13},
            deskYaw: Math.PI
        }
    ];

    // Determine if this chunk spawns the locked supervisor room
    let lockedRoomIndex = -1;
    if (!env.lockedRoomSpawned) {
        env.lockedRoomSpawned = true;
        lockedRoomIndex = Math.floor(random() * podConfigs.length);
    }

    const pods = [];
    const doors = [];
    let lockedRoom = null;

    podConfigs.forEach((cfg, idx) => {
        const isLocked = (idx === lockedRoomIndex);

        // Carve corridors connecting the pod door to main hallways
        cfg.corridors.forEach(c => {
            if (grid[c.x][c.z] === 1) grid[c.x][c.z] = 0;
        });

        // Set doorway cell
        if (isLocked) {
            grid[cfg.door.x][cfg.door.z] = 3;
            let approachSign = 1;
            if (cfg.door.spansX) {
                approachSign = (cfg.interior[0].z < cfg.door.z) ? 1 : -1;
            } else {
                approachSign = (cfg.interior[0].x < cfg.door.x) ? 1 : -1;
            }
            lockedRoom = {
                doorX: cfg.door.x,
                doorZ: cfg.door.z,
                spansX: cfg.door.spansX,
                approachSign: approachSign,
                deskPos: cfg.deskPos,
                deskYaw: cfg.deskYaw
            };
        } else {
            grid[cfg.door.x][cfg.door.z] = 5;
            doors.push({
                x: cfg.door.x,
                z: cfg.door.z,
                spansX: cfg.door.spansX,
                approachX: cfg.door.approachX
            });
        }

        // Set pod interior cells
        cfg.interior.forEach(cell => {
            grid[cell.x][cell.z] = isLocked ? 4 : 2;
        });

        if (!isLocked) {
            pods.push({
                deskPos: cfg.deskPos,
                deskYaw: cfg.deskYaw
            });
        }
    });

    const data = { grid, pods, doors, lockedRoom };
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
            const { grid, pods, doors, lockedRoom } = chunkData;

            const ox = x * env.cellSize, oz = z * env.cellSize;
            const cellType = grid[localX][localZ];

            // Materials initialization
            if (!env.annexCrtGreenMat) {
                env.annexCrtGreenMat = new THREE.MeshBasicMaterial({color: 0x38ff77});
                env.sharedAssets.add(env.annexCrtGreenMat.uuid);
            }
            if (!env.annexCrtAmberMat) {
                env.annexCrtAmberMat = new THREE.MeshBasicMaterial({color: 0xffb833});
                env.sharedAssets.add(env.annexCrtAmberMat.uuid);
            }
            if (!env.annexCrtDimMat) {
                env.annexCrtDimMat = new THREE.MeshStandardMaterial({
                    color: 0x0f1c14,
                    roughness: 0.85,
                    metalness: 0.15
                });
                env.sharedAssets.add(env.annexCrtDimMat.uuid);
            }
            if (!env.annexDeskWoodMat) {
                env.annexDeskWoodMat = new THREE.MeshStandardMaterial({
                    color: 0x381d0f, roughness: 0.45, metalness: 0.12
                });
                env.sharedAssets.add(env.annexDeskWoodMat.uuid);
            }
            if (!env.annexBrassMat) {
                env.annexBrassMat = new THREE.MeshStandardMaterial({
                    color: 0xd4aa44, roughness: 0.3, metalness: 0.85
                });
                env.sharedAssets.add(env.annexBrassMat.uuid);
            }
            if (!env.exitKeyMat) {
                env.exitKeyMat = new THREE.MeshStandardMaterial({
                    color: 0xb8912f, roughness: 0.32, metalness: 0.95,
                    emissive: 0x3a2c08, emissiveIntensity: 0.6
                });
                env.sharedAssets.add(env.exitKeyMat.uuid);
            }
            if (!env.keypadBodyMat) {
                env.keypadBodyMat = new THREE.MeshStandardMaterial({
                    color: 0x181a1d, roughness: 0.35, metalness: 0.85
                });
                env.sharedAssets.add(env.keypadBodyMat.uuid);
            }
            if (!env.keypadLedMat) {
                env.keypadLedMat = new THREE.MeshBasicMaterial({color: 0xff3333});
                env.sharedAssets.add(env.keypadLedMat.uuid);
            }
            if (!env.keypadScreenMat) {
                env.keypadScreenMat = new THREE.MeshBasicMaterial({color: 0x22eeaa});
                env.sharedAssets.add(env.keypadScreenMat.uuid);
            }
            if (!env.keypadBtnMat) {
                env.keypadBtnMat = new THREE.MeshStandardMaterial({
                    color: 0xd0d4d8, roughness: 0.25, metalness: 0.9
                });
                env.sharedAssets.add(env.keypadBtnMat.uuid);
            }

            /**
             * Builds an authentic 1960s-style CRT computer terminal
             */
            const buildRetroTerminal = (px, py, pz, yaw, docPrefix) => {
                const termGroup = new THREE.Group();
                const isAmber = random() > 0.65;
                const screenMat = isAmber ? env.annexCrtAmberMat : env.annexCrtGreenMat;
                const glowColor = isAmber ? 0xffaa2b : 0x38ff77;

                // 1. Main bulky CRT housing (beige / olive / dark bakelite)
                const caseGeo = env._cacheGeo('annexCrtCase', () => new THREE.BoxGeometry(0.46, 0.38, 0.42));
                const caseMesh = new THREE.Mesh(caseGeo, env.baseHousingMat);
                caseMesh.position.set(0, 0.19, -0.04);
                termGroup.add(caseMesh);

                // 2. Beveled CRT screen frame / bezel
                const bezelGeo = env._cacheGeo('annexCrtBezel', () => new THREE.BoxGeometry(0.42, 0.32, 0.05));
                const bezelMesh = new THREE.Mesh(bezelGeo, env.baseHousingMat);
                bezelMesh.position.set(0, 0.19, 0.18);
                termGroup.add(bezelMesh);

                // 3. Curved glowing phosphor screen
                const screenGeo = env._cacheGeo('annexCrtScreen', () => new THREE.PlaneGeometry(0.34, 0.25));
                const screenMesh = new THREE.Mesh(screenGeo, screenMat);
                screenMesh.position.set(0, 0.19, 0.208);
                termGroup.add(screenMesh);

                // 4. Rear cooling vents
                for (let v = -0.12; v <= 0.12; v += 0.06) {
                    const ventMesh = new THREE.Mesh(env._boxGeo(0.32, 0.015, 0.01), env.annexBrassMat);
                    ventMesh.position.set(0, 0.34, v - 0.04);
                    termGroup.add(ventMesh);
                }

                // 5. Angled typewriter keyboard deck
                const kbDeckGeo = env._cacheGeo('annexKbDeck', () => {
                    const g = new THREE.BoxGeometry(0.44, 0.04, 0.24);
                    g.rotateX(0.18);
                    return g;
                });
                const kbDeck = new THREE.Mesh(kbDeckGeo, env.baseHousingMat);
                kbDeck.position.set(0, 0.035, 0.28);
                termGroup.add(kbDeck);

                // 6. Stepped mechanical key block
                const keyBlockGeo = env._cacheGeo('annexKeyBlock', () => {
                    const g = new THREE.BoxGeometry(0.36, 0.02, 0.16);
                    g.rotateX(0.18);
                    return g;
                });
                const keyBlock = new THREE.Mesh(keyBlockGeo, env.annexBrassMat || env.metalMat);
                keyBlock.position.set(0, 0.06, 0.27);
                termGroup.add(keyBlock);

                // 7. Status dials & toggle switches
                const switchMesh = new THREE.Mesh(env._boxGeo(0.02, 0.03, 0.02), env.hazardMat);
                switchMesh.position.set(0.16, 0.07, 0.20);
                termGroup.add(switchMesh);

                const dialMesh = new THREE.Mesh(env._boxGeo(0.03, 0.02, 0.03), env.annexBrassMat);
                dialMesh.position.set(-0.16, 0.065, 0.20);
                termGroup.add(dialMesh);

                termGroup.position.set(px, py, pz);
                termGroup.rotation.y = yaw;

                // Lore Dump registration
                const docId = docPrefix + Math.floor(random() * 9999);
                termGroup.userData = {
                    type: 'document',
                    chunkHash: hash,
                    active: true,
                    zone: 'ANNEX',
                    docId: docId,
                    dimOnRead: true,
                    onDim: () => {
                        screenMesh.material = env.annexCrtDimMat;
                    }
                };

                chunkGroup.add(termGroup);
                termGroup.updateMatrixWorld(true);

                // Attach dynamic phosphor prop glow
                attachPropGlow(env, termGroup, hash, {
                    color: glowColor,
                    intensity: 0.95,
                    distance: 2.8,
                    offset: [0, 0.25, 0.2],
                    isSpot: true,
                    targetOffset: [0, -0.2, 0.8],
                    spotAngle: Math.PI / 2.2,
                    spotPenumbra: 0.5,
                    flickerOffset: random() * 500
                });

                env._registerInteractable(termGroup, hash);
                return termGroup;
            };

            /**
             * Builds a tiny vintage writer's desk with tapered legs, brass feet, and drawer
             */
            const spawnWritersDeskAndTerminal = (px, pz, yaw, isLockedRoom = false) => {
                const deskGroup = new THREE.Group();
                const deskW = 1.35, deskD = 0.75, deskH = 0.74;

                // 1. Solid Mahogany desktop
                const topGeo = env._cacheGeo('annexDeskTop', () => new THREE.BoxGeometry(deskW, 0.045, deskD));
                const topMesh = new THREE.Mesh(topGeo, env.annexDeskWoodMat);
                topMesh.position.set(0, deskH, 0);
                deskGroup.add(topMesh);

                // 2. Brass rim accent
                const rimGeo = env._cacheGeo('annexDeskRim', () => new THREE.BoxGeometry(deskW + 0.02, 0.015, deskD + 0.02));
                const rimMesh = new THREE.Mesh(rimGeo, env.annexBrassMat);
                rimMesh.position.set(0, deskH - 0.015, 0);
                deskGroup.add(rimMesh);

                // 3. Tapered legs with brass ferrules
                const legW = 0.045;
                const legOffsets = [
                    [-deskW / 2 + 0.08, -deskD / 2 + 0.08],
                    [deskW / 2 - 0.08, -deskD / 2 + 0.08],
                    [-deskW / 2 + 0.08, deskD / 2 - 0.08],
                    [deskW / 2 - 0.08, deskD / 2 - 0.08]
                ];

                legOffsets.forEach(([lx, lz]) => {
                    const legMesh = new THREE.Mesh(env._boxGeo(legW, deskH - 0.045, legW), env.annexDeskWoodMat);
                    legMesh.position.set(lx, (deskH - 0.045) / 2, lz);
                    deskGroup.add(legMesh);

                    const ferruleMesh = new THREE.Mesh(env._boxGeo(legW + 0.01, 0.08, legW + 0.01), env.annexBrassMat);
                    ferruleMesh.position.set(lx, 0.04, lz);
                    deskGroup.add(ferruleMesh);
                });

                // 4. Central drawer box and brass pull knob
                const drawerMesh = new THREE.Mesh(env._boxGeo(0.55, 0.12, deskD - 0.1), env.annexDeskWoodMat);
                drawerMesh.position.set(0, deskH - 0.08, 0);
                deskGroup.add(drawerMesh);

                const knobMesh = new THREE.Mesh(env._boxGeo(0.04, 0.04, 0.03), env.annexBrassMat);
                knobMesh.position.set(0, deskH - 0.08, deskD / 2 + 0.01);
                deskGroup.add(knobMesh);

                // 5. Matching Mid-Century Chair
                const chairSeatH = 0.44;
                const chairGroup = new THREE.Group();
                const seatMesh = new THREE.Mesh(env._boxGeo(0.48, 0.04, 0.46), env.annexDeskWoodMat);
                seatMesh.position.set(0, chairSeatH, 0);
                chairGroup.add(seatMesh);

                for (let cx of [-0.2, 0.2]) {
                    for (let cz of [-0.18, 0.18]) {
                        const cLeg = new THREE.Mesh(env._boxGeo(0.035, chairSeatH, 0.035), env.annexDeskWoodMat);
                        cLeg.position.set(cx, chairSeatH / 2, cz);
                        chairGroup.add(cLeg);
                    }
                }
                const backrestMesh = new THREE.Mesh(env._boxGeo(0.46, 0.32, 0.03), env.annexDeskWoodMat);
                backrestMesh.position.set(0, chairSeatH + 0.22, 0.22);
                chairGroup.add(backrestMesh);

                chairGroup.position.set(0, 0, 0.65);
                deskGroup.add(chairGroup);

                deskGroup.position.set(px, 0, pz);
                deskGroup.rotation.y = yaw;
                addFurniture(deskGroup);

                // Multi-format Lore Dump selection for the pod terminal
                const loreFormats = ['PC_', 'NOTE_', 'LAPTOP_', 'TAPE_', 'LOG_'];
                const chosenPrefix = loreFormats[Math.floor(random() * loreFormats.length)];

                // Spawn the 60's style retro terminal sitting directly on the desk
                buildRetroTerminal(px, deskH + 0.0225, pz, yaw, chosenPrefix);

                // Small decorative desk accessory (paper sheets)
                if (random() > 0.4) {
                    const doc = new THREE.Mesh(env.documentGeo, env.documentMat);
                    const docOffset = (random() > 0.5 ? 0.38 : -0.38);
                    doc.position.set(
                        px + Math.cos(yaw) * docOffset,
                        deskH + 0.024,
                        pz - Math.sin(yaw) * docOffset
                    );
                    doc.rotation.y = yaw + (random() - 0.5) * 0.4;
                    chunkGroup.add(doc);
                }
            };

            /**
             * Helper to build a custom wooden door with glass panel (cellType 3 or 5)
             */
            const spawnPodDoorway = (spansX, isCodeLocked = false, approachSign = 1) => {
                const gapW = 1.4;
                const sideW = (env.cellSize - gapW) / 2;

                const buildSecurityKeypad = (doorMesh, px, py, pz, rotY) => {
                    const padGroup = new THREE.Group();

                    // 1. Wall mounting plate
                    const mountGeo = env._cacheGeo('secKeypadMount', () => new THREE.BoxGeometry(0.24, 0.38, 0.02));
                    const mountMesh = new THREE.Mesh(mountGeo, env.baseHousingMat || env.structMat);
                    padGroup.add(mountMesh);

                    // 2. Beveled Keypad Housing
                    const bodyGeo = env._cacheGeo('secKeypadBody', () => new THREE.BoxGeometry(0.20, 0.34, 0.04));
                    const bodyMesh = new THREE.Mesh(bodyGeo, env.keypadBodyMat);
                    bodyMesh.position.z = 0.02;
                    padGroup.add(bodyMesh);

                    // 3. Status LED Bar (Red locked indicator)
                    const ledGeo = env._cacheGeo('secKeypadLed', () => new THREE.BoxGeometry(0.15, 0.015, 0.015));
                    const ledMesh = new THREE.Mesh(ledGeo, env.keypadLedMat);
                    ledMesh.position.set(0, 0.135, 0.042);
                    padGroup.add(ledMesh);

                    // 4. Backlit LCD Screen
                    const screenGeo = env._cacheGeo('secKeypadScreen', () => new THREE.PlaneGeometry(0.14, 0.055));
                    const screenMesh = new THREE.Mesh(screenGeo, env.keypadScreenMat);
                    screenMesh.position.set(0, 0.08, 0.043);
                    padGroup.add(screenMesh);

                    // 5. 3x4 Number Keypad Buttons
                    const btnGeo = env._cacheGeo('secKeypadBtn', () => new THREE.BoxGeometry(0.034, 0.026, 0.012));
                    const btnRows = 4, btnCols = 3;
                    const startX = -0.048, startY = 0.022, spX = 0.048, spY = 0.038;

                    for (let r = 0; r < btnRows; r++) {
                        for (let c = 0; c < btnCols; c++) {
                            const btn = new THREE.Mesh(btnGeo, env.keypadBtnMat);
                            btn.position.set(startX + c * spX, startY - r * spY, 0.044);
                            padGroup.add(btn);
                        }
                    }

                    padGroup.position.set(px, py, pz);
                    padGroup.rotation.y = rotY;
                    padGroup.userData = {
                        type: 'keypad',
                        chunkHash: hash,
                        active: true,
                        codeLocked: true,
                        doorMesh: doorMesh
                    };
                    padGroup.traverse((ch) => ch.userData.chunkHash = hash);
                    chunkGroup.add(padGroup);
                    padGroup.updateMatrixWorld(true);

                    // Subtle red status glow around the keypad
                    attachPropGlow(env, padGroup, hash, {
                        color: 0xff3333,
                        intensity: 0.6,
                        distance: 1.8,
                        offset: [0, 0, 0.15],
                        isSpot: false,
                        flickerOffset: random() * 500
                    });

                    env._registerInteractable(padGroup, hash);
                    return padGroup;
                };

                if (spansX) {
                    for (let s = -1; s <= 1; s += 2) {
                        const side = buildWall(sideW, env.cellSize, env.annexWallMat || env.sharedWallMat);
                        side.position.set(ox + s * (gapW / 2 + sideW / 2), 1.5, oz);
                        side.userData.isEntityBlocker = true;
                        addGeometry(side);
                    }
                    const header = buildWall(gapW, env.cellSize, env.annexFrameMat || env.annexWallMat, 0.35);
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
                    doorMesh.userData = { chunkHash: hash, closedRot: 0, currentRot: 0, codeLocked: isCodeLocked };
                    doorMesh.castShadow = doorMesh.receiveShadow = true;
                    chunkGroup.add(doorMesh);
                    env.interactiveDoors.push(doorMesh);
                    env.walls.push(doorMesh);
                    doorMesh.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(doorMesh);
                    dBox.chunkHash = hash;
                    doorMesh.userData.box = dBox;
                    env.spatialGrid.insert(dBox);

                    if (isCodeLocked) {
                        // Mounted on the side wall of the doorway opening on the corridor approach side
                        buildSecurityKeypad(doorMesh, ox + 0.68, 1.35, oz + approachSign * 0.28, -Math.PI / 2);
                    }
                } else {
                    for (let s = -1; s <= 1; s += 2) {
                        const side = buildWall(env.cellSize, sideW, env.annexWallMat || env.sharedWallMat);
                        side.position.set(ox, 1.5, oz + s * (gapW / 2 + sideW / 2));
                        side.userData.isEntityBlocker = true;
                        addGeometry(side);
                    }
                    const header = buildWall(env.cellSize, gapW, env.annexFrameMat || env.annexWallMat, 0.35);
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
                    doorMesh.userData = {
                        chunkHash: hash, closedRot: 0, currentRot: 0, codeLocked: isCodeLocked, useXApproach: true
                    };
                    doorMesh.castShadow = doorMesh.receiveShadow = true;
                    chunkGroup.add(doorMesh);
                    env.interactiveDoors.push(doorMesh);
                    env.walls.push(doorMesh);
                    doorMesh.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(doorMesh);
                    dBox.chunkHash = hash;
                    doorMesh.userData.box = dBox;
                    env.spatialGrid.insert(dBox);

                    if (isCodeLocked) {
                        // Mounted on the side wall of the doorway opening on the corridor approach side
                        buildSecurityKeypad(doorMesh, ox + approachSign * 0.28, 1.35, oz + 0.68, Math.PI);
                    }
                }
            };

            // --- CELL TYPE HANDLING ---

            // Solid Wall
            if (cellType === 1) {
                const wall = buildWall(env.cellSize, env.cellSize, env.annexWallMat || env.sharedWallMat);
                wall.position.set(ox, 1.5, oz);
                wall.userData.isEntityBlocker = true;
                addGeometry(wall);
                return;
            }

            // Unlocked Custom Wooden Doorway to Pod
            if (cellType === 5) {
                const doorInfo = doors.find(d => d.x === localX && d.z === localZ);
                const spansX = doorInfo ? doorInfo.spansX : false;
                spawnPodDoorway(spansX, false);
                return;
            }

            // Code-Locked Doorway to Locked Pod Room
            if (cellType === 3) {
                const spansX = lockedRoom ? lockedRoom.spansX : false;
                const approachSign = lockedRoom ? lockedRoom.approachSign : 1;
                spawnPodDoorway(spansX, true, approachSign);
                return;
            }

            // Locked Room Interior (Writer's desk + 60's terminal + Exit Key + Battery)
            if (cellType === 4) {
                if (lockedRoom && lockedRoom.deskPos.x === localX && lockedRoom.deskPos.z === localZ) {
                    spawnWritersDeskAndTerminal(ox, oz, lockedRoom.deskYaw, true);

                    // Exit Key on the writer's desk
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
                    keyGroup.position.set(ox + 0.35, 0.77, oz);
                    keyGroup.rotation.y = random() * Math.PI;
                    keyGroup.userData = {type: 'exit_key', chunkHash: hash, active: true};
                    chunkGroup.add(keyGroup);
                    keyGroup.updateMatrixWorld(true);
                    env._registerInteractable(keyGroup, hash);

                    // Battery next to the desk
                    const batGroup = new THREE.Group();
                    batGroup.add(env.batteryPrefab.clone());
                    const bGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                    bGlow.scale.set(0.15, 0.15, 0.15);
                    bGlow.position.y = 0.01;
                    batGroup.add(bGlow);
                    batGroup.position.set(ox - 0.45, 0.77, oz);
                    batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                    chunkGroup.add(batGroup);
                    env.interactables.push(batGroup);
                }

                // Dedicated warm overhead lighting in the locked pod
                env._buildCeilingPanelLight(chunkGroup, hash, ox, oz, random, ctx.getLightMaterial, 0xd8c898, 0xffe8aa, 0.4, 0.9);
                return;
            }

            // Research Pod Interior (Writer's Desk + 60's Retro Terminal)
            if (cellType === 2) {
                const myPod = pods.find(p => p.deskPos.x === localX && p.deskPos.z === localZ);
                if (myPod) {
                    spawnWritersDeskAndTerminal(ox, oz, myPod.deskYaw, false);
                }
                // Dedicated warm ceiling light inside each pod
                env._buildCeilingPanelLight(chunkGroup, hash, ox, oz, random, ctx.getLightMaterial, 0xd8c898, 0xffe8aa, 0.38, 0.85);
                return;
            }

            // Open Corridor (cellType 0)
            if (cellType === 0) {
                // Ceiling lighting along corridors & junctions
                if ((localX + localZ) % 4 === 0 && random() > 0.4) {
                    env._buildCeilingPanelLight(chunkGroup, hash, ox, oz, random, ctx.getLightMaterial, 0xd6cc98, 0xffeebb, 0.32, 0.8);
                }

                // Aesthetic touches in corridor alcoves
                if (localX === 7 && localZ === 7) {
                    // Central junction potted plant
                    const plant = OfficeFurniture.buildPottedPlant(env, ox, 0, oz);
                    addFurniture(plant);
                } else if ((localX === 6 || localX === 8) && (localZ === 6 || localZ === 8) && random() > 0.7) {
                    const filing = OfficeFurniture.buildFilingCabinet(env, random, ox, 0, oz, random() * Math.PI);
                    addFurniture(filing);
                }
            }
        }
    };
};