// SaveManager.js
// LEVEL 0 SAVE STATE MANAGER

/**
 * Handles persisting and restoring the player's session and configuration state.
 * 
 * Because the engine does not have a backend server, all progress
 * and configuration data is stored locally in the browser using `localStorage`. 
 * This ensures the player can close the tab and return exactly where they left off.
 */
export default class SaveManager {
    constructor(engine, player, environment, acoustics) {
        this.engine = engine;
        this.player = player;
        this.environment = environment;
        this.acoustics = acoustics;
        this.saveInterval = null;
    }

    /**
     * Generates a random seed formatted as a 5-card poker hand (e.g., "A♥|10♠|2♣|K♦|5♥").
     * 
     * We use a deck of cards as a seed format because it is memorable,
     * aesthetically fitting, and visually distinct from standard numeric hashes. It makes 
     * sharing "seeds" with friends feel like sharing a hand of cards.
     * 
     * @returns {string} The formatted seed string.
     */
    generateCardSeed() {
        const suits = ['♥', '♦', '♣ ', '♠'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '🃟'];
        const deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push(`${rank}${suit}`);
            }
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return [deck[0], deck[1], deck[2], deck[3], deck[4]].join('|');
    }

    loadState() {
        const data = localStorage.getItem('level0_state');
        if (!data) return null;
        try {
            const state = JSON.parse(data);
            document.getElementById('seedInput').value = state.seed || this.generateCardSeed();
            document.getElementById('aspectSelect').value = state.aspect || "1.3333333333";
            document.getElementById('fogSlider').value = state.fog || "5";
            document.getElementById('fovSlider').value = state.fov || "75";
            document.getElementById('speedSlider').value = state.speed || "100";
            document.getElementById('resolutionSelect').value = state.res || "1.0";
            document.getElementById('volumeSlider').value = state.vol !== undefined ? state.vol : "100";
            document.getElementById('gammaSlider').value = state.gamma || "120";
            document.getElementById('headBobToggle').checked = state.headBob !== false;
            
            this.engine.aspectRatio = state.aspect === 'auto' ? 'auto' : parseFloat(state.aspect || 1.3333333333);
            this.engine.resolutionScale = parseFloat(state.res) || 1.0;
            this.engine.camera.fov = Number(state.fov) || 75;
            this.engine.renderer.toneMappingExposure = (Number(state.gamma) || 120) / 100;
            this.acoustics.masterVolume = (state.vol !== undefined ? Number(state.vol) : 100) / 100;
            this.engine.camera.updateProjectionMatrix();
            this.player.speedMultiplier = (Number(state.speed) || 100) / 100;
            this.player.enableHeadBob = state.headBob !== false;
            
            return state;
        } catch (e) {
            console.warn("Mnemonic Arcade corrupted. Pruning state.");
            return null;
        }
    }

    saveState() {
        const state = {
            px: this.engine.camera.position.x,
            py: this.engine.camera.position.y,
            pz: this.engine.camera.position.z,
            rx: this.engine.camera.rotation.x,
            ry: this.engine.camera.rotation.y,
            stamina: this.player.stamina,
            battery: this.player.flashlightBattery,
            invBat: this.player.inventory.batteries,
            invH2o: this.player.inventory.almondWater,
            depth: this.player.depth,
            bestDepth: this.player.bestDepth,
            seed: document.getElementById('seedInput').value,
            aspect: document.getElementById('aspectSelect').value,
            fog: document.getElementById('fogSlider').value,
            fov: document.getElementById('fovSlider').value,
            speed: document.getElementById('speedSlider').value,
            res: document.getElementById('resolutionSelect').value,
            vol: document.getElementById('volumeSlider').value,
            gamma: document.getElementById('gammaSlider').value,
            headBob: document.getElementById('headBobToggle').checked
        };
        localStorage.setItem('level0_state', JSON.stringify(state));
    }

    /**
     * Safely executes a save state using the browser's `requestIdleCallback`.
     * 
     * Serializing data to JSON and writing to `localStorage` is a synchronous,
     * blocking operation. Doing this in the middle of a frame can cause a stutter. 
     * `requestIdleCallback` tells the browser to only perform the save when the CPU is completely 
     * idle between frame renders, ensuring autosaves are invisible and stutter-free.
     */
    idleSaveState() {
        if (window.requestIdleCallback) {
            requestIdleCallback(() => this.saveState());
        } else {
            this.saveState();
        }
    }

    startAutoSave() {
        this.saveInterval = setInterval(() => this.idleSaveState(), 2500);
        document.getElementById('clearSaveBtn')?.addEventListener('click', async () => {
            this.player.isDead = true;
            const flash = document.getElementById('flash-overlay');
            if (flash) {
                flash.style.transition = 'none';
                flash.style.backgroundColor = '#8a3333';
                flash.style.opacity = '1';
            }
            clearInterval(this.saveInterval);
            localStorage.clear();
            sessionStorage.clear();
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                for (let key of keys) {
                    await caches.delete(key);
                }
            }
            window.location.href = window.location.href.split('?')[0];
        });
    }
}
