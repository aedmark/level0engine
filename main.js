// main.js
// LEVEL 0 SYSTEM BOOTSTRAP

import RenderEngine from './src/core/RenderEngine.js';
import PlayerController from './src/player/PlayerController.js';
import Environment from './src/core/Environment.js';
import AcousticEngine from './src/audio/AcousticEngine.js';
import StoryEngine from './src/narrative/StoryEngine.js';

import SaveManager from './src/system/SaveManager.js';
import SomaticController from './src/system/SomaticController.js';
import DocumentViewer from './src/ui/DocumentViewer.js';
import KeypadController from './src/ui/KeypadController.js';
import InquestController from './src/ui/InquestController.js';
import UIManager from './src/ui/UIManager.js';
import { DebugHUD } from './src/ui/DebugHUD.js';

const engine = new RenderEngine();
const acoustics = new AcousticEngine();
window.acoustics = acoustics;
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);
window.environment = environment;

const saveManager = new SaveManager(engine, player, environment, acoustics);
const somatic = new SomaticController(acoustics);

function getStory() {
    if (!getStory._cache || getStory._lastSeed !== environment.baseSeed) {
        getStory._cache = new StoryEngine(environment.baseSeed);
        getStory._lastSeed = environment.baseSeed;
    }
    return getStory._cache;
}

const docViewer = new DocumentViewer(player, acoustics, getStory);
const keypad = new KeypadController(player, acoustics, getStory);

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

const inquest = new InquestController(player, acoustics, engine, environment, getStory, triggerAscension, triggerBlackout);

// Initialize State
const savedState = saveManager.loadState();
if (!document.getElementById('seedInput').value) {
    document.getElementById('seedInput').value = saveManager.generateCardSeed();
}
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

// Bind all UI & System Events
somatic.bindEvents();
docViewer.bindEvents();
keypad.bindEvents();
inquest.bindEvents();
DebugHUD.bindEvents();
saveManager.startAutoSave();
UIManager.startVHSTimer();

document.getElementById('sectorHuntSelect')?.addEventListener('change', async (e) => {
    const targetSector = e.target.value;
    if (!targetSector) return;
    
    let attempts = 0;
    const baseSeedStr = document.getElementById('seedInput').value.split('-F')[0];
    const originalSeed = document.getElementById('seedInput').value;
    
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.opacity = '0.5';
    
    while(attempts < 150) {
        const testSeed = baseSeedStr + "-F" + attempts;
        document.getElementById('seedInput').value = testSeed;
        environment.generate();
        environment.updateChunks(new THREE.Vector3(0, 1.6, 0));
        
        while (environment.isBuildingChunk || environment.chunkQueue.length > 0) {
            await new Promise(r => setTimeout(r, 5));
        }
        
        const zones = Array.from(environment.macroZones.values());
        const target = zones.find(z => z.id === targetSector);
        
        if (target) {
            const tx = (target.startX + 7) * environment.cellSize;
            const tz = (target.startZ + 3) * environment.cellSize;
            engine.camera.position.set(tx, 1.6, tz);
            console.log(`[SectorHunt] Found ${targetSector} on seed ${testSeed}`);
            e.target.value = "";
            if (uiLayer) uiLayer.style.opacity = '1';
            return;
        }
        attempts++;
        if (attempts % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }
    
    console.log(`[SectorHunt] Could not find ${targetSector} after 150 attempts.`);
    document.getElementById('seedInput').value = originalSeed;
    environment.generate();
    e.target.value = "";
    if (uiLayer) uiLayer.style.opacity = '1';
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    DebugHUD.recordFrame(delta, environment);
    
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
    engine.heatTarget = telemetry.activeSector === "INCINERATOR" ? 1.0 : 0.0;
    engine.adrenaline = player.adrenalineTimer > 0 ? (player.adrenalineTimer / 2.5) : 0.0;
    engine.eyesClosed = player.input.state.isClosingEyes ? 1.0 : 0.0;
    
    if (engine.paranoia > 0.4 && Math.random() < (engine.paranoia * delta * 0.3)) {
        const fakeDistSq = Math.pow(10.0 + (Math.random() * 20.0), 2);
        acoustics.triggerSomaticEvent(Math.random() > 0.7 ? 'door' : 'step', fakeDistSq, 0.3 + Math.random() * 0.5);
    }
    
    UIManager.update(time, engine, player, environment);
    DebugHUD.update(time, delta, telemetry, engine, player, environment);
    
    engine.render();
}

animate();