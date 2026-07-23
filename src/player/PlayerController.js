// PlayerController.js
// LEVEL 0 PLAYER CONTROLLER

import SomaticInput from './SomaticInput.js';
import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

export default class PlayerController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.input = new SomaticInput(camera);
        this.velocity = new Vec3();
        this.direction = new Vec3();
        this.isSqueezing = false;
        this._envForcedDown = false;
        this._groundFeetY = camera.position.y - 1.6;
        this.flashlightBattery = 100.0;
        this.baseRadius = 0.4;
        this.squeezeRadius = 0.12;
        this.playerRadius = 0.4;
        this.enableHeadBob = true;
        this.speedMultiplier = 1.0;
        this.maxStamina = 100.0;
        this.stamina = 100.0;
        this.inventory = {batteries: 0, almondWater: 0};
        this.objectives = {fixed: 0, total: 3, escaped: false};
        this.depth = 1;
        this.bestDepth = 1;
        this.hasVisitedAnnex = false;
        this.objectiveUI = document.createElement('div');
        this.objectiveUI.className = 'osd-element';
        this.objectiveUI.style.cssText = 'bottom: 3rem; right: 3rem; text-align: right; z-index: 100; pointer-events: none; line-height: 1.2; text-transform: uppercase;';
        const renderArea = document.getElementById('screen-wrapper') || document.body;
        renderArea.appendChild(this.objectiveUI);
        this.updateObjectives = (signalText = 'SCANNING...') => {
            if (this.objectives.escaped) return;
            if (this._lastSignalText === signalText && this._lastFixed === this.objectives.fixed &&
                this._lastDepth === this.depth && this._lastBestDepth === this.bestDepth &&
                this._lastAnnexVisited === this.hasVisitedAnnex) return;
            this._lastSignalText = signalText;
            this._lastFixed = this.objectives.fixed;
            this._lastDepth = this.depth;
            this._lastBestDepth = this.bestDepth;
            this._lastAnnexVisited = this.hasVisitedAnnex;
            let uiHTML = `> LAYER ${this.depth} — DEEPEST REACHED: ${this.bestDepth}<br>`;
            if (this.objectives.fixed >= this.objectives.total) {
                if (this.hasVisitedAnnex) {
                    uiHTML += `> SECTOR STABILIZED.<br>> LOCATE EXIT THRESHOLD.<br>> SIGNAL: ${signalText}`;
                    this.objectiveUI.style.color = '#88cc88';
                } else {
                    uiHTML += `> SECTOR STABILIZED.<br>> UNREVIEWED RECORDS FLAGGED — ANNEX.<br>> EXIT WILL NOT MANIFEST UNTIL REVIEWED.<br>> SIGNAL: ${signalText}`;
                    this.objectiveUI.style.color = '#ffaa55';
                }
            } else {
                uiHTML += `> PRIMARY DIRECTIVE: RESTORE POWER<br>> BREAKERS RESET: [ ${this.objectives.fixed} / ${this.objectives.total} ]<br>> SIGNAL: ${signalText}`;
                this.objectiveUI.style.color = '#ffffff';
            }
            if (this.objectiveUI.innerHTML !== uiHTML) {
                this.objectiveUI.innerHTML = uiHTML;
            }
        };
        this.updateObjectives();
        this.MAX_BATTERIES = 3;
        this.MAX_ALMOND_WATER = 2;
        this.exhaustion = 0.0;
        this.isWinded = false;
        this.isChased = false;
        this.coherence = 1.0;
        this.currentLean = 0.0;
        this.isBlindFolded = false;
        this.isGodMode = false;
        this.baseFov = camera.fov;
        this.linguisticDarkMatter = 0.0;
        this.currentFov = camera.fov;
        this._leanOffset = new Vec3();
        this._boxX = new AABB();
        this._boxZ = new AABB();
        this._floorBox = new AABB();
        this._vecMin = new Vec3();
        this._vecMax = new Vec3();
        this._bindMetabolicListeners();
    }

    get isRunning() {
        return this.input.state.isRunning;
    }

    get isCrouching() {
        return this.input.state.isCrouching;
    }

    get isCrawling() {
        return this.input.state.isCrawling;
    }

    get flashlightActive() {
        return this.input.state.flashlightActive;
    }

    get paranoia() { return 1.0 - this.coherence; }
    set paranoia(val) { this.coherence = Math.max(0.0, Math.min(1.0, 1.0 - val)); }

    resetMetabolism() {
        this.stamina = this.maxStamina;
        this.exhaustion = 0.0;
        this.isWinded = false;
        this.isChased = false;
        this.coherence = 1.0;
        this.anomalyPressure = 0.0;
        this.perceivedDarkness = 0.0;
        this.flashlightBattery = 100.0;
        this.linguisticDarkMatter = 0.0;
        this.velocity.set(0, 0, 0);
        this.objectives.fixed = 0;
        this.objectives.escaped = false;
        this.hasVisitedAnnex = false;
        if (this.depth > this.bestDepth) this.bestDepth = this.depth;
        this.depth = 1;
        this.updateObjectives();
    }

    _bindMetabolicListeners() {
        document.addEventListener('somatic-pickup-battery', () => {
            if (this.inventory.batteries < this.MAX_BATTERIES) {
                this.inventory.batteries++;
                document.dispatchEvent(new CustomEvent('somatic-item', {detail: {distSq: 1.0, intensity: 0.5}}));
            }
        });
        document.addEventListener('somatic-pickup-almond', () => {
            if (this.inventory.almondWater < this.MAX_ALMOND_WATER) {
                this.inventory.almondWater++;
                document.dispatchEvent(new CustomEvent('somatic-item', {detail: {distSq: 1.0, intensity: 0.6}}));
            }
        });
        document.addEventListener('somatic-use-battery', () => {
            if (this.inventory.batteries > 0 && this.flashlightBattery < 100.0) {
                this.inventory.batteries--;
                this.flashlightBattery = Math.min(100.0, this.flashlightBattery + 40.0);
            }
        });
        document.addEventListener('somatic-use-almond', () => {
            if (this.inventory.almondWater > 0) {
                this.inventory.almondWater--;
                if ((this.stamina / this.maxStamina) >= 0.7) {
                    this.isWaterlogged = true;
                }
                this.staminaBoostTimer = 15.0;
                this.stamina = this.maxStamina;
                this.isWinded = false;
            }
        });
        document.addEventListener('somatic-toggle-godmode', () => {
            this.isGodMode = !this.isGodMode;
            this.input.suppressCrouchToggle = this.isGodMode;
            if (this.isGodMode) {
                this.stamina = this.maxStamina;
                this.coherence = 1.0;
                this.exhaustion = 0.0;
                this.isWinded = false;
                console.log("God mode enabled");
            } else {
                console.log("God mode disabled");
            }
        });
    }

    update(delta, spatialGrid) {
        delta = Math.min(delta, 0.05);
        if (this.isGodMode) {
            this.stamina = this.maxStamina;
            this.coherence = 1.0;
            this.exhaustion = 0.0;
            this.isWinded = false;
        }
        this.input.update();
        const state = this.input.state;
        this.camera.position.x -= this._leanOffset.x;
        this.camera.position.z -= this._leanOffset.z;
        const damping = Math.exp(-25.0 * delta);
        this.velocity.x *= damping;
        this.velocity.z *= damping;
        this.direction.z = Number(state.moveForward) - Number(state.moveBackward);
        this.direction.x = Number(state.moveRight) - Number(state.moveLeft);
        if (this.direction.lengthSq() > 0) this.direction.normalize();
        const px = this.camera.position.x;
        const pz = this.camera.position.z;
        const localBoxes = spatialGrid.getNearby(px, pz, 2.0);
        const currentFeetY = this._groundFeetY;
        let maxAvailableHeight = 3.0;
        this._vecMin.set(px - this.baseRadius, currentFeetY + 0.1, pz - this.baseRadius);
        this._vecMax.set(px + this.baseRadius, currentFeetY + 2.6, pz + this.baseRadius);
        this._floorBox.set(this._vecMin, this._vecMax);
        for (let i = 0; i < localBoxes.length; i++) {
            const box = localBoxes[i];
            if (box.isInvisibleBlocker) continue;
            if (!box.isVoid && box.min.y > currentFeetY + 0.4 && this._floorBox.intersectsBox(box)) {
                const available = box.min.y - currentFeetY;
                if (available < maxAvailableHeight) maxAvailableHeight = available;
            }
        }
        if (maxAvailableHeight < 1.3 && !this.isGodMode) {
            if (!state.isCrawling && !state.isCrouching) this._envForcedDown = true;
            state.isCrawling = true;
            state.isCrouching = false;
        } else if (maxAvailableHeight < 2.5 && !this.isGodMode) {
            if (!state.isCrawling && !state.isCrouching) this._envForcedDown = true;
            if (!state.isCrawling) state.isCrouching = true;
        } else if (this._envForcedDown) {
            state.isCrouching = false;
            state.isCrawling = false;
            this._envForcedDown = false;
        }
        this.isSqueezing = state.squeezeIntent;
        let targetRadius = this.isSqueezing ? this.squeezeRadius : this.baseRadius;
        if (!this.isSqueezing && !this.isGodMode && this.playerRadius < this.baseRadius - 0.01) {
            this._vecMin.set(px - this.baseRadius, currentFeetY + 0.1, pz - this.baseRadius);
            this._vecMax.set(px + this.baseRadius, currentFeetY + (state.isCrawling ? 0.5 : 1.1), pz + this.baseRadius);
            this._floorBox.set(this._vecMin, this._vecMax);
            for (let i = 0; i < localBoxes.length; i++) {
                if (localBoxes[i].isInvisibleBlocker) continue;
                if (this._floorBox.intersectsBox(localBoxes[i])) {
                    targetRadius = this.squeezeRadius;
                    this.isSqueezing = true;
                    break;
                }
            }
        }
        this.playerRadius += (targetRadius - this.playerRadius) * 8.0 * delta;
        const targetNear = this.isSqueezing ? 0.01 : 0.1;
        if (this.camera.near !== targetNear) {
            this.camera.near = targetNear;
            this.camera.updateProjectionMatrix();
        }
        const adrenalineMultiplier = this.isChased ? 1.15 : 1.0;
        const dynamicWalkSpeed = 60.0 - (this.exhaustion * 20.0);
        const dynamicRunSpeed = dynamicWalkSpeed + (65.0 * (1.0 - this.exhaustion));
        this.isBlindFolded = state.isClosingEyes || false;
        let baseSpeed = dynamicWalkSpeed;
        if (state.isReading) {
            baseSpeed = 0.0;
            state.isRunning = false;
        } else if (this.isBlindFolded) {
            baseSpeed = dynamicWalkSpeed * 0.3;
            state.isRunning = false;
        } else if (this.isSqueezing) {
            baseSpeed = 20.0;
            state.isRunning = false;
        } else if (state.isCrawling) {
            baseSpeed = 15.0;
            state.isRunning = false;
        } else if (state.isCrouching) {
            baseSpeed = 30.0;
            state.isRunning = false;
        } else if (state.isRunning) {
            baseSpeed = this.isChased ? dynamicRunSpeed + 25.0 : dynamicRunSpeed;
        }
        if (this.isChased && state.isRunning && this.exhaustion > 0.8) {
            this.coherence = Math.max(0.0, this.coherence - (delta * 0.20));
        }
        let currentSpeed = baseSpeed * this.speedMultiplier * adrenalineMultiplier;
        if (this.isGodMode) currentSpeed = (state.isRunning ? 200.0 : 110.0) * this.speedMultiplier;
        const isMoving = this.direction.lengthSq() > 0;
        if (this.isWinded && this.stamina > 50.0) {
            this.isWinded = false;
        }
        if (this.adrenalineTimer > 0) {
            this.adrenalineTimer -= delta;
            currentSpeed = dynamicRunSpeed * 1.5;
            this.coherence = 0.0;
            if (this.adrenalineTimer <= 0) {
                this.isWinded = true;
                state.isRunning = false;
                this.stamina = 0;
            }
        } else if (this.staminaBoostTimer > 0) {
            this.staminaBoostTimer -= delta;
            this.stamina = this.maxStamina;
            this.isWinded = false;
        } else if ((state.isRunning || this.isSqueezing) && isMoving && !this.isWinded) {
            const baseBurn = this.isSqueezing ? 1.5 : (this.isChased ? 12.0 : 8.0);
            const burnRate = baseBurn * (1.0 + ((1.0 - this.coherence) * 0.6));
            this.stamina = Math.max(0, this.stamina - burnRate * delta);
            if (this.coherence < 0.2) {
                this.maxStamina = Math.max(40.0, this.maxStamina - (3.5 * delta));
            }
            if (this.stamina <= 0.0) {
                if (this.coherence < 0.15 && !this.isAdrenalineUsed) {
                    this.adrenalineTimer = 2.5;
                    this.isAdrenalineUsed = true;
                    document.dispatchEvent(new CustomEvent('somatic-breaker', {detail: {distSq: 1.0, intensity: 2.0}}));
                } else {
                    state.isRunning = false;
                    this.isWinded = true;
                    this.isWaterlogged = false;
                    currentSpeed = dynamicWalkSpeed * this.speedMultiplier;
                    document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 1.5}}));
                }
            }
        } else {
            this.isAdrenalineUsed = false;
            if (state.isRunning && this.isWinded) state.isRunning = false;
            const isResting = !isMoving && this.perceivedDarkness < 0.2 && this.coherence === 1.0;
            const coherencePenalty = 1.0 - ((1.0 - this.coherence) * 0.7);
            let crouchBonus = state.isCrouching ? 2.5 : 1.0;
            if (state.isCrouching && this.perceivedDarkness > 0.5) {
                this.coherence = Math.max(0.0, this.coherence - (delta * 0.06));
            }
            let recoveryRate = this.isChased ? 1.0 : (this.isWinded ? 2.5 : (isResting ? 15.0 * crouchBonus : 6.0 * coherencePenalty * crouchBonus));
            if (this.isWaterlogged) recoveryRate = 0.0;
            this.stamina = Math.max(0.0, Math.min(this.maxStamina, this.stamina + recoveryRate * delta));
            if (isResting && this.maxStamina < 100.0) {
                const healingFactor = this.perceivedDarkness === 0.0 ? 3.0 : 1.5;
                this.maxStamina = Math.min(100.0, this.maxStamina + (healingFactor * delta));
            }
        }
        const currentActualSpeed = Math.sqrt((this.velocity.x * this.velocity.x) + (this.velocity.z * this.velocity.z));
        if (state.flashlightActive) {
            const panicDrain = (this.stamina <= 0.1 && (this.darknessPressure || 0.0) > 0.4) ? 2.0 : 1.0;
            this.flashlightBattery = Math.max(0, this.flashlightBattery - panicDrain * delta);
            if (this.flashlightBattery === 0) {
                state.flashlightActive = false;
            }
            this._lastRotY = this.camera.rotation.y;
            this._lastRotX = this.camera.rotation.x;
        } else {
            const angularSpeed = Math.abs(this.camera.rotation.y - (this._lastRotY || this.camera.rotation.y)) +
                Math.abs(this.camera.rotation.x - (this._lastRotX || this.camera.rotation.x));
            this._lastRotY = this.camera.rotation.y;
            this._lastRotX = this.camera.rotation.x;
            const currentParanoia = 1.0 - this.coherence;
            if (currentParanoia > 0.2 && currentParanoia < 0.5) {
                this.linguisticDarkMatter = Math.min(50.0, this.linguisticDarkMatter + (delta * 0.8));
            } else if (this.isBlindFolded || (this.perceivedDarkness < 0.1 && currentParanoia === 0.0)) {
                this.linguisticDarkMatter = Math.max(0.0, this.linguisticDarkMatter - (delta * 1.5));
            }
            const maxBatteryCeiling = 100.0 - this.linguisticDarkMatter;
            const kineticCharge = (currentActualSpeed * 0.15) + (angularSpeed * 20.0);
            this.flashlightBattery = Math.min(maxBatteryCeiling, this.flashlightBattery + (kineticCharge * delta));
        }
        const fatigueRatio = this.stamina / this.maxStamina;
        this.exhaustion = fatigueRatio < 0.3 ? Math.pow(1.0 - (fatigueRatio / 0.3), 2.0) : 0.0;
        let intentX = this.direction.x;
        let intentZ = this.direction.z;
        const intentSq = (intentX * intentX) + (intentZ * intentZ);
        if (intentSq > 1.0) {
            const invMag = 1.0 / Math.sqrt(intentSq);
            intentX *= invMag;
            intentZ *= invMag;
        }
        if (Math.abs(this.camera.fov - this.currentFov) > 0.5) {
            this.baseFov = this.camera.fov;
        }
        let targetFov = this.baseFov;
        if (state.isRunning) targetFov += 8.0;
        if (this.isSqueezing) targetFov -= 18.0;
        if (state.isCrawling) targetFov -= 15.0;
        else if (state.isCrouching) targetFov -= 8.0;
        targetFov -= (this.exhaustion * 7.0);
        const externalPressure = this.anomalyPressure || 0.0;
        let rawDarkness = this.darknessPressure || 0.0;
        let normalizedDarkness = 1.0 - Math.exp(-rawDarkness * 0.3);
        if (this.flashlightActive && this.flashlightBattery > 0) {
            const safetyFactor = Math.min(1.0, this.flashlightBattery / 20.0);
            normalizedDarkness *= (1.0 - (0.85 * safetyFactor));
        }
        this.perceivedDarkness = normalizedDarkness;
        let baseDrain = (externalPressure * 0.12) + (this.perceivedDarkness * 0.05);
        if (this.exhaustion > 0.5) baseDrain *= 1.5;

        if (state.isReading) {
            baseDrain = 0.0; // The mind focuses, halting passive drain.
        } else if (this.isBlindFolded) {
            baseDrain = -0.15;
        } else if (externalPressure === 0.0 && this.perceivedDarkness < 0.3) {
            const recoveryMultiplier = isMoving ? 1.0 : 3.0;
            baseDrain = -0.08 * recoveryMultiplier * (1.0 - this.perceivedDarkness);
        }
        this.coherence = Math.max(0.0, Math.min(1.0, this.coherence - (baseDrain * delta)));

        const visiblePanic = Math.max(0.0, ((1.0 - this.coherence) - 0.5) * 2.0);
        targetFov -= (externalPressure * 15.0) + (this.perceivedDarkness * 15.0) + (visiblePanic * 15.0);

        if (this.coherence < 0.2 && Math.random() < (0.5 * delta)) {
            const fakeEvent = Math.random() > 0.6 ? 'somatic-shuffle' : 'somatic-step';
            document.dispatchEvent(new CustomEvent(fakeEvent, {detail: {intensity: 0.5 * visiblePanic}}));
            if (Math.random() < 0.1) {
                const fakeDistSq = 50.0 + Math.random() * 200.0;
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: fakeDistSq, intensity: 0.4}}));
            }
        }
        if (this.coherence < 0.05 && Math.random() < (0.4 * delta)) {
            document.dispatchEvent(new CustomEvent('somatic-blink'));
            if (Math.random() < 0.05) {
                document.dispatchEvent(new CustomEvent('somatic-vent', {detail: {distSq: 100.0, intensity: 0.5}}));
            }
        }
        if (Math.abs(this.currentFov - targetFov) > 0.1) {
            const fovSpeed = (externalPressure > 0.1 || this.perceivedDarkness > 0.5) ? 15.0 : 8.0;
            this.currentFov += (targetFov - this.currentFov) * fovSpeed * delta;
            this.camera.fov = this.currentFov;
            this.camera.updateProjectionMatrix();
        }
        this.velocity.x -= intentX * currentSpeed * delta;
        this.velocity.z -= intentZ * currentSpeed * delta;
        const cosY = Math.cos(this.camera.rotation.y);
        const sinY = Math.sin(this.camera.rotation.y);
        const vx = -this.velocity.x * delta;
        const vz = this.velocity.z * delta;
        const moveX = vx * cosY + vz * sinY;
        const moveZ = -vx * sinY + vz * cosY;
        const visualHeight = this.isCrawling ? 0.3 : (this.isCrouching ? 0.8 : 1.6);
        const physicalTop = this.isCrawling ? 0.55 : (this.isCrouching ? 1.2 : 2.5);
        const feetY = this.camera.position.y - visualHeight;
        const snagShrink = this.isSqueezing ? 0.02 : 0.15;
        const stepOffset = this.isCrawling ? 0.2 : 0.5;
        this._vecMin.set(px + moveX - this.playerRadius, feetY + stepOffset, pz - this.playerRadius + snagShrink);
        this._vecMax.set(px + moveX + this.playerRadius, feetY + physicalTop, pz + this.playerRadius - snagShrink);
        this._boxX.set(this._vecMin, this._vecMax);
        this._vecMin.set(px - this.playerRadius + snagShrink, feetY + stepOffset, pz + moveZ - this.playerRadius);
        this._vecMax.set(px + this.playerRadius - snagShrink, feetY + physicalTop, pz + moveZ + this.playerRadius);
        this._boxZ.set(this._vecMin, this._vecMax);
        this._vecMin.set(px - this.playerRadius, -10.0, pz - this.playerRadius);
        this._vecMax.set(px + this.playerRadius, feetY + stepOffset, pz + this.playerRadius);
        this._floorBox.set(this._vecMin, this._vecMax);
        let hitX = false;
        let hitZ = false;
        let targetFeetY = -100;
        let inVoid = false;
        this.onWarpZone = false;
        for (let i = 0, len = localBoxes.length; i < len; i++) {
            const box = localBoxes[i];
            if (box.isInvisibleBlocker) continue;
            const isVerticallyRelevant = (box.min.y <= feetY + physicalTop && box.max.y >= feetY - 10.0);
            if (!isVerticallyRelevant && !box.isVoid) continue;
            if (box.isVoid && this._floorBox.intersectsBox(box)) {
                inVoid = true;
            }
            if (box.max.y > targetFeetY && box.max.y <= feetY + stepOffset) {
                if (!box.isVoid && this._floorBox.intersectsBox(box)) {
                    targetFeetY = box.max.y;
                    if (box.isWarpZone) this.onWarpZone = true;
                }
            }
            if (hitX && hitZ) continue;
            if (!hitX && this._boxX.intersectsBox(box)) {
                const cx = (box.min.x + box.max.x) * 0.5;
                if ((moveX > 0 && px < cx) || (moveX < 0 && px > cx)) hitX = true;
            }
            if (!hitZ && this._boxZ.intersectsBox(box)) {
                const cz = (box.min.z + box.max.z) * 0.5;
                if ((moveZ > 0 && pz < cz) || (moveZ < 0 && pz > cz)) hitZ = true;
            }
        }
        if (this.isGodMode) {
            hitX = false;
            hitZ = false;
        }
        const isColliding = hitX || hitZ;
        if (isColliding) {
            const impactX = hitX ? Math.abs(this.velocity.x) : 0;
            const impactZ = hitZ ? Math.abs(this.velocity.z) : 0;
            const impact = (impactX + impactZ) * delta;
            if (impact > 0.05 && this.enableHeadBob && !this.wasColliding) {
                this.camera.rotation.z += (Math.random() - 0.5) * impact * 0.5;
                this.camera.rotation.x -= impact * 0.2;
                this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: impact * 2.0}}));
            }
            if (hitX) {
                this.velocity.x *= 0.1;
                if (Math.abs(this.velocity.z) > 1.0) this.velocity.z *= 1.05;
            }
            if (hitZ) {
                this.velocity.z *= 0.1;
                if (Math.abs(this.velocity.x) > 1.0) this.velocity.x *= 1.05;
            }
        }
        this.wasColliding = isColliding;
        if (!hitX) this.camera.position.x += moveX;
        if (!hitZ) this.camera.position.z += moveZ;
        const postIntentSpeed = Math.sqrt((this.velocity.x * this.velocity.x) + (this.velocity.z * this.velocity.z));
        if (this.isGodMode) {
            const fly = (state.flyUp ? 1 : 0) - (this.input._cKeyDown ? 1 : 0);
            this.camera.position.y += fly * 8.0 * delta;
            this.fallVelocity = 0;
            this._leanOffset.set(0, 0, 0);
            return;
        }
        this._applyCinematics(delta, postIntentSpeed, targetFeetY, visualHeight, inVoid);
    }

    _applyCinematics(delta, postIntentSpeed, targetFeetY, visualHeight, inVoid) {
        const state = this.input.state;
        const baseBobFreq = state.isRunning ? 3.5 : 2.0;
        const breathFreq = Math.max(1.0, baseBobFreq - (this.exhaustion * 0.8));
        const timerDelta = (postIntentSpeed * (1.0 - (this.exhaustion * 0.4)) + (this.exhaustion * 0.15)) * delta;
        this.headBobPhase = (this.headBobPhase || 0) + (timerDelta * breathFreq);
        let bobOffset = 0;
        let swayRoll = 0;
        if (this.enableHeadBob) {
            if (postIntentSpeed > 0.5) {
                const bobAmp = state.isRunning ? 0.08 : (0.05 + (this.exhaustion * 0.04));
                const prevBob = Math.sin(this.headBobPhase - (timerDelta * breathFreq)) * bobAmp;
                bobOffset = Math.sin(this.headBobPhase) * bobAmp;
                const crossedDown = prevBob > 0 && bobOffset <= 0;

                if (this.isSqueezing || state.isCrawling || state.isCrouching) {
                    const shufflePhase = this.headBobPhase * 2.5;
                    const prevShuffleBob = Math.sin(shufflePhase - (timerDelta * breathFreq * 2.5)) * bobAmp;
                    const currShuffleBob = Math.sin(shufflePhase) * bobAmp;

                    if ((prevShuffleBob > 0 && currShuffleBob <= 0) || (prevShuffleBob < 0 && currShuffleBob >= 0)) {
                        const shuffleWeight = this.isSqueezing ? 1.5 : (state.isCrawling ? 1.0 : 0.6);
                        document.dispatchEvent(new CustomEvent('somatic-shuffle', {detail: {intensity: shuffleWeight}}));
                    }
                } else if (crossedDown) {
                    const stepWeight = state.isRunning ? 1.0 : (0.3 + (this.exhaustion * 0.6));
                    document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: stepWeight}}));
                }
                swayRoll = Math.cos(this.headBobPhase * 0.5) * (bobAmp * 0.05);
            } else if (this.exhaustion > 0.1) {
                bobOffset = Math.sin(this.headBobPhase * 0.4) * (this.exhaustion * 0.04);
                swayRoll = Math.cos(this.headBobPhase * 0.2) * (this.exhaustion * 0.015);
            }
        }
        this.currentLean += (state.targetLean - this.currentLean) * (1.0 - Math.exp(-15.0 * delta));
        const rollDamping = 1.0 - Math.exp(-12.0 * delta);
        const velocityRoll = this.velocity.x * (this.isSqueezing ? 0.005 : 0.015);
        const peekRoll = -this.currentLean * 0.35;
        this.camera.rotation.z += ((velocityRoll + peekRoll) - this.camera.rotation.z) * rollDamping;
        this.camera.rotation.z += swayRoll;
        const leanLateral = Math.sin(this.currentLean) * 0.8;
        const leanDrop = (1.0 - Math.cos(this.currentLean)) * 0.8;
        const cosY = Math.cos(this.camera.rotation.y);
        const sinY = Math.sin(this.camera.rotation.y);
        this._leanOffset.set(leanLateral * cosY, 0, -leanLateral * sinY);
        this.camera.position.x += this._leanOffset.x;
        this.camera.position.z += this._leanOffset.z;
        if (!inVoid && targetFeetY === -100) targetFeetY = 0;
        const maxCamY = this.onWarpZone ? 5.0 : 2.8;
        let targetCamY = Math.min(targetFeetY + visualHeight, maxCamY) + bobOffset - leanDrop;
        if (targetFeetY === -100) {
            this.fallVelocity = (this.fallVelocity || 0) + 30.0 * delta;
            targetCamY = this.camera.position.y - (this.fallVelocity * delta);
        } else {
            this.fallVelocity = 0;
        }
        const lerpFactor = targetFeetY === -100 ? 1.0 : 1.0 - Math.exp(-12.0 * delta);
        this.camera.position.y += (targetCamY - this.camera.position.y) * lerpFactor;
        if (targetFeetY !== -100) this._groundFeetY = targetFeetY;
    }
}