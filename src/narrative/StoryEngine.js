import {buildCaseFiles, THREADS} from './CaseFiles.js';

/**
 * A procedural narrative generator that constructs a coherent lore state per playthrough.
 *
 * The seed dictates the cast, the access code, and which of three findings is true, so every note,
 * terminal and tape in a run points at one consistent conclusion. This class owns the dealing:
 * which object gets which document, in what order, and what that costs. The documents themselves
 * live in CaseFiles.js.
 *
 * The unit of verification is the SECTOR. A claim asserted by one sector is rumour and sits on the
 * player's flashlight ceiling as unresolved tension. The same claim asserted by a second, different
 * sector settles and refunds. That single rule is what couples the case file to the maze: the price
 * of knowing anything is measured in how far you walked to confirm it.
 */
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
        // The lock is assembled, never issued. No document in the wing prints these four digits;
        // one names the rule, another the year, a third the pen, and the player does the sum. The
        // value is held here only so the keypad has something to compare against.
        this.accessCode = String(this.siteYear).slice(2) + String(this.penNumber).padStart(2, '0');
        this.hours = 300 + Math.floor(this.rand() * 900);
        this.readTemplates = new Set();
        this.assignments = new Map();
        this.collected = [];
        this.cycleIndex = new Map();
        this.tapesDealt = new Set();
        // `threadOf` is keyed on a template's exact text so tags survive shuffling and splicing with
        // no index reconciliation. `threadSectors` records which sectors have asserted each claim.
        this.threadOf = new Map();
        this.threadSectors = new Map();
        this.corroborated = new Set();
        this.sectorsRead = new Set();
        this._buildLibrary();
        this._shuffleLibrary();
        this._anchorCodeFragments();
    }

    /**
     * Loads the authored case files for this seed and indexes them for dealing.
     * @private
     */
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
        // No +1 for the finale any more. The records room holds the elevator key, not the sealed
        // Finding, so the finale text has no object in the world that deals it and counting it
        // would make DATA RECOVERED permanently unreachable at 100%.
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

    /**
     * Shuffles each sector's pool so discovery order varies, deterministically per seed.
     * @private
     */
    _shuffleLibrary() {
        for (const key in this.library) {
            const arr = this.library[key];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(this.rand() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
    }

    /**
     * Floats every document carrying the access code toward the front of its own pool.
     *
     * The records room is the one hard lock in the wing, so a run where all five CODE documents
     * shuffle to the back is a run the player cannot open. Selecting on the thread tag rather than
     * on substrings of the prose means adding another code-bearing memo needs no change here.
     *
     * @private
     */
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

    /**
     * Retrieves the story fragment bound to a specific object, assigning one on first contact.
     *
     * Assignments are permanent: a note re-read says the same thing, and re-reads return no thread
     * field, so tension and refunds cannot be farmed off one sticky note. Terminals ignore all of
     * this and browse the recovered archive instead.
     *
     * @param {string} docId - The unique identifier of the interactable object.
     * @param {string} [zone] - The sector the object was found in.
     * @returns {Object} The fragment text, collection progress, thread, and any corroboration.
     */
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
        // Ephemera short-circuits everything below it. No thread, no tension, no archive entry, no
        // effect on DATA RECOVERED. It is not case material and the engine should not pretend it
        // is. Dealt round-robin so a bunker with eight desks reads eight different notes.
        if (idStr.startsWith('NOTE_')) {
            const pool = this.ephemera[zone] || this.ephemera.EXIT;
            const n = this.ephemeraDealt.get(zone || 'EXIT') || 0;
            this.ephemeraDealt.set(zone || 'EXIT', n + 1);
            const text = pool[n % pool.length];
            this.assignments.set(assignKey, text);
            return {text, progress: this.progress(), ephemera: true};
        }
        const sector = (zone && this.library[zone]) ? zone : 'DEFAULT';
        // A recorder deals its own sector's tape, once. A second recorder in the same sector has
        // nothing left to play and falls through to that sector's paper.
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

    /**
     * Files a freshly read document against the claim it makes, and reports a corroboration the
     * first time two independent SECTORS assert the same claim.
     *
     * Two impound tags naming the same missing person do not corroborate each other. Neither does a
     * tape and a memo pulled from the same room. Verification is priced in traversal, which is the
     * entire reason the sector rather than the document category is the unit here.
     *
     * @param {string} text - The exact template text just read.
     * @param {string} sector - The sector it was recovered from.
     * @returns {Object|null} The corroboration payload, or null if nothing resolved this read.
     * @private
     */
    _registerThread(text, sector) {
        this.sectorsRead.add(sector);
        const thread = this.threadOf.get(text);
        if (!thread) return null;
        let sectors = this.threadSectors.get(thread);
        if (!sectors) {
            sectors = new Set();
            this.threadSectors.set(thread, sectors);
        }
        // Recorded before the settled check, so a third and fourth source still count toward case
        // strength. A claim confirmed across five sectors is a stronger case than the same claim
        // confirmed across two, even though both are equally settled.
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

    /**
     * The claim a thread makes, phrased as the player would file it.
     *
     * CIPHER, EPOCH and PEN deliberately name the shape of the answer and never the answer. The
     * banner tells you that you now know how the lock is built, or which year, or which pen. It
     * does not do the arithmetic, because doing the arithmetic is the puzzle.
     */
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

    /**
     * Whether the player has settled all three legs of the records room lock.
     *
     * Nothing gates the keypad on this: a player who works the code out from one unconfirmed memo
     * is welcome to type it in. This exists so the keypad can tell them which legs they are still
     * missing when they get it wrong, rather than just buzzing at them.
     *
     * @returns {{cipher: boolean, epoch: boolean, pen: boolean, complete: boolean}}
     */
    lockProgress() {
        const has = (t) => (this.threadSectors.get(t) || new Set()).size > 0;
        const cipher = has('CIPHER'), epoch = has('EPOCH'), pen = has('PEN');
        return {cipher, epoch, pen, complete: cipher && epoch && pen};
    }

    /**
     * How many distinct sectors have contributed to a settled claim.
     *
     * This is the number the Inquest should be gated on. A finding assembled inside one wing is not
     * a finding, it is a hunch with letterhead.
     *
     * @returns {number}
     */
    caseStrength() {
        const contributing = new Set();
        this.threadSectors.forEach((sectors, thread) => {
            if (this.corroborated.has(thread)) sectors.forEach(s => contributing.add(s));
        });
        return contributing.size;
    }

    /** Claims asserted by at least one sector and not yet confirmed by a second. */
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
