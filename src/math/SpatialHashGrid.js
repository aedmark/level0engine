export default class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.chunkMap = new Map();
        this.queryId = 0;
        this.queryCache = [];
    }

    _hash(x, z) {
        return (x + 100000) * 200000 + (z + 100000);
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
                const key = this._hash(x, z);
                if (!this.cells.has(key)) this.cells.set(key, []);
                this.cells.get(key).push(box);
            }
        }
    }

    _unindex(box) {
        const startX = Math.floor(box.min.x / this.cellSize);
        const startZ = Math.floor(box.min.z / this.cellSize);
        const endX = Math.floor(box.max.x / this.cellSize);
        const endZ = Math.floor(box.max.z / this.cellSize);
        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) {
                const key = this._hash(x, z);
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

    remove(box) {
        if (!box) return;
        this._unindex(box);
        if (box.chunkHash) {
            const boxes = this.chunkMap.get(box.chunkHash);
            if (boxes) boxes.delete(box);
        }
    }

    removeByChunk(chunkHash) {
        const boxes = this.chunkMap.get(chunkHash);
        if (!boxes) return;
        for (const box of boxes) this._unindex(box);
        this.chunkMap.delete(chunkHash);
    }

    forEachAlongSegment(x0, z0, x1, z1, visit) {
        const cs = this.cellSize;
        let cx = Math.floor(x0 / cs);
        let cz = Math.floor(z0 / cs);
        const endX = Math.floor(x1 / cs);
        const endZ = Math.floor(z1 / cs);
        const dx = x1 - x0;
        const dz = z1 - z0;
        const stepX = dx > 0 ? 1 : -1;
        const stepZ = dz > 0 ? 1 : -1;
        const absDx = Math.abs(dx);
        const absDz = Math.abs(dz);
        const tDeltaX = absDx > 1e-9 ? cs / absDx : Infinity;
        const tDeltaZ = absDz > 1e-9 ? cs / absDz : Infinity;
        let tMaxX = absDx > 1e-9 ? ((dx > 0 ? (cx + 1) * cs - x0 : x0 - cx * cs) / absDx) : Infinity;
        let tMaxZ = absDz > 1e-9 ? ((dz > 0 ? (cz + 1) * cs - z0 : z0 - cz * cs) / absDz) : Infinity;
        this.queryId++;
        const guardLimit = Math.abs(endX - cx) + Math.abs(endZ - cz) + 2;
        for (let guard = 0; guard < guardLimit; guard++) {
            const cell = this.cells.get(this._hash(cx, cz));
            if (cell) {
                for (let i = 0; i < cell.length; i++) {
                    const box = cell[i];
                    if (box._queryId === this.queryId) continue;
                    box._queryId = this.queryId;
                    if (visit(box)) return true;
                }
            }
            if (cx === endX && cz === endZ) break;
            if (tMaxX < tMaxZ) {
                tMaxX += tDeltaX;
                cx += stepX;
            } else {
                tMaxZ += tDeltaZ;
                cz += stepZ;
            }
        }
        return false;
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
                const key = this._hash(cx, cz);
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