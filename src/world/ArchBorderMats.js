// Shared helper for blueprint pieces that border an ARCH_HALL cell: swap the outward-facing
// side(s) of an otherwise-plain wallpaper material array to a straight subway-tile variant so
// the arch hall's tiled look doesn't cut off abruptly at the boundary. See changelog v1.5.7.

export function pickStraightTileMat(env, random, fallback) {
    return env.subwayTileMatsStraight
        ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
        : fallback;
}

export function isArchNeighbor(ctx, gx, gz, dx, dz) {
    return !!ctx.getForcedStructure && ctx.getForcedStructure(gx + dx, gz + dz) === 'ARCH_HALL';
}

// Builds a 6-face material array (THREE.BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z),
// defaulting every face to `baseMat` and swapping in a straight-tile material on any face
// listed in `faces` ({index, dx, dz}) whose (dx, dz) neighbor is a forced ARCH_HALL cell.
export function archBorderMats(env, ctx, random, gx, gz, baseMat, faces) {
    const arr = [baseMat, baseMat, baseMat, baseMat, baseMat, baseMat];
    for (const f of faces) {
        if (isArchNeighbor(ctx, gx, gz, f.dx, f.dz)) {
            arr[f.index] = pickStraightTileMat(env, random, baseMat);
        }
    }
    return arr;
}
