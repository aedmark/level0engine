/**
 * [ROLE] Manages grid-based lighting, shadows, and dynamic fixture pooling for the scene.
 * [WHY] Scene performance requires capping active and shadow-casting lights, reusing instances via a pool.
 * [STATE] Stateful. Manages internal pools of THREE.Light instances and tracks active fixtures.
 * [DEPENDS] Implicit dependency on THREE.js scene, time, camera position, and fixture data.
 */
export default class LumenGrid {
    constructor(scene, shadowQuality = 'high') {
        this.scene = scene;
        this.maxActiveLights = 32;
        this.maxShadowLights = 6;
        this.longReachSlots = 8;
        this.lightPool = [];
        this._activeFixtures = new Array(this.maxActiveLights).fill(null);
        this._shadowSlotFixtures = new Array(this.maxShadowLights).fill(null);
        this._shadowRR = 0;
        this.shadowsDirty = false;
        this._lastShadowRefresh = -Infinity;
        this.shadowDirtyInterval = 0.08;
        this.maxForcedShadowUpdatesPerFrame = 3;
        this._pendingShadowSlots = new Set();
        this.spawnFadeInDuration = 0.6;
        const pointShadowSize = 512;
        const spotShadowSize = shadowQuality === 'low' ? 512 : 1024;
        for (let i = 0; i < this.maxActiveLights; i++) {
            const radius = i < this.maxShadowLights ? 20.0 : 10.0;
            const pointLight = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            const spotLight = new THREE.SpotLight(0xffebd6, 0, radius, Math.PI / 8, 0.4, 2.0);
            if (i < this.maxShadowLights) {
                const setupShadow = (l, mapSize) => {
                    l.castShadow = true;
                    l.shadow.mapSize.width = mapSize;
                    l.shadow.mapSize.height = mapSize;
                    l.shadow.camera.near = 0.5;
                    l.shadow.camera.far = 20;
                    l.shadow.bias = -0.0002;
                    l.shadow.normalBias = 0.015;
                    l.shadow.autoUpdate = false;
                };
                setupShadow(pointLight, pointShadowSize);
                setupShadow(spotLight, spotShadowSize);
            }
            this.scene.add(pointLight);
            this.scene.add(spotLight);
            this.scene.add(spotLight.target);
            this.lightPool.push({
                point: pointLight,
                spot: spotLight,
                isSpot: false,
                get active() {
                    return this.isSpot ? this.spot : this.point;
                }
            });
        }
    }

