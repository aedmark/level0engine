function checkAST(node, knownThreads, knownVars, knownSectors, issues) {
    if (!node) return;
    
    // Check for variables: c.XYZ, ctx.coreVars.XYZ, ctx.XYZ
    if (node.type === 'MemberExpression') {
        let objName = '';
        if (node.object.type === 'Identifier') objName = node.object.name;
        else if (node.object.type === 'MemberExpression' && node.object.property.name === 'coreVars') objName = 'coreVars';

        if (objName === 'c' || objName === 'coreVars') {
            const varName = node.property.name || node.property.value;
            if (!knownVars.includes(varName)) {
                issues.push(`Unknown variable referenced: ${varName}`);
            }
        } else if (objName === 'ctx') {
            const varName = node.property.name || node.property.value;
            // Ignore valid ctx fields
            if (!['cast', 'coreVars', 'threads', 'sector', 'year', 'pen', 'hours', 'seed'].includes(varName)) {
                 if (!knownVars.includes(varName)) issues.push(`Unknown variable referenced: ${varName}`);
            }
        }
    }
    
    // Check for threads: ctx.threads.XYZ
    if (node.type === 'MemberExpression' && node.object.type === 'MemberExpression' && node.object.property.name === 'threads') {
        const threadName = node.property.name || node.property.value;
        if (!knownThreads.includes(threadName)) {
            issues.push(`Unknown thread referenced: ${threadName}`);
        }
    }

    // Check for sectors: ctx.sector === 'XYZ'
    if (node.type === 'BinaryExpression' && (node.operator === '===' || node.operator === '==')) {
        let sectorLiteral = null;
        if (node.left.type === 'MemberExpression' && node.left.property.name === 'sector' && node.right.type === 'Literal') {
            sectorLiteral = node.right.value;
        } else if (node.right.type === 'MemberExpression' && node.right.property.name === 'sector' && node.left.type === 'Literal') {
            sectorLiteral = node.left.value;
        }
        if (sectorLiteral && !knownSectors.includes(sectorLiteral)) {
            issues.push(`Unknown sector referenced: ${sectorLiteral}`);
        }
    }

    for (let key in node) {
        if (node[key] && typeof node[key] === 'object') {
            checkAST(node[key], knownThreads, knownVars, knownSectors, issues);
        }
    }
}
