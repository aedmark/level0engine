import './setup.js';
import test from 'node:test';
import assert from 'node:assert';

import StoryEngine from '../src/narrative/StoryEngine.js';
import SectorBlueprints from '../src/world/SectorBlueprints.js';

test('P3-01 Solvability sweep', async () => {
    await StoryEngine.loadData('./data');
    
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

    const NUM_SEEDS = 300;
    const failures = [];
    
    for (let i = 0; i < NUM_SEEDS; i++) {
        const seed = 1000 + i;
        const se = new StoryEngine(seed);
        const env = createMockEnv(seed);
        const matrix = SectorBlueprints.getSectorMatrix.call(env, env);
        const placedSectors = new Set(matrix.filter(s => s.id !== "EXIT").map(s => s.id));
        placedSectors.add("EXIT"); 
        
        // 1. Tell is seeded into five PLACED sectors
        const tellSectors = Object.keys(StoryEngine.CASES_DATA.foreshadow[se.truth]);
        const placedTellSectors = tellSectors.filter(s => placedSectors.has(s));
        if (placedTellSectors.length !== 5) {
            failures.push(`Seed ${seed}: Tell in ${placedTellSectors.length} placed sectors (${placedTellSectors.join(',')}), expected 5.`);
        }

        const threadSources = {}; // thread -> Set of placed sectors
        const scanSource = (sector, obj) => {
            if (obj && obj.thread) {
                if (sector === 'DEFAULT') {
                    // if it's default, it doesn't count as a specific sector source for the leg guarantee
                } else if (placedSectors.has(sector)) {
                    if (!threadSources[obj.thread]) threadSources[obj.thread] = new Set();
                    threadSources[obj.thread].add(sector);
                }
            }
        };

        for (const sector of Object.keys(se.library)) {
            se.library[sector].forEach(obj => scanSource(sector, obj));
        }
        for (const sector of Object.keys(se.tapes)) scanSource(sector, se.tapes[sector]);
        for (const sector of Object.keys(se.clipboards)) se.clipboards[sector].forEach(obj => scanSource(sector, obj));
        for (const sector of Object.keys(se.ephemera)) se.ephemera[sector].forEach(obj => scanSource(sector, obj));
        for (const sector of Object.keys(se.laptops)) se.laptops[sector].forEach(obj => scanSource(sector, obj));

        // 2. Each lock leg has sources in three or more PLACED sectors
        const lockLegs = Object.keys(se.activePuzzle.LOCK_THREADS);
        for (const legThread of lockLegs) {
            const sources = threadSources[legThread] || new Set();
            if (sources.size < 3) {
                failures.push(`Seed ${seed}: Lock leg '${legThread}' has sources in ${sources.size} placed sectors (${[...sources].join(',')}). Expected 3+`);
            }
        }
        
        // 3. No thread depends entirely on unplaced sectors
        // Let's gather all threads from all clues (placed and unplaced)
        const allThreadSources = {}; 
        const scanAllSource = (sector, obj) => {
            if (obj && obj.thread) {
                if (!allThreadSources[obj.thread]) allThreadSources[obj.thread] = new Set();
                allThreadSources[obj.thread].add(sector);
            }
        };
        for (const sector of Object.keys(se.library)) se.library[sector].forEach(obj => scanAllSource(sector, obj));
        for (const sector of Object.keys(se.tapes)) scanAllSource(sector, se.tapes[sector]);
        for (const sector of Object.keys(se.clipboards)) se.clipboards[sector].forEach(obj => scanAllSource(sector, obj));
        for (const sector of Object.keys(se.ephemera)) se.ephemera[sector].forEach(obj => scanAllSource(sector, obj));
        for (const sector of Object.keys(se.laptops)) se.laptops[sector].forEach(obj => scanAllSource(sector, obj));
        
        for (const thread of Object.keys(allThreadSources)) {
            const sList = allThreadSources[thread];
            let hasPlaced = false;
            for (const s of sList) {
                if (placedSectors.has(s) || s === 'DEFAULT') {
                    hasPlaced = true; break;
                }
            }
            if (!hasPlaced) {
                failures.push(`Seed ${seed}: Thread '${thread}' relies solely on unplaced sectors (${[...sList].join(',')}).`);
            }
        }
    }
    
    if (failures.length > 0) {
        assert.fail(`Solvability failures:\n${failures.join('\n')}`);
    }
});
