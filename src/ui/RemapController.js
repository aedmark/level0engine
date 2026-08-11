import InputBindings, { ACTION_NAMES } from '../system/InputBindings.js';

export default class RemapController {
    constructor() {
        this.modal = document.getElementById('remap-modal');
        this.closeBtn = document.getElementById('remap-close-btn');
        this.resetBtn = document.getElementById('remap-reset-btn');
        this.listContainer = document.getElementById('remap-list');
        this.listeningOverlay = document.getElementById('remap-listening');
        
        this.isListening = false;
        this.listenAction = null;
        this.listenType = null;
        this.gamepadPoll = null;

        if (this.modal) {
            this._bindEvents();
            this._buildList();
        }
    }

    _bindEvents() {
        this.closeBtn?.addEventListener('click', () => this.close());
        this.resetBtn?.addEventListener('click', () => {
            InputBindings.reset();
        });

        document.addEventListener('keydown', (e) => {
            if (this.isListening && this.listenType === 'keyboard') {
                e.preventDefault();
                if (e.code === 'Escape') {
                    this._stopListening();
                    return;
                }
                InputBindings.setKeyboardBinding(this.listenAction, e.code);
                this._stopListening();
            }
        });

        document.addEventListener('bindings-updated', () => {
            if (this.modal.style.display === 'block') {
                this._buildList();
            }
        });
        
        document.getElementById('customize-controls-btn')?.addEventListener('click', () => {
             this.open();
        });
    }

    _startGamepadPoll() {
        const poll = () => {
            if (!this.isListening || this.listenType !== 'gamepad') return;
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (let gp of gamepads) {
                if (!gp) continue;
                for (let i = 0; i < gp.buttons.length; i++) {
                    if (gp.buttons[i].pressed) {
                        InputBindings.setGamepadBinding(this.listenAction, i);
                        this._stopListening();
                        return;
                    }
                }
            }
            this.gamepadPoll = requestAnimationFrame(poll);
        };
        this.gamepadPoll = requestAnimationFrame(poll);
    }

    _stopListening() {
        this.isListening = false;
        this.listenAction = null;
        this.listenType = null;
        if (this.listeningOverlay) this.listeningOverlay.style.display = 'none';
        if (this.gamepadPoll) cancelAnimationFrame(this.gamepadPoll);
    }

    _buildList() {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';
        for (let action in ACTION_NAMES) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.marginBottom = '0.5rem';
            row.style.paddingBottom = '0.5rem';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

            const label = document.createElement('div');
            label.textContent = ACTION_NAMES[action];
            label.style.flex = '1';

            const kbBtn = document.createElement('button');
            kbBtn.className = 'btn';
            kbBtn.style.width = '120px';
            kbBtn.style.marginRight = '0.5rem';
            kbBtn.style.marginBottom = '0';
            kbBtn.textContent = InputBindings.getKeyboardString(action);
            kbBtn.onclick = () => {
                this.isListening = true;
                this.listenType = 'keyboard';
                this.listenAction = action;
                this.listeningOverlay.style.display = 'flex';
                this.listeningOverlay.querySelector('span').textContent = `Press any key for [${ACTION_NAMES[action]}]... (ESC to cancel)`;
            };

            const gpBtn = document.createElement('button');
            gpBtn.className = 'btn';
            gpBtn.style.width = '120px';
            gpBtn.style.marginBottom = '0';
            gpBtn.textContent = InputBindings.getGamepadString(action);
            gpBtn.onclick = () => {
                this.isListening = true;
                this.listenType = 'gamepad';
                this.listenAction = action;
                this.listeningOverlay.style.display = 'flex';
                this.listeningOverlay.querySelector('span').textContent = `Press any gamepad button for [${ACTION_NAMES[action]}]...`;
                this._startGamepadPoll();
            };

            row.appendChild(label);
            row.appendChild(kbBtn);
            row.appendChild(gpBtn);
            this.listContainer.appendChild(row);
        }
    }

    open() {
        this.modal.style.display = 'block';
        this._buildList();
    }

    close() {
        this.modal.style.display = 'none';
        this._stopListening();
    }
}
