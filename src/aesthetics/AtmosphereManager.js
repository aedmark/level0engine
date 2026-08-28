import SECTORS, {DEFAULT_DUST, DEFAULT_EXHAUST, DEFAULT_AMBIENT, MIN_AMBIENT, DEFAULT_GROUND_COLOR, DEFAULT_ATMOSPHERE_COLOR} from '../world/Sectors.js';

export default class AtmosphereManager {
    constructor(env) {
        this.env = env;
    }

    updateLights(time) {
        const env = this.env;
        const cameraPos = env.camera.position;

        this._updateFixtures(time);

        if (!env.audioRaycaster) {
            env.audioRaycaster = new THREE.Raycaster();
            env.audioDirection = new THREE.Vector3();
        }

        const currentChunkHash = `${env.currentChunkCoords.x},${env.currentChunkCoords.z}`;
        const lumenData = env.lumenGrid.update(cameraPos, env.fixtureData, time, currentChunkHash);
        const darknessPressure = lumenData.darknessPressure;
        const nearestFixture = lumenData.nearestFixture;
        const minLightDistSq = lumenData.minLightDistSq;
        env.player.darknessPressure = darknessPressure;
        const minLightDist = nearestFixture ? Math.sqrt(minLightDistSq) : Infinity;

        this._updateGlareAndPupil(time, cameraPos, nearestFixture, minLightDistSq, minLightDist);
        const isOccluded = this._updateAudioOcclusion(time, cameraPos, nearestFixture, minLightDist);
        
        const {activeSector, targetFog} = env._sectorFrame || env._resolveActiveSector(cameraPos);
        
        this._updateFogAndAtmosphere(time, darknessPressure, activeSector, targetFog);
        this._updateParticles(time, cameraPos, activeSector);
        const pendingThunder = this._updateLightning(time, activeSector, cameraPos);

        const anomalyPressure = env.player.anomalyPressure || 0;
        this._updateObjectives(cameraPos, anomalyPressure);
        
        const playerSpeed = Math.sqrt((env.player.velocity.x * env.player.velocity.x) + (env.player.velocity.z * env.player.velocity.z));
        this._updateFlashlightAndAmbient(darknessPressure, activeSector);

        if (env.fixtureData) {
            for (let i = 0; i < env.fixtureData.length; i++) {
                const fix = env.fixtureData[i];
                if (fix.lightObj) {
                    fix.lightObj.intensity = fix.currentIntensity;
                }
            }
        }

        let idlingCarDistSq = 999999.0;
        if (env.idlingCars) {
            for (let i = 0; i < env.idlingCars.length; i++) {
                const c = env.idlingCars[i];
                const d = c.position.distanceToSquared(cameraPos);
                if (d < idlingCarDistSq) idlingCarDistSq = d;
            }
        }

        return {
            minLightDist,
            isOccluded,
            activeSector,
            anomalyPressure,
            playerSpeed,
            playerExhaustion: env.player.exhaustion,
            isBlackout: env.blackoutChunks.size > 0,
            idlingCarDistSq,
            pendingThunder
        };
    }

    _updateLightning(time, activeSector, cameraPos) {
        const env = this.env;
        const inAcme = activeSector === 'ACME' && !env.tutorialActive;
        let pendingThunder = null;
        if (inAcme) {
            if (!env._lightningNextStrike) env._lightningNextStrike = time + 6.0 + Math.random() * 10.0;
            if (time >= env._lightningNextStrike) {
                env._lightningNextStrike = time + 14.0 + Math.random() * 34.0;
                const closeness = Math.random();
                if (!env._lightningLight) env._lightningLight = env.engine.lightningLight;
                env._lightningFlashStart = time;
                env._lightningFlashPeak = 1.5 + closeness * 4.5;
                env._lightningFlashCloseness = closeness;
                env._lightningDoubleFlash = Math.random() < 0.35;
                pendingThunder = {delay: 0.4 + (1.0 - closeness) * 2.6, intensity: 0.5 + closeness * 0.5};
            }
        } else {
            env._lightningNextStrike = 0;
        }
        if (env._lightningLight) {
            const pulse = (t) => t < 0 ? 0 : (t < 0.04 ? 1 : Math.exp(-(t - 0.04) * 20));
            const elapsed = time - (env._lightningFlashStart || -999);
            let envelope = pulse(elapsed);
            if (env._lightningDoubleFlash) envelope += pulse(elapsed - 0.12) * 0.6;
            const envNorm = Math.min(1.0, envelope);
            env._lightningLight.intensity = env._lightningFlashPeak * envNorm;
            if (envelope > 0.001) {
                env._lightningLight.position.set(cameraPos.x, cameraPos.y + 60, cameraPos.z);
                env._lightningLight.target.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
                env._lightningLight.target.updateMatrixWorld();
            }
            if (envNorm > 0.001 && env.engine.renderer && env.engine.baseExposure !== undefined) {
                const closeness = env._lightningFlashCloseness || 0;
                env.engine.renderer.toneMappingExposure *= (1.0 + envNorm * (0.8 + closeness * 1.8));
            }
        }
        return pendingThunder;
    }

