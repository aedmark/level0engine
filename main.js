// main.js
// LEVEL 0 SYSTEM BOOTSTRAP
import RenderEngine from './RenderEngine.js';
import PlayerController from './PlayerController.js';
import Environment from './Environment.js';

const engine = new RenderEngine();
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);
environment.setup();

// THE STATE MANAGER
const StateManager = {
    save: () => {
        const state = {
            spatial: {
                posX: engine.camera.position.x,
                posY: engine.camera.position.y,
                posZ: engine.camera.position.z,
                rotX: engine.camera.rotation.x,
                rotY: engine.camera.rotation.y
            },
            config: {
                seed: document.getElementById('seedInput').value,
                aspect: document.getElementById('aspectSelect').value,
                fog: document.getElementById('fogSlider').value,
                fov: document.getElementById('fovSlider').value,
                res: document.getElementById('resolutionSelect').value,
                headBob: document.getElementById('headBobToggle').checked
            }
        };
        localStorage.setItem('level0_state', JSON.stringify(state));

        // Visual Feedback (The Chef's Kiss)
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "STATE PRESERVED";
        saveBtn.style.background = "#d4c382";
        saveBtn.style.color = "#000";
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.background = "";
            saveBtn.style.color = "";
        }, 1000);
    },

    load: () => {
        const data = localStorage.getItem('level0_state');
        if (!data) return;
        const state = JSON.parse(data);

        // 1. Restore UI DOM State
        document.getElementById('seedInput').value = state.config.seed;
        document.getElementById('aspectSelect').value = state.config.aspect;
        document.getElementById('fogSlider').value = state.config.fog;
        document.getElementById('fovSlider').value = state.config.fov;
        document.getElementById('resolutionSelect').value = state.config.res;
        document.getElementById('headBobToggle').checked = state.config.headBob;

        // 2. Dispatch Configuration to Engine
        engine.aspectRatio = state.config.aspect === 'auto' ? 'auto' : parseFloat(state.config.aspect);
        environment.baseFogDensity = state.config.fog / 100;
        engine.camera.fov = Number(state.config.fov);
        engine.camera.updateProjectionMatrix();
        engine.resolutionScale = parseFloat(state.config.res);
        player.enableHeadBob = state.config.headBob;
        engine.resize();

        // 3. Rebuild the Geodesic Foundation BEFORE moving the camera
        environment.generate();

        // 4. Snap the Spatial Coordinates
        engine.camera.position.set(state.spatial.posX, state.spatial.posY, state.spatial.posZ);
        engine.camera.rotation.set(state.spatial.rotX, state.spatial.rotY, 0, 'YXZ');

        // 5. Force the chunk manager to recognize the immediate spatial jump
        environment.updateChunks(engine.camera.position);
    }
};

// Bind the DOM elements
document.getElementById('saveBtn').addEventListener('click', StateManager.save);
document.getElementById('loadBtn').addEventListener('click', StateManager.load);

// Auto-Save Lifecycle Hooks
window.addEventListener('blur', StateManager.save);
window.addEventListener('beforeunload', StateManager.save);

function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    environment.updateChunks(engine.camera.position);
    environment.updateInteractives(engine.camera.position, delta);
    player.update(delta, environment.spatialGrid);
    environment.updateEntity(player, delta);
    environment.updateLights(time);
    engine.render();
}

animate();

// VHS Clock Tick
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
        vhsTimeDisplay.innerText = `${ampm} ${String(hours).padStart(2, '0')}:${mins}:${secs} \u00A0\u00A0 ${month} ${day} ${year}`;
    }
}

setInterval(updateVHSTime, 1000);
updateVHSTime();