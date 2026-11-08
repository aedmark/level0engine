import BootController from '../ui/BootController.js';
import {
    SAMPLE_RATE, MAX_SAMPLES, encodeSamples, decodeSamples, poseAt, buildGhostFile, parseGhostFile,
    chooseGhost, fileRun, pruneStore, formatClock
} from './GhostCodec.js';
import {shareUrl} from './SeedLink.js';

// Ghost runs (P5-06, D-012). Records the player's path through each world (one live seed), stores it
// in the browser, and replays the chosen run on that seed as a translucent figure. A run starts when the
// player gets control of a fresh world and ends at the accepted Inquest (completed), on death, or when
// the page closes (an attempt).

const STORAGE_KEY = 'level0_ghosts';
const SETTINGS_KEY = 'level0_ghost_show';
const MAX_SEEDS = 16;
const MIN_ATTEMPT = 30; // seconds; shorter attempts are not worth keeping

export default class GhostRuns {
    constructor({env, player, resumed}) {
        this.env = env;
        this.player = player;
        // A resumed save joins its world part-way through, so its timing would not line up with a ghost.
        this._skipSeed = resumed ? undefined : null;
        this._worldSeed = null;
        this.rec = null;
        this.ghost = null;
        this.show = true;
        this._acc = 0;
    }

