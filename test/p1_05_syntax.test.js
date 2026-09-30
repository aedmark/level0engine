import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import { globSync } from 'fs';

test('P1-05 Syntax check for every module', () => {
    // Find all JS files in src/, lore-editor/js/, and root
    const files = [
        ...globSync('src/**/*.js'),
        ...globSync('lore-editor/js/**/*.js'),
        ...globSync('*.js')
    ];
    
    for (const file of files) {
        try {
            execSync(`node --check ${file}`, { stdio: 'ignore' });
        } catch (err) {
            assert.fail(`Syntax error in ${file}: ${err.message}`);
        }
    }
});
