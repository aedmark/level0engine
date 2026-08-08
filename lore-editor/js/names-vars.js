        // Names Logic
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

        // Names/VARS/LOCK_THREADS entries are plain strings or dict keys, so they can't
        // carry an embedded "_locked" flag the way object entries do. Instead we compare
        // against the immutable factory-default snapshot (data/factory/*.json) fetched
        // via getFactoryData: anything present there was shipped, and can't be deleted.
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
            document.getElementById('names-container').innerHTML = html;
        }
        async function renderVarsList() {
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
            document.getElementById('names-container').innerHTML = html;

            // Reachability is a real check (needs lore.json/clues.json), so it's filled
            // in async right after the synchronous render above. Scoped to this specific
            // puzzle's id so a clue gated to a different puzzle variant can't count.
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
        function addNameEntry() {
            const keyInput = document.getElementById('names-input-key');
            const input = document.getElementById('names-input');
            const keyVal = keyInput.value.trim();
            const val = input.value.trim();
            if (!selectedCategory && selectedFile !== 'puzzles.json') return;
            
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
        function updateVarEntry(key, val) {
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

        // Puzzle Logic
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
                container.innerHTML = html;
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
            }
        }

        // Tags Logic
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
            dl.innerHTML = '';
            tagSet.forEach(t => {
                if (!t) return;
                if (selectedFile === 'lore.json' && (t === 'CIPHER' || t === 'TELL')) return;
                if (selectedFile === 'clues.json' && t !== 'CIPHER') return;
                
                const opt = document.createElement('option');
                opt.value = t;
                dl.appendChild(opt);
            });
        }

        // Variable Insertion
        function renderVariableToolbar() {
            const tb = document.getElementById('variable-toolbar');
            if (!tb || !paramsData) return;
            let html = '';

            // Resolves a token against a mock context so the dropdown can show what it
            // actually produces, not just its name (e.g. "hours → 512" instead of just "hours").
            const mockCtx = buildMockCtx(paramsData, puzzlesData || []);
            const preview = (token) => {
                const { result } = resolveTemplateForValidation(token, mockCtx);
                return String(result);
            };

            // Roles Dropdown
            const roles = paramsData.ROLES || ["lead", "custodian", "archivist", "lost"];
            html += `<select class="var-select" onchange="if(this.value) { insertVar(this.value); this.selectedIndex = 0; }">`;
            html += `<option value="">Insert Role...</option>`;
            roles.forEach(r => {
                const token = `\${c.${r}}`;
                html += `<option value="${token}">${r} → ${preview(token)}</option>`;
            });
            html += `</select>`;

            // Core Dropdown
            const core = ['P', 'hours', 'pen', 'year'];
            html += `<select class="var-select" onchange="if(this.value) { insertVar(this.value); this.selectedIndex = 0; }">`;
            html += `<option value="">Insert Core Var...</option>`;
            core.forEach(v => {
                const token = `\${${v}}`;
                html += `<option value="${token}">${v} → ${preview(token)}</option>`;
            });
            html += `</select>`;

            // Custom Vars Dropdown
            let custom = paramsData.VARS || {};
            if (typeof custom === 'string') {
                try { custom = JSON.parse(custom); } catch(e) { custom = {}; }
            }
            if (custom && typeof custom === 'object' && !Array.isArray(custom)) {
                const keys = Object.keys(custom);
                if (keys.length > 0) {
                    html += `<select class="var-select" onchange="if(this.value) { insertVar(this.value); this.selectedIndex = 0; }">`;
                    html += `<option value="">Insert Custom Var...</option>`;
                    keys.forEach(v => {
                        const token = `\${${v}}`;
                        html += `<option value="${token}">${v} → ${preview(token)}</option>`;
                    });
                    html += `</select>`;
                }
            }

            tb.innerHTML = html;
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

