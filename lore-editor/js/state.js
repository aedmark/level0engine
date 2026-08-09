/**
 * [ROLE] Holds the editor's shared mutable state and the fetch/cache helpers that populate it.
 * [WHY] Centralizes cross-file data access so every panel (validation, wizards, inspector) reads the same live and factory JSON instead of fetching redundantly.
 * [STATE] Declares the actual global variables (files, selectedFile, fileData, wizardState, etc.) that every other lore-editor script reads and mutates directly.
 * [DEPENDS] Fetches from editor_server.js's /api/data endpoint; consumed by essentially every other file in lore-editor/js.
 */
let files = [];
        let selectedFile = null;
        let fileData = null;
        let linkedData = null;
        let paramsData = null;
        let puzzlesData = [];

let crossFileCache = {};

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

function isLockedEntry(item) {
            return !!(item && typeof item === 'object' && !Array.isArray(item) && item._locked === true);
        }

let wizardState = null;

let finaleWizardState = null;
        let activeWizard = null;

let expandedCategory = null;
        let selectedCategory = null;
        let selectedIndex = null;

        const fileListEl = document.getElementById('file-list');
        const treeContentEl = document.getElementById('tree-content');
        const mainTextarea = document.getElementById('main-textarea');
        const addCatBtn = document.getElementById('add-cat-btn');


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

const SECTOR_DESCRIPTIONS = {
            ANNEX: 'Records annex', ARCHIVE: 'Document archive', IMPOUND: 'Impound pens',
            BOARDROOM: 'Boardroom', SERVER: 'Server room', CLINIC: 'Clinic', MAINTENANCE: 'Maintenance level',
            INCINERATOR: 'Incinerator', CHASM: 'The chasm', ATRIUM: 'Atrium', EXIT: 'Exit corridor',
            CHECKPOINT: 'Security checkpoint', DEFAULT: 'Fallback pool used whenever a sector runs out of content'
        };

function getKnownSectors() {
            const lore = (selectedFile === 'lore.json' && fileData) ? fileData : (crossFileCache['lore.json'] || {});
            const clues = (selectedFile === 'clues.json' && fileData) ? fileData : (crossFileCache['clues.json'] || {});
            const sectors = new Set([...Object.keys(lore || {}), ...Object.keys(clues || {})]);
            return Array.from(sectors).sort();
        }

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
                } catch (e) {
                }
                throw new Error(`Failed to save ${file} (HTTP ${res.status}): ${detail}`);
            }
        }

let isDirty = false;
        function markDirty() { isDirty = true; }
        function clearDirty() { isDirty = false; }

function confirmDiscardIfDirty() {
            if (!isDirty) return true;
            const ok = confirm(`You have unsaved changes to ${selectedFile}. Leaving now will discard them. Continue?`);
            if (ok) clearDirty();
            return ok;
        }

window.addEventListener('beforeunload', (e) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = '';
        });

