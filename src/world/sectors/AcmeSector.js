import {placeSectorPaper} from '../NarrativeProps.js';

const createAcmeTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx2d = canvas.getContext('2d');
    ctx2d.fillStyle = '#8B5A2B';
    ctx2d.fillRect(0, 0, 512, 512);
    ctx2d.fillStyle = '#654321';
    for(let i = 0; i < 4; i++) ctx2d.fillRect(0, i * 128, 512, 10);
    ctx2d.fillStyle = '#ff0000';
    ctx2d.font = 'bold 120px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('ACME', 256, 256);
    return new THREE.CanvasTexture(canvas);
};

const createTunnelTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx2d = canvas.getContext('2d');
    ctx2d.fillStyle = '#aaaaaa';
    ctx2d.fillRect(0, 0, 512, 512);
    ctx2d.fillStyle = '#000000';
    ctx2d.beginPath();
    ctx2d.arc(256, 512, 200, Math.PI, 0);
    ctx2d.fill();
    ctx2d.fillStyle = '#555555';
    ctx2d.beginPath();
    ctx2d.moveTo(256, 312);
    ctx2d.lineTo(156, 512);
    ctx2d.lineTo(356, 512);
    ctx2d.fill();
    return new THREE.CanvasTexture(canvas);
};

export const AcmeSector = (env, ctx) => {
    const { random, buildWall, addGeometry, chunkGroup, hash } = ctx;
    if (!env.canyonMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx2d = canvas.getContext('2d');
        ctx2d.fillStyle = '#b34d26'; // Desert orange
        ctx2d.fillRect(0, 0, 512, 512);
        for(let i=0; i<100; i++) {
            ctx2d.fillStyle = Math.random() > 0.5 ? '#8B3A1B' : '#d96c40';
            ctx2d.fillRect(Math.random()*512, Math.random()*512, Math.random()*40, 2);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        env.canyonMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1.0 });
    }
    
    if (!env.acmeMat) env.acmeMat = new THREE.MeshStandardMaterial({ map: createAcmeTexture(), roughness: 0.9 });
    if (!env.tunnelMat) env.tunnelMat = new THREE.MeshStandardMaterial({ map: createTunnelTexture(), roughness: 1.0 });

    return {
        id: "ACME",
        foundationMat: null,
        ceilingMat: null,
        build: (x, z, localX, localZ, maze) => {
            
            const isVoid = !maze || maze[localX][localZ];
            const gx = x * env.cellSize, gz = z * env.cellSize;
            
            if (!isVoid) {
                const floorGeo = new THREE.PlaneGeometry(env.cellSize, env.cellSize);
                const bFloor = new THREE.Mesh(floorGeo, env.canyonMat);
                bFloor.rotation.x = -Math.PI / 2;
                bFloor.position.set(gx, 0, gz);
                addGeometry(bFloor);

                // Add random painted tunnels on standard walls
                if (random() > 0.8) {
                    const tunnel = buildWall(env.cellSize * 0.8, env.cellSize * 0.8, env.tunnelMat, 0.1);
                    tunnel.position.set(gx, 2.0, gz - env.cellSize / 2 + 0.1);
                    addGeometry(tunnel);
                }

            } else {
                const voidBox = new THREE.Box3();
                voidBox.min.set(gx - 2, -100, gz - 2);
                voidBox.max.set(gx + 2, 3, gz + 2);
                voidBox.isVoid = true;
                voidBox.chunkHash = hash;
                env.spatialGrid.insert(voidBox);

                // Canyon pillars
                if (random() > 0.85) {
                    const pw = 4.0 + random() * 4.0;
                    const pillar = buildWall(pw, pw, env.canyonMat, 80.0);
                    pillar.position.set(gx, -20.0, gz);
                    addGeometry(pillar);
                }

                // ACME crates for platforming
                if (random() > 0.6) {
                    const crateSize = 1.2 + random() * 1.5;
                    // Vary height to test vertical pinballing
                    const crateY = -1.0 + random() * 6.0; 
                    
                    const crateGeo = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
                    const crateMesh = new THREE.Mesh(crateGeo, env.acmeMat);
                    crateMesh.position.set(gx, crateY, gz);
                    chunkGroup.add(crateMesh);

                    const box = new THREE.Box3().setFromObject(crateMesh);
                    box.isAcme = true; // Pinball mechanic flag
                    box.chunkHash = hash;
                    env.spatialGrid.insert(box);
                }
            }
        }
    };
};
