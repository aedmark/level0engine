import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

import ChunkManager from '../src/world/ChunkManager.js';
import SectorBlueprints from '../src/world/SectorBlueprints.js';

test('P2-02 ChunkManager determinism', async () => {
    // We only need to test the logic in ChunkManager that sets placement.ids and uses Math.random.
    // Actually, SectorBlueprints.getSectorMatrix is what we want to test!
    
    // Test that passing Math.random vs seeded random changes the behavior?
    // Wait, let's just write the fix first!
    
    // The requirement says:
    // "compare a layout fingerprint. Then list and remove any Math.random() that affects layout rather than cosmetics"
    
    // Let's create a full test that generates a sectorMatrix with a seeded random.
    const createMockEnv = (seed) => {
        let prngSeed = (seed) >>> 0;
        const random = () => {
            prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
            return prngSeed / 4294967296.0;
        };
        const handler = {
            get: function(target, prop) {
                if (prop in target) return target[prop];
                if (prop === 'random') return random;
                if (prop === 'baseSeed') return seed;
                if (prop === 'cellSize') return 10;
                if (prop === 'sharedWallMat' || prop === 'blackIronMat' || prop === 'warehouseMat') return {};
                return () => new Proxy({
                    position: { set: () => {} },
                    rotation: { set: () => {} },
                    updateMatrix: () => {},
                    width: 10, height: 10
                }, handler);
            }
        };
        return new Proxy({ random }, handler);
    };

    const env1 = createMockEnv(12345);
    const m1 = SectorBlueprints.getSectorMatrix.call(env1, env1);
    
    const env2 = createMockEnv(12345);
    const m2 = SectorBlueprints.getSectorMatrix.call(env2, env2);
    
    assert.deepStrictEqual(m1.map(s=>s.id), m2.map(s=>s.id), "Sector matrix order should be deterministic");
});

test('P2-02 run salt and breaker hunt are seed-derived (D-008)', async () => {
    const {deriveRunSalt, deriveHuntState, nextHuntHops} = await import('../src/world/RunSeeds.js');
    const huntSequence = (seed, n) => {
        let state = deriveHuntState(seed);
        const out = [];
        for (let i = 0; i < n; i++) {
            const step = nextHuntHops(state);
            out.push(step.hops);
            state = step.state;
        }
        return out;
    };
    for (const seed of [0, 1, -1, 12345, -987654321, 0x7fffffff]) {
        assert.strictEqual(deriveRunSalt(seed), deriveRunSalt(seed));
        assert.deepStrictEqual(huntSequence(seed, 8), huntSequence(seed, 8));
        for (const h of huntSequence(seed, 8)) assert.ok(h >= 0 && h <= 2);
    }
    // Different seeds should not collapse onto one salt.
    const salts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(deriveRunSalt));
    assert.strictEqual(salts.size, 8);

    // Guard against a regression back to Math.random() at the two call sites.
    const envSrc = fs.readFileSync(path.resolve('src/core/Environment.js'), 'utf8');
    assert.ok(!/_runSalt32\s*=\s*\(?\s*Math\.random/.test(envSrc), 'run salt must not use Math.random');
    const icSrc = fs.readFileSync(path.resolve('src/player/InteractionController.js'), 'utf8');
    const body = icSrc.slice(icSrc.indexOf('rollHuntHops() {'), icSrc.indexOf('beginBreakerScan'));
    assert.ok(!body.includes('Math.random'), 'rollHuntHops must not use Math.random');
});

test('P5-01 chunk content does not read the live camera or build order', () => {
    const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');
    const kit = read('src/world/StructureKit.js');
    assert.ok(!/playerPos\s*:\s*env\.camera/.test(kit), 'chunk helpers must not expose the live camera position');
    assert.ok(/seedSpawnPos\s*:\s*env\._seedSpawn/.test(kit), 'chunk helpers expose the seed spawn instead');
    for (const p of ['src/world/LightingSpawns.js', 'src/world/blueprints/AnomalousPointOfInterest.js']) {
        assert.ok(!read(p).includes('ctx.playerPos'), `${p} must suppress near the seed spawn, not the player`);
    }
    assert.ok(!read('src/world/sectors/AnnexSector.js').includes('lockedRoomSpawned'),
        'the Annex locked room must not depend on which Annex chunk builds first');
});

test('P5-01 airlock layout is a pure function of chunk coordinates', async () => {
    const {airlocksForMacroChunk, AIRLOCK_CROSS_CELL} = await import('../src/world/AirlockLayout.js');
    const a = airlocksForMacroChunk(-1, 0, 16, 4);
    assert.deepStrictEqual(a, airlocksForMacroChunk(-1, 0, 16, 4));
    assert.strictEqual(a.length, 4, 'one airlock per chunk side');
    for (const al of a) {
        assert.strictEqual(al.chunkHash, '-1,0');
        // The outer door sits half a chamber outward from the chamber centre, along the crossing axis.
        const along = al.spansX ? al.outerPos.z - al.chamberCenter.z : al.outerPos.x - al.chamberCenter.x;
        const across = al.spansX ? al.outerPos.x - al.chamberCenter.x : al.outerPos.z - al.chamberCenter.z;
        assert.strictEqual(across, 0);
        assert.ok(Math.abs(Math.abs(along) - 1.4) < 1e-9 && Math.sign(along) === al.outSign);
        const crossCell = (al.spansX ? al.chamberCenter.x : al.chamberCenter.z) / 4 - (al.spansX ? -16 : 0);
        assert.strictEqual(crossCell, AIRLOCK_CROSS_CELL);
    }
    // ChunkBuilder must feed the worker derived airlocks, not the load-order-dependent built list.
    const builder = fs.readFileSync(path.resolve('src/world/ChunkBuilder.js'), 'utf8');
    assert.ok(/airlocksCopy\s*=\s*airlocksNear\(/.test(builder));
    assert.ok(!/airlocksCopy\s*=\s*env\.airlocks/.test(builder));
});
