const fs = require('fs');

function processFile(file) {
    let lines = fs.readFileSync(file, 'utf8').split('\n');
    let insideTemplateLiteral = false;
    let templateStartIndex = -1;
    let leftSide = '';
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (insideTemplateLiteral) {
            if (line.includes('`;')) {
                lines[i] = line.replace('`;', '`);');
                lines[templateStartIndex] = leftSide + 'DOMPurify.sanitize(`';
                insideTemplateLiteral = false;
            }
            continue;
        }

        if (line.includes('.innerHTML = `') && !line.includes('`;')) {
            insideTemplateLiteral = true;
            templateStartIndex = i;
            leftSide = line.split('.innerHTML = `')[0] + '.innerHTML = ';
            continue;
        }
        
        if (line.match(/\.innerHTML\s*=\s*(.*);/)) {
            // single line
            lines[i] = line.replace(/\.innerHTML\s*=\s*(.*);/, '.innerHTML = DOMPurify.sanitize($1);');
        }
    }
    fs.writeFileSync(file, lines.join('\n'));
}

[
    'lore-editor/js/finale-wizard.js',
    'lore-editor/js/inspector.js',
    'lore-editor/js/main.js',
    'lore-editor/js/names-vars.js',
    'lore-editor/js/puzzle-wizard.js',
    'lore-editor/js/rendering.js',
    'lore-editor/js/validation.js'
].forEach(processFile);
