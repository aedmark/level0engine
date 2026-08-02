import TextureMechanics from '../TextureMechanics.js';
import IncineratorTextures from './IncineratorTextures.js';

export default class ExtendedTextures {
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
            diamondPlateMat, incinFloorMat: IncineratorTextures._buildIncineratorFloor(masterNoise),
            incinWallMat: IncineratorTextures._buildIncineratorWall(masterNoise),
            ...(() => {
                const sg = IncineratorTextures._buildSightGlass(masterNoise);
                const gr = IncineratorTextures._buildEmberGrate(masterNoise);
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
}
