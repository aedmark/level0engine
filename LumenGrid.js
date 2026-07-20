// LumenGrid.js
// LEVEL 0 ILLUMINATION SUBSYSTEM

export default class LumenGrid {
    constructor(scene) {
        this.scene = scene;
        this.maxActiveLights = 40;
        this.maxShadowLights = 10;
        this.lightPool = [];
        this._activeFixtures = new Array(this.maxActiveLights).fill(null);
        for (let i = 0; i < this.maxActiveLights; i++) {
            const radius = i < this.maxShadowLights ? 20 : 30;
            const light = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            if (i < this.maxShadowLights) {
                light.castShadow = true;
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 20;
                light.shadow.bias = -0.0001;
                light.shadow.normalBias = 0.05;
            }
            this.scene.add(light);
            this.lightPool.push(light);
        }
    }

    update(cameraPos, fixtureData, time) {
        let darknessPressure = 0;
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
        for (let i = 0; i < this.maxActiveLights; i++) {
            const light = this.lightPool[i];
            const fixture = this._activeFixtures[i];
            if (fixture) {
                const isShadowCaster = i < this.maxShadowLights;
                fixture.hasShadow = isShadowCaster;
                if (fixture.distSq < minLightDistSq) {
                    minLightDistSq = fixture.distSq;
                    nearestFixture = fixture;
                }
                light.position.copy(fixture.position);
                const dist = Math.sqrt(fixture.distSq);
                const activeRadius = isShadowCaster ? 20 : 30;
                const fadeEnvelope = Math.max(0, Math.min(1, (activeRadius - dist) / 8.0));
                const intensityScalar = isShadowCaster ? 0.65 : 0.35;
                if (fixture.material && fixture.material.emissive) {
                    light.color.copy(fixture.material.emissive);
                }

                if (fixture.isDead) {
                    light.intensity = 0.0;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.0;
                } else if (fixture.isFaulty) {
                    const chaos = Math.sin(time * 15.0 + fixture.flickerOffset) *
                        Math.sin(time * 22.0 - fixture.flickerOffset) *
                        Math.cos(time * 7.0);
                    fixture.currentIntensity = fixture.baseIntensity * (chaos > 0.3 ? 0.1 : 1.0 + chaos);
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = Math.max(0.05, fixture.currentIntensity * 0.6);
                } else {
                    light.intensity = (fixture.baseIntensity + (Math.sin(time * 120.0 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.4;
                }
            } else {
                light.intensity = 0;
            }
        }
        return {darknessPressure, nearestFixture, minLightDistSq};
    }
}