// SomaticInput.js
// LEVEL 0 PERIPHERAL NERVOUS SYSTEM

import Vec3 from './Vec3.js';

const PREVENT_KEYS = new Set(['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD', 'KeyM', 'KeyC', 'KeyX', 'KeyV', 'KeyQ', 'KeyF', 'KeyE', 'KeyG', 'KeyZ']);

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
            isReading: false
        };
        this.isLocked = false;
        this.lockFallback = false;
        this._dragLook = false;
        this._cKeyDown = false;
        this._cKeyPressTime = 0;
        this._cKeyHandled = false;
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
        const lockSurface = document.getElementById('canvas-container');
        if (lockSurface) {
            lockSurface.addEventListener('click', () => {
                if (this.state.isReading || this.isLocked || this.lockFallback) return;
                document.body.requestPointerLock();
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
            if (this.lockFallback && e.button === 0 && !this.state.isReading) this._dragLook = true;
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
            this.state.moveForward = this.state.moveBackward = this.state.moveLeft = this.state.moveRight = this.state.isRunning = this.state.isPeeking = false;
            this.state.targetLean = 0.0;
        });
    }

    _onKeyDown(event) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        const key = event.code;

        if (PREVENT_KEYS.has(key)) {
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
            document.dispatchEvent(new CustomEvent('somatic-eyes', {detail: {closed: true}}));
        }
        if (event.code === 'KeyF') {
            this.state.flashlightActive = !this.state.flashlightActive;
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
            if (this.state.isReading) {
                document.dispatchEvent(new Event('somatic-close-document'));
            } else {
                document.dispatchEvent(new CustomEvent('somatic-interact', {
                    detail: {position: this.camera.position, direction: this.camera.getWorldDirection(new Vec3())}
                }));
            }
        }
        if (event.code === 'KeyG') {
            document.dispatchEvent(new Event('somatic-toggle-godmode'));
        }
        if (event.code === 'KeyZ') {
            document.dispatchEvent(new Event('somatic-teleport-zone'));
        }
        switch (key) {
            case 'ArrowUp':
            case 'KeyW':
                this.state.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.state.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.state.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.state.moveRight = true;
                break;
        }
    }

    _onKeyUp(event) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        if (event.key === 'Shift') this.state.isRunning = false;
        if (event.code === 'KeyQ') this.state.squeezeIntent = false;
        if (event.code === 'KeyV') {
            this.state.isClosingEyes = false;
            document.dispatchEvent(new CustomEvent('somatic-eyes', {detail: {closed: false}}));
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
            case 'KeyW':
                this.state.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.state.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.state.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.state.moveRight = false;
                break;
        }
    }

    _onMouseMove(e) {
        if (!this.isLocked && !(this.lockFallback && this._dragLook)) return;
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