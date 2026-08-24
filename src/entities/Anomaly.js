import {sweepGroundedCollision} from './HazardUtils.js';

const SPRINT_SPEED = 5.3;
const PURSUE_SPEED = 3.4;
const WINDED_SPEED = 1.7;
const PROWL_SPEED = 1.5;

const MAX_STAMINA = 100.0;
const SPRINT_BURN = 12.0;
const JOG_BURN = 4.0;
const SECOND_WIND = 50.0;
const HUNT_RECOVERY = 1.0;
const SEARCH_RECOVERY = 3.0;
const PROWL_RECOVERY = 8.0;
const DORMANT_RECOVERY = 25.0;

const ATTENTION_SPAN = 22.0;
const RETREAT_DISTANCE_SQ = 3025.0;
const DORMANT_MIN = 40.0;
const DORMANT_MAX = 80.0;

const BODY_RADIUS = 0.6;
const BODY_HEIGHT = 2.6;
const STEP_HEIGHT = 0.5;
const HOVER_HEIGHT = 1.5;
const GRAVITY = 30.0;

export default class Anomaly {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.target = new THREE.Vector3();
        this.lastKnown = new THREE.Vector3();
        this.hasLastKnown = false;
        this.breadcrumbs = [];
        this.backtrackTimer = 0;
        this.breadcrumbTimer = 0;
        this.graceTimer = 0;
        this.mood = 'PROWL';
        this.interest = 0.0;
        this.stamina = MAX_STAMINA;
        this.isWinded = false;
        this.dormantTimer = 0;
        this.searchProbeTimer = 0;
        this.stuckFor = 0;
        this.feetY = 0;
        this.fallVelocity = 0;
        this._stuckSampleTimer = 0;
        this._progressMark = new THREE.Vector3();
        this._dormantAnchor = new THREE.Vector3();
        this._dir = new THREE.Vector3();
        this._toPlayer = new THREE.Vector3();
        this._lookDir = new THREE.Vector3();
        this._eye = new THREE.Vector3();
        this._rayTarget = new THREE.Vector3();
        this._scratch = {boxX: new THREE.Box3(), boxZ: new THREE.Box3(), floorBox: new THREE.Box3()};
        this._buildMesh();
        document.addEventListener('somatic-step', (e) => this._handleNoise(e, 9.0));
        document.addEventListener('somatic-door', (e) => this._handleNoise(e, 30.0));
        document.addEventListener('somatic-vent', (e) => this._handleNoise(e, 40.0));
        document.addEventListener('somatic-breaker', (e) => this._handleNoise(e, 60.0));
    }

    _handleNoise(e, baseRadius) {
        if (!this.isActive || this.graceTimer > 0) return;
        const intensity = e.detail.intensity || 1.0;
        const radiusSq = (baseRadius * intensity) ** 2;
        if (this.mood === 'DORMANT') {
            if (baseRadius < 30.0) return;
            if (this.camera.position.distanceToSquared(this._dormantAnchor) > radiusSq) return;
            this._wake(this.camera.position, 0.7);
            return;
        }
        if (this.player.isChased) return;
        if (this.group.position.distanceToSquared(this.camera.position) >= radiusSq) return;
        this._noteContact(this.camera.position, 8.0);
    }

    _noteContact(pos, scatter) {
        this.lastKnown.set(
            pos.x + (Math.random() - 0.5) * scatter,
            pos.y,
            pos.z + (Math.random() - 0.5) * scatter
        );
        this.hasLastKnown = true;
        this.interest = 1.0;
        this.searchProbeTimer = 0;
        this.backtrackTimer = 0;
        if (this.mood !== 'HUNT') this.mood = 'SEARCH';
    }

    _buildMesh() {
        const nullMat = new THREE.MeshBasicMaterial({color: 0x000000});
        const coreGeo = new THREE.IcosahedronGeometry(0.6, 0);
        this.core = new THREE.Mesh(coreGeo, nullMat);
        this.group.add(this.core);
        this.shards = [];
        for (let i = 0; i < 4; i++) {
            const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.2, 0), nullMat);
            this.shards.push({
                mesh: shard,
                speed: Math.random() * 2.0 + 1.0,
                offset: Math.random() * Math.PI * 2
            });
            this.group.add(shard);
        }
        this.scene.add(this.group);
    }

    reset(x, y, z) {
        this.isActive = true;
        this.breadcrumbs = [];
        this.backtrackTimer = 0;
        this.breadcrumbTimer = 0;
        this.graceTimer = 90.0;
        this.mood = 'PROWL';
        this.interest = 0.0;
        this.hasLastKnown = false;
        this.stamina = MAX_STAMINA;
        this.isWinded = false;
        this.dormantTimer = 0;
        this.searchProbeTimer = 0;
        this.stuckFor = 0;
        this.rage = 0.0;
        this.feetY = 0;
        this.fallVelocity = 0;
        this._refreshForbiddenBounds(0, true);
        this.group.position.set(x + 10000, -1000, z + 10000);
        this.target.copy(this.group.position);
        this._progressMark.copy(this.group.position);
        this.group.visible = true;
    }

    _refreshForbiddenBounds(time, force) {
        if (this._nextBoundsCheck === undefined) this._nextBoundsCheck = 0;
        if (!force && time < this._nextBoundsCheck) return;
        this._nextBoundsCheck = time + 3.0;
        if (!this.env || !this.env.getSectorBounds) return;
        this._forbiddenBounds = ['ARCHIVE', 'IMPOUND', 'INCINERATOR', 'BOARDROOM', 'SERVER', 'CLINIC', 'MAINTENANCE', 'CHASM', 'ATRIUM', 'ANNEX', 'CHECKPOINT', 'ACME']
            .map(id => this.env.getSectorBounds(id))
            .filter(Boolean);
    }

    _findForbiddenBounds(x, z, margin = 0) {
        if (!this._forbiddenBounds) return null;
        for (let i = 0; i < this._forbiddenBounds.length; i++) {
            const b = this._forbiddenBounds[i];
            if (x > b.minX - margin && x < b.maxX + margin && z > b.minZ - margin && z < b.maxZ + margin) {
                return b;
            }
        }
        return null;
    }

    _pushOutsideBounds(x, z) {
        const b = this._findForbiddenBounds(x, z);
        if (!b) return {x, z};
        const margin = 1.5;
        const distLeft = x - b.minX;
        const distRight = b.maxX - x;
        const distBottom = z - b.minZ;
        const distTop = b.maxZ - z;
        const min = Math.min(distLeft, distRight, distBottom, distTop);
        if (min === distLeft) return {x: b.minX - margin, z};
        if (min === distRight) return {x: b.maxX + margin, z};
        if (min === distBottom) return {x, z: b.minZ - margin};
        return {x, z: b.maxZ + margin};
    }

    update(delta, time, activeSector) {
        if (!this.isActive) {
            if (this.player.anomalyPressure > 0) this.player.anomalyPressure = 0;
            return null;
        }
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animate(time, delta);
            if (this.player.anomalyPressure > 0) this.player.anomalyPressure = 0;
            return null;
        }
        if ((activeSector && activeSector !== 'NORMAL') || window.EDMARK_DEBUG_MODE) {
            if (this.group.visible) {
                this.group.visible = false;
                this.group.position.set(this.camera.position.x + 10000, -1000, this.camera.position.z + 10000);
            }
            if (this.player.anomalyPressure > 0) this.player.anomalyPressure = 0;
            return null;
        }

        this._refreshForbiddenBounds(time);
        const playerPos = this.camera.position;
        if (this.mood === 'DORMANT') {
            this._updateDormant(delta, playerPos);
            return null;
        }
        if (!this.group.visible) {
            this.group.visible = true;
        }

        const distToPlayerSq = this.group.position.distanceToSquared(playerPos);
        if (distToPlayerSq > 6400.0 && this.mood !== 'RETREAT') {
            this._respawnNearPlayer(playerPos, 40.0, 15.0);
            return null;
        }
        if (distToPlayerSq < 0.64 && !this.player.isGodMode) {
            this.player.stamina = this.player.maxStamina;
            this.player.exhaustion = 0.0;
            this.player.isChased = false;
            return {consumed: true};
        }
        this._animate(time, delta);
        const speed = this._updateAwareness(playerPos, distToPlayerSq, delta, time);
        this._resolveLocomotion(speed, delta, time, playerPos);
        let pressure = 0;
        if (distToPlayerSq < 225.0) {
            pressure = 1.0 - (Math.sqrt(distToPlayerSq) / 15.0);
            if (this.mood !== 'HUNT') pressure *= 0.65;
        }
        this.player.anomalyPressure = pressure;
        return null;
    }

    _updateDormant(delta, playerPos) {
        if (this.group.visible) {
            this.group.visible = false;
            this._dormantAnchor.copy(this.group.position);
            this.group.position.set(playerPos.x + 10000, -1000, playerPos.z + 10000);
        }
        this.stamina = Math.min(MAX_STAMINA, this.stamina + DORMANT_RECOVERY * delta);
        if (this.stamina > SECOND_WIND) this.isWinded = false;
        this.player.isChased = false;
        if (this.player.anomalyPressure > 0) this.player.anomalyPressure = 0;
        this.dormantTimer -= delta;
        if (this.dormantTimer <= 0) this._wake(playerPos, 0.0);
    }

    _wake(playerPos, interest) {
        if (!this._respawnNearPlayer(playerPos, 45.0, 15.0)) return;
        this.mood = 'PROWL';
        this.interest = interest;
        this.stuckFor = 0;
        if (interest > 0) {
            this.lastKnown.copy(playerPos);
            this.hasLastKnown = true;
            this.mood = 'SEARCH';
        }
    }

    _isSpawnClear(x, z) {
        if (this._findForbiddenBounds(x, z, BODY_RADIUS)) return false;
        const clearance = BODY_RADIUS + 0.2;
        const boxes = this.env.spatialGrid.getNearby(x, z, clearance + 1.0);
        for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            if (b.isInvisibleBlocker) continue;
            if (b.isGrate && b.meshRef && !b.meshRef.userData.active) continue;
            const overlapsFootprint = b.max.x >= x - clearance && b.min.x <= x + clearance &&
                b.max.z >= z - clearance && b.min.z <= z + clearance;
            if (!overlapsFootprint) continue;
            if (b.isVoid) return false;
            if (b.min.y > BODY_HEIGHT || b.max.y < STEP_HEIGHT) continue;
            return false;
        }
        return true;
    }

    _respawnNearPlayer(playerPos, minDist, spread) {
        let respawn = null;
        for (let attempt = 0; attempt < 24; attempt++) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = minDist + (Math.random() * spread);
            const candidate = this._pushOutsideBounds(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );
            if (this._isSpawnClear(candidate.x, candidate.z)) {
                respawn = candidate;
                break;
            }
        }
        if (!respawn) return false;
        this.feetY = 0;
        this.fallVelocity = 0;
        this.group.position.set(respawn.x, HOVER_HEIGHT, respawn.z);
        this.target.copy(this.group.position);
        this._progressMark.copy(this.group.position);
        this.breadcrumbs = [];
        this.backtrackTimer = 0;
        this.group.visible = true;
        return true;
    }

    _goDormant(playerPos) {
        this.mood = 'DORMANT';
        this.dormantTimer = DORMANT_MIN + Math.random() * (DORMANT_MAX - DORMANT_MIN);
        this.interest = 0.0;
        this.hasLastKnown = false;
        this.stuckFor = 0;
        this.fallVelocity = 0;
        this.feetY = 0;
        this._dormantAnchor.copy(this.group.position);
        this.group.visible = false;
        this.group.position.set(playerPos.x + 10000, -1000, playerPos.z + 10000);
        this.player.isChased = false;
        this.player.anomalyPressure = 0;
    }

    _animate(time, delta) {
        this.core.rotation.y = time * 0.8;
        this.core.rotation.x = time * 0.5;
        const pulse = 1.0 + Math.sin(time * 4.0) * 0.15;
        this.core.scale.set(pulse, pulse, pulse);
        for (let i = 0; i < this.shards.length; i++) {
            const shardData = this.shards[i];
            const panicJitter = this.player.exhaustion > 0.2 ? (Math.random() - 0.5) * this.player.exhaustion * 0.4 : 0;
            const angle = time * shardData.speed + shardData.offset;
            shardData.mesh.position.set(
                Math.cos(angle) * (1.2 + panicJitter),
                Math.sin(time * 3.0 + i) * 0.4 + panicJitter,
                Math.sin(angle) * (1.2 + panicJitter)
            );
            shardData.mesh.rotation.x += delta * (2.0 + panicJitter * 10);
            shardData.mesh.rotation.y += delta * (3.0 + panicJitter * 10);
        }
    }

    _canSeePlayer(playerPos, distToPlayerSq, time) {
        let stealthMultiplier = 1.0;
        if (this.player.isCrouching) stealthMultiplier -= 0.5;
        if (!this.player.flashlightActive) stealthMultiplier -= 0.3;
        const darknessCloak = this.player.darknessPressure || 0.0;
        if (darknessCloak > 0.5) stealthMultiplier *= 0.2;
        const detectionRadius = (25.0 * stealthMultiplier)
            + (this.player.isRunning ? 25.0 : 0.0)
            + (this.player.exhaustion * 15.0);
        this._perceptionThresholdSq = Math.max(9.0, detectionRadius * detectionRadius);
        if (distToPlayerSq >= this._perceptionThresholdSq) {
            this._lastLOSResult = false;
            return false;
        }
        if (this._lastLOSTime === undefined) this._lastLOSTime = 0;
        if (time - this._lastLOSTime > 0.1) {
            this._lastLOSTime = time;
            this._eye.set(this.group.position.x, this.group.position.y, this.group.position.z);
            const toPlayerDir = this._toPlayer.subVectors(playerPos, this._eye).normalize();
            const searchDist = Math.sqrt(distToPlayerSq);
            let hasLOS = !isRayPathBlocked(
                this.env, this._eye.x, this._eye.z, searchDist,
                this._eye, toPlayerDir, distToPlayerSq, this._rayTarget, true
            );
            if (darknessCloak > 0.6 && !this.player.flashlightActive) hasLOS = false;
            this._lastLOSResult = hasLOS;
        }
        return this._lastLOSResult || false;
    }

    _boredomRate() {
        const vx = this.player.velocity ? this.player.velocity.x : 0;
        const vz = this.player.velocity ? this.player.velocity.z : 0;
        const playerSpeedSq = (vx * vx) + (vz * vz);
        let rate = 1.0;
        if (playerSpeedSq < 0.25) rate += 0.6;
        if (this.player.isCrouching) rate += 0.6;
        if (!this.player.flashlightActive) rate += 0.3;
        if ((this.player.darknessPressure || 0.0) > 0.5) rate += 0.5;
        if (this.player.isRunning && playerSpeedSq > 4.0) rate -= 0.5;
        if (this.stuckFor > 6.0) rate += 1.2;
        return Math.max(0.25, rate);
    }

    _updateStuckMeter(delta) {
        this._stuckSampleTimer += delta;
        if (this._stuckSampleTimer < 1.0) return;
        const moved = this.group.position.distanceToSquared(this._progressMark);
        this._progressMark.copy(this.group.position);
        this.stuckFor = moved < 0.25 ? this.stuckFor + this._stuckSampleTimer : 0.0;
        this._stuckSampleTimer = 0;
    }

    _pickSearchProbe(delta) {
        this.searchProbeTimer -= delta;
        const arrived = this.group.position.distanceToSquared(this.target) < 4.0;
        if (this.searchProbeTimer > 0 && !arrived) return;
        this.searchProbeTimer = 3.0 + Math.random() * 2.0;
        const spread = 4.0 + (1.0 - this.interest) * 8.0;
        const probe = this._pushOutsideBounds(
            this.lastKnown.x + (Math.random() - 0.5) * spread * 2.0,
            this.lastKnown.z + (Math.random() - 0.5) * spread * 2.0
        );
        this.target.set(probe.x, this.group.position.y, probe.z);
    }

    _updateAwareness(playerPos, distToPlayerSq, delta, time) {
        this._updateStuckMeter(delta);
        this.breadcrumbTimer += delta;
        if (this.breadcrumbTimer > 0.5 && this.backtrackTimer <= 0) {
            this.breadcrumbTimer = 0;
            this.breadcrumbs.push(this.group.position.clone());
            if (this.breadcrumbs.length > 20) this.breadcrumbs.shift();
        }

        const sees = this._canSeePlayer(playerPos, distToPlayerSq, time);
        if (sees) {
            this.mood = 'HUNT';
            this.interest = 1.0;
            this.lastKnown.copy(playerPos);
            this.hasLastKnown = true;
            this.searchProbeTimer = 0;
            this.stuckFor = 0;
        } else if (this.mood === 'HUNT') {
            this.mood = 'SEARCH';
            this.searchProbeTimer = 0;
        }

        if (this.mood === 'SEARCH') {
            this.interest -= (delta / ATTENTION_SPAN) * this._boredomRate();
            if (this.interest <= 0.0) {
                this.interest = 0.0;
                this.mood = 'RETREAT';
                this.hasLastKnown = false;
                this.breadcrumbs = [];
                this.backtrackTimer = 0;
            }
        }

        if (this.backtrackTimer > 0 && this.mood !== 'RETREAT') {
            this.backtrackTimer -= delta;
            if (this.breadcrumbs.length > 0) {
                const targetCrumb = this.breadcrumbs[this.breadcrumbs.length - 1];
                this.target.copy(targetCrumb);
                if (this.group.position.distanceToSquared(targetCrumb) < 1.0) this.breadcrumbs.pop();
            } else {
                this.backtrackTimer = 0;
            }
        } else if (this.mood === 'HUNT') {
            this.target.copy(playerPos);
        } else if (this.mood === 'SEARCH' && this.hasLastKnown) {
            this._pickSearchProbe(delta);
        } else if (this.mood === 'RETREAT') {
            this._steerAway(playerPos, distToPlayerSq);
        } else {
            this._prowl(playerPos);
        }

        this.player.isChased = this.mood === 'HUNT' && distToPlayerSq < 225.0;

        let speed;
        if (this.mood === 'HUNT') {
            speed = distToPlayerSq < 400.0 ? SPRINT_SPEED : PURSUE_SPEED;
        } else if (this.mood === 'SEARCH' || this.mood === 'RETREAT') {
            speed = PURSUE_SPEED;
        } else {
            speed = PROWL_SPEED;
        }
        this.rage = this.rage || 0.0;
        speed += this.rage * 0.6;
        if (this._applyObservation(playerPos, distToPlayerSq, delta)) speed = 0.0;
        return this._applyStamina(speed, delta);
    }

    _applyStamina(speed, delta) {
        const burn = speed > 4.0 ? SPRINT_BURN : (speed > 2.5 ? JOG_BURN : 0.0);
        if (burn > 0 && !this.isWinded) {
            this.stamina = Math.max(0.0, this.stamina - burn * delta);
            if (this.stamina <= 0.0) this.isWinded = true;
        } else {
            let recovery;
            if (this.mood === 'HUNT') recovery = HUNT_RECOVERY;
            else if (this.mood === 'SEARCH') recovery = SEARCH_RECOVERY;
            else recovery = PROWL_RECOVERY;
            this.stamina = Math.min(MAX_STAMINA, this.stamina + recovery * delta);
            if (this.isWinded && this.stamina > SECOND_WIND) this.isWinded = false;
        }
        if (this.isWinded) return Math.min(speed, WINDED_SPEED);
        return speed;
    }

    _steerAway(playerPos, distToPlayerSq) {
        if (distToPlayerSq > RETREAT_DISTANCE_SQ) {
            this._goDormant(playerPos);
            return;
        }
        const away = this._dir.subVectors(this.group.position, playerPos);
        away.y = 0;
        if (away.lengthSq() < 0.01) away.set(1, 0, 0);
        away.normalize();
        const exit = this._pushOutsideBounds(
            this.group.position.x + away.x * 25.0,
            this.group.position.z + away.z * 25.0
        );
        this.target.set(exit.x, this.group.position.y, exit.z);
        if (this.stuckFor > 6.0) this._goDormant(playerPos);
    }

    _prowl(playerPos) {
        if (this.env && this.env.tagPool) {
            for (let i = 0; i < this.env.tagPool.length; i++) {
                const tag = this.env.tagPool[i];
                if (!tag.visible) continue;
                const tagDistSq = tag.position.distanceToSquared(this.group.position);
                if (tagDistSq >= 400.0) continue;
                this.target.lerp(tag.position, 0.015);
                if (tagDistSq < 4.0 && Math.random() < 0.05) {
                    tag.visible = false;
                    document.dispatchEvent(new CustomEvent('somatic-door', {
                        detail: {distSq: 25.0, intensity: 0.8}
                    }));
                }
                return;
            }
        }
        if (this.group.position.distanceToSquared(this.target) < 4.0 || Math.random() < 0.01) {
            const wander = this._pushOutsideBounds(
                this.group.position.x + (Math.random() - 0.5) * 30.0,
                this.group.position.z + (Math.random() - 0.5) * 30.0
            );
            this.target.set(wander.x, this.group.position.y, wander.z);
        }
    }

    _applyObservation(playerPos, distToPlayerSq, delta) {
        let isObserved = false;
        if (this.player.flashlightActive && distToPlayerSq < 625.0 && this._lastLOSResult) {
            const toEntity = this._toPlayer.subVectors(this.group.position, playerPos).normalize();
            const lookDir = this._lookDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (lookDir.dot(toEntity) > 0.85) {
                isObserved = true;
                this.rage = Math.min(1.0, this.rage + (delta * 0.15));
                const panicJitter = 0.8 * (1.0 - (this.player.flashlightBattery / 100.0)) + 0.1;
                this.core.position.set((Math.random() - 0.5) * panicJitter, (Math.random() - 0.5) * panicJitter, (Math.random() - 0.5) * panicJitter);
                if (distToPlayerSq < 144.0 && Math.random() < 0.08) {
                    document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 1.0, intensity: 1.8}}));
                }
            }
        }
        if (!isObserved) {
            this.core.position.set(0, 0, 0);
            this.rage = Math.max(0.0, this.rage - (delta * 0.05));
        }
        return isObserved;
    }

    _resolveLocomotion(speed, delta, time, playerPos) {
        if (this.env && this.env.interactiveDoors) {
            for (let i = 0; i < this.env.interactiveDoors.length; i++) {
                const door = this.env.interactiveDoors[i];
                if (door.userData.isAirlockDoor) continue;
                if (this.group.position.distanceToSquared(door.position) < 16.0) {
                    door.userData.entityOpen = true;
                    door.userData.entityZ = this.group.position.z;
                }
            }
        }
        if (Math.random() < 0.2) {
            for (let i = 0; i < this.env.localFixtures.length; i++) {
                const fixture = this.env.localFixtures[i];
                if (!fixture.isDead && fixture.position.distanceToSquared(this.group.position) < 16.0) {
                    if (this.env.shatterFixture) this.env.shatterFixture(fixture);
                }
            }
        }
        const pos = this.group.position;
        const dir = this._dir.subVectors(this.target, pos);
        dir.y = 0;
        let moveX = 0;
        let moveZ = 0;
        if (dir.length() > 0.1) {
            dir.normalize();
            moveX = dir.x * speed * delta;
            moveZ = dir.z * speed * delta;
        }
        const body = {
            x: pos.x,
            z: pos.z,
            feetY: this.feetY,
            radius: BODY_RADIUS,
            height: BODY_HEIGHT,
            stepOffset: STEP_HEIGHT
        };
        const step = sweepGroundedCollision(this.env.spatialGrid, body, moveX, moveZ, this._scratch);
        const hitX = step.hitX || !!this._findForbiddenBounds(pos.x + moveX, pos.z, BODY_RADIUS);
        const hitZ = step.hitZ || !!this._findForbiddenBounds(pos.x, pos.z + moveZ, BODY_RADIUS);
        if (!hitX) pos.x += moveX;
        if (!hitZ) pos.z += moveZ;
        if (hitX && hitZ && (moveX !== 0 || moveZ !== 0)) {
            if (this.backtrackTimer <= 0 && this.mood !== 'RETREAT') this.backtrackTimer = 5.0;
        }
        if (step.groundY === -100) {
            this.fallVelocity += GRAVITY * delta;
            this.feetY -= this.fallVelocity * delta;
            if (this.feetY < -15.0) {
                this._goDormant(playerPos);
                return;
            }
        } else {
            this.fallVelocity = 0;
            this.feetY += (step.groundY - this.feetY) * (1.0 - Math.exp(-12.0 * delta));
        }
        const pushed = this._pushOutsideBounds(pos.x, pos.z);
        pos.x = pushed.x;
        pos.z = pushed.z;
        pos.y = this.feetY + HOVER_HEIGHT + Math.sin(time * 2.0) * 0.2;
    }
}
