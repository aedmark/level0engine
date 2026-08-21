function getTargetObj() {
            if (selectedFile === 'puzzles.json' && selectedCategory === null) {
                if (selectedIndex !== null && fileData[selectedIndex]) {
                    if (!fileData[selectedIndex].LOCK_THREADS) fileData[selectedIndex].LOCK_THREADS = {};
                    return fileData[selectedIndex].LOCK_THREADS;
                }
                return null;
            }
            return isArrayRoot() ? (fileData[selectedIndex] ? fileData[selectedIndex][selectedCategory] : null) : fileData[selectedCategory];
        }

async function getLockedNamesSet() {
            if (selectedFile !== 'parameters.json') return new Set();
            const factory = await getFactoryData('parameters.json');
            const factoryArr = factory && Array.isArray(factory[selectedCategory]) ? factory[selectedCategory] : [];
            return new Set(factoryArr);
        }
        async function getLockedVarKeysSet() {
            if (selectedFile === 'parameters.json' && selectedCategory === 'VARS') {
                const factory = await getFactoryData('parameters.json');
                return new Set(factory && factory.VARS ? Object.keys(factory.VARS) : []);
            }
            if (selectedFile === 'puzzles.json') {
                const currentPuzzle = fileData[selectedIndex];
                const factory = await getFactoryData('puzzles.json');
                const factoryPuzzle = factory && currentPuzzle ? factory.find(p => p.id === currentPuzzle.id) : null;
                return new Set(factoryPuzzle && factoryPuzzle.LOCK_THREADS ? Object.keys(factoryPuzzle.LOCK_THREADS) : []);
            }
            return new Set();
        }
        async function renderNamesList() {
            const arr = getTargetObj() || [];
            const lockedSet = await getLockedNamesSet();
            let html = '';
            arr.forEach((name, i) => {
                const locked = lockedSet.has(name);
                const deleteControl = locked
                    ? `<span title="Factory default — can't be deleted" style="opacity:0.5; cursor:default; padding: 0 4px;">🔒</span>`
                    : `<button onclick="deleteNameEntry(${i})" style="background:transparent; border:none; color:var(--accent-red); cursor:pointer;">×</button>`;
                html += `<div style="align-self: flex-start; min-width: 250px; flex-shrink: 0; display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;">
                    <span style="font-family: var(--font-mono); font-size: 0.875rem;">${name}</span>
                    ${deleteControl}
                </div>`;
            });
            document.getElementById('names-container').innerHTML = DOMPurify.sanitize(html);
        }

const BUILTIN_VARS = [
    {key: 'P', note: 'project name'},
    {key: 'pen', note: 'rolled per playthrough'},
    {key: 'year', note: 'rolled per playthrough'},
    {key: 'hours', note: 'rolled per playthrough', also: 'hrs'},
    {key: 'seed', note: 'rolled per playthrough'}
];

const VAR_ALIAS_TARGETS = {
    'ctx.pen': 'pen',
    'ctx.siteYear': 'year',
    'ctx.year': 'year',
    'ctx.hours': 'hours',
    'ctx.seed': 'seed'
};

const VAR_NOTES = {
    'ctx.cipher': "the active puzzle's ACCESS_CODE — never use in visible text"
};

function aliasTargetOf(expr) {
    return VAR_ALIAS_TARGETS[String(expr).trim()] || null;
}

function parseVarRange(value) {
    const m = /^\s*(-?\d+)\s*(?:\.\.\.?|–|—|-)\s*(-?\d+)\s*$/.exec(String(value));
    if (!m) return null;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return a <= b ? {min: a, max: b} : {min: b, max: a};
}

function formatVarRange(def) {
    const min = Number.isFinite(def && def.min) ? def.min : 0;
    const max = Number.isFinite(def && def.max) ? def.max : min;
    return `${min}-${max}`;
}

function isMergedVarScreen() {
    return selectedFile === 'parameters.json' &&
        (selectedCategory === 'VARS' || selectedCategory === 'CORE_VARS');
}

function isBuiltinVar(key) {
    return BUILTIN_VARS.some(b => b.key === key);
}

function varStores() {
    const ok = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!ok(fileData.VARS)) fileData.VARS = {};
    if (!ok(fileData.CORE_VARS)) fileData.CORE_VARS = {};
    return {exprs: fileData.VARS, ranges: fileData.CORE_VARS};
}

