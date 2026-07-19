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

        wallCtx.fillStyle = '#4a3d24';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#3a2d14';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);

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

        const {canvas: doorBackCanvas, ctx: doorBackCtx} = this._createContext(256, 512);
        doorBackCtx.translate(256, 0);
        doorBackCtx.scale(-1, 1);
        doorBackCtx.drawImage(doorCanvas, 0, 0);

        return {
            headerCanvas,
            wallCanvas,
            structCanvas,
            woodCanvas,
            doorCanvas,
            doorBackCanvas
        };
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

        const {canvas: tileCanvas, ctx: tileCtx} = this._createContext(256, 256);
        tileCtx.fillStyle = '#080808';
        tileCtx.fillRect(0, 0, 256, 256);
        tileCtx.strokeStyle = '#1a1a1a';
        tileCtx.lineWidth = 2;
        tileCtx.strokeRect(0, 0, 256, 256);
        tileCtx.globalAlpha = 0.15;
        tileCtx.drawImage(masterNoise, 0, 0, 256, 256);
        tileCtx.globalAlpha = 1.0;

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

        return {carpetCanvas, ceilingCanvas, tileCanvas, clinicCanvas, clinicBumpCanvas};
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

        return {moldCanvas, ceilStainCanvas, fabricCanvas, mossCanvas: fabricCanvas};
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
        ventCtx.fillStyle = slotColor;
        ventCtx.fillRect(slotX, slotY, slotWidth, slotHeight);
        const slatCount = 14, slatSpacing = Math.floor(slotHeight / slatCount), slatHeight = 8;
        for (let i = 0; i < slatCount; i++) {
            let yPos = slotY + (i * slatSpacing) + 2;
            ventCtx.fillStyle = '#a0a0a0';
            ventCtx.fillRect(slotX, yPos, slotWidth, slatHeight);
            ventCtx.fillStyle = '#d0d0d0';
            ventCtx.fillRect(slotX, yPos, slotWidth, 2);
            ventCtx.fillStyle = '#505050';
            ventCtx.fillRect(slotX, yPos + slatHeight - 2, slotWidth, 2);
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

        return {ventCanvas, serverCanvas, lightCanvas};
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

        const {canvas: glowCanvas, ctx: glowCtx} = this._createContext(256, 256);
        const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
        glowGrad.addColorStop(0, 'rgba(255, 255, 220, 0.035)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 220, 0)');
        glowCtx.fillStyle = glowGrad;
        glowCtx.fillRect(0, 0, 256, 256);

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

        return {fenceCanvas, hazardCanvas, glowCanvas, tagCanvas, almondCanvas, masterNoise};
    }

    static generateAssets() {
        const masterNoise = this._generateMasterNoise();
        const structAssets = this._buildStructuralAssets(masterNoise);
        const surfaceAssets = this._buildSurfaceAssets(masterNoise);
        const organicAssets = this._buildOrganicAssets(masterNoise);
        const techAssets = this._buildTechAssets(masterNoise);
        const hazardAssets = this._buildHazardAndMiscAssets(masterNoise);

        return {
            ...structAssets,
            ...surfaceAssets,
            ...organicAssets,
            ...techAssets,
            ...hazardAssets
        };
    }
}