/**
 * [ROLE] Generates specialized procedural textures specific to the Boardroom sector.
 * [WHY] Sector-specific aesthetics require unique material generation without bloating the global texture pools.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API.
 */
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
        btTex.repeat.set(40, 40);
        const boardTileMat = new THREE.MeshStandardMaterial({map: btTex, roughness: 0.6, metalness: 0.1});
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xbfe3ef, transparent: true, opacity: 0.22,
            roughness: 0.08, metalness: 0.1, depthWrite: false
        });

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = frameCanvas.height = 256;
        const ftx = frameCanvas.getContext('2d');
        ftx.fillStyle = '#808080';
        ftx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 300; i++) {
            ftx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.1})`;
            ftx.beginPath();
            ftx.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 15, 0, Math.PI * 2);
            ftx.fill();
        }
        const frameBumpTex = new THREE.CanvasTexture(frameCanvas);
        frameBumpTex.wrapS = frameBumpTex.wrapT = THREE.RepeatWrapping;
        const boardFrameMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.65,
            metalness: 0.8,
            bumpMap: frameBumpTex,
            bumpScale: 0.015
        });

        const bcCanvas = document.createElement('canvas');
        bcCanvas.width = bcCanvas.height = 256;
        const bctx = bcCanvas.getContext('2d');
        
        bctx.fillStyle = '#393636';
        bctx.fillRect(0, 0, 256, 256);

        bctx.fillStyle = '#2b2d33';
        for(let i = 0; i < 3000; i++) {
            bctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        bctx.fillStyle = '#3f4249';
        for(let i = 0; i < 1500; i++) {
            bctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
        }

        bctx.strokeStyle = '#1a1c20';
        bctx.lineWidth = 4;
        for (let ty = 0; ty < 2; ty++) {
            for (let tx = 0; tx < 2; tx++) {
                bctx.strokeRect(tx * 128, ty * 128, 128, 128);
            }
        }

        bctx.globalAlpha = 0.08;
        bctx.drawImage(masterNoise, 0, 0, 256, 256);
        bctx.globalAlpha = 1.0;

        const bcTex = new THREE.CanvasTexture(bcCanvas);
        bcTex.wrapS = bcTex.wrapT = THREE.RepeatWrapping;
        bcTex.repeat.set(40, 40);

        const boardCeilingMat = new THREE.MeshStandardMaterial({
            map: bcTex,
            emissiveMap: bcTex,
            emissive: 0x606a75,
            emissiveIntensity: 2.0,
            roughness: 0.95,
            metalness: 0.0,
            bumpMap: bcTex,
            bumpScale: 0.005
        });

        return {boardWallMat, boardTileMat, glassMat, boardFrameMat, boardCeilingMat};
    }
}