async function getMergedLockedKeys() {
    const factory = await getFactoryData('parameters.json');
    const keys = new Set();
    if (factory && factory.VARS) Object.keys(factory.VARS).forEach(k => keys.add(k));
    if (factory && factory.CORE_VARS) Object.keys(factory.CORE_VARS).forEach(k => keys.add(k));
    return keys;
}

function varPreviewFn() {
    const params = selectedFile === 'parameters.json' ? fileData : paramsData;
    let mockCtx = null;
    try { mockCtx = buildMockCtx(params || {}, puzzlesData || []); } catch (e) { mockCtx = null; }
    return (token) => {
        if (!mockCtx) return '—';
        try { return String(resolveTemplateForValidation(token, mockCtx).result); }
        catch (e) { return '—'; }
    };
}

const VAR_ROW_STYLE = 'align-self: flex-start; min-width: 460px; flex-shrink: 0; display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; gap: 12px;';
const VAR_KEY_STYLE = 'font-family: var(--font-mono); font-size: 0.875rem; color: var(--accent-amber); min-width: 110px;';
const VAR_INPUT_STYLE = 'flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;';
const VAR_PREVIEW_STYLE = 'font-family: var(--font-mono); font-size: 0.75rem; color: #6b7280; min-width: 90px; text-align: right;';

