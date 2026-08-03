import {buildCaseFiles, THREADS} from './CaseFiles.js';

export default class StoryEngine {
    constructor(seed) {
        this.seed = (seed || 1) >>> 0;
        let s = (this.seed ^ 0x9e3779b9) >>> 0;
        this.rand = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296.0;
        };
        const pick = (arr) => arr[Math.floor(this.rand() * arr.length)];
        const FIRST = ['Marion', 'Edward', 'Hollis', 'Petra', 'Vernon', 'Gordon', 'Cassandra', 'Ada', 'Ruth', 'Kai', 'Andrew', 'Jess', 'Emile', 'Casper', 'Lena', 'Howard', 'Iris', 'Salvador'];
        const LAST = ['Vance', 'Okafor', 'Lindqvist', 'Marsh', 'Delacroix', 'Edmark', "Edwards", 'Crownover', 'Bloom', 'Pleimart', 'Kessler', 'Antoun', 'Reyes', 'Whitlock'];
        const used = new Set();
        const mkName = () => {
            let n;
            do {
                n = pick(FIRST) + ' ' + pick(LAST);
            } while (used.has(n));
            used.add(n);
            return n;
        };
        const lead = mkName();
        const custodian = mkName();
        const archivist = mkName();
        const lost = mkName();
        this.cast = {lead, custodian, archivist, lost};
        this.projectName = pick(['THRESHOLD', 'LONG HALLWAY', 'WALLPAPER', 'EVENING SHIFT', 'HUM', 'PATIENT DOOR', 'YELLOW FIELD']);
        this.truth = Math.floor(this.rand() * 3);
        this.penNumber = 3 + Math.floor(this.rand() * 19);
        this.siteYear = 1971 + Math.floor(this.rand() * 28);
        this.accessCode = String(this.siteYear).slice(2) + String(this.penNumber).padStart(2, '0');
        this.hours = 300 + Math.floor(this.rand() * 900);
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
            truth: this.truth
        });
        this.library = files.library;
        this.tapes = files.tapes;
        this.finales = files.finales;
        this.ephemera = files.ephemera;
        this.ephemeraDealt = new Map();
        this.trackers = {};
        this.totalTemplates = 0;
        for (const sector in this.library) {
            this.trackers[sector] = 0;
            const arr = this.library[sector];
            const tags = files.tags[sector] || [];
            for (let i = 0; i < arr.length; i++) {
                if (tags[i]) this.threadOf.set(arr[i], tags[i]);
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
        const LEGS = ['CIPHER', 'EPOCH', 'PEN'];
        for (const key in this.library) {
            const arr = this.library[key];
            for (const leg of LEGS) {
                const ci = arr.findIndex(t => this.threadOf.get(t) === leg);
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
            if (!this.readTemplates.has('FINALE')) {
                this.readTemplates.add('FINALE');
                this.collected.push(this.finales[this.truth]);
            }
            return {text: this.finales[this.truth], progress: this.progress()};
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
            const text = pool[n % pool.length];
            this.assignments.set(assignKey, text);
            return {text, progress: this.progress(), ephemera: true};
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
        const text = this.library[category][idx];
        this.assignments.set(assignKey, text);
        this.collected.push(text);
        return {
            text,
            progress: this.progress(),
            thread: this.threadOf.get(text) || null,
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
            resolvable: THREADS.length,
            sectors: this.caseStrength()
        };
    }

    threadLabel(thread) {
        return {
            CIPHER: 'RECORDS LOCK — POUR YEAR, THEN OPEN PEN',
            EPOCH: `THE SLAB WAS POURED IN ${this.siteYear}`,
            PEN: `PEN ${this.penNumber} HAS NEVER BEEN SHUT`,
            LOST: `THE DISPOSITION OF ${this.cast.lost.toUpperCase()}`,
            GEOMETRY: 'THE FLOOR PLAN IS NOT FIXED',
            HUM: 'THE HUM CARRIES INFORMATION',
            TELL: `PROJECT ${this.projectName} — THE SHAPE OF THE FINDING`
        }[thread] || thread;
    }

    lockProgress() {
        const has = (t) => (this.threadSectors.get(t) || new Set()).size > 0;
        const cipher = has('CIPHER'), epoch = has('EPOCH'), pen = has('PEN');
        return {cipher, epoch, pen, complete: cipher && epoch && pen};
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
            options: [
                'CONTAINMENT REVIEW: There was no breach. The specimen predates the site. It grew a laboratory around itself.',
                'PERSONNEL FINDING: ' + c.lost + ' is alive. Every locked door was sealed by hand, from the inside. It is trapped in here with ' + c.lost + '.',
                'TRANSMISSION AUDIT: The hum is a carrier wave. The building is broadcasting its own contents somewhere. The staff are the payload.'
            ],
            truth: this.truth,
            finaleRead: this.readTemplates.has('FINALE'),
            tellCorroborated: this.corroborated.has('TELL'),
            caseStrength: this.caseStrength(),
            settled: this.corroborated.size,
            resolvable: THREADS.length,
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
