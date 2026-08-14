import TextureMechanics from './textures/TextureMechanics.js';
import TextureCache from './textures/TextureCache.js';

export default class StaticTextureLoader {
    static async loadCoreAssets(onProgress = null) {
        const loader = new THREE.TextureLoader();
        
        let metadata;
        try {
            const resp = await fetch('./assets/textures/metadata.json');
            metadata = await resp.json();
            await TextureCache.checkVersion(metadata.version || "1.0.0");
        } catch (err) {
            console.error("Failed to load texture metadata.json", err);
            return {};
        }
        
        const loadTexRaw = async (name, repeatX = 1, repeatY = 1, wrapS = THREE.RepeatWrapping, wrapT = THREE.RepeatWrapping) => {
            try {
                let blobUrl = null;
                const cachedBlob = await TextureCache.getBlob(name);
                
                if (cachedBlob) {
                    blobUrl = URL.createObjectURL(cachedBlob);
                } else {
                    const resp = await fetch(`./assets/textures/${name}.webp`);
                    if (resp.ok) {
                        const blob = await resp.blob();
                        TextureCache.saveBlob(name, blob).catch(() => {});
                        blobUrl = URL.createObjectURL(blob);
                    } else {
                        blobUrl = `./assets/textures/${name}.webp`;
                    }
                }

                const tex = await loader.loadAsync(blobUrl);
                
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
            
            const [map, bumpMap, emissiveMap, roughnessMap] = await Promise.all([
                meta.hasMap ? loadTexRaw(`${name}_map`, rx, ry, ws, wt) : null,
                meta.hasBumpMap ? loadTexRaw(`${name}_bump`, rx, ry, ws, wt) : null,
                meta.hasEmissiveMap ? loadTexRaw(`${name}_emissive`, rx, ry, ws, wt) : null,
                meta.hasRoughnessMap ? loadTexRaw(`${name}_roughness`, rx, ry, ws, wt) : null
            ]);

            if (map) matParams.map = map;
            if (bumpMap) matParams.bumpMap = bumpMap;
            if (emissiveMap) matParams.emissiveMap = emissiveMap;
            if (roughnessMap) matParams.roughnessMap = roughnessMap;
            
            return new THREE.MeshStandardMaterial(matParams);
        };

        const loadItem = async (key, meta) => {
            if (meta.type === 'Texture') {
                return await loadTexRaw(key);
            } else if (meta.type === 'Material') {
                return await buildMaterial(key, meta);
            } else {
                // Array case (like doorMat or cartonMats)
                const keys = Object.keys(meta).sort((a, b) => parseInt(a) - parseInt(b));
                const itemPromises = keys.map(async (idx) => {
                    const subMeta = meta[idx];
                    if (subMeta.type === 'Texture') {
                        return await loadTexRaw(`${key}_${idx}`);
                    } else if (subMeta.type === 'Material') {
                        return await buildMaterial(`${key}_${idx}`, subMeta);
                    }
                    return null;
                });
                return await Promise.all(itemPromises);
            }
        };

        const loadedAssets = {};
        const entries = Object.entries(metadata);
        let count = 0;

        const assetPromises = entries.map(async ([key, meta]) => {
            const item = await loadItem(key, meta);
            count++;
            if (onProgress) {
                const pct = 15 + Math.round((count / entries.length) * 25);
                onProgress(pct, key);
            }
            return [key, item];
        });

        const results = await Promise.all(assetPromises);
        for (const [key, item] of results) {
            loadedAssets[key] = item;
        }
        
        return loadedAssets;
    }
}