    update(cameraPos, fixtureData, time, currentChunkHash) {
        let darknessPressure = 0;
        if (!this._prevActive) this._prevActive = new Set();
        this._prevActive.clear();
        for (let i = 0; i < this.maxActiveLights; i++) {
            if (this._activeFixtures[i]) this._prevActive.add(this._activeFixtures[i]);
        }
        this._activeFixtures.fill(null);
        const baseCullingLimit = this.maxActiveLights > 12 ? 55.0 : 35.0;
        for (let i = 0, len = fixtureData.length; i < len; i++) {
            const fixture = fixtureData[i];
            const isLH = fixture.isLighthouse;
            if (!isLH && currentChunkHash !== undefined && fixture.chunkHash !== undefined
                && fixture.chunkHash !== currentChunkHash) {
                fixture.hasShadow = false;
                continue;
            }
            const cullLimit = isLH ? 120.0 : baseCullingLimit;
            const dx = cameraPos.x - fixture.position.x;
            if (dx > cullLimit || dx < -cullLimit) {
                fixture.hasShadow = false;
                continue;
            }
            const dz = cameraPos.z - fixture.position.z;
            if (dz > cullLimit || dz < -cullLimit) {
                fixture.hasShadow = false;
                continue;
            }
            const dy = cameraPos.y - fixture.position.y;
            if (dy > cullLimit || dy < -cullLimit) {
                fixture.hasShadow = false;
                continue;
            }
            const distSq = (dx * dx) + (dy * dy) + (dz * dz);
            const maxDistSq = isLH ? 14400.0 : 3025.0;
            if (distSq < maxDistSq) {
                if (fixture.isDead) {
                    darknessPressure += Math.max(0.0, 1.0 - (distSq * 0.00111));
                }
                if (!fixture.isFake) {
                    fixture.distSq = distSq;
                    fixture._biasedDistSq = fixture.hasShadow ? distSq - 40.0 : distSq;
                    if (this._prevActive.has(fixture)) fixture._biasedDistSq -= 30.0;
                    let targetToInsert = fixture;
                    if (!targetToInsert.noShadow) {
                        let insertPos = -1;
                        for (let j = 0; j < this.maxShadowLights; j++) {
                            if (!this._activeFixtures[j] || targetToInsert._biasedDistSq < this._activeFixtures[j]._biasedDistSq) {
                                insertPos = j;
                                break;
                            }
                        }
                        if (insertPos !== -1) {
                            let pushedOut = this._activeFixtures[this.maxShadowLights - 1];
                            for (let j = this.maxShadowLights - 1; j > insertPos; j--) {
                                this._activeFixtures[j] = this._activeFixtures[j - 1];
                            }
                            this._activeFixtures[insertPos] = targetToInsert;
                            targetToInsert = pushedOut;
                        }
                    }
                    if (targetToInsert) {
                        let insertPos2 = -1;
                        for (let j = this.maxShadowLights; j < this.maxActiveLights; j++) {
                            if (!this._activeFixtures[j] || targetToInsert._biasedDistSq < this._activeFixtures[j]._biasedDistSq) {
                                insertPos2 = j;
                                break;
                            }
                        }
                        if (insertPos2 !== -1) {
                            for (let j = this.maxActiveLights - 1; j > insertPos2; j--) {
                                this._activeFixtures[j] = this._activeFixtures[j - 1];
                            }
                            this._activeFixtures[insertPos2] = targetToInsert;
                        }
                    }
                }
            } else {
                fixture.hasShadow = false;
            }
        }
        let nearestFixture = null;
        let minLightDistSq = Infinity;
        const shadowRefreshDue = this.shadowsDirty && (time - this._lastShadowRefresh >= this.shadowDirtyInterval);
        if (shadowRefreshDue) this._lastShadowRefresh = time;
        let forcedShadowUpdatesThisFrame = 0;
        for (let i = 0; i < this.maxActiveLights; i++) {
            const wrapper = this.lightPool[i];
            const fixture = this._activeFixtures[i];
            if (fixture) {
                const isShadowSlot = i < this.maxShadowLights;
                if (fixture.isTowBeacon && !isShadowSlot) {
                    wrapper.isSpot = false;
                } else {
                    wrapper.isSpot = fixture.isSpot === true;
                }
                const light = wrapper.active;
                const inactiveLight = wrapper.isSpot ? wrapper.point : wrapper.spot;
                inactiveLight.intensity = 0;
                const isLH = fixture.isLighthouse;
                const isShadowCaster = i < this.maxShadowLights;
                fixture.hasShadow = isShadowCaster;
                if (isShadowCaster) {
                    const reqFar = isLH ? 150.0 : 20.0;
                    if (light.shadow.camera.far !== reqFar) {
                        light.shadow.camera.far = reqFar;
                        light.shadow.camera.updateProjectionMatrix();
                        light.shadow.needsUpdate = true;
                    }
                    if (this._shadowSlotFixtures[i] !== fixture || shadowRefreshDue) {
                        this._shadowSlotFixtures[i] = fixture;
                        if (forcedShadowUpdatesThisFrame < this.maxForcedShadowUpdatesPerFrame) {
                            light.shadow.needsUpdate = true;
                            forcedShadowUpdatesThisFrame++;
                            this._pendingShadowSlots.delete(i);
                        } else {
                            this._pendingShadowSlots.add(i);
                        }
                    }
                }
                if (fixture.distSq < minLightDistSq) {
                    minLightDistSq = fixture.distSq;
                    nearestFixture = fixture;
                }
                light.position.copy(fixture.position);
                if (wrapper.isSpot && fixture.targetPos) {
                    light.target.position.copy(fixture.targetPos);
                    light.angle = fixture.spotAngle !== undefined ? fixture.spotAngle : Math.PI / 8;
                    light.penumbra = fixture.spotPenumbra !== undefined ? fixture.spotPenumbra : 0.4;
                }
                const isLongReach = i < this.longReachSlots;
                const targetReach = fixture.distance !== undefined
                    ? fixture.distance
                    : (isLH ? 150.0 : (isLongReach ? 20.0 : 10.0));
                    
                if (fixture._currentReach === undefined) fixture._currentReach = targetReach;
                fixture._currentReach += (targetReach - fixture._currentReach) * 0.04;
                light.distance = fixture._currentReach;

                const dist = Math.sqrt(fixture.distSq);
                const cullLimit = this.maxActiveLights > 12 ? 55.0 : 35.0;
                const activeRadius = fixture.distance !== undefined
                    ? Math.max(fixture.distance, cullLimit)
                    : (isLH ? 120.0 : cullLimit);
                const distanceEnvelope = Math.max(0, Math.min(1, (activeRadius - dist) / 25.0));
                if (fixture._activatedAt === undefined) fixture._activatedAt = time;
                const sinceActivation = time - fixture._activatedAt;
                const spawnRamp = sinceActivation >= this.spawnFadeInDuration
                    ? 1.0 : Math.max(0, sinceActivation / this.spawnFadeInDuration);
                const fadeEnvelope = distanceEnvelope * spawnRamp;
                let targetScalar = isShadowCaster ? 0.65 : 0.35;
                if (fixture._currentScalar === undefined) fixture._currentScalar = targetScalar;

                let intensityScalar;
                if (isShadowCaster && this._pendingShadowSlots.has(i)) {
                    fixture._currentScalar = 0.0;
                    intensityScalar = 0.0;
                } else {
                    fixture._currentScalar += (targetScalar - fixture._currentScalar) * 0.05;
                    intensityScalar = fixture._currentScalar;
                }
                if (fixture.material && fixture.material.emissive) {
                    light.color.copy(fixture.material.emissive);
                }
                if (fixture.isDead) {
                    light.intensity = 0.0;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.0;

                } else if (fixture.isStrobe) {
                    const strobeFreq = 12.0;
                    const isOn = Math.sin(time * Math.PI * 2 * strobeFreq + fixture.flickerOffset) > 0;
                    fixture.currentIntensity = isOn ? fixture.baseIntensity * 1.5 : 0.0;
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = (isOn ? 1.5 : 0.0) * fadeEnvelope;
                } else if (fixture.isPulse) {
                    const pulseFreq = 0.5;
                    const pulseVal = (Math.sin(time * Math.PI * 2 * pulseFreq + fixture.flickerOffset) + 1.0) / 2.0;
                    const eased = pulseVal * pulseVal * (3.0 - 2.0 * pulseVal);
                    fixture.currentIntensity = fixture.baseIntensity * (0.3 + 0.7 * eased);
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = (0.2 + 0.8 * eased) * fadeEnvelope;
                } else if (fixture.isTowBeacon && !fixture.hasShadow) {
                    const pulseVal = (Math.sin(time * fixture.sweepSpeed + fixture.sweepPhase) + 1.0) / 2.0;
                    const eased = pulseVal * pulseVal;
                    fixture.currentIntensity = fixture.baseIntensity * (0.2 + 1.3 * eased);
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = (0.5 + 1.5 * eased) * fadeEnvelope;
                } else if (fixture.isFaulty) {
                    if (fixture._nextFlicker === undefined) {
                        fixture._nextFlicker = time + 0.5 + Math.random() * 4.0;
                        fixture._flickering = false;
                    }
                    if (!fixture._flickering && time >= fixture._nextFlicker) {
                        fixture._flickering = true;
                        fixture._flickerUntil = time + 0.04 + Math.random() * 0.12;
                        fixture._flickerDepth = Math.random() < 0.3 ? 0.0 : 0.05 + Math.random() * 0.3;
                    } else if (fixture._flickering && time >= fixture._flickerUntil) {
                        fixture._flickering = false;
                        fixture._nextFlicker = Math.random() < 0.4
                            ? time + 0.03 + Math.random() * 0.1
                            : time + 1.0 + Math.random() * 6.0;
                    }
                    const flickerScale = fixture._flickering ? fixture._flickerDepth : 1.0;
                    fixture.currentIntensity = fixture.baseIntensity * flickerScale;
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) {
                        const peakEmissive = fixture.emissiveIntensity !== undefined
                            ? fixture.emissiveIntensity * flickerScale
                            : fixture.currentIntensity * 0.6;
                        fixture.material.emissiveIntensity = Math.max(0.05, peakEmissive) * fadeEnvelope;
                    }
                } else {
                    const normalIntensity = fixture.currentIntensity !== undefined ? fixture.currentIntensity : fixture.baseIntensity;
                    light.intensity = (normalIntensity + (Math.sin(time * 120.0 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
                    if (fixture.material) {
                        const baseEmissive = fixture.isLighthouse
                            ? 5.0
                            : (fixture.emissiveIntensity !== undefined ? fixture.emissiveIntensity : 0.4);
                        fixture.material.emissiveIntensity = baseEmissive * fadeEnvelope;
                    }
                }
            } else {
                wrapper.point.intensity = 0;
                wrapper.spot.intensity = 0;
                if (i < this.maxShadowLights) {
                    this._shadowSlotFixtures[i] = null;
                    this._pendingShadowSlots.delete(i);
                }
            }
        }
        if (this._pendingShadowSlots.size > 0) {
            const nextPending = this._pendingShadowSlots.values().next().value;
            this._pendingShadowSlots.delete(nextPending);
            if (this._activeFixtures[nextPending]) {
                this.lightPool[nextPending].active.shadow.needsUpdate = true;
            }
        } else if (this._activeFixtures[this._shadowRR]) {
            this.lightPool[this._shadowRR].active.shadow.needsUpdate = true;
        }
        this._shadowRR = (this._shadowRR + 1) % this.maxShadowLights;
        this.shadowsDirty = false;
        return {darknessPressure, nearestFixture, minLightDistSq};
    }
}