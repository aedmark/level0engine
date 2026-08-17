export default class TextureCache {
    static dbName = 'Level0DB';
    static textureStore = 'textures';
    static saveStore = 'worldSaves';
    static version = 2;
    static db = null;

    static init() {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.textureStore)) {
                    db.createObjectStore(this.textureStore);
                }
                if (!db.objectStoreNames.contains(this.saveStore)) {
                    db.createObjectStore(this.saveStore);
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    static async getBlob(id) {
        try {
            await this.init();
            return new Promise((resolve) => {
                const tx = this.db.transaction(this.textureStore, 'readonly');
                const store = tx.objectStore(this.textureStore);
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * One transaction for the whole texture set, instead of one per texture.
     *
     * StaticTextureLoader asks for ~95 blobs during phase 2. Going through getBlob()
     * for each meant 95 separate readonly transactions, each with its own open/commit
     * cycle, all contending during the busiest stretch of boot. getAllKeys + getAll on
     * a single transaction returns the same data in one round trip through the store.
     *
     * Returns a Map of id -> Blob. An empty Map means a cold cache (or an IDB failure),
     * which callers should treat as "fetch everything from the network" — never as an
     * error, since the network path is always available as a fallback.
     */
    static async getAllBlobs() {
        try {
            await this.init();
            return new Promise((resolve) => {
                const out = new Map();
                const tx = this.db.transaction(this.textureStore, 'readonly');
                const store = tx.objectStore(this.textureStore);
                const keysReq = store.getAllKeys();
                const valsReq = store.getAll();
                tx.oncomplete = () => {
                    const keys = keysReq.result || [];
                    const vals = valsReq.result || [];
                    for (let i = 0; i < keys.length; i++) {
                        if (vals[i]) out.set(keys[i], vals[i]);
                    }
                    resolve(out);
                };
                tx.onerror = () => resolve(out);
                tx.onabort = () => resolve(out);
            });
        } catch (e) {
            return new Map();
        }
    }

    /**
     * Companion to getAllBlobs: writes a whole batch of freshly-fetched blobs back in
     * one readwrite transaction rather than one per texture.
     */
    static async saveBlobs(entries) {
        if (!entries || entries.length === 0) return;
        try {
            await this.init();
            return new Promise((resolve) => {
                const tx = this.db.transaction(this.textureStore, 'readwrite');
                const store = tx.objectStore(this.textureStore);
                for (const [id, blob] of entries) store.put(blob, id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
                tx.onabort = () => resolve();
            });
        } catch (e) {
        }
    }

    static async saveBlob(id, blob) {
        try {
            await this.init();
            return new Promise((resolve) => {
                const tx = this.db.transaction(this.textureStore, 'readwrite');
                const store = tx.objectStore(this.textureStore);
                store.put(blob, id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {
        }
    }

    static async getCanvas(id) {
        const blob = await this.getBlob(id);
        if (!blob) return null;
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                resolve(canvas);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };
        });
    }

    static async saveCanvas(id, canvas) {
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                if (blob) {
                    await this.saveBlob(id, blob);
                }
                resolve();
            }, 'image/png');
        });
    }

    static async getSaveState(key = 'level0_state') {
        try {
            await this.init();
            return new Promise((resolve) => {
                const tx = this.db.transaction(this.saveStore, 'readonly');
                const store = tx.objectStore(this.saveStore);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    static async saveWorldState(key = 'level0_state', stateData) {
        try {
            await this.init();
            return new Promise((resolve) => {
                const tx = this.db.transaction(this.saveStore, 'readwrite');
                const store = tx.objectStore(this.saveStore);
                store.put(stateData, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {
        }
    }

    static async clearTexturesOnly() {
        try {
            await this.init();
            const tx = this.db.transaction(this.textureStore, 'readwrite');
            tx.objectStore(this.textureStore).clear();
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {}
    }

    static async checkVersion(currentVersion = "1.0.0") {
        try {
            const savedVersion = await this.getSaveState('engine_version');
            if (savedVersion !== currentVersion) {
                console.log(`[Cache] Asset version update detected (${savedVersion || 'none'} -> ${currentVersion}). Refreshing IndexedDB texture cache...`);
                await this.clearTexturesOnly();
                await this.saveWorldState('engine_version', currentVersion);
            }
        } catch (e) {}
    }

    static async clearAll() {
        try {
            await this.init();
            const tx = this.db.transaction([this.textureStore, this.saveStore], 'readwrite');
            tx.objectStore(this.textureStore).clear();
            tx.objectStore(this.saveStore).clear();
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {}
    }
}
