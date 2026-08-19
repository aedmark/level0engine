import TextureMechanics from '../TextureMechanics.js';

export default class AnnexTextures {
    static _buildAnnexAssets(masterNoise) {
        // Procedural Custom Wood Texture for Door Edges & Base
        const {canvas: woodCanvas, ctx: woodCtx} = TextureMechanics._createContext(256, 512);
        const woodBaseGrad = woodCtx.createLinearGradient(0, 0, 0, 512);
        woodBaseGrad.addColorStop(0, '#3f2113');
        woodBaseGrad.addColorStop(0.5, '#31170b');
        woodBaseGrad.addColorStop(1, '#230f06');
        woodCtx.fillStyle = woodBaseGrad;
        woodCtx.fillRect(0, 0, 256, 512);

        // Fine vertical wood grain fibers
        for (let x = 0; x < 256; x += 1 + Math.floor(Math.random() * 3)) {
            woodCtx.fillStyle = Math.random() > 0.5 ? 'rgba(20, 8, 4, 0.35)' : 'rgba(95, 52, 28, 0.2)';
            woodCtx.fillRect(x, 0, 1, 512);
        }
        woodCtx.globalAlpha = 0.18;
        woodCtx.drawImage(masterNoise, 0, 0, 256, 512);
        woodCtx.globalAlpha = 1.0;

        const woodTexture = new THREE.CanvasTexture(woodCanvas);
        const annexEdgeMat = new THREE.MeshStandardMaterial({map: woodTexture, roughness: 0.6, metalness: 0.1});

        // Procedural Custom Wooden Door with Glass Panels
        const {canvas: doorCanvas, ctx: doorCtx} = TextureMechanics._createContext(256, 512);
        doorCtx.drawImage(woodCanvas, 0, 0);

        // Outer Stile & Rail Door Border
        doorCtx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        doorCtx.lineWidth = 6;
        doorCtx.strokeRect(10, 10, 236, 492);
        doorCtx.strokeStyle = 'rgba(255, 230, 160, 0.18)';
        doorCtx.lineWidth = 2;
        doorCtx.strokeRect(13, 13, 230, 486);

        // --- UPPER SECTION: GLASS PANEL WINDOW ---
        const winX = 32, winY = 40, winW = 192, winH = 190;

        // Beveled Wooden Window Frame
        doorCtx.fillStyle = 'rgba(15, 6, 2, 0.7)';
        doorCtx.fillRect(winX - 6, winY - 6, winW + 12, winH + 12);
        doorCtx.fillStyle = 'rgba(255, 220, 140, 0.25)';
        doorCtx.fillRect(winX - 4, winY - 4, winW + 8, winH + 8);
        doorCtx.fillStyle = '#2b1307';
        doorCtx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);

        // Gold Trim Inlay around Window
        doorCtx.strokeStyle = '#b89947';
        doorCtx.lineWidth = 2;
        doorCtx.strokeRect(winX - 2, winY - 2, winW + 4, winH + 4);

        // Glass Pane Surface (Frosted / Smoked Glass with depth)
        const glassGrad = doorCtx.createLinearGradient(winX, winY, winX + winW, winY + winH);
        glassGrad.addColorStop(0, '#152528');
        glassGrad.addColorStop(0.35, '#243b3e');
        glassGrad.addColorStop(0.65, '#192b2e');
        glassGrad.addColorStop(1, '#0f1c1e');
        doorCtx.fillStyle = glassGrad;
        doorCtx.fillRect(winX, winY, winW, winH);

        // Glass Ambient Highlights & Reflection Sheen
        const sheenGrad = doorCtx.createLinearGradient(winX, winY, winX + winW, winY + winH * 0.7);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
        sheenGrad.addColorStop(0.3, 'rgba(180, 235, 245, 0.12)');
        sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
        sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        doorCtx.fillStyle = sheenGrad;
        doorCtx.fillRect(winX, winY, winW, winH);

        // Glass Mullions (Wooden / Brass Grid dividing into 6 panes: 2 cols x 3 rows)
        const midWinX = winX + winW / 2;
        const row1WinY = winY + winH / 3;
        const row2WinY = winY + (winH * 2) / 3;

        // Vertical Mullion
        doorCtx.fillStyle = '#2b1307';
        doorCtx.fillRect(midWinX - 3, winY, 6, winH);
        doorCtx.fillStyle = '#b89947';
        doorCtx.fillRect(midWinX - 1, winY, 2, winH);

