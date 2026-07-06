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
        this.maxStamina = 100.0;
        this.stamina = 100.0;
        this.exhaustion = 0.0;
        this.isChased = false;
        this.touchMove = {active: false, id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0};
        this.touchLook = {active: false, id: null, startX: 0, startY: 0, lastX: 0, lastY: 0};
        this._boxX = new THREE.Box3();
        this._boxZ = new THREE.Box3();
        this._floorBox = new THREE.Box3();
        this._vecMin = new THREE.Vector3();
        this._vecMax = new THREE.Vector3();
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        const touchSurface = document.getElementById('mobile-ui');
        touchSurface.addEventListener('click', () => document.body.requestPointerLock());
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === document.body);
        });
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('blur', () => {
            this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.isRunning = false;
        });
        this.bindTouchEvents();
    }

    bindTouchEvents() {
        const zoneLeft = document.getElementById('touch-left');
        const zoneRight = document.getElementById('touch-right');
        const runBtn = document.getElementById('mobile-run');
        const crouchBtn = document.getElementById('mobile-crouch');
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
        if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD', 'KeyM', 'KeyC'].includes(key)) {
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
        const damping = Math.exp(-25.0 * delta);
        this.velocity.x *= damping;
        this.velocity.z *= damping;
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        if (this.direction.lengthSq() > 0) this.direction.normalize();
        let currentSpeed = (this.isCrouching ? 35.0 : (this.isRunning ? 150.0 : 75.0)) * this.speedMultiplier;
        const isMoving = this.direction.lengthSq() > 0 || this.touchMove.active;
        if (this.isRunning && this.isChased && isMoving) {
            this.stamina = Math.max(0, this.stamina - 12.5 * delta);
            if (this.stamina <= 0.0) {
                this.isRunning = false;
                currentSpeed = 75.0 * this.speedMultiplier;
            }
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + 10.0 * delta);
        }
        const fatigueRatio = this.stamina / this.maxStamina;
        this.exhaustion = fatigueRatio < 0.3 ? Math.pow(1.0 - (fatigueRatio / 0.3), 2.0) : 0.0;
        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * delta;
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
            this.velocity.x -= normX * currentSpeed * delta;
        }
        const euler = new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ');
        const moveDelta = new THREE.Vector3(-this.velocity.x * delta, 0, this.velocity.z * delta);
        moveDelta.applyEuler(euler);
        const feetY = this.camera.position.y - 1.6;
        const px = this.camera.position.x;
        const pz = this.camera.position.z;
        const localBoxes = spatialGrid.getNearby(px, pz, 2.0);
        const visualHeight = this.isCrouching ? 0.8 : 1.6;
        const physicalTop = this.isCrouching ? 1.2 : 2.5;
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
        this._vecMin.set(this.camera.position.x - this.playerRadius, -10, this.camera.position.z - this.playerRadius);
        this._vecMax.set(this.camera.position.x + this.playerRadius, feetY + 1.2, this.camera.position.z + this.playerRadius);
        this._floorBox.set(this._vecMin, this._vecMax);
        let targetFeetY = 0;
        for (let box of localBoxes) {
            if (this._floorBox.intersectsBox(box) && box.max.y > targetFeetY && box.max.y <= feetY + 1.2) {
                targetFeetY = box.max.y;
            }
        }
        const actualSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        this.headBobTimer = (this.headBobTimer || 0) + actualSpeed * delta;
        const bobOffset = (this.enableHeadBob && actualSpeed > 0.5) ? Math.sin(this.headBobTimer * 2.5) * 0.05 : 0;
        const targetCamY = Math.min(targetFeetY + visualHeight, 2.8) + bobOffset;
        const lerpFactor = 1.0 - Math.exp(-12.0 * delta);
        this.camera.position.y += (targetCamY - this.camera.position.y) * lerpFactor;
    }
}