    bind() {
        try { this.show = localStorage.getItem(SETTINGS_KEY) !== '0'; } catch (e) { this.show = true; }
        this._buildFigure();
        this._buildHud();
        const toggle = document.getElementById('ghostToggle');
        if (toggle) {
            toggle.checked = this.show;
            toggle.addEventListener('change', () => {
                this.show = toggle.checked;
                try { localStorage.setItem(SETTINGS_KEY, this.show ? '1' : '0'); } catch (e) { /* page only */ }
                this._renderHud();
            });
        }
        const exportBtn = document.getElementById('ghostExportBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this._export());
        const importInput = document.getElementById('ghostImportInput');
        if (importInput) importInput.addEventListener('change', () => this._import(importInput));
        const playBtn = document.getElementById('ghostPlaySeedBtn');
        if (playBtn) playBtn.addEventListener('click', () => {
            if (!this._importedSeed) return;
            window.location.href = shareUrl(window.location.href, this._importedSeed).replace('terminal.html', 'engine.html');
        });
        window.addEventListener('pagehide', () => this._end(false));
        this._setStatus('');
    }

    update(delta) {
        const seed = this._seedInput().value;
        const boot = BootController.getInstance();
        const ready = !this.env.isSpawning && (!boot || boot.isComplete) && !this.player.isDead;
        if (this.rec && (this.player.isDead || seed !== this.rec.seed)) {
            this._end(false);
        } else if (this.rec && this.player.objectives.escaped) {
            this._end(true);
        }
        if (!this.rec && ready && seed !== this._worldSeed && !this.player.objectives.escaped) {
            this._worldSeed = seed;
            if (this._skipSeed === undefined) {
                this._skipSeed = seed;
                this._setStatus('RESUMED SESSION: NOT RECORDED');
            } else {
                this._begin(seed);
            }
        }
        if (!this.rec) {
            this.figure.visible = false;
            return;
        }
        this.rec.t += delta;
        this._acc += delta;
        if (this._acc >= SAMPLE_RATE && this.rec.samples.length < MAX_SAMPLES) {
            this._acc -= SAMPLE_RATE;
            const cam = this.env.camera;
            this.rec.samples.push({x: cam.position.x, z: cam.position.z, yaw: cam.rotation.y});
        }
        this._updateFigure();
        this._renderHud();
    }

    _seedInput() {
        return document.getElementById('seedInput') || {value: ''};
    }

    _begin(seed) {
        const cam = this.env.camera;
        this.rec = {seed, t: 0, samples: [{x: cam.position.x, z: cam.position.z, yaw: cam.rotation.y}]};
        this._acc = 0;
        const choice = chooseGhost(this._store().seeds[seed]);
        this.ghost = choice ? {kind: choice.kind, run: choice.run, samples: decodeSamples(choice.run)} : null;
        this._touch(seed);
        this._renderHud();
    }

    _end(completed) {
        const rec = this.rec;
        if (!rec) return;
        this.rec = null;
        this.ghost = null;
        this.figure.visible = false;
        this._renderHud();
        if (!completed && rec.t < MIN_ATTEMPT) return;
        if (rec.samples.length < 2) return;
        const enc = encodeSamples(rec.samples);
        const run = {seed: rec.seed, completed, duration: rec.t, ...enc, createdAt: new Date().toISOString()};
        const store = this._store();
        const entry = fileRun(store.seeds[rec.seed], run);
        entry.usedAt = Date.now();
        store.seeds[rec.seed] = entry;
        this._save(store);
        if (completed) this._setStatus(`RUN SAVED: ${formatClock(run.duration)}`);
    }

    _store() {
        try {
            const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (s && s.version === 1 && s.seeds && typeof s.seeds === 'object') return s;
        } catch (e) { /* corrupt: start over */ }
        return {version: 1, seeds: {}};
    }

    _save(store) {
        let s = pruneStore(store, MAX_SEEDS);
        // A full localStorage drops the oldest seeds until the write fits.
        for (let cap = MAX_SEEDS; cap >= 1; cap = Math.floor(cap / 2)) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
                return true;
            } catch (e) {
                s = pruneStore(s, Math.max(1, Math.floor(cap / 2)));
            }
        }
        return false;
    }

    _touch(seed) {
        const store = this._store();
        if (!store.seeds[seed]) return;
        store.seeds[seed].usedAt = Date.now();
        this._save(store);
    }

    _export() {
        const seed = this._seedInput().value;
        const choice = chooseGhost(this._store().seeds[seed]);
        if (!choice) {
            this._setStatus('NO SAVED RUN ON THIS SEED YET');
            return;
        }
        const file = JSON.stringify(buildGhostFile(choice.run));
        const blob = new Blob([file], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const safe = seed.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'seed';
        a.download = `level0-ghost-${safe}-${formatClock(choice.run.duration).replace(':', 'm')}s.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        this._setStatus(`EXPORTED ${choice.kind.toUpperCase()} ${formatClock(choice.run.duration)}`);
    }

    _import(input) {
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        if (file.size > 512 * 1024) {
            this._setStatus('IMPORT FAILED: FILE IS TOO LARGE');
            return;
        }
        file.text().then((text) => {
            let run;
            try {
                run = parseGhostFile(text);
            } catch (e) {
                this._setStatus(`IMPORT FAILED: ${String(e.message || e).toUpperCase()}`);
                return;
            }
            const store = this._store();
            const entry = {...(store.seeds[run.seed] || {}), imported: run, usedAt: Date.now()};
            store.seeds[run.seed] = entry;
            if (!this._save(store)) {
                this._setStatus('IMPORT FAILED: BROWSER STORAGE IS FULL');
                return;
            }
            this._importedSeed = run.seed;
            const playBtn = document.getElementById('ghostPlaySeedBtn');
            if (playBtn) playBtn.style.display = 'inline-block';
            // textContent: the seed came from someone else's file.
            this._setStatus(`IMPORTED ${run.completed ? 'RUN' : 'ATTEMPT'} ${formatClock(run.duration)} FOR SEED ${run.seed}`);
        });
    }

    _setStatus(text) {
        const el = document.getElementById('ghostStatus');
        if (el) el.textContent = text || 'GHOSTS ARE SAVED PER SEED IN THIS BROWSER';
    }

    _buildFigure() {
        // Unlit and depth-tested but not depth-writing: a pale shape you can see through, which never
        // hides the world behind it or changes how anything else is lit.
        const mat = new THREE.MeshBasicMaterial({color: 0x9fe8ff, transparent: true, opacity: 0.22, depthWrite: false});
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.25, 10), mat);
        body.position.y = 0.85;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat);
        head.position.y = 1.65;
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.2), mat);
        nose.position.set(0, 1.62, -0.24);
        group.add(body, head, nose);
        group.visible = false;
        group.renderOrder = 10;
        this.env.scene.add(group);
        this.figure = group;
    }

    _updateFigure() {
        const g = this.ghost;
        const pose = g && this.show ? poseAt(g.samples, this.rec.t) : null;
        if (!pose) {
            this.figure.visible = false;
            return;
        }
        this.figure.visible = true;
        this.figure.position.set(pose.x, 0, pose.z);
        this.figure.rotation.y = pose.yaw;
    }

    _buildHud() {
        this._hud = document.createElement('div');
        this._hud.id = 'ghost-hud';
        this._hud.className = 'osd-element';
        this._hud.style.cssText = 'left: clamp(1.2rem, 8vmin, 7.5rem); top: clamp(6.5rem, 10vmin, 8rem); ' +
            'z-index: 100; pointer-events: none; display: none; font-size: clamp(0.9rem, 1.8vmin, 1.1rem); color: #9fe8ff;';
        (document.getElementById('screen-wrapper') || document.body).appendChild(this._hud);
    }

    _renderHud() {
        if (!this._hud) return;
        const g = this.ghost;
        if (!this.rec || !g || !this.show) {
            this._hud.style.display = 'none';
            return;
        }
        const label = g.kind === 'best' ? 'BEST' : g.kind === 'imported' ? 'IMPORTED' : 'LAST ATTEMPT';
        const done = this.rec.t > g.run.duration;
        this._hud.textContent = done
            ? `GHOST ${label} ${g.run.completed ? 'FINISHED' : 'ENDED'} ${formatClock(g.run.duration)}`
            : `GHOST ${label} ${formatClock(g.run.duration)}`;
        this._hud.style.display = 'block';
    }
}

