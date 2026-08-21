import {makeDuctInterior} from '../core/DuctLighting.js';

export default class MaterialLibrary {
    static ASSET_OVERRIDES = new Set(['rustMat']);

    static injectMaterials(env) {
        if (env.sharedWallGeo) return;

        const assetSnapshot = MaterialLibrary._snapshotAssets(env);
        
        if (THREE.ShaderChunk.lights_fragment_end && !THREE.ShaderChunk.lights_fragment_end.includes('directSpecular = vec3(0.0)')) {
            THREE.ShaderChunk.lights_fragment_end = THREE.ShaderChunk.lights_fragment_end.replace(
                '#if defined( RE_IndirectDiffuse )',
                'reflectedLight.directSpecular = vec3(0.0);\n#if defined( RE_IndirectDiffuse )'
            );
        }

        env.sharedWallGeo = new THREE.BoxGeometry(env.cellSize + 0.02, 3.02, env.cellSize + 0.02);
        env.sharedWallMat = new THREE.MeshStandardMaterial({
            map: env.wallTexture,
            color: 0xffffff,
            roughness: 0.75,
            metalness: 0.05,
            bumpMap: env.wallBumpTexture || env.wallTexture,
            bumpScale: 0.012
        });
        if (!env.ductWallMat) env.ductWallMat = makeDuctInterior(env.sharedWallMat.clone());
        if (env.sharedAssets) env.sharedAssets.add(env.ductWallMat.uuid);
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
            roughness: 0.70,
            metalness: 0.10,
            bumpMap: env.corrosionBumpTexture || env.structMat.map,
            bumpScale: env.corrosionBumpTexture ? 0.012 : 0.03
        });
        env.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
        env.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
        env.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        env.couchSeatGeo = new THREE.BoxGeometry(2.2, 0.3, 0.85);
        env.couchBackGeo = new THREE.BoxGeometry(2.2, 0.7, 0.18);
        env.couchArmGeo = new THREE.BoxGeometry(0.18, 0.55, 0.85);
        env.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
        env.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
        env.tableLegGeo = new THREE.BoxGeometry(0.1, 0.88, 0.1);
        env.wallVentMat = env.ventMat.clone();
        env.wallVentMat.map = env.ventMat.map.clone();
        env.wallVentMat.map.repeat.set(1, 1);
        env.wallVentMat.userData = { noShadow: true };
        env.serverFloorMat.map.repeat.set(32, 32);
        if (env.serverFloorMat.bumpMap) env.serverFloorMat.bumpMap.repeat.set(32, 32);
        if (env.serverFloorMat.emissiveMap) env.serverFloorMat.emissiveMap.repeat.set(32, 32);
        env.serverCeilingMat.map.repeat.set(32, 32);
        if (env.serverCeilingMat.bumpMap) env.serverCeilingMat.bumpMap.repeat.set(32, 32);
        if (env.serverCeilingMat.emissiveMap) env.serverCeilingMat.emissiveMap.repeat.set(32, 32);
        env.breakerBaseGeo = new THREE.BoxGeometry(0.6, 0.8, 0.20);
        env.breakerDoorGeo = new THREE.BoxGeometry(0.6, 0.8, 0.05);
        env.breakerDoorGeo.translate(0.3, 0, 0);
        env.breakerHandleGeo = new THREE.BoxGeometry(0.05, 0.2, 0.05);
        env.breakerHandleMat = new THREE.MeshStandardMaterial({color: 0x3c3f3a, roughness: 0.5, metalness: 0.15});
        env.structuralSteelMat = new THREE.MeshStandardMaterial({
            color: 0x7e8279,
            roughness: 0.50,
            metalness: 0.12
        });
        env.crtScreenMat = new THREE.MeshStandardMaterial({
            color: 0xffb000,
            emissive: 0xffb000,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        env.documentMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.15,
            roughness: 0.9,
            metalness: 0.0
        });
        env.terminalBodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
        env.documentGeo = new THREE.PlaneGeometry(0.2, 0.3);
        env.documentGeo.rotateX(-Math.PI / 2);
        env.geoCache = new Map();
        env.geoCache.set(env.terminalBodyGeo.uuid, true);
        env.geoCache.set(env.documentGeo.uuid, true);

        env.observerMat = new THREE.MeshBasicMaterial({color: 0x010101, transparent: true, opacity: 0.85});
        env.observerGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.9, 8);
        env.geoCache.set(env.observerGeo.uuid, true);
        env.observers = [];
        const cwCanvas = document.createElement('canvas');
        cwCanvas.width = cwCanvas.height = 128;
        const cctx = cwCanvas.getContext('2d');
        cctx.fillStyle = '#4a2c1a';
        cctx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 1500; i++) {
            cctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.15)';
            cctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
        }
        cctx.globalCompositeOperation = 'destination-out';
        const cols = 6, rows = 6;
        const sx = 128 / cols, sy = 128 / rows;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const ox = (y % 2 === 0) ? 0 : sx / 2;
                cctx.beginPath();
                cctx.arc(x * sx + ox, y * sy + sy / 2, 5, 0, Math.PI * 2);
                cctx.fill();
            }
        }
        const tex = new THREE.CanvasTexture(cwCanvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(12, 12);
        env.catwalkMat = new THREE.MeshStandardMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.5,
            metalness: 0.8,
            roughness: 0.6,
            side: THREE.DoubleSide
        });
        env.sharedAssets = new Set();
        Object.values(env).forEach(v => {
            if (v && v.isGeometry) env.sharedAssets.add(v.uuid);
            if (v && v.isMaterial) env.sharedAssets.add(v.uuid);
        });

        MaterialLibrary._reportClobberedAssets(env, assetSnapshot);
    }

    static _isAsset(v) {
        if (!v) return false;
        if (v.isMaterial || v.isTexture) return true;
        return Array.isArray(v) && v.some(e => e && (e.isMaterial || e.isTexture));
    }

    static _snapshotAssets(env) {
        const snapshot = new Map();
        for (const [key, value] of Object.entries(env)) {
            if (MaterialLibrary._isAsset(value)) snapshot.set(key, value);
        }
        return snapshot;
    }

    static _reportClobberedAssets(env, snapshot) {
        const clobbered = [];
        for (const [key, before] of snapshot) {
            if (env[key] !== before && !MaterialLibrary.ASSET_OVERRIDES.has(key)) clobbered.push(key);
        }
        if (clobbered.length) {
            console.warn(`[MATERIALS] injectMaterials() discarded generated asset(s): ${clobbered.join(', ')}. `
                + `Guard the write with "if (!env.KEY)" or add the key to MaterialLibrary.ASSET_OVERRIDES.`);
        }
    }
}