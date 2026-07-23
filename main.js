// main.js
// LEVEL 0 SYSTEM BOOTSTRAP

import RenderEngine from './src/core/RenderEngine.js';
import PlayerController from './src/player/PlayerController.js';
import Environment from './src/core/Environment.js';
import AcousticEngine from './src/narrative/AcousticEngine.js';
import StoryEngine from './src/narrative/StoryEngine.js';

const engine = new RenderEngine();
const acoustics = new AcousticEngine();
window.acoustics = acoustics;
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);

function loadState() {
    const data = localStorage.getItem('level0_state');
    if (!data) return null;
    try {
        const state = JSON.parse(data);
        document.getElementById('seedInput').value = state.seed || "BACKROOMS";
        document.getElementById('aspectSelect').value = state.aspect || "1.3333333333";
        document.getElementById('fogSlider').value = state.fog || "5";
        document.getElementById('fovSlider').value = state.fov || "75";
        document.getElementById('speedSlider').value = state.speed || "100";
        document.getElementById('resolutionSelect').value = state.res || "1.0";
        document.getElementById('volumeSlider').value = state.vol !== undefined ? state.vol : "100";
        document.getElementById('gammaSlider').value = state.gamma || "120";
        document.getElementById('headBobToggle').checked = state.headBob !== false;
        engine.aspectRatio = state.aspect === 'auto' ? 'auto' : parseFloat(state.aspect || 1.3333333333);
        engine.resolutionScale = parseFloat(state.res) || 1.0;
        engine.camera.fov = Number(state.fov) || 75;
        engine.renderer.toneMappingExposure = (Number(state.gamma) || 120) / 100;
        acoustics.masterVolume = (state.vol !== undefined ? Number(state.vol) : 100) / 100;
        engine.camera.updateProjectionMatrix();
        player.speedMultiplier = (Number(state.speed) || 100) / 100;
        player.enableHeadBob = state.headBob !== false;
        return state;
    } catch (e) {
        console.warn("Mnemonic Arcade corrupted. Pruning state.");
        return null;
    }
}

