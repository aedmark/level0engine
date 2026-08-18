import TextureCache from './textures/TextureCache.js';

export const SECTOR_METADATA_KEY = '__sectors';

export default class StaticTextureLoader {
    static _blobCache = null;
    static _pendingSaves = [];
    static _metadata = undefined;

    static async _primeBlobCache() {
        if (this._blobCache) return this._blobCache;
        this._blobCache = await TextureCache.getAllBlobs();
        return this._blobCache;
    }

    static async _loadMetadata() {
        if (this._metadata !== undefined) return this._metadata;
        try {
            const resp = await fetch('./assets/textures/metadata.json');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const metadata = await resp.json();
            await TextureCache.checkVersion(metadata.version || "1.0.0");
            this._blobCache = null;
            await this._primeBlobCache();
            this._metadata = metadata;
        } catch (err) {
            console.error("Failed to load texture metadata.json", err);
            this._metadata = null;
        }
        return this._metadata;
    }

    static async _decodeToTexture(blob) {
        if (typeof createImageBitmap === 'function') {
            try {
                const bitmap = await createImageBitmap(blob, {imageOrientation: 'flipY'});
                const tex = new THREE.Texture(bitmap);
                tex.flipY = false;
                tex.needsUpdate = true;
                return tex;
            } catch (err) {
            }
        }
        const url = URL.createObjectURL(blob);
        try {
            return await new THREE.TextureLoader().loadAsync(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    static async _resolveBlob(name) {
        const cached = this._blobCache && this._blobCache.get(name);
        if (cached) return cached;
        const resp = await fetch(`./assets/textures/${name}.webp`);
        if (!resp.ok) return null;
        const blob = await resp.blob();
        this._pendingSaves.push([name, blob]);
        return blob;
    }

    static async flushPendingSaves() {
        if (this._pendingSaves.length === 0) return;
        const batch = this._pendingSaves;
        this._pendingSaves = [];
        await TextureCache.saveBlobs(batch);
    }

    static async _loadTexRaw(name, repeatX = 1, repeatY = 1, wrapS = THREE.RepeatWrapping, wrapT = THREE.RepeatWrapping) {
        try {
            const blob = await this._resolveBlob(name);
            if (!blob) return null;
            const tex = await this._decodeToTexture(blob);
            if (!tex) return null;

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
    }

    static async _buildMaterial(name, meta) {
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
        if (meta.side !== undefined) matParams.side = meta.side;
        if (meta.depthWrite !== undefined) matParams.depthWrite = meta.depthWrite;
        if (meta.alphaTest !== undefined) matParams.alphaTest = meta.alphaTest;
        if (meta.vertexColors !== undefined) matParams.vertexColors = meta.vertexColors;
        if (meta.blending !== undefined) matParams.blending = meta.blending;
        if (meta.polygonOffset !== undefined) matParams.polygonOffset = meta.polygonOffset;
        if (meta.polygonOffsetFactor !== undefined) matParams.polygonOffsetFactor = meta.polygonOffsetFactor;

        const rx = meta.repeatX !== undefined ? meta.repeatX : 1;
        const ry = meta.repeatY !== undefined ? meta.repeatY : 1;
        const ws = meta.wrapS || THREE.RepeatWrapping;
        const wt = meta.wrapT || THREE.RepeatWrapping;

        if (meta.type === 'SpriteMaterial') {
            const spriteMap = meta.hasMap ? await this._loadTexRaw(`${name}_map`) : null;
            if (meta.hasMap && !spriteMap) return null;
            if (spriteMap) matParams.map = spriteMap;
            delete matParams.roughness;
            delete matParams.metalness;
            delete matParams.bumpScale;
            const sprite = new THREE.SpriteMaterial(matParams);
            if (meta.userData) sprite.userData = {...sprite.userData, ...meta.userData};
            return sprite;
        }

        const [map, bumpMap, emissiveMap, roughnessMap] = await Promise.all([
            meta.hasMap ? this._loadTexRaw(`${name}_map`, rx, ry, ws, wt) : null,
            meta.hasBumpMap ? this._loadTexRaw(`${name}_bump`, rx, ry, ws, wt) : null,
            meta.hasEmissiveMap ? this._loadTexRaw(`${name}_emissive`, rx, ry, ws, wt) : null,
            meta.hasRoughnessMap ? this._loadTexRaw(`${name}_roughness`, rx, ry, ws, wt) : null
        ]);

        if ((meta.hasMap && !map) || (meta.hasBumpMap && !bumpMap) ||
            (meta.hasEmissiveMap && !emissiveMap) || (meta.hasRoughnessMap && !roughnessMap)) {
            return null;
        }

        if (map) matParams.map = map;
        if (bumpMap) matParams.bumpMap = bumpMap;
        if (emissiveMap) matParams.emissiveMap = emissiveMap;
        if (roughnessMap) matParams.roughnessMap = roughnessMap;

        const mat = meta.type === 'BasicMaterial'
            ? new THREE.MeshBasicMaterial(matParams)
            : new THREE.MeshStandardMaterial(matParams);
        if (meta.userData) mat.userData = {...mat.userData, ...meta.userData};
        return mat;
    }

    static async _loadItem(key, meta) {
        if (meta.type === 'Texture') {
            return await this._loadTexRaw(key);
        } else if (meta.type === 'Material' || meta.type === 'BasicMaterial' || meta.type === 'SpriteMaterial') {
            return await this._buildMaterial(key, meta);
        } else {
            const keys = Object.keys(meta).sort((a, b) => parseInt(a) - parseInt(b));
            const itemPromises = keys.map(async (idx) => {
                const subMeta = meta[idx];
                if (subMeta.type === 'Texture') {
                    return await this._loadTexRaw(`${key}_${idx}`);
                } else if (subMeta.type === 'Material' || subMeta.type === 'BasicMaterial' || subMeta.type === 'SpriteMaterial') {
                    return await this._buildMaterial(`${key}_${idx}`, subMeta);
                }
                return null;
            });
            return await Promise.all(itemPromises);
        }
    }

    static async loadCoreAssets(onProgress = null) {
        const metadata = await this._loadMetadata();
        if (!metadata) return {};

        const loadedAssets = {};
        const entries = Object.entries(metadata)
            .filter(([key]) => key !== 'version' && key !== SECTOR_METADATA_KEY);
        let count = 0;

        const assetPromises = entries.map(async ([key, meta]) => {
            const item = await this._loadItem(key, meta);
            count++;
            if (onProgress) onProgress(count / entries.length, key);
            return [key, item];
        });

        const results = await Promise.all(assetPromises);
        for (const [key, item] of results) {
            loadedAssets[key] = item;
        }

        this.flushPendingSaves().catch(() => {});
        return loadedAssets;
    }

    static async loadSectorAssets(sectorName) {
        const metadata = await this._loadMetadata();
        if (!metadata) return null;

        const sectors = metadata[SECTOR_METADATA_KEY];
        const bundle = sectors && sectors[sectorName];
        if (!bundle || !bundle.keys) return null;
        if (Array.isArray(bundle.residual) && bundle.residual.length > 0) return null;

        const entries = Object.entries(bundle.keys);
        if (entries.length === 0) return null;

        try {
            const results = await Promise.all(entries.map(async ([key, meta]) => {
                const item = await this._loadItem(key, meta);
                return [key, item];
            }));

            const out = {};
            for (const [key, item] of results) {
                const missing = item === null || item === undefined ||
                    (Array.isArray(item) && item.some(sub => sub === null || sub === undefined));
                if (missing) return null;
                out[key] = item;
            }
            this.flushPendingSaves().catch(() => {});
            return out;
        } catch (err) {
            console.warn(`[TEXTURES] Static bundle for ${sectorName} failed to load, falling back to generator:`, err);
            return null;
        }
    }
}
