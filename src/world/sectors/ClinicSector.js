import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {placeSectorPaper} from '../NarrativeProps.js';
import {
    buildClinicBed, buildIVPole, buildHeartMonitor, buildBedpan,
    buildWheelchair, buildWaitingBench, buildWaterFountain
} from '../ClinicFurniture.js';
import * as OfficeFurniture from '../OfficeFurniture.js';

/**
 * [ROLE] Defines the generation logic for the "Clinic" sector.
 * [WHY] Populates medical environments with beds, IV poles, and monitors to provide environmental storytelling.
 * [STATE] Stateless factory. Returns a builder object that modifies the world generation environment.
 * [DEPENDS] Imports specific furniture builders from `ClinicFurniture.js` and utilizes `env` for materials.
 */
export const ClinicSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildChair,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;
    return {
        id: "CLINIC",
        foundationMat: env.clinicFloorMat || env.clinicMat,
        ceilingMat: env.clinicCeilingMat || env.clinicMat,
        build: (x, z, localX, localZ, maze) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.clinicWallMat || env.sharedWallMat, "CLINIC")) return;
            const cx0 = x * env.cellSize, cz0 = z * env.cellSize;
            const wallAt = (lx, lz) => (lx < 0 || lx > 15 || lz < 0 || lz > 15) ? true : (maze ? maze[lx][lz] === true : false);
            const cardinalDirs = [{dx: 0, dz: -1}, {dx: 0, dz: 1}, {dx: -1, dz: 0}, {dx: 1, dz: 0}];
            const isRoomApproach = (lx, lz) => {
                for (const d of cardinalDirs) {
                    const nx = lx + d.dx, nz = lz + d.dz;
                    if (!wallAt(nx, nz)) continue;
                    const nOpen = cardinalDirs.filter((d2) => !wallAt(nx + d2.dx, nz + d2.dz));
                    if (nOpen.length === 1 && nOpen[0].dx === -d.dx && nOpen[0].dz === -d.dz) return true;
                }
                return false;
            };
            const RUN = env.cellSize - 0.1, RAIL_Y = 0.95, FACE = env.cellSize / 2 + 0.025;
            const geo = (key, w, h, d) => {
                let g = env.geoCache.get(key);
                if (!g) {
                    g = new THREE.BoxGeometry(w, h, d);
                    env.geoCache.set(key, g);
                    env.geoCache.set(g.uuid, true);
                }
                return g;
            };
            const stage = (mesh) => {
                mesh.userData.chunkHash = hash;
                mesh.updateMatrixWorld(true);
                stagingMeshes.push(mesh);
            };
            const railFaces = (px, pz, lx, lz, at) => {
                const mat = env.clinicRailMat;
                if (!mat) return;
                for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    if (at(lx + dx, lz + dz)) continue;
                    const alongZ = dx !== 0;
                    const rail = new THREE.Mesh(
                        geo(alongZ ? 'clinicRailZ' : 'clinicRailX',
                            alongZ ? 0.05 : RUN, 0.15, alongZ ? RUN : 0.05),
                        mat
                    );
                    rail.position.set(px + dx * FACE, RAIL_Y, pz + dz * FACE);
                    stage(rail);
                    for (const end of [-1, 1]) {
                        const cap = new THREE.Mesh(
                            geo(alongZ ? 'clinicRailCapZ' : 'clinicRailCapX',
                                alongZ ? 0.028 : 0.07, 0.11, alongZ ? 0.07 : 0.028),
                            mat
                        );
                        cap.position.set(
                            px + dx * (FACE - 0.011) + (alongZ ? 0 : end * (RUN / 2 - 0.035)),
                            RAIL_Y,
                            pz + dz * (FACE - 0.011) + (alongZ ? end * (RUN / 2 - 0.035) : 0)
                        );
                        stage(cap);
                    }
                }
            };
            const buildClinicRoom = (door) => {
                const half = env.cellSize / 2;
                const wallH = 3.0;
                const wallMat = env.clinicWallMat || env.sharedWallMat;
                const isNSDoor = door.dz !== 0;
                const dirs = [{dx: 0, dz: -1}, {dx: 0, dz: 1}, {dx: -1, dz: 0}, {dx: 1, dz: 0}];
                for (const d of dirs) {
                    if (d.dx === door.dx && d.dz === door.dz) continue;
                    const isNS = d.dz !== 0;
                    const wall = buildWall(isNS ? env.cellSize : 0.15, isNS ? 0.15 : env.cellSize, wallMat, wallH);
                    wall.position.set(cx0 + d.dx * half, wallH / 2, cz0 + d.dz * half);
                    addGeometry(wall);
                }
                const doorHalfW = 1.0;
                const stubLen = half - doorHalfW;
                const stubOffset = doorHalfW + stubLen / 2;
                for (const side of [-1, 1]) {
                    const stub = buildWall(isNSDoor ? stubLen : 0.15, isNSDoor ? 0.15 : stubLen, wallMat, wallH);
                    if (isNSDoor) stub.position.set(cx0 + side * stubOffset, wallH / 2, cz0 + door.dz * half);
                    else stub.position.set(cx0 + door.dx * half, wallH / 2, cz0 + side * stubOffset);
                    addGeometry(stub);
                }
                const header = buildWall(isNSDoor ? doorHalfW * 2 : 0.2, isNSDoor ? 0.2 : doorHalfW * 2, wallMat, 0.5);
                header.position.set(cx0 + door.dx * half, wallH - 0.25, cz0 + door.dz * half);
                addGeometry(header);

                if (!env.clinicCurtainMat) {
                    env.clinicCurtainMat = new THREE.MeshStandardMaterial({
                        color: 0x8fb9ae, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide,
                        transparent: true, opacity: 0.92
                    });
                    env.sharedAssets.add(env.clinicCurtainMat.uuid);
                }
                const railGeo = geo(
                    isNSDoor ? 'clinicCurtainRailNS' : 'clinicCurtainRailEW',
                    isNSDoor ? doorHalfW * 2 + 0.1 : 0.03,
                    0.03,
                    isNSDoor ? 0.03 : doorHalfW * 2 + 0.1
                );
                const rail = new THREE.Mesh(railGeo, env.metalMat);
                rail.position.set(cx0 + door.dx * half, 2.5, cz0 + door.dz * half);
                stage(rail);
                const panelH = 2.4, panelW = 0.55;
                const panelGeoObj = env._planeGeo(panelW, panelH);
                for (const side of [-1, 1]) {
                    for (let p = 0; p < 2; p++) {
                        const panel = new THREE.Mesh(panelGeoObj, env.clinicCurtainMat);
                        const baseOffset = doorHalfW - panelW * 0.35 + p * 0.05;
                        const jitter = (p === 0 ? 0.1 : -0.06) * side;
                        if (isNSDoor) {
                            panel.position.set(cx0 + side * baseOffset, 1.3, cz0 + door.dz * (half + 0.03));
                            panel.rotation.y = jitter;
                        } else {
                            panel.position.set(cx0 + door.dx * (half + 0.03), 1.3, cz0 + side * baseOffset);
                            panel.rotation.y = Math.PI / 2 + jitter;
                        }
                        stage(panel);
                    }
                }

                const forward = {x: -door.dx, z: -door.dz};
                const right = {x: forward.z, z: -forward.x};
                const toWorld = (fwd, rgt) => ({
                    x: cx0 + forward.x * fwd + right.x * rgt,
                    z: cz0 + forward.z * fwd + right.z * rgt
                });
                const roomYaw = Math.atan2(forward.x, forward.z);

                const bedPos = toWorld(0.6, 0);
                const bed = buildClinicBed(env);
                bed.position.set(bedPos.x, 0, bedPos.z);
                bed.rotation.y = roomYaw;
                addFurniture(bed);

                if (random() < 0.75) {
                    const ivPos = toWorld(0.85, 0.72);
                    const iv = buildIVPole(env);
                    iv.position.set(ivPos.x, 0, ivPos.z);
                    iv.rotation.y = roomYaw + (random() - 0.5) * 0.6;
                    addFurniture(iv);
                }
                if (random() < 0.7) {
                    const monPos = toWorld(0.85, -0.72);
                    const mon = buildHeartMonitor(env);
                    mon.position.set(monPos.x, 0, monPos.z);
                    mon.rotation.y = roomYaw + Math.PI;
                    addFurniture(mon);
                }
                if (random() < 0.6) {
                    const bpPos = toWorld(-0.55, 0.55);
                    const bp = buildBedpan(env);
                    bp.rotation.y = random() * Math.PI * 2;
                    bp.position.set(bpPos.x, 0, bpPos.z);
                    addFurniture(bp);
                }
                if (random() < 0.85) {
                    env._buildCeilingPanelLight(chunkGroup, hash, cx0, cz0, random, ctx.getLightMaterial, 0xe6f0ee, 0xd6e4dc, 0.9, 0.6);
                }
            };
            if (maze && maze[localX][localZ]) {
                const dirs = [{dx: 0, dz: -1}, {dx: 0, dz: 1}, {dx: -1, dz: 0}, {dx: 1, dz: 0}];
                const openDirs = dirs.filter((d) => !wallAt(localX + d.dx, localZ + d.dz));
                if (openDirs.length === 1 && random() < 0.6) {
                    buildClinicRoom(openDirs[0]);
                    return;
                }
                const wall = buildWall(env.cellSize, env.cellSize, env.clinicWallMat || env.sharedWallMat, 3.0);
                wall.position.set(cx0, 1.5, cz0);
                addGeometry(wall);
                railFaces(cx0, cz0, localX, localZ, wallAt);
                return;
            }
            placeSectorPaper(env, ctx, "CLINIC", cx0, cz0);
            const gateApproach = (localX === 7 && (localZ <= 2 || localZ >= 13)) || (localZ === 7 && (localX <= 2 || localX >= 13));
            if (!gateApproach && (localX + localZ) % 2 === 0 && random() > 0.5) {
                env._buildCeilingPanelLight(chunkGroup, hash, cx0, cz0, random, ctx.getLightMaterial, 0xe6f0ee, 0xd6e4dc, 0.8, 0.6);
            }

            const roomApproach = isRoomApproach(localX, localZ);
            if (!gateApproach && !roomApproach) {
                const wallDirs = [{dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1}]
                    .filter((d) => wallAt(localX + d.dx, localZ + d.dz));
                if (wallDirs.length) {
                    const roll = random();
                    if (roll > 0.9) {
                        const d = wallDirs[Math.floor(random() * wallDirs.length)];
                        const rotY = Math.atan2(-d.dx, -d.dz);
                        const fountain = buildWaterFountain(env);
                        fountain.position.set(cx0 + d.dx * (FACE - 0.15), 0, cz0 + d.dz * (FACE - 0.15));
                        fountain.rotation.y = rotY;
                        addFurniture(fountain);
                    } else if (roll > 0.78) {
                        const d = wallDirs[Math.floor(random() * wallDirs.length)];
                        const rotY = Math.atan2(-d.dx, -d.dz);
                        const bench = buildWaitingBench(env);
                        bench.position.set(cx0 + d.dx * (FACE - 0.42), 0, cz0 + d.dz * (FACE - 0.42));
                        bench.rotation.y = rotY;
                        addFurniture(bench);
                    }
                }
            }
            if (!gateApproach && !roomApproach && random() > 0.93) {
                if (random() > 0.5) {
                    const wheelchair = buildWheelchair(env);
                    wheelchair.position.set(cx0 + (random() - 0.5) * 2.4, 0, cz0 + (random() - 0.5) * 2.4);
                    wheelchair.rotation.y = random() * Math.PI * 2;
                    addFurniture(wheelchair);
                } else {
                    const plant = OfficeFurniture.buildPottedPlant(env, cx0 + (random() - 0.5) * 2.4, 0, cz0 + (random() - 0.5) * 2.4);
                    addFurniture(plant);
                }
            }
        }
    };
};