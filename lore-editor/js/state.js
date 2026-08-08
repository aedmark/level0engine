        // State
        let files = [];
        let selectedFile = null;
        let fileData = null;
        let linkedData = null;
        let paramsData = null;
        let puzzlesData = [];

        // Best-effort cache of other files' saved content, used only for QOL cross-file
        // hints (corroboration badges, sector lists, reachability). Always re-fetched
        // fresh before anything destructive (like a rename) is written.
        let crossFileCache = {};

        // Cache of the immutable factory-default baseline (data/factory/*.json), used
        // to decide whether a primitive (a name, a VAR key, a LOCK_THREADS key) that
        // can't carry its own "_locked" flag was part of the shipped defaults.
        let factoryCache = {};
        async function getFactoryData(file, forceRefresh) {
            if (!forceRefresh && factoryCache[file]) return factoryCache[file];
            try {
                const res = await fetch(`/api/data?file=${file}&source=factory`);
                const data = await res.json();
                factoryCache[file] = data.content;
                return data.content;
            } catch (e) {
                return factoryCache[file] || null;
            }
        }

        // Entries that carry an embedded "_locked" flag (lore/clues/finales/foreshadow/
        // puzzles entries) are factory-default and can be edited but never deleted.
        function isLockedEntry(item) {
            return !!(item && typeof item === 'object' && !Array.isArray(item) && item._locked === true);
        }

        // Active state for the new-puzzle wizard, or null when it's closed. Holds
        // everything staged across all four steps until "Create Puzzle" writes it all
        // out together.
        let wizardState = null;

        // Same idea, for the new-finale wizard. Both wizards share one DOM shell
        // (#wizard-container) since only one is ever open at a time; activeWizard says
        // which one the shared Back/Cancel buttons should dispatch to.
        let finaleWizardState = null;
        let activeWizard = null; // 'puzzle' | 'finale' | null

        let expandedCategory = null;
        let selectedCategory = null;
        let selectedIndex = null;

        const fileListEl = document.getElementById('file-list');
        const treeContentEl = document.getElementById('tree-content');
        const mainTextarea = document.getElementById('main-textarea');
        const addCatBtn = document.getElementById('add-cat-btn');


        // Fetches and caches another file's saved content. Pass forceRefresh to bypass
        // the cache (used before anything that writes cross-file, like a rename). If the
        // file being asked for is the one currently open, the live in-memory copy (which
        // may include unsaved edits) is returned instead, so badges reflect what you're
        // actually looking at.
        async function getCrossFileData(file, forceRefresh) {
            if (file === selectedFile && fileData) return fileData;
            if (!forceRefresh && crossFileCache[file]) return crossFileCache[file];
            try {
                const res = await fetch(`/api/data?file=${file}`);
                const data = await res.json();
                crossFileCache[file] = data.content;
                return data.content;
            } catch (e) {
                return crossFileCache[file] || null;
            }
        }

        // Curated one-line descriptions, shown as tooltips where a sector is picked from
        // a list. This is enrichment only, not the source of truth for which sectors
        // exist — that's whatever lore.json/clues.json actually use (see getKnownSectors),
        // so a sector can never silently fall out of sync with what the editor offers.
        const SECTOR_DESCRIPTIONS = {
            ANNEX: 'Records annex', ARCHIVE: 'Document archive', IMPOUND: 'Impound pens',
            BOARDROOM: 'Boardroom', SERVER: 'Server room', CLINIC: 'Clinic', MAINTENANCE: 'Maintenance level',
            INCINERATOR: 'Incinerator', CHASM: 'The chasm', ATRIUM: 'Atrium', EXIT: 'Exit corridor',
            CHECKPOINT: 'Security checkpoint', DEFAULT: 'Fallback pool used whenever a sector runs out of content'
        };

        // The canonical list of sectors is whatever lore.json/clues.json actually use right
        // now (synchronously, from the cache warmed in init()) — not a hand-maintained array
        // that can drift out of sync with the data, which is exactly how DEFAULT previously
        // went missing from the foreshadow location picker.
        function getKnownSectors() {
            const lore = (selectedFile === 'lore.json' && fileData) ? fileData : (crossFileCache['lore.json'] || {});
            const clues = (selectedFile === 'clues.json' && fileData) ? fileData : (crossFileCache['clues.json'] || {});
            const sectors = new Set([...Object.keys(lore || {}), ...Object.keys(clues || {})]);
            return Array.from(sectors).sort();
        }

        // fetch() only rejects on a network-level failure (DNS, connection refused, etc.)
        // — an HTTP error status like 500 (e.g. a disk-permissions failure on the server's
        // fs.writeFile) still resolves normally, so callers that don't check res.ok will
        // silently treat a failed write as a success. Every write path in this app routes
        // through here specifically so that class of bug can't happen more than once.
        async function postFile(file, content) {
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file, content })
            });
            if (!res.ok) {
                let detail = res.statusText;
                try {
                    const body = await res.json();
                    if (body && body.error) detail = body.error;
                } catch (e) { /* body wasn't JSON — fall back to statusText */ }
                throw new Error(`Failed to save ${file} (HTTP ${res.status}): ${detail}`);
            }
        }

