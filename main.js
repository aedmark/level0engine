// main.js
// LEVEL 0 SYSTEM BOOTSTRAP

import RenderEngine from './RenderEngine.js';
import PlayerController from './PlayerController.js';
import Environment from './Environment.js';
import AcousticEngine from './AcousticEngine.js';

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
    environment.baseFogDensity = (Number(savedState.fog) || 5) / 100;
}
const bootAudio = () => acoustics.init();
document.addEventListener('click', bootAudio, {once: true});
document.addEventListener('keydown', bootAudio, {once: true});
document.addEventListener('somatic-step', (e) => acoustics.triggerSomaticEvent('step', 0, e.detail.intensity));
document.addEventListener('somatic-door', (e) => acoustics.triggerSomaticEvent('door', e.detail.distSq, e.detail.intensity));
const saveInterval = setInterval(saveState, 2500);
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

function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    if (player.isDead) {
        engine.render();
        return;
    }
    environment.updateChunks(engine.camera.position);
    environment.updateInteractives(engine.camera.position, delta);

    if (engine.camera.position.y < -15.0 && !player.isDead) {
        player.isDead = true;
        setTimeout(() => {
            triggerBlackout();
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
    acoustics.update(telemetry);
    engine.anomaly = telemetry.anomalyPressure;
    engine.darkness = player.perceivedDarkness || 0.0;
    document.getElementById('coords').innerText = `X: ${engine.camera.position.x.toFixed(2)} | Z: ${engine.camera.position.z.toFixed(2)}`;
    const batLevel = document.getElementById('battery-level');
    if (batLevel) {
        batLevel.style.width = `${player.flashlightBattery}%`;
        if (player.flashlightBattery > 50) {
            batLevel.style.backgroundColor = '#55ff55';
        } else if (player.flashlightBattery > 20) {
            batLevel.style.backgroundColor = '#ffff55';
        } else {
            batLevel.style.backgroundColor = '#ff5555';
        }
    }
    if (!player.isRunning) {
        const runBtn = document.getElementById('mobile-run');
        if (runBtn) runBtn.classList.remove('active');
    }
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