        // Horizontal Mullions
        doorCtx.fillStyle = '#2b1307';
        doorCtx.fillRect(winX, row1WinY - 3, winW, 6);
        doorCtx.fillRect(winX, row2WinY - 3, winW, 6);
        doorCtx.fillStyle = '#b89947';
        doorCtx.fillRect(winX, row1WinY - 1, winW, 2);
        doorCtx.fillRect(winX, row2WinY - 1, winW, 2);

        // Glass Panel Rim Glow / Reflection Bevel
        doorCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        doorCtx.lineWidth = 1;
        doorCtx.strokeRect(winX + 1, winY + 1, winW - 2, winH - 2);

        // --- MID-RAIL DIVIDER WITH GOLD EMBLEM ---
        doorCtx.fillStyle = '#b89947';
        doorCtx.fillRect(16, 244, 224, 4);
        doorCtx.fillStyle = '#ffdf80';
        doorCtx.fillRect(16, 244, 224, 1);
        doorCtx.fillStyle = '#594411';
        doorCtx.fillRect(16, 247, 224, 1);

        const drawDiamond = (targetCtx, cx, cy, r) => {
            targetCtx.beginPath();
            targetCtx.moveTo(cx, cy - r);
            targetCtx.lineTo(cx + r, cy);
            targetCtx.lineTo(cx, cy + r);
            targetCtx.lineTo(cx - r, cy);
            targetCtx.fill();
        };

        doorCtx.fillStyle = '#b89947';
        drawDiamond(doorCtx, 128, 246, 10);
        doorCtx.fillStyle = '#ffdf80';
        drawDiamond(doorCtx, 128, 246, 6);

        // --- LOWER SECTION: RECESSED RAISED WOOD PANEL ---
        const panX = 32, panY = 262, panW = 192, panH = 186;

        // Recessed Panel Shadow & Highlight
        doorCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        doorCtx.fillRect(panX - 4, panY - 4, panW + 8, panH + 8);
        doorCtx.fillStyle = 'rgba(255, 230, 160, 0.15)';
        doorCtx.fillRect(panX - 2, panY - 2, panW + 4, panH + 4);

        // Raised Panel Core
        const panGrad = doorCtx.createLinearGradient(0, panY, 0, panY + panH);
        panGrad.addColorStop(0, '#361b0f');
        panGrad.addColorStop(0.5, '#442314');
        panGrad.addColorStop(1, '#2c1409');
        doorCtx.fillStyle = panGrad;
        doorCtx.fillRect(panX, panY, panW, panH);

        // Gold Inlay Line on Lower Panel
        doorCtx.strokeStyle = '#b89947';
        doorCtx.lineWidth = 1.5;
        doorCtx.strokeRect(panX + 8, panY + 8, panW - 16, panH - 16);

        // Centered Diamond Accent on Lower Panel
        doorCtx.fillStyle = '#b89947';
        drawDiamond(doorCtx, 128, panY + panH / 2, 14);
        doorCtx.fillStyle = '#ffdf80';
        drawDiamond(doorCtx, 128, panY + panH / 2, 9);
        doorCtx.fillStyle = '#361b0f';
        drawDiamond(doorCtx, 128, panY + panH / 2, 4);

        // --- BOTTOM BRASS KICK ACCENT ---
        const kickGrad = doorCtx.createLinearGradient(0, 466, 0, 496);
        kickGrad.addColorStop(0, '#9e7e33');
        kickGrad.addColorStop(0.5, '#bfa04e');
        kickGrad.addColorStop(1, '#664f19');
        doorCtx.fillStyle = kickGrad;
        doorCtx.fillRect(20, 466, 216, 26);

        doorCtx.strokeStyle = '#ffdf80';
        doorCtx.lineWidth = 1;
        doorCtx.strokeRect(20, 466, 216, 26);

        // Kick Plate Screws
        doorCtx.fillStyle = '#4a3810';
        [[28, 479], [228, 479], [128, 479]].forEach(([sx, sy]) => {
            doorCtx.beginPath();
            doorCtx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            doorCtx.fill();
        });

        // Fine Noise Finish
        doorCtx.globalAlpha = 0.12;
        doorCtx.drawImage(masterNoise, 0, 0, 256, 512);
        doorCtx.globalAlpha = 1.0;

