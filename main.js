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
import BootController from './src/ui/BootController.js';
import ContinuePrompt from './src/ui/ContinuePrompt.js';

// Everything the browser did before this line — HTML parse, r160.js, the 121-module
// graph — is already spent by the time any engine code runs, and BootController's own
// clock cannot see it. Captured here so the final report can attribute it honestly
// instead of quoting an engine-only number as if it were total boot time.
const T_MODULES_READY = performance.now();

// Blocks here, before anything else runs, if a prior save exists — the player picks
// Continue or New Game. New Game purges localStorage/IndexedDB/caches first, so
// everything below (including the boot sequence itself) starts from a clean slate.
await ContinuePrompt.resolve();

// Reported separately from engine time: a player deliberating at the Continue screen
// is not the engine being slow, and folding it in made boot look arbitrarily bad.
const T_PROMPT_DONE = performance.now();

const bootCtrl = BootController.getInstance();
bootCtrl.init({
    preInitMs: T_MODULES_READY,
    promptMs: T_PROMPT_DONE - T_MODULES_READY
});
bootCtrl.setPhase('DATA');

const storyPromise = StoryEngine.loadData('./data', (fraction, fileName) => {
    bootCtrl.setPhaseProgress(fraction, `PARSED CASE DATA: ${fileName}`);
});
const engine = new RenderEngine();
bootCtrl.logDeviceInfo(engine);
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
// Read by Environment.generate() during setup(). One-shot: it clears itself, so a later
// reseed drops the player into the maze the way it always has.
environment.wantsElevatorSpawn = !savedState;
// Restored before setup() because generate() re-arms the car from this during setup,
// and the first chunk build needs to know which of its props are already spent.
environment.elevatorAnchor = (savedState && savedState.elevator) || null;
if (savedState && Array.isArray(savedState.consumed)) {
    environment.consumedProps = new Set(savedState.consumed);
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
    if (savedState.flashlightActive !== undefined) player.input.state.flashlightActive = savedState.flashlightActive;
    if (savedState.isCrouching !== undefined) player.input.state.isCrouching = savedState.isCrouching;
    if (savedState.isCrawling !== undefined) player.input.state.isCrawling = savedState.isCrawling;
    if (savedState.invBat !== undefined) player.inventory.batteries = savedState.invBat;
    if (savedState.invH2o !== undefined) player.inventory.almondWater = savedState.invH2o;
    if (savedState.hasExitKey !== undefined) player.inventory.hasExitKey = savedState.hasExitKey;
    if (savedState.depth !== undefined) player.depth = savedState.depth;
    if (savedState.bestDepth !== undefined) player.bestDepth = savedState.bestDepth;
    player.updateObjectives();
    environment.baseFogDensity = (Number(savedState.fog) || 5) / 100;
    environment.needsSafeSpawn = false;
}
// No setPhase here: environment.setup() has already advanced the boot sequence to
// phase 4, and re-announcing phase 3 drove the badge backwards and logged a duplicate,
// bogus phase-3 duration into the console table.
environment.updateChunks(engine.camera.position);
somatic.bindEvents();
docViewer.bindEvents();
keypad.bindEvents();
inquest.bindEvents();
DebugHUD.bindEvents();
// Arms autosave. Everything above has finished applying savedState, so the camera is
// no longer sitting on the position generate() parked it at.
saveManager.markBootComplete();
saveManager.startAutoSave();
UIManager.startVHSTimer();

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
    if (environment.isSpawning || (environment.isBuildingChunk && environment.isSectorTransitioning) || environment.isBuildingMacroInterior) {
        if (!player.wasFrozenByLoad) {
            player.isFrozen = true;
            player.input.isFrozen = true;
            player.wasFrozenByLoad = true;
            if (!environment.isSpawning) {
                // A real reset, not a setPhase on the already-finished boot sequence:
                // that left the bar pinned at 100% with a stale "PHASE 03/06" badge,
                // because targetProgress only climbs and the rAF loop had already exited.
                bootCtrl.beginSubLoad('LOADING ANOMALOUS SECTOR...');
                bootCtrl.addLog('MATERIALIZING SECTOR BOUNDARY CHUNKS...');
            }
            const flash = document.getElementById('flash-overlay');
            if (flash) {
                flash.style.transition = 'opacity 0.2s ease-out';
                flash.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                flash.style.opacity = '1';
                const loading = document.getElementById('loading-indicator');
                if (loading) loading.style.display = 'block';
            }
        }
    } else if (player.wasFrozenByLoad) {
        player.isFrozen = false;
        player.input.isFrozen = false;
        player.wasFrozenByLoad = false;
        environment.isSectorTransitioning = false;
        // Closes out whatever beginSubLoad opened above, so the overlay's own rAF loop
        // stops rather than spinning for the rest of the session.
        bootCtrl.endSubLoad();
        const flash = document.getElementById('flash-overlay');
        if (flash) {
            flash.style.transition = 'opacity 0.8s ease-out';
            flash.style.opacity = '0';
            const loading = document.getElementById('loading-indicator');
            if (loading) loading.style.display = 'none';
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
    environment.drainShadowPrewarm(2.0);
    // A load overlay freezes the player, so a shader-link stall is invisible there and a
    // visible hitch during play. Firefox cannot poll link status without blocking on it
    // (no KHR_parallel_shader_compile — see README, Browser Support), so the drain is
    // starved to one link per frame while the player has control and allowed to catch up
    // in bulk behind the overlay. Chromium polls either way and is unaffected.
    const linkStallMasked = player.wasFrozenByLoad;
    environment.drainProgramLinks(linkStallMasked ? 60.0 : 1.5, linkStallMasked);
}

/**
 * How many slices the boot shader compile is split into.
 *
 * Measured on the reference machine:
 *
 *     1 slice   -> 1075ms, no real checkpoints (crawl only)
 *     3 slices  ->  938ms, two real checkpoints
 *     27 slices -> 4853ms  <- naive one-slice-per-group; badly superlinear
 *
 * A few coarse slices cost nothing (they measured slightly faster than the single call,
 * within noise) while giving the bar real checkpoints to land on. Slicing finely is
 * where it falls apart — the cost grows far faster than the call count, so treat 27 as
 * a hard lesson rather than a tunable. Raising this much above single digits should be
 * re-measured, not assumed.
 */
const COMPILE_SLICES = 3;

/**
 * Compiles the scene a few top-level groups at a time instead of in one opaque call.
 *
 * `renderer.compileAsync(scene, camera)` over the whole scene took ~1075ms on the
 * reference machine and reports nothing while it runs, so the bar parked at its ceiling
 * for over a second — the single worst "is it frozen?" moment in the whole sequence.
 * Slicing it yields real progress between groups, and a synthetic crawl covers each
 * individual slice (which is still opaque internally).
 *
 * Lights and cameras stay resident in every slice because materials compile against the
 * lighting they will actually be rendered with; dropping them would compile the wrong
 * shader permutations and defeat the entire warmup. Swapping `scene.children` rather
 * than reparenting keeps every world matrix and the scene's own fog/environment intact
 * — the same technique ChunkManager._scopedCompile already relies on.
 */
async function compileSceneInGroups(engine, bootCtrl, targetSlices = COMPILE_SLICES) {
    const scene = engine.scene;
    const allChildren = scene.children;
    const resident = [];
    const rest = [];
    for (const child of allChildren) {
        (child.isLight || child.isCamera ? resident : rest).push(child);
    }

    if (rest.length === 0) {
        await engine.renderer.compileAsync(scene, engine.camera);
        return;
    }

    const sliceCount = Math.max(1, Math.min(targetSlices, rest.length));
    const groupsPerSlice = Math.ceil(rest.length / sliceCount);
    try {
        for (let i = 0; i < sliceCount; i++) {
            const slice = rest.slice(i * groupsPerSlice, (i + 1) * groupsPerSlice);
            scene.children = resident.concat(slice);
            // Each slice is still opaque, so crawl within the width it owns while it runs.
            bootCtrl.beginCrawl(600, (i + 1) / sliceCount);
            const t0 = performance.now();
            await engine.renderer.compileAsync(scene, engine.camera);
            bootCtrl.setPhaseProgress((i + 1) / sliceCount,
                `LINKED PROGRAM GROUP ${i + 1}/${sliceCount} (${Math.round(performance.now() - t0)}ms)`);
        }
    } finally {
        scene.children = allChildren;
    }
}

(async function() {
    // The initial chunk build is the single largest stretch of boot — around 4.5s of a
    // ~7s cold start — and it used to run inside this bare await with no reporting at
    // all, freezing the bar mid-sweep for most of the load. It now owns its own phase
    // and reports against the chunk count the streamer is actually targeting.
    bootCtrl.setPhase('CHUNKS');
    const chunkStart = performance.now();
    const expectedChunks = Math.max(1, environment.chunksToKeep ? environment.chunksToKeep.size : 9);
    let lastFlavor = performance.now();

    while (environment.isBuildingChunk || environment.chunkQueue.length > 0 || environment.isBuildingMacroInterior) {
        const built = environment.genStats ? environment.genStats.count : 0;
        bootCtrl.setPhaseProgress(Math.min(0.97, built / expectedChunks));
        // The flavor lines are the only thing telling a player this phase is alive
        // during long stalls on slower hardware.
        if (performance.now() - lastFlavor > 1800) {
            bootCtrl.triggerWhimsicalFlavor('CHUNKS');
            lastFlavor = performance.now();
        }
        await new Promise(r => setTimeout(r, 20));
    }
    const builtTotal = environment.genStats ? environment.genStats.count : 0;
    bootCtrl.setPhaseProgress(1,
        `SPATIAL CHUNK GEOMETRY MATERIALIZED [${builtTotal} CHUNKS] (${Math.round(performance.now() - chunkStart)}ms)`);

    bootCtrl.setPhase('SHADERS');
    bootCtrl.addLog('RUNNING PARALLEL WEBGL SHADER COMPILER...');

    const compileStart = performance.now();
    await compileSceneInGroups(engine, bootCtrl);

    bootCtrl.setPhaseProgress(1, `SHADER PROGRAM PERMUTATIONS LINKED [OK] (${Math.round(performance.now() - compileStart)}ms)`);

    environment.isSectorTransitioning = false;
    environment.isBuildingMacroInterior = false;
    player.wasFrozenByLoad = false;
    player.isFrozen = false;
    player.input.isFrozen = false;

    engine.render();
    animate();

    await bootCtrl.finish();
})();