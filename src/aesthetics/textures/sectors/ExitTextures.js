import TextureMechanics from '../TextureMechanics.js';

export default class ExitTextures {
    static _buildExitAssets(masterNoise) {
        const W = 512, H = 512;
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        const {canvas: roughCanvas, ctx: rCtx} = TextureMechanics._createContext(W, H);

        const rand = TextureMechanics._seededRandom(998244353);

        ctx.fillStyle = '#dcdad5';
        ctx.fillRect(0, 0, W, H);
        bCtx.fillStyle = '#b4b4b4';
        bCtx.fillRect(0, 0, W, H);
        rCtx.fillStyle = '#999999';
        rCtx.fillRect(0, 0, W, H);

        const TILES_X = 8, TILES_Y = 8;
        const TW = W / TILES_X, TH = H / TILES_Y;

        for (let ty = 0; ty < TILES_Y; ty++) {
            for (let tx = 0; tx < TILES_X; tx++) {
                const shade = 215 + Math.floor(rand() * 10);
                ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 4})`;
                ctx.fillRect(tx * TW, ty * TH, TW, TH);
            }
        }

        const stripeY = H * 0.4;
        const stripeH = H * 0.2;
        
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, stripeY - 4, W, stripeH + 8);
        bCtx.fillStyle = '#888888';
        bCtx.fillRect(0, stripeY - 4, W, stripeH + 8);
        rCtx.fillStyle = '#aaaaaa';
        rCtx.fillRect(0, stripeY - 4, W, stripeH + 8);

        ctx.fillStyle = '#b32424';
        ctx.fillRect(0, stripeY, W, stripeH);
        bCtx.fillStyle = '#e6e6e6';
        bCtx.fillRect(0, stripeY, W, stripeH);
        rCtx.fillStyle = '#222222';
        rCtx.fillRect(0, stripeY, W, stripeH);

        ctx.fillStyle = '#e5e5e5';
        rCtx.fillStyle = '#111111';
        
        const drawChevron = (cx, cy, width, height) => {
            ctx.beginPath();
            ctx.moveTo(cx - width / 2, cy - height / 2);
            ctx.lineTo(cx + width / 2, cy);
            ctx.lineTo(cx - width / 2, cy + height / 2);
            ctx.lineTo(cx - width / 2 - 20, cy + height / 2);
            ctx.lineTo(cx + width / 2 - 20, cy);
            ctx.lineTo(cx - width / 2 - 20, cy - height / 2);
            ctx.closePath();
            ctx.fill();

            rCtx.beginPath();
            rCtx.moveTo(cx - width / 2, cy - height / 2);
            rCtx.lineTo(cx + width / 2, cy);
            rCtx.lineTo(cx - width / 2, cy + height / 2);
            rCtx.lineTo(cx - width / 2 - 20, cy + height / 2);
            rCtx.lineTo(cx + width / 2 - 20, cy);
            rCtx.lineTo(cx - width / 2 - 20, cy - height / 2);
            rCtx.closePath();
            rCtx.fill();
        };

        for (let i = 0; i < 4; i++) {
            drawChevron((i * W / 4) + (W / 8), stripeY + stripeH / 2, 60, stripeH * 0.7);
        }

        for (let i = 0; i < 8000; i++) {
            const x = rand() * W, y = rand() * H;
            const r = 0.5 + rand() * 2.0;
            ctx.fillStyle = `rgba(50, 45, 40, ${0.05 + rand() * 0.1})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            
            rCtx.fillStyle = `rgba(200, 200, 200, ${0.1 + rand() * 0.2})`;
            rCtx.beginPath();
            rCtx.arc(x, y, r, 0, Math.PI * 2);
            rCtx.fill();
        }

        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 3;
        bCtx.strokeStyle = '#333333';
        bCtx.lineWidth = 4;
        
