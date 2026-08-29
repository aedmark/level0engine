import {LEGACY_LIGHT_COMPENSATION} from '../world/Sectors.js';

const CHASE_SPEED = 4.2;
const CATCH_DIST_SQ = 1.0;
const RESPAWN_DIST_SQ = 6400.0;
const WAKE_SPAWN_MIN = 18.0;
const WAKE_SPAWN_SPREAD = 8.0;
const WAKE_TELEGRAPH = 0.4;
const STEAM_BLOCK_RADIUS = 1.8;
const BODY_RADIUS = 0.55;
const PROBE_MARGIN = 0.15;
const DOOR_RADIUS_SQ = 16.0;
const PROBE_LOOKAHEAD = 1.8;
const PATH_SAMPLES = 4;
const TURN_RATE = 7.0;
const STUCK_TELEPORT_LIMIT = 3.0;
const STEER_TIERS = [0.35, 0.7, 1.05, 1.4, 1.75, Math.PI];
const PARK_DEPTH = -4.0;

export default class SentryConeEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.triggered = false;
        this.graceTimer = 0;
        this.stepTimer = 0;
        this.stuckTimer = 0;
        this.group = new THREE.Group();
        this.target = new THREE.Vector3();
        this._heading = {x: 0, z: 1};
        this._hasLastPos = false;
        this._lastPosX = 0;
        this._lastPosZ = 0;
        this._facing = 0;
        this._deflectSign = 0;
        this._progressCheckTimer = 0;
        this._progressLastDist = null;
        this._probeBox = new THREE.Box3();
        this._buildMesh();
        document.addEventListener('maintenance-cone-tipped', () => this._tryWake());
        document.addEventListener('maintenance-power-restored', () => this._tryWake());
    }

    _buildMesh() {
        const env = this.env;
        const coneMat = (env && (env.cautionConeMat || env.hazardMat)) || new THREE.MeshStandardMaterial({color: 0xdd6a00, roughness: 0.6});
        const baseMat = (env && env.cautionConeBaseMat) || coneMat;
        const limbMat = new THREE.MeshStandardMaterial({color: 0x181818, roughness: 0.7, metalness: 0.1});

        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        const coneGeo = new THREE.ConeGeometry(0.55, 1.75, 16);
        this.cone = new THREE.Mesh(coneGeo, coneMat);
        this.cone.position.y = 1.825;
        this.cone.castShadow = true;
        this.bodyGroup.add(this.cone);

        const baseGeo = new THREE.BoxGeometry(1.1, 0.08, 1.1);
        this.base = new THREE.Mesh(baseGeo, baseMat);
        this.base.position.y = 0.98;
        this.base.castShadow = true;
        this.bodyGroup.add(this.base);

        this.eyeMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
        const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
        this.eyeL = new THREE.Mesh(eyeGeo, this.eyeMat);
        this.eyeR = new THREE.Mesh(eyeGeo, this.eyeMat);
        this.eyeL.position.set(-0.14, 1.35, 0.4);
        this.eyeR.position.set(0.14, 1.35, 0.4);
        this.bodyGroup.add(this.eyeL, this.eyeR);

        const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6);
        const forearmGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6);
        this.arms = [];
        for (const side of [-1, 1]) {
            const shoulderPivot = new THREE.Group();
            shoulderPivot.position.set(side * 0.5, 1.85, 0);
            this.bodyGroup.add(shoulderPivot);
            const upperArm = new THREE.Mesh(upperArmGeo, limbMat);
            upperArm.position.y = -0.27;
            upperArm.castShadow = true;
            shoulderPivot.add(upperArm);
            const elbowPivot = new THREE.Group();
            elbowPivot.position.y = -0.55;
            shoulderPivot.add(elbowPivot);
            const forearm = new THREE.Mesh(forearmGeo, limbMat);
            forearm.position.y = -0.25;
            forearm.castShadow = true;
            elbowPivot.add(forearm);
            this.arms.push({shoulderPivot, elbowPivot, side});
        }

        const thighGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.5, 6);
        const shinGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.48, 6);
        this.legs = [];
        for (const side of [-1, 1]) {
            const hipPivot = new THREE.Group();
            hipPivot.position.set(side * 0.24, 0.95, 0);
            this.bodyGroup.add(hipPivot);
            const thigh = new THREE.Mesh(thighGeo, limbMat);
            thigh.position.y = -0.25;
            thigh.castShadow = true;
            hipPivot.add(thigh);
            const kneePivot = new THREE.Group();
            kneePivot.position.y = -0.5;
            hipPivot.add(kneePivot);
            const shin = new THREE.Mesh(shinGeo, limbMat);
            shin.position.y = -0.24;
            shin.castShadow = true;
            kneePivot.add(shin);
            this.legs.push({hipPivot, kneePivot, side});
        }

        this.light = new THREE.PointLight(0xff8800, 0, 8.0, 2.0);
        this.light.position.y = 1.7;
        this.bodyGroup.add(this.light);

        this.group.visible = false;
        this.scene.add(this.group);
    }

    _clampToBounds(x, z) {
        if (!this._bounds) return {x, z};
        const margin = 1.5;
        return {
            x: Math.max(this._bounds.minX + margin, Math.min(this._bounds.maxX - margin, x)),
            z: Math.max(this._bounds.minZ + margin, Math.min(this._bounds.maxZ - margin, z))
        };
    }

    reset(x, y, z) {
        this.isActive = true;
        this.triggered = false;
        this.graceTimer = 0;
        this.stepTimer = 0;
        this.stuckTimer = 0;
        this._hasLastPos = false;
        this._deflectSign = 0;
        this._progressCheckTimer = 0;
        this._progressLastDist = null;
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('MAINTENANCE') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, PARK_DEPTH, clamped.z);
        this.target.copy(this.group.position);
        this.group.visible = true;
        this.light.intensity = 0;
    }

    deactivate() {
        this.isActive = false;
        this.triggered = false;
        this.group.visible = false;
        this.light.intensity = 0;
    }

    _tryWake() {
        if (!this.isActive || this.triggered) return;
        this.triggered = true;
        this.graceTimer = WAKE_TELEGRAPH;
        this.stuckTimer = 0;
        this._deflectSign = 0;
        this._progressCheckTimer = 0;
        this._progressLastDist = null;
        const playerPos = this.camera.position;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = WAKE_SPAWN_MIN + Math.random() * WAKE_SPAWN_SPREAD;
        const clamped = this._clampToBounds(
            playerPos.x + Math.cos(spawnAngle) * spawnDist,
            playerPos.z + Math.sin(spawnAngle) * spawnDist
        );
        this.group.position.set(clamped.x, 0, clamped.z);
        this.target.copy(this.group.position);
        this.group.visible = true;
        this.light.intensity = 1.2 * LEGACY_LIGHT_COMPENSATION;
        this._facing = Math.atan2(playerPos.x - clamped.x, playerPos.z - clamped.z);
        this._heading.x = Math.sin(this._facing);
        this._heading.z = Math.cos(this._facing);
        this._hasLastPos = false;
        document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 4.0, intensity: 1.6}}));
    }

    _distSqToPlayerXZ(playerPos) {
        const dx = this.group.position.x - playerPos.x;
        const dz = this.group.position.z - playerPos.z;
        return dx * dx + dz * dz;
    }

    update(delta, time) {
        if (!this.isActive) return null;
        if (!this.triggered) {
            const playerPos = this.camera.position;
            this.group.position.set(playerPos.x, PARK_DEPTH, playerPos.z);
            return null;
        }
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animateIdle(time, delta);
            return null;
        }
        const playerPos = this.camera.position;
        const distSq = this._distSqToPlayerXZ(playerPos);
        if (distSq > RESPAWN_DIST_SQ) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = WAKE_SPAWN_MIN + Math.random() * WAKE_SPAWN_SPREAD;
            const clamped = this._clampToBounds(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );
            this.group.position.set(clamped.x, 0, clamped.z);
            this.target.copy(this.group.position);
            return null;
        }
        if (distSq < CATCH_DIST_SQ && !this.player.isGodMode) {
            return {consumed: true};
        }
        this.target.copy(playerPos);
        this._updateHeading();
        this._resolveLocomotion(CHASE_SPEED, delta);
        this._pushOutsideSteam();
        this._animateRun(time, delta);
        this.stepTimer += delta;
        if (this.stepTimer > 1.3) {
            this.stepTimer = 0;
            document.dispatchEvent(new CustomEvent('somatic-step', {detail: {distSq, intensity: 1.8}}));
        }
        return null;
    }

    _probeClear(nextX, nextZ) {
        const env = this.env;
        if (!env || !env.spatialGrid) return true;
        const r = BODY_RADIUS + PROBE_MARGIN;
        this._probeBox.min.set(nextX - r, 0.0, nextZ - r);
        this._probeBox.max.set(nextX + r, 4.0, nextZ + r);
        const boxes = env.spatialGrid.getNearby(nextX, nextZ, r + 1.2);
        for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].isEntityBlocker && this._probeBox.intersectsBox(boxes[i])) return false;
        }
        if (env.interactables) {
            for (let i = 0; i < env.interactables.length; i++) {
                const obj = env.interactables[i];
                if (obj.userData.type !== 'valve' || !obj.userData.active) continue;
                const dx = nextX - obj.position.x;
                const dz = nextZ - obj.position.z;
                if (dx * dx + dz * dz < STEAM_BLOCK_RADIUS * STEAM_BLOCK_RADIUS) return false;
            }
        }
        return true;
    }

    _pathClear(angle) {
        const pos = this.group.position;
        for (let s = 1; s <= PATH_SAMPLES; s++) {
            const d = PROBE_LOOKAHEAD * (s / PATH_SAMPLES);
            if (!this._probeClear(pos.x + Math.sin(angle) * d, pos.z + Math.cos(angle) * d)) return false;
        }
        return true;
    }

    _resolveLocomotion(speed, delta) {
        const env = this.env;
        const pos = this.group.position;
        if (env && env.interactiveDoors) {
            for (let i = 0; i < env.interactiveDoors.length; i++) {
                const door = env.interactiveDoors[i];
                if (door.userData.isAirlockDoor) continue;
                if (pos.distanceToSquared(door.position) < DOOR_RADIUS_SQ) {
                    door.userData.entityOpen = true;
                    door.userData.entityZ = pos.z;
                }
            }
        }
        const dx = this.target.x - pos.x;
        const dz = this.target.z - pos.z;
        const distToTarget = Math.sqrt(dx * dx + dz * dz);
        if (distToTarget < 0.1) return;
        this._progressCheckTimer += delta;
        if (this._progressCheckTimer >= 1.0) {
            this._progressCheckTimer = 0;
            if (this._progressLastDist === null || this._progressLastDist - distToTarget > 0.5) {
                this.stuckTimer = 0;
            } else {
                this.stuckTimer += 1.0;
            }
            this._progressLastDist = distToTarget;
        }
        const desiredAngle = Math.atan2(dx, dz);
        let chosenAngle = null;
        if (this._pathClear(desiredAngle)) {
            chosenAngle = desiredAngle;
            this._deflectSign = 0;
        } else {
            for (let t = 0; t < STEER_TIERS.length && chosenAngle === null; t++) {
                const mag = STEER_TIERS[t];
                const first = this._deflectSign < 0 ? -mag : mag;
                const second = -first;
                for (const off of (mag === Math.PI ? [first] : [first, second])) {
                    const angle = desiredAngle + off;
                    if (this._pathClear(angle)) {
                        chosenAngle = angle;
                        this._deflectSign = off > 0 ? 1 : -1;
                        break;
                    }
                }
            }
        }
        if (chosenAngle === null) {
            this.stuckTimer += delta;
        } else {
            pos.x += Math.sin(chosenAngle) * speed * delta;
            pos.z += Math.cos(chosenAngle) * speed * delta;
            const clamped = this._clampToBounds(pos.x, pos.z);
            pos.x = clamped.x;
            pos.z = clamped.z;
        }
        if (this.stuckTimer > STUCK_TELEPORT_LIMIT) {
            this.stuckTimer = 0;
            this._progressLastDist = null;
            const clamped = this._clampToBounds(this.target.x, this.target.z);
            pos.x = clamped.x;
            pos.z = clamped.z;
        }
    }

    _pushOutsideSteam() {
        const env = this.env;
        if (!env || !env.interactables) return;
        const pos = this.group.position;
        for (let i = 0; i < env.interactables.length; i++) {
            const obj = env.interactables[i];
            if (obj.userData.type !== 'valve' || !obj.userData.active) continue;
            let dx = pos.x - obj.position.x;
            let dz = pos.z - obj.position.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < STEAM_BLOCK_RADIUS * STEAM_BLOCK_RADIUS) {
                let dist = Math.sqrt(distSq);
                if (dist < 0.0001) {
                    dx = 1;
                    dz = 0;
                    dist = 1;
                }
                const push = (STEAM_BLOCK_RADIUS - dist) + 0.05;
                pos.x += (dx / dist) * push;
                pos.z += (dz / dist) * push;
            }
        }
    }

    _updateHeading() {
        if (!this._hasLastPos) {
            this._lastPosX = this.group.position.x;
            this._lastPosZ = this.group.position.z;
            this._hasLastPos = true;
            return;
        }
        const dx = this.group.position.x - this._lastPosX;
        const dz = this.group.position.z - this._lastPosZ;
        const distMoved = Math.sqrt(dx * dx + dz * dz);
        if (distMoved > 0.0005) {
            this._heading.x = dx / distMoved;
            this._heading.z = dz / distMoved;
        }
        this._lastPosX = this.group.position.x;
        this._lastPosZ = this.group.position.z;
    }

    _wrapAngle(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    _slewFacing(targetAngle, delta) {
        const diff = this._wrapAngle(targetAngle - this._facing);
        const maxStep = TURN_RATE * delta;
        this._facing = this._wrapAngle(this._facing + Math.max(-maxStep, Math.min(maxStep, diff)));
    }

    _animateIdle(time, delta) {
        this.bodyGroup.rotation.z = Math.sin(time * 30.0) * 0.05;
        if (this._heading.x || this._heading.z) {
            this._slewFacing(Math.atan2(this._heading.x, this._heading.z), delta);
        }
        this.bodyGroup.rotation.y = this._facing;
        this.light.intensity = (1.5 + Math.sin(time * 20.0) * 0.8) * LEGACY_LIGHT_COMPENSATION;
    }

    _animateRun(time, delta) {
        const swing = Math.sin(time * 9.0);
        for (const leg of this.legs) {
            leg.hipPivot.rotation.x = swing * leg.side * 0.9;
            leg.kneePivot.rotation.x = Math.max(0, -swing * leg.side) * 1.1;
        }
        for (const arm of this.arms) {
            arm.shoulderPivot.rotation.x = -swing * arm.side * 0.8;
        }
        this.bodyGroup.position.y = Math.abs(Math.sin(time * 9.0)) * 0.12;
        if (this._heading.x || this._heading.z) {
            this._slewFacing(Math.atan2(this._heading.x, this._heading.z), delta);
        }
        this.bodyGroup.rotation.y = this._facing;
        this.light.intensity = (1.0 + Math.sin(time * 14.0) * 0.6) * LEGACY_LIGHT_COMPENSATION;
    }
}
