import RenderEngine from './src/core/RenderEngine.js';
import * as SectorPlacement from './src/world/SectorPlacement.js';
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
import {AtmosphereTuner} from './src/ui/AtmosphereTuner.js';
import RemapController from './src/ui/RemapController.js';
import BootController from './src/ui/BootController.js';
import ContinuePrompt from './src/ui/ContinuePrompt.js';

const T_MODULES_READY = performance.now();

await ContinuePrompt.resolve();

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
player.env = environment;
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
environment.wantsElevatorSpawn = !savedState;
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
    if (savedState.staminaCooldownTimer !== undefined) player.staminaCooldownTimer = savedState.staminaCooldownTimer;
    if (savedState.battery !== undefined) player.flashlightBattery = savedState.battery;
    if (savedState.flashlightCooldownTimer !== undefined) player.flashlightCooldownTimer = savedState.flashlightCooldownTimer;
    if (savedState.flashlightActive !== undefined) player.input.state.flashlightActive = savedState.flashlightActive;
    if (savedState.isCrouching !== undefined) player.input.state.isCrouching = savedState.isCrouching;
    if (savedState.isCrawling !== undefined) player.input.state.isCrawling = savedState.isCrawling;

    if (savedState.hasExitKey !== undefined) player.inventory.hasExitKey = savedState.hasExitKey;
    if (savedState.depth !== undefined) player.depth = savedState.depth;
    if (savedState.bestDepth !== undefined) player.bestDepth = savedState.bestDepth;
    player.updateObjectives();
    environment.baseFogDensity = (Number(savedState.fog) || 5) / 100;
    environment.needsSafeSpawn = false;
}
environment.updateChunks(engine.camera.position);
somatic.bindEvents();
docViewer.bindEvents();
keypad.bindEvents();
inquest.bindEvents();
DebugHUD.bindEvents();
AtmosphereTuner.bindEvents();
saveManager.markBootComplete();
saveManager.startAutoSave();
UIManager.startVHSTimer();

document.getElementById('forceWinBtn')?.addEventListener('click', () => {
    if (environment && environment.player) {
        environment.player.objectives.fixed = environment.player.objectives.total;
        environment.player.inventory.hasExitKey = true;
        environment.player.updateObjectives("WIN STATE FORCED");
        console.log("Forced win state: Exit Sector is now accessible.");
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
    
    if (targetSector === "EXIT") {
        const exitStr = SectorPlacement.getExitChunk(SectorPlacement.placementConfig(environment));
        if (exitStr) {
            const parts = exitStr.split(',');
            const cx = parseInt(parts[0], 10);
            const cz = parseInt(parts[1], 10);
            const targetX = cx * chunkWorldSize + chunkWorldSize / 2;
            const targetZ = cz * chunkWorldSize + chunkWorldSize / 2;
            
            engine.camera.position.set(targetX, 1.6, targetZ);
            environment.updateChunks(engine.camera.position);
            while (environment.isBuildingChunk || environment.chunkQueue.length > 0) {
                await new Promise(r => setTimeout(r, 5));
            }
            for (const [hash, zone] of environment.macroZones.entries()) {
                if (zone.id === "EXIT") {
                    foundHash = hash;
                    foundZone = zone;
                    break;
                }
            }
        }
    }

    if (!foundZone) {
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
    const hasEntrance = foundZone.entranceX !== undefined && foundZone.entranceZ !== undefined;
    const tx = (hasEntrance ? foundZone.entranceX : foundZone.startX + 7) * environment.cellSize;
    const tz = (hasEntrance ? foundZone.entranceZ : foundZone.startZ + 3) * environment.cellSize;
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
    function handlePlayerDeath(timeoutMs) {
        player.isDead = true;
        setTimeout(() => {
            triggerBlackout();
            player.resetMetabolism();
            environment.generate();
            player.isDead = false;
        }, timeoutMs);
    }

    if (engine.camera.position.y < -15.0 && !player.isDead) {
        let currentZone = null;
        for (const zone of environment.macroZones.values()) {
            if (engine.camera.position.x > zone.minX - 40 && engine.camera.position.x < zone.maxX + 40 &&
                engine.camera.position.z > zone.minZ - 40 && engine.camera.position.z < zone.maxZ + 40) {
                currentZone = zone;
                break;
            }
        }
        if (!currentZone || currentZone.id !== 'ACME') {
            if (currentZone) {
                const tx = (currentZone.startX + 7.5) * environment.cellSize;
                const tz = (currentZone.startZ + 1.5) * environment.cellSize;
                engine.camera.position.set(tx, 3.0, tz);
                player.velocity.set(0, 0, 0);
                player.fallVelocity = 0;
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {intensity: 2.0}}));
                return;
            }
            handlePlayerDeath(400);
            return;
        }
    }
    const entityState = environment.updateEntity(engine.camera.position, delta, time);
    if (entityState && entityState.consumed) {
        engine.camera.position.y = 0.2;
        engine.camera.rotation.z = Math.PI / 2.5;
        acoustics.triggerSomaticEvent('thunder_crack', 0, 1.0);
        handlePlayerDeath(1500);
        return;
    }
    player.update(delta, environment.spatialGrid);
    compass.update(delta);
    flashlight.update(delta);
    paintballGun.update(delta);
    paintballSystem.update(delta);
    
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
    AtmosphereTuner.update(environment);
    engine.render();
    environment.drainShadowPrewarm(2.0);
    const linkStallMasked = player.wasFrozenByLoad;
    environment.drainProgramLinks(linkStallMasked ? 60.0 : 1.5, linkStallMasked);
}

