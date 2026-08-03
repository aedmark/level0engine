export default class KeypadController {
    constructor(player, acoustics, getStoryFn) {
        this.player = player;
        this.acoustics = acoustics;
        this.getStory = getStoryFn;
        this.currentKeypadInput = "";
    }

    handleKeypad(char) {
        const display = document.getElementById('keypad-display');
        if (!display) return;
        this.acoustics.triggerSomaticEvent('step', 1.0, 0.1);
        if (char === 'C') {
            this.currentKeypadInput = "";
            display.innerText = "_";
            display.style.color = "#55ff55";
        } else if (char === 'E') {
            const targetCode = this.getStory().accessCode;
            if (this.currentKeypadInput === targetCode) {
                display.innerText = "ACCEPTED";
                display.style.color = "#55ff55";
                setTimeout(() => {
                    document.dispatchEvent(new Event('somatic-keypad-success'));
                    const kp = document.getElementById('keypad-overlay');
                    if (kp) kp.style.display = 'none';
                    this.player.input.state.isReading = false;
                }, 500);
            } else {
                const lock = this.getStory().lockProgress();
                const missing = [];
                if (!lock.cipher) missing.push('RULE');
                if (!lock.epoch) missing.push('YEAR');
                if (!lock.pen) missing.push('PEN');
                display.innerText = missing.length ? 'DENIED — NO ' + missing.join(' / ') : 'DENIED';
                display.style.color = "#ff5555";
                this.acoustics.triggerSomaticEvent('breaker', 1.0, 0.5);
                setTimeout(() => {
                    this.currentKeypadInput = "";
                    display.innerText = "_";
                    display.style.color = "#55ff55";
                }, 1400);
            }
        } else {
            if (this.currentKeypadInput.length < 4) {
                this.currentKeypadInput += char;
                display.innerText = this.currentKeypadInput.padEnd(4, '_');
            }
        }
    }

    bindEvents() {
        document.addEventListener('somatic-keypad', () => {
            if (this.player.input.state.isReading) return;
            this.player.input.state.isReading = true;
            this.player.input.state.isRunning = false;
            if (document.pointerLockElement) document.exitPointerLock();
            this.currentKeypadInput = "";
            const display = document.getElementById('keypad-display');
            if (display) {
                display.innerText = "_";
                display.style.color = "#55ff55";
            }
            const keypadOverlay = document.getElementById('keypad-overlay');
            if (keypadOverlay) keypadOverlay.style.display = 'block';
            this.acoustics.triggerSomaticEvent('item', 1.0, 0.3);
        });
        document.addEventListener('keydown', (e) => {
            const keypadOverlay = document.getElementById('keypad-overlay');
            if (keypadOverlay && keypadOverlay.style.display !== 'none') {
                if (e.key >= '0' && e.key <= '9') {
                    this.handleKeypad(e.key);
                } else if (e.key.toLowerCase() === 'c' || e.key === 'Backspace' || e.key === 'Delete') {
                    this.handleKeypad('C');
                } else if (e.key === 'Enter') {
                    this.handleKeypad('E');
                }
            }
        });
        window.handleKeypad = (char) => this.handleKeypad(char);
    }
}