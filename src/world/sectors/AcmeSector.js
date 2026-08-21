import {placeSectorPaper} from '../NarrativeProps.js';

export const AcmeSector = (env, ctx) => {
    const { random, chunkGroup, hash } = ctx;
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

    return {
        id: "ACME",
        foundationMat: null,
        ceilingMat: null,
        build: (x, z, localX, localZ, maze) => {
            // Maintain perimeter bounds and sector doors
            if (ctx.buildPerimeter(x, z, localX, localZ, env.canyonMat, "ACME")) return;
            
            const isPath = maze && !maze[localX][localZ];
            const gx = x * env.cellSize, gz = z * env.cellSize;
            
            if (isPath) {
                // Slabs with real thickness connecting the exits
                const slabSize = env.cellSize * 0.75; // Creates a jump gap
                const slabThickness = 1.0;
                
                const slabGeo = new THREE.BoxGeometry(slabSize, slabThickness, slabSize);
                const slabMesh = new THREE.Mesh(slabGeo, env.canyonMat);
                // Position so the top surface is flush with y=0
                slabMesh.position.set(gx, -slabThickness / 2, gz);
                slabMesh.castShadow = true;
                slabMesh.receiveShadow = true;
                chunkGroup.add(slabMesh);

                const box = new THREE.Box3();
                box.min.set(gx - slabSize / 2, -slabThickness, gz - slabSize / 2);
                box.max.set(gx + slabSize / 2, 0, gz + slabSize / 2);
                box.chunkHash = hash;
                env.spatialGrid.insert(box);
            } else {
                // Pure void
                const voidBox = new THREE.Box3();
                voidBox.min.set(gx - env.cellSize / 2, -100, gz - env.cellSize / 2);
                voidBox.max.set(gx + env.cellSize / 2, 3, gz + env.cellSize / 2);
                voidBox.isVoid = true;
                voidBox.chunkHash = hash;
                env.spatialGrid.insert(voidBox);
            }
        }
    };
};