    _updateFixtures(time) {
        const env = this.env;
        const isChasm = env._stickySectorId === 'CHASM';
        if (env.fixtureData) {
            for (let i = 0; i < env.fixtureData.length; i++) {
                const fixture = env.fixtureData[i];
                if (fixture.swingPivot) {
                    const t = time * fixture.swingSpeed;
                    fixture.swingPivot.rotation.x = Math.sin(t + fixture.swingPhaseX) * fixture.swingAmp;
                    fixture.swingPivot.rotation.z = Math.sin(t * 0.8 + fixture.swingPhaseZ) * fixture.swingAmp * 0.7;
                    fixture.swingPivot.updateMatrixWorld(true);
                    fixture.swingBulb.getWorldPosition(fixture.position);
                    fixture.targetPos.set(fixture.position.x, fixture.position.y - 6.0, fixture.position.z);
                }
                if (fixture.isTowBeacon) {
                    const angle = time * fixture.sweepSpeed + fixture.sweepPhase;
                    if (!fixture.targetPos) fixture.targetPos = new THREE.Vector3();
                    fixture.targetPos.x = fixture.position.x + Math.cos(angle) * 10.0;
                    fixture.targetPos.z = fixture.position.z + Math.sin(angle) * 10.0;
                    fixture.targetPos.y = fixture.position.y - 1.0;
                    continue;
                }
                if (fixture.isLighthouse) {
                    if (!isChasm) {
                        fixture.currentIntensity = 0.0;
                        fixture.targetIntensity = 0.0;
                        if (fixture.volumetricMesh) fixture.volumetricMesh.visible = false;
                        if (fixture.housingMesh) fixture.housingMesh.visible = false;
                        continue;
                    } else if (fixture.volumetricMesh && !fixture.volumetricMesh.visible) {
                        fixture.currentIntensity = fixture.baseIntensity;
                        fixture.targetIntensity = fixture.baseIntensity;
                        fixture.volumetricMesh.visible = true;
                        if (fixture.housingMesh) fixture.housingMesh.visible = true;
                    }
                    const angle = time * fixture.sweepSpeed + fixture.sweepPhase;
                    fixture.targetPos.x = fixture.position.x + Math.cos(angle) * 10.0;
                    fixture.targetPos.z = fixture.position.z + Math.sin(angle) * 10.0;
                    fixture.targetPos.y = 0.0;
                    if (fixture.volumetricMesh) {
                        fixture.volumetricMesh.lookAt(fixture.targetPos);
                    }
                    if (fixture.housingMesh) {
                        fixture.housingMesh.rotation.y = Math.atan2(fixture.targetPos.x - fixture.position.x, fixture.targetPos.z - fixture.position.z);
                    }
                }
            }
        }
    }

