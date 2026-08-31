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

    static _drawEdgeWear(ctx, bumpCtx, size, rand) {
        const bandW = 46;
        const drawSide = (baseX, dir) => {
            for (let i = 0; i < 5; i++) {
                const cy = size * (0.28 + rand() * 0.55);
                const h = size * (0.12 + rand() * 0.22);
                const w = bandW * (0.4 + rand() * 0.6);
                const x = baseX + dir * rand() * (bandW - w);
                const grad = ctx.createLinearGradient(baseX, 0, baseX + dir * bandW, 0);
                grad.addColorStop(0, `rgba(18, 14, 10, ${(0.35 + rand() * 0.2).toFixed(2)})`);
                grad.addColorStop(1, 'rgba(18, 14, 10, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(x, cy, w, h, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            for (let i = 0; i < 2; i++) {
                const cy = size * (0.35 + rand() * 0.4);
                const h = size * (0.1 + rand() * 0.15);
                const x = baseX + dir * rand() * bandW * 0.5;
                const grad = ctx.createLinearGradient(baseX, 0, baseX + dir * bandW, 0);
                grad.addColorStop(0, `rgba(196, 182, 156, ${(0.18 + rand() * 0.12).toFixed(2)})`);
                grad.addColorStop(1, 'rgba(196, 182, 156, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(x, cy, bandW * 0.35, h, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        };
        drawSide(0, 1);
        drawSide(size, -1);

        const bumpGrad1 = bumpCtx.createLinearGradient(0, 0, bandW, 0);
        bumpGrad1.addColorStop(0, 'rgba(0,0,0,0.35)');
        bumpGrad1.addColorStop(1, 'rgba(0,0,0,0)');
        bumpCtx.fillStyle = bumpGrad1;
        bumpCtx.fillRect(0, 0, bandW, size);
        const bumpGrad2 = bumpCtx.createLinearGradient(size - bandW, 0, size, 0);
        bumpGrad2.addColorStop(0, 'rgba(0,0,0,0)');
        bumpGrad2.addColorStop(1, 'rgba(0,0,0,0.35)');
        bumpCtx.fillStyle = bumpGrad2;
        bumpCtx.fillRect(size - bandW, 0, bandW, size);
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

        CreviceTextures._drawEdgeWear(ctx, bumpCtx, size, rand);

        ctx.globalAlpha = 0.25;
        ctx.drawImage(masterNoise, 0, 0, size, size);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, size, size, rand, 4);

        const map = TextureMechanics._createWrappedTexture(canvas, 2, 2);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 2, 2);

        return new THREE.MeshStandardMaterial({
            map,
            color: 0x7a7a7a,
            roughness: 0.92,
            metalness: 0.0,
            bumpMap,
            bumpScale: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
    }

    static _buildJoistCeilingAsset(masterNoise) {
        const size = 512;
        const rand = TextureMechanics._seededRandom(19283746);
        const {canvas, ctx} = TextureMechanics._createContext(size, size);
        const {canvas: bumpCanvas, ctx: bumpCtx} = TextureMechanics._createContext(size, size);

        ctx.fillStyle = '#161119';
        ctx.fillRect(0, 0, size, size);
        bumpCtx.fillStyle = '#303030';
        bumpCtx.fillRect(0, 0, size, size);

        const joistCount = 3;
        const cell = size / joistCount;
        const joistWidth = cell * 0.62;

        for (let i = 0; i < joistCount; i++) {
            const left = i * cell + (cell - joistWidth) / 2;
            const woodBase = 70 + rand() * 20;
            const r = Math.round(woodBase + 24), g = Math.round(woodBase - 4), b = Math.round(woodBase - 30);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(left, 0, joistWidth, size);
            bumpCtx.fillStyle = '#a0a0a0';
            bumpCtx.fillRect(left, 0, joistWidth, size);

            for (let s = 0; s < 8; s++) {
                const gx = left + rand() * joistWidth;
                ctx.strokeStyle = `rgba(${Math.round(r * 0.55)}, ${Math.round(g * 0.55)}, ${Math.round(b * 0.55)}, ${(0.2 + rand() * 0.2).toFixed(2)})`;
                ctx.lineWidth = 0.8 + rand();
                ctx.beginPath();
                let gy = 0;
                ctx.moveTo(gx, gy);
                while (gy < size) {
                    gy += 24 + rand() * 40;
                    ctx.lineTo(gx + (rand() - 0.5) * 3, gy);
                }
                ctx.stroke();
            }

            if (rand() > 0.5) {
                const ky = rand() * size, kx = left + joistWidth * 0.5 + (rand() - 0.5) * joistWidth * 0.4;
                ctx.fillStyle = `rgba(${Math.round(r * 0.4)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.4)}, 0.5)`;
                ctx.beginPath();
                ctx.ellipse(kx, ky, 4 + rand() * 3, 7 + rand() * 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            for (let n = 0; n < 6; n++) {
                const ny = n * (size / 6) + rand() * 20;
                ctx.fillStyle = 'rgba(15, 12, 8, 0.6)';
                ctx.beginPath();
                ctx.arc(left + 3, ny, 1.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(left + joistWidth - 3, ny, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }

            const edgeGradA = ctx.createLinearGradient(left, 0, left + 10, 0);
            edgeGradA.addColorStop(0, 'rgba(0,0,0,0.4)');
            edgeGradA.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = edgeGradA;
            ctx.fillRect(left, 0, 10, size);
            const edgeGradB = ctx.createLinearGradient(left + joistWidth - 10, 0, left + joistWidth, 0);
            edgeGradB.addColorStop(0, 'rgba(0,0,0,0)');
            edgeGradB.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = edgeGradB;
            ctx.fillRect(left + joistWidth - 10, 0, 10, size);
        }

        for (let i = 0; i < 40; i++) {
            const sx = rand() * size;
            const localX = sx % cell;
            const joistLeft = (cell - joistWidth) / 2;
            if (localX >= joistLeft && localX <= joistLeft + joistWidth) continue;
            const sy = rand() * size;
            ctx.fillStyle = `rgba(200, 200, 195, ${(0.03 + rand() * 0.05).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 0.6 + rand() * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 0.2;
        ctx.drawImage(masterNoise, 0, 0, size, size);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, size, size, rand, 4);

        const map = TextureMechanics._createWrappedTexture(canvas, 2, 2);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 2, 2);

        return new THREE.MeshStandardMaterial({
            map,
            color: 0x7a7a7a,
            roughness: 0.95,
            metalness: 0.0,
            bumpMap,
            bumpScale: 0.06
        });
    }

    static _buildUnderlaymentFloorAsset(masterNoise) {
        const size = 512;
        const rand = TextureMechanics._seededRandom(56473829);
        const {canvas, ctx} = TextureMechanics._createContext(size, size);
        const {canvas: bumpCanvas, ctx: bumpCtx} = TextureMechanics._createContext(size, size);

        const base = 150;
        ctx.fillStyle = `rgb(${base + 30}, ${base + 10}, ${base - 30})`;
        ctx.fillRect(0, 0, size, size);
        bumpCtx.fillStyle = '#808080';
        bumpCtx.fillRect(0, 0, size, size);

        for (let i = 0; i < 120; i++) {
            const y = rand() * size;
            ctx.strokeStyle = `rgba(${base - 20}, ${base - 30}, ${base - 60}, ${(0.05 + rand() * 0.08).toFixed(2)})`;
            ctx.lineWidth = 0.6 + rand() * 1.2;
            ctx.beginPath();
            let x = 0;
            ctx.moveTo(x, y);
            while (x < size) {
                x += 30 + rand() * 60;
                ctx.lineTo(x, y + (rand() - 0.5) * 4);
            }
            ctx.stroke();
        }

        const sheetSpan = size / 2;
        for (let sx = 0; sx <= size; sx += sheetSpan) {
            ctx.fillStyle = 'rgba(40, 32, 20, 0.35)';
            ctx.fillRect(sx - 1, 0, 2, size);
            bumpCtx.fillStyle = '#202020';
            bumpCtx.fillRect(sx - 1, 0, 2, size);
            for (let sy = 12; sy < size; sy += 40) {
                ctx.fillStyle = 'rgba(25, 20, 15, 0.7)';
                ctx.beginPath();
                ctx.arc(sx, sy + (rand() - 0.5) * 6, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 50; i++) {
            const sx = rand() * size, sy = rand() * size;
            ctx.fillStyle = 'rgba(30, 24, 18, 0.5)';
            ctx.beginPath();
            ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < 12; i++) {
            const sx = rand() * size, sy = rand() * size, rr = 20 + rand() * 50;
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
            grad.addColorStop(0, `rgba(60, 50, 35, ${(0.08 + rand() * 0.1).toFixed(2)})`);
            grad.addColorStop(1, 'rgba(60, 50, 35, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, rr, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 0.2;
        ctx.drawImage(masterNoise, 0, 0, size, size);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, size, size, rand, 4);

        const map = TextureMechanics._createWrappedTexture(canvas, 2, 2);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 2, 2);

        return new THREE.MeshStandardMaterial({
            map,
            color: 0x7a7a7a,
            roughness: 0.88,
            metalness: 0.0,
            bumpMap,
            bumpScale: 0.03
        });
    }
}
