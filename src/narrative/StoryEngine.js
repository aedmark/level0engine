import { safeEval } from '../utils/SafeEval.js';
import {buildCaseFiles} from './CaseFiles.js';

export default class StoryEngine {
    static NAMES_DATA = { FIRST: [], LAST: [], PROJECT_NAMES: [] };
    static CASES_DATA = {};
    static CLIPBOARD_FALLBACKS = [
        {text: "[ MISSING PAPERWORK ]"},
        {text: "[ FORM ILLEGIBLE ]"},
        {text: "[ WATER DAMAGE ]"},
        {text: "[ SIGNATURE UNREADABLE ]"}
    ];

    static async loadData(dataDir = './data', onProgress = null) {
        try {
            const files = ['parameters', 'lore', 'clues', 'finales', 'foreshadow', 'threads', 'puzzles'];
            let loadedCount = 0;
            const results = {};

            await Promise.all(files.map(async (f) => {
                const res = await fetch(`${dataDir}/${f}.json`);
                if (!res.ok) throw new Error(`${f}.json -> HTTP ${res.status}`);
                results[f] = await res.json();
                loadedCount++;
                if (onProgress) onProgress(loadedCount / files.length, `${f}.json`);
            }));

            StoryEngine.PARAMS = results.parameters;
            StoryEngine.PUZZLES = results.puzzles;
            StoryEngine.CASES_DATA = { 
                lore: results.lore, 
                clues: results.clues, 
                finales: results.finales, 
                foreshadow: results.foreshadow, 
                threads: results.threads 
            };
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
        const MAX_NAME_ATTEMPTS = 200;
        const mkName = () => {
            let first, last, full;
            let attempts = 0;
            do {
                first = pick(FIRST);
                last = pick(LAST);
                full = first + ' ' + last;
                attempts++;
            } while (used.has(full) && attempts < MAX_NAME_ATTEMPTS);
            if (used.has(full)) {
                let n = 2;
                let disambiguated = full;
                while (used.has(disambiguated)) {
                    disambiguated = `${full} ${n}`;
                    n++;
                }
                full = disambiguated;
            }
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

        const customCoreVarDefs = StoryEngine.PARAMS.CORE_VARS || {};
        for (const key in customCoreVarDefs) {
            if (key in this.coreVars) continue;
            const def = customCoreVarDefs[key];
            const min = Number.isFinite(def?.min) ? def.min : 0;
            const max = Number.isFinite(def?.max) ? def.max : min;
            this.coreVars[key] = min + Math.floor(this.rand() * (max - min + 1));
        }

        this.penNumber = this.coreVars.pen;
        this.siteYear = this.coreVars.year;
        this.hours = this.coreVars.hours;

        const puzzles = StoryEngine.PUZZLES || [
            {
                "id": "DEFAULT",
                "ACCESS_CODE": "String(ctx.year).slice(2) + String(ctx.pen).padStart(2, '0')",
                "LOCK_THREADS": { "CIPHER": "RULE", "EPOCH": "YEAR", "PEN": "PEN" }
            }
        ];
        this.activePuzzle = puzzles[Math.floor(this.rand() * puzzles.length)];

        const accessCodeConfig = this.activePuzzle.ACCESS_CODE || "0000";
        try {
            this.accessCode = safeEval(accessCodeConfig, this.coreVars);
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
            rand: this.rand,
            cipher: this.accessCode
        }, StoryEngine.CASES_DATA);
        
        this.library = files.library;
        this.tapes = files.tapes;
        this.ephemera = files.ephemera;
        this.laptops = files.laptops;
        this.clipboards = files.clipboards;
        this.finales = files.finales;
        this.threads = files.threads;

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
        
        this.meshDeck = {};
        this.meshIndex = {};
        
        const addDeck = (sector, type, count) => {
            if (!this.meshDeck[sector]) this.meshDeck[sector] = [];
            for (let i = 0; i < count; i++) this.meshDeck[sector].push(type);
        };
        
        for (const sector in this.library) {
            this.trackers[sector] = 0;
            const arr = this.library[sector];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].thread) this.threadOf.set(arr[i].text, arr[i].thread);
            }
            this.totalTemplates += arr.length;
            addDeck(sector, 'document', arr.length);
        }
        for (const sector in this.tapes) {
            this.threadOf.set(this.tapes[sector].text, this.tapes[sector].thread);
            this.totalTemplates++;
            addDeck(sector, 'tape', 1);
        }
        for (const sector in this.ephemera) {
            addDeck(sector, 'note', this.ephemera[sector].length);
        }
        for (const sector in this.laptops) {
            addDeck(sector, 'laptop', this.laptops[sector].length);
        }
        for (const sector in this.clipboards) {
            addDeck(sector, 'clipboard', this.clipboards[sector].length);
        }

        for (const sector in this.meshDeck) {
            this.meshIndex[sector] = 0;
            const deck = this.meshDeck[sector];
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(this.rand() * (i + 1));
                const temp = deck[i];
                deck[i] = deck[j];
                deck[j] = temp;
            }
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
            if (this.activePuzzle.id !== 'DEFAULT' && this.rand() > 0.05) {
                if (this.activePuzzle.lockType !== 'HARD' || this.rand() > 0.3) {
                    arr.push({text: `[ DEVICE LOCKED ]\n\nACCESS REQUIRES DECRYPT:\n[ ${this.activePuzzle.id} ]`});
                }
            }

            if (this.rand() > 0.25) arr.push(this.library[key][Math.floor(this.rand() * arr.length)]);
            if (this.rand() > 0.45) arr.push(this.library[key][Math.floor(this.rand() * arr.length)]);

            for (const leg of LEGS) {
                const ci = arr.findIndex(t => t.thread === leg);
                if (ci > 2) {
                    const entry = arr.splice(ci, 1)[0];
                    arr.splice(Math.floor(this.rand() * 3), 0, entry);
                }
            }
        }
    }

    getNextMeshType(sector) {
        let activeSector = sector;
        let deck = this.meshDeck[activeSector];
        if (!deck || deck.length === 0) {
            activeSector = 'DEFAULT';
            deck = this.meshDeck[activeSector];
        }
        if (!deck || deck.length === 0) return 'document';
        
        const idx = this.meshIndex[activeSector] || 0;
        const type = deck[idx % deck.length];
        this.meshIndex[activeSector] = idx + 1;
        return type;
    }

    getFragment(docId, zone) {
        const idStr = String(docId || 'X');
        if (idStr === 'NOTE_TUTORIAL') {
            return {
                text: `[ MAINTENANCE LOG ]\n\nThe entry airlock is on emergency lockdown upon entry.\n\nThis is for your safety.\n\nShake the flashlight wildly in the dark to build up a kinetic charge. \n\nOnce at 100%, the power grid will transfer your flashlight charge to the airlock wirelessly.\n\nTo get out, you must enter the override code to bypass the door lock:\n\n0451\n\nFollow your compass, compare notes, verify claims, avoid the entities, and keep track of the Points of Interest (POI)\n\nAnd remember:\n-Stay Calm. Stay Quiet. Stay Sane.`,
                progress: this.progress(),
                ephemera: true
            };
        }
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
            let pool = this.ephemera[zone] || [];
            let n = this.ephemeraDealt.get(zone) || 0;
            let useZone = zone;
            if (n >= pool.length || pool.length === 0) {
                pool = this.ephemera.DEFAULT || [];
                n = this.ephemeraDealt.get('DEFAULT') || 0;
                useZone = 'DEFAULT';
            }
            if (n >= pool.length || pool.length === 0) {
                pool = [{text: "[ INDECIPHERABLE SCRAWL ]"}];
                n = 0;
                useZone = 'FALLBACK';
            }
            this.ephemeraDealt.set(useZone, n + 1);
            const obj = pool[n];
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
            let pool = this.laptops[zone] || [];
            let n = this.laptopsDealt.get(zone) || 0;
            let useZone = zone;
            if (n >= pool.length || pool.length === 0) {
                pool = this.laptops.DEFAULT || [];
                n = this.laptopsDealt.get('DEFAULT') || 0;
                useZone = 'DEFAULT';
            }
            if (n >= pool.length || pool.length === 0) {
                pool = [{text: "[ NO SIGNAL ]"}];
                n = 0;
                useZone = 'FALLBACK';
            }
            this.laptopsDealt.set(useZone, n + 1);
            const obj = pool[n];
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
            let pool = this.clipboards[zone] || [];
            let n = this.clipboardsDealt.get(zone) || 0;
            let useZone = zone;
            if (n >= pool.length || pool.length === 0) {
                pool = this.clipboards.DEFAULT || [];
                n = this.clipboardsDealt.get('DEFAULT') || 0;
                useZone = 'DEFAULT';
            }
            if (n >= pool.length || pool.length === 0) {
                pool = StoryEngine.CLIPBOARD_FALLBACKS;
                const dealt = this.clipboardsDealt.get('FALLBACK') || 0;
                n = dealt % pool.length;
                useZone = 'FALLBACK';
                this.clipboardsDealt.set('FALLBACK', dealt + 1);
            } else {
                this.clipboardsDealt.set(useZone, n + 1);
            }
            const obj = pool[n];
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

    exportState() {
        return {
            readTemplates: Array.from(this.readTemplates),
            collected: this.collected,
            assignments: Array.from(this.assignments.entries()),
            trackers: this.trackers,
            cycleIndex: Array.from(this.cycleIndex.entries()),
            tapesDealt: Array.from(this.tapesDealt),
            ephemeraDealt: Array.from(this.ephemeraDealt.entries()),
            laptopsDealt: Array.from(this.laptopsDealt.entries()),
            clipboardsDealt: Array.from(this.clipboardsDealt.entries()),
            corroborated: Array.from(this.corroborated),
            sectorsRead: Array.from(this.sectorsRead)
        };
    }

    importState(state) {
        if (!state) return;
        if (state.readTemplates) this.readTemplates = new Set(state.readTemplates);
        if (state.collected) this.collected = state.collected;
        if (state.assignments) this.assignments = new Map(state.assignments);
        if (state.trackers) this.trackers = state.trackers;
        if (state.cycleIndex) this.cycleIndex = new Map(state.cycleIndex);
        if (state.tapesDealt) this.tapesDealt = new Set(state.tapesDealt);
        if (state.ephemeraDealt) this.ephemeraDealt = new Map(state.ephemeraDealt);
        if (state.laptopsDealt) this.laptopsDealt = new Map(state.laptopsDealt);
        if (state.clipboardsDealt) this.clipboardsDealt = new Map(state.clipboardsDealt);
        if (state.corroborated) this.corroborated = new Set(state.corroborated);
        if (state.sectorsRead) this.sectorsRead = new Set(state.sectorsRead);
    }
}
