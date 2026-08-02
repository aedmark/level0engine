/**
 * The core generator for all procedural textures used in the game.
 *
 * This file is responsible for keeping the game bundle so incredibly small.
 * Instead of loading dozens of MBs of .png files for walls, floors, ceilings, and props,
 * this class uses the HTML5 `CanvasRenderingContext2D` API to draw every texture from scratch
 * when the game loads. It combines simple shapes, procedural noise (`_generateMasterNoise`),
 * and gradients to create all the materials used by the `MaterialLibrary`.
 */
export default class ProceduralTextureFactory {
    static _createContext(width, height, opaque = true) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return {canvas, ctx: canvas.getContext('2d', opaque ? {alpha: false} : undefined)};
    }

    /**
     * A small deterministic PRNG (the same LCG used elsewhere in the engine).
     *
     * Surface generators use this rather than `Math.random` so a given floor is byte-identical
     * on every boot -- a texture that reshuffles itself between sessions makes it impossible to
     * tell a tuning change from noise when you are eyeballing the result.
     *
     * @param {number} seed - Any 32-bit integer.
     * @returns {function(): number} Successive floats in [0, 1).
     */
    static _seededRandom(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296.0;
        };
    }

    /**
     * Runs `fn` up to four times, offset by +/- the canvas size, so a mark that crosses an edge
     * reappears on the opposite side and the texture stays seamless when tiled.
     *
     * Only marks within `reach` of an edge pay for the extra draws; anything comfortably inside
     * is drawn once.
     *
     * @param {number} size - Canvas dimension (assumed square).
     * @param {number} x - Mark centre X.
     * @param {number} y - Mark centre Y.
     * @param {number} reach - How far the mark extends from its centre.
     * @param {function(number, number): void} fn - Draws the mark at a given origin.
     */
    /**
     * Adds per-pixel noise to break up 8-bit gradient banding.
     *
     * Canvas gradients quantise to 256 levels per channel. A ramp that only travels ~20 levels
     * across 512 pixels therefore lands as ~20 flat bands roughly 25px tall, which is invisible
     * on the canvas and glaringly obvious once the texture is magnified across a wall -- it
     * reads as horizontal striping that swims as the camera moves and the mip level changes.
     *
     * A couple of levels of random noise per pixel destroys the banding while staying well
     * below the threshold where it reads as grain. Applied after all gradient work, so it
     * covers radial mottle and sag shading as well as linear ramps.
     *
     * @param {CanvasRenderingContext2D} ctx - Target context.
     * @param {number} w - Canvas width.
     * @param {number} h - Canvas height.
     * @param {function(): number} rand - Deterministic source, so the dither is reproducible.
     * @param {number} [amount] - Peak-to-peak spread in 8-bit levels.
     */
    static _ditherCanvas(ctx, w, h, rand, amount = 5) {
        const img = ctx.getImageData(0, 0, w, h);
        const px = img.data;
        for (let i = 0; i < px.length; i += 4) {
            const n = (rand() - 0.5) * amount;
            px[i] += n;
            px[i + 1] += n;
            px[i + 2] += n;
        }
        ctx.putImageData(img, 0, 0);
    }

    static _wrapDraw(size, x, y, reach, fn) {
        const ox = x < reach ? size : (x > size - reach ? -size : 0);
        const oy = y < reach ? size : (y > size - reach ? -size : 0);
        fn(x, y);
        if (ox) fn(x + ox, y);
        if (oy) fn(x, y + oy);
        if (ox && oy) fn(x + ox, y + oy);
    }

    static _createWrappedTexture(canvas, repeatX = 1, repeatY = 1, clampT = false) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        if (repeatX !== 1 || repeatY !== 1) {
            texture.repeat.set(repeatX, repeatY);
        }
        return texture;
    }

    static _generateMasterNoise() {
        const {canvas, ctx} = this._createContext(512, 512, false);
        const img = ctx.createImageData(512, 512);
        const data = img.data;
        let seed = 1337;
        for (let i = 0; i < data.length; i += 4) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            if ((seed >>> 24) > 217) {
                const val = (seed & 0x10000) ? 0 : 255;
                data[i] = data[i + 1] = data[i + 2] = val;
                data[i + 3] = 10 + ((seed >>> 8) % 50);
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas;
    }

    static _buildStructuralAssets(masterNoise) {
        const {canvas: wallCanvas, bumpCanvas: wallBumpCanvas} = this._buildWallpaper(masterNoise);
        const wallCtx = wallCanvas.getContext('2d');
        const wallBumpCtx = wallBumpCanvas.getContext('2d');
        const {canvas: headerCanvas, ctx: headerCtx} = this._createContext(512, 512);
        headerCtx.drawImage(wallCanvas, 0, 0);
        const headerTexture = this._createWrappedTexture(headerCanvas, 4, 0.1);
        headerTexture.offset.set(0, 0.9);
        const headerMat = new THREE.MeshStandardMaterial({
            map: headerTexture,
            roughness: 0.8,
            bumpMap: headerTexture,
            bumpScale: 0.01
        });
        wallCtx.fillStyle = '#6d5a35';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#5a4724';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);
        // The skirting is a real board standing proud of the paper, and the butt joint between
        // two lengths of it is a real gap -- both belong in the relief, unlike the damp above.
        wallBumpCtx.fillStyle = '#e0e0e0';
        wallBumpCtx.fillRect(0, 480, 512, 32);
        wallBumpCtx.fillStyle = '#3c3c3c';
        wallBumpCtx.fillRect(0, 476, 512, 4);
        wallBumpCtx.fillStyle = 'rgba(40,40,40,0.6)';
        wallBumpCtx.fillRect(255, 0, 2, 512);
        const wallTexture = this._createWrappedTexture(wallCanvas, 4, 1, true);
        const wallBumpTexture = this._createWrappedTexture(wallBumpCanvas, 4, 1, true);
        const {canvas: structCanvas, ctx: structCtx} = this._createContext(512, 512);
        structCtx.fillStyle = '#7e7664';
        structCtx.fillRect(0, 0, 512, 512);
        structCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let y = 0; y < 512; y += (Math.random() * 30 + 20)) structCtx.fillRect(0, y, 512, Math.random() * 8 + 2);
        structCtx.globalAlpha = 0.9;
        structCtx.drawImage(masterNoise, 0, 0);
        structCtx.scale(-1, 1);
        structCtx.drawImage(masterNoise, -512, 0);
        structCtx.setTransform(1, 0, 0, 1, 0, 0);
        structCtx.globalAlpha = 1.0;
        for (let i = 0; i < 30; i++) {
            const grad = structCtx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, `rgba(40, 30, 20, ${Math.random() * 0.2})`);
            grad.addColorStop(1, 'rgba(40, 30, 20, 0)');
            structCtx.fillStyle = grad;
            const startX = Math.random() * 512;
            const streakW = Math.random() * 24 + 8;
            structCtx.fillRect(startX, 0, streakW, 512);
            if (startX + streakW > 512) structCtx.fillRect(startX - 512, 0, streakW, 512);
        }
        const structTexture = this._createWrappedTexture(structCanvas, 2, 2);
        const structMat = new THREE.MeshStandardMaterial({
            map: structTexture,
            roughness: 1.0,
            bumpMap: structTexture,
            bumpScale: 0.02
        });
        const {canvas: woodCanvas, bumpCanvas: woodBumpCanvas} = this._buildWood(masterNoise);
        const woodTexture = this._createWrappedTexture(woodCanvas);
        const woodBumpTexture = this._createWrappedTexture(woodBumpCanvas);
        const woodMat = new THREE.MeshStandardMaterial({
            map: woodTexture,
            // Was 0.9, which is bare sawn timber. Archive shelving and boardroom tables are
            // finished stock, and a little sheen is what lets the ring bands register at all in
            // a sector this dark -- a fully matte surface returns the same value from every
            // angle and the figure disappears with it.
            roughness: 0.74,
            bumpMap: woodBumpTexture,
            bumpScale: 0.015
        });
        const {canvas: doorCanvas, bumpCanvas: doorBumpCanvas} =
            this._buildDoor(woodCanvas, woodBumpCanvas, masterNoise);
        const doorTexture = new THREE.CanvasTexture(doorCanvas);
        const doorBumpTexture = new THREE.CanvasTexture(doorBumpCanvas);
        // The back leaf is the front mirrored, so its relief has to be mirrored with it -- an
        // unflipped bump would light the far side's chamfers as if they belonged to the near one.
        const mirror = (src) => {
            const {canvas: out, ctx: outCtx} = this._createContext(256, 512);
            outCtx.translate(256, 0);
            outCtx.scale(-1, 1);
            outCtx.drawImage(src, 0, 0);
            return out;
        };
        const doorBackTexture = new THREE.CanvasTexture(mirror(doorCanvas));
        const doorBackBumpTexture = new THREE.CanvasTexture(mirror(doorBumpCanvas));
        // The face carried no bumpMap at all, which is the other half of why the panels read as
        // printed on: with no relief there was nothing for the player's torch to rake across.
        const doorMatFront = new THREE.MeshStandardMaterial({
            map: doorTexture, bumpMap: doorBumpTexture, bumpScale: 0.03, roughness: 0.74
        });
        const doorMatBack = new THREE.MeshStandardMaterial({
            map: doorBackTexture, bumpMap: doorBackBumpTexture, bumpScale: 0.03, roughness: 0.74
        });
        const doorMatEdge = new THREE.MeshStandardMaterial({
            map: woodTexture, bumpMap: woodBumpTexture, bumpScale: 0.015, roughness: 0.74
        });
        const doorMat = [doorMatEdge, doorMatEdge, doorMatEdge, doorMatEdge, doorMatFront, doorMatBack];
        return {headerMat, wallTexture, wallBumpTexture, structMat, woodMat, doorMat};
    }

    static _buildSurfaceAssets(masterNoise) {
        const {canvas: carpetCanvas, ctx: carpetCtx} = this._createContext(512, 512);
        const {canvas: noiseCanvas, ctx: noiseCtx} = this._createContext(256, 256);
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
        const carpetTexture = this._createWrappedTexture(carpetCanvas);
        carpetTexture.magFilter = THREE.LinearFilter;
        carpetTexture.minFilter = THREE.LinearMipmapLinearFilter;
        const {canvas: ceilingCanvas, bumpCanvas: ceilingBumpCanvas} = this._buildNormalCeiling(masterNoise);
        const ceilingTexture = this._createWrappedTexture(ceilingCanvas);
        const ceilingBumpTexture = this._createWrappedTexture(ceilingBumpCanvas);
        const {canvas: tileCanvas, ctx: tileCtx} = this._createContext(256, 256);
        tileCtx.fillStyle = '#080808';
        tileCtx.fillRect(0, 0, 256, 256);
        tileCtx.strokeStyle = '#1a1a1a';
        tileCtx.lineWidth = 2;
        tileCtx.strokeRect(0, 0, 256, 256);
        tileCtx.globalAlpha = 0.15;
        tileCtx.drawImage(masterNoise, 0, 0, 256, 256);
        tileCtx.globalAlpha = 1.0;
        const tileTexture = this._createWrappedTexture(tileCanvas, 16, 16);
        const tileMat = new THREE.MeshStandardMaterial({
            map: tileTexture,
            roughness: 0.4,
            metalness: 0.6,
            shadowSide: THREE.DoubleSide
        });
        const {canvas: clinicCanvas, ctx: cCtx} = this._createContext(256, 256);
        cCtx.fillStyle = '#e8ecef';
        cCtx.fillRect(0, 0, 256, 256);
        cCtx.globalAlpha = 0.08;
        cCtx.drawImage(masterNoise, 0, 0, 256, 256);
        cCtx.globalAlpha = 1.0;
        cCtx.strokeStyle = '#8a98a3';
        cCtx.lineWidth = 4;
        cCtx.strokeRect(0, 0, 256, 256);
        const {canvas: clinicBumpCanvas, ctx: cbCtx} = this._createContext(256, 256);
        cbCtx.fillStyle = '#ffffff';
        cbCtx.fillRect(0, 0, 256, 256);
        cbCtx.strokeStyle = '#000000';
        cbCtx.lineWidth = 4;
        cbCtx.strokeRect(0, 0, 256, 256);
        const clinicTex = this._createWrappedTexture(clinicCanvas, 32, 32);
        const clinicBumpTex = this._createWrappedTexture(clinicBumpCanvas, 32, 32);
        const clinicMat = new THREE.MeshStandardMaterial({
            map: clinicTex,
            bumpMap: clinicBumpTex,
            bumpScale: 0.015,
            roughness: 0.4,
            metalness: 0.15,
            shadowSide: THREE.DoubleSide
        });
        const atriumFloorMat = this._buildAtriumFloor(masterNoise);
        const clinicFloorMat = this._buildClinicFloor(masterNoise);
        const clinicCeilingMat = this._buildClinicCeiling(masterNoise);
        const clinicWallMat = this._buildClinicWall(masterNoise);
        const clinicRailMat = this._buildClinicRail(masterNoise);
        return {
            carpetTexture, ceilingTexture, ceilingBumpTexture, tileMat, clinicMat,
            atriumFloorMat, clinicFloorMat, clinicCeilingMat, clinicWallMat, clinicRailMat
        };
    }

    /**
     * Builds the ceiling for the normal floors: a suspended lay-in grid of pinhole acoustic
     * board, yellowed by the decades of light it has been sitting above.
     *
     * A laid tile is one world unit -- the size `fallenTileGeo` already assumes when a ceiling
     * rots -- and the canvas carries a 4x4 block at 1024px, so the 15/16in T-bar flange lands
     * at 6px. Sixteen tiles is the smallest field that survives a 16x repeat without the eye
     * locking onto one distinctive tile, which is why the age bands are kept narrow.
     *
     * Perforated rather than fissured: `_buildClinicCeiling` owns fissured mineral fibre, and
     * two ceilings sharing a surface signature read as one asset used twice. The perforation
     * itself only resolves within a couple of metres; past that the grid carries the read,
     * hence the dark line either side of every flange.
     *
     * Relief ships as its own canvas. Driving bump from the colour map inverts the grid -- the
     * T-bar is the darkest thing on a yellow ceiling, so it read as a trench.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {{canvas: HTMLCanvasElement, bumpCanvas: HTMLCanvasElement}} Colour and relief.
     */
    static _buildNormalCeiling(masterNoise) {
        const SIZE = 1024;
        const MASK = SIZE - 1;
        const COLS = 4, ROWS = 4;
        const TW = SIZE / COLS, TH = SIZE / ROWS;
        const GRID_W = 6, GRID_H = GRID_W / 2;
        const rand = this._seededRandom(60540117);

        const {canvas, ctx} = this._createContext(SIZE, SIZE);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(SIZE, SIZE);
        bCtx.fillStyle = '#b4b4b4';
        bCtx.fillRect(0, 0, SIZE, SIZE);

        const tiles = [];
        for (let i = 0; i < COLS * ROWS; i++) {
            const replaced = rand() > 0.84;
            tiles.push({
                replaced,
                age: replaced ? 0.24 + rand() * 0.16 : 0.52 + rand() * 0.44,
                stain: replaced ? 0 : (rand() > 0.72 ? 0.6 + rand() * 0.4 : 0),
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

        const island = (cx, cy, r, wob, phase, lobes) => {
            const pts = 20;
            ctx.beginPath();
            for (let i = 0; i <= pts; i++) {
                const a = (i / pts) * Math.PI * 2;
                const lobe = 0.5 + 0.5 * Math.sin(a * lobes + phase);
                const lobe2 = 0.5 + 0.5 * Math.sin(a * (lobes + 2) - phase * 1.7);
                const rr = r * (1 - wob + wob * (lobe * 0.65 + lobe2 * 0.35) + (rand() - 0.5) * 0.14);
                const pxx = cx + Math.cos(a) * rr, pyy = cy + Math.sin(a) * rr;
                if (i === 0) ctx.moveTo(pxx, pyy); else ctx.lineTo(pxx, pyy);
            }
            ctx.closePath();
        };
        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                const t = tiles[ty * COLS + tx];
                if (!t.stain) continue;
                const ox = tx * TW, oy = ty * TH;
                const cx = ox + TW * (0.28 + rand() * 0.44);
                const cy = oy + TH * (0.28 + rand() * 0.44);
                const r = Math.min(TW, TH) * (0.16 + rand() * 0.16) * t.stain;
                island(cx, cy, r, 0.28, rand() * Math.PI * 2, 2 + Math.floor(rand() * 3));
                ctx.fillStyle = `rgba(146, 106, 44, ${0.10 + rand() * 0.06})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(118, 84, 34, ${0.20 + rand() * 0.08})`;
                ctx.lineWidth = 1.1 + rand() * 1.2;
                ctx.stroke();
                island(cx + (rand() - 0.5) * r * 0.3, cy + (rand() - 0.5) * r * 0.3,
                    r * 0.34, 0.34, rand() * Math.PI * 2, 2 + Math.floor(rand() * 3));
                ctx.fillStyle = 'rgba(128, 92, 38, 0.13)';
                ctx.fill();
            }
        }

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

        this._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        return {canvas, bumpCanvas};
    }

    /**
     * Builds the Clinic's wall: corporate beige painted drywall, scuffed and chipped.
     *
     * Unlike the floor and ceiling, this texture is *height-aware*. It follows the engine's
     * existing wall convention -- repeat (4, 1) with `clampT`, so the canvas does not tile
     * vertically and its full height maps to the wall's full 3.0 units. Canvas bottom is floor
     * level. That is what lets `sharedWallMat` put a skirting band at y=480, and it lets this
     * one put damage where damage actually happens.
     *
     * Everything here is banded accordingly: a coved vinyl base along the bottom, a beaten
     * strip at gurney height, chips concentrated low where castors and cart corners strike,
     * and a comparatively clean upper wall nobody ever touches. The Clinic's bumper rail
     * geometry sits at y=0.95, which lands at canvas y=350, so the heaviest wear is centred
     * there -- in a real corridor the wall *around* the rail takes the abuse.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Clinic wall material.
     */
    static _buildClinicWall(masterNoise) {
        const W = 512, H = 512;
        const UNITS = 3.0;
        const yAt = (u) => H - (u / UNITS) * H;
        const RAIL_Y = yAt(0.95);
        const BASE_TOP = yAt(0.10);
        const rand = this._seededRandom(66104923);
        const wrapX = (x, reach, fn) => {
            const ox = x < reach ? W : (x > W - reach ? -W : 0);
            fn(x);
            if (ox) fn(x + ox);
        };

        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);
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

        this._ditherCanvas(ctx, W, H, rand, 15);

        const map = this._createWrappedTexture(canvas, 4, 1, true);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 4, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.014,
            roughness: 0.72,
            metalness: 0.02
            // No shadowSide override. DoubleSide writes this wall's own front faces into the
            // shadow map, so the lit face tests against its own depth and breaks into acne --
            // horizontal bands that crawl as the mip level changes when you walk toward it.
            // Three's default already picks BackSide for a FrontSide material, which is the
            // guard against exactly that. DoubleSide is only needed by single-plane geometry
            // that would otherwise cast nothing.
        });
    }

    /**
     * Builds the Clinic's crash rail: extruded vinyl over an aluminium retainer, the thing the
     * scuff band on `_buildClinicWall` is evidence of.
     *
     * `_buildClinicWall` centres its scuffing on `RAIL_Y = yAt(0.95)` and has done since it was
     * written, so the wall has always been telling the story of a rail that was not in the scene
     * -- gouges at gurney height with nothing there to be gurney height. This restores the
     * object the damage belongs to.
     *
     * The canvas is one metre of rail at 512px, tiled along the run. Vinyl is semi-gloss where
     * the wall is flat, which is most of what sells it: under a ceiling panel the rail catches a
     * highlight the beige around it cannot.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The crash rail material.
     */
    static _buildClinicRail(masterNoise) {
        const W = 512, H = 74;
        const rand = this._seededRandom(31885402);
        const wrapX = (x, reach, fn) => {
            const ox = x < reach ? W : (x > W - reach ? -W : 0);
            fn(x);
            if (ox) fn(x + ox);
        };

        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);
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

        // Scuffing. A crash rail takes its damage as long horizontal drags at bed-frame height
        // rather than the scattered pocks a wall collects, because the thing hitting it is
        // always travelling along the corridor.
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

        // Deeper gouges cut past the colour into the paler substrate underneath.
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
        this._ditherCanvas(ctx, W, H, rand, 8);

        const map = this._createWrappedTexture(canvas, 4, 1, true);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 4, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.004,
            roughness: 0.44,
            metalness: 0.08
        });
    }

    /**
     * Builds the Clinic's ceiling: a suspended 2x4 mineral-fibre drop ceiling, water stained.
     *
     * Scale matters more here than anywhere else in the factory. A 2x4 ceiling tile is two
     * feet by four feet -- 0.61 x 1.22 units at this engine's roughly one-unit-per-metre
     * scale, not two units by four. Laying four columns by two rows of them fills exactly
     * 2.44 units square, so the canvas stays square and the repeat stays isotropic.
     *
     * The T-bar grid is drawn at ~5px, which is the real 15/16in flange width at this scale.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Clinic ceiling material.
     */
    static _buildClinicCeiling(masterNoise) {
        const SIZE = 512;
        const COLS = 4, ROWS = 2;
        const TW = SIZE / COLS, TH = SIZE / ROWS;
        const GRID_W = 5;
        const rand = this._seededRandom(41207788);
        const wrapped = (x, y, reach, fn) => this._wrapDraw(SIZE, x, y, reach, fn);

        const {canvas, ctx} = this._createContext(SIZE, SIZE);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(SIZE, SIZE);
        bCtx.fillStyle = '#c8c8c8';
        bCtx.fillRect(0, 0, SIZE, SIZE);

        const tiles = [];
        for (let i = 0; i < COLS * ROWS; i++) {
            const replaced = rand() > 0.86;
            tiles.push({
                replaced,
                age: replaced ? 0.05 + rand() * 0.12 : 0.35 + rand() * 0.65,
                stain: replaced ? 0 : (rand() > 0.55 ? 1 + rand() : 0)
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
                    // Same curve, same width. The bump used to run a straight line at more than
                    // twice the colour's contrast, so the relief disagreed with the mark it was
                    // supposed to belong to and read as debris lying on the tile.
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
                    // Pinholes carry the relief now. They are the finest thing on the tile, so
                    // they survive as tooth where the fissures were only ever readable as scars.
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
                if (!t.stain) continue;
                const ox = tx * TW, oy = ty * TH;
                const blooms = 1 + Math.floor(rand() * 2);
                for (let b = 0; b < blooms; b++) {
                    const cx = ox + TW * (0.25 + rand() * 0.5);
                    const cy = oy + TH * (0.2 + rand() * 0.6);
                    const rMax = Math.min(TW, TH) * (0.22 + rand() * 0.22) * t.stain;
                    let dx = 0, dy = 0;
                    for (let ring = 3; ring >= 1; ring--) {
                        const r = rMax * (ring / 3);
                        dx += (rand() - 0.5) * r * 0.28;
                        dy += (rand() - 0.5) * r * 0.28;
                        island(cx + dx, cy + dy, r, 0.26, rand() * Math.PI * 2, 2 + Math.floor(rand() * 3));
                        ctx.fillStyle = `rgba(163, 128, 84, ${0.07 + (3 - ring) * 0.05})`;
                        ctx.fill();
                        if (ring !== 2) {
                            ctx.strokeStyle = `rgba(129, 96, 56, ${0.18 + (3 - ring) * 0.07})`;
                            ctx.lineWidth = 0.9 + rand() * 1.1;
                            ctx.stroke();
                        }
                    }
                    island(cx + dx * 1.3, cy + dy * 1.3, rMax * 0.26, 0.34,
                        rand() * Math.PI * 2, 2 + Math.floor(rand() * 3));
                    ctx.fillStyle = `rgba(140, 104, 62, 0.15)`;
                    ctx.fill();
                }
            }
        }

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

        this._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        // 21, not 23. This canvas is 4 tiles across by 2 down, so both axes have to satisfy the
        // multiple-of-14 rule (see _buildCheckpointAssets) and 21 is the only nearby value that
        // does it for both: 0.667 x 1.333 units, six by three to a cell. 23 gave 0.609 x 1.217,
        // which is 6.57 x 3.29 and lands a wall face mid-tile everywhere. The 2:1 tile stays 2:1
        // -- this is 600x1200 mineral fibre and the ratio is the whole reason it reads as such.
        const map = this._createWrappedTexture(canvas, 21, 21);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 21, 21);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            // 0.02 put roughly two centimetres of apparent relief on a fissure that is a
            // millimetre deep, which is what turned the surface into gouges.
            bumpScale: 0.005,
            roughness: 0.97,
            metalness: 0.0,
            // The Clinic's fixtures sit flush in this plane and throw their cone downward, so
            // the ceiling was the one surface in the sector receiving almost no light -- near
            // black against walls and floor reading close to white. This is the same bounce
            // cheat `ceilMat` uses on the normal floors.
            //
            // Driven through the map rather than as a flat colour. A flat emissive lifts the
            // water stains exactly as much as the clean board around them, which washes out
            // the whole surface; routing it through the albedo means the stains stay dark and
            // the lift lands where the tile is already pale.
            emissiveMap: map,
            emissive: 0x4e5458,
            shadowSide: THREE.DoubleSide
        });
    }

    /**
     * Builds the Clinic's floor: sterile white tile that has been walked on for years.
     *
     * `clinicMat` stays untouched and continues to serve the Clinic *ceiling* (plus the
     * Boardroom and Impound ceilings). Only the floor gets wear, because floor grime on a
     * ceiling is the giveaway that a texture is being reused where it shouldn't be.
     *
     * The brief here is the opposite of the Atrium's. That floor is dead, matte and dirty.
     * This one is still maintained -- still waxed, still bright, still clinical -- so the wear
     * has to read as *use* rather than neglect: buffer swirls from a rotary polisher, castor
     * tracks from gurneys, grime settled into the grout, and a faint yellowing where the wax
     * has aged. The tile stays white.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Clinic floor material.
     */
    static _buildClinicFloor(masterNoise) {
        const SIZE = 512;
        const TILES = 8;
        const TILE = SIZE / TILES;
        const rand = this._seededRandom(80512377);
        const wrapped = (x, y, reach, fn) => this._wrapDraw(SIZE, x, y, reach, fn);

        const {canvas, ctx} = this._createContext(SIZE, SIZE);

        const {canvas: roughCanvas, ctx: rCtx} = this._createContext(SIZE, SIZE);
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

        this._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(SIZE, SIZE);
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

        // 21, not 20: `R * TILES` has to be a multiple of 14 for a tile edge to land on a cell
        // edge (see _buildCheckpointAssets for the derivation). 20 x 8 gave 0.35 units and
        // 11.43 tiles to a cell; 21 gives a third of a unit, twelve to a cell. Also closer to
        // the 12-inch VCT this is imitating than the old value was.
        const map = this._createWrappedTexture(canvas, 21, 21);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 21, 21);
        const roughnessMap = this._createWrappedTexture(roughCanvas, 21, 21);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.012,
            roughnessMap,
            roughness: 1.0,
            metalness: 0.12
            // No shadowSide override, for the reason spelled out in _buildClinicWall: on a
            // surface that both casts and receives, DoubleSide makes it test against its own
            // depth and band. This floor is white, high-albedo and sits directly under the
            // Clinic's ceiling panels, so it showed the acne at maximum contrast.
        });
    }

    /**
     * Builds the Atrium's vinyl-composition-tile floor: a scuffed, unwaxed mall surface.
     *
     * The Atrium previously borrowed the Clinic's tile, which reads as freshly polished
     * hospital flooring. This is the opposite material -- warm, chalky, speckled, and marked
     * by decades of foot traffic that nobody has buffed out.
     *
     * Everything is laid down in one 512px canvas holding a 4x4 grid of tiles, so adjacent
     * tiles differ in tone and the repeat is hard to read on a large floor plane. All drawing
     * wraps at the canvas edges, because the texture tiles in both axes.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Atrium floor material.
     */
    static _buildAtriumFloor(masterNoise) {
        const SIZE = 512;
        const TILES = 4;
        const TILE = SIZE / TILES;
        const rand = this._seededRandom(20260731);
        const wrapped = (ctx, x, y, reach, fn) => this._wrapDraw(SIZE, x, y, reach, fn);

        const {canvas, ctx} = this._createContext(SIZE, SIZE);

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

        this._ditherCanvas(ctx, SIZE, SIZE, rand, 4);

        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(SIZE, SIZE);
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

        // 14, not 16 -- `R * TILES` must be a multiple of 14; see _buildCheckpointAssets. 16 x 4
        // gave 0.875 units and 4.57 tiles to a cell. 14 gives one unit, four to a cell.
        const map = this._createWrappedTexture(canvas, 14, 14);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 14, 14);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.018,
            roughness: 0.9,
            metalness: 0.0
            // No shadowSide override -- see _buildClinicWall. The Atrium is the worst case for
            // this: ambient 0.0 means the vending spots are the entire lighting budget, and at
            // spotAngle PI/2.15 their shadow camera runs near 167 degrees fov, so texel density
            // on the floor is already as thin as it gets before self-shadowing is added to it.
        });
    }

    static _buildOrganicAssets(masterNoise) {
        const {canvas: moldCanvas, ctx: moldCtx} = this._createContext(256, 256, false);
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
        const {canvas: ceilStainCanvas, ctx: ceilStainCtx} = this._createContext(256, 256, false);
        for (let i = 0; i < 8; i++) {
            const cx = 40 + Math.random() * 176, cy = 40 + Math.random() * 176, r = 10 + Math.random() * 25;
            const grad = ceilStainCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(80, 70, 50, ${0.3 + Math.random() * 0.3})`);
            grad.addColorStop(0.7, 'rgba(90, 80, 60, 0.15)');
            grad.addColorStop(1, 'rgba(60, 50, 40, 0)');
            ceilStainCtx.fillStyle = grad;
            ceilStainCtx.beginPath();
            ceilStainCtx.ellipse(cx, cy, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
            ceilStainCtx.fill();
        }
        const ceilStainTexture = new THREE.CanvasTexture(ceilStainCanvas);
        const ceilingStainMat = new THREE.MeshStandardMaterial({
            map: ceilStainTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.15,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const ceilingStainGeo = new THREE.PlaneGeometry(3, 3);
        ceilingStainGeo.rotateX(Math.PI / 2);
        const {canvas: fabricCanvas, ctx: fCtx} = this._createContext(256, 256);
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
        const fabricTexture = this._createWrappedTexture(fabricCanvas, 4, 4);
        const fabricMat = new THREE.MeshStandardMaterial({
            map: fabricTexture,
            roughness: 0.98,
            bumpMap: fabricTexture,
            bumpScale: 0.05
        });
        const mossTexture = this._createWrappedTexture(fabricCanvas, 32, 32);
        const mossMat = new THREE.MeshStandardMaterial({map: mossTexture, roughness: 1.0});
        const {canvas: cornCanvas, ctx: cornCtx} = this._createContext(256, 256);
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
        const cornTexture = this._createWrappedTexture(cornCanvas, 2, 1);
        const cornMat = new THREE.MeshStandardMaterial({
            map: cornTexture,
            roughness: 1.0,
            bumpMap: cornTexture,
            bumpScale: 0.05
        });
        const {canvas: dirtCanvas, ctx: dirtCtx} = this._createContext(256, 256);
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
        const dirtTexture = this._createWrappedTexture(dirtCanvas, 16, 16);
        const dirtMat = new THREE.MeshStandardMaterial({
            map: dirtTexture,
            roughness: 1.0,
            bumpMap: dirtTexture,
            bumpScale: 0.1
        });
        const {canvas: skyCanvas, ctx: skyCtx} = this._createContext(512, 512);
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
        const skyTexture = this._createWrappedTexture(skyCanvas, 4, 4);
        const nightSkyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            fog: false
        });
        const moldCreepTexture = new THREE.CanvasTexture(this._buildMoldCreep(masterNoise));
        const moldCreepMat = new THREE.MeshStandardMaterial({
            map: moldCreepTexture,
            transparent: true,
            depthWrite: false,
            roughness: 0.95,
            metalness: 0.0,
            // Lifts the quad off the wall face it lies against. Without it the two surfaces are
            // coplanar and the decal flickers in and out with the camera.
            polygonOffset: true,
            polygonOffsetFactor: -2
        });
        // 1.35m wide against a 4m cell, standing 0.62 tall. Earlier this was 2.6 by 1.55, which
        // is a third of a wall and reads as the wall's finish rather than as a blemish; the
        // correction to 1.05 by 0.52 then overshot the other way and left it too small to find
        // in a corridor lit by a torch.
        const moldCreepGeo = new THREE.PlaneGeometry(1.35, 0.62);
        return {moldMat, moldGeo, ceilingStainMat, ceilingStainGeo, fabricMat, mossMat, cornMat, dirtMat, nightSkyMat, moldCreepMat, moldCreepGeo};
    }

    static _buildTechAssets(masterNoise) {
        const {canvas: ventCanvas, ctx: ventCtx} = this._createContext(512, 256);
        ventCtx.fillStyle = '#808080';
        ventCtx.fillRect(0, 0, 512, 256);
        ventCtx.fillStyle = '#9a9a9a';
        ventCtx.fillRect(2, 2, 508, 252);
        ventCtx.fillStyle = '#808080';
        ventCtx.fillRect(6, 6, 500, 244);
        const slotColor = '#151515', slotWidth = 480, slotX = 16, slotY = 16, slotHeight = 224;
        ventCtx.fillStyle = '#9a9a9a';
        ventCtx.fillRect(slotX, slotY, slotWidth, slotHeight);
        for (let ix = 0; ix < 30; ix++) {
            for (let iy = 0; iy < 14; iy++) {
                let hX = slotX + 4 + (ix * 16);
                let hY = slotY + 4 + (iy * 16);
                ventCtx.fillStyle = '#c0c0c0';
                ventCtx.fillRect(hX, hY + 12, 12, 2);
                ventCtx.fillRect(hX + 12, hY, 2, 14);
                ventCtx.fillStyle = '#505050';
                ventCtx.fillRect(hX - 2, hY - 2, 14, 2);
                ventCtx.fillRect(hX - 2, hY - 2, 2, 14);
                ventCtx.fillStyle = slotColor;
                ventCtx.fillRect(hX, hY, 12, 12);
            }
        }
        ventCtx.fillStyle = '#c0c0c0';
        ventCtx.beginPath();
        ventCtx.arc(8, 128, 4, 0, Math.PI * 2);
        ventCtx.fill();
        ventCtx.beginPath();
        ventCtx.arc(504, 128, 4, 0, Math.PI * 2);
        ventCtx.fill();
        ventCtx.globalAlpha = 0.7;
        ventCtx.drawImage(masterNoise, 0, 0, 512, 256);
        ventCtx.globalAlpha = 1.0;
        const ventTexture = this._createWrappedTexture(ventCanvas, 1, 1);
        const ventMat = new THREE.MeshStandardMaterial({
            map: ventTexture,
            roughness: 0.7,
            metalness: 0.15,
            bumpMap: ventTexture,
            bumpScale: 0.02
        });
        const {canvas: ductCanvas, ctx: ductCtx} = this._createContext(256, 256);
        ductCtx.fillStyle = '#505456';
        ductCtx.fillRect(0, 0, 256, 256);
        ductCtx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
            ductCtx.strokeStyle = '#3a3e40';
            ductCtx.beginPath();
            ductCtx.moveTo(0, y);
            ductCtx.lineTo(256, y);
            ductCtx.stroke();
            ductCtx.strokeStyle = '#6a6e70';
            ductCtx.beginPath();
            ductCtx.moveTo(0, y + 2);
            ductCtx.lineTo(256, y + 2);
            ductCtx.stroke();
        }
        ductCtx.globalAlpha = 0.35;
        ductCtx.drawImage(masterNoise, 0, 0, 256, 256);
        ductCtx.globalAlpha = 1.0;
        const ductTexture = this._createWrappedTexture(ductCanvas, 2, 2);
        const ductMat = new THREE.MeshStandardMaterial({
            map: ductTexture,
            roughness: 0.55,
            metalness: 0.75,
            bumpMap: ductTexture,
            bumpScale: 0.01
        });
        const {canvas: serverCanvas, ctx: serverCtx} = this._createContext(256, 512);
        serverCtx.fillStyle = '#c4c1b5';
        serverCtx.fillRect(0, 0, 256, 512);
        serverCtx.fillStyle = '#000000';
        for (let i = 16; i < 500; i += 64) {
            serverCtx.fillRect(16, i, 224, 4);
            if (Math.random() > 0.3) {
                serverCtx.fillStyle = '#111111';
                serverCtx.fillRect(160, i + 12, 60, 20);
                const colors = ['#00ff00', '#ffaa00', '#ff3300'];
                serverCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                serverCtx.fillRect(166, i + 16, 8, 8);
                serverCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                serverCtx.fillRect(182, i + 16, 8, 8);
                serverCtx.fillStyle = '#000000';
            }
        }
        serverCtx.strokeStyle = '#8c887d';
        serverCtx.lineWidth = 4;
        serverCtx.strokeRect(0, 0, 256, 512);
        const serverTexture = this._createWrappedTexture(serverCanvas, 4, 1);
        const serverMat = new THREE.MeshStandardMaterial({map: serverTexture, roughness: 0.3, metalness: 0.8});
        const {canvas: lightCanvas, ctx: lightCtx} = this._createContext(128, 256);
        lightCtx.fillStyle = '#ffffe0';
        lightCtx.fillRect(0, 0, 128, 256);
        lightCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        lightCtx.lineWidth = 1;
        lightCtx.beginPath();
        for (let i = -256; i < 256; i += 8) {
            lightCtx.moveTo(0, i);
            lightCtx.lineTo(128, i + 128);
            lightCtx.moveTo(128, i);
            lightCtx.lineTo(0, i + 128);
        }
        lightCtx.stroke();
        lightCtx.strokeStyle = '#1a1a1a';
        lightCtx.lineWidth = 8;
        lightCtx.strokeRect(0, 0, 128, 256);
        lightCtx.strokeStyle = '#4a4a4a';
        lightCtx.lineWidth = 4;
        lightCtx.strokeRect(4, 4, 120, 248);
        const lightTexture = new THREE.CanvasTexture(lightCanvas);
        const baseLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.1
        });
        const baseBrokenLightMat = new THREE.MeshStandardMaterial({
            map: lightTexture,
            emissiveMap: lightTexture,
            color: 0x8c9296,
            emissive: 0x1a1f24,
            emissiveIntensity: 1.0,
            roughness: 0.8
        });
        const baseHousingMat = new THREE.MeshStandardMaterial({color: 0x1a1a1a, roughness: 0.9});
        const matteLightMat = baseLightMat.clone();
        matteLightMat.metalness = 0;
        matteLightMat.roughness = 0.95;
        const matteBrokenLightMat = baseBrokenLightMat.clone();
        matteBrokenLightMat.metalness = 0;
        matteBrokenLightMat.roughness = 0.95;
        return {
            ventMat,
            ductMat,
            serverMat,
            baseLightMat,
            baseBrokenLightMat,
            baseHousingMat,
            matteLightMat,
            matteBrokenLightMat
        };
    }

    static _buildHazardAndMiscAssets(masterNoise) {
        const {canvas: fenceCanvas, ctx: fenceCtx} = this._createContext(64, 64, false);
        fenceCtx.strokeStyle = '#99aab5';
        fenceCtx.lineWidth = 4;
        fenceCtx.beginPath();
        fenceCtx.moveTo(32, 0);
        fenceCtx.lineTo(64, 32);
        fenceCtx.lineTo(32, 64);
        fenceCtx.lineTo(0, 32);
        fenceCtx.closePath();
        fenceCtx.stroke();
        fenceCtx.globalCompositeOperation = 'source-atop';
        fenceCtx.globalAlpha = 0.6;
        fenceCtx.drawImage(masterNoise, 0, 0, 64, 64);
        fenceCtx.globalCompositeOperation = 'source-over';
        fenceCtx.globalAlpha = 1.0;
        const fenceTex = this._createWrappedTexture(fenceCanvas, 12, 12);
        const fenceMat = new THREE.MeshStandardMaterial({
            map: fenceTex,
            roughness: 0.4,
            metalness: 0.9,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        const hazardBumpTexture = this._createWrappedTexture(masterNoise, 2, 2);
        const hazardMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            bumpMap: hazardBumpTexture,
            bumpScale: 0.05,
            roughness: 0.8,
            metalness: 0.2
        });
        const {canvas: glowCanvas, ctx: glowCtx} = this._createContext(256, 256, false);
        const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
        glowGrad.addColorStop(0, 'rgba(255, 255, 220, 0.15)');
        glowGrad.addColorStop(0.15, 'rgba(255, 255, 220, 0.04)');
        glowGrad.addColorStop(0.4, 'rgba(255, 255, 220, 0.01)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 220, 0)');
        glowCtx.fillStyle = glowGrad;
        glowCtx.fillRect(0, 0, 256, 256);
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowMat = new THREE.MeshBasicMaterial({
            map: glowTexture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            polygonOffset: true,
            polygonOffsetFactor: -2
        });
        const flareMat = new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glowGeo = new THREE.PlaneGeometry(3.8, 3.8);
        glowGeo.rotateX(-Math.PI / 2);
        const {canvas: tagCanvas, ctx: tagCtx} = this._createContext(128, 128, false);
        tagCtx.strokeStyle = '#ff0055';
        tagCtx.lineWidth = 12;
        tagCtx.lineCap = 'round';
        tagCtx.shadowColor = '#ff0055';
        tagCtx.shadowBlur = 15;
        tagCtx.beginPath();
        tagCtx.moveTo(32, 32);
        tagCtx.lineTo(96, 96);
        tagCtx.moveTo(96, 32);
        tagCtx.lineTo(32, 96);
        tagCtx.stroke();
        tagCtx.lineWidth = 4;
        tagCtx.shadowBlur = 5;
        tagCtx.beginPath();
        tagCtx.moveTo(45, 75);
        tagCtx.lineTo(45, 110);
        tagCtx.moveTo(85, 80);
        tagCtx.lineTo(85, 100);
        tagCtx.stroke();
        const tagTexture = new THREE.CanvasTexture(tagCanvas);
        const tagMat = new THREE.MeshBasicMaterial({
            map: tagTexture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        const tagGeo = new THREE.PlaneGeometry(0.5, 0.5);
        const voidTexture = this._createWrappedTexture(masterNoise);
        const voidMat = new THREE.MeshStandardMaterial({
            color: 0x020202,
            roughness: 0.4,
            metalness: 0.8,
            bumpMap: voidTexture,
            bumpScale: 0.08
        });
        const rustMat = new THREE.MeshStandardMaterial({color: 0x3a1c14, roughness: 1.0, metalness: 0.3});
        const metalMat = new THREE.MeshStandardMaterial({color: 0x999999, roughness: 0.35, metalness: 0.95});
        const {canvas: pittedCanvas, ctx: pittedCtx} = this._createContext(256, 256);
        pittedCtx.fillStyle = '#6e6d68';
        pittedCtx.fillRect(0, 0, 256, 256);
        pittedCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        pittedCtx.lineWidth = 1;
        for (let i = 0; i < 256; i += 3) {
            pittedCtx.beginPath();
            pittedCtx.moveTo(0, i + (Math.random() * 1.5 - 0.75));
            pittedCtx.lineTo(256, i + (Math.random() * 1.5 - 0.75));
            pittedCtx.stroke();
        }
        for (let i = 0; i < 260; i++) {
            const px = Math.random() * 256;
            const py = Math.random() * 256;
            const pr = Math.random() * 2.2 + 0.4;
            const pitGrad = pittedCtx.createRadialGradient(px, py, 0, px, py, pr);
            pitGrad.addColorStop(0, 'rgba(10,10,8,0.6)');
            pitGrad.addColorStop(0.7, 'rgba(10,10,8,0.25)');
            pitGrad.addColorStop(1, 'rgba(10,10,8,0)');
            pittedCtx.fillStyle = pitGrad;
            pittedCtx.beginPath();
            pittedCtx.arc(px, py, pr, 0, Math.PI * 2);
            pittedCtx.fill();
            pittedCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
            pittedCtx.beginPath();
            pittedCtx.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.4, 0, Math.PI * 2);
            pittedCtx.fill();
        }
        for (let i = 0; i < 14; i++) {
            const px = Math.random() * 256;
            const py = Math.random() * 256;
            const pr = Math.random() * 9 + 4;
            const rustGrad = pittedCtx.createRadialGradient(px, py, 0, px, py, pr);
            rustGrad.addColorStop(0, 'rgba(110,58,28,0.16)');
            rustGrad.addColorStop(1, 'rgba(110,58,28,0)');
            pittedCtx.fillStyle = rustGrad;
            pittedCtx.beginPath();
            pittedCtx.arc(px, py, pr, 0, Math.PI * 2);
            pittedCtx.fill();
        }
        pittedCtx.globalAlpha = 0.3;
        pittedCtx.drawImage(masterNoise, 0, 0, 256, 256);
        pittedCtx.globalAlpha = 1.0;
        const pittedMetalTexture = this._createWrappedTexture(pittedCanvas, 2, 2);
        const pittedMetalMat = new THREE.MeshStandardMaterial({
            map: pittedMetalTexture,
            color: 0xffffff,
            bumpMap: pittedMetalTexture,
            bumpScale: 0.025,
            roughness: 0.55,
            metalness: 0.75
        });
        const {canvas: almondCanvas, ctx: aCtx} = this._createContext(256, 256);
        aCtx.fillStyle = '#e8ddcb';
        aCtx.fillRect(0, 0, 256, 256);
        aCtx.fillStyle = '#3a5a68';
        aCtx.fillRect(0, 70, 256, 116);
        aCtx.fillStyle = '#e8ddcb';
        aCtx.font = 'bold 36px monospace';
        aCtx.textAlign = 'center';
        aCtx.fillText('ALMOND', 128, 115);
        aCtx.fillText('WATER', 128, 155);
        aCtx.globalAlpha = 0.2;
        aCtx.drawImage(masterNoise, 0, 0, 256, 256);
        aCtx.globalAlpha = 1.0;
        const almondTexture = new THREE.CanvasTexture(almondCanvas);
        const almondMat = new THREE.MeshStandardMaterial({map: almondTexture, roughness: 0.8});
        const {canvas: tiCanvas, ctx: tiCtx} = this._createContext(256, 512);
        const tiGrad = tiCtx.createLinearGradient(0, 0, 0, 512);
        tiGrad.addColorStop(0, '#c0c8d0');
        tiGrad.addColorStop(1, '#808a94');
        tiCtx.fillStyle = tiGrad;
        tiCtx.fillRect(0, 0, 256, 512);
        tiCtx.lineWidth = 1;
        for (let y = 0; y < 512; y += 2) {
            tiCtx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
            tiCtx.beginPath();
            tiCtx.moveTo(0, y);
            tiCtx.lineTo(256, y);
            tiCtx.stroke();
            tiCtx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
            tiCtx.beginPath();
            tiCtx.moveTo(0, y + 1);
            tiCtx.lineTo(256, y + 1);
            tiCtx.stroke();
        }
        tiCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        tiCtx.beginPath();
        tiCtx.moveTo(128, 150);
        tiCtx.lineTo(200, 270);
        tiCtx.lineTo(56, 270);
        tiCtx.closePath();
        tiCtx.fill();
        tiCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        tiCtx.fillRect(0, 300, 256, 20);
        tiCtx.globalAlpha = 0.3;
        tiCtx.globalCompositeOperation = 'multiply';
        tiCtx.drawImage(masterNoise, 0, 0, 256, 512);
        tiCtx.globalAlpha = 1.0;
        tiCtx.globalCompositeOperation = 'source-over';
        const tiTex = this._createWrappedTexture(tiCanvas, 1, 1);
        const titaniumMat = new THREE.MeshStandardMaterial({
            map: tiTex,
            roughness: 0.35,
            metalness: 0.4,
            bumpMap: tiTex,
            bumpScale: 0.005
        });
        return {
            fenceMat,
            hazardMat,
            glowMat,
            flareMat,
            glowGeo,
            tagMat,
            tagGeo,
            voidMat,
            rustMat,
            metalMat,
            pittedMetalMat,
            almondMat,
            titaniumMat,
            pipeMat: this._buildPipeMaterial(masterNoise),
            corrosionBumpTexture: this._buildCorrosionBump()
        };
    }

    /**
     * Builds the yellow wallpaper: printed stripe over lining paper, eaten from the floor up by
     * rising damp.
     *
     * The stains were 150 flat-alpha discs scattered along the bottom edge. Overlapping discs
     * of constant opacity can only ever produce a soft symmetrical cloud, which is why they
     * read as airbrush rather than as water, and the specific thing they were missing is the
     * one feature that identifies rising damp on sight.
     *
     * Groundwater climbs the substrate by capillary action until the rate of rise matches the
     * rate of evaporation off the face, so it stops at a fairly consistent height and leaves a
     * boundary there. Dissolved salts cannot evaporate with the water, so they precipitate at
     * exactly that boundary and concentrate into a **tide mark** -- a dark, comparatively sharp
     * band with a paler, drier zone immediately beneath it. Read from the bottom up the wall
     * runs dark, then lighter, then abruptly dark again at the line, then clean. That
     * non-monotonic profile is the signature, and no stack of discs will produce it.
     *
     * Everything else follows from the same mechanism. Paper seams wick faster than the field,
     * so the tide climbs at each one. Salts bloom pale just below the line as efflorescence.
     * Mould colonises the wet zone with a density that rises toward the floor. The adhesive
     * fails where it has been wet longest, so the paper blisters low down and nowhere else.
     *
     * Relief ships separately for a reason specific to this asset: `sharedWallMat` was using the
     * colour map as its own bump, which embossed every stain. A stain is discolouration, not
     * topography -- damp paper is if anything flatter than dry. The only relief the damp
     * genuinely creates is the blistering, which is why that is the one part of this that draws
     * to the bump canvas and not the colour one.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {{canvas: HTMLCanvasElement, bumpCanvas: HTMLCanvasElement}} Colour and relief.
     */
    static _buildWallpaper(masterNoise) {
        const W = 512, H = 512;
        const rand = this._seededRandom(70431182);
        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);

        ctx.fillStyle = '#d4c382';
        ctx.fillRect(0, 0, W, H);
        bCtx.fillStyle = '#8c8c8c';
        bCtx.fillRect(0, 0, W, H);

        // The stripe is printed and very slightly raised, so it belongs on both canvases.
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

        this._ditherCanvas(ctx, W, H, rand, 4);
        this._ditherCanvas(bCtx, W, H, rand, 3);
        return {canvas, bumpCanvas};
    }

    /**
     * Builds a creep of mould emerging from under the skirting.
     *
     * This started life as a full rising-damp patch: a tide line running the width of the decal
     * with a salt band, efflorescence and blistering under it. All of that was accurate and all
     * of it was wrong for the job. A tide line is a horizontal feature spanning whatever it is
     * drawn on, so at decal scale it terminates at two vertical edges and reads as a chart --
     * and rendered in near-black against yellow paper it was the loudest thing in the corridor.
     *
     * Mould is not a front, it is a colony. It starts at a point where moisture gets in, which
     * on a papered wall is the gap behind the skirting, and it climbs in filaments that each
     * stop at their own height. That is what gives it a beginning and an end: the shape tapers
     * because the organism runs out of reach, not because the texture ran out of pixels.
     *
     * So the structure is a handful of colonies along the bottom edge, each throwing a few
     * hundred filaments upward on a damped random walk. Each filament carries its own ceiling
     * drawn from a biased roll, so most stay low and a few reach -- fingers rather than a face.
     * Deposits are laid at very low alpha and allowed to accumulate where filaments overlap,
     * which puts the density at the base without anything having to draw a gradient there.
     *
     * The colour is a desaturated brown-grey rather than black. Black mould on yellow paper is a
     * value contrast the eye goes to before anything else in the room, and this is meant to be
     * something the player notices second.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {HTMLCanvasElement} An RGBA canvas, mostly transparent.
     */
    static _buildMoldCreep(masterNoise) {
        const W = 256, H = 128;
        const rand = this._seededRandom(31775902);
        const {canvas, ctx} = this._createContext(W, H, false);

        const colonies = 3 + Math.floor(rand() * 3);
        const seats = [];
        for (let c = 0; c < colonies; c++) {
            // Kept off the extreme edges so a colony is never cut in half by the decal bounds.
            const cx = 0.14 * W + rand() * 0.72 * W;
            // Wider than it is tall, and deliberately so. At 244px per metre these are colonies
            // 15-35cm across reaching 6-22cm up. The first pass had them narrower than their
            // height, which produces vertical plumes -- the silhouette of smoke, not of
            // something spreading sideways along the base of a wall.
            const reach = 16 + rand() * 38;
            const spread = 30 + rand() * 55;
            const filaments = 150 + Math.floor(rand() * 170);
            seats.push({cx, spread});

            // The seat of the colony, where it comes out from behind the board.
            // Lighter than it was. The seat is the densest thing on the decal and it sits on the
            // bottom edge, so any excess reads as a hard dark bar along the skirting line rather
            // than as growth.
            const seat = ctx.createRadialGradient(cx, H, 0, cx, H, spread);
            seat.addColorStop(0, 'rgba(70,62,45,0.24)');
            seat.addColorStop(0.55, 'rgba(70,62,45,0.10)');
            seat.addColorStop(1, 'rgba(70,62,45,0)');
            ctx.save();
            ctx.translate(cx, H);
            // Squashed vertically: the seat is a smear along the skirting, not a hemisphere.
            ctx.scale(1, 0.42);
            ctx.fillStyle = seat;
            ctx.beginPath();
            ctx.arc(0, 0, spread, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            for (let f = 0; f < filaments; f++) {
                // Exponent biases most filaments short. An even spread of ceilings gives a
                // rounded dome, which is just a tide line with a curve in it.
                const top = H - reach * Math.pow(rand(), 1.7);
                let x = cx + (rand() - 0.5) * spread;
                let y = H;
                let drift = (rand() - 0.5) * 0.5;
                while (y > top) {
                    const climbed = (H - y) / Math.max(1, H - top);
                    ctx.fillStyle = `rgba(74,66,48,${(0.05 * (1 - climbed) + 0.012).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 1.6 * (1 - climbed * 0.6) + 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    // Damped walk: undamped, the filaments fan out into a bush; fully damped
                    // they are straight lines. This wanders and recovers.
                    drift = (drift + (rand() - 0.5) * 0.35) * 0.86;
                    x += drift;
                    y -= 0.7 + rand() * 1.1;
                }
            }
        }

        // Outlying spores, drawn around the colonies rather than across the whole canvas. Spread
        // uniformly they read as dirt on the lens: specks in clean paper with nothing to belong
        // to. Anchored to a seat they read as the colony spreading.
        for (let i = 0; i < 1100; i++) {
            const seat = seats[Math.floor(rand() * seats.length)];
            const x = seat.cx + (rand() - 0.5) * seat.spread * 2.6;
            const y = H - Math.pow(rand(), 2.4) * H * 0.6;
            ctx.fillStyle = `rgba(58,52,38,${(0.04 + rand() * 0.11).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(x, y, 0.4 + rand() * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Feather the vertical edges. The colonies already taper, but the speckle above does not
        // know about them and would otherwise stop dead at x=0.
        const img = ctx.getImageData(0, 0, W, H);
        const px = img.data;
        const FEATHER = 30;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let k = 1;
                if (x < FEATHER) k = x / FEATHER;
                else if (x > W - FEATHER) k = (W - x) / FEATHER;
                if (k < 1) px[((y * W) + x) * 4 + 3] *= k * k;
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas;
    }

    /**
     * Builds the joinery timber: three sawn boards to a tile, stained and waxed.
     *
     * The previous version was a flat fill under 250 random beziers, stroked as a single path
     * in a single colour off `Math.random`. It failed for one specific reason: wood does not
     * read as lines drawn on a surface, it reads as *banding*. Growth rings alternate soft pale
     * earlywood against hard dark latewood, and that tonal alternation is what the eye
     * recognises from across a room. Scribbles over a constant background have no bands in them
     * at any distance, which is why it looked like crayon on card.
     *
     * Three boards rather than one sheet. The Archive shelf back is 4m wide and takes exactly
     * one tile, so a single continuous grain field reads there as one photograph stretched
     * across a wall. A seam every 1.3m is what makes it carpentry.
     *
     * Ring spacing drives everything downstream. A narrow ring is a slow growth year, which
     * means proportionally more latewood, which means a darker and harder band -- so both the
     * darkness and the relief of a line are derived from its spacing rather than rolled
     * independently, and the bands clump the way real stock does.
     *
     * The wobble is a sum of sines at whole-number cycle counts over the canvas height, which
     * is what lets a grain line leave the bottom edge at exactly the x it entered the top at.
     * Amplitude rises near each board's pith, so a board sawn near the log centre arches into
     * cathedral figure while one sawn off the flank comes out nearly quartersawn and straight.
     * Once the pith is a per-board number, the variation between boards is free.
     *
     * Relief ships as its own canvas, per the rule the ceilings already follow. Driving bump
     * from this colour map would put the pores at the same depth as the stain pooling, which is
     * a property of the finish and is not physically there at all.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {{canvas: HTMLCanvasElement, bumpCanvas: HTMLCanvasElement}} Colour and relief.
     */
    static _buildWood(masterNoise) {
        const W = 512, H = 1024;
        const rand = this._seededRandom(48120773);
        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);

        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, W, H);

        const BOARDS = 3;
        const edges = [];
        for (let i = 0; i <= BOARDS; i++) edges.push(Math.round(i * W / BOARDS));

        // Anything drawn near a vertical edge is drawn again one canvas width away, so a grain
        // line that wanders across the seam exists on both sides of it.
        const wrapX = (x, reach, fn) => {
            fn(x);
            if (x < reach) fn(x + W);
            else if (x > W - reach) fn(x - W);
        };

        for (let b = 0; b < BOARDS; b++) {
            const left = edges[b], right = edges[b + 1];
            const span = right - left;

            // Per-board stain. Boards come off different logs and take finish differently; one
            // fill across the whole tile was most of what made the old texture read as paper.
            //
            // Lightness was 21-29%, which is a true walnut albedo of about (0.28, 0.20, 0.14).
            // That value cannot survive this engine's fill light. Ambient is a HemisphereLight
            // whose ground colour is 0x3d3520, so a downward-facing board resolves to
            // 0.28 x 0.24 x 0.65 ambient = RGB (11, 7, 3) and a vertical one to RGB (29, 19, 10).
            // Every grain layer below is drawn at low alpha over this fill, so the figure was
            // being multiplied into black along with it.
            //
            // 30-39% keeps the hue and saturation untouched -- this is still walnut, not pine.
            // Measured against the real hemisphere terms, a vertical face goes from RGB (30,20,9)
            // to (43,28,13) and an upward one from (49,32,16) to (70,46,23), rising to (56,36,17)
            // and (90,60,30) on the lightest board. A downward face only moves from (12,7,3) to
            // (17,10,4): the ground colour is the binding constraint there, not the albedo, and no
            // value change to this fill will rescue a surface that faces the floor.
            //
            // The rand() call count is unchanged, so the seeded grain pattern is bit-identical to
            // before. Only its value moves.
            ctx.fillStyle = `hsl(${22 + rand() * 10}, ${34 + rand() * 12}%, ${30 + rand() * 9}%)`;
            ctx.fillRect(left, 0, span, H);

            // Often outside the board entirely, which is the common case for sawn stock and
            // gives straight grain. Occasionally inside, which gives the arches.
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
                // Exponent biases the roll toward narrow rings, leaving the occasional wide
                // fast-growth year as a pale gap between clusters.
                const ring = 3.5 + Math.pow(rand(), 1.7) * 17;
                x += ring;
                if (x >= right) break;
                const tight = 1 - Math.min(1, ring / 20);
                const width = 0.9 + tight * 2.4;
                grain(ctx, x, width, `rgba(46,26,11,${(0.16 + tight * 0.30).toFixed(3)})`);
                grain(bCtx, x, width, `rgba(70,70,70,${(0.20 + tight * 0.32).toFixed(3)})`);
                if (ring > 12) {
                    // Pale earlywood trailing a wide ring. This is the half that turns a line
                    // into a band.
                    grain(ctx, x + ring * 0.32, ring * 0.30, 'rgba(190,150,100,0.05)');
                }
            }

            // Open pores, lying along the grain. These carry the surface at arm's length, where
            // the ring bands are too coarse to be doing anything.
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

            // Medullary rays, on whichever boards came off the quarter. Pale flecks running
            // across the grain rather than along it, and the reason this reads as oak.
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

        // Stain pooling. The only layer here about the coating rather than the timber, which is
        // exactly why it never touches the bump canvas.
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

        // Board seams: the shadow gap between two edges, with the arris beside it catching what
        // little light the Archive has.
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
        this._ditherCanvas(ctx, W, H, rand, 4);
        this._ditherCanvas(bCtx, W, H, rand, 3);
        return {canvas, bumpCanvas};
    }

    /**
     * Builds the panelled door face: two stiles, three rails, two recessed panels.
     *
     * The face used to be one draw of the wood tile with dark rectangles painted over it, which
     * broke twice. The grain ran unbroken across the whole leaf, and the panel edges were
     * painted light on the top and left -- a highlight, applied to what is physically a recess.
     *
     * A panelled door is not a board with shapes cut into it. It is frame-and-panel: two
     * full-height stiles, three rails tenoned between them, and two panels floating in the
     * grooves. Seven separate pieces of timber, and the grain in each runs along its own length.
     * That means the rails run *horizontal* grain, which is the single strongest cue that the
     * frame is assembled rather than printed, and no amount of relief substitutes for it -- if
     * the grain flows straight through a joint the eye reads one flat surface no matter how the
     * edges are shaded.
     *
     * Relief goes in the bump canvas, and the colour map carries no directional shading at all.
     * `_buildPipeMaterial` already sets this rule for the same reason: a painted highlight is
     * baked for one light position, and this game's dominant light source is a torch the player
     * carries. Paint the chamfer bright on its upper edge and it stays bright while the player
     * lights it from below. The colour map gets only what is physically colour -- ambient
     * occlusion pooling in the recess, which is directionless, and dirt at boot height.
     *
     * The AO is applied to all four sides of each panel equally. That is what distinguishes a
     * recess from a boss once the directional lighting is left to the renderer.
     *
     * @param {HTMLCanvasElement} woodCanvas - Colour source, grain running down the canvas.
     * @param {HTMLCanvasElement} woodBumpCanvas - Matching relief source.
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {{canvas: HTMLCanvasElement, bumpCanvas: HTMLCanvasElement}} Colour and relief.
     */
    static _buildDoor(woodCanvas, woodBumpCanvas, masterNoise) {
        const W = 256, H = 512;
        const rand = this._seededRandom(20514477);
        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);

        // Stiles run the full height and the rails tenon between them, which is why the stiles
        // are listed first and span 0..H while every rail stops at their inner faces.
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

        // Clips to the member, rotates a quarter turn for rails so the grain lies along their
        // length, and tiles the source so an arbitrary sample offset still covers the rect. The
        // offset is what stops two members cut from the same tile showing the same figure.
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

        // Ambient occlusion in the recesses. Equal on all four sides: a recess gathers shadow
        // everywhere its walls face each other, and any asymmetry here would be the baked
        // directional lighting this is specifically avoiding.
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

        // Relief mask, multiplied over the grain so the panels drop without flattening the
        // figure inside them. The blur is the chamfer: a hard step would read as a decal edge
        // under a moving light, and it rounds the corners for free.
        const {canvas: maskCanvas, ctx: mCtx} = this._createContext(W, H);
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

        // Dirt at boot height, and the handle. The knob is proud on the bump canvas rather than
        // shaded on the colour one, for the same reason as everything else here.
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
        this._ditherCanvas(ctx, W, H, rand, 4);
        return {canvas, bumpCanvas};
    }

    /**
     * Builds the overworld standpipe: institutional enamel over steel, chipped at the couplings
     * with rust bleeding down from them.
     *
     * The pipes were running `rustMat`, whose bump map is `structMat.map` -- the structural
     * concrete texture, dark horizontal bands and all. Wrapped round a cylinder at bumpScale
     * 0.03 those bands read as stacked concrete rings, which is why a 12cm steel riser looked
     * like a culvert section.
     *
     * Cylinder UVs put u around the circumference and v along the axis, so the canvas is
     * 256 wide by 512 tall representing about a metre and a half of pipe, tiled twice up a 3m
     * run. Coupling collars sit on the canvas edges, which lands them at floor, mid and
     * ceiling. Nothing here is baked with directional shading -- eight radial segments with
     * smooth normals already carry the roundness, and a painted-in highlight would fight it.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The standpipe material.
     */
    static _buildPipeMaterial(masterNoise) {
        const W = 256, H = 512;
        const rand = this._seededRandom(77410233);
        const wrapY = (y, reach, fn) => {
            const oy = y < reach ? H : (y > H - reach ? -H : 0);
            fn(y);
            if (oy) fn(y + oy);
        };

        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);
        bCtx.fillStyle = '#9c9c9c';
        bCtx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgb(156, 162, 150)';
        ctx.fillRect(0, 0, W, H);

        // Roller texture. Enamel on a riser goes on lengthwise, so the streaking runs with the
        // axis -- vertical here. This is the grain the concrete map never had and the single
        // biggest reason these read as pipe rather than post.
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

        // The longitudinal weld seam: one line up the whole run, very slightly proud.
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

        // Coupling collars, on the wrap so they land as complete rings.
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

        // Chipped enamel, clustered at the collars where a wrench has been. The exposed steel
        // underneath is cooler and lighter than the paint over it.
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

        // Rust bleed. Water finds the break in the paint and carries oxide down the pipe, so
        // every streak starts at a chip and runs one way only.
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

        // Grime settles toward the floor end of the run.
        const dirt = ctx.createLinearGradient(0, H, 0, H * 0.55);
        dirt.addColorStop(0, 'rgba(52, 50, 42, 0.20)');
        dirt.addColorStop(1, 'rgba(52, 50, 42, 0)');
        ctx.fillStyle = dirt;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 0.07;
        ctx.drawImage(masterNoise, 0, 0, W, H);
        ctx.globalAlpha = 1.0;
        this._ditherCanvas(ctx, W, H, rand, 6);

        const map = this._createWrappedTexture(canvas, 1, 2);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 1, 2);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.004,
            roughness: 0.45,
            // Near zero on purpose. There is no envMap in this scene, so the metallic
            // fraction of a MeshStandardMaterial has nothing to reflect -- raising metalness
            // only subtracts diffuse and hands back nothing, which is what turned these into
            // black silhouettes under the hemisphere light. Enamel is dielectric anyway; the
            // metal read comes from roughness and the texture, not from this channel.
            metalness: 0.05
        });
    }

    /**
     * Builds a generic corrosion relief for `rustMat`.
     *
     * `rustMat` skins drums, cable loops, skids, 80-unit Chasm pillars and Incinerator walls,
     * so this has to stay non-directional -- pitting and scale, no grain and no bands. Bands
     * are what made the old `structMat.map` read as poured concrete on everything it touched.
     *
     * @returns {THREE.Texture} A tiling bump map of pitted, scaled metal.
     */
    static _buildCorrosionBump() {
        const S = 512;
        const rand = this._seededRandom(90218844);
        const {canvas, ctx} = this._createContext(S, S);
        const wrap = (x, y, reach, fn) => this._wrapDraw(S, x, y, reach, fn);

        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(0, 0, S, S);

        // Scale plates: broad, soft, lifting areas of oxide.
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

        // Pitting: the fine detail that actually reads as corroded metal at arm's length.
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

        this._ditherCanvas(ctx, S, S, rand, 5);
        return this._createWrappedTexture(canvas, 2, 2);
    }

    static _buildAnnexAssets(masterNoise) {
        const {canvas: steelCanvas, ctx: steelCtx} = this._createContext(256, 512);
        const steelGrad = steelCtx.createLinearGradient(0, 0, 0, 512);
        steelGrad.addColorStop(0, '#787f85');
        steelGrad.addColorStop(1, '#484d52');
        steelCtx.fillStyle = steelGrad;
        steelCtx.fillRect(0, 0, 256, 512);
        steelCtx.lineWidth = 1;
        for (let y = 0; y < 512; y += 3 + Math.floor(Math.random() * 3)) {
            steelCtx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`;
            steelCtx.beginPath();
            steelCtx.moveTo(0, y);
            steelCtx.lineTo(256, y);
            steelCtx.stroke();
        }
        steelCtx.globalAlpha = 0.22;
        steelCtx.drawImage(masterNoise, 0, 0, 256, 512);
        steelCtx.globalAlpha = 1.0;
        const steelTexture = new THREE.CanvasTexture(steelCanvas);
        const annexEdgeMat = new THREE.MeshStandardMaterial({map: steelTexture, roughness: 0.5, metalness: 0.7});
        const {canvas: doorCanvas, ctx: doorCtx} = this._createContext(256, 512);
        doorCtx.drawImage(steelCanvas, 0, 0);
        doorCtx.strokeStyle = 'rgba(0,0,0,0.35)';
        doorCtx.lineWidth = 5;
        doorCtx.strokeRect(14, 14, 228, 484);
        doorCtx.strokeStyle = 'rgba(255,255,255,0.06)';
        doorCtx.lineWidth = 1;
        doorCtx.strokeRect(17, 17, 222, 478);
        doorCtx.fillStyle = '#182a2e';
        doorCtx.fillRect(78, 70, 100, 110);
        doorCtx.strokeStyle = '#9aa0a4';
        doorCtx.lineWidth = 6;
        doorCtx.strokeRect(78, 70, 100, 110);
        doorCtx.strokeStyle = 'rgba(160,170,175,0.35)';
        doorCtx.lineWidth = 1;
        for (let wx = 91; wx < 178; wx += 13) {
            doorCtx.beginPath();
            doorCtx.moveTo(wx, 70);
            doorCtx.lineTo(wx, 180);
            doorCtx.stroke();
        }
        for (let wy = 83; wy < 180; wy += 13) {
            doorCtx.beginPath();
            doorCtx.moveTo(78, wy);
            doorCtx.lineTo(178, wy);
            doorCtx.stroke();
        }
        doorCtx.fillStyle = 'rgba(20,20,20,0.6)';
        [[22, 22], [234, 22], [22, 490], [234, 490]].forEach(([rx, ry]) => {
            doorCtx.beginPath();
            doorCtx.arc(rx, ry, 4, 0, Math.PI * 2);
            doorCtx.fill();
        });
        doorCtx.fillStyle = 'rgba(0,0,0,0.25)';
        doorCtx.fillRect(14, 330, 228, 8);
        doorCtx.fillStyle = 'rgba(30,30,30,0.55)';
        doorCtx.font = 'bold 24px monospace';
        doorCtx.textAlign = 'center';
        doorCtx.fillText('STAFF ONLY', 128, 385);
        doorCtx.font = 'bold 13px monospace';
        doorCtx.fillStyle = 'rgba(0,0,0,0.3)';
        doorCtx.fillText('SUB-LEVEL B', 128, 405);
        doorCtx.save();
        doorCtx.beginPath();
        doorCtx.rect(14, 420, 228, 14);
        doorCtx.clip();
        for (let sx = -20; sx < 256; sx += 20) {
            doorCtx.fillStyle = (Math.floor(sx / 20) % 2 === 0) ? '#e8b613' : '#1a1a1a';
            doorCtx.beginPath();
            doorCtx.moveTo(sx, 420);
            doorCtx.lineTo(sx + 20, 420);
            doorCtx.lineTo(sx + 10, 434);
            doorCtx.lineTo(sx - 10, 434);
            doorCtx.fill();
        }
        doorCtx.restore();
        const kickGrad = doorCtx.createLinearGradient(0, 436, 0, 496);
        kickGrad.addColorStop(0, '#3c4044');
        kickGrad.addColorStop(1, '#2a2d30');
        doorCtx.fillStyle = kickGrad;
        doorCtx.fillRect(14, 436, 228, 60);
        doorCtx.strokeStyle = 'rgba(255,255,255,0.08)';
        doorCtx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            const sy = 440 + Math.random() * 50;
            doorCtx.beginPath();
            doorCtx.moveTo(20 + Math.random() * 210, sy);
            doorCtx.lineTo(20 + Math.random() * 210, sy + Math.random() * 4 - 2);
            doorCtx.stroke();
        }
        const doorTexture = new THREE.CanvasTexture(doorCanvas);
        const {canvas: doorBackCanvas, ctx: doorBackCtx} = this._createContext(256, 512);
        doorBackCtx.translate(256, 0);
        doorBackCtx.scale(-1, 1);
        doorBackCtx.drawImage(doorCanvas, 0, 0);
        const doorBackTexture = new THREE.CanvasTexture(doorBackCanvas);
        const annexDoorMatFront = new THREE.MeshStandardMaterial({map: doorTexture, roughness: 0.7, metalness: 0.1});
        const annexDoorMatBack = new THREE.MeshStandardMaterial({
            map: doorBackTexture,
            roughness: 0.7,
            metalness: 0.1
        });
        const annexDoorMat = [annexEdgeMat, annexEdgeMat, annexEdgeMat, annexEdgeMat, annexDoorMatFront, annexDoorMatBack];
        const annexFrameMat = new THREE.MeshStandardMaterial({color: 0x53585c, roughness: 0.7, metalness: 0.2});
        const {canvas: annexWallCanvas, ctx: annexWallCtx} = this._createContext(512, 512);
        annexWallCtx.fillStyle = '#cccccc';
        annexWallCtx.fillRect(0, 0, 512, 512);
        const padCols = 4, padRows = 9, padMargin = 2;
        const trimY = 480;
        const padW = 512 / padCols, padH = trimY / padRows;
        for (let r = 0; r < padRows; r++) {
            for (let c = 0; c < padCols; c++) {
                const x0 = c * padW + padMargin, y0 = r * padH + padMargin;
                const x1 = (c + 1) * padW - padMargin, y1 = (r + 1) * padH - padMargin;
                const pcx = (x0 + x1) / 2, pcy = (y0 + y1) / 2;
                const maxRx = (x1 - x0) / 2, maxRy = (y1 - y0) / 2;
                const steps = 16;
                for (let i = steps; i >= 0; i--) {
                    const t = i / steps;
                    const shade = -40 * t;
                    annexWallCtx.fillStyle = `rgb(${240 + shade}, ${240 + shade}, ${240 + shade})`;
                    annexWallCtx.beginPath();
                    annexWallCtx.ellipse(pcx, pcy, maxRx * t, maxRy * t, 0, 0, Math.PI * 2);
                    annexWallCtx.fill();
                }
                annexWallCtx.strokeStyle = 'rgba(150, 150, 150, 0.55)';
                annexWallCtx.lineWidth = 1;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                    annexWallCtx.beginPath();
                    annexWallCtx.moveTo(pcx, pcy);
                    annexWallCtx.lineTo(pcx + dx * maxRx * 0.92, pcy + dy * maxRy * 0.92);
                    annexWallCtx.stroke();
                });
                annexWallCtx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
                annexWallCtx.lineWidth = 2;
                annexWallCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
        }
        for (let r = 0; r <= padRows; r++) {
            for (let c = 0; c <= padCols; c++) {
                const x = c * padW, y = r * padH;
                annexWallCtx.fillStyle = '#666666';
                annexWallCtx.beginPath();
                annexWallCtx.arc(x, y, 5, 0, Math.PI * 2);
                annexWallCtx.fill();
                annexWallCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                annexWallCtx.beginPath();
                annexWallCtx.arc(x - 1.5, y - 2, 2.2, 0, Math.PI * 2);
                annexWallCtx.fill();
            }
        }
        annexWallCtx.globalAlpha = 0.1;
        annexWallCtx.drawImage(masterNoise, 0, 0);
        annexWallCtx.globalAlpha = 1.0;
        annexWallCtx.fillStyle = '#222222';
        annexWallCtx.fillRect(0, trimY, 512, 512 - trimY);
        annexWallCtx.fillStyle = '#111111';
        annexWallCtx.fillRect(0, trimY - 4, 512, 4);
        const annexWallTexture = new THREE.CanvasTexture(annexWallCanvas);
        annexWallTexture.wrapS = THREE.RepeatWrapping;
        annexWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        annexWallTexture.repeat.set(4, 1);
        const annexWallMat = new THREE.MeshStandardMaterial({
            map: annexWallTexture,
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.02,
            bumpMap: annexWallTexture,
            bumpScale: 0.04
        });
        const {canvas: annexFloorCanvas, ctx: annexFloorCtx} = this._createContext(512, 512);
        annexFloorCtx.fillStyle = '#cccccc';
        annexFloorCtx.fillRect(0, 0, 512, 512);
        const fPadCols = 4, fPadRows = 4, fPadMargin = 2;
        const fPadW = 512 / fPadCols, fPadH = 512 / fPadRows;
        for (let r = 0; r < fPadRows; r++) {
            for (let c = 0; c < fPadCols; c++) {
                const x0 = c * fPadW + fPadMargin, y0 = r * fPadH + fPadMargin;
                const x1 = (c + 1) * fPadW - fPadMargin, y1 = (r + 1) * fPadH - fPadMargin;
                const pcx = (x0 + x1) / 2, pcy = (y0 + y1) / 2;
                const maxRx = (x1 - x0) / 2, maxRy = (y1 - y0) / 2;
                const steps = 16;
                for (let i = steps; i >= 0; i--) {
                    const t = i / steps;
                    const shade = -40 * t;
                    annexFloorCtx.fillStyle = `rgb(${240 + shade}, ${240 + shade}, ${240 + shade})`;
                    annexFloorCtx.beginPath();
                    annexFloorCtx.ellipse(pcx, pcy, maxRx * t, maxRy * t, 0, 0, Math.PI * 2);
                    annexFloorCtx.fill();
                }
                annexFloorCtx.strokeStyle = 'rgba(150, 150, 150, 0.55)';
                annexFloorCtx.lineWidth = 1;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                    annexFloorCtx.beginPath();
                    annexFloorCtx.moveTo(pcx, pcy);
                    annexFloorCtx.lineTo(pcx + dx * maxRx * 0.92, pcy + dy * maxRy * 0.92);
                    annexFloorCtx.stroke();
                });
                annexFloorCtx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
                annexFloorCtx.lineWidth = 2;
                annexFloorCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
        }
        for (let r = 0; r <= fPadRows; r++) {
            for (let c = 0; c <= fPadCols; c++) {
                const x = c * fPadW, y = r * fPadH;
                annexFloorCtx.fillStyle = '#666666';
                annexFloorCtx.beginPath();
                annexFloorCtx.arc(x, y, 5, 0, Math.PI * 2);
                annexFloorCtx.fill();
                annexFloorCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                annexFloorCtx.beginPath();
                annexFloorCtx.arc(x - 1.5, y - 2, 2.2, 0, Math.PI * 2);
                annexFloorCtx.fill();
            }
        }
        annexFloorCtx.globalAlpha = 0.1;
        annexFloorCtx.drawImage(masterNoise, 0, 0, 512, 512);
        annexFloorCtx.globalAlpha = 1.0;
        const annexFloorTexture = this._createWrappedTexture(annexFloorCanvas, 56, 56);
        const annexFloorMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 0.7,
            metalness: 0.02,
            bumpMap: annexFloorTexture,
            bumpScale: 0.03
        });
        const drawSpiral = (ctx, startTheta, maxTheta, coilPx, width, style) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            let theta = startTheta;
            let first = true;
            while (theta < maxTheta) {
                const r = coilPx * theta;
                const px = 128 + Math.cos(theta) * r;
                const py = 128 + Math.sin(theta) * r;
                if (first) {
                    ctx.moveTo(px, py);
                    first = false;
                } else ctx.lineTo(px, py);
                theta += 0.05;
            }
            ctx.stroke();
        };
        const annexCeilingMat = new THREE.MeshStandardMaterial({
            map: annexFloorTexture,
            roughness: 1.0,
            metalness: 0.0,
            bumpMap: annexFloorTexture,
            bumpScale: 0.03
        });
        return {annexDoorMat, annexFrameMat, annexWallMat, annexFloorMat, annexCeilingMat};
    }

    static _buildImpoundAssets(masterNoise) {
        const ribWidth = 28;
        const drawCorrugation = (ctx, w, h, base, hi, lo) => {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += ribWidth) {
                const grad = ctx.createLinearGradient(x, 0, x + ribWidth, 0);
                grad.addColorStop(0, lo);
                grad.addColorStop(0.5, hi);
                grad.addColorStop(1, lo);
                ctx.fillStyle = grad;
                ctx.fillRect(x, 0, ribWidth, h);
            }
        };
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
        drawCorrugation(wallCtx, 512, 512, '#7d848a', '#9aa1a6', '#5b6166');
        wallCtx.fillStyle = 'rgba(20,20,20,0.3)';
        for (let y = 0; y < 512; y += 170) wallCtx.fillRect(0, y, 512, 6);
        wallCtx.fillStyle = 'rgba(15,10,5,0.55)';
        for (let y = 3; y < 512; y += 170) {
            for (let x = 12; x < 512; x += ribWidth) {
                wallCtx.beginPath();
                wallCtx.arc(x, y, 2.2, 0, Math.PI * 2);
                wallCtx.fill();
            }
        }
        for (let i = 0; i < 24; i++) {
            const grad = wallCtx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, `rgba(130, 60, 20, ${0.12 + Math.random() * 0.22})`);
            grad.addColorStop(1, 'rgba(130, 60, 20, 0)');
            wallCtx.fillStyle = grad;
            const sx = Math.random() * 512;
            const sw = Math.random() * 22 + 6;
            wallCtx.fillRect(sx, 0, sw, 512 * (0.35 + Math.random() * 0.65));
        }
        wallCtx.fillStyle = 'rgba(40, 30, 20, 0.4)';
        wallCtx.fillRect(0, 460, 512, 52);
        wallCtx.globalAlpha = 0.3;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
        const impoundWallTexture = new THREE.CanvasTexture(wallCanvas);
        impoundWallTexture.wrapS = THREE.RepeatWrapping;
        impoundWallTexture.wrapT = THREE.ClampToEdgeWrapping;
        impoundWallTexture.repeat.set(4, 1);
        const impoundWallMat = new THREE.MeshStandardMaterial({
            map: impoundWallTexture,
            roughness: 0.85,
            metalness: 0.35,
            bumpMap: impoundWallTexture,
            bumpScale: 0.02
        });
        const {canvas: ceilCanvas, ctx: ceilCtx} = this._createContext(512, 512);
        drawCorrugation(ceilCtx, 512, 512, '#6b7075', '#84898e', '#484d51');
        ceilCtx.fillStyle = 'rgba(10,10,10,0.35)';
        for (let y = 0; y < 512; y += 128) ceilCtx.fillRect(0, y, 512, 5);
        for (let i = 0; i < 18; i++) {
            const grad = ceilCtx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, `rgba(110, 70, 30, ${0.1 + Math.random() * 0.2})`);
            grad.addColorStop(1, 'rgba(110, 70, 30, 0)');
            ceilCtx.fillStyle = grad;
            const sx = Math.random() * 512;
            const sw = Math.random() * 16 + 5;
            ceilCtx.fillRect(sx, 0, sw, 512 * (0.3 + Math.random() * 0.5));
        }
        ceilCtx.globalAlpha = 0.25;
        ceilCtx.drawImage(masterNoise, 0, 0);
        ceilCtx.globalAlpha = 1.0;
        const impoundCeilingTexture = this._createWrappedTexture(ceilCanvas, 8, 8);
        const impoundCeilingMat = new THREE.MeshStandardMaterial({
            map: impoundCeilingTexture,
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.4,
            bumpMap: impoundCeilingTexture,
            bumpScale: 0.015
        });
        return {impoundWallMat, impoundCeilingMat};
    }

    static _buildBoardroomAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
        wallCtx.fillStyle = '#c7c1b3';
        wallCtx.fillRect(0, 0, 512, 512);
        const drawFractalBloom = (cx, cy, len, angle, depth, seed) => {
            if (depth <= 0 || len < 4) {
                const petals = 5;
                for (let p = 0; p < petals; p++) {
                    const pa = (p / petals) * Math.PI * 2 + seed * 6.28;
                    wallCtx.beginPath();
                    wallCtx.ellipse(
                        cx + Math.cos(pa) * len * 0.7, cy + Math.sin(pa) * len * 0.7,
                        Math.max(1.5, len * 0.55), Math.max(1, len * 0.28),
                        pa, 0, Math.PI * 2
                    );
                    wallCtx.fill();
                }
                return;
            }
            const ex = cx + Math.cos(angle) * len;
            const ey = cy + Math.sin(angle) * len;
            wallCtx.beginPath();
            wallCtx.moveTo(cx, cy);
            wallCtx.lineTo(ex, ey);
            wallCtx.stroke();
            const spread = 0.4 + seed * 0.2;
            drawFractalBloom(ex, ey, len * 0.78, angle - spread, depth - 1, seed);
            drawFractalBloom(ex, ey, len * 0.78, angle + spread, depth - 1, seed);
        };
        wallCtx.strokeStyle = 'rgba(94, 88, 72, 0.32)';
        wallCtx.fillStyle = 'rgba(94, 88, 72, 0.26)';
        wallCtx.lineWidth = 1.5;
        const seed = 0.42;
        const groundY = 468;
        const trunkLen = 130;
        drawFractalBloom(256, groundY, trunkLen, -Math.PI / 2, 6, seed);
        const sprigY = groundY - trunkLen * 0.45;
        wallCtx.strokeStyle = 'rgba(94, 88, 72, 0.16)';
        wallCtx.fillStyle = 'rgba(94, 88, 72, 0.12)';
        wallCtx.lineWidth = 1;
        drawFractalBloom(256, sprigY, 55, -Math.PI / 2 - 1.15, 3, seed);
        drawFractalBloom(256, sprigY, 47, -Math.PI / 2 + 1.25, 3, seed);
        wallCtx.globalAlpha = 0.30;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
        wallCtx.fillStyle = '#55503e';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#3d3929';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.fillStyle = 'rgba(0,0,0,0.12)';
        wallCtx.fillRect(255, 0, 2, 512);
        const boardWallTexture = this._createWrappedTexture(wallCanvas, 4, 1, true);
        const boardWallMat = new THREE.MeshStandardMaterial({
            map: boardWallTexture,
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.05,
            bumpMap: boardWallTexture,
            bumpScale: 0.008
        });
        return {boardWallMat};
    }

    /**
     * A glossy, veined "food court marble" laminate for the Atrium's wall ring -- the kind
     * of over-polished faux-stone a mall developer picks because it photographs well, not
     * because it's tasteful. Cream base, grey veining, a couple of thin gold accent veins,
     * and a soft diagonal sheen standing in for the over-buffed gloss coat.
     */
    static _buildAtriumAssets(masterNoise) {
        const {canvas: marbleCanvas, ctx: marbleCtx} = this._createContext(512, 512);
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
        const marbleTexture = this._createWrappedTexture(marbleCanvas, 2, 1);
        const marbleMat = new THREE.MeshStandardMaterial({
            map: marbleTexture,
            color: 0xffffff,
            bumpMap: marbleTexture,
            bumpScale: 0.015,
            roughness: 0.18,
            metalness: 0.15
        });
        const {canvas: shelfBumpCanvas, ctx: shelfBumpCtx} = this._createContext(256, 256);
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
        const shelfBumpTexture = this._createWrappedTexture(shelfBumpCanvas, 2, 2);
        const shelfMat = new THREE.MeshStandardMaterial({
            color: 0xc9bd9e,
            bumpMap: shelfBumpTexture,
            bumpScale: 0.006,
            roughness: 0.6,
            metalness: 0.2
        });
        const atriumSmearMat = this._buildAtriumSmear();
        return {marbleMat, shelfMat, atriumSmearMat};
    }

    /**
     * Builds the Atrium aisle smear: the source row for the texture-stretch artifact that the
     * shelf uprights dissolve into above head height.
     *
     * The aisles are authored 14 metres tall and only the bottom 2.92 of that is shelving. The
     * rest was `shelfMat` -- a flat `0xc9bd9e` with no map on it at all -- stacked in 3.2m bands,
     * so the tallest structure in the sector was also the only surface in the game with nothing
     * whatsoever on it. This replaces the bands with the failure mode a renderer actually has
     * when geometry outruns its texture: the last valid scanline gets held and smeared up the
     * surface forever.
     *
     * The canvas is one scanline's worth of information and a lot of vertical nothing. Its foot
     * is a readable shelf edge -- run-length blocks in the aisle's own product colours over a
     * dark frame line -- and every column above that holds its colour unchanged to the top. The
     * material then clamps T, so past the canvas the top row repeats out to whatever height the
     * geometry asks for. That is the whole trick, and it is the same mechanism that produces the
     * artifact for real, which is why it reads as one rather than as a striped wallpaper.
     *
     * `NearestFilter` on magnification, because a stretched texel is hard-edged -- letting it
     * interpolate produces a soft airbrushed gradient, which is what a deliberate effect looks
     * like and not what a broken one does.
     *
     * Height falloff is carried by vertex colours on the geometry (see AtriumSector), since
     * clamping means no vertical gradient can come from the texture by definition -- every row
     * above the canvas is the same row. Note when tuning: `vertexColors` multiplies
     * `diffuseColor` and never reaches `totalEmissiveRadiance`, so that falloff governs the
     * diffuse only and the emissive floor recedes on fog and distance instead.
     *
     * @returns {THREE.MeshStandardMaterial} The aisle smear material.
     */
    static _buildAtriumSmear() {
        const W = 512, H = 64;
        const RAIL = 11;
        const rand = this._seededRandom(73310945);
        const {canvas, ctx} = this._createContext(W, H);

        // Weighted, because the previous flat split was the whole reason this came out beige.
        // It ran shelf-face 44% of the time and picked uniformly from five box colours for the
        // rest, two of which (tan and cream) are themselves beige -- so 52% of the canvas was
        // one hue and only 24% was red, green or blue between them. A supermarket shelf seen
        // head-on is almost entirely product; the shelf itself survives as slivers between
        // facings, not as the majority surface. Now 11% shelf, 8% gap, and the rest product,
        // with red/green/blue at roughly 20% each.
        //
        // Saturation is raised over `productBoxMats` rather than copied from it. Those are
        // authored to sit in a lit room where a 0x8a3a3a box still reads as red because the eye
        // has the whole box to judge; a two-inch vertical streak at 40 metres under a vending
        // machine's cyan cast has no such context and collapses to grey-brown. Each family also
        // spans three values instead of one, so a run of adjacent facings varies the way stock
        // on a shelf does.
        const PALETTE = [
            {w: 14, c: [188, 178, 150]},   // shelf face between facings
            {w: 10, c: [34, 31, 27]},      // gap and shadow behind the front row
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

        // canvas y is inverted by the texture's flipY, so the foot of the wall is the foot of
        // the canvas: rail at the bottom, the endless part climbing away from it.
        let x = 0;
        while (x < W) {
            // 5..28px against 128px per metre, so a run is 4 to 22cm -- the width of a facing.
            // The old 3..33 produced quarter-metre slabs that read as painted boarding.
            const run = 5 + Math.floor(rand() * 24);
            const c = pick();
            // Tightened from 0.80..1.20. Wide value jitter on an already-desaturated palette was
            // pushing half the runs far enough off their hue to land back in neutral.
            const j = 0.88 + rand() * 0.24;
            const shade = (k) => Math.max(0, Math.min(255, Math.round(c[0 + k] * j)));
            ctx.fillStyle = `rgb(${shade(0)}, ${shade(1)}, ${shade(2)})`;
            ctx.fillRect(x, 0, run, H - RAIL);
            // The same column, darker, for the strip the smear is nominally sampling. Each
            // streak visibly leaves from its own piece of shelf rather than from a seam.
            ctx.fillStyle = `rgb(${Math.round(shade(0) * 0.52)}, ${Math.round(shade(1) * 0.52)}, ${Math.round(shade(2) * 0.52)})`;
            ctx.fillRect(x, H - RAIL, run, RAIL);
            if (rand() > 0.45) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(x, 0, 1, H);
            }
            x += run;
        }
        // The last good scanline itself: the shelf's frame edge, the thing that stopped.
        ctx.fillStyle = 'rgb(20, 19, 17)';
        ctx.fillRect(0, H - 2, W, 2);

        const map = this._createWrappedTexture(canvas, 1, 1, true);
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.LinearMipmapLinearFilter;
        // Lit rather than unlit. A `MeshBasicMaterial` here reads as a purer artifact -- it
        // ignores the scene and keeps burning at constant value while the room falls away -- but
        // it also takes the flashlight out of the interaction and puts a floor under the
        // Atrium's darkness, which the sector is built around not having. Lit, the beam sweeping
        // up a column is the thing that reveals it, and that turned out to matter more than the
        // purity did.
        return new THREE.MeshStandardMaterial({
            map,
            // The emissive has to run through the map rather than sit as a flat tint, or every
            // streak glows the same colour and the horizontal information -- the only thing
            // distinguishing a smear from a bar of light -- is lost at exactly the heights where
            // the diffuse has already gone dark.
            emissiveMap: map,
            emissive: 0xffffff,
            // Low on purpose. This is a floor, not a light source: enough that the aisles do not
            // vanish completely between machines, not so much that they stop reading as unlit
            // geometry that happens to be wrong.
            emissiveIntensity: 0.14,
            roughness: 0.92,
            // Dielectric -- no envMap in this scene, so metalness only subtracts diffuse.
            metalness: 0.0,
            vertexColors: true
        });
    }

    static _buildMaintenanceAssets(masterNoise) {
        const {canvas: leakCanvas, ctx: leakCtx} = this._createContext(256, 256, false);
        for (let i = 0; i < 10; i++) {
            const cx = 60 + Math.random() * 136, cy = 60 + Math.random() * 136, r = 20 + Math.random() * 45;
            const grad = leakCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(18, 15, 12, ${0.55 + Math.random() * 0.3})`);
            grad.addColorStop(0.55, 'rgba(35, 26, 18, 0.25)');
            grad.addColorStop(1, 'rgba(35, 26, 18, 0)');
            leakCtx.fillStyle = grad;
            leakCtx.beginPath();
            leakCtx.ellipse(cx, cy, r, r * (0.55 + Math.random() * 0.35), Math.random() * Math.PI, 0, Math.PI * 2);
            leakCtx.fill();
        }
        const leakTexture = new THREE.CanvasTexture(leakCanvas);
        const leakStainMat = new THREE.MeshStandardMaterial({
            map: leakTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.85,
            roughness: 0.35,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const leakStainGeo = new THREE.PlaneGeometry(1.6, 1.6);
        leakStainGeo.rotateX(-Math.PI / 2);
        return {leakStainMat, leakStainGeo};
    }

    static _buildArchiveAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = this._createContext(512, 512);
        wallCtx.fillStyle = '#546e58';
        wallCtx.fillRect(0, 0, 512, 384);
        wallCtx.lineWidth = 1;
        for (let i = 0; i < 512; i += 16) {
            wallCtx.strokeStyle = (i % 64 === 0) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.02)';
            wallCtx.beginPath();
            wallCtx.moveTo(i, 0);
            wallCtx.lineTo(i, 384);
            wallCtx.stroke();
        }
        wallCtx.fillStyle = '#6a4a34';
        wallCtx.fillRect(0, 384, 512, 128);
        for (let i = 0; i < 512; i += 4) {
            if (i % 64 === 0) {
                wallCtx.fillStyle = '#483020';
                wallCtx.fillRect(i, 384, 4, 128);
                wallCtx.fillStyle = '#74523c';
                wallCtx.fillRect(i + 4, 384, 2, 128);
            } else if (Math.random() > 0.3) {
                wallCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                wallCtx.fillRect(i, 384, 1 + Math.random(), 128);
            }
        }
        wallCtx.fillStyle = '#483020';
        wallCtx.fillRect(0, 380, 512, 4);
        wallCtx.fillStyle = '#74523c';
        wallCtx.fillRect(0, 376, 512, 4);
        wallCtx.fillStyle = '#4c3424';
        wallCtx.fillRect(0, 480, 512, 32);
        wallCtx.fillStyle = '#382618';
        wallCtx.fillRect(0, 476, 512, 4);
        wallCtx.globalAlpha = 0.4;
        wallCtx.drawImage(masterNoise, 0, 0);
        wallCtx.globalAlpha = 1.0;
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);
        const archiveWallTexture = this._createWrappedTexture(wallCanvas, 4, 1, true);
        const archiveWallMat = new THREE.MeshStandardMaterial({
            map: archiveWallTexture,
            roughness: 0.95,
            metalness: 0.0,
            bumpMap: archiveWallTexture,
            bumpScale: 0.015
        });
        const {canvas: floorCanvas, ctx: floorCtx} = this._createContext(256, 256);
        const tileA = '#ddceA2', tileB = '#8a3a2e';
        const tiles = 8, tileSize = 256 / tiles;
        for (let ty = 0; ty < tiles; ty++) {
            for (let tx = 0; tx < tiles; tx++) {
                floorCtx.fillStyle = (tx + ty) % 2 === 0 ? tileA : tileB;
                floorCtx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
            }
        }
        floorCtx.globalAlpha = 0.18;
        floorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        floorCtx.globalAlpha = 1.0;
        for (let i = 0; i < 70; i++) {
            floorCtx.strokeStyle = `rgba(20, 15, 10, ${Math.random() * 0.12})`;
            floorCtx.lineWidth = 0.5 + Math.random() * 1.5;
            floorCtx.beginPath();
            const sx = Math.random() * 256, sy = Math.random() * 256;
            floorCtx.moveTo(sx, sy);
            floorCtx.lineTo(sx + (Math.random() - 0.5) * 30, sy + (Math.random() - 0.5) * 30);
            floorCtx.stroke();
        }
        floorCtx.strokeStyle = 'rgba(0,0,0,0.2)';
        floorCtx.lineWidth = 1;
        for (let t = 0; t <= tiles; t++) {
            floorCtx.beginPath();
            floorCtx.moveTo(0, t * tileSize);
            floorCtx.lineTo(256, t * tileSize);
            floorCtx.stroke();
            floorCtx.beginPath();
            floorCtx.moveTo(t * tileSize, 0);
            floorCtx.lineTo(t * tileSize, 256);
            floorCtx.stroke();
        }
        // 14, not 16 -- `R * tiles` must be a multiple of 14; see _buildCheckpointAssets. 16 x 8
        // gave 0.4375 units and 9.14 tiles to a cell. 14 gives half a unit, eight to a cell.
        const archiveFloorTexture = this._createWrappedTexture(floorCanvas, 14, 14);
        const archiveFloorMat = new THREE.MeshStandardMaterial({
            map: archiveFloorTexture,
            roughness: 0.65,
            metalness: 0.02,
            bumpMap: archiveFloorTexture,
            bumpScale: 0.006
        });
        const {canvas: pCanvas, ctx: pCtx} = this._createContext(64, 64);
        pCtx.fillStyle = '#f0eee6';
        pCtx.fillRect(0, 0, 64, 64);
        pCtx.globalAlpha = 0.15;
        pCtx.drawImage(masterNoise, 0, 0, 64, 64);
        pCtx.globalAlpha = 1.0;
        pCtx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 8; i < 56; i += 6) {
            pCtx.fillRect(8, i, 48 * (0.6 + Math.random() * 0.4), 1.5);
        }
        const paperTex = new THREE.CanvasTexture(pCanvas);
        const paperMat = new THREE.MeshStandardMaterial({map: paperTex, roughness: 1.0});
        const paperGeo = new THREE.PlaneGeometry(0.2, 0.28);
        const {canvas: cCanvas, ctx: cCtx} = this._createContext(64, 64, false);
        const grad = cCtx.createRadialGradient(32, 32, 10, 32, 32, 30);
        grad.addColorStop(0, 'rgba(40, 20, 10, 0.05)');
        grad.addColorStop(0.8, 'rgba(40, 20, 10, 0.15)');
        grad.addColorStop(0.9, 'rgba(40, 20, 10, 0.7)');
        grad.addColorStop(1, 'rgba(40, 20, 10, 0)');
        cCtx.fillStyle = grad;
        cCtx.beginPath();
        cCtx.arc(32, 32, 30, 0, Math.PI * 2);
        cCtx.fill();
        const coffeeTex = new THREE.CanvasTexture(cCanvas);
        const coffeeStainMat = new THREE.MeshStandardMaterial({
            map: coffeeTex,
            transparent: true,
            depthWrite: false,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        const coffeeStainGeo = new THREE.PlaneGeometry(0.25, 0.25);
        const {canvas: pageCanvas, ctx: pageCtx} = this._createContext(64, 64);
        pageCtx.fillStyle = '#e8e5df';
        pageCtx.fillRect(0, 0, 64, 64);
        pageCtx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 64; i += 2) pageCtx.fillRect(0, i, 64, 0.5);
        const pageTex = new THREE.CanvasTexture(pageCanvas);
        const pageMat = new THREE.MeshStandardMaterial({map: pageTex, roughness: 0.9});
        const coverColors = ['#753434', '#344a75', '#34754a', '#756034', '#555555'];
        const bookMatSets = coverColors.map(color => {
            const {canvas: covCanvas, ctx: covCtx} = this._createContext(64, 64);
            covCtx.fillStyle = color;
            covCtx.fillRect(0, 0, 64, 64);
            covCtx.globalAlpha = 0.3;
            covCtx.drawImage(masterNoise, 0, 0, 64, 64);
            covCtx.globalAlpha = 1.0;
            covCtx.fillStyle = 'rgba(0,0,0,0.4)';
            covCtx.fillRect(10, 0, 4, 64);
            covCtx.fillRect(50, 0, 4, 64);
            const covTex = new THREE.CanvasTexture(covCanvas);
            const covMat = new THREE.MeshStandardMaterial({map: covTex, roughness: 0.8});
            return [pageMat, pageMat, covMat, covMat, pageMat, covMat];
        });
        return {archiveWallMat, archiveFloorMat, paperMat, paperGeo, coffeeStainMat, coffeeStainGeo, bookMatSets};
    }

    /**
     * Builds the Checkpoint's walls: walnut raised-and-fielded panelling, in the condition a
     * government building reaches when nobody has held its maintenance budget for a decade.
     *
     * The sector already commits to "old government building" below and above -- basket-weave
     * parquet underfoot, pressed tin overhead -- and then borrowed the generic `structMat` for
     * the one surface actually at eye level, so the room read as a concrete bunker somebody had
     * installed a nice floor in. This is the missing third surface.
     *
     * Height-aware, like `_buildClinicWall`. `buildWall` maps v across the full 3-unit wall and
     * the texture is clamped vertically, so canvas y is an absolute elevation rather than a
     * tiling coordinate: plinth on the floor, dado rail at 0.95m, fielded panels above it,
     * cornice into the ceiling. Nothing here repeats upward and nothing may -- a dado rail that
     * tiles is just a stripe.
     *
     * Horizontally it does tile, at one bay per metre (`repeatX: 4` against the `w / cellSize`
     * UV scaling `buildWall` applies on a 4-unit cell). The stile dividing two bays is drawn at
     * both x=0 and x=W so its halves meet across the seam; drawn once in the middle instead, the
     * wall would show a full stile at each bay centre and a butt joint at every wrap.
     *
     * Three maps rather than the usual two. Old varnish is the entire read on wood: the dado
     * rail and the cornice are polished where hands and sleeves reach them while the panel
     * fields have gone chalky, and only `roughnessMap` carries that. Without it this is brown
     * concrete -- the same point `_buildClinicRail` makes about semi-gloss vinyl standing against
     * flat wall paint.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Checkpoint wall material.
     */
    static _buildCheckpointWall(masterNoise) {
        // 512 across one metre of bay, 1024 up three metres. Deliberately not square, unlike the
        // other walls in this file: everything that sells panelling is a horizontal moulding a
        // few centimetres deep, and at the Clinic wall's 512 height a 25mm bead is four pixels
        // and dissolves into the dither. 341px/m puts it at eight.
        const W = 512, H = 1024;
        const UNITS = 3.0;
        const yAt = (u) => H - (u / UNITS) * H;
        const xAt = (m) => m * (W / 2);
        const rand = this._seededRandom(41778203);

        // Elevations, in metres off the floor. Joinery proportions rather than invented ones:
        // the dado sits at the height a chair back hits, which is why the rail exists at all.
        const PLINTH = 0.16, PLINTH_CAP = 0.205;
        const DADO_BOT = 0.92, DADO_TOP = 1.02;
        const FRIEZE = 2.55, CORNICE = 2.74;

        // Two bays per canvas, not one. Panelling repeats by nature and a tiling wall is not
        // wrong to repeat -- but the cathedral figure is a landmark, and at one bay per canvas
        // the identical peak recurring every metre was the only thing the eye tracked. A second
        // bay with its own draws from the same stream halves the period for no extra memory.
        // Costs horizontal density (256px/m rather than 512) which lands it closer to the
        // 341px/m vertical anyway; the mouldings that needed the resolution are horizontal and
        // take theirs from H.
        const BAYS = 2;
        const BAY = W / BAYS;
        const STILE = xAt(0.10);
        const MUNTIN = xAt(0.058);
        const fieldOf = (b) => [b * BAY + STILE / 2 + MUNTIN, (b + 1) * BAY - STILE / 2 - MUNTIN];

        // American black walnut, not mahogany. The distinction is almost entirely saturation:
        // walnut is a desaturated grey-brown with a cool, faintly purple cast, and the obvious
        // first guess -- a warm chocolate around [74, 51, 36] -- is a red-brown that reads as
        // sapele the moment a tungsten fixture hits it. That mattered here beyond pedantry,
        // because the Checkpoint's parquet floor is already a golden oak and a wall at the same
        // hue collapsed the two surfaces into one warm mass with the room's depth gone. Cooling
        // the wall is what puts the floor back underneath it.
        const FIELD = [72, 54, 45];
        const RAIL = [62, 46, 39];
        const DARK = [40, 30, 25];
        const LIGHT = [110, 88, 72];
        const SAP = [148, 122, 95];
        const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
        const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);
        const {canvas: roughCanvas, ctx: rCtx} = this._createContext(W, H);
        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, W, H);
        rCtx.fillStyle = '#b4b4b4';
        rCtx.fillRect(0, 0, W, H);

        // A band spanning two elevations. yAt inverts, so the taller elevation is the smaller
        // canvas y and every rect in here has to be built from the top down.
        const band = (u0, u1) => ({y: yAt(u1), h: yAt(u0) - yAt(u1)});

        /**
         * Lays sawn grain into a rectangle. `arch` selects plain-sawn stock -- the nested
         * cathedral figure you only get when the blade crosses the annual rings at a shallow
         * angle. Off, it gives quarter-sawn: straight and quiet, which is what stiles and rails
         * are cut from precisely because it moves least. Putting cathedrals on a rail is the
         * commonest tell of a wood texture nobody looked at wood to write.
         */
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
            // Sparse. An earlier pass ran this near four lines per centimetre of board and the
            // result was corduroy -- at that density the eye stops resolving individual grain
            // and integrates the lot into a flat woven tone, which is the same failure mode as
            // a hatch pattern standing in for shading. Wood is mostly figure with a little line
            // work over it, not the reverse.
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
                // The cathedral is the dominant feature of a plain-sawn face, not a garnish on
                // top of straight grain, so it gets the contrast budget. Each peak is a stack of
                // nested rings sharing one axis -- literally the growth rings, seen where the
                // blade crossed them at a shallow angle -- with the outer rings both wider and
                // flatter, which is what makes the shape read as a section through a cone
                // rather than as a row of painted arches.
                let ay = y0 - h * 0.14;
                while (ay < y0 + h) {
                    const acx = x0 + w * (0.14 + rand() * 0.72);
                    const halfW = w * (0.20 + rand() * 0.24);
                    const peak = h * (0.055 + rand() * 0.075);
                    const rings = 11 + Math.floor(rand() * 10);
                    const step = peak / 4.0;
                    for (let k = 0; k < rings; k++) {
                        // Successive rings are vertical translations of one curve, not a fan
                        // widening about a shared apex. Scaling the half-width per ring instead
                        // splays the legs outward from a common peak and the result reads as a
                        // firework -- rings that are copies offset down the board stay parallel
                        // at the flanks, which is what makes the legs resolve into ordinary
                        // straight grain away from the peak, which is what a cathedral is.
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
            // Walnut is ring-porous, so the pores land as short dashes running with the grain
            // rather than as isotropic speckle. This is most of what stops it reading as paint.
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

        // Carcass first: the whole wall is stile-and-rail stock, and the fields are cut into it.
        grain(0, 0, W, H, RAIL, false);

        /**
         * A recessed fielded panel. Four mitred bevels around a flat centre, which is the only
         * part of this that has to be right -- a fielded panel is defined by the bevel catching
         * light on one edge and shadow on the opposite one, and a fixture anywhere in the room
         * will rake at least two of the four.
         */
        const panel = (b, u0, u1, arch) => {
            const [fx0, fx1] = fieldOf(b);
            const {y, h} = band(u0, u1);
            const bevel = xAt(0.032);
            grain(fx0, y, fx1 - fx0, h, FIELD, arch);
            // Recess: the field sits behind the frame, the bevels ramp back out to it.
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
            // The albedo needs the bevels too -- bump alone vanishes under a light square on it.
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
            // Fields are the one surface nobody touches, so they keep the least polish.
            rCtx.fillStyle = '#cdcdcd';
            rCtx.fillRect(fx0 + bevel, y + bevel, fx1 - fx0 - bevel * 2, h - bevel * 2);
        };

        for (let b = 0; b < BAYS; b++) {
            // Both courses are figured. Panels are resawn from the same plain-sawn stock; it is
            // the stiles and rails that are quarter-sawn, and they get `false` above.
            panel(b, PLINTH_CAP + 0.03, DADO_BOT - 0.03, true);
            panel(b, DADO_TOP + 0.04, FRIEZE - 0.04, true);
        }

        // Stiles last so they sit over the panel frames, which is the actual assembly order.
        // 0 and W are the two halves of the stile that straddles the wrap seam.
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

        /**
         * A proud horizontal member -- plinth cap, dado rail, cornice course. `gloss` is what
         * separates them: the rail and cornice are hand-height or catch the room's only lamp,
         * the plinth cap is at boot level and has been kicked matte.
         */
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

        // Plinth: the board that meets the parquet, and the one that gets mopped into.
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

        // Rising damp. Panelling fails from the plinth up, because that is where the wall is
        // wet and where the air does not move, and it is the single most legible sign that a
        // room this formal has been left alone -- more so than any amount of surface dirt.
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

        // Contact wear at the dado. Same reasoning as the Clinic's scuff band: the rail exists
        // because things are pushed against it, so the evidence belongs above and below it and
        // nowhere else. Queues stand here for hours.
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

        // Chips through to raw stock. Walnut is dark all the way down but the broken edge is
        // unfinished, so a chip reads as a pale spot rather than a dark one -- the opposite of
        // what damage does to painted plaster, and worth getting right since the Clinic wall
        // right next door in this file does it the other way for exactly that reason.
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
        this._ditherCanvas(ctx, W, H, rand, 10);

        // repeatX 2, not 4: the canvas is now two metres of bay, and `buildWall` already scales
        // u by `w / cellSize`, so two repeats cover the 4-unit cell at one bay per metre.
        const map = this._createWrappedTexture(canvas, 2, 1, true);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 2, 1, true);
        const roughnessMap = this._createWrappedTexture(roughCanvas, 2, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            // Panelling is shallow. The deepest thing here is a 6mm recess, and pushing bump
            // past that turns mitres into rubber -- the failure `rustMat` documents from the
            // other direction.
            bumpScale: 0.016,
            roughnessMap,
            // Left at 1.0 so the map carries the whole range rather than being scaled down into
            // a narrow band; the gloss separation between rail and field is the point.
            roughness: 1.0,
            // Dielectric. No envMap in this scene, so metalness only subtracts diffuse and
            // returns nothing -- see _buildPipeMaterial and rustMat.
            metalness: 0.0
            // No shadowSide override, per _buildClinicWall.
        });
    }

    /**
     * Checkpoint's own floor, wall and ceiling treatment -- previously a flat gray noise-speckle
     * "concrete" floor and the generic `structMat` borrowed for its walls and ceiling, none of
     * which belonged to the sector specifically. Replaced with an aged basket-weave hardwood
     * parquet floor, walnut raised-and-fielded panelling, and a Victorian-style pressed tin
     * ceiling (embossed square panels, each with its own rosette medallion) -- the "old
     * government building" look the checkpoint's hazmat-and-forms dressing already implies but
     * its surfaces didn't back up.
     */
    static _buildCheckpointAssets(masterNoise) {
        const {canvas: ckFloorCanvas, ctx: ckFloorCtx} = this._createContext(256, 256);
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
        // 14, not 12. Every sector foundation is the inner chunk -- `(chunkSize - 2) * cellSize`
        // = 56 units -- so a canvas carrying T tiles per axis at repeat R puts a tile at
        // `56 / (R * T)` units. For a tile edge to ever land on a wall face, that has to divide
        // the 4-unit cell a whole number of times, which makes the rule `R * T` must be a
        // multiple of 14. At 12 x 4 blocks this ran 1.167 units, 3.43 blocks to a cell, and no
        // wall in the sector could meet a block edge. 14 gives exactly one unit, four to a cell.
        const checkpointFloorTexture = this._createWrappedTexture(ckFloorCanvas, 14, 14);
        const checkpointFloorMat = new THREE.MeshStandardMaterial({
            map: checkpointFloorTexture,
            roughness: 0.88,
            metalness: 0.02,
            bumpMap: checkpointFloorTexture,
            bumpScale: 0.012
        });
        const {canvas: ckCeilCanvas, ctx: ckCeilCtx} = this._createContext(256, 256);
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
        const {canvas: ckCeilBumpCanvas, ctx: ckCeilBumpCtx} = this._createContext(256, 256);
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
        // 28, not 32, and the number is derived rather than chosen. The sector ceiling plane is
        // the inner chunk, `(chunkSize - 2) * cellSize` = 56 units, and this canvas carries
        // `tinTiles` = 2 panels per axis, so the repeat sets panel size at `56 / (R * 2)`. At 32
        // that is 0.875 units against a 4-unit cell -- 4.571 panels per cell, which never lands
        // a panel edge on a cell edge, so every wall in the sector cut a panel somewhere across
        // its middle and the coffering read as wallpaper the walls had been dropped onto.
        //
        // Alignment needs `cellSize / panelSize` to be a whole number, i.e. `R * tinTiles` to be
        // a multiple of 14. 28 is the value in that family nearest the old look: 56 panels over
        // 56 units, exactly one unit each, four to a cell, every wall face landing on a seam.
        // It also puts this back on the convention `ceilMat` already states in Environment --
        // "64-unit chunk plane / 16 / 4 tiles per canvas = 1 unit per tile" -- which this
        // surface was the only ceiling in the game not following.
        const CEIL_REPEAT = 28;
        const checkpointCeilingTexture = this._createWrappedTexture(ckCeilCanvas, CEIL_REPEAT, CEIL_REPEAT);
        const checkpointCeilingBumpTexture = this._createWrappedTexture(ckCeilBumpCanvas, CEIL_REPEAT, CEIL_REPEAT);
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

    /**
     * Builds the Incinerator's floor: heavy steel plate that has been swept, scorched and walked
     * on for decades.
     *
     * Scale was the whole problem with what this replaces. `diamondPlateMat` put its tread cell
     * at 500mm -- checker plate pitch is 25 to 30mm, so it was nearly seventeen times oversize
     * and read as tiled slabs rather than plate. True pitch is not the answer either: at 30mm
     * the pattern dissolves past two metres and the floor goes flat grey. This sits at 125mm and
     * calls itself heavy floor plate, which survives mipmapping and still reads as metal.
     *
     * 32 cells across a canvas covering 4 units, repeat 14 on the 56-unit foundation. The repeat
     * stays an integer so the plate runs continuously across a chunk boundary instead of being
     * cut mid-tread.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Incinerator floor material.
     */
    static _buildIncineratorFloor(masterNoise) {
        const S = 1024;
        const CELLS = 32;
        const C = S / CELLS;
        const rand = this._seededRandom(52308871);
        const wrap = (x, y, reach, fn) => this._wrapDraw(S, x, y, reach, fn);

        const {canvas, ctx} = this._createContext(S, S);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(S, S);
        bCtx.fillStyle = '#8a8a8a';
        bCtx.fillRect(0, 0, S, S);

        ctx.fillStyle = 'rgb(104, 99, 95)';
        ctx.fillRect(0, 0, S, S);

        // Rolled-steel mottle under everything, so the plate is never a flat field.
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

        // Traffic polish. Rolled up front because the tread pass needs to know where the plate
        // has been walked smooth -- a worn bar is both flatter and brighter than a proud one,
        // and it has to agree in the colour map and the relief.
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

        // The tread pattern. Two parallel bars per cell, alternating 90 degrees cell to cell,
        // which is how floor plate is actually rolled.
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

        // Plate seams. Sheets butt at two-unit intervals; the joint is a dark line with the
        // next sheet standing a fraction proud of it.
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

        // Ash. It collects in the valleys between bars, so it goes down after the treads and
        // the bar crowns get relit over the top of it.
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

        // Scorch. Heat bloom near where the grilles sit, with an oxide rim where the steel got
        // hot enough to colour.
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

        // Pitting, in both channels, so the plate has tooth at arm's length.
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
        this._ditherCanvas(ctx, S, S, rand, 6);

        const map = this._createWrappedTexture(canvas, 14, 14);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 14, 14);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            // 0.05 on the old plate put five centimetres of relief on a tread that stands two
            // millimetres proud. Scaled to match the plate's own 4x, not to the old number.
            bumpScale: 0.006,
            roughness: 0.6,
            // Kept near dielectric for the same reason as the pipes: no envMap in this scene,
            // so metalness only subtracts diffuse and returns nothing.
            metalness: 0.1,
            shadowSide: THREE.DoubleSide
        });
    }

    /**
     * Builds the Incinerator's walls: riveted steel plate, sooted, tempered by the fire it has
     * been standing next to.
     *
     * What this replaces was `rustMat` -- a flat colour with no map at all and a generic pitting
     * bump, which on a four-metre wall reads as stucco rather than metal. Pitting works on a
     * drum because a drum is small and curved; a large flat surface needs structure, and on
     * riveted plate the structure is the courses and the rivet lines.
     *
     * Height-aware, like `_buildClinicWall`. `buildWall` maps v across the full 3-unit wall and
     * the texture is clamped vertically, so the canvas is an absolute elevation: base channel at
     * the floor, three plate courses, a head angle at the ceiling. Nothing here tiles upward,
     * which is the point -- a rivet line that drifted with the tiling would stop reading as a
     * built thing.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {THREE.MeshStandardMaterial} The Incinerator wall material.
     */
    static _buildIncineratorWall(masterNoise) {
        const W = 512, H = 768;
        const UNITS_W = 2.0, UNITS_H = 3.0;
        const PPU = W / UNITS_W;
        const yAt = (u) => H - (u / UNITS_H) * H;
        const rand = this._seededRandom(46113920);
        const wrapX = (x, reach, fn) => {
            const ox = x < reach ? W : (x > W - reach ? -W : 0);
            fn(x);
            if (ox) fn(x + ox);
        };

        const {canvas, ctx} = this._createContext(W, H);
        const {canvas: bumpCanvas, ctx: bCtx} = this._createContext(W, H);
        bCtx.fillStyle = '#8e8e8e';
        bCtx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgb(104, 98, 93)';
        ctx.fillRect(0, 0, W, H);

        // Rolled mottle, so no course is a flat field.
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

        // Temper. Steel that has been near a fire colours by temperature: straw first, then
        // brown, then purple and blue as it gets hotter. It is worst at the bottom because that
        // is where the furnace is, so the bands climb from the floor and fade out by waist
        // height. This is the one thing on the wall that is not grey, and it does most of the
        // work of saying the room has been running.
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

        // 25mm is the honest size for a boiler rivet and it dissolved by three metres, the
        // same way the ceiling perforation did. Scaled to match the plate's own exaggeration:
        // large structural rivets that still read as rivets across the room.
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

        // Course seams: lapped plate, so the upper course stands proud of the one below and
        // throws a shadow onto it, with a double rivet row through the lap.
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

        // Vertical butt straps every metre, riveted both sides.
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

        // Base channel at the floor and a head angle at the ceiling.
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

        // Soot. It leaves the seams and runs up the wall on the convection, so these taper
        // upward rather than down the way water would.
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

        // Rust bleeding down from rivet heads, which is the one thing that does run with gravity.
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
        this._ditherCanvas(ctx, W, H, rand, 7);

        const map = this._createWrappedTexture(canvas, 2, 1, true);
        const bumpMap = this._createWrappedTexture(bumpCanvas, 2, 1, true);
        return new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.009,
            roughness: 0.62,
            metalness: 0.1
        });
    }

    /**
     * Builds the Incinerator's sight glass: an inspection port into the firebox.
     *
     * The sconce was cloning `baseLightMat`, whose map is the office fluorescent troffer
     * diffuser -- cream field, 45-degree prismatic crosshatch, dark bezel. A ceiling diffuser
     * panel bolted to a furnace wall. This is the fixture it should have had.
     *
     * Emission is driven by its own map rather than the colour map. The soot, the mesh and the
     * frame are opaque objects in front of a fire; if they emitted along with it the glass
     * would glow as a flat slab and none of them would read. Only the fire is hot.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {{map: THREE.Texture, emissiveMap: THREE.Texture}} Albedo and emission.
     */
    static _buildSightGlass(masterNoise) {
        const S = 256;
        const rand = this._seededRandom(70455312);
        const {canvas, ctx} = this._createContext(S, S);
        const {canvas: eCanvas, ctx: eCtx} = this._createContext(S, S);
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, S, S);
        ctx.fillStyle = 'rgb(18, 12, 9)';
        ctx.fillRect(0, 0, S, S);

        // The fire, off-centre and deeper on one side, because a firebox is a room and not a
        // lamp. Painted into both channels: the colour map so it reads lit when the fixture is
        // dead, the emissive map so it actually throws light when it is not.
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

        // Coal bed: the fire is not smooth. Brighter licks and darker clinker riding on it.
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

        // Wire-mesh guard. Square reinforcing lattice, in the colour map only -- it is steel in
        // front of the fire, so it occludes rather than glows.
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
        // The mesh casts a shadow onto the fire behind it, so the emission is notched too.
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

        // Heat crazing in the glass itself.
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

        // Soot film, heaviest at the edges and the top where the draught deposits it. Applied
        // to both channels so a sooted corner is genuinely dark rather than merely dark-coloured.
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

        // Frame: the glass is bedded into a heavy rebate, bolted at the corners.
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
        this._ditherCanvas(ctx, S, S, rand, 5);

        return {
            map: this._createWrappedTexture(canvas),
            emissiveMap: this._createWrappedTexture(eCanvas)
        };
    }

    /**
     * Builds the Incinerator's ember grate: slotted cast bars with the coal bed showing between
     * them, part-choked with ash.
     *
     * `emberGrilleMat` was a flat colour and an emissive with no map at all, so a duct grille was
     * a glowing rectangle. The bars have to occlude for it to read as a grate, which means the
     * emission belongs between them and not on them.
     *
     * @param {HTMLCanvasElement} masterNoise - Shared grain overlay.
     * @returns {{map: THREE.Texture, emissiveMap: THREE.Texture}} Albedo and emission.
     */
    static _buildEmberGrate(masterNoise) {
        const S = 256;
        const BARS = 7;
        const P = S / BARS;
        const rand = this._seededRandom(18820644);
        const {canvas, ctx} = this._createContext(S, S);
        const {canvas: eCanvas, ctx: eCtx} = this._createContext(S, S);

        // Coal bed first: this is what shows through the slots.
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

        // Cast bars across the opening. Opaque in both channels -- a bar in front of a fire is
        // a silhouette, and the emissive map is what makes that true rather than implied.
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

        // Ash choking the lower slots, and soot on the bar tops.
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
        this._ditherCanvas(ctx, S, S, rand, 5);

        return {
            map: this._createWrappedTexture(canvas),
            emissiveMap: this._createWrappedTexture(eCanvas)
        };
    }

    static _buildExtendedAssets(masterNoise) {
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
        const btc = document.createElement('canvas');
        btc.width = btc.height = 256;
        const btx = btc.getContext('2d');
        btx.fillStyle = '#b3aea4';
        btx.fillRect(0, 0, 256, 256);
        for (let ty = 0; ty < 2; ty++) {
            for (let tx = 0; tx < 2; tx++) {
                const sh = 172 + Math.floor(Math.random() * 14);
                btx.fillStyle = `rgb(${sh},${sh - 3},${sh - 10})`;
                btx.fillRect(tx * 128 + 2, ty * 128 + 2, 124, 124);
            }
        }
        for (let i = 0; i < 40; i++) {
            btx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
            btx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 40, 1);
        }
        btx.strokeStyle = '#8d887e';
        btx.lineWidth = 3;
        btx.strokeRect(0, 0, 256, 256);
        btx.beginPath();
        btx.moveTo(128, 0);
        btx.lineTo(128, 256);
        btx.stroke();
        btx.beginPath();
        btx.moveTo(0, 128);
        btx.lineTo(256, 128);
        btx.stroke();
        const btTex = new THREE.CanvasTexture(btc);
        btTex.wrapS = btTex.wrapT = THREE.RepeatWrapping;
        btTex.repeat.set(14, 14);
        const boardTileMat = new THREE.MeshStandardMaterial({map: btTex, roughness: 0.6, metalness: 0.1});
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xbfe3ef, transparent: true, opacity: 0.22,
            roughness: 0.08, metalness: 0.1, depthWrite: false
        });
        const bkc = document.createElement('canvas');
        bkc.width = 256;
        bkc.height = 128;
        const bkx = bkc.getContext('2d');
        bkx.fillStyle = '#17130f';
        bkx.fillRect(0, 0, 256, 128);
        const spinePalette = ['#6b3a34', '#3e4a63', '#5a5e46', '#7a6748', '#54504e', '#463b52', '#70543a', '#33413e'];
        let spineX = 0;
        while (spineX < 252) {
            const sw = 6 + Math.floor(Math.random() * 9);
            if (Math.random() > 0.08) {
                const sh = 96 + Math.floor(Math.random() * 28);
                bkx.fillStyle = spinePalette[Math.floor(Math.random() * spinePalette.length)];
                bkx.fillRect(spineX, 128 - sh, sw, sh);
                bkx.fillStyle = 'rgba(255,255,255,0.08)';
                bkx.fillRect(spineX, 128 - sh, 1, sh);
                bkx.fillStyle = 'rgba(0,0,0,0.35)';
                bkx.fillRect(spineX + sw - 1, 128 - sh, 1, sh);
                if (Math.random() > 0.5) {
                    bkx.fillStyle = 'rgba(210,190,140,0.35)';
                    bkx.fillRect(spineX + 1, 128 - sh + 8 + Math.floor(Math.random() * 20), sw - 2, 2);
                }
            }
            spineX += sw + 1;
        }
        const bkTex = new THREE.CanvasTexture(bkc);
        bkTex.wrapS = bkTex.wrapT = THREE.RepeatWrapping;
        bkTex.repeat.set(3, 1);
        const bookRowMat = new THREE.MeshStandardMaterial({map: bkTex, roughness: 0.9, metalness: 0.0});
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
        const coneCanvas = document.createElement('canvas');
        coneCanvas.width = 256;
        coneCanvas.height = 256;
        const cCtx = coneCanvas.getContext('2d');
        cCtx.fillStyle = '#ff5500';
        cCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 300; i++) {
            cCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
            cCtx.beginPath();
            cCtx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 4, 0, Math.PI * 2);
            cCtx.fill();
        }
        const coneBaseCanvas = document.createElement('canvas');
        coneBaseCanvas.width = 256;
        coneBaseCanvas.height = 256;
        coneBaseCanvas.getContext('2d').drawImage(coneCanvas, 0, 0);
        cCtx.fillStyle = '#eeeeee';
        cCtx.fillRect(0, 60, 256, 35);
        cCtx.fillRect(0, 115, 256, 35);
        for (let i = 0; i < 150; i++) {
            cCtx.fillStyle = `rgba(50,30,10,${Math.random() * 0.2})`;
            cCtx.fillRect(Math.random() * 256, 50 + Math.random() * 110, Math.random() * 20, 2 + Math.random() * 4);
        }
        const coneTex = new THREE.CanvasTexture(coneCanvas);
        const cautionConeMat = new THREE.MeshStandardMaterial({
            map: coneTex, roughness: 0.9, metalness: 0.1
        });
        const coneBaseTex = new THREE.CanvasTexture(coneBaseCanvas);
        const cautionConeBaseMat = new THREE.MeshStandardMaterial({
            map: coneBaseTex, roughness: 0.9, metalness: 0.1
        });
        const valveCanvas = document.createElement('canvas');
        valveCanvas.width = 256;
        valveCanvas.height = 256;
        const vCtx = valveCanvas.getContext('2d');
        vCtx.fillStyle = '#992211';
        vCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 300; i++) {
            vCtx.fillStyle = '#222222';
            vCtx.beginPath();
            vCtx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 4, 0, Math.PI * 2);
            vCtx.fill();
            vCtx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 10, Math.random() * 10);
        }
        const valveTex = new THREE.CanvasTexture(valveCanvas);
        const valveMat = new THREE.MeshStandardMaterial({
            map: valveTex, roughness: 0.7, metalness: 0.3
        });
        return {
            diamondPlateMat, incinFloorMat: this._buildIncineratorFloor(masterNoise),
            incinWallMat: this._buildIncineratorWall(masterNoise),
            ...(() => {
                const sg = this._buildSightGlass(masterNoise);
                const gr = this._buildEmberGrate(masterNoise);
                // emissiveIntensity is left at 1 and driven by LumenGrid, which also reads
                // `material.emissive` for the light's colour -- so the emissive tint has to stay
                // a warm fire colour rather than white, or the sconce would light the room grey.
                return {
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
            })(),
            incinCeilingMat, boardTileMat, glassMat, bookRowMat,
            fileBoxMat, movingBoxMat, bananaBoxMat, parcelBoxMat, cartonMats,
            foliageMat, farVoidMat,
            cautionConeMat, cautionConeBaseMat, valveMat
        };
    }

    static generatePegboardTexture() {
        const {canvas, ctx} = this._createContext(512, 512);

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
        
        return this._createWrappedTexture(canvas, 1, 1);
    }

    /**
     * Yields a single tick back to the browser's event loop. Used to break up the long chain
     * of synchronous canvas drawing in `generateAssets` so a slow boot doesn't present as one
     * unbroken multi-hundred-millisecond freeze -- the browser gets a chance to paint (e.g. the
     * spawn flash-overlay `Environment.setup()` raises before calling this) and stay responsive
     * to input between asset groups, the same way `processChunkQueue` yields between chunks.
     */
    static _yield() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    static async generateAssets() {
        const masterNoise = this._generateMasterNoise();
        const extras = {
            pegboardTex: this.generatePegboardTexture(),
        };
        const structAssets = this._buildStructuralAssets(masterNoise);
        await this._yield();
        const surfaceAssets = this._buildSurfaceAssets(masterNoise);
        await this._yield();
        const organicAssets = this._buildOrganicAssets(masterNoise);
        await this._yield();
        const techAssets = this._buildTechAssets(masterNoise);
        await this._yield();
        const hazardAssets = this._buildHazardAndMiscAssets(masterNoise);
        await this._yield();
        const annexAssets = this._buildAnnexAssets(masterNoise);
        await this._yield();
        const impoundAssets = this._buildImpoundAssets(masterNoise);
        await this._yield();
        const boardroomAssets = this._buildBoardroomAssets(masterNoise);
        await this._yield();
        const atriumAssets = this._buildAtriumAssets(masterNoise);
        await this._yield();
        const maintenanceAssets = this._buildMaintenanceAssets(masterNoise);
        await this._yield();
        const archiveAssets = this._buildArchiveAssets(masterNoise);
        await this._yield();
        const checkpointAssets = this._buildCheckpointAssets(masterNoise);
        await this._yield();
        const extendedAssets = this._buildExtendedAssets(masterNoise);
        const assets = {
            ...extras,
            ...structAssets,
            ...surfaceAssets,
            ...organicAssets,
            ...techAssets,
            ...hazardAssets,
            ...annexAssets,
            ...impoundAssets,
            ...boardroomAssets,
            ...atriumAssets,
            ...maintenanceAssets,
            ...archiveAssets,
            ...checkpointAssets,
            ...extendedAssets
        };
        const markSRGB = (texture) => {
            if ('colorSpace' in texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
            } else {
                texture.encoding = THREE.sRGBEncoding;
            }
        };
        // A texture handed back on its own gets marked sRGB, which is right for a colour map and
        // wrong for relief: three would then decode the bump through the sRGB curve and the
        // heights would come out non-linear. The bumpMap slot below already knows not to, but a
        // bump canvas returned as a bare asset -- ceilingBumpTexture, corrosionBumpTexture --
        // has no slot to be found in, so it goes by name.
        const isNonColorData = (key) => /Bump|Rough|Normal|Displacement/.test(key);
        const applyOpt = (item, key) => {
            if (item && item.isTexture) {
                item.anisotropy = 16;
                if (!isNonColorData(key || '')) markSRGB(item);
            }
            if (item && item.map && item.map.isTexture) {
                item.map.anisotropy = 16;
                markSRGB(item.map);
            }
            if (item && item.emissiveMap && item.emissiveMap.isTexture) {
                item.emissiveMap.anisotropy = 16;
                markSRGB(item.emissiveMap);
            }
            for (const slot of ['bumpMap', 'roughnessMap']) {
                if (item && item[slot] && item[slot].isTexture) {
                    item[slot].anisotropy = 16;
                }
            }
        };
        Object.entries(assets).forEach(([key, item]) => {
            if (Array.isArray(item)) {
                item.forEach(sub => applyOpt(sub, key));
            } else {
                applyOpt(item, key);
            }
        });
        return assets;
    }
}