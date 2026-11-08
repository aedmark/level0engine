import InputBindings from '../system/InputBindings.js';
import * as SectorPlacement from '../world/SectorPlacement.js';
import {OPENING, AXIS_DIRS, chooseSightingSpot, formatMarks} from './OpeningPlan.js';

// The first minutes of a new run (P5-04). Before this, a first-time player woke in a pitch-black car
// with an empty flashlight and a wall of instructions, and nothing frightening was guaranteed until
// the Anomaly's 90 s grace ran out, counted from world generation rather than from when the player
// could act. The director runs five beats: arrival, a seeded corridor sighting, the objective reveal
// with a near first breaker, grace held until the doorway, and timing marks for every beat.

const _ray = new THREE.Ray();
const _hit = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _toSpot = new THREE.Vector3();

function isOpaque(box) {
    return !box.isInvisibleBlocker && !box.isVoid && !(box.isGrate && box.meshRef && !box.meshRef.userData.active);
}

// Clear metres from (ox, oz) at eye height along (dx, dz), up to maxDist. Hits closer than half a
// metre are ignored so a doorframe the origin sits inside does not read as a wall.
function clearDistance(env, ox, oz, dx, dz, maxDist) {
    _origin.set(ox, 1.6, oz);
    _dir.set(dx, 0, dz).normalize();
    _ray.set(_origin, _dir);
    const boxes = env.spatialGrid.getNearby(ox + _dir.x * maxDist * 0.5, oz + _dir.z * maxDist * 0.5, maxDist * 0.5 + 2);
    let best = maxDist;
    for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (!isOpaque(box) || box.max.y < 0.4 || box.min.y > 2.2) continue;
        if (_ray.intersectBox(box, _hit)) {
            const d = _origin.distanceTo(_hit);
            if (d > 0.5 && d < best) best = d;
        }
    }
    return best;
}

export default class OpeningDirector {
    constructor({env, player, acoustics}) {
        this.env = env;
        this.player = player;
        this.acoustics = acoustics;
        this.active = false;
        this.t = 0;
        this.marks = {};
        this.loadToControl = null;
        this._cues = new Set();
        this._sighting = {state: 'idle', spot: null, until: 0};
        this._hintTimer = null;
    }

    // Called once the boot overlay has faded and the player can act.
    start() {
        const env = this.env;
        if (!env.openingRun) return;
        this.active = true;
        this.t = 0;
        this.marks = {control: 0};
        this.loadToControl = performance.now() / 1000;
        this.firstRun = !!env.openingFirstRun;
        const car = env._spawnElevator;
        this._startPos = {x: env.camera.position.x, z: env.camera.position.z};
        this._carCenter = car && car.cellX !== null && car.cellX !== undefined
            ? {x: car.cellX * env.cellSize, z: car.cellZ * env.cellSize}
            : null;
        this.player.objectivesHidden = true;
        this.player.updateObjectives();
        this._ensureDom();
        console.log(`[OPENING] control at ${this.loadToControl.toFixed(2)}s after load (${this.firstRun ? 'first run' : 'returning'})`);
    }

    update(delta) {
        this._watchFlashlight();
        if (!this.active) return;
        if (this.player.isDead) {
            this._finish('the player died before the opening ended');
            return;
        }
        this.t += delta;
        this._arrival();
        this._watchExit();
        this._holdGrace();
        this._updateSighting();
        this._watchMilestones();
    }

    hudText() {
        const rows = formatMarks(this.marks);
        if (!rows.length) return '-';
        return rows.map(r => `${r.beat} ${r.seconds}`).join(' · ');
    }

    _once(key) {
        if (this._cues.has(key)) return false;
        this._cues.add(key);
        return true;
    }

    _mark(key, value = this.t) {
        if (key in this.marks) return;
        this.marks[key] = value;
        console.log(`[OPENING] ${key} ${value === null ? 'missed' : `+${value.toFixed(1)}s`}`);
    }

