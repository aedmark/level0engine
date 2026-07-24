// ArchiveSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const ArchiveSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildChair,
        buildTable,
        buildDesk,
        buildCouch,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;

    return {
                id: "ARCHIVE",
                foundationMat: env.archiveFloorMat || env.structMat,
                ceilingMat: null,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.archiveWallMat || env.structMat, "ARCHIVE", 6.0)) {
                        return;
                    }
                    const isWall = maze && maze[localX][localZ];
                    const acx = x * env.cellSize, acz = z * env.cellSize;
                    if (!env.bookRowGeo) {
                        env.bookRowGeo = new THREE.BoxGeometry(3.5, 0.6, 0.36);
                        env.geoCache.set(env.bookRowGeo.uuid, true);
                        env.fileBoxGeo = new THREE.BoxGeometry(0.42, 0.3, 0.32);
                        env.geoCache.set(env.fileBoxGeo.uuid, true);
                    }
                    const buildBookCart = (cx, cz, rotY) => {
                        const g = new THREE.Group();
                        const shelfGeo = env._cacheGeo('cartShelf125', () => new THREE.BoxGeometry(1.25, 0.0625, 0.625));
                        for (let i = 0; i < 3; i++) {
                            const shelf = new THREE.Mesh(shelfGeo, env.metalMat);
                            shelf.position.y = 0.25 + i * 0.5;
                            g.add(shelf);
                            if (random() > 0.3) {
                                const row = new THREE.Mesh(env.bookRowGeo, env.bookRowMat);
                                row.scale.set(0.25, 0.6, 1.0);
                                row.position.set((random() - 0.5) * 0.25, shelf.position.y + 0.21, 0);
                                g.add(row);
                            }
                        }
                        const postGeo = env._cacheGeo('cartPost125', () => new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8));
                        for (let px = -1; px <= 1; px += 2) {
                            for (let pz = -1; pz <= 1; pz += 2) {
                                const post = new THREE.Mesh(postGeo, env.metalMat);
                                post.position.set(px * 0.6, 0.625, pz * 0.2875);
                                g.add(post);
                            }
                        }
                        g.position.set(cx, 0, cz);
                        g.rotation.y = rotY;
                        return g;
                    };
                    
                    const spawnClutter = (cx, cy, cz, radius = 1.0) => {
                        const r = random();
                        if (r > 0.6) {
                            if (!env.singleBookGeo) env.singleBookGeo = new THREE.BoxGeometry(0.35, 0.08, 0.45);
                            const numStacks = 2 + Math.floor(random() * 3);
                            for (let s = 0; s < numStacks; s++) {
                                const stackX = cx + (random() - 0.5) * radius * 0.8;
                                const stackZ = cz + (random() - 0.5) * radius * 0.8;
                                const stackH = 1 + Math.floor(random() * 5);
                                for (let i = 0; i < stackH; i++) {
                                    const matSet = env.bookMatSets ? env.bookMatSets[Math.floor(random() * env.bookMatSets.length)] : env.bookRowMat;
                                    const bk = new THREE.Mesh(env.singleBookGeo, matSet);
                                    bk.position.set(stackX + (random() - 0.5) * 0.08, cy + 0.04 + i * 0.08, stackZ + (random() - 0.5) * 0.08);
                                    bk.rotation.y = random() * Math.PI * 2;
                                    addGeometry(bk);
                                }
                            }
                        } else if (r > 0.2) {
                            const numP = 8 + Math.floor(random() * 12);
                            for (let i = 0; i < numP; i++) {
                                if (!env.paperGeo || !env.paperMat) break;
                                const p = new THREE.Mesh(env.paperGeo, env.paperMat);
                                p.position.set(cx + (random() - 0.5) * radius, cy + 0.01 + i * 0.002, cz + (random() - 0.5) * radius);
                                p.rotation.x = -Math.PI / 2;
                                p.rotation.z = random() * Math.PI * 2;
                                addGeometry(p);
                            }
                        } else {
                            if (env.coffeeStainGeo && env.coffeeStainMat) {
                                const stain = new THREE.Mesh(env.coffeeStainGeo, env.coffeeStainMat);
                                stain.position.set(cx, cy + 0.005, cz);
                                stain.rotation.x = -Math.PI / 2;
                                stain.rotation.z = random() * Math.PI * 2;
                                stain.scale.setScalar(0.5 + random() * 1.5);
                                addGeometry(stain);
                            }
                        }
                    };

                    if (isWall) {
                        const inMaze = (nx, nz) => nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze[nx][nz];
                        const runOrientation = (lx, lz) => {
                            const zR = inMaze(lx, lz - 1) || inMaze(lx, lz + 1);
                            const xR = inMaze(lx - 1, lz) || inMaze(lx + 1, lz);
                            return zR && !xR ? true : (xR && !zR ? false : ((lx + lz) % 2 === 0));
                        };
                        const alongZ = runOrientation(localX, localZ);
                        const runSpan = env.cellSize;
                        const continuesNeg = alongZ
                            ? (inMaze(localX, localZ - 1) && runOrientation(localX, localZ - 1) === true)
                            : (inMaze(localX - 1, localZ) && runOrientation(localX - 1, localZ) === false);
                        const continuesPos = alongZ
                            ? (inMaze(localX, localZ + 1) && runOrientation(localX, localZ + 1) === true)
                            : (inMaze(localX + 1, localZ) && runOrientation(localX + 1, localZ) === false);
                        const openNeg = !continuesNeg;
                        const openPos = !continuesPos;
                        const capOffset = runSpan / 2 - 0.03;
                        
                        for (let side = -1; side <= 1; side += 2) {
                            const sx = acx + (alongZ ? side * 0.7 : 0);
                            const sz = acz + (alongZ ? 0 : side * 0.7);

                            for (let e = -1; e <= 1; e += 2) {
                                if (e < 0 ? !openNeg : !openPos) continue;
                                const upright = buildWall(alongZ ? 1.0 : 0.12, alongZ ? 0.12 : 1.0, env.metalMat, 3.0);
                                upright.position.set(sx + (alongZ ? 0 : e * capOffset), 1.5, sz + (alongZ ? e * capOffset : 0));
                                addGeometry(upright);
                            }
                            const spine = buildWall(alongZ ? 0.08 : runSpan, alongZ ? runSpan : 0.08, env.metalMat, 3.0);
                            spine.position.set(sx, 1.5, sz);
                            spine.userData.isEntityBlocker = true;
                            addGeometry(spine);
                            const levels = [0.14, 0.88, 1.62, 2.36];
                            for (let li = 0; li < levels.length; li++) {
                                const shelfY = levels[li];
                                const board = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, env.woodMat, 0.06);
                                board.position.set(sx, shelfY, sz);
                                addGeometry(board);
                                for (let face = -1; face <= 1; face += 2) {
                                    const roll = random();
                                    if (roll > 0.22) {
                                        const row = new THREE.Mesh(env.bookRowGeo, env.bookRowMat);
                                        const wScale = 0.45 + random() * 0.55;
                                        const slide = (random() - 0.5) * 3.5 * (1 - wScale);
                                        row.position.set(
                                            sx + (alongZ ? face * 0.24 : slide),
                                            shelfY + 0.34,
                                            sz + (alongZ ? slide : face * 0.24)
                                        );
                                        if (alongZ) row.rotation.y = Math.PI / 2;
                                        row.scale.set(wScale, 1, 1);
                                        addGeometry(row);
                                    }
                                    if (roll < 0.4) {
                                        const boxCount = 1 + Math.floor(random() * 2);
                                        for (let bi = 0; bi < boxCount; bi++) {
                                            const fb = new THREE.Mesh(env.fileBoxGeo, env.fileBoxMat);
                                            const bSlide = (random() - 0.5) * 3.0;
                                            fb.position.set(
                                                sx + (alongZ ? face * 0.26 : bSlide),
                                                shelfY + 0.19,
                                                sz + (alongZ ? bSlide : face * 0.26)
                                            );
                                            fb.rotation.y = (alongZ ? Math.PI / 2 : 0) + (random() - 0.5) * 0.25;
                                            addGeometry(fb);
                                        }
                                    }
                                }
                            }
                            const cap = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, env.metalMat, 0.06);
                            cap.position.set(sx, 2.92, sz);
                            addGeometry(cap);
                        }
                    } else {
                        if (random() > 0.85) {
                            addFurniture(buildBookCart(acx + (random() - 0.5), acz + (random() - 0.5), random() * Math.PI));
                        } else if (random() > 0.85) {
                            addFurniture(buildDesk(acx, 0, acz, random() * Math.PI));
                            if (random() > 0.5) spawnClutter(acx, 1.125, acz, 0.8);
                            if (random() > 0.5) {
                                addFurniture(buildChair(acx + 0.7, 0, acz, -Math.PI / 2));
                            }
                        } else if (random() > 0.72) {
                            const sheets = 1 + Math.floor(random() * 2);
                            for (let i = 0; i < sheets; i++) {
                                const sheet = new THREE.Mesh(env.documentGeo, env.documentMat);
                                sheet.position.set(acx + (random() - 0.5) * 2.6, 0.035, acz + (random() - 0.5) * 2.6);
                                sheet.rotation.y = random() * Math.PI * 2;
                                if (random() > 0.7) {
                                    sheet.userData = {
                                        type: 'document',
                                        chunkHash: hash,
                                        active: true,
                                        zone: 'ARCHIVE',
                                        docId: 'REC_' + Math.floor(random() * 9999)
                                    };
                                    chunkGroup.add(sheet);
                                    if (!env.interactables) env.interactables = [];
                                    env.interactables.push(sheet);
                                    const sBox = new THREE.Box3().setFromObject(sheet);
                                    sBox.chunkHash = hash;
                                    sheet.userData.box = sBox;
                                    env.spatialGrid.insert(sBox);
                                } else {
                                    addGeometry(sheet);
                                }
                            }
                        }
                        if (random() > 0.88) {
                            const sx = acx + (random() - 0.5) * 1.8;
                            const sz = acz + (random() - 0.5) * 1.8;
                            spawnClutter(sx, 0.0, sz, 1.8);
                        }
                        // No ceiling panel here anymore - the archive has an open ceiling, so
                        // light comes down instead: a bare bulb in a rusted bowl shade, hanging
                        // off a wire that just runs up and disappears into the dark overhead.
                        // Kept deliberately dim - this room should read as dark and broody, not lit.
                        if (random() > 0.85) {
                            // Bowl geometry is a hemisphere (theta 0..PI/2): its own .position is
                            // the RIM (open, downward-facing mouth), and the closed dome cap sits
                            // above that at +bowlRadius. The wire has to land on the dome cap, not
                            // the rim, or it reads as stopping short of the fixture instead of
                            // plugging into it. Bulb hangs just inside/below the rim so it's
                            // clearly cradled by the shade rather than floating apart from it.
                            const bowlRadius = 0.4;
                            const rimY = 2.65;
                            const domeTopY = rimY + bowlRadius;
                            const wireLen = 3.0;
                            const wireGeo = env._cacheGeo('archiveWire', () => new THREE.CylinderGeometry(0.012, 0.012, wireLen, 5));
                            const wire = new THREE.Mesh(wireGeo, env.metalMat);
                            wire.position.set(x * env.cellSize, domeTopY + wireLen / 2, z * env.cellSize);
                            chunkGroup.add(wire);
                            wire.updateMatrixWorld(true);
                            env.walls.push(wire);
                            const bowlGeo = env._cacheGeo('archiveBowl', () => new THREE.SphereGeometry(bowlRadius, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2));
                            if (!env.archiveBowlMat) {
                                // The bowl is a thin open shell, not a solid - it needs both faces
                                // rendered or it vanishes entirely when viewed from underneath (and
                                // partially drops out from other angles where the sightline grazes
                                // through the open rim to the far inside wall). Cloned off rustMat
                                // rather than flipping that material's side everywhere it's used.
                                env.archiveBowlMat = env.rustMat.clone();
                                env.archiveBowlMat.side = THREE.DoubleSide;
                                env.sharedAssets.add(env.archiveBowlMat.uuid);
                            }
                            const bowl = new THREE.Mesh(bowlGeo, env.archiveBowlMat);
                            bowl.position.set(x * env.cellSize, rimY, z * env.cellSize);
                            chunkGroup.add(bowl);
                            bowl.updateMatrixWorld(true);
                            env.walls.push(bowl);
                            const bulbRadius = 0.08;
                            const bulbGeo = env._cacheGeo('archiveBulb', () => new THREE.SphereGeometry(bulbRadius, 8, 6));
                            const bulbMat = env.baseLightMat.clone();
                            // baseLightMat carries the diagonal-crosshatch panel texture (map +
                            // emissiveMap) meant for the flat rectangular light fixtures elsewhere -
                            // on a small sphere that reads as a striped pool ball. Strip both so
                            // it's just a plain glowing bulb.
                            bulbMat.map = null;
                            bulbMat.emissiveMap = null;
                            bulbMat.color.setHex(0xd8b276);
                            bulbMat.emissive.setHex(0xc89858);
                            // Nested up against the dome's inner apex instead of dangling below
                            // the rim - no separate socket/ballast geometry, just the bulb itself
                            // pushed flush into the curve.
                            const bulbY = domeTopY - bulbRadius;
                            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                            bulb.position.set(x * env.cellSize, bulbY, z * env.cellSize);
                            bulb.userData.chunkHash = hash;
                            chunkGroup.add(bulb);
                            bulb.updateMatrixWorld(true);
                            env.walls.push(bulb);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * env.cellSize, bulbY, z * env.cellSize),
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
                    }
                }
            };
};
