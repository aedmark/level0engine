import TextureMechanics from '../TextureMechanics.js';

export default class CreviceTextures {

    static _drawPlasterDrip(ctx, bumpCtx, x, seamY, width, rand) {
        const segments = 5 + Math.floor(rand() * 4);
        const topY = seamY - 1;

        const points = [[x, topY]];
        let depth = 0;
        for (let i = 1; i < segments; i++) {
            const px = x + (width * i) / segments;
            const envelope = Math.sin((i / segments) * Math.PI);
            depth += (rand() - 0.35) * 10;
            depth = Math.max(2, depth);
            points.push([px, topY + depth * (0.35 + envelope * 0.9)]);
        }
        points.push([x + width, topY]);

        const traceShape = (c) => {
            c.beginPath();
            c.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length - 1; i++) {
                const midX = (points[i][0] + points[i + 1][0]) / 2;
                const midY = (points[i][1] + points[i + 1][1]) / 2;
                c.quadraticCurveTo(points[i][0], points[i][1], midX, midY);
            }
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            c.quadraticCurveTo(prev[0], prev[1], last[0], last[1]);
            c.closePath();
        };

        ctx.fillStyle = `rgba(214, 206, 188, ${(0.85 + rand() * 0.1).toFixed(2)})`;
        traceShape(ctx);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 140, 118, 0.3)';
        ctx.lineWidth = 1;
        traceShape(ctx);
        ctx.stroke();

        bumpCtx.fillStyle = '#c8c8c8';
        traceShape(bumpCtx);
        bumpCtx.fill();
    }

    static _buildLathAndPlasterAsset(masterNoise) {
        const size = 512;
        const rand = TextureMechanics._seededRandom(74301186);
        const {canvas, ctx} = TextureMechanics._createContext(size, size);
        const {canvas: bumpCanvas, ctx: bumpCtx} = TextureMechanics._createContext(size, size);

        const boardHeight = 30;
        const seamGap = 3;

        for (let y = 0; y < size; y += boardHeight) {
            const woodBase = 96 + rand() * 26;
            const r = Math.round(woodBase + 26), g = Math.round(woodBase - 8), b = Math.round(woodBase - 42);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(0, y, size, boardHeight);
            bumpCtx.fillStyle = rand() > 0.5 ? '#8c8c8c' : '#6e6e6e';
            bumpCtx.fillRect(0, y, size, boardHeight);

            for (let i = 0; i < 10; i++) {
                const gy = y + rand() * boardHeight;
                ctx.strokeStyle = `rgba(${Math.round(r * 0.6)}, ${Math.round(g * 0.6)}, ${Math.round(b * 0.6)}, ${(0.15 + rand() * 0.15).toFixed(2)})`;
                ctx.lineWidth = 0.8 + rand() * 1;
                ctx.beginPath();
                let gx = 0;
                ctx.moveTo(gx, gy);
                while (gx < size) {
                    gx += 20 + rand() * 40;
                    ctx.lineTo(gx, gy + (rand() - 0.5) * 2);
                }
                ctx.stroke();
            }

            for (let i = 0; i < 4; i++) {
                const nx = 10 + rand() * (size - 20);
                const ny = y + boardHeight * 0.5 + (rand() - 0.5) * boardHeight * 0.4;
                ctx.fillStyle = 'rgba(20, 14, 8, 0.7)';
                ctx.beginPath();
                ctx.arc(nx, ny, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = 'rgba(20, 14, 8, 0.65)';
            ctx.fillRect(0, y + boardHeight - seamGap, size, seamGap);
            bumpCtx.fillStyle = '#141414';
            bumpCtx.fillRect(0, y + boardHeight - seamGap, size, seamGap);
        }

        const beamX = size * 0.5;
        const beamWidth = 26;
        ctx.fillStyle = 'rgba(58, 44, 28, 0.6)';
        ctx.fillRect(beamX - beamWidth / 2, 0, beamWidth, size);
        ctx.fillStyle = 'rgba(30, 22, 14, 0.3)';
        for (let y = 0; y < size; y += 6) {
            ctx.fillRect(beamX - beamWidth / 2, y, beamWidth, 1);
        }
        bumpCtx.fillStyle = '#b8b8b8';
        bumpCtx.fillRect(beamX - beamWidth / 2, 0, beamWidth, size);

        for (let y = boardHeight; y < size; y += boardHeight) {
            let x = 0;
            while (x < size) {
                const segW = 30 + rand() * 60;
                if (rand() > 0.55) {
                    CreviceTextures._drawPlasterDrip(ctx, bumpCtx, x, y - seamGap, segW, rand);
                }
                x += segW + 10 + rand() * 30;
            }
        }

        ctx.globalAlpha = 0.25;
        ctx.drawImage(masterNoise, 0, 0, size, size);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, size, size, rand, 4);

        const map = TextureMechanics._createWrappedTexture(canvas, 2, 2);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 2, 2);

        for (const tex of [map, bumpMap]) {
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
        }

        return new THREE.MeshStandardMaterial({
            map,
            roughness: 0.92,
            metalness: 0.0,
            bumpMap,
            bumpScale: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
    }
}
