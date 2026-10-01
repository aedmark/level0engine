const fs = require('fs');

let renderingJs = fs.readFileSync('lore-editor/js/rendering.js', 'utf8');

const preSaveHook = `
function validateASTConditions(node, knownThreads, knownVars, knownSectors, issues) {
    if (!node) return;
    if (node.type === 'MemberExpression') {
        let objName = '';
        if (node.object.type === 'Identifier') objName = node.object.name;
        else if (node.object.type === 'MemberExpression' && node.object.property.name === 'coreVars') objName = 'coreVars';

        if (objName === 'c' || objName === 'coreVars') {
            const varName = node.property.name || node.property.value;
            if (!knownVars.includes(varName)) {
                issues.push(\`Unknown variable referenced: \${varName}\`);
            }
        } else if (objName === 'ctx') {
            const varName = node.property.name || node.property.value;
            if (!['cast', 'coreVars', 'threads', 'sector', 'year', 'pen', 'hours', 'seed', 'params', 'truth', 'activePuzzle'].includes(varName)) {
                if (!knownVars.includes(varName)) issues.push(\`Unknown variable referenced: \${varName}\`);
            }
        }
    }
    
    if (node.type === 'MemberExpression' && node.object.type === 'MemberExpression' && node.object.property.name === 'threads') {
        const threadName = node.property.name || node.property.value;
        if (!knownThreads.includes(threadName)) {
            issues.push(\`Unknown thread referenced: \${threadName}\`);
        }
    }

    if (node.type === 'BinaryExpression' && (node.operator === '===' || node.operator === '==')) {
        let sectorLiteral = null;
        if (node.left.type === 'MemberExpression' && node.left.property.name === 'sector' && node.right.type === 'Literal') {
            sectorLiteral = node.right.value;
        } else if (node.right.type === 'MemberExpression' && node.right.property.name === 'sector' && node.left.type === 'Literal') {
            sectorLiteral = node.left.value;
        }
        if (sectorLiteral && !knownSectors.includes(sectorLiteral)) {
            issues.push(\`Unknown sector referenced: \${sectorLiteral}\`);
        }
    }

    for (let key in node) {
        if (node[key] && typeof node[key] === 'object') {
            validateASTConditions(node[key], knownThreads, knownVars, knownSectors, issues);
        }
    }
}

function runPreSaveConditionChecks(dataToSave) {
    let issues = [];
    if (!dataToSave) return issues;
    
    let knownThreads = Object.keys(crossFileCache['threads.json'] || {});
    let knownSectors = getKnownSectors();
    let knownVars = [];
    if (crossFileCache['parameters.json']) {
        knownVars = [
            ...(crossFileCache['parameters.json'].ROLES || []),
            ...Object.keys(crossFileCache['parameters.json'].CORE_VARS || {}),
            ...Object.keys(crossFileCache['parameters.json'].VARS || {})
        ];
    }
    knownVars.push('seed', 'pen', 'year', 'hours');

    function checkString(str) {
        // check templates
        let match;
        const regex = /\\$\\{([^}]+)\\}/g;
        while ((match = regex.exec(str)) !== null) {
            try {
                let ast = window.jsep(match[1]);
                validateASTConditions(ast, knownThreads, knownVars, knownSectors, issues);
            } catch(e) {}
        }
    }

    function traverse(obj) {
        if (!obj) return;
        if (typeof obj === 'string') {
            checkString(obj);
        } else if (Array.isArray(obj)) {
            obj.forEach(traverse);
        } else if (typeof obj === 'object') {
            for (let key in obj) {
                if ((key === 'conditions' || key === 'ACCESS_CODE') && typeof obj[key] === 'string') {
                    try {
                        let ast = window.jsep(obj[key]);
                        validateASTConditions(ast, knownThreads, knownVars, knownSectors, issues);
                    } catch(e) {
                        issues.push(\`Failed to parse \${key}: \${e.message}\`);
                    }
                }
                traverse(obj[key]);
            }
        }
    }
    traverse(dataToSave);
    return issues;
}
`;

renderingJs = renderingJs.replace('async function handleSave() {', preSaveHook + '\nasync function handleSave() {');

const saveGuard = `
            const preSaveIssues = runPreSaveConditionChecks(fileData);
            if (preSaveIssues.length > 0) {
                alert("Cannot save! Entry conditions reference unknown data:\\n" + preSaveIssues.join("\\n"));
                btn.disabled = false;
                btn.innerText = 'Save Changes';
                return;
            }
`;

renderingJs = renderingJs.replace('await postFile(selectedFile, fileData);', saveGuard + '\n                await postFile(selectedFile, fileData);');

fs.writeFileSync('lore-editor/js/rendering.js', renderingJs);
