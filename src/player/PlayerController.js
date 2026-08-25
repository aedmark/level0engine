import SomaticInput from './SomaticInput.js';
import { sweepGroundedCollision } from '../entities/HazardUtils.js';

const ACME_LOWEST_PLATFORM_Y = -49.2;
const ACME_VOID_RESCUE_Y = ACME_LOWEST_PLATFORM_Y - 1000.0;
const MAX_FALL_SPEED = 120.0;
const ACME_WHISTLE_MIN_FALL_TIME = 1.2;
const LADDER_CLIMB_SPEED = 2.4;
const LADDER_GRAB_RADIUS_SQ = 2.0;
const LADDER_DISMOUNT_PUSH = 0.6;
const LADDER_RUNG_SPACING = 0.3;
const LADDER_FOOTSTEP_SPACING = LADDER_RUNG_SPACING * 2;
const LADDER_CLIMB_STANDOFF = 0.4;

export default class PlayerController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.input = new SomaticInput(camera);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isSqueezing = false;
        this._envForcedDown = false;
        this._groundFeetY = camera.position.y - 1.6;
        let isFirstTime = false;
        try { isFirstTime = !localStorage.getItem('level0_tutorial'); } catch(e) {}
        this.flashlightBattery = isFirstTime ? 0.0 : 100.0;
        this.flashlightCooldownTimer = 0.0;
        this.baseRadius = 0.4;
        this.squeezeRadius = 0.12;
        this.playerRadius = 0.4;
        this.enableHeadBob = true;
        this.headBobPhase = 0;
        this.bobOffset = 0;
        this.gait = 0;
        this.speedMultiplier = 1.0;
        this.maxStamina = 100.0;
        this.stamina = 100.0;
        this.staminaCooldownTimer = 0.0;
        this.inventory = {hasExitKey: false};
        this.objectives = {fixed: 0, total: 3, escaped: false};
        this.depth = 1;
        this.bestDepth = 1;
        this.hasVisitedAnnex = false;
        this.objectiveUI = document.createElement('div');
        this.objectiveUI.id = 'objective-text';
        this.objectiveUI.className = 'osd-element';
        this.objectiveUI.style.cssText = 'z-index: 100; pointer-events: none; text-transform: uppercase;';
        const renderArea = document.getElementById('screen-wrapper') || document.body;
        renderArea.appendChild(this.objectiveUI);
        this.updateObjectives = (signalText = 'SCANNING...') => {
            if (this.objectives.escaped) return;
            if (this._lastSignalText === signalText && this._lastFixed === this.objectives.fixed &&
                this._lastDepth === this.depth && this._lastBestDepth === this.bestDepth &&
                this._lastKey === this.inventory.hasExitKey) return;
            this._lastSignalText = signalText;
            this._lastFixed = this.objectives.fixed;
            this._lastDepth = this.depth;
            this._lastBestDepth = this.bestDepth;
            this._lastKey = this.inventory.hasExitKey;
            let uiHTML = ``;
            if (this.objectives.fixed >= this.objectives.total) {
                if (this.inventory.hasExitKey) {
                    uiHTML += `> SECTOR STABILIZED. RELEASE KEY HELD.<br>> RECORDS FOUND. LOCATE EXIT THRESHOLD.<br>> POI: ${signalText}`;
                    this.objectiveUI.style.color = '#88cc88';
                } else {
                    uiHTML += `> SECTOR STABILIZED.<br>> FIND EXIT KEY IN ANNEX.<br>> RECORDS LOCK NOT ON FILE.<br>> POI: ${signalText}`;
                    this.objectiveUI.style.color = '#ffaa55';
                }
            } else {
                uiHTML += `> RESTORE POWER: [ ${this.objectives.fixed} / ${this.objectives.total} ]<br>> POI: ${signalText}`;
                this.objectiveUI.style.color = '#ffffff';
            }
            if (this.objectiveUI.innerHTML !== uiHTML) {
                this.objectiveUI.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize(uiHTML) : uiHTML;
            }
        };
        this.updateObjectives();
        this.exhaustion = 0.0;
        this.isWinded = false;
        this.isChased = false;
        this.coherence = 1.0;
        this.currentLean = 0.0;
        this.isBlindFolded = false;
        this.isGodMode = false;
        this.isFrozen = false;
        this.isSitting = false;
        this._preSitPos = new THREE.Vector3();
        this.baseFov = camera.fov;
        this.linguisticDarkMatter = 0.0;
        this.narrativeTension = 0.0;
        this.MAX_NARRATIVE_TENSION = 40.0;
        this.currentFov = camera.fov;
        this._leanOffset = new THREE.Vector3();
        this._boxX = new THREE.Box3();
        this._ceilingBox = new THREE.Box3();
        this._camTarget = new THREE.Vector3();
        this._ladderScratch = new THREE.Vector3();
        this._scratchRay = new THREE.Ray();
        this._physicsBody = { x: 0, z: 0, feetY: 0, radius: 0, height: 0, stepOffset: 0, currentFeetY: 0 };
        this._physicsScratch = { boxX: null, boxZ: null, floorBox: null, ceilingBox: null, ceilingClearance: 0 };
        this._boxZ = new THREE.Box3();
        this._floorBox = new THREE.Box3();
        this._vecMin = new THREE.Vector3();
        this._vecMax = new THREE.Vector3();
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

    get paranoia() {
        return 1.0 - this.coherence;
    }

    set paranoia(val) {
        this.coherence = Math.max(0.0, Math.min(1.0, 1.0 - val));
    }

    resetMetabolism() {
        document.dispatchEvent(new Event('somatic-run-reset'));
        this.stamina = this.maxStamina;
        this.exhaustion = 0.0;
        this.isWinded = false;
        this.isChased = false;
        this.coherence = 1.0;
        this.anomalyPressure = 0.0;
        this.perceivedDarkness = 0.0;
        this.flashlightBattery = 100.0;
        this.linguisticDarkMatter = 0.0;
        this.narrativeTension = 0.0;
        this.velocity.set(0, 0, 0);
        this._onLadder = null;
        this._ladderApproachDir = null;
        this.objectives.fixed = 0;
        this.objectives.escaped = false;
        this.hasVisitedAnnex = false;
        this.inventory.hasExitKey = false;
        if (this.depth > this.bestDepth) this.bestDepth = this.depth;
        this.depth = 1;
        this.updateObjectives();
    }

    _bindMetabolicListeners() {
        document.addEventListener('somatic-document-read', (e) => {
            if (e.detail && e.detail.ephemera) {
                this.coherence = Math.min(1.0, this.coherence + 0.06);
                return;
            }
            const unresolved = e.detail && e.detail.thread && !(e.detail.corroboration);
            this.coherence = Math.max(0.0, this.coherence - 0.05);
            if (!unresolved) return;
            this.narrativeTension = Math.min(this.MAX_NARRATIVE_TENSION, this.narrativeTension + 7.0);
            this.linguisticDarkMatter = Math.max(this.linguisticDarkMatter, this.narrativeTension);
        });
        document.addEventListener('somatic-corroboration', () => {
            this.narrativeTension = Math.max(0.0, this.narrativeTension - 16.0);
            this.linguisticDarkMatter = Math.max(this.narrativeTension, this.linguisticDarkMatter - 16.0);
            this.coherence = Math.min(1.0, this.coherence + 0.12);
            this.maxStamina = Math.min(100.0, this.maxStamina + 6.0);
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
        document.addEventListener('somatic-trip', () => {
            this.input.state.isRunning = false;
            this._tripStagger = 1.0;
        });
    }
    
    sit(seatGroup) {
        if (this.isSitting || this.isFrozen) return;
        this.isSitting = true;
        this.isFrozen = true;
        this.input.isFrozen = false;

        this._preSitPos.copy(this.camera.position);
        
        const seatPos = new THREE.Vector3();
        seatGroup.getWorldPosition(seatPos);

        this.camera.position.set(seatPos.x, seatPos.y + 1.2, seatPos.z);

        const seatEuler = new THREE.Euler().setFromQuaternion(seatGroup.getWorldQuaternion(new THREE.Quaternion()));
        this.camera.rotation.y = seatEuler.y + Math.PI;
        this.camera.rotation.x = 0;
    }
    
    standUp() {
        if (!this.isSitting) return;
        this.isSitting = false;
        this.isFrozen = false;
        this.camera.position.copy(this._preSitPos);
    }


    applyExternalImpulse(worldDirectionX, worldDirectionZ, strength) {
        const cosY = Math.cos(this.camera.rotation.y);
        const sinY = Math.sin(this.camera.rotation.y);
        const localVx = worldDirectionX * cosY - worldDirectionZ * sinY;
        const localVz = worldDirectionX * sinY + worldDirectionZ * cosY;
        this.velocity.x -= localVx * strength;
        this.velocity.z += localVz * strength;
    }

    update(delta, spatialGrid) {
        delta = Math.min(delta, 0.05);
        if (this.isGodMode) {
            this.stamina = this.maxStamina;
            this.coherence = 1.0;
            this.exhaustion = 0.0;
            this.isWinded = false;
        }
        this.input.update(delta);
        const state = this.input.state;
        this.camera.position.x -= this._leanOffset.x;
        this.camera.position.z -= this._leanOffset.z;
        const damping = Math.exp(-25.0 * delta);
        this.velocity.x *= damping;
        this.velocity.z *= damping;
        if (this.isFrozen) {
            this.velocity.x = 0;
            this.velocity.z = 0;
            
            if (this.isSitting && (state.moveForward || state.moveBackward || state.moveLeft || state.moveRight || state.jump)) {
                this.standUp();
            } else {
                state.moveForward = state.moveBackward = state.moveLeft = state.moveRight = false;
                state.jump = false;
            }
        }
        this.direction.z = Number(state.moveForward) - Number(state.moveBackward);
        this.direction.x = Number(state.moveRight) - Number(state.moveLeft);
        if (this.direction.lengthSq() > 0) this.direction.normalize();
        const px = this.camera.position.x;
        const pz = this.camera.position.z;
        const localBoxes = spatialGrid.getNearby(px, pz, 2.0);
        const currentFeetY = this._groundFeetY;
        let maxCenterHeight = 3.0;
        this._vecMin.set(px - 0.05, currentFeetY + 0.1, pz - 0.05);
        this._vecMax.set(px + 0.05, currentFeetY + 2.6, pz + 0.05);
        this._floorBox.set(this._vecMin, this._vecMax);
        for (let i = 0; i < localBoxes.length; i++) {
            const box = localBoxes[i];
            if (box.isInvisibleBlocker) continue;
            if (!box.isVoid && !box.isLadder && box.min.y > currentFeetY + 0.4 && this._floorBox.intersectsBox(box)) {
                const available = box.min.y - currentFeetY;
                if (available < maxCenterHeight) maxCenterHeight = available;
            }
        }

        if (!this.isGodMode) {
            if (maxCenterHeight < 1.3) {
                state.isCrawling = true;
                state.isCrouching = false;
                this._envForcedDown = true;
            } else if (maxCenterHeight < 2.5) {
                if (!state.isCrawling) {
                    state.isCrouching = true;
                    this._envForcedDown = true;
                }
            } else if (this._envForcedDown) {
                state.isCrawling = false;
                state.isCrouching = false;
                this._envForcedDown = false;
            }
        }
        this.isSqueezing = state.squeezeIntent;
        let targetRadius = this.isSqueezing ? this.squeezeRadius : this.baseRadius;
        if (!this.isSqueezing && !this.isGodMode && this.playerRadius < this.baseRadius - 0.01) {
            this._vecMin.set(px - this.baseRadius, currentFeetY + 0.1, pz - this.baseRadius);
            this._vecMax.set(px + this.baseRadius, currentFeetY + (state.isCrawling ? 0.5 : 1.1), pz + this.baseRadius);
            this._floorBox.set(this._vecMin, this._vecMax);
            for (let i = 0; i < localBoxes.length; i++) {
                if (localBoxes[i].isInvisibleBlocker || localBoxes[i].isLadder) continue;
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
            baseSpeed = 33.0;
            state.isRunning = false;
        } else if (state.isCrouching) {
            baseSpeed = 45.0;
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
        if (this.isWinded && this.stamina >= this.maxStamina * 0.5) {
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
                this.staminaCooldownTimer = 7.0;
            }
        } else if (this.staminaBoostTimer > 0) {
            this.staminaBoostTimer -= delta;
            this.stamina = this.maxStamina;
            this.isWinded = false;
        } else if ((state.isRunning || this.isSqueezing) && isMoving && !this.isWinded) {
            const baseBurn = this.isSqueezing ? 1.0 : (this.isChased ? 10.0 : 6.0);
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
                    this.staminaCooldownTimer = 7.0;
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
            
            if (this.staminaCooldownTimer > 0) {
                this.staminaCooldownTimer -= delta;
            } else {
                this.stamina = Math.max(0.0, Math.min(this.maxStamina, this.stamina + recoveryRate * delta));
            }
            if (isResting && this.maxStamina < 100.0) {
                const healingFactor = this.perceivedDarkness === 0.0 ? 3.0 : 1.5;
                this.maxStamina = Math.min(100.0, this.maxStamina + (healingFactor * delta));
            }
        }
        const currentActualSpeed = Math.sqrt((this.velocity.x * this.velocity.x) + (this.velocity.z * this.velocity.z));
                
        
        const rotY = this.camera.rotation.y;
        const rotX = this.camera.rotation.x;
        const deltaY = rotY - (this._lastRotY || rotY);
        const deltaX = rotX - (this._lastRotX || rotX);
        const accelY = Math.abs(deltaY - (this._lastDeltaY || 0));
        const accelX = Math.abs(deltaX - (this._lastDeltaX || 0));
        this._lastRotY = rotY;
        this._lastRotX = rotX;
        this._lastDeltaY = deltaY;
        this._lastDeltaX = deltaX;
        const shakeRate = Math.min(12.0, (accelY + accelX) / Math.max(delta, 1e-5));
        
        const currentParanoia = 1.0 - this.coherence;
        if (currentParanoia > 0.2 && currentParanoia < 0.5) {
            this.linguisticDarkMatter = Math.min(50.0, this.linguisticDarkMatter + (delta * 0.8));
        } else if (this.isBlindFolded || (this.perceivedDarkness < 0.1 && currentParanoia === 0.0)) {
            this.linguisticDarkMatter = Math.max(this.narrativeTension, this.linguisticDarkMatter - (delta * 1.5));
        }
        const maxBatteryCeiling = 100.0 - this.linguisticDarkMatter;

        if (state.flashlightActive) {
            const panicDrain = (this.stamina <= 0.1 && (this.darknessPressure || 0.0) > 0.4) ? 2.2 : 1.6;
            this.flashlightBattery = Math.max(0, this.flashlightBattery - panicDrain * delta);
            if (this.flashlightBattery === 0) {
                state.flashlightActive = false;
                this.flashlightCooldownTimer = 10.0;
                document.dispatchEvent(new CustomEvent('somatic-flashlight', {detail: {on: false}}));
            }
        } else {
            if (this.flashlightCooldownTimer > 0) {
                this.flashlightCooldownTimer -= delta;
            } else {
                const verticalSpeed = Math.abs(this.fallVelocity || 0);
                const kineticCharge = (currentActualSpeed * 0.30) + (verticalSpeed * 0.40) + (shakeRate * 2.0);
                this.flashlightBattery = Math.max(0, Math.min(maxBatteryCeiling, this.flashlightBattery + kineticCharge * delta));
            }
        }
        this.input.flashlightLocked = (this.flashlightBattery < maxBatteryCeiling * 0.25) || (this.flashlightBattery <= 0);
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
        const darkThreshold = 0.4;
        const darkSignal = Math.max(0.0, (this.perceivedDarkness - darkThreshold) / (1.0 - darkThreshold));
        let baseDrain = (externalPressure * 0.12) + (darkSignal * darkSignal * 0.04);
        if (this.exhaustion > 0.5) baseDrain *= 1.5;
        if (state.isReading) {
            baseDrain = 0.0;
        } else if (this.isBlindFolded) {
            baseDrain = -0.15;
        } else {
            const clarity = Math.max(0.0, 1.0 - externalPressure - darkSignal);
            const recoveryMultiplier = isMoving ? 1.0 : 3.0;
            const recovery = 0.08 * recoveryMultiplier * (1.0 - this.perceivedDarkness) * clarity;
            baseDrain -= recovery;
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
        let visualHeight = this.isCrawling ? 0.3 : (this.isCrouching ? 0.8 : 1.6);
        const physicalTop = this.isCrawling ? 0.50 : (this.isCrouching ? 1.2 : 2.5);
        const feetY = this.camera.position.y - visualHeight;
        const snagShrink = this.isSqueezing ? 0.02 : 0.15;
        const stepOffset = this.isCrawling ? 0.2 : 0.5;
        
        this._physicsBody.x = px;
        this._physicsBody.z = pz;
        this._physicsBody.feetY = feetY;
        this._physicsBody.radius = this.playerRadius;
        this._physicsBody.height = physicalTop;
        this._physicsBody.stepOffset = stepOffset;
        this._physicsBody.currentFeetY = currentFeetY;
        
        this._physicsScratch.boxX = this._boxX;
        this._physicsScratch.boxZ = this._boxZ;
        this._physicsScratch.floorBox = this._floorBox;
        this._physicsScratch.ceilingBox = this._ceilingBox;
        this._physicsScratch.ceilingClearance = (physicalTop - visualHeight) - 0.05;

        const manifold = sweepGroundedCollision(spatialGrid, this._physicsBody, moveX, moveZ, this._physicsScratch);
        
        let hitX = manifold.hitX;
        let hitZ = manifold.hitZ;
        let inVoid = manifold.inVoid;
        let targetFeetY = manifold.groundY;
        let dynamicMaxCamY = manifold.dynamicMaxCamY;
        
        if (this.isGodMode) {
            hitX = false;
            hitZ = false;
        }
        const isColliding = hitX || hitZ;
        if (isColliding) {
            const impactX = hitX ? Math.abs(this.velocity.x) : 0;
            const impactZ = hitZ ? Math.abs(this.velocity.z) : 0;
            const impact = (impactX + impactZ) * delta;
            if (manifold.hitFakeTunnel && impact > 0.05) {
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 4.0, variant: 'bong'}}));
                this.camera.rotation.x -= impact * 0.5;
            } else if (impact > 0.05 && this.enableHeadBob && !this.wasColliding) {
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
            this.bobOffset = 0;
            this.gait = 0;
            return;
        }
        if (this.isFrozen) {
            this.camera.position.x += this._leanOffset.x;
            this.camera.position.z += this._leanOffset.z;
            this._leanOffset.set(0, 0, 0);
            this.bobOffset = 0;
            this.gait = 0;
            return;
        }
        this._applyCinematics(delta, postIntentSpeed, targetFeetY, visualHeight, inVoid, localBoxes, dynamicMaxCamY, manifold);
    }

    _findAdjacentLadder(localBoxes, cx, cz, boundaryY, goingUp, excludeBox) {
        if (!localBoxes) return null;
        const eps = 0.02;
        for (let i = 0; i < localBoxes.length; i++) {
            const box = localBoxes[i];
            if (!box.isLadder || box === excludeBox) continue;
            const boxCx = (box.min.x + box.max.x) / 2;
            const boxCz = (box.min.z + box.max.z) / 2;
            if (Math.abs(boxCx - cx) > eps || Math.abs(boxCz - cz) > eps) continue;
            const edgeY = goingUp ? box.min.y : box.max.y;
            if (Math.abs(edgeY - boundaryY) <= eps) return box;
        }
        return null;
    }

    _updateLadder(delta, localBoxes, state, visualHeight) {
        if (this._onLadder) {
            const box = this._onLadder;
            const cx = (box.min.x + box.max.x) / 2;
            const cz = (box.min.z + box.max.z) / 2;
            const outDir = this._ladderApproachDir;
            this.camera.position.x = cx + outDir.x * LADDER_CLIMB_STANDOFF;
            this.camera.position.z = cz + outDir.z * LADDER_CLIMB_STANDOFF;
            this.velocity.set(0, 0, 0);
            this.fallVelocity = 0;

            if (state.jump) {
                state.jump = false;
                this.camera.position.x += outDir.x * LADDER_DISMOUNT_PUSH;
                this.camera.position.z += outDir.z * LADDER_DISMOUNT_PUSH;
                this.camera.position.y += 0.06;
                this.fallVelocity = -3.0;
                this._onLadder = null;
                this._ladderApproachDir = null;
                return true;
            }

            state.interactPressed = false;

            const climbDir = (state.moveForward ? 1 : 0) - (state.moveBackward ? 1 : 0);
            if (climbDir === 0) {
                this._ladderStepAccum = 0;
                return true;
            }
            const step = climbDir * LADDER_CLIMB_SPEED * delta;
            this.camera.position.y += step;
            this._ladderStepAccum = (this._ladderStepAccum || 0) + Math.abs(step);
            if (this._ladderStepAccum >= LADDER_FOOTSTEP_SPACING) {
                this._ladderStepAccum = 0;
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 0.7}}));
            }
            const feetY = this.camera.position.y - visualHeight;
            if (feetY > box.max.y || feetY < box.min.y) {
                const goingUp = feetY > box.max.y;
                const boundary = goingUp ? box.max.y : box.min.y;
                const next = this._findAdjacentLadder(localBoxes, cx, cz, boundary, goingUp, box);
                this.camera.position.y = boundary + visualHeight;
                if (next) {
                    this._onLadder = next;
                } else {
                    this._ladderStepAccum = 0;
                }
            }
            return true;
        }

        if (!localBoxes) return false;
        const feetY = this.camera.position.y - visualHeight;
        this.camera.getWorldDirection(this._ladderScratch);
        const lookX = this._ladderScratch.x, lookZ = this._ladderScratch.z;
        const lookLenSq = lookX * lookX + lookZ * lookZ;
        for (let i = 0; i < localBoxes.length; i++) {
            const box = localBoxes[i];
            if (!box.isLadder) continue;
            if (feetY < box.min.y - 0.3 || feetY > box.max.y - 0.05) continue;
            const cx = (box.min.x + box.max.x) / 2;
            const cz = (box.min.z + box.max.z) / 2;
            const dx = this.camera.position.x - cx;
            const dz = this.camera.position.z - cz;
            if (dx * dx + dz * dz > LADDER_GRAB_RADIUS_SQ) continue;
            if (lookLenSq > 0.02) {
                const facing = (lookX * -box.ladderOutDir.x + lookZ * -box.ladderOutDir.z) / Math.sqrt(lookLenSq);
                if (Math.abs(facing) < 0.3) continue;
            }
            if (this.env) this.env.isLookingAtInteractable = true;
            if (!state.interactPressed) return false;
            state.interactPressed = false;
            const sideSign = (dx * box.ladderOutDir.x + dz * box.ladderOutDir.z) >= 0 ? 1 : -1;
            this._ladderApproachDir = {x: box.ladderOutDir.x * sideSign, z: box.ladderOutDir.z * sideSign};
            this._onLadder = box;
            this._ladderStepAccum = 0;
            this.velocity.set(0, 0, 0);
            this.fallVelocity = 0;
            document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 1.2}}));
            return true;
        }
        if (state.interactPressed) state.interactPressed = false;
        return false;
    }

    _applyCinematics(delta, postIntentSpeed, targetFeetY, visualHeight, inVoid, localBoxes, dynamicMaxCamY, manifold) {
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
        if (this._tripStagger > 0) {
            this._tripStagger = Math.max(0, this._tripStagger - delta * 2.5);
            const staggerEased = this._tripStagger * this._tripStagger;
            bobOffset -= staggerEased * 0.35;
            swayRoll += Math.sin(this._tripStagger * Math.PI * 6) * 0.12 * staggerEased;
        }
        this.bobOffset = bobOffset;
        const gaitTarget = (this.enableHeadBob && postIntentSpeed > 0.5)
            ? Math.min(1.0, postIntentSpeed / 2.9)
            : 0.0;
        this.gait = (this.gait || 0) + (gaitTarget - (this.gait || 0)) * (1.0 - Math.exp(-8.0 * delta));
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
        let leanMag = Math.abs(leanLateral);
        let leanDirX = leanMag > 0 ? (leanLateral > 0 ? cosY : -cosY) : 0;
        let leanDirZ = leanMag > 0 ? (leanLateral > 0 ? -sinY : sinY) : 0;
        if (leanMag > 0 && localBoxes) {
            const origin = this.camera.position;
            const dir = {x: leanDirX, y: 0, z: leanDirZ};
            let maxLean = leanMag;
            
            for (let i = 0; i < localBoxes.length; i++) {
                const box = localBoxes[i];
                if (box.max.y > origin.y - 0.2 && box.min.y < origin.y + 0.2 && !box.isInvisibleBlocker) {
                    this._scratchRay.set(origin, dir);
                    if (this._scratchRay.intersectBox(box, this._camTarget)) {
                        const dx = this._camTarget.x - origin.x;
                        const dz = this._camTarget.z - origin.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < maxLean + 0.15) {
                            maxLean = Math.max(0, dist - 0.15);
                        }
                    }
                }
            }
            leanMag = maxLean;
        }
        this._leanOffset.set(leanDirX * leanMag, 0, leanDirZ * leanMag);
        this.camera.position.x += this._leanOffset.x;
        this.camera.position.z += this._leanOffset.z;
        if (!inVoid && targetFeetY === -100000) targetFeetY = 0;

        let activeSector = "NORMAL";
        if (this.env && this.env._sectorFrame) {
            activeSector = this.env._sectorFrame.activeSector;
        } else if (this.env && this.env._resolveActiveSector) {
            activeSector = this.env._resolveActiveSector(this.camera.position).activeSector;
        }

        let defaultMax = 2.8;
        if (activeSector === 'ACME') {
            defaultMax = 100000.0;
        } else if (activeSector === 'CHASM' || activeSector === 'ATRIUM' || activeSector === 'ARCHIVE') {
            defaultMax = 40.0;
        } else if (activeSector === 'IMPOUND') {
            defaultMax = 20.0;
        }
        dynamicMaxCamY = Math.min(dynamicMaxCamY, defaultMax);

        if (activeSector === 'ACME' && targetFeetY !== -100000 && this.fallVelocity === 0) {
            if (!this._acmeSafeSpot) {
                this._acmeSafeSpot = new THREE.Vector3();
                this._acmeSafeSpot.copy(this.camera.position);
            }
        } else if (activeSector !== 'ACME') {
            this._acmeSafeSpot = null;
        }

        if (activeSector === 'ACME' && this.camera.position.y < ACME_VOID_RESCUE_Y) {
            if (this._acmeSafeSpot) {
                this.camera.position.copy(this._acmeSafeSpot);
                this.camera.rotation.x = 0;
            } else if (this.env && this.env._spawnElevator && this.env._spawnElevator.placement) {
                const sp = this.env._spawnElevator.placement;
                this.camera.position.set(sp.x, 1.6, sp.z);
            } else {
                this.camera.position.y = ACME_LOWEST_PLATFORM_Y + 3.0;
            }
            this.fallVelocity = 0;
            this.velocity.set(0, 0, 0);
            this._groundFeetY = this.camera.position.y - visualHeight;
            targetFeetY = this._groundFeetY;
            this._acmeJustWarped = true;
            document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 5.0}}));
        }

        if (this._updateLadder(delta, localBoxes, state, visualHeight)) return;

        const groundCamY = Math.min(targetFeetY + visualHeight, dynamicMaxCamY) + bobOffset - leanDrop;

        if (targetFeetY === -100000) {
            if (activeSector === 'ACME') {
                this._acmeFallElapsed = (this._acmeFallElapsed || 0) + delta;
                if (!this._acmeWhistlePlaying && this._acmeFallElapsed > ACME_WHISTLE_MIN_FALL_TIME) {
                    this._acmeWhistlePlaying = true;
                    document.dispatchEvent(new CustomEvent('somatic-acme-fall-start'));
                }
            }
            this.fallVelocity = Math.min((this.fallVelocity || 0) + 30.0 * delta, MAX_FALL_SPEED);
            this.camera.position.y -= (this.fallVelocity * delta);
        } else {
            if (this._acmeWhistlePlaying) {
                this._acmeWhistlePlaying = false;
                document.dispatchEvent(new CustomEvent('somatic-acme-fall-end', {detail: {caught: !!this._acmeJustWarped}}));
            }
            this._acmeFallElapsed = 0;
            this._acmeJustWarped = false;
            if (this.camera.position.y > groundCamY + 0.05 || (this.fallVelocity && this.fallVelocity < 0)) {
                this.fallVelocity = (this.fallVelocity || 0) + 30.0 * delta;
                if (this.fallVelocity > MAX_FALL_SPEED) this.fallVelocity = MAX_FALL_SPEED;
                this.camera.position.y -= (this.fallVelocity * delta);

                if (this.camera.position.y > dynamicMaxCamY) {
                    this.camera.position.y = dynamicMaxCamY;
                    if (this.fallVelocity < 0) this.fallVelocity = 0;
                }

                if (this.camera.position.y <= groundCamY && this.fallVelocity > 0) {
                    this.camera.position.y = groundCamY;
                    this.fallVelocity = 0;
                    document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 1.5}}));
                }
            } else {
                this.fallVelocity = 0;
                const lerpFactor = 1.0 - Math.exp(-12.0 * delta);
                this.camera.position.y += (groundCamY - this.camera.position.y) * lerpFactor;

                if (state.jump && !state.isCrawling && !this.isSqueezing && this.exhaustion < 0.9) {
                    state.jump = false;
                    const jumpVelocity = state.isRunning ? 9.5 : 7.0;
                    this.fallVelocity = -jumpVelocity;
                    document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 1.0}}));
                    this.camera.position.y += 0.06;
                    this.exhaustion = Math.min(1.0, this.exhaustion + (state.isRunning ? 0.3 : 0.15));
                } else if (state.jump) {
                    state.jump = false;
                }
            }
        }
        
        if (targetFeetY !== -100000) this._groundFeetY = targetFeetY;
    }
}