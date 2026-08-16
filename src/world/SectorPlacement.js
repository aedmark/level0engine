const SALT_MACRO = 0x9e3779b1;
const SALT_PRIORITY = 0x5bf03635;
const SALT_DECK = 0x1b873593;
const SALT_EXIT = 0x7f4a7c15;

export function mix32(seed, a, b) {
    let h = (seed ^ Math.imul(a | 0, 0x27d4eb2f) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

const unit = (h) => h / 4294967296;

function isCandidate(cfg, cx, cz) {
    if (Math.max(Math.abs(cx), Math.abs(cz)) < cfg.exclusionRadius) return false;
    return unit(mix32(cfg.baseSeed ^ SALT_MACRO, cx, cz)) > cfg.macroThreshold;
}

function priority(cfg, cx, cz) {
    return mix32(cfg.baseSeed ^ SALT_PRIORITY, cx, cz);
}

const ringOf = (cx, cz) => Math.max(Math.abs(cx), Math.abs(cz));

function outranks(cfg, ax, az, bx, bz) {
    const ra = ringOf(ax, az), rb = ringOf(bx, bz);
    if (ra !== rb) return ra < rb;
    const a = priority(cfg, ax, az), b = priority(cfg, bx, bz);
    if (a !== b) return a > b;
    if (az !== bz) return az < bz;
    return ax < bx;
}

const CACHE_LIMIT = 200000;

export function isMacroChunk(cfg, cx, cz) {
    if (cfg.macroCache.size > CACHE_LIMIT) cfg.macroCache.clear();
    return claims(cfg, cx, cz);
}

function claims(cfg, cx, cz) {
    if (!isCandidate(cfg, cx, cz)) return false;
    const key = `${cx},${cz}`;
    const seen = cfg.macroCache.get(key);
    if (seen !== undefined) return seen;
    cfg.macroCache.set(key, false);
    const reach = cfg.minSpacing;
    let claimed = true;
    for (let dx = -reach; dx <= reach && claimed; dx++) {
        for (let dz = -reach; dz <= reach; dz++) {
            if (dx === 0 && dz === 0) continue;
            const ox = cx + dx, oz = cz + dz;
            if (!isCandidate(cfg, ox, oz)) continue;
            if (!outranks(cfg, ox, oz, cx, cz)) continue;
            if (claims(cfg, ox, oz)) { claimed = false; break; }
        }
    }
    cfg.macroCache.set(key, claimed);
    return claimed;
}

const floorDiv = (n, d) => Math.floor(n / d);

function regionDeck(cfg, ids, rx, rz) {
    const deck = ids.slice();
    let s = mix32(cfg.baseSeed ^ SALT_DECK, rx, rz);
    const next = () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return unit(s);
    };
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = deck[i];
        deck[i] = deck[j];
        deck[j] = tmp;
    }
    return deck;
}

function regionSectors(cfg, rx, rz) {
    const key = `${rx},${rz}`;
    let found = cfg.regionCache.get(key);
    if (found) return found;
    found = [];
    const size = cfg.regionSize;
    const x0 = rx * size, z0 = rz * size;
    for (let dz = 0; dz < size; dz++) {
        for (let dx = 0; dx < size; dx++) {
            if (isMacroChunk(cfg, x0 + dx, z0 + dz)) found.push(`${x0 + dx},${z0 + dz}`);
        }
    }
    cfg.regionCache.set(key, found);
    return found;
}

export function sectorIdFor(cfg, ids, cx, cz) {
    if (!ids.length) return null;
    const rx = floorDiv(cx, cfg.regionSize);
    const rz = floorDiv(cz, cfg.regionSize);
    const slot = regionSectors(cfg, rx, rz).indexOf(`${cx},${cz}`);
    if (slot < 0) return null;
    return regionDeck(cfg, ids, rx, rz)[slot % ids.length];
}

function exitRegion(cfg) {
    if (cfg.exitChunk !== undefined) return cfg.exitChunk;
    const h = mix32(cfg.baseSeed ^ SALT_EXIT, 0x51ed, 0x270d);
    const rings = 2 + (h % 3);
    const turn = ((h >>> 8) % 8) * (Math.PI / 4);
    const rx0 = Math.round(Math.cos(turn) * rings);
    const rz0 = Math.round(Math.sin(turn) * rings);

    let found = null;
    for (let ring = 0; ring <= 6 && !found; ring++) {
        for (let dx = -ring; dx <= ring && !found; dx++) {
            for (let dz = -ring; dz <= ring; dz++) {
                if (ring > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
                const inRegion = regionSectors(cfg, rx0 + dx, rz0 + dz);
                if (!inRegion.length) continue;
                let best = null, bestRank = -1;
                for (let i = 0; i < inRegion.length; i++) {
                    const [ox, oz] = inRegion[i].split(',').map(Number);
                    const rank = mix32(cfg.baseSeed ^ SALT_EXIT, ox, oz);
                    if (rank > bestRank) { bestRank = rank; best = inRegion[i]; }
                }
                found = best;
                break;
            }
        }
    }
    cfg.exitChunk = found;
    return found;
}

export function isExitChunk(cfg, cx, cz) {
    return exitRegion(cfg) === `${cx},${cz}`;
}

export function placementConfig(env) {
    if (!env._placementCfg || env._placementCfg.baseSeed !== env.baseSeed) {
        env._placementCfg = {
            baseSeed: env.baseSeed >>> 0,
            exclusionRadius: env.macroSpawnExclusionRadius,
            minSpacing: env.macroMinSpacingChunks,
            macroThreshold: 0.15,
            regionSize: 12,
            macroCache: new Map(),
            regionCache: new Map(),
            exitChunk: undefined
        };
    }
    return env._placementCfg;
}
