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
import {DebugHUD} from './src/ui/DebugHUD.js';

const engine = new RenderEngine();
const acoustics = new AcousticEngine();
window.acoustics = acoustics;
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);
window.environment = environment;
let sectorHuntActive = false;
const saveManager = new SaveManager(engine, player, environment, acoustics);
const somatic = new SomaticController(acoustics);

/**
 * Lazy loads or retrieves the cached StoryEngine instance.
 * Rebuilds the narrative tree if the base seed changes.
 * @returns {StoryEngine} The active narrative instance.
 */
function getStory() {
    if (!getStory._cache || getStory._lastSeed !== environment.baseSeed) {
        getStory._cache = new StoryEngine(environment.baseSeed);
        getStory._lastSeed = environment.baseSeed;
    }
    return getStory._cache;
}

/**
 * Forces a soft-reset of the environment by mutating the seed string,
 * effectively plunging the player into a blackout/regenerated zone.
 */
function triggerBlackout() {
    const seedInput = document.getElementById('seedInput');
    seedInput.value = seedInput.value + " NULL";
}

/**
 * Increments the floor layer (FL-X) inside the seed, appending it
 * if it doesn't already exist. Prepares the environment for descent/ascent.
 */
function triggerAscension() {
    const seedInput = document.getElementById('seedInput');
    const parts = seedInput.value.split(" FL-");
    const floor = parts[1] ? parseInt(parts[1]) + 1 : 1;
    seedInput.value = parts[0] + " FL-" + floor;
}

function ensurePendingContentAtPlayer() {
    if (!environment._pendingMacroContent || environment._pendingMacroContent.size === 0) return;
    const px = engine.camera.position.x, pz = engine.camera.position.z;
    for (const [hash, zone] of environment.macroZones.entries()) {
        if (!environment._pendingMacroContent.has(hash)) continue;
        if (px >= zone.minX && px <= zone.maxX && pz >= zone.minZ && pz <= zone.maxZ) {
            environment.beginMacroChunkContent(hash);
            break;
        }
    }
}

const docViewer = new DocumentViewer(player, acoustics, getStory);
const keypad = new KeypadController(player, acoustics, getStory);
const inquest = new InquestController(player, acoustics, engine, environment, getStory, triggerAscension, triggerBlackout);
const savedState = saveManager.loadState();
if (!document.getElementById('seedInput').value) {
    document.getElementById('seedInput').value = saveManager.generateCardSeed();
}
await environment.setup();
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
    environment.updateChunks(engine.camera.position);
}
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
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.opacity = '0.5';
    const originalPos = engine.camera.position.clone();
    const chunkWorldSize = environment.chunkSize * environment.cellSize;
    const maxSteps = 200;
    let step = 0;
    let foundHash = null;
    let foundZone = null;
    sectorHuntActive = true;
    while (step < maxSteps) {
        environment.updateChunks(new THREE.Vector3(step * chunkWorldSize, 1.6, 0));
        while (environment.isBuildingChunk || environment.chunkQueue.length > 0) {
            await new Promise(r => setTimeout(r, 5));
        }
        for (const [hash, zone] of environment.macroZones.entries()) {
            if (zone.id === targetSector) {
                foundHash = hash;
                foundZone = zone;
                break;
            }
        }
        if (foundZone) break;
        step++;
        if (step % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }
    if (!foundZone) {
        sectorHuntActive = false;
        console.log(`[SectorHunt] Could not find ${targetSector} within ${maxSteps} chunk steps on the current seed.`);
        environment.updateChunks(originalPos);
        e.target.value = "";
        if (uiLayer) uiLayer.style.opacity = '1';
        return;
    }
    environment.beginMacroChunkContent(foundHash);
    let waited = 0;
    while (!environment.isMacroChunkContentReady(foundHash) && waited < 4000) {
        await new Promise(r => setTimeout(r, 20));
        waited += 20;
    }
    const tx = (foundZone.startX + 7) * environment.cellSize;
    const tz = (foundZone.startZ + 3) * environment.cellSize;
    engine.camera.position.set(tx, 1.6, tz);
    sectorHuntActive = false;
    console.log(`[SectorHunt] Found ${targetSector} at chunk ${foundHash} after ${step} chunk step(s), same seed.`);
    e.target.value = "";
    if (uiLayer) uiLayer.style.opacity = '1';
});

/**
 * The primary render loop. Orchestrates WebGL rendering, physics/collision hashing,
 * entity ticks, player input handling, and shader uniform updates.
 */
function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    DebugHUD.recordFrame(delta, environment);
    if (player.isDead) {
        engine.render();
        return;
    }
    if (!sectorHuntActive) environment.updateChunks(engine.camera.position);
    ensurePendingContentAtPlayer();
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
    telemetry.closestActiveValveDistSq = environment.closestActiveValveDistSq || 9999.0;
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