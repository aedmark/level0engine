export const AnomalousPointOfInterestProfile = (env, ctx) => {
    const {buildWall, addGeometry, buildChair, buildTable, addFurniture, chunkGroup, hash} = ctx;
    return {
        name: "ANOMALOUS POINT OF INTEREST",
        prob: 0.0101, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (!env._globalSwitches) env._globalSwitches = [];
            if (!env.pointsOfInterest) env.pointsOfInterest = [];
            let tooClose = false;
            for (let i = 0; i < env._globalSwitches.length; i++) {
                const s = env._globalSwitches[i];
                const distSq = (cx - s.x) * (cx - s.x) + (cz - s.z) * (cz - s.z);
                const limit = s.poi ? 1600.0 : 900.0;
                if (distSq > 0.1 && distSq < limit) {
                    tooClose = true;
                    break;
                }
            }
            if (ctx.playerPos) {
                const dxPlayer = cx - ctx.playerPos.x;
                const dzPlayer = cz - ctx.playerPos.z;
                if (dxPlayer * dxPlayer + dzPlayer * dzPlayer < 900.0) {
                    tooClose = true;
                }
            }
            if (tooClose) {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(cx, 1.5, cz);
                wall.userData.isEntityBlocker = true;
                addGeometry(wall);
                return;
            }
            let poiSeed = (Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ ctx.runSalt32) >>> 0;
            const poiRandom = () => {
                poiSeed = (poiSeed * 1664525 + 1013904223) >>> 0;
                return poiSeed / 4294967296.0;
            };
            if (poiRandom() > 0.7) {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(cx, 1.5, cz);
                wall.userData.isEntityBlocker = true;
                addGeometry(wall);
                return;
            }
            env._globalSwitches.push({x: cx, z: cz, poi: true, chunkHash: hash});
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            const flavor = Math.floor(poiRandom() * 6);
            if (flavor === 0) {
                if (!env.fallenTileGeo) {
                    env.fallenTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                    env.geoCache.set(env.fallenTileGeo.uuid, true);
                }
                if (!env.rottedTileMat) {
                    env.rottedTileMat = env.ceilMat.clone();
                    env.rottedTileMat.color.setHex(0x93856b);
                    env.rottedTileMat.roughness = 0.95;
                    env.rottedTileMat.userData = { noShadow: true };
                    env.sharedAssets.add(env.rottedTileMat.uuid);
                }
                if (!env.ceilingHoleMat) {
                    env.ceilingHoleMat = new THREE.MeshBasicMaterial({color: 0x060504});
                    env.ceilingHoleMat.userData = { noShadow: true };
                    env.sharedAssets.add(env.ceilingHoleMat.uuid);
                }
                const tileCount = 4 + Math.floor(poiRandom() * 4);
                for (let i = 0; i < tileCount; i++) {
                    const tile = new THREE.Mesh(env.fallenTileGeo, env.rottedTileMat);
                    tile.position.set(cx + (poiRandom() - 0.5) * 2.6, 0.03 + poiRandom() * 0.09, cz + (poiRandom() - 0.5) * 2.6);
                    tile.rotation.set((poiRandom() - 0.5) * 0.3, poiRandom() * Math.PI, (poiRandom() - 0.5) * 0.3);
                    addGeometry(tile);
                }
                const hole = buildWall(2.2, 2.2, env.ceilingHoleMat, 0.02);
                hole.position.set(cx, 2.975, cz);
                addGeometry(hole);

                if (!env.creepyEyeGeo) {
                    env.creepyEyeGeo = new THREE.SphereGeometry(0.04, 12, 12);
                    env.geoCache.set(env.creepyEyeGeo.uuid, true);
                }
                if (!env.creepyEyeMat) {
                    env.creepyEyeMat = new THREE.MeshStandardMaterial({
                        color: 0xffd700,
                        emissive: 0xffaa00,
                        emissiveIntensity: 0.15,
                        roughness: 0.2,
                        metalness: 0.8
                    });
                    env.sharedAssets.add(env.creepyEyeMat.uuid);
                }
                if (!env.creepyPupilMat) {
                    env.creepyPupilMat = new THREE.MeshBasicMaterial({
                        color: 0x000000
                    });
                    env.sharedAssets.add(env.creepyPupilMat.uuid);
                }

                const eyeSpacing = 0.12 + poiRandom() * 0.06;
                const eyeOffsetX = (poiRandom() - 0.5) * 1.2;
                const eyeOffsetZ = (poiRandom() - 0.5) * 1.2;
                
                const angle = poiRandom() * Math.PI * 2;
                const dx = Math.cos(angle) * eyeSpacing / 2;
                const dz = Math.sin(angle) * eyeSpacing / 2;
                
                const blinkOffset = poiRandom() * 1000.0;
                
                const fleeDirX = (poiRandom() - 0.5) * 2.0;
                const fleeDirZ = (poiRandom() - 0.5) * 2.0;
                const fleeLen = Math.sqrt(fleeDirX*fleeDirX + fleeDirZ*fleeDirZ) || 1;
                const fdx = (fleeDirX / fleeLen) * 1.2;
                const fdz = (fleeDirZ / fleeLen) * 1.2;

                const sharedState = {
                    stareTime: 0,
                    fleeing: false,
                    fleeStartTime: 0,
                    lastFrame: -1,
                    lastTime: performance.now()
                };

                const vecToPlayer = new THREE.Vector3();
                const camDir = new THREE.Vector3();
                const eyeCenter = new THREE.Vector3(cx + eyeOffsetX, 2.965, cz + eyeOffsetZ);

                const makeEye = (lx, lz) => {
                    const eye = new THREE.Mesh(env.creepyEyeGeo, env.creepyEyeMat);
                    eye.position.set(cx + eyeOffsetX + lx, 2.965, cz + eyeOffsetZ + lz);
                    
                    const pupil = new THREE.Mesh(env.creepyEyeGeo, env.creepyPupilMat);
                    pupil.scale.set(0.15, 1.0, 1.05);
                    eye.add(pupil);

                    eye.onBeforeRender = function(renderer, scene, camera) {
                        if (!this.visible) return;
                        
                        const t = performance.now();
                        const frame = renderer.info.render.frame;
                        
                        if (sharedState.lastFrame !== frame) {
                            const dt = (t - sharedState.lastTime) * 0.001;
                            sharedState.lastTime = t;
                            sharedState.lastFrame = frame;

                            if (!sharedState.fleeing) {
                                camera.getWorldDirection(camDir);
                                vecToPlayer.copy(eyeCenter).sub(camera.position).normalize();
                                const dist = camera.position.distanceTo(eyeCenter);
                                
                                if (dist < 30.0 && camDir.dot(vecToPlayer) > 0.95) {
                                    sharedState.stareTime += dt;
                                    if (sharedState.stareTime > 2.0) {
                                        sharedState.fleeing = true;
                                        sharedState.fleeStartTime = t;
                                    }
                                } else {
                                    sharedState.stareTime = Math.max(0, sharedState.stareTime - dt * 2.0);
                                }
                            }
                        }

                        this.lookAt(camera.position);

                        let scaleX = 0.9;
                        let scaleY = 0.3;
                        let scaleZ = 0.3;

                        if (sharedState.fleeing) {
                            const fleeTime = (t - sharedState.fleeStartTime) * 0.001;
                            this.position.x = cx + eyeOffsetX + lx + fdx * fleeTime;
                            this.position.z = cz + eyeOffsetZ + lz + fdz * fleeTime;
                            
                            scaleY = 0.15; 
                            
                            if (fleeTime > 0.4) {
                                const shrink = 1.0 - (fleeTime - 0.4) * 2.5;
                                if (shrink <= 0) {
                                    this.visible = false;
                                    return;
                                }
                                scaleX *= shrink;
                                scaleY *= shrink;
                                scaleZ *= shrink;
                            }
                        } else {
                            const tSec = t * 0.001 + blinkOffset;
                            const isBlinking = Math.sin(tSec * 3.5) > 0.98 || Math.sin(tSec * 1.2) > 0.99;
                            if (isBlinking) scaleY = 0.02;
                        }
                        
                        this.scale.set(scaleX, scaleY, scaleZ);
                        this.updateMatrixWorld();
                    };
                    chunkGroup.add(eye);
                };

                makeEye(-dx, -dz);
                makeEye(dx, dz);
            } else if (flavor === 1) {
                const pieces = 2 + Math.floor(poiRandom() * 2);
                for (let i = 0; i < pieces; i++) {
                    const felled = buildChair(cx + (poiRandom() - 0.5) * 1.8, 0, cz + (poiRandom() - 0.5) * 1.8, poiRandom() * Math.PI * 2);
                    felled.rotation.z = (poiRandom() > 0.5 ? 1 : -1) * Math.PI / 2;
                    felled.position.y = 0.38;
                    addFurniture(felled);
                }
                const table = buildTable(cx, 0, cz);
                table.rotation.x = Math.PI / 2;
                table.position.y = 0.5;
                addFurniture(table);
            } else if (flavor === 2) {
                if (!env.anomalySeamMat) {
                    env.anomalySeamMat = new THREE.MeshBasicMaterial({color: 0x7744ff});
                    env.sharedAssets.add(env.anomalySeamMat.uuid);
                }
                const theta = poiRandom() * Math.PI * 2;
                const cosT = Math.cos(theta), sinT = Math.sin(theta);
                const place = (mesh, lx, y, lz) => {
                    mesh.position.set(cx + lx * cosT + lz * sinT, y, cz - lx * sinT + lz * cosT);
                    mesh.rotation.y = theta;
                };
                for (let s = -1; s <= 1; s += 2) {
                    const jamb = new THREE.Mesh(env._boxGeo(0.1, 2.72, 0.3), env.woodMat);
                    place(jamb, s * 0.75, 1.36, 0);
                    addGeometry(jamb);
                }
                const header = new THREE.Mesh(env._boxGeo(1.6, 0.1, 0.3), env.woodMat);
                place(header, 0, 2.77, 0);
                addGeometry(header);
                const door = new THREE.Mesh(env._boxGeo(1.32, 2.60, 0.1), env.doorMat);
                
                if (ctx.buildDoorKnob) {
                    const handle = ctx.buildDoorKnob(0.1, false);
                    handle.position.set(0.56, 0.0, 0);
                    door.add(handle);
                }
                
                place(door, 0, 1.33, 0);
                door.userData = {
                    interact: (p) => {
                        env._objectiveTextOverride = {text: "ERR: THRESHOLD COLLAPSED", until: performance.now() + 3000};
                        if (p && p.updateObjectives) p.updateObjectives("ERR: THRESHOLD COLLAPSED");
                        document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 1.0, intensity: 0.15}}));
                    }
                };
                env.walls.push(door);
                env.interactables.push(door);
                addGeometry(door);
                const glow = new THREE.Mesh(env._boxGeo(1.44, 2.70, 0.03), env.anomalySeamMat);
                place(glow, 0, 1.35, 0);
                glow.userData.chunkHash = hash;
                glow.updateMatrixWorld(true);
                ctx.stagingMeshes.push(glow);

            } else if (flavor === 3) {
                const table = buildTable(cx, 0, cz);
                table.rotation.x = Math.PI;
                table.position.y = 2.95;
                addFurniture(table);
                for (let s = -1; s <= 1; s += 2) {
                    const chair = buildChair(cx + s * 0.95, 0, cz + (poiRandom() - 0.5) * 0.4, s > 0 ? -Math.PI / 2 : Math.PI / 2);
                    chair.rotation.x = Math.PI;
                    chair.position.y = 2.95;
                    addFurniture(chair);
                }
            } else if (flavor === 4) {
                const activeMat = ctx.getLightMaterial(0xfff2cc, 0xffe9b0, false);
                const panel = new THREE.Mesh(env.sharedPanelGeo,
                    [env.baseHousingMat, env.baseHousingMat, activeMat, env.baseHousingMat, env.baseHousingMat, env.baseHousingMat]);
                panel.position.set(cx, 0.055, cz);
                panel.rotation.y = poiRandom() > 0.5 ? Math.PI / 2 : 0;
                chunkGroup.add(panel);
                env.walls.push(panel);
                env.fixtureData.push({
                    chunkHash: hash,
                    position: new THREE.Vector3(cx, 0.4, cz),
                    flickerOffset: poiRandom() * 10.0,
                    material: activeMat,
                    isFaulty: poiRandom() > 0.6,
                    baseIntensity: 0.85,
                    targetIntensity: 0.85,
                    currentIntensity: 0.85
                });
            } else {
                const seats = 5 + Math.floor(poiRandom() * 3);
                const ringR = 1.25 + poiRandom() * 0.3;
                for (let s = 0; s < seats; s++) {
                    const ang = (s / seats) * Math.PI * 2;
                    const chair = buildChair(
                        cx + Math.cos(ang) * ringR, 0, cz + Math.sin(ang) * ringR,
                        -(ang + Math.PI / 2)
                    );
                    addFurniture(chair);
                }
            }
            env.pointsOfInterest.push({x: cx, z: cz, active: false, chunkHash: hash});
        }
    };
};
