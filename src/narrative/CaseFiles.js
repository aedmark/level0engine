/**
 * [ROLE] Generates randomized lore, documents, and narrative text snippets.
 * [WHY] Drives the procedural storytelling by assembling clue fragments based on random seeds and truth states.
 * [STATE] Stateless utility functions returning generated objects.
 * [DEPENDS] Procedural seed context, global variables for hours/pen/etc.
 */
export function buildCaseFiles(ctx, data) {
    const d = JSON.parse(JSON.stringify(data));
    const c = ctx.cast;
    const P = ctx.project;
    const pen = ctx.pen;
    const hrs = ctx.hours;
    const year = ctx.siteYear;

    const replaceTemplates = (str) => {
        if (typeof str !== 'string') return str;
        
        let s = str;
        
        let genericFirst = null;
        let genericLast = null;
        
        if (s.includes('${first_name}')) {
            if (!genericFirst) genericFirst = ctx.params?.FIRST ? ctx.params.FIRST[Math.floor(ctx.rand() * ctx.params.FIRST.length)] : 'John';
            s = s.replace(/\$\{first_name\}/g, genericFirst);
        }
        if (s.includes('${last_name}')) {
            if (!genericLast) genericLast = ctx.params?.LAST ? ctx.params.LAST[Math.floor(ctx.rand() * ctx.params.LAST.length)] : 'Doe';
            s = s.replace(/\$\{last_name\}/g, genericLast);
        }
        
        for (const role in c) {
            const val = c[role];
            s = s.replace(new RegExp(`\\$\\{c\\.${role}\\}`, 'g'), val.full);
            s = s.replace(new RegExp(`\\$\\{${role.toUpperCase()}\\}`, 'g'), val.full.toUpperCase());
            s = s.replace(new RegExp(`\\$\\{c\\.${role}\\.first_name\\}`, 'g'), val.first);
            s = s.replace(new RegExp(`\\$\\{c\\.${role}\\.last_name\\}`, 'g'), val.last);
            s = s.replace(new RegExp(`\\$\\{${role}\\.first_name\\}`, 'g'), val.first);
            s = s.replace(new RegExp(`\\$\\{${role}\\.last_name\\}`, 'g'), val.last);
        }

        s = s.replace(/\$\{P\}/g, P);
        if (ctx.coreVars) {
            for (const key in ctx.coreVars) {
                s = s.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), ctx.coreVars[key]);
            }
        }
        s = s.replace(/\$\{pen\}/g, pen);
        s = s.replace(/\$\{hrs\}/g, hrs);
        s = s.replace(/\$\{year\}/g, year);
        
        const customVars = ctx.params?.VARS || {};
        for (const varName in customVars) {
            const expr = customVars[varName];
            try {
                const val = new Function('ctx', `return ${expr};`)(ctx);
                s = s.replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), val);
            } catch (e) {}
        }
        
        s = s.replace(/\$\{([^}]+)\}/g, (match, expr) => {
            try {
                return new Function('ctx', `return ${expr};`)(ctx);
            } catch (e) {
                return match;
            }
        });
        return s;
    };

    const processObj = (obj) => {
        if (typeof obj === 'string') {
            return replaceTemplates(obj);
        } else if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj[i] = processObj(obj[i]);
            }
        } else if (obj !== null && typeof obj === 'object') {
            for (const key in obj) {
                obj[key] = processObj(obj[key]);
            }
        }
        return obj;
    };

    processObj(d);

    const { lore, clues, finales, foreshadow, threads } = d;

    if (ctx.activePuzzle && threads['CIPHER']) {
        if (ctx.activePuzzle.cipher_title) threads['CIPHER'].title = replaceTemplates(ctx.activePuzzle.cipher_title);
        if (ctx.activePuzzle.cipher_description) threads['CIPHER'].description = replaceTemplates(ctx.activePuzzle.cipher_description);
    }

    const library = {};
    const tapes = {};
    const ephemera = {};
    const laptops = {};
    const clipboards = {};

    const injectItem = (sector, item) => {
        const type = item.type || 'document';
        if (type === 'tape') {
            tapes[sector] = item;
        } else if (type === 'note') {
            if (!ephemera[sector]) ephemera[sector] = [];
            ephemera[sector].push(item);
        } else if (type === 'laptop') {
            if (!laptops[sector]) laptops[sector] = [];
            laptops[sector].push(item);
        } else if (type === 'clipboard') {
            if (!clipboards[sector]) clipboards[sector] = [];
            clipboards[sector].push(item);
        } else {
            if (!library[sector]) library[sector] = [];
            library[sector].push(item);
        }
    };

    for (const sector in lore) {
        const arr = lore[sector];
        for (const item of arr) {
            injectItem(sector, item);
        }
    }

    if (ctx.activePuzzle && ctx.activePuzzle.LOCK_THREADS) {
        for (const sector in clues) {
            const arr = clues[sector];
            for (const item of arr) {
                if (item.thread && ctx.activePuzzle.LOCK_THREADS[item.thread]) {
                    const puz = item.puzzle;
                    if (!puz || puz === ctx.activePuzzle.id || (Array.isArray(puz) && puz.includes(ctx.activePuzzle.id))) {
                        injectItem(sector, item);
                    }
                }
            }
        }
    }

    const tell = foreshadow[ctx.truth];
    if (tell) {
        for (const sector in tell) {
            if (sector === 'nickname' || sector === 'text' || sector === 'description' || sector.startsWith('_')) continue;
            const itemOrArr = tell[sector];
            if (Array.isArray(itemOrArr)) {
                for (const item of itemOrArr) {
                    injectItem(sector, item);
                }
            } else {
                injectItem(sector, itemOrArr);
            }
        }
    }

    return { library, tapes, finales, ephemera, threads, laptops, clipboards };
}
