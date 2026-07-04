// engine.js - Level 0 Engine v0.0.8

// MODULE 1: CORE RENDER ENGINE
class RenderEngine {
    constructor() {
        this.aspectRatio = 'auto'; // Default state
        this.resolutionScale = 1.0; // Default rendering scale
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa89f68);
        this.scene.fog = new THREE.FogExp2(0xa89f68, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        this.renderer = new THREE.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        const ambient = new THREE.AmbientLight(0xffffe0, 0.45);
        this.scene.add(ambient);
        // POST-PROCESSING PIPELINE
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.postMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {value: this.target.texture},
                time: {value: 0.0}
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                varying vec2 vUv;
                float hash(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * .1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }
                void main() {
                    vec2 uv = vUv;
                    // 1. VHS Chromatic Aberration (RGB shift scales with distance from center)
                    vec2 offset = vec2(0.003, 0.0) * (uv.x - 0.5) * 2.0; 
                    float r = texture2D(tDiffuse, uv + offset).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - offset).b;
                    vec3 col = vec3(r, g, b);
                    // 2. Animated Crawling Static
                    float noise = hash(uv * vec2(800.0, 800.0) + time * 15.0);
                    col += (noise - 0.5) * 0.07;
                    // 3. Rolling CRT Scanlines
                    float scanline = sin(uv.y * 800.0 - time * 10.0) * 0.02;
                    col -= scanline;
                    // 4. Claustrophobic Vignette
                    float dist = distance(uv, vec2(0.5));
                    col *= smoothstep(0.8, 0.25, dist * dist + 0.3);
                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });
        const postPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
        this.postScene.add(postPlane);
        window.addEventListener('resize', () => this.resize(), false);
        // Force an initial dimension calculation on boot
        setTimeout(() => this.resize(), 0);
    }

    resize() {
        let w = window.innerWidth;
        let h = window.innerHeight;
        // Calculate letterboxing/pillarboxing if a strict aspect ratio is enforced
        if (this.aspectRatio !== 'auto') {
            const windowAspect = w / h;
            if (windowAspect > this.aspectRatio) {
                // Window is wider than needed; clamp width (pillarbox)
                w = h * this.aspectRatio;
            } else {
                // Window is taller than needed; clamp height (letterbox)
                h = w / this.aspectRatio;
            }
        }
        // Apply physical dimensions to the wrapper to crop the overlays perfectly
        const wrapper = document.getElementById('screen-wrapper');
        if (wrapper) {
            wrapper.style.width = `${w}px`;
            wrapper.style.height = `${h}px`;
        }
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        // Apply resolution scaling for performance and retro aesthetics
        const scale = this.resolutionScale;
        this.renderer.setSize(w * scale, h * scale, false); // false prevents overriding physical CSS size
        this.target.setSize(w * scale, h * scale);
    }

    get delta() {
        return this.clock.getDelta();
    }

    get time() {
        return this.clock.getElapsedTime();
    }

    render() {
        // Pass 1: Render true 3D scene to the offscreen target
        this.renderer.setRenderTarget(this.target);
        this.renderer.render(this.scene, this.camera);
        // Pass 2: Update time variable, apply ShaderMaterial, and render to the physical screen
        this.postMaterial.uniforms.time.value = this.time;
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postScene, this.postCamera);
    }
}

