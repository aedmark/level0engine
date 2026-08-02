/**
 * A collection of highly detailed, deterministic, multi-mesh prefabs (like Airlocks and Checkpoint Rooms).
 *
 * While most of the maze is generated via simple `buildWall` calls,
 * sometimes we want complex interactive set pieces. This file handles assembling those
 * complex prefabs (like `doorGroup` assemblies) and correctly registering them with the
 * physics system (`spatialGrid`) and interactivity manager (`interactiveDoors`, `airlocks`).
 */
export default class SetPieces {
    constructor(env) {
        this.env = env;
    }

    /**
     * Constructs a highly detailed checkpoint room (often used at sector boundaries).
     * This set piece includes a door frame, a functional hinged door, shelving, cartons,
     * and sometimes interactable items (batteries, almond water).
     *
     * @param {number} x - Global chunk X coordinate.
     * @param {number} z - Global chunk Z coordinate.
     * @param {number} localX - Local X coordinate within the chunk.
     * @param {number} localZ - Local Z coordinate within the chunk.
     * @param {boolean} flankV - If true, the room flanks vertically (along the Z axis); otherwise horizontally (X axis).
     * @param {Function} ckHash - Deterministic hash function for this chunk.
     * @param {Object} ctx - Builder context containing utility methods (buildWall, addGeometry, chunkGroup, hash).
     */
    buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx) {
        const env = this.env;
        const {buildWall, addGeometry, addFurniture, chunkGroup, hash, stagingMeshes, getLightMaterial} = ctx;
        const cs = env.cellSize;
        const cx0 = x * cs, cz0 = z * cs;
        const dir = flankV ? (localX === 6 ? 1 : -1) : (localZ === 6 ? 1 : -1);
        const bx = cx0 + (flankV ? dir * (cs / 2) : 0);
        const bz = cz0 + (flankV ? 0 : dir * (cs / 2));
        const doorW = 1.4, doorT = 0.1;
        const frameMat = env.annexFrameMat || env.metalMat;
        const leafMat = env.annexDoorMat || env.doorMat;
        if (flankV) {
            for (let s = -1; s <= 1; s += 2) {
                const stub = buildWall(0.25, 1.2, env.checkpointWallMat || env.structMat);
                stub.position.set(bx, 1.5, cz0 + s * 1.4);
                stub.userData.isEntityBlocker = true;
                addGeometry(stub);
            }
            const header = buildWall(0.25, 1.6, frameMat, 0.35);
            header.position.set(bx, 2.825, cz0);
            addGeometry(header);
            for (let s = -1; s <= 1; s += 2) {
                const jamb = new THREE.Mesh(env._boxGeo(0.3, 2.65, 0.1), frameMat);
                jamb.position.set(bx, 1.325, cz0 + s * 0.75);
                addGeometry(jamb);
            }
            const mark = new THREE.Mesh(env._boxGeo(0.04, 0.14, 1.5), env.hazardMat);
            mark.position.set(bx + dir * 0.15, 2.5, cz0);
            addGeometry(mark);
        } else {
            for (let s = -1; s <= 1; s += 2) {
                const stub = buildWall(1.2, 0.25, env.checkpointWallMat || env.structMat);
                stub.position.set(cx0 + s * 1.4, 1.5, bz);
                stub.userData.isEntityBlocker = true;
                addGeometry(stub);
            }
            const header = buildWall(1.6, 0.25, frameMat, 0.35);
            header.position.set(cx0, 2.825, bz);
            addGeometry(header);
            for (let s = -1; s <= 1; s += 2) {
                const jamb = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.3), frameMat);
                jamb.position.set(cx0 + s * 0.75, 1.325, bz);
                addGeometry(jamb);
            }
            const mark = new THREE.Mesh(env._boxGeo(1.5, 0.14, 0.04), env.hazardMat);
            mark.position.set(cx0, 2.5, bz + dir * 0.15);
            addGeometry(mark);
        }
        let doorMesh;
        if (flankV) {
            const g = env._cacheGeo('hingedDoor:Z', () => {
                const gg = new THREE.BoxGeometry(doorT, 2.65, doorW);
                gg.translate(doorT / 2, 0, doorW / 2);
                return gg;
            });
            doorMesh = new THREE.Mesh(g, leafMat);
            doorMesh.position.set(bx, 1.325, cz0 - doorW / 2);
            doorMesh.userData = {chunkHash: hash, closedRot: 0, currentRot: 0, useXApproach: true};
        } else {
            const g = env._cacheGeo('hingedDoor:X', () => {
                const gg = new THREE.BoxGeometry(doorW, 2.65, doorT);
                gg.translate(doorW / 2, 0, doorT / 2);
                return gg;
            });
            doorMesh = new THREE.Mesh(g, leafMat);
            doorMesh.position.set(cx0 - doorW / 2, 1.325, bz);
            doorMesh.userData = {chunkHash: hash, closedRot: 0, currentRot: 0};
        }
        doorMesh.castShadow = doorMesh.receiveShadow = true;
        chunkGroup.add(doorMesh);
        env.interactiveDoors.push(doorMesh);
        env.walls.push(doorMesh);
        doorMesh.updateMatrixWorld();
        const dBox = new THREE.Box3().setFromObject(doorMesh);
        dBox.chunkHash = hash;
        doorMesh.userData.box = dBox;
        env.spatialGrid.insert(dBox);
        const nx = flankV ? -dir : 0, nz = flankV ? 0 : -dir;
        const tx = flankV ? 0 : 1, tz = flankV ? 1 : 0;
        const at = (fwd, lat) => [cx0 + nx * fwd + tx * lat, cz0 + nz * fwd + tz * lat];
        const place = (mesh, px, py, pz) => {
            mesh.position.set(px, py, pz);
            addGeometry(mesh);
        };
        const cartonGeo = env._cacheGeo('ckRoomCarton', () => new THREE.BoxGeometry(0.5, 0.42, 0.5));
        const cartons = env.cartonMats || [env.fileBoxMat];
        const carton = (fwd, lat, y) => {
            const [px, pz] = at(fwd, lat);
            const m = new THREE.Mesh(cartonGeo, cartons[Math.floor(ckHash(localX + fwd, localZ + lat, 9) * cartons.length)]);
            place(m, px, y, pz);
        };
        const roll = ckHash(localX, localZ, 7);
        let lit = true;
        if (roll < 0.45) {
            for (const sy of [0.45, 1.15, 1.85, 2.5]) {
                const shelf = new THREE.Mesh(env._boxGeo(flankV ? 0.5 : 2.6, 0.05, flankV ? 2.6 : 0.5), env.metalMat);
                const [px, pz] = at(1.55, 0);
                place(shelf, px, sy, pz);
            }
            for (let p = -1; p <= 1; p += 2) {
                const post = new THREE.Mesh(env._boxGeo(0.06, 2.6, 0.06), env.metalMat);
                const [px, pz] = at(1.55, p * 1.1);
                place(post, px, 1.3, pz);
            }
            const spots = [[1.55, -0.9, 0.7], [1.55, 0.0, 0.7], [1.55, 0.9, 0.7], [1.55, -0.5, 1.4], [1.55, 0.6, 1.4], [1.0, 1.0, 0.37]];
            for (const [f, l, y] of spots) if (ckHash(localX + l * 3, localZ + f * 3, 4) > 0.25) carton(f, l, y);
        } else if (roll < 0.70) {
            const [px, pz] = at(1.3, -0.6);
            const pallet = env._buildPallet();
            pallet.position.set(px, 0, pz);
            addFurniture(pallet);
            for (let c = 0; c < 3; c++) for (let s = 0; s < 1 + Math.floor(ckHash(localX + c, localZ, c + 1) * 3); s++)
                carton(1.3 + (c - 1) * 0.0, -0.6 + (c - 1) * 0.45, 0.39 + s * 0.44);
            const drumGeo = env._cacheGeo('ckRoomDrum', () => new THREE.CylinderGeometry(0.29, 0.29, 0.92, 10));
            const drum = new THREE.Mesh(drumGeo, env.rustMat);
            const [dx, dz] = at(1.4, 1.1);
            place(drum, dx, 0.46, dz);
        } else if (roll < 0.87) {
            const [tx0, tz0] = at(1.4, 0);
            const tableTop = new THREE.Mesh(env._boxGeo(flankV ? 0.7 : 1.4, 0.06, flankV ? 1.4 : 0.7), env.metalMat);
            place(tableTop, tx0, 0.78, tz0);
            for (let lxs = -1; lxs <= 1; lxs += 2) for (let lzs = -1; lzs <= 1; lzs += 2) {
                const leg = new THREE.Mesh(env._boxGeo(0.05, 0.78, 0.05), env.metalMat);
                place(leg, tx0 + lxs * (flankV ? 0.28 : 0.6), 0.39, tz0 + lzs * (flankV ? 0.6 : 0.28));
            }
            if (!env.interactables) env.interactables = [];
            const drop = (prefab, type, fwd, lat) => {
                const [px, pz] = at(fwd, lat);
                const grp = new THREE.Group();
                grp.add(prefab.clone());
                const glow = new THREE.Mesh(env.glowGeo, env.glowMat);
                glow.scale.set(0.15, 0.15, 0.15);
                glow.position.y = 0.01;
                grp.add(glow);
                grp.position.set(px, 0.85, pz);
                grp.userData = {type, chunkHash: hash, active: true};
                grp.traverse(ch => {
                    ch.userData.chunkHash = hash;
                });
                chunkGroup.add(grp);
                env.interactables.push(grp);
            };
            drop(env.batteryPrefab, 'battery', 1.4, -0.3);
            if (ckHash(localX, localZ, 2) > 0.4) drop(env.almondPrefab, 'almond', 1.4, 0.3);
        } else {
            lit = false;
            const [sx, sz] = at(1.3, (ckHash(localX, localZ, 6) - 0.5) * 1.2);
            const seat = new THREE.Mesh(env._boxGeo(0.45, 0.06, 0.45), env.structMat);
            place(seat, sx, 0.45, sz);
            const back = new THREE.Mesh(env._boxGeo(flankV ? 0.06 : 0.45, 0.5, flankV ? 0.45 : 0.06), env.structMat);
            place(back, sx + nx * 0.2, 0.72, sz + nz * 0.2);
            for (let lxs = -1; lxs <= 1; lxs += 2) for (let lzs = -1; lzs <= 1; lzs += 2) {
                const leg = new THREE.Mesh(env._boxGeo(0.05, 0.45, 0.05), env.metalMat);
                place(leg, sx + lxs * 0.18, 0.22, sz + lzs * 0.18);
            }
        }
        if (lit) {
            this.buildCheckpointCageLight(
                chunkGroup, hash, stagingMeshes, cx0, cz0,
                flankV ? Math.PI / 2 : 0,
                ckHash(localX, localZ, 5) * 500,
                ckHash(localX, localZ, 8) > 0.75,
                getLightMaterial
            );
        }
    }

    /**
     * Constructs a central, decorative column for checkpoint areas, complete with
     * computer screens, cables, and structural supports.
     *
     * @param {number} x - Global chunk X coordinate.
     * @param {number} z - Global chunk Z coordinate.
     * @param {number} hash - The deterministic hash ID of the chunk.
     * @param {Object} ctx - Builder context (addGeometry, stagingMeshes).
     */
    buildCheckpointColumn(x, z, hash, ctx) {
        const env = this.env;
        const {addGeometry, stagingMeshes} = ctx;
        const cs = env.cellSize;
        const cx = x * cs, cz = z * cs;
        const decor = (m) => {
            m.userData.chunkHash = hash;
            m.updateMatrixWorld(true);
            stagingMeshes.push(m);
        };
        const sHash = (i) => {
            let h = (hash ^ Math.imul(i + 1, 2654435761)) >>> 0;
            h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
            return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
        };
        if (!env.laptopScreenMat) {
            env.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
            env.sharedAssets.add(env.laptopScreenMat.uuid);
        }
        const coreW = 1.3;
        const core = new THREE.Mesh(env._boxGeo(coreW, 3.0, coreW), env.baseHousingMat);
        core.position.set(cx, 1.5, cz);
        core.userData.isEntityBlocker = true;
        addGeometry(core);
        const plinth = new THREE.Mesh(env._boxGeo(1.5, 0.3, 1.5), env.metalMat);
        plinth.position.set(cx, 0.15, cz);
        decor(plinth);
        const cap = new THREE.Mesh(env._boxGeo(1.5, 0.2, 1.5), env.metalMat);
        cap.position.set(cx, 2.9, cz);
        decor(cap);
        const faces = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const rows = [0.8, 1.4, 2.0, 2.55];
        const colsOff = [-0.32, 0.32];
        let idx = 0;
        for (const [nx, nz] of faces) {
            const onZ = nz !== 0;
            for (const ry of rows) {
                for (const co of colsOff) {
                    idx++;
                    const live = sHash(idx) > 0.55;
                    const px = cx + (onZ ? co : nx * (coreW / 2 + 0.05));
                    const pz = cz + (onZ ? nz * (coreW / 2 + 0.05) : co);
                    const bezel = new THREE.Mesh(
                        onZ ? env._boxGeo(0.58, 0.5, 0.04) : env._boxGeo(0.04, 0.5, 0.58),
                        env.baseHousingMat);
                    bezel.position.set(
                        cx + (onZ ? co : nx * (coreW / 2 + 0.02)),
                        ry,
                        cz + (onZ ? nz * (coreW / 2 + 0.02) : co));
                    decor(bezel);
                    const screen = new THREE.Mesh(
                        onZ ? env._boxGeo(0.5, 0.42, 0.03) : env._boxGeo(0.03, 0.42, 0.5),
                        live ? env.laptopScreenMat : env.crtScreenMat);
                    screen.position.set(px, ry, pz);
                    decor(screen);
                }
            }
        }
        const trunk = new THREE.Mesh(env._boxGeo(0.22, 3.2, 0.22), env.metalMat);
        trunk.position.set(cx + 0.55, 1.6, cz + 0.55);
        decor(trunk);
        const cableGeo = env._cacheGeo('ckColCable', () => new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6));
        for (let i = 0; i < 6; i++) {
            const len = 1.2 + sHash(100 + i) * 1.6;
            const ang = (i / 6) * Math.PI * 2;
            const r = coreW / 2 + 0.14 + sHash(200 + i) * 0.1;
            const cable = new THREE.Mesh(cableGeo, i % 2 ? env.rustMat : env.metalMat);
            cable.position.set(cx + Math.cos(ang) * r, 3.0 - len / 2, cz + Math.sin(ang) * r);
            cable.scale.y = len;
            decor(cable);
        }
        const loopGeo = env._cacheGeo('ckColLoop', () => new THREE.TorusGeometry(0.4, 0.04, 6, 12));
        for (let i = 0; i < 3; i++) {
            const loop = new THREE.Mesh(loopGeo, env.rustMat);
            loop.position.set(cx + (sHash(300 + i) - 0.5) * 0.7, 0.34 + i * 0.05, cz + (sHash(310 + i) - 0.5) * 0.7);
            loop.rotation.x = Math.PI / 2;
            decor(loop);
        }
    }

    /**
     * Checkpoint's own ceiling fixture: a caged fluorescent tube, the "under surveillance"
     * cold-white security-corridor light this sector uses instead of the generic recessed panel
     * every other sector's hallways share (the same panel Checkpoint itself used to borrow) --
     * a wire guard cage over a long tube reads as a security/institutional fixture at a glance,
     * distinct from the flush square panel everywhere else. Used for both Checkpoint's hallway
     * cells (`CheckpointSector.js`) and its side rooms (`buildCheckpointRoom` below), so both
     * share one fixture design.
     *
     * Fully self-contained: registers its own meshes (via `stagingMeshes`, so identical parts
     * across every fixture in the chunk merge into a handful of `InstancedMesh`es the same way
     * ordinary wall geometry does) and its own `fixtureData` entry, so call sites only need to
     * supply a position, orientation, and a bit of per-fixture variance.
     *
     * @param {THREE.Group} chunkGroup - The root mesh group for the chunk.
     * @param {number} hash - The deterministic hash ID of the chunk.
     * @param {Array} stagingMeshes - This chunk's pre-instancing mesh buffer.
     * @param {number} px - World X position (fixture center).
     * @param {number} pz - World Z position (fixture center).
     * @param {number} rotY - Y rotation in radians; 0 runs the tube along X, PI/2 along Z --
     * callers pass whichever matches the hallway/room's own long axis.
     * @param {number} flickerOffset - Per-fixture flicker phase, for LumenGrid.
     * @param {boolean} isFaulty - Whether this fixture flickers/dims like a failing tube.
     * @param {Function} getLightMaterial - The chunk-cached `(colorHex, emissiveHex, isBroken)`
     * emissive-material pool from `StructureKit.createChunkHelpers` (`ctx.getLightMaterial`).
     * @param {number} [colorHex=0xd8e6ff] - Base color of the tube, overridable so other sectors
     * can borrow this fixture's geometry with their own light color (e.g. Server's red).
     * @param {number} [emissiveHex=0xc8ddff] - Emissive color of the tube.
     * @param {number} [intensity=0.975] - Base/target/current light intensity for this fixture.
     */
    buildCheckpointCageLight(chunkGroup, hash, stagingMeshes, px, pz, rotY, flickerOffset, isFaulty, getLightMaterial, colorHex = 0xd8e6ff, emissiveHex = 0xc8ddff, intensity = 0.975) {
        const env = this.env;
        const cageMat = env.pittedMetalMat || env.metalMat;
        const activeMat = getLightMaterial(colorHex, emissiveHex, isFaulty, true);
        const group = new THREE.Group();
        group.position.set(px, 2.96, pz);
        group.rotation.y = rotY;
        const housing = new THREE.Mesh(env._boxGeo(1.6, 0.06, 0.32), env.baseHousingMat);
        group.add(housing);
        const tubeGeo = env._cacheGeo('ckCageTube', () => {
            const g = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 10);
            g.rotateZ(Math.PI / 2);
            return g;
        });
        const tube = new THREE.Mesh(tubeGeo, activeMat);
        tube.position.y = -0.02;
        group.add(tube);
        const endCapGeo = env._boxGeo(0.08, 0.14, 0.36);
        for (const side of [-1, 1]) {
            const cap = new THREE.Mesh(endCapGeo, cageMat);
            cap.position.set(side * 0.76, -0.01, 0);
            group.add(cap);
        }
        const barGeo = env._boxGeo(0.03, 0.03, 0.34);
        const barCount = 5;
        for (let i = 0; i < barCount; i++) {
            const t = (i / (barCount - 1) - 0.5) * 1.3;
            const bar = new THREE.Mesh(barGeo, cageMat);
            bar.position.set(t, -0.06, 0);
            group.add(bar);
        }
        const railGeo = env._boxGeo(1.5, 0.03, 0.03);
        for (const side of [-1, 1]) {
            const rail = new THREE.Mesh(railGeo, cageMat);
            rail.position.set(0, -0.06, side * 0.16);
            group.add(rail);
        }
        group.updateMatrixWorld(true);
        group.traverse(child => {
            if (child.isMesh) {
                child.userData.chunkHash = hash;
                child.updateMatrixWorld(true);
                stagingMeshes.push(child);
            }
        });
        const brightIntensity = intensity;
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(px, 2.9, pz),
            flickerOffset: flickerOffset,
            material: activeMat,
            isFaulty: isFaulty,
            baseIntensity: brightIntensity,
            targetIntensity: brightIntensity,
            currentIntensity: brightIntensity
        });
    }

    /**
     * Spawns random debris or vehicles specific to the IMPOUND sector (cars, machines, tire stacks).
     * Used to populate large open areas.
     *
     * @param {number} px - Global world X position.
     * @param {number} pz - Global world Z position.
     * @param {string} kind - The type of item to build ('car', 'machine', or default tire stack).
     * @param {Object} ctx - Builder context (addFurniture, chunkGroup, hash, random).
     * @returns {boolean} True if the item was successfully built.
     */
    buildImpoundItem(px, pz, kind, ctx) {
        const env = this.env;
        const {addFurniture, chunkGroup, hash, random} = ctx;
        if (!env._impPaintMats) {
            const mk = (c) => {
                const m = new THREE.MeshStandardMaterial({color: c, roughness: 0.72, metalness: 0.25});
                env.sharedAssets.add(m.uuid);
                return m;
            };
            env._impPaintMats = [mk(0x7a2f28), mk(0x2f4a63), mk(0x8f9295), mk(0x3d523c), mk(0x9a8352), mk(0x6a3d2a)];
        }
        if (!env._impTireMat) {
            env._impTireMat = new THREE.MeshStandardMaterial({color: 0x161618, roughness: 0.95, metalness: 0.0});
            env.sharedAssets.add(env._impTireMat.uuid);
        }
        const glass = env.glassMat || env.crtScreenMat;
        const wheelGeo = env._cacheGeo('impWheel', () => new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14));
        const g = new THREE.Group();
        if (kind === 'car') {
            const paint = env._impPaintMats[Math.floor(random() * env._impPaintMats.length)];
            const along = random() > 0.5;
            const L = 3.4, W = 1.7;
            const lx = along ? L : W, lz = along ? W : L;
            const body = new THREE.Mesh(env._boxGeo(lx, 0.62, lz), paint);
            body.position.y = 0.6;
            const cabin = new THREE.Mesh(env._boxGeo(along ? L * 0.52 : W * 0.86, 0.56, along ? W * 0.86 : L * 0.52), paint);
            cabin.position.y = 1.12;
            const win = new THREE.Mesh(env._boxGeo(along ? L * 0.5 : W * 0.9, 0.42, along ? W * 0.9 : L * 0.5), glass);
            win.position.y = 1.13;
            g.add(body, win, cabin);
            const onBlocks = random() > 0.7;
            const halfL = L / 2 - 0.5, halfW = W / 2;
            for (const sl of [-1, 1]) for (const sw of [-1, 1]) {
                const wx = along ? sl * halfL : sw * halfW;
                const wz = along ? sw * halfW : sl * halfL;
                if (onBlocks && sl < 0) {
                    const blk = new THREE.Mesh(env._boxGeo(0.42, 0.3, 0.42), env.structMat);
                    blk.position.set(wx, 0.15, wz);
                    g.add(blk);
                } else {
                    const wheel = new THREE.Mesh(wheelGeo, env._impTireMat);
                    wheel.position.set(wx, 0.36, wz);
                    if (along) wheel.rotation.x = Math.PI / 2; else wheel.rotation.z = Math.PI / 2;
                    g.add(wheel);
                }
            }
            g.position.set(px + (random() - 0.5) * 0.2, 0, pz + (random() - 0.5) * 0.2);
            g.rotation.y = (random() - 0.5) * 0.15;
            addFurniture(g);
            if (!env._impoundIdleCarsInChunk) env._impoundIdleCarsInChunk = {};
            if (env._impoundIdleCarsInChunk[hash] === undefined) env._impoundIdleCarsInChunk[hash] = 0;
            const currentIdling = env._impoundIdleCarsInChunk[hash];
            let shouldIdle = false;
            if (currentIdling === 0) {
                shouldIdle = true;
            } else if (currentIdling < 3 && random() > 0.85) {
                shouldIdle = true;
            }
            if (shouldIdle) {
                if (!env.idlingCars) env.idlingCars = [];
                env._impoundIdleCarsInChunk[hash]++;
                env.idlingCars.push({
                    chunkHash: hash,
                    position: g.position.clone()
                });
            }
            if (random() > 0.4) {
                const tag = new THREE.Mesh(env.documentGeo, env.documentMat);
                const hoodSide = random() > 0.5 ? 1 : -1;
                const hoodLocalX = along ? hoodSide * halfL : 0;
                const hoodLocalZ = along ? 0 : hoodSide * halfL;
                const cosR = Math.cos(g.rotation.y), sinR = Math.sin(g.rotation.y);
                const tagX = g.position.x + (hoodLocalX * cosR + hoodLocalZ * sinR);
                const tagZ = g.position.z + (-hoodLocalX * sinR + hoodLocalZ * cosR);
                tag.position.set(tagX, 0.93, tagZ);
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
            return true;
        }
        if (kind === 'machine') {
            const skid = new THREE.Mesh(env._boxGeo(1.7, 0.16, 1.1), env.rustMat);
            skid.position.y = 0.08;
            const bodyM = new THREE.Mesh(env._boxGeo(1.4, 0.85, 0.9), env.metalMat);
            bodyM.position.y = 0.6;
            const tank = new THREE.Mesh(env._cacheGeo('impTank', () => new THREE.CylinderGeometry(0.34, 0.34, 1.3, 14)), env.metalMat);
            tank.rotation.z = Math.PI / 2;
            tank.position.set(0.05, 1.15, 0);
            const pipe = new THREE.Mesh(env._cacheGeo('impExhaust', () => new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8)), env.pipeMat || env.rustMat);
            pipe.position.set(-0.6, 1.25, 0.32);
            const ctrl = new THREE.Mesh(env._boxGeo(0.5, 0.45, 0.07), env.hazardMat);
            ctrl.position.set(0, 0.72, 0.5);
            g.add(skid, bodyM, tank, pipe, ctrl);
            g.position.set(px + (random() - 0.5) * 0.5, 0, pz + (random() - 0.5) * 0.5);
            g.rotation.y = random() * Math.PI * 2;
            addFurniture(g);
            return true;
        }
        const tGeo = env._cacheGeo('impTireStack', () => new THREE.CylinderGeometry(0.42, 0.42, 0.24, 16));
        const n = 3 + Math.floor(random() * 4);
        const bx = (random() - 0.5) * 1.2, bz = (random() - 0.5) * 1.2;
        for (let i = 0; i < n; i++) {
            const t = new THREE.Mesh(tGeo, env._impTireMat);
            t.position.set(bx + (random() - 0.5) * 0.06, 0.13 + i * 0.24, bz + (random() - 0.5) * 0.06);
            t.rotation.y = random() * Math.PI;
            g.add(t);
        }
        g.position.set(px, 0, pz);
        addFurniture(g);
        return true;
    }

    /**
     * Builds the four connecting hallways that link a chunk to its adjacent chunks.
     * Often called by sector builders to ensure the 7x7 cross pattern is open.
     *
     * @param {THREE.Group} chunkGroup - The root mesh group for the chunk.
     * @param {number} hash - The deterministic hash ID of the chunk.
     * @param {number} startX - Global start X coordinate of the chunk.
     * @param {number} startZ - Global start Z coordinate of the chunk.
     * @param {string} sectorId - The ID of the sector being built.
     * @param {Object} ctx - Builder context (markOccupied).
     * @param {boolean} needsFloor - Whether to generate floor tiles for the hallways.
     * @param {boolean} needsCeiling - Whether to generate ceiling tiles for the hallways.
     */
    buildEntranceHallways(chunkGroup, hash, startX, startZ, sectorId, ctx, needsFloor, needsCeiling) {
        const env = this.env;
        const edge = env.chunkSize - 1;
        const sides = [
            {spansX: true, boundary: 0, dir: 1},
            {spansX: true, boundary: edge, dir: -1},
            {spansX: false, boundary: 0, dir: 1},
            {spansX: false, boundary: edge, dir: -1}
        ];
        for (const side of sides) {
            const spansX = side.spansX;
            const outSign = side.dir === 1 ? -1 : 1;
            const cellAt = (local) => ({
                x: startX + (spansX ? 7 : local),
                z: startZ + (spansX ? local : 7)
            });
            const outer = cellAt(side.boundary);
            const inDir = side.dir;
            let innerCellX = outer.x, innerCellZ = outer.z;
            for (let cross = 7; cross <= 7; cross++) {
                for (let depth = 0; depth <= 1; depth++) {
                    const lx = spansX ? cross : (side.boundary + inDir * depth);
                    const lz = spansX ? (side.boundary + inDir * depth) : cross;
                    ctx.markOccupied(startX + lx, startZ + lz);
                    if (depth === 1) {
                        innerCellX = startX + lx;
                        innerCellZ = startZ + lz;
                    }
                    if (sectorId === "MAINTENANCE") {
                        const len = env.cellSize;
                        const tOff = (env.cellSize / 2) - 0.2;
                        if (spansX) {
                            const trim1 = new THREE.Mesh(env._boxGeo(len, 0.1, 0.4), env.hazardMat);
                            trim1.position.set((startX + lx) * env.cellSize, 0.050, (startZ + lz) * env.cellSize - tOff);
                            const trim2 = new THREE.Mesh(env._boxGeo(len, 0.1, 0.4), env.hazardMat);
                            trim2.position.set((startX + lx) * env.cellSize, 0.050, (startZ + lz) * env.cellSize + tOff);
                            env.addGeometry ? env.addGeometry(trim1) : chunkGroup.add(trim1);
                            env.addGeometry ? env.addGeometry(trim2) : chunkGroup.add(trim2);
                        } else {
                            const trim1 = new THREE.Mesh(env._boxGeo(0.4, 0.1, len), env.hazardMat);
                            trim1.position.set((startX + lx) * env.cellSize - tOff, 0.050, (startZ + lz) * env.cellSize);
                            const trim2 = new THREE.Mesh(env._boxGeo(0.4, 0.1, len), env.hazardMat);
                            trim2.position.set((startX + lx) * env.cellSize + tOff, 0.050, (startZ + lz) * env.cellSize);
                            env.addGeometry ? env.addGeometry(trim1) : chunkGroup.add(trim1);
                            env.addGeometry ? env.addGeometry(trim2) : chunkGroup.add(trim2);
                        }
                    }
                }
            }
            env._buildAirlock(chunkGroup, hash, outer.x * env.cellSize, outer.z * env.cellSize, spansX, sectorId, outSign);
            if (needsFloor || needsCeiling) {
                env._buildHallwaySegment(chunkGroup, hash, innerCellX * env.cellSize, innerCellZ * env.cellSize, spansX, needsFloor, needsCeiling, sectorId, false);
                env._buildHallwaySegment(chunkGroup, hash, outer.x * env.cellSize, outer.z * env.cellSize, spansX, needsFloor, needsCeiling, sectorId, true);
            }
        }
    }

    /**
     * Assembles a complex airlock structure with two sliding doors and an interaction switch.
     * The airlock logic manages cycling between sectors.
     *
     * @param {THREE.Group} chunkGroup - The root mesh group for the chunk.
     * @param {number} hash - The deterministic hash ID of the chunk.
     * @param {number} dcx - Center X position of the airlock.
     * @param {number} dcz - Center Z position of the airlock.
     * @param {boolean} spansX - If true, the airlock spans the X axis; otherwise it spans the Z axis.
     * @param {string} sectorId - The ID of the sector.
     * @param {number} outSign - Direction multiplier indicating which way is "out" (1 or -1).
     */
    buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign) {
        const env = this.env;
        if (!env.airlockRedMat) {
            env.airlockRedMat = new THREE.MeshBasicMaterial({color: 0xff2222});
            env.airlockGreenMat = new THREE.MeshBasicMaterial({color: 0x22ff44});
        }
        const inSign = outSign * -1;
        const chamberDepth = 2.8;
        const halfDepth = chamberDepth * 0.5;
        const fullDepth = chamberDepth + 0.7;
        const outerX = dcx - (spansX ? 0 : inSign * halfDepth);
        const outerZ = dcz - (spansX ? inSign * halfDepth : 0);
        const innerX = dcx + (spansX ? 0 : inSign * halfDepth);
        const innerZ = dcz + (spansX ? inSign * halfDepth : 0);
        const midX = dcx;
        const midZ = dcz;
        const CORRIDOR_HALF = 1.75;
        const PILLAR_REACH = 2.2;
        const SHOULDER_OUTER = 2.0;
        const addGeometry = (mesh) => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            chunkGroup.add(mesh);
            env.walls.push(mesh);
        };
        const bWall = (w, h, d, mat) => {
            const key = `door_${w}_${h}_${d}`;
            let geo = env.geoCache.get(key);
            if (!geo) {
                geo = new THREE.BoxGeometry(w, h, d);
                env.geoCache.set(key, geo);
                env.geoCache.set(geo.uuid, true);
            }
            return new THREE.Mesh(geo, mat);
        };
        const buildDoor = (cx, cz) => {
            const header = bWall(spansX ? 4.0 : 0.7, 0.8, spansX ? 0.7 : 4.0, env.metalMat);
            header.position.set(cx, 3.0, cz);
            addGeometry(header);
            if (!env._lightMatPool) env._lightMatPool = new Map();
            const barKey = '15007679_13495535_false';
            if (!env._lightMatPool.has(barKey)) {
                const mat = env.baseLightMat.clone();
                mat.color.setHex(0xeaf6ff);
                mat.emissive.setHex(0xcfe9ff);
                env.sharedAssets.add(mat.uuid);
                env._lightMatPool.set(barKey, mat);
            }
            const barMat = env._lightMatPool.get(barKey);
            const depthSign = spansX ? (Math.sign(cz - midZ) || outSign) : (Math.sign(cx - midX) || outSign);
            const barCx = spansX ? cx : cx + depthSign * 0.4;
            const barCz = spansX ? cz + depthSign * 0.4 : cz;
            const barHousing = new THREE.Mesh(env._boxGeo(spansX ? 1.6 : 0.3, 0.14, spansX ? 0.3 : 1.6), env.baseHousingMat);
            barHousing.position.set(barCx, 2.73, barCz);
            chunkGroup.add(barHousing);
            env.walls.push(barHousing);
            const barLens = new THREE.Mesh(env._boxGeo(spansX ? 1.4 : 0.16, 0.04, spansX ? 0.16 : 1.4), barMat);
            barLens.position.set(barCx, 2.64, barCz);
            chunkGroup.add(barLens);
            env.walls.push(barLens);
            env.fixtureData.push({
                chunkHash: hash,
                position: new THREE.Vector3(barCx, 2.64, barCz),
                isSpot: true,
                targetPos: new THREE.Vector3(cx, 0.0, cz),
                spotAngle: Math.PI / 5,
                spotPenumbra: 0.5,
                distance: 8.0,
                flickerOffset: Math.abs(cx * 37 + cz * 17) % 500,
                material: barMat,
                isFaulty: false,
                baseIntensity: 2.2,
                targetIntensity: 2.2,
                currentIntensity: 2.2
            });
            const doorGroup = new THREE.Group();
            doorGroup.position.set(cx, 0, cz);
            const getDoorGeo = (name, w, h, d) => {
                const key = `${name}_${spansX}_${w}_${h}_${d}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    geo = new THREE.BoxGeometry(w, h, d);
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return geo;
            };
            const panelGeo = spansX
                ? getDoorGeo('doorPanel', 1.98, 2.6, 0.24)
                : getDoorGeo('doorPanel', 0.24, 2.6, 1.98);
            const stripeGeo = spansX
                ? getDoorGeo('doorStripe', 0.14, 2.6, 0.26)
                : getDoorGeo('doorStripe', 0.26, 2.6, 0.14);
            const ribGeo = spansX
                ? getDoorGeo('doorRib', 1.98, 0.08, 0.28)
                : getDoorGeo('doorRib', 0.28, 0.08, 1.98);
            const mkPanel = (side) => {
                const edgeMat = env.blackIronMat || env.metalMat;
                const faceMat = env.titaniumMat || env.metalMat;
                const matArray = spansX
                    ? [side === -1 ? edgeMat : faceMat, side === 1 ? edgeMat : faceMat, faceMat, faceMat, faceMat, faceMat]
                    : [faceMat, faceMat, faceMat, faceMat, side === -1 ? edgeMat : faceMat, side === 1 ? edgeMat : faceMat];
                const p = new THREE.Mesh(panelGeo, matArray);
                if (spansX) p.position.set(side * 0.96, 1.3, 0);
                else p.position.set(0, 1.3, side * 0.96);
                const stripe = new THREE.Mesh(stripeGeo, env.hazardMat);
                if (spansX) stripe.position.set(-side * 0.92, 0, 0);
                else stripe.position.set(0, 0, -side * 0.92);
                p.add(stripe);
                for (let ry = -1; ry <= 1; ry += 2) {
                    const rib = new THREE.Mesh(ribGeo, env.pittedMetalMat || env.titaniumMat || env.metalMat);
                    rib.position.set(0, ry * 0.75, 0);
                    p.add(rib);
                }
                p.castShadow = p.receiveShadow = true;
                p.userData.chunkHash = hash;
                doorGroup.add(p);
                return p;
            };
            const panelL = mkPanel(-1);
            const panelR = mkPanel(1);
            chunkGroup.add(doorGroup);
            doorGroup.updateMatrixWorld(true);
            env.walls.push(panelL, panelR);
            const doorBox = new THREE.Box3();
            if (spansX) {
                doorBox.min.set(cx - 1.55, 0.0, cz - 0.25);
                doorBox.max.set(cx + 1.55, 2.6, cz + 0.25);
            } else {
                doorBox.min.set(cx - 0.25, 0.0, cz - 1.55);
                doorBox.max.set(cx + 0.25, 2.6, cz + 1.55);
            }
            doorBox.chunkHash = hash;
            doorBox.isEntityBlocker = true;
            env.spatialGrid.insert(doorBox);
            const slideAxis = spansX ? 'x' : 'z';
            doorGroup.userData = {
                chunkHash: hash,
                isSlider: true,
                isAirlockDoor: true,
                spansX: spansX,
                panels: [panelL, panelR],
                baseOffsets: [panelL.position[slideAxis], panelR.position[slideAxis]],
                signs: [-1, 1],
                slideDist: 1.55,
                progress: 0,
                target: 0,
                lastTarget: 0,
                box: doorBox,
                closedBox: doorBox.clone(),
                sectorId: sectorId,
                outSign: outSign
            };
            env.interactiveDoors.push({
                position: new THREE.Vector3(cx, 1.5, cz),
                userData: doorGroup.userData
            });
            return {group: doorGroup, data: doorGroup.userData, position: new THREE.Vector3(cx, 0, cz)};
        };
        const outerDoor = buildDoor(outerX, outerZ);
        const innerDoor = buildDoor(innerX, innerZ);
        const roofSpan = SHOULDER_OUTER * 2 + 0.2;
        const capMat = env.blackIronMat || env.structMat;
        const ceilBase = bWall(4.2, 0.4, 4.2, capMat);
        ceilBase.position.set(midX, 3.2, midZ);
        addGeometry(ceilBase);
        const bezel = bWall(3.2, 0.2, 3.2, capMat);
        bezel.position.set(midX, 2.9, midZ);
        addGeometry(bezel);
        const floorPlate = bWall(4.0, 0.04, 4.0, env.metalMat);
        floorPlate.position.set(midX, 0.02, midZ);
        addGeometry(floorPlate);
        const switchGroup = new THREE.Group();
        const switchBase = bWall(spansX ? 0.05 : 0.3, 0.4, spansX ? 0.3 : 0.05, env.metalMat);
        const switchButtonMat = new THREE.MeshBasicMaterial({color: 0x00ffcc});
        const switchButtonGeo = new THREE.BoxGeometry(spansX ? 0.06 : 0.1, 0.1, spansX ? 0.1 : 0.06);
        const switchButton = new THREE.Mesh(switchButtonGeo, switchButtonMat);
        const WALL_HALF_THICKNESS = 0.2;
        const SWITCH_OFFSET = CORRIDOR_HALF - WALL_HALF_THICKNESS - 0.025;
        if (spansX) {
            switchButton.position.set(-0.03, 0, 0);
            switchGroup.position.set(midX + SWITCH_OFFSET, 1.3, midZ);
        } else {
            switchButton.position.set(0, 0, -0.03);
            switchGroup.position.set(midX, 1.3, midZ + SWITCH_OFFSET);
        }
        switchGroup.add(switchBase, switchButton);
        switchGroup.userData = {isAirlockSwitch: true, entityOpen: false, chunkHash: hash};
        chunkGroup.add(switchGroup);
        if (!env.interactables) env.interactables = [];
        env.interactables.push(switchGroup);
        const airlock = {
            chunkHash: hash,
            spansX: spansX,
            sectorId: sectorId,
            outSign: outSign,
            outerDoor: outerDoor,
            innerDoor: innerDoor,
            switchGrp: switchGroup,
            chamberCenter: new THREE.Vector3(midX, 0, midZ),
            outerPos: outerDoor.position,
            innerPos: innerDoor.position,
            state: 'IDLE',
            cycleTimer: 0.0,
            cycleDuration: 2.5,
            openedFrom: null
        };
        if (!env.airlocks) env.airlocks = [];
        env.airlocks.push(airlock);
    }

    /**
     * Generates a simple modular hallway segment, including walls, floor, and ceiling.
     *
     * @param {THREE.Group} chunkGroup - The root mesh group for the chunk.
     * @param {number} hash - The deterministic hash ID of the chunk.
     * @param {number} cx - Center X position.
     * @param {number} cz - Center Z position.
     * @param {boolean} spansX - If true, the hallway walls run along the X axis.
     * @param {boolean} needsFloor - Whether to generate a floor tile.
     * @param {boolean} needsCeiling - Whether to generate a ceiling tile.
     * @param {string} sectorId - The ID of the sector (affects ceiling material).
     * @param {boolean} buildWalls - Default true; if false, only floor/ceiling are generated.
     */
    buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling, sectorId, buildWalls = true) {
        const env = this.env;
        const addGeometry = (mesh) => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            box.chunkHash = hash;
            box.isEntityBlocker = true;
            env.spatialGrid.insert(box);
            chunkGroup.add(mesh);
            env.walls.push(mesh);
        };
        if (buildWalls) {
            const wallKey = `hallwayWall_${spansX}`;
            let wallGeo = env.geoCache.get(wallKey);
            if (!wallGeo) {
                wallGeo = new THREE.BoxGeometry(spansX ? 0.4 : env.cellSize, 3.0, spansX ? env.cellSize : 0.4);
                env.geoCache.set(wallKey, wallGeo);
                env.geoCache.set(wallGeo.uuid, true);
            }
            for (const side of [-1, 1]) {
                const wall = new THREE.Mesh(wallGeo, env.structMat);
                if (spansX) wall.position.set(cx + side * 1.75, 1.5, cz);
                else wall.position.set(cx, 1.5, cz + side * 1.75);
                addGeometry(wall);
            }
        }
        if (needsFloor || needsCeiling) {
            const floorKey = 'hallwayFloorCeil';
            let floorGeo = env.geoCache.get(floorKey);
            if (!floorGeo) {
                floorGeo = new THREE.PlaneGeometry(env.cellSize, env.cellSize);
                env.geoCache.set(floorKey, floorGeo);
                env.geoCache.set(floorGeo.uuid, true);
            }
            if (needsFloor) {
                const floor = new THREE.Mesh(floorGeo, env.tileMat);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(cx, 0.01, cz);
                addGeometry(floor);
            }
            if (needsCeiling) {
                // Hall-scaled variant: this plane is one 4-unit cell, not the 64-unit chunk.
                let mat = env.ceilMatHall || env.ceilMat;
                let isChasm = sectorId === "CHASM";
                if (isChasm) mat = env.blackIronMat || env.structMat;
                else if (sectorId === "IMPOUND") mat = env.impoundCeilingMat || env.structMat;
                else if (sectorId === "INCINERATOR") mat = env.incinCeilingMat || env.structMat;
                else if (sectorId === "ANNEX") mat = env.annexCeilingMat || env.structMat;
                if (isChasm) {
                    const ceilGeo = new THREE.BoxGeometry(
                        spansX ? 3.9 : env.cellSize,
                        0.4,
                        spansX ? env.cellSize : 3.9
                    );
                    const ceil = new THREE.Mesh(ceilGeo, mat);
                    ceil.position.set(cx, 3.2, cz);
                    addGeometry(ceil);
                    const bezelGeo = new THREE.BoxGeometry(
                        spansX ? 2.8 : env.cellSize,
                        0.2,
                        spansX ? env.cellSize : 2.8
                    );
                    const bezel = new THREE.Mesh(bezelGeo, mat);
                    bezel.position.set(cx, 2.9, cz);
                    addGeometry(bezel);
                } else {
                    const ceil = new THREE.Mesh(floorGeo, mat);
                    ceil.rotation.x = Math.PI / 2;
                    ceil.position.set(cx, 2.99, cz);
                    addGeometry(ceil);
                }
            }
        }
    }

    /**
     * Uses a recursive backtracker algorithm to carve out a maze pattern within a chunk.
     *
     * Used to also force the entire center row/column open -- a literal plus-shaped
     * clearing -- and punch 20 extra random single-cell holes on top of that, to guarantee
     * every consumer got an entrance path without having to reason about the maze's own
     * connectivity. In practice that meant every sector built on this generator (Archive,
     * Server, Maintenance, Impound, Chasm, Clinic, Incinerator) showed the exact same giant
     * open cross in the same spot every time -- boring and predictable well before anyone
     * would notice it's structurally identical between chunks. Checkpoint is the one place a
     * literal crossroads is actually the intended design (see CheckpointSector.js's own
     * hand-built corridor-and-rooms layout, generated independently of this function
     * entirely); everywhere else should read as an actual maze.
     *
     * Connectivity doesn't need the cross at all: a recursive backtracker visits every
     * reachable cell of matching parity from its start by construction, so (7,7) and every
     * odd/odd room cell out to the edge of its search space are already guaranteed connected
     * to each other. The only genuine gap is the one-cell distance between the outermost
     * odd/odd room cell and the boundary-adjacent even cell that the algorithm's fixed step
     * size never reaches on two of the four sides -- bridged with four single-width spurs
     * below, one drilled straight in from each possible doorway approach until it merges with
     * the carved interior, instead of blowing the whole center open.
     *
     * @param {Function} randomFn - A deterministic random number generator.
     * @returns {boolean[][]} A 2D array representing the maze grid, where false is a path and true is a wall.
     */
    generateSectorMaze(randomFn) {
        const env = this.env;
        const maze = Array(env.chunkSize).fill(undefined).map(() => Array(env.chunkSize).fill(true));
        const carve = (cx, cz) => {
            maze[cx][cz] = false;
            const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
            dirs.sort(() => randomFn() - 0.5);
            for (let [dx, dz] of dirs) {
                const nx = cx + dx, nz = cz + dz;
                if (nx > 0 && nx < env.chunkSize - 1 && nz > 0 && nz < env.chunkSize - 1 && maze[nx][nz]) {
                    maze[cx + dx / 2][cz + dz / 2] = false;
                    carve(nx, nz);
                }
            }
        };
        carve(7, 7);
        const drillToCarved = (x0, z0, dx, dz) => {
            let x = x0, z = z0;
            while (x > 0 && x < env.chunkSize - 1 && z > 0 && z < env.chunkSize - 1) {
                const alreadyOpen = !maze[x][z];
                maze[x][z] = false;
                if (alreadyOpen) return;
                x += dx;
                z += dz;
            }
        };
        drillToCarved(7, 1, 0, 1);
        drillToCarved(7, env.chunkSize - 2, 0, -1);
        drillToCarved(1, 7, 1, 0);
        drillToCarved(env.chunkSize - 2, 7, -1, 0);
        return maze;
    }
}