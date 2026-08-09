/**
 * [ROLE] Handles persisting and restoring game state.
 * [WHY] Allows players to save configurations and progress using browser local storage.
 * [STATE] Stateful, tracks an interval for autosaving.
 * [DEPENDS] Engine state, player state, environment, DOM UI elements (sliders, toggles), localStorage.
 */
export default class SaveManager {
    constructor(engine, player, environment, acoustics) {
        this.engine = engine;
        this.player = player;
        this.environment = environment;
        this.acoustics = acoustics;
        this.saveInterval = null;
    }

    generateCardSeed() {
        const suits = ['♥', '♦', '♣', '♠'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
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
            document.getElementById('shadowSelect').value = state.shadows || "high";
            document.getElementById('renderDistSelect').value = state.renderDist !== undefined ? state.renderDist : "1";
            document.getElementById('volumeSlider').value = state.vol !== undefined ? state.vol : "100";
            document.getElementById('gammaSlider').value = state.gamma || "50";
            let aaVal = "0";
            if (state.aa === true) aaVal = "4";
            else if (state.aa === false) aaVal = "0";
            else if (state.aa !== undefined) aaVal = state.aa.toString();
            document.getElementById('aaSelect').value = aaVal;
            document.getElementById('fxaaToggle').checked = state.fxaa !== false;
            document.getElementById('postToggle').checked = state.post !== false;
            document.getElementById('headBobToggle').checked = state.headBob !== false;
            this.engine.aspectRatio = state.aspect === 'auto' ? 'auto' : parseFloat(state.aspect || 1.3333333333);
            this.engine.resolutionScale = parseFloat(state.res) || 1.0;
            this.engine.enablePostProcessing = state.post !== false;
            this.engine.camera.fov = Number(state.fov) || 75;
            this.engine.baseExposure = (Number(state.gamma) || 50) / 100;
            this.acoustics.masterVolume = (state.vol !== undefined ? Number(state.vol) : 100) / 100;
            this.engine.camera.updateProjectionMatrix();
            this.player.speedMultiplier = (Number(state.speed) || 100) / 100;
            this.player.enableHeadBob = state.headBob !== false;
            
            if (state.macroChunks) {
                this.environment._macroChunkHashes = new Set(state.macroChunks);
            }
            if (state.discoveredSectors) {
                this.environment.discoveredSectors = new Map(state.discoveredSectors);
            }
            // Story state is intentionally NOT imported here. environment.baseSeed hasn't
            // been derived from the (just-populated) seed input yet -- that happens inside
            // environment.setup(), which main.js calls after loadState(). getStory() caches
            // its StoryEngine per baseSeed, so importing against the pre-setup seed would
            // populate an instance that gets discarded the moment setup() changes the seed
            // and the next getStory() call rebuilds from scratch. The caller applies
            // state.story itself, once setup() has run and the real seed is locked in.

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
            shadows: document.getElementById('shadowSelect').value,
            renderDist: document.getElementById('renderDistSelect').value,
            vol: document.getElementById('volumeSlider').value,
            gamma: document.getElementById('gammaSlider').value,
            aa: document.getElementById('aaSelect').value,
            fxaa: document.getElementById('fxaaToggle').checked,
            post: document.getElementById('postToggle').checked,
            headBob: document.getElementById('headBobToggle').checked,
            macroChunks: Array.from(this.environment._macroChunkHashes),
            discoveredSectors: Array.from(this.environment.discoveredSectors.entries()),
            story: this.environment.getStory ? this.environment.getStory().exportState() : null
        };
        localStorage.setItem('level0_state', JSON.stringify(state));
    }

    idleSaveState() {
        if (window.requestIdleCallback) {
            requestIdleCallback(() => this.saveState());
        } else {
            this.saveState();
        }
    }

    startAutoSave() {
        this.saveInterval = setInterval(() => this.idleSaveState(), 2500);
        document.getElementById('saveApplyBtn')?.addEventListener('click', () => {
            this.saveState();
            window.location.reload();
        });
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
            const seedInput = document.getElementById('seedInput');
            if (seedInput) seedInput.value = '';
            window.location.href = window.location.href.split('?')[0];
        });
    }
}