    _updateGlareAndPupil(time, cameraPos, nearestFixture, minLightDistSq, minLightDist) {
        const env = this.env;
        if (env.currentGlare === undefined) env.currentGlare = 0.0;
        if (env.currentGlareColor === undefined) env.currentGlareColor = new THREE.Color(1, 1, 1);
        if (!env.engine.glareColor) env.engine.glareColor = new THREE.Color(1, 1, 1);
        let glareTarget = 0.0;
        let targetGlareColor = env.currentGlareColor;
        env._glareDot = -1.0;
        if (nearestFixture && minLightDist > 1.0) {
            if (!env._camDir) env._camDir = new THREE.Vector3();
            env.camera.getWorldDirection(env._camDir);
            if (!env._glareDir) env._glareDir = new THREE.Vector3();
            env._glareDir.subVectors(nearestFixture.position, cameraPos).normalize();
            const dot = env._camDir.dot(env._glareDir);
            env._glareDot = dot;
            if (dot > 0.99) {
                let beamAlign = 1.0;
                let distFactor = 1.0 / (1.0 + minLightDist * 0.2);
                if (nearestFixture.targetPos) {
                    if (!env._lightBeamDir) env._lightBeamDir = new THREE.Vector3();
                    env._lightBeamDir.subVectors(nearestFixture.targetPos, nearestFixture.position).normalize();
                    if (!env._playerFromLight) env._playerFromLight = new THREE.Vector3();
                    env._playerFromLight.subVectors(cameraPos, nearestFixture.position).normalize();
                    beamAlign = env._lightBeamDir.dot(env._playerFromLight);
                } else if (nearestFixture.isArchiveLight) {
                    if (!env._archiveGlareDownDir) env._archiveGlareDownDir = new THREE.Vector3(0, -1, 0);
                    if (!env._playerFromLight) env._playerFromLight = new THREE.Vector3();
                    env._playerFromLight.subVectors(cameraPos, nearestFixture.position).normalize();
                    beamAlign = env._archiveGlareDownDir.dot(env._playerFromLight);
                    distFactor = Math.max(0.0, 1.0 - (minLightDist / 5.0));
                }
                if (beamAlign > 0.3) {
                    const intensity = nearestFixture.currentIntensity || nearestFixture.baseIntensity || 1.0;
                    const angleFactor = (dot - 0.99) * 100.0;
                    const directionalFactor = (nearestFixture.targetPos || nearestFixture.isArchiveLight)
                        ? Math.max(0, (beamAlign - 0.3) * 1.42) : 1.0;
                    let targetVal = intensity * distFactor * angleFactor * directionalFactor * 0.2;
                    
                    if (targetVal > 0.0) {
                        if (!env._glareRaycaster) env._glareRaycaster = new THREE.Raycaster();
                        env._glareRaycaster.set(cameraPos, env._glareDir);
                        const localBoxes = env.spatialGrid.getNearby(cameraPos.x, cameraPos.z, minLightDist);
                        const ray = env._glareRaycaster.ray;
                        const distSqLimit = cameraPos.distanceToSquared(nearestFixture.position);
                        let isHit = false;
                        if (!env._glareHitTarget) env._glareHitTarget = new THREE.Vector3();
                        for (let i = 0; i < localBoxes.length; i++) {
                            if (localBoxes[i].isInvisibleBlocker) continue;
                            if (ray.intersectBox(localBoxes[i], env._glareHitTarget)) {
                                if (cameraPos.distanceToSquared(env._glareHitTarget) < distSqLimit) {
                                    isHit = true;
                                    break;
                                }
                            }
                        }
                        if (isHit) {
                            targetVal = 0.0;
                        } else {
                            if (nearestFixture.material && nearestFixture.material.emissive) {
                                targetGlareColor = nearestFixture.material.emissive;
                            }
                        }
                    }
                    glareTarget = targetVal;
                }
            }
        }
        env.currentGlare += (glareTarget - env.currentGlare) * 0.1;
        env.currentGlareColor.lerp(targetGlareColor, 0.1);
        env._glareRaw = glareTarget;
        env._glareDist = minLightDist;

        const PUPIL_CONSTRICT_RATE = 0.80;
        const PUPIL_DILATE_RATE = 0.28;
        const PUPIL_SATURATION = 0.25;
        const PUPIL_MAX_ATTENUATION = 0.90;
        const PUPIL_MAX_DIM = 0.40;
        const dt = env._lastGlareTime === undefined
            ? 0.016
            : Math.min(0.1, Math.max(0.0, time - env._lastGlareTime));
        env._lastGlareTime = time;
        if (env.pupilAdapt === undefined) env.pupilAdapt = 0.0;
        const adaptTarget = Math.min(1.0, env.currentGlare / PUPIL_SATURATION);
        const adaptRate = adaptTarget > env.pupilAdapt ? PUPIL_CONSTRICT_RATE : PUPIL_DILATE_RATE;
        env.pupilAdapt += (adaptTarget - env.pupilAdapt) * (1.0 - Math.exp(-adaptRate * dt));

        env.engine.glare = env.currentGlare * (1.0 - env.pupilAdapt * PUPIL_MAX_ATTENUATION);
        env.engine.glareColor.copy(env.currentGlareColor);
        if (env.engine.renderer && env.engine.baseExposure !== undefined) {
            env.engine.renderer.toneMappingExposure =
                env.engine.baseExposure * (1.0 - env.pupilAdapt * PUPIL_MAX_DIM);
        }
    }