// MODULE 2: PLAYER CONTROLLER
class PlayerController {
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
        this.enableHeadBob = true; // Motion sickness accessibility state
        // Mobile Touch State
        this.touchMove = {active: false, id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0};
        this.touchLook = {active: false, id: null, startX: 0, startY: 0, lastX: 0, lastY: 0};
        this.bindEvents();
    }

    bindEvents() {
        // WASD Key Events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        // Pointer Lock Events
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

        // --- MOBILE ACTION TOGGLES ---
        if (runBtn && crouchBtn) {
            runBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevents the screen from interpreting this as a "look" click
                e.stopPropagation();

                this.isRunning = !this.isRunning;
                runBtn.classList.toggle('active', this.isRunning);

                // Smart cancellation: Running forces you to stop crouching
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

                // Smart cancellation: Crouching forces you to stop running
                if (this.isCrouching && this.isRunning) {
                    this.isRunning = false;
                    runBtn.classList.remove('active');
                }
            }, {passive: false});
        }

        // --- LEFT ZONE: MOVEMENT ---
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
                    // Expanded virtual joystick radius to 120 pixels for high-DPI screens
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
        // --- RIGHT ZONE: CAMERA ROTATION ---
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

    update(delta, wallBoxes) {
        delta = Math.min(delta, 0.05);
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        const currentSpeed = this.isCrouching ? 20.0 : (this.isRunning ? 75.0 : 40.0);
        // --- DESKTOP KEYBOARD INJECTION ---
        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * delta;
        // --- MOBILE MOVEMENT INJECTION ---
        if (this.touchMove.active) {
            // Deadzone threshold (ignore tiny micro-movements to prevent drift)
            const deadzone = 10;
            let normX = 0;
            let normY = 0;

            if (Math.abs(this.touchMove.deltaX) > deadzone) {
                // Shift the value down by the deadzone, then divide by the new 120 max limit
                normX = (this.touchMove.deltaX - (Math.sign(this.touchMove.deltaX) * deadzone)) / 110;
            }
            if (Math.abs(this.touchMove.deltaY) > deadzone) {
                normY = (this.touchMove.deltaY - (Math.sign(this.touchMove.deltaY) * deadzone)) / 110;
            }

            this.velocity.z += normY * currentSpeed * delta;
            this.velocity.x += normX * currentSpeed * delta;
        }
        const euler = new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ');
        const moveDelta = new THREE.Vector3(-this.velocity.x * delta, 0, this.velocity.z * delta);
        moveDelta.applyEuler(euler);
        const feetY = this.camera.position.y - 1.6; // Baseline floor
        const px = this.camera.position.x;
        const pz = this.camera.position.z;
        const localBoxes = [];
        for (let i = 0; i < wallBoxes.length; i++) {
            if (Math.abs(wallBoxes[i].max.x - px) < 6.0 && Math.abs(wallBoxes[i].max.z - pz) < 6.0) {
                localBoxes.push(wallBoxes[i]);
            }
        }

        const visualHeight = this.isCrouching ? 0.8 : 1.6;
        const physicalTop = this.isCrouching ? 1.2 : 2.5;

        // X Collision mutation
        let hitX = false;
        const snagShrink = 0.05;
        let boxX = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x + moveDelta.x - this.playerRadius, feetY + 0.6, this.camera.position.z - this.playerRadius + snagShrink),
            new THREE.Vector3(this.camera.position.x + moveDelta.x + this.playerRadius, feetY + physicalTop, this.camera.position.z + this.playerRadius - snagShrink)
        );
        for (let box of localBoxes) {
            if (boxX.intersectsBox(box)) {
                hitX = true;
                break;
            }
        }
        if (!hitX) this.camera.position.x += moveDelta.x;

        // Z Collision mutation
        let hitZ = false;
        let boxZ = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - this.playerRadius + snagShrink, feetY + 0.6, this.camera.position.z + moveDelta.z - this.playerRadius),
            new THREE.Vector3(this.camera.position.x + this.playerRadius - snagShrink, feetY + physicalTop, this.camera.position.z + moveDelta.z + this.playerRadius)
        );
        // Fix: Cast against localBoxes instead of the massive global wallBoxes array
        for (let box of localBoxes) {
            if (boxZ.intersectsBox(box)) {
                hitZ = true;
                break;
            }
        }
        if (!hitZ) this.camera.position.z += moveDelta.z;
        // Y Step-up Interpolation (Gravity Mapping)
        let floorBox = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - this.playerRadius, -10, this.camera.position.z - this.playerRadius),
            new THREE.Vector3(this.camera.position.x + this.playerRadius, feetY + 1.2, this.camera.position.z + this.playerRadius)
        );
        let targetFeetY = 0;
        for (let box of wallBoxes) {
            if (floorBox.intersectsBox(box) && box.max.y > targetFeetY && box.max.y <= feetY + 1.2) {
                targetFeetY = box.max.y;
            }
        }
        // The Somatic Head Bob. Track the physical velocity and map it to a sine wave.
        const actualSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        this.headBobTimer = (this.headBobTimer || 0) + actualSpeed * delta;
        // Toggle head bob based on user accessibility preference
        const bobOffset = (this.enableHeadBob && actualSpeed > 0.5) ? Math.sin(this.headBobTimer * 2.5) * 0.05 : 0;
        // Smoothly glide up or down the steps, adding the physical breathing mass
        const targetCamY = Math.min(targetFeetY + visualHeight, 2.8) + bobOffset;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 12.0 * delta;
        document.getElementById('coords').innerText = `X: ${this.camera.position.x.toFixed(2)} | Z: ${this.camera.position.z.toFixed(2)}`;
    }
}

