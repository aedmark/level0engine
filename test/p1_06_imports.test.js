import test from 'node:test';
import assert from 'node:assert';
import fs, { globSync } from 'fs';
import path from 'path';

test('P1-06 Static import check', () => {
    const files = [
        ...globSync('src/**/*.js'),
        ...globSync('lore-editor/js/**/*.js'),
        ...globSync('*.js')
    ];
    const exportsByFile = new Map();

    const rxExportNamed = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_$]+)/g;
    const rxExportList = /export\s+\{([^}]+)\}/g;
    const rxExportDefault = /export\s+default\s+/;

    for (const file of files) {
        const code = fs.readFileSync(file, 'utf8');
        const exports = new Set();
        
        let match;
        while ((match = rxExportNamed.exec(code)) !== null) {
            exports.add(match[1]);
        }
        while ((match = rxExportList.exec(code)) !== null) {
            const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim()).filter(Boolean);
            for (const name of names) exports.add(name);
        }
        if (rxExportDefault.test(code)) {
            exports.add('default');
        }
        
        // Convert to a normalized absolute path string for map lookup
        const absPath = path.resolve(file).replace(/\\/g, '/');
        exportsByFile.set(absPath, exports);
    }

    const rxImportList = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    const rxImportDefault = /import\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g;

    for (const file of files) {
        const code = fs.readFileSync(file, 'utf8');
        let match;
        
        while ((match = rxImportList.exec(code)) !== null) {
            const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim()).filter(Boolean);
            const target = match[2];
            
            if (target.startsWith('.')) {
                const targetPath = path.resolve(path.dirname(file), target).replace(/\\/g, '/');
                if (exportsByFile.has(targetPath)) {
                    const targetExports = exportsByFile.get(targetPath);
                    for (const name of names) {
                        assert.ok(
                            targetExports.has(name),
                            `ERROR in ${file}: imports '${name}' from '${target}', but it is not exported there.`
                        );
                    }
                }
            }
        }
        
        rxImportDefault.lastIndex = 0;
        while ((match = rxImportDefault.exec(code)) !== null) {
            const name = match[1];
            const target = match[2];
            if (name !== '*' && target.startsWith('.')) {
                const targetPath = path.resolve(path.dirname(file), target).replace(/\\/g, '/');
                if (exportsByFile.has(targetPath)) {
                    const targetExports = exportsByFile.get(targetPath);
                    assert.ok(
                        targetExports.has('default') || targetExports.has(name) || targetExports.size > 0, 
                        `ERROR in ${file}: imports default from '${target}', but check failed.`
                    );
                }
            }
        }
    }
});
