/**
 * [ROLE] Editor bootstrap -- loads the HowTo doc, core parameter/puzzle data, and the file list on page load.
 * [WHY] Keeps startup fetch sequencing in one place instead of scattering initial loads across every panel module.
 * [STATE] Populates the shared globals declared in state.js (paramsData, puzzlesData, files) as a side effect; runs once via the trailing init() call.
 * [DEPENDS] Fetches editor_server.js's /api/data endpoints; assumes renderVariableToolbar and renderFileList (rendering.js) are already defined globally.
 */
async function init() {
            try {
                fetch('/HowTo.md').then(res => res.text()).then(text => {
                    const contentDiv = document.getElementById('welcome-msg-content');
                    if (contentDiv) contentDiv.innerHTML = marked.parse(text);
                }).catch(err => console.error('Failed to load HowTo.md', err));

                const namesRes = await fetch('/api/data?file=parameters.json');
                const nData = await namesRes.json();
                if (nData.content) {
                    paramsData = nData.content;
                    renderVariableToolbar();
                }

                const puzzlesRes = await fetch('/api/data?file=puzzles.json');
                const puzzlesJson = await puzzlesRes.json();
                puzzlesData = puzzlesJson.content || [];
                await Promise.all([
                    getCrossFileData('lore.json', true),
                    getCrossFileData('clues.json', true),
                    getCrossFileData('foreshadow.json', true),
                    getCrossFileData('threads.json', true)
                ]);

                const res = await fetch('/api/data');
                const data = await res.json();
                if (data.files) {
                    files = data.files;
                    renderFileList();
                }
            } catch (err) {
                console.error('Failed to load files', err);
            }
        }


init();
