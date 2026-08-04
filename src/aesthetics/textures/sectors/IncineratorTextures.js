/**
 * [ROLE] Generates specialized procedural textures specific to the Incinerator sector.
 * [WHY] Sector-specific aesthetics require unique material generation without bloating the global texture pools.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API.
 */
import TextureMechanics from '../TextureMechanics.js';

export default class IncineratorTextures {
    static _buildIncineratorFloor(masterNoise) {
        const S = 1024;
        const CELLS = 32;
        const C = S / CELLS;
        const rand = TextureMechanics._seededRandom(52308871);
        const wrap = (x, y, reach, fn) => TextureMechanics._wrapDraw(S, x, y, reach, fn);

        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(S, S);
        bCtx.fillStyle = '#8a8a8a';
        bCtx.fillRect(0, 0, S, S);

        ctx.fillStyle = 'rgb(104, 99, 95)';
        ctx.fillRect(0, 0, S, S);

        for (let i = 0; i < 70; i++) {
            const x = rand() * S, y = rand() * S, r = 40 + rand() * 130;
            wrap(x, y, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                const up = rand() > 0.5;
                const a = 0.05 + rand() * 0.08;
                g.addColorStop(0, up ? `rgba(140,134,128,${a})` : `rgba(72,68,64,${a})`);
                g.addColorStop(1, up ? 'rgba(140,134,128,0)' : 'rgba(72,68,64,0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }

        const paths = [];
        for (let i = 0; i < 5; i++) {
            paths.push({x: rand() * S, y: rand() * S, r: 90 + rand() * 200});
        }
        const wearAt = (x, y) => {
            let w = 0;
            for (const p of paths) {
                let dx = Math.abs(x - p.x), dy = Math.abs(y - p.y);
                if (dx > S / 2) dx = S - dx;
                if (dy > S / 2) dy = S - dy;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < p.r) w = Math.max(w, 1 - d / p.r);
            }
            return w;
        };

        const bar = (cx, cy, ang, len, wid, worn) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(ang);
            const top = 168 - worn * 34;
            const bot = 60 + worn * 18;
            const g = ctx.createLinearGradient(0, -wid / 2, 0, wid / 2);
            g.addColorStop(0, `rgb(${top | 0}, ${top - 5 | 0}, ${top - 10 | 0})`);
            g.addColorStop(0.55, `rgb(${118 - worn * 16 | 0}, ${113 - worn * 16 | 0}, ${107 - worn * 16 | 0})`);
            g.addColorStop(1, `rgb(${bot | 0}, ${bot - 3 | 0}, ${bot - 6 | 0})`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.roundRect(-len / 2, -wid / 2, len, wid, wid / 2);
            ctx.fill();
            ctx.restore();

            bCtx.save();
            bCtx.translate(cx, cy);
            bCtx.rotate(ang);
            const h = 236 - worn * 90;
            bCtx.fillStyle = `rgb(${h | 0},${h | 0},${h | 0})`;
            bCtx.beginPath();
            bCtx.roundRect(-len / 2, -wid / 2, len, wid, wid / 2);
            bCtx.fill();
            bCtx.restore();
        };
        for (let gy = 0; gy < CELLS; gy++) {
            for (let gx = 0; gx < CELLS; gx++) {
                const cx = gx * C + C / 2, cy = gy * C + C / 2;
                const ang = ((gx + gy) % 2 === 0 ? 1 : -1) * Math.PI / 4 + (rand() - 0.5) * 0.05;
                const worn = wearAt(cx, cy);
                for (const k of [-1, 1]) {
                    const ox = Math.cos(ang + Math.PI / 2) * C * 0.21 * k;
                    const oy = Math.sin(ang + Math.PI / 2) * C * 0.21 * k;
                    wrap(cx + ox, cy + oy, C, (px, py) =>
                        bar(px, py, ang, C * 0.62, C * 0.20, worn));
                }
            }
        }

        for (const p of [S / 2, S]) {
            ctx.fillStyle = 'rgba(28, 24, 22, 0.55)';
            ctx.fillRect(p - 3, 0, 4, S);
            ctx.fillRect(0, p - 3, S, 4);
            ctx.fillStyle = 'rgba(158, 150, 142, 0.30)';
            ctx.fillRect(p + 1, 0, 2, S);
            ctx.fillRect(0, p + 1, S, 2);
            bCtx.fillStyle = '#3c3c3c';
            bCtx.fillRect(p - 3, 0, 4, S);
            bCtx.fillRect(0, p - 3, S, 4);
        }

        for (let i = 0; i < 150; i++) {
            const x = rand() * S, y = rand() * S, r = 10 + rand() * 52;
            wrap(x, y, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                const a = 0.07 + rand() * 0.14;
                g.addColorStop(0, `rgba(182, 176, 166, ${a})`);
                g.addColorStop(1, 'rgba(182, 176, 166, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }
        for (let gy = 0; gy < CELLS; gy++) {
            for (let gx = 0; gx < CELLS; gx++) {
                const cx = gx * C + C / 2, cy = gy * C + C / 2;
                const worn = wearAt(cx, cy);
                const ang = ((gx + gy) % 2 === 0 ? 1 : -1) * Math.PI / 4;
                for (const k of [-1, 1]) {
                    const ox = Math.cos(ang + Math.PI / 2) * C * 0.21 * k;
                    const oy = Math.sin(ang + Math.PI / 2) * C * 0.21 * k;
                    wrap(cx + ox, cy + oy, C, (px, py) => {
                        ctx.save();
                        ctx.translate(px, py);
                        ctx.rotate(ang);
                        ctx.fillStyle = `rgba(196, 188, 178, ${0.30 - worn * 0.16})`;
                        ctx.beginPath();
                        ctx.roundRect(-C * 0.29, -C * 0.09, C * 0.58, C * 0.07, C * 0.035);
                        ctx.fill();
                        ctx.restore();
                    });
                }
            }
        }

        for (let i = 0; i < 9; i++) {
            const x = rand() * S, y = rand() * S, r = 40 + rand() * 90;
            wrap(x, y, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, r * 0.1, px, py, r);
                g.addColorStop(0, `rgba(20, 14, 11, ${0.18 + rand() * 0.14})`);
                g.addColorStop(0.62, `rgba(58, 30, 16, ${0.10 + rand() * 0.08})`);
                g.addColorStop(0.86, `rgba(122, 62, 24, ${0.06 + rand() * 0.05})`);
                g.addColorStop(1, 'rgba(122, 62, 24, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }

        for (let i = 0; i < 3600; i++) {
            const x = rand() * S, y = rand() * S, r = 0.7 + rand() * 2.2;
            wrap(x, y, r + 1, (px, py) => {
                ctx.fillStyle = `rgba(46, 40, 36, ${0.18 + rand() * 0.30})`;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
                bCtx.fillStyle = `rgba(60, 60, 60, ${0.20 + rand() * 0.30})`;
                bCtx.beginPath();
                bCtx.arc(px, py, r, 0, Math.PI * 2);
                bCtx.fill();
            });
        }

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, S, S);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, S, S, rand, 6);

        const map = TextureMechanics._createWrappedTexture(canvas, 14, 14);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 14, 14);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.006,
            roughness: 0.6,
            metalness: 0.1,
            shadowSide: THREE.DoubleSide
        });
    }

    static _buildIncineratorWall(masterNoise) {
        const W = 512, H = 768;
        const UNITS_W = 2.0, UNITS_H = 3.0;
        const PPU = W / UNITS_W;
        const yAt = (u) => H - (u / UNITS_H) * H;
        const rand = TextureMechanics._seededRandom(46113920);
        const wrapX = (x, reach, fn) => {
            const ox = x < reach ? W : (x > W - reach ? -W : 0);
            fn(x);
            if (ox) fn(x + ox);
        };

        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#8e8e8e';
        bCtx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgb(104, 98, 93)';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 60; i++) {
            const x = rand() * W, y = rand() * H, r = 40 + rand() * 120;
            wrapX(x, r, (px) => {
                const g = ctx.createRadialGradient(px, y, 0, px, y, r);
                const up = rand() > 0.5;
                const a = 0.05 + rand() * 0.09;
                g.addColorStop(0, up ? `rgba(142,136,128,${a})` : `rgba(70,66,62,${a})`);
                g.addColorStop(1, up ? 'rgba(142,136,128,0)' : 'rgba(70,66,62,0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, y - r, r * 2, r * 2);
            });
        }

        const temper = [
            {top: yAt(0.0), bot: yAt(0.5), col: '92, 104, 132', a: 0.10},
            {top: yAt(0.3), bot: yAt(0.9), col: '108, 78, 122', a: 0.07},
            {top: yAt(0.7), bot: yAt(1.3), col: '132, 92, 48', a: 0.09},
            {top: yAt(1.1), bot: yAt(1.8), col: '158, 132, 62', a: 0.08}
        ];
        for (const t of temper) {
            for (let i = 0; i < 13; i++) {
                const x = rand() * W;
                const cy = t.bot + rand() * (t.top - t.bot);
                const r = 30 + rand() * 80;
                wrapX(x, r, (px) => {
                    const g = ctx.createRadialGradient(px, cy, 0, px, cy, r);
                    g.addColorStop(0, `rgba(${t.col}, ${t.a * (0.5 + rand() * 0.6)})`);
                    g.addColorStop(1, `rgba(${t.col}, 0)`);
                    ctx.fillStyle = g;
                    ctx.fillRect(px - r, cy - r, r * 2, r * 2);
                });
            }
        }

        const RIVET_R = 0.020 * PPU;
        const RIVET_PITCH = 0.16 * PPU;
        const rivet = (x, y) => {
            wrapX(x, RIVET_R + 3, (px) => {
                const g = ctx.createRadialGradient(
                    px - RIVET_R * 0.35, y - RIVET_R * 0.35, RIVET_R * 0.1, px, y, RIVET_R);
                g.addColorStop(0, 'rgba(224, 216, 202, 0.95)');
                g.addColorStop(0.55, 'rgba(132, 123, 114, 0.9)');
                g.addColorStop(1, 'rgba(34, 29, 25, 0.92)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px, y, RIVET_R, 0, Math.PI * 2);
                ctx.fill();
                bCtx.fillStyle = '#f4f4f4';
                bCtx.beginPath();
                bCtx.arc(px, y, RIVET_R * 0.86, 0, Math.PI * 2);
                bCtx.fill();
            });
        };
        const rivetRow = (y) => {
            for (let x = RIVET_PITCH * 0.5; x < W; x += RIVET_PITCH) {
                rivet(x + (rand() - 0.5) * 1.5, y + (rand() - 0.5) * 1.5);
            }
        };

        const courses = [yAt(0.34), yAt(1.22), yAt(2.10)];
        for (const y of courses) {
            ctx.fillStyle = 'rgba(24, 20, 17, 0.55)';
            ctx.fillRect(0, y, W, 5);
            ctx.fillStyle = 'rgba(158, 150, 140, 0.22)';
            ctx.fillRect(0, y - 2, W, 2);
            bCtx.fillStyle = '#c8c8c8';
            bCtx.fillRect(0, y - 3, W, 3);
            bCtx.fillStyle = '#4c4c4c';
            bCtx.fillRect(0, y, W, 5);
            rivetRow(y - 15);
            rivetRow(y + 19);
        }

        for (let sx = 0; sx < W; sx += PPU) {
            const strapW = 0.20 * PPU;
            ctx.fillStyle = 'rgba(150, 142, 133, 0.16)';
            ctx.fillRect(sx - strapW / 2, 0, strapW, H);
            ctx.fillStyle = 'rgba(24, 20, 17, 0.42)';
            ctx.fillRect(sx - strapW / 2 - 2, 0, 2, H);
            ctx.fillRect(sx + strapW / 2, 0, 2, H);
            bCtx.fillStyle = '#bcbcbc';
            bCtx.fillRect(sx - strapW / 2, 0, strapW, H);
            for (let y = RIVET_PITCH * 0.6; y < H; y += RIVET_PITCH) {
                rivet(sx - strapW * 0.28, y);
                rivet(sx + strapW * 0.28, y);
            }
        }

        const base = yAt(0.22);
        ctx.fillStyle = 'rgba(38, 32, 27, 0.5)';
        ctx.fillRect(0, base, W, H - base);
        ctx.fillStyle = 'rgba(20, 16, 13, 0.6)';
        ctx.fillRect(0, base, W, 4);
        bCtx.fillStyle = '#d8d8d8';
        bCtx.fillRect(0, base, W, H - base);
        rivetRow(base + 22);
        const head = yAt(2.82);
        ctx.fillStyle = 'rgba(44, 38, 32, 0.42)';
        ctx.fillRect(0, 0, W, head);
        bCtx.fillStyle = '#d0d0d0';
        bCtx.fillRect(0, 0, W, head);
        rivetRow(head - 18);

        ctx.lineCap = 'round';
        for (let i = 0; i < 55; i++) {
            const x = rand() * W;
            const y0 = courses[Math.floor(rand() * courses.length)] + (rand() - 0.5) * 40;
            const len = 25 + rand() * 130;
            wrapX(x, 12, (px) => {
                const g = ctx.createLinearGradient(0, y0, 0, y0 - len);
                g.addColorStop(0, `rgba(26, 22, 19, ${0.09 + rand() * 0.15})`);
                g.addColorStop(1, 'rgba(26, 22, 19, 0)');
                ctx.strokeStyle = g;
                ctx.lineWidth = 2 + rand() * 16;
                ctx.beginPath();
                ctx.moveTo(px, y0);
                ctx.lineTo(px + (rand() - 0.5) * 34, y0 - len);
                ctx.stroke();
            });
        }

        for (let i = 0; i < 70; i++) {
            const x = rand() * W, y0 = rand() * H, len = 12 + rand() * 70;
            wrapX(x, 8, (px) => {
                const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
                g.addColorStop(0, `rgba(128, 68, 30, ${0.22 + rand() * 0.24})`);
                g.addColorStop(1, 'rgba(128, 68, 30, 0)');
                ctx.strokeStyle = g;
                ctx.lineWidth = 1 + rand() * 2.6;
                ctx.beginPath();
                ctx.moveTo(px, y0);
                ctx.lineTo(px + (rand() - 0.5) * 5, y0 + len);
                ctx.stroke();
            });
        }

        for (let i = 0; i < 2600; i++) {
            const x = rand() * W, y = rand() * H, r = 0.6 + rand() * 1.9;
            wrapX(x, r + 1, (px) => {
                ctx.fillStyle = `rgba(52, 45, 40, ${0.14 + rand() * 0.26})`;
                ctx.beginPath();
                ctx.arc(px, y, r, 0, Math.PI * 2);
                ctx.fill();
                bCtx.fillStyle = `rgba(66, 66, 66, ${0.16 + rand() * 0.24})`;
                bCtx.beginPath();
                bCtx.arc(px, y, r, 0, Math.PI * 2);
                bCtx.fill();
            });
        }

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 7);

        const map = TextureMechanics._createWrappedTexture(canvas, 2, 1, true);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 2, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.009,
            roughness: 0.62,
            metalness: 0.1
        });
    }

