import TextureMechanics from '../TextureMechanics.js';

export default class TechTextures {
    static _buildFlangeAsset(masterNoise) {
        const {canvas: flangeCanvas, ctx: flangeCtx} = TextureMechanics._createContext(256, 256);
        flangeCtx.fillStyle = '#8a9296';
        flangeCtx.fillRect(0, 0, 256, 256);
        flangeCtx.globalAlpha = 0.4;
        flangeCtx.drawImage(masterNoise, 0, 0, 256, 256);
        flangeCtx.globalAlpha = 1.0;
        flangeCtx.lineWidth = 6;
        flangeCtx.strokeStyle = '#5a6266';
        flangeCtx.strokeRect(3, 3, 250, 250);
        
        const flangeTexture = TextureMechanics._createWrappedTexture(flangeCanvas, 2, 2);
        return new THREE.MeshStandardMaterial({
            map: flangeTexture,
            roughness: 0.5,
            metalness: 0.9,
            bumpMap: flangeTexture,
            bumpScale: 0.02
        });
    }

    static _buildTechAssets(masterNoise) {
        const {canvas: ventCanvas, ctx: ventCtx} = TextureMechanics._createContext(512, 256);
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
        const ventTexture = TextureMechanics._createWrappedTexture(ventCanvas, 1, 1);
        const ventMat = new THREE.MeshStandardMaterial({
            map: ventTexture,
            roughness: 0.7,
            metalness: 0.15,
            bumpMap: ventTexture,
            bumpScale: 0.02
        });
        const {canvas: ductCanvas, ctx: ductCtx} = TextureMechanics._createContext(256, 256);
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
        const ductTexture = TextureMechanics._createWrappedTexture(ductCanvas, 2, 2);
        const ductMat = new THREE.MeshStandardMaterial({
            map: ductTexture,
            roughness: 0.55,
            metalness: 0.75,
            bumpMap: ductTexture,
            bumpScale: 0.01
        });
        const {canvas: serverCanvas, ctx: serverCtx} = TextureMechanics._createContext(256, 512);
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
        const serverTexture = TextureMechanics._createWrappedTexture(serverCanvas, 4, 1);
        const serverMat = new THREE.MeshStandardMaterial({map: serverTexture, roughness: 0.3, metalness: 0.8});
        const {canvas: lightCanvas, ctx: lightCtx} = TextureMechanics._createContext(128, 256);
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
            // Matte, not glossy: this panel sits directly in front of the point light
            // that represents its own fixture, so any specular response it has is a
            // reflection of its own bulb back at the camera. At the old roughness:0.3,
            // metalness:0.1 that read as a small, hard, blown-out hotspot on every
            // light in the level — the single most obnoxious case of the specular/
            // point-light mismatch this material system has. A diffuser panel doesn't
            // mirror its own lamp in real fixtures either, so matte is correct, not
            // just quieter.
            roughness: 0.9,
            metalness: 0
        });
        const baseBrokenLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0x8c9296,
            emissive: 0x1a1f24,
            emissiveIntensity: 1.0,
            roughness: 0.8,
            // Was implicitly THREE's default (0.5) — cracked plastic isn't metal either.
            metalness: 0
        });
        const baseHousingMat = new THREE.MeshStandardMaterial({color: 0x1a1a1a, roughness: 0.9});
        const matteLightMat = baseLightMat.clone();
        matteLightMat.metalness = 0;
        matteLightMat.roughness = 0.95;
        const matteBrokenLightMat = baseBrokenLightMat.clone();
        matteBrokenLightMat.metalness = 0;
        matteBrokenLightMat.roughness = 0.95;

        const flangeMat = TechTextures._buildFlangeAsset(masterNoise);

        return {
            ventMat,
            ductMat,
            serverMat,
            baseLightMat,
            baseBrokenLightMat,
            baseHousingMat,
            matteLightMat,
            matteBrokenLightMat,
            flangeMat
        };
    }
}
