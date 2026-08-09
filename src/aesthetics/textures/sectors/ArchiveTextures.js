/**
 * [ROLE] Generates specialized procedural textures specific to the Archive sector.
 * [WHY] Sector-specific aesthetics require unique material generation without bloating the global texture pools.
 * [STATE] Stateless factory module.
 * [DEPENDS] Uses TextureMechanics and Canvas API.
 */
import TextureMechanics from '../TextureMechanics.js';

export default class ArchiveTextures {
    static _buildArchiveAssets(masterNoise) {
        const {canvas: wallCanvas, ctx: wallCtx} = TextureMechanics._createContext(512, 512);
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
        const archiveWallTexture = TextureMechanics._createWrappedTexture(wallCanvas, 4, 1, true);
        const archiveWallMat = new THREE.MeshStandardMaterial({
            map: archiveWallTexture,
            roughness: 0.95,
            metalness: 0.0,
            bumpMap: archiveWallTexture,
            bumpScale: 0.015
        });
        const {canvas: floorCanvas, ctx: floorCtx} = TextureMechanics._createContext(256, 256);
        const tileA = '#ddceA2', tileB = '#8a3a2e';
        const tiles = 8, tileSize = 256 / tiles;
        for (let ty = 0; ty < tiles; ty++) {
            for (let tx = 0; tx < tiles; tx++) {
                floorCtx.fillStyle = (tx + ty) % 2 === 0 ? tileA : tileB;
                floorCtx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
            }
        }
        const {canvas: bumpCanvas, ctx: bCtx} = TextureMechanics._createContext(256, 256);
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, 0, 256, 256);

        const {canvas: roughCanvas, ctx: rCtx} = TextureMechanics._createContext(256, 256);
        rCtx.fillStyle = 'rgb(166, 166, 166)';
        rCtx.fillRect(0, 0, 256, 256);

        const rand = TextureMechanics._seededRandom(81723);
        const wrapped = (x, y, reach, fn) => TextureMechanics._wrapDraw(256, x, y, reach, fn);

        floorCtx.globalAlpha = 0.18;
        floorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        floorCtx.globalAlpha = 1.0;
        
        bCtx.globalAlpha = 0.18;
        bCtx.drawImage(masterNoise, 0, 0, 256, 256);
        bCtx.globalAlpha = 1.0;

        floorCtx.lineCap = 'round';
        bCtx.lineCap = 'round';
        rCtx.lineCap = 'round';

        for (let s = 0; s < 8; s++) {
            const cx = rand() * 256, cy = rand() * 256;
            const baseR = 8 + rand() * 23;
            const arcs = 1 + Math.floor(rand() * 2);
            for (let a = 0; a < arcs; a++) {
                const r = baseR + a * (1.2 + rand() * 1.8);
                const start = rand() * Math.PI * 2;
                const sweep = 0.7 + rand() * 2.2;
                wrapped(cx, cy, r + 6, (px, py) => {
                    const w = 0.5 + rand() * 0.6;
                    floorCtx.strokeStyle = `rgba(30, 25, 20, ${0.03 + rand() * 0.05})`;
                    floorCtx.lineWidth = w;
                    floorCtx.beginPath();
                    floorCtx.arc(px, py, r, start, start + sweep);
                    floorCtx.stroke();
                    rCtx.strokeStyle = `rgba(80, 80, 80, ${0.2 + rand() * 0.2})`;
                    rCtx.lineWidth = w + 0.3;
                    rCtx.beginPath();
                    rCtx.arc(px, py, r, start, start + sweep);
                    rCtx.stroke();
                });
            }
        }

        for (let t = 0; t < 4; t++) {
            const x = rand() * 256, y = rand() * 256;
            const angle = rand() * Math.PI * 2;
            const len = 30 + rand() * 75;
            const gap = 6 + rand() * 8;
            const nx = -Math.sin(angle) * gap, ny = Math.cos(angle) * gap;
            for (const [sx, sy] of [[0, 0], [nx, ny]]) {
                wrapped(x + sx, y + sy, len + 30, (px, py) => {
                    const w = 0.5 + rand() * 0.7;
                    floorCtx.strokeStyle = `rgba(30, 25, 20, ${0.03 + rand() * 0.04})`;
                    floorCtx.lineWidth = w;
                    floorCtx.beginPath();
                    floorCtx.moveTo(px, py);
                    floorCtx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
                    floorCtx.stroke();
                    rCtx.strokeStyle = `rgba(80, 80, 80, ${0.2 + rand() * 0.2})`;
                    rCtx.lineWidth = w + 0.3;
                    rCtx.beginPath();
                    rCtx.moveTo(px, py);
                    rCtx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
                    rCtx.stroke();
                });
            }
        }

        for (let c = 0; c < 5; c++) {
            const cx = rand() * 256, cy = rand() * 256;
            const marks = 1 + Math.floor(rand() * 2);
            for (let m = 0; m < marks; m++) {
                const x = cx + (rand() - 0.5) * 40, y = cy + (rand() - 0.5) * 40;
                const len = 5 + rand() * 15;
                const angle = rand() * Math.PI * 2;
                const bow = (rand() - 0.5) * 10;
                wrapped(x, y, len + 24, (px, py) => {
                    const w = 0.6 + rand() * 1.0;
                    floorCtx.strokeStyle = `rgba(20, 15, 10, ${0.04 + rand() * 0.05})`;
                    floorCtx.lineWidth = w;
                    floorCtx.beginPath();
                    floorCtx.moveTo(px, py);
                    floorCtx.quadraticCurveTo(
                        px + Math.cos(angle) * len * 0.5 - Math.sin(angle) * bow,
                        py + Math.sin(angle) * len * 0.5 + Math.cos(angle) * bow,
                        px + Math.cos(angle) * len,
                        py + Math.sin(angle) * len
                    );
                    floorCtx.stroke();
                    rCtx.strokeStyle = `rgba(70, 70, 70, ${0.25 + rand() * 0.2})`;
                    rCtx.lineWidth = w + 0.4;
                    rCtx.beginPath();
                    rCtx.moveTo(px, py);
                    rCtx.quadraticCurveTo(
                        px + Math.cos(angle) * len * 0.5 - Math.sin(angle) * bow,
                        py + Math.sin(angle) * len * 0.5 + Math.cos(angle) * bow,
                        px + Math.cos(angle) * len,
                        py + Math.sin(angle) * len
                    );
                    rCtx.stroke();
                });
            }
        }