function saveState() {
    const state = {
        px: engine.camera.position.x,
        py: engine.camera.position.y,
        pz: engine.camera.position.z,
        rx: engine.camera.rotation.x,
        ry: engine.camera.rotation.y,
        stamina: player.stamina,
        battery: player.flashlightBattery,
        invBat: player.inventory.batteries,
        invH2o: player.inventory.almondWater,
        depth: player.depth,
        bestDepth: player.bestDepth,
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

const savedState = loadState();
environment.setup();
if (savedState) {
    engine.camera.position.set(savedState.px, savedState.py, savedState.pz);
    engine.camera.rotation.set(savedState.rx, savedState.ry, 0, 'YXZ');
    player.stamina = savedState.stamina;
    if (savedState.battery !== undefined) player.flashlightBattery = savedState.battery;
    if (savedState.invBat !== undefined) player.inventory.batteries = savedState.invBat;
    if (savedState.invH2o !== undefined) player.inventory.almondWater = savedState.invH2o;
    if (savedState.depth !== undefined) player.depth = savedState.depth;
    if (savedState.bestDepth !== undefined) player.bestDepth = savedState.bestDepth;
    player.updateObjectives();
    environment.baseFogDensity = (Number(savedState.fog) || 5) / 100;
}
const bootAudio = () => acoustics.init();
document.addEventListener('click', bootAudio, {once: true});
document.addEventListener('keydown', bootAudio, {once: true});
document.addEventListener('somatic-step', (e) => acoustics.triggerSomaticEvent('step', 0, e.detail.intensity));
document.addEventListener('somatic-shuffle', (e) => acoustics.triggerSomaticEvent('shuffle', 0, e.detail.intensity));
document.addEventListener('somatic-door', (e) => acoustics.triggerSomaticEvent(e.detail.variant === 'blast' ? 'blastdoor' : 'door', e.detail.distSq, e.detail.intensity));
document.addEventListener('somatic-airlock', (e) => acoustics.triggerSomaticEvent('airlock_cycle', e.detail.distSq, e.detail.intensity));
document.addEventListener('somatic-airlock-hiss', (e) => acoustics.triggerSomaticEvent('airlock_hiss', e.detail.distSq, e.detail.intensity));
document.addEventListener('somatic-vent', (e) => acoustics.triggerSomaticEvent('vent', e.detail.distSq, e.detail.intensity));
document.addEventListener('somatic-lost', (e) => acoustics.triggerSomaticEvent(e.detail.isLaugh ? 'laugh' : 'whisper', e.detail.distSq, e.detail.intensity));
document.addEventListener('somatic-blink', () => {
    const flash = document.getElementById('flash-overlay');
    if (flash && flash.style.opacity !== '0.98') {
        flash.style.transition = 'none';
        flash.style.backgroundColor = '#000';
        flash.style.opacity = '1';
        setTimeout(() => {
            flash.style.transition = 'opacity 0.15s ease-out';
            flash.style.opacity = '0';
        }, 150);
    }
});
document.addEventListener('somatic-eyes', (e) => {
    const flash = document.getElementById('flash-overlay');
    if (flash) {
        if (e.detail.closed) {
            flash.style.transition = 'opacity 0.2s ease-in';
            flash.style.backgroundColor = '#000';
            flash.style.opacity = '0.98';
        } else {
            flash.style.transition = 'opacity 0.3s ease-out';
            flash.style.opacity = '0';
        }
    }
});
document.addEventListener('somatic-breaker', (e) => acoustics.triggerSomaticEvent('breaker', e.detail.distSq, e.detail.intensity));
document.addEventListener('somatic-item', (e) => acoustics.triggerSomaticEvent('item', e.detail.distSq, e.detail.intensity));

function getStory() {
    if (!getStory._cache || getStory._lastSeed !== environment.baseSeed) {
        getStory._cache = new StoryEngine(environment.baseSeed);
        getStory._lastSeed = environment.baseSeed;
    }
    return getStory._cache;
}

let typeWriterInterval = null;
let terminalBrowseIndex = null;

function terminalFooter(fragment) {
    let footer = `\n\n---\nDATA RECOVERED: [ ${fragment.progress.found} / ${fragment.progress.total} ]`;
    footer += getStory().collected.length > 1
        ? `\n[ ◄ ► BROWSE RECOVERED FILES ]`
        : `\n[ RE-ACCESS TERMINAL TO BROWSE RECOVERED FILES ]`;
    return footer;
}

document.addEventListener('somatic-doc-nav', (e) => {
    if (terminalBrowseIndex === null) return;
    const story = getStory();
    if (story.collected.length < 2) return;
    terminalBrowseIndex += e.detail.dir;
    const file = story.getArchiveFile(terminalBrowseIndex);
    terminalBrowseIndex = file.archiveIndex;
    const docContent = document.getElementById('document-content');
    if (docContent) docContent.innerText = file.text + terminalFooter(file);
    acoustics.triggerSomaticEvent('item', 1.0, 0.15);
});

document.addEventListener('somatic-read', (e) => {
    if (player.input.state.isReading) return;
    player.input.state.isReading = true;
    player.input.state.isRunning = false;

    if (document.pointerLockElement) document.exitPointerLock();

    const docOverlay = document.getElementById('document-overlay');
    const docContent = document.getElementById('document-content');

    if (docContent) {
        const docId = e.detail ? e.detail.docId : null;
        const zone = e.detail ? e.detail.zone : null;
        const fragment = getStory().getFragment(docId, zone);

        const isTerminal = docId && String(docId).startsWith('PC_');
        let fullText = fragment.text + (isTerminal
            ? terminalFooter(fragment)
            : `\n\n---\nDATA RECOVERED: [ ${fragment.progress.found} / ${fragment.progress.total} ]`);
        terminalBrowseIndex = null;
        if (isTerminal) {
            terminalBrowseIndex = fragment.archiveIndex !== undefined
                ? fragment.archiveIndex
                : getStory().collected.length - 1;
        }

        if (docId && String(docId).startsWith('TAPE_')) {
            docOverlay.style.backgroundColor = '#111';
            docOverlay.style.color = '#55ff55';
            docOverlay.style.borderColor = '#55ff55';
            docContent.innerText = '';

            if (docOverlay) docOverlay.style.display = 'block';
            acoustics.triggerSomaticEvent('tape_click', 1.0, 0.5);

            let i = 0;
            typeWriterInterval = setInterval(() => {
                if (i < fullText.length) {
                    docContent.innerText += fullText.charAt(i);
                    if (fullText.charAt(i) !== ' ' && fullText.charAt(i) !== '\n' && Math.random() > 0.6) {
                        acoustics.triggerSomaticEvent('tape_garble', 1.0, 0.20);
                    }
                    i++;
                } else {
                    clearInterval(typeWriterInterval);
                    typeWriterInterval = null;
                    acoustics.triggerSomaticEvent('tape_click', 1.0, 0.4);
                }
            }, 35);
        } else {
            docOverlay.style.backgroundColor = '#f4f1e1';
            docOverlay.style.color = '#1a1811';
            docOverlay.style.borderColor = '#a89f68';
            docContent.innerText = fullText;

            if (docOverlay) docOverlay.style.display = 'block';
            acoustics.triggerSomaticEvent('item', 1.0, 0.4);
        }
    }
});

document.addEventListener('somatic-close-document', () => {
    const inquestOverlay = document.getElementById('inquest-overlay');
    if (inquestOverlay && inquestOverlay.style.display === 'block') {
        if (inquestLocked) return;
        inquestOverlay.style.display = 'none';
        pendingExit = null;
        player.input.state.isReading = false;
        acoustics.triggerSomaticEvent('item', 1.0, 0.2);
        return;
    }
    player.input.state.isReading = false;
    terminalBrowseIndex = null;
    const docOverlay = document.getElementById('document-overlay');
    const keypadOverlay = document.getElementById('keypad-overlay');

    if (typeWriterInterval) {
        clearInterval(typeWriterInterval);
        typeWriterInterval = null;
        acoustics.triggerSomaticEvent('tape_click', 1.0, 0.5);
    }

    if (keypadOverlay && keypadOverlay.style.display === 'block') {
        keypadOverlay.style.display = 'none';
        document.dispatchEvent(new Event('somatic-keypad-cancel'));
        acoustics.triggerSomaticEvent('door', 1.0, 0.3);
    } else if (docOverlay && docOverlay.style.display !== 'none') {
        docOverlay.style.display = 'none';
        player.coherence = Math.max(0.0, player.coherence - 0.15);
        acoustics.triggerSomaticEvent('item', 1.0, 0.2);
    }
});
let pendingExit = null;
let inquestLocked = false;

document.addEventListener('somatic-inquest', (e) => {
    if (player.input.state.isReading) return;
    player.input.state.isReading = true;
    player.input.state.isRunning = false;
    if (document.pointerLockElement) document.exitPointerLock();
    pendingExit = e.detail.exitRef;
    inquestLocked = false;
    const story = getStory();
    const v = story.getVerdicts();
    const progress = story.progress();
    document.getElementById('inquest-case').innerText =
        `CASE FILE: PROJECT ${v.project} — DATA RECOVERED [ ${progress.found} / ${progress.total} ]`;
    document.getElementById('inquest-hint').innerText = v.finaleRead
        ? 'THE SEALED FINDING OF FACT IS ON RECORD. FILE IT.'
        : 'THE SEALED FINDING OF FACT WAS NEVER RECOVERED. FILING WITHOUT IT IS GUESSWORK.';
    for (let i = 0; i < 3; i++) {
        const btn = document.getElementById(`inquest-opt-${i}`);
        btn.innerText = `[${i + 1}] ${v.options[i]}` + ((v.finaleRead && i === v.truth) ? '\n    ★ MATCHES SEALED FINDING' : '');
    }
    const result = document.getElementById('inquest-result');
    result.innerText = '';
    document.getElementById('inquest-overlay').style.display = 'block';
    acoustics.triggerSomaticEvent('item', 1.0, 0.4);
});

window.handleInquest = (choice) => {
    if (inquestLocked || !pendingExit) return;
    inquestLocked = true;
    const story = getStory();
    const result = document.getElementById('inquest-result');
    if (choice === story.truth) {
        result.innerText = '> FINDING ACCEPTED. CASE CLOSED.';
        result.style.color = '#55ff55';
        player.coherence = 1.0;
        const exitRef = pendingExit;
        pendingExit = null;
        acoustics.triggerSomaticEvent('tape_click', 1.0, 0.6);
        setTimeout(() => {
            document.getElementById('inquest-overlay').style.display = 'none';
            player.input.state.isReading = false;
            exitRef.userData.active = false;
            player.objectives.escaped = true;
            player.objectiveUI.innerHTML = '> CASE CLOSED.<br>> DESCENDING TO DEEPER LAYER...';
            player.objectiveUI.style.color = '#aa55ff';
            document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 0.1, intensity: 3.0}}));
            if (engine.ambientLight) engine.ambientLight.intensity = 5.0;
            const flash = document.getElementById('flash-overlay');
            if (flash) {
                flash.style.transition = 'opacity 3.0s ease-in';
                flash.style.backgroundColor = '#000';
                flash.style.opacity = '1';
                setTimeout(() => {
                    player.objectives.fixed = 0;
                    player.objectives.escaped = false;
                    player.hasVisitedAnnex = false;
                    player.depth++;
                    if (player.depth > player.bestDepth) player.bestDepth = player.depth;
                    player.updateObjectives();
                    triggerAscension();
                    environment.generate();
                }, 3500);
            }
        }, 1600);
    } else {
        result.innerText = '> FINDING REJECTED. THE FACILITY DISAGREES.';
        result.style.color = '#ff5555';
        pendingExit = null;
        acoustics.triggerSomaticEvent('breaker', 1.0, 0.8);
        setTimeout(() => {
            document.getElementById('inquest-overlay').style.display = 'none';
            player.input.state.isReading = false;
            triggerBlackout();
            player.resetMetabolism();
            environment.generate();
        }, 2000);
    }
};

