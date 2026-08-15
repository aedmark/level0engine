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