    // Beat 1: the car settles, dings, and on a first run opens without a code.
    _arrival() {
        if (this.t >= OPENING.rumbleAt && this._once('rumble')) {
            this.acoustics.triggerSomaticEvent('thunder_rumble_1', 4.0, 0.7);
            if (this.firstRun) this._hint(this._controlsText(), 6500);
        }
        if (this.t >= OPENING.dingAt && this._once('ding')) {
            this.acoustics.triggerSomaticEvent('elevator_ding', 1.0, 0.8);
        }
        if (this.t >= OPENING.doorReleaseAt && this._once('release')) {
            if (this.firstRun) {
                this.env.openingDoorReleased = true;
                this.acoustics.triggerSomaticEvent('blastdoor', 2.0, 0.6);
                this._mark('doorOpen');
            }
        }
    }

    _controlsText() {
        const k = (a) => InputBindings.getKeyboardString(a);
        const move = ['moveForward', 'moveLeft', 'moveBackward', 'moveRight'].map(k).join('');
        return `${move} MOVE · ${k('flashlight')} FLASHLIGHT · ${k('interact')} READ`;
    }

    _watchExit() {
        if ('exit' in this.marks) return;
        const cam = this.env.camera.position;
        const c = this._carCenter || this._startPos;
        const limit = this._carCenter ? OPENING.exitRadius : 4.0;
        const dx = cam.x - c.x;
        const dz = cam.z - c.z;
        if (dx * dx + dz * dz < limit * limit) return;
        this._mark('exit');
        // Beat 3: the objective only means something once the player can act on it.
        this.player.objectivesHidden = false;
        this.player.updateObjectives();
        this._planSighting();
    }

    // Beat 4: the Anomaly's grace starts at the doorway, not at world generation.
    _holdGrace() {
        if ('exit' in this.marks) return;
        const anomaly = this._defaultAnomaly();
        if (anomaly && anomaly.graceTimer < OPENING.graceHold) anomaly.graceTimer = OPENING.graceHold;
    }

    _defaultAnomaly() {
        const em = this.env.entityManager;
        const anomaly = em && em.entities ? em.entities.DEFAULT : null;
        return anomaly && em.activeEntity === anomaly ? anomaly : null;
    }

    // Beat 2: the spot comes from the layout around the car, not from wherever the player wandered, so
    // everyone on a seed gets the same corridor. Corridors right outside the car are often short (11.6 m
    // at most on the first seed measured), so search open cells nearby for a long straight sight line.
    _planSighting() {
        if (!this._carCenter) {
            this._sighting.state = 'unavailable';
            this._mark('sighting', null);
            return;
        }
        const env = this.env;
        const cell = env.cellSize;
        const reach = Math.ceil(OPENING.sightingSearchRadius / cell);
        const maxRay = OPENING.sightingMaxDist + OPENING.sightingBackoff + 5;
        const candidates = [];
        for (let gx = -reach; gx <= reach; gx++) {
            for (let gz = -reach; gz <= reach; gz++) {
                const vx = this._carCenter.x + gx * cell;
                const vz = this._carCenter.z + gz * cell;
                const carDist = Math.hypot(gx * cell, gz * cell);
                if (carDist < cell || carDist > OPENING.sightingSearchRadius) continue;
                if (!this._isOpenCell(vx, vz)) continue;
                for (const dir of AXIS_DIRS) {
                    candidates.push({viewpoint: {x: vx, z: vz}, dir, carDist, free: clearDistance(env, vx, vz, dir.x, dir.z, maxRay)});
                }
            }
        }
        // The Anomaly never enters a sector, and during grace nothing would stop it being shown inside one.
        const spot = chooseSightingSpot(candidates.filter(c => {
            const d = Math.max(OPENING.sightingMinDist, Math.min(OPENING.sightingMaxDist, c.free - OPENING.sightingBackoff));
            return this._inBaseMaze(c.viewpoint.x, c.viewpoint.z) &&
                this._inBaseMaze(c.viewpoint.x + c.dir.x * d * 0.5, c.viewpoint.z + c.dir.z * d * 0.5) &&
                this._inBaseMaze(c.viewpoint.x + c.dir.x * d, c.viewpoint.z + c.dir.z * d);
        }));
        if (!spot) {
            this._sighting.state = 'unavailable';
            this._mark('sighting', null);
            const longest = candidates.reduce((m, c) => Math.max(m, c.free), 0);
            console.log(`[OPENING] no corridor within ${OPENING.sightingSearchRadius} m of the car is long enough (longest ${longest.toFixed(1)} m)`);
            return;
        }
        this._sighting = {state: 'armed', spot, until: 0};
        console.log(`[OPENING] sighting planned ${spot.dist.toFixed(1)} m down a corridor from (${spot.viewpoint.x}, ${spot.viewpoint.z})`);
    }

