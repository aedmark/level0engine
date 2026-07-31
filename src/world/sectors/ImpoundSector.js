import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

/**
 * A procedural sector generator characterized by chain-link fences and impounded vehicles.
 *
 * This module shows how to handle "perimeter fencing" in a chunked world.
 * Because chunks are isolated, we have to look at adjacent chunks in the `maze` array
 * (using the `mwWall` helper) to determine if a fence should have an end-post or connect
 * seamlessly to a fence in the neighboring chunk.
 */
export const ImpoundSector = (env, ctx) => {
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
        id: "IMPOUND",
        foundationMat: env.structMat,
        ceilingMat: env.impoundCeilingMat || env.clinicMat,
        build: (x, z, localX, localZ, maze) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.impoundWallMat || env.sharedWallMat, "IMPOUND", 20.0)) {
                return;
            }
            const px = x * env.cellSize, pz = z * env.cellSize;
            const isWall = maze && maze[localX][localZ];
            if (isWall) {
                const FENCE_H = 1.8, FENCE_SCALE = FENCE_H / 3.0;
                if (!env.fenceGeoX) {
                    env.fenceGeoX = new THREE.BoxGeometry(env.cellSize, FENCE_H, 0.05);
                    env.geoCache.set(env.fenceGeoX.uuid, true);
                    env.fenceGeoZ = new THREE.BoxGeometry(0.05, FENCE_H, env.cellSize);
                    env.geoCache.set(env.fenceGeoZ.uuid, true);
                }
                const mwWall = (dx, dz) => {
                    const nx = localX + dx, nz = localZ + dz;
                    return nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze && maze[nx][nz];
                };
                const cPillar = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                cPillar.scale.set(1, FENCE_SCALE, 1);
                cPillar.position.set(px + (env.cellSize / 2), FENCE_H / 2, pz + (env.cellSize / 2));
                addGeometry(cPillar);
                if (!mwWall(-1, 0)) {
                    const endPillar = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                    endPillar.scale.set(1, FENCE_SCALE, 1);
                    endPillar.position.set(px - (env.cellSize / 2), FENCE_H / 2, pz + (env.cellSize / 2));
                    addGeometry(endPillar);
                }
                if (!mwWall(0, -1)) {
                    const endPillar = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                    endPillar.scale.set(1, FENCE_SCALE, 1);
                    endPillar.position.set(px + (env.cellSize / 2), FENCE_H / 2, pz - (env.cellSize / 2));
                    addGeometry(endPillar);
                }
                const buildFenceRun = (alongX) => {
                    const fx = px + (alongX ? 0 : env.cellSize / 2);
                    const fz = pz + (alongX ? env.cellSize / 2 : 0);
                    if (random() > 0.85) {
                        for (let s = -1; s <= 1; s += 2) {
                            const stub = new THREE.Mesh(env._boxGeo(alongX ? 1.3 : 0.05, FENCE_H, alongX ? 0.05 : 1.3), env.fenceMat);
                            stub.position.set(fx + (alongX ? s * 1.35 : 0), FENCE_H / 2, fz + (alongX ? 0 : s * 1.35));
                            addGeometry(stub);
                            const gatePost = new THREE.Mesh(env.vPipeGeo, env.metalMat);
                            gatePost.scale.set(0.7, 0.75 * FENCE_SCALE, 0.7);
                            gatePost.position.set(fx + (alongX ? s * 0.7 : 0), 1.12 * FENCE_SCALE, fz + (alongX ? 0 : s * 0.7));
                            addGeometry(gatePost);
                        }
                        const gateGeo = env._cacheGeo(`impGate:${alongX ? 'X' : 'Z'}`, () => {
                            const g = new THREE.BoxGeometry(alongX ? 1.4 : 0.05, 2.2 * FENCE_SCALE, alongX ? 0.05 : 1.4);
                            g.translate(alongX ? 0.7 : 0, 0, alongX ? 0 : 0.7);
                            return g;
                        });
                        const gate = new THREE.Mesh(gateGeo, env.fenceMat);
                        gate.position.set(fx - (alongX ? 0.7 : 0), 1.15 * FENCE_SCALE, fz - (alongX ? 0 : 0.7));
                        gate.rotation.y = (random() > 0.5 ? 1 : -1) * (0.3 + random() * 1.0);
                        gate.userData.chunkHash = hash;
                        gate.updateMatrixWorld(true);
                        stagingMeshes.push(gate);
                    } else {
                        const fence = new THREE.Mesh(alongX ? env.fenceGeoX : env.fenceGeoZ, env.fenceMat);
                        fence.position.set(fx, FENCE_H / 2, fz);
                        if (random() > (alongX ? 0.1 : 0.2)) fence.userData.isEntityBlocker = true;
                        addGeometry(fence);
                        const rail = new THREE.Mesh(env._boxGeo(alongX ? env.cellSize : 0.07, 0.07, alongX ? 0.07 : env.cellSize), env.rustMat);
                        rail.position.set(fx, FENCE_H - 0.04, fz);
                        addGeometry(rail);
                    }
                };
                buildFenceRun(true);
                buildFenceRun(false);
            } else {
                const edgeInner = env.chunkSize - 2;
                // At a 12% roll across every eligible open-floor cell, nothing was stopping
                // adjacent cells (4 units apart, within one chunk or across a chunk boundary)
                // from all succeeding and piling masts on top of each other. `fixtureData` already
                // survives exactly as long as its owning chunk (pruned on unload, see
                // Environment.updateChunks), so it doubles as a ready-made, self-cleaning registry
                // of where masts already are -- reject any candidate closer than MIN_MAST_SPACING
                // to one of them instead of tracking a separate list.
                const MIN_MAST_SPACING_SQ = 32.0 * 32.0;
                const mastCandidateX = px + env.cellSize / 2;
                const mastCandidateZ = pz + env.cellSize / 2;
                const tooCloseToMast = env.fixtureData.some(f => {
                    if (!f.isImpoundMast) return false;
                    const ddx = f.position.x - mastCandidateX;
                    const ddz = f.position.z - mastCandidateZ;
                    return (ddx * ddx + ddz * ddz) < MIN_MAST_SPACING_SQ;
                });
                if (localX > 1 && localX < edgeInner && localZ > 1 && localZ < edgeInner
                    && random() > 0.88 && !tooCloseToMast) {
                    const mastHeight = 7.5;
                    const mast = new THREE.Mesh(env.vPipeGeo, env.rustMat);
                    mast.scale.set(1.5, mastHeight, 1.5);
                    mast.position.set(px + env.cellSize / 2, mastHeight / 2, pz + env.cellSize / 2);
                    addGeometry(mast);
                    const crossGeo = env._boxGeo(2.4, 0.2, 0.2);
                    const crossbar = new THREE.Mesh(crossGeo, env.rustMat);
                    crossbar.position.set(px + env.cellSize / 2, mastHeight, pz + env.cellSize / 2);
                    const dx = 7 - localX;
                    const dz = 7 - localZ;
                    const rotY = Math.atan2(dx, dz);
                    crossbar.rotation.y = rotY;
                    addGeometry(crossbar);
                    const activeMat = ctx.getLightMaterial(0xffaa55, 0xffaa55, false);
                    // getLightMaterial pools by color, and (0xffaa55, 0xffaa55) is currently
                    // exclusive to this mast, so this only affects these fixtures -- but it's a
                    // shared instance, so if this exact color pair is ever reused elsewhere,
                    // that fixture inherits this too. Fog scatters *reflected* light, not light
                    // coming straight from an emitter at the camera, which is why a real light
                    // source stays visible through haze while the surface around it disappears;
                    // `fog: false` opts this material out of the scene's distance fog so it reads
                    // as a bright point at range instead of blending into the haze color.
                    activeMat.fog = false;
                    const lampGeo = env._boxGeo(1.8, 0.6, 0.4);
                    const lamp = new THREE.Mesh(lampGeo, [env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat]);
                    lamp.position.set(px + env.cellSize / 2, mastHeight + 0.3, pz + env.cellSize / 2);
                    lamp.rotation.order = 'YXZ';
                    lamp.rotation.set(Math.PI / 4, rotY, 0);
                    chunkGroup.add(lamp);
                    env.walls.push(lamp);
                    const lx = (px + env.cellSize / 2) + Math.sin(rotY) * 0.8;
                    const lz = (pz + env.cellSize / 2) + Math.cos(rotY) * 0.8;
                    const tx = lx + Math.sin(rotY) * 10.0;
                    const tz = lz + Math.cos(rotY) * 10.0;
                    const targetPos = new THREE.Vector3(tx, 0, tz);
                    // Volumetric beam: same trick ChasmSector's lighthouse uses to fake its cone
                    // being visible through fog (env._lhBeamMat/lhBeam: a hollow, barely-opaque
                    // additive cone, apex at the fixture) so the stadium light actually reads as a
                    // shaft of light in the yard's haze instead of just a bright bulb. The
                    // lighthouse re-aims its beam every frame because it sweeps; this fixture's aim
                    // is fixed, so `lookAt` is called once here at build time instead.
                    if (!env._impoundBeamMat) {
                        env._impoundBeamMat = new THREE.MeshBasicMaterial({
                            color: 0xffaa55,
                            transparent: true,
                            // Kept below the lighthouse beam's own 0.02 -- this cone is wider and
                            // the light behind it is brighter, and it's a hollow DoubleSide shell,
                            // so the camera crosses two layers of it (near + far wall) for a single
                            // beam, roughly doubling the apparent opacity on top of that.
                            opacity: 0.012,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                            side: THREE.DoubleSide
                        });
                        env.sharedAssets.add(env._impoundBeamMat.uuid);
                    }
                    const beamGeo = env._cacheGeo('impoundBeam', () => {
                        const geo = new THREE.CylinderGeometry(0.15, 4.5, 13.0, 16, 1, true);
                        geo.translate(0, -6.5, 0);
                        geo.rotateX(-Math.PI / 2);
                        return geo;
                    });
                    const beamPivot = new THREE.Group();
                    beamPivot.position.set(lx, mastHeight, lz);
                    beamPivot.add(new THREE.Mesh(beamGeo, env._impoundBeamMat));
                    chunkGroup.add(beamPivot);
                    beamPivot.lookAt(targetPos);
                    const flare = new THREE.Sprite(env.flareMat.clone());
                    flare.material.color.setHex(0xffaa55);
                    flare.material.opacity = 0.8;
                    flare.scale.set(8.0, 8.0, 1.0);
                    flare.position.set(lx, mastHeight + 0.2, lz);
                    chunkGroup.add(flare);
                    env.fixtureData.push({
                        chunkHash: hash,
                        position: new THREE.Vector3(lx, mastHeight, lz),
                        isSpot: true,
                        isImpoundMast: true,
                        targetPos: targetPos,
                        // Wide floodlight cone (double the LumenGrid default of PI/8, and wider
                        // than the player's flashlight at PI/7) plus a soft penumbra so the yard
                        // reads as broadly lit rather than a tight spotlit circle.
                        spotAngle: Math.PI / 4,
                        spotPenumbra: 0.6,
                        flickerOffset: random() * 500,
                        material: activeMat,
                        isFaulty: random() > 0.9,
                        // 0.35 non-shadow-slot intensityScalar (see LumenGrid.update) knocks this
                        // down to ~2.8 effective -- above the flashlight's peak of 2.2 -- while a
                        // flat 5.5 here only nets ~1.9, i.e. dimmer than the flashlight.
                        baseIntensity: 8.0,
                        targetIntensity: 8.0,
                        currentIntensity: 8.0,
                        // LumenGrid's default panel glow (0.4) was tuned for an ordinary ceiling
                        // fixture; left alone, this mast would throw a flashlight-beating cone of
                        // light out of a panel that looks unlit. Bright enough to read as a hot
                        // floodlight bulb without matching the lighthouse's dedicated 5.0 beacon.
                        emissiveIntensity: 2.5,
                        distance: 35.0,
                        noShadow: true
                    });
                    return;
                }
                const mw = (dx, dz) => {
                    const nx = localX + dx, nz = localZ + dz;
                    return nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze && maze[nx][nz];
                };
                const pocketWalls = (mw(1, 0) ? 1 : 0) + (mw(-1, 0) ? 1 : 0) + (mw(0, 1) ? 1 : 0) + (mw(0, -1) ? 1 : 0);
                let placedBig = false;
                if (pocketWalls >= 1 && random() > 0.58) {
                    const pick = random();
                    const kind = pick < 0.46 ? 'car' : (pick < 0.74 ? 'machine' : 'tires');
                    placedBig = env._buildImpoundItem(px, pz, kind, {addFurniture, chunkGroup, hash, random});
                }
                if (!placedBig && pocketWalls >= 2 && random() > 0.7) {
                    const hoard = random();
                    if (hoard < 0.5 && env.cartonGeo) {
                        const cartonPool = env.cartonMats || [env.fileBoxMat];
                        const hbx = px + (random() - 0.5) * 1.2;
                        const hbz = pz + (random() - 0.5) * 1.2;
                        const hYaw = random() * Math.PI;
                        const hN = 1 + Math.floor(random() * 3);
                        for (let ci = 0; ci < hN; ci++) {
                            const fb = new THREE.Mesh(env.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                            fb.position.set(hbx + (random() - 0.5) * 0.08, 0.25 + ci * 0.5, hbz + (random() - 0.5) * 0.08);
                            fb.rotation.y = hYaw + (random() - 0.5) * 0.3;
                            addGeometry(fb);
                        }
                        if (random() > 0.5) {
                            const tag = new THREE.Mesh(env.documentGeo, env.documentMat);
                            tag.position.set(hbx, hN * 0.5 + 0.01, hbz);
                            tag.rotation.y = random() * Math.PI;
                            tag.userData = {
                                type: 'document',
                                chunkHash: hash,
                                active: true,
                                zone: 'IMPOUND',
                                docId: 'TAG_' + Math.floor(random() * 9999)
                            };
                            chunkGroup.add(tag);
                            env._registerInteractable(tag, hash);
                        }
                    } else if (hoard < 0.75) {
                        addFurniture(buildTable(px, 0, pz));
                    } else {
                        addFurniture(buildChair(px + 0.4, 0, pz, random() * Math.PI * 2));
                        addFurniture(buildChair(px - 0.5, 0, pz + 0.3, random() * Math.PI * 2));
                    }
                }
            }
        }
    };
};