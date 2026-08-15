import TextureMechanics from '../TextureMechanics.js';

export default class AtriumTextures {
    static _buildAtriumFloor(masterNoise) {
        const SIZE = 512;
        const TILES = 4;
        const TILE = SIZE / TILES;
        const rand = TextureMechanics._seededRandom(20260731);
        const wrapped = (ctx, x, y, reach, fn) => TextureMechanics._wrapDraw(SIZE, x, y, reach, fn);

        const {canvas, ctx} = TextureMechanics._createContext(SIZE, SIZE);

        for (let ty = 0; ty < TILES; ty++) {
            for (let tx = 0; tx < TILES; tx++) {
                const shade = 166 + Math.floor(rand() * 11);
                const warmth = Math.floor(rand() * 5);
                ctx.fillStyle = `rgb(${shade + warmth}, ${shade + Math.floor(warmth * 0.7)}, ${shade - 8})`;
                ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
            }
        }

        for (let i = 0; i < 15000; i++) {
            const x = rand() * SIZE;
            const y = rand() * SIZE;
            const r = 0.3 + rand() * 0.8;
            ctx.fillStyle = rand() > 0.4
                ? (() => { const v = 92 + Math.floor(rand() * 38); return `rgba(${v + 6}, ${v + 2}, ${v - 4}, ${0.16 + rand() * 0.18})`; })()
                : `rgba(232, 229, 220, ${0.14 + rand() * 0.16})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < 14; i++) {
            const x = rand() * SIZE;
            const y = rand() * SIZE;
            const r = 60 + rand() * 110;
            wrapped(ctx, x, y, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                g.addColorStop(0, `rgba(78, 72, 60, ${0.10 + rand() * 0.10})`);
                g.addColorStop(1, 'rgba(96, 90, 78, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }

        ctx.lineCap = 'round';
        for (let cluster = 0; cluster < 18; cluster++) {
            const cx = rand() * SIZE;
            const cy = rand() * SIZE;
            const marks = 1 + Math.floor(rand() * 3);
            for (let m = 0; m < marks; m++) {
                const x = cx + (rand() - 0.5) * 54;
                const y = cy + (rand() - 0.5) * 54;
                const len = 6 + rand() * 18;
                const angle = rand() * Math.PI * 2;
                const bow = (rand() - 0.5) * 12;
                wrapped(ctx, x, y, len + 30, (px, py) => {
                    ctx.strokeStyle = `rgba(58, 54, 48, ${0.07 + rand() * 0.13})`;
                    ctx.lineWidth = 0.9 + rand() * 1.8;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.quadraticCurveTo(
                        px + Math.cos(angle) * len * 0.5 - Math.sin(angle) * bow,
                        py + Math.sin(angle) * len * 0.5 + Math.cos(angle) * bow,
                        px + Math.cos(angle) * len,
                        py + Math.sin(angle) * len
                    );
                    ctx.stroke();
                });
            }
        }

        ctx.strokeStyle = 'rgba(126, 120, 106, 0.28)';
        ctx.lineWidth = 1.0;
        for (let i = 0; i <= TILES; i++) {
            const p = i * TILE;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, SIZE);
            ctx.moveTo(0, p);
            ctx.lineTo(SIZE, p);
            ctx.stroke();
        }

        ctx.globalAlpha = 0.06;
        ctx.drawImage(masterNoise, 0, 0, SIZE, SIZE);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(SIZE, SIZE);
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, 0, SIZE, SIZE);
        bCtx.strokeStyle = '#b4b4b4';
        bCtx.lineWidth = 1.5;
        for (let i = 0; i <= TILES; i++) {
            const p = i * TILE;
            bCtx.beginPath();
            bCtx.moveTo(p, 0);
            bCtx.lineTo(p, SIZE);
            bCtx.moveTo(0, p);
            bCtx.lineTo(SIZE, p);
            bCtx.stroke();
        }
        bCtx.globalAlpha = 0.18;
        bCtx.drawImage(masterNoise, 0, 0, SIZE, SIZE);
        bCtx.globalAlpha = 1.0;

        const map = TextureMechanics._createWrappedTexture(canvas, 14, 14);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 14, 14);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.018,
            roughness: 0.9,
            metalness: 0.0
        });
    }

    static _buildAtriumAssets(masterNoise) {
        const {canvas: marbleCanvas, ctx: marbleCtx} = TextureMechanics._createContext(512, 512);
        marbleCtx.fillStyle = '#efe7d8';
        marbleCtx.fillRect(0, 0, 512, 512);
        marbleCtx.globalAlpha = 0.4;
        marbleCtx.drawImage(masterNoise, 0, 0, 512, 512);
        marbleCtx.globalAlpha = 1.0;
        const drawVein = (color, width, alpha) => {
            marbleCtx.strokeStyle = color;
            marbleCtx.lineWidth = width;
            marbleCtx.globalAlpha = alpha;
            marbleCtx.beginPath();
            let vx = Math.random() * 512;
            let vy = 0;
            marbleCtx.moveTo(vx, vy);
            while (vy < 512) {
                vx += (Math.random() - 0.5) * 140;
                vy += 40 + Math.random() * 60;
                marbleCtx.lineTo(vx, vy);
            }
            marbleCtx.stroke();
        };
        for (let i = 0; i < 9; i++) {
            drawVein('rgba(150, 138, 118, 1)', 1 + Math.random() * 2, 0.25 + Math.random() * 0.2);
        }
        for (let i = 0; i < 3; i++) {
            drawVein('rgba(197, 163, 74, 1)', 1 + Math.random() * 1.5, 0.35);
        }
        marbleCtx.globalAlpha = 1.0;
        const sheen = marbleCtx.createLinearGradient(0, 0, 512, 512);
        sheen.addColorStop(0.0, 'rgba(255,255,255,0.0)');
        sheen.addColorStop(0.45, 'rgba(255,255,255,0.12)');
        sheen.addColorStop(0.55, 'rgba(255,255,255,0.0)');
        sheen.addColorStop(1.0, 'rgba(255,255,255,0.0)');
        marbleCtx.fillStyle = sheen;
        marbleCtx.fillRect(0, 0, 512, 512);
        const marbleTexture = TextureMechanics._createWrappedTexture(marbleCanvas, 2, 1);
        const marbleMat = new THREE.MeshStandardMaterial({
            map: marbleTexture,
            color: 0xffffff,
            bumpMap: marbleTexture,
            bumpScale: 0.015,
            roughness: 0.18,
            metalness: 0.15
        });
        const {canvas: shelfBumpCanvas, ctx: shelfBumpCtx} = TextureMechanics._createContext(256, 256);
        shelfBumpCtx.fillStyle = '#808080';
        shelfBumpCtx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 2) {
            shelfBumpCtx.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.04})`;
            shelfBumpCtx.beginPath();
            shelfBumpCtx.moveTo(0, y);
            shelfBumpCtx.lineTo(256, y);
            shelfBumpCtx.stroke();
            shelfBumpCtx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.04})`;
            shelfBumpCtx.beginPath();
            shelfBumpCtx.moveTo(0, y + 1);
            shelfBumpCtx.lineTo(256, y + 1);
            shelfBumpCtx.stroke();
        }
        shelfBumpCtx.globalAlpha = 0.08;
        shelfBumpCtx.drawImage(masterNoise, 0, 0, 256, 256);
        shelfBumpCtx.globalAlpha = 1.0;
        const shelfBumpTexture = TextureMechanics._createWrappedTexture(shelfBumpCanvas, 2, 2);
        const shelfMat = new THREE.MeshStandardMaterial({
            color: 0xc9bd9e,
            bumpMap: shelfBumpTexture,
            bumpScale: 0.006,
            roughness: 0.6,
            metalness: 0.2
        });
        const atriumSmearMat = this._buildAtriumSmear();
        const flc = document.createElement('canvas');
        flc.width = flc.height = 128;
        const flx = flc.getContext('2d');
        flx.fillStyle = '#2c3d24';
        flx.fillRect(0, 0, 128, 128);
        const leafShades = ['#3a5230', '#243620', '#4a6238', '#31452a', '#556b3e'];
        for (let i = 0; i < 260; i++) {
            flx.fillStyle = leafShades[Math.floor(Math.random() * leafShades.length)];
            flx.beginPath();
            flx.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 7, 0, Math.PI * 2);
            flx.fill();
        }
        flx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 40; i++) {
            flx.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 10, 1 + Math.random() * 3);
        }
        const flTex = new THREE.CanvasTexture(flc);
        flTex.wrapS = flTex.wrapT = THREE.RepeatWrapping;
        const foliageMat = new THREE.MeshStandardMaterial({map: flTex, roughness: 0.95, metalness: 0.0});
        const fvc = document.createElement('canvas');
        fvc.width = 256;
        fvc.height = 128;
        const fvx = fvc.getContext('2d');
        const fvGrad = fvx.createLinearGradient(0, 0, 0, 128);
        fvGrad.addColorStop(0, '#000000');
        fvGrad.addColorStop(0.55, '#020402');
        fvGrad.addColorStop(1, '#060c05');
        fvx.fillStyle = fvGrad;
        fvx.fillRect(0, 0, 256, 128);
        const fvRows = [
            {c: '#0a120a', n: 90, hMin: 18, hMax: 34},
            {c: '#0e1a0b', n: 55, hMin: 30, hMax: 52},
            {c: '#132410', n: 32, hMin: 46, hMax: 74}
        ];
        for (let ri = 0; ri < fvRows.length; ri++) {
            const row = fvRows[ri];
            fvx.strokeStyle = row.c;
            for (let i = 0; i < row.n; i++) {
                const sx0 = Math.random() * 256;
                const sh = row.hMin + Math.random() * (row.hMax - row.hMin);
                fvx.lineWidth = 1 + Math.random() * 2;
                fvx.beginPath();
                fvx.moveTo(sx0, 128);
                fvx.lineTo(sx0 + (Math.random() - 0.5) * 6, 128 - sh);
                fvx.stroke();
            }
        }
        const fvTex = new THREE.CanvasTexture(fvc);
        fvTex.wrapS = fvTex.wrapT = THREE.RepeatWrapping;
        const farVoidMat = new THREE.MeshBasicMaterial({map: fvTex});
        return {marbleMat, shelfMat, atriumSmearMat, foliageMat, farVoidMat};
    }

    static _buildAtriumSmear() {
        const W = 512, H = 64;
        const RAIL = 11;
        const rand = TextureMechanics._seededRandom(73310945);
        const {canvas, ctx} = TextureMechanics._createContext(W, H);

        const PALETTE = [
            {w: 14, c: [188, 178, 150]},
            {w: 10, c: [34, 31, 27]},
            {w: 13, c: [186, 62, 54]},
            {w: 8, c: [156, 44, 44]},
            {w: 6, c: [206, 88, 62]},
            {w: 12, c: [78, 138, 84]},
            {w: 7, c: [58, 106, 70]},
            {w: 5, c: [104, 156, 88]},
            {w: 12, c: [62, 100, 158]},
            {w: 7, c: [46, 76, 126]},
            {w: 5, c: [86, 128, 184]},
            {w: 11, c: [232, 224, 198]},
            {w: 7, c: [210, 200, 172]},
            {w: 9, c: [206, 178, 126]}
        ];
        const TOTAL = PALETTE.reduce((s, p) => s + p.w, 0);
        const pick = () => {
            let t = rand() * TOTAL;
            for (const p of PALETTE) {
                t -= p.w;
                if (t <= 0) return p.c;
            }
            return PALETTE[0].c;
        };

        let x = 0;
        while (x < W) {
            const run = 5 + Math.floor(rand() * 24);
            const c = pick();
            const j = 0.88 + rand() * 0.24;
            const shade = (k) => Math.max(0, Math.min(255, Math.round(c[0 + k] * j)));
            ctx.fillStyle = `rgb(${shade(0)}, ${shade(1)}, ${shade(2)})`;
            ctx.fillRect(x, 0, run, H - RAIL);
            ctx.fillStyle = `rgb(${Math.round(shade(0) * 0.52)}, ${Math.round(shade(1) * 0.52)}, ${Math.round(shade(2) * 0.52)})`;
            ctx.fillRect(x, H - RAIL, run, RAIL);
            if (rand() > 0.45) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(x, 0, 1, H);
            }
            x += run;
        }
        ctx.fillStyle = 'rgb(20, 19, 17)';
        ctx.fillRect(0, H - 2, W, 2);

        const map = TextureMechanics._createWrappedTexture(canvas, 1, 1, true);
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.LinearMipmapLinearFilter;
        return new THREE.MeshStandardMaterial({
            map,
            emissiveMap: map,
            emissive: 0xffffff,
            emissiveIntensity: 0.05,
            roughness: 0.92,
            metalness: 0.0,
            vertexColors: true
        });
    }
}
