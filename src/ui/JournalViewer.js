/**
 * [ROLE] Manages the UI overlay for the player's personal Journal (PDA).
 * [WHY] Allows the player to review all collected narrative fragments at any time.
 * [STATE] Stateful. Tracks the selected entry index and typewriter interval.
 * [DEPENDS] DOM elements (`journal-overlay`), CustomEvents (`somatic-journal-toggle`).
 */
export default class JournalViewer {
    constructor(player, acoustics, getStoryFn) {
        this.player = player;
        this.acoustics = acoustics;
        this.getStory = getStoryFn;
        
        this.overlay = document.getElementById('journal-overlay');
        this.listEl = document.getElementById('journal-list');
        this.contentPane = document.getElementById('journal-content-pane');
        
        this.typeWriterInterval = null;
        this.isOpen = false;
        
        this._bindEvents();
    }

    _bindEvents() {
        document.addEventListener('somatic-journal-toggle', () => {
            if (this.player.input.state.isReading && !this.isOpen) {
                // If reading a document, don't open journal
                return;
            }
            this.toggleJournal();
        });
        
        // Ensure pressing E closes the journal if it's open, as E is the standard exit key
        document.addEventListener('somatic-close-document', () => {
            if (this.isOpen) {
                this.closeJournal();
            }
        });
    }

    toggleJournal() {
        if (this.isOpen) {
            this.closeJournal();
        } else {
            this.openJournal();
        }
    }

    openJournal() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.player.input.state.isReading = true; // Suspend movement
        this.player.input.state.isRunning = false;
        
        this.player.input.cursorX = window.innerWidth / 2;
        this.player.input.cursorY = window.innerHeight / 2;
        document.getElementById('virtual-cursor').classList.add('active');
        
        this.acoustics.triggerSomaticEvent('terminal_click', 1.0, 0.5);
        this.overlay.classList.add('active');
        
        this.populateList();
        
        // Default select first item if available
        if (this.getStory().collected.length > 0) {
            this.selectEntry(0);
        } else {
            this.contentPane.innerHTML = '<div class="journal-placeholder">No data archived yet.</div>';
        }
    }

    closeJournal() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.player.input.state.isReading = false;
        
        if (this.typeWriterInterval) {
            clearInterval(this.typeWriterInterval);
            this.typeWriterInterval = null;
        }
        
        this.overlay.classList.remove('active');
        document.getElementById('virtual-cursor').classList.remove('active');
        this.acoustics.triggerSomaticEvent('terminal_click', 1.0, 0.5);
    }

    populateList() {
        this.listEl.innerHTML = '';
        const story = this.getStory();
        
        if (story.collected.length === 0) {
            const li = document.createElement('li');
            li.style.padding = '1rem';
            li.style.color = 'rgba(255, 176, 0, 0.5)';
            li.style.fontStyle = 'italic';
            li.innerText = 'EMPTY';
            this.listEl.appendChild(li);
            return;
        }

        // Group by thread
        const groups = {};
        story.collected.forEach((text, index) => {
            const threadId = story.threadOf.get(text);
            const key = threadId || 'UNCLASSIFIED';
            if (!groups[key]) groups[key] = [];
            groups[key].push({ text, index, threadId });
        });

        // Render groups
        for (const [key, items] of Object.entries(groups)) {
            // Create a group header
            const header = document.createElement('div');
            header.className = 'journal-group-header';
            
            if (key === 'UNCLASSIFIED') {
                header.innerText = '[ UNCLASSIFIED DATA ]';
            } else {
                let label = story.threadLabel(key);
                header.innerText = label;
                
                if (key === 'TELL') {
                    header.classList.add('glitch-text');
                }
                
                if (story.corroborated.has(key)) {
                    header.innerText += ' [VERIFIED]';
                    header.classList.add('verified-thread');
                }
            }
            this.listEl.appendChild(header);

            // Render items in group
            items.forEach(item => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.className = 'journal-entry-btn';
                
                // Extract the first line as a title
                let title = item.text.split('\n')[0].trim();
                if (title.length > 35) title = title.substring(0, 32) + '...';
                if (!title) title = `ENTRY ${item.index + 1}`;
                
                // Strip out ">>" if present for cleaner look
                title = title.replace(/^>>\s*/, '');
                
                if (key === 'TELL') {
                    btn.classList.add('glitch-item');
                }

                btn.innerText = title;
                btn.onclick = () => this.selectEntry(item.index, btn);
                
                li.appendChild(btn);
                this.listEl.appendChild(li);
            });
        }
    }

    selectEntry(index, btnEl = null) {
        if (this.typeWriterInterval) {
            clearInterval(this.typeWriterInterval);
            this.typeWriterInterval = null;
        }
        
        // Update selection styling
        const buttons = this.listEl.querySelectorAll('.journal-entry-btn');
        buttons.forEach(b => b.classList.remove('selected'));
        if (btnEl) {
            btnEl.classList.add('selected');
        } else if (buttons.length > index) {
            buttons[index].classList.add('selected');
        }
        
        this.acoustics.triggerSomaticEvent('terminal_blip', 1.0, 0.2);
        
        const text = this.getStory().collected[index];
        this.contentPane.textContent = '';
        
        let i = 0;
        this.typeWriterInterval = setInterval(() => {
            if (i < text.length) {
                this.contentPane.textContent += text.charAt(i);
                if (text.charAt(i) !== ' ' && text.charAt(i) !== '\n' && Math.random() > 0.4) {
                    this.acoustics.triggerSomaticEvent('terminal_blip', 0.5, 0.1);
                }
                i++;
            } else {
                clearInterval(this.typeWriterInterval);
                this.typeWriterInterval = null;
            }
        }, 15);
    }
}
