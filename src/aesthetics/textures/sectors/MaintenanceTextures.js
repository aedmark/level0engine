import TextureMechanics from '../TextureMechanics.js';

export default class MaintenanceTextures {
    static _buildMaintenanceAssets(masterNoise) {
        const {canvas: leakCanvas, ctx: leakCtx} = TextureMechanics._createContext(256, 256, false);
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
}
