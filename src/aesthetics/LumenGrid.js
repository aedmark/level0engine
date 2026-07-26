// LumenGrid.js
// LEVEL 0 ILLUMINATION SUBSYSTEM

/**
 * The dynamic light management subsystem for Level 0.
 * 
 * Browsers struggle to render more than a few shadow-casting lights at once.
 * This class solves that by maintaining a fixed pool of lights (`maxActiveLights`) and 
 * continuously repositioning them near the player based on proximity (`distSq`). It uses 
 * an insertion sort to prioritize the absolute closest lights for the rare shadow-casting slots.
 */
export default class LumenGrid {
    // ==========================================
    // LIFECYCLE & INITIALIZATION
    // ==========================================

    /**
     * Initializes the LumenGrid illumination subsystem, pre-allocating light pools.
     * We pre-allocate a fixed pool of lights to avoid costly instantiation during gameplay.
     * Only a subset of lights cast shadows to maintain high performance.
     * @param {THREE.Scene} scene - The main Three.js scene to add lights to.
     */
    constructor(scene) {
        this.scene = scene;
        // Maximum number of active light sources in the scene at any time
        this.maxActiveLights = 32;
        // Maximum number of lights allowed to cast expensive shadows
        this.maxShadowLights = 8;
        
        this.lightPool = [];
        this._activeFixtures = new Array(this.maxActiveLights).fill(null);
        this._shadowSlotFixtures = new Array(this.maxShadowLights).fill(null);
        
        // Round-robin index for updating shadow maps, spreading the GPU cost over multiple frames
        this._shadowRR = 0;
        this.shadowsDirty = false;
        this._lastShadowRefresh = -Infinity;
        this.shadowDirtyInterval = 0.08;

        // Initialize the light pool with PointLight and SpotLight pairs
        for (let i = 0; i < this.maxActiveLights; i++) {
            // Shadow-casting lights have a larger radius to cover more area
            const radius = i < this.maxShadowLights ? 20.0 : 10.0;
            const pointLight = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            const spotLight = new THREE.SpotLight(0xffebd6, 0, radius, Math.PI / 8, 0.4, 2.0);
            
            // Only configure shadows for the first `maxShadowLights` instances
            if (i < this.maxShadowLights) {
                const setupShadow = (l) => {
                    l.castShadow = true;
                    l.shadow.mapSize.width = 512;
                    l.shadow.mapSize.height = 512;
                    l.shadow.camera.near = 0.5;
                    l.shadow.camera.far = 20;
                    l.shadow.bias = -0.0002;
                    l.shadow.normalBias = 0.015;
                    l.shadow.autoUpdate = false; // We manually trigger updates for performance
                };
                setupShadow(pointLight);
                setupShadow(spotLight);
            }
            this.scene.add(pointLight);
            this.scene.add(spotLight);
            this.scene.add(spotLight.target);
            
            // Store both light types in a wrapper object, letting us swap between them dynamically
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

    // ==========================================
    // CORE LOOPS & STATE
    // ==========================================

    /**
     * Updates active lights based on player proximity and culls distant fixtures.
     * Prioritizes shadow-casting slots for the nearest light sources.
     * @param {THREE.Vector3} cameraPos - The current camera position.
     * @param {Array} fixtureData - Array of light fixture data objects.
     * @param {number} time - Current elapsed time for flicker calculations.
     * @returns {Object} State containing darknessPressure, nearestFixture, and minLightDistSq.
     */
    update(cameraPos, fixtureData, time) {
        let darknessPressure = 0;
        
        // Track which fixtures were active in the previous frame to apply temporal coherence (hysteresis)
        if (!this._prevActive) this._prevActive = new Set();
        this._prevActive.clear();
        for (let i = 0; i < this.maxActiveLights; i++) {
            if (this._activeFixtures[i]) this._prevActive.add(this._activeFixtures[i]);
        }
        this._activeFixtures.fill(null);
        
        // Base culling distance: we discard lights beyond this distance to save CPU cycles
        const baseCullingLimit = this.maxActiveLights > 12 ? 55.0 : 35.0;
        
        // --- PHASE 1: Distance Sorting and Culling ---
        for (let i = 0, len = fixtureData.length; i < len; i++) {
            const fixture = fixtureData[i];
            const isLH = fixture.isLighthouse;
            const cullLimit = isLH ? 120.0 : baseCullingLimit;
            
            // Perform a fast AABB-style distance check before doing a full squared distance calculation
            const dx = cameraPos.x - fixture.position.x;
            if (dx > cullLimit || dx < -cullLimit) { fixture.hasShadow = false; continue; }
            
            const dz = cameraPos.z - fixture.position.z;
            if (dz > cullLimit || dz < -cullLimit) { fixture.hasShadow = false; continue; }
            
            const dy = cameraPos.y - fixture.position.y;
            if (dy > cullLimit || dy < -cullLimit) { fixture.hasShadow = false; continue; }
            
            const distSq = (dx * dx) + (dy * dy) + (dz * dz);
            const maxDistSq = isLH ? 14400.0 : 3025.0;
            
            if (distSq < maxDistSq) {
                // Accumulate darkness pressure from dead lights nearby (used for sanity/paranoia mechanics)
                if (fixture.isDead) {
                    darknessPressure += 1.0 - (distSq * 0.00111);
                }
                
                if (!fixture.isFake) {
                    fixture.distSq = distSq;
                    
                    // Apply a negative distance bias to lights that already have shadows or were active last frame.
                    // This prevents lights from rapidly swapping in and out of the shadow pool.
                    fixture._biasedDistSq = fixture.hasShadow ? distSq - 40.0 : distSq;
                    if (this._prevActive.has(fixture)) fixture._biasedDistSq -= 30.0;
                    
                    let targetToInsert = fixture;
                    if (!targetToInsert.noShadow) {
                        // Insertion sort into the elite shadow-casting slots (closest lights get these)
                        let insertPos = -1;
                        for (let j = 0; j < this.maxShadowLights; j++) {
                            if (!this._activeFixtures[j] || targetToInsert._biasedDistSq < this._activeFixtures[j]._biasedDistSq) {
                                insertPos = j;
                                break;
                            }
                        }
                        if (insertPos !== -1) {
                            // Push existing lights down the list
                            let pushedOut = this._activeFixtures[this.maxShadowLights - 1];
                            for (let j = this.maxShadowLights - 1; j > insertPos; j--) {
                                this._activeFixtures[j] = this._activeFixtures[j - 1];
                            }
                            this._activeFixtures[insertPos] = targetToInsert;
                            targetToInsert = pushedOut; // The pushed out light becomes a candidate for non-shadow slots
                        }
                    }
                    
                    // Insertion sort into the remaining non-shadow active slots
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
        
        // --- PHASE 2: Apply State to Light Pool ---
        let nearestFixture = null;
        let minLightDistSq = Infinity;
        const shadowRefreshDue = this.shadowsDirty && (time - this._lastShadowRefresh >= this.shadowDirtyInterval);
        if (shadowRefreshDue) this._lastShadowRefresh = time;
        
        for (let i = 0; i < this.maxActiveLights; i++) {
            const wrapper = this.lightPool[i];
            const fixture = this._activeFixtures[i];
            
            if (fixture) {
                // Determine whether this fixture uses a SpotLight or PointLight
                const isShadowSlot = i < this.maxShadowLights;
                if (fixture.isTowBeacon && !isShadowSlot) {
                    wrapper.isSpot = false;
                } else {
                    wrapper.isSpot = fixture.isSpot === true;
                }
                const light = wrapper.active;
                const inactiveLight = wrapper.isSpot ? wrapper.point : wrapper.spot;
                inactiveLight.intensity = 0; // Turn off the unused light type
                
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
                    // Update the shadow map if a new fixture took this slot, or if a periodic refresh is due
                    if (this._shadowSlotFixtures[i] !== fixture || shadowRefreshDue) {
                        this._shadowSlotFixtures[i] = fixture;
                        light.shadow.needsUpdate = true;
                    }
                }
                
                if (fixture.distSq < minLightDistSq) {
                    minLightDistSq = fixture.distSq;
                    nearestFixture = fixture;
                }
                
                // Position the Three.js light at the fixture's coordinates
                light.position.copy(fixture.position);
                if (wrapper.isSpot && fixture.targetPos) {
                    light.target.position.copy(fixture.targetPos);
                    light.angle = fixture.spotAngle !== undefined ? fixture.spotAngle : Math.PI / 8;
                    light.penumbra = fixture.spotPenumbra !== undefined ? fixture.spotPenumbra : 0.4;
                }
                light.distance = isLH ? 150.0 : (isShadowCaster ? 20.0 : 10.0);
                
                // Calculate a smooth fade out as the player moves away from the light
                const dist = Math.sqrt(fixture.distSq);
                const activeRadius = isLH ? 120.0 : (isShadowCaster ? 20.0 : 10.0);
                const fadeEnvelope = Math.max(0, Math.min(1, (activeRadius - dist) / 4.0));
                const intensityScalar = isShadowCaster ? 0.65 : 0.35;
                
                if (fixture.material && fixture.material.emissive) {
                    light.color.copy(fixture.material.emissive);
                }
                
                // Process behavioral states: dead, flickering, strobe, pulse, or normal
                if (fixture.isDead) {
                    light.intensity = 0.0;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.0;
                } else if (fixture.isStrobe) {
                    // Fast, harsh strobe light (e.g. for alarms)
                    const strobeFreq = 12.0;
                    const isOn = Math.sin(time * Math.PI * 2 * strobeFreq + fixture.flickerOffset) > 0;
                    fixture.currentIntensity = isOn ? fixture.baseIntensity * 1.5 : 0.0;
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = isOn ? 1.5 : 0.0;
                } else if (fixture.isPulse) {
                    // Organic, breathing pulse
                    const pulseFreq = 0.5;
                    const pulseVal = (Math.sin(time * Math.PI * 2 * pulseFreq + fixture.flickerOffset) + 1.0) / 2.0;
                    const eased = pulseVal * pulseVal * (3.0 - 2.0 * pulseVal);
                    fixture.currentIntensity = fixture.baseIntensity * (0.3 + 0.7 * eased);
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.2 + 0.8 * eased;
                } else if (fixture.isTowBeacon && !fixture.hasShadow) {
                    // Pulse at the sweep speed frequency for non-shadowing beacons
                    const pulseVal = (Math.sin(time * fixture.sweepSpeed + fixture.sweepPhase) + 1.0) / 2.0;
                    const eased = pulseVal * pulseVal;
                    fixture.currentIntensity = fixture.baseIntensity * (0.2 + 1.3 * eased);
                    light.intensity = fixture.currentIntensity * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = 0.5 + 1.5 * eased;
                } else if (fixture.isFaulty) {
                    // Complex flicker logic modeled with random timers and depths
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
                    // Normal light applies a subtle, slow sine-wave pulse for ambient atmosphere
                    light.intensity = (fixture.baseIntensity + (Math.sin(time * 120.0 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = fixture.isLighthouse ? 5.0 : 0.4;
                }
            } else {
                // If no fixture is assigned to this slot, turn off the lights
                wrapper.point.intensity = 0;
                wrapper.spot.intensity = 0;
                if (i < this.maxShadowLights) this._shadowSlotFixtures[i] = null;
            }
        }
        
        // --- PHASE 3: Shadow Map Round-Robin ---
        // Force update one shadow map per frame to keep dynamic shadows looking alive, cheaply
        if (this._activeFixtures[this._shadowRR]) {
            this.lightPool[this._shadowRR].active.shadow.needsUpdate = true;
        }
        this._shadowRR = (this._shadowRR + 1) % this.maxShadowLights;
        this.shadowsDirty = false;
        
        return {darknessPressure, nearestFixture, minLightDistSq};
    }
}