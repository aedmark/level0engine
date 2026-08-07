/**
 * [ROLE] Manages the progression and state of the procedural narrative.
 * [WHY] Controls which narrative threads are exposed, tracks player discoveries, and dictates the final truth state.
 * [STATE] Stateful, manages a library of text, player progress, and randomized parameters.
 * [DEPENDS] CaseFiles.js for content generation.
 */
import {buildCaseFiles} from './CaseFiles.js';

export default class StoryEngine {
    static NAMES_DATA = { FIRST: [], LAST: [], PROJECT_NAMES: [] };
    static CASES_DATA = {};

    static async loadData(dataDir = './data') {
        try {
            const files = ['parameters', 'lore', 'clues', 'finales', 'foreshadow', 'threads', 'puzzles'];
            const fetches = files.map(f => fetch(`${dataDir}/${f}.json`).then(res => res.json()));
            
            const [parameters, lore, clues, finales, foreshadow, threads, puzzles] = await Promise.all(fetches);
            
            StoryEngine.PARAMS = parameters;
            StoryEngine.PUZZLES = puzzles;
            StoryEngine.CASES_DATA = { lore, clues, finales, foreshadow, threads };
        } catch (e) {
            console.error("Failed to load narrative data:", e);
        }
    }

    constructor(seed) {
        this.seed = (seed || 1) >>> 0;
        let s = (this.seed ^ 0x9e3779b9) >>> 0;
        this.rand = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296.0;
        };
        const pick = (arr) => arr[Math.floor(this.rand() * arr.length)];
        
        const FIRST = StoryEngine.PARAMS.FIRST;
        const LAST = StoryEngine.PARAMS.LAST;
        
        const used = new Set();
        const mkName = () => {
            let first, last, full;
            do {
                first = pick(FIRST);
                last = pick(LAST);
                full = first + ' ' + last;
            } while (used.has(full));
            used.add(full);
            return { first, last, full };
        };
        this.cast = {};
        const castVars = StoryEngine.PARAMS.ROLES || ["lead", "custodian", "archivist", "lost"];
        for (const role of castVars) {
            this.cast[role] = mkName();
        }

        this.projectName = pick(StoryEngine.PARAMS.PROJECT_NAMES);
        this.truth = Math.floor(this.rand() * StoryEngine.CASES_DATA.finales.length);

        this.coreVars = {
            seed: this.seed,
            pen: 3 + Math.floor(this.rand() * 19),
            year: 1971 + Math.floor(this.rand() * 28),
            hours: 300 + Math.floor(this.rand() * 900)
        };
        
        // Fallbacks for legacy props
        this.penNumber = this.coreVars.pen;
        this.siteYear = this.coreVars.year;
        this.hours = this.coreVars.hours;

        // --- PUZZLE SELECTION ---
        const puzzles = StoryEngine.PUZZLES || [
            {
                "id": "DEFAULT",
                "ACCESS_CODE": "String(ctx.year).slice(2) + String(ctx.pen).padStart(2, '0')",
                "LOCK_THREADS": { "CIPHER": "RULE", "EPOCH": "YEAR", "PEN": "PEN" }
            }
        ];
        this.activePuzzle = puzzles[Math.floor(this.rand() * puzzles.length)];
        // We no longer need to compute foreignThreads because CaseFiles explicitly injects only the active puzzle's clues.

        const accessCodeConfig = this.activePuzzle.ACCESS_CODE || "0000";
        try {
            this.accessCode = new Function('ctx', `return ${accessCodeConfig};`)(this.coreVars);
        } catch(e) {
            console.error("Failed to eval ACCESS_CODE", e);
            this.accessCode = "0000";
        }

