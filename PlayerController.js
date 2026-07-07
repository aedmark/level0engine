// PlayerController.js
// LEVEL 0 PLAYER CONTROLLER

export default class PlayerController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isRunning = false;
        this.isCrouching = false;
        this.isSqueezing = false;
        this.squeezeIntent = false;
        this.flashlightActive = false;
        this.flashlightBattery = 100.0;
        this.isLocked = false;
        this.baseRadius = 0.4;
        this.squeezeRadius = 0.12;
        this.playerRadius = 0.4;
        this.enableHeadBob = true;
        this.speedMultiplier = 1.0;
        this.maxStamina = 100.0;
        this.stamina = 100.0;
        this.exhaustion = 0.0;
        this.isChased = false;
        this.isPeeking = false;
        this.targetLean = 0.0;
        this.currentLean = 0.0;
        this._leanOffset = new THREE.Vector3();
        this.touchMove = {active: false, id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0};
        this.touchLook = {active: false, id: null, startX: 0, startY: 0, lastX: 0, lastY: 0};
        this._boxX = new THREE.Box3();
        this._boxZ = new THREE.Box3();
        this._floorBox = new THREE.Box3();
        this._vecMin = new THREE.Vector3();
        this._vecMax = new THREE.Vector3();
        this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this._moveDelta = new THREE.Vector3();
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        const touchSurface = document.getElementById('mobile-ui');
        touchSurface.addEventListener('click', () => document.body.requestPointerLock());
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === document.body);
            if (!this.isLocked) { this.isPeeking = false; this.targetLean = 0.0; }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.isLocked && e.button === 2) this.isPeeking = true;
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) { this.isPeeking = false; this.targetLean = 0.0; }
        });
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('blur', () => {
            this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.isRunning = this.isPeeking = false;
            this.targetLean = 0.0;
        });
        this.bindTouchEvents();
    }

    bindTouchEvents() {
        const zoneLeft = document.getElementById('touch-left');
        const zoneRight = document.getElementById('touch-right');
        const runBtn = document.getElementById('mobile-run');
        const crouchBtn = document.getElementById('mobile-crouch');
        const flashBtn = document.getElementById('mobile-flashlight');
        if (runBtn && crouchBtn) {
            runBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isRunning = !this.isRunning;
                runBtn.classList.toggle('active', this.isRunning);
                if (this.isRunning && this.isCrouching) {
                    this.isCrouching = false;
                    crouchBtn.classList.remove('active');
                }
            }, {passive: false});
            crouchBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isCrouching = !this.isCrouching;
                crouchBtn.classList.toggle('active', this.isCrouching);
                if (this.isCrouching && this.isRunning) {
                    this.isRunning = false;
                    runBtn.classList.remove('active');
                }
            }, {passive: false});

            if (flashBtn) {
                flashBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.flashlightActive = !this.flashlightActive;
                    flashBtn.classList.toggle('active', this.flashlightActive);
                }, {passive: false});
            }
        }
        zoneLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchMove.active = true;
            this.touchMove.id = touch.identifier;
            this.touchMove.startX = touch.clientX;
            this.touchMove.startY = touch.clientY;
        }, {passive: false});
        zoneLeft.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.touchMove.id) {
                    this.touchMove.deltaX = Math.max(-120, Math.min(120, touch.clientX - this.touchMove.startX));
                    this.touchMove.deltaY = Math.max(-120, Math.min(120, touch.clientY - this.touchMove.startY));
                }
            }
        }, {passive: false});
        zoneLeft.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchMove.id) {
                    this.touchMove.active = false;
                    this.touchMove.deltaX = 0;
                    this.touchMove.deltaY = 0;
                }
            }
        });
        zoneRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchLook.active = true;
            this.touchLook.id = touch.identifier;
            this.touchLook.lastX = touch.clientX;
            this.touchLook.lastY = touch.clientY;
        }, {passive: false});
        zoneRight.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.touchLook.id) {
                    const movementX = touch.clientX - this.touchLook.lastX;
                    const movementY = touch.clientY - this.touchLook.lastY;
                    this.camera.rotation.order = "YXZ";
                    this.camera.rotation.y -= movementX * 0.020;
                    this.camera.rotation.x -= movementY * 0.020;
                    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
                    this.touchLook.lastX = touch.clientX;
                    this.touchLook.lastY = touch.clientY;
                }
            }
        }, {passive: false});
        zoneRight.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchLook.id) {
                    this.touchLook.active = false;
                }
            }
        });
    }

    onKeyDown(event) {
        const key = event.code;
        if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD', 'KeyM', 'KeyC', 'KeyQ', 'KeyF'].includes(key)) {
            event.preventDefault();
        }
        if (event.key === 'Shift') this.isRunning = true;
        if (event.code === 'KeyC') this.isCrouching = !this.isCrouching;
        if (event.code === 'KeyQ') this.squeezeIntent = true;
        if (event.code === 'KeyF') {
            this.flashlightActive = !this.flashlightActive;
            const flashBtn = document.getElementById('mobile-flashlight');
            if (flashBtn) flashBtn.classList.toggle('active', this.flashlightActive);
        }
        switch (key) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        if (event.key === 'Shift') this.isRunning = false;
        if (event.code === 'KeyQ') this.squeezeIntent = false;
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    onMouseMove(e) {
        if (!this.isLocked) return;
        if (this.isPeeking) {
            this.targetLean -= e.movementX * 0.002;
            this.targetLean = Math.max(-0.5, Math.min(0.5, this.targetLean));
        } else {
            this.camera.rotation.y -= e.movementX * 0.002;
            this.camera.rotation.x -= e.movementY * 0.002;
            this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
            this.camera.rotation.order = "YXZ";
        }
    }

    update(delta, spatialGrid) {
        delta = Math.min(delta, 0.05);
        this.camera.position.x -= this._leanOffset.x;
        this.camera.position.z -= this._leanOffset.z;
        const damping = Math.exp(-25.0 * delta);
        this.velocity.x *= damping;
        this.velocity.z *= damping;
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        if (this.direction.lengthSq() > 0) this.direction.normalize();

        this.isSqueezing = this.squeezeIntent;
        let targetRadius = this.isSqueezing ? this.squeezeRadius : this.baseRadius;

        if (!this.isSqueezing && this.playerRadius < this.baseRadius - 0.01) {
            const checkY = this.camera.position.y - 1.0;
            this._vecMin.set(this.camera.position.x - this.baseRadius, checkY, this.camera.position.z - this.baseRadius);
            this._vecMax.set(this.camera.position.x + this.baseRadius, checkY + 1.5, this.camera.position.z + this.baseRadius);
            this._floorBox.set(this._vecMin, this._vecMax);

            const clearanceBoxes = spatialGrid.getNearby(this.camera.position.x, this.camera.position.z, 1.0);
            for (let i = 0; i < clearanceBoxes.length; i++) {
                if (this._floorBox.intersectsBox(clearanceBoxes[i])) {
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
        let currentSpeed = (this.isSqueezing ? 20.0 : (this.isCrouching ? 30.0 : (this.isRunning ? 125.0 : 60.0))) * this.speedMultiplier;
        const isMoving = this.direction.lengthSq() > 0 || this.touchMove.active;
        if (this.isRunning && this.isChased && isMoving && !this.isSqueezing) {
            this.stamina = Math.max(0, this.stamina - 12.5 * delta);
            if (this.stamina <= 0.0) {
                this.isRunning = false;
                currentSpeed = 60.0 * this.speedMultiplier;
            }
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + 10.0 * delta);
        }

        if (this.flashlightActive) {
            this.flashlightBattery = Math.max(0, this.flashlightBattery - 1.5 * delta);
            if (this.flashlightBattery === 0) {
                this.flashlightActive = false;
                const flashBtn = document.getElementById('mobile-flashlight');
                if (flashBtn) flashBtn.classList.remove('active');
            }
            this._lastRotY = this.camera.rotation.y;
            this._lastRotX = this.camera.rotation.x;
        } else {
            const actualSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
            const angularSpeed = Math.abs(this.camera.rotation.y - (this._lastRotY || this.camera.rotation.y)) +
                Math.abs(this.camera.rotation.x - (this._lastRotX || this.camera.rotation.x));

            this._lastRotY = this.camera.rotation.y;
            this._lastRotX = this.camera.rotation.x;

            const kineticCharge = (actualSpeed * 0.15) + (angularSpeed * 20.0);
            this.flashlightBattery = Math.min(100.0, this.flashlightBattery + (kineticCharge * delta));
        }

        const fatigueRatio = this.stamina / this.maxStamina;
        this.exhaustion = fatigueRatio < 0.3 ? Math.pow(1.0 - (fatigueRatio / 0.3), 2.0) : 0.0;
        let intentX = this.direction.x;
        let intentZ = this.direction.z;

        if (this.touchMove.active) {
            const deadzone = 10.0;
            const mapAxis = (px) => Math.abs(px) > deadzone ? (px - Math.sign(px) * deadzone) / 110.0 : 0.0;
            intentX = mapAxis(this.touchMove.deltaX);
            intentZ = -mapAxis(this.touchMove.deltaY);
        }

        this.velocity.x -= intentX * currentSpeed * delta;
        this.velocity.z -= intentZ * currentSpeed * delta;

        this._euler.set(0, this.camera.rotation.y, 0, 'YXZ');
        this._moveDelta.set(-this.velocity.x * delta, 0, this.velocity.z * delta).applyEuler(this._euler);

        const moveX = this._moveDelta.x;
        const moveZ = this._moveDelta.z;
        const px = this.camera.position.x;
        const pz = this.camera.position.z;
        const feetY = this.camera.position.y - 1.6;

        const localBoxes = spatialGrid.getNearby(px, pz, 2.0);
        const visualHeight = this.isCrouching ? 0.8 : 1.6;
        const physicalTop = this.isCrouching ? 1.2 : 2.5;
        const snagShrink = this.isSqueezing ? 0.01 : 0.05;

        this._vecMin.set(px + moveX - this.playerRadius, feetY + 0.6, pz - this.playerRadius + snagShrink);
        this._vecMax.set(px + moveX + this.playerRadius, feetY + physicalTop, pz + this.playerRadius - snagShrink);
        this._boxX.set(this._vecMin, this._vecMax);

        this._vecMin.set(px - this.playerRadius + snagShrink, feetY + 0.6, pz + moveZ - this.playerRadius);
        this._vecMax.set(px + this.playerRadius - snagShrink, feetY + physicalTop, pz + moveZ + this.playerRadius);
        this._boxZ.set(this._vecMin, this._vecMax);

        this._vecMin.set(px - this.playerRadius, -10.0, pz - this.playerRadius);
        this._vecMax.set(px + this.playerRadius, feetY + 1.2, pz + this.playerRadius);
        this._floorBox.set(this._vecMin, this._vecMax);

        let hitX = false;
        let hitZ = false;
        let targetFeetY = 0;

        for (let i = 0, len = localBoxes.length; i < len; i++) {
            const box = localBoxes[i];

            if (!hitX && this._boxX.intersectsBox(box)) hitX = true;
            if (!hitZ && this._boxZ.intersectsBox(box)) hitZ = true;

            if (box.max.y > targetFeetY && box.max.y <= feetY + 1.2) {
                if (this._floorBox.intersectsBox(box)) {
                    targetFeetY = box.max.y;
                }
            }
        }

        if (!hitX) this.camera.position.x += moveX;
        if (!hitZ) this.camera.position.z += moveZ;
        const actualSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        this.headBobTimer = (this.headBobTimer || 0) + actualSpeed * delta;

        let bobOffset = 0;
        let swayRoll = 0;
        if (this.enableHeadBob && actualSpeed > 0.5) {
            const bobFreq = this.isRunning ? 3.5 : 2.5;
            const bobAmp = this.isRunning ? 0.08 : 0.05;
            bobOffset = Math.sin(this.headBobTimer * bobFreq) * bobAmp;
            swayRoll = Math.cos(this.headBobTimer * (bobFreq * 0.5)) * (bobAmp * 0.05);
        }

        this.currentLean += (this.targetLean - this.currentLean) * (1.0 - Math.exp(-15.0 * delta));

        const rollDamping = 1.0 - Math.exp(-12.0 * delta);
        const velocityRoll = this.velocity.x * (this.isSqueezing ? 0.005 : 0.015);
        const peekRoll = -this.currentLean * 0.35; // Tilt the head physically opposite to the lean anchor
        this.camera.rotation.z += ((velocityRoll + peekRoll) - this.camera.rotation.z) * rollDamping;
        this.camera.rotation.z += swayRoll;

        this._euler.set(0, this.camera.rotation.y, 0, 'YXZ');
        const leanLateral = Math.sin(this.currentLean) * 0.8;
        const leanDrop = (1.0 - Math.cos(this.currentLean)) * 0.8;

        this._leanOffset.set(leanLateral, 0, 0).applyEuler(this._euler);
        this.camera.position.x += this._leanOffset.x;
        this.camera.position.z += this._leanOffset.z;

        const targetCamY = Math.min(targetFeetY + visualHeight, 2.8) + bobOffset - leanDrop;
        const lerpFactor = 1.0 - Math.exp(-12.0 * delta);
        this.camera.position.y += (targetCamY - this.camera.position.y) * lerpFactor;
    }
}