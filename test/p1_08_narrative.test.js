import test from 'node:test';
import assert from 'node:assert';
import fs, { globSync } from 'fs';
import path from 'path';

test('P1-08 Narrative data tests', () => {
    const dataFiles = globSync('data/*.json');
    for (const f of dataFiles) {
        try {
            JSON.parse(fs.readFileSync(f, 'utf8'));
        } catch (e) {
            assert.fail(`File ${f} is not valid JSON: ${e.message}`);
        }
    }

    const factoryFiles = globSync('data/factory/*.json');
    for (const f of factoryFiles) {
        const basename = path.basename(f);
        const livePath = `data/${basename}`;
        if (fs.existsSync(livePath)) {
            const factoryData = JSON.parse(fs.readFileSync(f, 'utf8'));
            const liveData = JSON.parse(fs.readFileSync(livePath, 'utf8'));
            
            const factoryKeys = Object.keys(factoryData).sort().join(',');
            const liveKeys = Object.keys(liveData).sort().join(',');
            assert.strictEqual(factoryKeys, liveKeys, `Factory shape mismatch in ${basename}`);
            
            if (Array.isArray(factoryData)) {
                assert.ok(Array.isArray(liveData), `${basename} should be an array`);
            }
        }
    }

    const lore = JSON.parse(fs.readFileSync('data/lore.json', 'utf8'));
    
    // Find all hardcoded document types
    const jsFiles = globSync('src/world/**/*.js');
    const rx = /userData\s*=\s*\{([^}]+)\}/g;
    
    for (const file of jsFiles) {
        const code = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = rx.exec(code)) !== null) {
            const body = match[1];
            const typeMatch = body.match(/type:\s*'([^']+)'/);
            const zoneMatch = body.match(/zone:\s*'([^']+)'/);
            if (typeMatch && zoneMatch) {
                const type = typeMatch[1];
                const zone = zoneMatch[1];
                // we only care about lore types (not exits, valves, etc)
                if (['document', 'clipboard', 'tape', 'note', 'laptop'].includes(type)) {
                    const pool = lore[zone];
                    assert.ok(pool, `Zone ${zone} has no lore pool, but places ${type} in ${file}`);
                    
                    const hasType = pool.some(entry => entry.type === type);
                    assert.ok(hasType, `Zone ${zone} places ${type} in ${file} but has no such entry in data/lore.json`);
                }
            }
        }
    }
});
