import TextureMechanics from './textures/TextureMechanics.js';

export default class StaticTextureLoader {
    static async loadCoreAssets() {
        const loader = new THREE.TextureLoader();
        
        let metadata;
        try {
            const resp = await fetch('./assets/textures/metadata.json');
            metadata = await resp.json();
        } catch (err) {
            console.error("Failed to load texture metadata.json", err);
            return {};
        }
        
        const loadTexRaw = async (name, repeatX = 1, repeatY = 1, wrapS = THREE.RepeatWrapping, wrapT = THREE.RepeatWrapping) => {
            try {
                const tex = await loader.loadAsync(`./assets/textures/${name}.png`);
                
                // Hardcode fallback overrides for standalone textures since metadata.json missed them
                if (name === 'wallTexture' || name === 'wallBumpTexture') {
                    repeatX = 4;
                    repeatY = 1;
                    wrapT = THREE.ClampToEdgeWrapping;
                } else if (name === 'pegboardTex' || name === 'corrosionBumpTexture') {
                    repeatX = 2;
                    repeatY = 2;
                }
                
                tex.wrapS = wrapS || THREE.RepeatWrapping;
                tex.wrapT = wrapT || THREE.RepeatWrapping;
                if (repeatX !== 1 || repeatY !== 1) {
                    tex.repeat.set(repeatX, repeatY);
                }
                return tex;
            } catch (err) {
                console.warn("Failed to load texture:", name, err);
                return null;
            }
        };

        const buildMaterial = async (name, meta) => {
            const matParams = {};
            if (meta.color !== undefined) matParams.color = meta.color;
            if (meta.emissive !== undefined) matParams.emissive = meta.emissive;
            if (meta.emissiveIntensity !== undefined) matParams.emissiveIntensity = meta.emissiveIntensity;
            if (meta.roughness !== undefined) matParams.roughness = meta.roughness;
            if (meta.metalness !== undefined) matParams.metalness = meta.metalness;
            if (meta.bumpScale !== undefined) matParams.bumpScale = meta.bumpScale;
            if (meta.transparent !== undefined) matParams.transparent = meta.transparent;
            if (meta.opacity !== undefined) matParams.opacity = meta.opacity;
            if (meta.shadowSide !== null && meta.shadowSide !== undefined) matParams.shadowSide = meta.shadowSide;
            
            const rx = meta.repeatX !== undefined ? meta.repeatX : 1;
            const ry = meta.repeatY !== undefined ? meta.repeatY : 1;
            const ws = meta.wrapS || THREE.RepeatWrapping;
            const wt = meta.wrapT || THREE.RepeatWrapping;
            
            if (meta.hasMap) {
                matParams.map = await loadTexRaw(`${name}_map`, rx, ry, ws, wt);
            }
            if (meta.hasBumpMap) {
                matParams.bumpMap = await loadTexRaw(`${name}_bump`, rx, ry, ws, wt);
            }
            if (meta.hasEmissiveMap) {
                matParams.emissiveMap = await loadTexRaw(`${name}_emissive`, rx, ry, ws, wt);
            }
            if (meta.hasRoughnessMap) {
                matParams.roughnessMap = await loadTexRaw(`${name}_roughness`, rx, ry, ws, wt);
            }
            
            return new THREE.MeshStandardMaterial(matParams);
        };

        const loadItem = async (key, meta) => {
            if (meta.type === 'Texture') {
                return await loadTexRaw(key);
            } else if (meta.type === 'Material') {
                return await buildMaterial(key, meta);
            } else {
                // Array case (like doorMat or cartonMats)
                const arr = [];
                const keys = Object.keys(meta).sort((a, b) => parseInt(a) - parseInt(b));
                for (const idx of keys) {
                    const subMeta = meta[idx];
                    if (subMeta.type === 'Texture') {
                        arr.push(await loadTexRaw(`${key}_${idx}`));
                    } else if (subMeta.type === 'Material') {
                        arr.push(await buildMaterial(`${key}_${idx}`, subMeta));
                    }
                }
                return arr;
            }
        };

        const loadedAssets = {};
        for (const [key, meta] of Object.entries(metadata)) {
            loadedAssets[key] = await loadItem(key, meta);
        }
        
        return loadedAssets;
    }
}