        for (let i = 0; i <= TILES_X; i++) {
            ctx.beginPath();
            ctx.moveTo(i * TW, 0);
            ctx.lineTo(i * TW, H);
            ctx.stroke();
            bCtx.beginPath();
            bCtx.moveTo(i * TW, 0);
            bCtx.lineTo(i * TW, H);
            bCtx.stroke();
        }
        for (let i = 0; i <= TILES_Y; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * TH);
            ctx.lineTo(W, i * TH);
            ctx.stroke();
            bCtx.beginPath();
            bCtx.moveTo(0, i * TH);
            bCtx.lineTo(W, i * TH);
            bCtx.stroke();
        }

        ctx.globalAlpha = 0.15;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 8);

        const map = TextureMechanics._createWrappedTexture(canvas, 4, 1, true);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 4, 1, true);
        const roughnessMap = TextureMechanics._createWrappedTexture(roughCanvas, 4, 1, true);
        
        return {
            exitWallMat: new THREE.MeshStandardMaterial({
                map,
                bumpMap,
                bumpScale: 0.02,
                roughnessMap,
                roughness: 0.8,
                metalness: 0.1
            }),
            ...ExitTextures._buildExitFloor(masterNoise),
            ...ExitTextures._buildExitArrow(),
            ...ExitTextures._buildExitCeiling(masterNoise),
            ...ExitTextures._buildExitDoorFrame(masterNoise)
        };
    }

    static _buildExitDoorFrame(masterNoise) {
        const W = 512, H = 512;
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        const rand = TextureMechanics._seededRandom(445566);

        ctx.fillStyle = '#2a2a2a'; // Dark grey metallic
        ctx.fillRect(0, 0, W, H);
        bCtx.fillStyle = '#888888';
        bCtx.fillRect(0, 0, W, H);

        // Add some brushed metal lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        bCtx.strokeStyle = '#666666';
        bCtx.lineWidth = 2;
        for (let i = 0; i < 100; i++) {
            const y = rand() * H;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
            bCtx.beginPath();
            bCtx.moveTo(0, y);
            bCtx.lineTo(W, y);
            bCtx.stroke();
        }

        // Add rivets along the edges
        ctx.fillStyle = '#111111';
        bCtx.fillStyle = '#ffffff';
        const drawRivet = (x, y) => {
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
            bCtx.beginPath(); bCtx.arc(x, y, 6, 0, Math.PI * 2); bCtx.fill();
        };
        for (let i = 0; i <= 8; i++) {
            drawRivet(16, i * (H / 8));
            drawRivet(W - 16, i * (H / 8));
        }

        ctx.globalAlpha = 0.2;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, W, H, rand, 8);

        return {
            exitDoorFrameMat: new THREE.MeshStandardMaterial({
                map: TextureMechanics._createWrappedTexture(canvas, 1, 1, false),
                bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas, 1, 1, false),
                bumpScale: 0.05,
                roughness: 0.6,
                metalness: 0.8
            })
        };
    }

    static _buildExitFloor(masterNoise) {
        const W = 512, H = 512;
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        const {canvas: roughCanvas, ctx: rCtx} = TextureMechanics._createContext(W, H);

        const rand = TextureMechanics._seededRandom(77221144);

        // Epoxy concrete base
        ctx.fillStyle = '#8a9096';
        ctx.fillRect(0, 0, W, H);
        bCtx.fillStyle = '#888888';
        bCtx.fillRect(0, 0, W, H);
        rCtx.fillStyle = '#111111'; // Epoxy is very shiny/smooth
        rCtx.fillRect(0, 0, W, H);

        // Epoxy sparkles / flakes
        for (let i = 0; i < 20000; i++) {
            const x = rand() * W, y = rand() * H, r = 0.3 + rand() * 0.7; // Smaller size
            // Flake colors: subtle glitter and freckles, less contrast
            const colors = ['#959b9f', '#7a8086', '#b5babf', '#eef0f2'];
            ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            
            // Flakes add a tiny bit of bump
            bCtx.fillStyle = '#999999';
            bCtx.beginPath();
            bCtx.arc(x, y, r, 0, Math.PI * 2);
            bCtx.fill();
            
            // Flakes can be slightly rougher than the pure epoxy
            rCtx.fillStyle = '#333333';
            rCtx.beginPath();
            rCtx.arc(x, y, r, 0, Math.PI * 2);
            rCtx.fill();
        }

        ctx.globalAlpha = 0.08;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, W, H, rand, 6);

        return {
            exitFloorMat: new THREE.MeshStandardMaterial({
                map: TextureMechanics._createWrappedTexture(canvas, 16, 16, false),
                bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas, 16, 16, false),
                bumpScale: 0.01,
                roughnessMap: TextureMechanics._createWrappedTexture(roughCanvas, 16, 16, false),
                roughness: 0.4, // shiny base
                metalness: 0.0
            })
        };
    }

    static _buildExitArrow() {
        const W = 256, H = 256;
        const {canvas, ctx} = TextureMechanics._createContext(W, H, false);
        const {canvas: roughCanvas, ctx: rCtx} = TextureMechanics._createContext(W, H, false);

        // transparent bg
        ctx.clearRect(0, 0, W, H);
        rCtx.clearRect(0, 0, W, H);

        const arrowW = 160, arrowH = 200;
        const cx = W / 2, cy = H / 2;

        const path = new Path2D();
        path.moveTo(cx, cy - arrowH / 2);
        path.lineTo(cx + arrowW / 2, cy + arrowH / 4);
        path.lineTo(cx + arrowW / 4, cy + arrowH / 4);
        path.lineTo(cx + arrowW / 4, cy + arrowH / 2);
        path.lineTo(cx - arrowW / 4, cy + arrowH / 2);
        path.lineTo(cx - arrowW / 4, cy + arrowH / 4);
        path.lineTo(cx - arrowW / 2, cy + arrowH / 4);
        path.closePath();

        ctx.lineWidth = 16;
        ctx.strokeStyle = '#111111'; // Dark border
        ctx.fillStyle = '#eebb00'; // Yellow interior
        ctx.stroke(path);
        ctx.fill(path);

        // Arrow paint is matte/rough
        rCtx.fillStyle = '#aa0000'; // Red channel is roughness for standard material when using roughnessMap? Wait, roughnessMap uses green channel. Actually, THREE.MeshStandardMaterial roughnessMap uses the green channel in older versions, but just full gray is safe.
        rCtx.fillStyle = '#aaaaaa'; 
        rCtx.fill(path);
        
        const map = new THREE.CanvasTexture(canvas);
        const roughMap = new THREE.CanvasTexture(roughCanvas);

        return {
            exitArrowMat: new THREE.MeshStandardMaterial({
                map: map,
                roughnessMap: roughMap,
                roughness: 0.9,
                metalness: 0.0,
                transparent: true,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            })
        };
    }

    static _buildExitCeiling(masterNoise) {
        const W = 256, H = 256;
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        const rand = TextureMechanics._seededRandom(883344);

        ctx.fillStyle = '#666666'; // Much brighter base
        ctx.fillRect(0, 0, W, H);
        bCtx.fillStyle = '#888888';
        bCtx.fillRect(0, 0, W, H);

        // Draw basic acoustic/metal panel lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 4;
        bCtx.strokeStyle = '#222222';
        bCtx.lineWidth = 4;
        
        ctx.strokeRect(0, 0, W, H);
        bCtx.strokeRect(0, 0, W, H);
        
        ctx.strokeRect(W/4, H/4, W/2, H/2);
        bCtx.strokeRect(W/4, H/4, W/2, H/2);

        ctx.globalAlpha = 0.15;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, W, H, rand, 8);

        return {
            exitCeilingMat: new THREE.MeshStandardMaterial({
                map: TextureMechanics._createWrappedTexture(canvas, 16, 16, false),
                bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas, 16, 16, false),
                bumpScale: 0.02,
                roughness: 1.0, // Fully matte
                metalness: 0.0  // No metallic shine
            })
        };
    }
}
