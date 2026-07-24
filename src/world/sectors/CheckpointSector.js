// CheckpointSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const CheckpointSector = (env, ctx) => {
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
                id: "CHECKPOINT",
                foundationMat: env.checkpointFloorMat,
                ceilingMat: env.structMat,
                build: (x, z, localX, localZ) => {
                    const isPathN = localX === 7 && localZ <= 7;
                    const isPathS = localX === 7 && localZ >= 7;
                    const isPathW = localZ === 7 && localX <= 7;
                    const isPathE = localZ === 7 && localX >= 7;
                    const isPath = isPathN || isPathS || isPathW || isPathE;
                    if (isPath) {
                        const lineGeo = new THREE.PlaneGeometry(env.cellSize, env.cellSize);
                        const isCenter = localX === 7 && localZ === 7;
                        const lineMesh = new THREE.Mesh(lineGeo, isCenter ? env.checkpointLineCrossMat : env.checkpointLineMat);
                        lineMesh.rotation.x = -Math.PI / 2;
                        if (!isCenter && (isPathN || isPathS)) {
                            lineMesh.rotation.z = Math.PI / 2;
                        }
                        lineMesh.position.set(x * env.cellSize, 0.03, z * env.cellSize);
                        chunkGroup.add(lineMesh);
                    }
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.structMat, "CHECKPOINT")) return;
                    const ckHash = (a, b, salt) => {
                        let h = (hash ^ Math.imul(a + 64, 73856093) ^ Math.imul(b + 64, 19349663) ^ Math.imul(salt + 1, 83492791)) >>> 0;
                        h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
                        h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
                        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
                    };
                    const roomCandidate = (lx, lz) => {
                        if (lx === 7 || lz === 7) return false;
                        const fV = (lx === 6 || lx === 8) && lz !== 6 && lz !== 8;
                        const fH = (lz === 6 || lz === 8) && lx !== 6 && lx !== 8;
                        if (!fV && !fH) return false;
                        const t = fV ? lz : lx;
                        if (t < 3 || t > 12) return false;
                        if (Math.abs(t - 7) < 2) return false;
                        return ckHash(lx, lz, 11) < 0.14;
                    };
                    const isBuiltRoom = (lx, lz) => {
                        if (!roomCandidate(lx, lz)) return false;
                        const fV = (lx === 6 || lx === 8) && lz !== 6 && lz !== 8;
                        const prev = fV ? roomCandidate(lx, lz - 1) : roomCandidate(lx - 1, lz);
                        return !prev;
                    };
                    if (!isPath) {
                        if (isBuiltRoom(localX, localZ)) {
                            const flankV = (localX === 6 || localX === 8) && localZ !== 6 && localZ !== 8;
                            env._buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, {buildWall, addGeometry, chunkGroup, hash});
                            return;
                        }
                        const block = buildWall(env.cellSize, env.cellSize, env.structMat);
                        block.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        return;
                    }
                    if (localX === 7 && localZ === 7) {
                        env._buildCheckpointColumn(x, z, hash, {addGeometry, stagingMeshes});
                    } else {
                        if ((localX % 3 === 0 || localZ % 3 === 0) && random() > 0.5) {
                            const activeMat = env.baseLightMat.clone();
                            const panel = new THREE.Mesh(env.sharedPanelGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat]);
                            panel.position.set(x * env.cellSize, 2.98, z * env.cellSize);
                            chunkGroup.add(panel);
                            env.walls.push(panel);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * env.cellSize, 2.8, z * env.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.8,
                                baseIntensity: 0.7,
                                targetIntensity: 0.7,
                                currentIntensity: 0.7
                            });
                        }
                        const cx0 = x * env.cellSize, cz0 = z * env.cellSize;
                        if (Math.hypot(cx0, cz0) < env.cellSize * 2) return;
                        const alongZ = localX === 7;
                        const travelCoord = alongZ ? localZ : localX;
                        const nearGate = travelCoord <= 1 || travelCoord >= 14;
                        const nearChoke = Math.abs(travelCoord - 7) === 1;
                        const lat = (side, off) => alongZ
                            ? [cx0 + side * off, cz0]
                            : [cx0, cz0 + side * off];
                        const doorMinus = alongZ ? isBuiltRoom(6, localZ) : isBuiltRoom(localX, 6);
                        const doorPlus = alongZ ? isBuiltRoom(8, localZ) : isBuiltRoom(localX, 8);
                        const anyDoor = doorMinus || doorPlus;
                        const clearSide = (pref) => {
                            const blocked = (s) => (s < 0 ? doorMinus : doorPlus);
                            if (!blocked(pref)) return pref;
                            if (!blocked(-pref)) return -pref;
                            return 0;
                        };
                        const decalMesh = (mesh) => {
                            mesh.userData.chunkHash = hash;
                            mesh.updateMatrixWorld(true);
                            stagingMeshes.push(mesh);
                        };
                        if (!env.hazmatMat) {
                            env.hazmatMat = new THREE.MeshStandardMaterial({color: 0xc9b83a, roughness: 0.85});
                            env.sharedAssets.add(env.hazmatMat.uuid);
                        }
                        if (!env.deconSheetMat) {
                            env.deconSheetMat = new THREE.MeshStandardMaterial({
                                color: 0xbfd8d0, transparent: true, opacity: 0.28,
                                roughness: 0.6, side: THREE.DoubleSide
                            });
                            env.sharedAssets.add(env.deconSheetMat.uuid);
                        }
                        const hazmatSuit = (px, pz, faceYaw) => {
                            const suit = new THREE.Group();
                            const torso = new THREE.Mesh(env._boxGeo(0.4, 0.55, 0.24), env.hazmatMat);
                            torso.position.y = 1.55;
                            const hood = new THREE.Mesh(env._boxGeo(0.24, 0.24, 0.24), env.hazmatMat);
                            hood.position.y = 1.94;
                            const visor = new THREE.Mesh(env._boxGeo(0.16, 0.12, 0.02), env.crtScreenMat);
                            visor.position.set(0, 1.96, 0.13);
                            suit.add(torso, hood, visor);
                            for (let a = -1; a <= 1; a += 2) {
                                const arm = new THREE.Mesh(env._boxGeo(0.11, 0.5, 0.11), env.hazmatMat);
                                arm.position.set(a * 0.24, 1.32, 0);
                                const leg = new THREE.Mesh(env._boxGeo(0.14, 0.55, 0.14), env.hazmatMat);
                                leg.position.set(a * 0.11, 0.92, 0);
                                suit.add(arm, leg);
                            }
                            suit.position.set(px, 0, pz);
                            suit.rotation.y = faceYaw + (random() - 0.5) * 0.25;
                            suit.updateMatrixWorld(true);
                            suit.traverse(m => { if (m.isMesh) decalMesh(m); });
                        };
                        const suitRack = (side) => {
                            const railLen = 3.2;
                            const [rx, rz] = lat(side, 1.5);
                            const rail = new THREE.Mesh(
                                env._boxGeo(alongZ ? 0.06 : railLen, 0.06, alongZ ? railLen : 0.06), env.metalMat);
                            rail.position.set(rx, 2.35, rz);
                            addGeometry(rail);
                            for (let p = -1; p <= 1; p += 2) {
                                const post = new THREE.Mesh(env._boxGeo(0.06, 2.35, 0.06), env.metalMat);
                                const [ppx, ppz] = alongZ ? [rx, rz + p * 1.5] : [rx + p * 1.5, rz];
                                post.position.set(ppx, 1.17, ppz);
                                decalMesh(post);
                            }
                            const faceYaw = alongZ ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : (side < 0 ? Math.PI : 0);
                            const n = 2 + Math.floor(random() * 2);
                            for (let i = 0; i < n; i++) {
                                const t = (n === 1) ? 0 : (i / (n - 1) - 0.5) * 2.4;
                                const [sx, sz] = alongZ ? [rx, rz + t] : [rx + t, rz];
                                if (random() > 0.15) hazmatSuit(sx, sz, faceYaw);
                            }
                        };
                        const crateStack = (side) => {
                            if (!env.cartonGeo) {
                                env.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                                env.geoCache.set(env.cartonGeo.uuid, true);
                            }
                            const cartonPool = env.cartonMats || [env.fileBoxMat];
                            const [bx0, bz0] = lat(side, 1.45);
                            const pallet = new THREE.Mesh(env._boxGeo(1.3, 0.12, 1.3), env.woodMat);
                            pallet.position.set(bx0, 0.06, bz0);
                            addGeometry(pallet);
                            const cols = 1 + Math.floor(random() * 2);
                            for (let c = 0; c < cols; c++) {
                                const ox = (c - (cols - 1) / 2) * 0.62;
                                const stack = 1 + Math.floor(random() * 3);
                                for (let s = 0; s < stack; s++) {
                                    const mBox = new THREE.Mesh(env.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                    const jitter = (random() - 0.5) * 0.12;
                                    mBox.rotation.y = (random() - 0.5) * 0.3;
                                    const [mx, mz] = alongZ ? [bx0 + jitter, bz0 + ox] : [bx0 + ox, bz0 + jitter];
                                    mBox.position.set(mx, 0.37 + s * 0.5, mz);
                                    addGeometry(mBox);
                                }
                            }
                        };
                        const drumCluster = (side) => {
                            const drumGeo = env._cacheGeo('ckDrum', () => new THREE.CylinderGeometry(0.29, 0.29, 0.92, 10));
                            const n = 2 + Math.floor(random() * 2);
                            const [dx0, dz0] = lat(side, 1.5);
                            for (let i = 0; i < n; i++) {
                                const drum = new THREE.Mesh(drumGeo, random() > 0.5 ? env.rustMat : env.hazmatMat);
                                const off = (i - (n - 1) / 2) * 0.64;
                                const [ddx, ddz] = alongZ ? [dx0 + (random() - 0.5) * 0.2, dz0 + off] : [dx0 + off, dz0 + (random() - 0.5) * 0.2];
                                drum.position.set(ddx, 0.46, ddz);
                                addGeometry(drum);
                                const ring = new THREE.Mesh(env._boxGeo(0.6, 0.05, 0.6), env.hazardMat);
                                ring.position.set(ddx, 0.7, ddz);
                                decalMesh(ring);
                            }
                        };
                        const avCart = (side) => {
                            const cart = new THREE.Group();
                            const shelf = new THREE.Mesh(env._boxGeo(0.9, 0.05, 0.6), env.metalMat);
                            shelf.position.y = 0.78;
                            const lower = new THREE.Mesh(env._boxGeo(0.9, 0.05, 0.6), env.metalMat);
                            lower.position.y = 0.4;
                            cart.add(shelf, lower);
                            for (let lx2 = -1; lx2 <= 1; lx2 += 2) for (let lz2 = -1; lz2 <= 1; lz2 += 2) {
                                const leg = new THREE.Mesh(env._boxGeo(0.05, 0.78, 0.05), env.metalMat);
                                leg.position.set(lx2 * 0.4, 0.39, lz2 * 0.26);
                                cart.add(leg);
                            }
                            const body = new THREE.Mesh(env.terminalBodyGeo, env.baseHousingMat);
                            body.position.set(0, 1.0, 0);
                            const screen = new THREE.Mesh(env._boxGeo(0.45, 0.35, 0.05), env.crtScreenMat);
                            screen.position.set(0, 1.0, 0.26);
                            cart.add(body, screen);
                            const [ax, az] = lat(side, 1.5);
                            cart.position.set(ax, 0, az);
                            cart.rotation.y = (alongZ ? 0 : Math.PI / 2) + (random() - 0.5) * 0.4;
                            addFurniture(cart);
                        };
                        const deconSheet = () => {
                            const strips = 5;
                            for (let i = 0; i < strips; i++) {
                                const t = (i / (strips - 1) - 0.5) * 3.4;
                                const strip = new THREE.Mesh(
                                    env._boxGeo(alongZ ? 0.62 : 0.03, 2.3, alongZ ? 0.03 : 0.62), env.deconSheetMat);
                                const [spx, spz] = alongZ ? [cx0 + t, cz0] : [cx0, cz0 + t];
                                strip.position.set(spx, 1.3, spz);
                                strip.rotation.y = (random() - 0.5) * 0.05;
                                decalMesh(strip);
                            }
                            const track = new THREE.Mesh(
                                env._boxGeo(alongZ ? 3.6 : 0.06, 0.08, alongZ ? 0.06 : 3.6), env.metalMat);
                            track.position.set(cx0, 2.48, cz0);
                            decalMesh(track);
                        };
                        if (nearChoke && env._ckDeskHash !== hash) {
                            env._ckDeskHash = hash;
                            const side = random() > 0.5 ? 1 : -1;
                            const [dx0, dz0] = lat(side, 1.15);
                            const desk = new THREE.Group();
                            const top = new THREE.Mesh(env._boxGeo(alongZ ? 1.0 : 2.0, 0.08, alongZ ? 2.0 : 1.0), env.woodMat);
                            top.position.y = 0.78;
                            const skirt = new THREE.Mesh(env._boxGeo(alongZ ? 0.9 : 1.9, 0.68, alongZ ? 1.9 : 0.9), env.structMat);
                            skirt.position.y = 0.38;
                            desk.add(top, skirt);
                            const body = new THREE.Mesh(env.terminalBodyGeo, env.baseHousingMat);
                            body.position.set(0, 1.0, 0);
                            const screen = new THREE.Mesh(env._boxGeo(0.45, 0.35, 0.05), env.crtScreenMat);
                            screen.position.set(0, 1.0, alongZ ? 0.26 : 0.26);
                            desk.add(body, screen);
                            desk.position.set(dx0, 0, dz0);
                            desk.rotation.y = alongZ ? (side < 0 ? -Math.PI / 2 : Math.PI / 2) : (side < 0 ? 0 : Math.PI);
                            addFurniture(desk);
                            return;
                        }
                        if (nearGate) return;
                        const dress = random();
                        if (dress < 0.16) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) suitRack(s);
                        } else if (dress < 0.34) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) crateStack(s);
                            if (random() > 0.6) {
                                const s2 = clearSide(random() > 0.5 ? 1 : -1);
                                if (s2) drumCluster(s2);
                            }
                        } else if (dress < 0.46) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) drumCluster(s);
                        } else if (dress < 0.58) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) avCart(s);
                        } else if (dress < 0.66) {
                            if (!anyDoor) deconSheet();
                        } else if (dress < 0.80) {
                            if (!doorPlus) crateStack(1);
                            if (!doorMinus) crateStack(-1);
                        }
                    }
                }
            };
};
