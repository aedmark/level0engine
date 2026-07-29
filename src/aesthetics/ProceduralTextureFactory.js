// ProceduralTextureFactory.js
// LEVEL 0 TEXTURE & MATERIAL PIPELINE

/**
 * The core generator for all procedural textures used in the game.
 * 
 * This file is responsible for keeping the game bundle so incredibly small.
 * Instead of loading dozens of MBs of .png files for walls, floors, ceilings, and props, 
 * this class uses the HTML5 `CanvasRenderingContext2D` API to draw every texture from scratch 
 * when the game loads. It combines simple shapes, procedural noise (`_generateMasterNoise`), 
 * and gradients to create all the materials used by the `MaterialLibrary`.
 */

export default class ProceduralTextureFactory {
    static _createContext(width, height, opaque = true) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return {canvas, ctx: canvas.getContext('2d', opaque ? { alpha: false } : undefined)};
    }

    static _createWrappedTexture(canvas, repeatX = 1, repeatY = 1, clampT = false) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        if (repeatX !== 1 || repeatY !== 1) {
            texture.repeat.set(repeatX, repeatY);
        }
        return texture;
    }

    static _generateMasterNoise() {
        const {canvas, ctx} = this._createContext(512, 512, false);
        const img = ctx.createImageData(512, 512);
        const data = img.data;
        let seed = 1337;
        for (let i = 0; i < data.length; i += 4) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            if ((seed >>> 24) > 217) {
                const val = (seed & 0x10000) ? 0 : 255;
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
        const headerTexture = this._createWrappedTexture(headerCanvas, 4, 0.1);
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
        const wallTexture = this._createWrappedTexture(wallCanvas, 4, 1, true);
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
        const structTexture = this._createWrappedTexture(structCanvas, 2, 2);
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
        const carpetTexture = this._createWrappedTexture(carpetCanvas);
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
        const ceilingTexture = this._createWrappedTexture(ceilingCanvas);
        const {canvas: tileCanvas, ctx: tileCtx} = this._createContext(256, 256);
        tileCtx.fillStyle = '#080808';
        tileCtx.fillRect(0, 0, 256, 256);
        tileCtx.strokeStyle = '#1a1a1a';
        tileCtx.lineWidth = 2;
        tileCtx.strokeRect(0, 0, 256, 256);
        tileCtx.globalAlpha = 0.15;
        tileCtx.drawImage(masterNoise, 0, 0, 256, 256);
        tileCtx.globalAlpha = 1.0;
        const tileTexture = this._createWrappedTexture(tileCanvas, 16, 16);
        const tileMat = new THREE.MeshStandardMaterial({
            map: tileTexture,
            roughness: 0.4,
            metalness: 0.6,
            shadowSide: THREE.DoubleSide
        });
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
        const clinicTex = this._createWrappedTexture(clinicCanvas, 32, 32);
        const clinicBumpTex = this._createWrappedTexture(clinicBumpCanvas, 32, 32);
        const clinicMat = new THREE.MeshStandardMaterial({
            map: clinicTex,
            bumpMap: clinicBumpTex,
            bumpScale: 0.015,
            roughness: 0.4,
            metalness: 0.15,
            shadowSide: THREE.DoubleSide
        });
        return {carpetTexture, ceilingTexture, tileMat, clinicMat};
    }

    static _buildOrganicAssets(masterNoise) {
        const {canvas: moldCanvas, ctx: moldCtx} = this._createContext(256, 256, false);
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
        const {canvas: ceilStainCanvas, ctx: ceilStainCtx} = this._createContext(256, 256, false);
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
        const fabricTexture = this._createWrappedTexture(fabricCanvas, 4, 4);
        const fabricMat = new THREE.MeshStandardMaterial({
            map: fabricTexture,
            roughness: 0.98,
            bumpMap: fabricTexture,
            bumpScale: 0.05
        });
        const mossTexture = this._createWrappedTexture(fabricCanvas, 32, 32);
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
        const cornTexture = this._createWrappedTexture(cornCanvas, 2, 1);
        const cornMat = new THREE.MeshStandardMaterial({
            map: cornTexture,
            roughness: 1.0,
            bumpMap: cornTexture,
            bumpScale: 0.05
        });
        const {canvas: dirtCanvas, ctx: dirtCtx} = this._createContext(256, 256);
        dirtCtx.fillStyle = '#1c150c';
        dirtCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 400; i++) {
            dirtCtx.fillStyle = Math.random() > 0.5 ? '#2c2214' : '#0c0804';
            dirtCtx.beginPath();
            dirtCtx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 0, Math.PI * 2);
            dirtCtx.fill();
        }
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
        const dirtTexture = this._createWrappedTexture(dirtCanvas, 16, 16);
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
        const skyTexture = this._createWrappedTexture(skyCanvas, 4, 4);
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
        const ventTexture = this._createWrappedTexture(ventCanvas, 1, 1);
        const ventMat = new THREE.MeshStandardMaterial({
            map: ventTexture,
            roughness: 0.7,
            metalness: 0.15,
            bumpMap: ventTexture,
            bumpScale: 0.02
        });
        const {canvas: ductCanvas, ctx: ductCtx} = this._createContext(256, 256);
        ductCtx.fillStyle = '#505456';
        ductCtx.fillRect(0, 0, 256, 256);
        ductCtx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
            ductCtx.strokeStyle = '#3a3e40';
            ductCtx.beginPath();
            ductCtx.moveTo(0, y);
            ductCtx.lineTo(256, y);
            ductCtx.stroke();
            ductCtx.strokeStyle = '#6a6e70';
            ductCtx.beginPath();
            ductCtx.moveTo(0, y + 2);
            ductCtx.lineTo(256, y + 2);
            ductCtx.stroke();
        }
        ductCtx.globalAlpha = 0.35;
        ductCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ductCtx.globalAlpha = 1.0;
        const ductTexture = this._createWrappedTexture(ductCanvas, 2, 2);
        const ductMat = new THREE.MeshStandardMaterial({
            map: ductTexture,
            roughness: 0.55,
            metalness: 0.75,
            bumpMap: ductTexture,
            bumpScale: 0.01
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
        const serverTexture = this._createWrappedTexture(serverCanvas, 4, 1);
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
        const matteLightMat = baseLightMat.clone();
        matteLightMat.metalness = 0;
        matteLightMat.roughness = 0.95;
        const matteBrokenLightMat = baseBrokenLightMat.clone();
        matteBrokenLightMat.metalness = 0;
        matteBrokenLightMat.roughness = 0.95;
        return {ventMat, ductMat, serverMat, baseLightMat, baseBrokenLightMat, baseHousingMat, matteLightMat, matteBrokenLightMat};
    }

    static _buildHazardAndMiscAssets(masterNoise) {
        const {canvas: fenceCanvas, ctx: fenceCtx} = this._createContext(64, 64, false);
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
        const fenceTex = this._createWrappedTexture(fenceCanvas, 12, 12);
        const fenceMat = new THREE.MeshStandardMaterial({
            map: fenceTex,
            roughness: 0.4,
            metalness: 0.9,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        const hazardBumpTexture = this._createWrappedTexture(masterNoise, 2, 2);
        const hazardMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            bumpMap: hazardBumpTexture,
            bumpScale: 0.05,
            roughness: 0.8,
            metalness: 0.2
        });
        const {canvas: glowCanvas, ctx: glowCtx} = this._createContext(256, 256, false);
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
        const {canvas: tagCanvas, ctx: tagCtx} = this._createContext(128, 128, false);
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
        const voidTexture = this._createWrappedTexture(masterNoise);
        const voidMat = new THREE.MeshStandardMaterial({
            color: 0x020202,
            roughness: 0.4,
            metalness: 0.8,
            bumpMap: voidTexture,
            bumpScale: 0.08
        });
        const rustMat = new THREE.MeshStandardMaterial({color: 0x3a1c14, roughness: 1.0, metalness: 0.3});
        const metalMat = new THREE.MeshStandardMaterial({color: 0x999999, roughness: 0.35, metalness: 0.95});
        const {canvas: pittedCanvas, ctx: pittedCtx} = this._createContext(256, 256);
        pittedCtx.fillStyle = '#6e6d68';
        pittedCtx.fillRect(0, 0, 256, 256);
        pittedCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        pittedCtx.lineWidth = 1;
        for (let i = 0; i < 256; i += 3) {
            pittedCtx.beginPath();
            pittedCtx.moveTo(0, i + (Math.random() * 1.5 - 0.75));
            pittedCtx.lineTo(256, i + (Math.random() * 1.5 - 0.75));
            pittedCtx.stroke();
        }
        for (let i = 0; i < 260; i++) {
            const px = Math.random() * 256;
            const py = Math.random() * 256;
            const pr = Math.random() * 2.2 + 0.4;
            const pitGrad = pittedCtx.createRadialGradient(px, py, 0, px, py, pr);
            pitGrad.addColorStop(0, 'rgba(10,10,8,0.6)');
            pitGrad.addColorStop(0.7, 'rgba(10,10,8,0.25)');
            pitGrad.addColorStop(1, 'rgba(10,10,8,0)');
            pittedCtx.fillStyle = pitGrad;
            pittedCtx.beginPath();
            pittedCtx.arc(px, py, pr, 0, Math.PI * 2);
            pittedCtx.fill();
            pittedCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
            pittedCtx.beginPath();
            pittedCtx.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.4, 0, Math.PI * 2);
            pittedCtx.fill();
        }
        for (let i = 0; i < 14; i++) {
            const px = Math.random() * 256;
            const py = Math.random() * 256;
            const pr = Math.random() * 9 + 4;
            const rustGrad = pittedCtx.createRadialGradient(px, py, 0, px, py, pr);
            rustGrad.addColorStop(0, 'rgba(110,58,28,0.16)');
            rustGrad.addColorStop(1, 'rgba(110,58,28,0)');
            pittedCtx.fillStyle = rustGrad;
            pittedCtx.beginPath();
            pittedCtx.arc(px, py, pr, 0, Math.PI * 2);
            pittedCtx.fill();
        }
        pittedCtx.globalAlpha = 0.3;
        pittedCtx.drawImage(masterNoise, 0, 0, 256, 256);
        pittedCtx.globalAlpha = 1.0;
        const pittedMetalTexture = this._createWrappedTexture(pittedCanvas, 2, 2);
        const pittedMetalMat = new THREE.MeshStandardMaterial({
            map: pittedMetalTexture,
            color: 0xffffff,
            bumpMap: pittedMetalTexture,
            bumpScale: 0.025,
            roughness: 0.55,
            metalness: 0.75
        });
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
        const {canvas: tiCanvas, ctx: tiCtx} = this._createContext(256, 512);
        const tiGrad = tiCtx.createLinearGradient(0, 0, 0, 512);
        tiGrad.addColorStop(0, '#c0c8d0');
        tiGrad.addColorStop(1, '#808a94');
        tiCtx.fillStyle = tiGrad;
        tiCtx.fillRect(0, 0, 256, 512);
        tiCtx.lineWidth = 1;
        for (let y = 0; y < 512; y += 2) {
            tiCtx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
            tiCtx.beginPath(); tiCtx.moveTo(0, y); tiCtx.lineTo(256, y); tiCtx.stroke();
            tiCtx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
            tiCtx.beginPath(); tiCtx.moveTo(0, y + 1); tiCtx.lineTo(256, y + 1); tiCtx.stroke();
        }
        tiCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        tiCtx.beginPath();
        tiCtx.moveTo(128, 150);
        tiCtx.lineTo(200, 270);
        tiCtx.lineTo(56, 270);
        tiCtx.closePath();
        tiCtx.fill();
        tiCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        tiCtx.fillRect(0, 300, 256, 20);
        tiCtx.globalAlpha = 0.3;
        tiCtx.globalCompositeOperation = 'multiply';
        tiCtx.drawImage(masterNoise, 0, 0, 256, 512);
        tiCtx.globalAlpha = 1.0;
        tiCtx.globalCompositeOperation = 'source-over';
        const tiTex = this._createWrappedTexture(tiCanvas, 1, 1);
        const titaniumMat = new THREE.MeshStandardMaterial({
            map: tiTex,
            roughness: 0.35,
            metalness: 0.4,
            bumpMap: tiTex,
            bumpScale: 0.005
        });

        return {fenceMat, hazardMat, glowMat, glowGeo, tagMat, tagGeo, voidMat, rustMat, metalMat, pittedMetalMat, almondMat, titaniumMat};
    }

    static _buildAnnexAssets(masterNoise) {
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
        const annexDoorMatBack = new THREE.MeshStandardMaterial({
            map: doorBackTexture,
            roughness: 0.45,
            metalness: 0.65
        });
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
                if (first) {
                    ctx.moveTo(px, py);
                    first = false;
                } else ctx.lineTo(px, py);
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
        const annexFloorTexture = this._createWrappedTexture(annexFloorCanvas, 14, 14);
        const annexFloorMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 0.7,
            metalness: 0.05,
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
        const annexCeilTexture = this._createWrappedTexture(annexCeilCanvas, 14, 14);
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
        const impoundCeilingTexture = this._createWrappedTexture(ceilCanvas, 8, 8);
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
        const boardWallTexture = this._createWrappedTexture(wallCanvas, 4, 1, true);
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

    /**
     * A glossy, veined "food court marble" laminate for the Atrium's wall ring -- the kind
     * of over-polished faux-stone a mall developer picks because it photographs well, not
     * because it's tasteful. Cream base, grey veining, a couple of thin gold accent veins,
     * and a soft diagonal sheen standing in for the over-buffed gloss coat.
     */
    static _buildAtriumAssets(masterNoise) {
        const {canvas: marbleCanvas, ctx: marbleCtx} = this._createContext(512, 512);
        marbleCtx.fillStyle = '#efe7d8';
        marbleCtx.fillRect(0, 0, 512, 512);
        marbleCtx.globalAlpha = 0.4;
        marbleCtx.drawImage(masterNoise, 0, 0, 512, 512);
        marbleCtx.globalAlpha = 1.0;

        const drawVein = (color, width, alpha) => {
            marbleCtx.strokeStyle = color;
            marbleCtx.lineWidth = width;
            marbleCtx.globalAlpha = alpha;
            marbleCtx.beginPath();
            let vx = Math.random() * 512;
            let vy = 0;
            marbleCtx.moveTo(vx, vy);
            while (vy < 512) {
                vx += (Math.random() - 0.5) * 140;
                vy += 40 + Math.random() * 60;
                marbleCtx.lineTo(vx, vy);
            }
            marbleCtx.stroke();
        };
        for (let i = 0; i < 9; i++) {
            drawVein('rgba(150, 138, 118, 1)', 1 + Math.random() * 2, 0.25 + Math.random() * 0.2);
        }
        for (let i = 0; i < 3; i++) {
            drawVein('rgba(197, 163, 74, 1)', 1 + Math.random() * 1.5, 0.35);
        }
        marbleCtx.globalAlpha = 1.0;

        // A cheap, uneven gloss band rather than a true reflection -- laminate catching
        // light unevenly, not a real polished-stone specular response.
        const sheen = marbleCtx.createLinearGradient(0, 0, 512, 512);
        sheen.addColorStop(0.0, 'rgba(255,255,255,0.0)');
        sheen.addColorStop(0.45, 'rgba(255,255,255,0.12)');
        sheen.addColorStop(0.55, 'rgba(255,255,255,0.0)');
        sheen.addColorStop(1.0, 'rgba(255,255,255,0.0)');
        marbleCtx.fillStyle = sheen;
        marbleCtx.fillRect(0, 0, 512, 512);

        const marbleTexture = this._createWrappedTexture(marbleCanvas, 2, 1);
        const marbleMat = new THREE.MeshStandardMaterial({
            map: marbleTexture,
            color: 0xffffff,
            bumpMap: marbleTexture,
            bumpScale: 0.015,
            roughness: 0.18,
            metalness: 0.15
        });

        // Gondola-shelving steel for the aisle racks -- a flat, inoffensive powder-coat beige
        // (the same "almond"-ish tone real store fixtures like Lozier shelving ship in) rather
        // than anything overtly industrial. Bump-only (no printed map) so it tiles cleanly
        // across the wildly different proportions this material gets stretched over -- thin
        // uprights, wide shelf boards, tall filler bands -- without any baked imagery smearing.
        //
        // First pass used raw masterNoise as the bump map directly (the same shortcut
        // hazardMat/voidMat use). That noise is sparse, hard-edged single-pixel speckle --
        // fine for grungy pitted/concrete surfaces, but at shelf scale it read as coarse
        // random pockmarking, i.e. stucco, not painted sheet steel. Building a proper
        // brushed-metal bump texture instead (fine horizontal streak pairs, the same approach
        // titaniumMat/pittedMetalMat use) plus a much lower bumpScale gives a smooth painted
        // panel with just a whisper of grain instead.
        const {canvas: shelfBumpCanvas, ctx: shelfBumpCtx} = this._createContext(256, 256);
        shelfBumpCtx.fillStyle = '#808080';
        shelfBumpCtx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 2) {
            shelfBumpCtx.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.04})`;
            shelfBumpCtx.beginPath();
            shelfBumpCtx.moveTo(0, y);
            shelfBumpCtx.lineTo(256, y);
            shelfBumpCtx.stroke();
            shelfBumpCtx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.04})`;
            shelfBumpCtx.beginPath();
            shelfBumpCtx.moveTo(0, y + 1);
            shelfBumpCtx.lineTo(256, y + 1);
            shelfBumpCtx.stroke();
        }
        shelfBumpCtx.globalAlpha = 0.08;
        shelfBumpCtx.drawImage(masterNoise, 0, 0, 256, 256);
        shelfBumpCtx.globalAlpha = 1.0;
        const shelfBumpTexture = this._createWrappedTexture(shelfBumpCanvas, 2, 2);
        const shelfMat = new THREE.MeshStandardMaterial({
            color: 0xc9bd9e,
            bumpMap: shelfBumpTexture,
            bumpScale: 0.006,
            roughness: 0.6,
            metalness: 0.2
        });
        return {marbleMat, shelfMat};
    }

    static _buildMaintenanceAssets(masterNoise) {
        const {canvas: leakCanvas, ctx: leakCtx} = this._createContext(256, 256, false);
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

    static _buildArchiveAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
        wallCtx.fillStyle = '#2c4830';
        wallCtx.fillRect(0, 0, 512, 384);
        wallCtx.lineWidth = 1;
        for (let i = 0; i < 512; i += 16) {
            wallCtx.strokeStyle = (i % 64 === 0) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.02)';
            wallCtx.beginPath();
            wallCtx.moveTo(i, 0);
            wallCtx.lineTo(i, 384);
            wallCtx.stroke();
        }
        wallCtx.fillStyle = '#3a2012';
        wallCtx.fillRect(0, 384, 512, 128);
        for (let i = 0; i < 512; i += 4) {
            if (i % 64 === 0) {
                wallCtx.fillStyle = '#1e0f06';
                wallCtx.fillRect(i, 384, 4, 128);
                wallCtx.fillStyle = '#4a2d1a';
                wallCtx.fillRect(i + 4, 384, 2, 128);
            } else if (Math.random() > 0.3) {
                wallCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                wallCtx.fillRect(i, 384, 1 + Math.random(), 128);
            }
        }
        wallCtx.fillStyle = '#1e0f06';
        wallCtx.fillRect(0, 380, 512, 4);
        wallCtx.fillStyle = '#4a2d1a';
        wallCtx.fillRect(0, 376, 512, 4);
        wallCtx.fillStyle = '#221109';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#110804';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.globalAlpha = 0.4;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);
        const archiveWallTexture = this._createWrappedTexture(wallCanvas, 4, 1, true);
        const archiveWallMat = new THREE.MeshStandardMaterial({
            map: archiveWallTexture,
            roughness: 0.95,
            metalness: 0.0,
            bumpMap: archiveWallTexture,
            bumpScale: 0.015
        });
        const {canvas: floorCanvas, ctx: floorCtx} = this._createContext(256, 256);
        const tileA = '#ddceA2', tileB = '#8a3a2e';
        const tiles = 8, tileSize = 256 / tiles;
        for (let ty = 0; ty < tiles; ty++) {
            for (let tx = 0; tx < tiles; tx++) {
                floorCtx.fillStyle = (tx + ty) % 2 === 0 ? tileA : tileB;
                floorCtx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
            }
        }
        floorCtx.globalAlpha = 0.18;
        floorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        floorCtx.globalAlpha = 1.0;
        for (let i = 0; i < 70; i++) {
            floorCtx.strokeStyle = `rgba(20, 15, 10, ${Math.random() * 0.12})`;
            floorCtx.lineWidth = 0.5 + Math.random() * 1.5;
            floorCtx.beginPath();
            const sx = Math.random() * 256, sy = Math.random() * 256;
            floorCtx.moveTo(sx, sy);
            floorCtx.lineTo(sx + (Math.random() - 0.5) * 30, sy + (Math.random() - 0.5) * 30);
            floorCtx.stroke();
        }
        floorCtx.strokeStyle = 'rgba(0,0,0,0.2)';
        floorCtx.lineWidth = 1;
        for (let t = 0; t <= tiles; t++) {
            floorCtx.beginPath();
            floorCtx.moveTo(0, t * tileSize);
            floorCtx.lineTo(256, t * tileSize);
            floorCtx.stroke();
            floorCtx.beginPath();
            floorCtx.moveTo(t * tileSize, 0);
            floorCtx.lineTo(t * tileSize, 256);
            floorCtx.stroke();
        }
        const archiveFloorTexture = this._createWrappedTexture(floorCanvas, 16, 16);
        const archiveFloorMat = new THREE.MeshStandardMaterial({
            map: archiveFloorTexture,
            roughness: 0.65,
            metalness: 0.02,
            bumpMap: archiveFloorTexture,
            bumpScale: 0.006
        });
        const {canvas: pCanvas, ctx: pCtx} = this._createContext(64, 64);
        pCtx.fillStyle = '#f0eee6';
        pCtx.fillRect(0, 0, 64, 64);
        pCtx.globalAlpha = 0.15;
        pCtx.drawImage(masterNoise, 0, 0, 64, 64);
        pCtx.globalAlpha = 1.0;
        pCtx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 8; i < 56; i += 6) {
            pCtx.fillRect(8, i, 48 * (0.6 + Math.random() * 0.4), 1.5);
        }
        const paperTex = new THREE.CanvasTexture(pCanvas);
        const paperMat = new THREE.MeshStandardMaterial({map: paperTex, roughness: 1.0});
        const paperGeo = new THREE.PlaneGeometry(0.2, 0.28);
        const {canvas: cCanvas, ctx: cCtx} = this._createContext(64, 64, false);
        const grad = cCtx.createRadialGradient(32, 32, 10, 32, 32, 30);
        grad.addColorStop(0, 'rgba(40, 20, 10, 0.05)');
        grad.addColorStop(0.8, 'rgba(40, 20, 10, 0.15)');
        grad.addColorStop(0.9, 'rgba(40, 20, 10, 0.7)');
        grad.addColorStop(1, 'rgba(40, 20, 10, 0)');
        cCtx.fillStyle = grad;
        cCtx.beginPath();
        cCtx.arc(32, 32, 30, 0, Math.PI * 2);
        cCtx.fill();
        const coffeeTex = new THREE.CanvasTexture(cCanvas);
        const coffeeStainMat = new THREE.MeshStandardMaterial({
            map: coffeeTex,
            transparent: true,
            depthWrite: false,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const coffeeStainGeo = new THREE.PlaneGeometry(0.25, 0.25);
        const {canvas: pageCanvas, ctx: pageCtx} = this._createContext(64, 64);
        pageCtx.fillStyle = '#e8e5df';
        pageCtx.fillRect(0, 0, 64, 64);
        pageCtx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 64; i += 2) pageCtx.fillRect(0, i, 64, 0.5);
        const pageTex = new THREE.CanvasTexture(pageCanvas);
        const pageMat = new THREE.MeshStandardMaterial({map: pageTex, roughness: 0.9});
        const coverColors = ['#4a1a1a', '#1a2a4a', '#1a4a2a', '#4a3a1a', '#2a2a2a'];
        const bookMatSets = coverColors.map(color => {
            const {canvas: covCanvas, ctx: covCtx} = this._createContext(64, 64);
            covCtx.fillStyle = color;
            covCtx.fillRect(0, 0, 64, 64);
            covCtx.globalAlpha = 0.3;
            covCtx.drawImage(masterNoise, 0, 0, 64, 64);
            covCtx.globalAlpha = 1.0;
            covCtx.fillStyle = 'rgba(0,0,0,0.4)';
            covCtx.fillRect(10, 0, 4, 64);
            covCtx.fillRect(50, 0, 4, 64);
            const covTex = new THREE.CanvasTexture(covCanvas);
            const covMat = new THREE.MeshStandardMaterial({map: covTex, roughness: 0.8});
            return [pageMat, pageMat, covMat, covMat, pageMat, covMat];
        });
        return {archiveWallMat, archiveFloorMat, paperMat, paperGeo, coffeeStainMat, coffeeStainGeo, bookMatSets};
    }

    /**
     * Checkpoint's own floor and ceiling treatment -- previously a flat gray noise-speckle
     * "concrete" floor and the generic `structMat` borrowed for its ceiling, neither of which
     * belonged to the sector specifically. Replaced with an aged basket-weave hardwood parquet
     * floor and a Victorian-style pressed tin ceiling (embossed square panels, each with its own
     * rosette medallion) -- the "old government building" look the checkpoint's hazmat-and-forms
     * dressing already implies but its surfaces didn't back up.
     */
    static _buildCheckpointAssets(masterNoise) {
        // --- Hardwood Parquet Floor ---
        // Classic basket-weave parquet: a grid of blocks, each made of a few parallel planks,
        // alternating horizontal/vertical from one block to the next so adjoining blocks read as
        // interlocking rather than one continuous grain direction.
        const {canvas: ckFloorCanvas, ctx: ckFloorCtx} = this._createContext(256, 256);
        ckFloorCtx.fillStyle = '#5c4224';
        ckFloorCtx.fillRect(0, 0, 256, 256);
        const parquetBlocks = 4;
        const blockSize = 256 / parquetBlocks;
        const plankTones = ['#6b4c28', '#5c4224', '#7a5830', '#4f3a1f'];
        for (let by = 0; by < parquetBlocks; by++) {
            for (let bx = 0; bx < parquetBlocks; bx++) {
                const bxp = bx * blockSize, byp = by * blockSize;
                const horizontal = (bx + by) % 2 === 0;
                const planks = 4;
                const plankSize = blockSize / planks;
                for (let p = 0; p < planks; p++) {
                    ckFloorCtx.fillStyle = plankTones[(bx * 3 + by * 5 + p) % plankTones.length];
                    if (horizontal) {
                        ckFloorCtx.fillRect(bxp, byp + p * plankSize, blockSize, plankSize - 1);
                    } else {
                        ckFloorCtx.fillRect(bxp + p * plankSize, byp, plankSize - 1, blockSize);
                    }
                    // Grain streaks running along each plank's own length.
                    ckFloorCtx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ckFloorCtx.lineWidth = 1;
                    for (let g = 0; g < 3; g++) {
                        ckFloorCtx.beginPath();
                        if (horizontal) {
                            const gy = byp + p * plankSize + 2 + Math.random() * (plankSize - 4);
                            ckFloorCtx.moveTo(bxp, gy);
                            ckFloorCtx.lineTo(bxp + blockSize, gy + (Math.random() - 0.5) * 3);
                        } else {
                            const gx = bxp + p * plankSize + 2 + Math.random() * (plankSize - 4);
                            ckFloorCtx.moveTo(gx, byp);
                            ckFloorCtx.lineTo(gx + (Math.random() - 0.5) * 3, byp + blockSize);
                        }
                        ckFloorCtx.stroke();
                    }
                }
                // The block's own border reads as the basket-weave seam between blocks.
                ckFloorCtx.strokeStyle = 'rgba(0,0,0,0.35)';
                ckFloorCtx.lineWidth = 2;
                ckFloorCtx.strokeRect(bxp, byp, blockSize, blockSize);
            }
        }
        // Aged, grimy overlay plus a handful of darker worn/scuffed patches -- an "old" floor
        // reads through wear, not just a wood-tone palette.
        ckFloorCtx.globalAlpha = 0.14;
        ckFloorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ckFloorCtx.globalAlpha = 1.0;
        for (let i = 0; i < 10; i++) {
            const wx = Math.random() * 256, wy = Math.random() * 256, wr = 8 + Math.random() * 22;
            const grad = ckFloorCtx.createRadialGradient(wx, wy, 0, wx, wy, wr);
            grad.addColorStop(0, 'rgba(0,0,0,0.16)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ckFloorCtx.fillStyle = grad;
            ckFloorCtx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
        }
        const checkpointFloorTexture = this._createWrappedTexture(ckFloorCanvas, 12, 12);
        const checkpointFloorMat = new THREE.MeshStandardMaterial({
            map: checkpointFloorTexture,
            roughness: 0.88,
            metalness: 0.02,
            bumpMap: checkpointFloorTexture,
            bumpScale: 0.012
        });

        // --- Pressed Tin Ceiling ---
        const {canvas: ckCeilCanvas, ctx: ckCeilCtx} = this._createContext(256, 256);
        ckCeilCtx.fillStyle = '#a79c86';
        ckCeilCtx.fillRect(0, 0, 256, 256);
        ckCeilCtx.globalAlpha = 0.10;
        ckCeilCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ckCeilCtx.globalAlpha = 1.0;
        // Patina: patches of oxidation bleeding across a couple of panels, like an old tin
        // ceiling nobody's repainted in decades.
        for (let i = 0; i < 6; i++) {
            const px = Math.random() * 256, py = Math.random() * 256, pr = 14 + Math.random() * 26;
            const grad = ckCeilCtx.createRadialGradient(px, py, 0, px, py, pr);
            grad.addColorStop(0, 'rgba(120, 90, 40, 0.18)');
            grad.addColorStop(1, 'rgba(120, 90, 40, 0)');
            ckCeilCtx.fillStyle = grad;
            ckCeilCtx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
        // A dedicated bump canvas for the embossed relief -- flat mid-gray base so bumpScale
        // reads as neutral everywhere there's no relief, with the bevels and medallion drawn in
        // actual light/dark strokes so the "pressed" look survives regardless of the color map's
        // own patina noise (same split-color/bump-canvas technique as clinicMat's bump pass).
        const {canvas: ckCeilBumpCanvas, ctx: ckCeilBumpCtx} = this._createContext(256, 256);
        ckCeilBumpCtx.fillStyle = '#808080';
        ckCeilBumpCtx.fillRect(0, 0, 256, 256);
        const drawTinTile = (colorCtx, bumpCtx, tx, ty, size) => {
            const inset = size * 0.08;
            // Beveled border: a light stroke and a dark stroke offset a couple pixels apart fake
            // a pressed-metal lip catching light from one side.
            colorCtx.strokeStyle = 'rgba(255,255,255,0.35)';
            colorCtx.lineWidth = 2;
            colorCtx.strokeRect(tx + inset, ty + inset, size - inset * 2, size - inset * 2);
            colorCtx.strokeStyle = 'rgba(0,0,0,0.3)';
            colorCtx.strokeRect(tx + inset + 2, ty + inset + 2, size - inset * 2 - 4, size - inset * 2 - 4);
            bumpCtx.strokeStyle = '#ffffff';
            bumpCtx.lineWidth = 3;
            bumpCtx.strokeRect(tx + inset, ty + inset, size - inset * 2, size - inset * 2);
            bumpCtx.strokeStyle = '#000000';
            bumpCtx.lineWidth = 2;
            bumpCtx.strokeRect(tx + inset + 3, ty + inset + 3, size - inset * 2 - 6, size - inset * 2 - 6);
            // Central rosette medallion -- the classic motif stamped into real Victorian
            // pressed-tin ceiling panels.
            const cx = tx + size / 2, cy = ty + size / 2;
            const petals = 8;
            const petalLen = size * 0.28;
            for (let p = 0; p < petals; p++) {
                const angle = (p / petals) * Math.PI * 2;
                const ex = cx + Math.cos(angle) * petalLen;
                const ey = cy + Math.sin(angle) * petalLen;
                colorCtx.strokeStyle = 'rgba(0,0,0,0.25)';
                colorCtx.lineWidth = 3;
                colorCtx.beginPath();
                colorCtx.moveTo(cx, cy);
                colorCtx.lineTo(ex, ey);
                colorCtx.stroke();
                colorCtx.strokeStyle = 'rgba(255,255,255,0.3)';
                colorCtx.lineWidth = 1;
                colorCtx.beginPath();
                colorCtx.moveTo(cx, cy);
                colorCtx.lineTo(ex, ey);
                colorCtx.stroke();
                bumpCtx.strokeStyle = '#e8e8e8';
                bumpCtx.lineWidth = 3;
                bumpCtx.beginPath();
                bumpCtx.moveTo(cx, cy);
                bumpCtx.lineTo(ex, ey);
                bumpCtx.stroke();
            }
            colorCtx.fillStyle = 'rgba(255,255,255,0.4)';
            colorCtx.beginPath();
            colorCtx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
            colorCtx.fill();
            bumpCtx.fillStyle = '#ffffff';
            bumpCtx.beginPath();
            bumpCtx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
            bumpCtx.fill();
        };
        const tinTiles = 2;
        const tinTileSize = 256 / tinTiles;
        for (let ty = 0; ty < tinTiles; ty++) {
            for (let tx = 0; tx < tinTiles; tx++) {
                drawTinTile(ckCeilCtx, ckCeilBumpCtx, tx * tinTileSize, ty * tinTileSize, tinTileSize);
            }
        }
        // 32x instead of 8x: each physical tile a quarter the linear size (4x as many packed
        // into the same span) -- the original repeat count read as oversized and stretched
        // once seen at actual ceiling scale.
        const checkpointCeilingTexture = this._createWrappedTexture(ckCeilCanvas, 32, 32);
        const checkpointCeilingBumpTexture = this._createWrappedTexture(ckCeilBumpCanvas, 32, 32);
        const checkpointCeilingMat = new THREE.MeshStandardMaterial({
            map: checkpointCeilingTexture,
            bumpMap: checkpointCeilingBumpTexture,
            bumpScale: 0.05,
            // roughness alone is what kills a visible specular hotspot (see the Boardroom
            // ceiling fix for the same lesson) -- metalness is left at 0.65 so the surface still
            // reads as tin rather than painted plaster, it just scatters that reflectance
            // diffusely across an aged, oxidized surface instead of concentrating it into a
            // glare under the new, denser hallway lighting.
            roughness: 0.92,
            metalness: 0.65
        });

        return {checkpointFloorMat, checkpointCeilingMat};
    }

    static _buildExtendedAssets(masterNoise) {
        const dpCanvas = document.createElement('canvas');
        dpCanvas.width = dpCanvas.height = 256;
        const dpc = dpCanvas.getContext('2d');
        dpc.fillStyle = '#33343a';
        dpc.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 60; i++) {
            dpc.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
            dpc.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 30, 1 + Math.random() * 3);
        }
        for (let gy = 0; gy < 8; gy++) {
            for (let gx = 0; gx < 8; gx++) {
                dpc.save();
                dpc.translate(gx * 32 + 16, gy * 32 + 16);
                dpc.rotate(((gx + gy) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4);
                for (let k = -1; k <= 1; k++) {
                    dpc.fillStyle = '#4a4c55';
                    dpc.strokeStyle = '#22232a';
                    dpc.beginPath();
                    dpc.rect(-10, k * 9 - 2.5, 20, 5);
                    dpc.fill();
                    dpc.stroke();
                    dpc.fillStyle = 'rgba(255,255,255,0.10)';
                    dpc.fillRect(-10, k * 9 - 2.5, 20, 1.5);
                }
                dpc.restore();
            }
        }
        const dpTex = new THREE.CanvasTexture(dpCanvas);
        dpTex.wrapS = dpTex.wrapT = THREE.RepeatWrapping;
        dpTex.repeat.set(14, 14);
        const diamondPlateMat = new THREE.MeshStandardMaterial({
            map: dpTex, bumpMap: dpTex, bumpScale: 0.05, metalness: 0.25, roughness: 0.75
        });
        
        // 2. Incinerator Ceiling Panels (Dark, soot-stained industrial ceiling)
        const ccv = document.createElement('canvas');
        ccv.width = ccv.height = 256;
        const cpx = ccv.getContext('2d');
        cpx.fillStyle = '#191411';
        cpx.fillRect(0, 0, 256, 256);
        for (let py = 0; py < 4; py++) {
            for (let px = 0; px < 4; px++) {
                const shade = 18 + Math.floor(Math.random() * 14);
                cpx.fillStyle = `rgb(${shade + 6},${shade},${Math.max(0, shade - 4)})`;
                cpx.fillRect(px * 64 + 1, py * 64 + 1, 62, 62);
                cpx.fillStyle = '#0d0b09';
                [[6, 6], [58, 6], [6, 58], [58, 58], [32, 6], [6, 32], [58, 32], [32, 58]].forEach(rv => {
                    cpx.beginPath();
                    cpx.arc(px * 64 + rv[0], py * 64 + rv[1], 2.2, 0, Math.PI * 2);
                    cpx.fill();
                });
                cpx.fillStyle = 'rgba(255,255,255,0.06)';
                [[6, 6], [58, 6], [6, 58], [58, 58]].forEach(rv => {
                    cpx.beginPath();
                    cpx.arc(px * 64 + rv[0] - 0.7, py * 64 + rv[1] - 0.7, 1.0, 0, Math.PI * 2);
                    cpx.fill();
                });
            }
        }
        cpx.strokeStyle = '#0a0908';
        cpx.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
            cpx.beginPath();
            cpx.moveTo(i * 64, 0);
            cpx.lineTo(i * 64, 256);
            cpx.stroke();
            cpx.beginPath();
            cpx.moveTo(0, i * 64);
            cpx.lineTo(256, i * 64);
            cpx.stroke();
        }
        for (let i = 0; i < 10; i++) {
            const sx = Math.random() * 256, sy = Math.random() * 256, sr = 20 + Math.random() * 45;
            const sGrad = cpx.createRadialGradient(sx, sy, 2, sx, sy, sr);
            sGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
            sGrad.addColorStop(1, 'rgba(0,0,0,0)');
            cpx.fillStyle = sGrad;
            cpx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        }
        cpx.strokeStyle = 'rgba(220,80,20,0.5)';
        cpx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            let ex = Math.random() * 256, ey = Math.random() * 256;
            cpx.beginPath();
            cpx.moveTo(ex, ey);
            for (let s = 0; s < 5; s++) {
                ex += (Math.random() - 0.5) * 22;
                ey += (Math.random() - 0.5) * 22;
                cpx.lineTo(ex, ey);
            }
            cpx.stroke();
        }
        const ceilTex = new THREE.CanvasTexture(ccv);
        ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
        ceilTex.repeat.set(7, 7);
        const incinCeilingMat = new THREE.MeshStandardMaterial({
            map: ceilTex, bumpMap: ceilTex, bumpScale: 0.03, metalness: 0.3, roughness: 0.9
        });
        
        // 3. Office Drop Ceiling Tiles (Board Tile)
        const btc = document.createElement('canvas');
        btc.width = btc.height = 256;
        const btx = btc.getContext('2d');
        btx.fillStyle = '#b3aea4';
        btx.fillRect(0, 0, 256, 256);
        for (let ty = 0; ty < 2; ty++) {
            for (let tx = 0; tx < 2; tx++) {
                const sh = 172 + Math.floor(Math.random() * 14);
                btx.fillStyle = `rgb(${sh},${sh - 3},${sh - 10})`;
                btx.fillRect(tx * 128 + 2, ty * 128 + 2, 124, 124);
            }
        }
        for (let i = 0; i < 40; i++) {
            btx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
            btx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 40, 1);
        }
        btx.strokeStyle = '#8d887e';
        btx.lineWidth = 3;
        btx.strokeRect(0, 0, 256, 256);
        btx.beginPath();
        btx.moveTo(128, 0);
        btx.lineTo(128, 256);
        btx.stroke();
        btx.beginPath();
        btx.moveTo(0, 128);
        btx.lineTo(256, 128);
        btx.stroke();
        const btTex = new THREE.CanvasTexture(btc);
        btTex.wrapS = btTex.wrapT = THREE.RepeatWrapping;
        btTex.repeat.set(14, 14);
        const boardTileMat = new THREE.MeshStandardMaterial({map: btTex, roughness: 0.6, metalness: 0.1});
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xbfe3ef, transparent: true, opacity: 0.22,
            roughness: 0.08, metalness: 0.1, depthWrite: false
        });
        
        // 4. Bookshelf Spines (Procedurally generated random book widths/colors)
        const bkc = document.createElement('canvas');
        bkc.width = 256;
        bkc.height = 128;
        const bkx = bkc.getContext('2d');
        bkx.fillStyle = '#17130f';
        bkx.fillRect(0, 0, 256, 128);
        const spinePalette = ['#6b3a34', '#3e4a63', '#5a5e46', '#7a6748', '#54504e', '#463b52', '#70543a', '#33413e'];
        let spineX = 0;
        while (spineX < 252) {
            const sw = 6 + Math.floor(Math.random() * 9);
            if (Math.random() > 0.08) {
                const sh = 96 + Math.floor(Math.random() * 28);
                bkx.fillStyle = spinePalette[Math.floor(Math.random() * spinePalette.length)];
                bkx.fillRect(spineX, 128 - sh, sw, sh);
                bkx.fillStyle = 'rgba(255,255,255,0.08)';
                bkx.fillRect(spineX, 128 - sh, 1, sh);
                bkx.fillStyle = 'rgba(0,0,0,0.35)';
                bkx.fillRect(spineX + sw - 1, 128 - sh, 1, sh);
                if (Math.random() > 0.5) {
                    bkx.fillStyle = 'rgba(210,190,140,0.35)';
                    bkx.fillRect(spineX + 1, 128 - sh + 8 + Math.floor(Math.random() * 20), sw - 2, 2);
                }
            }
            spineX += sw + 1;
        }
        const bkTex = new THREE.CanvasTexture(bkc);
        bkTex.wrapS = bkTex.wrapT = THREE.RepeatWrapping;
        bkTex.repeat.set(3, 1);
        const bookRowMat = new THREE.MeshStandardMaterial({map: bkTex, roughness: 0.9, metalness: 0.0});
        
        // 5. Cardboard Box Textures (File Box, Moving Box, Banana Box, Parcel)
        const fbc = document.createElement('canvas');
        fbc.width = fbc.height = 128;
        const fbx = fbc.getContext('2d');
        fbx.fillStyle = '#b59a6d';
        fbx.fillRect(0, 0, 128, 128);
        fbx.fillStyle = 'rgba(0,0,0,0.12)';
        fbx.fillRect(0, 0, 128, 8);
        fbx.fillRect(0, 56, 128, 6);
        fbx.fillStyle = '#e8e2d2';
        fbx.fillRect(38, 72, 52, 26);
        fbx.strokeStyle = '#8a7a55';
        fbx.strokeRect(38, 72, 52, 26);
        fbx.fillStyle = 'rgba(60,50,30,0.5)';
        fbx.fillRect(44, 80, 40, 2);
        fbx.fillRect(44, 86, 28, 2);
        const fbTex = new THREE.CanvasTexture(fbc);
        const fileBoxMat = new THREE.MeshStandardMaterial({map: fbTex, roughness: 0.85, metalness: 0.0});
        const mvc = document.createElement('canvas');
        mvc.width = mvc.height = 128;
        const mvx = mvc.getContext('2d');
        mvx.fillStyle = '#a97e52';
        mvx.fillRect(0, 0, 128, 128);
        mvx.fillStyle = 'rgba(0,0,0,0.10)';
        mvx.fillRect(0, 118, 128, 10);
        mvx.fillRect(0, 0, 4, 128);
        mvx.fillRect(124, 0, 4, 128);
        mvx.fillStyle = 'rgba(196,178,142,0.85)';
        mvx.fillRect(0, 18, 128, 14);
        mvx.fillStyle = 'rgba(0,0,0,0.18)';
        mvx.fillRect(0, 24, 128, 2);
        mvx.strokeStyle = '#2a2118';
        mvx.lineWidth = 3;
        mvx.beginPath();
        mvx.moveTo(24, 76);
        mvx.lineTo(52, 72);
        mvx.lineTo(78, 78);
        mvx.lineTo(102, 74);
        mvx.stroke();
        mvx.lineWidth = 2;
        mvx.beginPath();
        mvx.moveTo(30, 92);
        mvx.lineTo(66, 90);
        mvx.lineTo(88, 94);
        mvx.stroke();
        mvx.fillStyle = '#2a2118';
        mvx.beginPath();
        mvx.moveTo(112, 52);
        mvx.lineTo(106, 62);
        mvx.lineTo(118, 62);
        mvx.closePath();
        mvx.fill();
        mvx.fillRect(110, 62, 4, 10);
        const mvTex = new THREE.CanvasTexture(mvc);
        const movingBoxMat = new THREE.MeshStandardMaterial({map: mvTex, roughness: 0.85, metalness: 0.0});
        const bnc = document.createElement('canvas');
        bnc.width = bnc.height = 128;
        const bnx = bnc.getContext('2d');
        bnx.fillStyle = '#b08d5a';
        bnx.fillRect(0, 0, 128, 128);
        bnx.fillStyle = 'rgba(0,0,0,0.12)';
        bnx.fillRect(0, 0, 128, 6);
        bnx.fillRect(0, 122, 128, 6);
        bnx.fillStyle = '#241a10';
        bnx.fillRect(44, 12, 40, 13);
        bnx.fillStyle = '#1c4f8f';
        bnx.beginPath();
        bnx.ellipse(64, 74, 40, 26, 0, 0, Math.PI * 2);
        bnx.fill();
        bnx.fillStyle = '#f7d64a';
        bnx.beginPath();
        bnx.ellipse(64, 74, 29, 17, 0, 0, Math.PI * 2);
        bnx.fill();
        bnx.strokeStyle = '#1c4f8f';
        bnx.lineWidth = 3;
        bnx.beginPath();
        bnx.moveTo(48, 78);
        bnx.quadraticCurveTo(64, 62, 80, 78);
        bnx.stroke();
        const bnTex = new THREE.CanvasTexture(bnc);
        const bananaBoxMat = new THREE.MeshStandardMaterial({map: bnTex, roughness: 0.85, metalness: 0.0});
        const pcc = document.createElement('canvas');
        pcc.width = pcc.height = 128;
        const pcx2 = pcc.getContext('2d');
        pcx2.fillStyle = '#8f6a42';
        pcx2.fillRect(0, 0, 128, 128);
        pcx2.fillStyle = '#2b2b2e';
        pcx2.fillRect(0, 16, 128, 16);
        pcx2.strokeStyle = '#e8e8ea';
        pcx2.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            pcx2.beginPath();
            pcx2.moveTo(8 + i * 16, 20);
            pcx2.lineTo(14 + i * 16, 24);
            pcx2.lineTo(8 + i * 16, 28);
            pcx2.stroke();
        }
        pcx2.fillStyle = '#efece4';
        pcx2.fillRect(30, 56, 68, 48);
        pcx2.fillStyle = 'rgba(40,40,40,0.6)';
        pcx2.fillRect(36, 62, 44, 2);
        pcx2.fillRect(36, 68, 30, 2);
        pcx2.fillStyle = '#1a1a1a';
        let barX = 36;
        while (barX < 90) {
            const bw = 1 + Math.floor(Math.random() * 3);
            pcx2.fillRect(barX, 84, bw, 14);
            barX += bw + 1 + Math.floor(Math.random() * 3);
        }
        pcx2.strokeStyle = '#c8771f';
        pcx2.lineWidth = 3;
        pcx2.beginPath();
        pcx2.moveTo(40, 44);
        pcx2.quadraticCurveTo(64, 54, 88, 44);
        pcx2.stroke();
        pcx2.fillStyle = '#c8771f';
        pcx2.beginPath();
        pcx2.moveTo(88, 38);
        pcx2.lineTo(94, 45);
        pcx2.lineTo(85, 48);
        pcx2.closePath();
        pcx2.fill();
        const pcTex = new THREE.CanvasTexture(pcc);
        const parcelBoxMat = new THREE.MeshStandardMaterial({map: pcTex, roughness: 0.85, metalness: 0.0});
        const cartonMats = [fileBoxMat, movingBoxMat, bananaBoxMat, parcelBoxMat];
        
        // 6. Foliage (Procedural leaf blobs used for potted plants)
        const flc = document.createElement('canvas');
        flc.width = flc.height = 128;
        const flx = flc.getContext('2d');
        flx.fillStyle = '#2c3d24';
        flx.fillRect(0, 0, 128, 128);
        const leafShades = ['#3a5230', '#243620', '#4a6238', '#31452a', '#556b3e'];
        for (let i = 0; i < 260; i++) {
            flx.fillStyle = leafShades[Math.floor(Math.random() * leafShades.length)];
            flx.beginPath();
            flx.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 7, 0, Math.PI * 2);
            flx.fill();
        }
        flx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 40; i++) {
            flx.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 10, 1 + Math.random() * 3);
        }
        const flTex = new THREE.CanvasTexture(flc);
        flTex.wrapS = flTex.wrapT = THREE.RepeatWrapping;
        const foliageMat = new THREE.MeshStandardMaterial({map: flTex, roughness: 0.95, metalness: 0.0});
        
        // 7. Far Void (The endless abyss outside the playable area, implemented as a dark gradient with faint vertical streaks)
        const fvc = document.createElement('canvas');
        fvc.width = 256;
        fvc.height = 128;
        const fvx = fvc.getContext('2d');
        const fvGrad = fvx.createLinearGradient(0, 0, 0, 128);
        fvGrad.addColorStop(0, '#000000');
        fvGrad.addColorStop(0.55, '#020402');
        fvGrad.addColorStop(1, '#060c05');
        fvx.fillStyle = fvGrad;
        fvx.fillRect(0, 0, 256, 128);
        const fvRows = [
            {c: '#0a120a', n: 90, hMin: 18, hMax: 34},
            {c: '#0e1a0b', n: 55, hMin: 30, hMax: 52},
            {c: '#132410', n: 32, hMin: 46, hMax: 74}
        ];
        for (let ri = 0; ri < fvRows.length; ri++) {
            const row = fvRows[ri];
            fvx.strokeStyle = row.c;
            for (let i = 0; i < row.n; i++) {
                const sx0 = Math.random() * 256;
                const sh = row.hMin + Math.random() * (row.hMax - row.hMin);
                fvx.lineWidth = 1 + Math.random() * 2;
                fvx.beginPath();
                fvx.moveTo(sx0, 128);
                fvx.lineTo(sx0 + (Math.random() - 0.5) * 6, 128 - sh);
                fvx.stroke();
            }
        }
        const fvTex = new THREE.CanvasTexture(fvc);
        fvTex.wrapS = fvTex.wrapT = THREE.RepeatWrapping;
        const farVoidMat = new THREE.MeshBasicMaterial({map: fvTex});
        // checkpointFloorMat and checkpointCeilingMat used to live here as a flat gray
        // noise-speckle concrete texture -- moved to their own dedicated `_buildCheckpointAssets`
        // (see below) along with a new pressed-tin ceiling, so Checkpoint gets the same
        // per-sector floor/ceiling treatment Annex, Impound, and Archive already have instead of
        // borrowing a generic surface.
        // checkpointLineMat/checkpointLineCrossMat (the red/yellow/blue queue-line floor decals)
        // used to be generated here -- removed along with the meshes that used them
        // (CheckpointSector.js, SetPieces.js buildEntranceHallways) once they started clashing
        // against the new hardwood parquet floor.
        const coneCanvas = document.createElement('canvas');
        coneCanvas.width = 256; coneCanvas.height = 256;
        const cCtx = coneCanvas.getContext('2d');
        cCtx.fillStyle = '#ff5500';
        cCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 300; i++) {
            cCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
            cCtx.beginPath();
            cCtx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 4, 0, Math.PI * 2);
            cCtx.fill();
        }
        
        const coneBaseCanvas = document.createElement('canvas');
        coneBaseCanvas.width = 256; coneBaseCanvas.height = 256;
        coneBaseCanvas.getContext('2d').drawImage(coneCanvas, 0, 0);

        cCtx.fillStyle = '#eeeeee';
        cCtx.fillRect(0, 60, 256, 35);
        cCtx.fillRect(0, 115, 256, 35);
        for (let i = 0; i < 150; i++) {
            cCtx.fillStyle = `rgba(50,30,10,${Math.random() * 0.2})`;
            cCtx.fillRect(Math.random() * 256, 50 + Math.random() * 110, Math.random() * 20, 2 + Math.random() * 4);
        }
        const coneTex = new THREE.CanvasTexture(coneCanvas);
        const cautionConeMat = new THREE.MeshStandardMaterial({
            map: coneTex, roughness: 0.9, metalness: 0.1
        });
        
        const coneBaseTex = new THREE.CanvasTexture(coneBaseCanvas);
        const cautionConeBaseMat = new THREE.MeshStandardMaterial({
            map: coneBaseTex, roughness: 0.9, metalness: 0.1
        });

        const valveCanvas = document.createElement('canvas');
        valveCanvas.width = 256; valveCanvas.height = 256;
        const vCtx = valveCanvas.getContext('2d');
        vCtx.fillStyle = '#992211';
        vCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 300; i++) {
            vCtx.fillStyle = '#222222';
            vCtx.beginPath();
            vCtx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 4, 0, Math.PI * 2);
            vCtx.fill();
            vCtx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 10, Math.random() * 10);
        }
        const valveTex = new THREE.CanvasTexture(valveCanvas);
        const valveMat = new THREE.MeshStandardMaterial({
            map: valveTex, roughness: 0.7, metalness: 0.3
        });

        return {
            diamondPlateMat, incinCeilingMat, boardTileMat, glassMat, bookRowMat,
            fileBoxMat, movingBoxMat, bananaBoxMat, parcelBoxMat, cartonMats,
            foliageMat, farVoidMat,
            cautionConeMat, cautionConeBaseMat, valveMat
        };
    }

    /**
     * Yields a single tick back to the browser's event loop. Used to break up the long chain
     * of synchronous canvas drawing in `generateAssets` so a slow boot doesn't present as one
     * unbroken multi-hundred-millisecond freeze -- the browser gets a chance to paint (e.g. the
     * spawn flash-overlay `Environment.setup()` raises before calling this) and stay responsive
     * to input between asset groups, the same way `processChunkQueue` yields between chunks.
     */
    static _yield() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    static async generateAssets() {
        const masterNoise = this._generateMasterNoise();
        const structAssets = this._buildStructuralAssets(masterNoise);
        await this._yield();
        const surfaceAssets = this._buildSurfaceAssets(masterNoise);
        await this._yield();
        const organicAssets = this._buildOrganicAssets(masterNoise);
        await this._yield();
        const techAssets = this._buildTechAssets(masterNoise);
        await this._yield();
        const hazardAssets = this._buildHazardAndMiscAssets(masterNoise);
        await this._yield();
        const annexAssets = this._buildAnnexAssets(masterNoise);
        await this._yield();
        const impoundAssets = this._buildImpoundAssets(masterNoise);
        await this._yield();
        const boardroomAssets = this._buildBoardroomAssets(masterNoise);
        await this._yield();
        const atriumAssets = this._buildAtriumAssets(masterNoise);
        await this._yield();
        const maintenanceAssets = this._buildMaintenanceAssets(masterNoise);
        await this._yield();
        const archiveAssets = this._buildArchiveAssets(masterNoise);
        await this._yield();
        const checkpointAssets = this._buildCheckpointAssets(masterNoise);
        await this._yield();
        const extendedAssets = this._buildExtendedAssets(masterNoise);
        const assets = {
            ...structAssets,
            ...surfaceAssets,
            ...organicAssets,
            ...techAssets,
            ...hazardAssets,
            ...annexAssets,
            ...impoundAssets,
            ...boardroomAssets,
            ...atriumAssets,
            ...maintenanceAssets,
            ...archiveAssets,
            ...checkpointAssets,
            ...extendedAssets
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