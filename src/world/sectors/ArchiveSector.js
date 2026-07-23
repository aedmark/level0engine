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
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.archiveWallMat || env.structMat, "ARCHIVE")) {
                        if (env.archiveStainGeo && random() > 0.45) {
                            env.geoCache.set(env.archiveStainGeo.uuid, true);
                            const edge = env.chunkSize - 1;
                            // The wall block spans the full cell (half-extent cellSize/2 + 0.01),
                            // so the decal needs to clear that surface outward, not sit just inside
                            // it - otherwise it's buried in the opaque box and never rendered.
                            const half = env.cellSize / 2 + 0.05;
                            let nx = 0, nz = 0, rotY = 0;
                            if (localX === 0) { nx = half; rotY = Math.PI / 2; }
                            else if (localX === edge) { nx = -half; rotY = -Math.PI / 2; }
                            else if (localZ === 0) { nz = half; rotY = 0; }
                            else if (localZ === edge) { nz = -half; rotY = Math.PI; }
                            const stain = new THREE.Mesh(env.archiveStainGeo, env.archiveStainMat);
                            stain.position.set(x * env.cellSize + nx, 0.9 + random() * 1.1, z * env.cellSize + nz);
                            stain.rotation.y = rotY;
                            const sc = 0.6 + random() * 0.8;
                            stain.scale.set(sc, sc * (0.8 + random() * 0.5), 1);
                            addGeometry(stain);
                        }
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
                    if (isWall) {
                        // Reuse the same connected-run logic the other zones use for their maze
                        // walls: a shelf cell only gets an end-cap upright where the row actually
                        // terminates. Where a neighboring cell continues the same run, the spine
                        // and boards run edge-to-edge into it instead, so a row of maze cells reads
                        // as one continuous shelving unit rather than a chain of separate modules.
                        const inMaze = (nx, nz) => nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze[nx][nz];
                        // A neighbor being maze-wall isn't enough to skip our cap - if that
                        // neighbor orients along the OTHER axis (a T/elbow junction), its board
                        // never reaches back toward us, so a cap suppressed on "neighbor exists"
                        // alone leaves an exposed, uncapped end. Recompute the neighbor's own
                        // orientation with the same rule and only treat it as continuing our run
                        // when the two agree.
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
                        // Cap sits at the board's true tip (minus a hair for a flush look), not
                        // inset from it - the boards now run the full cell span, so an inset cap
                        // used to leave the last few centimeters of every slat poking past the post.
                        const capOffset = runSpan / 2 - 0.03;
                        for (let e = -1; e <= 1; e += 2) {
                            if (e < 0 ? !openNeg : !openPos) continue;
                            const upright = buildWall(alongZ ? 1.0 : 0.12, alongZ ? 0.12 : 1.0, env.metalMat, 3.0);
                            upright.position.set(acx + (alongZ ? 0 : e * capOffset), 1.5, acz + (alongZ ? e * capOffset : 0));
                            addGeometry(upright);
                        }
                        const spine = buildWall(alongZ ? 0.08 : runSpan, alongZ ? runSpan : 0.08, env.metalMat, 3.0);
                        spine.position.set(acx, 1.5, acz);
                        spine.userData.isEntityBlocker = true;
                        addGeometry(spine);
                        const levels = [0.14, 0.88, 1.62, 2.36];
                        for (let li = 0; li < levels.length; li++) {
                            const shelfY = levels[li];
                            const board = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, env.woodMat, 0.06);
                            board.position.set(acx, shelfY, acz);
                            addGeometry(board);
                            for (let face = -1; face <= 1; face += 2) {
                                const roll = random();
                                if (roll > 0.22) {
                                    const row = new THREE.Mesh(env.bookRowGeo, env.bookRowMat);
                                    const wScale = 0.45 + random() * 0.55;
                                    const slide = (random() - 0.5) * 3.5 * (1 - wScale);
                                    row.position.set(
                                        acx + (alongZ ? face * 0.24 : slide),
                                        shelfY + 0.34,
                                        acz + (alongZ ? slide : face * 0.24)
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
                                            acx + (alongZ ? face * 0.26 : bSlide),
                                            shelfY + 0.19,
                                            acz + (alongZ ? bSlide : face * 0.26)
                                        );
                                        fb.rotation.y = (alongZ ? Math.PI / 2 : 0) + (random() - 0.5) * 0.25;
                                        addGeometry(fb);
                                    }
                                }
                            }
                        }
                        const cap = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, env.metalMat, 0.06);
                        cap.position.set(acx, 2.92, acz);
                        addGeometry(cap);
                    } else {
                        if (random() > 0.72) {
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
                            const stackH = 1 + Math.floor(random() * 3);
                            const sx = acx + (random() - 0.5) * 1.8;
                            const sz = acz + (random() - 0.5) * 1.8;
                            const cartonPool = env.cartonMats || [env.fileBoxMat];
                            for (let i = 0; i < stackH; i++) {
                                const fb = new THREE.Mesh(env.fileBoxGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                fb.position.set(sx + (random() - 0.5) * 0.08, 0.15 + i * 0.3, sz + (random() - 0.5) * 0.08);
                                fb.rotation.y = random() * Math.PI * 2;
                                addGeometry(fb);
                            }
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
                                baseIntensity: 0.3,
                                targetIntensity: 0.3,
                                currentIntensity: 0.3
                            });
                        }
                    }
                }
            };
};
