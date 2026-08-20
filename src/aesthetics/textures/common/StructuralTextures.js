import TextureMechanics from '../TextureMechanics.js';
import SurfaceTextures from './SurfaceTextures.js';
import PropTextures from './PropTextures.js';

export default class StructuralTextures {
    static _buildStructuralAssets(masterNoise) {
        const {canvas: wallCanvas, bumpCanvas: wallBumpCanvas} = SurfaceTextures._buildWallpaper(masterNoise);
        const wallCtx = wallCanvas.getContext('2d');
        const wallBumpCtx = wallBumpCanvas.getContext('2d');
        const {canvas: headerCanvas, ctx: headerCtx} = TextureMechanics._createContext(512, 512);
        headerCtx.drawImage(wallCanvas, 0, 0);
        const headerTexture = TextureMechanics._createWrappedTexture(headerCanvas, 4, 0.1);
        headerTexture.offset.set(0, 0.9);
        const headerMat = new THREE.MeshStandardMaterial({
            map: headerTexture,
            roughness: 0.8,
            bumpMap: headerTexture,
            bumpScale: 0.01
        });
        wallCtx.fillStyle = 'rgba(0,0,0,0.15)';
        wallCtx.fillRect(255, 0, 2, 512);
        wallBumpCtx.fillStyle = 'rgba(40,40,40,0.6)';
        wallBumpCtx.fillRect(255, 0, 2, 512);
        const wallTexture = TextureMechanics._createWrappedTexture(wallCanvas, 4, 1, true);
        const wallBumpTexture = TextureMechanics._createWrappedTexture(wallBumpCanvas, 4, 1, true);
        const baseboardMat = new THREE.MeshStandardMaterial({
            color: 0x4c3f25,
            roughness: 0.65,
            metalness: 0.05
        });
        baseboardMat.userData.noShadow = true;
        const baseboardTrimMat = new THREE.MeshStandardMaterial({
            color: 0x3b2e17,
            roughness: 0.55,
            metalness: 0.05
        });
        baseboardTrimMat.userData.noShadow = true;
        const {canvas: structCanvas, ctx: structCtx} = TextureMechanics._createContext(512, 512);
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
        const structTexture = TextureMechanics._createWrappedTexture(structCanvas, 2, 2);
        const structMat = new THREE.MeshStandardMaterial({
            map: structTexture,
            roughness: 1.0,
            bumpMap: structTexture,
            bumpScale: 0.02
        });
        const {canvas: woodCanvas, bumpCanvas: woodBumpCanvas} = PropTextures._buildWood(masterNoise);
        const woodTexture = TextureMechanics._createWrappedTexture(woodCanvas);
        const woodBumpTexture = TextureMechanics._createWrappedTexture(woodBumpCanvas);
        const woodMat = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.74,
            bumpMap: woodBumpTexture,
            bumpScale: 0.015
        });
        const {canvas: doorCanvas, bumpCanvas: doorBumpCanvas} =
            PropTextures._buildDoor(woodCanvas, woodBumpCanvas, masterNoise);
        const doorTexture = new THREE.CanvasTexture(doorCanvas);
        const doorBumpTexture = new THREE.CanvasTexture(doorBumpCanvas);
        const mirror = (src) => {
            const {canvas: out, ctx: outCtx} = TextureMechanics._createContext(256, 512);
            outCtx.translate(256, 0);
            outCtx.scale(-1, 1);
            outCtx.drawImage(src, 0, 0);
            return out;
        };
        const doorBackTexture = new THREE.CanvasTexture(mirror(doorCanvas));
        const doorBackBumpTexture = new THREE.CanvasTexture(mirror(doorBumpCanvas));
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
        
        const subwayTileMats = StructuralTextures._buildSubwayTiles(masterNoise);

        return {headerMat, wallTexture, wallBumpTexture, structMat, woodMat, doorMat, baseboardMat, baseboardTrimMat, subwayTileMats};
    }

    static _buildSubwayTiles(masterNoise) {
        const mats = [];
        for (let v = 0; v < 4; v++) {
            const rand = TextureMechanics._seededRandom(81230 + v * 99);
            const {canvas, ctx} = TextureMechanics._createContext(512, 512);
            const {canvas: bumpCanvas, ctx: bctx} = TextureMechanics._createContext(512, 512);

            ctx.fillStyle = '#b0b0b0'; 
            ctx.fillRect(0, 0, 512, 512);
            bctx.fillStyle = '#404040'; 
            bctx.fillRect(0, 0, 512, 512);

            const cols = 4;
            const rows = 8;
            const tw = 512 / cols;
            const th = 512 / rows;
            const gap = 4;

            for (let r = 0; r < rows; r++) {
                const offset = (r % 2 === 0) ? 0 : tw / 2;
                for (let c = -1; c <= cols; c++) {
                    const x = c * tw + offset;
                    const y = r * th;
                    
                    const shade = 240 - rand() * 20;
                    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
                    ctx.fillRect(x + gap/2, y + gap/2, tw - gap, th - gap);

                    bctx.fillStyle = '#e0e0e0';
                    bctx.fillRect(x + gap/2, y + gap/2, tw - gap, th - gap);
                    
                    ctx.fillStyle = `rgba(150, 140, 120, ${rand() * 0.15})`;
                    ctx.fillRect(x + gap/2, y + gap/2, tw - gap, th - gap);
                }
            }

            ctx.globalAlpha = 0.1;
            ctx.drawImage(masterNoise, 0, 0, 512, 512);
            ctx.globalAlpha = 1.0;
            
            const gx = rand() * 512, gy = rand() * 512, gr = 100 + rand() * 200;
            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
            grad.addColorStop(0, `rgba(80, 70, 50, ${0.1 + rand() * 0.1})`);
            grad.addColorStop(1, 'rgba(80, 70, 50, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);
            
            TextureMechanics._ditherCanvas(ctx, 512, 512, rand, 4);

            const tex = TextureMechanics._createWrappedTexture(canvas, 4, 4);
            const bumpTex = TextureMechanics._createWrappedTexture(bumpCanvas, 4, 4);

            mats.push(new THREE.MeshStandardMaterial({
                map: tex,
                bumpMap: bumpTex,
                bumpScale: 0.02,
                roughness: 0.2 + rand() * 0.1,
                metalness: 0.05
            }));
        }
        return mats;
    }
}