        const doorTexture = new THREE.CanvasTexture(doorCanvas);

        const annexDoorMatFront = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.45, metalness: 0.15});
        const annexDoorMatBack = new THREE.MeshStandardMaterial({
            map: doorTexture,
            roughness: 0.45,
            metalness: 0.15
        });
        const annexDoorMat = [annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexDoorMatFront, annexDoorMatBack];
        const annexDoorMatZ = [annexDoorMatFront, annexDoorMatBack, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat];
        const annexFrameMat = new THREE.MeshStandardMaterial({color: 0x3b1e12, roughness: 0.5, metalness: 0.15});

        const {canvas: annexWallCanvas, ctx: annexWallCtx} = TextureMechanics._createContext(512, 512);

        const woodGrad = annexWallCtx.createLinearGradient(0, 0, 0, 512);
        woodGrad.addColorStop(0, '#422416');
        woodGrad.addColorStop(1, '#2b150a');
        annexWallCtx.fillStyle = woodGrad;
        annexWallCtx.fillRect(0, 0, 512, 512);

        annexWallCtx.globalAlpha = 0.05;
        for (let i=0; i<100; i++) {
            annexWallCtx.fillStyle = '#110000';
            annexWallCtx.fillRect(Math.random() * 512, 0, 2 + Math.random() * 5, 512);
        }
        annexWallCtx.globalAlpha = 1.0;

        const drawPanel = (x, y, w, h) => {
            annexWallCtx.fillStyle = 'rgba(0,0,0,0.6)';
            annexWallCtx.fillRect(x, y, w, h);
            annexWallCtx.fillStyle = 'rgba(255,255,255,0.15)';
            annexWallCtx.fillRect(x, y, w-2, h-2);

            const innerGrad = annexWallCtx.createLinearGradient(0, y, 0, y+h);
            innerGrad.addColorStop(0, '#3a1e11');
            innerGrad.addColorStop(1, '#4a2817');
            annexWallCtx.fillStyle = innerGrad;
            annexWallCtx.fillRect(x+6, y+6, w-12, h-12);

            annexWallCtx.strokeStyle = 'rgba(255,255,255,0.08)';
            annexWallCtx.lineWidth = 2;
            annexWallCtx.strokeRect(x+8, y+8, w-16, h-16);
        };

        drawPanel(32, 32, 448, 200);
        drawPanel(32, 264, 448, 200);

        annexWallCtx.fillStyle = '#b89947';
        annexWallCtx.fillRect(0, 246, 512, 6);

        annexWallCtx.fillStyle = '#ffdf80';
        annexWallCtx.fillRect(0, 246, 512, 1);
        annexWallCtx.fillStyle = '#594411';
        annexWallCtx.fillRect(0, 251, 512, 1);

        annexWallCtx.fillStyle = '#b89947';
        annexWallCtx.fillRect(16, 0, 8, 512);
        annexWallCtx.fillRect(488, 0, 8, 512);

        annexWallCtx.fillStyle = '#b89947';
        drawDiamond(annexWallCtx, 256, 249, 12);
        drawDiamond(annexWallCtx, 20, 249, 12);
        drawDiamond(annexWallCtx, 492, 249, 12);

        annexWallCtx.globalAlpha = 0.15;
        annexWallCtx.drawImage(masterNoise, 0, 0);
        annexWallCtx.globalAlpha = 1.0;

        const annexWallTexture = new THREE.CanvasTexture(annexWallCanvas);
        annexWallTexture.wrapS = THREE.RepeatWrapping;
        annexWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        annexWallTexture.repeat.set(4, 1);

        const annexWallMat = new THREE.MeshStandardMaterial({
            map: annexWallTexture,
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1
        });

        const {canvas: annexFloorCanvas, ctx: annexFloorCtx} = TextureMechanics._createContext(512, 512);

        annexFloorCtx.fillStyle = '#e8e4d8';
        annexFloorCtx.fillRect(0, 0, 512, 512);

        annexFloorCtx.globalAlpha = 0.1;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexFloorCtx.globalAlpha = 1.0;

        annexFloorCtx.fillStyle = '#172e21';
        annexFloorCtx.fillRect(0, 0, 256, 256);
        annexFloorCtx.fillRect(256, 256, 256, 256);

        annexFloorCtx.globalAlpha = 0.15;
        annexFloorCtx.fillStyle = '#000000';
        for(let i=0; i<400; i++) {
            annexFloorCtx.beginPath();
            annexFloorCtx.arc(Math.random()*256, Math.random()*256, Math.random()*3, 0, Math.PI*2);
            annexFloorCtx.arc(256+Math.random()*256, 256+Math.random()*256, Math.random()*3, 0, Math.PI*2);
            annexFloorCtx.fill();
        }
        annexFloorCtx.globalAlpha = 1.0;

        annexFloorCtx.fillStyle = '#b89947';
        annexFloorCtx.fillRect(0, 254, 512, 4);
        annexFloorCtx.fillRect(254, 0, 4, 512);

        drawDiamond(annexFloorCtx, 256, 256, 16);
        drawDiamond(annexFloorCtx, 0, 0, 16);
        drawDiamond(annexFloorCtx, 512, 0, 16);
        drawDiamond(annexFloorCtx, 0, 512, 16);
        drawDiamond(annexFloorCtx, 512, 512, 16);

        annexFloorCtx.globalAlpha = 0.1;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexFloorCtx.globalAlpha = 1.0;

        const annexFloorTexture = TextureMechanics._createWrappedTexture(annexFloorCanvas, 14, 14);
        const annexFloorMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 0.2,
            metalness: 0.1
        });

        const {canvas: annexCeilingCanvas, ctx: annexCeilingCtx} = TextureMechanics._createContext(512, 512);

        annexCeilingCtx.fillStyle = '#422c1b';
        annexCeilingCtx.fillRect(0, 0, 512, 512);

        annexCeilingCtx.strokeStyle = '#6e4c32';
        annexCeilingCtx.lineWidth = 16;
        annexCeilingCtx.strokeRect(32, 32, 448, 448);

        annexCeilingCtx.strokeStyle = '#8f6746';
        annexCeilingCtx.lineWidth = 4;
        annexCeilingCtx.strokeRect(24, 24, 464, 464);
        annexCeilingCtx.strokeRect(48, 48, 416, 416);

        annexCeilingCtx.strokeStyle = '#6e4c32';
        annexCeilingCtx.lineWidth = 8;
        annexCeilingCtx.beginPath();
        annexCeilingCtx.moveTo(48, 48);
        annexCeilingCtx.lineTo(256, 256);
        annexCeilingCtx.moveTo(464, 48);
        annexCeilingCtx.lineTo(256, 256);
        annexCeilingCtx.moveTo(48, 464);
        annexCeilingCtx.lineTo(256, 256);
        annexCeilingCtx.moveTo(464, 464);
        annexCeilingCtx.lineTo(256, 256);
        annexCeilingCtx.stroke();

        annexCeilingCtx.fillStyle = '#573922';
        annexCeilingCtx.beginPath();
        annexCeilingCtx.arc(256, 256, 128, 0, Math.PI*2);
        annexCeilingCtx.fill();

        annexCeilingCtx.strokeStyle = '#8f6746';
        annexCeilingCtx.lineWidth = 8;
        annexCeilingCtx.beginPath();
        annexCeilingCtx.arc(256, 256, 128, 0, Math.PI*2);
        annexCeilingCtx.stroke();

        annexCeilingCtx.strokeStyle = '#a87a53';
        annexCeilingCtx.lineWidth = 4;
        annexCeilingCtx.beginPath();
        annexCeilingCtx.arc(256, 256, 100, 0, Math.PI*2);
        annexCeilingCtx.stroke();

        annexCeilingCtx.save();
        annexCeilingCtx.translate(256, 256);
        for(let i=0; i<4; i++) {
            annexCeilingCtx.rotate(Math.PI/2);
            annexCeilingCtx.strokeRect(-40, -40, 80, 80);
        }
        annexCeilingCtx.restore();

        annexCeilingCtx.globalAlpha = 0.2;
        annexCeilingCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexCeilingCtx.globalAlpha = 1.0;

        const annexCeilingTexture = TextureMechanics._createWrappedTexture(annexCeilingCanvas, 14, 14);
        const annexCeilingMat = new THREE.MeshStandardMaterial({
            map: annexCeilingTexture,
            roughness: 0.6,
            metalness: 0.5
        });

        return {annexDoorMat, annexDoorMatZ, annexFrameMat, annexWallMat, annexFloorMat, annexCeilingMat};
    }
}