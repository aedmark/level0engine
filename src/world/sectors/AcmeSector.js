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

export const AcmeSector = (env, ctx) => {
    const { random, chunkGroup, hash } = ctx;
    if (!env.warehouseMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx2d = canvas.getContext('2d');
        ctx2d.fillStyle = '#3a3a3a'; // Concrete/Steel grey
        ctx2d.fillRect(0, 0, 512, 512);
        for(let i=0; i<1500; i++) {
            ctx2d.fillStyle = Math.random() > 0.5 ? '#2a2a2a' : '#4a4a4a';
            ctx2d.fillRect(Math.random()*512, Math.random()*512, 3, 3);
        }
        ctx2d.fillStyle = '#111111';
        for(let i=0; i<512; i+=64) {
            ctx2d.fillRect(0, i, 512, 3); // Corrugated panels
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        env.warehouseMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.2 });
    }
    
    if (!env.acmeMat) env.acmeMat = new THREE.MeshStandardMaterial({ map: createAcmeTexture(), roughness: 0.9 });

    return {
        id: "ACME",
        foundationMat: null,
        ceilingMat: null,
        build: (x, z, localX, localZ, maze) => {
            // Maintain perimeter bounds and sector doors, now using warehouse metal
            if (ctx.buildPerimeter(x, z, localX, localZ, env.warehouseMat, "ACME")) return;
            
            const isPath = maze && !maze[localX][localZ];
            const gx = x * env.cellSize, gz = z * env.cellSize;
            
            if (isPath) {
                // ACME crates serving as the platforms
                const crateSize = env.cellSize * 0.75; 
                // Slight height variation for jumping dynamics
                const topY = (random() * 1.5) - 0.75; 
                
                const crateGeo = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
                const crateMesh = new THREE.Mesh(crateGeo, env.acmeMat);
                crateMesh.position.set(gx, topY - (crateSize / 2), gz);
                crateMesh.castShadow = true;
                crateMesh.receiveShadow = true;
                chunkGroup.add(crateMesh);

                const box = new THREE.Box3();
                box.min.set(gx - crateSize / 2, topY - crateSize, gz - crateSize / 2);
                box.max.set(gx + crateSize / 2, topY, gz + crateSize / 2);
                box.chunkHash = hash;
                env.spatialGrid.insert(box);

                // Add small decorative obstacle crates on top of the platform
                if (random() > 0.6) {
                    const stackHeight = Math.floor(random() * 3) + 1;
                    for (let s = 1; s <= stackHeight; s++) {
                        const smSize = crateSize * 0.4;
                        const smGeo = new THREE.BoxGeometry(smSize, smSize, smSize);
                        const smMesh = new THREE.Mesh(smGeo, env.acmeMat);
                        const ox = (random() - 0.5) * (crateSize - smSize);
                        const oz = (random() - 0.5) * (crateSize - smSize);
                        smMesh.position.set(gx + ox, topY + (smSize / 2) + (s - 1) * smSize, gz + oz);
                        smMesh.rotation.y = random() * Math.PI;
                        smMesh.castShadow = true;
                        smMesh.receiveShadow = true;
                        chunkGroup.add(smMesh);

                        const smBox = new THREE.Box3().setFromObject(smMesh);
                        smBox.chunkHash = hash;
                        env.spatialGrid.insert(smBox);
                    }
                }
            } else {
                // Pure void abyss
                const voidBox = new THREE.Box3();
                voidBox.min.set(gx - env.cellSize / 2, -100, gz - env.cellSize / 2);
                voidBox.max.set(gx + env.cellSize / 2, 3, gz + env.cellSize / 2);
                voidBox.isVoid = true;
                voidBox.chunkHash = hash;
                env.spatialGrid.insert(voidBox);

                // Criss-crossing industrial beams far down in the abyss
                if (random() > 0.8) {
                    const beamGeo = new THREE.BoxGeometry(env.cellSize * 4, 1.0, 1.0);
                    const beamMat = new THREE.MeshStandardMaterial({color: 0x222222, metalness: 0.8, roughness: 0.4});
                    const beam = new THREE.Mesh(beamGeo, beamMat);
                    beam.position.set(gx, -15 - random() * 30, gz);
                    beam.rotation.y = random() > 0.5 ? 0 : Math.PI / 2;
                    beam.receiveShadow = true;
                    chunkGroup.add(beam);
                }
            }
        }
    };
};
