// StoryEngine.js
// THE PAPER TRAIL — a per-seed procedural cold case.
// The same seed always generates the same staff, the same incident, the same
// access code, and the same truth. The story is a property of the world.

export default class StoryEngine {
    constructor(seed) {
        this.seed = (seed || 1) >>> 0;
        let s = (this.seed ^ 0x9e3779b9) >>> 0;

        // Attach rand to instance so it can be used for shuffling later
        this.rand = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296.0;
        };
        const pick = (arr) => arr[Math.floor(this.rand() * arr.length)];

        const FIRST = ['Marion', 'Hollis', 'Petra', 'Vernon', 'Ada', 'Ruth', 'Emile', 'Casper', 'Lena', 'Howard', 'Iris', 'Salvador'];
        const LAST = ['Vance', 'Okafor', 'Lindqvist', 'Marsh', 'Delacroix', 'Bloom', 'Kessler', 'Antoun', 'Reyes', 'Whitlock'];
        const used = new Set();
        const mkName = () => {
            let n;
            do { n = pick(FIRST) + ' ' + pick(LAST); } while (used.has(n));
            used.add(n);
            return n;
        };

        const lead = mkName();        // research lead
        const custodian = mkName();   // facilities
        const archivist = mkName();   // records
        const lost = mkName();        // the one who didn't come back
        this.cast = {lead, custodian, archivist, lost};

        this.projectName = pick(['THRESHOLD', 'LONG HALLWAY', 'WALLPAPER', 'EVENING SHIFT', 'HUM', 'PATIENT DOOR', 'YELLOW FIELD']);
        this.accessCode = String(1000 + Math.floor(this.rand() * 9000));
        this.truth = Math.floor(this.rand() * 3);
        this.penNumber = 3 + Math.floor(this.rand() * 19);
        this.hours = 300 + Math.floor(this.rand() * 900);

        this.readTemplates = new Set();

        // The Schrödinger Trackers: Keeps count of how many items from each category have been pulled
        this.trackers = { AUDIO: 0, ANNEX: 0, ARCHIVE: 0, IMPOUND: 0, DEFAULT: 0 };

        // Sticky assignments: once a physical document has been read, it keeps
        // the same fragment forever (docId -> text). Without this, re-reading
        // one laptop deals new cards until the whole pool hits DATA CORRUPTION.
        this.assignments = new Map();

        // The recovered archive: every fragment ever read, in discovery order.
        // Terminals (PC_ docs) are networked — re-reading any of them browses
        // this shared archive, one file per read.
        this.collected = [];
        this.cycleIndex = new Map();

