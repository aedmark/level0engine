import TextureMechanics from '../TextureMechanics.js';
import ClinicTextures from '../sectors/ClinicTextures.js';
import AtriumTextures from '../sectors/AtriumTextures.js';
import {makeDuctInterior} from '../../../core/DuctLighting.js';

export default class SurfaceTextures {
    static async _buildSurfaceAssets(masterNoise) {
        const {canvas: carpetCanvas, ctx: carpetCtx} = TextureMechanics._createContext(512, 512);
        const {canvas: noiseCanvas, ctx: noiseCtx} = TextureMechanics._createContext(256, 256);
        const imgData = noiseCtx.createImageData(256, 256);
        const data = imgData.data;
        let cSeed = 9999;
        for (let i = 0; i < data.length; i += 4) {
            cSeed = (cSeed * 1664525 + 1013904223) >>> 0;
            const variance = ((cSeed >>> 16) / 65535.0 - 0.5) * 25;
            data[i] = 139 + variance;
            data[i + 1] = 126 + variance;
            data[i + 2] = 87 + variance;
            data[i + 3] = 255;
        }
        noiseCtx.putImageData(imgData, 0, 0);
        carpetCtx.imageSmoothingEnabled = false;
        carpetCtx.drawImage(noiseCanvas, 0, 0, 512, 512);
        carpetCtx.imageSmoothingEnabled = true;
        const carpetTexture = TextureMechanics._createWrappedTexture(carpetCanvas);
        carpetTexture.magFilter = THREE.LinearFilter;
        carpetTexture.minFilter = THREE.LinearMipmapLinearFilter;
        const {canvas: ceilingCanvas, bumpCanvas: ceilingBumpCanvas} = await this._buildNormalCeiling(masterNoise);
        const ceilingTexture = TextureMechanics._createWrappedTexture(ceilingCanvas);
        const ceilingBumpTexture = TextureMechanics._createWrappedTexture(ceilingBumpCanvas);
        const {canvas: tileCanvas, ctx: tileCtx} = TextureMechanics._createContext(256, 256);
        tileCtx.fillStyle = '#080808';
        tileCtx.fillRect(0, 0, 256, 256);
        tileCtx.strokeStyle = '#1a1a1a';
        tileCtx.lineWidth = 2;
        tileCtx.strokeRect(0, 0, 256, 256);
        tileCtx.globalAlpha = 0.15;
        tileCtx.drawImage(masterNoise, 0, 0, 256, 256);
        tileCtx.globalAlpha = 1.0;
        const tileTexture = TextureMechanics._createWrappedTexture(tileCanvas, 16, 16);
        const tileMat = new THREE.MeshStandardMaterial({
            map: tileTexture,
            roughness: 0.4,
            // Was 0.6 — waxed-tile levels of metallic, on the single most common floor
            // in the level, with nothing but a handful of unshadowed point lights to
            // catch. Low enough now that its shine comes mostly from the baked ambient
            // env map (see AmbientEnvMap.js) rather than from punching a hot circle
            // under every fixture it passes under.
            metalness: 0.15,
            shadowSide: THREE.DoubleSide
        });
        const {canvas: clinicCanvas, ctx: cCtx} = TextureMechanics._createContext(256, 256);
        cCtx.fillStyle = '#e8ecef';
        cCtx.fillRect(0, 0, 256, 256);
        cCtx.globalAlpha = 0.08;
        cCtx.drawImage(masterNoise, 0, 0, 256, 256);
        cCtx.globalAlpha = 1.0;
        cCtx.strokeStyle = '#8a98a3';
        cCtx.lineWidth = 4;
        cCtx.strokeRect(0, 0, 256, 256);
        const {canvas: clinicBumpCanvas, ctx: cbCtx} = TextureMechanics._createContext(256, 256);
        cbCtx.fillStyle = '#ffffff';
        cbCtx.fillRect(0, 0, 256, 256);
        cbCtx.strokeStyle = '#000000';
        cbCtx.lineWidth = 4;
        cbCtx.strokeRect(0, 0, 256, 256);
        const clinicTex = TextureMechanics._createWrappedTexture(clinicCanvas, 80, 80);
        const clinicBumpTex = TextureMechanics._createWrappedTexture(clinicBumpCanvas, 80, 80);
        const clinicMat = new THREE.MeshStandardMaterial({
            map: clinicTex,
            bumpMap: clinicBumpTex,
            bumpScale: 0.015,
            roughness: 0.4,
            metalness: 0.15,
            shadowSide: THREE.DoubleSide
        });
        const atriumFloorMat = AtriumTextures._buildAtriumFloor(masterNoise);
        const clinicFloorMat = ClinicTextures._buildClinicFloor(masterNoise);
        const clinicCeilingMat = ClinicTextures._buildClinicCeiling(masterNoise);
        const clinicWallMat = ClinicTextures._buildClinicWall(masterNoise);
        const clinicRailMat = ClinicTextures._buildClinicRail(masterNoise);
        return {
            carpetTexture, ceilingTexture, ceilingBumpTexture, tileMat, clinicMat,
            atriumFloorMat, clinicFloorMat, clinicCeilingMat, clinicWallMat, clinicRailMat,
            ...SurfaceTextures._buildDuctInteriorSet(masterNoise)
        };
    }

