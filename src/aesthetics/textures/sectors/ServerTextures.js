import TextureMechanics from '../TextureMechanics.js';

export default class ServerTextures {
    static _buildServerAssets(masterNoise) {
        const {canvas: sFloorCanvas, ctx: sFloorCtx} = TextureMechanics._createContext(256, 256);
        sFloorCtx.fillStyle = '#111111';
        sFloorCtx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 128) {
            for (let y = 0; y < 256; y += 128) {
                sFloorCtx.fillStyle = '#444444';
                sFloorCtx.fillRect(x + 2, y + 2, 124, 124);
                sFloorCtx.fillStyle = '#555555';
                sFloorCtx.fillRect(x + 2, y + 2, 122, 2);
                sFloorCtx.fillRect(x + 2, y + 2, 2, 122);
                sFloorCtx.fillStyle = '#333333';
                sFloorCtx.fillRect(x + 124, y + 2, 2, 124);
                sFloorCtx.fillRect(x + 2, y + 124, 124, 2);

                sFloorCtx.fillStyle = '#111111';
                for (let px = x + 10; px < x + 120; px += 6) {
                    for (let py = y + 10; py < y + 120; py += 6) {
                        sFloorCtx.fillRect(px, py, 3, 3);
                    }
                }
            }
        }
        sFloorCtx.globalAlpha = 0.15;
        sFloorCtx.drawImage(masterNoise, 0, 0, 256, 256);
        sFloorCtx.globalAlpha = 1.0;
        const serverFloorTexture = TextureMechanics._createWrappedTexture(sFloorCanvas, 1, 1);
        const serverFloorMat = new THREE.MeshStandardMaterial({
            map: serverFloorTexture,
            emissiveMap: serverFloorTexture,
            emissive: 0xffffff,
            emissiveIntensity: 0.4,
            roughness: 0.8,
            metalness: 0.4,
            bumpMap: serverFloorTexture,
            bumpScale: 0.015
        });

        const {canvas: sCeilCanvas, ctx: sCeilCtx} = TextureMechanics._createContext(256, 256);
        sCeilCtx.fillStyle = '#222222';
        sCeilCtx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 64) {
            for (let y = 0; y < 256; y += 128) {
                sCeilCtx.fillStyle = '#666666';
                sCeilCtx.fillRect(x + 2, y + 2, 60, 124);
                sCeilCtx.fillStyle = '#111111';
                for (let sy = y + 10; sy < y + 118; sy += 8) {
                    sCeilCtx.fillRect(x + 10, sy, 44, 4);
                }
            }
        }
        sCeilCtx.globalAlpha = 0.2;
        sCeilCtx.drawImage(masterNoise, 0, 0, 256, 256);
        sCeilCtx.globalAlpha = 1.0;
        const serverCeilingTexture = TextureMechanics._createWrappedTexture(sCeilCanvas, 1, 1);
        const serverCeilingMat = new THREE.MeshStandardMaterial({
            map: serverCeilingTexture,
            roughness: 0.95,
            metalness: 0.1,
            bumpMap: serverCeilingTexture,
            bumpScale: 0.01,
            emissiveMap: serverCeilingTexture,
            emissive: 0x4a5565,
            emissiveIntensity: 0.4
        });

        return { serverFloorMat, serverCeilingMat };
    }
}
