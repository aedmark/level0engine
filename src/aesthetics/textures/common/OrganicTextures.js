import TextureMechanics from '../TextureMechanics.js';
import SurfaceTextures from './SurfaceTextures.js';

export default class OrganicTextures {
    static _buildOrganicAssets(masterNoise) {
        const {canvas: moldCanvas, ctx: moldCtx} = TextureMechanics._createContext(256, 256, false);
        for (let i = 0; i < 12; i++) {
            const cx = 40 + Math.random() * 176, cy = 40 + Math.random() * 176, r = 8 + Math.random() * 20;
            const grad = moldCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(25, 20, 15, ${0.5 + Math.random() * 0.4})`);
            grad.addColorStop(0.6, 'rgba(25, 20, 15, 0.2)');
            grad.addColorStop(1, 'rgba(25, 20, 15, 0)');
            moldCtx.fillStyle = grad;
            moldCtx.beginPath();
            moldCtx.ellipse(cx, cy, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
            moldCtx.fill();
        }
        const moldTexture = new THREE.CanvasTexture(moldCanvas);
        const moldMat = new THREE.MeshStandardMaterial({
            map: moldTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.12,
            roughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const moldGeo = new THREE.PlaneGeometry(3, 3);
        moldGeo.rotateX(-Math.PI / 2);
        const ceilAtlas = SurfaceTextures._buildCeilingStainAtlas();
        const ceilStainTexture = new THREE.CanvasTexture(ceilAtlas.canvas);
        const ceilingStainMat = new THREE.MeshStandardMaterial({
            map: ceilStainTexture,
            transparent: true,
            depthWrite: false,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const ceilingStainGeos = [];
        for (let v = 0; v < ceilAtlas.cols * ceilAtlas.rows; v++) {
            const geo = new THREE.PlaneGeometry(3, 3);
            geo.rotateX(Math.PI / 2);
            const uv = geo.attributes.uv;
            const {cols, rows, tile, pad} = ceilAtlas;
            const ox = (v % cols) * tile + pad, oy = Math.floor(v / cols) * tile + pad;
            const u = tile - pad * 2;
            for (let i = 0; i < uv.count; i++) {
                uv.setXY(
                    i,
                    (ox + uv.getX(i) * u) / (cols * tile),
                    1 - (oy + (1 - uv.getY(i)) * u) / (rows * tile)
                );
            }
            uv.needsUpdate = true;
            ceilingStainGeos.push(geo);
        }
        const {canvas: fabricCanvas, ctx: fCtx} = TextureMechanics._createContext(256, 256);
        fCtx.fillStyle = '#5d7285';
        fCtx.fillRect(0, 0, 256, 256);
        fCtx.lineWidth = 1;
        for (let i = 0; i < 256; i += 4) {
            fCtx.strokeStyle = 'rgba(255,255,255,0.04)';
            fCtx.beginPath();
            fCtx.moveTo(i, 0);
            fCtx.lineTo(i, 256);
            fCtx.stroke();
            fCtx.strokeStyle = 'rgba(0,0,0,0.06)';
            fCtx.beginPath();
            fCtx.moveTo(0, i);
            fCtx.lineTo(256, i);
            fCtx.stroke();
        }
        fCtx.globalAlpha = 0.6;
        fCtx.drawImage(masterNoise, 0, 0, 256, 1024);
        fCtx.drawImage(masterNoise, 0, 0, 1024, 256);
        fCtx.globalAlpha = 1.0;
        const fabricTexture = TextureMechanics._createWrappedTexture(fabricCanvas, 4, 4);
        const fabricMat = new THREE.MeshStandardMaterial({
            map: fabricTexture,
            roughness: 0.98,
            bumpMap: fabricTexture,
            bumpScale: 0.05
        });
        const mossTexture = TextureMechanics._createWrappedTexture(fabricCanvas, 32, 32);
        const mossMat = new THREE.MeshStandardMaterial({map: mossTexture, roughness: 1.0});
        const {canvas: cornCanvas, ctx: cornCtx} = TextureMechanics._createContext(256, 256);
        cornCtx.fillStyle = '#11220a';
        cornCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40; i++) {
            cornCtx.strokeStyle = '#223311';
            cornCtx.lineWidth = 3 + Math.random() * 4;
            cornCtx.beginPath();
            const cx = Math.random() * 256;
            cornCtx.moveTo(cx, 0);
            cornCtx.lineTo(cx, 256);
            cornCtx.stroke();
        }
        for (let i = 0; i < 200; i++) {
            cornCtx.strokeStyle = Math.random() > 0.6 ? '#446622' : '#889933';
            cornCtx.lineWidth = 1.5 + Math.random() * 2.5;
            cornCtx.beginPath();
            const sx = Math.random() * 256;
            const sy = Math.random() * 256;
            cornCtx.moveTo(sx, sy);
            cornCtx.quadraticCurveTo(sx + (Math.random() - 0.5) * 40, sy - 30 - Math.random() * 40, sx + (Math.random() - 0.5) * 60, sy + 20 + Math.random() * 40);
            cornCtx.stroke();
            if (Math.random() > 0.95) {
                cornCtx.strokeStyle = '#5c4b31';
                cornCtx.lineWidth = 1 + Math.random() * 2;
                cornCtx.beginPath();
                const dx = Math.random() * 256;
                cornCtx.moveTo(dx, 0);
                cornCtx.lineTo(dx, 256);
                cornCtx.stroke();
            }
        }
        cornCtx.globalCompositeOperation = 'overlay';
        cornCtx.globalAlpha = 0.5;
        cornCtx.drawImage(masterNoise, 0, 0, 256, 256);
        const cornTexture = TextureMechanics._createWrappedTexture(cornCanvas, 2, 1);
        const cornMat = new THREE.MeshStandardMaterial({
            map: cornTexture,
            roughness: 1.0,
            bumpMap: cornTexture,
            bumpScale: 0.05
        });
        const {canvas: dirtCanvas, ctx: dirtCtx} = TextureMechanics._createContext(256, 256);
        dirtCtx.fillStyle = '#1c150c';
        dirtCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 400; i++) {
            dirtCtx.fillStyle = Math.random() > 0.5 ? '#2c2214' : '#0c0804';
            dirtCtx.beginPath();
            dirtCtx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 0, Math.PI * 2);
            dirtCtx.fill();
        }
        for (let i = 0; i < 16; i++) {
            const cx = Math.random() * 256, cy = Math.random() * 256;
            const len = 16 + Math.random() * 28;
            const wid = 5 + Math.random() * 6;
            dirtCtx.save();
            dirtCtx.translate(cx, cy);
            dirtCtx.rotate(Math.random() * Math.PI);
            const huskGrad = dirtCtx.createLinearGradient(-len / 2, 0, len / 2, 0);
            huskGrad.addColorStop(0, 'rgba(110, 90, 40, 0.85)');
            huskGrad.addColorStop(0.5, 'rgba(165, 140, 68, 0.9)');
            huskGrad.addColorStop(1, 'rgba(100, 82, 36, 0.85)');
            dirtCtx.fillStyle = huskGrad;
            dirtCtx.beginPath();
            dirtCtx.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
            dirtCtx.fill();
            dirtCtx.strokeStyle = 'rgba(70, 55, 22, 0.45)';
            dirtCtx.lineWidth = 1;
            dirtCtx.beginPath();
            dirtCtx.moveTo(-len / 2 + 2, 0);
            dirtCtx.lineTo(len / 2 - 2, 0);
            dirtCtx.stroke();
            dirtCtx.restore();
        }
        dirtCtx.globalAlpha = 0.5;
        dirtCtx.drawImage(masterNoise, 0, 0, 256, 256);
        const dirtTexture = TextureMechanics._createWrappedTexture(dirtCanvas, 16, 16);
        const dirtMat = new THREE.MeshStandardMaterial({
            map: dirtTexture,
            roughness: 1.0,
            bumpMap: dirtTexture,
            bumpScale: 0.1
        });
        const {canvas: skyCanvas, ctx: skyCtx} = TextureMechanics._createContext(512, 512);
        skyCtx.fillStyle = '#020205';
        skyCtx.fillRect(0, 0, 512, 512);
        skyCtx.fillStyle = '#ffffff';
        for (let i = 0; i < 600; i++) {
            const r = Math.random();
            skyCtx.globalAlpha = r > 0.9 ? 1.0 : (r > 0.5 ? 0.5 : 0.2);
            skyCtx.beginPath();
            skyCtx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.5, 0, Math.PI * 2);
            skyCtx.fill();
        }
        skyCtx.globalAlpha = 0.1;
        skyCtx.drawImage(masterNoise, 0, 0, 512, 512);
        const skyTexture = TextureMechanics._createWrappedTexture(skyCanvas, 4, 4);
        const nightSkyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            fog: false
        });
        const moldAtlas = OrganicTextures._buildMoldCreepAtlas(masterNoise);
        const moldCreepTexture = new THREE.CanvasTexture(moldAtlas.canvas);
        const moldCreepMat = new THREE.MeshStandardMaterial({
            map: moldCreepTexture,
            transparent: true,
            depthWrite: false,
            roughness: 0.95,
            metalness: 0.0,
            polygonOffset: true,
            polygonOffsetFactor: -2
        });

        const MOLD_W = 1.5, MOLD_H = 1.30;
        const {cols, rows, tileW, tileH, pad} = moldAtlas;
        const AW = cols * tileW, AH = rows * tileH;

        const moldCreepGeos = [];
        for (let v = 0; v < cols * rows; v++) {
            const geo = new THREE.PlaneGeometry(MOLD_W, MOLD_H);
            const uv = geo.attributes.uv;
            const cx = (v % cols) * tileW + pad;
            const cy = Math.floor(v / cols) * tileH + pad;
            const uw = tileW - pad * 2, uh = tileH - pad * 2;
            for (let i = 0; i < uv.count; i++) {
                uv.setXY(
                    i,
                    (cx + uv.getX(i) * uw) / AW,
                    1 - (cy + (1 - uv.getY(i)) * uh) / AH
                );
            }
            uv.needsUpdate = true;
            moldCreepGeos.push(geo);
        }
        return {
            moldMat, moldGeo, ceilingStainMat, ceilingStainGeos, fabricMat, mossMat, cornMat,
            dirtMat, nightSkyMat, moldCreepMat, moldCreepGeos, moldCreepHeight: MOLD_H,
            moldCreepSeepFrac: moldAtlas.seepFrac
        };
    }

    static _buildMoldCreepAtlas(masterNoise) {
        // 12 colonies instead of 6 (4x3 instead of 3x2). Palette and footprint are no longer a
        // hand-authored lookup table matched 1:1 to a tile index — they're rolled per tile off a
        // seeded RNG, so each colony's hue, seat count, and how far it spreads/climbs all vary
        // independently instead of reusing the same six silhouettes (flipped and rescaled) forever.
        const COLS = 4, ROWS = 3;
        const TILE_W = 256, TILE_H = 224;
        const PAD = 8;
        const SEEP_FRAC = 0.14;

        const AW = COLS * TILE_W, AH = ROWS * TILE_H;
        const {canvas, ctx} = TextureMechanics._createContext(AW, AH, false);

        // A few base mildew hues (olive-khaki, cooler grey-green, sooty grey, rust-tinged brown) to
        // jitter away from per tile, rather than one fixed swatch repeated with tiny tweaks.
        const HUE_BASES = [
            {halo: [118, 116, 92], body: [76, 78, 58], core: [46, 50, 38], seep: [20, 17, 12]},
            {halo: [106, 114, 96], body: [64, 74, 58], core: [40, 49, 41], seep: [15, 20, 16]},
            {halo: [112, 110, 112], body: [66, 65, 70], core: [38, 38, 43], seep: [14, 13, 17]},
            {halo: [120, 108, 80], body: [80, 68, 46], core: [50, 41, 27], seep: [24, 17, 10]}
        ];

        for (let v = 0; v < COLS * ROWS; v++) {
            const ox = (v % COLS) * TILE_W;
            const oy = Math.floor(v / COLS) * TILE_H;
            const rand = TextureMechanics._seededRandom(31775902 + v * 7919);
            const base = HUE_BASES[v % HUE_BASES.length];
            const jitterC = (c) => c.map(ch => Math.max(0, Math.min(255, Math.round(ch + (rand() - 0.5) * 18))));
            const pal = {
                halo: jitterC(base.halo), body: jitterC(base.body),
                core: jitterC(base.core), seep: jitterC(base.seep)
            };
            // sizeClass biases this colony toward either a tight freckle or a sprawling climber,
            // so the atlas covers the full range a real mildew patch does instead of clustering
            // around one "typical" size.
            const sizeClass = rand();
            const fp = {
                seats: 1 + Math.floor(rand() * (sizeClass > 0.55 ? 4 : 3)),
                spread: 0.16 + rand() * 0.16 + sizeClass * 0.26,
                reach: 0.16 + rand() * 0.14 + sizeClass * 0.42
            };
            ctx.save();
            ctx.beginPath();
            ctx.rect(ox + PAD, oy + PAD, TILE_W - PAD * 2, TILE_H - PAD * 2);
            ctx.clip();
            ctx.translate(ox, oy);
            this._growMoldColony(ctx, ox, oy, TILE_W, TILE_H, PAD, SEEP_FRAC, rand, pal, fp);
            ctx.restore();
        }

        this._featherMoldTiles(ctx, AW, AH, TILE_W, TILE_H, PAD);
        return {canvas, cols: COLS, rows: ROWS, tileW: TILE_W, tileH: TILE_H, pad: PAD, seepFrac: SEEP_FRAC};
    }

    static _growMoldColony(ctx, ox, oy, W, H, PAD, SEEP_FRAC, rand, pal, fp) {
        const LEFT = PAD, RIGHT = W - PAD, TOP = PAD, BOT = H - PAD;
        const UW = RIGHT - LEFT, UH = BOT - TOP;
        const JOINT = BOT - UH * SEEP_FRAC;
        const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

        // The tile is hard-clipped at LEFT/RIGHT/TOP (ctx.clip() in the caller), and a colony that
        // is still at meaningful density when it hits that line reads as a sliced-off edge rather
        // than a patch that petered out on its own. This makes density taper toward zero well
        // before the clip line so there's nothing left for the clip (or the atlas feathering) to
        // truncate — the shape runs out of steam organically instead of hitting a wall.
        const EDGE_SIDE = UW * 0.24, EDGE_TOP = UH * 0.32;
        const smooth = (t) => t * t * (3 - 2 * t);
        const edgeFactor = (x, y) => {
            let k = 1;
            const dl = x - LEFT, dr = RIGHT - x, dt = y - TOP;
            if (dl < EDGE_SIDE) k *= smooth(Math.max(0, dl / EDGE_SIDE));
            if (dr < EDGE_SIDE) k *= smooth(Math.max(0, dr / EDGE_SIDE));
            if (dt < EDGE_TOP) k *= smooth(Math.max(0, dt / EDGE_TOP));
            return k;
        };

        const anchor = 0.5 + (rand() - 0.5) * 0.34;
        const seats = [];
        for (let s = 0; s < fp.seats; s++) {
            seats.push({
                x: LEFT + UW * (anchor + (rand() - 0.5) * fp.spread * 0.9),
                spread: UW * fp.spread * (0.35 + rand() * 0.5),
                reach: UH * fp.reach * (0.5 + rand() * 0.7),
                weight: 0.5 + rand() * 0.5
            });
        }

        ctx.globalAlpha = 1;
        for (const s of seats) {
            const puffs = 16 + Math.floor(rand() * 14);
            for (let i = 0; i < puffs; i++) {
                const r = s.spread * (0.6 + rand() * 1.0);
                const hx = s.x + (rand() - 0.5) * s.spread * 1.8;
                const hy = JOINT - Math.pow(rand(), 1.6) * s.reach * 1.3;
                const ek = edgeFactor(hx, hy);
                const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
                g.addColorStop(0, rgba(pal.halo, (0.009 + rand() * 0.007) * ek));
                g.addColorStop(0.5, rgba(pal.halo, 0.004 * ek));
                g.addColorStop(1, rgba(pal.halo, 0));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(hx, hy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const matH = UH * 0.05;
        for (const s of seats) {
            const blobs = 22 + Math.floor(rand() * 18);
            for (let b = 0; b < blobs; b++) {
                const off = (rand() - 0.5) * 2;
                const density = 1 - Math.abs(off) ** 3;
                const bx = s.x + off * s.spread * 1.15;
                const bw = s.spread * (0.10 + rand() * 0.16);
                const bh = matH * (0.35 + rand() * 2.3) * density;
                const by = JOINT - bh * 0.25;
                ctx.fillStyle = rgba(pal.body, (0.032 + rand() * 0.048) * density * edgeFactor(bx, by));
                ctx.beginPath();
                ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const lobeStamps = [];
        for (const s of seats) {
            const lobes = 14 + Math.floor(rand() * 14);
            for (let l = 0; l < lobes; l++) {
                const climber = rand() < 0.42;
                let x = s.x + (rand() - 0.5) * s.spread * 1.1;
                let y = JOINT - rand() * matH;
                const side = x < s.x ? -1 : 1;
                let ang = climber
                    ? -Math.PI / 2 + (rand() - 0.5) * 1.1
                    : (side > 0 ? 0 : Math.PI) - side * rand() * 0.8;
                const target = climber ? -Math.PI / 2 : (side > 0 ? -0.25 : Math.PI + 0.25);
                let r = s.spread * (0.10 + rand() * 0.14) * s.weight * (climber ? 0.7 : 1.15);
                const decay = climber ? 0.88 + rand() * 0.05 : 0.93 + rand() * 0.05;
                const ceiling = climber ? s.reach * 1.6 : s.reach * 0.4;
                let guard = 0;
                while (r > 1.3 && y > JOINT - ceiling && y < JOINT + matH && guard++ < 90) {
                    const climbed = Math.min(1, (JOINT - y) / Math.max(1, s.reach));
                    const ek = edgeFactor(x, y);
                    // A tendril that wanders into the taper zone doesn't just get dimmer, it also
                    // decays faster and is more likely to give up outright — like it's running out
                    // of damp surface to spread across, rather than being erased by an invisible wall.
                    ctx.fillStyle = rgba(pal.body, (0.017 * (1 - climbed * 0.6) + 0.005) * ek);
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                    if (r > 2.2 && ek > 0.15) lobeStamps.push({x, y, r, climbed});
                    ang += (rand() - 0.5) * 0.85 + (target - ang) * 0.12;
                    const step = r * (0.42 + rand() * 0.3);
                    x += Math.cos(ang) * step;
                    y += Math.sin(ang) * step;
                    r *= decay * (0.4 + 0.6 * ek);
                    if (ek < 0.04) break;
                }
            }
        }

        if (lobeStamps.length) {
            const hairs = 70 + Math.floor(rand() * 70);
            for (let f = 0; f < hairs; f++) {
                const a = lobeStamps[Math.floor(rand() * lobeStamps.length)];
                const b = lobeStamps[Math.floor(rand() * lobeStamps.length)];
                const seed = b.climbed > a.climbed ? b : a;
                let x = seed.x + (rand() - 0.5) * seed.r;
                let y = seed.y;
                let drift = (rand() - 0.5) * 0.6;
                const len = 3 + rand() * 11;
                for (let step = 0; step < len; step++) {
                    const t = step / len;
                    const ek = edgeFactor(x, y);
                    if (ek < 0.04) break;
                    ctx.fillStyle = rgba(pal.body, (0.022 * (1 - t) + 0.004) * ek);
                    ctx.beginPath();
                    ctx.arc(x, y, 1.4 * (1 - t * 0.7) + 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    drift = (drift + (rand() - 0.5) * 0.4) * 0.85;
                    x += drift;
                    y -= 0.6 + rand() * 0.9;
                }
            }
        }

        const img = ctx.getImageData(ox, oy, W, H);
        const px = img.data;
        const CORE_TOP_BASE = JOINT - (UH * 0.34);
        // A perfectly flat threshold line reads as a drawn boundary no matter how soft the alpha
        // blend either side of it is. Wobbling it per-column with a couple of mismatched sine
        // waves gives the wet/dry line an irregular, dripped edge instead of a ruler-straight one.
        const jPhaseA = rand() * Math.PI * 2, jPhaseB = rand() * Math.PI * 2;
        const jAmpA = UH * (0.03 + rand() * 0.03), jAmpB = UH * (0.015 + rand() * 0.02);
        for (let x = 0; x < W; x++) {
            const coreTop = CORE_TOP_BASE
                + Math.sin(x * 0.045 + jPhaseA) * jAmpA
                + Math.sin(x * 0.12 + jPhaseB) * jAmpB;
            for (let y = Math.max(0, Math.floor(coreTop)); y < H; y++) {
                const depth = Math.min(1, (y - coreTop) / Math.max(1, (JOINT - coreTop) * 0.7));
                if (depth <= 0) continue;
                const i = (y * W + x) * 4;
                const a = px[i + 3] / 255;
                if (a < 0.42) continue;
                const k = Math.min(1, (a - 0.42) / 0.38) * depth;
                px[i] += (pal.core[0] - px[i]) * k * 0.72;
                px[i + 1] += (pal.core[1] - px[i + 1]) * k * 0.72;
                px[i + 2] += (pal.core[2] - px[i + 2]) * k * 0.72;
                px[i + 3] = Math.min(236, px[i + 3] + 42 * k);
            }
        }
        ctx.putImageData(img, ox, oy);

        const BAND = BOT - JOINT;
        for (const s of seats) {
            const wide = s.spread * 1.4;

            const beads = 22 + Math.floor(rand() * 12);
            for (let b = 0; b < beads; b++) {
                const bx = s.x + (rand() - 0.5) * wide * 2;
                const falloff = 1 - Math.min(1, Math.abs(bx - s.x) / (wide * 1.15));
                if (falloff <= 0) continue;
                const bw = wide * (0.05 + rand() * 0.13);
                const bh = BAND * (0.10 + rand() * 0.22);
                const by = JOINT + bh * (0.5 + rand() * 0.7);
                ctx.fillStyle = rgba(pal.seep, (0.07 + rand() * 0.13) * falloff * edgeFactor(bx, by));
                ctx.beginPath();
                ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            const runs = 3 + Math.floor(rand() * 5);
            for (let r = 0; r < runs; r++) {
                const rx = s.x + (rand() - 0.5) * wide * 1.7;
                const falloff = 1 - Math.min(1, Math.abs(rx - s.x) / (wide * 1.1));
                if (falloff <= 0) continue;
                const rw = 1.2 + rand() * 3.5;
                const reach = BAND * (0.4 + rand() * 0.75);
                const ek = edgeFactor(rx, JOINT);
                const g = ctx.createLinearGradient(0, JOINT, 0, JOINT + reach);
                g.addColorStop(0, rgba(pal.seep, 0.34 * falloff * ek));
                g.addColorStop(1, rgba(pal.seep, 0));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(rx, JOINT + reach * 0.5, rw, reach * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 380; i++) {
            const s = seats[Math.floor(rand() * seats.length)];
            const x = s.x + (rand() - 0.5) * s.spread * 3.0;
            const y = JOINT - Math.pow(rand(), 2.2) * s.reach * 1.7;
            ctx.fillStyle = rgba(pal.body, (0.028 + rand() * 0.05) * edgeFactor(x, y));
            ctx.beginPath();
            ctx.arc(x, y, 0.4 + rand() * 1.0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static _featherMoldTiles(ctx, AW, AH, tw, th, pad) {
        const img = ctx.getImageData(0, 0, AW, AH);
        const px = img.data;
        const UW = tw - pad * 2, UH = th - pad * 2;
        const SIDE = 46, TOP = 70;
        for (let y = 0; y < AH; y++) {
            const ly = (y % th) - pad;
            if (ly < 0 || ly >= UH) continue;
            for (let x = 0; x < AW; x++) {
                const lx = (x % tw) - pad;
                if (lx < 0 || lx >= UW) continue;
                let k = 1;
                if (lx < SIDE) k *= lx / SIDE;
                else if (lx > UW - SIDE) k *= (UW - lx) / SIDE;
                if (ly < TOP) k *= ly / TOP;
                if (k < 1) px[((y * AW) + x) * 4 + 3] *= k * k;
            }
        }
        ctx.putImageData(img, 0, 0);
    }
}
