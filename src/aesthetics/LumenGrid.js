// LumenGrid.js
// LEVEL 0 ILLUMINATION SUBSYSTEM

export default class LumenGrid {
    constructor(scene) {
        this.scene = scene;
        this.maxActiveLights = 32;
        this.maxShadowLights = 7;
        this.lightPool = [];
        this._activeFixtures = new Array(this.maxActiveLights).fill(null);
        this._shadowSlotFixtures = new Array(this.maxShadowLights).fill(null);
        this._shadowRR = 0;
        this.shadowsDirty = false;
        this._lastShadowRefresh = -Infinity;
        this.shadowDirtyInterval = 0.08;
        for (let i = 0; i < this.maxActiveLights; i++) {
            const radius = i < this.maxShadowLights ? 20.0 : 10.0;
            const pointLight = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            const spotLight = new THREE.SpotLight(0xffebd6, 0, radius, Math.PI / 8, 0.4, 2.0);
            
            if (i < this.maxShadowLights) {
                const setupShadow = (l) => {
                    l.castShadow = true;
                    l.shadow.mapSize.width = 512;
                    l.shadow.mapSize.height = 512;
                    l.shadow.camera.near = 0.5;
                    l.shadow.camera.far = 20;
                    l.shadow.bias = -0.0002;
                    l.shadow.normalBias = 0.015;
                    l.shadow.autoUpdate = false;
                };
                setupShadow(pointLight);
                setupShadow(spotLight);
            }
            this.scene.add(pointLight);
            this.scene.add(spotLight);
            this.scene.add(spotLight.target);
            this.lightPool.push({
                point: pointLight,
                spot: spotLight,
                isSpot: false,
                get active() { return this.isSpot ? this.spot : this.point; }
            });
        }
    }

    update(cameraPos, fixtureData, time) {
        let darknessPressure = 0;
        if (!this._prevActive) this._prevActive = new Set();
        this._prevActive.clear();
        for (let i = 0; i < this.maxActiveLights; i++) {
            if (this._activeFixtures[i]) this._prevActive.add(this._activeFixtures[i]);
        }
        this._activeFixtures.fill(null);
        const baseCullingLimit = this.maxActiveLights > 12 ? 35.0 : 22.0;
        for (let i = 0, len = fixtureData.length; i < len; i++) {
            const fixture = fixtureData[i];
            const isLH = fixture.isLighthouse;
            const cullLimit = isLH ? 120.0 : baseCullingLimit;
            
            const dx = cameraPos.x - fixture.position.x;
            if (dx > cullLimit || dx < -cullLimit) { fixture.hasShadow = false; continue; }

            const dz = cameraPos.z - fixture.position.z;
            if (dz > cullLimit || dz < -cullLimit) { fixture.hasShadow = false; continue; }

            const dy = cameraPos.y - fixture.position.y;
            if (dy > cullLimit || dy < -cullLimit) { fixture.hasShadow = false; continue; }

            const distSq = (dx * dx) + (dy * dy) + (dz * dz);
            const maxDistSq = isLH ? 14400.0 : 900.0;
            if (distSq < maxDistSq) {
                if (fixture.isDead) {
                    darknessPressure += 1.0 - (distSq * 0.00111);
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
        for (let i = 0; i < this.maxActiveLights; i++) {
            const wrapper = this.lightPool[i];
            const fixture = this._activeFixtures[i];
            if (fixture) {
                wrapper.isSpot = fixture.isSpot === true;
                const light = wrapper.active;
                const inactiveLight = wrapper.isSpot ? wrapper.point : wrapper.spot;
                inactiveLight.intensity = 0;
                
                const isShadowCaster = i < this.maxShadowLights;
                fixture.hasShadow = isShadowCaster;
                if (isShadowCaster && (this._shadowSlotFixtures[i] !== fixture || shadowRefreshDue)) {
                    this._shadowSlotFixtures[i] = fixture;
                    light.shadow.needsUpdate = true;
                }
                if (fixture.distSq < minLightDistSq) {
                    minLightDistSq = fixture.distSq;
                    nearestFixture = fixture;
                }
                light.position.copy(fixture.position);
                if (wrapper.isSpot && fixture.targetPos) {
                    light.target.position.copy(fixture.targetPos);
                }
                const isLH = fixture.isLighthouse;
                light.distance = isLH ? 150.0 : (isShadowCaster ? 20.0 : 10.0);
                
                const dist = Math.sqrt(fixture.distSq);
                const activeRadius = isLH ? 120.0 : (isShadowCaster ? 20.0 : 10.0);
                const fadeEnvelope = Math.max(0, Math.min(1, (activeRadius - dist) / 4.0));
                const intensityScalar = isShadowCaster ? 0.65 : 0.35;
                if (fixture.material && fixture.material.emissive) {
                    light.color.copy(fixture.material.emissive);
                }

                if (fixture.isDead) {
                    light.intensity = 0.0;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.0;
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
                    fixture.currentIntensity = fixture.baseIntensity * (fixture._flickering ? fixture._flickerDepth : 1.0);
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = Math.max(0.05, fixture.currentIntensity * 0.6);
                } else {
                    light.intensity = (fixture.baseIntensity + (Math.sin(time * 120.0 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = fixture.isLighthouse ? 2.0 : 0.4;
                }
            } else {
                wrapper.point.intensity = 0;
                wrapper.spot.intensity = 0;
                if (i < this.maxShadowLights) this._shadowSlotFixtures[i] = null;
            }
        }
        if (this._activeFixtures[this._shadowRR]) {
            this.lightPool[this._shadowRR].active.shadow.needsUpdate = true;
        }
        this._shadowRR = (this._shadowRR + 1) % this.maxShadowLights;
        this.shadowsDirty = false;
        return {darknessPressure, nearestFixture, minLightDistSq};
    }
}