        this.readTemplates = new Set();
        this.assignments = new Map();
        this.collected = [];
        this.cycleIndex = new Map();
        this.tapesDealt = new Set();
        this.threadOf = new Map();
        this.threadSectors = new Map();
        this.corroborated = new Set();
        this.sectorsRead = new Set();
        this._buildLibrary();
        this._shuffleLibrary();
        this._anchorCodeFragments();
    }

    _buildLibrary() {
        const files = buildCaseFiles({
            cast: this.cast,
            project: this.projectName,
            siteYear: this.siteYear,
            pen: this.penNumber,
            hours: this.hours,
            seed: this.seed,
            truth: this.truth,
            coreVars: this.coreVars,
            activePuzzle: this.activePuzzle,
            params: StoryEngine.PARAMS,
            rand: this.rand
        }, StoryEngine.CASES_DATA);
        
        this.library = files.library;
        this.tapes = files.tapes;
        this.ephemera = files.ephemera;
        this.laptops = files.laptops;
        this.clipboards = files.clipboards;
        this.finales = files.finales;
        this.threads = files.threads;
        
        // Override TELL thread title/desc based on active finale
        const activeFinale = this.finales[this.truth];
        if (activeFinale && this.threads['TELL']) {
            if (activeFinale.tell_title) this.threads['TELL'].title = activeFinale.tell_title;
            if (activeFinale.tell_description) this.threads['TELL'].description = activeFinale.tell_description;
        }
        
        this.ephemeraDealt = new Map();
        this.laptopsDealt = new Map();
        this.clipboardsDealt = new Map();
        this.trackers = {};
        this.totalTemplates = 0;
        
        for (const sector in this.library) {
            this.trackers[sector] = 0;
            const arr = this.library[sector];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].thread) this.threadOf.set(arr[i].text, arr[i].thread);
            }
            this.totalTemplates += arr.length;
        }
        for (const sector in this.tapes) {
            this.threadOf.set(this.tapes[sector].text, this.tapes[sector].thread);
            this.totalTemplates++;
        }
    }

    _shuffleLibrary() {
        for (const key in this.library) {
            const arr = this.library[key];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(this.rand() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
    }

    _anchorCodeFragments() {
        const lockThreads = this.activePuzzle.LOCK_THREADS || { "CIPHER": "RULE", "EPOCH": "YEAR", "PEN": "PEN" };
        const LEGS = Object.keys(lockThreads);
        for (const key in this.library) {
            const arr = this.library[key];
            for (const leg of LEGS) {
                const ci = arr.findIndex(t => t.thread === leg);
                if (ci > 2) {
                    const entry = arr.splice(ci, 1)[0];
                    arr.splice(Math.floor(this.rand() * 3), 0, entry);
                }
            }
        }
    }

    getFragment(docId, zone) {
        const idStr = String(docId || 'X');
        if (idStr.startsWith('FINALE')) {
            const finaleObj = this.finales[this.truth];
            const finaleText = finaleObj.text;
            if (!this.readTemplates.has('FINALE')) {
                this.readTemplates.add('FINALE');
                this.collected.push(finaleText);
                if (finaleObj.thread) this.threadOf.set(finaleText, finaleObj.thread);
            }
            return {
                text: finaleText, 
                progress: this.progress(),
                thread: finaleObj.thread || null,
                corroboration: this._registerThread(finaleText, 'FINALE')
            };
        }
        const isTerminal = idStr.startsWith('PC_');
        const assignKey = idStr + '|' + (zone || '');
        if (this.assignments.has(assignKey)) {
            if (isTerminal && this.collected.length > 1) {
                const n = (this.cycleIndex.get(assignKey) || 0) + 1;
                this.cycleIndex.set(assignKey, n);
                const k = (n - 1) % this.collected.length;
                const file = this.getArchiveFile(k);
                file.archiveIndex = k;
                return file;
            }
            return {text: this.assignments.get(assignKey), progress: this.progress()};
        }
        if (idStr.startsWith('NOTE_')) {
            const pool = this.ephemera[zone] || this.ephemera.EXIT;
            const n = this.ephemeraDealt.get(zone || 'EXIT') || 0;
            this.ephemeraDealt.set(zone || 'EXIT', n + 1);
            const obj = pool[n % pool.length];
            const text = obj.text;
            this.assignments.set(assignKey, text);
            this.collected.push(text);
            if (obj.thread) this.threadOf.set(text, obj.thread);
            return {
                text, 
                progress: this.progress(), 
                ephemera: true,
                thread: obj.thread || null,
                corroboration: this._registerThread(text, zone)
            };
        }
        if (idStr.startsWith('LAPTOP_')) {
            const pool = this.laptops[zone] || this.laptops.DEFAULT || [{text: "[ NO SIGNAL ]"}];
            const n = this.laptopsDealt.get(zone || 'DEFAULT') || 0;
            this.laptopsDealt.set(zone || 'DEFAULT', n + 1);
            const obj = pool[n % pool.length];
            const text = obj.text;
            this.assignments.set(assignKey, text);
            this.collected.push(text);
            if (obj.thread) this.threadOf.set(text, obj.thread);
            return {
                text, 
                progress: this.progress(), 
                laptop: true,
                thread: obj.thread || null,
                corroboration: this._registerThread(text, zone)
            };
        }
        if (idStr.startsWith('TAG_')) {
            const pool = this.clipboards[zone] || this.clipboards.DEFAULT || [{text: "[ MISSING PAPERWORK ]"}];
            const n = this.clipboardsDealt.get(zone || 'DEFAULT') || 0;
            this.clipboardsDealt.set(zone || 'DEFAULT', n + 1);
            const obj = pool[n % pool.length];
            const text = obj.text;
            this.assignments.set(assignKey, text);
            this.collected.push(text);
            if (obj.thread) this.threadOf.set(text, obj.thread);
            return {
                text, 
                progress: this.progress(), 
                clipboard: true,
                thread: obj.thread || null,
                corroboration: this._registerThread(text, zone)
            };
        }
        const sector = (zone && this.library[zone]) ? zone : 'DEFAULT';
        if (idStr.startsWith('TAPE_') && this.tapes[sector] && !this.tapesDealt.has(sector)) {
            this.tapesDealt.add(sector);
            const tape = this.tapes[sector];
            this.readTemplates.add('TAPE:' + sector);
            this.assignments.set(assignKey, tape.text);
            this.collected.push(tape.text);
            return {
                text: tape.text,
                progress: this.progress(),
                thread: tape.thread,
                corroboration: this._registerThread(tape.text, sector)
            };
        }
        let category = sector;
        let idx = this.trackers[category];
        if (idx >= this.library[category].length) {
            if (category !== 'DEFAULT' && this.trackers['DEFAULT'] < this.library['DEFAULT'].length) {
                category = 'DEFAULT';
                idx = this.trackers[category];
            } else {
                const corrupt = "[ DATA CORRUPTION DETECTED ]\n[ END OF FILE ]";
                this.assignments.set(assignKey, corrupt);
                return {text: corrupt, progress: this.progress()};
            }
        }
        this.trackers[category]++;
        this.readTemplates.add(`${category}:${idx}`);
        const obj = this.library[category][idx];
        const text = obj.text;
        this.assignments.set(assignKey, text);
        this.collected.push(text);
        return {
            text,
            progress: this.progress(),
            thread: obj.thread || null,
            corroboration: this._registerThread(text, sector)
        };
    }

    _registerThread(text, sector) {
        this.sectorsRead.add(sector);
        const thread = this.threadOf.get(text);
        if (!thread) return null;
        let sectors = this.threadSectors.get(thread);
        if (!sectors) {
            sectors = new Set();
            this.threadSectors.set(thread, sectors);
        }
        sectors.add(sector);
        if (this.corroborated.has(thread) || sectors.size < 2) return null;
        this.corroborated.add(thread);
        return {
            thread,
            label: this.threadLabel(thread),
            sources: Array.from(sectors),
            resolved: this.corroborated.size,
            resolvable: Object.keys(this.threads).length,
            sectors: this.caseStrength()
        };
    }

    threadLabel(thread) {
        return this.threads[thread]?.title || this.threads[thread] || thread;
    }

    lockProgress() {
        const lockThreads = this.activePuzzle.LOCK_THREADS || { "CIPHER": "RULE", "EPOCH": "YEAR", "PEN": "PEN" };
        const has = (t) => (this.threadSectors.get(t) || new Set()).size > 0;
        
        const result = { complete: true, missing: [] };
        for (const thread of Object.keys(lockThreads)) {
            const val = has(thread);
            if (!val) {
                result.complete = false;
                result.missing.push({ thread, label: lockThreads[thread] });
            }
        }
        return result;
    }

    caseStrength() {
        const contributing = new Set();
        this.threadSectors.forEach((sectors, thread) => {
            if (this.corroborated.has(thread)) sectors.forEach(s => contributing.add(s));
        });
        return contributing.size;
    }

    openThreads() {
        const open = [];
        this.threadSectors.forEach((sectors, thread) => {
            if (!this.corroborated.has(thread)) open.push(thread);
        });
        return open;
    }

    getVerdicts() {
        const c = this.cast;
        return {
            options: this.finales.map(f => f.option),
            truth: this.truth,
            finaleRead: this.readTemplates.has('FINALE'),
            tellCorroborated: this.corroborated.has('TELL'),
            caseStrength: this.caseStrength(),
            settled: this.corroborated.size,
            resolvable: Object.keys(this.threads).length,
            project: this.projectName
        };
    }

    getArchiveFile(k) {
        const n = this.collected.length;
        if (n === 0) return null;
        const idx = ((k % n) + n) % n;
        return {
            text: 'TERMINAL ARCHIVE — FILE ' + (idx + 1) + ' OF ' + n + '\n\n' + this.collected[idx],
            archiveIndex: idx,
            progress: this.progress()
        };
    }

    progress() {
        return {found: this.readTemplates.size, total: this.totalTemplates};
    }
}
