let inspectorData = null;
        let inspectorMockCtx = {};

        function randomCoreVars(params) {
            const core = {
                seed: Math.floor(Math.random() * 999999),
                pen: 3 + Math.floor(Math.random() * 19),
                year: 1971 + Math.floor(Math.random() * 28),
                hours: 300 + Math.floor(Math.random() * 900)
            };
            const customCoreVarDefs = (params && params.CORE_VARS) || {};
            Object.entries(customCoreVarDefs).forEach(([key, def]) => {
                if (key in core) return;
                const min = Number.isFinite(def?.min) ? def.min : 0;
                const max = Number.isFinite(def?.max) ? def.max : min;
                core[key] = min + Math.floor(Math.random() * (max - min + 1));
            });
            return core;
        }

        async function openPuzzleInspector() {
            if (!confirmDiscardIfDirty()) return;
            wizardState = null;
            finaleWizardState = null;
            activeWizard = null;
            selectedFile = 'INSPECTOR';
            renderFileList();

            document.getElementById('welcome-msg').style.display = 'none';
            document.getElementById('editor-container').style.display = 'none';
            document.getElementById('validation-container').style.display = 'none';
            document.getElementById('wizard-container').style.display = 'none';
            document.getElementById('inspector-container').style.display = 'flex';

            const resultsEl = document.getElementById('inspector-results');
            resultsEl.innerHTML = '<div style="color:var(--text-muted); font-family:var(--font-mono);">Loading...</div>';

            try {
                const fetches = ['parameters.json', 'threads.json', 'puzzles.json', 'clues.json', 'lore.json', 'foreshadow.json', 'finales.json'].map(f => fetch('/api/data?file=' + f).then(r => r.json()));
                const [paramRes, threadRes, puzzleRes, clueRes, loreRes, foreRes, finRes] = await Promise.all(fetches);

                inspectorData = {
                    params: paramRes.content || {},
                    threads: threadRes.content || {},
                    puzzles: puzzleRes.content || [],
                    clues: clueRes.content || {},
                    lore: loreRes.content || {},
                    foreshadow: foreRes.content || [],
                    finales: finRes.content || []
                };

                paramsData = inspectorData.params;
                puzzlesData = inspectorData.puzzles;
                crossFileCache['lore.json'] = inspectorData.lore;
                crossFileCache['clues.json'] = inspectorData.clues;
                crossFileCache['foreshadow.json'] = inspectorData.foreshadow;
                crossFileCache['finales.json'] = inspectorData.finales;
                crossFileCache['threads.json'] = inspectorData.threads;
                crossFileCache['puzzles.json'] = inspectorData.puzzles;

                inspectorMockCtx = {};
                inspectorData.puzzles.forEach(p => {
                    inspectorMockCtx[p.id] = buildMockCtx(inspectorData.params, inspectorData.puzzles);
                });

                renderInspectorResults();
            } catch (err) {
                resultsEl.innerHTML = `<div style="color:var(--accent-red); font-family:var(--font-mono);">Failed to load puzzle inspector: ${err.message}</div>`;
            }
        }

        function simulatePuzzle(puzzleId) {
            if (!inspectorData) return;
            inspectorMockCtx[puzzleId] = buildMockCtx(inspectorData.params, inspectorData.puzzles, randomCoreVars(inspectorData.params));
            renderInspectorResults();
        }

        function renderInspectorResults() {
            const resultsEl = document.getElementById('inspector-results');
            if (!inspectorData) return;
            const { params, threads, puzzles, clues, lore } = inspectorData;

            if (puzzles.length === 0) {
                resultsEl.innerHTML = '<div style="color:var(--text-muted); font-family:var(--font-mono);">No puzzles defined in puzzles.json.</div>';
                return;
            }

            let html = '';
            puzzles.forEach(p => {
                const lockThreads = p.LOCK_THREADS || {};
                const threadKeys = Object.keys(lockThreads);

                const deliveryByThread = {};
                threadKeys.forEach(t => { deliveryByThread[t] = []; });
                for (const [sector, arr] of Object.entries(lore)) {
                    (arr || []).forEach(item => {
                        if (item && item.thread && threadKeys.includes(item.thread)) {
                            deliveryByThread[item.thread].push(`${sector} · ${item.title || 'untitled'} (lore.json)`);
                        }
                    });
                }
                for (const [sector, arr] of Object.entries(clues)) {
                    (arr || []).forEach(item => {
                        if (item && item.thread && threadKeys.includes(item.thread)) {
                            const puz = item.puzzle;
                            const appliesToThisPuzzle = !puz || puz === p.id || (Array.isArray(puz) && puz.includes(p.id));
                            if (appliesToThisPuzzle) {
                                deliveryByThread[item.thread].push(`${sector} · ${item.title || 'untitled'} (clues.json)`);
                            }
                        }
                    });
                }

                const mockCtx = inspectorMockCtx[p.id] || buildMockCtx(params, puzzles);
                let accessCodeResult = null, accessCodeError = null;
                try {
                    accessCodeResult = window.safeEval(p.ACCESS_CODE, mockCtx.coreVars);
                } catch (e) {
                    accessCodeError = e.message;
                }

                const unreachable = threadKeys.filter(t => deliveryByThread[t].length === 0);

                html += `<div class="inspector-puzzle-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <h3 style="font-size:1rem; font-weight:600;">${p.id}</h3>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="badge ${unreachable.length ? 'badge-danger' : 'badge-ok'}">${unreachable.length ? unreachable.length + ' unreachable thread(s)' : 'fully reachable'}</span>
                            <button class="var-btn" onclick="simulatePuzzle('${p.id}')">🎲 Simulate a run</button>
                        </div>
                    </div>
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">
                        Simulated access code (seed ${mockCtx.coreVars.seed}, year ${mockCtx.coreVars.year}, pen ${mockCtx.coreVars.pen}, hour ${mockCtx.coreVars.hours}):
                        <b style="color:var(--accent-amber);">${accessCodeError ? 'ERROR: ' + accessCodeError : accessCodeResult}</b>
                    </div>`;

                if (threadKeys.length === 0) {
                    html += `<div class="inspector-sector-list">This puzzle has no LOCK_THREADS — it can be solved with no in-world evidence at all.</div>`;
                }

                threadKeys.forEach(t => {
                    const deliveries = deliveryByThread[t];
                    const uniqueSectors = new Set(deliveries.map(d => d.split(' · ')[0]));
                    const { cls, label } = badgeForDeliveryCount(uniqueSectors.size, 'reachable');
                    html += `<div class="inspector-thread-row">
                        <div>
                            <div><b>${t}</b>${threads[t] && threads[t].title ? ` — ${threads[t].title}` : ''}</div>
                            ${deliveries.length ? `<div class="inspector-sector-list">Delivered by: ${deliveries.join(', ')}</div>` : `<div class="inspector-sector-list" style="color:#fca5a5;">Nothing in lore.json or clues.json is ever tagged with this thread.</div>`}
                        </div>
                        <span class="badge ${cls}">${label}</span>
                    </div>`;
                });

                html += `</div>`;
            });

            resultsEl.innerHTML = html;
        }

