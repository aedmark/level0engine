        // Bundles every live data file (lore/clues/finales/foreshadow/puzzles/threads/
        // parameters) into one JSON download, so it can be handed to someone else and
        // loaded back in with Import Lore Pack.
        async function exportLorePack() {
            try {
                const res = await fetch('/api/export');
                if (!res.ok) throw new Error('bad response');
                const bundle = await res.json();
                const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const stamp = new Date().toISOString().slice(0, 10);
                a.download = `level0engine-lore-pack-${stamp}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            } catch (e) {
                alert('Export failed: could not reach the server.');
            }
        }

        function importLorePack() {
            const input = document.getElementById('import-file-input');
            input.value = '';
            input.click();
        }

        // Fired by the hidden file input's onchange. Replaces every recognized live data
        // file with the contents of the selected lore pack — a full overwrite, same as
        // Factory Reset but restoring to someone else's pack instead of the shipped
        // defaults. Files the pack doesn't mention are left untouched.
        async function handleImportFileSelected(fileInput) {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            let bundle;
            try {
                bundle = JSON.parse(await file.text());
            } catch (e) {
                alert("Import failed: that file isn't valid JSON.");
                return;
            }
            if (!bundle || typeof bundle.files !== 'object') {
                alert('Import failed: this doesn\'t look like a lore pack (missing a "files" object).');
                return;
            }
            const incoming = Object.keys(bundle.files);
            if (!confirm(`This will REPLACE your current data with the ${incoming.length} file(s) in this lore pack:\n\n${incoming.join(', ')}\n\nAny local edits to those files that aren't reflected in the pack will be lost. Continue?`)) return;

            try {
                const res = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bundle)
                });
                const data = await res.json();
                crossFileCache = {};
                if (data.success) {
                    alert('Lore pack imported successfully.');
                } else {
                    alert('Import finished, but some files failed to write. Check the data directory permissions and try again.');
                }
                // The import already overwrote whatever was on disk unconditionally, so any
                // unsaved in-memory edit is moot by this point — clear it before the refresh
                // below so confirmDiscardIfDirty() doesn't re-prompt about something the user
                // already accepted losing when they confirmed the import itself.
                clearDirty();
                if (selectedFile && files.includes(selectedFile)) selectFile(selectedFile);
            } catch (e) {
                alert('Import failed: could not reach the server.');
            }
        }

        // Restores every data file to the immutable data/factory/ baseline, discarding
        // every edit and addition made since. The embedded "_locked" entries and the
        // primitives protected by getLockedNamesSet/getLockedVarKeysSet are exactly what
        // this restores from — factory reset is that same baseline applied wholesale.
        async function factoryReset() {
            const warning = "FACTORY RESET\n\nThis restores lore.json, clues.json, finales.json, foreshadow.json, puzzles.json, threads.json, and parameters.json to their shipped defaults.\n\nEverything you've added or changed will be permanently lost. This cannot be undone.\n\nContinue?";
            if (!confirm(warning)) return;

            try {
                const res = await fetch('/api/factory-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const data = await res.json();
                crossFileCache = {};
                if (data.success) {
                    alert('Factory reset complete. All data has been restored to its shipped defaults.');
                } else {
                    alert('Factory reset finished, but some files failed to reset. Check the data directory permissions and try again.');
                }
                // Same reasoning as import: the reset already overwrote disk unconditionally,
                // so clear dirty before the refresh below to avoid a redundant second prompt.
                clearDirty();
                if (selectedFile && files.includes(selectedFile)) selectFile(selectedFile);
            } catch (e) {
                alert('Factory reset failed: could not reach the server.');
            }
        }

        async function renameThreadEverywhere(oldKey) {
            const input = prompt(`Rename thread "${oldKey}" to:`, oldKey);
            if (!input) return;
            const newKey = input.toUpperCase().trim();
            if (!newKey || newKey === oldKey) return;

            const threadsData = (selectedFile === 'threads.json' && fileData) ? fileData : (await getCrossFileData('threads.json', true));
            if (threadsData && Object.prototype.hasOwnProperty.call(threadsData, newKey)) {
                alert(`"${newKey}" already exists in threads.json. Pick a different name.`);
                return;
            }

            const [lore, clues, foreshadow, puzzles] = await Promise.all([
                getCrossFileData('lore.json', true),
                getCrossFileData('clues.json', true),
                getCrossFileData('foreshadow.json', true),
                getCrossFileData('puzzles.json', true)
            ]);

            let loreCount = 0, cluesCount = 0, foreshadowCount = 0;
            const puzzleIds = [];

            for (const arr of Object.values(lore || {})) {
                if (Array.isArray(arr)) arr.forEach(i => { if (i && i.thread === oldKey) loreCount++; });
            }
            for (const arr of Object.values(clues || {})) {
                if (Array.isArray(arr)) arr.forEach(i => { if (i && i.thread === oldKey) cluesCount++; });
            }
            (foreshadow || []).forEach(group => {
                for (const val of Object.values(group)) {
                    if (val && typeof val === 'object' && val.thread === oldKey) foreshadowCount++;
                }
            });
            (puzzles || []).forEach(p => {
                if (p.LOCK_THREADS && Object.prototype.hasOwnProperty.call(p.LOCK_THREADS, oldKey)) puzzleIds.push(p.id);
            });

            const total = loreCount + cluesCount + foreshadowCount + puzzleIds.length;
            if (total > 0) {
                const summary = [
                    loreCount ? `${loreCount} entr${loreCount === 1 ? 'y' : 'ies'} in lore.json` : null,
                    cluesCount ? `${cluesCount} entr${cluesCount === 1 ? 'y' : 'ies'} in clues.json` : null,
                    foreshadowCount ? `${foreshadowCount} entr${foreshadowCount === 1 ? 'y' : 'ies'} in foreshadow.json` : null,
                    puzzleIds.length ? `LOCK_THREADS in puzzles.json: ${puzzleIds.join(', ')}` : null
                ].filter(Boolean).join('\n');
                const ok = confirm(`Renaming "${oldKey}" → "${newKey}" will update:\n\n${summary}\n\nThis writes to every affected file immediately. Continue?`);
                if (!ok) return;
            }

            const filesWritten = [];
            if (loreCount) filesWritten.push('lore.json');
            if (cluesCount) filesWritten.push('clues.json');
            if (foreshadowCount) filesWritten.push('foreshadow.json');
            if (puzzleIds.length) filesWritten.push('puzzles.json');
            filesWritten.push('threads.json');

            // This touches up to 5 files in sequence — if a write fails partway through
            // (postFile() now throws instead of failing silently), the rename is left
            // half-applied across files. Surface exactly that instead of leaving an
            // unhandled rejection in the console with no indication of what did/didn't
            // actually get written.
            try {
                if (lore) {
                    for (const arr of Object.values(lore)) {
                        if (Array.isArray(arr)) arr.forEach(i => { if (i && i.thread === oldKey) i.thread = newKey; });
                    }
                    if (loreCount) await postFile('lore.json', lore);
                    crossFileCache['lore.json'] = lore;
                    if (selectedFile === 'lore.json') fileData = lore;
                }

                if (clues) {
                    for (const arr of Object.values(clues)) {
                        if (Array.isArray(arr)) arr.forEach(i => { if (i && i.thread === oldKey) i.thread = newKey; });
                    }
                    if (cluesCount) await postFile('clues.json', clues);
                    crossFileCache['clues.json'] = clues;
                    if (selectedFile === 'clues.json') fileData = clues;
                }
                if (foreshadow) {
                    foreshadow.forEach(group => {
                        for (const val of Object.values(group)) {
                            if (val && typeof val === 'object' && val.thread === oldKey) val.thread = newKey;
                        }
                    });
                    if (foreshadowCount) await postFile('foreshadow.json', foreshadow);
                    crossFileCache['foreshadow.json'] = foreshadow;
                    if (selectedFile === 'foreshadow.json') fileData = foreshadow;
                }
                if (puzzles && puzzleIds.length) {
                    puzzles.forEach(p => {
                        if (p.LOCK_THREADS && Object.prototype.hasOwnProperty.call(p.LOCK_THREADS, oldKey)) {
                            p.LOCK_THREADS[newKey] = p.LOCK_THREADS[oldKey];
                            delete p.LOCK_THREADS[oldKey];
                        }
                    });
                    await postFile('puzzles.json', puzzles);
                    puzzlesData = puzzles;
                    if (selectedFile === 'puzzles.json') fileData = puzzles;
                }

                if (threadsData) {
                    threadsData[newKey] = threadsData[oldKey];
                    delete threadsData[oldKey];
                    await postFile('threads.json', threadsData);
                    if (selectedFile === 'threads.json') {
                        fileData = threadsData;
                        if (selectedCategory === oldKey) selectedCategory = newKey;
                    }
                }
            } catch (err) {
                renderTree();
                renderEditor();
                alert(`Rename partially failed: ${err.message}\n\nSome files may still have the old thread name "${oldKey}" — check Data Validation before continuing.`);
                return;
            }

            // Every file this rename touched (including the currently-open one, if it was
            // affected) was just persisted via postFile above, so nothing is left unsaved.
            clearDirty();
            renderTree();
            renderEditor();
            alert(`Renamed "${oldKey}" → "${newKey}" in: ${filesWritten.join(', ')}.`);
        }

