const OCCLUDED_LIGHT_FLOOR = 0.20;
const OCCLUDER_MIN_HEIGHT = 2.0;
const SIGHTLINE_END_INSET = 0.45;
const OCCLUSION_TEST_INTERVAL = 0.25;
const MAX_OCCLUSION_TESTS_PER_FRAME = 8;
const OCCLUSION_SLOT_PENALTY = 900.0;

export default class LumenGrid {
    constructor(env, shadowQuality = 'high') {
        this.env = env;
        this.scene = env.scene;
        this.maxActiveLights = 16;
        this.maxShadowLights = 6;
        this.longReachSlots = 6;
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

        this._occlusionTestsThisFrame = 0;
        darknessPressure = this._cullAndSortFixtures(cameraPos, fixtureData, currentChunkHash, time);

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
                
                const isShadowCaster = i < this.maxShadowLights;
                fixture.hasShadow = isShadowCaster;
                
                if (isShadowCaster) {
                    const reqFar = fixture.isLighthouse ? 150.0 : 20.0;
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

                if (!fixture.noGlare && fixture.distSq < minLightDistSq) {
                    minLightDistSq = fixture.distSq;
                    nearestFixture = fixture;
                }
                
                this._updateLightProperties(light, fixture, i, time, isShadowCaster);
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

    _segmentHitsBox(ox, oy, oz, dx, dy, dz, box) {
        let tmin = 0.0;
        let tmax = 1.0;
        if (Math.abs(dx) < 1e-9) {
            if (ox < box.min.x || ox > box.max.x) return false;
        } else {
            let t1 = (box.min.x - ox) / dx;
            let t2 = (box.max.x - ox) / dx;
            if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) return false;
        }
        if (Math.abs(dy) < 1e-9) {
            if (oy < box.min.y || oy > box.max.y) return false;
        } else {
            let t1 = (box.min.y - oy) / dy;
            let t2 = (box.max.y - oy) / dy;
            if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) return false;
        }
        if (Math.abs(dz) < 1e-9) {
            if (oz < box.min.z || oz > box.max.z) return false;
        } else {
            let t1 = (box.min.z - oz) / dz;
            let t2 = (box.max.z - oz) / dz;
            if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) return false;
        }
        return true;
    }

    _isSightLineBlocked(fixturePos, cameraPos) {
        const grid = this.env && this.env.spatialGrid;
        if (!grid || !grid.forEachAlongSegment) return false;
        let dx = cameraPos.x - fixturePos.x;
        let dy = cameraPos.y - fixturePos.y;
        let dz = cameraPos.z - fixturePos.z;
        const len = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        if (len < SIGHTLINE_END_INSET * 2.5) return false;
        const inset = SIGHTLINE_END_INSET / len;
        const ox = fixturePos.x + dx * inset;
        const oy = fixturePos.y + dy * inset;
        const oz = fixturePos.z + dz * inset;
        const scale = 1.0 - (inset * 2.0);
        dx *= scale;
        dy *= scale;
        dz *= scale;
        return grid.forEachAlongSegment(ox, oz, ox + dx, oz + dz, (box) => {
            if (box.isInvisibleBlocker || box.isVoid || box.isWarpZone) return false;
            if (box.isGrate && box.meshRef && !box.meshRef.userData.active) return false;
            if (box.max.y - box.min.y < OCCLUDER_MIN_HEIGHT) return false;
            return this._segmentHitsBox(ox, oy, oz, dx, dy, dz, box);
        });
    }

    _updateFixtureVisibility(fixture, cameraPos, time) {
        if (fixture._visibility === undefined) {
            fixture._visibility = 1.0;
            fixture._occluded = false;
            fixture._visTestAt = -(fixture.flickerOffset || 0) * 0.05;
        }
        if (time - fixture._visTestAt >= OCCLUSION_TEST_INTERVAL &&
            this._occlusionTestsThisFrame < MAX_OCCLUSION_TESTS_PER_FRAME) {
            fixture._visTestAt = time;
            this._occlusionTestsThisFrame++;
            fixture._occluded = this._isSightLineBlocked(fixture.position, cameraPos);
        }
        const target = fixture._occluded ? OCCLUDED_LIGHT_FLOOR : 1.0;
        fixture._visibility += (target - fixture._visibility) * 0.06;
    }

    _cullAndSortFixtures(cameraPos, fixtureData, currentChunkHash, time) {
        let darknessPressure = 0;
        const baseCullingLimit = this.maxActiveLights > 12 ? 55.0 : 35.0;
        
        for (let i = 0, len = fixtureData.length; i < len; i++) {
            const fixture = fixtureData[i];
            const isLH = fixture.isLighthouse;
            
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
                    this._updateFixtureVisibility(fixture, cameraPos, time);
                    fixture._biasedDistSq = fixture.hasShadow ? distSq - 120.0 : distSq;
                    if (this._prevActive.has(fixture)) fixture._biasedDistSq -= 30.0;
                    if (fixture.slotBias) fixture._biasedDistSq += fixture.slotBias;
                    if (fixture._visibility < 0.3) fixture._biasedDistSq += OCCLUSION_SLOT_PENALTY;
                    this._insertFixture(fixture);
                }
            } else {
                fixture.hasShadow = false;
            }
        }
        
        return darknessPressure;
    }

    _insertFixture(fixture) {
        if (!fixture.noShadow) {
            let insertPos = -1;
            for (let j = 0; j < this.maxShadowLights; j++) {
                if (!this._activeFixtures[j] || fixture._biasedDistSq < this._activeFixtures[j]._biasedDistSq) {
                    insertPos = j;
                    break;
                }
            }
            if (insertPos !== -1) {
                let pushedOut = this._activeFixtures[this.maxShadowLights - 1];
                for (let j = this.maxShadowLights - 1; j > insertPos; j--) {
                    this._activeFixtures[j] = this._activeFixtures[j - 1];
                }
                this._activeFixtures[insertPos] = fixture;
                fixture = pushedOut;
            }
        }
        if (fixture) {
            let insertPos2 = -1;
            for (let j = this.maxShadowLights; j < this.maxActiveLights; j++) {
                if (!this._activeFixtures[j] || fixture._biasedDistSq < this._activeFixtures[j]._biasedDistSq) {
                    insertPos2 = j;
                    break;
                }
            }
            if (insertPos2 !== -1) {
                for (let j = this.maxActiveLights - 1; j > insertPos2; j--) {
                    this._activeFixtures[j] = this._activeFixtures[j - 1];
                }
                this._activeFixtures[insertPos2] = fixture;
            }
        }
    }

    _updateLightProperties(light, fixture, index, time, isShadowCaster) {
        light.position.copy(fixture.position);
        
        if (fixture.isSpot && fixture.targetPos && light.target) {
            light.target.position.copy(fixture.targetPos);
            light.target.updateMatrixWorld();
            light.angle = fixture.spotAngle !== undefined ? fixture.spotAngle : Math.PI / 8;
            light.penumbra = fixture.spotPenumbra !== undefined ? fixture.spotPenumbra : 0.4;
        }
        
        const isLH = fixture.isLighthouse;
        const isLongReach = index < this.longReachSlots;
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
        if (isShadowCaster && this._pendingShadowSlots.has(index)) {
            intensityScalar = fixture._currentScalar;
        } else {
            fixture._currentScalar += (targetScalar - fixture._currentScalar) * 0.05;
            intensityScalar = fixture._currentScalar;
        }
        if (fixture._visibility !== undefined) intensityScalar *= fixture._visibility;

        if (fixture.color) {
            light.color.copy(fixture.color);
        } else if (fixture.material && fixture.material.emissive) {
            light.color.copy(fixture.material.emissive);
        }
        
        this._applyBehaviors(fixture, light, time, fadeEnvelope, intensityScalar);
    }

    _applyBehaviors(fixture, light, time, fadeEnvelope, intensityScalar) {
        if (fixture.isDead) {
            this._applyDeadBehavior(fixture, light);
        } else if (fixture.isStrobe) {
            this._applyStrobeBehavior(fixture, light, time, fadeEnvelope, intensityScalar);
        } else if (fixture.isPulse) {
            this._applyPulseBehavior(fixture, light, time, fadeEnvelope, intensityScalar);
        } else if (fixture.isTowBeacon && !fixture.hasShadow) {
            this._applyTowBeaconBehavior(fixture, light, time, fadeEnvelope, intensityScalar);
        } else if (fixture.isFaulty) {
            this._applyFaultyBehavior(fixture, light, time, fadeEnvelope, intensityScalar);
        } else {
            this._applyDefaultBehavior(fixture, light, time, fadeEnvelope, intensityScalar);
        }
    }

    _applyDeadBehavior(fixture, light) {
        light.intensity = 0.0;
        if (fixture.material) fixture.material.emissiveIntensity = 0.0;
    }

    _applyStrobeBehavior(fixture, light, time, fadeEnvelope, intensityScalar) {
        const strobeFreq = 12.0;
        const isOn = Math.sin(time * Math.PI * 2 * strobeFreq + fixture.flickerOffset) > 0;
        
        if (fixture._lastStrobeState !== isOn) {
            fixture._lastStrobeState = isOn;
            if (isOn && window.acoustics && this.env && this.env.camera) {
                const distSq = this.env.camera.position.distanceToSquared(light.position);
                if (Math.random() < 0.15) {
                    window.acoustics.triggerSomaticEvent('light_flicker', distSq * 25.0, 0.4);
                }
            }
        }
        
        fixture.currentIntensity = isOn ? fixture.baseIntensity * 1.5 : 0.0;
        light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
        if (fixture.material) fixture.material.emissiveIntensity = (isOn ? 1.5 : 0.0) * fadeEnvelope;
    }

    _applyPulseBehavior(fixture, light, time, fadeEnvelope, intensityScalar) {
        const pulseFreq = 0.5;
        const pulseVal = (Math.sin(time * Math.PI * 2 * pulseFreq + fixture.flickerOffset) + 1.0) / 2.0;
        const eased = pulseVal * pulseVal * (3.0 - 2.0 * pulseVal);
        fixture.currentIntensity = fixture.baseIntensity * (0.3 + 0.7 * eased);
        light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
        if (fixture.material) fixture.material.emissiveIntensity = (0.2 + 0.8 * eased) * fadeEnvelope;
    }

    _applyTowBeaconBehavior(fixture, light, time, fadeEnvelope, intensityScalar) {
        const pulseVal = (Math.sin(time * fixture.sweepSpeed + fixture.sweepPhase) + 1.0) / 2.0;
        const eased = pulseVal * pulseVal;
        fixture.currentIntensity = fixture.baseIntensity * (0.2 + 1.3 * eased);
        light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
        if (fixture.material) fixture.material.emissiveIntensity = (0.5 + 1.5 * eased) * fadeEnvelope;
    }

    _applyFaultyBehavior(fixture, light, time, fadeEnvelope, intensityScalar) {
        if (fixture._nextFlicker === undefined) {
            fixture._nextFlicker = time + 0.5 + Math.random() * 4.0;
            fixture._flickering = false;
        }
        if (!fixture._flickering && time >= fixture._nextFlicker) {
            fixture._flickering = true;
            fixture._flickerUntil = time + 0.04 + Math.random() * 0.12;
            fixture._flickerDepth = Math.random() < 0.3 ? 0.0 : 0.05 + Math.random() * 0.3;
            
            if (window.acoustics && this.env && this.env.camera) {
                const distSq = this.env.camera.position.distanceToSquared(light.position);
                if (Math.random() < 0.25) {
                    window.acoustics.triggerSomaticEvent('light_flicker', distSq * 25.0, 0.6);
                }
            }
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
    }

    _applyDefaultBehavior(fixture, light, time, fadeEnvelope, intensityScalar) {
        const normalIntensity = fixture.currentIntensity !== undefined ? fixture.currentIntensity : fixture.baseIntensity;
        light.intensity = (normalIntensity + (Math.sin(time * 120.0 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
        if (fixture.material) {
            const baseEmissive = fixture.isLighthouse
                ? 5.0
                : (fixture.emissiveIntensity !== undefined ? fixture.emissiveIntensity : 0.4);
            fixture.material.emissiveIntensity = baseEmissive * fadeEnvelope;
        }
    }
}