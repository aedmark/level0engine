import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {OPENING, AXIS_DIRS, chooseSightingSpot, inFirstBreakerBand, localRandom, formatMarks} from '../src/narrative/OpeningPlan.js';

test('P5-04 sighting prefers the nearest viewpoint with a long enough corridor', () => {
    const [n, e] = AXIS_DIRS;
    const c = (vx, carDist, dir, free) => ({viewpoint: {x: vx, z: 0}, dir, carDist, free});
    const spot = chooseSightingSpot([
        c(1, 12, n, 40),
        c(2, 8, e, 20),
        c(3, 8, n, 25),
        c(4, 4, n, 10)
    ]);
    assert.strictEqual(spot.viewpoint.x, 3, 'nearest qualifying viewpoint, then the longer run');
    assert.strictEqual(spot.dist, 25 - OPENING.sightingBackoff);
    assert.deepStrictEqual(spot.dir, n);
    assert.strictEqual(chooseSightingSpot([c(1, 4, n, 10), c(2, 8, e, OPENING.sightingMinFree - 1)]), null, 'short corridors: no sighting');
    assert.strictEqual(chooseSightingSpot([c(1, 4, n, 200)]).dist, OPENING.sightingMaxDist);
    assert.strictEqual(new Set(AXIS_DIRS.map(d => `${d.x},${d.z}`)).size, 4);
});

test('P5-04 first breaker band, local stream and mark formatting', () => {
    const spawn = {x: 6, z: 6};
    assert.ok(!inFirstBreakerBand(10, 10, spawn));
    assert.ok(inFirstBreakerBand(46, 6, spawn));
    assert.ok(!inFirstBreakerBand(120, 6, spawn));
    assert.ok(!inFirstBreakerBand(46, 6, null));
    const a = localRandom(42), b = localRandom(42);
    for (let i = 0; i < 5; i++) assert.strictEqual(a(), b());
    assert.deepStrictEqual(formatMarks({exit: 12.34, control: 0, sighting: null}), [
        {beat: 'control', seconds: 0},
        {beat: 'exit', seconds: 12.3},
        {beat: 'sighting', seconds: 'missed'}
    ]);
});

test('P5-04 the tutorial door no longer waits on a full kinetic charge', () => {
    const src = fs.readFileSync(path.resolve('src/player/InteractionController.js'), 'utf8');
    const block = src.slice(src.indexOf('if (ud.tutorialLocked) {'), src.indexOf('const target = shouldOpen'));
    assert.ok(block.includes('env.openingDoorReleased'));
    assert.ok(!block.includes('flashlightBattery >= 100'), 'the battery ceiling can sit below 100, which softlocked the car');
});

test('P5-08 podiums are recorded for the run and never draw from the chunk layout stream', () => {
    const src = fs.readFileSync(path.resolve('src/world/LightingSpawns.js'), 'utf8');
    const calls = src.match(/spawnBreakerPodium\(env, [^,]+, x, z\)/g) || [];
    assert.ok(calls.length >= 2, 'both the restore and the first plant spawn a podium');
    for (const c of calls) assert.ok(c.includes('podiumCtx()'), `${c} must use the local stream, not ctx`);
    assert.ok(src.includes('env._podiumRecords.get(') && src.includes('record.spent'), 'chunk builds restore recorded podiums');
    const ic = fs.readFileSync(path.resolve('src/player/InteractionController.js'), 'utf8');
    const act = ic.slice(ic.indexOf('activateExitSwitch(podium) {'), ic.indexOf('activateExitSwitch(podium) {') + 400);
    assert.ok(act.includes('record.spent = true'), 'restoring a podium marks its record spent');
});