    static _buildSightGlass(masterNoise) {
        const S = 256;
        const rand = TextureMechanics._seededRandom(70455312);
        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const {canvas: eCanvas, ctx: eCtx} = TextureMechanics._createContext(S, S);
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, S, S);
        ctx.fillStyle = 'rgb(18, 12, 9)';
        ctx.fillRect(0, 0, S, S);

        const cx = S * (0.42 + rand() * 0.16), cy = S * (0.52 + rand() * 0.14);
        const core = (c, mul) => {
            const g = c.createRadialGradient(cx, cy, 0, cx, cy, S * 0.46);
            g.addColorStop(0.00, `rgba(255, 246, 214, ${1.0 * mul})`);
            g.addColorStop(0.16, `rgba(255, 206, 96, ${0.96 * mul})`);
            g.addColorStop(0.38, `rgba(238, 116, 24, ${0.82 * mul})`);
            g.addColorStop(0.64, `rgba(150, 44, 8, ${0.5 * mul})`);
            g.addColorStop(1.00, 'rgba(40, 10, 4, 0)');
            c.fillStyle = g;
            c.fillRect(0, 0, S, S);
        };
        core(ctx, 1);
        core(eCtx, 1);

        for (let i = 0; i < 90; i++) {
            const a = rand() * Math.PI * 2, d = rand() * S * 0.38;
            const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
            const r = 4 + rand() * 26;
            const hot = rand() > 0.42;
            for (const c of [ctx, eCtx]) {
                const g = c.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, hot
                    ? `rgba(255, 232, 168, ${0.30 + rand() * 0.34})`
                    : `rgba(52, 16, 6, ${0.28 + rand() * 0.30})`);
                g.addColorStop(1, hot ? 'rgba(255, 232, 168, 0)' : 'rgba(52, 16, 6, 0)');
                c.fillStyle = g;
                c.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }

