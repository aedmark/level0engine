// SetPieces.js
// LEVEL 0 SET-PIECE BUILDERS

export default class SetPieces {
    constructor(env) {
        this.env = env;
    }

    buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, ctx) {
        const env = this.env;
        const {buildWall, addGeometry, chunkGroup, hash} = ctx;
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
                const stub = buildWall(0.25, 1.2, env.structMat);
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
                const stub = buildWall(1.2, 0.25, env.structMat);
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
        const place = (mesh, px, py, pz) => { mesh.position.set(px, py, pz); addGeometry(mesh); };
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
            const pallet = new THREE.Mesh(env._boxGeo(1.2, 0.12, 1.2), env.woodMat);
            place(pallet, px, 0.06, pz);
            for (let c = 0; c < 3; c++) for (let s = 0; s < 1 + Math.floor(ckHash(localX + c, localZ, c + 1) * 3); s++)
                carton(1.3 + (c - 1) * 0.0, -0.6 + (c - 1) * 0.45, 0.3 + s * 0.44);
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
                grp.traverse(ch => { ch.userData.chunkHash = hash; });
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
            const activeMat = env.baseLightMat.clone();
            const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
            panel.position.set(cx0, 2.98, cz0);
            chunkGroup.add(panel);
            env.walls.push(panel);
            env.fixtureData.push({
                chunkHash: hash,
                position: new THREE.Vector3(cx0, 2.8, cz0),
                flickerOffset: ckHash(localX, localZ, 5) * 500,
                material: activeMat,
                isFaulty: ckHash(localX, localZ, 8) > 0.75,
                baseIntensity: 0.6,
                targetIntensity: 0.6,
                currentIntensity: 0.6
            });
        }
    }

    buildCheckpointColumn(x, z, hash, ctx) {
        const env = this.env;
        const {addGeometry, stagingMeshes} = ctx;
        const cs = env.cellSize;
        const cx = x * cs, cz = z * cs;
        const decor = (m) => { m.userData.chunkHash = hash; m.updateMatrixWorld(true); stagingMeshes.push(m); };
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
            
            if (random() > 0.80) {
                if (!env.idlingCars) env.idlingCars = [];
                let tooClose = false;
                for (let i = 0; i < env.idlingCars.length; i++) {
                    if (env.idlingCars[i].position.distanceToSquared(g.position) < 10000) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) {
                    env.idlingCars.push({
                        chunkHash: hash,
                        position: g.position.clone()
                    });
                }
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
                tag.userData = {type: 'document', chunkHash: hash, active: true, zone: 'IMPOUND', docId: 'TAG_' + Math.floor(random() * 9999)};
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
            const pipe = new THREE.Mesh(env._cacheGeo('impExhaust', () => new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8)), env.rustMat);
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
                }
            }
            env._buildAirlock(chunkGroup, hash, outer.x * env.cellSize, outer.z * env.cellSize, spansX, sectorId, outSign);
            if (needsFloor || needsCeiling) {
                env._buildHallwaySegment(chunkGroup, hash, innerCellX * env.cellSize, innerCellZ * env.cellSize, spansX, needsFloor, needsCeiling);
            }
        }
    }
    buildAirlock(chunkGroup, hash, dcx, dcz, spansX, sectorId, outSign) {
        const env = this.env;
        if (!env.airlockRedMat) {
            env.airlockRedMat = new THREE.MeshBasicMaterial({color: 0xff2222});
            env.airlockGreenMat = new THREE.MeshBasicMaterial({color: 0x22ff44});
        }
        const inSign = outSign * -1;
        const chamberDepth = 2.8;

        const outerX = dcx;
        const outerZ = dcz;
        const innerX = dcx + (spansX ? 0 : inSign * chamberDepth);
        const innerZ = dcz + (spansX ? inSign * chamberDepth : 0);
        const midX = dcx + (spansX ? 0 : inSign * chamberDepth * 0.5);
        const midZ = dcz + (spansX ? inSign * chamberDepth * 0.5 : 0);

        const addGeometry = (mesh) => {
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

        const createDoorAssembly = (cx, cz) => {
            const jambA = bWall(spansX ? 0.5 : 0.7, 3.0, spansX ? 0.7 : 0.5, env.structMat);
            jambA.position.set(cx - (spansX ? 1.75 : 0), 1.5, cz - (spansX ? 0 : 1.75));
            addGeometry(jambA);

            const jambB = bWall(spansX ? 0.5 : 0.7, 3.0, spansX ? 0.7 : 0.5, env.structMat);
            jambB.position.set(cx + (spansX ? 1.75 : 0), 1.5, cz + (spansX ? 0 : 1.75));
            addGeometry(jambB);

            for (let side = -1; side <= 1; side += 2) {
                const pocketOuter = bWall(
                    spansX ? 1.7 : 0.08,
                    2.8,
                    spansX ? 0.08 : 1.7,
                    env.metalMat
                );
                pocketOuter.position.set(
                    cx + (spansX ? side * 2.35 : 0.20),
                    1.4,
                    cz + (spansX ? 0.20 : side * 2.35)
                );
                addGeometry(pocketOuter);

                const pocketInner = bWall(
                    spansX ? 1.7 : 0.08,
                    2.8,
                    spansX ? 0.08 : 1.7,
                    env.metalMat
                );
                pocketInner.position.set(
                    cx + (spansX ? side * 2.35 : -0.20),
                    1.4,
                    cz + (spansX ? -0.20 : side * 2.35)
                );
                addGeometry(pocketInner);

                const pocketCap = bWall(
                    spansX ? 0.08 : 0.48,
                    2.8,
                    spansX ? 0.48 : 0.08,
                    env.structMat
                );
                pocketCap.position.set(
                    cx + (spansX ? side * 3.20 : 0),
                    1.4,
                    cz + (spansX ? 0 : side * 3.20)
                );
                addGeometry(pocketCap);

                const pocketTop = bWall(
                    spansX ? 1.7 : 0.48,
                    0.08,
                    spansX ? 0.48 : 1.7,
                    env.metalMat
                );
                pocketTop.position.set(
                    cx + (spansX ? side * 2.35 : 0),
                    2.76,
                    cz + (spansX ? 0 : side * 2.35)
                );
                addGeometry(pocketTop);
            }

            const header = bWall(spansX ? 3.0 : 0.7, 0.4, spansX ? 0.7 : 3.0, env.metalMat);
            header.position.set(cx, 2.8, cz);
            addGeometry(header);

            const lampHousing = bWall(spansX ? 0.4 : 0.2, 0.15, spansX ? 0.2 : 0.4, env.metalMat);
            lampHousing.position.set(cx, 3.05, cz);
            chunkGroup.add(lampHousing);

            const lampLens = new THREE.Mesh(env._boxGeo(spansX ? 0.3 : 0.12, 0.1, spansX ? 0.12 : 0.3), env.airlockRedMat);
            lampLens.position.set(cx, 3.02, cz);
            chunkGroup.add(lampLens);

            const doorGroup = new THREE.Group();
            doorGroup.position.set(cx, 0, cz);

            const getDoorGeo = (name, w, h, d) => {
                const key = `${name}_${spansX}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    geo = new THREE.BoxGeometry(w, h, d);
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return geo;
            };
            const panelGeo = spansX
                ? getDoorGeo('doorPanel', 1.58, 2.6, 0.24)
                : getDoorGeo('doorPanel', 0.24, 2.6, 1.58);
            const stripeGeo = spansX
                ? getDoorGeo('doorStripe', 0.14, 2.6, 0.26)
                : getDoorGeo('doorStripe', 0.26, 2.6, 0.14);
            const ribGeo = spansX
                ? getDoorGeo('doorRib', 1.58, 0.08, 0.28)
                : getDoorGeo('doorRib', 0.28, 0.08, 1.58);

            const mkPanel = (side) => {
                const p = new THREE.Mesh(panelGeo, env.metalMat);
                if (spansX) p.position.set(side * 0.76, 1.3, 0);
                else p.position.set(0, 1.3, side * 0.76);
                const stripe = new THREE.Mesh(stripeGeo, env.hazardMat);
                if (spansX) stripe.position.set(-side * 0.72, 0, 0);
                else stripe.position.set(0, 0, -side * 0.72);
                p.add(stripe);
                for (let ry = -1; ry <= 1; ry += 2) {
                    const rib = new THREE.Mesh(ribGeo, env.structMat);
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
            return {group: doorGroup, data: doorGroup.userData, position: new THREE.Vector3(cx, 0, cz), lamp: lampLens};
        };

        const outerDoor = createDoorAssembly(outerX, outerZ);
        const innerDoor = createDoorAssembly(innerX, innerZ);

        const fullDepth = chamberDepth + 1.75;
        const outCenterOff = (chamberDepth - 1.75) * 0.5;
        const extMidZ = dcz + (spansX ? inSign * outCenterOff : 0);
        const extMidX = dcx + (spansX ? 0 : inSign * outCenterOff);

        for (let cs = -1; cs <= 1; cs += 2) {
            const sideWall = bWall(
                spansX ? 0.4 : fullDepth,
                3.0,
                spansX ? fullDepth : 0.4,
                env.structMat
            );
            sideWall.position.set(
                spansX ? dcx + cs * 1.75 : extMidX,
                1.5,
                spansX ? extMidZ : dcz + cs * 1.75
            );
            addGeometry(sideWall);
        }

        const roofL = fullDepth + 0.2;
        const roof = bWall(spansX ? 3.8 : roofL, 0.1, spansX ? roofL : 3.8, env.metalMat);
        roof.position.set(extMidX, 2.95, extMidZ);
        addGeometry(roof);

        const floorPlate = bWall(spansX ? 3.0 : chamberDepth, 0.04, spansX ? chamberDepth : 3.0, env.metalMat);
        floorPlate.position.set(midX, 0.02, midZ);
        addGeometry(floorPlate);

        const switchGroup = new THREE.Group();
        const switchBase = bWall(spansX ? 0.05 : 0.3, 0.4, spansX ? 0.3 : 0.05, env.metalMat);
        const switchButtonMat = new THREE.MeshBasicMaterial({color: 0x00ffcc});
        const switchButtonGeo = new THREE.BoxGeometry(spansX ? 0.06 : 0.1, 0.1, spansX ? 0.1 : 0.06);
        const switchButton = new THREE.Mesh(switchButtonGeo, switchButtonMat);
        if (spansX) {
            switchButton.position.set(-0.03, 0, 0);
            switchGroup.position.set(midX + 1.525, 1.3, midZ);
        } else {
            switchButton.position.set(0, 0, -0.03);
            switchGroup.position.set(midX, 1.3, midZ + 1.525);
        }
        switchGroup.add(switchBase, switchButton);
        switchGroup.userData = { isAirlockSwitch: true, entityOpen: false, chunkHash: hash };
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
    buildHallwaySegment(chunkGroup, hash, cx, cz, spansX, needsFloor, needsCeiling) {
        const env = this.env;
        const addGeometry = (mesh) => {
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
                const ceil = new THREE.Mesh(floorGeo, env.ceilMat);
                ceil.rotation.x = Math.PI / 2;
                ceil.position.set(cx, 2.99, cz);
                addGeometry(ceil);
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
        for (let i = 0; i < 20; i++) {
            let rx = Math.floor(randomFn() * (env.chunkSize - 4)) + 2;
            let rz = Math.floor(randomFn() * (env.chunkSize - 4)) + 2;
            maze[rx][rz] = false;
        }
        for (let i = 0; i < env.chunkSize; i++) {
            maze[7][i] = false;
            maze[i][7] = false;
        }
        return maze;
    }
}