async function renderMergedVarsList() {
    const {exprs, ranges} = varStores();
    const locked = await getMergedLockedKeys();
    const preview = varPreviewFn();

    const editable = []
        .concat(Object.keys(ranges).map(k => ({key: k, value: formatVarRange(ranges[k]), aliasOf: null})))
        .concat(Object.keys(exprs).map(k => ({key: k, value: String(exprs[k]), aliasOf: aliasTargetOf(exprs[k])})));

    const editableRow = (entry, indent) => {
        const isLocked = locked.has(entry.key);
        const control = isLocked
            ? `<span title="Factory default — can't be deleted, but you can still edit its value" style="opacity:0.5; cursor:default; padding: 0 4px;">🔒</span>`
            : `<button onclick="deleteVarEntry('${entry.key}')" style="background:transparent; border:none; color:var(--accent-red); cursor:pointer;">×</button>`;
        const safe = entry.value.replace(/"/g, '&quot;');
        const note = entry.aliasOf
            ? `alias of ${entry.aliasOf}`
            : (VAR_NOTES[String(entry.value).trim()] || '');
        const noteHtml = note
            ? `<span style="font-family: var(--font-mono); font-size: 0.75rem; color:#9ca3af; white-space:nowrap;">${note}</span>`
            : '';
        return `<div style="${VAR_ROW_STYLE}${indent ? ' margin-left: 22px;' : ''}">
            <span style="${VAR_KEY_STYLE}">${indent ? '↳ ' : ''}${entry.key}</span>
            <input type="text" value="${safe}" onchange="updateVarEntry('${entry.key}', this.value)" style="${VAR_INPUT_STYLE}">
            ${noteHtml}
            <span style="${VAR_PREVIEW_STYLE}">${preview('${' + entry.key + '}')}</span>
            ${control}
        </div>`;
    };

    let html = '';
    BUILTIN_VARS.forEach(b => {
        const note = b.also ? `${b.note} · also \${${b.also}}` : b.note;
        html += `<div style="${VAR_ROW_STYLE}">
            <span style="${VAR_KEY_STYLE}">${b.key}</span>
            <span style="flex:1; font-family: var(--font-mono); font-size: 0.8125rem; color:#9ca3af;">${note}</span>
            <span style="${VAR_PREVIEW_STYLE}">${preview('${' + b.key + '}')}</span>
            <span title="Built into the engine — always available, can't be changed here" style="opacity:0.5; cursor:default; padding: 0 4px;">🔒</span>
        </div>`;
        editable.filter(e => e.aliasOf === b.key).forEach(e => { html += editableRow(e, true); });
    });

    const builtinKeys = new Set(BUILTIN_VARS.map(b => b.key));
    editable
        .filter(e => !e.aliasOf || !builtinKeys.has(e.aliasOf))
        .forEach(e => { html += editableRow(e, false); });

    document.getElementById('names-container').innerHTML = DOMPurify.sanitize(html);
}

function writeMergedVar(key, val, lockedKeys) {
    const {exprs, ranges} = varStores();
    const range = parseVarRange(val);
    if (lockedKeys && lockedKeys.has(key)) {
        if (key in ranges) {
            if (range) ranges[key] = range;
            return;
        }
        exprs[key] = val;
        return;
    }
    if (range) {
        delete exprs[key];
        ranges[key] = range;
    } else {
        delete ranges[key];
        exprs[key] = val;
    }
}

        async function renderVarsList() {
            if (isMergedVarScreen()) return renderMergedVarsList();
            const obj = getTargetObj() || {};
            const isLockThreads = selectedFile === 'puzzles.json';
            const lockedSet = await getLockedVarKeysSet();
            let html = '';
            Object.keys(obj).forEach(key => {
                const locked = lockedSet.has(key);
                const deleteControl = locked
                    ? `<span title="Factory default — can't be deleted" style="opacity:0.5; cursor:default; padding: 0 4px;">🔒</span>`
                    : `<button onclick="deleteVarEntry('${key}')" style="background:transparent; border:none; color:var(--accent-red); cursor:pointer;">×</button>`;
                html += `<div style="align-self: flex-start; min-width: 400px; flex-shrink: 0; display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; gap: 16px;">
                    <span style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--accent-amber); min-width: 120px;">${key}</span>
                    <input type="text" value="${String(obj[key]).replace(/"/g, '&quot;')}" onchange="updateVarEntry('${key}', this.value)" style="flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">
                    ${isLockThreads ? `<span id="lockthread-badge-${key}" class="badge">checking…</span>` : ''}
                    ${deleteControl}
                </div>`;
            });
            document.getElementById('names-container').innerHTML = DOMPurify.sanitize(html);

            if (isLockThreads) {
                const currentPuzzleId = fileData && fileData[selectedIndex] ? fileData[selectedIndex].id : null;
                Object.keys(obj).forEach(async (key) => {
                    const { count } = await computeThreadDelivery(key, currentPuzzleId);
                    const { cls, label } = badgeForDeliveryCount(count, 'reachable');
                    const el = document.getElementById(`lockthread-badge-${key}`);
                    if (el) { el.className = `badge ${cls}`; el.innerText = label; }
                });
            }
        }
        async function addNameEntry() {
            const keyInput = document.getElementById('names-input-key');
            const input = document.getElementById('names-input');
            const keyVal = keyInput.value.trim();
            const val = input.value.trim();
            if (!selectedCategory && selectedFile !== 'puzzles.json') return;

            if (isMergedVarScreen()) {
                if (!keyVal || !val) return;
                if (isBuiltinVar(keyVal)) {
                    alert(`"${keyVal}" is built into the engine and is already available in every template. Pick another name.`);
                    return;
                }
                writeMergedVar(keyVal, val, await getMergedLockedKeys());
                markDirty();
                keyInput.value = '';
                input.value = '';
                renderVarsList();
                return;
            }

            const targetObj = getTargetObj();
            const isVarsObj = targetObj && typeof targetObj === 'object' && !Array.isArray(targetObj);
            
            if (isVarsObj) {
                if (keyVal && val) {
                    targetObj[keyVal] = val;
                    markDirty();
                    keyInput.value = '';
                    input.value = '';
                    renderVarsList();
                }
            } else {
                if (val) {
                    if (targetObj) { targetObj.push(val); markDirty(); }
                    input.value = '';
                    renderNamesList();
                }
            }
        }
        async function updateVarEntry(key, val) {
            if (isMergedVarScreen()) {
                writeMergedVar(key, val, await getMergedLockedKeys());
                markDirty();
                renderVarsList();
                return;
            }
            if (selectedCategory || selectedFile === 'puzzles.json') {
                const targetObj = getTargetObj();
                if (targetObj) { targetObj[key] = val; markDirty(); }
            }
        }
        async function deleteNameEntry(i) {
            if (selectedCategory || selectedFile === 'puzzles.json') {
                const targetObj = getTargetObj();
                if (targetObj) {
                    const value = targetObj[i];
                    const lockedSet = await getLockedNamesSet();
                    if (lockedSet.has(value)) {
                        alert(`"${value}" is part of the factory-default ${selectedCategory} list and can't be deleted.`);
                        return;
                    }
                    targetObj.splice(i, 1);
                    markDirty();
                    renderNamesList();
                }
            }
        }
        async function deleteVarEntry(key) {
            if (isMergedVarScreen()) {
                if (isBuiltinVar(key)) {
                    alert(`"${key}" is built into the engine and can't be removed.`);
                    return;
                }
                const locked = await getMergedLockedKeys();
                if (locked.has(key)) {
                    alert(`"${key}" is a factory-default value and can't be deleted. You can still edit it.`);
                    return;
                }
                const {exprs, ranges} = varStores();
                delete exprs[key];
                delete ranges[key];
                markDirty();
                renderVarsList();
                return;
            }
            if (selectedCategory || selectedFile === 'puzzles.json') {
                const targetObj = getTargetObj();
                if (targetObj) {
                    const lockedSet = await getLockedVarKeysSet();
                    if (lockedSet.has(key)) {
                        alert(`"${key}" is a factory-default value and can't be deleted. You can still edit it.`);
                        return;
                    }
                    delete targetObj[key];
                    markDirty();
                    renderVarsList();
                }
            }
        }

async function updatePuzzleSuggestions() {
            try {
                const res = await fetch('/api/data?file=puzzles.json');
                const data = await res.json();
                const puzzles = data.content || [];
                const container = document.getElementById('puzzle-checkboxes');
                
                const valObj = getCurrentEditorData();
                const puzzleVal = valObj ? valObj.puzzle : null;
                const isArray = Array.isArray(puzzleVal);
                
                let html = '';
                puzzles.forEach(p => {
                    if (p && p.id) {
                        const checked = isArray ? puzzleVal.includes(p.id) : (puzzleVal === p.id);
                        html += `<label style="display:flex; align-items:center; gap:6px; font-size: 0.75rem; font-family: var(--font-mono); color: #d1d5db; cursor: pointer;">
                            <input type="checkbox" value="${p.id}" ${checked ? 'checked' : ''} onchange="handlePuzzleCheckboxChange()">
                            ${p.id}
                        </label>`;
                    }
                });
                if (puzzles.length === 0) {
                    html = '<div style="font-size:0.75rem; color:#6b7280;">No puzzles found</div>';
                }
                container.innerHTML = DOMPurify.sanitize(html);
            } catch (e) {
                console.error(e);
            }
        }

        function handlePuzzleCheckboxChange() {
            markDirty();
            const container = document.getElementById('puzzle-checkboxes');
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const selected = [];
            checkboxes.forEach(cb => {
                if (cb.checked) selected.push(cb.value);
            });
            
            const original = getCurrentEditorData();
            if (original && typeof original === 'object' && selectedFile === 'clues.json') {
                const valToSave = selected.length === 0 ? null : (selected.length === 1 ? selected[0] : selected);
                
                if (isArrayRoot()) {
                    if (selectedCategory) {
                        if (valToSave) fileData[selectedIndex][selectedCategory].puzzle = valToSave;
                        else delete fileData[selectedIndex][selectedCategory].puzzle;
                    } else {
                        if (valToSave) fileData[selectedIndex].puzzle = valToSave;
                        else delete fileData[selectedIndex].puzzle;
                    }
                } else if (isObjectRoot()) {
                    if (selectedIndex !== null) {
                        if (valToSave) fileData[selectedCategory][selectedIndex].puzzle = valToSave;
                        else delete fileData[selectedCategory][selectedIndex].puzzle;
                    } else {
                        if (valToSave) fileData[selectedCategory].puzzle = valToSave;
                        else delete fileData[selectedCategory].puzzle;
                    }
                }
                renderClueThreadSelect();
            }
        }

function computeAllowedClueThreads(puzzleValue) {
            const allPuzzles = puzzlesData || [];
            const requestedIds = puzzleValue == null ? null : (Array.isArray(puzzleValue) ? puzzleValue : [puzzleValue]);
            const relevant = requestedIds ? allPuzzles.filter(p => p && requestedIds.includes(p.id)) : [];

            if (relevant.length === 0) {
                const union = new Set();
                allPuzzles.forEach(p => { if (p && p.LOCK_THREADS) Object.keys(p.LOCK_THREADS).forEach(t => union.add(t)); });
                return Array.from(union).sort();
            }

            let intersection = null;
            relevant.forEach(p => {
                const keys = new Set(Object.keys(p.LOCK_THREADS || {}));
                intersection = intersection === null ? keys : new Set([...intersection].filter(t => keys.has(t)));
            });
            return Array.from(intersection || []).sort();
        }

function renderClueThreadSelect() {
            const select = document.getElementById('clue-thread-select');
            if (!select) return;
            const val = getCurrentEditorData();
            if (!val || typeof val !== 'object') return;

            const allowed = computeAllowedClueThreads(val.puzzle);
            const threadsData = crossFileCache['threads.json'] || {};
            const hintEl = document.getElementById('thread-constraint-hint');

            if (allowed.length === 0) {
                select.innerHTML = DOMPurify.sanitize('<option value="">— No shared thread —</option>');
                select.value = '';
                if (hintEl) { hintEl.style.display = 'inline'; hintEl.innerText = 'The checked puzzles share no LOCK_THREADS in common — this clue can never be valid for all of them at once.'; }
                return;
            }

            let current = val.thread;
            let corrected = false;
            if (!allowed.includes(current)) {
                current = allowed.includes('CIPHER') ? 'CIPHER' : allowed[0];
                corrected = true;
            }

            select.innerHTML = DOMPurify.sanitize(allowed.map(t => {)
                const label = (threadsData[t] && threadsData[t].title) ? `${t} — ${threadsData[t].title}` : t;
                return `<option value="${t}" ${t === current ? 'selected' : ''}>${label}</option>`;
            }).join('');
            select.value = current;

            if (corrected) {
                val.thread = current;
                markDirty();
                if (hintEl) { hintEl.style.display = 'inline'; hintEl.innerText = `Thread reset to ${current} — the previous value isn't required by the currently-checked puzzle(s).`; }
            } else if (hintEl) {
                hintEl.style.display = 'none';
                hintEl.innerText = '';
            }
        }

function updateTagSuggestions() {
            const tagSet = new Set();
            if (isObjectRoot()) {
                Object.values(fileData).forEach(arr => {
                    if (Array.isArray(arr)) arr.forEach(t => { if(t && t.thread) tagSet.add(t.thread); });
                });
            } else if (isArrayRoot()) {
                fileData.forEach(item => {
                    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
                        Object.values(item).forEach(arr => {
                            if (Array.isArray(arr)) arr.forEach(t => { if(t && t.thread) tagSet.add(t.thread); });
                        });
                    }
                });
            }
            const defaults = ['GEOMETRY', 'HUM', 'LOST', 'CIPHER', 'PEN', 'EPOCH', 'HOUR', 'UNCLASSIFIED'];
            defaults.forEach(t => tagSet.add(t));
            
            const dl = document.getElementById('tag-suggestions');
            dl.innerHTML = DOMPurify.sanitize('');
            tagSet.forEach(t => {
                if (!t) return;
                if (selectedFile === 'lore.json' && (t === 'CIPHER' || t === 'TELL')) return;
                if (selectedFile === 'clues.json' && t !== 'CIPHER') return;
                
                const opt = document.createElement('option');
                opt.value = t;
                dl.appendChild(opt);
            });
        }