    /**
     * The duct interior set: wallpapered sides, a faded water-stained variant overhead,
     * and a worn board floor. Three materials rather than one for two reasons.
     *
     * Mechanically, the lining's vertical and horizontal faces do not share a UV scale.
     * buildWall gives side faces world-proportional UVs against a 4m x 3m reference but
     * leaves a slab's top and bottom at 0..1 scaled by h/3 — on a 0.04m panel that is a
     * 1/75th-of-the-texture sliver stretched over the whole surface. CrawlspaceDuct now
     * builds those faces with its own buildDuctPanel, which needs a different repeat to
     * land on the same world scale, and a repeat lives on a texture, so it needs its own
     * material. Aesthetically, it also lets the floor stop pretending to be clean paper.
     */
    static _buildDuctInteriorSet(masterNoise) {
        const wallMat = SurfaceTextures._buildPaisleyWallpaper(masterNoise, {seed: 8831942});
        // Ceiling and floor are the same boards: in a crawlspace the ceiling *is* the
        // underside of the floor above, so papering it was the odd choice. One material
        // rather than two clones, so the two also share a merge group.
        const floorMat = SurfaceTextures._buildDuctFloor(masterNoise);
        const tornMat = SurfaceTextures._buildDuctTornEdge(masterNoise);

        // 0.8m of world per tile on every face. One UV unit is 4m on every axis except
        // wall V, which buildWall maps to 3m, so only that repeat differs.
        const setRepeat = (mat, rx, ry) => {
            for (const slot of ['map', 'bumpMap']) {
                if (mat[slot]) mat[slot].repeat.set(rx, ry);
            }
        };
        setRepeat(wallMat, 5, 3.75);
        setRepeat(floorMat, 5, 5);
        // One texture height over the strip, so the tear sits at the floor and nowhere else.
        // 2.5 across = a 1.6m period, double the wallpaper's, so the tear outlasts the
        // panel it sits on instead of repeating two or three times along it.
        setRepeat(tornMat, 2.5, 1);

        const boards = makeDuctInterior(floorMat);
        return {
            ductWallMat: makeDuctInterior(wallMat),
            ductFloorMat: boards,
            ductCeilingMat: boards,
            ductTornMat: makeDuctInterior(tornMat)
        };
    }

