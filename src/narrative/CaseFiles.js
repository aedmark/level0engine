/**
 * [ROLE] Generates randomized lore, documents, and narrative text snippets.
 * [WHY] Drives the procedural storytelling by assembling clue fragments based on random seeds and truth states.
 * [STATE] Stateless utility functions returning generated objects.
 * [DEPENDS] Procedural seed context, global variables for hours/pen/etc.
 */
export const THREADS = ['CIPHER', 'EPOCH', 'PEN', 'LOST', 'GEOMETRY', 'HUM', 'TELL'];

export function buildCaseFiles(ctx, data) {
    // We deep clone the JSON data so we don't mutate the static loaded source
    const d = JSON.parse(JSON.stringify(data));
    const c = ctx.cast;
    const P = ctx.project;
    const pen = ctx.pen;
    const hrs = ctx.hours;
    const year = ctx.siteYear;
    const LOST = c.lost.toUpperCase();

    // Helper to replace variables and simple math expressions like ${ctx.seed * ctx.hours % 666}
    const replaceTemplates = (str) => {
        if (typeof str !== 'string') return str;
        
        let s = str;
        s = s.replace(/\$\{c\.lead\}/g, c.lead);
        s = s.replace(/\$\{c\.custodian\}/g, c.custodian);
        s = s.replace(/\$\{c\.archivist\}/g, c.archivist);
        s = s.replace(/\$\{c\.lost\}/g, c.lost);
        s = s.replace(/\$\{P\}/g, P);
        s = s.replace(/\$\{pen\}/g, pen);
        s = s.replace(/\$\{hrs\}/g, hrs);
        s = s.replace(/\$\{year\}/g, year);
        s = s.replace(/\$\{LOST\}/g, LOST);
        
        s = s.replace(/\$\{([^}]+)\}/g, (match, expr) => {
            try {
                // Safely evaluate simple math using Function
                return new Function('ctx', `return ${expr};`)(ctx);
            } catch (e) {
                return match;
            }
        });
        return s;
    };

    // Deep iterate over the objects to apply replaceTemplates
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

    const { library, tags, tapes, finales, foreshadow, ephemera } = d;

    const tell = foreshadow[ctx.truth];
    if (tell) {
        for (const sector in tell) {
            if (!library[sector]) library[sector] = [];
            if (!tags[sector]) tags[sector] = [];
            library[sector].push(tell[sector]);
            tags[sector].push('TELL');
        }
    }

    return { library, tapes, tags, finales, ephemera };
}
