const binops = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '%': (a, b) => a % b
};

function evaluateAST(node, ctx) {
    if (!node) return undefined;
    
    if (node.type === 'Literal') return node.value;
    
    if (node.type === 'Identifier') {
        if (node.name === 'ctx') return ctx;
        if (node.name === 'Math') return Math;w
        if (node.name === 'String') return String;
        if (ctx && typeof ctx === 'object' && node.name in ctx) return ctx[node.name];
        return undefined;
    }
    
    if (node.type === 'MemberExpression') {
        const obj = evaluateAST(node.object, ctx);
        const prop = node.computed ? evaluateAST(node.property, ctx) : node.property.name;
        if (obj === undefined || obj === null) return undefined;
        let val = obj[prop];
        if (typeof val === 'function') val = val.bind(obj);
        return val;
    }
    
    if (node.type === 'CallExpression') {
        const callee = evaluateAST(node.callee, ctx);
        const args = node.arguments.map(arg => evaluateAST(arg, ctx));
        if (typeof callee === 'function') {
            return callee(...args);
        }
        return undefined;
    }
    
    if (node.type === 'BinaryExpression') {
        const left = evaluateAST(node.left, ctx);
        const right = evaluateAST(node.right, ctx);
        if (binops[node.operator]) {
            return binops[node.operator](left, right);
        }
    }
    
    console.warn("Unsupported AST node:", node);
    return undefined;
}

window.safeEval = function(expr, ctx) {
    try {
        const ast = jsep(expr);
        return evaluateAST(ast, ctx);
    } catch (e) {
        console.error("safeEval error parsing expression:", expr, e);
        return undefined;
    }
};