document.addEventListener('keydown', (e) => {
    const ov = document.getElementById('inquest-overlay');
    if (!ov || ov.style.display !== 'block') return;
    if (e.code === 'Digit1') window.handleInquest(0);
    else if (e.code === 'Digit2') window.handleInquest(1);
    else if (e.code === 'Digit3') window.handleInquest(2);
});

let currentKeypadInput = "";

document.addEventListener('somatic-keypad', () => {
    if (player.input.state.isReading) return;
    player.input.state.isReading = true;
    player.input.state.isRunning = false;

    if (document.pointerLockElement) document.exitPointerLock();

    currentKeypadInput = "";
    const display = document.getElementById('keypad-display');
    if (display) {
        display.innerText = "_";
        display.style.color = "#55ff55";
    }

    const keypadOverlay = document.getElementById('keypad-overlay');
    if (keypadOverlay) keypadOverlay.style.display = 'block';

    acoustics.triggerSomaticEvent('item', 1.0, 0.3);
});

window.handleKeypad = (char) => {
    const display = document.getElementById('keypad-display');
    if (!display) return;

    acoustics.triggerSomaticEvent('step', 1.0, 0.1);

    if (char === 'C') {
        currentKeypadInput = "";
        display.innerText = "_";
        display.style.color = "#55ff55";
    } else if (char === 'E') {
        const targetCode = getStory().accessCode;
        if (currentKeypadInput === targetCode) {
            display.innerText = "ACCEPTED";
            display.style.color = "#55ff55";
            setTimeout(() => {
                document.dispatchEvent(new Event('somatic-keypad-success'));
                const kp = document.getElementById('keypad-overlay');
                if (kp) kp.style.display = 'none';
                player.input.state.isReading = false;
            }, 500);
        } else {
            display.innerText = "DENIED";
            display.style.color = "#ff5555";
            acoustics.triggerSomaticEvent('breaker', 1.0, 0.5);
            setTimeout(() => {
                currentKeypadInput = "";
                display.innerText = "_";
                display.style.color = "#55ff55";
            }, 800);
        }
    } else {
        if (currentKeypadInput.length < 4) {
            currentKeypadInput += char;
            display.innerText = currentKeypadInput.padEnd(4, '_');
        }
    }
};

