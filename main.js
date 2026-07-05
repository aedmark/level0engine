// main.js
// LEVEL 0 SYSTEM BOOTSTRAP
import RenderEngine from './RenderEngine.js';
import PlayerController from './PlayerController.js';
import Environment from './Environment.js';

const engine = new RenderEngine();
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);
environment.setup();

function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    environment.updateChunks(engine.camera.position);
    environment.updateInteractives(engine.camera.position, delta);
    player.update(delta, environment.spatialGrid);
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