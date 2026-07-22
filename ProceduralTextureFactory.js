// ProceduralTextureFactory.js
// LEVEL 0 TEXTURE & MATERIAL PIPELINE

export default class ProceduralTextureFactory {
    static _createContext(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return {canvas, ctx: canvas.getContext('2d')};
    }
    static _generateMasterNoise() {
        const {canvas, ctx} = this._createContext(512, 512);
        const img = ctx.createImageData(512, 512);
        const data = img.data;
        let seed = 1337;
        for (let i = 0; i < data.length; i += 4) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            if ((seed >>> 24) > 217) {
                const val = (seed && 0x10000) ? 0 : 255;
                data[i] = data[i + 1] = data[i + 2] = val;
                data[i + 3] = 10 + ((seed >>> 8) % 50);
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas;
    }
    static _buildStructuralAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
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
        const {canvas: headerCanvas, ctx: headerCtx} = this._createContext(512, 512);
        headerCtx.drawImage(wallCanvas, 0, 0);
        const headerTexture = new THREE.CanvasTexture(headerCanvas);
        headerTexture.wrapS = headerTexture.wrapT = THREE.RepeatWrapping;
        headerTexture.repeat.set(4, 0.1);
        headerTexture.offset.set(0, 0.9);
        const headerMat = new THREE.MeshStandardMaterial({
            map: headerTexture,
            roughness: 0.8,
            bumpMap: headerTexture,
            bumpScale: 0.01
        });
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
        const {canvas: structCanvas, ctx: structCtx} = this._createContext(512, 512);
        structCtx.fillStyle = '#5c5441';
        structCtx.fillRect(0, 0, 512, 512);
        structCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let y = 0; y < 512; y += (Math.random() * 30 + 20)) structCtx.fillRect(0, y, 512, Math.random() * 8 + 2);
        structCtx.globalAlpha = 0.9;
        structCtx.drawImage(masterNoise, 0, 0);
        structCtx.scale(-1, 1);
        structCtx.drawImage(masterNoise, -512, 0);
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
            if (startX + streakW > 512) structCtx.fillRect(startX - 512, 0, streakW, 512);
        }
        const structTexture = new THREE.CanvasTexture(structCanvas);
        structTexture.wrapS = structTexture.wrapT = THREE.RepeatWrapping;
        structTexture.repeat.set(2, 2);
        const structMat = new THREE.MeshStandardMaterial({
            map: structTexture,
            roughness: 1.0,
            bumpMap: structTexture,
            bumpScale: 0.02
        });
        const {canvas: woodCanvas, ctx: woodCtx} = this._createContext(256, 512);
        woodCtx.fillStyle = '#4a3219';
        woodCtx.fillRect(0, 0, 256, 512);
        woodCtx.lineWidth = 1.5;
        woodCtx.beginPath();
        for (let i = 0; i < 250; i++) {
            let x = Math.random() * 256, y = Math.random() * 512, length = Math.random() * 100 + 20;
            woodCtx.moveTo(x, y);
            woodCtx.bezierCurveTo(x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 10 - 5), y + length / 2, x + (Math.random() * 4 - 2), y + length);
        }
        woodCtx.shadowColor = 'rgba(255,255,255,0.03)';
        woodCtx.shadowOffsetY = 2;
        woodCtx.strokeStyle = 'rgba(0,0,0,0.12)';
        woodCtx.stroke();
        woodCtx.shadowColor = 'transparent';
        const woodTexture = new THREE.CanvasTexture(woodCanvas);
        const woodMat = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.9,
            bumpMap: woodTexture,
            bumpScale: 0.015
        });
        const {canvas: doorCanvas, ctx: doorCtx} = this._createContext(256, 512);
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
        const {canvas: doorBackCanvas, ctx: doorBackCtx} = this._createContext(256, 512);
        doorBackCtx.translate(256, 0);
        doorBackCtx.scale(-1, 1);
        doorBackCtx.drawImage(doorCanvas, 0, 0);
        const doorBackTexture = new THREE.CanvasTexture(doorBackCanvas);
        const doorMatFront = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.9});
        const doorMatBack = new THREE.MeshStandardMaterial({map: doorBackTexture, roughness: 0.9});
        const doorMatEdge = new THREE.MeshStandardMaterial({map: woodTexture, roughness: 0.9});
        const doorMat = [doorMatEdge, doorMatEdge, doorMatEdge, doorMatEdge, doorMatFront, doorMatBack];
        return {headerMat, wallTexture, structMat, woodMat, doorMat};
    }
    static _buildSurfaceAssets(masterNoise) {
        const {canvas: carpetCanvas, ctx: carpetCtx} = this._createContext(512, 512);
        const {canvas: noiseCanvas, ctx: noiseCtx} = this._createContext(256, 256);
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
        carpetTexture.wrapS = carpetTexture.wrapT = THREE.RepeatWrapping;
        carpetTexture.magFilter = THREE.LinearFilter;
        carpetTexture.minFilter = THREE.LinearMipmapLinearFilter;
        const {canvas: ceilingCanvas, ctx: ceilCtx} = this._createContext(512, 512);
        ceilCtx.fillStyle = '#e0dbcf';
        ceilCtx.fillRect(0, 0, 512, 512);
        ceilCtx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let i = 0; i < 2000; i++) ceilCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        ceilCtx.strokeStyle = '#b5b1a5';
        ceilCtx.lineWidth = 4;
        ceilCtx.strokeRect(0, 0, 256, 256);
        ceilCtx.strokeRect(256, 0, 256, 256);
        ceilCtx.strokeRect(0, 256, 256, 256);
        ceilCtx.strokeRect(256, 256, 256, 256);
        ceilCtx.globalAlpha = 0.25;
        ceilCtx.drawImage(masterNoise, 0, 0, 512, 512);
        ceilCtx.globalAlpha = 1.0;
        const ceilingTexture = new THREE.CanvasTexture(ceilingCanvas);
        ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
        const {canvas: tileCanvas, ctx: tileCtx} = this._createContext(256, 256);
        tileCtx.fillStyle = '#080808';
        tileCtx.fillRect(0, 0, 256, 256);
        tileCtx.strokeStyle = '#1a1a1a';
        tileCtx.lineWidth = 2;
        tileCtx.strokeRect(0, 0, 256, 256);
        tileCtx.globalAlpha = 0.15;
        tileCtx.drawImage(masterNoise, 0, 0, 256, 256);
        tileCtx.globalAlpha = 1.0;
        const tileTexture = new THREE.CanvasTexture(tileCanvas);
        tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;
        tileTexture.repeat.set(16, 16);
        const tileMat = new THREE.MeshStandardMaterial({map: tileTexture, roughness: 0.1, metalness: 0.6});
        const {canvas: clinicCanvas, ctx: cCtx} = this._createContext(256, 256);
        cCtx.fillStyle = '#e8ecef';
        cCtx.fillRect(0, 0, 256, 256);
        cCtx.globalAlpha = 0.08;
        cCtx.drawImage(masterNoise, 0, 0, 256, 256);
        cCtx.globalAlpha = 1.0;
        cCtx.strokeStyle = '#8a98a3';
        cCtx.lineWidth = 4;
        cCtx.strokeRect(0, 0, 256, 256);
        const {canvas: clinicBumpCanvas, ctx: cbCtx} = this._createContext(256, 256);
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
            bumpMap: clinicBumpTex,
            bumpScale: 0.015,
            roughness: 0.1,
            metalness: 0.15
        });
        return {carpetTexture, ceilingTexture, tileMat, clinicMat};
    }
    static _buildOrganicAssets(masterNoise) {
        const {canvas: moldCanvas, ctx: moldCtx} = this._createContext(256, 256);
        for (let i = 0; i < 12; i++) {
            const cx = 40 + Math.random() * 176, cy = 40 + Math.random() * 176, r = 8 + Math.random() * 20;
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
        const {canvas: ceilStainCanvas, ctx: ceilStainCtx} = this._createContext(256, 256);
        for (let i = 0; i < 8; i++) {
            const cx = 40 + Math.random() * 176, cy = 40 + Math.random() * 176, r = 10 + Math.random() * 25;
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
        const {canvas: fabricCanvas, ctx: fCtx} = this._createContext(256, 256);
        fCtx.fillStyle = '#3a4a58';
        fCtx.fillRect(0, 0, 256, 256);
        fCtx.lineWidth = 1;
        for (let i = 0; i < 256; i += 4) {
            fCtx.strokeStyle = 'rgba(255,255,255,0.04)';
            fCtx.beginPath();
            fCtx.moveTo(i, 0);
            fCtx.lineTo(i, 256);
            fCtx.stroke();
            fCtx.strokeStyle = 'rgba(0,0,0,0.06)';
            fCtx.beginPath();
            fCtx.moveTo(0, i);
            fCtx.lineTo(256, i);
            fCtx.stroke();
        }
        fCtx.globalAlpha = 0.6;
        fCtx.drawImage(masterNoise, 0, 0, 256, 1024);
        fCtx.drawImage(masterNoise, 0, 0, 1024, 256);
        fCtx.globalAlpha = 1.0;
        const fabricTexture = new THREE.CanvasTexture(fabricCanvas);
        fabricTexture.wrapS = fabricTexture.wrapT = THREE.RepeatWrapping;
        fabricTexture.repeat.set(4, 4);
        const fabricMat = new THREE.MeshStandardMaterial({
            map: fabricTexture,
            roughness: 0.98,
            bumpMap: fabricTexture,
            bumpScale: 0.05
        });
        const mossTexture = new THREE.CanvasTexture(fabricCanvas);
        mossTexture.wrapS = mossTexture.wrapT = THREE.RepeatWrapping;
        mossTexture.repeat.set(32, 32);
        const mossMat = new THREE.MeshStandardMaterial({map: mossTexture, roughness: 1.0});
        const {canvas: cornCanvas, ctx: cornCtx} = this._createContext(256, 256);
        cornCtx.fillStyle = '#11220a';
        cornCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40; i++) {
            cornCtx.strokeStyle = '#223311';
            cornCtx.lineWidth = 3 + Math.random() * 4;
            cornCtx.beginPath();
            const cx = Math.random() * 256;
            cornCtx.moveTo(cx, 0);
            cornCtx.lineTo(cx, 256);
            cornCtx.stroke();
        }
        for (let i = 0; i < 200; i++) {
            cornCtx.strokeStyle = Math.random() > 0.6 ? '#446622' : '#889933';
            cornCtx.lineWidth = 1.5 + Math.random() * 2.5;
            cornCtx.beginPath();
            const sx = Math.random() * 256;
            const sy = Math.random() * 256;
            cornCtx.moveTo(sx, sy);
            cornCtx.quadraticCurveTo(sx + (Math.random() - 0.5) * 40, sy - 30 - Math.random() * 40, sx + (Math.random() - 0.5) * 60, sy + 20 + Math.random() * 40);
            cornCtx.stroke();
            if (Math.random() > 0.95) {
                cornCtx.strokeStyle = '#5c4b31';
                cornCtx.lineWidth = 1 + Math.random() * 2;
                cornCtx.beginPath();
                const dx = Math.random() * 256;
                cornCtx.moveTo(dx, 0);
                cornCtx.lineTo(dx, 256);
                cornCtx.stroke();
            }
        }
        cornCtx.globalCompositeOperation = 'overlay';
        cornCtx.globalAlpha = 0.5;
        cornCtx.drawImage(masterNoise, 0, 0, 256, 256);
        const cornTexture = new THREE.CanvasTexture(cornCanvas);
        cornTexture.wrapS = cornTexture.wrapT = THREE.RepeatWrapping;
        cornTexture.repeat.set(2, 1);
        const cornMat = new THREE.MeshStandardMaterial({
            map: cornTexture,
            roughness: 1.0,
            bumpMap: cornTexture,
            bumpScale: 0.05
        });
        const {canvas: dirtCanvas, ctx: dirtCtx} = this._createContext(256, 256);
        dirtCtx.fillStyle = '#1c150c';
        dirtCtx.fillRect(0, 0, 256, 256);
        for(let i=0; i<400; i++) {
            dirtCtx.fillStyle = Math.random() > 0.5 ? '#2c2214' : '#0c0804';
            dirtCtx.beginPath();
            dirtCtx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 0, Math.PI * 2);
            dirtCtx.fill();
        }
        // Husks baked straight into the dirt texture instead of scattered as
        // separate objects: dried, papery leaf-litter smears with a fiber midline.
        for (let i = 0; i < 16; i++) {
            const cx = Math.random() * 256, cy = Math.random() * 256;
            const len = 16 + Math.random() * 28;
            const wid = 5 + Math.random() * 6;
            dirtCtx.save();
            dirtCtx.translate(cx, cy);
            dirtCtx.rotate(Math.random() * Math.PI);
            const huskGrad = dirtCtx.createLinearGradient(-len / 2, 0, len / 2, 0);
            huskGrad.addColorStop(0, 'rgba(110, 90, 40, 0.85)');
            huskGrad.addColorStop(0.5, 'rgba(165, 140, 68, 0.9)');
            huskGrad.addColorStop(1, 'rgba(100, 82, 36, 0.85)');
            dirtCtx.fillStyle = huskGrad;
            dirtCtx.beginPath();
            dirtCtx.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
            dirtCtx.fill();
            dirtCtx.strokeStyle = 'rgba(70, 55, 22, 0.45)';
            dirtCtx.lineWidth = 1;
            dirtCtx.beginPath();
            dirtCtx.moveTo(-len / 2 + 2, 0);
            dirtCtx.lineTo(len / 2 - 2, 0);
            dirtCtx.stroke();
            dirtCtx.restore();
        }
        dirtCtx.globalAlpha = 0.5;
        dirtCtx.drawImage(masterNoise, 0, 0, 256, 256);
        const dirtTexture = new THREE.CanvasTexture(dirtCanvas);
        dirtTexture.wrapS = dirtTexture.wrapT = THREE.RepeatWrapping;
        dirtTexture.repeat.set(16, 16);
        const dirtMat = new THREE.MeshStandardMaterial({
            map: dirtTexture,
            roughness: 1.0,
            bumpMap: dirtTexture,
            bumpScale: 0.1
        });
        const {canvas: skyCanvas, ctx: skyCtx} = this._createContext(512, 512);
        skyCtx.fillStyle = '#020205';
        skyCtx.fillRect(0, 0, 512, 512);
        skyCtx.fillStyle = '#ffffff';
        for (let i = 0; i < 600; i++) {
            const r = Math.random();
            skyCtx.globalAlpha = r > 0.9 ? 1.0 : (r > 0.5 ? 0.5 : 0.2);
            skyCtx.beginPath();
            skyCtx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.5, 0, Math.PI * 2);
            skyCtx.fill();
        }
        skyCtx.globalAlpha = 0.1;
        skyCtx.drawImage(masterNoise, 0, 0, 512, 512);
        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping;
        skyTexture.repeat.set(4, 4);
        const nightSkyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            fog: false
        });
        return {moldMat, moldGeo, ceilingStainMat, ceilingStainGeo, fabricMat, mossMat, cornMat, dirtMat, nightSkyMat};
    }
    static _buildTechAssets(masterNoise) {
        const {canvas: ventCanvas, ctx: ventCtx} = this._createContext(512, 256);
        ventCtx.fillStyle = '#808080';
        ventCtx.fillRect(0, 0, 512, 256);
        ventCtx.fillStyle = '#9a9a9a';
        ventCtx.fillRect(2, 2, 508, 252);
        ventCtx.fillStyle = '#808080';
        ventCtx.fillRect(6, 6, 500, 244);
        const slotColor = '#151515', slotWidth = 480, slotX = 16, slotY = 16, slotHeight = 224;
        ventCtx.fillStyle = '#9a9a9a';
        ventCtx.fillRect(slotX, slotY, slotWidth, slotHeight);
        for (let ix = 0; ix < 30; ix++) {
            for (let iy = 0; iy < 14; iy++) {
                let hX = slotX + 4 + (ix * 16);
                let hY = slotY + 4 + (iy * 16);
                
                ventCtx.fillStyle = '#c0c0c0';
                ventCtx.fillRect(hX, hY + 12, 12, 2);
                ventCtx.fillRect(hX + 12, hY, 2, 14);
                
                ventCtx.fillStyle = '#505050';
                ventCtx.fillRect(hX - 2, hY - 2, 14, 2);
                ventCtx.fillRect(hX - 2, hY - 2, 2, 14);

                ventCtx.fillStyle = slotColor;
                ventCtx.fillRect(hX, hY, 12, 12);
            }
        }
        ventCtx.fillStyle = '#c0c0c0';
        ventCtx.beginPath();
        ventCtx.arc(8, 128, 4, 0, Math.PI * 2);
        ventCtx.fill();
        ventCtx.beginPath();
        ventCtx.arc(504, 128, 4, 0, Math.PI * 2);
        ventCtx.fill();
        ventCtx.globalAlpha = 0.7;
        ventCtx.drawImage(masterNoise, 0, 0, 512, 256);
        ventCtx.globalAlpha = 1.0;
        const ventTexture = new THREE.CanvasTexture(ventCanvas);
        ventTexture.wrapS = ventTexture.wrapT = THREE.RepeatWrapping;
        ventTexture.repeat.set(1, 1);
        const ventMat = new THREE.MeshStandardMaterial({
            map: ventTexture,
            roughness: 0.7,
            metalness: 0.15,
            bumpMap: ventTexture,
            bumpScale: 0.02
        });
        const {canvas: serverCanvas, ctx: serverCtx} = this._createContext(256, 512);
        serverCtx.fillStyle = '#c4c1b5';
        serverCtx.fillRect(0, 0, 256, 512);
        serverCtx.fillStyle = '#000000';
        for (let i = 16; i < 500; i += 64) {
            serverCtx.fillRect(16, i, 224, 4);
            if (Math.random() > 0.3) {
                serverCtx.fillStyle = '#111111';
                serverCtx.fillRect(160, i + 12, 60, 20);
                const colors = ['#00ff00', '#ffaa00', '#ff3300'];
                serverCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                serverCtx.fillRect(166, i + 16, 8, 8);
                serverCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                serverCtx.fillRect(182, i + 16, 8, 8);
                serverCtx.fillStyle = '#000000';
            }
        }
        serverCtx.strokeStyle = '#8c887d';
        serverCtx.lineWidth = 4;
        serverCtx.strokeRect(0, 0, 256, 512);
        const serverTexture = new THREE.CanvasTexture(serverCanvas);
        serverTexture.wrapS = serverTexture.wrapT = THREE.RepeatWrapping;
        serverTexture.repeat.set(4, 1);
        const serverMat = new THREE.MeshStandardMaterial({map: serverTexture, roughness: 0.3, metalness: 0.8});
        const {canvas: lightCanvas, ctx: lightCtx} = this._createContext(128, 256);
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
        const baseLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.1
        });
        const baseBrokenLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0x8c9296,
            emissive: 0x1a1f24,
            emissiveIntensity: 1.0,
            roughness: 0.8
        });
        const baseHousingMat = new THREE.MeshStandardMaterial({color: 0x1a1a1a, roughness: 0.9});
        return {ventMat, serverMat, baseLightMat, baseBrokenLightMat, baseHousingMat};
    }
    static _buildHazardAndMiscAssets(masterNoise) {
        const {canvas: fenceCanvas, ctx: fenceCtx} = this._createContext(64, 64);
        fenceCtx.strokeStyle = '#99aab5';
        fenceCtx.lineWidth = 4;
        fenceCtx.beginPath();
        fenceCtx.moveTo(32, 0);
        fenceCtx.lineTo(64, 32);
        fenceCtx.lineTo(32, 64);
        fenceCtx.lineTo(0, 32);
        fenceCtx.closePath();
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
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        const {canvas: hazardCanvas, ctx: hazCtx} = this._createContext(256, 256);
        hazCtx.fillStyle = '#ffcc00';
        hazCtx.fillRect(0, 0, 256, 256);
        hazCtx.fillStyle = '#111111';
        hazCtx.beginPath();
        for (let i = -256; i < 512; i += 64) {
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
        hazardTexture.wrapS = hazardTexture.wrapT = THREE.RepeatWrapping;
        hazardTexture.repeat.set(2, 2);
        const hazardMat = new THREE.MeshStandardMaterial({map: hazardTexture, roughness: 0.8});
        const {canvas: glowCanvas, ctx: glowCtx} = this._createContext(256, 256);
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
        const {canvas: tagCanvas, ctx: tagCtx} = this._createContext(128, 128);
        tagCtx.strokeStyle = '#ff0055';
        tagCtx.lineWidth = 12;
        tagCtx.lineCap = 'round';
        tagCtx.shadowColor = '#ff0055';
        tagCtx.shadowBlur = 15;
        tagCtx.beginPath();
        tagCtx.moveTo(32, 32);
        tagCtx.lineTo(96, 96);
        tagCtx.moveTo(96, 32);
        tagCtx.lineTo(32, 96);
        tagCtx.stroke();
        tagCtx.lineWidth = 4;
        tagCtx.shadowBlur = 5;
        tagCtx.beginPath();
        tagCtx.moveTo(45, 75);
        tagCtx.lineTo(45, 110);
        tagCtx.moveTo(85, 80);
        tagCtx.lineTo(85, 100);
        tagCtx.stroke();
        const tagTexture = new THREE.CanvasTexture(tagCanvas);
        const tagMat = new THREE.MeshBasicMaterial({
            map: tagTexture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        const tagGeo = new THREE.PlaneGeometry(0.5, 0.5);
        const voidTexture = new THREE.CanvasTexture(masterNoise);
        voidTexture.wrapS = voidTexture.wrapT = THREE.RepeatWrapping;
        const voidMat = new THREE.MeshStandardMaterial({
            color: 0x020202,
            roughness: 0.15,
            metalness: 0.8,
            bumpMap: voidTexture,
            bumpScale: 0.08
        });
        const rustMat = new THREE.MeshStandardMaterial({color: 0x3a1c14, roughness: 1.0, metalness: 0.3});
        const metalMat = new THREE.MeshStandardMaterial({color: 0x999999, roughness: 0.35, metalness: 0.95});
        const {canvas: almondCanvas, ctx: aCtx} = this._createContext(256, 256);
        aCtx.fillStyle = '#e8ddcb';
        aCtx.fillRect(0, 0, 256, 256);
        aCtx.fillStyle = '#3a5a68';
        aCtx.fillRect(0, 70, 256, 116);
        aCtx.fillStyle = '#e8ddcb';
        aCtx.font = 'bold 36px monospace';
        aCtx.textAlign = 'center';
        aCtx.fillText('ALMOND', 128, 115);
        aCtx.fillText('WATER', 128, 155);
        aCtx.globalAlpha = 0.2;
        aCtx.drawImage(masterNoise, 0, 0, 256, 256);
        aCtx.globalAlpha = 1.0;
        const almondTexture = new THREE.CanvasTexture(almondCanvas);
        const almondMat = new THREE.MeshStandardMaterial({map: almondTexture, roughness: 0.8});
        return {fenceMat, hazardMat, glowMat, glowGeo, tagMat, tagGeo, voidMat, rustMat, metalMat, almondMat};
    }
    static _buildAnnexAssets(masterNoise) {
        // Base brushed-steel plate: also used for the door's thin edge faces.
        const {canvas: steelCanvas, ctx: steelCtx} = this._createContext(256, 512);
        const steelGrad = steelCtx.createLinearGradient(0, 0, 0, 512);
        steelGrad.addColorStop(0, '#787f85');
        steelGrad.addColorStop(1, '#484d52');
        steelCtx.fillStyle = steelGrad;
        steelCtx.fillRect(0, 0, 256, 512);
        steelCtx.lineWidth = 1;
        for (let y = 0; y < 512; y += 3 + Math.floor(Math.random() * 3)) {
            steelCtx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`;
            steelCtx.beginPath();
            steelCtx.moveTo(0, y);
            steelCtx.lineTo(256, y);
            steelCtx.stroke();
        }
        steelCtx.globalAlpha = 0.22;
        steelCtx.drawImage(masterNoise, 0, 0, 256, 512);
        steelCtx.globalAlpha = 1.0;
        const steelTexture = new THREE.CanvasTexture(steelCanvas);
        const annexEdgeMat = new THREE.MeshStandardMaterial({map: steelTexture, roughness: 0.5, metalness: 0.7});
        const {canvas: doorCanvas, ctx: doorCtx} = this._createContext(256, 512);
        doorCtx.drawImage(steelCanvas, 0, 0);
        doorCtx.strokeStyle = 'rgba(0,0,0,0.35)';
        doorCtx.lineWidth = 5;
        doorCtx.strokeRect(14, 14, 228, 484);
        doorCtx.strokeStyle = 'rgba(255,255,255,0.06)';
        doorCtx.lineWidth = 1;
        doorCtx.strokeRect(17, 17, 222, 478);
        doorCtx.fillStyle = '#182a2e';
        doorCtx.fillRect(78, 70, 100, 110);
        doorCtx.strokeStyle = '#9aa0a4';
        doorCtx.lineWidth = 6;
        doorCtx.strokeRect(78, 70, 100, 110);
        doorCtx.strokeStyle = 'rgba(160,170,175,0.35)';
        doorCtx.lineWidth = 1;
        for (let wx = 91; wx < 178; wx += 13) {
            doorCtx.beginPath();
            doorCtx.moveTo(wx, 70);
            doorCtx.lineTo(wx, 180);
            doorCtx.stroke();
        }
        for (let wy = 83; wy < 180; wy += 13) {
            doorCtx.beginPath();
            doorCtx.moveTo(78, wy);
            doorCtx.lineTo(178, wy);
            doorCtx.stroke();
        }
        doorCtx.fillStyle = 'rgba(20,20,20,0.6)';
        [[22, 22], [234, 22], [22, 490], [234, 490]].forEach(([rx, ry]) => {
            doorCtx.beginPath();
            doorCtx.arc(rx, ry, 4, 0, Math.PI * 2);
            doorCtx.fill();
        });
        doorCtx.fillStyle = 'rgba(0,0,0,0.25)';
        doorCtx.fillRect(14, 330, 228, 8);
        doorCtx.fillStyle = 'rgba(30,30,30,0.55)';
        doorCtx.font = 'bold 24px monospace';
        doorCtx.textAlign = 'center';
        doorCtx.fillText('STAFF ONLY', 128, 385);
        doorCtx.font = 'bold 13px monospace';
        doorCtx.fillStyle = 'rgba(0,0,0,0.3)';
        doorCtx.fillText('SUB-LEVEL B', 128, 405);
        doorCtx.save();
        doorCtx.beginPath();
        doorCtx.rect(14, 420, 228, 14);
        doorCtx.clip();
        for (let sx = -20; sx < 256; sx += 20) {
            doorCtx.fillStyle = (Math.floor(sx / 20) % 2 === 0) ? '#e8b613' : '#1a1a1a';
            doorCtx.beginPath();
            doorCtx.moveTo(sx, 420);
            doorCtx.lineTo(sx + 20, 420);
            doorCtx.lineTo(sx + 10, 434);
            doorCtx.lineTo(sx - 10, 434);
            doorCtx.fill();
        }
        doorCtx.restore();
        const kickGrad = doorCtx.createLinearGradient(0, 436, 0, 496);
        kickGrad.addColorStop(0, '#3c4044');
        kickGrad.addColorStop(1, '#2a2d30');
        doorCtx.fillStyle = kickGrad;
        doorCtx.fillRect(14, 436, 228, 60);
        doorCtx.strokeStyle = 'rgba(255,255,255,0.08)';
        doorCtx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            const sy = 440 + Math.random() * 50;
            doorCtx.beginPath();
            doorCtx.moveTo(20 + Math.random() * 210, sy);
            doorCtx.lineTo(20 + Math.random() * 210, sy + Math.random() * 4 - 2);
            doorCtx.stroke();
        }
        const doorTexture = new THREE.CanvasTexture(doorCanvas);
        const {canvas: doorBackCanvas, ctx: doorBackCtx} = this._createContext(256, 512);
        doorBackCtx.translate(256, 0);
        doorBackCtx.scale(-1, 1);
        doorBackCtx.drawImage(doorCanvas, 0, 0);
        const doorBackTexture = new THREE.CanvasTexture(doorBackCanvas);
        const annexDoorMatFront = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.45, metalness: 0.65});
        const annexDoorMatBack = new THREE.MeshStandardMaterial({map: doorBackTexture, roughness: 0.45, metalness: 0.65});
        const annexDoorMat = [annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexDoorMatFront, annexDoorMatBack];
        const annexFrameMat = new THREE.MeshStandardMaterial({color: 0x53585c, roughness: 0.4, metalness: 0.8});
        const {canvas: annexWallCanvas, ctx: annexWallCtx} = this._createContext(512, 512);
        annexWallCtx.fillStyle = '#968c72';
        annexWallCtx.fillRect(0, 0, 512, 512);
        const padCols = 4, padRows = 3, padMargin = 5;
        const padW = 512 / padCols, padH = 480 / padRows;
        for (let r = 0; r < padRows; r++) {
            for (let c = 0; c < padCols; c++) {
                const x0 = c * padW + padMargin, y0 = r * padH + padMargin;
                const x1 = (c + 1) * padW - padMargin, y1 = (r + 1) * padH - padMargin;
                const pcx = (x0 + x1) / 2, pcy = (y0 + y1) / 2;
                const maxRx = (x1 - x0) / 2, maxRy = (y1 - y0) / 2;
                const steps = 16;
                for (let i = steps; i >= 0; i--) {
                    const t = i / steps;
                    const shade = -26 * t;
                    annexWallCtx.fillStyle = `rgb(${182 + shade}, ${171 + shade}, ${146 + shade})`;
                    annexWallCtx.beginPath();
                    annexWallCtx.ellipse(pcx, pcy, maxRx * t, maxRy * t, 0, 0, Math.PI * 2);
                    annexWallCtx.fill();
                }
                annexWallCtx.strokeStyle = 'rgba(90, 80, 58, 0.55)';
                annexWallCtx.lineWidth = 1;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                    annexWallCtx.beginPath();
                    annexWallCtx.moveTo(pcx, pcy);
                    annexWallCtx.lineTo(pcx + dx * maxRx * 0.92, pcy + dy * maxRy * 0.92);
                    annexWallCtx.stroke();
                });
                annexWallCtx.strokeStyle = 'rgba(70, 62, 46, 0.6)';
                annexWallCtx.lineWidth = 2;
                annexWallCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
        }
        for (let r = 0; r <= padRows; r++) {
            for (let c = 0; c <= padCols; c++) {
                const x = c * padW, y = r * padH;
                annexWallCtx.fillStyle = '#4e4632';
                annexWallCtx.beginPath();
                annexWallCtx.arc(x, y, 5, 0, Math.PI * 2);
                annexWallCtx.fill();
                annexWallCtx.fillStyle = 'rgba(200, 188, 160, 0.55)';
                annexWallCtx.beginPath();
                annexWallCtx.arc(x - 1.5, y - 2, 2.2, 0, Math.PI * 2);
                annexWallCtx.fill();
            }
        }
        annexWallCtx.globalAlpha = 0.22;
        annexWallCtx.drawImage(masterNoise, 0, 0);
        annexWallCtx.globalAlpha = 1.0;
        annexWallCtx.fillStyle = '#443f30';
        annexWallCtx.fillRect(0, 480, 512, 32);
        annexWallCtx.fillStyle = '#302c20';
        annexWallCtx.fillRect(0, 476, 512, 4);
        const annexWallTexture = new THREE.CanvasTexture(annexWallCanvas);
        annexWallTexture.wrapS = THREE.RepeatWrapping;
        annexWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        annexWallTexture.repeat.set(4, 1);
        const annexWallMat = new THREE.MeshStandardMaterial({
            map: annexWallTexture,
            color: 0xffffff,
            roughness: 0.88,
            metalness: 0.0,
            bumpMap: annexWallTexture,
            bumpScale: 0.02
        });

        const {canvas: annexFloorCanvas, ctx: annexFloorCtx} = this._createContext(256, 256);
        annexFloorCtx.fillStyle = '#c9c2ac';
        annexFloorCtx.fillRect(0, 0, 256, 256);
        const drawSpiral = (ctx, startTheta, maxTheta, coilPx, width, style) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            let theta = startTheta;
            let first = true;
            while (theta < maxTheta) {
                const r = coilPx * theta;
                const px = 128 + Math.cos(theta) * r;
                const py = 128 + Math.sin(theta) * r;
                if (first) { ctx.moveTo(px, py); first = false; }
                else ctx.lineTo(px, py);
                theta += 0.05;
            }
            ctx.stroke();
        };
        drawSpiral(annexFloorCtx, 0, 4 * Math.PI, 15.5, 5, '#78694e');
        drawSpiral(annexFloorCtx, 0.35, 4 * Math.PI, 15.5, 2, '#968867');
        annexFloorCtx.strokeStyle = '#96907a';
        annexFloorCtx.lineWidth = 2;
        annexFloorCtx.strokeRect(0, 0, 256, 256);
        annexFloorCtx.globalAlpha = 0.15;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        annexFloorCtx.globalAlpha = 1.0;
        const annexFloorTexture = new THREE.CanvasTexture(annexFloorCanvas);
        annexFloorTexture.wrapS = annexFloorTexture.wrapT = THREE.RepeatWrapping;
        annexFloorTexture.repeat.set(14, 14);
        const annexFloorMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 0.5,
            metalness: 0.08,
            bumpMap: annexFloorTexture,
            bumpScale: 0.01
        });

        const {canvas: annexCeilCanvas, ctx: annexCeilCtx} = this._createContext(256, 256);
        annexCeilCtx.fillStyle = '#dcdcd6';
        annexCeilCtx.fillRect(0, 0, 256, 256);
        annexCeilCtx.fillStyle = '#ffffff';
        annexCeilCtx.fillRect(6, 6, 244, 244);
        annexCeilCtx.strokeStyle = '#c4c4bd';
        annexCeilCtx.lineWidth = 6;
        annexCeilCtx.strokeRect(0, 0, 256, 256);
        annexCeilCtx.strokeStyle = 'rgba(215, 215, 208, 0.8)';
        annexCeilCtx.lineWidth = 1;
        for (let x = 6; x < 250; x += 20) {
            annexCeilCtx.beginPath();
            annexCeilCtx.moveTo(x, 6);
            annexCeilCtx.lineTo(x, 250);
            annexCeilCtx.stroke();
        }
        drawSpiral(annexCeilCtx, 0, 4 * Math.PI, 15.5, 5, '#000000');
        drawSpiral(annexCeilCtx, 0.35, 4 * Math.PI, 15.5, 2, '#1a1a1a');
        annexCeilCtx.globalAlpha = 0.05;
        annexCeilCtx.drawImage(masterNoise, 0, 0, 256, 256);
        annexCeilCtx.globalAlpha = 1.0;
        const annexCeilTexture = new THREE.CanvasTexture(annexCeilCanvas);
        annexCeilTexture.wrapS = annexCeilTexture.wrapT = THREE.RepeatWrapping;
        annexCeilTexture.repeat.set(14, 14);
        const annexCeilingMat = new THREE.MeshStandardMaterial({
            map: annexCeilTexture,
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.9,
            roughness: 0.4,
            metalness: 0.0
        });

        return {annexDoorMat, annexFrameMat, annexWallMat, annexFloorMat, annexCeilingMat};
    }
    static _buildImpoundAssets(masterNoise) {
        const ribWidth = 28;
        const drawCorrugation = (ctx, w, h, base, hi, lo) => {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += ribWidth) {
                const grad = ctx.createLinearGradient(x, 0, x + ribWidth, 0);
                grad.addColorStop(0, lo);
                grad.addColorStop(0.5, hi);
                grad.addColorStop(1, lo);
                ctx.fillStyle = grad;
                ctx.fillRect(x, 0, ribWidth, h);
            }
        };
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
        drawCorrugation(wallCtx, 512, 512, '#7d848a', '#9aa1a6', '#5b6166');
        wallCtx.fillStyle = 'rgba(20,20,20,0.3)';
        for (let y = 0; y < 512; y += 170) wallCtx.fillRect(0, y, 512, 6);
        wallCtx.fillStyle = 'rgba(15,10,5,0.55)';
        for (let y = 3; y < 512; y += 170) {
            for (let x = 12; x < 512; x += ribWidth) {
                wallCtx.beginPath();
                wallCtx.arc(x, y, 2.2, 0, Math.PI * 2);
                wallCtx.fill();
            }
        }
        for (let i = 0; i < 24; i++) {
            const grad = wallCtx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, `rgba(130, 60, 20, ${0.12 + Math.random() * 0.22})`);
            grad.addColorStop(1, 'rgba(130, 60, 20, 0)');
            wallCtx.fillStyle = grad;
            const sx = Math.random() * 512;
            const sw = Math.random() * 22 + 6;
            wallCtx.fillRect(sx, 0, sw, 512 * (0.35 + Math.random() * 0.65));
        }
        wallCtx.fillStyle = 'rgba(40, 30, 20, 0.4)';
        wallCtx.fillRect(0, 460, 512, 52);
        wallCtx.globalAlpha = 0.3;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
        const impoundWallTexture = new THREE.CanvasTexture(wallCanvas);
        impoundWallTexture.wrapS = THREE.RepeatWrapping;
        impoundWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        impoundWallTexture.repeat.set(4, 1);
        const impoundWallMat = new THREE.MeshStandardMaterial({
            map: impoundWallTexture,
            roughness: 0.85,
            metalness: 0.35,
            bumpMap: impoundWallTexture,
            bumpScale: 0.02
        });
        const {canvas: ceilCanvas, ctx: ceilCtx} = this._createContext(512, 512);
        drawCorrugation(ceilCtx, 512, 512, '#6b7075', '#84898e', '#484d51');
        ceilCtx.fillStyle = 'rgba(10,10,10,0.35)';
        for (let y = 0; y < 512; y += 128) ceilCtx.fillRect(0, y, 512, 5);
        for (let i = 0; i < 18; i++) {
            const grad = ceilCtx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, `rgba(110, 70, 30, ${0.1 + Math.random() * 0.2})`);
            grad.addColorStop(1, 'rgba(110, 70, 30, 0)');
            ceilCtx.fillStyle = grad;
            const sx = Math.random() * 512;
            const sw = Math.random() * 16 + 5;
            ceilCtx.fillRect(sx, 0, sw, 512 * (0.3 + Math.random() * 0.5));
        }
        ceilCtx.globalAlpha = 0.25;
        ceilCtx.drawImage(masterNoise, 0, 0);
        ceilCtx.globalAlpha = 1.0;
        const impoundCeilingTexture = new THREE.CanvasTexture(ceilCanvas);
        impoundCeilingTexture.wrapS = impoundCeilingTexture.wrapT = THREE.RepeatWrapping;
        impoundCeilingTexture.repeat.set(8, 8);
        const impoundCeilingMat = new THREE.MeshStandardMaterial({
            map: impoundCeilingTexture,
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.4,
            bumpMap: impoundCeilingTexture,
            bumpScale: 0.015
        });
        return {impoundWallMat, impoundCeilingMat};
    }
    static _buildBoardroomAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
        wallCtx.fillStyle = '#c7c1b3';
        wallCtx.fillRect(0, 0, 512, 512);
        const drawFractalBloom = (cx, cy, len, angle, depth, seed) => {
            if (depth <= 0 || len < 4) {
                const petals = 5;
                for (let p = 0; p < petals; p++) {
                    const pa = (p / petals) * Math.PI * 2 + seed * 6.28;
                    wallCtx.beginPath();
                    wallCtx.ellipse(
                        cx + Math.cos(pa) * len * 0.7, cy + Math.sin(pa) * len * 0.7,
                        Math.max(1.5, len * 0.55), Math.max(1, len * 0.28),
                        pa, 0, Math.PI * 2
                    );
                    wallCtx.fill();
                }
                return;
            }
            const ex = cx + Math.cos(angle) * len;
            const ey = cy + Math.sin(angle) * len;
            wallCtx.beginPath();
            wallCtx.moveTo(cx, cy);
            wallCtx.lineTo(ex, ey);
            wallCtx.stroke();
            const spread = 0.4 + seed * 0.2;
            drawFractalBloom(ex, ey, len * 0.78, angle - spread, depth - 1, seed);
            drawFractalBloom(ex, ey, len * 0.78, angle + spread, depth - 1, seed);
        };

        wallCtx.strokeStyle = 'rgba(94, 88, 72, 0.32)';
        wallCtx.fillStyle = 'rgba(94, 88, 72, 0.26)';
        wallCtx.lineWidth = 1.5;
        const seed = 0.42;
        const groundY = 468;
        const trunkLen = 130;
        drawFractalBloom(256, groundY, trunkLen, -Math.PI / 2, 6, seed);

        const sprigY = groundY - trunkLen * 0.45;
        wallCtx.strokeStyle = 'rgba(94, 88, 72, 0.16)';
        wallCtx.fillStyle = 'rgba(94, 88, 72, 0.12)';
        wallCtx.lineWidth = 1;
        drawFractalBloom(256, sprigY, 55, -Math.PI / 2 - 1.15, 3, seed);
        drawFractalBloom(256, sprigY, 47, -Math.PI / 2 + 1.25, 3, seed);

        wallCtx.globalAlpha = 0.30;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
        wallCtx.fillStyle = '#55503e';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#3d3929';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.12)';
        wallCtx.fillRect(255, 0, 2, 512);

        const boardWallTexture = new THREE.CanvasTexture(wallCanvas);
        boardWallTexture.wrapS = THREE.RepeatWrapping;
        boardWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        boardWallTexture.repeat.set(4, 1);
        const boardWallMat = new THREE.MeshStandardMaterial({
            map: boardWallTexture,
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.05,
            bumpMap: boardWallTexture,
            bumpScale: 0.008
        });
        return {boardWallMat};
    }
    static _buildMaintenanceAssets(masterNoise) {
        const {canvas: leakCanvas, ctx: leakCtx} = this._createContext(256, 256);
        for (let i = 0; i < 10; i++) {
            const cx = 60 + Math.random() * 136, cy = 60 + Math.random() * 136, r = 20 + Math.random() * 45;
            const grad = leakCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(18, 15, 12, ${0.55 + Math.random() * 0.3})`);
            grad.addColorStop(0.55, 'rgba(35, 26, 18, 0.25)');
            grad.addColorStop(1, 'rgba(35, 26, 18, 0)');
            leakCtx.fillStyle = grad;
            leakCtx.beginPath();
            leakCtx.ellipse(cx, cy, r, r * (0.55 + Math.random() * 0.35), Math.random() * Math.PI, 0, Math.PI * 2);
            leakCtx.fill();
        }
        const leakTexture = new THREE.CanvasTexture(leakCanvas);
        const leakStainMat = new THREE.MeshStandardMaterial({
            map: leakTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.85,
            roughness: 0.35,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const leakStainGeo = new THREE.PlaneGeometry(1.6, 1.6);
        leakStainGeo.rotateX(-Math.PI / 2);
        return {leakStainMat, leakStainGeo};
    }
    static generateAssets() {
        const masterNoise = this._generateMasterNoise();
        const structAssets = this._buildStructuralAssets(masterNoise);
        const surfaceAssets = this._buildSurfaceAssets(masterNoise);
        const organicAssets = this._buildOrganicAssets(masterNoise);
        const techAssets = this._buildTechAssets(masterNoise);
        const hazardAssets = this._buildHazardAndMiscAssets(masterNoise);
        const annexAssets = this._buildAnnexAssets(masterNoise);
        const impoundAssets = this._buildImpoundAssets(masterNoise);
        const boardroomAssets = this._buildBoardroomAssets(masterNoise);
        const maintenanceAssets = this._buildMaintenanceAssets(masterNoise);
        const assets = {
            ...structAssets,
            ...surfaceAssets,
            ...organicAssets,
            ...techAssets,
            ...hazardAssets,
            ...annexAssets,
            ...impoundAssets,
            ...boardroomAssets,
            ...maintenanceAssets
        };
        const applyOpt = (item) => {
            if (item && item.isTexture) {
                item.anisotropy = 16;
                item.colorSpace = THREE.SRGBColorSpace;
            }
            if (item && item.map && item.map.isTexture) {
                item.map.anisotropy = 16;
                item.map.colorSpace = THREE.SRGBColorSpace;
            }
            if (item && item.emissiveMap && item.emissiveMap.isTexture) {
                item.emissiveMap.anisotropy = 16;
                item.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            }
        };
        Object.values(assets).forEach(item => {
            if (Array.isArray(item)) {
                item.forEach(applyOpt);
            } else {
                applyOpt(item);
            }
        });
        return assets;
    }
}