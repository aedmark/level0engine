export default class TextureCache {
    static dbName = 'Level0TextureDB';
    static storeName = 'textures';
    static version = 1;
    static db = null;

    static init() {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    static async getCanvas(id) {
        await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = async () => {
                const blob = request.result;
                if (!blob) return resolve(null);
                
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(img.src);
                    resolve(canvas);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(img.src);
                    resolve(null);
                };
            };
            request.onerror = () => resolve(null);
        });
    }

    static async saveCanvas(id, canvas) {
        await this.init();
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) return resolve();
                const tx = this.db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.put(blob, id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            }, 'image/png');
        });
    }
}
