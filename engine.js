// ==========================================
// MODULE 1: CORE RENDER ENGINE (WITH VHS POST-PROCESSING)
// ==========================================
class RenderEngine {
    constructor() {
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
                tDiffuse: { value: this.target.texture },
                time: { value: 0.0 }
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
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.target.setSize(window.innerWidth, window.innerHeight); // Keep offscreen target matched to monitor resolution
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

// ==========================================
// MODULE 2: PLAYER CONTROLLER
// ==========================================
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
        this.isLocked = false;
        this.playerRadius = 0.4;

        this.bindEvents();
    }

    bindEvents() {
        // WASD Key Events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Pointer Lock Events
        this.domElement.addEventListener('click', () => this.domElement.requestPointerLock());
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === this.domElement);
        });
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Window Blur
        window.addEventListener('blur', () => {
            this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.isRunning = false;
        });
    }

    onKeyDown(event) {
        const key = event.code;
        if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD'].includes(key)) {
            event.preventDefault();
        }
        if (event.key === 'Shift') this.isRunning = true;
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
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        const currentSpeed = this.isRunning ? 75.0 : 40.0;
        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * delta;

        const euler = new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ');
        const moveDelta = new THREE.Vector3(-this.velocity.x * delta, 0, this.velocity.z * delta);
        moveDelta.applyEuler(euler);

        const feetY = this.camera.position.y - 1.6; // Baseline floor

        // X Collision (Raised by 0.6 to clear steps)
        let hitX = false;
        let boxX = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x + moveDelta.x - this.playerRadius, feetY + 0.6, this.camera.position.z - this.playerRadius),
            new THREE.Vector3(this.camera.position.x + moveDelta.x + this.playerRadius, feetY + 2.5, this.camera.position.z + this.playerRadius)
        );
        for (let box of wallBoxes) { if (boxX.intersectsBox(box)) { hitX = true; break; } }
        if (!hitX) this.camera.position.x += moveDelta.x;

        // Z Collision (Raised by 0.6)
        let hitZ = false;
        let boxZ = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - this.playerRadius, feetY + 0.6, this.camera.position.z + moveDelta.z - this.playerRadius),
            new THREE.Vector3(this.camera.position.x + this.playerRadius, feetY + 2.5, this.camera.position.z + moveDelta.z + this.playerRadius)
        );
        for (let box of wallBoxes) { if (boxZ.intersectsBox(box)) { hitZ = true; break; } }
        if (!hitZ) this.camera.position.z += moveDelta.z;

        // Y Step-up Interpolation (Gravity Mapping)
        let floorBox = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - 0.1, -10, this.camera.position.z - 0.1),
            new THREE.Vector3(this.camera.position.x + 0.1, feetY + 1.2, this.camera.position.z + 0.1)
        );

        let targetFeetY = 0;
        for (let box of wallBoxes) {
            if (floorBox.intersectsBox(box) && box.max.y > targetFeetY && box.max.y <= feetY + 1.2) {
                targetFeetY = box.max.y;
            }
        }

        // Smoothly glide up or down the steps
        this.camera.position.y += ((targetFeetY + 1.6) - this.camera.position.y) * 12.0 * delta;

        document.getElementById('coords').innerText = `X: ${this.camera.position.x.toFixed(2)} | Z: ${this.camera.position.z.toFixed(2)}`;
    }
}

