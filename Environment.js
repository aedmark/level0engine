//Environment.js
// LEVEL 0 ENVIRONMENT & MEMORY MANAGER

class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    insert(box) {
        const startX = Math.floor(box.min.x / this.cellSize);
        const startZ = Math.floor(box.min.z / this.cellSize);
        const endX = Math.floor(box.max.x / this.cellSize);
        const endZ = Math.floor(box.max.z / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                const key = `${x},${z}`;
                if (!this.cells.has(key)) this.cells.set(key, new Set());
                this.cells.get(key).add(box);
            }
        }
    }

    removeByChunk(chunkHash) {
        for (const [key, cell] of this.cells.entries()) {
            for (const box of cell) {
                if (box.chunkHash === chunkHash) cell.delete(box);
            }
            if (cell.size === 0) this.cells.delete(key);
        }
    }

    getNearby(x, z, radius) {
        const startX = Math.floor((x - radius) / this.cellSize);
        const startZ = Math.floor((z - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const endZ = Math.floor((z + radius) / this.cellSize);

        const results = new Set();
        for (let cx = startX; cx <= endX; cx++) {
            for (let cz = startZ; cz <= endZ; cz++) {
                const cell = this.cells.get(`${cx},${cz}`);
                if (cell) cell.forEach(box => results.add(box));
            }
        }
        return Array.from(results);
    }
}

export default class Environment {
    constructor(engine, player) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        this.player = player;
        this.walls = [];
        this.lightPool = [];
        this.fixtureData = [];
        this.maxActiveLights = 20;
        this.spatialGrid = new SpatialHashGrid(4);
        this.wallBoxes = [];
        this.chunkSize = 16;
        this.renderDistance = 1; // 3x3 active chunk grid
        this.activeChunks = new Map();
        this.currentChunkCoords = { x: null, z: null };
        this.interactiveDoors = [];
        this.audioCtx = null;
        this.audioInitialized = false;
    }

    updateChunks(playerPos) {
        const chunkX = Math.floor(playerPos.x / (this.chunkSize * 4)); // cellSize is 4
        const chunkZ = Math.floor(playerPos.z / (this.chunkSize * 4));

        if (this.currentChunkCoords.x === chunkX && this.currentChunkCoords.z === chunkZ) return;
        this.currentChunkCoords.x = chunkX;
        this.currentChunkCoords.z = chunkZ;

        // Snap the infinite treadmill planes to the new chunk center
        if (this.floor && this.ceiling) {
            const shiftX = chunkX * (this.chunkSize * 4);
            const shiftZ = chunkZ * (this.chunkSize * 4);
            this.floor.position.set(shiftX, 0, shiftZ);
            this.ceiling.position.set(shiftX, 3, shiftZ);
        }

        const chunksToKeep = new Set();

        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const targetX = chunkX + x;
                const targetZ = chunkZ + z;
                const hash = `${targetX},${targetZ}`;
                chunksToKeep.add(hash);

                if (!this.activeChunks.has(hash)) {
                    this.buildChunk(targetX, targetZ, hash);
                }
            }
        }

        for (const [hash, chunkGroup] of this.activeChunks.entries()) {
            if (!chunksToKeep.has(hash)) {
                this.scene.remove(chunkGroup);
                chunkGroup.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                });
                this.activeChunks.delete(hash);

                // Flush stale references from global raycasting/tracking arrays
                this.walls = this.walls.filter(w => w.userData.chunkHash !== hash);
                this.fixtureData = this.fixtureData.filter(f => f.chunkHash !== hash);
                this.spatialGrid.removeByChunk(hash);
                this.interactiveDoors = this.interactiveDoors.filter(d => d.userData.chunkHash !== hash);
            }
        }
    }

    updateInteractives(playerPos, delta) {
        this.interactiveDoors.forEach(door => {
            const dist = playerPos.distanceTo(door.position);
            // The Proximity Threshold: Doors slide open when within 3.5 units
            const isOpen = dist < 3.5;
            const targetRot = isOpen ? door.userData.openRot : door.userData.closedRot;

            // Kinematic Lerp
            door.userData.currentRot += (targetRot - door.userData.currentRot) * 8.0 * delta;
            door.rotation.y = door.userData.currentRot;

            // Dynamic AABB Collision Update
            if (door.userData.box) {
                door.updateMatrixWorld();
                door.userData.box.setFromObject(door);
                // Squash the collision volume if fully open to allow passage
                if (isOpen && Math.abs(door.userData.currentRot - door.userData.openRot) < 0.1) {
                    door.userData.box.makeEmpty();
                }
            }
        });
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
        // 5. Procedural Wood & Door Textures
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 256;
        woodCanvas.height = 512;
        const woodCtx = woodCanvas.getContext('2d');
        woodCtx.fillStyle = '#4a3219';
        woodCtx.fillRect(0, 0, 256, 512);
        // Organic wood grain via segmented alpha strokes and curves.
        woodCtx.lineWidth = 1.5;
        for (let i = 0; i < 800; i++) {
            woodCtx.strokeStyle = Math.random() > 0.5 ? `rgba(0,0,0,${Math.random() * 0.15})` : `rgba(255,255,255,${Math.random() * 0.05})`;
            woodCtx.beginPath();
            let x = Math.random() * 256;
            let y = Math.random() * 512;
            let length = Math.random() * 100 + 20;
            woodCtx.moveTo(x, y);
            // Slight Bezier curve to simulate natural knotting and fiber flow
            woodCtx.bezierCurveTo(x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 4 - 2), y + length);
            woodCtx.stroke();
        }
        const woodTexture = new THREE.CanvasTexture(woodCanvas);
        this.woodMat = new THREE.MeshStandardMaterial({map: woodTexture, roughness: 0.9});

        // Copy raw wood grain to a new canvas for the Door
        const doorCanvas = document.createElement('canvas');
        doorCanvas.width = 256;
        doorCanvas.height = 512;
        const doorCtx = doorCanvas.getContext('2d');
        doorCtx.drawImage(woodCanvas, 0, 0);

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

        // 8. Institutional Fabric Texture
        const fabricCanvas = document.createElement('canvas');
        fabricCanvas.width = 256;
        fabricCanvas.height = 256;
        const fCtx = fabricCanvas.getContext('2d');
        fCtx.fillStyle = '#4c594f'; // Uncanny waiting-room green
        fCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 15000; i++) {
            fCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)';
            fCtx.fillRect(Math.random() * 256, Math.random() * 256, 1, 4); // Vertical threads
            fCtx.fillRect(Math.random() * 256, Math.random() * 256, 4, 1); // Horizontal threads
        }
        const fabricTexture = new THREE.CanvasTexture(fabricCanvas);
        fabricTexture.wrapS = THREE.RepeatWrapping;
        fabricTexture.wrapT = THREE.RepeatWrapping;
        fabricTexture.repeat.set(2, 2);
        this.fabricMat = new THREE.MeshStandardMaterial({map: fabricTexture, roughness: 0.95});

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
        // Expand planes to 8000x8000 to completely bypass the texture clipping boundary.
        carpetTexture.repeat.set(2000, 2000);
        const floorGeo = new THREE.PlaneGeometry(8000, 8000);
        const floorMat = new THREE.MeshStandardMaterial({map: carpetTexture, roughness: 1.0});
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        ceilingTexture.repeat.set(8000, 8000);
        const ceilGeo = new THREE.PlaneGeometry(8000, 8000);
        const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTexture, roughness: 0.9});
        this.ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        this.ceiling.rotation.x = Math.PI / 2;
        this.ceiling.position.y = 3;
        this.scene.add(this.ceiling);
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

        // Allocate the fixed hardware light pool.
        for (let i = 0; i < this.maxActiveLights; i++) {
            const light = new THREE.PointLight(0xfff5c2, 0, 20);
            if (i < 6) {
                light.castShadow = true;
                light.shadow.mapSize.width = 256;
                light.shadow.mapSize.height = 256;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 20;
                light.shadow.bias = -0.005;
            }
            this.scene.add(light);
            this.lightPool.push(light);
        }

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
        this.activeChunks.forEach((chunkGroup) => {
            this.scene.remove(chunkGroup);
            chunkGroup.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        });
        this.activeChunks.clear();
        this.walls = [];
        this.fixtureData = [];
        this.spatialGrid.cells.clear();
        this.currentChunkCoords = { x: null, z: null };

        this.camera.position.set(0, 1.6, 0);
        this.player.velocity.set(0, 0, 0);

        const seedString = document.getElementById('seedInput').value || "ASYNC RESEARCH INSTITUTE";
        this.baseSeed = 0;
        for (let i = 0; i < seedString.length; i++) {
            this.baseSeed = ((this.baseSeed << 5) - this.baseSeed) + seedString.charCodeAt(i);
            this.baseSeed |= 0;
        }

        this.cellSize = 4;

        // Pre-cache massive geometric loads once
        if (!this.sharedWallGeo) {
            this.sharedWallGeo = new THREE.BoxGeometry(this.cellSize, 3, this.cellSize);
            this.sharedWallMat = new THREE.MeshStandardMaterial({ map: this.wallTexture, color: 0xffffff, roughness: 0.8 });
            this.sharedPanelGeo = new THREE.BoxGeometry(0.98, 0.05, 1.98);

            // Furniture Primitives
            this.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
            this.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
            this.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            this.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
            this.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
        }
    }

    buildChunk(chunkX, chunkZ, hash) {
        const chunkGroup = new THREE.Group();
        this.scene.add(chunkGroup);
        this.activeChunks.set(hash, chunkGroup);

        let prngSeed = this.baseSeed + (chunkX * 104729) + (chunkZ * 1299827);
        const random = () => {
            let x = Math.sin(prngSeed++) * 10000;
            return x - Math.floor(x);
        };

        const cx = Math.sin(this.baseSeed) * 0.8;
        const cy = Math.cos(this.baseSeed * 0.5) * 0.8;

        const buildWall = (w, d, mat) => {
            const geo = new THREE.BoxGeometry(w, 3.0, d);
            const uv = geo.attributes.uv;
            for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (d / this.cellSize));
            for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (w / this.cellSize));
            return new THREE.Mesh(geo, mat);
        };

        const addGeometry = (mesh) => {
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.userData.chunkHash = hash;
            chunkGroup.add(mesh);
            this.walls.push(mesh);
            mesh.updateMatrixWorld();
            const box = new THREE.Box3().setFromObject(mesh);
            box.chunkHash = hash;
            this.spatialGrid.insert(box);
        };

        const addFurniture = (group) => {
            group.userData.chunkHash = hash;
            chunkGroup.add(group);
            group.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(group);
            box.chunkHash = hash;
            this.spatialGrid.insert(box); // Enable player collision

            // Propagate shadow casting and audio raycast occlusion to child meshes
            group.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.chunkHash = hash;
                    this.walls.push(child);
                }
            });
        };

        const buildChair = (x, y, z, rotY) => {
            const group = new THREE.Group();
            const seat = new THREE.Mesh(this.cushionGeo, this.fabricMat);
            seat.position.set(0, 0.4, 0);
            group.add(seat);
            const back = new THREE.Mesh(this.backrestGeo, this.fabricMat);
            back.position.set(0, 0.8, -0.3);
            group.add(back);
            const l1 = new THREE.Mesh(this.legGeo, this.structMat); l1.position.set(0.3, 0.2, 0.3); group.add(l1);
            const l2 = new THREE.Mesh(this.legGeo, this.structMat); l2.position.set(-0.3, 0.2, 0.3); group.add(l2);
            const l3 = new THREE.Mesh(this.legGeo, this.structMat); l3.position.set(0.3, 0.2, -0.3); group.add(l3);
            const l4 = new THREE.Mesh(this.legGeo, this.structMat); l4.position.set(-0.3, 0.2, -0.3); group.add(l4);
            group.position.set(x, y, z);
            group.rotation.y = rotY;
            return group;
        };

        const buildTable = (x, y, z) => {
            const group = new THREE.Group();
            const top = new THREE.Mesh(this.tableTopGeo, this.woodMat);
            top.position.set(0, 0.8, 0);
            group.add(top);
            const base = new THREE.Mesh(this.tableBaseGeo, this.structMat);
            base.position.set(0, 0.4, 0);
            group.add(base);
            group.position.set(x, y, z);
            return group;
        };

        const structuralMatrix = [
            {
                prob: 0.95, build: (x, z) => {
                    const pillar = buildWall(0.5 + (random() * 2.0), 0.5 + (random() * 2.0), this.sharedWallMat);
                    pillar.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(pillar);
                }
            },
            {
                prob: 0.90, build: (x, z) => {
                    const pW = 0.8, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.82, build: (x, z) => {
                    // The Dynamic Doorway & Jamb
                    const pW = 1.2, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);

                    // The Door Jamb (Structural Frame)
                    // Z-Fighting resolved by dropping the frame 0.05 units below the header,
                    // and increasing depth to 0.32 so the trim sits proud of the drywall.
                    const frameMat = this.structMat;
                    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.65, 0.32), frameMat);
                    jambL.position.set(x * this.cellSize - 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambL);
                    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.65, 0.32), frameMat);
                    jambR.position.set(x * this.cellSize + 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambR);
                    const jambT = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.32), frameMat);
                    jambT.position.set(x * this.cellSize, 2.70, z * this.cellSize + 1.85);
                    addGeometry(jambT);

                    // The Door (Resized to fit the 1.4 inner gap perfectly)
                    const doorGeo = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                    doorGeo.translate(0.7, 0, 0); // Pivot hinge
                    const door = new THREE.Mesh(doorGeo, this.doorMat);
                    door.position.set(x * this.cellSize - 0.7, 1.325, z * this.cellSize + 1.85);
                    door.castShadow = door.receiveShadow = true;

                    // Inject Physics State
                    door.userData = {
                        chunkHash: hash,
                        closedRot: 0,
                        openRot: (random() > 0.5 ? 1 : -1) * (Math.PI / 1.8),
                        currentRot: 0
                    };

                    chunkGroup.add(door);
                    this.interactiveDoors.push(door);
                    this.walls.push(door);
                    door.updateMatrixWorld();

                    const dBox = new THREE.Box3().setFromObject(door);
                    dBox.chunkHash = hash;
                    door.userData.box = dBox;
                    this.spatialGrid.insert(dBox);
                }
            },
            {
                prob: 0.74, build: (x, z) => {
                    // Corridor Squeeze
                    const dir = Math.floor(random() * 2), offset = (this.cellSize / 2) - 0.25;
                    const w1 = dir === 0 ? 0.5 : this.cellSize, d1 = dir === 0 ? this.cellSize : 0.5;
                    const gapW = dir === 0 ? this.cellSize - 1.0 : this.cellSize, gapD = dir === 0 ? this.cellSize : this.cellSize - 1.0;
                    const p1 = buildWall(w1, d1, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - (dir === 0 ? offset : 0), 1.5, z * this.cellSize - (dir === 1 ? offset : 0));
                    addGeometry(p1);
                    const p2 = buildWall(w1, d1, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + (dir === 0 ? offset : 0), 1.5, z * this.cellSize + (dir === 1 ? offset : 0));
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gapW, 0.3, gapD), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.65, build: (x, z) => {
                    // Structural L-Corner
                    const w1 = buildWall(this.cellSize, 0.5, this.sharedWallMat);
                    w1.position.set(x * this.cellSize, 1.5, z * this.cellSize - (this.cellSize/2) + 0.25);
                    addGeometry(w1);
                    const w2 = buildWall(0.5, this.cellSize, this.sharedWallMat);
                    w2.position.set(x * this.cellSize - (this.cellSize/2) + 0.25, 1.5, z * this.cellSize);
                    addGeometry(w2);

                    // Unnerving End Table
                    if (random() > 0.6) {
                        const table = buildTable(x * this.cellSize + 0.5, 0, z * this.cellSize + 0.5);
                        addFurniture(table);
                    }
                }
            },
            {
                prob: 0.55, build: (x, z) => {
                    // Alcove / Recess
                    const back = buildWall(this.cellSize, 0.5, this.sharedWallMat);
                    back.position.set(x * this.cellSize, 1.5, z * this.cellSize - (this.cellSize/2) + 0.25);
                    addGeometry(back);
                    const side = buildWall(0.5, this.cellSize / 2, this.sharedWallMat);
                    side.position.set(x * this.cellSize - (this.cellSize/2) + 0.25, 1.5, z * this.cellSize - (this.cellSize/4));
                    addGeometry(side);

                    // Lonely Waiting-Room Chair
                    if (random() > 0.5) {
                        const rot = random() > 0.5 ? -Math.PI / 4 : Math.PI / 4;
                        const chair = buildChair(x * this.cellSize + 0.5, 0, z * this.cellSize - 0.5, rot);
                        addFurniture(chair);
                    }
                }
            },
            {
                prob: 0.40, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
                    const ventDir = Math.floor(random() * 2);
                    const ventGeo = new THREE.BoxGeometry(ventDir === 0 ? 1.2 : this.cellSize + 0.1, 0.4, ventDir === 0 ? this.cellSize + 0.1 : 1.2);
                    const vent = new THREE.Mesh(ventGeo, this.ventMat);
                    vent.position.set(x * this.cellSize, random() > 0.5 ? 2.6 : 0.4, z * this.cellSize);
                    addGeometry(vent);
                }
            },
            {
                prob: 0.00, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
                }
            }
        ];

        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;

        for (let x = startX; x < startX + this.chunkSize; x++) {
            for (let z = startZ; z < startZ + this.chunkSize; z++) {
                if (Math.abs(x) < 2 && Math.abs(z) < 2) continue; // Safe spawn area
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
                    const structure = structuralMatrix.find(s => structRoll >= s.prob);
                    if (structure) structure.build(x, z);
                } else if (random() > 0.999) {
                    const stepCount = 10;
                    const stepDepth = this.cellSize / stepCount;
                    const stepHeight = 3.0 / stepCount;
                    const dir = Math.floor(random() * 4);
                    for (let s = 0; s < stepCount; s++) {
                        const h = (s + 1) * stepHeight;
                        const wX = (dir % 2 === 0) ? this.cellSize : stepDepth;
                        const wZ = (dir % 2 === 0) ? stepDepth : this.cellSize;
                        const step = new THREE.Mesh(new THREE.BoxGeometry(wX, h, wZ), this.structMat);
                        let offset = (this.cellSize / 2) - (stepDepth / 2) - (s * stepDepth);
                        if (dir === 2 || dir === 3) offset = -offset;
                        const posX = x * this.cellSize + ((dir % 2 !== 0) ? offset : 0);
                        const posZ = z * this.cellSize + ((dir % 2 === 0) ? offset : 0);
                        step.position.set(posX, h / 2, posZ);
                        addGeometry(step);
                    }
                } else if (random() > 0.85) {
                    const isBroken = random() > 0.90;
                    const isRotated = random() > 0.5;
                    const offsetX = isRotated ? 0.0 : 0.5;
                    const offsetZ = isRotated ? 0.5 : 0.0;
                    const posX = (x * this.cellSize) + offsetX;
                    const posZ = (z * this.cellSize) + offsetZ;
                    const activeMat = isBroken ? this.baseBrokenLightMat.clone() : this.baseLightMat.clone();
                    const matArray = [
                        this.baseHousingMat, this.baseHousingMat, this.baseHousingMat,
                        activeMat, this.baseHousingMat, this.baseHousingMat
                    ];
                    const panel = new THREE.Mesh(this.sharedPanelGeo, matArray);
                    panel.position.set(posX, 2.98, posZ);
                    if (isRotated) panel.rotation.y = Math.PI / 2;

                    panel.userData.chunkHash = hash;
                    chunkGroup.add(panel);
                    this.walls.push(panel);

                    if (!isBroken && random() > 0.95) {
                        // Store the pure mathematical potential of a light, not the hardware.
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(posX, 2.8, posZ),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.75,
                            baseIntensity: 0.6,
                            targetIntensity: 0.6,
                            currentIntensity: 0.6
                        });
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

        if (!this.audioRaycaster) {
            this.audioRaycaster = new THREE.Raycaster();
            this.audioDirection = new THREE.Vector3();
        }

        // Calculate the spatial distance of all theoretical fixtures
        this.fixtureData.forEach(fixture => {
            fixture.distSq = cameraPos.distanceToSquared(fixture.position);
            // HYSTERESIS: If it held a shadow map last frame, pull it artificially closer to prevent thrashing
            if (fixture.hasShadow) fixture.distSq -= 40.0;
        });

        // Sort ascending by biased distance
        this.fixtureData.sort((a, b) => a.distSq - b.distSq);

        // Strip the bias back out so the rendering math remains physically accurate
        this.fixtureData.forEach(fixture => {
            if (fixture.hasShadow) fixture.distSq += 40.0;
            fixture.hasShadow = false; // Reset for this frame's allocation
        });

        let nearestFixture = null;
        let minLightDist = Infinity;

        // Snap the hardware light pool to the nearest structural fixtures
        for (let i = 0; i < this.maxActiveLights; i++) {
            const light = this.lightPool[i];
            const fixture = this.fixtureData[i];

            if (fixture && fixture.distSq < 400) {
                if (i < 6) fixture.hasShadow = true; // Tag for next frame's hysteresis

                // Teleport the light
                light.position.copy(fixture.position);
                const dist = Math.sqrt(fixture.distSq);
                ambientLightLevel += (20 - dist) / 20;

                if (dist < minLightDist) {
                    minLightDist = dist;
                    nearestFixture = fixture;
                }

                // THE FADE ENVELOPE: Smoothly scale hardware intensity from 0 to 1 over the outer 8 units
                const fadeEnvelope = Math.max(0, Math.min(1, (20 - dist) / 8.0));

                if (fixture.isFaulty) {
                    if (Math.random() < 0.02) {
                        fixture.targetIntensity = Math.random() < 0.4 ? 0.05 : fixture.baseIntensity + (Math.random() * 0.4);
                    }
                    fixture.currentIntensity += (fixture.targetIntensity - fixture.currentIntensity) * 0.4;
                    // Apply fade to hardware light, but keep the physical panel glowing at its true simulated intensity
                    light.intensity = fixture.currentIntensity * fadeEnvelope;
                    fixture.material.emissiveIntensity = Math.max(0.05, fixture.currentIntensity * 0.6);
                } else {
                    light.intensity = (fixture.baseIntensity + (Math.sin(time * 120 + fixture.flickerOffset) * 0.02)) * fadeEnvelope;
                    fixture.material.emissiveIntensity = 0.4; // Panel remains visually ON
                }
            } else {
                // Shut off idle pool hardware to save GPU cycles
                light.intensity = 0;
            }
        }

        // The Structural Raycast. Find if matter exists between the player and the sound.
        let isOccluded = false;
        if (nearestFixture && minLightDist > 1.0) {
            this.audioDirection.subVectors(nearestFixture.position, cameraPos).normalize();
            this.audioRaycaster.set(cameraPos, this.audioDirection);
            this.audioRaycaster.far = minLightDist;
            const hits = this.audioRaycaster.intersectObjects(this.walls);
            if (hits.length > 0) isOccluded = true;
        }

        if (this.audioInitialized && this.mainGain) {
            const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
            this.mainGain.gain.setTargetAtTime(0.005 + (proximity * 0.02), this.audioCtx.currentTime, 0.5);
            const whineTarget = isOccluded ? 0.0001 : 0.0005 + (proximity * 0.003);
            this.whineGain.gain.setTargetAtTime(whineTarget, this.audioCtx.currentTime, 0.2);

            if (this.kineticFilter) {
                const speed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
                const exertionPulse = Math.sin(time * 8.0) * (speed * 5);
                const baseFreq = isOccluded ? 120 : 250;
                const speedScale = isOccluded ? 2 : 8;
                const targetFreq = Math.max(100, baseFreq + (speed * speedScale) + exertionPulse);
                const timeConstant = isOccluded ? 0.2 : 3.0;
                this.kineticFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, timeConstant);
            }
        }

        if (this.dustCloud) {
            this.dustCloud.position.copy(cameraPos);
            this.dustCloud.rotation.y = time * 0.05;
            this.dustCloud.rotation.z = time * 0.02;
        }

        if (this.baseFogDensity !== undefined) {
            const fogBreath = Math.sin(time * 0.05) * (this.baseFogDensity * 0.3);
            this.scene.fog.density = this.baseFogDensity + fogBreath;
        }
    }
}