const COMPILE_LEAF_BATCH = 16;

async function compileSceneInGroups(engine, bootCtrl, leafBatchSize = COMPILE_LEAF_BATCH) {
    const scene = engine.scene;
    const allChildren = scene.children;
    const resident = [];
    const chunkGroups = [];
    for (const child of allChildren) {
        (child.isLight || child.isCamera ? resident : chunkGroups).push(child);
    }

    if (chunkGroups.length === 0) {
        await engine.renderer.compileAsync(scene, engine.camera);
        return;
    }

    const leaves = [];
    for (const group of chunkGroups) {
        group.traverse((obj) => {
            if (obj.material) leaves.push(obj);
        });
    }

    if (leaves.length === 0) {
        await engine.renderer.compileAsync(scene, engine.camera);
        return;
    }

    const totalBatches = Math.ceil(leaves.length / leafBatchSize);
    const scratch = new THREE.Group();
    try {
        for (let i = 0; i < leaves.length; i += leafBatchSize) {
            const batch = leaves.slice(i, i + leafBatchSize);
            const realParents = batch.map(obj => obj.parent);
            for (const obj of batch) {
                scratch.children.push(obj);
                obj.parent = scratch;
            }
            scene.children = resident.concat([scratch]);
            const batchIdx = i / leafBatchSize + 1;
            bootCtrl.beginCrawl(400, batchIdx / totalBatches);
            const t0 = performance.now();
            await engine.renderer.compileAsync(scene, engine.camera);
            bootCtrl.setPhaseProgress(batchIdx / totalBatches,
                `LINKED PROGRAM GROUP ${batchIdx}/${totalBatches} (${Math.round(performance.now() - t0)}ms)`);
            for (let j = 0; j < batch.length; j++) {
                batch[j].parent = realParents[j];
            }
            scratch.children.length = 0;
        }
    } finally {
        scene.children = allChildren;
    }
}

(async function() {
    bootCtrl.setPhase('CHUNKS');
    const chunkStart = performance.now();
    const expectedChunks = Math.max(1, environment.chunksToKeep ? environment.chunksToKeep.size : 9);
    let lastFlavor = performance.now();

    while (environment.isBuildingChunk || environment.chunkQueue.length > 0 || environment.isBuildingMacroInterior) {
        const built = environment.genStats ? environment.genStats.count : 0;
        bootCtrl.setPhaseProgress(Math.min(0.97, built / expectedChunks));
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

    const postCompileStart = performance.now();
    await Promise.all([
        engine.renderer.compileAsync(engine.fxaaScene, engine.fxaaCamera),
        engine.renderer.compileAsync(engine.postScene, engine.postCamera)
    ]);
    bootCtrl.addLog(`POST-PROCESS SHADERS LINKED (${Math.round(performance.now() - postCompileStart)}ms)`);

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