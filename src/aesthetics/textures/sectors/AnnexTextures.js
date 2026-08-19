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
        
        const annexDoorMatFront = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.7, metalness: 0.1});
        const annexDoorMatBack = new THREE.MeshStandardMaterial({
            map: doorTexture,
            roughness: 0.7,
            metalness: 0.1
        });
        const annexDoorMat = [annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexDoorMatFront, annexDoorMatBack];
        const annexDoorMatZ = [annexDoorMatFront, annexDoorMatBack, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat];
        const annexFrameMat = new THREE.MeshStandardMaterial({color: 0x53585c, roughness: 0.7, metalness: 0.2});

        // ==========================================
        // 1920s UNION ARCADE WALL (Wood paneling & brass)
        // ==========================================
        const {canvas: annexWallCanvas, ctx: annexWallCtx} = TextureMechanics._createContext(512, 512);
        
        // Base dark wood
        const woodGrad = annexWallCtx.createLinearGradient(0, 0, 0, 512);
        woodGrad.addColorStop(0, '#422416');
        woodGrad.addColorStop(1, '#2b150a');
        annexWallCtx.fillStyle = woodGrad;
        annexWallCtx.fillRect(0, 0, 512, 512);
        
        // Faux wood grain
        annexWallCtx.globalAlpha = 0.05;
        for (let i=0; i<100; i++) {
            annexWallCtx.fillStyle = '#110000';
            annexWallCtx.fillRect(Math.random() * 512, 0, 2 + Math.random() * 5, 512);
        }
        annexWallCtx.globalAlpha = 1.0;

        const drawPanel = (x, y, w, h) => {
            // Bevel out
            annexWallCtx.fillStyle = 'rgba(0,0,0,0.6)';
            annexWallCtx.fillRect(x, y, w, h);
            annexWallCtx.fillStyle = 'rgba(255,255,255,0.15)';
            annexWallCtx.fillRect(x, y, w-2, h-2);
            
            // Inner panel
            const innerGrad = annexWallCtx.createLinearGradient(0, y, 0, y+h);
            innerGrad.addColorStop(0, '#3a1e11');
            innerGrad.addColorStop(1, '#4a2817');
            annexWallCtx.fillStyle = innerGrad;
            annexWallCtx.fillRect(x+6, y+6, w-12, h-12);
            
            // Highlight
            annexWallCtx.strokeStyle = 'rgba(255,255,255,0.08)';
            annexWallCtx.lineWidth = 2;
            annexWallCtx.strokeRect(x+8, y+8, w-16, h-16);
        };

        // Wainscoting layout
        drawPanel(32, 32, 448, 200);
        drawPanel(32, 264, 448, 200);

        // Brass Art Deco Accents
        annexWallCtx.fillStyle = '#b89947'; // Brass base
        annexWallCtx.fillRect(0, 246, 512, 6); // Divider rail
        
        // Highlight/Shadow for brass rail
        annexWallCtx.fillStyle = '#ffdf80';
        annexWallCtx.fillRect(0, 246, 512, 1);
        annexWallCtx.fillStyle = '#594411';
        annexWallCtx.fillRect(0, 251, 512, 1);

        // Brass vertical strips
        annexWallCtx.fillStyle = '#b89947';
        annexWallCtx.fillRect(16, 0, 8, 512);
        annexWallCtx.fillRect(488, 0, 8, 512);

        // Deco Diamonds
        annexWallCtx.fillStyle = '#b89947';
        const drawDiamond = (cx, cy, r) => {
            annexWallCtx.beginPath();
            annexWallCtx.moveTo(cx, cy - r);
            annexWallCtx.lineTo(cx + r, cy);
            annexWallCtx.lineTo(cx, cy + r);
            annexWallCtx.lineTo(cx - r, cy);
            annexWallCtx.fill();
        };
        drawDiamond(256, 249, 12);
        drawDiamond(20, 249, 12);
        drawDiamond(492, 249, 12);

        annexWallCtx.globalAlpha = 0.15;
        annexWallCtx.drawImage(masterNoise, 0, 0);
        annexWallCtx.globalAlpha = 1.0;

        const annexWallTexture = new THREE.CanvasTexture(annexWallCanvas);
        annexWallTexture.wrapS = THREE.RepeatWrapping;
        annexWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        annexWallTexture.repeat.set(4, 1);
        
        // No bump map for wood, keeping it relatively smooth but shiny
        const annexWallMat = new THREE.MeshStandardMaterial({
            map: annexWallTexture,
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1
        });

        // ==========================================
        // 1920s UNION ARCADE FLOOR (Checkered Terrazzo / Marble)
        // ==========================================
        const {canvas: annexFloorCanvas, ctx: annexFloorCtx} = TextureMechanics._createContext(512, 512);
        
        // Background cream marble
        annexFloorCtx.fillStyle = '#e8e4d8';
        annexFloorCtx.fillRect(0, 0, 512, 512);

        // Add some noise to cream
        annexFloorCtx.globalAlpha = 0.1;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexFloorCtx.globalAlpha = 1.0;

        // Dark green / black marble tiles
        annexFloorCtx.fillStyle = '#172e21';
        annexFloorCtx.fillRect(0, 0, 256, 256);
        annexFloorCtx.fillRect(256, 256, 256, 256);

        // Add noise to dark tiles
        annexFloorCtx.globalAlpha = 0.15;
        annexFloorCtx.fillStyle = '#000000';
        for(let i=0; i<400; i++) {
            annexFloorCtx.beginPath();
            annexFloorCtx.arc(Math.random()*256, Math.random()*256, Math.random()*3, 0, Math.PI*2);
            annexFloorCtx.arc(256+Math.random()*256, 256+Math.random()*256, Math.random()*3, 0, Math.PI*2);
            annexFloorCtx.fill();
        }
        annexFloorCtx.globalAlpha = 1.0;

        // Brass/Gold grout lines
        annexFloorCtx.fillStyle = '#b89947';
        annexFloorCtx.fillRect(0, 254, 512, 4);
        annexFloorCtx.fillRect(254, 0, 4, 512);

        // Small brass diamonds at intersections
        drawDiamond(256, 256, 16);
        drawDiamond(0, 0, 16);
        drawDiamond(512, 0, 16);
        drawDiamond(0, 512, 16);
        drawDiamond(512, 512, 16);

        annexFloorCtx.globalAlpha = 0.1;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexFloorCtx.globalAlpha = 1.0;

        // Note: keeping repeat around 14 so it looks like nice large tiles
        const annexFloorTexture = TextureMechanics._createWrappedTexture(annexFloorCanvas, 14, 14);
        const annexFloorMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 0.2, // very shiny marble
            metalness: 0.1
        });

        // ==========================================
        // 1920s UNION ARCADE CEILING (Bronze Plaster/Deco)
        // ==========================================
        const {canvas: annexCeilingCanvas, ctx: annexCeilingCtx} = TextureMechanics._createContext(512, 512);
        
        // Base dark bronze/copper
        annexCeilingCtx.fillStyle = '#422c1b';
        annexCeilingCtx.fillRect(0, 0, 512, 512);

        // Outer ornate square
        annexCeilingCtx.strokeStyle = '#6e4c32';
        annexCeilingCtx.lineWidth = 16;
        annexCeilingCtx.strokeRect(32, 32, 448, 448);
        
        annexCeilingCtx.strokeStyle = '#8f6746';
        annexCeilingCtx.lineWidth = 4;
        annexCeilingCtx.strokeRect(24, 24, 464, 464);
        annexCeilingCtx.strokeRect(48, 48, 416, 416);

        // Deco radiating lines
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

        // Center medallion
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

        // Inner decorative squares
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