    _inBaseMaze(x, z) {
        const w = this.env.chunkSize * this.env.cellSize;
        return !SectorPlacement.isMacroChunk(SectorPlacement.placementConfig(this.env), Math.floor(x / w), Math.floor(z / w));
    }

    // A cell centre the player could stand in: nothing solid between knee and head height.
    _isOpenCell(x, z) {
        const boxes = this.env.spatialGrid.getNearby(x, z, 0.6);
        for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            if (!isOpaque(b) || b.max.y < 0.4 || b.min.y > 2.0) continue;
            if (x > b.min.x - 0.3 && x < b.max.x + 0.3 && z > b.min.z - 0.3 && z < b.max.z + 0.3) return false;
        }
        return true;
    }

    _updateSighting() {
        const s = this._sighting;
        if (s.state === 'armed') {
            const since = this.t - this.marks.exit;
            if (since > OPENING.sightingWindowEnd) {
                s.state = 'done';
                this._mark('sighting', null);
                return;
            }
            if (since < OPENING.sightingWindowStart) return;
            const anomaly = this._defaultAnomaly();
            if (!anomaly || anomaly.graceTimer <= 0) return;
            if (!this._canSee(s.spot)) return;
            s.state = 'showing';
            s.until = this.t + OPENING.sightingHold;
            anomaly.group.position.set(s.spot.x, 1.5, s.spot.z);
            anomaly.group.visible = true;
            this.acoustics.triggerSomaticEvent('whisper', s.spot.dist * s.spot.dist, 0.5);
            this._mark('sighting');
        } else if (s.state === 'showing') {
            const cam = this.env.camera.position;
            const dx = cam.x - s.spot.x;
            const dz = cam.z - s.spot.z;
            if (this.t >= s.until || dx * dx + dz * dz < OPENING.sightingNearCut * OPENING.sightingNearCut) {
                s.state = 'done';
                this._cutLights();
            }
        }
    }

    _canSee(spot) {
        const cam = this.env.camera.position;
        _toSpot.set(spot.x - cam.x, 0, spot.z - cam.z);
        const dist = _toSpot.length();
        if (dist < OPENING.sightingNearCut + 1 || dist > OPENING.sightingMaxDist + 8) return false;
        _toSpot.divideScalar(dist);
        this.env.camera.getWorldDirection(_fwd);
        _fwd.y = 0;
        _fwd.normalize();
        if (_fwd.dot(_toSpot) < OPENING.sightingLookDot) return false;
        return clearDistance(this.env, cam.x, cam.z, _toSpot.x, _toSpot.z, dist) >= dist - 0.5;
    }

    // The lights stutter and die for a moment; when they come back the corridor is empty.
    _cutLights() {
        const cut = this._cutEl;
        const anomaly = this._defaultAnomaly();
        const cam = this.env.camera.position;
        const hide = () => {
            const a = anomaly || this._defaultAnomaly();
            if (a && a.graceTimer > 0) a.group.position.set(cam.x + 10000, -1000, cam.z + 10000);
        };
        this.acoustics.triggerSomaticEvent('light_flicker', 4.0, 0.9);
        if (!cut) {
            hide();
            return;
        }
        cut.style.transition = 'none';
        cut.style.opacity = '1';
        setTimeout(() => { cut.style.opacity = '0'; }, 70);
        setTimeout(() => {
            cut.style.opacity = '1';
            hide();
            this.acoustics.triggerSomaticEvent('breaker', 2.0, 0.7);
        }, 160);
        setTimeout(() => {
            cut.style.transition = 'opacity 0.25s ease-in';
            cut.style.opacity = '0';
        }, 810);
    }

    _watchMilestones() {
        if (this.player.objectives.fixed >= 1) this._mark('firstBreaker');
        const anomaly = this._defaultAnomaly();
        if (anomaly && anomaly.graceTimer <= 0 && (anomaly.mood === 'HUNT' || (this.player.anomalyPressure || 0) > 0.25)) {
            this._mark('firstThreat');
        }
        if (('firstBreaker' in this.marks && 'firstThreat' in this.marks) || this.t > OPENING.reportAfter) {
            this._finish();
        }
    }

    _finish(reason) {
        if (!this.active) return;
        this.active = false;
        this.player.objectivesHidden = false;
        this.player.updateObjectives();
        if (this._sighting.state === 'showing') this._cutLights();
        console.log(`%c[OPENING] report${reason ? ` (${reason})` : ''}: control came ${this.loadToControl.toFixed(2)}s after load`, 'color:#fd7; font-weight:bold;');
        console.table(formatMarks(this.marks));
    }

    // Not part of the scripted opening: the first time the flashlight dies in this browser, say how to
    // recharge it. Kinetic charging is unusual enough that players miss it (it used to be the tutorial).
    _watchFlashlight() {
        if (this._shakeHinted) return;
        if (this.player.flashlightBattery > 5) return;
        this._shakeHinted = true;
        try {
            if (localStorage.getItem('level0_hint_shake')) return;
            localStorage.setItem('level0_hint_shake', '1');
        } catch (e) { /* storage refused: show it anyway */ }
        this._ensureDom();
        this._hint(`FLASHLIGHT DEAD · SWITCH IT OFF (${InputBindings.getKeyboardString('flashlight')}) AND SHAKE THE MOUSE TO CHARGE`, 7000);
    }

    _ensureDom() {
        if (this._hintEl) return;
        const parent = document.getElementById('screen-wrapper') || document.body;
        this._hintEl = document.createElement('div');
        this._hintEl.id = 'opening-hint';
        this._hintEl.className = 'osd-element';
        this._hintEl.style.cssText = 'left: 50%; bottom: 18%; transform: translateX(-50%); text-align: center; ' +
            'z-index: 100; pointer-events: none; opacity: 0; transition: opacity 0.6s ease; white-space: nowrap; ' +
            // The OSD flicker animation drives opacity and would override the fade.
            'animation: none;';
        parent.appendChild(this._hintEl);
        // Between the canvas (z 1) and the HUD (z 10): the lights go out, the instruments do not.
        this._cutEl = document.createElement('div');
        this._cutEl.id = 'opening-cut';
        this._cutEl.style.cssText = 'position: absolute; inset: 0; background: #000; opacity: 0; z-index: 5; pointer-events: none;';
        parent.appendChild(this._cutEl);
    }

    _hint(text, ms) {
        if (!this._hintEl) return;
        // textContent: key names come from saved bindings in localStorage.
        this._hintEl.textContent = text;
        this._hintEl.style.opacity = '0.9';
        clearTimeout(this._hintTimer);
        this._hintTimer = setTimeout(() => { this._hintEl.style.opacity = '0'; }, ms);
    }
}
