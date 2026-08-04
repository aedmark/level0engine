/**
 * [ROLE] Generates specialized procedural textures specific to the Annex sector.
 * [WHY] Sector-specific aesthetics require unique material generation without bloating the global texture pools.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API.
 */
import TextureMechanics from '../TextureMechanics.js';

export default class AnnexTextures {
    static _buildAnnexAssets(masterNoise) {
        const {canvas: steelCanvas, ctx: steelCtx} = TextureMechanics._createContext(256, 512);
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
        const {canvas: doorCanvas, ctx: doorCtx} = TextureMechanics._createContext(256, 512);
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
        const {canvas: doorBackCanvas, ctx: doorBackCtx} = TextureMechanics._createContext(256, 512);
        doorBackCtx.translate(256, 0);
        doorBackCtx.scale(-1, 1);
        doorBackCtx.drawImage(doorCanvas, 0, 0);
        const doorBackTexture = new THREE.CanvasTexture(doorBackCanvas);
        const annexDoorMatFront = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.7, metalness: 0.1});
        const annexDoorMatBack = new THREE.MeshStandardMaterial({
            map: doorBackTexture,
            roughness: 0.7,
            metalness: 0.1
        });
        const annexDoorMat = [annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexDoorMatFront, annexDoorMatBack];
        const annexFrameMat = new THREE.MeshStandardMaterial({color: 0x53585c, roughness: 0.7, metalness: 0.2});
        const {canvas: annexWallCanvas, ctx: annexWallCtx} = TextureMechanics._createContext(512, 512);
        annexWallCtx.fillStyle = '#cccccc';
        annexWallCtx.fillRect(0, 0, 512, 512);
        const padCols = 4, padRows = 9, padMargin = 2;
        const trimY = 480;
        const padW = 512 / padCols, padH = trimY / padRows;
        for (let r = 0; r < padRows; r++) {
            for (let c = 0; c < padCols; c++) {
                const x0 = c * padW + padMargin, y0 = r * padH + padMargin;
                const x1 = (c + 1) * padW - padMargin, y1 = (r + 1) * padH - padMargin;
                const pcx = (x0 + x1) / 2, pcy = (y0 + y1) / 2;
                const maxRx = (x1 - x0) / 2, maxRy = (y1 - y0) / 2;
                const steps = 16;
                for (let i = steps; i >= 0; i--) {
                    const t = i / steps;
                    const shade = -40 * t;
                    annexWallCtx.fillStyle = `rgb(${240 + shade}, ${240 + shade}, ${240 + shade})`;
                    annexWallCtx.beginPath();
                    annexWallCtx.ellipse(pcx, pcy, maxRx * t, maxRy * t, 0, 0, Math.PI * 2);
                    annexWallCtx.fill();
                }
                annexWallCtx.strokeStyle = 'rgba(150, 150, 150, 0.55)';
                annexWallCtx.lineWidth = 1;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                    annexWallCtx.beginPath();
                    annexWallCtx.moveTo(pcx, pcy);
                    annexWallCtx.lineTo(pcx + dx * maxRx * 0.92, pcy + dy * maxRy * 0.92);
                    annexWallCtx.stroke();
                });
                annexWallCtx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
                annexWallCtx.lineWidth = 2;
                annexWallCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
        }
        for (let r = 0; r <= padRows; r++) {
            for (let c = 0; c <= padCols; c++) {
                const x = c * padW, y = r * padH;
                annexWallCtx.fillStyle = '#666666';
                annexWallCtx.beginPath();
                annexWallCtx.arc(x, y, 5, 0, Math.PI * 2);
                annexWallCtx.fill();
                annexWallCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                annexWallCtx.beginPath();
                annexWallCtx.arc(x - 1.5, y - 2, 2.2, 0, Math.PI * 2);
                annexWallCtx.fill();
            }
        }
        annexWallCtx.globalAlpha = 0.1;
        annexWallCtx.drawImage(masterNoise, 0, 0);
        annexWallCtx.globalAlpha = 1.0;
        annexWallCtx.fillStyle = '#222222';
        annexWallCtx.fillRect(0, trimY, 512, 512 - trimY);
        annexWallCtx.fillStyle = '#111111';
        annexWallCtx.fillRect(0, trimY - 4, 512, 4);
        const annexWallTexture = new THREE.CanvasTexture(annexWallCanvas);
        annexWallTexture.wrapS = THREE.RepeatWrapping;
        annexWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        annexWallTexture.repeat.set(4, 1);
        const annexWallMat = new THREE.MeshStandardMaterial({
            map: annexWallTexture,
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.02,
            bumpMap: annexWallTexture,
            bumpScale: 0.04
        });
        const {canvas: annexFloorCanvas, ctx: annexFloorCtx} = TextureMechanics._createContext(512, 512);
        annexFloorCtx.fillStyle = '#cccccc';
        annexFloorCtx.fillRect(0, 0, 512, 512);
        const fPadCols = 4, fPadRows = 4, fPadMargin = 2;
        const fPadW = 512 / fPadCols, fPadH = 512 / fPadRows;
        for (let r = 0; r < fPadRows; r++) {
            for (let c = 0; c < fPadCols; c++) {
                const x0 = c * fPadW + fPadMargin, y0 = r * fPadH + fPadMargin;
                const x1 = (c + 1) * fPadW - fPadMargin, y1 = (r + 1) * fPadH - fPadMargin;
                const pcx = (x0 + x1) / 2, pcy = (y0 + y1) / 2;
                const maxRx = (x1 - x0) / 2, maxRy = (y1 - y0) / 2;
                const steps = 16;
                for (let i = steps; i >= 0; i--) {
                    const t = i / steps;
                    const shade = -40 * t;
                    annexFloorCtx.fillStyle = `rgb(${240 + shade}, ${240 + shade}, ${240 + shade})`;
                    annexFloorCtx.beginPath();
                    annexFloorCtx.ellipse(pcx, pcy, maxRx * t, maxRy * t, 0, 0, Math.PI * 2);
                    annexFloorCtx.fill();
                }
                annexFloorCtx.strokeStyle = 'rgba(150, 150, 150, 0.55)';
                annexFloorCtx.lineWidth = 1;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                    annexFloorCtx.beginPath();
                    annexFloorCtx.moveTo(pcx, pcy);
                    annexFloorCtx.lineTo(pcx + dx * maxRx * 0.92, pcy + dy * maxRy * 0.92);
                    annexFloorCtx.stroke();
                });
                annexFloorCtx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
                annexFloorCtx.lineWidth = 2;
                annexFloorCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
        }
        for (let r = 0; r <= fPadRows; r++) {
            for (let c = 0; c <= fPadCols; c++) {
                const x = c * fPadW, y = r * fPadH;
                annexFloorCtx.fillStyle = '#666666';
                annexFloorCtx.beginPath();
                annexFloorCtx.arc(x, y, 5, 0, Math.PI * 2);
                annexFloorCtx.fill();
                annexFloorCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                annexFloorCtx.beginPath();
                annexFloorCtx.arc(x - 1.5, y - 2, 2.2, 0, Math.PI * 2);
                annexFloorCtx.fill();
            }
        }
        annexFloorCtx.globalAlpha = 0.1;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexFloorCtx.globalAlpha = 1.0;
        const annexFloorTexture = TextureMechanics._createWrappedTexture(annexFloorCanvas, 56, 56);
        const annexFloorMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 0.7,
            metalness: 0.02,
            bumpMap: annexFloorTexture,
            bumpScale: 0.03
        });
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
        const annexCeilingMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 1.0,
            metalness: 0.0,
            bumpMap: annexFloorTexture,
            bumpScale: 0.03
        });
        return {annexDoorMat, annexFrameMat, annexWallMat, annexFloorMat, annexCeilingMat};
    }
}