        floorCtx.strokeStyle = 'rgba(0,0,0,0.2)';
        floorCtx.lineWidth = 1;
        bCtx.strokeStyle = '#9a9a9a';
        bCtx.lineWidth = 1.5;
        rCtx.strokeStyle = '#b0b0b0';
        rCtx.lineWidth = 2.0;

        for (let t = 0; t <= tiles; t++) {
            floorCtx.beginPath();
            floorCtx.moveTo(0, t * tileSize);
            floorCtx.lineTo(256, t * tileSize);
            floorCtx.stroke();
            floorCtx.beginPath();
            floorCtx.moveTo(t * tileSize, 0);
            floorCtx.lineTo(t * tileSize, 256);
            floorCtx.stroke();

            bCtx.beginPath();
            bCtx.moveTo(0, t * tileSize);
            bCtx.lineTo(256, t * tileSize);
            bCtx.stroke();
            bCtx.beginPath();
            bCtx.moveTo(t * tileSize, 0);
            bCtx.lineTo(t * tileSize, 256);
            bCtx.stroke();

            rCtx.beginPath();
            rCtx.moveTo(0, t * tileSize);
            rCtx.lineTo(256, t * tileSize);
            rCtx.stroke();
            rCtx.beginPath();
            rCtx.moveTo(t * tileSize, 0);
            rCtx.lineTo(t * tileSize, 256);
            rCtx.stroke();
        }

        const archiveFloorTexture = TextureMechanics._createWrappedTexture(floorCanvas, 14, 14);
        const archiveFloorBump = TextureMechanics._createWrappedTexture(bumpCanvas, 14, 14);
        const archiveFloorRough = TextureMechanics._createWrappedTexture(roughCanvas, 14, 14);

        const archiveFloorMat = new THREE.MeshStandardMaterial({
            map: archiveFloorTexture,
            roughnessMap: archiveFloorRough,
            roughness: 1.0,
            metalness: 0.05,
            bumpMap: archiveFloorBump,
            bumpScale: 0.015
        });
        const {canvas: pCanvas, ctx: pCtx} = TextureMechanics._createContext(64, 64);
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
        const {canvas: cCanvas, ctx: cCtx} = TextureMechanics._createContext(64, 64, false);
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
        const {canvas: pageCanvas, ctx: pageCtx} = TextureMechanics._createContext(64, 64);
        pageCtx.fillStyle = '#e8e5df';
        pageCtx.fillRect(0, 0, 64, 64);
        pageCtx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 64; i += 2) pageCtx.fillRect(0, i, 64, 0.5);
        const pageTex = new THREE.CanvasTexture(pageCanvas);
        const pageMat = new THREE.MeshStandardMaterial({map: pageTex, roughness: 0.9});
        const coverColors = ['#753434', '#344a75', '#34754a', '#756034', '#555555'];
        const bookMatSets = coverColors.map(color => {
            const {canvas: covCanvas, ctx: covCtx} = TextureMechanics._createContext(64, 64);
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
        const bookRowSpineMat = new THREE.MeshStandardMaterial({map: bkTex, roughness: 0.9, metalness: 0.0});

        const endCanvas = document.createElement('canvas');
        endCanvas.width = 64;
        endCanvas.height = 128;
        const endCtx = endCanvas.getContext('2d');
        endCtx.fillStyle = '#2a2624';
        endCtx.fillRect(0, 0, 64, 128);
        endCtx.globalAlpha = 0.3;
        endCtx.drawImage(masterNoise, 0, 0, 64, 128);
        endCtx.globalAlpha = 1.0;
        endCtx.fillStyle = '#1e1b19';
        endCtx.fillRect(4, 4, 56, 120);
        const endTex = new THREE.CanvasTexture(endCanvas);
        const bookRowEndMat = new THREE.MeshStandardMaterial({map: endTex, roughness: 0.8, emissive: 0x1E1B19, emissiveIntensity: 0.2},);

        const topCanvas = document.createElement('canvas');
        topCanvas.width = 256;
        topCanvas.height = 64;
        const topCtx = topCanvas.getContext('2d');
        topCtx.fillStyle = '#dcd8d0';
        topCtx.fillRect(0, 0, 256, 64);
        topCtx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 256; i += 4) {
            topCtx.fillRect(i, 0, 1, 64);
        }
        const topTex = new THREE.CanvasTexture(topCanvas);
        topTex.wrapS = topTex.wrapT = THREE.RepeatWrapping;
        topTex.repeat.set(3, 1);
        const bookRowTopMat = new THREE.MeshStandardMaterial({map: topTex, roughness: 1.0});

        const bookRowMat = [
            bookRowEndMat,
            bookRowEndMat,
            bookRowTopMat,
            bookRowTopMat,
            bookRowSpineMat,
            bookRowSpineMat
        ];
        return {
            archiveWallMat, archiveFloorMat, paperMat, paperGeo, coffeeStainMat, coffeeStainGeo, bookMatSets,
            bookRowMat
        };
    }
}
