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
        this.isLocked = false;
        this.playerRadius = 0.4;
        this.enableHeadBob = true;
        this.speedMultiplier = 1.0;

        // Metabolic State
        this.maxStamina = 100.0;
        this.stamina = 100.0;
        this.exhaustion = 0.0;
        this.isChased = false;

        // Mobile Touch State
        this.touchMove = {active: false, id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0};
        this.touchLook = {active: false, id: null, startX: 0, startY: 0, lastX: 0, lastY: 0};

        // Pre-allocated geometric vectors to prevent garbage collection thrashing
        this._boxX = new THREE.Box3();
        this._boxZ = new THREE.Box3();
        this._floorBox = new THREE.Box3();
        this._vecMin = new THREE.Vector3();
        this._vecMax = new THREE.Vector3();
        this.bindEvents();
    }

    bindEvents() {
        // WASD Key Events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Route the click through the mobile overlay to the document body
        const touchSurface = document.getElementById('mobile-ui');
        touchSurface.addEventListener('click', () => document.body.requestPointerLock());
        document.addEventListener('pointerlockchange', () => {
            // Track lock state against the body, not the buried canvas
            this.isLocked = (document.pointerLockElement === document.body);
        });
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Window Blur
        window.addEventListener('blur', () => {
            this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.isRunning = false;
        });

        // Delegate mobile inputs
        this.bindTouchEvents();
    }

    bindTouchEvents() {
        const zoneLeft = document.getElementById('touch-left');
        const zoneRight = document.getElementById('touch-right');
        const runBtn = document.getElementById('mobile-run');
        const crouchBtn = document.getElementById('mobile-crouch');

        // MOBILE ACTION TOGGLES
        if (runBtn && crouchBtn) {
            runBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevents the screen from interpreting this as a "look" click
                e.stopPropagation();
                this.isRunning = !this.isRunning;
                runBtn.classList.toggle('active', this.isRunning);

                // Running forces you to stop crouching
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
                // Crouching forces you to stop running
                if (this.isCrouching && this.isRunning) {
                    this.isRunning = false;
                    runBtn.classList.remove('active');
                }
            }, {passive: false});
        }

        // LEFT ZONE: MOVEMENT
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

        // RIGHT ZONE: CAMERA ROTATION
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

                    // Increased sensitivity multiplier from 0.002 to 0.008 for responsive mobile turning
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
        if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD', 'KeyC'].includes(key)) {
            event.preventDefault();
        }
        if (event.key === 'Shift') this.isRunning = true;
        if (event.code === 'KeyC') this.isCrouching = !this.isCrouching;
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
        this.camera.rotation.y -= e.movementX * 0.002;
        this.camera.rotation.x -= e.movementY * 0.002;
        this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
        this.camera.rotation.order = "YXZ";
    }

    update(delta, spatialGrid) {
        delta = Math.min(delta, 0.05);

        // Thermodynamic decay: Continuous exponential decay prevents velocity inversion and violent oscillation at low framerates
        const damping = Math.exp(-25.0 * delta);
        this.velocity.x *= damping;
        this.velocity.z *= damping;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        if (this.direction.lengthSq() > 0) this.direction.normalize();

        // Re-calibrated kinetic inflows to push terminal sprint velocity beyond the entity's top speed
        let currentSpeed = (this.isCrouching ? 35.0 : (this.isRunning ? 150.0 : 75.0)) * this.speedMultiplier;

        // Meadows' Metabolic Economy: Drain stamina ONLY when actively hunted and running.
        const isMoving = this.direction.lengthSq() > 0 || this.touchMove.active;
        if (this.isRunning && this.isChased && isMoving) {
            // The Chef's Calibration: 8 seconds of sprint capacity to build a viable gap.
            this.stamina = Math.max(0, this.stamina - 12.5 * delta);
            if (this.stamina <= 0.0) {
                this.isRunning = false; // Force terminal walking state
                currentSpeed = 75.0 * this.speedMultiplier;

                // Deactivate mobile UI run toggle if present
                const runBtn = document.getElementById('mobile-run');
                if (runBtn) runBtn.classList.remove('active');
            }
        } else {
            // Recover stamina when walking, crouching, or hiding
            this.stamina = Math.min(this.maxStamina, this.stamina + 10.0 * delta); // 10 second recovery
        }

        // Calculate terminal fatigue scalar (0.0 to 1.0)
        // Fuller's Threshold: Exhaustion (visual blur and audio choking) only kicks in when stamina drops below 30%
        const fatigueRatio = this.stamina / this.maxStamina;
        this.exhaustion = fatigueRatio < 0.3 ? Math.pow(1.0 - (fatigueRatio / 0.3), 2.0) : 0.0;

        // DESKTOP KEYBOARD INJECTION
        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * delta;

        // MOBILE MOVEMENT INJECTION
        if (this.touchMove.active) {
            const deadzone = 10;
            let normX = 0;
            let normY = 0;
            if (Math.abs(this.touchMove.deltaX) > deadzone) {
                normX = (this.touchMove.deltaX - (Math.sign(this.touchMove.deltaX) * deadzone)) / 110;
            }
            if (Math.abs(this.touchMove.deltaY) > deadzone) {
                normY = (this.touchMove.deltaY - (Math.sign(this.touchMove.deltaY) * deadzone)) / 110;
            }
            this.velocity.z += normY * currentSpeed * delta;
            // Fix inverted polarity: mobile X-axis now maps 1:1 with desktop math
            this.velocity.x -= normX * currentSpeed * delta;
        }
        const euler = new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ');
        const moveDelta = new THREE.Vector3(-this.velocity.x * delta, 0, this.velocity.z * delta);
        moveDelta.applyEuler(euler);
        const feetY = this.camera.position.y - 1.6; // Baseline floor
        const px = this.camera.position.x;
        const pz = this.camera.position.z;

        // Pure O(1) grid lookup. 2.0 unit radius prevents high-velocity clipping.
        const localBoxes = spatialGrid.getNearby(px, pz, 2.0);
        const visualHeight = this.isCrouching ? 0.8 : 1.6;
        const physicalTop = this.isCrouching ? 1.2 : 2.5;

        // X Collision mutation
        let hitX = false;
        const snagShrink = 0.05;
        this._vecMin.set(this.camera.position.x + moveDelta.x - this.playerRadius, feetY + 0.6, this.camera.position.z - this.playerRadius + snagShrink);
        this._vecMax.set(this.camera.position.x + moveDelta.x + this.playerRadius, feetY + physicalTop, this.camera.position.z + this.playerRadius - snagShrink);
        this._boxX.set(this._vecMin, this._vecMax);
        for (let box of localBoxes) {
            if (this._boxX.intersectsBox(box)) {
                hitX = true;
                break;
            }
        }
        if (!hitX) this.camera.position.x += moveDelta.x;

        // Z Collision mutation
        let hitZ = false;
        this._vecMin.set(this.camera.position.x - this.playerRadius + snagShrink, feetY + 0.6, this.camera.position.z + moveDelta.z - this.playerRadius);
        this._vecMax.set(this.camera.position.x + this.playerRadius - snagShrink, feetY + physicalTop, this.camera.position.z + moveDelta.z + this.playerRadius);
        this._boxZ.set(this._vecMin, this._vecMax);
        for (let box of localBoxes) {
            if (this._boxZ.intersectsBox(box)) {
                hitZ = true;
                break;
            }
        }
        if (!hitZ) this.camera.position.z += moveDelta.z;

        // Y Step-up Interpolation (Gravity Mapping)
        this._vecMin.set(this.camera.position.x - this.playerRadius, -10, this.camera.position.z - this.playerRadius);
        this._vecMax.set(this.camera.position.x + this.playerRadius, feetY + 1.2, this.camera.position.z + this.playerRadius);
        this._floorBox.set(this._vecMin, this._vecMax);
        let targetFeetY = 0;
        for (let box of localBoxes) {
            if (this._floorBox.intersectsBox(box) && box.max.y > targetFeetY && box.max.y <= feetY + 1.2) {
                targetFeetY = box.max.y;
            }
        }

        // The Head Bob. Track the physical velocity and map it to a sine wave.
        const actualSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        this.headBobTimer = (this.headBobTimer || 0) + actualSpeed * delta;

        // Toggle head bob based on user accessibility preference
        const bobOffset = (this.enableHeadBob && actualSpeed > 0.5) ? Math.sin(this.headBobTimer * 2.5) * 0.05 : 0;

        // Somatic suspension: Use exponential decay lerp so the camera never snaps violently on frame drops
        const targetCamY = Math.min(targetFeetY + visualHeight, 2.8) + bobOffset;
        const lerpFactor = 1.0 - Math.exp(-12.0 * delta);
        this.camera.position.y += (targetCamY - this.camera.position.y) * lerpFactor;
        document.getElementById('coords').innerText = `X: ${this.camera.position.x.toFixed(2)} | Z: ${this.camera.position.z.toFixed(2)}`;
    }
}