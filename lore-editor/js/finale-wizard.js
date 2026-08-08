        // Finale Wizard: walks through Identify -> The Reveal -> Foreshadowing -> Review,
        // and writes to finales.json AND foreshadow.json together on "Create Finale Arc".
        // The entire reason this exists (rather than just using +Add Entry on each file
        // separately) is that the two files must stay index-aligned — foreshadow.json's
        // group at index N is the lead-up to finales.json's finale at index N, and nothing
        // else ties them together. Pushing to both arrays in the same write, at wizard-open
        // time, makes a misaligned pair structurally impossible instead of relying on an
        // author to "note the index" by hand.
        const DEFAULT_FORESHADOW_SECTORS = ['ANNEX', 'ARCHIVE', 'SERVER', 'CLINIC', 'CHASM'];

        function newFinaleWizardState() {
            const sectors = {};
            DEFAULT_FORESHADOW_SECTORS.forEach(s => { sectors[s] = { text: '', title: '' }; });
            return {
                step: 1,
                nickname: '',
                option: '',
                text: '',
                tellTitle: '',
                tellDescription: '',
                sectors
            };
        }

        async function openFinaleWizard() {
            const finales = (await getCrossFileData('finales.json', true)) || [];
            const foreshadow = (await getCrossFileData('foreshadow.json', true)) || [];
            if (finales.length !== foreshadow.length) {
                alert(`finales.json (${finales.length} entries) and foreshadow.json (${foreshadow.length} entries) are currently out of sync, so the wizard can't safely append a new aligned pair.\n\nOpen Data Validation to see the sync error, fix the mismatch by hand first, then try the wizard again.`);
                return;
            }

            wizardState = null;
            finaleWizardState = newFinaleWizardState();
            activeWizard = 'finale';
            selectedFile = 'FINALE_WIZARD';
            renderFileList();

            document.getElementById('welcome-msg').style.display = 'none';
            document.getElementById('editor-container').style.display = 'none';
            document.getElementById('validation-container').style.display = 'none';
            document.getElementById('inspector-container').style.display = 'none';
            document.getElementById('wizard-container').style.display = 'flex';
            document.getElementById('wizard-header-title').innerText = 'New Finale Arc';

            // Warm the sector list so "+ Add Sector" in Step 3 offers everything
            // lore.json/clues.json actually use, not just the five conventional ones.
            await Promise.all([getCrossFileData('lore.json'), getCrossFileData('clues.json')]);

            await renderFinaleWizard();
        }

        function cancelFinaleWizard() {
            finaleWizardState = null;
            activeWizard = null;
            selectFile('finales.json');
        }

        async function finaleWizardNext() {
            if (!(await finaleWizardValidateStep(finaleWizardState.step))) return;
            if (finaleWizardState.step < 4) finaleWizardState.step++;
            await renderFinaleWizard();
        }

        function finaleWizardBack() {
            if (finaleWizardState.step > 1) finaleWizardState.step--;
            renderFinaleWizard();
        }

        async function finaleWizardValidateStep(step) {
            if (step === 1) {
                const nickname = (finaleWizardState.nickname || '').trim();
                if (!nickname) { alert('Give this finale a nickname first — it\'s how you\'ll find it in the tree.'); return false; }
                const finales = (await getCrossFileData('finales.json')) || [];
                if (finales.some(f => f && f.nickname === nickname)) { alert(`A finale nicknamed "${nickname}" already exists.`); return false; }
                if (!(finaleWizardState.option || '').trim()) { alert('Write the verdict button text (the "option" field) before continuing.'); return false; }
                finaleWizardState.nickname = nickname;
                return true;
            }
            if (step === 2) {
                if (!(finaleWizardState.text || '').trim()) { alert('Write the finale\'s full reveal text before continuing.'); return false; }
                return true;
            }
            if (step === 3) {
                const filled = Object.values(finaleWizardState.sectors).filter(s => (s.text || '').trim()).length;
                if (filled === 0) {
                    return confirm('No sectors have any foreshadowing text yet, meaning nothing in the world will hint at this finale before the reveal. Continue anyway?');
                }
                return true;
            }
            return true;
        }

        async function renderFinaleWizard() {
            document.getElementById('wizard-step-label').innerText = `Step ${finaleWizardState.step} of 4`;
            const titles = { 1: 'Identify the Finale', 2: 'The Reveal', 3: 'Foreshadowing', 4: 'Review & Create' };
            document.getElementById('wizard-title').innerText = titles[finaleWizardState.step];

            const backBtn = document.getElementById('wizard-back-btn');
            const nextBtn = document.getElementById('wizard-next-btn');
            backBtn.style.visibility = finaleWizardState.step === 1 ? 'hidden' : 'visible';
            nextBtn.innerText = finaleWizardState.step === 4 ? 'Create Finale Arc' : (finaleWizardState.step === 3 ? 'Review →' : 'Next →');
            nextBtn.onclick = finaleWizardState.step === 4 ? finishFinaleWizard : finaleWizardNext;

            if (finaleWizardState.step === 1) {
                document.getElementById('wizard-body').innerHTML = renderFinaleWizardStep1();
            } else if (finaleWizardState.step === 2) {
                document.getElementById('wizard-body').innerHTML = renderFinaleWizardStep2();
            } else if (finaleWizardState.step === 3) {
                document.getElementById('wizard-body').innerHTML = renderFinaleWizardStep3();
            } else if (finaleWizardState.step === 4) {
                document.getElementById('wizard-body').innerHTML = renderFinaleWizardStep4();
            }
        }

        function renderFinaleWizardStep1() {
            return `
                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">Nickname</label>
                <input type="text" value="${finaleWizardState.nickname}" placeholder="e.g. The Overgrowth" oninput="finaleWizardState.nickname = this.value" style="width:100%; margin-bottom:16px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 10px 14px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.95rem;">
                <span class="help-text" style="display:block; margin-top:-12px; margin-bottom:16px;">Internal identifier, not shown to players — this is how the finale and its foreshadow group are labeled in the tree. Must be unique.</span>

                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">Verdict Button Text (<code>option</code>) <span class="help-icon" title="The short text shown on the button the player clicks to commit to this ending.">?</span></label>
                <textarea oninput="finaleWizardState.option = this.value" style="width:100%; height:60px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 10px 14px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">${finaleWizardState.option}</textarea>
            `;
        }

        function renderFinaleWizardStep2() {
            return `
                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">Reveal Text (<code>text</code>)</label>
                <textarea oninput="finaleWizardState.text = this.value" style="width:100%; height:160px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">${finaleWizardState.text}</textarea>
                <span class="help-text" style="display:block; margin-top:8px; margin-bottom:16px;">The full document the player reads when they commit to this ending. Dynamic tokens (<code>\${c.lead}</code>, <code>\${P}</code>, etc.) work here same as anywhere else.</span>

                <label style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px;">TELL Thread Override <span class="help-icon" title="Optional. While this finale is active, it overrides the player's PDA journal objective text (normally defined by threads.json's TELL entry). Leave blank to keep the default TELL title/description.">?</span></label>
                <input type="text" value="${finaleWizardState.tellTitle}" placeholder="Journal title (optional — falls back to threads.json's TELL title)" oninput="finaleWizardState.tellTitle = this.value" style="width:100%; margin-bottom:8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">
                <textarea placeholder="Journal description (optional)" oninput="finaleWizardState.tellDescription = this.value" style="width:100%; height:60px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">${finaleWizardState.tellDescription}</textarea>
            `;
        }

        function finaleSectorBadge(text) {
            return (text || '').trim()
                ? { cls: 'badge-ok', label: 'written' }
                : { cls: 'badge-warn', label: 'empty — will be skipped' };
        }

        function renderFinaleWizardStep3() {
            const sectorKeys = Object.keys(finaleWizardState.sectors);
            const known = getKnownSectors();
            const available = known.filter(s => !sectorKeys.includes(s));

            let rowsHtml = '';
            sectorKeys.forEach(s => {
                const draft = finaleWizardState.sectors[s];
                const { cls, label } = finaleSectorBadge(draft.text);
                const isDefault = DEFAULT_FORESHADOW_SECTORS.includes(s);
                rowsHtml += `<div class="inspector-puzzle-card" style="margin-bottom:12px; padding:12px 16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div><b>${s}</b></div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="badge ${cls}">${label}</span>
                            ${isDefault ? '' : `<button class="delete-btn" onclick="finaleWizardRemoveSector('${s}')">×</button>`}
                        </div>
                    </div>
                    <input type="text" placeholder="Title (optional)" value="${draft.title}" oninput="finaleWizardState.sectors['${s}'].title = this.value" style="width:100%; margin-bottom:8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">
                    <textarea placeholder="Foreshadowing document text..." oninput="finaleWizardState.sectors['${s}'].text = this.value" style="width:100%; height:70px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: var(--text-main); font-family: var(--font-mono); font-size: 0.875rem;">${draft.text}</textarea>
                </div>`;
            });

            let addRow = '';
            if (available.length) {
                addRow = `<div style="display:flex; gap:8px; margin-top:8px;">
                    <select id="finale-wizard-add-sector" class="var-select" style="flex:1;">
                        <option value="">Add another sector...</option>
                        ${available.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                    <button class="var-btn" onclick="finaleWizardAddSector()">Add</button>
                </div>`;
            }

            return `
                <p class="help-text" style="margin-top:0; margin-bottom:16px;">These become the entries in the matching foreshadow.json group — always thread <code>TELL</code> (set automatically), one document per sector. Leave a sector blank to skip it; it won't be written.</p>
                ${rowsHtml}
                ${addRow}
            `;
        }

        function finaleWizardAddSector() {
            const sel = document.getElementById('finale-wizard-add-sector');
            const key = sel ? sel.value : '';
            if (!key || finaleWizardState.sectors[key]) return;
            finaleWizardState.sectors[key] = { text: '', title: '' };
            renderFinaleWizard();
        }

        function finaleWizardRemoveSector(key) {
            delete finaleWizardState.sectors[key];
            renderFinaleWizard();
        }

        function renderFinaleWizardStep4() {
            const filledSectors = Object.entries(finaleWizardState.sectors).filter(([, s]) => (s.text || '').trim());
            const emptySectors = Object.entries(finaleWizardState.sectors).filter(([, s]) => !(s.text || '').trim());

            const preview = (finaleWizardState.text || '').slice(0, 160);
            const previewSuffix = (finaleWizardState.text || '').length > 160 ? '…' : '';

            const sectorRows = filledSectors.map(([s, draft]) =>
                `<div class="inspector-thread-row"><div><b>${s}</b>${draft.title ? ` — ${draft.title}` : ''}</div><span class="badge badge-ok">written</span></div>`
            ).join('');

            const emptyNote = emptySectors.length
                ? `<p class="help-text">${emptySectors.length} sector(s) left blank and will be skipped: ${emptySectors.map(([s]) => s).join(', ')}.</p>`
                : '';

            return `
                <div style="margin-bottom:16px;"><b>Nickname:</b> ${finaleWizardState.nickname}</div>
                <div style="margin-bottom:16px;"><b>Verdict Button:</b> ${finaleWizardState.option}</div>
                <div style="margin-bottom:16px;"><b>Reveal Text:</b><br><span style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.85rem;">${preview}${previewSuffix}</span></div>
                ${(finaleWizardState.tellTitle || finaleWizardState.tellDescription) ? `<div style="margin-bottom:16px;"><b>TELL Override:</b> ${finaleWizardState.tellTitle || '(default title)'} — ${finaleWizardState.tellDescription || '(default description)'}</div>` : ''}
                <div style="margin-bottom:8px;"><b>Foreshadowing (${filledSectors.length} sector${filledSectors.length === 1 ? '' : 's'}):</b></div>
                ${sectorRows || '<div class="inspector-sector-list">None — nothing in the world will hint at this finale before the reveal.</div>'}
                ${emptyNote}
            `;
        }

        async function finishFinaleWizard() {
            const btn = document.getElementById('wizard-next-btn');
            btn.disabled = true;
            btn.innerText = 'Creating...';

            try {
                const finales = (await getCrossFileData('finales.json', true)) || [];
                const foreshadow = (await getCrossFileData('foreshadow.json', true)) || [];
                if (finales.length !== foreshadow.length) {
                    throw new Error(`finales.json (${finales.length}) and foreshadow.json (${foreshadow.length}) are out of sync — resolve via Data Validation before creating a new finale.`);
                }

                const newFinale = {
                    option: finaleWizardState.option.trim(),
                    text: finaleWizardState.text,
                    nickname: finaleWizardState.nickname,
                    thread: 'TELL',
                    tell_title: (finaleWizardState.tellTitle || '').trim(),
                    tell_description: (finaleWizardState.tellDescription || '').trim()
                };

                const newGroup = { nickname: finaleWizardState.nickname };
                Object.entries(finaleWizardState.sectors).forEach(([sector, draft]) => {
                    const text = (draft.text || '').trim();
                    if (!text) return;
                    const entry = { text, thread: 'TELL', type: 'document' };
                    if ((draft.title || '').trim()) entry.title = draft.title.trim();
                    newGroup[sector] = entry;
                });

                finales.push(newFinale);
                foreshadow.push(newGroup);

                await postFile('finales.json', finales);
                await postFile('foreshadow.json', foreshadow);
                crossFileCache['finales.json'] = finales;
                crossFileCache['foreshadow.json'] = foreshadow;

                const createdNickname = finaleWizardState.nickname;
                finaleWizardState = null;
                activeWizard = null;
                await selectFile('finales.json');
                const idx = (fileData || []).findIndex(f => f && f.nickname === createdNickname);
                if (idx >= 0) clickArrayRow(idx, false);
                alert(`Finale "${createdNickname}" created, with a matching foreshadow group at index ${idx >= 0 ? idx : '?'}.`);
            } catch (err) {
                alert('Failed to create finale: ' + err.message);
                btn.disabled = false;
                btn.innerText = 'Create Finale Arc';
            }
        }

