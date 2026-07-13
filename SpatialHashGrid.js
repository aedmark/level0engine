// SpatialHashGrid.js
// LEVEL 0 SPATIAL HASH GRID SYSTEM

export default class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.chunkMap = new Map();
        this.queryId = 0;
        this.queryCache = [];
    }

    clear() {
        this.cells.clear();
        this.chunkMap.clear();
        this.queryCache.length = 0;
        this.queryId = 0;
    }

    insert(box) {
        const startX = Math.floor(box.min.x / this.cellSize);
        const startZ = Math.floor(box.min.z / this.cellSize);
        const endX = Math.floor(box.max.x / this.cellSize);
        const endZ = Math.floor(box.max.z / this.cellSize);
        if (box.chunkHash) {
            if (!this.chunkMap.has(box.chunkHash)) this.chunkMap.set(box.chunkHash, new Set());
            this.chunkMap.get(box.chunkHash).add(box);
        }
        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                const key = (x << 16) | (z & 0xFFFF);
                if (!this.cells.has(key)) this.cells.set(key, []);
                this.cells.get(key).push(box);
            }
        }
    }

    removeByChunk(chunkHash) {
        const boxes = this.chunkMap.get(chunkHash);
        if (!boxes) return;
        for (const box of boxes) {
            const startX = Math.floor(box.min.x / this.cellSize);
            const startZ = Math.floor(box.min.z / this.cellSize);
            const endX = Math.floor(box.max.x / this.cellSize);
            const endZ = Math.floor(box.max.z / this.cellSize);
            for (let x = startX; x <= endX; x++) {
                for (let z = startZ; z <= endZ; z++) {
                    const key = (x << 16) | (z & 0xFFFF);
                    const cell = this.cells.get(key);
                    if (cell) {
                        const idx = cell.indexOf(box);
                        if (idx !== -1) {
                            const last = cell.pop();
                            if (idx < cell.length) cell[idx] = last;
                        }
                        if (cell.length === 0) this.cells.delete(key);
                    }
                }
            }
        }
        this.chunkMap.delete(chunkHash);
    }

    getNearby(x, z, radius) {
        let count = 0;
        this.queryId++;
        const startX = Math.floor((x - radius) / this.cellSize);
        const startZ = Math.floor((z - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const endZ = Math.floor((z + radius) / this.cellSize);
        for (let cx = startX; cx <= endX; cx++) {
            for (let cz = startZ; cz <= endZ; cz++) {
                const key = (cx << 16) | (cz & 0xFFFF);
                const cell = this.cells.get(key);
                if (cell) {
                    for (const box of cell) {
                        if (box._queryId !== this.queryId) {
                            box._queryId = this.queryId;
                            this.queryCache[count++] = box;
                        }
                    }
                }
            }
        }
        this.queryCache.length = count;
        return this.queryCache;
    }
}