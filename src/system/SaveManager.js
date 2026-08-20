import TextureCache from '../aesthetics/textures/TextureCache.js';

export default class SaveManager {
    constructor(engine, player, environment, acoustics) {
        this.engine = engine;
        this.player = player;
        this.environment = environment;
        this.acoustics = acoustics;
        this.saveInterval = null;
        this.bootComplete = false;
        this._refusalLogged = null;
    }

    markBootComplete() {
        this.bootComplete = true;
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
            try {
                localStorage.setItem('level0_state_backup', data);
            } catch (e) {}
            document.getElementById('seedInput').value = state.seed || this.generateCardSeed();
            document.getElementById('aspectSelect').value = state.aspect || "1.3333333333";
            document.getElementById('fogSlider').value = state.fog || "5";
            document.getElementById('fovSlider').value = state.fov || "75";
            document.getElementById('speedSlider').value = state.speed || "100";
            document.getElementById('resolutionSelect').value = state.res || "1.0";
            document.getElementById('shadowSelect').value = state.shadows || "high";
            document.getElementById('shadowLightSlider').value = state.shadowLights || "6";
            document.getElementById('renderDistSelect').value = state.renderDist !== undefined ? state.renderDist : "1";
            document.getElementById('volumeSlider').value = state.vol !== undefined ? state.vol : "100";
            document.getElementById('gammaSlider').value = state.gamma || "70";
            let aaVal = "0";
            if (state.aa === true) aaVal = "4";
            else if (state.aa === false) aaVal = "0";
            else if (state.aa !== undefined) aaVal = state.aa.toString();
            document.getElementById('aaSelect').value = aaVal;
            document.getElementById('fxaaToggle').checked = state.fxaa === true;
            document.getElementById('postToggle').checked = state.post !== false;
            document.getElementById('headBobToggle').checked = state.headBob !== false;
            this.engine.aspectRatio = state.aspect === 'auto' ? 'auto' : parseFloat(state.aspect || 1.3333333333);
            this.engine.resolutionScale = parseFloat(state.res) || 1.0;
            this.engine.enablePostProcessing = state.post !== false;
            this.engine.camera.fov = Number(state.fov) || 75;
            this.engine.baseExposure = (Number(state.gamma) || 70) / 100;
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

            return state;
        } catch (e) {
            console.warn("Mnemonic Arcade corrupted. Pruning state.");
            return null;
        }
    }

    _readStored() {
        try {
            const raw = localStorage.getItem('level0_state');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    _refuseSaveReason(state) {
        if (this.player && this.player.isDead) return 'player is dead';
        if (!this.bootComplete) return 'boot has not finished restoring';
        const env = this.environment;
        if (env && (env.isSpawning || env.needsSafeSpawn)) return 'spawn placement in progress';
        const prior = this._readStored();
        if (prior && Number(state.bestDepth) < Number(prior.bestDepth)) {
            return `bestDepth would regress ${prior.bestDepth} -> ${state.bestDepth}`;
        }
        return null;
    }

    recoverBackup() {
        const backup = localStorage.getItem('level0_state_backup');
        if (!backup) return false;
        localStorage.setItem('level0_state', backup);
        try {
            TextureCache.saveWorldState('level0_state', JSON.parse(backup)).catch(() => {});
        } catch (e) {}
        return true;
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
            flashlightActive: this.player.input.state.flashlightActive,
            isCrouching: this.player.input.state.isCrouching,
            isCrawling: this.player.input.state.isCrawling,
            invBat: this.player.inventory.batteries,
            invH2o: this.player.inventory.almondWater,
            hasExitKey: this.player.inventory.hasExitKey,
            depth: this.player.depth,
            bestDepth: this.player.bestDepth,
            seed: document.getElementById('seedInput').value,
            aspect: document.getElementById('aspectSelect').value,
            fog: document.getElementById('fogSlider').value,
            fov: document.getElementById('fovSlider').value,
            speed: document.getElementById('speedSlider').value,
            res: document.getElementById('resolutionSelect').value,
            shadows: document.getElementById('shadowSelect').value,
            shadowLights: document.getElementById('shadowLightSlider').value,
            renderDist: document.getElementById('renderDistSelect').value,
            vol: document.getElementById('volumeSlider').value,
            gamma: document.getElementById('gammaSlider').value,
            aa: document.getElementById('aaSelect').value,
            fxaa: document.getElementById('fxaaToggle').checked,
            post: document.getElementById('postToggle').checked,
            headBob: document.getElementById('headBobToggle').checked,
            elevator: this.environment.elevatorAnchor || null,
            consumed: Array.from(this.environment.consumedProps || []),
            macroChunks: Array.from(this.environment._macroChunkHashes),
            discoveredSectors: Array.from(this.environment.discoveredSectors.entries()),
            story: this.environment.getStory ? this.environment.getStory().exportState() : null
        };
        const refusal = this._refuseSaveReason(state);
        if (refusal) {
            if (this._refusalLogged !== refusal) {
                this._refusalLogged = refusal;
                console.warn(`[SAVE] Skipped autosave: ${refusal}.`);
            }
            return;
        }
        this._refusalLogged = null;
        localStorage.setItem('level0_state', JSON.stringify(state));
        TextureCache.saveWorldState('level0_state', state).catch(() => {});
    }

    idleSaveState() {
        if (window.requestIdleCallback) {
            requestIdleCallback(() => this.saveState(), {timeout: 1000});
        } else {
            this.saveState();
        }
    }

    static async purgeAllStorage() {
        localStorage.clear();
        sessionStorage.clear();
        await TextureCache.clearAll();
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
            await SaveManager.purgeAllStorage();
            const seedInput = document.getElementById('seedInput');
            if (seedInput) seedInput.value = '';
            window.location.href = window.location.href.split('?')[0];
        });
    }
}