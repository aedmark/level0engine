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
        const coneCanvas = document.createElement('canvas');
        coneCanvas.width = 256;
        coneCanvas.height = 256;
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
        coneBaseCanvas.width = 256;
        coneBaseCanvas.height = 256;
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
        valveCanvas.width = 256;
        valveCanvas.height = 256;
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
        return {leakStainMat, leakStainGeo, cautionConeMat, cautionConeBaseMat, valveMat};
    }
}
