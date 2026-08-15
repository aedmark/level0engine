import TextureMechanics from '../TextureMechanics.js';

export default class ClinicTextures {
    static _buildClinicWall(masterNoise) {
        const W = 512, H = 512;
        const UNITS = 3.0;
        const yAt = (u) => H - (u / UNITS) * H;
        const RAIL_Y = yAt(0.95);
        const BASE_TOP = yAt(0.10);
        const rand = TextureMechanics._seededRandom(66104923);
        const wrapX = (x, reach, fn) => {
            const ox = x < reach ? W : (x > W - reach ? -W : 0);
            fn(x);
            if (ox) fn(x + ox);
        };

        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#b4b4b4';
        bCtx.fillRect(0, 0, W, H);

        const field = ctx.createLinearGradient(0, 0, 0, H);
        field.addColorStop(0.0, 'rgb(208, 200, 181)');
        field.addColorStop(0.62, 'rgb(202, 194, 175)');
        field.addColorStop(1.0, 'rgb(188, 180, 163)');
        ctx.fillStyle = field;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 40; i++) {
            const x = rand() * W, y = rand() * H, r = 40 + rand() * 90;
            wrapX(x, r, (px) => {
                const g = ctx.createRadialGradient(px, y, 0, px, y, r);
                const warm = rand() > 0.5;
                g.addColorStop(0, warm
                    ? `rgba(211, 208, 198, ${0.05 + rand() * 0.06})`
                    : `rgba(174, 172, 165, ${0.05 + rand() * 0.06})`);
                g.addColorStop(1, 'rgba(196, 193, 185, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, y - r, r * 2, r * 2);
            });
        }

        for (let i = 0; i < 14000; i++) {
            const x = rand() * W, y = rand() * H, r = 0.6 + rand() * 1.5;
            const up = rand() > 0.5;
            ctx.fillStyle = up ? `rgba(213, 211, 203, 0.20)` : `rgba(178, 176, 169, 0.18)`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            bCtx.fillStyle = up ? 'rgba(210,210,210,0.30)' : 'rgba(140,140,140,0.30)';
            bCtx.beginPath();
            bCtx.arc(x, y, r, 0, Math.PI * 2);
            bCtx.fill();
        }

        ctx.lineCap = 'round';
        for (let i = 0; i < 150; i++) {
            const spread = (rand() + rand() + rand() - 1.5) * 105;
            const y = RAIL_Y + spread;
            if (y < 10 || y > BASE_TOP) continue;
            const x = rand() * W;
            const len = 14 + rand() * 90;
            const tilt = (rand() - 0.5) * 0.34;
            const near = 1 - Math.min(1, Math.abs(y - RAIL_Y) / 150);
            wrapX(x, len + 20, (px) => {
                ctx.strokeStyle = `rgba(101, 98, 92, ${(0.04 + rand() * 0.09) * (0.45 + near)})`;
                ctx.lineWidth = 0.8 + rand() * 2.6;
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.quadraticCurveTo(px + len * 0.5, y + Math.sin(tilt) * len * 0.35,
                    px + Math.cos(tilt) * len, y + Math.sin(tilt) * len);
                ctx.stroke();
            });
        }

        for (let i = 0; i < 90; i++) {
            const bias = rand();
            const y = bias < 0.80
                ? BASE_TOP - rand() * (BASE_TOP - RAIL_Y + 60)
                : yAt(1.2 + rand() * 1.7);
            const x = rand() * W;
            const r = 1.6 + rand() * 5.2;
            const pts = 5 + Math.floor(rand() * 4);
            const phase = rand() * Math.PI * 2;
            wrapX(x, r + 6, (px) => {
                const path = () => {
                    ctx.beginPath();
                    for (let p = 0; p <= pts; p++) {
                        const a = (p / pts) * Math.PI * 2 + phase;
                        const rr = r * (0.55 + rand() * 0.65);
                        const qx = px + Math.cos(a) * rr, qy = y + Math.sin(a) * rr;
                        if (p === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
                    }
                    ctx.closePath();
                };
                path();
                ctx.fillStyle = `rgba(122, 112, 96, ${0.35 + rand() * 0.3})`;
                ctx.fill();
                ctx.beginPath();
                for (let p = 0; p <= pts; p++) {
                    const a = (p / pts) * Math.PI * 2 + phase;
                    const rr = r * 0.78 * (0.82 + rand() * 0.26);
                    const qx = px + Math.cos(a) * rr - 0.3, qy = y + Math.sin(a) * rr - 0.3;
                    if (p === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(228, 223, 210, ${0.55 + rand() * 0.35})`;
                ctx.fill();
                bCtx.fillStyle = `rgba(70,70,70,${0.5 + rand() * 0.35})`;
                bCtx.beginPath();
                bCtx.arc(px, y, r * 0.75, 0, Math.PI * 2);
                bCtx.fill();
            });
        }

        for (let i = 0; i < 26; i++) {
            const y = RAIL_Y + (rand() + rand() - 1) * 130;
            if (y < 20 || y > BASE_TOP) continue;
            const x = rand() * W, len = 8 + rand() * 40;
            wrapX(x, len + 10, (px) => {
                ctx.strokeStyle = `rgba(219, 214, 201, ${0.06 + rand() * 0.09})`;
                ctx.lineWidth = 0.4 + rand() * 0.5;
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.lineTo(px + len, y + (rand() - 0.5) * 5);
                ctx.stroke();
            });
        }

        ctx.fillStyle = 'rgb(78, 76, 71)';
        ctx.fillRect(0, BASE_TOP, W, H - BASE_TOP);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.fillRect(0, BASE_TOP, W, 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(0, BASE_TOP - 2, W, 2);
        for (let i = 0; i < 70; i++) {
            const x = rand() * W, y = BASE_TOP + rand() * (H - BASE_TOP);
            ctx.fillStyle = `rgba(28, 27, 25, ${0.06 + rand() * 0.16})`;
            ctx.fillRect(x, y, 4 + rand() * 30, 1 + rand() * 2);
        }
        bCtx.fillStyle = '#8c8c8c';
        bCtx.fillRect(0, BASE_TOP, W, H - BASE_TOP);
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, BASE_TOP - 1, W, 3);

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, W, H, rand, 15);

        const map = TextureMechanics._createWrappedTexture(canvas, 4, 1, true);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 4, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.014,
            roughness: 0.72,
            metalness: 0.02
        });
    }

    static _buildClinicRail(masterNoise) {
        const W = 512, H = 74;
        const rand = TextureMechanics._seededRandom(31885402);
        const wrapX = (x, reach, fn) => {
            const ox = x < reach ? W : (x > W - reach ? -W : 0);
            fn(x);
            if (ox) fn(x + ox);
        };

        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#9a9a9a';
        bCtx.fillRect(0, 0, W, H);

        const BODY_TOP = 9, BODY_BOT = H - 9;

        const body = ctx.createLinearGradient(0, BODY_TOP, 0, BODY_BOT);
        body.addColorStop(0.0, 'rgb(150, 144, 135)');
        body.addColorStop(0.30, 'rgb(140, 134, 125)');
        body.addColorStop(0.72, 'rgb(126, 120, 112)');
        body.addColorStop(1.0, 'rgb(116, 111, 104)');
        ctx.fillStyle = body;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 900; i++) {
            const x = rand() * W, y = BODY_TOP + rand() * (BODY_BOT - BODY_TOP);
            ctx.fillStyle = rand() > 0.5
                ? `rgba(163, 157, 148, ${0.05 + rand() * 0.08})`
                : `rgba(103, 98, 92, ${0.05 + rand() * 0.08})`;
            ctx.fillRect(x, y, 1 + rand() * 2, 1);
        }

        const lip = (y, h, top) => {
            ctx.fillStyle = top ? 'rgb(176, 174, 167)' : 'rgb(148, 146, 140)';
            ctx.fillRect(0, y, W, h);
            ctx.fillStyle = 'rgba(255, 255, 250, 0.35)';
            ctx.fillRect(0, top ? y : y + h - 1, W, 1);
            bCtx.fillStyle = '#e8e8e8';
            bCtx.fillRect(0, y, W, h);
        };
        lip(0, 5, true);
        lip(H - 5, 5, false);

        ctx.fillStyle = 'rgba(38, 34, 30, 0.55)';
        ctx.fillRect(0, 5, W, 4);
        ctx.fillRect(0, H - 9, W, 4);
        bCtx.fillStyle = '#3a3a3a';
        bCtx.fillRect(0, 5, W, 4);
        bCtx.fillRect(0, H - 9, W, 4);

        ctx.lineCap = 'round';
        for (let i = 0; i < 120; i++) {
            const y = BODY_TOP + 3 + rand() * (BODY_BOT - BODY_TOP - 6);
            const len = 20 + rand() * 150;
            const x = rand() * W;
            const dark = rand() > 0.4;
            wrapX(x, len + 10, (px) => {
                ctx.strokeStyle = dark
                    ? `rgba(52, 48, 44, ${0.10 + rand() * 0.22})`
                    : `rgba(196, 192, 184, ${0.10 + rand() * 0.20})`;
                ctx.lineWidth = 0.5 + rand() * 1.6;
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.lineTo(px + len, y + (rand() - 0.5) * 3);
                ctx.stroke();
            });
        }

        for (let i = 0; i < 16; i++) {
            const y = BODY_TOP + 6 + rand() * (BODY_BOT - BODY_TOP - 14);
            const len = 12 + rand() * 60;
            const x = rand() * W;
            wrapX(x, len + 10, (px) => {
                ctx.strokeStyle = `rgba(206, 202, 193, ${0.4 + rand() * 0.35})`;
                ctx.lineWidth = 0.8 + rand() * 1.4;
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.lineTo(px + len, y + (rand() - 0.5) * 2);
                ctx.stroke();
                bCtx.strokeStyle = `rgba(60, 60, 60, ${0.35 + rand() * 0.3})`;
                bCtx.lineWidth = 0.8 + rand() * 1.4;
                bCtx.beginPath();
                bCtx.moveTo(px, y);
                bCtx.lineTo(px + len, y + (rand() - 0.5) * 2);
                bCtx.stroke();
            });
        }

        ctx.globalAlpha = 0.05;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 8);

        const map = TextureMechanics._createWrappedTexture(canvas, 4, 1, true);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 4, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.004,
            roughness: 0.44,
            metalness: 0.08
        });
    }

    static _buildClinicCeiling(masterNoise) {
        const SIZE = 512;
        const COLS = 4, ROWS = 2;
        const TW = SIZE / COLS, TH = SIZE / ROWS;
        const GRID_W = 5;
        const rand = TextureMechanics._seededRandom(41207788);
        const wrapped = (x, y, reach, fn) => TextureMechanics._wrapDraw(SIZE, x, y, reach, fn);

        const {canvas, ctx} = TextureMechanics._createContext(SIZE, SIZE);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(SIZE, SIZE);
        bCtx.fillStyle = '#c8c8c8';
        bCtx.fillRect(0, 0, SIZE, SIZE);

        const tiles = [];
        for (let i = 0; i < COLS * ROWS; i++) {
            const replaced = rand() > 0.86;
            tiles.push({
                replaced,
                age: replaced ? 0.05 + rand() * 0.12 : 0.35 + rand() * 0.65,
                stain: 0
            });
        }

        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                const base = 232 - t.age * 26;
                ctx.fillStyle = `rgb(${base | 0}, ${base - t.age * 7 | 0}, ${base - t.age * 20 | 0})`;
                ctx.fillRect(tx * TW, ty * TH, TW, TH);
            }
        }

        ctx.lineCap = 'round';
        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const ox = tx * TW, oy = ty * TH;
                const along = rand() > 0.5;
                for (let f = 0; f < 150; f++) {
                    const x = ox + rand() * TW, y = oy + rand() * TH;
                    const len = 5 + rand() * 26;
                    const drift = (rand() - 0.5) * 1.1;
                    const ang = (along ? 0 : Math.PI / 2) + drift;
                    const dark = 0.05 + rand() * 0.10;
                    const w = 0.6 + rand() * 1.3;
                    const cpx = x + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 5;
                    const cpy = y + Math.sin(ang) * len * 0.5 + (rand() - 0.5) * 5;
                    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
                    ctx.strokeStyle = `rgba(120, 114, 102, ${dark})`;
                    ctx.lineWidth = w;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
                    ctx.stroke();
                    bCtx.strokeStyle = `rgba(70, 70, 70, ${dark * 0.85})`;
                    bCtx.lineWidth = w;
                    bCtx.beginPath();
                    bCtx.moveTo(x, y);
                    bCtx.quadraticCurveTo(cpx, cpy, ex, ey);
                    bCtx.stroke();
                }
                for (let p = 0; p < 260; p++) {
                    const x = ox + rand() * TW, y = oy + rand() * TH;
                    const r = 0.5 + rand() * 0.9;
                    const a = 0.10 + rand() * 0.16;
                    ctx.fillStyle = `rgba(108, 102, 92, ${a})`;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                    bCtx.fillStyle = `rgba(96, 96, 96, ${a * 1.1})`;
                    bCtx.beginPath();
                    bCtx.arc(x, y, r, 0, Math.PI * 2);
                    bCtx.fill();
                }
            }
        }

        const island = (cx, cy, r, wob, phase, lobes) => {
            const pts = 20;
            ctx.beginPath();
            for (let i = 0; i <= pts; i++) {
                const a = (i / pts) * Math.PI * 2;
                const lobe = 0.5 + 0.5 * Math.sin(a * lobes + phase);
                const lobe2 = 0.5 + 0.5 * Math.sin(a * (lobes + 2) - phase * 1.7);
                const rr = r * (1 - wob + wob * (lobe * 0.65 + lobe2 * 0.35) + (rand() - 0.5) * 0.14);
                const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
        };


        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                if (t.replaced) continue;
                const cx = tx * TW + TW / 2, cy = ty * TH + TH / 2;
                const r = Math.min(TW, TH) * 0.62;
                const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
                g.addColorStop(0, `rgba(96, 90, 78, ${0.05 * t.age})`);
                g.addColorStop(1, 'rgba(96, 90, 78, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(tx * TW, ty * TH, TW, TH);
            }
        }

        for (let i = 0; i < COLS; i++) {
            const p = i * TW;
            ctx.fillStyle = 'rgba(30, 28, 24, 0.20)';
            ctx.fillRect(p + GRID_W / 2, 0, 2, SIZE);
            ctx.fillStyle = 'rgb(228, 226, 219)';
            ctx.fillRect(p - GRID_W / 2, 0, GRID_W, SIZE);
            bCtx.fillStyle = '#ffffff';
            bCtx.fillRect(p - GRID_W / 2, 0, GRID_W, SIZE);
        }
        for (let i = 0; i < ROWS; i++) {
            const p = i * TH;
            ctx.fillStyle = 'rgba(30, 28, 24, 0.20)';
            ctx.fillRect(0, p + GRID_W / 2, SIZE, 2);
            ctx.fillStyle = 'rgb(228, 226, 219)';
            ctx.fillRect(0, p - GRID_W / 2, SIZE, GRID_W);
            bCtx.fillStyle = '#ffffff';
            bCtx.fillRect(0, p - GRID_W / 2, SIZE, GRID_W);
        }
        for (let i = 0; i < COLS; i++) {
            const p = i * TW;
            ctx.fillStyle = `rgba(146, 134, 112, ${0.10 + rand() * 0.12})`;
            ctx.fillRect(p - GRID_W / 2, 0, 1, SIZE);
            ctx.fillRect(p + GRID_W / 2 - 1, 0, 1, SIZE);
        }
        for (let i = 0; i < ROWS; i++) {
            const p = i * TH;
            ctx.fillStyle = `rgba(146, 134, 112, ${0.10 + rand() * 0.12})`;
            ctx.fillRect(0, p - GRID_W / 2, SIZE, 1);
            ctx.fillRect(0, p + GRID_W / 2 - 1, SIZE, 1);
        }

        ctx.globalAlpha = 0.05;
        ctx.drawImage(masterNoise, 0, 0, SIZE, SIZE);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        const map = TextureMechanics._createWrappedTexture(canvas, 21, 21);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 21, 21);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.005,
            roughness: 0.97,
            metalness: 0.0,
            emissiveMap: map,
            emissive: 0x4e5458,
            shadowSide: THREE.DoubleSide
        });
    }

    static _buildClinicFloor(masterNoise) {
        const SIZE = 512;
        const TILES = 8;
        const TILE = SIZE / TILES;
        const rand = TextureMechanics._seededRandom(80512377);
        const wrapped = (x, y, reach, fn) => TextureMechanics._wrapDraw(SIZE, x, y, reach, fn);

        const {canvas, ctx} = TextureMechanics._createContext(SIZE, SIZE);

        const {canvas: roughCanvas, ctx: rCtx} = TextureMechanics._createContext(SIZE, SIZE);
        rCtx.fillStyle = 'rgb(107, 107, 107)';
        rCtx.fillRect(0, 0, SIZE, SIZE);
        rCtx.lineCap = 'round';

        for (let ty = 0; ty < TILES; ty++) {
            for (let tx = 0; tx < TILES; tx++) {
                const shade = 231 + Math.floor(rand() * 7);
                ctx.fillStyle = `rgb(${shade - 3}, ${shade}, ${shade + 2})`;
                ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
            }
        }

        for (let i = 0; i < 16; i++) {
            const x = rand() * SIZE, y = rand() * SIZE, r = 70 + rand() * 130;
            wrapped(x, y, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                g.addColorStop(0, `rgba(214, 202, 164, ${0.05 + rand() * 0.06})`);
                g.addColorStop(1, 'rgba(214, 202, 164, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }

        ctx.lineCap = 'round';
        for (let s = 0; s < 34; s++) {
            const cx = rand() * SIZE, cy = rand() * SIZE;
            const baseR = 16 + rand() * 46;
            const arcs = 2 + Math.floor(rand() * 4);
            for (let a = 0; a < arcs; a++) {
                const r = baseR + a * (2.5 + rand() * 3.5);
                const start = rand() * Math.PI * 2;
                const sweep = 0.7 + rand() * 2.2;
                wrapped(cx, cy, r + 6, (px, py) => {
                    const w = 0.7 + rand() * 1.1;
                    ctx.strokeStyle = `rgba(206, 210, 212, ${0.07 + rand() * 0.08})`;
                    ctx.lineWidth = w;
                    ctx.beginPath();
                    ctx.arc(px, py, r, start, start + sweep);
                    ctx.stroke();
                    rCtx.strokeStyle = `rgba(58, 58, 58, ${0.30 + rand() * 0.35})`;
                    rCtx.lineWidth = w + 0.6;
                    rCtx.beginPath();
                    rCtx.arc(px, py, r, start, start + sweep);
                    rCtx.stroke();
                });
            }
        }

        for (let t = 0; t < 9; t++) {
            const x = rand() * SIZE, y = rand() * SIZE;
            const angle = rand() * Math.PI * 2;
            const len = 60 + rand() * 150;
            const gap = 12 + rand() * 16;
            const nx = -Math.sin(angle) * gap, ny = Math.cos(angle) * gap;
            for (const [sx, sy] of [[0, 0], [nx, ny]]) {
                wrapped(x + sx, y + sy, len + 30, (px, py) => {
                    ctx.strokeStyle = `rgba(122, 120, 116, ${0.06 + rand() * 0.07})`;
                    ctx.lineWidth = 0.8 + rand() * 1.0;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
                    ctx.stroke();
                });
            }
        }

        for (let c = 0; c < 10; c++) {
            const cx = rand() * SIZE, cy = rand() * SIZE;
            const marks = 1 + Math.floor(rand() * 2);
            for (let m = 0; m < marks; m++) {
                const x = cx + (rand() - 0.5) * 40, y = cy + (rand() - 0.5) * 40;
                const len = 5 + rand() * 13;
                const angle = rand() * Math.PI * 2;
                const bow = (rand() - 0.5) * 9;
                wrapped(x, y, len + 24, (px, py) => {
                    ctx.strokeStyle = `rgba(96, 94, 92, ${0.06 + rand() * 0.09})`;
                    ctx.lineWidth = 0.8 + rand() * 1.3;
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

        for (let i = 0; i <= TILES; i++) {
            const p = i * TILE;
            for (let seg = 0; seg < TILES * 2; seg++) {
                const a = seg * (SIZE / (TILES * 2));
                const b = a + SIZE / (TILES * 2);
                const grime = 0.30 + rand() * 0.38;
                const gw = 1.1 + rand() * 0.5;
                ctx.strokeStyle = `rgba(154, 152, 143, ${grime})`;
                ctx.lineWidth = gw;
                ctx.beginPath();
                ctx.moveTo(p, a);
                ctx.lineTo(p, b);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(a, p);
                ctx.lineTo(b, p);
                ctx.stroke();
                rCtx.strokeStyle = `rgba(196, 196, 196, ${0.55 + grime * 0.4})`;
                rCtx.lineWidth = gw + 0.4;
                rCtx.beginPath();
                rCtx.moveTo(p, a);
                rCtx.lineTo(p, b);
                rCtx.stroke();
                rCtx.beginPath();
                rCtx.moveTo(a, p);
                rCtx.lineTo(b, p);
                rCtx.stroke();
            }
        }

        ctx.globalAlpha = 0.035;
        ctx.drawImage(masterNoise, 0, 0, SIZE, SIZE);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(SIZE, SIZE);
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, 0, SIZE, SIZE);
        bCtx.strokeStyle = '#9a9a9a';
        bCtx.lineWidth = 2.0;
        for (let i = 0; i <= TILES; i++) {
            const p = i * TILE;
            bCtx.beginPath();
            bCtx.moveTo(p, 0);
            bCtx.lineTo(p, SIZE);
            bCtx.moveTo(0, p);
            bCtx.lineTo(SIZE, p);
            bCtx.stroke();
        }

        const map = TextureMechanics._createWrappedTexture(canvas, 21, 21);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 21, 21);
        const roughnessMap = TextureMechanics._createWrappedTexture(roughCanvas, 21, 21);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.012,
            roughnessMap,
            roughness: 1.0,
            metalness: 0.12
        });
    }
}