        this._buildLibrary();
        this._shuffleLibrary();
        this._anchorCodeFragments();
    }

    _buildLibrary() {
        const c = this.cast;
        const P = this.projectName;
        const code = this.accessCode;
        const pen = this.penNumber;
        const hrs = this.hours;

        this.library = {
            AUDIO: [
                `TAPE 01: [LOUD STATIC] ...${c.lead} here. The corridor walls are absorbing sound. I yelled for ${c.custodian} earlier and the echo... didn't come back. It just stopped. [CLICK]`,
                `TAPE 02: [WARBLED BREATHING] ...if anyone finds this... the blueprints are a trap. The access codes aren't to keep us out. They're to keep it busy. [CLICK]`,
                `TAPE 03: [HISSING] ...I found ${c.lost}'s tape recorder. It's still spinning, but there's no tape inside. How is it recording? [CLICK]`,
                `TAPE 04: [METALLIC SCRAPING] ...hour ${hrs}. ${c.archivist} was right. The humming isn't a machine. It's a lung. [STATIC]`
            ],
            ANNEX: [
                `ASYNC RESEARCH REPORT — PROJECT ${P}\nAUTHOR: ${c.lead}\n\nIt doesn't use the doors.\nIt doesn't need the doors.\nWhy did we build doors?`,
                `INTERNAL MAIL — UNSENT\nFROM: ${c.lost}\nTO: ${c.lead}\n\nYou keep saying "containment" like the word still means something here. I measured my office again last night. It has been growing by four centimeters a week. I have stopped reporting it because you have stopped reading these.`,
                `IT BULLETIN 7\nFROM: FACILITIES (${c.custodian})\n\nThe records room lock has been reset AGAIN. The new code is ${code}. Do not write it down. Do not tell ${c.lead} I wrote it down.`,
                `PROJECT ${P} — OBSERVATION ${100 + (this.seed % 800)}\nAUTHOR: ${c.lead}\n\nThe architectural shift is directly proportional to the observer's heart rate. The walls aren't moving; the space between them is breathing. ${c.lost} disagrees. ${c.lost} has been in the halls ${hrs} hours and I no longer weight ${c.lost}'s disagreements.`,
                `STICKY NOTE, FOLDED TWICE\n\nIf my door is locked and my laptop is on, I have gone to the pens. If my door is locked and my laptop is gone, so am I. — ${c.lost}`
            ],
            ARCHIVE: [
                `PERSONNEL RECORD — ${c.lost.toUpperCase()}\nSTATUS: SEE ADDENDUM\nADDENDUM: MISSING\nADDENDUM 2: The addendum is not missing. The addendum was reclassified. — ${c.archivist}`,
                `REQUISITION SLIP\nREQUESTED: 1 (one) additional copy of the floor plan\nDENIED. REASON: The floor plan is a living document. Duplication causes drift. — ${c.archivist}`,
                `SHELVING MEMO\nFROM: ${c.archivist}\n\nStop filing the ${P} reports under FICTION. I know it's ${c.custodian}. The whispering in the stacks is NOT the documents, and even if it were, they would not appreciate the joke.`,
                `BURN ORDER — PARTIAL\nAUTHORIZED: ${c.lead}\n\nAll ${P} correspondence prior to hour ${hrs}. The incinerator crew reports the door code desk left for them reads ${code}. That is not the incinerator code. That is the records room. Someone wants something read before it burns.`
            ],
            IMPOUND: [
                `PROPERTY TAG — PEN ${pen}\nITEM: One (1) wedding ring, still warm.\nOWNER: ${c.lost}\nCLAIM STATUS: OWNER MUST CLAIM IN PERSON.`,
                `PROPERTY TAG — PEN ${pen + 1}\nITEM: Office chair, one caster missing.\nNOTE FROM ${c.custodian}: It rolls back to the pen by morning. Stopped chasing it. Fence holds.`,
                `IMPOUND LEDGER, FINAL PAGE\n\nHour ${hrs}: ${c.custodian} logged IN one (1) personal effect belonging to ${c.lost}.\nHour ${hrs}: ${c.custodian} logged OUT.\nThere is no second entry. The gate to pen ${pen} has been ajar since.`
            ],
            DEFAULT: [
                `INCIDENT LOG\n\nSubject exhibited extreme paranoia after ${hrs} hours. Claimed the hum of the fluorescent lights was a linguistic sequence. We cut the power, but the humming didn't stop.`,
                `MAINTENANCE REQUEST\nFILED BY: ${c.custodian}\n\nPlease send someone to Level 0. The carpet is damp again. Also, stop leaving geometry in the negative coordinate space. The renderer is screaming.`,
                `MEMO\n\nIf you hear it scraping, stand still. If you hear it breathing, turn off the light. If you hear it laughing, close your eyes.`,
                `SHIFT HANDOVER — PROJECT ${P}\n\n${c.lead} says the exits are a motivational tool. ${c.archivist} says the exits are load-bearing. ${c.lost} said the exits are a rumor the building spreads about itself. ${c.lost} was smiling when they said it. Nobody has seen that smile since.`,
                `CAFETERIA NOTICE\n\nThe almond water is not a beverage. The almond water is a countermeasure. Ration accordingly. — FACILITIES`
            ]
        };

        this.finales = [
            `RECORDS ROOM — SEALED FILE\nPROJECT ${P} — FINDING OF FACT\n\nThere was no breach. Review every log: it never came IN. The entity predates the facility. The facility predates the level. We did not build a laboratory around a specimen. It grew a specimen around a laboratory.\n\n${c.lead}'s final margin note: "We are the note it left for itself."`,
            `RECORDS ROOM — SEALED FILE\nPROJECT ${P} — FINDING OF FACT\n\n${c.lost} is alive. That is the finding. Every door that will not open has been locked FROM THE INSIDE, by hand, in ${c.lost}'s handwriting, in chalk, on the side we cannot see. ${c.lost} is not trapped in here with it.\n\nIt is trapped in here with ${c.lost}.`,
            `RECORDS ROOM — SEALED FILE\nPROJECT ${P} — FINDING OF FACT\n\nThe hum is a carrier wave. ${c.archivist} proved it in the stacks: the documents rearrange along it. The building is not haunted. The building is TRANSMITTING — inventory, floor plans, personnel files — somewhere. We are not test subjects.\n\nWe are the payload.`
        ];

        this.totalTemplates =
            this.library.AUDIO.length +
            this.library.ANNEX.length +
            this.library.ARCHIVE.length +
            this.library.IMPOUND.length +
            this.library.DEFAULT.length + 1; // +1 for the finale
    }

    _shuffleLibrary() {
        // Seeded Fisher-Yates shuffle for each category to ensure narrative order
        // is random per seed, but identical on reload.
        for (const key in this.library) {
            const arr = this.library[key];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(this.rand() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
    }

    _anchorCodeFragments() {
        // The shuffle must never bury the access code at the bottom of a pool.
        // Whatever entry carries the code is re-seated among the first three
        // pulls of its zone — still shuffled, always surfaceable. Matched by
        // marker phrase, NOT by code digits: the hours field can be four digits
        // and collide with the code string.
        const markers = {
            ANNEX: 'The new code is',
            ARCHIVE: 'desk left for them reads'
        };
        for (const key in markers) {
            const arr = this.library[key];
            const ci = arr.findIndex(t => t.indexOf(markers[key]) !== -1);
            if (ci > 2) {
                const entry = arr.splice(ci, 1)[0];
                arr.splice(Math.floor(this.rand() * 3), 0, entry);
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

        // Sticky re-reads: a physical document never changes its mind —
        // except terminals, which are networked into the recovered archive
        const isTerminal = idStr.startsWith('PC_');
        const assignKey = idStr + '|' + (zone || '');
        if (this.assignments.has(assignKey)) {
            if (isTerminal && this.collected.length > 1) {
                const n = (this.cycleIndex.get(assignKey) || 0) + 1;
                this.cycleIndex.set(assignKey, n);
                const k = (n - 1) % this.collected.length;
                return {
                    text: 'TERMINAL ARCHIVE — FILE ' + (k + 1) + ' OF ' + this.collected.length + '\n\n' + this.collected[k],
                    progress: this.progress()
                };
            }
            return {text: this.assignments.get(assignKey), progress: this.progress()};
        }

        let category = 'DEFAULT';
        if (idStr.startsWith('TAPE')) {
            category = 'AUDIO';
        } else if (zone && this.library[zone]) {
            category = zone;
        }

        // The Schrödinger Pull: Get the next unread document for this category
        let idx = this.trackers[category];

        // If this zone is exhausted, fallback to DEFAULT
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

        // Mark as read and increment the tracker
        this.trackers[category]++;
        this.readTemplates.add(`${category}:${idx}`);
        this.assignments.set(assignKey, this.library[category][idx]);
        this.collected.push(this.library[category][idx]);

        return {text: this.library[category][idx], progress: this.progress()};
    }

    progress() {
        return {found: this.readTemplates.size, total: this.totalTemplates};
    }
}