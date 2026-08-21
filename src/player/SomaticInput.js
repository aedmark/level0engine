import InputBindings from '../system/InputBindings.js';

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
            isReading: false,
            flyUp: false
        };
        this.cursorX = window.innerWidth / 2;
        this.cursorY = window.innerHeight / 2;
        this.hoveredElement = null;
        this.suppressCrouchToggle = false;
        this.isLocked = false;
        this.lockFallback = false;
        this._dragLook = false;
        this._cKeyDown = false;
        this._cKeyPressTime = 0;
        this._cKeyHandled = false;
        this.gamepadIndex = null;
        this._buttonStates = {};
        this._gamepadMoved = false;
        this._pendingMouseMovementX = 0;
        this._pendingMouseMovementY = 0;
        this._bindEvents();
    }

    update(delta = 0) {
        if (this._cKeyDown && !this._cKeyHandled && (performance.now() - this._cKeyPressTime > 300)) {
            this.state.isCrawling = !this.state.isCrawling;
            this.state.isCrouching = false;
            this._cKeyHandled = true;
        }

        if (this._pendingMouseMovementX !== 0 || this._pendingMouseMovementY !== 0) {
            if (this.state.isPeeking) {
                this.state.targetLean -= this._pendingMouseMovementX * 0.002;
                this.state.targetLean = Math.max(-0.5, Math.min(0.5, this.state.targetLean));
            } else {
                this.camera.rotation.y -= this._pendingMouseMovementX * 0.002;
                this.camera.rotation.x -= this._pendingMouseMovementY * 0.002;
                this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
                this.camera.rotation.order = "YXZ";
            }
            this._pendingMouseMovementX = 0;
            this._pendingMouseMovementY = 0;
        }

        this._updateGamepad(delta);
    }

    _updateGamepad(delta) {
        if (this.gamepadIndex === null) return;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[this.gamepadIndex];
        if (!gp) return;

        const DEADZONE = 0.2;

        const lsX = gp.axes[0];
        const lsY = gp.axes[1];
        if (Math.abs(lsY) > DEADZONE || Math.abs(lsX) > DEADZONE) {
            this.state.moveForward = lsY < -DEADZONE;
            this.state.moveBackward = lsY > DEADZONE;
            this.state.moveLeft = lsX < -DEADZONE;
            this.state.moveRight = lsX > DEADZONE;
            this._gamepadMoved = true;
        } else if (this._gamepadMoved) {
            this.state.moveForward = this.state.moveBackward = this.state.moveLeft = this.state.moveRight = false;
            this._gamepadMoved = false;
        }

        const rsX = gp.axes[2];
        const rsY = gp.axes[3];
        if (Math.abs(rsX) > DEADZONE || Math.abs(rsY) > DEADZONE) {
            if (this.state.isReading) {
                this.cursorX += rsX * delta * 600;
                this.cursorY += rsY * delta * 600;
                this.cursorX = Math.max(0, Math.min(window.innerWidth, this.cursorX));
                this.cursorY = Math.max(0, Math.min(window.innerHeight, this.cursorY));
                
                const vCursor = document.getElementById('virtual-cursor');
                if (vCursor) {
                    vCursor.style.left = this.cursorX + 'px';
                    vCursor.style.top = this.cursorY + 'px';
                    this._queueHoverProbe();
                }
            } else if (!this.isFrozen && (this.isLocked || this.lockFallback)) {
                if (this.state.isPeeking) {
                    this.state.targetLean -= rsX * delta * 2.0;
                    this.state.targetLean = Math.max(-0.5, Math.min(0.5, this.state.targetLean));
                } else {
                    this.camera.rotation.y -= rsX * delta * 2.0;
                    this.camera.rotation.x -= rsY * delta * 2.0;
                    this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
                    this.camera.rotation.order = "YXZ";
                }
            }
        }

        const activeButtons = [];
        const pressedButtons = [];
        const releasedButtons = [];
        for (let i = 0; i < gp.buttons.length; i++) {
            const isPressed = gp.buttons[i].pressed;
            const wasPressed = this._buttonStates[i] || false;
            this._buttonStates[i] = isPressed;
            if (isPressed) activeButtons.push(i);
            if (isPressed && !wasPressed) pressedButtons.push(i);
            if (!isPressed && wasPressed) releasedButtons.push(i);
        }

        const isActionActive = (action) => activeButtons.some(b => InputBindings.isActionGamepad(action, b));
        const isActionPressed = (action) => pressedButtons.some(b => InputBindings.isActionGamepad(action, b));
        const isActionReleased = (action) => releasedButtons.some(b => InputBindings.isActionGamepad(action, b));

        if (isActionPressed('jump')) {
            this.state.flyUp = true;
            this.state.jump = true;
        }
        if (isActionReleased('jump')) this.state.flyUp = false;

        if (isActionPressed('closeDoc')) {
            if (this.state.isReading) document.dispatchEvent(new Event('somatic-close-document'));
            else document.dispatchEvent(new Event('somatic-interact-release'));
        }

        if (isActionPressed('flashlight')) {
            this.state.flashlightActive = !this.state.flashlightActive;
            document.dispatchEvent(new CustomEvent('somatic-flashlight', {detail: {on: this.state.flashlightActive}}));
            if (this.state.flashlightActive) {
                document.dispatchEvent(new Event('somatic-stow-compass'));
                document.dispatchEvent(new Event('somatic-stow-gun'));
            }
        }

        if (isActionPressed('compass') && !this.state.isReading) {
            document.dispatchEvent(new Event('somatic-toggle-compass'));
            document.dispatchEvent(new Event('somatic-stow-gun'));
        }

        if (isActionPressed('closeEyes')) {
            this.state.isClosingEyes = true;
            document.dispatchEvent(new CustomEvent('somatic-eyes', {detail: {closed: true}}));
        } else if (isActionReleased('closeEyes')) {
             if (this.state.isClosingEyes) {
                 this.state.isClosingEyes = false;
                 document.dispatchEvent(new CustomEvent('somatic-eyes', {detail: {closed: false}}));
             }
        }

        this.state.squeezeIntent = isActionActive('squeeze');

        if (isActionPressed('peek')) this.state.isPeeking = true;
        else if (isActionReleased('peek')) {
             this.state.isPeeking = false;
             this.state.targetLean = 0.0;
        }

        if (isActionPressed('interact')) {
            if (this.state.isReading) {
                if (this.hoveredElement) this.hoveredElement.click();
                else document.dispatchEvent(new Event('somatic-close-document'));
            } else {
                document.dispatchEvent(new CustomEvent('somatic-interact', {
                    detail: {
                        position: this.camera.getWorldPosition(new THREE.Vector3()),
                        direction: this.camera.getWorldDirection(new THREE.Vector3())
                    }
                }));
            }
        } else if (isActionReleased('interact')) {
             document.dispatchEvent(new Event('somatic-interact-release'));
        }

        if (isActionPressed('tag')) document.dispatchEvent(new Event('somatic-tag'));
        if (pressedButtons.includes(9) && window.EDMARK_DEBUG_MODE) document.dispatchEvent(new Event('somatic-toggle-godmode'));

        this.state.isRunning = isActionActive('sprint');

        if (isActionPressed('crouch')) {
            if (this.state.isCrawling) {
                this.state.isCrawling = false;
                this.state.isCrouching = true;
            } else {
                this.state.isCrouching = !this.state.isCrouching;
                this.state.isCrawling = false;
            }
        }


        if (isActionPressed('paintball') && !this.state.isReading) document.dispatchEvent(new Event('somatic-toggle-gun'));
        if (isActionPressed('journal')) document.dispatchEvent(new Event('somatic-journal-toggle'));
    }

    _bindEvents() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.", e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);
            this.gamepadIndex = e.gamepad.index;
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected from index %d: %s", e.gamepad.index, e.gamepad.id);
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
                this._buttonStates = {};
            }
        });
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        const lockSurface = document.getElementById('canvas-container');
        if (lockSurface) {
            lockSurface.addEventListener('click', () => {
                if (this.state.isReading || this.isLocked || this.lockFallback) return;
                document.body.requestPointerLock()?.catch(() => {
                });
                setTimeout(() => {
                    if (!this.isLocked) this.lockFallback = true;
                }, 400);
            });
        }
        document.addEventListener('pointerlockerror', () => {
            this.lockFallback = true;
        });
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === document.body);
            if (this.isLocked) this.lockFallback = false;
            if (!this.isLocked) {
                this.state.isPeeking = false;
                this.state.targetLean = 0.0;
            }
        });
        document.addEventListener('mousedown', (e) => {
            if (this.state.isReading && e.button === 0) {
                if (this.hoveredElement) {
                    this.hoveredElement.click();
                } else {
                    document.dispatchEvent(new Event('somatic-close-document'));
                }
                return;
            }
            if (this.lockFallback && e.button === 0 && !this.state.isReading) this._dragLook = true;
            if ((this.isLocked || this.lockFallback) && e.button === 0 && !this.state.isReading) {
                document.dispatchEvent(new Event('somatic-shoot'));
            }
            if ((this.isLocked || this.lockFallback) && e.button === 2) this.state.isPeeking = true;
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this._dragLook = false;
            if (e.button === 2) {
                this.state.isPeeking = false;
                this.state.targetLean = 0.0;
            }
        });
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('blur', () => {
            this.state.moveForward = this.state.moveBackward = this.state.moveLeft = this.state.moveRight = this.state.isRunning = this.state.isPeeking = this.state.flyUp = false;
            this.state.targetLean = 0.0;
            this._pendingMouseMovementX = 0;
            this._pendingMouseMovementY = 0;
        });
    }

    _onKeyDown(event) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        
        const preventKeys = InputBindings.getPreventKeys();
        if (preventKeys.has(event.code) || preventKeys.has(event.key)) {
            event.preventDefault();
        }

        const is = (action) => InputBindings.isActionKeyboard(action, event);

        if (is('sprint')) this.state.isRunning = true;
        
        if (is('crouch')) {
            if (!this._cKeyDown) {
                this._cKeyDown = true;
                this._cKeyPressTime = performance.now();
                this._cKeyHandled = false;
            }
        }

        if (event.code === 'KeyU' && event.ctrlKey && event.shiftKey) {
            window.EDMARK_DEBUG_MODE = !window.EDMARK_DEBUG_MODE;
            console.log("EDMARK_DEBUG_MODE:", window.EDMARK_DEBUG_MODE);
            if (window.EDMARK_DEBUG_MODE) {
                try {
                    localStorage.setItem('level0_tutorial', '1');
                    localStorage.setItem('level0_tutorial_unlocked', '1');
                } catch(e) {}
            }
            document.dispatchEvent(new Event('debug-mode-toggled'));
            return;
        }
        if (event.code === 'KeyX') document.dispatchEvent(new Event('capture-screenshot'));
        if (event.code === 'KeyG' && window.EDMARK_DEBUG_MODE) document.dispatchEvent(new Event('somatic-toggle-godmode'));
        if (event.code === 'KeyZ' && window.EDMARK_DEBUG_MODE) document.dispatchEvent(new Event('somatic-teleport-zone'));

        if (is('squeeze')) this.state.squeezeIntent = true;
        
        if (is('closeEyes')) {
            this.state.isClosingEyes = true;
            document.dispatchEvent(new CustomEvent('somatic-eyes', {detail: {closed: true}}));
        }

        if (is('flashlight')) {
            this.state.flashlightActive = !this.state.flashlightActive;
            document.dispatchEvent(new CustomEvent('somatic-flashlight', {detail: {on: this.state.flashlightActive}}));
            if (this.state.flashlightActive) {
                document.dispatchEvent(new Event('somatic-stow-compass'));
                document.dispatchEvent(new Event('somatic-stow-gun'));
            }
        }


        if (is('tag')) document.dispatchEvent(new Event('somatic-tag'));
        
        if (is('compass') && !this.state.isReading) {
            document.dispatchEvent(new Event('somatic-toggle-compass'));
            document.dispatchEvent(new Event('somatic-stow-gun'));
        }
        
        if (is('paintball') && !this.state.isReading) document.dispatchEvent(new Event('somatic-toggle-gun'));
        if (is('journal')) document.dispatchEvent(new Event('somatic-journal-toggle'));

        if (is('interact')) {
            if (event.repeat) return;
            if (this.state.isReading) {
                document.dispatchEvent(new Event('somatic-close-document'));
            } else {
                document.dispatchEvent(new CustomEvent('somatic-interact', {
                    detail: {
                        position: this.camera.getWorldPosition(new THREE.Vector3()),
                        direction: this.camera.getWorldDirection(new THREE.Vector3())
                    }
                }));
            }
        }

        if (is('jump') && !event.repeat) {
            this.state.flyUp = true;
            this.state.jump = true;
        }

        if (this.state.isReading && (event.code.startsWith('Arrow') || is('moveLeft') || is('moveRight'))) {
            let dir = 1;
            if (event.code === 'ArrowLeft' || event.code === 'ArrowUp' || is('moveLeft') || is('moveForward')) dir = -1;
            document.dispatchEvent(new CustomEvent('somatic-doc-nav', {detail: {dir: dir}}));
            return;
        }

        if (is('moveForward')) this.state.moveForward = true;
        if (is('moveBackward')) this.state.moveBackward = true;
        if (is('moveLeft')) this.state.moveLeft = true;
        if (is('moveRight')) this.state.moveRight = true;
    }

    _onKeyUp(event) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        
        const is = (action) => InputBindings.isActionKeyboard(action, event);

        if (is('sprint')) this.state.isRunning = false;
        if (is('squeeze')) this.state.squeezeIntent = false;
        
        if (is('closeEyes')) {
            this.state.isClosingEyes = false;
            document.dispatchEvent(new CustomEvent('somatic-eyes', {detail: {closed: false}}));
        }
        
        if (is('jump')) this.state.flyUp = false;
        
        if (is('interact')) document.dispatchEvent(new Event('somatic-interact-release'));

        if (is('crouch')) {
            this._cKeyDown = false;
            if (!this._cKeyHandled && !this.suppressCrouchToggle) {
                if (this.state.isCrawling) {
                    this.state.isCrawling = false;
                    this.state.isCrouching = true;
                } else {
                    this.state.isCrouching = !this.state.isCrouching;
                    this.state.isCrawling = false;
                }
            }
        }

        if (is('moveForward')) this.state.moveForward = false;
        if (is('moveBackward')) this.state.moveBackward = false;
        if (is('moveLeft')) this.state.moveLeft = false;
        if (is('moveRight')) this.state.moveRight = false;
    }

    _queueHoverProbe() {
        if (this._hoverProbeQueued) return;
        this._hoverProbeQueued = true;
        requestAnimationFrame(() => {
            this._hoverProbeQueued = false;
            if (!this.state.isReading) {
                if (this.hoveredElement) {
                    this.hoveredElement.classList.remove('virtual-hover');
                    this.hoveredElement = null;
                }
                return;
            }
            const element = document.elementFromPoint(this.cursorX, this.cursorY);
            if (element === this.hoveredElement) return;
            if (this.hoveredElement) this.hoveredElement.classList.remove('virtual-hover');
            this.hoveredElement = element;
            if (this.hoveredElement) this.hoveredElement.classList.add('virtual-hover');
        });
    }

    _onMouseMove(e) {
        if (this.isFrozen) return;
        if (!this.isLocked && !(this.lockFallback && this._dragLook)) return;
        
        if (this.state.isReading) {
            this.cursorX += e.movementX;
            this.cursorY += e.movementY;
            this.cursorX = Math.max(0, Math.min(window.innerWidth, this.cursorX));
            this.cursorY = Math.max(0, Math.min(window.innerHeight, this.cursorY));
            
            const vCursor = document.getElementById('virtual-cursor');
            if (vCursor) {
                vCursor.style.left = this.cursorX + 'px';
                vCursor.style.top = this.cursorY + 'px';
                this._queueHoverProbe();
            }
            return;
        }

        this._pendingMouseMovementX += e.movementX;
        this._pendingMouseMovementY += e.movementY;
    }
}