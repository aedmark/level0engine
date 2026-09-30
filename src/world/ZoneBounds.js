export function setMacroZone(env, hash, startX, startZ, activeSector) {
    const inset = 8;
    env.macroZones.set(hash, {
        id: activeSector.id,
        fog: env.atmosphereManager._sectorFog(activeSector.id),
        minX: startX * env.cellSize + inset,
        maxX: startX * env.cellSize + (64 - inset),
        minZ: startZ * env.cellSize + inset,
        maxZ: startZ * env.cellSize + (64 - inset),
        startX: startX,
        startZ: startZ
    });
}
