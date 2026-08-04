/**
 * [ROLE] Generates textures for natural or agricultural materials (fabric, moss, corn, dirt, night sky).
 * [WHY] Enables dynamic variation in organic surfaces through procedural generation, avoiding tiling artifacts.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API; creates THREE.js materials.
 */
import TextureMechanics from '../TextureMechanics.js';
import SurfaceTextures from './SurfaceTextures.js';

export default class OrganicTextures {
    static _buildOrganicAssets(masterNoise) {
        const {canvas: fabricCanvas, ctx: fCtx} = TextureMechanics._createContext(256, 256);
        fCtx.fillStyle = '#5d7285';
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
        const fabricTexture = TextureMechanics._createWrappedTexture(fabricCanvas, 4, 4);
        const fabricMat = new THREE.MeshStandardMaterial({
            map: fabricTexture,
            roughness: 0.98,
            bumpMap: fabricTexture,
            bumpScale: 0.05
        });
        const mossTexture = TextureMechanics._createWrappedTexture(fabricCanvas, 32, 32);
        const mossMat = new THREE.MeshStandardMaterial({map: mossTexture, roughness: 1.0});
        const {canvas: cornCanvas, ctx: cornCtx} = TextureMechanics._createContext(256, 256);
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
        const cornTexture = TextureMechanics._createWrappedTexture(cornCanvas, 2, 1);
        const cornMat = new THREE.MeshStandardMaterial({
            map: cornTexture,
            roughness: 1.0,
            bumpMap: cornTexture,
            bumpScale: 0.05
        });
        const {canvas: dirtCanvas, ctx: dirtCtx} = TextureMechanics._createContext(256, 256);
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
        const dirtTexture = TextureMechanics._createWrappedTexture(dirtCanvas, 16, 16);
        const dirtMat = new THREE.MeshStandardMaterial({
            map: dirtTexture,
            roughness: 1.0,
            bumpMap: dirtTexture,
            bumpScale: 0.1
        });
        const {canvas: skyCanvas, ctx: skyCtx} = TextureMechanics._createContext(512, 512);
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
        const skyTexture = TextureMechanics._createWrappedTexture(skyCanvas, 4, 4);
        const nightSkyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            fog: false
        });
        return {
            fabricMat, mossMat, cornMat, dirtMat, nightSkyMat
        };
    }


}
