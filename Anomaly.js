// Anomaly.js
// LEVEL 0 PREDATORY HAZARD

import Vec3 from './Vec3.js';
import AABB from './AABB.js';

export default class Anomaly {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.target = new Vec3();
        this.breadcrumbs = [];
        this.backtrackTimer = 0;
        this.breadcrumbTimer = 0;
        this.graceTimer = 0;
        this._dir = new Vec3();
        this._toPlayer = new Vec3();
        this._lookDir = new Vec3();
        this._nextPos = new Vec3();
        this._box = new AABB();
        this._boxX = new AABB();
        this._boxZ = new AABB();
        this._min = new Vec3();
        this._max = new Vec3();
        this._rayTarget = new Vec3();
        this._buildMesh();
        document.addEventListener('somatic-step', (e) => this._handleNoise(e, 9.0));
        document.addEventListener('somatic-door', (e) => this._handleNoise(e, 30.0));
        document.addEventListener('somatic-vent', (e) => this._handleNoise(e, 40.0));
        document.addEventListener('somatic-breaker', (e) => this._handleNoise(e, 60.0));
    }

    _handleNoise(e, baseRadius) {
        if (!this.isActive || this.player.isChased) return;
        const intensity = e.detail.intensity || 1.0;
        const radiusSq = (baseRadius * intensity) ** 2;
        if (this.group.position.distanceToSquared(this.camera.position) < radiusSq) {
            this.target.copy(this.camera.position);
            this.target.x += (Math.random() - 0.5) * 8.0;
            this.target.z += (Math.random() - 0.5) * 8.0;
            this.backtrackTimer = 0;
        }
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
        this.graceTimer = 12.0;
        this.group.position.set(x, y, z);
        this.target.copy(this.group.position);
    }

    update(delta, time) {
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
        const playerPos = this.camera.position;
        const distToPlayerSq = this.group.position.distanceToSquared(playerPos);
        if (distToPlayerSq > 6400.0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 40.0 + (Math.random() * 15.0);
            this.group.position.set(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                1.5,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );
            this.target.copy(this.group.position);
            this.breadcrumbs = [];
            return null;
        }
        if (distToPlayerSq < 0.64) {
            this.player.stamina = this.player.maxStamina;
            this.player.exhaustion = 0.0;
            this.player.isChased = false;
            return {consumed: true};
        }
        this._animate(time, delta);
        const speed = this._updateSenses(playerPos, distToPlayerSq, delta, time);
        this._resolveLocomotion(speed, delta, time);
        let pressure = 0;
        if (distToPlayerSq < 225.0) {
            pressure = 1.0 - (Math.sqrt(distToPlayerSq) / 15.0);
        }
        this.player.anomalyPressure = pressure;
        return null;
    }

    _animate(time, delta) {
        this.core.rotation.y = time * 0.8;
        this.core.rotation.x = time * 0.5;
        const pulse = 1.0 + Math.sin(time * 4.0) * 0.15;
        this.core.scale.set(pulse, pulse, pulse);
        this.shards.forEach((shardData, i) => {
            const panicJitter = this.player.exhaustion > 0.2 ? (Math.random() - 0.5) * this.player.exhaustion * 0.4 : 0;
            const angle = time * shardData.speed + shardData.offset;
            shardData.mesh.position.set(
                Math.cos(angle) * (1.2 + panicJitter),
                Math.sin(time * 3.0 + i) * 0.4 + panicJitter,
                Math.sin(angle) * (1.2 + panicJitter)
            );
            shardData.mesh.rotation.x += delta * (2.0 + panicJitter * 10);
            shardData.mesh.rotation.y += delta * (3.0 + panicJitter * 10);
        });
    }

    _updateSenses(playerPos, distToPlayerSq, delta, time) {
        this.breadcrumbTimer = (this.breadcrumbTimer || 0) + delta;
        if (this.breadcrumbTimer > 0.5 && this.backtrackTimer <= 0) {
            this.breadcrumbTimer = 0;
            this.breadcrumbs.push(this.group.position.clone());
            if (this.breadcrumbs.length > 20) this.breadcrumbs.shift();
        }
        let detectionRadius = 25.0;
        let stealthMultiplier = 1.0;
        if (this.player.isCrouching) stealthMultiplier -= 0.5;
        if (!this.player.flashlightActive) stealthMultiplier -= 0.3;
        const darknessCloak = this.player.darknessPressure || 0.0;
        if (darknessCloak > 0.5) stealthMultiplier *= 0.2;
        detectionRadius = (detectionRadius * stealthMultiplier) + (this.player.isRunning ? 25.0 : 0.0) + (this.player.exhaustion * 15.0);
        const perceptionThresholdSq = Math.max(9.0, detectionRadius * detectionRadius);
        if (this._lastLOSTime === undefined) this._lastLOSTime = 0;
        let hasLOS = this._lastLOSResult || false;
        if (distToPlayerSq < Math.max(perceptionThresholdSq, 625.0)) {
            if (time - this._lastLOSTime > 0.1) {
                const toPlayerDir = this._toPlayer.subVectors(playerPos, this.group.position).normalize();
                let isOccluded = false;
                const searchDist = Math.sqrt(distToPlayerSq);
                if (this.env && this.env.spatialGrid) {
                    const localBoxes = this.env.spatialGrid.getNearby(this.group.position.x, this.group.position.z, searchDist);
                    for (let i = 0; i < localBoxes.length; i++) {
                        const box = localBoxes[i];
                        if (box.isEntityBlocker && !box.isInvisibleBlocker) {
                            if (AABB.rayIntersectsBox(this.group.position, toPlayerDir, box, this._rayTarget)) {
                                if (this.group.position.distanceToSquared(this._rayTarget) < distToPlayerSq) {
                                    isOccluded = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                hasLOS = !isOccluded;
                if (darknessCloak > 0.6 && !this.player.flashlightActive) {
                    hasLOS = false;
                }
                this._lastLOSResult = hasLOS;
                this._lastLOSTime = time;
            }
        }
        if (this.backtrackTimer > 0) {
            this.backtrackTimer -= delta;
            if (this.breadcrumbs.length > 0) {
                const targetCrumb = this.breadcrumbs[this.breadcrumbs.length - 1];
                this.target.copy(targetCrumb);
                if (this.group.position.distanceToSquared(targetCrumb) < 1.0) {
                    this.breadcrumbs.pop();
                }
            } else {
                this.backtrackTimer = 0;
            }
            this.player.isChased = false;
        } else if (distToPlayerSq < perceptionThresholdSq && hasLOS) {
            this.target.copy(playerPos);
            this.player.isChased = distToPlayerSq < 225.0;
        } else {
            this.player.isChased = false;
            let distracted = false;
            if (this.env && this.env.tagPool) {
                for (let i = 0; i < this.env.tagPool.length; i++) {
                    const tag = this.env.tagPool[i];
                    if (tag.visible && tag.position.distanceToSquared(this.group.position) < 400.0) {
                        this.target.lerp(tag.position, 0.015);
                        distracted = true;
                        if (tag.position.distanceToSquared(this.group.position) < 4.0 && Math.random() < 0.05) {
                            tag.visible = false;
                            document.dispatchEvent(new CustomEvent('somatic-door', {
                                detail: {
                                    distSq: 25.0,
                                    intensity: 0.8
                                }
                            }));
                        }
                        break;
                    }
                }
            }
            if (!distracted) {
                if (Math.random() < 0.02) {
                    this.target.x += (Math.random() - 0.5) * 15.0;
                    this.target.z += (Math.random() - 0.5) * 15.0;
                }
                this.target.lerp(playerPos, 0.005);
            }
        }
        const baseSpeed = distToPlayerSq < 225.0 ? 4.2 : 1.8;
        this.rage = this.rage || 0.0;
        let speed = baseSpeed + (this.rage * 2.0);
        let isObserved = false;
        if (this.player.flashlightActive && distToPlayerSq < 625.0 && hasLOS) {
            const toEntity = this._toPlayer.subVectors(this.group.position, playerPos).normalize();
            const lookDir = this._lookDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (lookDir.dot(toEntity) > 0.85) {
                isObserved = true;
                speed = 0.0;
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
        return speed;
    }

    _resolveLocomotion(speed, delta, time) {
        if (this.env && this.env.interactiveDoors) {
            for (let i = 0; i < this.env.interactiveDoors.length; i++) {
                const door = this.env.interactiveDoors[i];
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
        const dir = this._dir.subVectors(this.target, this.group.position);
        dir.y = 0;
        const distToTarget = dir.length();
        if (distToTarget > 0.1) {
            dir.normalize();
            const moveVec = dir.multiplyScalar(speed * delta);
            this._nextPos.copy(this.group.position).add(moveVec);
            this._min.set(this._nextPos.x - 0.6, 0.0, this._nextPos.z - 0.6);
            this._max.set(this._nextPos.x + 0.6, 3.0, this._nextPos.z + 0.6);
            this._box.set(this._min, this._max);
            let blocked = false;
            const localBoxes = this.env.spatialGrid.getNearby(this._nextPos.x, this._nextPos.z, 2.0);
            for (let i = 0; i < localBoxes.length; i++) {
                if (localBoxes[i].isEntityBlocker && this._box.intersectsBox(localBoxes[i])) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                this.group.position.add(moveVec);
            } else {
                let blockedX = false;
                let blockedZ = false;
                this._boxX.copy(this._box);
                this._boxX.min.z = this.group.position.z - 0.5;
                this._boxX.max.z = this.group.position.z + 0.5;
                this._boxZ.copy(this._box);
                this._boxZ.min.x = this.group.position.x - 0.5;
                this._boxZ.max.x = this.group.position.x + 0.5;
                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].isEntityBlocker) {
                        if (!blockedX && this._boxX.intersectsBox(localBoxes[i])) blockedX = true;
                        if (!blockedZ && this._boxZ.intersectsBox(localBoxes[i])) blockedZ = true;
                    }
                }
                if (!blockedX && blockedZ) {
                    this.group.position.x += moveVec.x;
                } else if (!blockedZ && blockedX) {
                    this.group.position.z += moveVec.z;
                } else {
                    if (this.backtrackTimer <= 0) {
                        this.backtrackTimer = 5.0;
                    }
                    this.group.position.x += (Math.random() - 0.5) * speed * delta;
                    this.group.position.z += (Math.random() - 0.5) * speed * delta;
                }
            }
        }
        this.group.position.y = 1.5 + Math.sin(time * 2.0) * 0.2;
    }
}