// ==========================================
// MODULE 3: ENVIRONMENT & MEMORY MANAGER
// ==========================================
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
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 250;
        osc2.connect(filter);

        const osc3 = this.audioCtx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = 1200;
        this.whineGain = this.audioCtx.createGain();
        this.whineGain.gain.value = 0.005;
        osc3.connect(this.whineGain);

        this.mainGain = this.audioCtx.createGain();
        this.mainGain.gain.value = 0.04; // Base baseline

        const lfo = this.audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 0.04;
        lfo.connect(lfoGain);
        lfoGain.connect(this.mainGain.gain);

        osc1.connect(this.mainGain);
        filter.connect(this.mainGain);
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

        wallCtx.fillStyle = '#4a3d24';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#3a2d14';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);

        this.wallTexture = new THREE.CanvasTexture(wallCanvas);
        this.wallTexture.wrapS = THREE.RepeatWrapping;
        this.wallTexture.wrapT = THREE.RepeatWrapping;
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
        ceilingTexture.repeat.set(50, 50); // Expanded UV repeat

        // 4. Structural Texture (Stairs & Arches)
        const structCanvas = document.createElement('canvas');
        structCanvas.width = 256;
        structCanvas.height = 256;
        const structCtx = structCanvas.getContext('2d');
        structCtx.fillStyle = '#5c5441'; // Darker, contrasting concrete/wood
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

        // Install Environment Geometry
        carpetTexture.repeat.set(50, 50); // Expanded UV repeat

        const floorGeo = new THREE.PlaneGeometry(250, 250); // Expanded physical grid
        const floorMat = new THREE.MeshStandardMaterial({map: carpetTexture, roughness: 1.0});
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const ceilGeo = new THREE.PlaneGeometry(250, 250); // Expanded physical grid
        const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTexture, roughness: 0.9});
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 3;
        this.scene.add(ceiling);

        // Boot Generation
        this.generate();

        // Bind UI
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.initAudio();
            this.generate();
        });
        document.getElementById('fogSlider').addEventListener('input', (e) => {
            this.scene.fog.density = e.target.value / 100;
        });
        document.getElementById('captureBtn').addEventListener('click', () => this.captureAsset());

        document.addEventListener('click', () => this.initAudio(), {once: true});
        document.addEventListener('keydown', () => this.initAudio(), {once: true});
    }

    generate() {
        // WEBGL AUTOPHAGY: Eradicate previous geometries and materials to prevent memory leak
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

        const seedString = document.getElementById('seedInput').value || "ASYMPTOTIC";

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

        const gridSize = 35; // Expanded manifold
        const cellSize = 4;
        const MAX_LIGHTS = 48;
        let lightsAdded = 0;

        const wallGeo = new THREE.BoxGeometry(cellSize, 3, cellSize);
        const wallMat = new THREE.MeshStandardMaterial({
            map: this.wallTexture,
            color: 0xffffff,
            roughness: 0.8
        });
        const panelGeo = new THREE.BoxGeometry(1.2, 0.05, 2.4);
        const halfGrid = Math.floor(gridSize / 2);

        const cx = Math.sin(baseSeed) * 0.8;
        const cy = Math.cos(baseSeed * 0.5) * 0.8;

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
                    if (random() > 0.88) {
                        // Procedural Archway (Holes in walls) - Height reduced to prevent intersection with the roof block
                        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, cellSize), this.structMat);
                        p1.position.set(x * cellSize - 1.6, 1.2, z * cellSize);
                        p1.castShadow = p1.receiveShadow = true;
                        this.scene.add(p1); this.walls.push(p1); p1.updateMatrixWorld();
                        this.wallBoxes.push(new THREE.Box3().setFromObject(p1));

                        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, cellSize), this.structMat);
                        p2.position.set(x * cellSize + 1.6, 1.2, z * cellSize);
                        p2.castShadow = p2.receiveShadow = true;
                        this.scene.add(p2); this.walls.push(p2); p2.updateMatrixWorld();
                        this.wallBoxes.push(new THREE.Box3().setFromObject(p2));

                        const top = new THREE.Mesh(new THREE.BoxGeometry(cellSize, 0.6, cellSize), this.structMat);
                        top.position.set(x * cellSize, 2.7, z * cellSize);
                        top.castShadow = top.receiveShadow = true;
                        this.scene.add(top); this.walls.push(top); top.updateMatrixWorld();
                        this.wallBoxes.push(new THREE.Box3().setFromObject(top));
                    } else {
                        // Standard Wall
                        const wall = new THREE.Mesh(wallGeo, wallMat);
                        wall.position.set(x * cellSize, 1.5, z * cellSize);
                        wall.castShadow = wall.receiveShadow = true;
                        this.scene.add(wall);
                        this.walls.push(wall);
                        wall.updateMatrixWorld();
                        this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
                    }
                } else if (random() > 0.985) { // Extremely rare (1.5% chance)
                    // Procedural Stairs - Authentic directional staircase
                    const stepCount = 5;
                    const stepDepth = cellSize / stepCount;
                    const stepHeight = 0.35;
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
                    const isBroken = random() > 0.95;
                    let panelMat;

                    if (isBroken) {
                        panelMat = new THREE.MeshStandardMaterial({
                            color: 0x333322,
                            emissive: 0x000000,
                            emissiveIntensity: .05,
                            roughness: 0.8
                        });
                        const panel = new THREE.Mesh(panelGeo, panelMat);
                        panel.position.set(x * cellSize, 2.98, z * cellSize);
                        if (random() > 0.5) panel.rotation.y = Math.PI / 2;
                        this.scene.add(panel);
                        this.walls.push(panel);
                    } else if (this.lights.length < MAX_LIGHTS) {
                        panelMat = new THREE.MeshStandardMaterial({
                            color: 0xffffe0,
                            emissive: 0xffffe0,
                            emissiveIntensity: 0.4,
                            roughness: 0.3,
                            metalness: 0.1
                        });
                        const panel = new THREE.Mesh(panelGeo, panelMat);
                        panel.position.set(x * cellSize, 2.98, z * cellSize);
                        if (random() > 0.5) panel.rotation.y = Math.PI / 2;
                        this.scene.add(panel);
                        this.walls.push(panel);

                        const light = new THREE.PointLight(0xfff5c2, 0.6, 20);
                        light.position.set(x * cellSize, 2.8, z * cellSize);
                        light.castShadow = false;
                        light.userData = {
                            flickerOffset: random() * 500,
                            material: panelMat,
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

        this.lights.forEach(light => {
            // Distance calculation for acoustic dynamics
            const dist = this.camera.position.distanceTo(light.position);
            if (dist < 20) {
                ambientLightLevel += (20 - dist) / 20;
            }

            if (light.userData.isFaulty) {
                // 5% chance every frame to pick a completely new random target intensity
                if (Math.random() < 0.05) {
                    light.userData.targetIntensity = Math.random() < 0.4 ? 0.05 : light.userData.baseIntensity + (Math.random() * 0.4);
                }

                // Smoothly lerp towards the target to create sporadic snaps and stutters
                light.intensity += (light.userData.targetIntensity - light.intensity) * 0.4;
                light.userData.material.emissiveIntensity = Math.max(0.05, light.intensity * 0.6);
            } else {
                light.intensity = light.userData.baseIntensity + (Math.sin(time * 120 + light.userData.flickerOffset) * 0.02);
                light.userData.material.emissiveIntensity = 0.4;
            }
        });

        // The psychological audio loop: The darker it is, the louder it sings
        if (this.audioInitialized && this.mainGain) {
            const darkness = Math.max(0, 1.0 - (ambientLightLevel * 0.25));
            this.mainGain.gain.setTargetAtTime(0.01 + (darkness * 0.08), this.audioCtx.currentTime, 0.5);
            this.whineGain.gain.setTargetAtTime(0.001 + (darkness * 0.008), this.audioCtx.currentTime, 0.5);
        }
    }
}

// ==========================================
// SYSTEM BOOTSTRAP
// ==========================================
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