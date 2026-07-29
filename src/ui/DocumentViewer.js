/**
 * Manages the overlay UI for reading notes, terminals, and listening to tapes.
 *
 * This class uses CSS classes (`terminal-mode`, `tape-mode`) applied to a single
 * overlay element to radically change the presentation of the text. This is much more efficient
 * than having five different DOM overlays for different item types.
 */
export default class DocumentViewer {
    constructor(player, acoustics, getStoryFn) {
        this.player = player;
        this.acoustics = acoustics;
        this.getStory = getStoryFn;
        this.typeWriterInterval = null;
        this.terminalBrowseIndex = null;
    }

    terminalFooter(fragment) {
        let footer = `\n\n---\nDATA RECOVERED: [ ${fragment.progress.found} / ${fragment.progress.total} ]`;
        footer += this.getStory().collected.length > 1
            ? `\n[ ◄ ► BROWSE RECOVERED FILES ]`
            : `\n[ RE-ACCESS TERMINAL TO BROWSE RECOVERED FILES ]`;
        return footer;
    }

    /**
     * Binds the event listeners for opening, closing, and navigating documents.
     *
     * Notice the typewriter effect for terminals and tapes using `setInterval`.
     * Audio blips are synced to the character rendering rate, with a random chance to skip a blip
     * to make it sound organic rather than perfectly robotic.
     */
    bindEvents() {
        document.addEventListener('somatic-doc-nav', (e) => {
            if (this.terminalBrowseIndex === null) return;
            const story = this.getStory();
            if (story.collected.length < 2) return;
            this.terminalBrowseIndex += e.detail.dir;
            const file = story.getArchiveFile(this.terminalBrowseIndex);
            this.terminalBrowseIndex = file.archiveIndex;
            const docContent = document.getElementById('document-content');
            if (docContent) docContent.innerText = file.text + this.terminalFooter(file);
            this.acoustics.triggerSomaticEvent('item', 1.0, 0.15);
        });
        document.addEventListener('somatic-read', (e) => {
            if (this.player.input.state.isReading) return;
            this.player.input.state.isReading = true;
            this.player.input.state.isRunning = false;
            if (document.pointerLockElement) document.exitPointerLock();
            const docOverlay = document.getElementById('document-overlay');
            const docContent = document.getElementById('document-content');
            if (docContent) {
                const docId = e.detail ? e.detail.docId : null;
                const zone = e.detail ? e.detail.zone : null;
                const fragment = this.getStory().getFragment(docId, zone);
                const isTerminal = docId && String(docId).startsWith('PC_');
                let fullText = fragment.text + (isTerminal
                    ? this.terminalFooter(fragment)
                    : `\n\n---\nDATA RECOVERED: [ ${fragment.progress.found} / ${fragment.progress.total} ]`);
                this.terminalBrowseIndex = null;
                if (isTerminal) {
                    this.terminalBrowseIndex = fragment.archiveIndex !== undefined
                        ? fragment.archiveIndex
                        : this.getStory().collected.length - 1;
                }
                docOverlay.className = '';
                if (isTerminal) {
                    docOverlay.classList.add('terminal-mode');
                    docContent.innerText = '';
                    if (docOverlay) docOverlay.style.display = 'block';
                    this.acoustics.triggerSomaticEvent('terminal_click', 1.0, 0.5);
                    let i = 0;
                    this.typeWriterInterval = setInterval(() => {
                        if (i < fullText.length) {
                            docContent.innerText += fullText.charAt(i);
                            if (fullText.charAt(i) !== ' ' && fullText.charAt(i) !== '\n' && Math.random() > 0.4) {
                                this.acoustics.triggerSomaticEvent('terminal_blip', 1.0, 0.15);
                            }
                            i++;
                        } else {
                            clearInterval(this.typeWriterInterval);
                            this.typeWriterInterval = null;
                            this.acoustics.triggerSomaticEvent('terminal_click', 1.0, 0.4);
                        }
                    }, 15);
                } else if (docId && String(docId).startsWith('TAPE_')) {
                    docOverlay.classList.add('tape-mode');
                    docContent.innerText = '';
                    if (docOverlay) docOverlay.style.display = 'block';
                    this.acoustics.triggerSomaticEvent('tape_click', 1.0, 0.5);
                    let i = 0;
                    this.typeWriterInterval = setInterval(() => {
                        if (i < fullText.length) {
                            docContent.innerText += fullText.charAt(i);
                            if (fullText.charAt(i) !== ' ' && fullText.charAt(i) !== '\n' && Math.random() > 0.6) {
                                this.acoustics.triggerSomaticEvent('tape_garble', 1.0, 0.20);
                            }
                            i++;
                        } else {
                            clearInterval(this.typeWriterInterval);
                            this.typeWriterInterval = null;
                            this.acoustics.triggerSomaticEvent('tape_click', 1.0, 0.4);
                        }
                    }, 35);
                } else if (zone === 'IMPOUND') {
                    docOverlay.classList.add('clipboard-mode');
                    docContent.innerText = fullText;
                    if (docOverlay) docOverlay.style.display = 'block';
                    this.acoustics.triggerSomaticEvent('item', 1.0, 0.4);
                } else {
                    docContent.innerText = fullText;
                    if (docOverlay) docOverlay.style.display = 'block';
                    this.acoustics.triggerSomaticEvent('item', 1.0, 0.4);
                }
            }
        });
        document.addEventListener('somatic-close-document', () => {
            const inquestOverlay = document.getElementById('inquest-overlay');
            if (inquestOverlay && inquestOverlay.style.display === 'block') {
                return;
            }
            this.player.input.state.isReading = false;
            this.terminalBrowseIndex = null;
            const docOverlay = document.getElementById('document-overlay');
            const keypadOverlay = document.getElementById('keypad-overlay');
            if (this.typeWriterInterval) {
                clearInterval(this.typeWriterInterval);
                this.typeWriterInterval = null;
                this.acoustics.triggerSomaticEvent('tape_click', 1.0, 0.5);
            }
            if (keypadOverlay && keypadOverlay.style.display === 'block') {
                keypadOverlay.style.display = 'none';
                document.dispatchEvent(new Event('somatic-keypad-cancel'));
                this.acoustics.triggerSomaticEvent('door', 1.0, 0.3);
            } else if (docOverlay && docOverlay.style.display !== 'none') {
                docOverlay.style.display = 'none';
                this.player.coherence = Math.max(0.0, this.player.coherence - 0.15);
                this.acoustics.triggerSomaticEvent('item', 1.0, 0.2);
            }
        });
    }
}