// SomaticInput.js
// LEVEL 0 PERIPHERAL NERVOUS SYSTEM

export default class SomaticInput {
    constructor(camera) {
        this.camera = camera;
        this.state = {
            moveForward: false, moveBackward: false,
            moveLeft: false, moveRight: false,
            isRunning: false, isCrouching: false, isCrawling: false,
            squeezeIntent: false,
            flashlightActive: false,
            isPeeking: false, targetLean: 0.0,
            isClosingEyes: false,
            touchMoveActive: false, touchDeltaX: 0, touchDeltaY: 0
        };

        this.isLocked = false;
        this._cKeyDown = false;
        this._cKeyPressTime = 0;
        this._cKeyHandled = false;

        this.touchMove = { id: null, startX: 0, startY: 0 };
        this.touchLook = { active: false, id: null, lastX: 0, lastY: 0 };

        this._bindEvents();
    }

    update() {
        if (this._cKeyDown && !this._cKeyHandled && (performance.now() - this._cKeyPressTime > 300)) {
            this.state.isCrawling = !this.state.isCrawling;
            this.state.isCrouching = false;
            this._cKeyHandled = true;
        }
    }

    _bindEvents() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        const touchSurface = document.getElementById('mobile-ui');
        if (touchSurface) touchSurface.addEventListener('click', () => document.body.requestPointerLock());

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === document.body);
            if (!this.isLocked) {
                this.state.isPeeking = false;
                this.state.targetLean = 0.0;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.isLocked && e.button === 2) this.state.isPeeking = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.state.isPeeking = false;
                this.state.targetLean = 0.0;
            }
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));

        window.addEventListener('blur', () => {
            this.state.moveForward = this.state.moveBackward = this.state.moveLeft = this.state.moveRight = this.state.isRunning = this.state.isPeeking = false;
            this.state.targetLean = 0.0;
        });

        this._bindTouchEvents();
    }

    _bindTouchEvents() {
        const zoneLeft = document.getElementById('touch-left');
        const zoneRight = document.getElementById('touch-right');
        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');
        const runBtn = document.getElementById('mobile-run');
        const crouchBtn = document.getElementById('mobile-crouch');
        const flashBtn = document.getElementById('mobile-flashlight');

        if (runBtn && crouchBtn) {
            runBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.state.isRunning = !this.state.isRunning;
                runBtn.classList.toggle('active', this.state.isRunning);
                if (this.state.isRunning && this.state.isCrouching) {
                    this.state.isCrouching = false;
                    crouchBtn.classList.remove('active');
                }
            }, {passive: false});

            crouchBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.state.isCrouching = !this.state.isCrouching;
                crouchBtn.classList.toggle('active', this.state.isCrouching);
                if (this.state.isCrouching && this.state.isRunning) {
                    this.state.isRunning = false;
                    runBtn.classList.remove('active');
                }
            }, {passive: false});

            if (flashBtn) {
                flashBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    this.state.flashlightActive = !this.state.flashlightActive;
                    flashBtn.classList.toggle('active', this.state.flashlightActive);
                }, {passive: false});
            }
        }

        if (zoneLeft) {
            zoneLeft.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                this.state.touchMoveActive = true;
                this.touchMove.id = touch.identifier;
                this.touchMove.startX = touch.clientX;
                this.touchMove.startY = touch.clientY;

                if (joystickBase) {
                    joystickBase.style.display = 'block';
                    joystickBase.style.left = touch.clientX + 'px';
                    joystickBase.style.top = touch.clientY + 'px';
                    if (joystickKnob) joystickKnob.style.transform = `translate(-50%, -50%)`;
                }
            }, {passive: false});

            zoneLeft.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === this.touchMove.id) {
                        this.state.touchDeltaX = Math.max(-120, Math.min(120, touch.clientX - this.touchMove.startX));
                        this.state.touchDeltaY = Math.max(-120, Math.min(120, touch.clientY - this.touchMove.startY));

                        if (joystickKnob) {
                            const distance = Math.sqrt(this.state.touchDeltaX ** 2 + this.state.touchDeltaY ** 2);
                            const maxVisualRadius = 50;
                            let visualX = this.state.touchDeltaX;
                            let visualY = this.state.touchDeltaY;

                            if (distance > maxVisualRadius) {
                                visualX = (visualX / distance) * maxVisualRadius;
                                visualY = (visualY / distance) * maxVisualRadius;
                            }
                            joystickKnob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
                        }
                    }
                }
            }, {passive: false});

            zoneLeft.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.touchMove.id) {
                        this.state.touchMoveActive = false;
                        this.state.touchDeltaX = 0;
                        this.state.touchDeltaY = 0;
                        if (joystickBase) joystickBase.style.display = 'none';
                    }
                }
            });
        }

        if (zoneRight) {
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
    }

    _onKeyDown(event) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        const key = event.code;
        if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD', 'KeyM', 'KeyC', 'KeyX', 'KeyV', 'KeyQ', 'KeyF', 'KeyE'].includes(key)) {
            event.preventDefault();
        }
        if (event.key === 'Shift') this.state.isRunning = true;

        if (event.code === 'KeyC') {
            if (!this._cKeyDown) {
                this._cKeyDown = true;
                this._cKeyPressTime = performance.now();
                this._cKeyHandled = false;
            }
        }

        if (event.code === 'KeyX') document.dispatchEvent(new Event('capture-screenshot'));
        if (event.code === 'KeyQ') this.state.squeezeIntent = true;
        if (event.code === 'KeyV') {
            this.state.isClosingEyes = true;
            document.dispatchEvent(new CustomEvent('somatic-eyes', { detail: { closed: true } }));
        }

        if (event.code === 'KeyF') {
            this.state.flashlightActive = !this.state.flashlightActive;
            const flashBtn = document.getElementById('mobile-flashlight');
            if (flashBtn) flashBtn.classList.toggle('active', this.state.flashlightActive);
        }

        if (event.code === 'Digit1') {
            document.dispatchEvent(new Event('somatic-use-battery'));
        }

        if (event.code === 'Digit2') {
            document.dispatchEvent(new Event('somatic-use-almond'));
        }

        if (event.code === 'KeyT') {
            document.dispatchEvent(new Event('somatic-tag'));
        }

        if (event.code === 'KeyE') {
            document.dispatchEvent(new CustomEvent('somatic-interact', {
                detail: {position: this.camera.position, direction: this.camera.getWorldDirection(new THREE.Vector3())}
            }));
        }

        switch (key) {
            case 'ArrowUp':
            case 'KeyW': this.state.moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': this.state.moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': this.state.moveBackward = true; break;
            case 'ArrowRight':
            case 'KeyD': this.state.moveRight = true; break;
        }
    }

    _onKeyUp(event) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        if (event.key === 'Shift') this.state.isRunning = false;
        if (event.code === 'KeyQ') this.state.squeezeIntent = false;
        if (event.code === 'KeyV') {
            this.state.isClosingEyes = false;
            document.dispatchEvent(new CustomEvent('somatic-eyes', { detail: { closed: false } }));
        }
        if (event.code === 'KeyC') {
            this._cKeyDown = false;
            if (!this._cKeyHandled) {
                if (this.state.isCrawling) {
                    this.state.isCrawling = false;
                    this.state.isCrouching = true;
                } else {
                    this.state.isCrouching = !this.state.isCrouching;
                    this.state.isCrawling = false;
                }
            }
        }

        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.state.moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': this.state.moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': this.state.moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': this.state.moveRight = false; break;
        }
    }

    _onMouseMove(e) {
        if (!this.isLocked) return;
        if (this.state.isPeeking) {
            this.state.targetLean -= e.movementX * 0.002;
            this.state.targetLean = Math.max(-0.5, Math.min(0.5, this.state.targetLean));
        } else {
            this.camera.rotation.y -= e.movementX * 0.002;
            this.camera.rotation.x -= e.movementY * 0.002;
            this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
            this.camera.rotation.order = "YXZ";
        }
    }
}