/**
 * [ROLE] Central procedural generator for highly reusable prop materials (wood, pipes, breaker panels, stainless steel).
 * [WHY] Complex layered props require bespoke noise and wear patterns, generated procedurally to minimize asset footprint.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API; builds assets consumed by specific sector generators.
 */
import TextureMechanics from '../TextureMechanics.js';

export default class PropTextures {
    static _buildWood(masterNoise) {
        const W = 512, H = 1024;
        const rand = TextureMechanics._seededRandom(48120773);
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);

        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, W, H);

        const BOARDS = 3;
        const edges = [];
        for (let i = 0; i <= BOARDS; i++) edges.push(Math.round(i * W / BOARDS));

        const wrapX = (x, reach, fn) => {
            fn(x);
            if (x < reach) fn(x + W);
            else if (x > W - reach) fn(x - W);
        };

        for (let b = 0; b < BOARDS; b++) {
            const left = edges[b], right = edges[b + 1];
            const span = right - left;

            ctx.fillStyle = `hsl(${22 + rand() * 10}, ${34 + rand() * 12}%, ${30 + rand() * 9}%)`;
            ctx.fillRect(left, 0, span, H);

            const pith = left + span * (-0.6 + rand() * 2.2);
            const k1 = 1 + Math.floor(rand() * 2);
            const k2 = 3 + Math.floor(rand() * 3);
            const a1 = 3 + rand() * 7;
            const a2 = 0.8 + rand() * 2.0;
            const p1 = rand() * Math.PI * 2;
            const p2 = rand() * Math.PI * 2;
            const wob = (y, x0) => {
                const near = 1 + 2.6 * Math.exp(-Math.abs(x0 - pith) / 70);
                return near * (a1 * Math.sin(2 * Math.PI * k1 * y / H + p1)
                    + a2 * Math.sin(2 * Math.PI * k2 * y / H + p2));
            };
            const grain = (target, x0, width, style) => {
                wrapX(x0, 26, (sx) => {
                    target.beginPath();
                    for (let y = 0; y <= H; y += 8) {
                        const px = sx + wob(y, x0);
                        if (y === 0) target.moveTo(px, y); else target.lineTo(px, y);
                    }
                    target.strokeStyle = style;
                    target.lineWidth = width;
                    target.stroke();
                });
            };

            let x = left + rand() * 5;
            while (x < right) {
                const ring = 3.5 + Math.pow(rand(), 1.7) * 17;
                x += ring;
                if (x >= right) break;
                const tight = 1 - Math.min(1, ring / 20);
                const width = 0.9 + tight * 2.4;
                grain(ctx, x, width, `rgba(46,26,11,${(0.16 + tight * 0.30).toFixed(3)})`);
                grain(bCtx, x, width, `rgba(70,70,70,${(0.20 + tight * 0.32).toFixed(3)})`);
                if (ring > 12) {
                    grain(ctx, x + ring * 0.32, ring * 0.30, 'rgba(190,150,100,0.05)');
                }
            }

            const pores = Math.round(span * 5.2);
            for (let i = 0; i < pores; i++) {
                const px = left + rand() * span;
                const py = rand() * H;
                const len = 2 + rand() * 8;
                const a = 0.10 + rand() * 0.20;
                const lw = 0.6 + rand() * 0.7;
                const pore = (oy) => {
                    const y0 = py + oy, y1 = py + len + oy;
                    ctx.strokeStyle = `rgba(38,20,8,${a.toFixed(3)})`;
                    ctx.lineWidth = lw;
                    ctx.beginPath();
                    ctx.moveTo(px + wob(py, px), y0);
                    ctx.lineTo(px + wob(py + len, px), y1);
                    ctx.stroke();
                    bCtx.strokeStyle = `rgba(58,58,58,${(a * 1.5).toFixed(3)})`;
                    bCtx.lineWidth = 0.8;
                    bCtx.beginPath();
                    bCtx.moveTo(px + wob(py, px), y0);
                    bCtx.lineTo(px + wob(py + len, px), y1);
                    bCtx.stroke();
                };
                pore(0);
                if (py + len > H) pore(-H);
            }

            if (rand() > 0.45) {
                const flecks = Math.round(span * 0.9);
                for (let i = 0; i < flecks; i++) {
                    const px = left + rand() * span;
                    const py = rand() * H;
                    const len = 3 + rand() * 9;
                    ctx.strokeStyle = `rgba(214,182,132,${(0.04 + rand() * 0.07).toFixed(3)})`;
                    ctx.lineWidth = 0.6 + rand() * 1.1;
                    ctx.beginPath();
                    ctx.moveTo(px - len / 2, py);
                    ctx.lineTo(px + len / 2, py + (rand() - 0.5) * 2);
                    ctx.stroke();
                }
            }
        }

        for (let i = 0; i < 26; i++) {
            const bx = rand() * W, by = rand() * H;
            const r = 40 + rand() * 150;
            const dark = rand() > 0.45;
            const a = 0.05 + rand() * 0.06;
            const blot = (sx, sy) => {
                const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
                g.addColorStop(0, dark ? `rgba(26,14,5,${a})` : `rgba(196,156,104,${a * 0.7})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI * 2);
                ctx.fill();
            };
            const oxs = bx < r ? [0, W] : (bx > W - r ? [0, -W] : [0]);
            const oys = by < r ? [0, H] : (by > H - r ? [0, -H] : [0]);
            for (const ox of oxs) for (const oy of oys) blot(bx + ox, by + oy);
        }

        for (let i = 0; i < BOARDS; i++) {
            const seam = (target, darkStyle, lightStyle) => {
                wrapX(edges[i], 4, (x) => {
                    target.fillStyle = darkStyle;
                    target.fillRect(x - 0.5, 0, 1.6, H);
                    target.fillStyle = lightStyle;
                    target.fillRect(x + 1.4, 0, 1.0, H);
                });
            };
            seam(ctx, 'rgba(20,10,3,0.55)', 'rgba(210,175,125,0.06)');
            seam(bCtx, 'rgba(40,40,40,0.75)', 'rgba(190,190,190,0.25)');
        }

        ctx.globalAlpha = 0.05;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 4);
        TextureMechanics._ditherCanvas(bCtx, W, H, rand, 3);
        return {canvas, bumpCanvas};
    }

    static _buildDoor(woodCanvas, woodBumpCanvas, masterNoise) {
        const W = 256, H = 512;
        const rand = TextureMechanics._seededRandom(20514477);
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);

        const STILE = 32;
        const members = [
            {x: 0, y: 0, w: STILE, h: H, horiz: false},
            {x: W - STILE, y: 0, w: STILE, h: H, horiz: false},
            {x: STILE, y: 0, w: W - STILE * 2, h: 32, horiz: true},
            {x: STILE, y: 232, w: W - STILE * 2, h: 28, horiz: true},
            {x: STILE, y: 480, w: W - STILE * 2, h: 32, horiz: true}
        ];
        const panels = [
            {x: STILE, y: 32, w: W - STILE * 2, h: 200, horiz: false},
            {x: STILE, y: 260, w: W - STILE * 2, h: 220, horiz: false}
        ];

        const place = (target, src, m, ox, oy) => {
            target.save();
            target.beginPath();
            target.rect(m.x, m.y, m.w, m.h);
            target.clip();
            if (m.horiz) {
                const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
                target.translate(cx, cy);
                target.rotate(-Math.PI / 2);
                target.translate(-cx, -cy);
            }
            for (let ty = -1; ty <= 1; ty++) {
                for (let tx = -1; tx <= 1; tx++) {
                    target.drawImage(src, tx * W - ox, ty * H - oy, W, H);
                }
            }
            target.restore();
        };

        for (const m of members.concat(panels)) {
            const ox = rand() * W, oy = rand() * H;
            place(ctx, woodCanvas, m, ox, oy);
            place(bCtx, woodBumpCanvas, m, ox, oy);
        }

        const AO = 15;
        for (const p of panels) {
            const edges = [
                [p.x, 0, p.x + AO, 0],
                [p.x + p.w, 0, p.x + p.w - AO, 0],
                [0, p.y, 0, p.y + AO],
                [0, p.y + p.h, 0, p.y + p.h - AO]
            ];
            for (const [x0, y0, x1, y1] of edges) {
                const g = ctx.createLinearGradient(x0, y0, x1, y1);
                g.addColorStop(0, 'rgba(0,0,0,0.34)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        }

        const {canvas: maskCanvas, ctx: mCtx} = TextureMechanics._createContext(W, H);
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, W, H);
        mCtx.filter = 'blur(4px)';
        mCtx.fillStyle = '#8e8e8e';
        for (const p of panels) {
            mCtx.fillRect(p.x + 5, p.y + 5, p.w - 10, p.h - 10);
        }
        mCtx.filter = 'none';
        bCtx.globalCompositeOperation = 'multiply';
        bCtx.drawImage(maskCanvas, 0, 0);
        bCtx.globalCompositeOperation = 'source-over';

        const grime = ctx.createLinearGradient(0, H, 0, H - 120);
        grime.addColorStop(0, 'rgba(18,12,6,0.34)');
        grime.addColorStop(1, 'rgba(18,12,6,0)');
        ctx.fillStyle = grime;
        ctx.fillRect(0, H - 120, W, 120);

        ctx.fillStyle = '#8a7e32';
        ctx.beginPath();
        ctx.arc(210, 260, 12, 0, Math.PI * 2);
        ctx.fill();
        bCtx.fillStyle = '#f2f2f2';
        bCtx.beginPath();
        bCtx.arc(210, 260, 12, 0, Math.PI * 2);
        bCtx.fill();

        ctx.globalAlpha = 0.05;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 4);
        return {canvas, bumpCanvas};
    }

    static _buildPipeMaterial(masterNoise) {
        const W = 256, H = 512;
        const rand = TextureMechanics._seededRandom(77410233);
        const wrapY = (y, reach, fn) => {
            const oy = y < reach ? H : (y > H - reach ? -H : 0);
            fn(y);
            if (oy) fn(y + oy);
        };

        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#9c9c9c';
        bCtx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgb(156, 162, 150)';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 620; i++) {
            const x = rand() * W, y = rand() * H, len = 30 + rand() * 220;
            ctx.strokeStyle = rand() > 0.5
                ? `rgba(186, 192, 180, ${0.05 + rand() * 0.10})`
                : `rgba(128, 134, 124, ${0.05 + rand() * 0.10})`;
            ctx.lineWidth = 1 + rand() * 4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (rand() - 0.5) * 4, y + len);
            ctx.stroke();
        }

        const seamX = rand() * W;
        ctx.strokeStyle = 'rgba(126, 132, 122, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(seamX, 0);
        ctx.lineTo(seamX, H);
        ctx.stroke();
        bCtx.strokeStyle = 'rgba(190, 190, 190, 0.8)';
        bCtx.lineWidth = 2.5;
        bCtx.beginPath();
        bCtx.moveTo(seamX, 0);
        bCtx.lineTo(seamX, H);
        bCtx.stroke();

        const collar = (cy) => {
            wrapY(cy, 26, (y) => {
                ctx.fillStyle = 'rgba(46, 48, 44, 0.42)';
                ctx.fillRect(0, y - 13, W, 3);
                ctx.fillRect(0, y + 10, W, 3);
                ctx.fillStyle = 'rgb(172, 178, 166)';
                ctx.fillRect(0, y - 10, W, 20);
                ctx.fillStyle = 'rgba(206, 212, 200, 0.5)';
                ctx.fillRect(0, y - 10, W, 3);
                bCtx.fillStyle = '#f0f0f0';
                bCtx.fillRect(0, y - 10, W, 20);
                bCtx.fillStyle = '#4a4a4a';
                bCtx.fillRect(0, y - 13, W, 3);
                bCtx.fillRect(0, y + 10, W, 3);
            });
        };
        collar(0);
        collar(H / 2);

        const chips = [];
        for (let i = 0; i < 46; i++) {
            const nearCollar = rand() > 0.35;
            const y = nearCollar
                ? (rand() > 0.5 ? 0 : H / 2) + (rand() - 0.5) * 54
                : rand() * H;
            const x = rand() * W;
            const r = 2 + rand() * 7;
            chips.push({x, y, r});
            wrapY(y, r + 4, (yy) => {
                ctx.beginPath();
                const pts = 9;
                for (let p = 0; p <= pts; p++) {
                    const a = (p / pts) * Math.PI * 2;
                    const rr = r * (0.55 + rand() * 0.7);
                    const px = x + Math.cos(a) * rr, py = yy + Math.sin(a) * rr;
                    if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(200, 202, 196, ${0.6 + rand() * 0.3})`;
                ctx.fill();
                ctx.strokeStyle = 'rgba(88, 92, 84, 0.45)';
                ctx.lineWidth = 1;
                ctx.stroke();
                bCtx.fillStyle = 'rgba(120, 120, 120, 0.55)';
                bCtx.beginPath();
                bCtx.arc(x, yy, r * 0.8, 0, Math.PI * 2);
                bCtx.fill();
            });
        }

        ctx.lineCap = 'round';
        for (const c of chips) {
            if (rand() > 0.62) continue;
            const runs = 1 + Math.floor(rand() * 3);
            for (let s = 0; s < runs; s++) {
                const len = 20 + rand() * 150;
                const x = c.x + (rand() - 0.5) * c.r * 1.6;
                const g = ctx.createLinearGradient(0, c.y, 0, c.y + len);
                g.addColorStop(0, `rgba(150, 90, 42, ${0.30 + rand() * 0.25})`);
                g.addColorStop(1, 'rgba(150, 90, 42, 0)');
                ctx.strokeStyle = g;
                ctx.lineWidth = 0.8 + rand() * 2.4;
                ctx.beginPath();
                ctx.moveTo(x, c.y);
                ctx.lineTo(x + (rand() - 0.5) * 6, c.y + len);
                ctx.stroke();
            }
        }

        const dirt = ctx.createLinearGradient(0, H, 0, H * 0.55);
        dirt.addColorStop(0, 'rgba(52, 50, 42, 0.20)');
        dirt.addColorStop(1, 'rgba(52, 50, 42, 0)');
        ctx.fillStyle = dirt;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 6);

        const map = TextureMechanics._createWrappedTexture(canvas, 1, 2);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 1, 2);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.004,
            roughness: 0.45,
            metalness: 0.05
        });
    }

    static _buildBreakerPanelMaterial(masterNoise) {
        const W = 256, H = 320;
        const rand = TextureMechanics._seededRandom(51873109);
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#8e8e8e';
        bCtx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgb(156, 162, 150)';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 540; i++) {
            const x = rand() * W, y = rand() * H, len = 24 + rand() * 170;
            ctx.strokeStyle = rand() > 0.5
                ? `rgba(186, 192, 180, ${0.05 + rand() * 0.10})`
                : `rgba(128, 134, 124, ${0.05 + rand() * 0.10})`;
            ctx.lineWidth = 1 + rand() * 3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (rand() - 0.5) * 3, y + len);
            ctx.stroke();
        }

        const INSET = 22;
        ctx.fillStyle = 'rgba(132, 138, 128, 0.55)';
        ctx.fillRect(INSET, INSET, W - INSET * 2, H - INSET * 2);
        bCtx.fillStyle = '#6a6a6a';
        bCtx.fillRect(INSET, INSET, W - INSET * 2, H - INSET * 2);

        const bead = (x0, y0, x1, y1) => {
            const steps = Math.max(12, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const jx = (rand() - 0.5) * 2.4;
                const jy = (rand() - 0.5) * 2.4;
                const px = x0 + (x1 - x0) * t + jx;
                const py = y0 + (y1 - y0) * t + jy;
                const r = 2.6 + rand() * 2.2;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(178, 184, 172, ${0.55 + rand() * 0.35})`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.45, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(210, 216, 204, ${0.30 + rand() * 0.30})`;
                ctx.fill();
                bCtx.beginPath();
                bCtx.arc(px, py, r, 0, Math.PI * 2);
                bCtx.fillStyle = `rgba(240, 240, 240, ${0.6 + rand() * 0.3})`;
                bCtx.fill();
            }
        };
        bead(INSET, INSET, W - INSET, INSET);
        bead(W - INSET, INSET, W - INSET, H - INSET);
        bead(W - INSET, H - INSET, INSET, H - INSET);
        bead(INSET, H - INSET, INSET, INSET);

        const bolt = (bx, by) => {
            const r = 8.5;
            ctx.beginPath();
            for (let p = 0; p < 6; p++) {
                const a = (p / 6) * Math.PI * 2 + 0.3;
                const px = bx + Math.cos(a) * r, py = by + Math.sin(a) * r;
                if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgb(168, 174, 162)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(74, 78, 70, 0.7)';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bx - 2, by - 2.5, r * 0.34, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(214, 220, 208, 0.55)';
            ctx.fill();
            bCtx.beginPath();
            bCtx.arc(bx, by, r, 0, Math.PI * 2);
            bCtx.fillStyle = '#f4f4f4';
            bCtx.fill();
        };
        const BM = INSET / 2;
        bolt(BM, BM);
        bolt(W - BM, BM);
        bolt(BM, H - BM);
        bolt(W - BM, H - BM);

        const chips = [];
        for (let i = 0; i < 30; i++) {
            const x = rand() * W, y = rand() * H, r = 2 + rand() * 6;
            chips.push({x, y, r});
            ctx.beginPath();
            const pts = 9;
            for (let p = 0; p <= pts; p++) {
                const a = (p / pts) * Math.PI * 2;
                const rr = r * (0.55 + rand() * 0.7);
                const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
                if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = `rgba(200, 202, 196, ${0.55 + rand() * 0.3})`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(88, 92, 84, 0.45)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.lineCap = 'round';
        for (const c of chips) {
            if (rand() > 0.5) continue;
            const len = 16 + rand() * 90;
            const g = ctx.createLinearGradient(0, c.y, 0, c.y + len);
            g.addColorStop(0, `rgba(150, 90, 42, ${0.28 + rand() * 0.22})`);
            g.addColorStop(1, 'rgba(150, 90, 42, 0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 0.8 + rand() * 2.0;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(c.x + (rand() - 0.5) * 5, c.y + len);
            ctx.stroke();
        }

        const dirt = ctx.createLinearGradient(0, H, 0, H * 0.6);
        dirt.addColorStop(0, 'rgba(52, 50, 42, 0.22)');
        dirt.addColorStop(1, 'rgba(52, 50, 42, 0)');
        ctx.fillStyle = dirt;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 6);

        return new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(canvas),
            bumpMap: new THREE.CanvasTexture(bumpCanvas),
            bumpScale: 0.010,
            roughness: 0.45,
            metalness: 0.05
        });
    }

    static _buildStainlessMaterial(masterNoise) {
        const S = 512;
        const rand = TextureMechanics._seededRandom(30514877);
        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(S, S);
        bCtx.fillStyle = '#8c8c8c';
        bCtx.fillRect(0, 0, S, S);
        ctx.fillStyle = 'rgb(196, 203, 212)';
        ctx.fillRect(0, 0, S, S);

        for (let i = 0; i < 2600; i++) {
            const y = rand() * S;
            const x = rand() * S;
            const len = 60 + rand() * 300;
            const light = rand() > 0.5;
            ctx.strokeStyle = light
                ? `rgba(224, 230, 238, ${0.03 + rand() * 0.06})`
                : `rgba(164, 171, 180, ${0.03 + rand() * 0.06})`;
            ctx.lineWidth = 0.6 + rand() * 1.6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (rand() - 0.5) * 1.2, y + len);
            ctx.stroke();
        }

        for (let i = 0; i < 18; i++) {
            const y = rand() * S;
            const x = rand() * S;
            const len = 40 + rand() * 220;
            ctx.strokeStyle = `rgba(148, 155, 164, ${0.14 + rand() * 0.16})`;
            ctx.lineWidth = 0.8 + rand() * 1.1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (rand() - 0.5) * 2.0, y + len);
            ctx.stroke();
            bCtx.strokeStyle = `rgba(60, 60, 60, ${0.3 + rand() * 0.3})`;
            bCtx.lineWidth = 1.0;
            bCtx.beginPath();
            bCtx.moveTo(x, y);
            bCtx.lineTo(x + (rand() - 0.5) * 2.0, y + len);
            bCtx.stroke();
        }

        const grad = ctx.createLinearGradient(0, 0, 0, S);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(124, 130, 138, 0.10)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, S, S);

        ctx.globalAlpha = 0.04;
        ctx.drawImage(masterNoise, 0, 0, S, S);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, S, S, rand, 4);

        const map = TextureMechanics._createWrappedTexture(canvas, 1, 1);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 1, 1);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.003,
            roughness: 0.30,
            metalness: 0.15,
            emissive: 0x141a22,
            emissiveIntensity: 0.25
        });
    }

    static _buildStainlessDoorMaterial(masterNoise) {
        const W = 256, H = 336;
        const rand = TextureMechanics._seededRandom(66192384);
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#8c8c8c';
        bCtx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgb(148, 156, 166)';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 1500; i++) {
            const y = rand() * H, x = rand() * W;
            const len = 40 + rand() * 200;
            ctx.strokeStyle = rand() > 0.5
                ? `rgba(184, 192, 202, ${0.03 + rand() * 0.06})`
                : `rgba(118, 126, 136, ${0.03 + rand() * 0.06})`;
            ctx.lineWidth = 0.6 + rand() * 1.6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (rand() - 0.5) * 1.2, y + len);
            ctx.stroke();
        }

        const apexY = 96, baseY = 212, halfW = 72;
        ctx.fillStyle = 'rgba(24, 28, 34, 0.42)';
        ctx.beginPath();
        ctx.moveTo(W / 2, apexY);
        ctx.lineTo(W / 2 + halfW, baseY);
        ctx.lineTo(W / 2 - halfW, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(18, 22, 28, 0.55)';
        ctx.lineWidth = 3;
        ctx.stroke();
        bCtx.fillStyle = 'rgba(190, 190, 190, 0.5)';
        bCtx.beginPath();
        bCtx.moveTo(W / 2, apexY);
        bCtx.lineTo(W / 2 + halfW, baseY);
        bCtx.lineTo(W / 2 - halfW, baseY);
        bCtx.closePath();
        bCtx.fill();
        ctx.fillStyle = 'rgba(20, 24, 30, 0.5)';
        ctx.fillRect(W / 2 - 7, apexY + 44, 14, 44);
        ctx.beginPath();
        ctx.arc(W / 2, apexY + 102, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(28, 32, 38, 0.22)';
        ctx.fillRect(0, 250, W, 14);

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        grad.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(96, 104, 114, 0.14)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 0.05;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 4);

        return new THREE.MeshStandardMaterial({
            map: TextureMechanics._createWrappedTexture(canvas, 1, 1),
            bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas, 1, 1),
            bumpScale: 0.004,
            roughness: 0.34,
            metalness: 0.15,
            emissive: 0x101620,
            emissiveIntensity: 0.45
        });
    }

    static _buildCorrosionBump() {
        const S = 512;
        const rand = TextureMechanics._seededRandom(90218844);
        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const wrap = (x, y, reach, fn) => TextureMechanics._wrapDraw(S, x, y, reach, fn);

        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(0, 0, S, S);

        for (let i = 0; i < 90; i++) {
            const x = rand() * S, y = rand() * S, r = 14 + rand() * 52;
            const up = rand() > 0.45;
            wrap(x, y, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                const a = 0.10 + rand() * 0.16;
                g.addColorStop(0, up ? `rgba(210,210,210,${a})` : `rgba(96,96,96,${a})`);
                g.addColorStop(1, up ? 'rgba(210,210,210,0)' : 'rgba(96,96,96,0)');
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }

        for (let i = 0; i < 5200; i++) {
            const x = rand() * S, y = rand() * S, r = 0.6 + rand() * 2.6;
            const deep = rand() > 0.3;
            wrap(x, y, r + 1, (px, py) => {
                ctx.fillStyle = deep
                    ? `rgba(58, 58, 58, ${0.25 + rand() * 0.45})`
                    : `rgba(216, 216, 216, ${0.15 + rand() * 0.3})`;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        TextureMechanics._ditherCanvas(ctx, S, S, rand, 5);
        return TextureMechanics._createWrappedTexture(canvas, 2, 2);
    }

    static generatePegboardTexture() {
        const {canvas, ctx} = TextureMechanics._createContext(512, 512);

        ctx.fillStyle = '#b8a26a';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#000000';
        for (let i = 0; i < 50000; i++) {
            ctx.globalAlpha = Math.random() * 0.03;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#111111';
        
        const spacing = 32;
        const radius = 2.5;

        for (let y = 0; y < 512; y += spacing) {
            for (let x = 0; x < 512; x += spacing) {
                ctx.beginPath();
                ctx.arc(x + spacing/2, y + spacing/2, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        return TextureMechanics._createWrappedTexture(canvas, 1, 1);
    }

    static generateFernTexture() {
        const {canvas, ctx} = TextureMechanics._createContext(512, 512, false);
        ctx.clearRect(0, 0, 512, 512);

        ctx.strokeStyle = '#1a260d';
        ctx.fillStyle = '#293d14';
        
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(256, 512);
        ctx.quadraticCurveTo(270, 256, 256, 16);
        ctx.stroke();

        const drawLeaf = (x, y, angle, length, width) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(length / 2, -width, length, 0);
            ctx.quadraticCurveTo(length / 2, width, 0, 0);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.quadraticCurveTo(length/2, 0, length * 0.9, 0);
            ctx.strokeStyle = '#1e2e10';
            ctx.stroke();
            ctx.restore();
        };

        for (let y = 480; y > 32; y -= 16) {
            const progress = (512 - y) / 512;
            const length = 160 * (1 - progress * 0.8) + (Math.random() * 20 - 10);
            const width = 18 * (1 - Math.pow(progress, 2) * 0.6);
            
            const stemX = 256 + Math.sin(progress * Math.PI) * 14;
            
            drawLeaf(stemX, y, -0.4 - progress, length, width);
            drawLeaf(stemX, y, Math.PI + 0.4 + progress, length, width);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        return tex;
    }

    static _buildCartons() {
        const fbc = document.createElement('canvas');
        fbc.width = fbc.height = 128;
        const fbx = fbc.getContext('2d');
        fbx.fillStyle = '#b59a6d';
        fbx.fillRect(0, 0, 128, 128);
        fbx.fillStyle = 'rgba(0,0,0,0.12)';
        fbx.fillRect(0, 0, 128, 8);
        fbx.fillRect(0, 56, 128, 6);
        fbx.fillStyle = '#e8e2d2';
        fbx.fillRect(38, 72, 52, 26);
        fbx.strokeStyle = '#8a7a55';
        fbx.strokeRect(38, 72, 52, 26);
        fbx.fillStyle = 'rgba(60,50,30,0.5)';
        fbx.fillRect(44, 80, 40, 2);
        fbx.fillRect(44, 86, 28, 2);
        const fbTex = new THREE.CanvasTexture(fbc);
        const fileBoxMat = new THREE.MeshStandardMaterial({map: fbTex, roughness: 0.85, metalness: 0.0});
        const mvc = document.createElement('canvas');
        mvc.width = mvc.height = 128;
        const mvx = mvc.getContext('2d');
        mvx.fillStyle = '#a97e52';
        mvx.fillRect(0, 0, 128, 128);
        mvx.fillStyle = 'rgba(0,0,0,0.10)';
        mvx.fillRect(0, 118, 128, 10);
        mvx.fillRect(0, 0, 4, 128);
        mvx.fillRect(124, 0, 4, 128);
        mvx.fillStyle = 'rgba(196,178,142,0.85)';
        mvx.fillRect(0, 18, 128, 14);
        mvx.fillStyle = 'rgba(0,0,0,0.18)';
        mvx.fillRect(0, 24, 128, 2);
        mvx.strokeStyle = '#2a2118';
        mvx.lineWidth = 3;
        mvx.beginPath();
        mvx.moveTo(24, 76);
        mvx.lineTo(52, 72);
        mvx.lineTo(78, 78);
        mvx.lineTo(102, 74);
        mvx.stroke();
        mvx.lineWidth = 2;
        mvx.beginPath();
        mvx.moveTo(30, 92);
        mvx.lineTo(66, 90);
        mvx.lineTo(88, 94);
        mvx.stroke();
        mvx.fillStyle = '#2a2118';
        mvx.beginPath();
        mvx.moveTo(112, 52);
        mvx.lineTo(106, 62);
        mvx.lineTo(118, 62);
        mvx.closePath();
        mvx.fill();
        mvx.fillRect(110, 62, 4, 10);
        const mvTex = new THREE.CanvasTexture(mvc);
        const movingBoxMat = new THREE.MeshStandardMaterial({map: mvTex, roughness: 0.85, metalness: 0.0});
        const bnc = document.createElement('canvas');
        bnc.width = bnc.height = 128;
        const bnx = bnc.getContext('2d');
        bnx.fillStyle = '#b08d5a';
        bnx.fillRect(0, 0, 128, 128);
        bnx.fillStyle = 'rgba(0,0,0,0.12)';
        bnx.fillRect(0, 0, 128, 6);
        bnx.fillRect(0, 122, 128, 6);
        bnx.fillStyle = '#241a10';
        bnx.fillRect(44, 12, 40, 13);
        bnx.fillStyle = '#1c4f8f';
        bnx.beginPath();
        bnx.ellipse(64, 74, 40, 26, 0, 0, Math.PI * 2);
        bnx.fill();
        bnx.fillStyle = '#f7d64a';
        bnx.beginPath();
        bnx.ellipse(64, 74, 29, 17, 0, 0, Math.PI * 2);
        bnx.fill();
        bnx.strokeStyle = '#1c4f8f';
        bnx.lineWidth = 3;
        bnx.beginPath();
        bnx.moveTo(48, 78);
        bnx.quadraticCurveTo(64, 62, 80, 78);
        bnx.stroke();
        const bnTex = new THREE.CanvasTexture(bnc);
        const bananaBoxMat = new THREE.MeshStandardMaterial({map: bnTex, roughness: 0.85, metalness: 0.0});
        const pcc = document.createElement('canvas');
        pcc.width = pcc.height = 128;
        const pcx2 = pcc.getContext('2d');
        pcx2.fillStyle = '#8f6a42';
        pcx2.fillRect(0, 0, 128, 128);
        pcx2.fillStyle = '#2b2b2e';
        pcx2.fillRect(0, 16, 128, 16);
        pcx2.strokeStyle = '#e8e8ea';
        pcx2.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            pcx2.beginPath();
            pcx2.moveTo(8 + i * 16, 20);
            pcx2.lineTo(14 + i * 16, 24);
            pcx2.lineTo(8 + i * 16, 28);
            pcx2.stroke();
        }
        pcx2.fillStyle = '#efece4';
        pcx2.fillRect(30, 56, 68, 48);
        pcx2.fillStyle = 'rgba(40,40,40,0.6)';
        pcx2.fillRect(36, 62, 44, 2);
        pcx2.fillRect(36, 68, 30, 2);
        pcx2.fillStyle = '#1a1a1a';
        let barX = 36;
        while (barX < 90) {
            const bw = 1 + Math.floor(Math.random() * 3);
            pcx2.fillRect(barX, 84, bw, 14);
            barX += bw + 1 + Math.floor(Math.random() * 3);
        }
        pcx2.strokeStyle = '#c8771f';
        pcx2.lineWidth = 3;
        pcx2.beginPath();
        pcx2.moveTo(40, 44);
        pcx2.quadraticCurveTo(64, 54, 88, 44);
        pcx2.stroke();
        pcx2.fillStyle = '#c8771f';
        pcx2.beginPath();
        pcx2.moveTo(88, 38);
        pcx2.lineTo(94, 45);
        pcx2.lineTo(85, 48);
        pcx2.closePath();
        pcx2.fill();
        const pcTex = new THREE.CanvasTexture(pcc);
        const parcelBoxMat = new THREE.MeshStandardMaterial({map: pcTex, roughness: 0.85, metalness: 0.0});
        const cartonMats = [fileBoxMat, movingBoxMat, bananaBoxMat, parcelBoxMat];
        return {fileBoxMat, movingBoxMat, bananaBoxMat, parcelBoxMat, cartonMats};
    }
}