        const MESH = S / 9;
        ctx.strokeStyle = 'rgba(16, 11, 8, 0.82)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = MESH * 0.5; i < S; i += MESH) {
            ctx.moveTo(i, 0); ctx.lineTo(i, S);
            ctx.moveTo(0, i); ctx.lineTo(S, i);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(210, 150, 90, 0.20)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = MESH * 0.5; i < S; i += MESH) {
            ctx.moveTo(i - 1, 0); ctx.lineTo(i - 1, S);
            ctx.moveTo(0, i - 1); ctx.lineTo(S, i - 1);
        }
        ctx.stroke();
        eCtx.globalCompositeOperation = 'destination-out';
        eCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        eCtx.lineWidth = 2.4;
        eCtx.beginPath();
        for (let i = MESH * 0.5; i < S; i += MESH) {
            eCtx.moveTo(i, 0); eCtx.lineTo(i, S);
            eCtx.moveTo(0, i); eCtx.lineTo(S, i);
        }
        eCtx.stroke();
        eCtx.globalCompositeOperation = 'source-over';

        ctx.lineCap = 'round';
        for (let i = 0; i < 26; i++) {
            let x = rand() * S, y = rand() * S;
            ctx.strokeStyle = `rgba(236, 208, 176, ${0.10 + rand() * 0.16})`;
            ctx.lineWidth = 0.5 + rand() * 0.9;
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let k = 0; k < 3 + Math.floor(rand() * 4); k++) {
                x += (rand() - 0.5) * 46;
                y += (rand() - 0.5) * 46;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        for (const c of [ctx, eCtx]) {
            const v = c.createLinearGradient(0, 0, 0, S);
            v.addColorStop(0, 'rgba(10, 7, 5, 0.72)');
            v.addColorStop(0.42, 'rgba(10, 7, 5, 0.16)');
            v.addColorStop(1, 'rgba(10, 7, 5, 0.44)');
            c.fillStyle = v;
            c.fillRect(0, 0, S, S);
            const e = c.createRadialGradient(S / 2, S / 2, S * 0.22, S / 2, S / 2, S * 0.62);
            e.addColorStop(0, 'rgba(8, 5, 4, 0)');
            e.addColorStop(1, 'rgba(8, 5, 4, 0.9)');
            c.fillStyle = e;
            c.fillRect(0, 0, S, S);
        }
        for (let i = 0; i < 40; i++) {
            const x = rand() * S, y = rand() * S, r = 10 + rand() * 46;
            for (const c of [ctx, eCtx]) {
                const g = c.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, `rgba(12, 8, 6, ${0.18 + rand() * 0.28})`);
                g.addColorStop(1, 'rgba(12, 8, 6, 0)');
                c.fillStyle = g;
                c.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }

        const B = S * 0.085;
        for (const c of [ctx, eCtx]) {
            c.fillStyle = c === ctx ? 'rgb(38, 31, 26)' : '#000000';
            c.fillRect(0, 0, S, B);
            c.fillRect(0, S - B, S, B);
            c.fillRect(0, 0, B, S);
            c.fillRect(S - B, 0, B, S);
        }
        ctx.strokeStyle = 'rgba(150, 122, 96, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(B, B, S - B * 2, S - B * 2);
        for (const [bx, by] of [[B * 0.5, B * 0.5], [S - B * 0.5, B * 0.5],
            [B * 0.5, S - B * 0.5], [S - B * 0.5, S - B * 0.5]]) {
            const g = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0.5, bx, by, B * 0.42);
            g.addColorStop(0, 'rgba(178, 158, 134, 0.9)');
            g.addColorStop(1, 'rgba(24, 18, 14, 0.9)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(bx, by, B * 0.42, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 0.06;
        ctx.drawImage(masterNoise, 0, 0, S, S);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, S, S, rand, 5);

        return {
            map: TextureMechanics._createWrappedTexture(canvas),
            emissiveMap: TextureMechanics._createWrappedTexture(eCanvas)
        };
    }

    static _buildEmberGrate(masterNoise) {
        const S = 256;
        const BARS = 7;
        const P = S / BARS;
        const rand = TextureMechanics._seededRandom(18820644);
        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const {canvas: eCanvas, ctx: eCtx} = TextureMechanics._createContext(S, S);

        for (const c of [ctx, eCtx]) {
            c.fillStyle = c === ctx ? 'rgb(46, 16, 6)' : 'rgb(58, 18, 6)';
            c.fillRect(0, 0, S, S);
        }
        for (let i = 0; i < 150; i++) {
            const x = rand() * S, y = rand() * S, r = 6 + rand() * 40;
            const hot = rand() > 0.45;
            for (const c of [ctx, eCtx]) {
                const g = c.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, hot
                    ? `rgba(255, 214, 122, ${0.34 + rand() * 0.4})`
                    : `rgba(28, 10, 5, ${0.30 + rand() * 0.36})`);
                g.addColorStop(1, hot ? 'rgba(255, 214, 122, 0)' : 'rgba(28, 10, 5, 0)');
                c.fillStyle = g;
                c.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }

        for (let i = 0; i < BARS; i++) {
            const y = i * P + P * 0.30;
            const h = P * 0.46;
            const g = ctx.createLinearGradient(0, y, 0, y + h);
            g.addColorStop(0, 'rgb(76, 66, 58)');
            g.addColorStop(0.34, 'rgb(44, 37, 32)');
            g.addColorStop(1, 'rgb(16, 12, 10)');
            ctx.fillStyle = g;
            ctx.fillRect(0, y, S, h);
            ctx.fillStyle = 'rgba(168, 146, 120, 0.22)';
            ctx.fillRect(0, y, S, 1.5);
            eCtx.fillStyle = '#000000';
            eCtx.fillRect(0, y, S, h);
        }

        for (let i = 0; i < 70; i++) {
            const x = rand() * S, y = S * (0.4 + rand() * 0.6), r = 8 + rand() * 34;
            for (const c of [ctx, eCtx]) {
                const g = c.createRadialGradient(x, y, 0, x, y, r);
                const col = c === ctx ? '150, 142, 130' : '0, 0, 0';
                g.addColorStop(0, `rgba(${col}, ${0.16 + rand() * 0.26})`);
                g.addColorStop(1, `rgba(${col}, 0)`);
                c.fillStyle = g;
                c.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, S, S);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, S, S, rand, 5);

        return {
            map: TextureMechanics._createWrappedTexture(canvas),
            emissiveMap: TextureMechanics._createWrappedTexture(eCanvas)
        };
    }

    static _buildIncineratorAssets(masterNoise) {
        const dpCanvas = document.createElement('canvas');
        dpCanvas.width = dpCanvas.height = 256;
        const dpc = dpCanvas.getContext('2d');
        dpc.fillStyle = '#33343a';
        dpc.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 60; i++) {
            dpc.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
            dpc.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 30, 1 + Math.random() * 3);
        }
        for (let gy = 0; gy < 8; gy++) {
            for (let gx = 0; gx < 8; gx++) {
                dpc.save();
                dpc.translate(gx * 32 + 16, gy * 32 + 16);
                dpc.rotate(((gx + gy) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4);
                for (let k = -1; k <= 1; k++) {
                    dpc.fillStyle = '#4a4c55';
                    dpc.strokeStyle = '#22232a';
                    dpc.beginPath();
                    dpc.rect(-10, k * 9 - 2.5, 20, 5);
                    dpc.fill();
                    dpc.stroke();
                    dpc.fillStyle = 'rgba(255,255,255,0.10)';
                    dpc.fillRect(-10, k * 9 - 2.5, 20, 1.5);
                }
                dpc.restore();
            }
        }
        const dpTex = new THREE.CanvasTexture(dpCanvas);
        dpTex.wrapS = dpTex.wrapT = THREE.RepeatWrapping;
        dpTex.repeat.set(14, 14);
        const diamondPlateMat = new THREE.MeshStandardMaterial({
            map: dpTex, bumpMap: dpTex, bumpScale: 0.05, metalness: 0.25, roughness: 0.75
        });
        const ccv = document.createElement('canvas');
        ccv.width = ccv.height = 256;
        const cpx = ccv.getContext('2d');
        cpx.fillStyle = '#191411';
        cpx.fillRect(0, 0, 256, 256);
        for (let py = 0; py < 4; py++) {
            for (let px = 0; px < 4; px++) {
                const shade = 18 + Math.floor(Math.random() * 14);
                cpx.fillStyle = `rgb(${shade + 6},${shade},${Math.max(0, shade - 4)})`;
                cpx.fillRect(px * 64 + 1, py * 64 + 1, 62, 62);
                cpx.fillStyle = '#0d0b09';
                [[6, 6], [58, 6], [6, 58], [58, 58], [32, 6], [6, 32], [58, 32], [32, 58]].forEach(rv => {
                    cpx.beginPath();
                    cpx.arc(px * 64 + rv[0], py * 64 + rv[1], 2.2, 0, Math.PI * 2);
                    cpx.fill();
                });
                cpx.fillStyle = 'rgba(255,255,255,0.06)';
                [[6, 6], [58, 6], [6, 58], [58, 58]].forEach(rv => {
                    cpx.beginPath();
                    cpx.arc(px * 64 + rv[0] - 0.7, py * 64 + rv[1] - 0.7, 1.0, 0, Math.PI * 2);
                    cpx.fill();
                });
            }
        }
        cpx.strokeStyle = '#0a0908';
        cpx.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
            cpx.beginPath();
            cpx.moveTo(i * 64, 0);
            cpx.lineTo(i * 64, 256);
            cpx.stroke();
            cpx.beginPath();
            cpx.moveTo(0, i * 64);
            cpx.lineTo(256, i * 64);
            cpx.stroke();
        }
        for (let i = 0; i < 10; i++) {
            const sx = Math.random() * 256, sy = Math.random() * 256, sr = 20 + Math.random() * 45;
            const sGrad = cpx.createRadialGradient(sx, sy, 2, sx, sy, sr);
            sGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
            sGrad.addColorStop(1, 'rgba(0,0,0,0)');
            cpx.fillStyle = sGrad;
            cpx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        }
        cpx.strokeStyle = 'rgba(220,80,20,0.5)';
        cpx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            let ex = Math.random() * 256, ey = Math.random() * 256;
            cpx.beginPath();
            cpx.moveTo(ex, ey);
            for (let s = 0; s < 5; s++) {
                ex += (Math.random() - 0.5) * 22;
                ey += (Math.random() - 0.5) * 22;
                cpx.lineTo(ex, ey);
            }
            cpx.stroke();
        }
        const ceilTex = new THREE.CanvasTexture(ccv);
        ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
        ceilTex.repeat.set(7, 7);
        const incinCeilingMat = new THREE.MeshStandardMaterial({
            map: ceilTex, bumpMap: ceilTex, bumpScale: 0.03, metalness: 0.3, roughness: 0.9
        });
        const sg = this._buildSightGlass(masterNoise);
        const gr = this._buildEmberGrate(masterNoise);
        return {
            diamondPlateMat,
            incinFloorMat: this._buildIncineratorFloor(masterNoise),
            incinWallMat: this._buildIncineratorWall(masterNoise),
            incinCeilingMat,
            emberLightMat: new THREE.MeshStandardMaterial({
                map: sg.map, emissiveMap: sg.emissiveMap,
                color: 0xffffff, emissive: 0xff6a22, emissiveIntensity: 1.0,
                roughness: 0.34, metalness: 0.0
            }),
            emberLightBrokenMat: new THREE.MeshStandardMaterial({
                map: sg.map, emissiveMap: sg.emissiveMap,
                color: 0x6b5a4e, emissive: 0x1d0e06, emissiveIntensity: 1.0,
                roughness: 0.5, metalness: 0.0
            }),
            emberGrateMat: new THREE.MeshStandardMaterial({
                map: gr.map, emissiveMap: gr.emissiveMap,
                color: 0xffffff, emissive: 0xff5a18, emissiveIntensity: 1.15,
                roughness: 0.86, metalness: 0.0
            })
        };
    }
}
