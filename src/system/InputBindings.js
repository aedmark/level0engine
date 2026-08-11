const DEFAULT_BINDINGS = {
    keyboard: {
        moveForward: ['KeyW', 'ArrowUp'],
        moveBackward: ['KeyS', 'ArrowDown'],
        moveLeft: ['KeyA', 'ArrowLeft'],
        moveRight: ['KeyD', 'ArrowRight'],
        sprint: ['ShiftLeft', 'ShiftRight'],
        crouch: ['KeyC'],
        squeeze: ['KeyQ'],
        closeEyes: ['KeyV'],
        flashlight: ['KeyF'],
        battery: ['Digit1'],
        almondWater: ['Digit2'],
        paintball: ['KeyP'],
        tag: ['KeyT'],
        compass: ['KeyM'],
        journal: ['KeyJ'],
        interact: ['KeyE'],
        jump: ['Space']
    },
    gamepad: {
        jump: [0], // A
        closeDoc: [1], // B
        flashlight: [2], // X
        compass: [3], // Y
        closeEyes: [4], // LB
        squeeze: [5], // RB
        peek: [6], // LT 
        interact: [7], // RT
        tag: [8], // Select
        sprint: [10], // L3
        crouch: [11], // R3
        battery: [12], // D-Up
        almondWater: [13], // D-Down
        paintball: [14], // D-Left
        journal: [15] // D-Right
    }
};

export const ACTION_NAMES = {
    moveForward: "Move Forward",
    moveBackward: "Move Backward",
    moveLeft: "Move Left",
    moveRight: "Move Right",
    sprint: "Sprint",
    crouch: "Crouch / Crawl",
    squeeze: "Squeeze",
    closeEyes: "Close Eyes",
    flashlight: "Toggle Flashlight",
    battery: "Use Battery",
    almondWater: "Use Almond Water",
    paintball: "Toggle Paintball Gun",
    tag: "UV Marker",
    compass: "Toggle Compass",
    journal: "Open Journal",
    interact: "Interact / Read",
    jump: "Ascend (God Mode)",
    closeDoc: "Close Document (Gamepad)",
    peek: "Peek (Gamepad)"
};

class InputBindings {
    constructor() {
        this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
        this.load();
    }

    load() {
        try {
            const data = localStorage.getItem('level0_bindings');
            if (data) {
                const parsed = JSON.parse(data);
                for (let type in parsed) {
                    for (let action in parsed[type]) {
                        if (this.bindings[type] && this.bindings[type][action]) {
                            this.bindings[type][action] = parsed[type][action];
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Could not load bindings.");
        }
    }

    save() {
        localStorage.setItem('level0_bindings', JSON.stringify(this.bindings));
    }

    reset() {
        this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
        this.save();
        document.dispatchEvent(new Event('bindings-updated'));
    }

    setKeyboardBinding(action, code) {
        if (!this.bindings.keyboard[action]) this.bindings.keyboard[action] = [];
        this.bindings.keyboard[action] = [code];
        this.save();
        document.dispatchEvent(new Event('bindings-updated'));
    }

    setGamepadBinding(action, buttonIndex) {
         if (!this.bindings.gamepad[action]) this.bindings.gamepad[action] = [];
         this.bindings.gamepad[action] = [buttonIndex];
         this.save();
         document.dispatchEvent(new Event('bindings-updated'));
    }

    isActionKeyboard(action, event) {
        let code = event.code;
        const binds = this.bindings.keyboard[action];
        if (!binds) return false;
        
        // Handle shift specially to accommodate ShiftLeft vs ShiftRight when mapping
        if (action === 'sprint' && event.key === 'Shift') return true;
        
        return binds.includes(code);
    }

    isActionGamepad(action, buttonIndex) {
        const binds = this.bindings.gamepad[action];
        if (!binds) return false;
        return binds.includes(buttonIndex);
    }
    
    getKeyboardString(action) {
        const binds = this.bindings.keyboard[action];
        if (!binds || binds.length === 0) return 'Unbound';
        let main = binds[0];
        if (main.startsWith('Key')) return main.replace('Key', '');
        if (main.startsWith('Digit')) return main.replace('Digit', '');
        if (main === 'Space') return 'Space';
        if (main.startsWith('Shift')) return 'Shift';
        if (main.startsWith('Arrow')) return main.replace('Arrow', '') + ' Arrow';
        return main;
    }

    getGamepadString(action) {
         const binds = this.bindings.gamepad[action];
         if (!binds || binds.length === 0) return 'Unbound';
         let idx = binds[0];
         const map = {
             0: 'A / Cross', 1: 'B / Circle', 2: 'X / Square', 3: 'Y / Triangle',
             4: 'LB / L1', 5: 'RB / R1', 6: 'LT / L2', 7: 'RT / R2',
             8: 'Select', 9: 'Start', 10: 'L3', 11: 'R3',
             12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right'
         };
         return map[idx] || `Button ${idx}`;
    }

    getPreventKeys() {
        let prevent = new Set();
        for (let action in this.bindings.keyboard) {
             this.bindings.keyboard[action].forEach(k => prevent.add(k));
        }
        // Always prevent some defaults
        prevent.add('Space');
        prevent.add('Tab');
        return prevent;
    }
}

const instance = new InputBindings();
export default instance;
