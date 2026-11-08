// Pure timing and geometry rules for the scripted opening (P5-04). No DOM, no THREE, so the test can
// pin them; OpeningDirector applies them to the live game.

export const OPENING = {
    // Beat 1: arrival. The car rumbles, dings, then the door releases on its own for a first run.
    rumbleAt: 0.4,
    dingAt: 4.2,
    doorReleaseAt: 5.0,
    // The car is one cell; past this distance from its centre the player has stepped out.
    exitRadius: 2.6,
    // Beat 2: the sighting window opens shortly after the player steps out and closes if they never look.
    sightingWindowStart: 1.5,
    sightingWindowEnd: 45.0,
    // A 1.2 m figure at 24 m is still about 40 px tall at 1080p with the default 75 degree FOV; at 36 m
    // it shrank to a speck.
    sightingMinFree: 16.0,
    sightingMinDist: 12.0,
    sightingMaxDist: 24.0,
    sightingBackoff: 3.0,
    sightingLookDot: 0.93,
    // Viewpoints are open cells this close to the car; near ones win so the player is likely to pass.
    sightingSearchRadius: 24.0,
    sightingNearCut: 9.0,
    sightingHold: 1.8,
    // Beat 4: the Anomaly's grace (Anomaly.reset) is held at this value until the player leaves the car.
    graceHold: 90.0,
    // Beat 3: the first breaker sits in this band around the seed spawn.
    firstBreakerMinDist: 28.0,
    firstBreakerMaxDist: 56.0,
    // Beat 5: stop logging once these are reached or after this long.
    reportAfter: 360.0
};

// The four axis directions in a fixed order, so ties resolve the same way for every player.
export const AXIS_DIRS = [{x: 0, z: 1}, {x: 1, z: 0}, {x: 0, z: -1}, {x: -1, z: 0}];

// candidates: [{viewpoint: {x, z}, dir, free, carDist}], free = clear metres from the viewpoint along
// dir. Picks the viewpoint nearest the car that looks down a corridor long enough to read a figure at
// a distance (then the longer run, then input order), and returns where the Anomaly should stand.
// Returns null when no corridor near the car is long enough.
export function chooseSightingSpot(candidates, rules = OPENING) {
    let best = null;
    for (const c of candidates) {
        if (c.free < rules.sightingMinFree) continue;
        if (!best || c.carDist < best.carDist - 1e-6 || (Math.abs(c.carDist - best.carDist) <= 1e-6 && c.free > best.free)) {
            best = c;
        }
    }
    if (!best) return null;
    const dist = Math.max(rules.sightingMinDist, Math.min(rules.sightingMaxDist, best.free - rules.sightingBackoff));
    return {
        x: best.viewpoint.x + best.dir.x * dist,
        z: best.viewpoint.z + best.dir.z * dist,
        viewpoint: best.viewpoint,
        dir: best.dir,
        dist
    };
}

// Whether a base-maze cell may hold the opening's first breaker podium.
export function inFirstBreakerBand(cellWorldX, cellWorldZ, seedSpawn, rules = OPENING) {
    if (!seedSpawn) return false;
    const dx = cellWorldX - seedSpawn.x;
    const dz = cellWorldZ - seedSpawn.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    return d >= rules.firstBreakerMinDist && d <= rules.firstBreakerMaxDist;
}

// A small local stream so podium dressing never draws from the chunk's layout stream.
export function localRandom(seed) {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296.0;
    };
}

export const MARK_ORDER = ['control', 'doorOpen', 'exit', 'sighting', 'firstBreaker', 'firstThreat'];

// Seconds since control for each recorded mark, in a stable order, for the console and the debug HUD.
export function formatMarks(marks) {
    const rows = [];
    for (const key of MARK_ORDER) {
        if (!(key in marks)) continue;
        const v = marks[key];
        rows.push({beat: key, seconds: v === null ? 'missed' : Number(v.toFixed(1))});
    }
    return rows;
}
