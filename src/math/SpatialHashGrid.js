/**
 * A fast, 2D broad-phase spatial partitioner used for collision detection and culling.
 *
 * Instead of checking every entity against every wall (O(N^2)),
 * the world is divided into a grid of "cells". Objects are hashed into the cells they overlap.
 * When checking for collisions around a point, we only query the cells immediately nearby,
 * reducing collision checks from thousands to just a handful (O(1)).
 */
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

    /**
     * Inserts an AABB into the spatial hash grid.
     *
     * An object might overlap multiple cells if it sits on a boundary.
     * We calculate its min/max cell bounds and insert it into all overlapped cells.
     *
     * @param {AABB} box - The bounding box to insert, containing .min and .max Vec3s.
     */
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
        this.chunkMap.delete(chunkHash);
    }

    /**
     * Retrieves all AABBs within a specified radius of a given (X, Z) coordinate.
     *
     * Because a single object might span multiple cells, it could be
     * returned multiple times if we aren't careful. We use `queryId` to tag objects
     * that have already been collected in the current query, avoiding duplicates
     * without needing slow array `.includes()` checks or expensive Set allocations.
     *
     * @param {number} x - The X coordinate of the query center.
     * @param {number} z - The Z coordinate of the query center.
     * @param {number} radius - The radius to search.
     * @returns {Array<AABB>} An array of nearby bounding boxes.
     */
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