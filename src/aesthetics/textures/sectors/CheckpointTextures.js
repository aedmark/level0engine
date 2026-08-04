/**
 * [ROLE] Generates specialized procedural textures specific to the Checkpoint sector.
 * [WHY] Sector-specific aesthetics require unique material generation without bloating the global texture pools.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API.
 */
import TextureMechanics from '../TextureMechanics.js';

export default class CheckpointTextures {
    static _buildCheckpointWall(masterNoise) {
        const W = 512, H = 1024;
        const UNITS = 3.0;
        const yAt = (u) => H - (u / UNITS) * H;
        const xAt = (m) => m * (W / 2);
        const rand = TextureMechanics._seededRandom(41778203);

        const PLINTH = 0.16, PLINTH_CAP = 0.205;
        const DADO_BOT = 0.92, DADO_TOP = 1.02;
        const FRIEZE = 2.55, CORNICE = 2.74;

        const BAYS = 2;
        const BAY = W / BAYS;
        const STILE = xAt(0.10);
        const MUNTIN = xAt(0.058);
        const fieldOf = (b) => [b * BAY + STILE / 2 + MUNTIN, (b + 1) * BAY - STILE / 2 - MUNTIN];

        const FIELD = [72, 54, 45];
        const RAIL = [62, 46, 39];
        const DARK = [40, 30, 25];
        const LIGHT = [110, 88, 72];
        const SAP = [148, 122, 95];
        const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
        const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);
        const {canvas: roughCanvas, ctx: rCtx} = TextureMechanics._createContext(W, H);
        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, W, H);
        rCtx.fillStyle = '#b4b4b4';
        rCtx.fillRect(0, 0, W, H);

        const band = (u0, u1) => ({y: yAt(u1), h: yAt(u0) - yAt(u1)});

        const grain = (x0, y0, w, h, base, arch) => {
            if (w <= 0 || h <= 0) return;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x0, y0, w, h);
            ctx.clip();
            ctx.fillStyle = rgb(base);
            ctx.fillRect(x0, y0, w, h);
            for (let i = 0; i < 10; i++) {
                const gx = x0 + rand() * w, gy = y0 + rand() * h;
                const r = Math.max(w, h) * (0.22 + rand() * 0.42);
                const warm = rand() > 0.5;
                const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
                g.addColorStop(0, rgba(warm ? LIGHT : DARK, 0.10 + rand() * 0.16));
                g.addColorStop(1, rgba(warm ? LIGHT : DARK, 0));
                ctx.fillStyle = g;
                ctx.fillRect(x0 - r, y0 - r, w + r * 2, h + r * 2);
            }
            const lines = Math.round(w * 0.13);
            for (let i = 0; i < lines; i++) {
                const gx = x0 + rand() * w;
                const dark = rand() > 0.40;
                ctx.strokeStyle = rgba(dark ? DARK : LIGHT, 0.05 + rand() * 0.15);
                ctx.lineWidth = 0.6 + rand() * 1.8;
                ctx.beginPath();
                ctx.moveTo(gx, y0);
                ctx.bezierCurveTo(
                    gx + (rand() - 0.5) * w * 0.11, y0 + h * 0.34,
                    gx + (rand() - 0.5) * w * 0.11, y0 + h * 0.67,
                    gx + (rand() - 0.5) * w * 0.07, y0 + h
                );
                ctx.stroke();
            }
            if (arch) {
                let ay = y0 - h * 0.14;
                while (ay < y0 + h) {
                    const acx = x0 + w * (0.14 + rand() * 0.72);
                    const halfW = w * (0.20 + rand() * 0.24);
                    const peak = h * (0.055 + rand() * 0.075);
                    const rings = 11 + Math.floor(rand() * 10);
                    const step = peak / 4.0;
                    for (let k = 0; k < rings; k++) {
                        const oy = ay + k * step;
                        const jw = halfW * (0.97 + rand() * 0.06);
                        ctx.strokeStyle = rgba(rand() > 0.30 ? DARK : LIGHT, 0.07 + rand() * 0.15);
                        ctx.lineWidth = 0.7 + rand() * 1.5;
                        ctx.beginPath();
                        ctx.moveTo(acx - jw * 1.9, oy + peak * 2.8);
                        ctx.quadraticCurveTo(acx, oy - peak * 0.95, acx + jw * 1.9, oy + peak * 2.8);
                        ctx.stroke();
                    }
                    ay += peak * (2.4 + rand() * 1.4) + h * 0.04;
                }
            }
            const pores = Math.round(w * h * 0.0012);
            for (let i = 0; i < pores; i++) {
                const px = x0 + rand() * w, py = y0 + rand() * h;
                ctx.fillStyle = rgba(DARK, 0.10 + rand() * 0.20);
                ctx.fillRect(px, py, 0.6 + rand() * 1.0, 1.4 + rand() * 4.2);
                bCtx.fillStyle = `rgba(90, 90, 90, ${0.10 + rand() * 0.16})`;
                bCtx.fillRect(px, py, 0.6 + rand() * 1.0, 1.4 + rand() * 4.2);
            }
            ctx.restore();
        };

        grain(0, 0, W, H, RAIL, false);

        const panel = (b, u0, u1, arch) => {
            const [fx0, fx1] = fieldOf(b);
            const {y, h} = band(u0, u1);
            const bevel = xAt(0.032);
            grain(fx0, y, fx1 - fx0, h, FIELD, arch);
            bCtx.fillStyle = '#4a4a4a';
            bCtx.fillRect(fx0, y, fx1 - fx0, h);
            const ramp = (x, yy, w, hh, from, to, horiz) => {
                const g = bCtx.createLinearGradient(x, yy, horiz ? x + w : x, horiz ? yy : yy + hh);
                g.addColorStop(0, from);
                g.addColorStop(1, to);
                bCtx.fillStyle = g;
                bCtx.fillRect(x, yy, w, hh);
            };
            ramp(fx0, y, bevel, h, '#c0c0c0', '#4a4a4a', true);
            ramp(fx1 - bevel, y, bevel, h, '#4a4a4a', '#c0c0c0', true);
            ramp(fx0, y, fx1 - fx0, bevel, '#c0c0c0', '#4a4a4a', false);
            ramp(fx0, y + h - bevel, fx1 - fx0, bevel, '#4a4a4a', '#c0c0c0', false);
            const g1 = ctx.createLinearGradient(fx0, 0, fx0 + bevel, 0);
            g1.addColorStop(0, 'rgba(0,0,0,0.34)');
            g1.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g1;
            ctx.fillRect(fx0, y, bevel, h);
            const g2 = ctx.createLinearGradient(fx1 - bevel, 0, fx1, 0);
            g2.addColorStop(0, 'rgba(255,255,255,0)');
            g2.addColorStop(1, 'rgba(255,255,255,0.10)');
            ctx.fillStyle = g2;
            ctx.fillRect(fx1 - bevel, y, bevel, h);
            const g3 = ctx.createLinearGradient(0, y, 0, y + bevel);
            g3.addColorStop(0, 'rgba(0,0,0,0.30)');
            g3.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g3;
            ctx.fillRect(fx0, y, fx1 - fx0, bevel);
            const g4 = ctx.createLinearGradient(0, y + h - bevel, 0, y + h);
            g4.addColorStop(0, 'rgba(255,255,255,0)');
            g4.addColorStop(1, 'rgba(255,255,255,0.11)');
            ctx.fillStyle = g4;
            ctx.fillRect(fx0, y + h - bevel, fx1 - fx0, bevel);
            rCtx.fillStyle = '#cdcdcd';
            rCtx.fillRect(fx0 + bevel, y + bevel, fx1 - fx0 - bevel * 2, h - bevel * 2);
        };

        for (let b = 0; b < BAYS; b++) {
            panel(b, PLINTH_CAP + 0.03, DADO_BOT - 0.03, true);
            panel(b, DADO_TOP + 0.04, FRIEZE - 0.04, true);
        }

        for (const sx of [0, BAY, W]) {
            grain(sx - STILE / 2, 0, STILE, H, RAIL, false);
            bCtx.fillStyle = '#9c9c9c';
            bCtx.fillRect(sx - STILE / 2, 0, STILE, H);
            const sg = ctx.createLinearGradient(sx - STILE / 2, 0, sx + STILE / 2, 0);
            sg.addColorStop(0, 'rgba(0,0,0,0.20)');
            sg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
            sg.addColorStop(1, 'rgba(0,0,0,0.20)');
            ctx.fillStyle = sg;
            ctx.fillRect(sx - STILE / 2, 0, STILE, H);
        }

        const moulding = (u0, u1, tone, height, gloss) => {
            const {y, h} = band(u0, u1);
            grain(0, y, W, h, tone, false);
            ctx.fillStyle = 'rgba(255,255,255,0.09)';
            ctx.fillRect(0, y, W, Math.max(1, h * 0.16));
            ctx.fillStyle = 'rgba(0,0,0,0.34)';
            ctx.fillRect(0, y + h - Math.max(1, h * 0.14), W, Math.max(1, h * 0.14));
            bCtx.fillStyle = height;
            bCtx.fillRect(0, y, W, h);
            bCtx.fillStyle = 'rgba(0,0,0,0.55)';
            bCtx.fillRect(0, y + h, W, 3);
            rCtx.fillStyle = gloss;
            rCtx.fillRect(0, y, W, h);
        };

        const plinth = band(0, PLINTH);
        grain(0, plinth.y, W, plinth.h, DARK, false);
        bCtx.fillStyle = '#aeaeae';
        bCtx.fillRect(0, plinth.y, W, plinth.h);
        rCtx.fillStyle = '#c8c8c8';
        rCtx.fillRect(0, plinth.y, W, plinth.h);
        moulding(PLINTH, PLINTH_CAP, RAIL, '#dcdcdc', '#a0a0a0');
        moulding(DADO_BOT, DADO_TOP, RAIL, '#f2f2f2', '#5e5e5e');
        moulding(FRIEZE, FRIEZE + 0.06, RAIL, '#d0d0d0', '#8a8a8a');
        grain(0, band(FRIEZE + 0.06, CORNICE).y, W, band(FRIEZE + 0.06, CORNICE).h, RAIL, false);
        moulding(CORNICE, CORNICE + 0.09, LIGHT, '#ffffff', '#6a6a6a');
        moulding(CORNICE + 0.09, UNITS, RAIL, '#e6e6e6', '#7c7c7c');

        for (let i = 0; i < 9; i++) {
            const x = rand() * W;
            const top = yAt(0.20 + rand() * 0.55);
            const w = xAt(0.05 + rand() * 0.22);
            const g = ctx.createLinearGradient(0, top, 0, yAt(0));
            g.addColorStop(0, 'rgba(28, 20, 14, 0)');
            g.addColorStop(1, `rgba(24, 17, 11, ${0.22 + rand() * 0.26})`);
            ctx.fillStyle = g;
            ctx.fillRect(x, top, w, yAt(0) - top);
            const rg = rCtx.createLinearGradient(0, top, 0, yAt(0));
            rg.addColorStop(0, 'rgba(255,255,255,0)');
            rg.addColorStop(1, 'rgba(255,255,255,0.45)');
            rCtx.fillStyle = rg;
            rCtx.fillRect(x, top, w, yAt(0) - top);
        }

        const dadoY = yAt(0.97);
        for (let i = 0; i < 120; i++) {
            const y = dadoY + (rand() + rand() + rand() - 1.5) * 90;
            const x = rand() * W;
            const len = 10 + rand() * 70;
            const near = 1 - Math.min(1, Math.abs(y - dadoY) / 130);
            ctx.strokeStyle = rgba(SAP, (0.03 + rand() * 0.08) * (0.4 + near));
            ctx.lineWidth = 0.5 + rand() * 1.6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + len, y + (rand() - 0.5) * 6);
            ctx.stroke();
        }

        for (let i = 0; i < 13; i++) {
            const x = rand() * W;
            const y = yAt(0.1 + rand() * 2.4);
            const r = 1.2 + rand() * 3.2;
            const pts = 5 + Math.floor(rand() * 4);
            const phase = rand() * Math.PI * 2;
            ctx.beginPath();
            for (let p = 0; p <= pts; p++) {
                const a = (p / pts) * Math.PI * 2 + phase;
                const rr = r * (0.6 + rand() * 0.6);
                const qx = x + Math.cos(a) * rr, qy = y + Math.sin(a) * rr;
                if (p === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
            }
            ctx.closePath();
            ctx.fillStyle = rgba(SAP, 0.16 + rand() * 0.20);
            ctx.fill();
            bCtx.fillStyle = `rgba(40, 40, 40, ${0.4 + rand() * 0.3})`;
            bCtx.beginPath();
            bCtx.arc(x, y, r * 0.8, 0, Math.PI * 2);
            bCtx.fill();
            rCtx.fillStyle = 'rgba(255,255,255,0.5)';
            rCtx.beginPath();
            rCtx.arc(x, y, r * 0.9, 0, Math.PI * 2);
            rCtx.fill();
        }

        ctx.globalAlpha = 0.05;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        TextureMechanics._ditherCanvas(ctx, W, H, rand, 10);

        const map = TextureMechanics._createWrappedTexture(canvas, 2, 1, true);
        const bumpMap = TextureMechanics._createWrappedTexture(bumpCanvas, 2, 1, true);
        const roughnessMap = TextureMechanics._createWrappedTexture(roughCanvas, 2, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.016,
            roughnessMap,
            roughness: 1.0,
            metalness: 0.0
        });
    }

    static _buildCheckpointAssets(masterNoise) {
        const {canvas: ckFloorCanvas, ctx: ckFloorCtx} = TextureMechanics._createContext(256, 256);
        ckFloorCtx.fillStyle = '#5c4224';
        ckFloorCtx.fillRect(0, 0, 256, 256);
        const parquetBlocks = 4;
        const blockSize = 256 / parquetBlocks;
        const plankTones = ['#6b4c28', '#5c4224', '#7a5830', '#4f3a1f'];
        for (let by = 0; by < parquetBlocks; by++) {
            for (let bx = 0; bx < parquetBlocks; bx++) {
                const bxp = bx * blockSize, byp = by * blockSize;
                const horizontal = (bx + by) % 2 === 0;
                const planks = 4;
                const plankSize = blockSize / planks;
                for (let p = 0; p < planks; p++) {
                    ckFloorCtx.fillStyle = plankTones[(bx * 3 + by * 5 + p) % plankTones.length];
                    if (horizontal) {
                        ckFloorCtx.fillRect(bxp, byp + p * plankSize, blockSize, plankSize - 1);
                    } else {
                        ckFloorCtx.fillRect(bxp + p * plankSize, byp, plankSize - 1, blockSize);
                    }
                    ckFloorCtx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ckFloorCtx.lineWidth = 1;
                    for (let g = 0; g < 3; g++) {
                        ckFloorCtx.beginPath();
                        if (horizontal) {
                            const gy = byp + p * plankSize + 2 + Math.random() * (plankSize - 4);
                            ckFloorCtx.moveTo(bxp, gy);
                            ckFloorCtx.lineTo(bxp + blockSize, gy + (Math.random() - 0.5) * 3);
                        } else {
                            const gx = bxp + p * plankSize + 2 + Math.random() * (plankSize - 4);
                            ckFloorCtx.moveTo(gx, byp);
                            ckFloorCtx.lineTo(gx + (Math.random() - 0.5) * 3, byp + blockSize);
                        }
                        ckFloorCtx.stroke();
                    }
                }
                ckFloorCtx.strokeStyle = 'rgba(0,0,0,0.35)';
                ckFloorCtx.lineWidth = 2;
                ckFloorCtx.strokeRect(bxp, byp, blockSize, blockSize);
            }
        }
        ckFloorCtx.globalAlpha = 0.14;
        ckFloorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ckFloorCtx.globalAlpha = 1.0;
        for (let i = 0; i < 10; i++) {
            const wx = Math.random() * 256, wy = Math.random() * 256, wr = 8 + Math.random() * 22;
            const grad = ckFloorCtx.createRadialGradient(wx, wy, 0, wx, wy, wr);
            grad.addColorStop(0, 'rgba(0,0,0,0.16)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ckFloorCtx.fillStyle = grad;
            ckFloorCtx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
        }
        const checkpointFloorTexture = TextureMechanics._createWrappedTexture(ckFloorCanvas, 14, 14);
        const checkpointFloorMat = new THREE.MeshStandardMaterial({
            map: checkpointFloorTexture,
            roughness: 0.88,
            metalness: 0.02,
            bumpMap: checkpointFloorTexture,
            bumpScale: 0.012
        });
        const {canvas: ckCeilCanvas, ctx: ckCeilCtx} = TextureMechanics._createContext(256, 256);
        ckCeilCtx.fillStyle = '#a79c86';
        ckCeilCtx.fillRect(0, 0, 256, 256);
        ckCeilCtx.globalAlpha = 0.10;
        ckCeilCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ckCeilCtx.globalAlpha = 1.0;
        for (let i = 0; i < 6; i++) {
            const px = Math.random() * 256, py = Math.random() * 256, pr = 14 + Math.random() * 26;
            const grad = ckCeilCtx.createRadialGradient(px, py, 0, px, py, pr);
            grad.addColorStop(0, 'rgba(120, 90, 40, 0.18)');
            grad.addColorStop(1, 'rgba(120, 90, 40, 0)');
            ckCeilCtx.fillStyle = grad;
            ckCeilCtx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
        const {canvas: ckCeilBumpCanvas, ctx: ckCeilBumpCtx} = TextureMechanics._createContext(256, 256);
        ckCeilBumpCtx.fillStyle = '#808080';
        ckCeilBumpCtx.fillRect(0, 0, 256, 256);
        const drawTinTile = (colorCtx, bumpCtx, tx, ty, size) => {
            const inset = size * 0.08;
            colorCtx.strokeStyle = 'rgba(255,255,255,0.35)';
            colorCtx.lineWidth = 2;
            colorCtx.strokeRect(tx + inset, ty + inset, size - inset * 2, size - inset * 2);
            colorCtx.strokeStyle = 'rgba(0,0,0,0.3)';
            colorCtx.strokeRect(tx + inset + 2, ty + inset + 2, size - inset * 2 - 4, size - inset * 2 - 4);
            bumpCtx.strokeStyle = '#ffffff';
            bumpCtx.lineWidth = 3;
            bumpCtx.strokeRect(tx + inset, ty + inset, size - inset * 2, size - inset * 2);
            bumpCtx.strokeStyle = '#000000';
            bumpCtx.lineWidth = 2;
            bumpCtx.strokeRect(tx + inset + 3, ty + inset + 3, size - inset * 2 - 6, size - inset * 2 - 6);
            const cx = tx + size / 2, cy = ty + size / 2;
            const petals = 8;
            const petalLen = size * 0.28;
            for (let p = 0; p < petals; p++) {
                const angle = (p / petals) * Math.PI * 2;
                const ex = cx + Math.cos(angle) * petalLen;
                const ey = cy + Math.sin(angle) * petalLen;
                colorCtx.strokeStyle = 'rgba(0,0,0,0.25)';
                colorCtx.lineWidth = 3;
                colorCtx.beginPath();
                colorCtx.moveTo(cx, cy);
                colorCtx.lineTo(ex, ey);
                colorCtx.stroke();
                colorCtx.strokeStyle = 'rgba(255,255,255,0.3)';
                colorCtx.lineWidth = 1;
                colorCtx.beginPath();
                colorCtx.moveTo(cx, cy);
                colorCtx.lineTo(ex, ey);
                colorCtx.stroke();
                bumpCtx.strokeStyle = '#e8e8e8';
                bumpCtx.lineWidth = 3;
                bumpCtx.beginPath();
                bumpCtx.moveTo(cx, cy);
                bumpCtx.lineTo(ex, ey);
                bumpCtx.stroke();
            }
            colorCtx.fillStyle = 'rgba(255,255,255,0.4)';
            colorCtx.beginPath();
            colorCtx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
            colorCtx.fill();
            bumpCtx.fillStyle = '#ffffff';
            bumpCtx.beginPath();
            bumpCtx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
            bumpCtx.fill();
        };
        const tinTiles = 2;
        const tinTileSize = 256 / tinTiles;
        for (let ty = 0; ty < tinTiles; ty++) {
            for (let tx = 0; tx < tinTiles; tx++) {
                drawTinTile(ckCeilCtx, ckCeilBumpCtx, tx * tinTileSize, ty * tinTileSize, tinTileSize);
            }
        }
        const CEIL_REPEAT = 28;
        const checkpointCeilingTexture = TextureMechanics._createWrappedTexture(ckCeilCanvas, CEIL_REPEAT, CEIL_REPEAT);
        const checkpointCeilingBumpTexture = TextureMechanics._createWrappedTexture(ckCeilBumpCanvas, CEIL_REPEAT, CEIL_REPEAT);
        const checkpointCeilingMat = new THREE.MeshStandardMaterial({
            map: checkpointCeilingTexture,
            bumpMap: checkpointCeilingBumpTexture,
            bumpScale: 0.05,
            roughness: 0.92,
            metalness: 0.65
        });
        const checkpointWallMat = this._buildCheckpointWall(masterNoise);
        return {checkpointFloorMat, checkpointCeilingMat, checkpointWallMat};
    }
}
