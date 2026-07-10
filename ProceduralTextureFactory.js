// ProceduralTextureFactory.js
// LEVEL 0 TEXTURE & MATERIAL PIPELINE

export default class ProceduralTextureFactory {
    static generateAssets() {
        const masterNoise = document.createElement('canvas');
        masterNoise.width = 512; masterNoise.height = 512;
        const nCtx = masterNoise.getContext('2d');
        const nImg = nCtx.createImageData(512, 512);
        const nData = nImg.data;
        const nLen = nData.length;
        let seed = 1337;
        for(let i = 0; i < nLen; i += 4) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            if ((seed >>> 24) > 217) {
                const val = (seed & 0x10000) ? 0 : 255;
                nData[i] = nData[i+1] = nData[i+2] = val;
                nData[i+3] = 10 + ((seed >>> 8) % 50);
            }
        }
        nCtx.putImageData(nImg, 0, 0);
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
        wallCtx.globalAlpha = 0.5;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
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
        const headerMat = new THREE.MeshStandardMaterial({map: headerTexture, roughness: 0.8, bumpMap: headerTexture, bumpScale: 0.01});
        wallCtx.fillStyle = '#4a3d24';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#3a2d14';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);
        const wallTexture = new THREE.CanvasTexture(wallCanvas);
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.ClampToEdgeWrapping;
        wallTexture.repeat.set(4, 1);
        const carpetCanvas = document.createElement('canvas');
        carpetCanvas.width = 512;
        carpetCanvas.height = 512;
        const carpetCtx = carpetCanvas.getContext('2d');
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 256;
        noiseCanvas.height = 256;
        const noiseCtx = noiseCanvas.getContext('2d');
        const imgData = noiseCtx.createImageData(256, 256);
        const data = imgData.data;
        let cSeed = 9999;
        for (let i = 0; i < data.length; i += 4) {
            cSeed = (cSeed * 1664525 + 1013904223) >>> 0;
            const variance = ((cSeed >>> 16) / 65535.0 - 0.5) * 25;
            data[i] = 139 + variance;
            data[i + 1] = 126 + variance;
            data[i + 2] = 87 + variance;
            data[i + 3] = 255;
        }
        noiseCtx.putImageData(imgData, 0, 0);
        carpetCtx.imageSmoothingEnabled = false;
        carpetCtx.drawImage(noiseCanvas, 0, 0, 512, 512);
        carpetCtx.imageSmoothingEnabled = true;
        const carpetTexture = new THREE.CanvasTexture(carpetCanvas);
        carpetTexture.wrapS = THREE.RepeatWrapping;
        carpetTexture.wrapT = THREE.RepeatWrapping;
        const moldCanvas = document.createElement('canvas');
        moldCanvas.width = 256;
        moldCanvas.height = 256;
        const moldCtx = moldCanvas.getContext('2d');
        for (let i = 0; i < 12; i++) {
            const cx = 40 + Math.random() * 176;
            const cy = 40 + Math.random() * 176;
            const r = 8 + Math.random() * 20;
            const grad = moldCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(25, 20, 15, ${0.5 + Math.random() * 0.4})`);
            grad.addColorStop(0.6, 'rgba(25, 20, 15, 0.2)');
            grad.addColorStop(1, 'rgba(25, 20, 15, 0)');
            moldCtx.fillStyle = grad;
            moldCtx.beginPath();
            moldCtx.ellipse(cx, cy, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
            moldCtx.fill();
        }
        const moldTexture = new THREE.CanvasTexture(moldCanvas);
        const moldMat = new THREE.MeshStandardMaterial({
            map: moldTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.12,
            roughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const moldGeo = new THREE.PlaneGeometry(3, 3);
        moldGeo.rotateX(-Math.PI / 2);
        const ceilStainCanvas = document.createElement('canvas');
        ceilStainCanvas.width = 256;
        ceilStainCanvas.height = 256;
        const ceilStainCtx = ceilStainCanvas.getContext('2d');
        for (let i = 0; i < 8; i++) {
            const cx = 40 + Math.random() * 176;
            const cy = 40 + Math.random() * 176;
            const r = 10 + Math.random() * 25;
            const grad = ceilStainCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(80, 70, 50, ${0.3 + Math.random() * 0.3})`);
            grad.addColorStop(0.7, 'rgba(90, 80, 60, 0.15)');
            grad.addColorStop(1, 'rgba(60, 50, 40, 0)');
            ceilStainCtx.fillStyle = grad;
            ceilStainCtx.beginPath();
            ceilStainCtx.ellipse(cx, cy, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
            ceilStainCtx.fill();
        }
        const ceilStainTexture = new THREE.CanvasTexture(ceilStainCanvas);
        const ceilingStainMat = new THREE.MeshStandardMaterial({
            map: ceilStainTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.15,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const ceilingStainGeo = new THREE.PlaneGeometry(3, 3);
        ceilingStainGeo.rotateX(Math.PI / 2);
        const ceilingCanvas = document.createElement('canvas');
        ceilingCanvas.width = 256;
        ceilingCanvas.height = 256;
        const ceilCtx = ceilingCanvas.getContext('2d');
        ceilCtx.fillStyle = '#e0dbcf';
        ceilCtx.fillRect(0, 0, 256, 256);
        ceilCtx.strokeStyle = '#b5b1a5';
        ceilCtx.lineWidth = 2;
        ceilCtx.strokeRect(0, 0, 256, 256);
        ceilCtx.globalAlpha = 0.3;
        ceilCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ceilCtx.globalAlpha = 1.0;
        const ceilingTexture = new THREE.CanvasTexture(ceilingCanvas);
        ceilingTexture.wrapS = THREE.RepeatWrapping;
        ceilingTexture.wrapT = THREE.RepeatWrapping;
        const structCanvas = document.createElement('canvas');
        structCanvas.width = 512;
        structCanvas.height = 512;
        const structCtx = structCanvas.getContext('2d');
        structCtx.fillStyle = '#5c5441';
        structCtx.fillRect(0, 0, 512, 512);

        structCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let y = 0; y < 512; y += (Math.random() * 30 + 20)) {
            structCtx.fillRect(0, y, 512, Math.random() * 8 + 2);
        }

        structCtx.globalAlpha = 0.9;
        structCtx.drawImage(masterNoise, 0, 0);
        structCtx.scale(-1, 1);
        structCtx.setTransform(1, 0, 0, 1, 0, 0);
        structCtx.globalAlpha = 1.0;

        for (let i = 0; i < 30; i++) {
            const grad = structCtx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, `rgba(40, 30, 20, ${Math.random() * 0.2})`);
            grad.addColorStop(1, 'rgba(40, 30, 20, 0)');
            structCtx.fillStyle = grad;

            const startX = Math.random() * 512;
            const streakW = Math.random() * 24 + 8;

            structCtx.fillRect(startX, 0, streakW, 512);

            if (startX + streakW > 512) {
                structCtx.fillRect(startX - 512, 0, streakW, 512);
            }
        }

