import {sanitizeSeed} from './SeedLink.js';

// Ghost runs (P5-06, D-012): a run through one world (one live seed) recorded as the player's path, so a
// later run on the same seed can replay it as a translucent figure. Pure encoding, validation and choice
// rules, with no DOM, THREE or storage, so the test can pin them. Imported files are untrusted.

export const GHOST_FORMAT = 'level0-ghost';
export const GHOST_VERSION = 1;
export const SAMPLE_RATE = 0.25;               // seconds of game time between samples
export const MAX_SAMPLES = 14400;              // one hour; recording stops there
export const MAX_FILE_CHARS = 512 * 1024;
export const MAX_KEYFRAMES = 1000;
const DELTA_LIMIT = 32000;                     // decimetres per sample before a keyframe is used

// Samples [{x, z, yaw}] (metres, radians) into a compact record. Positions are kept in decimetres as
// per-sample deltas; a jump too large for a delta (a respawn, a sector rescue) becomes a keyframe.
export function encodeSamples(samples) {
    const n = samples.length;
    const deltas = new Int16Array(n * 2);
    const yaws = new Uint8Array(n);
    const keyframes = [];
    let px = 0, pz = 0;
    for (let i = 0; i < n; i++) {
        const x = Math.round(samples[i].x * 10);
        const z = Math.round(samples[i].z * 10);
        const dx = x - px, dz = z - pz;
        if (i === 0 || Math.abs(dx) > DELTA_LIMIT || Math.abs(dz) > DELTA_LIMIT) {
            keyframes.push({i, x, z});
        } else {
            deltas[i * 2] = dx;
            deltas[i * 2 + 1] = dz;
        }
        px = x; pz = z;
        const turn = ((samples[i].yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        yaws[i] = Math.round(turn / (Math.PI * 2) * 256) & 255;
    }
    const bytes = new Uint8Array(n * 5);
    bytes.set(new Uint8Array(deltas.buffer), 0);
    bytes.set(yaws, n * 4);
    return {count: n, data: toBase64(bytes), keyframes};
}

export function decodeSamples({count, data, keyframes}) {
    const bytes = fromBase64(data);
    if (bytes.length !== count * 5) throw new Error('ghost data length does not match its sample count');
    const deltas = new Int16Array(bytes.slice(0, count * 4).buffer);
    const yaws = bytes.subarray(count * 4);
    const keys = new Map(keyframes.map(k => [k.i, k]));
    const out = new Array(count);
    let x = 0, z = 0;
    for (let i = 0; i < count; i++) {
        const k = keys.get(i);
        if (k) { x = k.x; z = k.z; } else { x += deltas[i * 2]; z += deltas[i * 2 + 1]; }
        out[i] = {x: x / 10, z: z / 10, yaw: yaws[i] / 256 * Math.PI * 2};
    }
    return out;
}

function toBase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
}

function fromBase64(str) {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
}

// Interpolated pose at `t` seconds into the run, or null once the run has ended.
export function poseAt(samples, t) {
    if (!samples.length || t < 0) return null;
    const f = t / SAMPLE_RATE;
    const i = Math.floor(f);
    if (i >= samples.length - 1) return i === samples.length - 1 ? samples[i] : null;
    const a = samples[i], b = samples[i + 1];
    const u = f - i;
    // A keyframe-sized jump is a teleport: snap rather than glide across the map.
    if (Math.abs(b.x - a.x) > 20 || Math.abs(b.z - a.z) > 20) return u < 0.5 ? a : b;
    let dy = b.yaw - a.yaw;
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    return {x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, yaw: a.yaw + dy * u};
}

export function buildGhostFile(run) {
    return {
        format: GHOST_FORMAT,
        version: GHOST_VERSION,
        seed: run.seed,
        completed: !!run.completed,
        duration: run.duration,
        rate: SAMPLE_RATE,
        count: run.count,
        data: run.data,
        keyframes: run.keyframes,
        createdAt: run.createdAt
    };
}

const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

// Parses an imported ghost file. Throws with a short reason on anything unexpected.
export function parseGhostFile(text) {
    if (typeof text !== 'string' || text.length > MAX_FILE_CHARS) throw new Error('file is too large');
    let o;
    try { o = JSON.parse(text); } catch (e) { throw new Error('not a ghost file'); }
    if (!o || o.format !== GHOST_FORMAT) throw new Error('not a ghost file');
    if (o.version !== GHOST_VERSION) throw new Error('unsupported ghost version');
    const seed = sanitizeSeed(o.seed);
    if (!seed || seed !== o.seed) throw new Error('bad seed');
    if (o.rate !== SAMPLE_RATE) throw new Error('unsupported sample rate');
    if (!isInt(o.count) || o.count < 2 || o.count > MAX_SAMPLES) throw new Error('bad sample count');
    if (typeof o.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(o.data)) throw new Error('bad data');
    if (!Array.isArray(o.keyframes) || o.keyframes.length < 1 || o.keyframes.length > MAX_KEYFRAMES) throw new Error('bad keyframes');
    for (const k of o.keyframes) {
        if (!k || !isInt(k.i) || k.i < 0 || k.i >= o.count || !isInt(k.x) || !isInt(k.z) ||
            Math.abs(k.x) > 2e9 || Math.abs(k.z) > 2e9) throw new Error('bad keyframe');
    }
    if (o.keyframes[0].i !== 0) throw new Error('bad keyframes');
    if (typeof o.duration !== 'number' || !Number.isFinite(o.duration) || o.duration < 0 || o.duration > 4 * 3600) throw new Error('bad duration');
    const run = {
        seed,
        completed: o.completed === true,
        duration: o.duration,
        count: o.count,
        data: o.data,
        keyframes: o.keyframes.map(k => ({i: k.i, x: k.x, z: k.z})),
        createdAt: typeof o.createdAt === 'string' ? o.createdAt.slice(0, 40) : null
    };
    decodeSamples(run); // throws if the data does not match the count
    return run;
}

// Which stored run to replay on a seed: an imported ghost, then your best completed run, then your
// most recent attempt.
export function chooseGhost(entry) {
    if (!entry) return null;
    if (entry.imported) return {run: entry.imported, kind: 'imported'};
    if (entry.best) return {run: entry.best, kind: 'best'};
    if (entry.last) return {run: entry.last, kind: 'attempt'};
    return null;
}

// Files a finished recording into a seed's entry: completed runs compete for best, every run is the last.
export function fileRun(entry, run) {
    const e = entry ? {...entry} : {};
    e.last = run;
    if (run.completed && (!e.best || run.duration < e.best.duration)) e.best = run;
    return e;
}

// Keeps the most recently used seeds within a cap so localStorage cannot fill up.
export function pruneStore(store, maxSeeds) {
    const seeds = Object.entries(store.seeds || {}).sort((a, b) => (b[1].usedAt || 0) - (a[1].usedAt || 0));
    return {version: 1, seeds: Object.fromEntries(seeds.slice(0, maxSeeds))};
}

export function formatClock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
