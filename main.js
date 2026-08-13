/**
 * [ROLE] Application entry point -- wires up the engine, player, environment, audio, and UI controllers and starts the game.
 * [WHY] Something has to own construction order and the handful of cross-cutting globals (window.environment, window.acoustics) the debug/UI layer reaches for.
 * [STATE] Constructs and holds the top-level singletons (engine, player, environment, saveManager, etc.) for the lifetime of the page.
 * [DEPENDS] Imports and instantiates nearly every top-level system in src/; loads narrative data from ./data via StoryEngine before anything else runs.
 */
import RenderEngine from './src/core/RenderEngine.js';
import PlayerController from './src/player/PlayerController.js';
import Compass from './src/player/Compass.js';
import Flashlight from './src/player/Flashlight.js';
import PaintballGun from './src/player/PaintballGun.js';
import PaintballSystem from './src/entities/PaintballSystem.js';
import Environment from './src/core/Environment.js';
import AcousticEngine from './src/audio/AcousticEngine.js';
import StoryEngine from './src/narrative/StoryEngine.js';
import SaveManager from './src/system/SaveManager.js';
import SomaticController from './src/system/SomaticController.js';
import DocumentViewer from './src/ui/DocumentViewer.js';
import JournalViewer from './src/ui/JournalViewer.js';
import KeypadController from './src/ui/KeypadController.js';
import InquestController from './src/ui/InquestController.js';
import UIManager from './src/ui/UIManager.js';
import {DebugHUD} from './src/ui/DebugHUD.js';
import RemapController from './src/ui/RemapController.js';

const storyPromise = StoryEngine.loadData('./data');
const engine = new RenderEngine();
const acoustics = new AcousticEngine();
window.acoustics = acoustics;
const player = new PlayerController(engine.camera, engine.renderer.domElement);
const environment = new Environment(engine, player);
window.environment = environment;
const compass = new Compass(engine, environment, player);
const flashlight = new Flashlight(engine, environment, player);
const paintballSystem = new PaintballSystem(engine, environment);
window.paintballSystem = paintballSystem;
const paintballGun = new PaintballGun(engine, environment, player);
let sectorHuntActive = false;
const saveManager = new SaveManager(engine, player, environment, acoustics);
const somatic = new SomaticController(acoustics);

function getStory() {
    if (!getStory._cache || getStory._lastSeed !== environment.baseSeed) {
        getStory._cache = new StoryEngine(environment.baseSeed);
        getStory._lastSeed = environment.baseSeed;
    }
    return getStory._cache;
}
environment.getStory = getStory;

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
const journalViewer = new JournalViewer(player, acoustics, getStory);
const keypad = new KeypadController(player, acoustics, getStory);
const inquest = new InquestController(player, acoustics, engine, environment, getStory, triggerAscension, triggerBlackout);
const remapController = new RemapController();
const savedState = saveManager.loadState();
if (!document.getElementById('seedInput').value) {
    document.getElementById('seedInput').value = saveManager.generateCardSeed();
}
await Promise.all([environment.setup(), storyPromise]);
if (savedState) {
    if (savedState.story && environment.getStory) {
        environment.getStory().importState(savedState.story);
    }
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

let isFirstBoot = !savedState;
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body && isFirstBoot) {
        isFirstBoot = false;
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('somatic-read', {
                detail: { docId: 'NOTE_TUTORIAL' }
            }));
        }, 1500);
    }
});

document.getElementById('sectorHuntSelect')?.addEventListener('change', async (e) => {
    const targetSector = e.target.value;
    if (!targetSector) return;
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.opacity = '0.5';
    const panel = document.querySelector('.control-panel');
    if (panel) panel.style.display = 'none';
    if (environment && environment.player && environment.player.input) {
        environment.player.input.state.isReading = false;
        document.body.requestPointerLock()?.catch(() => {});
        const vc = document.getElementById('virtual-cursor');
        if (vc) vc.classList.remove('active');
    }
    const originalPos = engine.camera.position.clone();
    const chunkWorldSize = environment.chunkSize * environment.cellSize;
    const maxSteps = 200;
    const CHUNK_DRAIN_TIMEOUT_MS = 4000;
    let step = 0;
    let foundHash = null;
    let foundZone = null;
    let stalled = false;
    sectorHuntActive = true;
    while (step < maxSteps) {
        environment.updateChunks(new THREE.Vector3(step * chunkWorldSize, 1.6, 0));
        let waited = 0;
        while (environment.isBuildingChunk || environment.chunkQueue.length > 0) {
            await new Promise(r => setTimeout(r, 5));
            waited += 5;
            if (waited >= CHUNK_DRAIN_TIMEOUT_MS) {
                stalled = true;
                break;
            }
        }
        if (stalled) break;
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
        if (stalled) {
            console.log(`[SectorHunt] Chunk generation did not settle within ${CHUNK_DRAIN_TIMEOUT_MS}ms at step ${step} — aborting search for ${targetSector}.`);
        } else {
            console.log(`[SectorHunt] Could not find ${targetSector} within ${maxSteps} chunk steps on the current seed.`);
        }
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

function animate() {
    requestAnimationFrame(animate);
    const delta = engine.delta;
    const time = engine.time;
    DebugHUD.recordFrame(delta, environment);
    if (player.isDead) {
        engine.render();
        return;
    }
    if ((environment.isBuildingChunk && environment.isSectorTransitioning) || environment.isBuildingMacroInterior) {
        if (!player.wasFrozenByLoad) {
            player.isFrozen = true;
            player.input.isFrozen = true;
            player.wasFrozenByLoad = true;
            const flash = document.getElementById('flash-overlay');
            if (flash) {
                flash.style.transition = 'opacity 0.2s ease-out';
                flash.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                flash.style.opacity = '1';
                const loading = document.getElementById('loading-indicator');
                if (loading) {
                    const loadingText = document.getElementById('loading-text');
                    if (loadingText) loadingText.innerText = 'LOADING SECTOR...';
                    loading.style.display = 'block';
                }
            }
        }
    } else if (player.wasFrozenByLoad) {
        player.isFrozen = false;
        player.input.isFrozen = false;
        player.wasFrozenByLoad = false;
        environment.isSectorTransitioning = false;
        const flash = document.getElementById('flash-overlay');
        if (flash) {
            flash.style.transition = 'opacity 0.8s ease-out';
            flash.style.opacity = '0';
            const loading = document.getElementById('loading-indicator');
            if (loading) {
                loading.style.display = 'none';
            }
        }
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
    compass.update(delta);
    flashlight.update(delta);
    paintballGun.update(delta);
    paintballSystem.update(delta);
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

(async function() {
    while (environment.isBuildingChunk || environment.chunkQueue.length > 0) {
        await new Promise(r => setTimeout(r, 20));
    }
    const flash = document.getElementById('flash-overlay');
    const loading = document.getElementById('loading-indicator');
    if (flash) {
        flash.style.transition = 'none';
        flash.style.backgroundColor = 'rgba(0, 0, 0, 1.0)';
        flash.style.opacity = '1';
    }
    if (loading) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.innerText = 'COMPILING SHADERS...';
        loading.style.display = 'block';
    }
    
    await engine.renderer.compileAsync(engine.scene, engine.camera);
    
    if (loading) loading.style.display = 'none';
    if (flash) {
        flash.style.transition = 'opacity 0.8s ease-out';
        flash.style.opacity = '0';
    }
    animate();
})();