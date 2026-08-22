export default class SetPieces {
    constructor(env) {
        this.env = env;
    }

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
        const decor = (m) => {
            m.userData.chunkHash = hash;
            m.updateMatrixWorld(true);
            stagingMeshes.push(m);
        };
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
            mark.position.set(bx + dir * 0.15, 2.73, cz0);
            decor(mark);
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
            mark.position.set(cx0, 2.73, bz + dir * 0.15);
            decor(mark);
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
            const pallet = this.buildPallet();
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

    buildCheckpointCageLight(chunkGroup, hash, stagingMeshes, px, pz, rotY, flickerOffset, isFaulty, getLightMaterial, colorHex = 0xd8e6ff, emissiveHex = 0xc8ddff, intensity = 0.975) {
        const env = this.env;
        const cageMat = env.structuralSteelMat || env.pittedMetalMat || env.metalMat;
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

    buildEntranceHallways(chunkGroup, hash, startX, startZ, sectorId, ctx, needsFloor, needsCeiling, maze) {
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
            if (sectorId === "CHASM") {
                if (!env.blackIronMat) env.blackIronMat = new THREE.MeshStandardMaterial({
                    color: 0x151515,
                    roughness: 0.7,
                    metalness: 0.9
                });
                const railOffset = env.cellSize / 2 - 0.2;
                const railLen = env.cellSize;
                const icx = innerCellX * env.cellSize;
                const icz = innerCellZ * env.cellSize;
                const innerLocalX = innerCellX - startX;
                const innerLocalZ = innerCellZ - startZ;
                const checkVoid = (nx, nz) => {
                    if (nx < 0 || nx >= env.chunkSize || nz < 0 || nz >= env.chunkSize) return false;
                    return !maze || maze[nx][nz];
                };
                const buildEntranceRail = (rx, rz, isZAligned) => {
                    const top = new THREE.Mesh(
                        env._boxGeo(isZAligned ? 0.08 : railLen, 0.08, isZAligned ? railLen : 0.08),
                        env.blackIronMat
                    );
                    top.position.set(rx, 1.15, rz);
                    ctx.addGeometry(top);
                    const mid = new THREE.Mesh(
                        env._boxGeo(isZAligned ? 0.05 : railLen, 0.05, isZAligned ? railLen : 0.05),
                        env.blackIronMat
                    );
                    mid.position.set(rx, 0.6, rz);
                    ctx.addGeometry(mid);
                    for (let p = -railLen / 2 + 0.5; p < railLen / 2; p += 1.5) {
                        const post = new THREE.Mesh(env._boxGeo(0.08, 1.2, 0.08), env.blackIronMat);
                        post.position.set(isZAligned ? rx : rx + p, 0.6, isZAligned ? rz + p : rz);
                        ctx.addGeometry(post);
                    }
                };
                if (spansX) {
                    if (checkVoid(innerLocalX - 1, innerLocalZ)) buildEntranceRail(icx - railOffset, icz, true);
                    if (checkVoid(innerLocalX + 1, innerLocalZ)) buildEntranceRail(icx + railOffset, icz, true);
                    if (checkVoid(innerLocalX, innerLocalZ + inDir)) buildEntranceRail(icx, icz + inDir * railOffset, false);
                } else {
                    if (checkVoid(innerLocalX, innerLocalZ - 1)) buildEntranceRail(icx, icz - railOffset, false);
                    if (checkVoid(innerLocalX, innerLocalZ + 1)) buildEntranceRail(icx, icz + railOffset, false);
                    if (checkVoid(innerLocalX + inDir, innerLocalZ)) buildEntranceRail(icx + inDir * railOffset, icz, true);
                }
            }
            env._buildAirlock(chunkGroup, hash, outer.x * env.cellSize, outer.z * env.cellSize, spansX, sectorId, outSign);
            if (needsFloor || needsCeiling) {
                env._buildHallwaySegment(chunkGroup, hash, innerCellX * env.cellSize, innerCellZ * env.cellSize, spansX, needsFloor, needsCeiling, sectorId, false);
                env._buildHallwaySegment(chunkGroup, hash, outer.x * env.cellSize, outer.z * env.cellSize, spansX, needsFloor, needsCeiling, sectorId, false);
            }
        }
    }

    buildBlastDoor(chunkGroup, hash, cx, cz, spansX, opts = {}) {
        const env = this.env;
        const sectorId = opts.sectorId !== undefined ? opts.sectorId : null;
        const outSign = opts.outSign !== undefined ? opts.outSign : 1;
        const isAirlockDoor = opts.isAirlockDoor !== false;
        if (!env.airlockSealMat) {
            env.airlockSealMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.9, metalness: 0.1});
        }
        const doorMat = env.stainlessDoorMat || env.titaniumMat || env.stainlessMat || env.metalMat;
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
        const getDoorGeoR = (name, w, h, d) => {
            const key = `${name}_${spansX}_${w}_${h}_${d}_R`;
            let geo = env.geoCache.get(key);
            if (!geo) {
                geo = new THREE.BoxGeometry(w, h, d);
                const uv = geo.attributes.uv;
                for (let i = 0; i < uv.count; i++) {
                    if (spansX) {
                        uv.setX(i, 1 - uv.getX(i));
                    } else {
                        uv.setX(i, 1 - uv.getX(i));
                    }
                }
                env.geoCache.set(key, geo);
                env.geoCache.set(geo.uuid, true);
            }
            return geo;
        };
        const panelGeoR = spansX
            ? getDoorGeoR('doorPanel', 1.98, 2.6, 0.24)
            : getDoorGeoR('doorPanel', 0.24, 2.6, 1.98);
        const stripeGeo = spansX
            ? getDoorGeo('doorStripe', 0.12, 2.6, 0.26)
            : getDoorGeo('doorStripe', 0.26, 2.6, 0.12);
        const mkPanel = (side) => {
            const mats = [doorMat, doorMat, doorMat, doorMat, doorMat, doorMat];
            if (spansX) mats[side === -1 ? 0 : 1] = env.airlockSealMat;
            else mats[side === -1 ? 4 : 5] = env.airlockSealMat;
            const geo = side === -1 ? panelGeo : panelGeoR;
            const p = new THREE.Mesh(geo, mats);
            if (spansX) p.position.set(side * 0.96, 1.3, 0);
            else p.position.set(0, 1.3, side * 0.96);
            const stripe = new THREE.Mesh(stripeGeo, env.hazardMat);
            if (spansX) stripe.position.set(-side * 0.92, 0, 0);
            else stripe.position.set(0, 0, -side * 0.92);
            p.add(stripe);
            p.castShadow = false;
            p.receiveShadow = true;
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
            isAirlockDoor: isAirlockDoor,
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
            outSign: outSign,
            openRadiusSq: opts.openRadiusSq
        };
        env.interactiveDoors.push({
            position: new THREE.Vector3(cx, 1.5, cz),
            userData: doorGroup.userData
        });
        return {group: doorGroup, data: doorGroup.userData, position: new THREE.Vector3(cx, 0, cz)};
    }
    buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign) {
        const env = this.env;
        if (!env.airlockRedMat) {
            env.airlockRedMat = new THREE.MeshBasicMaterial({color: 0xff2222});
            env.airlockGreenMat = new THREE.MeshBasicMaterial({color: 0x22ff44});
        }
        if (!env.airlockSealMat) {
            env.airlockSealMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.9, metalness: 0.1});
        }
        const shellMat = env.stainlessMat || env.titaniumMat || env.metalMat;
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
        const buildDoor = (cx, cz) => this.buildBlastDoor(
            chunkGroup, hash, cx, cz, spansX,
            {sectorId: sectorId, outSign: outSign, isAirlockDoor: true}
        );
        const outerDoor = buildDoor(outerX, outerZ);
        const innerDoor = buildDoor(innerX, innerZ);
        const SHELL_HALF = 1.875;
        const SHELL_SPAN = 4.0;
        const SHELL_H = 3.0;
        const WALL_T = 0.28;
        const DOOR_TOP = 2.6;

        const along = (n) => spansX ? [0, n] : [n, 0];
        const shellPiece = (w, h, d, x, y, z, mat, solid) => {
            const mesh = bWall(w, h, d, mat);
            mesh.position.set(x, y, z);
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            mesh.userData.chunkHash = hash;
            mesh.updateMatrixWorld(true);
            chunkGroup.add(mesh);
            env.walls.push(mesh);
            if (solid) {
                const box = new THREE.Box3(
                    new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
                    new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
                );
                box.chunkHash = hash;
                box.isEntityBlocker = true;
                env.spatialGrid.insert(box);
            }
            return mesh;
        };

        for (const side of [-1, 1]) {
            const [ox, oz] = spansX ? [side * SHELL_HALF, 0] : [0, side * SHELL_HALF];
            shellPiece(
                spansX ? WALL_T : SHELL_SPAN, SHELL_H, spansX ? SHELL_SPAN : WALL_T,
                midX + ox, SHELL_H / 2, midZ + oz, shellMat, true
            );
        }

        const ROOF_BOTTOM = 2.97;
        shellPiece(SHELL_SPAN, 0.06, SHELL_SPAN, midX, 0.03, midZ, shellMat, false);
        shellPiece(SHELL_SPAN, 0.10, SHELL_SPAN, midX, ROOF_BOTTOM + 0.05, midZ, shellMat, false);

        const HEADER_SPAN = 3.47;
        for (const end of [-1, 1]) {
            const [ox, oz] = along(end * halfDepth);
            shellPiece(
                spansX ? HEADER_SPAN : 0.5, ROOF_BOTTOM - DOOR_TOP, spansX ? 0.5 : HEADER_SPAN,
                midX + ox, (DOOR_TOP + ROOF_BOTTOM) / 2, midZ + oz, shellMat, false
            );
        }

        const cageStaging = [];
        const getLightMaterial = (colorHex, emissiveHex, isBroken = false, plain = false) => {
            if (!env._lightMatPool) env._lightMatPool = new Map();
            const key = `${colorHex}_${emissiveHex}_${isBroken}_${plain}_`;
            if (!env._lightMatPool.has(key)) {
                const base = (isBroken ? env.baseBrokenLightMat : env.baseLightMat) || env.baseLightMat;
                const mat = base.clone();
                mat.color.setHex(colorHex);
                mat.emissive.setHex(emissiveHex);
                if (plain) {
                    mat.map = null;
                    mat.emissiveMap = null;
                }
                env.sharedAssets.add(mat.uuid);
                env._lightMatPool.set(key, mat);
            }
            return env._lightMatPool.get(key);
        };
        this.buildCheckpointCageLight(
            chunkGroup, hash, cageStaging, midX, midZ, spansX ? 0 : Math.PI / 2,
            0, false, getLightMaterial, 0xeaf6ff, 0xcfe9ff, 0.45
        );
        for (const mesh of cageStaging) {
            const world = mesh.matrixWorld.clone();
            mesh.castShadow = false;
            chunkGroup.add(mesh);
            world.decompose(mesh.position, mesh.quaternion, mesh.scale);
            env.walls.push(mesh);
        }

        const switchGroup = new THREE.Group();
        const switchBase = bWall(spansX ? 0.05 : 0.3, 0.4, spansX ? 0.3 : 0.05, shellMat);
        const switchButtonMat = new THREE.MeshBasicMaterial({color: 0xff2222});
        const switchButtonGeo = new THREE.BoxGeometry(spansX ? 0.06 : 0.1, 0.1, spansX ? 0.1 : 0.06);
        const switchButton = new THREE.Mesh(switchButtonGeo, switchButtonMat);
        const WALL_HALF_THICKNESS = WALL_T;
        const SWITCH_OFFSET = CORRIDOR_HALF - WALL_HALF_THICKNESS - 0.025;
        if (spansX) {
            switchButton.position.set(-0.03, 0, 0);
            switchGroup.position.set(midX + SWITCH_OFFSET, 1.3, midZ);
        } else {
            switchButton.position.set(0, 0, -0.03);
            switchGroup.position.set(midX, 1.3, midZ + SWITCH_OFFSET);
        }
        switchGroup.add(switchBase, switchButton);
        switchGroup.userData = {isAirlockSwitch: true, entityOpen: false, chunkHash: hash, button: switchButton};
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

        if (env.chunkManager && env.chunkManager._airlockApron) {
            const {clearX, clearZ} = env.chunkManager._airlockApron(airlock);
            const affectedHashes = new Set();
            for (const cx of clearX) {
                for (const cz of clearZ) {
                    affectedHashes.add(`${Math.floor(cx / env.chunkSize)},${Math.floor(cz / env.chunkSize)}`);
                }
            }
            const zeroScale = new THREE.Vector3(0, 0, 0);
            const defaultQuat = new THREE.Quaternion();
            const dummyMat = new THREE.Matrix4();
            const dummyPos = new THREE.Vector3();
            for (const adjHash of affectedHashes) {
                if (adjHash === hash) continue;
                const adjGroup = env.activeChunks.get(adjHash);
                if (adjGroup) {
                    for (const child of adjGroup.children) {
                        if (child.isInstancedMesh) {
                            let updated = false;
                            for (let i = 0; i < child.count; i++) {
                                child.getMatrixAt(i, dummyMat);
                                dummyPos.setFromMatrixPosition(dummyMat);
                                const wox = Math.round(dummyPos.x / env.cellSize);
                                const woz = Math.round(dummyPos.z / env.cellSize);
                                if (clearX.includes(wox) && clearZ.includes(woz)) {
                                    dummyMat.compose(dummyPos, defaultQuat, zeroScale);
                                    child.setMatrixAt(i, dummyMat);
                                    updated = true;
                                }
                            }
                            if (updated) child.instanceMatrix.needsUpdate = true;
                        } else if (child.isMesh || child.isGroup) {
                            const wox = Math.round(child.position.x / env.cellSize);
                            const woz = Math.round(child.position.z / env.cellSize);
                            if (clearX.includes(wox) && clearZ.includes(woz)) {
                                child.scale.set(0, 0, 0);
                                child.visible = false;
                                child.updateMatrix();
                            }
                        }
                    }
                }
                const boxes = env.spatialGrid.chunkMap.get(adjHash);
                if (boxes) {
                    for (const box of boxes) {
                        const cx = Math.round((box.min.x + box.max.x) / 2 / env.cellSize);
                        const cz = Math.round((box.min.z + box.max.z) / 2 / env.cellSize);
                        if (clearX.includes(cx) && clearZ.includes(cz)) {
                            box.min.y = 10000;
                            box.max.y = 10000;
                        }
                    }
                }
            }
        }
    }

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
                const usesCatwalk = sectorId === "CHASM" || sectorId === "ACME";
                const fMat = usesCatwalk ? (env.catwalkMat || env.tileMat) : env.tileMat;
                const floor = new THREE.Mesh(floorGeo, fMat);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(cx, usesCatwalk ? 0 : 0.01, cz);
                addGeometry(floor);
            }
            if (needsCeiling) {
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

    buildPallet() {
        const env = this.env;
        if (!env.palletWoodMat) {
            env.palletWoodMat = new THREE.MeshStandardMaterial({color: 0x8b7355, roughness: 0.9});
            if (env.sharedAssets) env.sharedAssets.add(env.palletWoodMat.uuid);
        }
        const pallet = new THREE.Group();
        const slatGeo = env._boxGeo(1.5, 0.025, 0.18);
        const runnerGeo = env._boxGeo(0.12, 0.12, 1.4);
        for (let i = 0; i < 5; i++) {
            const topSlat = new THREE.Mesh(slatGeo, env.palletWoodMat);
            topSlat.position.set(0, 0.1575, -0.6 + (i * 0.3));
            pallet.add(topSlat);
        }
        for (let i = 0; i < 3; i++) {
            const botSlat = new THREE.Mesh(slatGeo, env.palletWoodMat);
            botSlat.position.set(0, 0.0125, -0.6 + (i * 0.6));
            pallet.add(botSlat);
        }
        for (let i = 0; i < 3; i++) {
            const runner = new THREE.Mesh(runnerGeo, env.palletWoodMat);
            runner.position.set(-0.6 + (i * 0.6), 0.085, 0);
            pallet.add(runner);
        }
        return pallet;
    }

    buildHangingBowlLight(chunkGroup, hash, cx, cz, random, getLightMaterial) {
        const env = this.env;
        const bowlRadius = 0.4;
        const rimY = 2.65;
        const domeTopY = rimY + bowlRadius;
        const wireLen = 3.0;
        const wireGeo = env._cacheGeo('archiveWire', () => new THREE.CylinderGeometry(0.012, 0.012, wireLen, 5));
        const wire = new THREE.Mesh(wireGeo, env.metalMat);
        wire.position.set(cx, domeTopY + wireLen / 2, cz);
        chunkGroup.add(wire);
        wire.updateMatrixWorld(true);
        env.walls.push(wire);
        const bowlGeo = env._cacheGeo('archiveBowl', () => new THREE.SphereGeometry(bowlRadius, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2));
        if (!env.archiveBowlMat) {
            env.archiveBowlMat = env.rustMat.clone();
            env.archiveBowlMat.side = THREE.DoubleSide;
            env.sharedAssets.add(env.archiveBowlMat.uuid);
        }
        const bowl = new THREE.Mesh(bowlGeo, env.archiveBowlMat);
        bowl.position.set(cx, rimY, cz);
        chunkGroup.add(bowl);
        bowl.updateMatrixWorld(true);
        env.walls.push(bowl);
        const bulbRadius = 0.08;
        const bulbGeo = env._cacheGeo('archiveBulb', () => new THREE.SphereGeometry(bulbRadius, 8, 6));
        const bulbMat = getLightMaterial(0xd8b276, 0xc89858, false);
        bulbMat.map = null;
        bulbMat.emissiveMap = null;
        const bulbY = domeTopY - bulbRadius;
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(cx, bulbY, cz);
        bulb.userData.chunkHash = hash;
        chunkGroup.add(bulb);
        bulb.updateMatrixWorld(true);
        env.walls.push(bulb);
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(cx, bulbY, cz),
            flickerOffset: random() * 500,
            material: bulbMat,
            isFaulty: true,
            isArchiveLight: true,
            isShadowCaster: true,
            baseIntensity: 1.5,
            targetIntensity: 1.5,
            currentIntensity: 1.5
        });
    }

    buildAtriumLight(chunkGroup, hash, cx, cz, random, getLightMaterial) {
        const env = this.env;
        const globeRadius = 0.75;
        const pipeLen = 14.0;
        const pipeGeo = env._cacheGeo('atriumPipe', () => new THREE.CylinderGeometry(0.04, 0.04, pipeLen, 8));

        if (!env.atriumPipeMat) {
            env.atriumPipeMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8, metalness: 0.5});
            env.sharedAssets.add(env.atriumPipeMat.uuid);
        }

        const pipe = new THREE.Mesh(pipeGeo, env.atriumPipeMat);
        const globeY = 4.2 + globeRadius;
        pipe.position.set(cx, globeY + pipeLen / 2, cz);
        chunkGroup.add(pipe);
        pipe.updateMatrixWorld(true);
        env.walls.push(pipe);

        const globeGeo = env._cacheGeo('atriumGlobe', () => new THREE.SphereGeometry(globeRadius, 24, 16));
        const activeMat = getLightMaterial(0xfff8ee, 0xffeebb, false);
        const globe = new THREE.Mesh(globeGeo, activeMat);
        globe.position.set(cx, globeY, cz);
        chunkGroup.add(globe);

        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(cx, globeY, cz),
            flickerOffset: random() * 500,
            material: activeMat,
            isFaulty: random() > 0.95,
            baseIntensity: 0.9,
            targetIntensity: 0.9,
            currentIntensity: 0.9
        });
    }

    buildCeilingPanelLight(chunkGroup, hash, px, pz, random, getLightMaterial, colorHex, emissiveHex, intensity, faultyThreshold, noShadow = false) {
        const env = this.env;
        const activeMat = getLightMaterial(colorHex, emissiveHex, false);
        const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
        panel.position.set(px, 2.98, pz);
        chunkGroup.add(panel);
        env.walls.push(panel);
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(px, 2.8, pz),
            flickerOffset: random() * 500,
            material: activeMat,
            isFaulty: random() > faultyThreshold,
            baseIntensity: intensity,
            targetIntensity: intensity,
            currentIntensity: intensity,
            noShadow: noShadow
        });
    }

    buildPipeCornerDressing(chunkGroup, addGeometry, random, x, z, openE, openS, openN, openW, offset, pipeY, mountY, junctionY, onJunction) {
        const env = this.env;
        let hasPipes = false;
        if (openE) {
            const pipeE = new THREE.Mesh(env.pipeGeo, env.pipeMat || env.rustMat);
            pipeE.position.set(x * env.cellSize + (env.cellSize / 2) + offset, pipeY, z * env.cellSize + offset);
            addGeometry(pipeE);
            hasPipes = true;
        }
        if (openS) {
            const pipeS = new THREE.Mesh(env.pipeGeo, env.pipeMat || env.rustMat);
            pipeS.rotation.y = Math.PI / 2;
            pipeS.position.set(x * env.cellSize + offset, pipeY, z * env.cellSize + (env.cellSize / 2) + offset);
            addGeometry(pipeS);
            hasPipes = true;
        }
        if (hasPipes || openN || openW) {
            const mount = new THREE.Mesh(env.pipeMountGeo, env.pipeMat || env.rustMat);
            mount.position.set(x * env.cellSize + offset, mountY, z * env.cellSize + offset);
            addGeometry(mount);
            if (random() > 0.1) {
                const junction = new THREE.Mesh(env.pipeJunctionGeo, env.pipeMat || env.rustMat);
                junction.position.set(x * env.cellSize + offset, junctionY, z * env.cellSize + offset);
                addGeometry(junction);
                if (onJunction) onJunction();
            }
        }
    }
}