/**
 * [ROLE] Manages caching of generated chunk data to IndexedDB.
 * [WHY] Significantly speeds up reloading chunks across sessions by storing pre-compiled instance matrices and layouts.
 * [STATE] Stateless wrapper over native indexedDB.
 * [DEPENDS] native indexedDB API.
 */
export default class ChunkCache {
    static dbName = 'level0_chunk_cache';
    static storeName = 'chunks';
    static version = 1;
    static dbPromise = null;

    static getDB() {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });

        return this.dbPromise;
    }

    static async saveChunk(hash, data) {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(data, hash);

                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('Failed to save chunk to cache', e);
        }
    }

    static async loadChunk(hash) {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(hash);

                request.onsuccess = (e) => resolve(e.target.result || null);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('Failed to load chunk from cache', e);
            return null;
        }
    }

    static async clearAll() {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('Failed to clear chunk cache', e);
        }
    }
}
