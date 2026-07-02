// ==========================================
// MODULE 1: CORE RENDER ENGINE
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
        window.addEventListener('resize', () => this.resize(), false);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    get delta() {
        return this.clock.getDelta();
    }

    get time() {
        return this.clock.getElapsedTime();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
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

        // X Collision
        let hitX = false;
        let boxX = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x + moveDelta.x - this.playerRadius, 0, this.camera.position.z - this.playerRadius),
            new THREE.Vector3(this.camera.position.x + moveDelta.x + this.playerRadius, 3, this.camera.position.z + this.playerRadius)
        );
        for (let box of wallBoxes) {
            if (boxX.intersectsBox(box)) {
                hitX = true;
                break;
            }
        }
        if (!hitX) this.camera.position.x += moveDelta.x;

        // Z Collision
        let hitZ = false;
        let boxZ = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - this.playerRadius, 0, this.camera.position.z + moveDelta.z - this.playerRadius),
            new THREE.Vector3(this.camera.position.x + this.playerRadius, 3, this.camera.position.z + moveDelta.z + this.playerRadius)
        );
        for (let box of wallBoxes) {
            if (boxZ.intersectsBox(box)) {
                hitZ = true;
                break;
            }
        }
        if (!hitZ) this.camera.position.z += moveDelta.z;

        this.camera.position.y = 1.6;
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
        const whineGain = this.audioCtx.createGain();
        whineGain.gain.value = 0.005;
        osc3.connect(whineGain);

        const mainGain = this.audioCtx.createGain();
        mainGain.gain.value = 0.12;

        const lfo = this.audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 0.04;
        lfo.connect(lfoGain);
        lfoGain.connect(mainGain.gain);

        osc1.connect(mainGain);
        filter.connect(mainGain);
        whineGain.connect(mainGain);
        mainGain.connect(this.audioCtx.destination);

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
        ceilingTexture.repeat.set(20, 20);

        // Install Environment Geometry
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({map: carpetTexture, roughness: 1.0});
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const ceilGeo = new THREE.PlaneGeometry(100, 100);
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

        const gridSize = 25;
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
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(x * cellSize, 1.5, z * cellSize);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.walls.push(wall);
                    wall.updateMatrixWorld();
                    this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
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
                            emissiveIntensity: 0.8,
                            roughness: 0.3,
                            metalness: 0.1
                        });
                        const panel = new THREE.Mesh(panelGeo, panelMat);
                        panel.position.set(x * cellSize, 2.98, z * cellSize);
                        if (random() > 0.5) panel.rotation.y = Math.PI / 2;
                        this.scene.add(panel);
                        this.walls.push(panel);

                        const light = new THREE.PointLight(0xfff5c2, 1.0, 20);
                        light.position.set(x * cellSize, 2.8, z * cellSize);
                        light.castShadow = false;
                        light.userData = {
                            flickerOffset: random() * 500,
                            material: panelMat,
                            isFaulty: random() > 0.75,
                            baseIntensity: 1.0
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
        flash.style.opacity = '1';
        setTimeout(() => {
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
        this.lights.forEach(light => {
            if (light.userData.isFaulty) {
                let noise = Math.sin(time * 15 + light.userData.flickerOffset) +
                    Math.sin(time * 43 + light.userData.flickerOffset) * 0.5 +
                    Math.sin(time * 3.1 + light.userData.flickerOffset) * 2;
                if (noise < -1.0) {
                    light.intensity = 0.1;
                    light.userData.material.emissiveIntensity = 0.05;
                } else {
                    light.intensity = light.userData.baseIntensity + (Math.sin(time * 120) * 0.05);
                    light.userData.material.emissiveIntensity = 0.8;
                }
            } else {
                light.intensity = light.userData.baseIntensity + (Math.sin(time * 120) * 0.02);
                light.userData.material.emissiveIntensity = 0.8;
            }
        });
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