// MODULE 3: ENVIRONMENT & MEMORY MANAGER
class Environment {
    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.lights = [];
        this.wallBoxes = [];
        this.audioCtx = null;
        this.audioInitialized = false;
    }

    initAudio() {
        if (this.audioInitialized) return;
        this.audioInitialized = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 60;
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = 120;
        // Expose the filter to the class topology so we can mutate it in the update loop
        this.kineticFilter = this.audioCtx.createBiquadFilter();
        this.kineticFilter.type = 'lowpass';
        this.kineticFilter.frequency.value = 250;
        osc2.connect(this.kineticFilter);
        const osc3 = this.audioCtx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = 1200;
        this.whineGain = this.audioCtx.createGain();
        this.whineGain.gain.value = 0.005;
        osc3.connect(this.whineGain);
        this.mainGain = this.audioCtx.createGain();
        this.mainGain.gain.value = 0.015; // Lowered baseline. We are simmering, not boiling.
        const lfo = this.audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // Slowed the phase loop from 0.1 to 0.05. A long, slow breath.
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 0.008; // Drastically reduced amplitude. The LFO should whisper, not shout.
        lfo.connect(lfoGain);
        lfoGain.connect(this.mainGain.gain);
        osc1.connect(this.mainGain);
        // Connect the newly exposed kinetic filter
        this.kineticFilter.connect(this.mainGain);
        this.whineGain.connect(this.mainGain);
        this.mainGain.connect(this.audioCtx.destination);
        osc1.start();
        osc2.start();
        osc3.start();
        lfo.start();
    }

    setup() {
        // 1. Mono-Yellow Wallpaper Texture
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 512;
        wallCanvas.height = 512;
        const wallCtx = wallCanvas.getContext('2d');
        wallCtx.fillStyle = '#d4c382';
        wallCtx.fillRect(0, 0, 512, 512);
        wallCtx.lineWidth = 4;
        for (let i = 0; i < 512; i += 16) {
            wallCtx.strokeStyle = (i % 32 === 0) ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
            wallCtx.beginPath();
            wallCtx.moveTo(i, 0);
            wallCtx.lineTo(i, 512);
            wallCtx.stroke();
        }
        for (let i = 0; i < 15000; i++) {
            wallCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            wallCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        for (let i = 0; i < 150; i++) {
            wallCtx.fillStyle = `rgba(80, 70, 40, ${Math.random() * 0.04})`;
            wallCtx.beginPath();
            wallCtx.arc(Math.random() * 512, 450 + Math.random() * 62, Math.random() * 50, 0, Math.PI * 2);
            wallCtx.fill();
        }
        const headerCanvas = document.createElement('canvas');
        headerCanvas.width = 512;
        headerCanvas.height = 512;
        headerCanvas.getContext('2d').drawImage(wallCanvas, 0, 0);
        const headerTexture = new THREE.CanvasTexture(headerCanvas);
        headerTexture.wrapS = THREE.RepeatWrapping;
        headerTexture.wrapT = THREE.RepeatWrapping;
        headerTexture.repeat.set(4, 0.1);
        headerTexture.offset.set(0, 0.9);
        this.headerMat = new THREE.MeshStandardMaterial({map: headerTexture, roughness: 0.8});
        // Continue painting the baseboards onto the original wall canvas
        wallCtx.fillStyle = '#4a3d24';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#3a2d14';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);
        this.wallTexture = new THREE.CanvasTexture(wallCanvas);
        this.wallTexture.wrapS = THREE.RepeatWrapping;
        this.wallTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.wallTexture.repeat.set(4, 1);
        // 2. Damp Carpet Texture
        const carpetCanvas = document.createElement('canvas');
        carpetCanvas.width = 512;
        carpetCanvas.height = 512;
        const carpetCtx = carpetCanvas.getContext('2d');
        carpetCtx.fillStyle = '#8b7e57';
        carpetCtx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 40000; i++) {
            carpetCtx.fillStyle = Math.random() > 0.5 ? 'rgba(50,40,20,0.15)' : 'rgba(100,90,50,0.1)';
            carpetCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
        }
        const carpetTexture = new THREE.CanvasTexture(carpetCanvas);
        carpetTexture.wrapS = THREE.RepeatWrapping;
        carpetTexture.wrapT = THREE.RepeatWrapping;
        carpetTexture.repeat.set(20, 20);
        // 3. Ceiling Tile Texture
        const ceilingCanvas = document.createElement('canvas');
        ceilingCanvas.width = 256;
        ceilingCanvas.height = 256;
        const ceilCtx = ceilingCanvas.getContext('2d');
        ceilCtx.fillStyle = '#e0dbcf';
        ceilCtx.fillRect(0, 0, 256, 256);
        ceilCtx.strokeStyle = '#b5b1a5';
        ceilCtx.lineWidth = 2;
        ceilCtx.strokeRect(0, 0, 256, 256);
        for (let i = 0; i < 2000; i++) {
            ceilCtx.fillStyle = 'rgba(0,0,0,0.03)';
            ceilCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        const ceilingTexture = new THREE.CanvasTexture(ceilingCanvas);
        ceilingTexture.wrapS = THREE.RepeatWrapping;
        ceilingTexture.wrapT = THREE.RepeatWrapping;
        // A 300x300 plane divided by 300 repeats = 1x1 unit tiles (approx 3x3 ft)
        ceilingTexture.repeat.set(300, 300);
        // 4. Structural Texture (Stairs & Arches)
        const structCanvas = document.createElement('canvas');
        structCanvas.width = 256;
        structCanvas.height = 256;
        const structCtx = structCanvas.getContext('2d');
        structCtx.fillStyle = '#5c5441';
        structCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 5000; i++) {
            structCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)';
            structCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        const structTexture = new THREE.CanvasTexture(structCanvas);
        structTexture.wrapS = THREE.RepeatWrapping;
        structTexture.wrapT = THREE.RepeatWrapping;
        structTexture.repeat.set(4, 4);
        this.structMat = new THREE.MeshStandardMaterial({map: structTexture, roughness: 1.0});
        // 5. Procedural Door Texture
        const doorCanvas = document.createElement('canvas');
        doorCanvas.width = 256;
        doorCanvas.height = 512;
        const doorCtx = doorCanvas.getContext('2d');
        doorCtx.fillStyle = '#4a3219';
        doorCtx.fillRect(0, 0, 256, 512);
        // Organic wood grain via segmented alpha strokes and curves.
        doorCtx.lineWidth = 1.5;
        for (let i = 0; i < 800; i++) {
            doorCtx.strokeStyle = Math.random() > 0.5 ? `rgba(0,0,0,${Math.random() * 0.15})` : `rgba(255,255,255,${Math.random() * 0.05})`;
            doorCtx.beginPath();
            let x = Math.random() * 256;
            let y = Math.random() * 512;
            let length = Math.random() * 100 + 20;
            doorCtx.moveTo(x, y);
            // Slight Bezier curve to simulate natural knotting and fiber flow
            doorCtx.bezierCurveTo(x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 4 - 2), y + length);
            doorCtx.stroke();
        }
        // Recessed Panels
        doorCtx.fillStyle = 'rgba(0,0,0,0.3)';
        doorCtx.fillRect(32, 32, 192, 200);
        doorCtx.fillRect(32, 260, 192, 220);
        // Highlights for the panels to fake depth.
        doorCtx.fillStyle = 'rgba(255,255,255,0.05)';
        doorCtx.fillRect(32, 32, 192, 4); // Top highlight
        doorCtx.fillRect(32, 32, 4, 200); // Left highlight
        doorCtx.fillRect(32, 260, 192, 4); // Top highlight
        doorCtx.fillRect(32, 260, 4, 220); // Left highlight
        // Brass Knob
        doorCtx.fillStyle = '#8a7e32';
        doorCtx.beginPath();
        doorCtx.arc(210, 260, 12, 0, Math.PI * 2);
        doorCtx.fill();
        const doorTexture = new THREE.CanvasTexture(doorCanvas);
        this.doorMat = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.9});
        // 6. Procedural HVAC Vent Texture (Optical Recess)
        const ventCanvas = document.createElement('canvas');
        ventCanvas.width = 256;
        ventCanvas.height = 256;
        const ventCtx = ventCanvas.getContext('2d');
        // Outer rim (flush with wall)
        ventCtx.fillStyle = '#1a1a1a';
        ventCtx.fillRect(0, 0, 256, 256);
        // Deep void (fake recess)
        ventCtx.fillStyle = '#050505';
        ventCtx.fillRect(16, 16, 224, 224);
        // Louvers (horizontal slats)
        ventCtx.fillStyle = '#2a2a2a';
        for (let i = 24; i < 240; i += 24) {
            ventCtx.fillRect(20, i, 216, 12);
            // Highlight to fake dimensional thickness
            ventCtx.fillStyle = '#4a4a4a';
            ventCtx.fillRect(20, i, 216, 2);
            ventCtx.fillStyle = '#2a2a2a';
        }
        // Industrial Grime
        for (let i = 0; i < 2000; i++) {
            ventCtx.fillStyle = 'rgba(0,0,0,0.5)';
            ventCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        const ventTexture = new THREE.CanvasTexture(ventCanvas);
        this.ventMat = new THREE.MeshStandardMaterial({map: ventTexture, roughness: 0.7, metalness: 0.4});
        // 7. Procedural Emissive Light Panel (Prismatic Diffuser)
        const lightCanvas = document.createElement('canvas');
        lightCanvas.width = 128;
        lightCanvas.height = 256;
        const lightCtx = lightCanvas.getContext('2d');
        // Base Emissive Hue
        lightCtx.fillStyle = '#ffffe0';
        lightCtx.fillRect(0, 0, 128, 256);
        // Prismatic Diffuser (Faint Diamond Grid)
        lightCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        lightCtx.lineWidth = 1;
        lightCtx.beginPath();
        // Intersecting strokes to create the plastic light cover
        for (let i = -256; i < 256; i += 8) {
            lightCtx.moveTo(0, i);
            lightCtx.lineTo(128, i + 128); // Diagonal down-right
            lightCtx.moveTo(128, i);
            lightCtx.lineTo(0, i + 128);   // Diagonal down-left
        }
        lightCtx.stroke();
        // Dark Beveled Edge & Frame
        lightCtx.strokeStyle = '#1a1a1a';
        lightCtx.lineWidth = 8;
        lightCtx.strokeRect(0, 0, 128, 256);
        lightCtx.strokeStyle = '#4a4a4a';
        lightCtx.lineWidth = 4;
        lightCtx.strokeRect(4, 4, 120, 248);
        const lightTexture = new THREE.CanvasTexture(lightCanvas);
        // We define the base materials once to prevent memory leaks during procedural generation.
        this.baseLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.1
        });
        this.baseBrokenLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0x555544,
            emissive: 0xffffe0,
            emissiveIntensity: 0.01,
            roughness: 0.8
        });
        // The structural housing. Non-emissive, dark plastic to wrap the sides.
        this.baseHousingMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });
        // Install Environment Geometry
        carpetTexture.repeat.set(50, 50); // Expanded UV repeat
        // Dynamically scale the bounding planes to safely encapsulate a grid of 40 (40 * 4 = 160 units).
        // A 300x300 plane provides a massive, impenetrable horizon without rendering infinite geometry.
        const floorGeo = new THREE.PlaneGeometry(300, 300);
        const floorMat = new THREE.MeshStandardMaterial({map: carpetTexture, roughness: 1.0});
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        const ceilGeo = new THREE.PlaneGeometry(300, 300);
        const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTexture, roughness: 0.9});
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 3;
        this.scene.add(ceiling);
        // Atmospheric Particulates. A single, mathematically efficient points cloud.
        const dustGeo = new THREE.BufferGeometry();
        const dustCount = 600;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount * 3; i++) {
            // Scatter the particles within a 20-unit localized bounding box
            dustPos[i] = (Math.random() - 0.5) * 30.0;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.10,
            depthWrite: false
        });
        this.dustCloud = new THREE.Points(dustGeo, dustMat);
        this.scene.add(this.dustCloud);
        // Track the base fog density so we can modulate it without breaking the UI.
        this.baseFogDensity = 0.05;
        // Boot Generation
        this.generate();
        // Bind UI
        const toggleBtn = document.getElementById('menuToggleBtn');
        const toggleMenu = (e) => {
            e.preventDefault(); // Prevents the browser from double-firing a synthetic click
            const panel = document.querySelector('.control-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };
        // Listen to the raw pointer press, not the delayed click evaluation
        toggleBtn.addEventListener('pointerdown', toggleMenu);
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.initAudio();
            this.generate();
        });
        document.getElementById('fogSlider').addEventListener('input', (e) => {
            this.baseFogDensity = e.target.value / 100;
        });
        document.getElementById('fovSlider').addEventListener('input', (e) => {
            this.camera.fov = Number(e.target.value);
            this.camera.updateProjectionMatrix();
        });
        document.getElementById('aspectSelect').addEventListener('change', (e) => {
            const val = e.target.value;
            this.engine.aspectRatio = val === 'auto' ? 'auto' : parseFloat(val);
            this.engine.resize();
        });

        // Listen for resolution changes and recalculate the RenderTarget
        document.getElementById('resolutionSelect').addEventListener('change', (e) => {
            this.engine.resolutionScale = parseFloat(e.target.value);
            this.engine.resize();
        });

        // Listen for accessibility motion toggle
        document.getElementById('headBobToggle').addEventListener('change', (e) => {
            this.player.enableHeadBob = e.target.checked;
        });
        document.getElementById('captureBtn').addEventListener('click', () => this.captureAsset());
        document.addEventListener('click', () => this.initAudio(), {once: true});
        document.addEventListener('keydown', () => this.initAudio(), {once: true});
    }

    generate() {
        // Eradicate previous geometries and materials to prevent memory leak
        this.walls.forEach(w => {
            if (w.geometry) w.geometry.dispose();
            if (w.material) w.material.dispose();
            this.scene.remove(w);
        });
        this.lights.forEach(l => {
            if (l.userData.material) l.userData.material.dispose();
            this.scene.remove(l);
        });
        this.walls = [];
        this.lights = [];
        this.wallBoxes = [];
        // Return the player to the mathematical center (the guaranteed safe zone)
        this.camera.position.set(0, 1.6, 0);
        // Kill any residual movement momentum to prevent immediate clipping
        this.player.velocity.set(0, 0, 0);
        const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
        let baseSeed = 0;
        for (let i = 0; i < seedString.length; i++) {
            baseSeed = ((baseSeed << 5) - baseSeed) + seedString.charCodeAt(i);
            baseSeed |= 0;
        }
        let prngSeed = baseSeed;
        const random = () => {
            let x = Math.sin(prngSeed++) * 10000;
            return x - Math.floor(x);
        };
        const gridSize = 42;
        const cellSize = 4;
        const MAX_LIGHTS = 69;
        const MAX_SHADOWS = 4; // Hardware limit safeguard
        let lightsAdded = 0;
        let shadowLightsAdded = 0;
        const buildWall = (w, d, mat) => {
            const geo = new THREE.BoxGeometry(w, 3.0, d);
            const uv = geo.attributes.uv;
            // Normalize the U-axis to the physical world-scale (1 unit = 0.25 repeats)
            for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (d / cellSize)); // Left/Right faces
            for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (w / cellSize)); // Front/Back faces
            return new THREE.Mesh(geo, mat);
        };
        const wallGeo = new THREE.BoxGeometry(cellSize, 3, cellSize);
        const wallMat = new THREE.MeshStandardMaterial({
            map: this.wallTexture,
            color: 0xffffff,
            roughness: 0.8
        });
        // 0.98 x 1.98 perfectly fits a 1x2 ceiling tile slot while leaving a 0.01 structural gap.
        const panelGeo = new THREE.BoxGeometry(0.98, 0.05, 1.98);
        const halfGrid = Math.floor(gridSize / 2);
        const cx = Math.sin(baseSeed) * 0.8;
        const cy = Math.cos(baseSeed * 0.5) * 0.8;
        // THE GENERATION MATRIX: Decoupling rules from execution
        const addGeometry = (mesh) => {
            mesh.castShadow = mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.walls.push(mesh);
            mesh.updateMatrixWorld();
            this.wallBoxes.push(new THREE.Box3().setFromObject(mesh));
        };
        const structuralMatrix = [
            {
                prob: 0.95, build: (x, z) => {
                    const pillar = buildWall(0.5 + (random() * 2.0), 0.5 + (random() * 2.0), wallMat);
                    pillar.position.set(x * cellSize, 1.5, z * cellSize);
                    addGeometry(pillar);
                }
            },
            {
                prob: 0.90, build: (x, z) => {
                    const pW = 0.8, offset = (cellSize / 2) - (pW / 2), gap = cellSize - (pW * 2);
                    const p1 = buildWall(pW, cellSize, wallMat);
                    p1.position.set(x * cellSize - offset, 1.5, z * cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, cellSize, wallMat);
                    p2.position.set(x * cellSize + offset, 1.5, z * cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, cellSize), this.headerMat);
                    top.position.set(x * cellSize, 2.85, z * cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.82, build: (x, z) => {
                    const pW = 1.2, offset = (cellSize / 2) - (pW / 2), gap = cellSize - (pW * 2);
                    const p1 = buildWall(pW, cellSize, wallMat);
                    p1.position.set(x * cellSize - offset, 1.5, z * cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, cellSize, wallMat);
                    p2.position.set(x * cellSize + offset, 1.5, z * cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, cellSize), this.headerMat);
                    top.position.set(x * cellSize, 2.85, z * cellSize);
                    addGeometry(top);
                    const doorGeo = new THREE.BoxGeometry(1.5, 2.7, 0.1);
                    doorGeo.translate(0.75, 0, 0);
                    const door = new THREE.Mesh(doorGeo, this.doorMat);
                    door.position.set(x * cellSize - 0.8, 1.35, z * cellSize + 1.95);
                    door.rotation.y = Math.PI / 4;
                    addGeometry(door);
                }
            },
            {
                prob: 0.74, build: (x, z) => {
                    const dir = Math.floor(random() * 2), offset = (cellSize / 2) - 0.25;
                    const w1 = dir === 0 ? 0.5 : cellSize, d1 = dir === 0 ? cellSize : 0.5;
                    const gapW = dir === 0 ? cellSize - 1.0 : cellSize, gapD = dir === 0 ? cellSize : cellSize - 1.0;
                    const p1 = buildWall(w1, d1, wallMat);
                    p1.position.set(x * cellSize - (dir === 0 ? offset : 0), 1.5, z * cellSize - (dir === 1 ? offset : 0));
                    addGeometry(p1);
                    const p2 = buildWall(w1, d1, wallMat);
                    p2.position.set(x * cellSize + (dir === 0 ? offset : 0), 1.5, z * cellSize + (dir === 1 ? offset : 0));
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gapW, 0.3, gapD), this.headerMat);
                    top.position.set(x * cellSize, 2.85, z * cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.65, build: (x, z) => {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(x * cellSize, 1.5, z * cellSize);
                    addGeometry(wall);
                    const ventDir = Math.floor(random() * 2);
                    const ventGeo = new THREE.BoxGeometry(ventDir === 0 ? 1.2 : cellSize + 0.1, 0.4, ventDir === 0 ? cellSize + 0.1 : 1.2);
                    const vent = new THREE.Mesh(ventGeo, this.ventMat);
                    vent.position.set(x * cellSize, random() > 0.5 ? 2.6 : 0.4, z * cellSize);
                    addGeometry(vent);
                }
            },
            {
                prob: 0.00, build: (x, z) => {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(x * cellSize, 1.5, z * cellSize);
                    addGeometry(wall);
                }
            }
        ];
        for (let x = -halfGrid - 1; x <= halfGrid + 1; x++) {
            for (let z = -halfGrid - 1; z <= halfGrid + 1; z++) {
                const isBoundary = (x === -halfGrid - 1 || x === halfGrid + 1 || z === -halfGrid - 1 || z === halfGrid + 1);
                if (isBoundary) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(x * cellSize, 1.5, z * cellSize);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.walls.push(wall);
                    wall.updateMatrixWorld();
                    this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
                    continue;
                }
                if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
                let zx = x * 0.15;
                let zy = z * 0.15;
                let iter = 0;
                while (zx * zx + zy * zy < 4 && iter < 15) {
                    let xt = zx * zx - zy * zy + cx;
                    zy = 2 * zx * zy + cy;
                    zx = xt;
                    iter++;
                }
                let isWall = iter > 8;
                if (random() > 0.85) isWall = !isWall;
                if (isWall) {
                    const structRoll = random();
                    // Search the matrix and execute the first matching structural probability
                    const structure = structuralMatrix.find(s => structRoll >= s.prob);
                    if (structure) structure.build(x, z);
                } else if (random() > 0.999) { // Extremely rare (.1% chance)
                    // Procedural Stairs - Authentic directional staircase
                    const stepCount = 10;
                    const stepDepth = cellSize / stepCount;
                    const stepHeight = 3.0 / stepCount;
                    const dir = Math.floor(random() * 4); // 0=N, 1=E, 2=S, 3=W
                    for (let s = 0; s < stepCount; s++) {
                        const h = (s + 1) * stepHeight;
                        // Flip geometry dimensions based on N/S vs E/W
                        const wX = (dir % 2 === 0) ? cellSize : stepDepth;
                        const wZ = (dir % 2 === 0) ? stepDepth : cellSize;
                        const step = new THREE.Mesh(new THREE.BoxGeometry(wX, h, wZ), this.structMat);
                        // Calculate offset from the center of the cell
                        let offset = (cellSize / 2) - (stepDepth / 2) - (s * stepDepth);
                        if (dir === 2 || dir === 3) offset = -offset; // Reverse direction
                        const posX = x * cellSize + ((dir % 2 !== 0) ? offset : 0);
                        const posZ = z * cellSize + ((dir % 2 === 0) ? offset : 0);
                        step.position.set(posX, h / 2, posZ);
                        step.castShadow = step.receiveShadow = true;
                        this.scene.add(step);
                        this.walls.push(step);
                        step.updateMatrixWorld();
                        this.wallBoxes.push(new THREE.Box3().setFromObject(step));
                    }
                } else if (random() > 0.85) {
                    const isBroken = random() > 0.90;
                    const isRotated = random() > 0.5;
                    // The Geometric Offset.
                    // The tile grid boundaries rest on integers. A 1x2 panel requires a 0.5 unit offset
                    // on its minor axis to socket perfectly into the drop-ceiling void.
                    const offsetX = isRotated ? 0.0 : 0.5;
                    const offsetZ = isRotated ? 0.5 : 0.0;
                    const posX = (x * cellSize) + offsetX;
                    const posZ = (z * cellSize) + offsetZ;
                    // We clone the prototype material so the stochastic update loop
                    // doesn't bleed the dynamic emissive state across all geometries simultaneously.
                    const activeMat = isBroken ? this.baseBrokenLightMat.clone() : this.baseLightMat.clone();
                    // Serve the materials in a 6-face array.
                    // Three.js Box order: [+x, -x, +y, -y, +z, -z]
                    // We only want the emissive diffuser on the bottom face (-y).
                    const matArray = [
                        this.baseHousingMat, // Right  (+x)
                        this.baseHousingMat, // Left   (-x)
                        this.baseHousingMat, // Top    (+y) - Hidden in ceiling
                        activeMat,           // Bottom (-y) - Facing the player
                        this.baseHousingMat, // Front  (+z)
                        this.baseHousingMat  // Back   (-z)
                    ];
                    const panel = new THREE.Mesh(panelGeo, matArray);
                    panel.position.set(posX, 2.98, posZ);
                    if (isRotated) panel.rotation.y = Math.PI / 2;
                    this.scene.add(panel);
                    this.walls.push(panel);
                    if (!isBroken && this.lights.length < MAX_LIGHTS && random() > 0.75) {
                        const light = new THREE.PointLight(0xfff5c2, 0.6, 20);
                        light.position.set(posX, 2.8, posZ);

                        // Calculate squared distance from spawn (0,0) to find the closest lights
                        const distFromSpawnSq = (posX * posX) + (posZ * posZ);

                        // Only enable shadows for nearby lights, up to our hardware limit
                        if (distFromSpawnSq < 600 && shadowLightsAdded < MAX_SHADOWS) {
                            light.castShadow = true;
                            light.shadow.mapSize.width = 256;
                            light.shadow.mapSize.height = 256;
                            light.shadow.camera.near = 0.5;
                            light.shadow.camera.far = 20;
                            light.shadow.bias = -0.005;
                            shadowLightsAdded++;
                        } else {
                            light.castShadow = false;
                        }
                        light.userData = {
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.75,
                            baseIntensity: 0.6,
                            targetIntensity: 0.6
                        };
                        this.scene.add(light);
                        this.lights.push(light);
                    }
                }
            }
        }
    }

    captureAsset() {
        const flash = document.getElementById('flash-overlay');
        // Instant strike: kill the CSS transition temporarily
        flash.style.transition = 'none';
        flash.style.opacity = '1';
        setTimeout(() => {
            // Restore the slow decay for the cool-down
            flash.style.transition = 'opacity 0.8s ease-out';
            flash.style.opacity = '0';
        }, 50);
        setTimeout(() => {
            this.engine.render();
            const dataURL = this.engine.renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `backrooms_asset_${Date.now()}.png`;
            link.href = dataURL;
            link.click();
        }, 10);
    }

    updateLights(time) {
        let ambientLightLevel = 0;
        const cameraPos = this.camera.position;
        // Instantiate the raycaster and tracking vectors once lazily
        // to avoid crippling the Garbage Collector during the render loop.
        if (!this.audioRaycaster) {
            this.audioRaycaster = new THREE.Raycaster();
            this.audioDirection = new THREE.Vector3();
        }
        let nearestLight = null;
        let minLightDist = Infinity;
        // Only process lights within a 20-unit radius
        this.lights.forEach(light => {
            const distSq = cameraPos.distanceToSquared(light.position);
            if (distSq < 400) {
                const dist = Math.sqrt(distSq);
                ambientLightLevel += (20 - dist) / 20;
                // Track the absolute closest active light for our audio raycast
                if (dist < minLightDist) {
                    minLightDist = dist;
                    nearestLight = light;
                }
                if (light.userData.isFaulty) {
                    if (Math.random() < 0.02) {
                        light.userData.targetIntensity = Math.random() < 0.4 ? 0.05 : light.userData.baseIntensity + (Math.random() * 0.4);
                    }
                    light.intensity += (light.userData.targetIntensity - light.intensity) * 0.4;
                    light.userData.material.emissiveIntensity = Math.max(0.05, light.intensity * 0.6);
                } else {
                    light.intensity = light.userData.baseIntensity + (Math.sin(time * 120 + light.userData.flickerOffset) * 0.02);
                    light.userData.material.emissiveIntensity = 0.4;
                }
            }
        });
        // The Structural Raycast. Find if matter exists between the player and the sound.
        let isOccluded = false;
        if (nearestLight && minLightDist > 1.0) {
            this.audioDirection.subVectors(nearestLight.position, cameraPos).normalize();
            this.audioRaycaster.set(cameraPos, this.audioDirection);
            this.audioRaycaster.far = minLightDist;
            // Cast against the global walls array. Three.js internal sphere-culling keeps this cheap.
            const hits = this.audioRaycaster.intersectObjects(this.walls);
            if (hits.length > 0) isOccluded = true;
        }
        if (this.audioInitialized && this.mainGain) {
            // Geodesic proximity mapping. Inverse distance to the nearest active light.
            // Clamped to a maximum range of 20 units. 1.0 = right underneath it, 0.0 = far away.
            const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
            // Modulate the amplitude.
            this.mainGain.gain.setTargetAtTime(0.005 + (proximity * 0.02), this.audioCtx.currentTime, 0.5);
            // If occluded, choke it. If visible, scale the whine purely by how close you are to the bulb.
            const whineTarget = isOccluded ? 0.0001 : 0.0005 + (proximity * 0.003);
            this.whineGain.gain.setTargetAtTime(whineTarget, this.audioCtx.currentTime, 0.2);
            if (this.kineticFilter) {
                // Systemic damping. The velocity vectors were blowing out the DSP target frequency.
                const speed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
                const exertionPulse = Math.sin(time * 8.0) * (speed * 5); // Reduced pulse frequency and amplitude
                // Muffle the kinetic filter. Drop the ceiling on the high frequencies.
                const baseFreq = isOccluded ? 120 : 250;
                const speedScale = isOccluded ? 2 : 8; // Drastically reduced from 150 to prevent acoustic spikes
                const targetFreq = Math.max(100, baseFreq + (speed * speedScale) + exertionPulse);
                const timeConstant = isOccluded ? 0.2 : 3.0; // Snap down instantly when occluded, recover smoothly
                this.kineticFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, timeConstant);
            }
        }
        // Stir the pot. The dust cloud physically envelopes the player, rotating slowly.
        if (this.dustCloud) {
            this.dustCloud.position.copy(cameraPos);
            this.dustCloud.rotation.y = time * 0.05;
            this.dustCloud.rotation.z = time * 0.02;
        }        // Autonomic Fog. The environment physically breathes around the observer.
        if (this.baseFogDensity !== undefined) {
            // A slow respiratory cycle that modulates the current base density by +/- 30%
            const fogBreath = Math.sin(time * 0.05) * (this.baseFogDensity * 0.3);
            this.scene.fog.density = this.baseFogDensity + fogBreath;
        }
    }
}

// SYSTEM BOOTSTRAP
const engine = new RenderEngine();
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);
environment.setup();

function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    player.update(delta, environment.wallBoxes);
    environment.updateLights(time);
    engine.render();
}

animate();

// VHS Clock Tick
function updateVHSTime() {
    const now = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const vhsTimeDisplay = document.getElementById('vhs-time');
    if (vhsTimeDisplay) {
        vhsTimeDisplay.innerText = `${ampm} ${String(hours).padStart(2, '0')}:${mins}:${secs} \u00A0\u00A0 ${month} ${day} ${year}`;
    }
}

setInterval(updateVHSTime, 1000);
updateVHSTime(); // Initialize immediately