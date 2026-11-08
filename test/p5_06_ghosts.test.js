import test from 'node:test';
import assert from 'node:assert';
import {
    encodeSamples, decodeSamples, poseAt, buildGhostFile, parseGhostFile, chooseGhost, fileRun, pruneStore,
    formatClock, SAMPLE_RATE, MAX_SAMPLES
} from '../src/system/GhostCodec.js';

const walk = (n, jumpAt = -1) => Array.from({length: n}, (_, i) => ({
    x: 6 + i * 0.9 + (i >= jumpAt && jumpAt >= 0 ? 5000 : 0),
    z: -3 - i * 0.35,
    yaw: (i * 0.3) % (Math.PI * 2)
}));

test('P5-06 samples round-trip within a decimetre and a yaw step, across teleports', () => {
    const src = walk(400, 200);
    const enc = encodeSamples(src);
    assert.strictEqual(enc.count, 400);
    assert.ok(enc.keyframes.length === 2, 'the start and the 5 km jump are keyframes');
    const out = decodeSamples(enc);
    for (let i = 0; i < src.length; i++) {
        assert.ok(Math.abs(out[i].x - src[i].x) <= 0.051 && Math.abs(out[i].z - src[i].z) <= 0.051, `pos ${i}`);
        const dy = Math.abs(((out[i].yaw - src[i].yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        assert.ok(dy <= Math.PI * 2 / 256 + 1e-9, `yaw ${i}`);
    }
    assert.ok(enc.data.length < 400 * 7, 'about five bytes a sample before base64');
});

test('P5-06 poses interpolate, snap across teleports and end with the run', () => {
    const s = [{x: 0, z: 0, yaw: 0}, {x: 1, z: 2, yaw: 0.2}, {x: 9000, z: 2, yaw: 0.2}];
    const mid = poseAt(s, SAMPLE_RATE / 2);
    assert.ok(Math.abs(mid.x - 0.5) < 1e-9 && Math.abs(mid.z - 1) < 1e-9);
    assert.strictEqual(poseAt(s, SAMPLE_RATE * 1.2).x, 1, 'no gliding across a teleport');
    assert.strictEqual(poseAt(s, SAMPLE_RATE * 2).x, 9000);
    assert.strictEqual(poseAt(s, SAMPLE_RATE * 3), null);
    const wrap = poseAt([{x: 0, z: 0, yaw: 6.2}, {x: 0, z: 0, yaw: 0.1}], SAMPLE_RATE / 2);
    assert.ok(wrap.yaw > 6.2 || wrap.yaw < 0.2, 'turns the short way round');
});

test('P5-06 ghost files round-trip and reject anything malformed', () => {
    const enc = encodeSamples(walk(50));
    const run = {seed: '7♠|K♥|2♣|9♦|A♠', completed: true, duration: 812.4, ...enc, createdAt: '2026-11-08T00:00:00Z'};
    const text = JSON.stringify(buildGhostFile(run));
    const back = parseGhostFile(text);
    assert.strictEqual(back.seed, run.seed);
    assert.strictEqual(back.duration, 812.4);
    assert.strictEqual(decodeSamples(back).length, 50);
    const bad = (patch, why) => {
        const o = {...JSON.parse(text), ...patch};
        assert.throws(() => parseGhostFile(JSON.stringify(o)), undefined, why);
    };
    bad({format: 'other'}, 'format');
    bad({version: 2}, 'version');
    bad({seed: 'a\u0000b'}, 'control characters in the seed');
    bad({seed: 'x'.repeat(80)}, 'overlong seed');
    bad({count: 51}, 'count does not match data');
    bad({count: MAX_SAMPLES + 1}, 'too many samples');
    bad({data: '<script>'}, 'data is not base64');
    bad({keyframes: []}, 'no keyframes');
    bad({keyframes: [{i: 0, x: 1.5, z: 0}]}, 'non-integer keyframe');
    bad({keyframes: [{i: 3, x: 0, z: 0}]}, 'first keyframe must be sample 0');
    bad({duration: -1}, 'negative duration');
    bad({rate: 1}, 'other sample rates');
    assert.throws(() => parseGhostFile('{not json'));
    assert.throws(() => parseGhostFile('x'.repeat(600 * 1024)));
});

test('P5-06 choosing, filing and pruning stored runs', () => {
    const a = {completed: false, duration: 300};
    const b = {completed: true, duration: 900};
    const c = {completed: true, duration: 700};
    let e = fileRun(null, a);
    assert.deepStrictEqual(chooseGhost(e), {run: a, kind: 'attempt'});
    e = fileRun(e, b);
    e = fileRun(e, {completed: true, duration: 950});
    assert.strictEqual(e.best, b, 'a slower completed run does not replace the best');
    e = fileRun(e, c);
    assert.strictEqual(chooseGhost(e).run, c);
    assert.strictEqual(chooseGhost({...e, imported: a}).kind, 'imported', 'imported ghosts win');
    assert.strictEqual(chooseGhost(null), null);
    const store = {version: 1, seeds: {old: {usedAt: 1}, mid: {usedAt: 5}, new: {usedAt: 9}}};
    assert.deepStrictEqual(Object.keys(pruneStore(store, 2).seeds), ['new', 'mid']);
    assert.strictEqual(formatClock(812.4), '13:32');
});
