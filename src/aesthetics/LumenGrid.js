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
        this.maxForcedShadowUpdatesPerFrame = 2;
        this._pendingShadowSlots = new Set();

        // How long, in seconds, a fixture takes to ramp from 0 to full brightness the first time
        // it ever wins an active pool slot. See the `spawnRamp` comment in update() for why this
        // exists -- without it, a fixture spawned already deep inside its activation radius (the
        // common case: a new chunk's hallway fixtures a few units past a doorway that just came
        // into render distance) jumps straight to full intensity in a single frame instead of
        // fading up, reading as a light switching on because the player walked past it.
        this.spawnFadeInDuration = 0.6;

        // Initialize the light pool with PointLight and SpotLight pairs
        for (let i = 0; i < this.maxActiveLights; i++) {
            // Shadow-casting lights have a larger radius to cover more area
            const radius = i < this.maxShadowLights ? 20.0 : 10.0;
            const pointLight = new THREE.PointLight(0xffebd6, 0, radius, 2.0);
            const spotLight = new THREE.SpotLight(0xffebd6, 0, radius, Math.PI / 8, 0.4, 2.0);
            if (i < this.maxShadowLights) {
                const setupShadow = (l) => {
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
     * @param {string} [currentChunkHash] - The chunkHash of the chunk/sector the camera is
     *   currently standing in. Fixtures tagged with any other chunkHash are on the far side
     *   of a sector's perimeter wall and are excluded from the pool entirely (see the isLH
     *   check below for the one deliberate exception). If omitted, no sector filtering is
     *   applied.
     * @returns {Object} State containing darknessPressure, nearestFixture, and minLightDistSq.
     */
    update(cameraPos, fixtureData, time, currentChunkHash) {
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

            // Sector gate: a fixture belongs to whichever chunk built it (every fixture push
            // site tags `chunkHash`), and each chunk is a sector sealed behind its own
            // perimeter wall. None of these lights actually cast real-time shadows outside
            // the 8 elite shadow-casting slots, so without this check distance is the *only*
            // thing keeping a light from shining through a wall it has no idea is there.
            // Lighthouse beacons are the deliberate exception -- they're landmarks meant to
            // be seen from well outside their own sector (e.g. across the open Chasm).
            if (!isLH && currentChunkHash !== undefined && fixture.chunkHash !== undefined
                && fixture.chunkHash !== currentChunkHash) {
                fixture.hasShadow = false;
                continue;
            }

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
        let forcedShadowUpdatesThisFrame = 0;

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
                    // Only the light type currently in use for this slot should cast a
                    // shadow -- otherwise both point and spot stay flagged as shadow
                    // casters and double the texture units needed at shader compile time.
                    light.castShadow = true;
                    inactiveLight.castShadow = false;

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
                const distanceEnvelope = Math.max(0, Math.min(1, (activeRadius - dist) / 4.0));

                // `distanceEnvelope` only fades a light out near the edge of its activation
                // radius -- it says nothing about *when* this fixture first won a pool slot. A
                // fixture built as part of a chunk that just entered render distance can easily
                // already sit well inside that radius (e.g. a hallway light a few units past a
                // doorway), so without this, the very first frame it exists it jumps straight to
                // `distanceEnvelope`'s full value: a light instantaneously switching on right as
                // the player rounds a corner, reported as looking "like a motion sensor." Ramping
                // every fixture's own first activation over `spawnFadeInDuration` regardless of
                // its distance fixes that -- `_activatedAt` is stamped once, the first time this
                // fixture is ever seen active, and never reset for its lifetime (chunk unload
                // destroys the fixture object entirely, so a genuinely new appearance always
                // starts from a fresh `undefined`; briefly losing and re-winning a pool slot
                // within the same chunk's lifetime intentionally does NOT re-trigger the ramp --
                // that's pool competition, not the light coming into existence).
                if (fixture._activatedAt === undefined) fixture._activatedAt = time;
                const sinceActivation = time - fixture._activatedAt;
                const spawnRamp = sinceActivation >= this.spawnFadeInDuration
                    ? 1.0 : Math.max(0, sinceActivation / this.spawnFadeInDuration);
                const fadeEnvelope = distanceEnvelope * spawnRamp;
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
                    const normalIntensity = fixture.currentIntensity !== undefined ? fixture.currentIntensity : fixture.baseIntensity;
                    light.intensity = (normalIntensity + (Math.sin(time * 120.0 + fixture.flickerOffset) * 0.02)) * fadeEnvelope * intensityScalar;
                    if (fixture.material) fixture.material.emissiveIntensity = fixture.isLighthouse ? 5.0 : 0.4;
                }
            } else {
                // If no fixture is assigned to this slot, turn off the lights
                wrapper.point.intensity = 0;
                wrapper.spot.intensity = 0;
                if (i < this.maxShadowLights) {
                    wrapper.point.castShadow = false;
                    wrapper.spot.castShadow = false;
                }
                if (i < this.maxShadowLights) {
                    this._shadowSlotFixtures[i] = null;
                    this._pendingShadowSlots.delete(i);
                }
            }
        }

        // --- PHASE 3: Shadow Map Round-Robin ---
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