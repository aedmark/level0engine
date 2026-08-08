        // Validation
        // Builds a representative context object shaped exactly like the one CaseFiles.js
        // hands to replaceTemplates() at runtime, so validation-time evaluation of ${...}
        // tokens and custom VARS matches production behavior instead of guessing at it.
        function buildMockCtx(params, puzzles, coreVarsOverride) {
            const roles = (params && params.ROLES) || ["lead", "custodian", "archivist", "lost"];
            const cast = {};
            roles.forEach((r, i) => {
                cast[r] = { first: `Testfirst${i + 1}`, last: `Testlast${i + 1}`, full: `Testfirst${i + 1} Testlast${i + 1}` };
            });
            const coreVars = coreVarsOverride || { seed: 424242, pen: 7, year: 1994, hours: 512 };
            // Custom per-playthrough variables (parameters.json's CORE_VARS — e.g. a serial
            // number or a birthday component) generate the same way pen/year/hours do at
            // runtime, so fold in a stable mock value for any that aren't already present
            // (either because coreVarsOverride didn't set them, or the default above predates
            // them). Picking the midpoint of min..max keeps previews reproducible.
            const customCoreVarDefs = (params && params.CORE_VARS) || {};
            Object.entries(customCoreVarDefs).forEach(([key, def]) => {
                if (key in coreVars) return;
                const min = Number.isFinite(def?.min) ? def.min : 0;
                const max = Number.isFinite(def?.max) ? def.max : min;
                coreVars[key] = min + Math.floor(0.42 * (max - min + 1));
            });
            let cipher = null;
            const puzzleWithCode = (puzzles || []).find(p => p && p.ACCESS_CODE);
            if (puzzleWithCode) {
                try { cipher = new Function('ctx', `return ${puzzleWithCode.ACCESS_CODE};`)(coreVars); } catch (e) { cipher = null; }
            }
            return {
                cast,
                project: 'TESTPROJECT',
                siteYear: coreVars.year,
                pen: coreVars.pen,
                hours: coreVars.hours,
                seed: coreVars.seed,
                truth: 0,
                coreVars,
                params,
                rand: () => 0.42,
                cipher
            };
        }

        // Mirrors CaseFiles.js's replaceTemplates() exactly, but instead of silently eating
        // failures, it collects every broken token so the validator can surface them.
        function resolveTemplateForValidation(str, ctx) {
            const issues = [];
            if (typeof str !== 'string') return { result: str, issues };
            const c = ctx.cast;
            const P = ctx.project;
            const pen = ctx.pen;
            const hrs = ctx.hours;
            const year = ctx.siteYear;
            let s = str;

            if (s.includes('${first_name}')) s = s.replace(/\$\{first_name}/g, 'Testfirst');
            if (s.includes('${last_name}')) s = s.replace(/\$\{last_name}/g, 'Testlast');

            for (const role in c) {
                const val = c[role];
                s = s.replace(new RegExp(`\\$\\{c\\.${role}\\}`, 'g'), val.full);
                s = s.replace(new RegExp(`\\$\\{${role.toUpperCase()}\\}`, 'g'), val.full.toUpperCase());
                s = s.replace(new RegExp(`\\$\\{c\\.${role}\\.first_name\\}`, 'g'), val.first);
                s = s.replace(new RegExp(`\\$\\{c\\.${role}\\.last_name\\}`, 'g'), val.last);
                s = s.replace(new RegExp(`\\$\\{${role}\\.first_name\\}`, 'g'), val.first);
                s = s.replace(new RegExp(`\\$\\{${role}\\.last_name\\}`, 'g'), val.last);
            }

            s = s.replace(/\$\{P}/g, P);
            if (ctx.coreVars) {
                for (const key in ctx.coreVars) {
                    s = s.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), ctx.coreVars[key]);
                }
            }
            s = s.replace(/\$\{pen}/g, pen);
            s = s.replace(/\$\{hrs}/g, hrs);
            s = s.replace(/\$\{year}/g, year);

            const customVars = (ctx.params && ctx.params.VARS) || {};
            for (const varName in customVars) {
                const expr = customVars[varName];
                try {
                    const val = new Function('ctx', `return ${expr};`)(ctx);
                    if (val === undefined) {
                        issues.push(`Custom VAR <b>${varName}</b> ("${expr}") evaluates to <b>undefined</b> — it will render as the literal word "undefined".`);
                    } else if (typeof val === 'number' && Number.isNaN(val)) {
                        issues.push(`Custom VAR <b>${varName}</b> ("${expr}") evaluates to <b>NaN</b>.`);
                    }
                    s = s.replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), val);
                } catch (e) {
                    issues.push(`Custom VAR <b>${varName}</b> ("${expr}") throws when evaluated: ${e.message}`);
                }
            }

            s = s.replace(/\$\{([^}]+)}/g, (match, expr) => {
                try {
                    const val = new Function('ctx', `return ${expr};`)(ctx);
                    if (val === undefined) {
                        issues.push(`Inline expression <b>${match}</b> evaluates to <b>undefined</b>.`);
                        return match;
                    }
                    return val;
                } catch (e) {
                    issues.push(`Malformed template <b>${match}</b> does not evaluate (${e.message}). This will render literally to the player.`);
                    return match;
                }
            });

            return { result: s, issues };
        }

        // Extra heuristic checks that catch the two typo classes that don't look like
        // "${...}" at all, so the resolution pass above can never see them: a "$(" where
        // "${" was meant, and a "{...}" missing its leading "$" entirely.
        function findTypoTokens(text) {
            const found = [];
            const wrongBracket = text.match(/\$\([a-zA-Z_][\w.]*}/g);
            if (wrongBracket) wrongBracket.forEach(m => found.push(`Malformed token <b>${m}</b> uses "$(" instead of "\${" — it will render literally to the player.`));
            const missingDollar = text.match(/[^$]\{[a-zA-Z_][\w.]*}/g);
            if (missingDollar) missingDollar.forEach(m => found.push(`Possible missing "$" before <b>${m.slice(1)}</b> — if this was meant to be a template token, it will currently render literally.`));
            return found;
        }

        // Recursively pulls every string value out of an arbitrarily-shaped JSON value
        // (or array of them), regardless of which key it lived under. Used to check
        // whether a ${varName} token appears ANYWHERE in the narrative data without
        // having to hard-code every field name (text, option, tell_title, description,
        // a foreshadow location's title, ...) that might legitimately carry template text.
        function collectAllStrings(value, out) {
            out = out || [];
            if (typeof value === 'string') {
                out.push(value);
            } else if (Array.isArray(value)) {
                value.forEach(v => collectAllStrings(v, out));
            } else if (value && typeof value === 'object') {
                Object.values(value).forEach(v => collectAllStrings(v, out));
            }
            return out;
        }

        async function computeThreadDelivery(threadVal, puzzleScope) {
            if (!threadVal) return { count: 0, sectors: [] };
            const lore = (await getCrossFileData('lore.json')) || {};
            const clues = (await getCrossFileData('clues.json')) || {};
            const sectors = new Set();
            const deliversUnderScope = (item) => {
                if (!puzzleScope) return true;
                const puz = item.puzzle;
                return !puz || puz === puzzleScope || (Array.isArray(puz) && puz.includes(puzzleScope));
            };
            for (const [sector, arr] of Object.entries(lore)) {
                if (Array.isArray(arr)) arr.forEach(i => { if (i && i.thread === threadVal) sectors.add(sector); });
            }
            for (const [sector, arr] of Object.entries(clues)) {
                if (Array.isArray(arr)) arr.forEach(i => { if (i && i.thread === threadVal && deliversUnderScope(i)) sectors.add(sector); });
            }
            return { count: sectors.size, sectors: Array.from(sectors) };
        }

        // Shared badge styling for a delivery count. `mode` picks the phrasing:
        // "corroborate" (thread field, 2+ needed for a corroboration event) vs
        // "reachable" (puzzle LOCK_THREADS, 1+ needed for the puzzle to be solvable at all).
        function badgeForDeliveryCount(count, mode) {
            if (mode === 'reachable') {
                if (count === 0) return { cls: 'badge-danger', label: '0 sectors — unreachable, puzzle can never be solved' };
                if (count === 1) return { cls: 'badge-warn', label: `${count} sector — reachable, not yet corroborated` };
                return { cls: 'badge-ok', label: `${count} sectors — reachable & corroborated` };
            }
            if (count === 0) return { cls: 'badge-danger', label: '0 sectors — never delivered to a player' };
            if (count === 1) return { cls: 'badge-warn', label: '1 sector — needs 2+ to corroborate' };
            return { cls: 'badge-ok', label: `${count} sectors — corroborates` };
        }

        // Live "does this text actually work" feedback: resolves every ${...} token in
        // the main textarea against a mock context (same logic the Validation tab uses)
        // and renders the result side-by-side, plus a plain-language issues list.
        function updateLivePreview() {
            const previewPane = document.getElementById('template-preview');
            const banner = document.getElementById('template-issues-banner');
            if (!previewPane || !banner) return;

            const isPuzzleAccessCode = selectedFile === 'puzzles.json' && selectedCategory === null;
            const containerVisible = document.getElementById('textarea-container').style.display !== 'none';
            const text = mainTextarea.value;

            if (isPuzzleAccessCode || !containerVisible || !text) {
                previewPane.style.display = 'none';
                banner.style.display = 'none';
                return;
            }

            const mockCtx = buildMockCtx(paramsData || {}, puzzlesData || []);
            const { result, issues } = resolveTemplateForValidation(text, mockCtx);
            const allIssues = [...findTypoTokens(text), ...issues];

            previewPane.style.display = 'block';
            document.getElementById('template-preview-content').innerText = result;

            if (allIssues.length) {
                banner.style.display = 'block';
                banner.innerHTML = allIssues.map(i => `⚠ ${i}`).join('<br>');
            } else {
                banner.style.display = 'none';
            }
        }

        // Live "will this thread ever get corroborated" feedback next to the Thread
        // field. Async because it may need to fetch lore.json/clues.json the first time;
        // subsequent calls are served from the cache warmed in init().
        async function refreshThreadBadge() {
            const badgeEl = document.getElementById('thread-corrob-badge');
            if (!badgeEl) return;
            const threadContainerVisible = document.getElementById('thread-container').style.display !== 'none';
            const threadVal = document.getElementById('tag-input').value;
            if (!threadContainerVisible || !threadVal) {
                badgeEl.innerHTML = '';
                return;
            }
            // If the entry being edited is itself puzzle-gated (clues.json's `puzzle`
            // field, single-id case), scope the corroboration count to that puzzle so it
            // doesn't get inflated by a same-named thread's clues gated to a *different*
            // puzzle. Entries with no puzzle field (lore) or a multi-puzzle array (shared
            // clues) fall back to the unscoped/pooled count, same as before.
            const currentItem = getCurrentEditorData();
            const puzzleScope = (currentItem && typeof currentItem.puzzle === 'string') ? currentItem.puzzle : undefined;
            const { count } = await computeThreadDelivery(threadVal, puzzleScope);
            const { cls, label } = badgeForDeliveryCount(count, 'corroborate');
            badgeEl.innerHTML = `<span class="badge ${cls}">${label}</span>`;
        }


        async function openValidation() {
            if (!confirmDiscardIfDirty()) return;
            wizardState = null;
            finaleWizardState = null;
            activeWizard = null;
            selectedFile = 'VALIDATION';
            renderFileList();

            document.getElementById('welcome-msg').style.display = 'none';
            document.getElementById('editor-container').style.display = 'none';
            document.getElementById('inspector-container').style.display = 'none';
            document.getElementById('wizard-container').style.display = 'none';
            document.getElementById('validation-container').style.display = 'flex';

            const resultsEl = document.getElementById('validation-results');
            resultsEl.innerHTML = '<div style="color:var(--text-muted); font-family:var(--font-mono);">Running validation checks...</div>';
            
            try {
                // Fetch all data
                const fetches = ['parameters.json', 'threads.json', 'puzzles.json', 'clues.json', 'lore.json', 'foreshadow.json', 'finales.json'].map(f => fetch('/api/data?file=' + f).then(r => r.json()));
                const [paramRes, threadRes, puzzleRes, clueRes, loreRes, foreRes, finRes] = await Promise.all(fetches);
                
                const params = paramRes.content || {};
                const threads = threadRes.content || {};
                const puzzles = puzzleRes.content || [];
                const clues = clueRes.content || {};
                const lore = loreRes.content || {};
                const foreshadow = foreRes.content || [];
                const finales = finRes.content || [];
                
                const varsMap = params.VARS || {};
                const threadKeys = new Set(Object.keys(threads));
                const puzzleIds = new Set(puzzles.map(p => p.id));
                const varKeys = new Set(Object.keys(varsMap));
                
                const usedThreads = new Set();
                const usedVars = new Set();
                const usedPuzzles = new Set();
                
                const warnings = [];
                const errors = [];
                
                // Check Clues
                for (const [sector, arr] of Object.entries(clues)) {
                    if (Array.isArray(arr)) {
                        arr.forEach((clue, idx) => {
                            const path = `clues.json -> ${sector}[${idx}]`;
                            if (clue.thread) {
                                usedThreads.add(clue.thread);
                                if (!threadKeys.has(clue.thread)) {
                                    errors.push(`[${path}] References unknown thread: <b>${clue.thread}</b>`);
                                }
                                // The editor locks clues.json's Thread field to CIPHER (it's
                                // implicit, like TELL is for finales.json) — anything else here
                                // can only have arrived via a raw JSON edit and is almost
                                // certainly a mistake (e.g. content that should live in
                                // lore.json/foreshadow.json instead).
                                if (clue.thread !== 'CIPHER') {
                                    errors.push(`[${path}] Clue is tagged thread <b>${clue.thread}</b>, but clues.json entries should always be <b>CIPHER</b> — the editor now sets this automatically. If this content isn't cipher-solving instructions, it likely belongs in lore.json or foreshadow.json instead.`);
                                }
                            }
                            if (clue.puzzle) {
                                const puzArr = Array.isArray(clue.puzzle) ? clue.puzzle : [clue.puzzle];
                                puzArr.forEach(p => {
                                    usedPuzzles.add(p);
                                    if (!puzzleIds.has(p)) {
                                        errors.push(`[${path}] References unknown puzzle ID: <b>${p}</b>`);
                                    } else {
                                        // Check logic mismatch
                                        const pObj = puzzles.find(x => x.id === p);
                                        if (pObj && pObj.LOCK_THREADS && clue.thread && !pObj.LOCK_THREADS[clue.thread]) {
                                            errors.push(`[${path}] Critical Logic Mismatch: Clue requires puzzle <b>${p}</b> and thread <b>${clue.thread}</b>, but puzzle <b>${p}</b> does not have <b>${clue.thread}</b> in its LOCK_THREADS! This clue will never appear.`);
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
                
                // Check Lore
                for (const [sector, arr] of Object.entries(lore)) {
                    if (Array.isArray(arr)) {
                        arr.forEach((l, idx) => {
                            if (l.thread) {
                                usedThreads.add(l.thread);
                                if (!threadKeys.has(l.thread)) {
                                    errors.push(`[lore.json -> ${sector}[${idx}]] References unknown thread: <b>${l.thread}</b>`);
                                }
                            }
                        });
                    }
                }
                
                // Check Foreshadow
                foreshadow.forEach((group, idx) => {
                    for (const [key, val] of Object.entries(group)) {
                        if (val && typeof val === 'object' && val.thread) {
                            usedThreads.add(val.thread);
                            if (!threadKeys.has(val.thread)) {
                                errors.push(`[foreshadow.json -> [${idx}].${key}] References unknown thread: <b>${val.thread}</b>`);
                            }
                        }
                    }
                });
                
                // Check Puzzles
                puzzles.forEach(p => {
                    if (p.LOCK_THREADS) {
                        for (const [thread, v] of Object.entries(p.LOCK_THREADS)) {
                            usedThreads.add(thread);
                            usedVars.add(v);
                            if (!threadKeys.has(thread)) {
                                errors.push(`[puzzles.json -> ${p.id}] LOCK_THREADS references unknown thread: <b>${thread}</b>`);
                            }
                            if (!varKeys.has(v)) {
                                errors.push(`[puzzles.json -> ${p.id}] LOCK_THREADS references unknown VAR: <b>${v}</b>`);
                            }
                        }
                    }
                });
                
                // Check Finales Sync
                if (foreshadow.length !== finales.length) {
                    errors.push(`[foreshadow.json / finales.json] Sync mismatch! Foreshadow has ${foreshadow.length} groups, Finales has ${finales.length}. They must match exactly by index.`);
                }
                
                // Check Orphans
                threadKeys.forEach(t => {
                    if (!usedThreads.has(t)) warnings.push(`[threads.json] Thread defined but never used: <b>${t}</b>`);
                });

                // A VAR counts as "used" if EITHER a puzzle's LOCK_THREADS references it
                // (usedVars, populated above) OR its ${name} token actually shows up
                // somewhere in the narrative text. VARs don't have to be puzzle-related at
                // all — they can be pure flavor/ephemera (e.g. `${WEEK}` dropped into a
                // lore document just for texture) with nothing to do with any puzzle's
                // access code, so puzzle-usage alone isn't grounds for an "unused" warning.
                const narrativeText = collectAllStrings([lore, clues, foreshadow, finales, threads]).join('\n');
                varKeys.forEach(v => {
                    const usedByPuzzle = usedVars.has(v);
                    const usedInText = narrativeText.includes('${' + v + '}');
                    if (!usedByPuzzle && !usedInText) {
                        warnings.push(`[parameters.json] VAR defined but never referenced: <b>${v}</b> — no puzzle's LOCK_THREADS points to it, and <b>\${${v}}</b> doesn't appear anywhere in lore.json/clues.json/foreshadow.json/finales.json/threads.json.`);
                    }
                });

                // Check Reachability: every thread a puzzle locks against must actually be
                // delivered UNDER THAT PUZZLE specifically, or the objective can never be
                // corroborated in-game. lore.json and foreshadow.json entries are always
                // universal, but clues.json entries are further gated by a `puzzle` field
                // (mirrors CaseFiles.js's clue-injection logic) — so a clue gated to a
                // different puzzle variant must not count just because it shares a thread
                // name (e.g. a pen-cipher clue can't satisfy an hour-cipher puzzle's CIPHER
                // requirement even though both puzzles lock against "CIPHER").
                const universalDeliveredThreads = new Set();
                for (const arr of Object.values(lore)) {
                    if (Array.isArray(arr)) arr.forEach(item => { if (item && item.thread) universalDeliveredThreads.add(item.thread); });
                }
                foreshadow.forEach(group => {
                    for (const val of Object.values(group)) {
                        if (val && typeof val === 'object' && val.thread) universalDeliveredThreads.add(val.thread);
                    }
                });
                puzzles.forEach(p => {
                    if (p.LOCK_THREADS) {
                        const deliveredForThisPuzzle = new Set(universalDeliveredThreads);
                        for (const arr of Object.values(clues)) {
                            if (!Array.isArray(arr)) continue;
                            arr.forEach(item => {
                                if (!item || !item.thread) return;
                                const puz = item.puzzle;
                                const appliesToThisPuzzle = !puz || puz === p.id || (Array.isArray(puz) && puz.includes(p.id));
                                if (appliesToThisPuzzle) deliveredForThisPuzzle.add(item.thread);
                            });
                        }
                        Object.keys(p.LOCK_THREADS).forEach(thread => {
                            if (!deliveredForThisPuzzle.has(thread)) {
                                errors.push(`[puzzles.json -> ${p.id}] LOCK_THREADS requires thread <b>${thread}</b>, but no entry in lore.json, clues.json (gated to this puzzle), or foreshadow.json is ever tagged with it. This objective can never be corroborated by a player.`);
                            }
                        });
                    }
                });

                // Check Templates: actually resolve every ${...} token against a live mock
                // context, mirroring CaseFiles.js, instead of only checking identifiers exist.
                const mockCtx = buildMockCtx(params, puzzles);
                const textFields = [];
                for (const [sector, arr] of Object.entries(lore)) {
                    if (Array.isArray(arr)) arr.forEach((item, idx) => { if (item && item.text) textFields.push([`lore.json -> ${sector}[${idx}] (${item.title || 'untitled'})`, item.text]); });
                }
                for (const [sector, arr] of Object.entries(clues)) {
                    if (Array.isArray(arr)) arr.forEach((item, idx) => { if (item && item.text) textFields.push([`clues.json -> ${sector}[${idx}] (${item.title || 'untitled'})`, item.text]); });
                }
                foreshadow.forEach((group, gIdx) => {
                    for (const [loc, val] of Object.entries(group)) {
                        if (val && typeof val === 'object' && val.text) textFields.push([`foreshadow.json -> [${gIdx}].${loc} (${group.nickname || 'untitled'})`, val.text]);
                    }
                });
                finales.forEach((f, idx) => {
                    if (f.text) textFields.push([`finales.json -> [${idx}].text (${f.nickname || f.option || 'untitled'})`, f.text]);
                    if (f.option) textFields.push([`finales.json -> [${idx}].option`, f.option]);
                    if (f.tell_title) textFields.push([`finales.json -> [${idx}].tell_title`, f.tell_title]);
                    if (f.tell_description) textFields.push([`finales.json -> [${idx}].tell_description`, f.tell_description]);

                    // lock_thread names a *second* thread (besides the implicit TELL) whose
                    // evidence nests as a subheading under TELL in the player's journal — it
                    // must point at a real threads.json entry, and pointing it at TELL itself
                    // is a no-op that just confuses the author (TELL is already the heading).
                    if (f.lock_thread) {
                        if (f.lock_thread === 'TELL') {
                            warnings.push(`[finales.json -> [${idx}].lock_thread] Set to <b>TELL</b>, which is already this finale's quest heading — lock_thread is meant to name a <i>different</i> thread to nest underneath it. Leave blank if this finale has no separate evidence thread.`);
                        } else if (!threads[f.lock_thread]) {
                            errors.push(`[finales.json -> [${idx}].lock_thread] References unknown thread <b>${f.lock_thread}</b> — it isn't defined in threads.json, so it has no title/description to show as a journal subheading.`);
                        }
                    }
                });
                for (const [key, t] of Object.entries(threads)) {
                    if (t && t.title) textFields.push([`threads.json -> ${key}.title`, t.title]);
                    if (t && t.description) textFields.push([`threads.json -> ${key}.description`, t.description]);
                }

                textFields.forEach(([path, text]) => {
                    // Heuristic: "${" typo'd as "$(" — wrong bracket, never resolves.
                    const wrongBracket = text.match(/\$\([a-zA-Z_][\w.]*}/g);
                    if (wrongBracket) {
                        wrongBracket.forEach(m => errors.push(`[${path}] Malformed token <b>${m}</b> — uses "$(" instead of "\${". This will render literally to the player.`));
                    }
                    const missingDollar = text.match(/[^$]\{[a-zA-Z_][\w.]*}/g);
                    if (missingDollar) {
                        missingDollar.forEach(m => warnings.push(`[${path}] Possible missing "$" before <b>${m.slice(1)}</b> — if this was meant to be a template token, it will currently render literally.`));
                    }
                    const { issues } = resolveTemplateForValidation(text, mockCtx);
                    issues.forEach(issue => errors.push(`[${path}] ${issue}`));
                });

                puzzles.forEach(p => {
                    const eligibleBySector = {};
                    for (const [sector, arr] of Object.entries(lore)) {
                        (arr || []).filter(i => i && i.type === 'tape').forEach(i => {
                            (eligibleBySector[sector] = eligibleBySector[sector] || []).push(i.title || '(untitled)');
                        });
                    }
                    for (const [sector, arr] of Object.entries(clues)) {
                        (arr || []).filter(i => i && i.type === 'tape' && i.thread && p.LOCK_THREADS && p.LOCK_THREADS[i.thread]).forEach(i => {
                            const puz = i.puzzle;
                            if (!puz || puz === p.id || (Array.isArray(puz) && puz.includes(p.id))) {
                                (eligibleBySector[sector] = eligibleBySector[sector] || []).push(i.title || '(untitled)');
                            }
                        });
                    }
                    Object.entries(eligibleBySector).forEach(([sector, titles]) => {
                        if (titles.length > 1) {
                            warnings.push(`[Tape collision, puzzle <b>${p.id}</b>] Sector <b>${sector}</b> has ${titles.length} eligible tape entries (${titles.join(', ')}), but only one tape can play per sector. All but one will be silently dropped for this puzzle.`);
                        }
                    });
                });

                // Render
                let html = '';
                if (errors.length === 0 && warnings.length === 0) {
                    html += `<div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; color: #34d399; font-family: var(--font-mono); font-size: 0.875rem;">
                        ✅ All data checks passed! System is properly configured.
                    </div>`;
                }
                
                if (errors.length > 0) {
                    html += `<h3 style="color: var(--accent-red); margin-top: 8px;">Critical Errors (${errors.length})</h3>`;
                    errors.forEach(e => {
                        html += `<div style="padding: 12px; background: rgba(220, 38, 38, 0.1); border-left: 3px solid var(--accent-red); color: #fca5a5; font-family: var(--font-mono); font-size: 0.875rem; border-radius: 0 4px 4px 0;">
                            ${e}
                        </div>`;
                    });
                }
                
                if (warnings.length > 0) {
                    html += `<h3 style="color: var(--accent-amber); margin-top: ${errors.length > 0 ? '24px' : '8px'};">Warnings (${warnings.length})</h3>`;
                    warnings.forEach(w => {
                        html += `<div style="padding: 12px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--accent-amber); color: #fcd34d; font-family: var(--font-mono); font-size: 0.875rem; border-radius: 0 4px 4px 0;">
                            ${w}
                        </div>`;
                    });
                }
                
                resultsEl.innerHTML = html;
                
            } catch (err) {
                resultsEl.innerHTML = `<div style="color:var(--accent-red); font-family:var(--font-mono);">Failed to run validation: ${err.message}</div>`;
            }
        }

        // Puzzle Inspector: makes the puzzle -> LOCK_THREADS -> delivering-content chain
        // visible as a table instead of something you have to trace across three files by
        // hand, plus a "simulate a run" button per puzzle that re-rolls the mock seed/pen/
        // year/hour and recomputes that puzzle's access code, so you can see the shape of
        // a few different playthroughs without launching the game.