    /**
     * The torn lower edge of the wallpaper. Damage, not decoration.
     *
     * The paper is intact almost everywhere and meets the floor; only a thin skirt of
     * plaster shows along the bottom, lifting into a few small blisters. The first attempt
     * ran a single large sine the width of the tile, which produced a continuous rolling
     * silhouette outlined in pale cream — a mountain range, and one that repeated visibly.
     * So the profile is now a low flat baseline plus a handful of narrow gaussian lifts,
     * with only fine high-frequency jitter carrying the ragged fibre.
     *
     * Two things keep the repeat quiet. The lifts are gaussians evaluated across the wrap
     * (k = -1, 0, 1), so they cross the seam intact rather than being cut off, and the
     * jitter harmonics are integer so they meet themselves exactly. And the strip is tiled
     * at 1.6m against the wallpaper's 0.8m, so its period is longer than the panels it sits
     * on and no wall shows the same tear twice.
     */
    static _buildDuctTornEdge(masterNoise) {
        const W = 1024, H = 128;
        const rand = TextureMechanics._seededRandom(60418);
        const {canvas, ctx} = TextureMechanics._createContext(W, H, false);
        const {canvas: bumpCanvas, ctx: bctx} = TextureMechanics._createContext(W, H);

        bctx.fillStyle = '#808080';
        bctx.fillRect(0, 0, W, H);

        const tau = Math.PI * 2;
        // fraction of the strip height showing plaster, as a function of x
        const lifts = [
            {c: 0.14, w: 0.055, h: 0.30},
            {c: 0.37, w: 0.030, h: 0.16},
            {c: 0.58, w: 0.070, h: 0.38},
            {c: 0.84, w: 0.040, h: 0.22}
        ];
        const exposure = (px) => {
            const t = px / W;
            let e = 0.085;
            for (const b of lifts) {
                for (let k = -1; k <= 1; k++) {
                    const d = (t - b.c + k) / b.w;
                    e += b.h * Math.exp(-d * d * 4);
                }
            }
            e += 0.016 * Math.sin(t * tau * 9 + 1.1)
               + 0.011 * Math.sin(t * tau * 17 + 2.7)
               + 0.007 * Math.sin(t * tau * 29 + 0.4)
               + 0.005 * Math.sin(t * tau * 43 + 5.2);
            return Math.max(0.02, Math.min(0.86, e));
        };
        // canvas y grows downward and v=0 samples the canvas bottom, so the floor is y = H
        const tearAt = (px) => H * (1 - exposure(px));

        const tracePlaster = (c) => {
            c.beginPath();
            c.moveTo(0, tearAt(0));
            for (let px = 1; px <= W; px++) c.lineTo(px, tearAt(px));
            c.lineTo(W, H);
            c.lineTo(0, H);
            c.closePath();
        };

        tracePlaster(ctx);
        ctx.fillStyle = '#4e463a';
        ctx.fill();

        ctx.save();
        tracePlaster(ctx);
        ctx.clip();
        for (let i = 0; i < 700; i++) {
            const gx = rand() * W, gy = rand() * H, gr = rand() * 2.0 + 0.3;
            ctx.fillStyle = rand() > 0.5
                ? `rgba(28,24,18,${0.06 + rand() * 0.18})`
                : `rgba(126,118,102,${0.04 + rand() * 0.12})`;
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fill();
        }
        // the lifted paper shades the plaster it hangs over
        const shade = ctx.createLinearGradient(0, 0, 0, H);
        shade.addColorStop(0, 'rgba(0,0,0,0.55)');
        shade.addColorStop(0.5, 'rgba(0,0,0,0.22)');
        shade.addColorStop(1, 'rgba(0,0,0,0.34)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // A hairline along the cut, not a band. The previous version filled a 3-7px ribbon
        // of pale cream that traced the whole silhouette, which is what read as fungus.
        ctx.beginPath();
        ctx.moveTo(0, tearAt(0));
        for (let px = 1; px <= W; px++) ctx.lineTo(px, tearAt(px));
        ctx.strokeStyle = 'rgba(178,164,136,0.42)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        tracePlaster(bctx);
        bctx.fillStyle = '#6a6a6a';
        bctx.fill();
        bctx.beginPath();
        bctx.moveTo(0, tearAt(0));
        for (let px = 1; px <= W; px++) bctx.lineTo(px, tearAt(px));
        bctx.strokeStyle = '#bdbdbd';
        bctx.lineWidth = 2;
        bctx.stroke();

        TextureMechanics._ditherCanvas(bctx, W, H, rand, 4);

        return new THREE.MeshStandardMaterial({
            map: TextureMechanics._createWrappedTexture(canvas, 1, 1, true),
            bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas, 1, 1, true),
            bumpScale: 0.015,
            roughness: 0.96,
            metalness: 0.0,
            alphaTest: 0.5
        });
    }

