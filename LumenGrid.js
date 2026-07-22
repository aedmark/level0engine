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
            const light = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            if (i < this.maxShadowLights) {
                light.castShadow = true;
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 20;
                light.shadow.bias = -0.0002;
                light.shadow.normalBias = 0.015;
                light.shadow.autoUpdate = false;
            }
            this.scene.add(light);
            this.lightPool.push(light);
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
        const cullingLimit = this.maxActiveLights > 12 ? 35.0 : 22.0;
        for (let i = 0, len = fixtureData.length; i < len; i++) {
            const fixture = fixtureData[i];
            const dx = cameraPos.x - fixture.position.x;
            if (dx > cullingLimit || dx < -cullingLimit) { fixture.hasShadow = false; continue; }

            const dz = cameraPos.z - fixture.position.z;
            if (dz > cullingLimit || dz < -cullingLimit) { fixture.hasShadow = false; continue; }

            const dy = cameraPos.y - fixture.position.y;
            if (dy > cullingLimit || dy < -cullingLimit) { fixture.hasShadow = false; continue; }

            const distSq = (dx * dx) + (dy * dy) + (dz * dz);
            if (distSq < 900.0) {
                if (fixture.isDead) {
                    darknessPressure += 1.0 - (distSq * 0.00111);
                }
                if (!fixture.isFake) {
                    fixture.distSq = distSq;
                    fixture._biasedDistSq = fixture.hasShadow ? distSq - 40.0 : distSq;
                    if (this._prevActive.has(fixture)) fixture._biasedDistSq -= 30.0;
                    let insertPos = -1;
                    for (let j = 0; j < this.maxActiveLights; j++) {
                        if (!this._activeFixtures[j] || fixture._biasedDistSq < this._activeFixtures[j]._biasedDistSq) {
                            insertPos = j;
                            break;
                        }
                    }
                    if (insertPos !== -1) {
                        for (let j = this.maxActiveLights - 1; j > insertPos; j--) {
                            this._activeFixtures[j] = this._activeFixtures[j - 1];
                        }
                        this._activeFixtures[insertPos] = fixture;
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
            const light = this.lightPool[i];
            const fixture = this._activeFixtures[i];
            if (fixture) {
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
                const dist = Math.sqrt(fixture.distSq);
                const activeRadius = isShadowCaster ? 20.0 : 10.0;
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
                    if (fixture.material) fixture.material.emissiveIntensity = 0.4;
                }
            } else {
                light.intensity = 0;
                if (i < this.maxShadowLights) this._shadowSlotFixtures[i] = null;
            }
        }
        if (this._activeFixtures[this._shadowRR]) {
            this.lightPool[this._shadowRR].shadow.needsUpdate = true;
        }
        this._shadowRR = (this._shadowRR + 1) % this.maxShadowLights;
        this.shadowsDirty = false;
        return {darknessPressure, nearestFixture, minLightDistSq};
    }
}