document.addEventListener('keydown', (e) => {
    const keypadOverlay = document.getElementById('keypad-overlay');
    if (keypadOverlay && keypadOverlay.style.display !== 'none') {
        if (e.key >= '0' && e.key <= '9') {
            window.handleKeypad(e.key);
        } else if (e.key.toLowerCase() === 'c' || e.key === 'Backspace' || e.key === 'Delete') {
            window.handleKeypad('C');
        } else if (e.key === 'Enter') {
            window.handleKeypad('E');
        }
    }
});

function idleSaveState() {
    if (window.requestIdleCallback) {
        requestIdleCallback(() => saveState());
    } else {
        saveState();
    }
}

const saveInterval = setInterval(idleSaveState, 2500);
document.getElementById('clearSaveBtn')?.addEventListener('click', async () => {
    player.isDead = true;
    const flash = document.getElementById('flash-overlay');
    if (flash) {
        flash.style.transition = 'none';
        flash.style.backgroundColor = '#8a3333';
        flash.style.opacity = '1';
    }
    clearInterval(saveInterval);
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

function triggerBlackout() {
    const seedInput = document.getElementById('seedInput');
    seedInput.value = seedInput.value + " NULL";
}

function triggerAscension() {
    const seedInput = document.getElementById('seedInput');
    const parts = seedInput.value.split(" FL-");
    const floor = parts[1] ? parseInt(parts[1]) + 1 : 1;
    seedInput.value = parts[0] + " FL-" + floor;
}

class UIManager {
    static update(time, engine, player) {
        if (time - (this._lastUpdate || 0) < 0.1) return;
        this._lastUpdate = time;
        if (!this.coordsEl) this.coordsEl = document.getElementById('coords');
        if (!this.batLevel) this.batLevel = document.getElementById('battery-level');
        if (!this.stamLevel) this.stamLevel = document.getElementById('stamina-level');
        if (!this.invBat) this.invBat = document.getElementById('inv-bat');
        if (!this.invH2o) this.invH2o = document.getElementById('inv-h2o');
        if (this.coordsEl) {
            const cohInt = Math.round((player.coherence !== undefined ? player.coherence : 1.0) * 100);
            const newCoords = `X: ${engine.camera.position.x.toFixed(1)} | Z: ${engine.camera.position.z.toFixed(1)} | COH: ${cohInt.toString().padStart(2, '0')}%`;
            if (this.coordsEl._last !== newCoords) {
                this.coordsEl.innerText = newCoords;
                if (cohInt < 20) this.coordsEl.style.color = '#ff5555';
                else if (cohInt < 50) this.coordsEl.style.color = '#ffaa55';
                else this.coordsEl.style.color = '';
                this.coordsEl._last = newCoords;
            }
        }
        if (this.batLevel) {
            const batInt = Math.round(player.flashlightBattery);
            if (this.batLevel._last !== batInt) {
                this.batLevel.style.width = `${batInt}%`;
                this.batLevel.style.backgroundColor = batInt > 50 ? '#55ff55' : (batInt > 20 ? '#ffff55' : '#ff5555');
                this.batLevel._last = batInt;
            }
        }
        if (this.stamLevel) {
            const stamInt = Math.round(player.stamina);
            if (this.stamLevel._last !== stamInt) {
                this.stamLevel.style.width = `${stamInt}%`;
                this.stamLevel.style.backgroundColor = stamInt > 50 ? '#ffffff' : (stamInt > 20 ? '#aaaaaa' : '#ff5555');
                this.stamLevel._last = stamInt;
            }
        }
        if (this.invBat && this.invH2o) {
            if (this.invBat._last !== player.inventory.batteries) {
                this.invBat.innerText = player.inventory.batteries;
                this.invBat.style.color = player.inventory.batteries === 0 ? '#ff5555' : '';
                this.invBat._last = player.inventory.batteries;
            }
            if (this.invH2o._last !== player.inventory.almondWater) {
                this.invH2o.innerText = player.inventory.almondWater;
                this.invH2o.style.color = player.inventory.almondWater === 0 ? '#ff5555' : '';
                this.invH2o._last = player.inventory.almondWater;
            }
        }
    }
}

const DebugHUD = {
    el: null,
    visible: false,
    _last: 0,
    _fps: 60,
    _hitches: 0,
    _genHitches: 0,
    _worstHitch: 0,
    recordFrame(delta) {
        if (delta <= 0.05) return;
        this._hitches++;
        if (environment.isBuildingChunk) this._genHitches++;
        if (delta > this._worstHitch) this._worstHitch = delta;
    },
    toggle() {
        if (!this.el) this.el = document.getElementById('debug-hud');
        if (!this.el) return;
        this.visible = !this.visible;
        this.el.style.display = this.visible ? 'block' : 'none';
    },
    update(time, delta, telemetry) {
        if (!this.visible || !this.el) return;
        if (delta > 0) this._fps = this._fps * 0.95 + (1.0 / delta) * 0.05;
        if (time - this._last < 0.25) return;
        this._last = time;
        const cam = engine.camera.position;
        const info = engine.renderer.info.render;
        const anomaly = environment.anomaly;
        const anomalyDist = anomaly && anomaly.isActive
            ? Math.sqrt(anomaly.group.position.distanceToSquared(cam)).toFixed(1) + 'm'
            : 'inactive';
        const grace = anomaly && anomaly.graceTimer > 0 ? ` grace:${anomaly.graceTimer.toFixed(1)}s` : '';
        const pois = environment.pointsOfInterest || [];
        const unclaimed = pois.filter(p => !p.active).length;
        const seedStr = document.getElementById('seedInput').value;
        this.el.innerText =
            `SEED  ${seedStr} (0x${(environment.baseSeed >>> 0).toString(16)})\n` +
            `SECT  ${telemetry.activeSector}  CHUNK ${environment.currentChunkCoords.x},${environment.currentChunkCoords.z}\n` +
            `POS   ${cam.x.toFixed(1)}, ${cam.y.toFixed(2)}, ${cam.z.toFixed(1)}${player.isGodMode ? '  [GOD]' : ''}\n` +
            `FPS   ${this._fps.toFixed(0)}  CALLS ${info.calls}  TRIS ${(info.triangles / 1000).toFixed(0)}k\n` +
            `ANOM  ${anomalyDist}${grace}${player.isChased ? ' CHASING' : ''}\n` +
            `POI   ${unclaimed}/${pois.length} unclaimed  HOPS ${environment._breakerHuntHops ?? '-'}\n` +
            `FIXT  ${environment.fixtureData.length}  CHUNKS ${environment.activeChunks.size}\n` +
            `OBJ   ${player.objectives.fixed}/${player.objectives.total}  COH ${(player.coherence * 100).toFixed(0)}%\n` +
            `PERF  hitch ${this._hitches} (${this._genHitches} gen) worst ${(this._worstHitch * 1000).toFixed(0)}ms` +
            (environment.genStats ? `  chunk avg ${(environment.genStats.totalMs / environment.genStats.count).toFixed(1)}ms worst ${environment.genStats.worstMs.toFixed(1)}ms` : '');
    }
};

document.addEventListener('keydown', (e) => {
    if (e.code !== 'Backquote') return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    DebugHUD.toggle();
});

function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    DebugHUD.recordFrame(delta);
    if (player.isDead) {
        engine.render();
        return;
    }
    environment.updateChunks(engine.camera.position);
    environment.updateInteractives(engine.camera.position, delta);
    if (engine.camera.position.y < -15.0 && player.isGodMode) {
        engine.camera.position.y = 3.0;
        player.velocity.set(0, 0, 0);
    }
    if (engine.camera.position.y < -15.0 && !player.isDead) {
        player.isDead = true;
        setTimeout(() => {
            triggerBlackout();
            player.resetMetabolism();
            environment.generate();
            player.isDead = false;
        }, 400);
        return;
    }
    const entityState = environment.updateEntity(engine.camera.position, delta, time);
    if (entityState && entityState.consumed) {
        player.isDead = true;
        engine.camera.position.y = 0.2;
        engine.camera.rotation.z = Math.PI / 2.5;
        setTimeout(() => {
            triggerBlackout();
            player.resetMetabolism();
            environment.generate();
            player.isDead = false;
        }, 1500);
        return;
    }
    player.update(delta, environment.spatialGrid);
    if (engine.camera.position.y > 2.8 && player.onWarpZone && !environment.isSpawning) {
        environment.generate(true);
        return;
    }
    engine.exhaustion = player.exhaustion;
    const squeezeFactor = (player.baseRadius - player.playerRadius) / (player.baseRadius - player.squeezeRadius);
    engine.squeeze = Math.max(0.0, Math.min(1.0, squeezeFactor));
    const telemetry = environment.updateLights(time);
    telemetry.paranoia = player.paranoia || 0.0;
    telemetry.adrenaline = engine.adrenaline;
    telemetry.eyesClosed = engine.eyesClosed;
    acoustics.update(telemetry);
    engine.anomaly = telemetry.anomalyPressure + (telemetry.paranoia * 0.5);
    engine.darkness = player.perceivedDarkness || 0.0;
    engine.paranoia = telemetry.paranoia;
    engine.adrenaline = player.adrenalineTimer > 0 ? (player.adrenalineTimer / 2.5) : 0.0;
    engine.eyesClosed = player.input.state.isClosingEyes ? 1.0 : 0.0;
    if (engine.paranoia > 0.4 && Math.random() < (engine.paranoia * delta * 0.3)) {
        const fakeDistSq = Math.pow(10.0 + (Math.random() * 20.0), 2);
        acoustics.triggerSomaticEvent(Math.random() > 0.7 ? 'door' : 'step', fakeDistSq, 0.3 + Math.random() * 0.5);
    }
    UIManager.update(time, engine, player);
    DebugHUD.update(time, delta, telemetry);
    engine.render();
}

animate();

function updateVHSTime() {
    const now = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const vhsTimeDisplay = document.getElementById('vhs-time');
    if (vhsTimeDisplay) {
        vhsTimeDisplay.innerHTML = `${ampm} ${String(hours).padStart(2, '0')}:${mins}:${secs}<br>${month} ${day} ${year}`;
    }
}

setInterval(updateVHSTime, 1000);
updateVHSTime();