        const structTexture = new THREE.CanvasTexture(structCanvas);
        structTexture.wrapS = THREE.RepeatWrapping;
        structTexture.wrapT = THREE.RepeatWrapping;
        structTexture.repeat.set(2, 2);
        const structMat = new THREE.MeshStandardMaterial({map: structTexture, roughness: 1.0, bumpMap: structTexture, bumpScale: 0.02});
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 256;
        woodCanvas.height = 512;
        const woodCtx = woodCanvas.getContext('2d');
        woodCtx.fillStyle = '#4a3219';
        woodCtx.fillRect(0, 0, 256, 512);
        woodCtx.lineWidth = 1.5;

        woodCtx.beginPath();
        for (let i = 0; i < 400; i++) {
            let x = Math.random() * 256;
            let y = Math.random() * 512;
            let length = Math.random() * 100 + 20;
            woodCtx.moveTo(x, y);
            woodCtx.bezierCurveTo(x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 4 - 2), y + length);
        }
        woodCtx.strokeStyle = 'rgba(0,0,0,0.08)';
        woodCtx.stroke();

        woodCtx.beginPath();
        for (let i = 0; i < 400; i++) {
            let x = Math.random() * 256;
            let y = Math.random() * 512;
            let length = Math.random() * 100 + 20;
            woodCtx.moveTo(x, y);
            woodCtx.bezierCurveTo(x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 4 - 2), y + length);
        }
        woodCtx.strokeStyle = 'rgba(255,255,255,0.02)';
        woodCtx.stroke();
        const woodTexture = new THREE.CanvasTexture(woodCanvas);
        const woodMat = new THREE.MeshStandardMaterial({map: woodTexture, roughness: 0.9, bumpMap: woodTexture, bumpScale: 0.015});
        const doorCanvas = document.createElement('canvas');
        doorCanvas.width = 256;
        doorCanvas.height = 512;
        const doorCtx = doorCanvas.getContext('2d');
        doorCtx.drawImage(woodCanvas, 0, 0);
        doorCtx.fillStyle = 'rgba(0,0,0,0.3)';
        doorCtx.fillRect(32, 32, 192, 200);
        doorCtx.fillRect(32, 260, 192, 220);
        doorCtx.fillStyle = 'rgba(255,255,255,0.05)';
        doorCtx.fillRect(32, 32, 192, 4);
        doorCtx.fillRect(32, 32, 4, 200);
        doorCtx.fillRect(32, 260, 192, 4);
        doorCtx.fillRect(32, 260, 4, 220);
        doorCtx.fillStyle = '#8a7e32';
        doorCtx.beginPath();
        doorCtx.arc(210, 260, 12, 0, Math.PI * 2);
        doorCtx.fill();
        const doorTexture = new THREE.CanvasTexture(doorCanvas);
        const doorMat = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.9});
        const ventCanvas = document.createElement('canvas');
        ventCanvas.width = 256;
        ventCanvas.height = 256;
        const ventCtx = ventCanvas.getContext('2d');
        ventCtx.fillStyle = '#1a1a1a';
        ventCtx.fillRect(0, 0, 256, 256);
        ventCtx.fillStyle = '#050505';
        ventCtx.fillRect(16, 16, 224, 224);
        ventCtx.fillStyle = '#2a2a2a';
        for (let i = 24; i < 240; i += 24) {
            ventCtx.fillRect(20, i, 216, 12);
            ventCtx.fillStyle = '#4a4a4a';
            ventCtx.fillRect(20, i, 216, 2);
            ventCtx.fillStyle = '#2a2a2a';
        }
        ventCtx.globalAlpha = 0.7;
        ventCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ventCtx.globalAlpha = 1.0;
        const ventTexture = new THREE.CanvasTexture(ventCanvas);
        ventTexture.wrapS = THREE.RepeatWrapping;
        ventTexture.wrapT = THREE.RepeatWrapping;
        ventTexture.repeat.set(16, 16);
        const ventMat = new THREE.MeshStandardMaterial({map: ventTexture, roughness: 0.7, metalness: 0.4, bumpMap: ventTexture, bumpScale: 0.02});
        const lightCanvas = document.createElement('canvas');
        lightCanvas.width = 128;
        lightCanvas.height = 256;
        const lightCtx = lightCanvas.getContext('2d');
        lightCtx.fillStyle = '#ffffe0';
        lightCtx.fillRect(0, 0, 128, 256);
        lightCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        lightCtx.lineWidth = 1;
        lightCtx.beginPath();
        for (let i = -256; i < 256; i += 8) {
            lightCtx.moveTo(0, i);
            lightCtx.lineTo(128, i + 128);
            lightCtx.moveTo(128, i);
            lightCtx.lineTo(0, i + 128);
        }
        lightCtx.stroke();
        lightCtx.strokeStyle = '#1a1a1a';
        lightCtx.lineWidth = 8;
        lightCtx.strokeRect(0, 0, 128, 256);
        lightCtx.strokeStyle = '#4a4a4a';
        lightCtx.lineWidth = 4;
        lightCtx.strokeRect(4, 4, 120, 248);
        const lightTexture = new THREE.CanvasTexture(lightCanvas);
        const fabricCanvas = document.createElement('canvas');
        fabricCanvas.width = 256;
        fabricCanvas.height = 256;
        const fCtx = fabricCanvas.getContext('2d');
        fCtx.fillStyle = '#4c594f';
        fCtx.fillRect(0, 0, 256, 256);
        fCtx.globalAlpha = 0.6;
        fCtx.drawImage(masterNoise, 0, 0, 256, 1024);
        fCtx.drawImage(masterNoise, 0, 0, 1024, 256);
        fCtx.globalAlpha = 1.0;
        const fabricTexture = new THREE.CanvasTexture(fabricCanvas);
        fabricTexture.wrapS = THREE.RepeatWrapping;
        fabricTexture.wrapT = THREE.RepeatWrapping;
        fabricTexture.repeat.set(2, 2);
        const fabricMat = new THREE.MeshStandardMaterial({map: fabricTexture, roughness: 0.95, bumpMap: fabricTexture, bumpScale: 0.03});
        const mossTexture = new THREE.CanvasTexture(fabricCanvas);
        mossTexture.wrapS = THREE.RepeatWrapping;
        mossTexture.wrapT = THREE.RepeatWrapping;
        mossTexture.repeat.set(32, 32);
        const mossMat = new THREE.MeshStandardMaterial({map: mossTexture, roughness: 1.0});
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = 256;
        tileCanvas.height = 256;
        const tileCtx = tileCanvas.getContext('2d');
        tileCtx.fillStyle = '#080808';
        tileCtx.fillRect(0, 0, 256, 256);
        tileCtx.strokeStyle = '#1a1a1a';
        tileCtx.lineWidth = 2;
        tileCtx.strokeRect(0, 0, 256, 256);
        tileCtx.globalAlpha = 0.15;
        tileCtx.drawImage(masterNoise, 0, 0, 256, 256);
        tileCtx.globalAlpha = 1.0;
        const tileTexture = new THREE.CanvasTexture(tileCanvas);
        tileTexture.wrapS = THREE.RepeatWrapping;
        tileTexture.wrapT = THREE.RepeatWrapping;
        tileTexture.repeat.set(16, 16);
        const tileMat = new THREE.MeshStandardMaterial({map: tileTexture, roughness: 0.1, metalness: 0.6});
        const clinicCanvas = document.createElement('canvas');
        clinicCanvas.width = 256; clinicCanvas.height = 256;
        const cCtx = clinicCanvas.getContext('2d');
        cCtx.fillStyle = '#e8ecef';
        cCtx.fillRect(0, 0, 256, 256);
        cCtx.globalAlpha = 0.08;
        cCtx.drawImage(masterNoise, 0, 0, 256, 256);
        cCtx.globalAlpha = 1.0;
        cCtx.strokeStyle = '#8a98a3';
        cCtx.lineWidth = 4;
        cCtx.strokeRect(0, 0, 256, 256);

        const clinicBumpCanvas = document.createElement('canvas');
        clinicBumpCanvas.width = 256; clinicBumpCanvas.height = 256;
        const cbCtx = clinicBumpCanvas.getContext('2d');
        cbCtx.fillStyle = '#ffffff';
        cbCtx.fillRect(0, 0, 256, 256);
        cbCtx.strokeStyle = '#000000';
        cbCtx.lineWidth = 4;
        cbCtx.strokeRect(0, 0, 256, 256);

        const clinicTex = new THREE.CanvasTexture(clinicCanvas);
        clinicTex.wrapS = clinicTex.wrapT = THREE.RepeatWrapping;
        clinicTex.repeat.set(32, 32);
        const clinicBumpTex = new THREE.CanvasTexture(clinicBumpCanvas);
        clinicBumpTex.wrapS = clinicBumpTex.wrapT = THREE.RepeatWrapping;
        clinicBumpTex.repeat.set(32, 32);

        const clinicMat = new THREE.MeshStandardMaterial({
            map: clinicTex,
            bumpMap: clinicBumpTex, bumpScale: 0.015,
            roughness: 0.1, metalness: 0.15 // Wet reflection
        });

        // [SLASH] Gordon: Nuking the water. Deploying procedural chain-link fencing.
        const fenceCanvas = document.createElement('canvas');
        fenceCanvas.width = 64; fenceCanvas.height = 64;
        const fenceCtx = fenceCanvas.getContext('2d');
        fenceCtx.clearRect(0, 0, 64, 64);
        fenceCtx.strokeStyle = '#99aab5';
        fenceCtx.lineWidth = 4;
        fenceCtx.beginPath();
        fenceCtx.moveTo(32, 0); fenceCtx.lineTo(64, 32); fenceCtx.lineTo(32, 64); fenceCtx.lineTo(0, 32); fenceCtx.closePath();
        fenceCtx.stroke();
        fenceCtx.globalCompositeOperation = 'source-atop';
        fenceCtx.globalAlpha = 0.6;
        fenceCtx.drawImage(masterNoise, 0, 0, 64, 64);
        fenceCtx.globalCompositeOperation = 'source-over';
        fenceCtx.globalAlpha = 1.0;

        const fenceTex = new THREE.CanvasTexture(fenceCanvas);
        fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
        fenceTex.repeat.set(12, 12);

        const fenceMat = new THREE.MeshStandardMaterial({
            map: fenceTex,
            roughness: 0.4,
            metalness: 0.9,
            alphaTest: 0.5, // Absolute transparency threshold. Eliminates z-sorting artifacts.
            side: THREE.DoubleSide
        });

        // Alias waterMat to fenceMat to prevent breaking the returned assets payload
        const waterMat = fenceMat;
        const serverCanvas = document.createElement('canvas');
        serverCanvas.width = 256;
        serverCanvas.height = 512;
        const serverCtx = serverCanvas.getContext('2d');
        serverCtx.fillStyle = '#0a0a0a';
        serverCtx.fillRect(0, 0, 256, 512);
        serverCtx.fillStyle = '#020202';
        for (let i = 16; i < 500; i += 32) {
            serverCtx.fillRect(16, i, 224, 24);
            if (Math.random() > 0.3) {
                const colors = ['#00ff00', '#0088ff', '#ff3300', '#444444'];
                serverCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                serverCtx.fillRect(200, i + 8, 6, 6);
                serverCtx.fillStyle = 'rgba(255,255,255,0.3)';
                serverCtx.fillRect(200, i + 8, 3, 3);
                serverCtx.fillStyle = '#020202';
            }
        }
        serverCtx.strokeStyle = '#1a1a1a';
        serverCtx.lineWidth = 4;
        serverCtx.strokeRect(0, 0, 256, 512);
        const serverTexture = new THREE.CanvasTexture(serverCanvas);
        serverTexture.wrapS = THREE.RepeatWrapping;
        serverTexture.wrapT = THREE.RepeatWrapping;
        serverTexture.repeat.set(4, 1);
        const serverMat = new THREE.MeshStandardMaterial({map: serverTexture, roughness: 0.3, metalness: 0.8});
        const baseLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.1
        });
        // [SLASH] The Artisan: Calibrating the dead ballasts. Milky acrylic instead of a void.
        const baseBrokenLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0x8c9296,         // Dead, milky acrylic plastic
            emissive: 0x1a1f24,      // Cold, lifeless gray baseline
            emissiveIntensity: 1.0,  // Ensures the diffuser never drops below a gray visual floor
            roughness: 0.8
        });
        const baseHousingMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });

        const hazardCanvas = document.createElement('canvas');
        hazardCanvas.width = 256;
        hazardCanvas.height = 256;
        const hazCtx = hazardCanvas.getContext('2d');
        hazCtx.fillStyle = '#ffcc00';
        hazCtx.fillRect(0, 0, 256, 256);
        hazCtx.fillStyle = '#111111';
        hazCtx.beginPath();
        for(let i = -256; i < 512; i += 64) {
            hazCtx.moveTo(i, 0);
            hazCtx.lineTo(i + 128, 256);
            hazCtx.lineTo(i + 160, 256);
            hazCtx.lineTo(i + 32, 0);
        }
        hazCtx.fill();
        hazCtx.globalAlpha = 0.6;
        hazCtx.drawImage(masterNoise, 0, 0, 256, 256);
        hazCtx.globalAlpha = 1.0;
        const hazardTexture = new THREE.CanvasTexture(hazardCanvas);
        hazardTexture.wrapS = THREE.RepeatWrapping;
        hazardTexture.wrapT = THREE.RepeatWrapping;
        hazardTexture.repeat.set(2, 2);
        const hazardMat = new THREE.MeshStandardMaterial({map: hazardTexture, roughness: 0.8});

        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 256;
        glowCanvas.height = 256;
        const glowCtx = glowCanvas.getContext('2d');
        const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
        glowGrad.addColorStop(0, 'rgba(255, 255, 220, 0.035)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 220, 0)');
        glowCtx.fillStyle = glowGrad;
        glowCtx.fillRect(0, 0, 256, 256);
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowMat = new THREE.MeshBasicMaterial({
            map: glowTexture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            polygonOffset: true,
            polygonOffsetFactor: -2
        });
        const glowGeo = new THREE.PlaneGeometry(3.8, 3.8);
        glowGeo.rotateX(-Math.PI / 2);

        // [SLASH] The Artisan: Ultraviolet Spray Paint Decal
        const tagCanvas = document.createElement('canvas');
        tagCanvas.width = 128; tagCanvas.height = 128;
        const tagCtx = tagCanvas.getContext('2d');
        tagCtx.strokeStyle = '#ff0055'; // High-visibility liminal neon pink
        tagCtx.lineWidth = 12;
        tagCtx.lineCap = 'round';
        tagCtx.shadowColor = '#ff0055';
        tagCtx.shadowBlur = 15;
        tagCtx.beginPath();
        tagCtx.moveTo(32, 32); tagCtx.lineTo(96, 96);
        tagCtx.moveTo(96, 32); tagCtx.lineTo(32, 96);
        tagCtx.stroke();
        // Paint drips
        tagCtx.lineWidth = 4;
        tagCtx.shadowBlur = 5;
        tagCtx.beginPath();
        tagCtx.moveTo(45, 75); tagCtx.lineTo(45, 110);
        tagCtx.moveTo(85, 80); tagCtx.lineTo(85, 100);
        tagCtx.stroke();

        const tagTexture = new THREE.CanvasTexture(tagCanvas);
        const tagMat = new THREE.MeshBasicMaterial({
            map: tagTexture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4 // Forces the decal to render strictly on top of walls
        });
        const tagGeo = new THREE.PlaneGeometry(0.5, 0.5);

        const assets = {
            tagMat, tagGeo, // [SLASH] Injected
            carpetTexture, ceilingTexture, headerMat, wallTexture, moldMat, moldGeo,
            ceilingStainMat, ceilingStainGeo, structMat, woodMat, doorMat, ventMat,
            fabricMat, mossMat, tileMat, clinicMat, waterMat, serverMat, baseLightMat,
            baseBrokenLightMat, baseHousingMat, glowMat, glowGeo, hazardMat
        };

        Object.values(assets).forEach(item => {
            if (item && item.isTexture) item.anisotropy = 4;
            if (item && item.map && item.map.isTexture) item.map.anisotropy = 4;
            if (item && item.emissiveMap && item.emissiveMap.isTexture) item.emissiveMap.anisotropy = 4;
        });

        return assets;
    }
}