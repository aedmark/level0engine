// MaterialLibrary.js
// LEVEL 0 MATERIAL & GEOMETRY FACTORY

export default class MaterialLibrary {
    static injectMaterials(env) {
        if (env.sharedWallGeo) return;
            env.sharedWallGeo = new THREE.BoxGeometry(env.cellSize + 0.02, 3, env.cellSize + 0.02);
            env.sharedWallMat = new THREE.MeshStandardMaterial({
                map: env.wallTexture,
                color: 0xffffff,
                roughness: 0.75,
                metalness: 0.05,
                bumpMap: env.wallTexture,
                bumpScale: 0.010
            });
            env.sharedPanelGeo = new THREE.BoxGeometry(0.98, 0.05, 1.98);
            env.pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, env.cellSize, 8);
            env.pipeGeo.rotateZ(Math.PI / 2);
            env.pipeJointGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8);
            env.pipeJointGeo.rotateZ(Math.PI / 2);
            env.pipeJunctionGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
            env.pipeMountGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
            env.vPipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8);
            env.rustMat = new THREE.MeshStandardMaterial({
                color: 0x4a433a,
                emissive: 0x111111,
                roughness: 0.8,
                metalness: 0.3,
                bumpMap: env.structMat.map,
                bumpScale: 0.03
            });
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
            env.diamondPlateMat = new THREE.MeshStandardMaterial({
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
            env.incinCeilingMat = new THREE.MeshStandardMaterial({
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
            env.boardTileMat = new THREE.MeshStandardMaterial({map: btTex, roughness: 0.35, metalness: 0.1});
            env.glassMat = new THREE.MeshStandardMaterial({
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
            env.bookRowMat = new THREE.MeshStandardMaterial({map: bkTex, roughness: 0.9, metalness: 0.0});
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
            env.fileBoxMat = new THREE.MeshStandardMaterial({map: fbTex, roughness: 0.85, metalness: 0.0});
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
            env.movingBoxMat = new THREE.MeshStandardMaterial({map: mvTex, roughness: 0.85, metalness: 0.0});
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
            env.bananaBoxMat = new THREE.MeshStandardMaterial({map: bnTex, roughness: 0.85, metalness: 0.0});
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
            env.parcelBoxMat = new THREE.MeshStandardMaterial({map: pcTex, roughness: 0.85, metalness: 0.0});
            env.cartonMats = [env.fileBoxMat, env.movingBoxMat, env.bananaBoxMat, env.parcelBoxMat];
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
            env.foliageMat = new THREE.MeshStandardMaterial({map: flTex, roughness: 0.95, metalness: 0.0});
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
            env.farVoidMat = new THREE.MeshBasicMaterial({map: fvTex});
            env.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
            env.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
            env.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            env.couchSeatGeo = new THREE.BoxGeometry(2.2, 0.3, 0.85);
            env.couchBackGeo = new THREE.BoxGeometry(2.2, 0.7, 0.18);
            env.couchArmGeo = new THREE.BoxGeometry(0.18, 0.55, 0.85);
            env.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
            env.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
            env.wallVentMat = env.ventMat.clone();
            env.wallVentMat.map = env.ventMat.map.clone();
            env.wallVentMat.map.repeat.set(1, 1);
            env.serverFloorMat = env.ventMat.clone();
            env.serverFloorMat.map = env.ventMat.map.clone();
            env.serverFloorMat.map.repeat.set(64, 32);
            env.breakerBaseGeo = new THREE.BoxGeometry(0.6, 0.8, 0.20);
            env.breakerDoorGeo = new THREE.BoxGeometry(0.6, 0.8, 0.05);
            env.breakerDoorGeo.translate(0.3, 0, 0);
            env.crtScreenMat = new THREE.MeshStandardMaterial({
                color: 0xffb000,
                emissive: 0xffb000,
                emissiveIntensity: 0.8,
                roughness: 0.2
            });
            env.documentMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.0
            });
            env.terminalBodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
            env.documentGeo = new THREE.PlaneGeometry(0.2, 0.3);
            env.documentGeo.rotateX(-Math.PI / 2);
            env.geoCache = new Map();
            env.almondPrefab = new THREE.Group();
            const aBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16);
            const aNeckGeo = new THREE.CylinderGeometry(0.012, 0.035, 0.05, 16);
            const aCapGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.015, 12);
            const aBody = new THREE.Mesh(aBodyGeo, env.almondMat);
            aBody.position.y = 0.06;
            const aNeck = new THREE.Mesh(aNeckGeo, env.clinicMat);
            aNeck.position.y = 0.12 + 0.025;
            const aCap = new THREE.Mesh(aCapGeo, env.metalMat);
            aCap.position.y = 0.12 + 0.05 + 0.0075;
            env.almondPrefab.add(aBody, aNeck, aCap);
            env.batteryPrefab = new THREE.Group();
            const bBodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16);
            const bRimGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.015, 16);
            const bTermGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12);
            const bBody = new THREE.Mesh(bBodyGeo, env.hazardMat);
            bBody.position.y = 0.08;
            const bTopRim = new THREE.Mesh(bRimGeo, env.metalMat);
            bTopRim.position.y = 0.16 - 0.0075;
            const bBotRim = new THREE.Mesh(bRimGeo, env.metalMat);
            bBotRim.position.y = 0.0075;
            const bTerm = new THREE.Mesh(bTermGeo, env.metalMat);
            bTerm.position.y = 0.16 + 0.01;
            env.batteryPrefab.add(bBody, bTopRim, bBotRim, bTerm);
            env.observerMat = new THREE.MeshBasicMaterial({color: 0x010101, transparent: true, opacity: 0.85});
            env.observerGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.9, 8);
            env.observers = [];
            const cpCanvas = document.createElement('canvas');
            cpCanvas.width = cpCanvas.height = 256;
            const cpc = cpCanvas.getContext('2d');
            cpc.fillStyle = '#8a8d8f';
            cpc.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 400; i++) {
                cpc.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
                cpc.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }
            const cpTex = new THREE.CanvasTexture(cpCanvas);
            cpTex.wrapS = cpTex.wrapT = THREE.RepeatWrapping;
            cpTex.repeat.set(15, 15);
            env.checkpointFloorMat = new THREE.MeshStandardMaterial({
                map: cpTex,
                roughness: 0.85,
                metalness: 0.1,
                color: 0xbbbbbb
            });
            
            const lineCanvas = document.createElement('canvas');
            lineCanvas.width = lineCanvas.height = 128;
            const lc = lineCanvas.getContext('2d');
            lc.clearRect(0, 0, 128, 128);
            lc.lineWidth = 12;
            lc.strokeStyle = '#d32f2f'; lc.beginPath(); lc.moveTo(0, 48); lc.lineTo(128, 48); lc.stroke();
            lc.strokeStyle = '#fbc02d'; lc.beginPath(); lc.moveTo(0, 64); lc.lineTo(128, 64); lc.stroke();
            lc.strokeStyle = '#1976d2'; lc.beginPath(); lc.moveTo(0, 80); lc.lineTo(128, 80); lc.stroke();
            const lineTex = new THREE.CanvasTexture(lineCanvas);
            env.checkpointLineMat = new THREE.MeshStandardMaterial({
                map: lineTex,
                transparent: true,
                roughness: 0.9,
                metalness: 0.0,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            
            const crossCanvas = document.createElement('canvas');
            crossCanvas.width = crossCanvas.height = 128;
            const cc = crossCanvas.getContext('2d');
            cc.clearRect(0, 0, 128, 128);
            cc.lineWidth = 12;
            cc.strokeStyle = '#d32f2f'; cc.beginPath(); cc.moveTo(0, 48); cc.lineTo(128, 48); cc.moveTo(48, 0); cc.lineTo(48, 128); cc.stroke();
            cc.strokeStyle = '#fbc02d'; cc.beginPath(); cc.moveTo(0, 64); cc.lineTo(128, 64); cc.moveTo(64, 0); cc.lineTo(64, 128); cc.stroke();
            cc.strokeStyle = '#1976d2'; cc.beginPath(); cc.moveTo(0, 80); cc.lineTo(128, 80); cc.moveTo(80, 0); cc.lineTo(80, 128); cc.stroke();
            const crossTex = new THREE.CanvasTexture(crossCanvas);
            env.checkpointLineCrossMat = new THREE.MeshStandardMaterial({
                map: crossTex,
                transparent: true,
                roughness: 0.9,
                metalness: 0.0,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            env.sharedAssets = new Set();
            Object.values(env).forEach(v => {
                if (v && v.isGeometry) env.sharedAssets.add(v.uuid);
                if (v && v.isMaterial) env.sharedAssets.add(v.uuid);
            });
    }
}
