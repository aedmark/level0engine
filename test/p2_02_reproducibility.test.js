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