    _updateAudioOcclusion(time, cameraPos, nearestFixture, minLightDist) {
        const env = this.env;
        if (nearestFixture && minLightDist > 1.0) {
            if (time - env.lastAudioOcclusionTime > 0.1) {
                env.audioDirection.subVectors(nearestFixture.position, cameraPos).normalize();
                env.audioRaycaster.set(cameraPos, env.audioDirection);
                if (!env._rayTarget) env._rayTarget = new THREE.Vector3();
                let isHit = false;
                const localBoxes = env.spatialGrid.getNearby(cameraPos.x, cameraPos.z, Math.min(minLightDist, 15.0));
                const ray = env.audioRaycaster.ray;
                const distSqLimit = minLightDist * minLightDist;
                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].isInvisibleBlocker) continue;
                    if (ray.intersectBox(localBoxes[i], env._rayTarget)) {
                        if (cameraPos.distanceToSquared(env._rayTarget) < distSqLimit) {
                            isHit = true;
                            break;
                        }
                    }
                }
                env.currentOcclusionState = isHit;
                env.lastAudioOcclusionTime = time;
            }
        } else {
            env.currentOcclusionState = false;
        }
        return env.currentOcclusionState;
    }

    _updateFogAndAtmosphere(time, darknessPressure, activeSector, targetFog) {
        const env = this.env;
        if (env.baseFogDensity !== undefined) {
            if (env.currentFogDensity === undefined) env.currentFogDensity = targetFog;
            const userMultiplier = env.baseFogDensity / 0.05;
            const scaledTargetFog = targetFog * userMultiplier;
            const fogRate = scaledTargetFog > env.currentFogDensity ? 0.15 : 0.30;
            env.currentFogDensity += (scaledTargetFog - env.currentFogDensity) * fogRate;
            const fogBreath = Math.sin(time * 0.05) * (env.currentFogDensity * 0.3);
            env.scene.fog.density = env.currentFogDensity + fogBreath;
        }
        if (!env._baseFogColor) env._baseFogColor = new THREE.Color(DEFAULT_ATMOSPHERE_COLOR);
        if (!env._targetFogColor) env._targetFogColor = new THREE.Color();
        const sectorRow = SECTORS[activeSector];
        if (sectorRow && sectorRow.fogColor !== undefined) {
            env._targetFogColor.setHex(sectorRow.fogColor);
        } else {
            env._targetFogColor.copy(env._baseFogColor);
        }
        if (!env._blackColor) env._blackColor = new THREE.Color(0x000000);
        const flashlightIsLit = env.player.flashlightActive && env.flashlight && env.flashlight.intensity > 0.1;
        const darknessRatio = Math.min(1.0, darknessPressure * 0.4) * (flashlightIsLit ? 0.35 : 1.0);
        if (!env._finalFogColor) env._finalFogColor = new THREE.Color();
        const finalTargetColor = env._finalFogColor.copy(env._targetFogColor).lerp(env._blackColor, darknessRatio);
        const colorRate = env._targetFogColor.equals(env._baseFogColor) ? 0.25 : 0.15;
        env.scene.fog.color.lerp(finalTargetColor, colorRate);
        env.scene.background.lerp(finalTargetColor, colorRate);
    }

    _updateParticles(time, cameraPos, activeSector) {
        const env = this.env;
        if (env.dustCloud) {
            const dust = (SECTORS[activeSector] && SECTORS[activeSector].dust) || DEFAULT_DUST;
            const wantsRain = !!dust.rain && !!env.rainTex;
            if (wantsRain !== env._dustIsRain) {
                env._dustIsRain = wantsRain;
                env.dustCloud.material.map = wantsRain ? env.rainTex : env.particleTex;
                env.dustCloud.material.needsUpdate = true;
            }
            env.dustCloud.position.copy(cameraPos);
            env.dustCloud.rotation.y = time * 0.025;
            const positions = env.dustCloud.geometry.attributes.position.array;
            if (dust.drift === 'horizontal') {
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] += 0.18;
                    if (positions[i] > 15.0) positions[i] -= 30.0;
                    positions[i + 2] += 0.05;
                    if (positions[i + 2] > 15.0) positions[i + 2] -= 30.0;
                }
            } else {
                const driftY = dust.driftY;
                const turbulence = dust.turbulence || 0.0;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += driftY * (1.0 - turbulence * ((i % 11) / 11));
                    if (positions[i + 1] > 15.0) positions[i + 1] -= 30.0;
                    else if (positions[i + 1] < -15.0) positions[i + 1] += 30.0;
                }
            }
            env.dustCloud.geometry.attributes.position.needsUpdate = true;
            const isCrawling = env.player.isCrawling;
            const targetDustOpacity = isCrawling ? dust.crawlOpacity : dust.baseOpacity;
            const targetDustSize = isCrawling ? dust.crawlSize : dust.baseSize;
            env.dustCloud.material.opacity += (targetDustOpacity - env.dustCloud.material.opacity) * 0.05;
            env.dustCloud.material.size += (targetDustSize - env.dustCloud.material.size) * 0.05;
            if (!env._dustColor) env._dustColor = new THREE.Color();
            env._dustColor.setHex(dust.color);
            env.dustCloud.material.color.lerp(env._dustColor, 0.05);
        }
        if (env.exhaustCloud) {
            const exhaust = (SECTORS[activeSector] && SECTORS[activeSector].exhaust) || DEFAULT_EXHAUST;
            env.exhaustCloud.position.copy(cameraPos);
            env.exhaustCloud.rotation.y = time * exhaust.spinY;
            env.exhaustCloud.rotation.x = time * exhaust.spinX;
            const exhaustRate = exhaust.opacity > env.exhaustMat.opacity ? 0.08 : 0.20;
            env.exhaustMat.opacity += (exhaust.opacity - env.exhaustMat.opacity) * exhaustRate;
            if (!env._exhaustColor) env._exhaustColor = new THREE.Color();
            env._exhaustColor.setHex(exhaust.color);
            env.exhaustMat.color.lerp(env._exhaustColor, 0.05);
            if (env.exhaustMat.opacity > 0.01) {
                env.exhaustMat.size = exhaust.baseSize + Math.sin(time * exhaust.pulseRate) * exhaust.pulseDepth;
            }
        }
    }

    _updateObjectives(cameraPos, anomalyPressure) {
        const env = this.env;
        // A short-lived message (e.g. a jammed/anomalous fixture's interact response) takes
        // over the POI readout for a few seconds instead of being clobbered on the very next
        // tick by the distance-to-nearest-objective text computed below.
        if (env._objectiveTextOverride) {
            if (performance.now() < env._objectiveTextOverride.until) {
                if (env.player && env.player.updateObjectives) env.player.updateObjectives(env._objectiveTextOverride.text);
                return;
            }
            env._objectiveTextOverride = null;
        }
        if (env.interactables && env.player && env.player.updateObjectives) {
            let nearestDistSq = Infinity;
            const isExitPhase = env.player.objectives.fixed >= env.player.objectives.total;
            if (isExitPhase && !env.player.inventory.hasExitKey) {
                for (const zone of env.macroZones.values()) {
                    if (zone.id !== "ANNEX") continue;
                    const nx = Math.max(zone.minX, Math.min(cameraPos.x, zone.maxX));
                    const nz = Math.max(zone.minZ, Math.min(cameraPos.z, zone.maxZ));
                    const dx = cameraPos.x - nx;
                    const dz = cameraPos.z - nz;
                    const dSq = dx * dx + dz * dz;
                    if (dSq < nearestDistSq) nearestDistSq = dSq;
                }
            } else if (isExitPhase) {
                for (let i = 0; i < env.interactables.length; i++) {
                    const item = env.interactables[i];
                    if (item.userData.type === 'exit' && item.userData.active === true) {
                        const dSq = cameraPos.distanceToSquared(item.position);
                        if (dSq < nearestDistSq) nearestDistSq = dSq;
                    }
                }
            } else {
                if (env._breakerHuntHops === undefined) env._breakerHuntHops = env._rollHuntHops();
                let targetIsPoi = false;
                
                if (env._breakerHuntHops > 0 && env.pointsOfInterest && env.pointsOfInterest.length > 0) {
                    if (env._currentTargetPoi && env._currentTargetPoi.active) {
                        env._currentTargetPoi = null;
                    }
                    
                    if (!env._currentTargetPoi) {
                        let nearestPoiDistSq = Infinity;
                        for (let i = 0; i < env.pointsOfInterest.length; i++) {
                            const poi = env.pointsOfInterest[i];
                            if (poi.active) continue;
                            const dx = cameraPos.x - poi.x;
                            const dz = cameraPos.z - poi.z;
                            const dSq = dx * dx + dz * dz;
                            if (dSq < nearestPoiDistSq) {
                                nearestPoiDistSq = dSq;
                                env._currentTargetPoi = poi;
                            }
                        }
                    }
                    
                    if (env._currentTargetPoi) {
                        const dx = cameraPos.x - env._currentTargetPoi.x;
                        const dz = cameraPos.z - env._currentTargetPoi.z;
                        const distSq = dx * dx + dz * dz;
                        
                        if (distSq < 9.0) {
                            env._currentTargetPoi.active = true;
                            env._currentTargetPoi = null;
                            env._breakerHuntHops--;
                        } else {
                            nearestDistSq = distSq;
                            targetIsPoi = true;
                        }
                    }
                } else {
                    env._currentTargetPoi = null;
                }
                
                if (!targetIsPoi) {
                    if (env._currentTargetSwitch && env._currentTargetSwitch.userData.active) {
                        env._currentTargetSwitch = null;
                    }
                    
                    if (!env._currentTargetSwitch) {
                        if (!env._virtualBreaker && env.player.objectives && env.player.objectives.fixed < env.player.objectives.total) {
                            const camDir = new THREE.Vector3();
                            env.camera.getWorldDirection(camDir);
                            camDir.y = 0;
                            camDir.normalize();
                            
                            const playerChunkX = Math.floor(cameraPos.x / (env.chunkSize * env.cellSize));
                            const playerChunkZ = Math.floor(cameraPos.z / (env.chunkSize * env.cellSize));
                            
                            const targetChunkX = playerChunkX + Math.round(camDir.x * 3);
                            const targetChunkZ = playerChunkZ + Math.round(camDir.z * 3);
                            
                            env._virtualBreaker = {
                                chunkHash: `${targetChunkX},${targetChunkZ}`,
                                worldX: targetChunkX * (env.chunkSize * env.cellSize) + (env.chunkSize * env.cellSize) / 2,
                                worldZ: targetChunkZ * (env.chunkSize * env.cellSize) + (env.chunkSize * env.cellSize) / 2,
                                spawned: false,
                                mesh: null
                            };
                        }
                        
                        if (env._virtualBreaker) {
                            if (env._virtualBreaker.spawned && env._virtualBreaker.mesh) {
                                env._currentTargetSwitch = env._virtualBreaker.mesh;
                            } else {
                                const dx = cameraPos.x - env._virtualBreaker.worldX;
                                const dz = cameraPos.z - env._virtualBreaker.worldZ;
                                const distSq = dx * dx + dz * dz;
                                
                                if (distSq > 100000 && !env._virtualBreaker.spawned) {
                                    env._virtualBreaker = null; 
                                } else {
                                    nearestDistSq = distSq;
                                }
                            }
                        }
                    }
                    
                    if (env._currentTargetSwitch) {
                        nearestDistSq = cameraPos.distanceToSquared(env._currentTargetSwitch.position);
                    }
                }
            }
            const nearestDist = Math.sqrt(nearestDistSq);
            let signalText = nearestDist < 1000 ? `${nearestDist.toFixed(1)}m` : 'WEAK - RELOCATE';
            if (anomalyPressure > 0.05 && nearestDist < 1000) {
                signalText = Math.random() < (anomalyPressure * 1.5) ? 'ERR!_m' : signalText;
            }
            env.player.updateObjectives(signalText);
        }
    }

    _updateFlashlightAndAmbient(darknessPressure, activeSector) {
        const env = this.env;
        if (env.flashlight) {
            let targetIntensity = env.player.flashlightActive ? 1.4 : 0.0;
            if (env.player.flashlightActive) {
                if (env.player.flashlightBattery <= 0) {
                    targetIntensity = 0.0;
                } else {
                    const batteryFactor = Math.min(1.0, env.player.flashlightBattery / 30.0);
                    targetIntensity *= (0.1 + 0.9 * batteryFactor);
                    if (env.player.flashlightBattery < 15.0 && Math.random() > 0.8) {
                        targetIntensity *= 0.1;
                    }
                }
            }
            env.flashlight.intensity += (targetIntensity - env.flashlight.intensity) * 0.4;
            
            const isVent = env.player && env.player.isCrawling;
            const targetAngle = isVent ? Math.PI / 3 : Math.PI / 4;
            const targetPenumbra = isVent ? 0.4 : 0.6;
            const targetDistance = isVent ? 20.0 : 55.0;
            
            env.flashlight.angle += (targetAngle - env.flashlight.angle) * 0.1;
            env.flashlight.penumbra += (targetPenumbra - env.flashlight.penumbra) * 0.1;
            env.flashlight.distance += (targetDistance - env.flashlight.distance) * 0.1;
        }

        if (env.engine.ambientLight) {
            if (env.tutorialActive === undefined) {
                try { env.tutorialActive = !localStorage.getItem('level0_tutorial'); } catch(e) { env.tutorialActive = false; }
            }
            const row = SECTORS[activeSector];
            const sectorAmbient = row && row.ambient !== undefined ? row.ambient : DEFAULT_AMBIENT;
            const targetAmbient = env.tutorialActive ? 0.0 : Math.max(MIN_AMBIENT, sectorAmbient * (1.0 - darknessPressure * 0.5));

            env.engine.ambientLight.intensity += (targetAmbient - env.engine.ambientLight.intensity) * 0.05;

            if (env.engine.ambientLight.isHemisphereLight) {
                const targetGroundHex = row && row.groundColor !== undefined ? row.groundColor : DEFAULT_GROUND_COLOR;
                if (!env._targetGroundColor) env._targetGroundColor = new THREE.Color();
                env._targetGroundColor.setHex(targetGroundHex);
                env.engine.ambientLight.groundColor.lerp(env._targetGroundColor, 0.05);
            }
            if (env.glowMat) {
                let targetGlowOpacity = Math.max(0.0, 1.0 - (darknessPressure * 0.4));
                if (env._stickySectorId === "IMPOUND" || env._stickySectorId === "CHASM" || env._stickySectorId === "ATRIUM" || env._stickySectorId === "CLINIC" || env._stickySectorId === "BOARDROOM" || env._stickySectorId === "ANNEX") targetGlowOpacity = 0.0;
                else if (env._stickySectorId === "ARCHIVE") targetGlowOpacity = 0.15;
                else if (env._stickySectorId === "INCINERATOR") targetGlowOpacity = 0.1;
                env.glowMat.opacity += (targetGlowOpacity - env.glowMat.opacity) * 0.1;
            }
        }
    }

    _sectorFog(id) {
        const env = this.env;
        const s = SECTORS[id];
        return (s && s.fog !== undefined) ? s.fog : 0.05;
    }
}