    /**
     * Seamless half-drop paisley.
     *
     * Every mark is emitted through tile(), which repeats it at the nine neighbouring
     * canvas origins, so anything crossing an edge arrives on the opposite side and the
     * result wraps in both axes with no seam to disguise.
     *
     * The boteh is generated rather than hand-authored. A spine walks forward while its
     * heading accelerates from straight into a curl (angle = bend * t^1.5), carrying a
     * half-width profile that peaks close to the base (sin(PI * t^0.6) — the fractional
     * exponent is what pulls the maximum down to t≈0.31). That combination is what gives
     * the motif a round belly and a long hooked tip instead of the symmetrical blob the
     * previous hand-tuned bezier chain produced.
     */
    static _buildPaisleyWallpaper(masterNoise, opts = {}) {
        const S = 512;
        const faded = !!opts.faded;
        const rand = TextureMechanics._seededRandom(opts.seed || 8831942);
        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const {canvas: bumpCanvas, ctx: bctx} = TextureMechanics._createContext(S, S);

        const pal = faded
            ? {ground: '#4b322c', groundAlt: '#573b33', ink: '#2b1e1b',
               motifA: '#a08a63', motifB: '#79856d', accent: '#c4b189', vine: '#55584a'}
            : {ground: '#4d2124', groundAlt: '#5d2e2c', ink: '#1e1214',
               motifA: '#b9975d', motifB: '#6f8467', accent: '#dcc492', vine: '#46503f'};

        ctx.fillStyle = pal.ground;
        ctx.fillRect(0, 0, S, S);
        bctx.fillStyle = '#808080';
        bctx.fillRect(0, 0, S, S);

        const tile = (fn) => {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) fn(dx * S, dy * S);
            }
        };

        const trace = (c, pts) => {
            c.beginPath();
            c.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
            c.closePath();
        };

        const makeBoteh = (widthScale, lengthScale) => {
            const STEPS = 110, bend = 2.35, halfW = 0.30 * widthScale;
            const left = [], right = [];
            let px = 0, py = 0;
            const ds = lengthScale / STEPS;
            for (let i = 0; i <= STEPS; i++) {
                const t = i / STEPS;
                const ang = bend * Math.pow(t, 1.5);
                const hw = halfW * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.8);
                left.push([px + Math.cos(ang) * hw, py + Math.sin(ang) * hw]);
                right.push([px - Math.cos(ang) * hw, py - Math.sin(ang) * hw]);
                px += Math.sin(ang) * ds;
                py -= Math.cos(ang) * ds;
            }
            return left.concat(right.reverse());
        };

        const outer = makeBoteh(1.0, 1.0);
        const inner = makeBoteh(0.54, 0.84);
        const leaf = makeBoteh(1.15, 0.42);

        const shade = (hex, f) => {
            const n = parseInt(hex.slice(1), 16);
            const ch = (sh) => Math.max(0, Math.min(255, Math.round(((n >> sh) & 255) * f)));
            return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
        };

        const drawBoteh = (bx, by, size, rot, fill) => {
            tile((ox, oy) => {
                for (const c of [ctx, bctx]) {
                    const isBump = c === bctx;
                    c.save();
                    c.translate(bx + ox, by + oy);
                    c.rotate(rot);
                    c.scale(size, size);
                    c.lineJoin = 'round';
                    c.lineCap = 'round';

                    // Two-tone body: the darker band between the outlines is what stops
                    // the motif reading as a flat sticker under a flashlight.
                    trace(c, outer);
                    c.fillStyle = isBump ? '#9a9a9a' : shade(fill, 0.62);
                    c.fill();
                    c.strokeStyle = isBump ? '#bcbcbc' : pal.ink;
                    c.lineWidth = 2.8 / size;
                    c.stroke();

                    trace(c, inner);
                    c.fillStyle = isBump ? '#a6a6a6' : fill;
                    c.fill();
                    c.strokeStyle = isBump ? '#8e8e8e' : shade(pal.ink, 1.7);
                    c.lineWidth = 1.4 / size;
                    c.stroke();

                    // beaded border riding the inner outline — the detail that reads as
                    // paisley rather than as a leaf at flashlight distance
                    c.fillStyle = isBump ? '#c6c6c6' : pal.accent;
                    for (let i = 0; i < inner.length; i += 8) {
                        c.beginPath();
                        c.arc(inner[i][0], inner[i][1], 1.9 / size, 0, Math.PI * 2);
                        c.fill();
                    }

                    c.fillStyle = isBump ? '#ababab' : shade(pal.accent, 0.82);
                    for (let k = 0; k < 4; k++) {
                        const t = 0.17 + k * 0.052;
                        c.beginPath();
                        c.ellipse(0.015, -t, 0.032, 0.05, 0.4, 0, Math.PI * 2);
                        c.fill();
                    }
                    c.restore();
                }
            });
        };

        const drawLeaf = (lx, ly, size, rot, fill) => {
            tile((ox, oy) => {
                for (const c of [ctx, bctx]) {
                    const isBump = c === bctx;
                    c.save();
                    c.translate(lx + ox, ly + oy);
                    c.rotate(rot);
                    c.scale(size, size);
                    c.lineJoin = 'round';
                    trace(c, leaf);
                    c.fillStyle = isBump ? '#8f8f8f' : fill;
                    c.fill();
                    c.strokeStyle = isBump ? '#a4a4a4' : pal.ink;
                    c.lineWidth = 1.6 / size;
                    c.stroke();
                    c.restore();
                }
            });
        };

        /**
         * Layout: two serpentine stems, one per column, the second phase-shifted by half
         * a period to give the half-drop. Each stem is a single sine over the full canvas
         * height, so its endpoints share an x and it rejoins itself across the vertical
         * seam. Motifs hang off the stem's extremes rather than sitting on a grid, which
         * is what makes it scan as wallpaper instead of as tiled stamps.
         */
        const COLS = 2;
        const cellW = S / COLS;
        const stemAmp = 34;
        const stemAt = (cx, phase, t) => [
            cx + Math.sin((t * 2 + phase) * Math.PI) * stemAmp,
            t * S
        ];

        for (let col = 0; col < COLS; col++) {
            const cx = col * cellW + cellW / 2;
            const phase = col * 1.0;

            const pts = [];
            for (let i = 0; i <= 128; i++) pts.push(stemAt(cx, phase, i / 128));
            tile((ox, oy) => {
                for (const c of [ctx, bctx]) {
                    const isBump = c === bctx;
                    c.save();
                    c.translate(ox, oy);
                    c.strokeStyle = isBump ? '#8c8c8c' : pal.vine;
                    c.lineWidth = isBump ? 2.2 : 3.4;
                    c.lineCap = 'round';
                    c.beginPath();
                    c.moveTo(pts[0][0], pts[0][1]);
                    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
                    c.stroke();
                    c.restore();
                }
            });

            // leaves along the stem, angled to its tangent
            for (let k = 0; k < 7; k++) {
                const t = (k + 0.5) / 7;
                const [sx, sy] = stemAt(cx, phase, t);
                const [nx, ny] = stemAt(cx, phase, t + 0.008);
                const tangent = Math.atan2(ny - sy, nx - sx);
                const side = k % 2 ? 1 : -1;
                drawLeaf(sx + Math.cos(tangent + side * 1.5) * 17,
                         sy + Math.sin(tangent + side * 1.5) * 17,
                         40, tangent + side * 1.35, shade(pal.vine, 1.35));
            }

            // main motifs at the stem's extremes, alternating colourway and facing
            for (const [t, faceRight] of [[0.25, true], [0.75, false]]) {
                const [sx, sy] = stemAt(cx, phase, t);
                const useA = (col + (t > 0.5 ? 1 : 0)) % 2 === 0;
                drawBoteh(sx + (faceRight ? 22 : -22), sy + 54,
                          128, faceRight ? -0.30 : Math.PI - 0.30,
                          useA ? pal.motifA : pal.motifB);
                drawBoteh(sx + (faceRight ? -46 : 46), sy - 50,
                          58, faceRight ? 2.55 : 2.55 + Math.PI,
                          useA ? pal.motifB : pal.motifA);
            }

            // A third, smaller motif on each stem's midpoint, where the sine crosses its
            // axis and the previous pass left an empty band.
            for (const t of [0.0, 0.5]) {
                const [sx, sy] = stemAt(cx, phase, t);
                drawBoteh(sx, sy, 46, t === 0 ? 0.9 : 0.9 + Math.PI,
                          t === 0 ? pal.motifB : pal.motifA);
            }
        }

        // Fillers in the gutter between stems. Low contrast on purpose: they carry
        // density so the ground does not read as empty, without competing with the botehs.
        for (let i = 0; i < 8; i++) {
            const fx = (i % 2) * cellW;
            const fy = (i / 8) * S + 22;
            drawLeaf(fx, fy, 30, (i * 1.9) % (Math.PI * 2), shade(pal.vine, 1.15));
            drawLeaf(fx + 15, fy + 20, 21, (i * 2.7 + 1.2) % (Math.PI * 2), shade(pal.vine, 0.9));
        }

        // Paper before age: faint vertical striae from the roll, never a hard grid.
        ctx.save();
        for (let i = 0; i < 90; i++) {
            const x = rand() * S;
            ctx.globalAlpha = 0.03 + rand() * 0.04;
            ctx.fillStyle = rand() > 0.5 ? '#000000' : pal.groundAlt;
            ctx.fillRect(x, 0, 1 + rand() * 2, S);
        }
        ctx.restore();

        // Foxing: the small rust-coloured blooms old paper grows in damp.
        for (let i = 0; i < 34; i++) {
            const fx = rand() * S, fy = rand() * S, fr = 3 + rand() * 11;
            tile((ox, oy) => {
                const g = ctx.createRadialGradient(fx + ox, fy + oy, 0, fx + ox, fy + oy, fr);
                g.addColorStop(0, 'rgba(70,40,18,0.30)');
                g.addColorStop(1, 'rgba(70,40,18,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(fx + ox, fy + oy, fr, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        if (opts.stained) {
            // Overhead paper takes water from above: broad blooms with a darker tide rim,
            // and a matching dent in the bump so they read as sagging rather than painted.
            for (let i = 0; i < 5; i++) {
                const bx = rand() * S, by = rand() * S, br = 34 + rand() * 46;
                // Each stain is a handful of overlapping offset lobes rather than one
                // disc. A single radial gradient with a rim stop draws a perfect ring,
                // which reads as a painted circle instead of as damp spreading.
                const lobes = [];
                for (let k = 0; k < 6; k++) {
                    lobes.push([bx + (rand() - 0.5) * br * 1.1,
                                by + (rand() - 0.5) * br * 1.1,
                                br * (0.45 + rand() * 0.55)]);
                }
                tile((ox, oy) => {
                    for (const [lx, ly, lr] of lobes) {
                        const g = ctx.createRadialGradient(lx + ox, ly + oy, 0, lx + ox, ly + oy, lr);
                        g.addColorStop(0, 'rgba(56,40,22,0.16)');
                        g.addColorStop(0.72, 'rgba(52,36,19,0.10)');
                        g.addColorStop(1, 'rgba(48,32,16,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.arc(lx + ox, ly + oy, lr, 0, Math.PI * 2);
                        ctx.fill();

                        const bg = bctx.createRadialGradient(lx + ox, ly + oy, 0, lx + ox, ly + oy, lr);
                        bg.addColorStop(0, 'rgba(92,92,92,0.22)');
                        bg.addColorStop(1, 'rgba(92,92,92,0)');
                        bctx.fillStyle = bg;
                        bctx.beginPath();
                        bctx.arc(lx + ox, ly + oy, lr, 0, Math.PI * 2);
                        bctx.fill();
                    }
                });
            }
        }

        ctx.globalAlpha = faded ? 0.10 : 0.13;
        ctx.drawImage(masterNoise, 0, 0, 512, 512, 0, 0, S, S);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, S, S, rand, 6);
        TextureMechanics._ditherCanvas(bctx, S, S, rand, 3);

        return new THREE.MeshStandardMaterial({
            map: TextureMechanics._createWrappedTexture(canvas),
            bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas),
            bumpScale: 0.014,
            roughness: 0.93,
            metalness: 0.0
        });
    }

    /**
     * Duct floor: short butt-jointed boards under a lot of dust. Board rows divide the
     * canvas evenly and every joint and grain line is drawn wrapped, so the surface tiles
     * in both axes. Deliberately low-contrast — it is meant to sit under the eye while
     * the walls carry the pattern.
     */
    static _buildDuctFloor(masterNoise) {
        const S = 512;
        const rand = TextureMechanics._seededRandom(41772);
        const {canvas, ctx} = TextureMechanics._createContext(S, S);
        const {canvas: bumpCanvas, ctx: bctx} = TextureMechanics._createContext(S, S);

        ctx.fillStyle = '#3b332b';
        ctx.fillRect(0, 0, S, S);
        bctx.fillStyle = '#808080';
        bctx.fillRect(0, 0, S, S);

        const ROWS = 4;
        const rowH = S / ROWS;
        for (let r = 0; r < ROWS; r++) {
            const y = r * rowH;
            const shade = 0.82 + rand() * 0.36;
            const base = Math.round(58 * shade);
            ctx.fillStyle = `rgb(${base + 6},${Math.round(base * 0.88)},${Math.round(base * 0.72)})`;
            ctx.fillRect(0, y, S, rowH);

            // grain
            for (let g = 0; g < 26; g++) {
                const gy = y + rand() * rowH;
                ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.10})`;
                ctx.lineWidth = 0.6 + rand() * 1.4;
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.bezierCurveTo(S * 0.3, gy + (rand() - 0.5) * 7,
                                  S * 0.7, gy + (rand() - 0.5) * 7, S, gy);
                ctx.stroke();
            }

            // butt joints, wrapped
            const joints = 1 + Math.floor(rand() * 2);
            for (let j = 0; j < joints; j++) {
                const jx = rand() * S;
                for (const c of [ctx, bctx]) {
                    c.strokeStyle = c === bctx ? 'rgba(40,40,40,0.8)' : 'rgba(0,0,0,0.55)';
                    c.lineWidth = 2;
                    c.beginPath();
                    c.moveTo(jx, y);
                    c.lineTo(jx, y + rowH);
                    c.stroke();
                }
            }

            // row seam, top edge only so the bottom of the last row meets the first
            for (const c of [ctx, bctx]) {
                c.strokeStyle = c === bctx ? 'rgba(38,38,38,0.9)' : 'rgba(0,0,0,0.6)';
                c.lineWidth = 2.5;
                c.beginPath();
                c.moveTo(0, y);
                c.lineTo(S, y);
                c.stroke();
            }
        }

        // dust and scuffing, wrapped
        for (let i = 0; i < 220; i++) {
            const dx = rand() * S, dy = rand() * S, dr = 4 + rand() * 26;
            const ox = dx < dr ? S : (dx > S - dr ? -S : 0);
            const oy = dy < dr ? S : (dy > S - dr ? -S : 0);
            const paint = (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, dr);
                g.addColorStop(0, `rgba(150,142,126,${0.04 + rand() * 0.07})`);
                g.addColorStop(1, 'rgba(150,142,126,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px, py, dr, 0, Math.PI * 2);
                ctx.fill();
            };
            paint(dx, dy);
            if (ox) paint(dx + ox, dy);
            if (oy) paint(dx, dy + oy);
            if (ox && oy) paint(dx + ox, dy + oy);
        }

        ctx.globalAlpha = 0.16;
        ctx.drawImage(masterNoise, 0, 0, 512, 512, 0, 0, S, S);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, S, S, rand, 7);
        TextureMechanics._ditherCanvas(bctx, S, S, rand, 4);

        return new THREE.MeshStandardMaterial({
            map: TextureMechanics._createWrappedTexture(canvas),
            bumpMap: TextureMechanics._createWrappedTexture(bumpCanvas),
            bumpScale: 0.02,
            roughness: 0.97,
            metalness: 0.0
        });
    }

    static async _buildNormalCeiling(masterNoise) {
        const SIZE = 1024;
        const MASK = SIZE - 1;
        const COLS = 4, ROWS = 4;
        const TW = SIZE / COLS, TH = SIZE / ROWS;
        const GRID_W = 6, GRID_H = GRID_W / 2;
        const rand = TextureMechanics._seededRandom(60540117);

        const {canvas, ctx} = TextureMechanics._createContext(SIZE, SIZE);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(SIZE, SIZE);
        bCtx.fillStyle = '#b4b4b4';
        bCtx.fillRect(0, 0, SIZE, SIZE);

        const tiles = [];
        for (let i = 0; i < COLS * ROWS; i++) {
            const replaced = rand() > 0.84;
            tiles.push({
                replaced,
                age: replaced ? 0.24 + rand() * 0.16 : 0.52 + rand() * 0.44,
                stain: 0,
                chip: !replaced && rand() > 0.82,
                chipCorner: Math.floor(rand() * 4)
            });
        }

        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                const r = 245 - t.age * 22;
                const g = 241 - t.age * 32;
                const b = 227 - t.age * 56;
                ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
                ctx.fillRect(tx * TW, ty * TH, TW, TH);
            }
        }

        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                const ox = tx * TW, oy = ty * TH;
                ctx.save();
                ctx.beginPath();
                ctx.rect(ox, oy, TW, TH);
                ctx.clip();
                const blobs = 10 + Math.floor(rand() * 8);
                for (let i = 0; i < blobs; i++) {
                    const bx = ox + rand() * TW, by = oy + rand() * TH;
                    const br = TW * (0.15 + rand() * 0.35);
                    const warm = rand() > 0.45;
                    const tint = warm ? '176, 156, 106' : '255, 253, 244';
                    const alpha = (0.03 + rand() * 0.06) * (0.35 + t.age);
                    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
                    g.addColorStop(0, `rgba(${tint}, ${alpha})`);
                    g.addColorStop(1, `rgba(${tint}, 0)`);
                    ctx.fillStyle = g;
                    ctx.fillRect(ox, oy, TW, TH);
                }
                ctx.restore();
            }
        }

        const P = 4;
        const img = ctx.getImageData(0, 0, SIZE, SIZE);
        const bImg = bCtx.getImageData(0, 0, SIZE, SIZE);
        const px = img.data, bpx = bImg.data;
        const cells = SIZE / P;
        for (let cy = 0; cy < cells; cy++) {
            if (cy % 8 === 0) await TextureMechanics._yield();
            for (let cx = 0; cx < cells; cx++) {
                let h = (Math.imul(cx, 374761393) + Math.imul(cy, 668265263)) >>> 0;
                h = (h ^ (h >>> 13)) >>> 0;
                h = Math.imul(h, 1274126177) >>> 0;
                h = (h ^ (h >>> 16)) >>> 0;
                if ((h & 255) > 206) continue;
                const ox = cx * P + 1.3 + ((h >>> 8) & 255) / 255 * 1.4;
                const oy = cy * P + 1.3 + ((h >>> 16) & 255) / 255 * 1.4;
                const r = 0.7 + ((h >>> 24) & 255) / 255 * 0.7;
                for (let dy = -2; dy <= 3; dy++) {
                    const y = cy * P + dy;
                    const vy = y + 0.5 - oy;
                    for (let dx = -2; dx <= 3; dx++) {
                        const x = cx * P + dx;
                        const vx = x + 0.5 - ox;
                        const cov = r + 0.45 - Math.sqrt(vx * vx + vy * vy);
                        if (cov <= 0) continue;
                        const a = cov > 1 ? 1 : cov;
                        const i = (((y & MASK) * SIZE) + (x & MASK)) * 4;
                        px[i] -= px[i] * 0.30 * a;
                        px[i + 1] -= px[i + 1] * 0.32 * a;
                        px[i + 2] -= px[i + 2] * 0.34 * a;
                        const drop = 95 * a;
                        bpx[i] -= drop;
                        bpx[i + 1] -= drop;
                        bpx[i + 2] -= drop;
                    }
                }
            }
        }
        ctx.putImageData(img, 0, 0);
        bCtx.putImageData(bImg, 0, 0);



        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                if (t.replaced) continue;
                const cx = tx * TW + TW / 2, cy = ty * TH + TH / 2;
                const r = Math.min(TW, TH) * 0.62;
                const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
                g.addColorStop(0, `rgba(104, 96, 74, ${0.07 * t.age})`);
                g.addColorStop(1, 'rgba(104, 96, 74, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(tx * TW, ty * TH, TW, TH);
            }
        }

        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                if (!t.chip) continue;
                const cnx = (t.chipCorner & 1) ? tx * TW + TW - GRID_H : tx * TW + GRID_H;
                const cny = (t.chipCorner & 2) ? ty * TH + TH - GRID_H : ty * TH + GRID_H;
                const sx = (t.chipCorner & 1) ? -1 : 1;
                const sy = (t.chipCorner & 2) ? -1 : 1;
                const w = 10 + rand() * 22, hgt = 8 + rand() * 20;
                ctx.beginPath();
                ctx.moveTo(cnx, cny + sy * hgt);
                ctx.lineTo(cnx + sx * w * 0.4, cny + sy * hgt * 0.55);
                ctx.lineTo(cnx + sx * w, cny + sy * hgt * 0.15);
                ctx.lineTo(cnx + sx * w, cny);
                ctx.closePath();
                ctx.fillStyle = 'rgba(254, 252, 246, 0.8)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(112, 100, 74, 0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const ox = tx * TW, oy = ty * TH;
                for (let step = 0; step < 4; step++) {
                    const inset = GRID_H + step * 3;
                    const a = [0.34, 0.20, 0.11, 0.05][step];
                    ctx.fillStyle = `rgba(56, 48, 30, ${a})`;
                    ctx.fillRect(ox + inset, oy + inset, TW - inset * 2, 3);
                    ctx.fillRect(ox + inset, oy + TH - inset - 3, TW - inset * 2, 3);
                    ctx.fillRect(ox + inset, oy + inset, 3, TH - inset * 2);
                    ctx.fillRect(ox + TW - inset - 3, oy + inset, 3, TH - inset * 2);
                }
            }
        }

        const mains = [], crosses = [];
        for (let i = 0; i < COLS; i++) mains.push(i * TW);
        mains.push(SIZE);
        for (let i = 0; i < ROWS; i++) crosses.push(i * TH);
        crosses.push(SIZE);
        for (const p of mains) {
            ctx.fillStyle = 'rgba(38, 32, 18, 0.42)';
            ctx.fillRect(p - GRID_H - 2, 0, 2, SIZE);
            ctx.fillRect(p + GRID_H, 0, 2, SIZE);
            ctx.fillStyle = 'rgb(243, 241, 233)';
            ctx.fillRect(p - GRID_H, 0, GRID_W, SIZE);
            ctx.fillStyle = 'rgba(255, 255, 250, 0.55)';
            ctx.fillRect(p - GRID_H, 0, 2, SIZE);
            bCtx.fillStyle = '#ffffff';
            bCtx.fillRect(p - GRID_H, 0, GRID_W, SIZE);
            bCtx.fillStyle = '#404040';
            bCtx.fillRect(p - GRID_H - 2, 0, 2, SIZE);
            bCtx.fillRect(p + GRID_H, 0, 2, SIZE);
        }
        for (const p of crosses) {
            ctx.fillStyle = 'rgba(38, 32, 18, 0.42)';
            ctx.fillRect(0, p - GRID_H - 2, SIZE, 2);
            ctx.fillRect(0, p + GRID_H, SIZE, 2);
            ctx.fillStyle = 'rgb(239, 237, 229)';
            ctx.fillRect(0, p - GRID_H, SIZE, GRID_W);
            ctx.fillStyle = 'rgba(255, 255, 250, 0.55)';
            ctx.fillRect(0, p - GRID_H, SIZE, 2);
            bCtx.fillStyle = '#ffffff';
            bCtx.fillRect(0, p - GRID_H, SIZE, GRID_W);
            bCtx.fillStyle = '#404040';
            bCtx.fillRect(0, p - GRID_H - 2, SIZE, 2);
            bCtx.fillRect(0, p + GRID_H, SIZE, 2);
        }
        for (const m of mains) {
            ctx.fillStyle = 'rgba(56, 46, 22, 0.38)';
            for (const c of crosses) {
                ctx.fillRect(m - GRID_H, c - GRID_H, 1, GRID_W);
                ctx.fillRect(m + GRID_H - 1, c - GRID_H, 1, GRID_W);
            }
            ctx.fillStyle = `rgba(150, 128, 68, ${0.12 + rand() * 0.14})`;
            ctx.fillRect(m - GRID_H, 0, 1, SIZE);
            ctx.fillRect(m + GRID_H - 1, 0, 1, SIZE);
        }
        for (const c of crosses) {
            ctx.fillStyle = `rgba(150, 128, 68, ${0.12 + rand() * 0.14})`;
            ctx.fillRect(0, c - GRID_H, SIZE, 1);
            ctx.fillRect(0, c + GRID_H - 1, SIZE, 1);
        }

        ctx.globalAlpha = 0.06;
        ctx.drawImage(masterNoise, 0, 0, SIZE, SIZE);
        ctx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        return {canvas, bumpCanvas};
    }

    static _buildWallpaper(masterNoise) {
        const W = 512, H = 512;
        const rand = TextureMechanics._seededRandom(70431182);
        const {canvas, ctx} = TextureMechanics._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(W, H);

        ctx.fillStyle = '#d4c382';
        ctx.fillRect(0, 0, W, H);
        bCtx.fillStyle = '#8c8c8c';
        bCtx.fillRect(0, 0, W, H);

        ctx.lineWidth = 4;
        bCtx.lineWidth = 4;
        for (let i = 0; i < W; i += 16) {
            const major = i % 32 === 0;
            ctx.strokeStyle = major ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
            bCtx.strokeStyle = major ? 'rgba(122,122,122,0.45)' : 'rgba(188,188,188,0.35)';
            bCtx.beginPath(); bCtx.moveTo(i, 0); bCtx.lineTo(i, H); bCtx.stroke();
        }
        ctx.globalAlpha = 0.5;
        ctx.drawImage(masterNoise, 0, 0);
        ctx.globalAlpha = 0.22;
        bCtx.drawImage(masterNoise, 0, 0);
        ctx.globalAlpha = 1.0;
        bCtx.globalAlpha = 1.0;

        TextureMechanics._ditherCanvas(ctx, W, H, rand, 4);
        TextureMechanics._ditherCanvas(bCtx, W, H, rand, 3);
        return {canvas, bumpCanvas};
    }


}
