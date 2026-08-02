import TextureMechanics from '../TextureMechanics.js';

export default class ImpoundTextures {
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
        const {canvas: wallCanvas, ctx: wallCtx} = TextureMechanics._createContext(512, 512);
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
        const {canvas: ceilCanvas, ctx: ceilCtx} = TextureMechanics._createContext(512, 512);
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
        const impoundCeilingTexture = TextureMechanics._createWrappedTexture(ceilCanvas, 8, 8);
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
}
