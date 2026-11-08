// Where a sector chunk's airlocks go. Every macro chunk builds one airlock per side at a fixed
// cross-cell, so the positions are a pure function of the chunk coordinates. SetPieces builds from
// these and AirlockApron derives neighbours' airlocks from them, so the two cannot drift (P5-01).
// No imports: SetPieces and the apron code both load this.

export const AIRLOCK_CROSS_CELL = 7;
export const AIRLOCK_CHAMBER_DEPTH = 2.8;

// One entry per chunk side. spansX airlocks sit on a z boundary.
export function entranceSides(chunkSize) {
    const edge = chunkSize - 1;
    return [
        {spansX: true, boundary: 0, dir: 1},
        {spansX: true, boundary: edge, dir: -1},
        {spansX: false, boundary: 0, dir: 1},
        {spansX: false, boundary: edge, dir: -1}
    ];
}

export function airlockDoorPositions(dcx, dcz, spansX, outSign) {
    const inSign = -outSign;
    const halfDepth = AIRLOCK_CHAMBER_DEPTH * 0.5;
    return {
        outerX: dcx - (spansX ? 0 : inSign * halfDepth),
        outerZ: dcz - (spansX ? inSign * halfDepth : 0),
        innerX: dcx + (spansX ? 0 : inSign * halfDepth),
        innerZ: dcz + (spansX ? inSign * halfDepth : 0)
    };
}

// The plain-data airlocks a macro chunk at (chunkX, chunkZ) will build, in the shape ChunkWorker
// and the apron checks read: {chunkHash, spansX, outSign, chamberCenter, outerPos}.
export function airlocksForMacroChunk(chunkX, chunkZ, chunkSize, cellSize) {
    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;
    const out = [];
    for (const side of entranceSides(chunkSize)) {
        const spansX = side.spansX;
        const outSign = side.dir === 1 ? -1 : 1;
        const cellX = startX + (spansX ? AIRLOCK_CROSS_CELL : side.boundary);
        const cellZ = startZ + (spansX ? side.boundary : AIRLOCK_CROSS_CELL);
        const dcx = cellX * cellSize;
        const dcz = cellZ * cellSize;
        const {outerX, outerZ} = airlockDoorPositions(dcx, dcz, spansX, outSign);
        out.push({
            chunkHash: `${chunkX},${chunkZ}`,
            spansX,
            outSign,
            chamberCenter: {x: dcx, z: dcz},
            outerPos: {x: outerX, z: outerZ}
        });
    }
    return out;
}
