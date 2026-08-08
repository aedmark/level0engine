        // New Puzzle Wizard: walks through ID -> Access Code -> Lock Threads -> Review,
        // so a puzzle can't be born with the exact defect the audit found in HOUR_PUZZLE
        // (a LOCK_THREADS requirement nothing in lore.json/clues.json ever delivers).
        // Everything is staged in wizardState and written out together on "Create Puzzle".
        const ACCESS_PATTERNS = {
            year_pen: { label: 'Year + Pen (classic)', expr: "String(ctx.year).slice(2) + String(ctx.pen).padStart(2, '0')" },
            hours_pen: { label: 'Hours + Pen', expr: "String(ctx.hours).slice(0, 2) + String(ctx.pen).padStart(2, '0')" },
            custom: { label: 'Custom expression...', expr: '' }
        };

        function newWizardState() {
            return {
                step: 1,
                id: '',
                accessPattern: 'year_pen',
                accessCode: ACCESS_PATTERNS.year_pen.expr,
                lockThreads: {},
                newThreads: {},
                scaffoldClues: [],
                openScaffoldFor: null,
                scaffoldDraft: null,
                // Custom per-playthrough variables (e.g. SERIAL, BIRTH_MONTH) staged during
                // this wizard session but not yet written to parameters.json's CORE_VARS —
                // written together with the puzzle on "Create Puzzle", same pattern as
                // newThreads/scaffoldClues.
                newCoreVars: {},
                showNewVarForm: false,
                newVarDraft: null
            };
        }

        // Names+ranges of every core variable available for use in this wizard session:
        // the four engine built-ins, whatever's already saved in parameters.json's
        // CORE_VARS, and anything staged-but-unsaved in this session. Built-in ranges here
        // are documentation only (they mirror StoryEngine.js) — used for the padded-insert
        // hint, not for generation.
        function wizardKnownCoreVars() {
            const builtins = {
                seed: null,
                pen: { min: 3, max: 21 },
                year: { min: 1971, max: 1998 },
                hours: { min: 300, max: 1199 }
            };
            const saved = (paramsData && paramsData.CORE_VARS) || {};
            return { ...builtins, ...saved, ...(wizardState.newCoreVars || {}) };
        }

        // Merges any staged-but-unsaved custom variables into a copy of the live params,
        // so the access-code preview/validation reflects vars the wizard hasn't saved yet.
        function wizardParamsWithStaged() {
            return { ...(paramsData || {}), CORE_VARS: { ...((paramsData && paramsData.CORE_VARS) || {}), ...(wizardState.newCoreVars || {}) } };
        }

        async function openPuzzleWizard() {
            if (!confirmDiscardIfDirty()) return;
            wizardState = newWizardState();
            finaleWizardState = null;
            activeWizard = 'puzzle';
            selectedFile = 'WIZARD';
            renderFileList();

            document.getElementById('welcome-msg').style.display = 'none';
            document.getElementById('editor-container').style.display = 'none';
            document.getElementById('validation-container').style.display = 'none';
            document.getElementById('inspector-container').style.display = 'none';
            document.getElementById('wizard-container').style.display = 'flex';
            document.getElementById('wizard-header-title').innerText = 'New Puzzle';

            const [, , , , freshParams] = await Promise.all([
                getCrossFileData('lore.json'),
                getCrossFileData('clues.json'),
                getCrossFileData('threads.json', true),
                getCrossFileData('puzzles.json', true),
                getCrossFileData('parameters.json', true)
            ]);
            puzzlesData = crossFileCache['puzzles.json'] || puzzlesData;
            paramsData = freshParams || paramsData;

            await renderWizard();
        }

        function cancelPuzzleWizard() {
            wizardState = null;
            activeWizard = null;
            selectFile('puzzles.json');
        }

        // Shared Back/Cancel buttons on the wizard shell dispatch to whichever wizard
        // is actually open, so both wizards can reuse the same DOM without either one
        // needing to know the other exists.
        function wizardBackDispatch() {
            if (activeWizard === 'finale') finaleWizardBack();
            else wizardBack();
        }
        function wizardCancelDispatch() {
            if (activeWizard === 'finale') cancelFinaleWizard();
            else cancelPuzzleWizard();
        }

        async function wizardNext() {
            if (!(await wizardValidateStep(wizardState.step))) return;
            if (wizardState.step < 4) wizardState.step++;
            await renderWizard();
        }

        function wizardBack() {
            if (wizardState.step > 1) wizardState.step--;
            renderWizard();
        }

        async function wizardValidateStep(step) {
            if (step === 1) {
                const id = (wizardState.id || '').trim().toUpperCase();
                if (!id) { alert('Give the puzzle an ID first.'); return false; }
                const puzzles = (await getCrossFileData('puzzles.json')) || [];
                if (puzzles.some(p => p.id === id)) { alert(`A puzzle with ID "${id}" already exists.`); return false; }
                wizardState.id = id;
                return true;
            }
            if (step === 2) {
                if (!wizardState.accessCode.trim()) { alert('Enter an access code expression.'); return false; }
                try {
                    const mockCtx = buildMockCtx(wizardParamsWithStaged(), puzzlesData || []);
                    new Function('ctx', `return ${wizardState.accessCode};`)(mockCtx.coreVars);
                } catch (e) {
                    alert('That access code expression does not evaluate: ' + e.message);
                    return false;
                }
                return true;
            }
            if (step === 3) {
                if (Object.keys(wizardState.lockThreads).length === 0) {
                    return confirm('This puzzle has no Lock Threads, meaning it needs no in-world evidence to solve. Continue anyway?');
                }
                return true;
            }
            return true;
        }

        async function renderWizard() {
            document.getElementById('wizard-step-label').innerText = `Step ${wizardState.step} of 4`;
            const titles = { 1: 'Identify the Puzzle', 2: 'Compute the Access Code', 3: 'Lock Threads', 4: 'Review & Create' };
            document.getElementById('wizard-title').innerText = titles[wizardState.step];

            const backBtn = document.getElementById('wizard-back-btn');
            const nextBtn = document.getElementById('wizard-next-btn');
            backBtn.style.visibility = wizardState.step === 1 ? 'hidden' : 'visible';
            nextBtn.innerText = wizardState.step === 4 ? 'Create Puzzle' : (wizardState.step === 3 ? 'Review →' : 'Next →');
            nextBtn.onclick = wizardState.step === 4 ? finishWizard : wizardNext;

            if (wizardState.step === 1) {
                document.getElementById('wizard-body').innerHTML = renderWizardStep1();
            } else if (wizardState.step === 2) {
                document.getElementById('wizard-body').innerHTML = renderWizardStep2();
                wizardUpdateCodePreview();
            } else if (wizardState.step === 3) {
                await renderWizardStep3();
            } else if (wizardState.step === 4) {
                await renderWizardStep4();
            }
        }

        function renderWizardStep1() {
            return `
                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">Puzzle ID</label>
                <input type="text" id="wizard-id-input" value="${wizardState.id}" placeholder="e.g. FLOOD_PUZZLE" oninput="wizardState.id = this.value" style="width:100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 10px 14px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.95rem;">
                <span class="help-text">Internal identifier, not shown to players. Must be unique — gets uppercased automatically.</span>
            `;
        }

        function renderWizardStep2() {
            let options = '';
            Object.entries(ACCESS_PATTERNS).forEach(([key, p]) => {
                options += `<option value="${key}" ${wizardState.accessPattern === key ? 'selected' : ''}>${p.label}</option>`;
            });
            return `
                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">Pattern</label>
                <select id="wizard-pattern-select" class="var-select" style="width:100%; margin-bottom:16px;" onchange="wizardSetPattern(this.value)">${options}</select>
                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">Expression <span class="help-icon" title="A JavaScript expression evaluated against ctx.pen, ctx.year, ctx.hours, ctx.seed, and any custom variables below.">?</span></label>
                <textarea id="wizard-code-input" oninput="wizardOnCodeInput(this.value)" style="width:100%; height:80px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">${wizardState.accessCode}</textarea>
                <div id="wizard-code-preview" style="margin-top:12px;"></div>
                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-top:20px; margin-bottom:8px;">Variables <span class="help-icon" title="Click one to insert it into the expression above. Not limited to pen/year/hours — define a new one below (e.g. a serial number, a birthday) and it becomes usable here and as \${NAME} in lore text.">?</span></label>
                ${renderWizardVarChips()}
            `;
        }

        function renderWizardVarChips() {
            const known = wizardKnownCoreVars();
            let html = `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">`;
            Object.entries(known).forEach(([name, range]) => {
                const isNew = wizardState.newCoreVars && (name in wizardState.newCoreVars);
                const digits = range && Number.isFinite(range.max) ? String(range.max).length : null;
                const title = range ? `Range ${range.min}–${range.max}` : 'This playthrough\'s random seed';
                html += `<button type="button" class="var-btn" style="font-size:11px; padding:4px 8px;" title="${title}" onclick="wizardInsertVarToken('ctx.${name}')">${name}${isNew ? ' <span class="badge badge-warn" style="margin-left:4px; font-size:9px;">new</span>' : ''}</button>`;
                if (digits) {
                    html += `<button type="button" class="var-btn" style="font-size:11px; padding:4px 8px;" title="Zero-padded to ${digits} digits" onclick="wizardInsertVarToken(&quot;String(ctx.${name}).padStart(${digits}, '0')&quot;)">${name} (padded)</button>`;
                }
            });
            html += `</div><button type="button" class="var-btn" onclick="wizardOpenNewVarForm()">+ New Variable</button>`;
            if (wizardState.showNewVarForm) html += renderWizardNewVarForm();
            return html;
        }

        function renderWizardNewVarForm() {
            const d = wizardState.newVarDraft || { name: '', min: 0, max: 99 };
            return `<div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 6px; padding: 12px; margin-top:8px;">
                <div class="help-text" style="margin-top:0;">Defines a new number generated once per playthrough. Usable here as <code>ctx.NAME</code>, and automatically usable in lore/clue text as <code>\${NAME}</code>.</div>
                <input type="text" id="wizard-newvar-name" placeholder="Name, e.g. SERIAL" value="${d.name}" oninput="wizardState.newVarDraft.name = this.value.toUpperCase()" style="width:100%; margin-bottom:8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem; text-transform:uppercase;">
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                    <input type="number" placeholder="Min" value="${d.min}" oninput="wizardState.newVarDraft.min = Number(this.value)" style="flex:1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">
                    <input type="number" placeholder="Max" value="${d.max}" oninput="wizardState.newVarDraft.max = Number(this.value)" style="flex:1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="var-btn" onclick="wizardSubmitNewVar()">Add</button>
                    <button class="var-btn" onclick="wizardCancelNewVar()">Cancel</button>
                </div>
            </div>`;
        }

        function wizardOpenNewVarForm() {
            wizardState.showNewVarForm = true;
            wizardState.newVarDraft = { name: '', min: 0, max: 99 };
            renderWizard();
        }

        function wizardCancelNewVar() {
            wizardState.showNewVarForm = false;
            wizardState.newVarDraft = null;
            renderWizard();
        }

        function wizardSubmitNewVar() {
            const d = wizardState.newVarDraft || {};
            const name = (d.name || '').trim().toUpperCase();
            if (!name) { alert('Give the variable a name.'); return; }
            if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) { alert('Names must start with a letter or underscore, and contain only letters, numbers, and underscores.'); return; }
            const reserved = new Set(['SEED', 'PEN', 'YEAR', 'HOURS']);
            if (reserved.has(name)) { alert(`"${name}" is a built-in variable and can't be redefined.`); return; }
            const alreadySaved = (paramsData && paramsData.CORE_VARS && paramsData.CORE_VARS[name]);
            const alreadyStaged = wizardState.newCoreVars && wizardState.newCoreVars[name];
            if (alreadySaved || alreadyStaged) { alert(`"${name}" already exists.`); return; }
            const min = Number(d.min), max = Number(d.max);
            if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) { alert('Enter a valid min and max (max must be ≥ min).'); return; }
            wizardState.newCoreVars = wizardState.newCoreVars || {};
            wizardState.newCoreVars[name] = { min, max };
            wizardState.showNewVarForm = false;
            wizardState.newVarDraft = null;
            renderWizard();
        }

        // Inserts a token at the current cursor position in the access-code textarea
        // (falls back to appending if the element isn't focused/available), then
        // switches the pattern dropdown to "custom" since we've deviated from a preset.
        function wizardInsertVarToken(token) {
            const ta = document.getElementById('wizard-code-input');
            if (!ta) {
                wizardState.accessCode += token;
                wizardUpdateCodePreview();
                return;
            }
            const start = typeof ta.selectionStart === 'number' ? ta.selectionStart : ta.value.length;
            const end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : ta.value.length;
            const newVal = ta.value.slice(0, start) + token + ta.value.slice(end);
            ta.value = newVal;
            wizardState.accessCode = newVal;
            wizardState.accessPattern = 'custom';
            const patternSelect = document.getElementById('wizard-pattern-select');
            if (patternSelect) patternSelect.value = 'custom';
            const cursorPos = start + token.length;
            ta.focus();
            if (ta.setSelectionRange) ta.setSelectionRange(cursorPos, cursorPos);
            wizardUpdateCodePreview();
        }

        function wizardSetPattern(key) {
            wizardState.accessPattern = key;
            if (key !== 'custom') wizardState.accessCode = ACCESS_PATTERNS[key].expr;
            renderWizard();
        }

        function wizardOnCodeInput(val) {
            wizardState.accessCode = val;
            wizardUpdateCodePreview();
        }

        function wizardUpdateCodePreview() {
            const el = document.getElementById('wizard-code-preview');
            if (!el) return;
            try {
                const mockCtx = buildMockCtx(wizardParamsWithStaged(), puzzlesData || []);
                const result = new Function('ctx', `return ${wizardState.accessCode};`)(mockCtx.coreVars);
                el.innerHTML = `<span class="badge badge-ok">Example result: ${result}</span>`;
            } catch (e) {
                el.innerHTML = `<span class="badge badge-danger">Does not evaluate: ${e.message}</span>`;
            }
        }

        async function wizardGetAllThreadKeys() {
            const threads = (await getCrossFileData('threads.json')) || {};
            return Object.keys(threads);
        }

        async function wizardThreadDelivery(threadKey) {
            const { count, sectors } = await computeThreadDelivery(threadKey, wizardState.id);
            const staged = new Set(sectors);
            wizardState.scaffoldClues.forEach(c => { if (c.thread === threadKey) staged.add(c.sector); });
            return { count: staged.size };
        }

        async function renderWizardStep3() {
            const body = document.getElementById('wizard-body');
            const threadKeys = Object.keys(wizardState.lockThreads);
            const allThreads = await wizardGetAllThreadKeys();
            const available = allThreads.filter(t => !threadKeys.includes(t));

            let rowsHtml = '';
            if (threadKeys.length === 0) {
                rowsHtml = `<div class="inspector-sector-list" style="margin-bottom:16px;">No Lock Threads yet — as it stands this puzzle needs no in-world evidence to solve.</div>`;
            }
            threadKeys.forEach(t => {
                const isNew = !!wizardState.newThreads[t];
                rowsHtml += `<div class="inspector-puzzle-card" style="margin-bottom:12px; padding:12px 16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${t}</b>${isNew ? ' <span class="badge badge-warn">new thread</span>' : ''}</div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span id="wizard-badge-${t}" class="badge">checking…</span>
                            <button class="delete-btn" onclick="wizardRemoveThread('${t}')">×</button>
                        </div>
                    </div>
                    <div id="wizard-scaffold-slot-${t}" style="margin-top:8px;">${wizardState.openScaffoldFor === t ? renderScaffoldForm(t) : ''}</div>
                </div>`;
            });

            let addRow = `<div style="display:flex; gap:8px; margin-top:8px;">`;
            if (available.length) {
                addRow += `<select id="wizard-add-select" class="var-select" style="flex:1;">
                    <option value="">Add existing thread...</option>
                    ${available.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <button class="var-btn" onclick="wizardAddExistingThread()">Add</button>`;
            }
            addRow += `<button class="var-btn" onclick="wizardPromptNewThread()">+ New Thread</button></div>`;

            body.innerHTML = `
                <p class="help-text" style="margin-top:0; margin-bottom:16px;">Every thread here is a piece of evidence the player must find before this puzzle counts as solved. The badge shows whether anything currently delivers that evidence.</p>
                ${rowsHtml}
                ${addRow}
            `;

            threadKeys.forEach(async (t) => {
                if (wizardState.openScaffoldFor === t) return; // form already rendered inline above
                const { count } = await wizardThreadDelivery(t);
                const { cls, label } = badgeForDeliveryCount(count, 'reachable');
                const badgeEl = document.getElementById(`wizard-badge-${t}`);
                if (badgeEl) { badgeEl.className = `badge ${cls}`; badgeEl.innerText = label; }
                const slot = document.getElementById(`wizard-scaffold-slot-${t}`);
                if (slot && count === 0) {
                    slot.innerHTML = `<button class="var-btn" onclick="wizardOpenScaffoldForm('${t}')">+ Add a starter clue for ${t}</button>`;
                }
            });
        }

        function renderScaffoldForm(threadKey) {
            if (!wizardState.scaffoldDraft) wizardState.scaffoldDraft = { sector: '', text: '', title: '' };
            // Every thread offered in this step is a Lock Thread on the puzzle being
            // built right now, i.e. by definition a puzzle-mechanic thread — so a starter
            // clue for it always belongs in clues.json, gated to this puzzle. (lore.json
            // is reserved for threads that aren't tied to solving anything.)
            const sectors = getKnownSectors();
            return `<div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 6px; padding: 12px;">
                <div class="help-text" style="margin-top:0;">This will be added to <b>clues.json</b>, gated to this puzzle.</div>
                <select class="var-select" style="width:100%; margin-bottom:8px;" onchange="wizardState.scaffoldDraft.sector = this.value">
                    <option value="">Select sector...</option>
                    ${sectors.map(s => `<option value="${s}" ${wizardState.scaffoldDraft.sector === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                <input type="text" placeholder="Title (optional)" value="${wizardState.scaffoldDraft.title}" oninput="wizardState.scaffoldDraft.title = this.value" style="width:100%; margin-bottom:8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">
                <textarea placeholder="Document text..." oninput="wizardState.scaffoldDraft.text = this.value" style="width:100%; height:70px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">${wizardState.scaffoldDraft.text}</textarea>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="var-btn" onclick="wizardSubmitScaffold('${threadKey}')">Add</button>
                    <button class="var-btn" onclick="wizardCancelScaffold()">Cancel</button>
                </div>
            </div>`;
        }

        function wizardOpenScaffoldForm(threadKey) {
            wizardState.openScaffoldFor = threadKey;
            wizardState.scaffoldDraft = { sector: '', text: '', title: '' };
            renderWizardStep3();
        }

        function wizardCancelScaffold() {
            wizardState.openScaffoldFor = null;
            wizardState.scaffoldDraft = null;
            renderWizardStep3();
        }

        function wizardSubmitScaffold(threadKey) {
            const draft = wizardState.scaffoldDraft;
            if (!draft.sector || !draft.text.trim()) { alert('Pick a sector and write some text first.'); return; }
            wizardState.scaffoldClues.push({
                file: 'clues.json',
                sector: draft.sector,
                thread: threadKey,
                type: 'document',
                title: draft.title || 'Starter clue',
                text: draft.text,
                puzzle: wizardState.id
            });
            wizardState.openScaffoldFor = null;
            wizardState.scaffoldDraft = null;
            renderWizardStep3();
        }

        function wizardRemoveThread(key) {
            delete wizardState.lockThreads[key];
            delete wizardState.newThreads[key];
            wizardState.scaffoldClues = wizardState.scaffoldClues.filter(c => c.thread !== key);
            if (wizardState.openScaffoldFor === key) { wizardState.openScaffoldFor = null; wizardState.scaffoldDraft = null; }
            renderWizardStep3();
        }

        function wizardAddExistingThread() {
            const sel = document.getElementById('wizard-add-select');
            const key = sel ? sel.value : '';
            if (!key) return;
            wizardState.lockThreads[key] = key;
            renderWizardStep3();
        }

        function wizardPromptNewThread() {
            const name = prompt('New thread name (e.g. FLOOD):');
            if (!name) return;
            const key = name.toUpperCase().trim();
            if (!key) return;
            if (wizardState.lockThreads[key]) { alert(`"${key}" is already on this puzzle.`); return; }
            const title = prompt(`Title for "${key}" (shown in the player's journal):`, '') || '';
            wizardState.newThreads[key] = { title, description: '' };
            wizardState.lockThreads[key] = key;
            renderWizardStep3();
        }

        async function renderWizardStep4() {
            const body = document.getElementById('wizard-body');
            const mockCtx = buildMockCtx(wizardParamsWithStaged(), puzzlesData || []);
            let codeResult = null, codeError = null;
            try { codeResult = new Function('ctx', `return ${wizardState.accessCode};`)(mockCtx.coreVars); } catch (e) { codeError = e.message; }

            const threadKeys = Object.keys(wizardState.lockThreads);
            let threadRows = '';
            for (const t of threadKeys) {
                const { count } = await wizardThreadDelivery(t);
                const { cls, label } = badgeForDeliveryCount(count, 'reachable');
                threadRows += `<div class="inspector-thread-row"><div><b>${t}</b>${wizardState.newThreads[t] ? ' <span class="badge badge-warn">new</span>' : ''}</div><span class="badge ${cls}">${label}</span></div>`;
            }

            const scaffoldSummary = wizardState.scaffoldClues.length
                ? `<p class="help-text">Also adding ${wizardState.scaffoldClues.length} starter document(s): ${wizardState.scaffoldClues.map(c => `"${c.title}" (${c.file}, ${c.sector})`).join(', ')}</p>`
                : '';

            const newVarNames = Object.keys(wizardState.newCoreVars || {});
            const newVarSummary = newVarNames.length
                ? `<p class="help-text">Also adding ${newVarNames.length} new variable(s) to parameters.json: ${newVarNames.map(n => `${n} (${wizardState.newCoreVars[n].min}–${wizardState.newCoreVars[n].max})`).join(', ')}</p>`
                : '';

            body.innerHTML = `
                <div style="margin-bottom:16px;"><b>ID:</b> ${wizardState.id}</div>
                <div style="margin-bottom:16px;"><b>Access Code:</b> <code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${wizardState.accessCode}</code><br>
                    <span class="badge ${codeError ? 'badge-danger' : 'badge-ok'}" style="margin-top:6px; display:inline-flex;">${codeError ? 'ERROR: ' + codeError : 'Example result: ' + codeResult}</span>
                </div>
                <div style="margin-bottom:8px;"><b>Lock Threads:</b></div>
                ${threadRows || '<div class="inspector-sector-list">None — no in-world evidence required.</div>'}
                ${scaffoldSummary}
                ${newVarSummary}
            `;
        }

        async function finishWizard() {
            const btn = document.getElementById('wizard-next-btn');
            btn.disabled = true;
            btn.innerText = 'Creating...';

            try {
                const newPuzzle = { id: wizardState.id, ACCESS_CODE: wizardState.accessCode, LOCK_THREADS: { ...wizardState.lockThreads } };

                const puzzles = (await getCrossFileData('puzzles.json', true)) || [];
                puzzles.push(newPuzzle);
                await postFile('puzzles.json', puzzles);
                puzzlesData = puzzles;
                crossFileCache['puzzles.json'] = puzzles;

                if (Object.keys(wizardState.newThreads).length) {
                    const threads = (await getCrossFileData('threads.json', true)) || {};
                    Object.entries(wizardState.newThreads).forEach(([key, def]) => { threads[key] = def; });
                    await postFile('threads.json', threads);
                    crossFileCache['threads.json'] = threads;
                }

                if (Object.keys(wizardState.newCoreVars || {}).length) {
                    const params = (await getCrossFileData('parameters.json', true)) || {};
                    params.CORE_VARS = { ...(params.CORE_VARS || {}), ...wizardState.newCoreVars };
                    await postFile('parameters.json', params);
                    crossFileCache['parameters.json'] = params;
                    paramsData = params;
                }

                const loreAdds = wizardState.scaffoldClues.filter(c => c.file === 'lore.json');
                const clueAdds = wizardState.scaffoldClues.filter(c => c.file === 'clues.json');
                if (loreAdds.length) {
                    const lore = (await getCrossFileData('lore.json', true)) || {};
                    loreAdds.forEach(c => {
                        (lore[c.sector] = lore[c.sector] || []).push({ text: c.text, type: c.type, thread: c.thread, title: c.title });
                    });
                    await postFile('lore.json', lore);
                    crossFileCache['lore.json'] = lore;
                }
                if (clueAdds.length) {
                    const clues = (await getCrossFileData('clues.json', true)) || {};
                    clueAdds.forEach(c => {
                        (clues[c.sector] = clues[c.sector] || []).push({ text: c.text, type: c.type, thread: c.thread, title: c.title, puzzle: c.puzzle });
                    });
                    await postFile('clues.json', clues);
                    crossFileCache['clues.json'] = clues;
                }

                const createdId = wizardState.id;
                wizardState = null;
                activeWizard = null;
                await selectFile('puzzles.json');
                const idx = (fileData || []).findIndex(p => p.id === createdId);
                if (idx >= 0) clickArrayRow(idx, true);
                alert(`Puzzle "${createdId}" created.`);
            } catch (err) {
                alert('Failed to create puzzle: ' + err.message);
                btn.disabled = false;
                btn.innerText = 'Create Puzzle';
            }
        }

