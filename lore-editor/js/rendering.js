        // Render File List
        function renderFileList() {
            let html = '';
            const groups = [
                { title: '⚙️ System Parameters', files: ['parameters.json', 'threads.json'] },
                { title: '🔐 Lock Mechanics', files: ['puzzles.json', 'clues.json'] },
                { title: '🎬 Exit Conditions', files: ['finales.json', 'foreshadow.json'] },
                { title: '🌍 World Building', files: ['lore.json'] }
            ];

            groups.forEach(group => {
                const groupFiles = group.files.filter(f => files.includes(f));
                if (groupFiles.length === 0) return;
                
                html += `<h2>${group.title}</h2>`;
                groupFiles.forEach(f => {
                    const isActive = f === selectedFile;
                    html += `<button class="file-btn ${isActive ? 'active' : ''}" onclick="selectFile('${f}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        ${f}
                    </button>`;
                });
            });

            // Fallback for any other files
            const knownFiles = new Set(groups.flatMap(g => g.files));
            const otherFiles = files.filter(f => !knownFiles.has(f));
            if (otherFiles.length > 0) {
                html += `<h2>📁 Other Data</h2>`;
                otherFiles.forEach(f => {
                    const isActive = f === selectedFile;
                    html += `<button class="file-btn ${isActive ? 'active' : ''}" onclick="selectFile('${f}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        ${f}
                    </button>`;
                });
            }

            html += `<div style="margin-top: 16px; margin-bottom: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                <h2 style="margin-bottom: 8px;">🛠️ Tools</h2>
                <button class="file-btn ${selectedFile === 'VALIDATION' ? 'active' : ''}" onclick="openValidation()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    Data Validation
                </button>
                <button class="file-btn ${selectedFile === 'INSPECTOR' ? 'active' : ''}" onclick="openPuzzleInspector()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    Puzzle Inspector
                </button>
            </div>
            <div style="margin-top: 16px; margin-bottom: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                <h2 style="margin-bottom: 8px;">💾 Factory Data</h2>
                <button class="file-btn" title="Export every live data file as one shareable lore pack" onclick="exportLorePack()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Lore Pack
                </button>
                <button class="file-btn" title="Load a lore pack someone shared with you, replacing your live data" onclick="importLorePack()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Import Lore Pack
                </button>
                <button class="file-btn" title="Restore all data to the shipped factory defaults, discarding your edits" onclick="factoryReset()" style="color: var(--accent-red);">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>
                    Factory Reset
                </button>
            </div>`;

            fileListEl.innerHTML = html;
        }

        // Select File
        async function selectFile(f) {
            wizardState = null;
            finaleWizardState = null;
            activeWizard = null;
            selectedFile = f;
            fileData = null;
            linkedData = null;
            expandedCategory = null;
            selectedCategory = null;
            selectedIndex = null;
            renderFileList();

            document.getElementById('welcome-msg').style.display = 'none';
            document.getElementById('editor-container').style.display = 'flex';
            document.getElementById('validation-container').style.display = 'none';
            document.getElementById('inspector-container').style.display = 'none';
            document.getElementById('wizard-container').style.display = 'none';
            document.getElementById('display-filename').innerText = f;
            document.getElementById('tree-content').innerHTML = '<div style="color:var(--text-muted); font-size:12px; padding:8px;">Decrypting node...</div>';
            document.getElementById('editor-content-area').style.display = 'none';
            document.getElementById('editor-empty-state').style.display = 'flex';

            try {
                const res = await fetch(`/api/data?file=${f}`);
                const data = await res.json();
                fileData = data.content;

                // Load linked data
                if (f === 'foreshadow.json') await loadLinked('finales.json');
                else if (f === 'finales.json') await loadLinked('foreshadow.json');
                else linkedData = null;

                initializeSelection();
                updateTagSuggestions();
                renderTree();
                renderEditor();
            } catch (err) {
                console.error(err);
            }
        }

        async function loadLinked(f) {
            try {
                const res = await fetch(`/api/data?file=${f}`);
                const data = await res.json();
                linkedData = data.content;
            } catch (e) { console.error(e); }
        }

        function isArrayRoot() { return Array.isArray(fileData); }
        function isObjectRoot() { return !isArrayRoot() && fileData !== null && typeof fileData === 'object'; }

        function initializeSelection() {
            if (isArrayRoot()) {
                if (fileData.length > 0) selectedIndex = 0;
            } else if (isObjectRoot()) {
                const keys = Object.keys(fileData);
                if (keys.length > 0) {
                    expandedCategory = keys[0];
                    selectedCategory = keys[0];
                    if (Array.isArray(fileData[keys[0]]) && fileData[keys[0]].length > 0 && selectedFile !== 'parameters.json' && selectedFile !== 'threads.json') {
                        selectedIndex = 0;
                    }
                }
            }
        }

        // Render Tree
        function renderTree() {
            if (!fileData) return;
            let html = '';
            
            if (isArrayRoot()) {
                addCatBtn.style.display = 'none';
                
                fileData.forEach((item, i) => {
                    const isItemObj = item !== null && typeof item === 'object' && !Array.isArray(item);
                    const isExpandable = isItemObj && selectedFile !== 'finales.json' && selectedFile !== 'puzzles.json';
                    const isExpanded = expandedCategory === String(i);
                    const isActiveRow = (!isExpandable && selectedIndex === i && selectedCategory === null) || (isExpandable && isExpanded);
                    const itemLocked = isLockedEntry(item);
                    const rowDeleteControl = itemLocked
                        ? `<span class="delete-btn" title="Factory default — can't be deleted, but you can still edit it" style="opacity:0.5; cursor:default;">🔒</span>`
                        : `<button class="delete-btn" onclick="deleteEntry(null, ${i})">×</button>`;

                    html += `<div class="tree-item">
                        <div class="tree-item-row group">
                            <button class="tree-btn ${isActiveRow ? 'active' : ''} ${isItemObj ? 'bold' : ''}" onclick="clickArrayRow(${i}, ${isItemObj})">
                                ${isExpandable ? (isExpanded ? '▼ ' : '▶ ') : '• '}${item?.nickname ? `"${item.nickname}"` : (item?.title || item?.id || ((['foreshadow.json', 'finales.json'].includes(selectedFile) ? 'Finale Group ' : 'Entry ') + i))}
                            </button>
                            ${rowDeleteControl}
                        </div>`;

                    if (isExpandable && isExpanded) {
                        html += `<div class="tree-children">`;
                        Object.keys(item).forEach(key => {
                            if (['nickname', 'title', 'option', 'text', 'description', 'tell_title', 'tell_description', 'thread', 'type'].includes(key) || key.startsWith('_')) return;
                            const isChildActive = selectedIndex === i && selectedCategory === key;
                            const locObj = item[key];
                            const displayTitle = (locObj && locObj.title) ? ` - ${locObj.title}` : '';
                            const locLocked = isLockedEntry(locObj);
                            const locDeleteControl = locLocked
                                ? `<span class="delete-btn" style="padding:4px; font-size:12px; opacity:0.5; cursor:default;" title="Factory default — can't be deleted, but you can still edit it">🔒</span>`
                                : `<button class="delete-btn" style="padding:4px; font-size:12px;" onclick="deleteLocation(${i}, '${key}')">×</button>`;
                            html += `<div class="tree-item-row group">
                                <button class="tree-child-btn ${isChildActive ? 'active' : ''}" onclick="selectNode(${i}, '${key}')">
                                    ${key}${displayTitle}
                                </button>
                                ${locDeleteControl}
                            </div>`;
                        });
                        if (selectedFile === 'foreshadow.json') {
                            html += `<div style="display: flex; gap: 4px; margin-top: 8px;">`;
                            html += `<select id="loc-select-${i}" class="tree-child-btn" style="background: rgba(255,255,255,0.05); color: var(--text-main); border: 1px dashed rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; flex-grow: 1; font-family: var(--font-mono); font-size: 10px; margin-top: 0;">`;
                            html += `<option value="" style="background: #0a0a0a;">Select Location...</option>`;
                            getKnownSectors().forEach(loc => {
                                if (!item[loc]) {
                                    const desc = SECTOR_DESCRIPTIONS[loc];
                                    html += `<option value="${loc}" style="background: #0a0a0a;" ${desc ? `title="${desc}"` : ''}>${loc}</option>`;
                                }
                            });
                            html += `</select>`;
                            html += `<button class="add-btn" onclick="addLocation(${i})" style="margin: 0; width: auto; padding: 4px 8px;">+</button>`;
                            html += `</div>`;
                        }
                        html += `</div>`;
                    }
                    html += `</div>`;
                });
                if (selectedFile === 'puzzles.json') {
                    html += `<button class="add-btn" onclick="openPuzzleWizard()">+ New Puzzle (Wizard)</button>`;
                } else if (selectedFile === 'finales.json' || selectedFile === 'foreshadow.json') {
                    // finales.json and foreshadow.json must stay index-aligned (see Data
                    // Validation's sync check), which is exactly the class of mistake a
                    // guided wizard exists to prevent — so route both files' "add" through
                    // it instead of a plain addEntry() that only touches one side.
                    html += `<button class="add-btn" onclick="openFinaleWizard()">+ New Finale (Wizard)</button>`;
                } else {
                    html += `<button class="add-btn" onclick="addEntry(null)">+ Add Entry</button>`;
                }
                
            } else if (isObjectRoot()) {
                addCatBtn.style.display = 'block';
                
                Object.keys(fileData).forEach(cat => {
                    const isExpanded = expandedCategory === cat;
                    const catData = fileData[cat];
                    const isCatArray = Array.isArray(catData);
                    
                    if (selectedFile === 'parameters.json' || selectedFile === 'threads.json') {
                         const isChildActive = selectedCategory === cat;
                         const renameBtn = selectedFile === 'threads.json'
                             ? `<button class="delete-btn" style="opacity:0.6; color:var(--accent-amber);" title="Rename this thread everywhere it's used" onclick="event.stopPropagation(); renameThreadEverywhere('${cat}')">✎</button>`
                             : '';
                         html += `<div class="tree-item-row group">
                            <button class="tree-btn ${isChildActive ? 'active bold' : ''}" onclick="selectNode(null, '${cat}')">
                                ▶ ${cat}
                            </button>
                            ${renameBtn}
                        </div>`;
                        return;
                    }
                    
                    const isPrimitive = typeof catData !== 'object' || catData === null;
                    const isActivePrim = selectedCategory === cat && isPrimitive;
                    
                    html += `<div class="tree-item">
                        <div class="tree-item-row group">
                            <button class="tree-btn ${(isExpanded && !isPrimitive) || isActivePrim ? 'active bold' : ''}" onclick="${isPrimitive ? `selectNode(null, '${cat}')` : `toggleCat('${cat}')`}">
                                ${isPrimitive ? '• ' : (isExpanded ? '▼ ' : '▶ ')} ${cat}
                            </button>
                            ${isExpanded && isCatArray ? `<button class="add-btn" style="width:auto; margin:0; border:none;" onclick="addEntry('${cat}')">+</button>` : ''}
                        </div>`;
                    
                    if (isExpanded && !isPrimitive) {
                        html += `<div class="tree-children">`;
                        if (isCatArray) {
                            if (catData.length === 0) {
                                html += `<div style="font-size:10px; color:#6b7280; padding:4px;">No entries</div>`;
                            } else {
                                catData.forEach((_, i) => {
                                    const isChildActive = selectedCategory === cat && selectedIndex === i;
                                    const entryLocked = isLockedEntry(catData[i]);
                                    const entryDeleteControl = entryLocked
                                        ? `<span class="delete-btn" style="padding:4px; font-size:12px; opacity:0.5; cursor:default;" title="Factory default — can't be deleted, but you can still edit it">🔒</span>`
                                        : `<button class="delete-btn" style="padding:4px; font-size:12px;" onclick="deleteEntry('${cat}', ${i})">×</button>`;
                                    html += `<div class="tree-item-row group">
                                        <button class="tree-child-btn ${isChildActive ? 'active' : ''}" onclick="selectNode(${i}, '${cat}')">
                                            ${catData[i]?.title || 'Entry ' + i}
                                        </button>
                                        ${entryDeleteControl}
                                    </div>`;
                                });
                            }
                        } else {
                            const isChildActive = selectedCategory === cat && selectedIndex === null;
                            let btnText = 'Edit Data';
                            if (selectedFile === 'threads.json') btnText = 'Edit Thread';
                            else if (selectedFile === 'parameters.json' && cat === 'VARS') btnText = 'Edit Variables';
                            html += `<button class="tree-child-btn ${isChildActive ? 'active' : ''}" onclick="selectNode(null, '${cat}')">${btnText}</button>`;
                        }
                        html += `</div>`;
                    }
                    html += `</div>`;
                });
            }
            
            treeContentEl.innerHTML = html;
        }

        // Actions
        function clickArrayRow(i, isItemObj) {
            const isExpandable = isItemObj && selectedFile !== 'finales.json' && selectedFile !== 'puzzles.json';
            if (isExpandable) {
                expandedCategory = (expandedCategory === String(i)) ? null : String(i);
                selectedIndex = i;
                selectedCategory = null;
            } else {
                selectedIndex = i;
                selectedCategory = null;
            }
            renderTree();
            renderEditor();
        }

        function toggleCat(cat) {
            expandedCategory = (expandedCategory === cat) ? null : cat;
            renderTree();
        }

        function selectNode(index, cat = null) {
            selectedIndex = index;
            selectedCategory = cat;
            renderTree();
            renderEditor();
        }

        function addCategory() {
            const cat = prompt("Enter new category:");
            if (cat && !fileData[cat]) {
                fileData[cat] = selectedFile === 'threads.json' ? { title: "", description: "" } : [];
                expandedCategory = cat;
                renderTree();
            }
        }

        function addEntry(cat) {
            if (cat) {
                // clues.json entries are always CIPHER (see renderEditor's clues.json
                // branch) — default the template to match so a brand-new entry doesn't
                // briefly disagree with the locked field before the next render.
                const template = { text: "", thread: selectedFile === 'clues.json' ? 'CIPHER' : 'UNCLASSIFIED', type: "document" };
                if (!Array.isArray(fileData[cat])) fileData[cat] = [fileData[cat], template];
                else fileData[cat].push(template);
                expandedCategory = cat;
                selectedCategory = cat;
                selectedIndex = fileData[cat].length - 1;
            } else {
                let template;
                if (selectedFile === 'foreshadow.json') {
                    template = { "ANNEX": {text:"", thread:"TELL", type:"document"}, "ARCHIVE": {text:"", thread:"TELL", type:"document"}, "SERVER": {text:"", thread:"TELL", type:"document"}, "CLINIC": {text:"", thread:"TELL", type:"document"}, "CHASM": {text:"", thread:"TELL", type:"document"} };
                    if (linkedData) linkedData.push({ option: "", text: "" });
                } else if (selectedFile === 'finales.json') {
                    template = { option: "NEW FINALE OPTION", text: "NEW FINALE TEXT", thread: "TELL", tell_title: "", tell_description: "" };
                    if (linkedData) linkedData.push({ "ANNEX": {text:"", thread:"TELL", type:"document"}, "ARCHIVE": {text:"", thread:"TELL", type:"document"}, "SERVER": {text:"", thread:"TELL", type:"document"}, "CLINIC": {text:"", thread:"TELL", type:"document"}, "CHASM": {text:"", thread:"TELL", type:"document"} });
                } else {
                    template = (fileData.length > 0 && typeof fileData[0] === 'object' && !Array.isArray(fileData[0])) ? {} : "";
                }
                fileData.push(template);
                selectedIndex = fileData.length - 1;
                if (typeof template === 'object') {
                    expandedCategory = String(selectedIndex);
                    selectedCategory = null;
                }
            }
            renderTree();
            renderEditor();
        }

        function deleteEntry(cat, i) {
            const target = cat ? fileData[cat][i] : fileData[i];
            if (isLockedEntry(target)) {
                alert("This entry is part of the factory-default lore and can't be deleted. You can still edit its contents.");
                return;
            }
            if (!confirm("Delete entry?")) return;
            if (cat) {
                fileData[cat].splice(i, 1);
            } else {
                fileData.splice(i, 1);
                if (linkedData && (selectedFile === 'foreshadow.json' || selectedFile === 'finales.json')) {
                    linkedData.splice(i, 1);
                }
            }
            selectedIndex = null;
            renderTree();
            renderEditor();
        }

        function addLocation(i) {
            const select = document.getElementById(`loc-select-${i}`);
            const key = select ? select.value : null;
            if (key && !fileData[i][key]) {
                fileData[i][key] = "";
                selectedIndex = i;
                selectedCategory = key;
                renderTree();
                renderEditor();
            }
        }

        function deleteLocation(i, key) {
            const target = fileData[i] ? fileData[i][key] : null;
            if (isLockedEntry(target)) {
                alert("This location is part of the factory-default lore and can't be deleted. You can still edit its contents.");
                return;
            }
            if (!confirm("Delete location?")) return;
            delete fileData[i][key];
            if (selectedIndex === i && selectedCategory === key) {
                selectedCategory = null;
            }
            renderTree();
            renderEditor();
        }

        // Editor Render & Update
        function getCurrentEditorData() {
            if (isArrayRoot() && selectedIndex !== null) {
                if (selectedCategory) return fileData[selectedIndex][selectedCategory];
                return fileData[selectedIndex];
            } else if (isObjectRoot() && selectedCategory) {
                if (selectedIndex !== null && Array.isArray(fileData[selectedCategory])) {
                    return fileData[selectedCategory][selectedIndex];
                }
                return fileData[selectedCategory];
            }
            return null;
        }

        function renderEditor() {
            const val = getCurrentEditorData();
            if (val === null || val === undefined) {
                document.getElementById('editor-content-area').style.display = 'none';
                document.getElementById('editor-empty-state').style.display = 'flex';
                return;
            }

            document.getElementById('editor-content-area').style.display = 'flex';
            document.getElementById('editor-empty-state').style.display = 'none';

            let title = 'Array Data';
            if (selectedCategory) title = selectedCategory;
            else if (selectedFile === 'foreshadow.json') title = 'Finale Group';
            
            let subtitle = selectedIndex !== null ? `/ Entry ${selectedIndex}` : '';
            document.getElementById('editor-title').innerHTML = `${title} <span class="editor-subtitle">${subtitle}</span>`;

            // Hint Box (Foreshadow)
            const hintBox = document.getElementById('hint-box');
            if (selectedFile === 'foreshadow.json' && linkedData && selectedIndex !== null) {
                hintBox.style.display = 'block';
                document.getElementById('hint-title').innerText = `Target Finale (Index ${selectedIndex})`;
                document.getElementById('hint-text').innerText = linkedData[selectedIndex]?.option || '';
            } else {
                hintBox.style.display = 'none';
            }

            if (selectedFile === 'parameters.json' && typeof val === 'string' && selectedCategory && selectedCategory === 'VARS') {
                try {
                    fileData[selectedCategory] = JSON.parse(val);
                } catch (e) {
                    fileData[selectedCategory] = {};
                }
                renderEditor();
                return;
            }

            const isNamesArray = selectedFile === 'parameters.json' && Array.isArray(val) && (val.length === 0 || typeof val[0] === 'string');
            const isVarsObj = val && typeof val === 'object' && !Array.isArray(val) && selectedCategory && 
                ((selectedFile === 'parameters.json' && selectedCategory === 'VARS') || (selectedFile === 'puzzles.json' && selectedCategory === 'LOCK_THREADS'));
            const isPuzzleObj = selectedFile === 'puzzles.json' && selectedCategory === null && typeof val === 'object' && !Array.isArray(val);
            
            if (isNamesArray || isVarsObj || isPuzzleObj) {
                if (!isPuzzleObj) document.getElementById('textarea-container').style.display = 'none';
                else document.getElementById('textarea-container').style.display = 'flex';
                
                if (!isPuzzleObj) document.getElementById('tag-box').style.display = 'none';
                document.getElementById('names-container').style.display = 'flex';
                document.getElementById('names-add-box').style.display = 'flex';
                
                const namesLabel = document.getElementById('names-container-label');
                if (namesLabel) namesLabel.style.display = isPuzzleObj ? 'block' : 'none';
                
                if (isVarsObj || isPuzzleObj) {
                    document.getElementById('names-input-key').style.display = 'block';
                    document.getElementById('names-input').placeholder = "Value...";
                    renderVarsList();
                } else {
                    document.getElementById('names-input-key').style.display = 'none';
                    document.getElementById('names-input').placeholder = "Add new entry...";
                    renderNamesList();
                }
                if (!isPuzzleObj) {
                    document.getElementById('template-preview').style.display = 'none';
                    document.getElementById('template-issues-banner').style.display = 'none';
                    document.getElementById('thread-corrob-badge').innerHTML = '';
                    return;
                }
            } else {
                document.getElementById('textarea-container').style.display = 'flex';
                document.getElementById('names-container').style.display = 'none';
                document.getElementById('names-add-box').style.display = 'none';
                document.getElementById('names-input-key').style.display = 'none';
                const namesLabel = document.getElementById('names-container-label');
                if (namesLabel) namesLabel.style.display = 'none';
            }

            // Tag Box (Any Lore Object)
            const tagBox = document.getElementById('tag-box');
            const tagInput = document.getElementById('tag-input');
            const typeInput = document.getElementById('type-input');
            
            // Treat as lore obj if it has text, thread, or type, or is in lore.json/clues.json/foreshadow.json
            const isLoreDataFile = ['lore.json', 'clues.json', 'foreshadow.json', 'finales.json', 'threads.json'].includes(selectedFile);
            const isLoreObj = val && typeof val === 'object' && !Array.isArray(val) && 
                (isLoreDataFile || 'text' in val || 'thread' in val || 'type' in val || 'description' in val);
            
            const isFinaleGroup = isArrayRoot() && !selectedCategory && ['foreshadow.json', 'finales.json'].includes(selectedFile);
            if (isLoreObj || isPuzzleObj) {
                tagBox.style.display = 'flex';
                
                if (isPuzzleObj) {
                    document.getElementById('title-label').innerHTML = 'ID:<span class="help-icon">?</span>';
                    document.getElementById('title-input').value = val.id || '';
                    document.getElementById('title-input').parentElement.title = 'Internal Puzzle ID';
                    
                    document.getElementById('type-input').parentElement.style.display = 'none';
                    document.getElementById('thread-container').style.display = 'none';
                    document.getElementById('puzzle-container').style.display = 'none';
                    document.getElementById('option-container').style.display = 'none';
                    document.getElementById('finale-meta-container').style.display = 'none';

                    document.getElementById('main-textarea-label').style.display = 'block';
                    document.getElementById('main-textarea-label').innerText = 'Access Code:';
                    if (document.getElementById('main-textarea-hint')) {
                        document.getElementById('main-textarea-hint').style.display = 'block';
                        document.getElementById('main-textarea-hint').innerText = 'Javascript execution string for validating access.';
                    }
                } else {
                    // clues.json entries are only ever the CIPHER thread in practice — every
                    // existing entry already uses it, and the puzzle-gating (`puzzle` field)
                    // is what actually distinguishes one clue from another, not the thread
                    // name. Rather than make authors type/pick "CIPHER" by hand (and risk a
                    // stray value slipping through), lock the field to CIPHER and let the
                    // Puzzle checkboxes do the real work — mirroring how TELL is implicit for
                    // finales.json/foreshadow.json instead of being manually chosen.
                    if (selectedFile === 'clues.json') {
                        if (val.thread !== 'CIPHER') val.thread = 'CIPHER';
                        tagInput.value = 'CIPHER';
                        tagInput.readOnly = true;
                        tagInput.classList.add('input-locked');
                    } else {
                        tagInput.value = val.thread || '';
                        tagInput.readOnly = false;
                        tagInput.classList.remove('input-locked');
                    }
                    typeInput.value = val.type || 'document';
                    document.getElementById('title-label').innerHTML = isFinaleGroup ? 'Nickname:<span class="help-icon">?</span>' : 'Title:<span class="help-icon">?</span>';
                    document.getElementById('title-input').value = isFinaleGroup ? (val.nickname || '') : (val.title || '');
                    document.getElementById('title-input').parentElement.title = 'Internal identifier, not shown to players.';
                    document.getElementById('thread-container').style.display = (selectedFile === 'foreshadow.json' || selectedFile === 'finales.json' || selectedFile === 'threads.json') ? 'none' : 'flex';
                    document.getElementById('type-input').parentElement.style.display = (isFinaleGroup || selectedFile === 'threads.json') ? 'none' : 'flex';
                    
                    if (selectedFile === 'clues.json') {
                        document.getElementById('puzzle-container').style.display = 'flex';
                        updatePuzzleSuggestions();
                    } else {
                        document.getElementById('puzzle-container').style.display = 'none';
                    }

                    if (selectedFile === 'finales.json') {
                        document.getElementById('option-container').style.display = 'flex';
                        document.getElementById('finale-meta-container').style.display = 'flex';
                        document.getElementById('option-textarea').value = val.option || '';
                        document.getElementById('tell-title-input').value = val.tell_title || '';
                        document.getElementById('tell-desc-textarea').value = val.tell_description || '';
                    } else {
                        document.getElementById('option-container').style.display = 'none';
                        document.getElementById('finale-meta-container').style.display = 'none';
                    }

                    if (isFinaleGroup) {
                        document.getElementById('main-textarea-label').style.display = 'block';
                        document.getElementById('main-textarea-label').innerText = 'Description:';
                        if (document.getElementById('main-textarea-hint')) {
                            document.getElementById('main-textarea-hint').style.display = 'block';
                            document.getElementById('main-textarea-hint').innerText = 'Internal notes about this finale group. Not shown to players.';
                        }
                    } else if (selectedFile === 'threads.json') {
                        document.getElementById('main-textarea-label').style.display = 'block';
                        document.getElementById('main-textarea-label').innerText = 'Description:';
                        if (document.getElementById('main-textarea-hint')) {
                            document.getElementById('main-textarea-hint').style.display = 'block';
                            document.getElementById('main-textarea-hint').innerText = 'Summary of this thread for developer reference.';
                        }
                    } else {
                        document.getElementById('main-textarea-label').style.display = 'block';
                        document.getElementById('main-textarea-label').innerText = 'Text:';
                        if (document.getElementById('main-textarea-hint')) {
                            document.getElementById('main-textarea-hint').style.display = 'block';
                        }
                    }
                }
            } else {
                tagBox.style.display = 'none';
                document.getElementById('option-container').style.display = 'none';
                document.getElementById('finale-meta-container').style.display = 'none';
                document.getElementById('main-textarea-label').style.display = 'none';
                if (document.getElementById('main-textarea-hint')) document.getElementById('main-textarea-hint').style.display = 'none';
            }

            if (isLoreObj) {
                const isDescField = selectedFile === 'threads.json' || (isFinaleGroup && selectedFile === 'foreshadow.json');
                mainTextarea.value = isDescField ? (val.description !== undefined ? val.description : '') : (val.text !== undefined ? val.text : '');
            } else if (isPuzzleObj) {
                mainTextarea.value = val.ACCESS_CODE || '';
            } else {
                const isString = typeof val === 'string';
                mainTextarea.value = isString ? val : JSON.stringify(val, null, 2);
            }

            updateLivePreview();
            refreshThreadBadge();
        }

        // Input Listeners
        document.getElementById('option-textarea').addEventListener('input', (e) => {
            let val = e.target.value;
            const original = getCurrentEditorData();
            if (original && typeof original === 'object' && selectedFile === 'finales.json') {
                if (isArrayRoot()) {
                    if (selectedCategory) fileData[selectedIndex][selectedCategory].option = val;
                    else fileData[selectedIndex].option = val;
                }
            }
        });

        document.getElementById('tell-title-input').addEventListener('input', (e) => {
            let val = e.target.value;
            const original = getCurrentEditorData();
            if (original && typeof original === 'object' && selectedFile === 'finales.json') {
                if (isArrayRoot()) {
                    if (selectedCategory) fileData[selectedIndex][selectedCategory].tell_title = val;
                    else fileData[selectedIndex].tell_title = val;
                }
            }
        });

        document.getElementById('tell-desc-textarea').addEventListener('input', (e) => {
            let val = e.target.value;
            const original = getCurrentEditorData();
            if (original && typeof original === 'object' && selectedFile === 'finales.json') {
                if (isArrayRoot()) {
                    if (selectedCategory) fileData[selectedIndex][selectedCategory].tell_description = val;
                    else fileData[selectedIndex].tell_description = val;
                }
            }
        });

        mainTextarea.addEventListener('input', (e) => {
            updateLivePreview();

            let val = e.target.value;
            const original = getCurrentEditorData();

            const isLoreDataFile = ['lore.json', 'clues.json', 'foreshadow.json', 'finales.json', 'threads.json'].includes(selectedFile);
            const isLoreObj = original && typeof original === 'object' && !Array.isArray(original) && 
                (isLoreDataFile || 'text' in original || 'thread' in original || 'type' in original || 'description' in original);
            const isPuzzleObj = selectedFile === 'puzzles.json' && selectedCategory === null && original && typeof original === 'object' && !Array.isArray(original);

            if (isLoreObj || isPuzzleObj) {
                if (isPuzzleObj) {
                    if (isArrayRoot()) fileData[selectedIndex].ACCESS_CODE = val;
                    return;
                }
                const isFinaleGroup = isArrayRoot() && !selectedCategory && ['foreshadow.json', 'finales.json'].includes(selectedFile);
                const textKey = (selectedFile === 'threads.json' || (isFinaleGroup && selectedFile === 'foreshadow.json')) ? 'description' : 'text';
                if (isArrayRoot()) {
                    if (selectedCategory) fileData[selectedIndex][selectedCategory][textKey] = val;
                    else fileData[selectedIndex][textKey] = val;
                }
                else if (isObjectRoot()) {
                    if (selectedIndex !== null) fileData[selectedCategory][selectedIndex][textKey] = val;
                    else fileData[selectedCategory][textKey] = val;
                }
                return;
            }

            if (typeof original !== 'string') {
                try { val = JSON.parse(val); } catch(e){} // wait for valid json
            }
            
            if (isArrayRoot()) {
                if (selectedCategory) fileData[selectedIndex][selectedCategory] = val;
                else fileData[selectedIndex] = val;
            } else if (isObjectRoot()) {
                if (selectedIndex !== null) fileData[selectedCategory][selectedIndex] = val;
                else fileData[selectedCategory] = val;
            }
        });

        document.getElementById('tag-input').addEventListener('change', (e) => {
            let val = e.target.value.toUpperCase().trim();
            const hintEl = document.getElementById('thread-constraint-hint');

            if (selectedFile === 'lore.json' && (val === 'CIPHER' || val === 'TELL')) {
                val = 'UNCLASSIFIED';
                e.target.value = val;
                if (hintEl) { hintEl.style.display = 'inline'; hintEl.innerText = 'CIPHER/TELL belong in clues.json — reset to UNCLASSIFIED.'; }
            } else if (selectedFile === 'clues.json' && val !== 'CIPHER' && val !== 'TELL') {
                val = 'CIPHER';
                e.target.value = val;
                if (hintEl) { hintEl.style.display = 'inline'; hintEl.innerText = 'Clues must use CIPHER or TELL — reset to CIPHER.'; }
            } else {
                e.target.value = val;
                if (hintEl) { hintEl.style.display = 'none'; hintEl.innerText = ''; }
            }

            const original = getCurrentEditorData();
            const isLoreDataFile = ['lore.json', 'clues.json', 'foreshadow.json', 'finales.json'].includes(selectedFile);
            const isLoreObj = original && typeof original === 'object' && !Array.isArray(original) &&
                (isLoreDataFile || 'text' in original || 'thread' in original || 'type' in original);
            if (isLoreObj) {
                if (isArrayRoot()) {
                    if (selectedCategory) fileData[selectedIndex][selectedCategory].thread = val;
                    else fileData[selectedIndex].thread = val;
                }
                else if (isObjectRoot()) {
                    if (selectedIndex !== null) fileData[selectedCategory][selectedIndex].thread = val;
                    else fileData[selectedCategory].thread = val;
                }
            }
            refreshThreadBadge();
        });

        document.getElementById('type-input').addEventListener('change', (e) => {
            const val = e.target.value;
            const original = getCurrentEditorData();
            const isLoreDataFile = ['lore.json', 'clues.json', 'foreshadow.json', 'finales.json'].includes(selectedFile);
            const isLoreObj = original && typeof original === 'object' && !Array.isArray(original) && 
                (isLoreDataFile || 'text' in original || 'thread' in original || 'type' in original);
            if (isLoreObj) {
                if (isArrayRoot()) {
                    if (selectedCategory) fileData[selectedIndex][selectedCategory].type = val;
                    else fileData[selectedIndex].type = val;
                }
                else if (isObjectRoot()) {
                    if (selectedIndex !== null) fileData[selectedCategory][selectedIndex].type = val;
                    else fileData[selectedCategory].type = val;
                }
            }
        });

        document.getElementById('title-input').addEventListener('input', (e) => {
            const val = e.target.value;
            const original = getCurrentEditorData();
            const isLoreDataFile = ['lore.json', 'clues.json', 'foreshadow.json', 'finales.json'].includes(selectedFile);
            const isLoreObj = original && typeof original === 'object' && !Array.isArray(original) && 
                (isLoreDataFile || 'text' in original || 'thread' in original || 'type' in original);
            const isPuzzleObj = selectedFile === 'puzzles.json' && selectedCategory === null && original && typeof original === 'object' && !Array.isArray(original);
            
            if (isLoreObj || isPuzzleObj) {
                if (isArrayRoot()) {
                    if (isPuzzleObj) {
                        fileData[selectedIndex].id = val;
                    }
                    else if (selectedCategory) {
                        fileData[selectedIndex][selectedCategory].title = val;
                    } else {
                        fileData[selectedIndex].nickname = val;
                        if (linkedData && linkedData[selectedIndex]) {
                            linkedData[selectedIndex].nickname = val;
                        }
                    }
                }
                else if (isObjectRoot()) {
                    if (selectedIndex !== null) fileData[selectedCategory][selectedIndex].title = val;
                    else fileData[selectedCategory].title = val;
                }
                renderTree();
            }
        });


        // Save
        async function handleSave() {
            const btn = document.getElementById('save-btn');
            btn.disabled = true;
            btn.innerText = 'Saving...';
            
            try {
                await postFile(selectedFile, fileData);

                if (linkedData && (selectedFile === 'foreshadow.json' || selectedFile === 'finales.json')) {
                    const linkedFile = selectedFile === 'foreshadow.json' ? 'finales.json' : 'foreshadow.json';
                    await postFile(linkedFile, linkedData);
                }

                if (selectedFile === 'parameters.json') {
                    paramsData = fileData;
                    renderVariableToolbar();
                }
                if (selectedFile === 'puzzles.json') {
                    puzzlesData = fileData;
                }
                // Keep the cross-file cache (corroboration badges, reachability, sector
                // list) in sync with whatever was just saved, so QOL feedback never shows
                // stale numbers for the file you just edited.
                if (['lore.json', 'clues.json', 'foreshadow.json', 'finales.json', 'threads.json', 'puzzles.json'].includes(selectedFile)) {
                    crossFileCache[selectedFile] = fileData;
                    if (linkedData && selectedFile === 'foreshadow.json') crossFileCache['finales.json'] = linkedData;
                    if (linkedData && selectedFile === 'finales.json') crossFileCache['foreshadow.json'] = linkedData;
                }

                btn.innerText = 'Saved!';
                setTimeout(() => { btn.innerText = 'Save Changes'; btn.disabled = false; }, 2000);
            } catch (err) {
                alert('Save failed: ' + err.message);
                btn.innerText = 'Save Changes';
                btn.disabled = false;
            }
        }