function renderVariableToolbar() {
            const tb = document.getElementById('variable-toolbar');
            if (!tb || !paramsData) return;
            let html = '';

    const mockCtx = buildMockCtx(paramsData, puzzlesData || []);
            const preview = (token) => {
                const { result } = resolveTemplateForValidation(token, mockCtx);
                return String(result);
            };

    const roles = paramsData.ROLES || ["lead", "custodian", "archivist", "lost"];
            html += `<select class="var-select" onchange="if(this.value) { insertVar(this.value); this.selectedIndex = 0; }">`;
            html += `<option value="">Insert Role...</option>`;
            roles.forEach(r => {
                const token = `\${c.${r}}`;
                html += `<option value="${token}">${r} → ${preview(token)}</option>`;
            });
            html += `</select>`;

    const asObject = (v) => {
        if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch (e) { return {}; }
        }
        return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    };
    const varNames = []
        .concat(['P', 'hours', 'pen', 'year', 'seed'])
        .concat(Object.keys(asObject(paramsData.CORE_VARS)))
        .concat(Object.keys(asObject(paramsData.VARS)));
    const seen = new Set();
            html += `<select class="var-select" onchange="if(this.value) { insertVar(this.value); this.selectedIndex = 0; }">`;
            html += `<option value="">Insert Var...</option>`;
            varNames.forEach(v => {
                if (seen.has(v)) return;
                seen.add(v);
                const token = `\${${v}}`;
                html += `<option value="${token}">${v} → ${preview(token)}</option>`;
            });
            html += `</select>`;

            tb.innerHTML = DOMPurify.sanitize(html);
        }

        function insertVar(v) {
            const ta = document.getElementById('main-textarea');
            if(!ta || ta.style.display === 'none') return;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + v + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + v.length;
            ta.focus();
            ta.dispatchEvent(new Event('input'));
        }

