/**
 * [ROLE] Generates foundational floor and surface materials (carpet, tiles, concrete, vents).
 * [WHY] Large unbroken surfaces need high-resolution, non-repeating noise patterns to look realistic.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API.
 */
import TextureMechanics from '../TextureMechanics.js';
import ClinicTextures from '../sectors/ClinicTextures.js';
import AtriumTextures from '../sectors/AtriumTextures.js';

export default class SurfaceTextures {
    static _buildSurfaceAssets(masterNoise) {
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
        const {canvas: ceilingCanvas, bumpCanvas: ceilingBumpCanvas} = this._buildNormalCeiling(masterNoise);
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
            metalness: 0.6,
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
            atriumFloorMat, clinicFloorMat, clinicCeilingMat, clinicWallMat, clinicRailMat
        };
    }

    static _buildNormalCeiling(masterNoise) {
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
