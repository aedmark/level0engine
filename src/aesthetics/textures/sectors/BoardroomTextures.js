import TextureMechanics from '../TextureMechanics.js';

export default class BoardroomTextures {
    static _buildBoardroomAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = TextureMechanics._createContext(512, 512);
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
        const boardWallTexture = TextureMechanics._createWrappedTexture(wallCanvas, 4, 1, true);
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
}
