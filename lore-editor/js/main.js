        // Init
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

                // Prefetch puzzles.json + the two "delivers a thread" source files. These
                // back the live corroboration badges, reachability badges, and the dynamic
                // sector list, so QOL feedback is available the instant an entry is opened
                // instead of after a round-trip.
                const puzzlesRes = await fetch('/api/data?file=puzzles.json');
                const puzzlesJson = await puzzlesRes.json();
                puzzlesData = puzzlesJson.content || [];
                await Promise.all([
                    getCrossFileData('lore.json', true),
                    getCrossFileData('clues.json', true),
                    getCrossFileData('foreshadow.json', true)
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


        // Start
        init();
