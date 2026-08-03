import TextureMechanics from '../TextureMechanics.js';
import PropTextures from './PropTextures.js';

export default class HazardTextures {
    static _buildHazardAndMiscAssets(masterNoise) {
        const {canvas: fenceCanvas, ctx: fenceCtx} = TextureMechanics._createContext(64, 64, false);
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
        const fenceTex = TextureMechanics._createWrappedTexture(fenceCanvas, 12, 12);
        const fenceMat = new THREE.MeshStandardMaterial({
            map: fenceTex,
            roughness: 0.4,
            metalness: 0.9,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        const hazardBumpTexture = TextureMechanics._createWrappedTexture(masterNoise, 2, 2);
        const hazardMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            bumpMap: hazardBumpTexture,
            bumpScale: 0.001,
            roughness: 0.001,
            metalness: 0.001
        });
        const {canvas: glowCanvas, ctx: glowCtx} = TextureMechanics._createContext(256, 256, false);
        const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
        glowGrad.addColorStop(0, 'rgba(255, 255, 220, 0.15)');
        glowGrad.addColorStop(0.15, 'rgba(255, 255, 220, 0.04)');
        glowGrad.addColorStop(0.4, 'rgba(255, 255, 220, 0.01)');
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
        const flareMat = new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glowGeo = new THREE.PlaneGeometry(3.8, 3.8);
        glowGeo.rotateX(-Math.PI / 2);
        const {canvas: tagCanvas, ctx: tagCtx} = TextureMechanics._createContext(128, 128, false);
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
        const voidTexture = TextureMechanics._createWrappedTexture(masterNoise);
        const voidMat = new THREE.MeshStandardMaterial({
            color: 0x020202,
            roughness: 0.4,
            metalness: 0.8,
            bumpMap: voidTexture,
            bumpScale: 0.08
        });
        const rustMat = new THREE.MeshStandardMaterial({color: 0x3a1c14, roughness: 1.0, metalness: 0.3});
        const metalMat = new THREE.MeshStandardMaterial({color: 0x999999, roughness: 0.35, metalness: 0.95});
        const {canvas: pittedCanvas, ctx: pittedCtx} = TextureMechanics._createContext(256, 256);
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
        const pittedMetalTexture = TextureMechanics._createWrappedTexture(pittedCanvas, 2, 2);
        const pittedMetalMat = new THREE.MeshStandardMaterial({
            map: pittedMetalTexture,
            color: 0xffffff,
            bumpMap: pittedMetalTexture,
            bumpScale: 0.025,
            roughness: 0.55,
            metalness: 0.75
        });
        const {canvas: almondCanvas, ctx: aCtx} = TextureMechanics._createContext(256, 256);
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
        const {canvas: tiCanvas, ctx: tiCtx} = TextureMechanics._createContext(256, 512);
        const tiGrad = tiCtx.createLinearGradient(0, 0, 0, 512);
        tiGrad.addColorStop(0, '#c0c8d0');
        tiGrad.addColorStop(1, '#808a94');
        tiCtx.fillStyle = tiGrad;
        tiCtx.fillRect(0, 0, 256, 512);
        tiCtx.lineWidth = 1;
        for (let y = 0; y < 512; y += 2) {
            tiCtx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
            tiCtx.beginPath();
            tiCtx.moveTo(0, y);
            tiCtx.lineTo(256, y);
            tiCtx.stroke();
            tiCtx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
            tiCtx.beginPath();
            tiCtx.moveTo(0, y + 1);
            tiCtx.lineTo(256, y + 1);
            tiCtx.stroke();
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
        const tiTex = TextureMechanics._createWrappedTexture(tiCanvas, 1, 1);
        const titaniumMat = new THREE.MeshStandardMaterial({
            map: tiTex,
            roughness: 0.35,
            metalness: 0.4,
            bumpMap: tiTex,
            bumpScale: 0.005
        });
        return {
            fenceMat,
            hazardMat,
            glowMat,
            flareMat,
            glowGeo,
            tagMat,
            tagGeo,
            voidMat,
            rustMat,
            metalMat,
            pittedMetalMat,
            almondMat,
            titaniumMat,
            pipeMat: PropTextures._buildPipeMaterial(masterNoise),
            breakerPanelMat: PropTextures._buildBreakerPanelMaterial(masterNoise),
            stainlessMat: PropTextures._buildStainlessMaterial(masterNoise),
            stainlessDoorMat: PropTextures._buildStainlessDoorMaterial(masterNoise),
            corrosionBumpTexture: PropTextures._buildCorrosionBump()
        };
    }
}
