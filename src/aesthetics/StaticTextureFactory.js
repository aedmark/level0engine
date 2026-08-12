// Auto-generated Static Factory
export default class StaticTextureFactory {
    static async generateAssets() {
        const manager = new THREE.LoadingManager();
        const criticalLoader = new THREE.TextureLoader(manager);
        
        const loadQueue = [];
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 1; dummyCanvas.height = 1;
        const dummyCtx = dummyCanvas.getContext('2d');
        dummyCtx.fillStyle = '#808080';
        dummyCtx.fillRect(0, 0, 1, 1);
        
        const criticalNames = new Set([
            'wallTexture', 'wallBumpTexture',
            'structMat_map', 'structMat_bumpMap',
            'woodMat_map', 'woodMat_bumpMap',
            'doorMat_0_map', 'doorMat_0_bumpMap',
            'doorMat_1_map', 'doorMat_1_bumpMap',
            'doorMat_2_map', 'doorMat_2_bumpMap',
            'doorMat_3_map', 'doorMat_3_bumpMap',
            'doorMat_4_map', 'doorMat_4_bumpMap',
            'doorMat_5_map', 'doorMat_5_bumpMap',
            'carpetTexture', 'ceilingTexture', 'ceilingBumpTexture',
            'baseLightMat_map', 'baseLightMat_emissiveMap',
            'baseBrokenLightMat_map', 'baseBrokenLightMat_emissiveMap',
            'matteLightMat_map', 'matteLightMat_emissiveMap',
            'matteBrokenLightMat_map', 'matteBrokenLightMat_emissiveMap'
        ]);

        const queueTexture = (name, encoding) => {
            if (criticalNames.has(name)) {
                const tex = criticalLoader.load('./data/textures/' + name + '.png');
                if (encoding) tex.encoding = encoding;
                tex.anisotropy = 16;
                return tex;
            } else {
                const tex = new THREE.Texture(dummyCanvas);
                if (encoding) tex.encoding = encoding;
                tex.anisotropy = 16;
                tex.needsUpdate = true;
                loadQueue.push({ tex, name });
                return tex;
            }
        };

        const load = (name) => queueTexture(name, 3001);
        const loadLinear = (name) => queueTexture(name, undefined);
        const assets = {};
        assets['pegboardTex'] = load('pegboardTex');
        assets['pegboardTex'].wrapS = THREE.RepeatWrapping;
        assets['pegboardTex'].wrapT = THREE.RepeatWrapping;
        assets['fernTex'] = load('fernTex');
        assets['fernTex'].wrapS = THREE.ClampToEdgeWrapping;
        assets['fernTex'].wrapT = THREE.ClampToEdgeWrapping;
        assets['headerMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.8,
            metalness: 0,
            bumpScale: 0.01,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('headerMat_map'),
            bumpMap: loadLinear('headerMat_bumpMap'),
        });
        assets['headerMat'].map.repeat.set(4, 0.1);
        assets['headerMat'].map.wrapS = THREE.RepeatWrapping;
        assets['headerMat'].map.wrapT = THREE.RepeatWrapping;
        assets['headerMat'].bumpMap.repeat.set(4, 0.1);
        assets['headerMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['headerMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['wallTexture'] = load('wallTexture');
        assets['wallTexture'].repeat.set(4, 1);
        assets['wallTexture'].wrapS = THREE.RepeatWrapping;
        assets['wallTexture'].wrapT = THREE.ClampToEdgeWrapping;
        assets['wallBumpTexture'] = load('wallBumpTexture');
        assets['wallBumpTexture'].repeat.set(4, 1);
        assets['wallBumpTexture'].wrapS = THREE.RepeatWrapping;
        assets['wallBumpTexture'].wrapT = THREE.ClampToEdgeWrapping;
        assets['structMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 0.02,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('structMat_map'),
            bumpMap: loadLinear('structMat_bumpMap'),
        });
        assets['structMat'].map.repeat.set(2, 2);
        assets['structMat'].map.wrapS = THREE.RepeatWrapping;
        assets['structMat'].map.wrapT = THREE.RepeatWrapping;
        assets['structMat'].bumpMap.repeat.set(2, 2);
        assets['structMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['structMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['woodMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('woodMat_map'),
            bumpMap: loadLinear('woodMat_bumpMap'),
        });
        assets['woodMat'].map.wrapS = THREE.RepeatWrapping;
        assets['woodMat'].map.wrapT = THREE.RepeatWrapping;
        assets['woodMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['woodMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['doorMat'] = [];
        assets['doorMat'][0] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('doorMat_0_map'),
            bumpMap: loadLinear('doorMat_0_bumpMap'),
        });
        assets['doorMat'][0].map.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][0].map.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][0].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][0].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][1] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('doorMat_1_map'),
            bumpMap: loadLinear('doorMat_1_bumpMap'),
        });
        assets['doorMat'][1].map.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][1].map.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][1].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][1].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][2] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('doorMat_2_map'),
            bumpMap: loadLinear('doorMat_2_bumpMap'),
        });
        assets['doorMat'][2].map.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][2].map.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][2].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][2].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][3] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('doorMat_3_map'),
            bumpMap: loadLinear('doorMat_3_bumpMap'),
        });
        assets['doorMat'][3].map.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][3].map.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][3].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['doorMat'][3].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['doorMat'][4] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.03,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('doorMat_4_map'),
            bumpMap: loadLinear('doorMat_4_bumpMap'),
        });
        assets['doorMat'][4].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['doorMat'][4].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['doorMat'][4].bumpMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['doorMat'][4].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['doorMat'][5] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.74,
            metalness: 0,
            bumpScale: 0.03,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('doorMat_5_map'),
            bumpMap: loadLinear('doorMat_5_bumpMap'),
        });
        assets['doorMat'][5].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['doorMat'][5].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['doorMat'][5].bumpMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['doorMat'][5].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['baseboardMat'] = new THREE.MeshStandardMaterial({
            color: 0x4c3f25,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.65,
            metalness: 0.05,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            userData: {"noShadow":true},
        });
        assets['baseboardTrimMat'] = new THREE.MeshStandardMaterial({
            color: 0x3b2e17,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.55,
            metalness: 0.05,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            userData: {"noShadow":true},
        });
        assets['carpetTexture'] = load('carpetTexture');
        assets['carpetTexture'].wrapS = THREE.RepeatWrapping;
        assets['carpetTexture'].wrapT = THREE.RepeatWrapping;
        assets['ceilingTexture'] = load('ceilingTexture');
        assets['ceilingTexture'].wrapS = THREE.RepeatWrapping;
        assets['ceilingTexture'].wrapT = THREE.RepeatWrapping;
        assets['ceilingBumpTexture'] = load('ceilingBumpTexture');
        assets['ceilingBumpTexture'].wrapS = THREE.RepeatWrapping;
        assets['ceilingBumpTexture'].wrapT = THREE.RepeatWrapping;
        assets['tileMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.4,
            metalness: 0.6,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: 2,
            side: 0,
            vertexColors: false,
            map: load('tileMat_map'),
        });
        assets['tileMat'].map.repeat.set(16, 16);
        assets['tileMat'].map.wrapS = THREE.RepeatWrapping;
        assets['tileMat'].map.wrapT = THREE.RepeatWrapping;
        assets['clinicMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.4,
            metalness: 0.15,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: 2,
            side: 0,
            vertexColors: false,
            map: load('clinicMat_map'),
            bumpMap: loadLinear('clinicMat_bumpMap'),
        });
        assets['clinicMat'].map.repeat.set(80, 80);
        assets['clinicMat'].map.wrapS = THREE.RepeatWrapping;
        assets['clinicMat'].map.wrapT = THREE.RepeatWrapping;
        assets['clinicMat'].bumpMap.repeat.set(80, 80);
        assets['clinicMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['clinicMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['atriumFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0,
            bumpScale: 0.018,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('atriumFloorMat_map'),
            bumpMap: loadLinear('atriumFloorMat_bumpMap'),
        });
        assets['atriumFloorMat'].map.repeat.set(14, 14);
        assets['atriumFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['atriumFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['atriumFloorMat'].bumpMap.repeat.set(14, 14);
        assets['atriumFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['atriumFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['clinicFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0.12,
            bumpScale: 0.012,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('clinicFloorMat_map'),
            bumpMap: loadLinear('clinicFloorMat_bumpMap'),
            roughnessMap: loadLinear('clinicFloorMat_roughnessMap'),
        });
        assets['clinicFloorMat'].map.repeat.set(21, 21);
        assets['clinicFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['clinicFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['clinicFloorMat'].bumpMap.repeat.set(21, 21);
        assets['clinicFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['clinicFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['clinicFloorMat'].roughnessMap.repeat.set(21, 21);
        assets['clinicFloorMat'].roughnessMap.wrapS = THREE.RepeatWrapping;
        assets['clinicFloorMat'].roughnessMap.wrapT = THREE.RepeatWrapping;
        assets['clinicCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x4e5458,
            emissiveIntensity: 1,
            roughness: 0.97,
            metalness: 0,
            bumpScale: 0.005,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: 2,
            side: 0,
            vertexColors: false,
            map: load('clinicCeilingMat_map'),
            bumpMap: loadLinear('clinicCeilingMat_bumpMap'),
            emissiveMap: load('clinicCeilingMat_emissiveMap'),
        });
        assets['clinicCeilingMat'].map.repeat.set(21, 21);
        assets['clinicCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['clinicCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['clinicCeilingMat'].bumpMap.repeat.set(21, 21);
        assets['clinicCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['clinicCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['clinicCeilingMat'].emissiveMap.repeat.set(21, 21);
        assets['clinicCeilingMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['clinicCeilingMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['clinicWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.72,
            metalness: 0.02,
            bumpScale: 0.014,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('clinicWallMat_map'),
            bumpMap: loadLinear('clinicWallMat_bumpMap'),
        });
        assets['clinicWallMat'].map.repeat.set(4, 1);
        assets['clinicWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['clinicWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['clinicWallMat'].bumpMap.repeat.set(4, 1);
        assets['clinicWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['clinicWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['clinicRailMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.44,
            metalness: 0.08,
            bumpScale: 0.004,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('clinicRailMat_map'),
            bumpMap: loadLinear('clinicRailMat_bumpMap'),
        });
        assets['clinicRailMat'].map.repeat.set(4, 1);
        assets['clinicRailMat'].map.wrapS = THREE.RepeatWrapping;
        assets['clinicRailMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['clinicRailMat'].bumpMap.repeat.set(4, 1);
        assets['clinicRailMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['clinicRailMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['fabricMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.98,
            metalness: 0,
            bumpScale: 0.05,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('fabricMat_map'),
            bumpMap: loadLinear('fabricMat_bumpMap'),
        });
        assets['fabricMat'].map.repeat.set(4, 4);
        assets['fabricMat'].map.wrapS = THREE.RepeatWrapping;
        assets['fabricMat'].map.wrapT = THREE.RepeatWrapping;
        assets['fabricMat'].bumpMap.repeat.set(4, 4);
        assets['fabricMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['fabricMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['mossMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('mossMat_map'),
        });
        assets['mossMat'].map.repeat.set(32, 32);
        assets['mossMat'].map.wrapS = THREE.RepeatWrapping;
        assets['mossMat'].map.wrapT = THREE.RepeatWrapping;
        assets['cornMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 0.05,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cornMat_map'),
            bumpMap: loadLinear('cornMat_bumpMap'),
        });
        assets['cornMat'].map.repeat.set(2, 1);
        assets['cornMat'].map.wrapS = THREE.RepeatWrapping;
        assets['cornMat'].map.wrapT = THREE.RepeatWrapping;
        assets['cornMat'].bumpMap.repeat.set(2, 1);
        assets['cornMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['cornMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['dirtMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 0.1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('dirtMat_map'),
            bumpMap: loadLinear('dirtMat_bumpMap'),
        });
        assets['dirtMat'].map.repeat.set(16, 16);
        assets['dirtMat'].map.wrapS = THREE.RepeatWrapping;
        assets['dirtMat'].map.wrapT = THREE.RepeatWrapping;
        assets['dirtMat'].bumpMap.repeat.set(16, 16);
        assets['dirtMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['dirtMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['nightSkyMat'] = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: false,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('nightSkyMat_map'),
        });
        assets['nightSkyMat'].map.repeat.set(4, 4);
        assets['nightSkyMat'].map.wrapS = THREE.RepeatWrapping;
        assets['nightSkyMat'].map.wrapT = THREE.RepeatWrapping;
        assets['ventMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x333333,
            emissiveIntensity: 0.2,
            roughness: 0.7,
            metalness: 0.15,
            bumpScale: 0.02,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('ventMat_map'),
            bumpMap: loadLinear('ventMat_bumpMap'),
        });
        assets['ventMat'].map.wrapS = THREE.RepeatWrapping;
        assets['ventMat'].map.wrapT = THREE.RepeatWrapping;
        assets['ventMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['ventMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['ductMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x322222,
            emissiveIntensity: 0.15,
            roughness: 0.55,
            metalness: 0.75,
            bumpScale: 0.01,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('ductMat_map'),
            bumpMap: loadLinear('ductMat_bumpMap'),
        });
        assets['ductMat'].map.repeat.set(2, 2);
        assets['ductMat'].map.wrapS = THREE.RepeatWrapping;
        assets['ductMat'].map.wrapT = THREE.RepeatWrapping;
        assets['ductMat'].bumpMap.repeat.set(2, 2);
        assets['ductMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['ductMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['serverMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.3,
            metalness: 0.8,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('serverMat_map'),
        });
        assets['serverMat'].map.repeat.set(4, 1);
        assets['serverMat'].map.wrapS = THREE.RepeatWrapping;
        assets['serverMat'].map.wrapT = THREE.RepeatWrapping;
        assets['baseLightMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('baseLightMat_map'),
            emissiveMap: load('baseLightMat_emissiveMap'),
        });
        assets['baseLightMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['baseLightMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['baseLightMat'].emissiveMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['baseLightMat'].emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['baseBrokenLightMat'] = new THREE.MeshStandardMaterial({
            color: 0x8c9296,
            emissive: 0x1a1f24,
            emissiveIntensity: 1,
            roughness: 0.8,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('baseBrokenLightMat_map'),
            emissiveMap: load('baseBrokenLightMat_emissiveMap'),
        });
        assets['baseBrokenLightMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['baseBrokenLightMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['baseBrokenLightMat'].emissiveMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['baseBrokenLightMat'].emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['baseHousingMat'] = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
        });
        assets['matteLightMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffe0,
            emissive: 0xffffe0,
            emissiveIntensity: 0.4,
            roughness: 0.95,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('matteLightMat_map'),
            emissiveMap: load('matteLightMat_emissiveMap'),
        });
        assets['matteLightMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['matteLightMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['matteLightMat'].emissiveMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['matteLightMat'].emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['matteBrokenLightMat'] = new THREE.MeshStandardMaterial({
            color: 0x8c9296,
            emissive: 0x1a1f24,
            emissiveIntensity: 1,
            roughness: 0.95,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('matteBrokenLightMat_map'),
            emissiveMap: load('matteBrokenLightMat_emissiveMap'),
        });
        assets['matteBrokenLightMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['matteBrokenLightMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['matteBrokenLightMat'].emissiveMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['matteBrokenLightMat'].emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['fenceMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.4,
            metalness: 0.9,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0.5,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 2,
            vertexColors: false,
            map: load('fenceMat_map'),
        });
        assets['fenceMat'].map.repeat.set(12, 12);
        assets['fenceMat'].map.wrapS = THREE.RepeatWrapping;
        assets['fenceMat'].map.wrapT = THREE.RepeatWrapping;
        assets['hazardMat'] = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.001,
            metalness: 0.001,
            bumpScale: 0.001,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            bumpMap: loadLinear('hazardMat_bumpMap'),
        });
        assets['hazardMat'].bumpMap.repeat.set(2, 2);
        assets['hazardMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['hazardMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['glowMat'] = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            blending: 2,
            depthWrite: false,
            alphaTest: 0,
            fog: true,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('glowMat_map'),
        });
        assets['glowMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['glowMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['flareMat'] = new THREE.SpriteMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            blending: 2,
            depthWrite: false,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('flareMat_map'),
        });
        assets['flareMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['flareMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['tagMat'] = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            blending: 1,
            depthWrite: false,
            alphaTest: 0,
            fog: true,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('tagMat_map'),
        });
        assets['tagMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['tagMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['voidMat'] = new THREE.MeshStandardMaterial({
            color: 0x020202,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.4,
            metalness: 0.8,
            bumpScale: 0.08,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            bumpMap: loadLinear('voidMat_bumpMap'),
        });
        assets['voidMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['voidMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['rustMat'] = new THREE.MeshStandardMaterial({
            color: 0x3a1c14,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0.3,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
        });
        assets['metalMat'] = new THREE.MeshStandardMaterial({
            color: 0x999999,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.35,
            metalness: 0.95,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
        });
        assets['paintedSteelMat'] = new THREE.MeshStandardMaterial({
            color: 0x666666,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.2,
            metalness: 0.2,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
        });
        assets['pittedMetalMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.55,
            metalness: 0.75,
            bumpScale: 0.025,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('pittedMetalMat_map'),
            bumpMap: loadLinear('pittedMetalMat_bumpMap'),
        });
        assets['pittedMetalMat'].map.repeat.set(2, 2);
        assets['pittedMetalMat'].map.wrapS = THREE.RepeatWrapping;
        assets['pittedMetalMat'].map.wrapT = THREE.RepeatWrapping;
        assets['pittedMetalMat'].bumpMap.repeat.set(2, 2);
        assets['pittedMetalMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['pittedMetalMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['almondMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.8,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('almondMat_map'),
        });
        assets['almondMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['almondMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['titaniumMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.35,
            metalness: 0.4,
            bumpScale: 0.005,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('titaniumMat_map'),
            bumpMap: loadLinear('titaniumMat_bumpMap'),
        });
        assets['titaniumMat'].map.wrapS = THREE.RepeatWrapping;
        assets['titaniumMat'].map.wrapT = THREE.RepeatWrapping;
        assets['titaniumMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['titaniumMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['pipeMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.45,
            metalness: 0.05,
            bumpScale: 0.004,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('pipeMat_map'),
            bumpMap: loadLinear('pipeMat_bumpMap'),
        });
        assets['pipeMat'].map.repeat.set(1, 2);
        assets['pipeMat'].map.wrapS = THREE.RepeatWrapping;
        assets['pipeMat'].map.wrapT = THREE.RepeatWrapping;
        assets['pipeMat'].bumpMap.repeat.set(1, 2);
        assets['pipeMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['pipeMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['breakerPanelMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.45,
            metalness: 0.05,
            bumpScale: 0.01,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('breakerPanelMat_map'),
            bumpMap: loadLinear('breakerPanelMat_bumpMap'),
        });
        assets['breakerPanelMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['breakerPanelMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['breakerPanelMat'].bumpMap.wrapS = THREE.ClampToEdgeWrapping;
        assets['breakerPanelMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['stainlessMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x141a22,
            emissiveIntensity: 0.25,
            roughness: 0.3,
            metalness: 0.15,
            bumpScale: 0.003,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('stainlessMat_map'),
            bumpMap: loadLinear('stainlessMat_bumpMap'),
        });
        assets['stainlessMat'].map.wrapS = THREE.RepeatWrapping;
        assets['stainlessMat'].map.wrapT = THREE.RepeatWrapping;
        assets['stainlessMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['stainlessMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['stainlessDoorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x101620,
            emissiveIntensity: 0.45,
            roughness: 0.34,
            metalness: 0.15,
            bumpScale: 0.004,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('stainlessDoorMat_map'),
            bumpMap: loadLinear('stainlessDoorMat_bumpMap'),
        });
        assets['stainlessDoorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['stainlessDoorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['stainlessDoorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['stainlessDoorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['corrosionBumpTexture'] = load('corrosionBumpTexture');
        assets['corrosionBumpTexture'].repeat.set(2, 2);
        assets['corrosionBumpTexture'].wrapS = THREE.RepeatWrapping;
        assets['corrosionBumpTexture'].wrapT = THREE.RepeatWrapping;
        assets['annexDoorMat'] = [];
        assets['annexDoorMat'][0] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMat_0_map'),
        });
        assets['annexDoorMat'][0].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][0].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][1] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMat_1_map'),
        });
        assets['annexDoorMat'][1].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][1].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][2] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMat_2_map'),
        });
        assets['annexDoorMat'][2].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][2].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][3] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMat_3_map'),
        });
        assets['annexDoorMat'][3].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][3].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][4] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x222222,
            emissiveIntensity: 0.5,
            roughness: 0.7,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMat_4_map'),
        });
        assets['annexDoorMat'][4].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][4].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][5] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMat_5_map'),
        });
        assets['annexDoorMat'][5].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMat'][5].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'] = [];
        assets['annexDoorMatZ'][0] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x222222,
            emissiveIntensity: 0.5,
            roughness: 0.7,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMatZ_0_map'),
        });
        assets['annexDoorMatZ'][0].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][0].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][1] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMatZ_1_map'),
        });
        assets['annexDoorMatZ'][1].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][1].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][2] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMatZ_2_map'),
        });
        assets['annexDoorMatZ'][2].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][2].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][3] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMatZ_3_map'),
        });
        assets['annexDoorMatZ'][3].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][3].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][4] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMatZ_4_map'),
        });
        assets['annexDoorMatZ'][4].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][4].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][5] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0.7,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexDoorMatZ_5_map'),
        });
        assets['annexDoorMatZ'][5].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['annexDoorMatZ'][5].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexFrameMat'] = new THREE.MeshStandardMaterial({
            color: 0x53585c,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.2,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
        });
        assets['annexWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.02,
            bumpScale: 0.04,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexWallMat_map'),
            bumpMap: loadLinear('annexWallMat_bumpMap'),
        });
        assets['annexWallMat'].map.repeat.set(4, 1);
        assets['annexWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['annexWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexWallMat'].bumpMap.repeat.set(4, 1);
        assets['annexWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['annexWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['annexFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.02,
            bumpScale: 0.03,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexFloorMat_map'),
            bumpMap: loadLinear('annexFloorMat_bumpMap'),
        });
        assets['annexFloorMat'].map.repeat.set(56, 56);
        assets['annexFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['annexFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['annexFloorMat'].bumpMap.repeat.set(56, 56);
        assets['annexFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['annexFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['annexCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 0.03,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('annexCeilingMat_map'),
            bumpMap: loadLinear('annexCeilingMat_bumpMap'),
        });
        assets['annexCeilingMat'].map.repeat.set(56, 56);
        assets['annexCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['annexCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['annexCeilingMat'].bumpMap.repeat.set(56, 56);
        assets['annexCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['annexCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['impoundWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x111111,
            emissiveIntensity: 0.5,
            roughness: 0.85,
            metalness: 0.35,
            bumpScale: 0.02,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('impoundWallMat_map'),
            bumpMap: loadLinear('impoundWallMat_bumpMap'),
        });
        assets['impoundWallMat'].map.repeat.set(4, 1);
        assets['impoundWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['impoundWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['impoundWallMat'].bumpMap.repeat.set(4, 1);
        assets['impoundWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['impoundWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['impoundCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.4,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('impoundCeilingMat_map'),
            bumpMap: loadLinear('impoundCeilingMat_bumpMap'),
        });
        assets['impoundCeilingMat'].map.repeat.set(8, 8);
        assets['impoundCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['impoundCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['impoundCeilingMat'].bumpMap.repeat.set(8, 8);
        assets['impoundCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['impoundCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['boardWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xa9d2fc,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.05,
            bumpScale: 0.018,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('boardWallMat_map'),
            bumpMap: loadLinear('boardWallMat_bumpMap'),
        });
        assets['boardWallMat'].map.repeat.set(1.75, 1);
        assets['boardWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['boardWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['boardWallMat'].bumpMap.repeat.set(1.75, 1);
        assets['boardWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['boardWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['boardTileMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.6,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('boardTileMat_map'),
        });
        assets['boardTileMat'].map.repeat.set(40, 40);
        assets['boardTileMat'].map.wrapS = THREE.RepeatWrapping;
        assets['boardTileMat'].map.wrapT = THREE.RepeatWrapping;
        assets['glassMat'] = new THREE.MeshStandardMaterial({
            color: 0xbfe3ef,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.08,
            metalness: 0.1,
            bumpScale: 1,
            transparent: true,
            opacity: 0.22,
            blending: 1,
            depthWrite: false,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
        });
        assets['boardFrameMat'] = new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0x000000,
            emissiveIntensity: 0.2,
            roughness: 0.65,
            metalness: 0.8,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            bumpMap: loadLinear('boardFrameMat_bumpMap'),
        });
        assets['boardFrameMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['boardFrameMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['boardCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x606a75,
            emissiveIntensity: 2,
            roughness: 0.95,
            metalness: 0,
            bumpScale: 0.005,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('boardCeilingMat_map'),
            bumpMap: loadLinear('boardCeilingMat_bumpMap'),
            emissiveMap: load('boardCeilingMat_emissiveMap'),
        });
        assets['boardCeilingMat'].map.repeat.set(40, 40);
        assets['boardCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['boardCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['boardCeilingMat'].bumpMap.repeat.set(40, 40);
        assets['boardCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['boardCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['boardCeilingMat'].emissiveMap.repeat.set(40, 40);
        assets['boardCeilingMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['boardCeilingMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['marbleMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.18,
            metalness: 0.15,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('marbleMat_map'),
            bumpMap: loadLinear('marbleMat_bumpMap'),
        });
        assets['marbleMat'].map.repeat.set(2, 1);
        assets['marbleMat'].map.wrapS = THREE.RepeatWrapping;
        assets['marbleMat'].map.wrapT = THREE.RepeatWrapping;
        assets['marbleMat'].bumpMap.repeat.set(2, 1);
        assets['marbleMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['marbleMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['shelfMat'] = new THREE.MeshStandardMaterial({
            color: 0xc9bd9e,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.6,
            metalness: 0.2,
            bumpScale: 0.006,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            bumpMap: loadLinear('shelfMat_bumpMap'),
        });
        assets['shelfMat'].bumpMap.repeat.set(2, 2);
        assets['shelfMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['shelfMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['atriumSmearMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.05,
            roughness: 0.92,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: true,
            map: load('atriumSmearMat_map'),
            emissiveMap: load('atriumSmearMat_emissiveMap'),
        });
        assets['atriumSmearMat'].map.wrapS = THREE.RepeatWrapping;
        assets['atriumSmearMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['atriumSmearMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['atriumSmearMat'].emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['foliageMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.95,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('foliageMat_map'),
        });
        assets['foliageMat'].map.wrapS = THREE.RepeatWrapping;
        assets['foliageMat'].map.wrapT = THREE.RepeatWrapping;
        assets['farVoidMat'] = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('farVoidMat_map'),
        });
        assets['farVoidMat'].map.wrapS = THREE.RepeatWrapping;
        assets['farVoidMat'].map.wrapT = THREE.RepeatWrapping;
        assets['leakStainMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.35,
            metalness: 0.05,
            bumpScale: 1,
            transparent: true,
            opacity: 0.85,
            blending: 1,
            depthWrite: false,
            alphaTest: 0,
            fog: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('leakStainMat_map'),
        });
        assets['leakStainMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['leakStainMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['cautionConeMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cautionConeMat_map'),
        });
        assets['cautionConeMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['cautionConeMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['cautionConeBaseMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cautionConeBaseMat_map'),
        });
        assets['cautionConeBaseMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['cautionConeBaseMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['valveMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.7,
            metalness: 0.3,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('valveMat_map'),
        });
        assets['valveMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['valveMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['archiveWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.95,
            metalness: 0,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('archiveWallMat_map'),
            bumpMap: loadLinear('archiveWallMat_bumpMap'),
        });
        assets['archiveWallMat'].map.repeat.set(4, 1);
        assets['archiveWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['archiveWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['archiveWallMat'].bumpMap.repeat.set(4, 1);
        assets['archiveWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['archiveWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['archiveFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0.05,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('archiveFloorMat_map'),
            bumpMap: loadLinear('archiveFloorMat_bumpMap'),
            roughnessMap: loadLinear('archiveFloorMat_roughnessMap'),
        });
        assets['archiveFloorMat'].map.repeat.set(14, 14);
        assets['archiveFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['archiveFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['archiveFloorMat'].bumpMap.repeat.set(14, 14);
        assets['archiveFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['archiveFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['archiveFloorMat'].roughnessMap.repeat.set(14, 14);
        assets['archiveFloorMat'].roughnessMap.wrapS = THREE.RepeatWrapping;
        assets['archiveFloorMat'].roughnessMap.wrapT = THREE.RepeatWrapping;
        assets['paperMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('paperMat_map'),
        });
        assets['paperMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['paperMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['coffeeStainMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0,
            bumpScale: 1,
            transparent: true,
            opacity: 1,
            blending: 1,
            depthWrite: false,
            alphaTest: 0,
            fog: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('coffeeStainMat_map'),
        });
        assets['coffeeStainMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['coffeeStainMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['bookMatSets'] = [];
        assets['bookRowMat'] = [];
        assets['bookRowMat'][0] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x1e1b19,
            emissiveIntensity: 0.2,
            roughness: 0.8,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bookRowMat_0_map'),
        });
        assets['bookRowMat'][0].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['bookRowMat'][0].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['bookRowMat'][1] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x1e1b19,
            emissiveIntensity: 0.2,
            roughness: 0.8,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bookRowMat_1_map'),
        });
        assets['bookRowMat'][1].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['bookRowMat'][1].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['bookRowMat'][2] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bookRowMat_2_map'),
        });
        assets['bookRowMat'][2].map.repeat.set(3, 1);
        assets['bookRowMat'][2].map.wrapS = THREE.RepeatWrapping;
        assets['bookRowMat'][2].map.wrapT = THREE.RepeatWrapping;
        assets['bookRowMat'][3] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bookRowMat_3_map'),
        });
        assets['bookRowMat'][3].map.repeat.set(3, 1);
        assets['bookRowMat'][3].map.wrapS = THREE.RepeatWrapping;
        assets['bookRowMat'][3].map.wrapT = THREE.RepeatWrapping;
        assets['bookRowMat'][4] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bookRowMat_4_map'),
        });
        assets['bookRowMat'][4].map.repeat.set(3, 1);
        assets['bookRowMat'][4].map.wrapS = THREE.RepeatWrapping;
        assets['bookRowMat'][4].map.wrapT = THREE.RepeatWrapping;
        assets['bookRowMat'][5] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bookRowMat_5_map'),
        });
        assets['bookRowMat'][5].map.repeat.set(3, 1);
        assets['bookRowMat'][5].map.wrapS = THREE.RepeatWrapping;
        assets['bookRowMat'][5].map.wrapT = THREE.RepeatWrapping;
        assets['checkpointFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.88,
            metalness: 0.02,
            bumpScale: 0.012,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('checkpointFloorMat_map'),
            bumpMap: loadLinear('checkpointFloorMat_bumpMap'),
        });
        assets['checkpointFloorMat'].map.repeat.set(14, 14);
        assets['checkpointFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['checkpointFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['checkpointFloorMat'].bumpMap.repeat.set(14, 14);
        assets['checkpointFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['checkpointFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['checkpointCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.92,
            metalness: 0.65,
            bumpScale: 0.05,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('checkpointCeilingMat_map'),
            bumpMap: loadLinear('checkpointCeilingMat_bumpMap'),
        });
        assets['checkpointCeilingMat'].map.repeat.set(28, 28);
        assets['checkpointCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['checkpointCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['checkpointCeilingMat'].bumpMap.repeat.set(28, 28);
        assets['checkpointCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['checkpointCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['checkpointWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 1,
            metalness: 0,
            bumpScale: 0.016,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('checkpointWallMat_map'),
            bumpMap: loadLinear('checkpointWallMat_bumpMap'),
            roughnessMap: loadLinear('checkpointWallMat_roughnessMap'),
        });
        assets['checkpointWallMat'].map.repeat.set(2, 1);
        assets['checkpointWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['checkpointWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['checkpointWallMat'].bumpMap.repeat.set(2, 1);
        assets['checkpointWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['checkpointWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['checkpointWallMat'].roughnessMap.repeat.set(2, 1);
        assets['checkpointWallMat'].roughnessMap.wrapS = THREE.RepeatWrapping;
        assets['checkpointWallMat'].roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['diamondPlateMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.75,
            metalness: 0.25,
            bumpScale: 0.05,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('diamondPlateMat_map'),
            bumpMap: loadLinear('diamondPlateMat_bumpMap'),
        });
        assets['diamondPlateMat'].map.repeat.set(14, 14);
        assets['diamondPlateMat'].map.wrapS = THREE.RepeatWrapping;
        assets['diamondPlateMat'].map.wrapT = THREE.RepeatWrapping;
        assets['diamondPlateMat'].bumpMap.repeat.set(14, 14);
        assets['diamondPlateMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['diamondPlateMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['incinFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.6,
            metalness: 0.1,
            bumpScale: 0.006,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: 2,
            side: 0,
            vertexColors: false,
            map: load('incinFloorMat_map'),
            bumpMap: loadLinear('incinFloorMat_bumpMap'),
        });
        assets['incinFloorMat'].map.repeat.set(14, 14);
        assets['incinFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['incinFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['incinFloorMat'].bumpMap.repeat.set(14, 14);
        assets['incinFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['incinFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['incinWallMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.62,
            metalness: 0.1,
            bumpScale: 0.009,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('incinWallMat_map'),
            bumpMap: loadLinear('incinWallMat_bumpMap'),
        });
        assets['incinWallMat'].map.repeat.set(2, 1);
        assets['incinWallMat'].map.wrapS = THREE.RepeatWrapping;
        assets['incinWallMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['incinWallMat'].bumpMap.repeat.set(2, 1);
        assets['incinWallMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['incinWallMat'].bumpMap.wrapT = THREE.ClampToEdgeWrapping;
        assets['incinCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.9,
            metalness: 0.3,
            bumpScale: 0.03,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('incinCeilingMat_map'),
            bumpMap: loadLinear('incinCeilingMat_bumpMap'),
        });
        assets['incinCeilingMat'].map.repeat.set(7, 7);
        assets['incinCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['incinCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['incinCeilingMat'].bumpMap.repeat.set(7, 7);
        assets['incinCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['incinCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['emberLightMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xff6a22,
            emissiveIntensity: 1,
            roughness: 0.34,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('emberLightMat_map'),
            emissiveMap: load('emberLightMat_emissiveMap'),
        });
        assets['emberLightMat'].map.wrapS = THREE.RepeatWrapping;
        assets['emberLightMat'].map.wrapT = THREE.RepeatWrapping;
        assets['emberLightMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['emberLightMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['emberLightBrokenMat'] = new THREE.MeshStandardMaterial({
            color: 0x6b5a4e,
            emissive: 0x1d0e06,
            emissiveIntensity: 1,
            roughness: 0.5,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('emberLightBrokenMat_map'),
            emissiveMap: load('emberLightBrokenMat_emissiveMap'),
        });
        assets['emberLightBrokenMat'].map.wrapS = THREE.RepeatWrapping;
        assets['emberLightBrokenMat'].map.wrapT = THREE.RepeatWrapping;
        assets['emberLightBrokenMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['emberLightBrokenMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['emberGrateMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xff5a18,
            emissiveIntensity: 1.15,
            roughness: 0.86,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('emberGrateMat_map'),
            emissiveMap: load('emberGrateMat_emissiveMap'),
        });
        assets['emberGrateMat'].map.wrapS = THREE.RepeatWrapping;
        assets['emberGrateMat'].map.wrapT = THREE.RepeatWrapping;
        assets['emberGrateMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['emberGrateMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['serverFloorMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.4,
            roughness: 0.8,
            metalness: 0.4,
            bumpScale: 0.015,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('serverFloorMat_map'),
            bumpMap: loadLinear('serverFloorMat_bumpMap'),
            emissiveMap: load('serverFloorMat_emissiveMap'),
        });
        assets['serverFloorMat'].map.wrapS = THREE.RepeatWrapping;
        assets['serverFloorMat'].map.wrapT = THREE.RepeatWrapping;
        assets['serverFloorMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['serverFloorMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['serverFloorMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['serverFloorMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['serverCeilingMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x4a5565,
            emissiveIntensity: 0.4,
            roughness: 0.95,
            metalness: 0.1,
            bumpScale: 0.01,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('serverCeilingMat_map'),
            bumpMap: loadLinear('serverCeilingMat_bumpMap'),
            emissiveMap: load('serverCeilingMat_emissiveMap'),
        });
        assets['serverCeilingMat'].map.wrapS = THREE.RepeatWrapping;
        assets['serverCeilingMat'].map.wrapT = THREE.RepeatWrapping;
        assets['serverCeilingMat'].bumpMap.wrapS = THREE.RepeatWrapping;
        assets['serverCeilingMat'].bumpMap.wrapT = THREE.RepeatWrapping;
        assets['serverCeilingMat'].emissiveMap.wrapS = THREE.RepeatWrapping;
        assets['serverCeilingMat'].emissiveMap.wrapT = THREE.RepeatWrapping;
        assets['fileBoxMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('fileBoxMat_map'),
        });
        assets['fileBoxMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['fileBoxMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['movingBoxMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('movingBoxMat_map'),
        });
        assets['movingBoxMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['movingBoxMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['bananaBoxMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('bananaBoxMat_map'),
        });
        assets['bananaBoxMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['bananaBoxMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['parcelBoxMat'] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('parcelBoxMat_map'),
        });
        assets['parcelBoxMat'].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['parcelBoxMat'].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['cartonMats'] = [];
        assets['cartonMats'][0] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cartonMats_0_map'),
        });
        assets['cartonMats'][0].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][0].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][1] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cartonMats_1_map'),
        });
        assets['cartonMats'][1].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][1].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][2] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cartonMats_2_map'),
        });
        assets['cartonMats'][2].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][2].map.wrapT = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][3] = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x000000,
            emissiveIntensity: 1,
            roughness: 0.85,
            metalness: 0,
            bumpScale: 1,
            transparent: false,
            opacity: 1,
            blending: 1,
            depthWrite: true,
            alphaTest: 0,
            fog: true,
            polygonOffset: false,
            polygonOffsetFactor: 0,
            shadowSide: null,
            side: 0,
            vertexColors: false,
            map: load('cartonMats_3_map'),
        });
        assets['cartonMats'][3].map.wrapS = THREE.ClampToEdgeWrapping;
        assets['cartonMats'][3].map.wrapT = THREE.ClampToEdgeWrapping;
        await new Promise(r => { manager.onLoad = r; manager.onError = r; });
        
        (async () => {
            const lazyLoader = new THREE.TextureLoader();
            for (const item of loadQueue) {
                try {
                    const loadedTex = await new Promise((resolve, reject) => {
                        lazyLoader.load('./data/textures/' + item.name + '.png', resolve, undefined, reject);
                    });
                    item.tex.image = loadedTex.image;
                    item.tex.needsUpdate = true;
                    await new Promise(r => setTimeout(r, 40));
                } catch (e) {
                    console.warn('Failed lazy loading', item.name);
                }
            }
        })();
        
        return assets;
    }
}
