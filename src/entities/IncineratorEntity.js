/**
 * [ROLE] Heat-based hazard entity.
 * [WHY] Drains player stamina and coherence over time when spotted, encouraging breaking line-of-sight.
 * [STATE] Stateful. Manages complex procedural mesh animations and heat accumulation logic.
 * [DEPENDS] three.js (implicit), environment data, HazardUtils.
 */
import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';
import {isRayPathBlocked, computeAxisBlocking} from './HazardUtils.js';

export default class IncineratorEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.target = new Vec3();
        this.graceTimer = 0;
        this.heatLevel = 0.0;
        this.stuckTimer = 0;
        this._dir = new Vec3();
        this._toPlayer = new Vec3();
        this._camDir = new THREE.Vector3();
        this._rayTarget = new Vec3();
        this._nextPos = new Vec3();
        this._box = new AABB();
        this._boxX = new AABB();
        this._boxZ = new AABB();
        this._min = new Vec3();
        this._max = new Vec3();
        this._heading = {x: 0, z: 1};
        this._hasLastPos = false;
        this._lastPosX = 0;
        this._lastPosZ = 0;
        this.licks = [];
        this._buildMesh();
    }

    _buildMesh() {
        if (!this._flameBaseMat) {
            this._flameBaseMat = new THREE.MeshStandardMaterial({
                color: 0x2a0800,
                emissive: 0xff2200,
                emissiveIntensity: 0.55,
                roughness: 0.8
            });
            this._flameMidMat = new THREE.MeshStandardMaterial({
                color: 0x502000,
                emissive: 0xff6600,
                emissiveIntensity: 0.85,
                roughness: 0.7
            });
            this._flameTipMat = new THREE.MeshStandardMaterial({
                color: 0x704000,
                emissive: 0xffcc44,
                emissiveIntensity: 1.1,
                roughness: 0.6
            });
        }
        this.bodyGroup = new THREE.Group();
        this.bodyGroup.scale.set(0.5, 0.5, 0.5);
        this.group.add(this.bodyGroup);
        const segmentCount = 9;
        this._snakeSegSpacing = 0.55;
        this._snakeWaveAmplitude = 0.55;
        this._snakeWaveSpeed = 6.5;
        this._snakeWaveNumber = 0.85;
        for (let i = 0; i < segmentCount; i++) {
            const t = i / (segmentCount - 1);
            const mat = t < 0.3 ? this._flameTipMat : (t < 0.65 ? this._flameMidMat : this._flameBaseMat);
            const h = Math.max(0.5, 1.5 - t * 0.7 + Math.random() * 0.2);
            const r = Math.max(0.12, 0.5 - t * 0.28 + Math.random() * 0.08);
            const lick = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mat);
            lick.userData = {
                segIndex: i,
                phase: Math.random() * Math.PI * 2,
                speed: 4.0 + Math.random() * 2.5,
                baseHeight: 0.35 + Math.random() * 0.15
            };
            this.licks.push(lick);
            this.bodyGroup.add(lick);
        }
        if (!this._lureStalkMat) {
            this._lureStalkMat = new THREE.MeshStandardMaterial({color: 0x181818, roughness: 0.7, metalness: 0.2});
            this._lureBulbMat = new THREE.MeshStandardMaterial({
                color: 0x2a2410,
                emissive: 0xfff2a0,
                emissiveIntensity: 2.2,
                roughness: 0.4
            });
        }
        this.lureGroup = new THREE.Group();
        this.lureStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.55, 6), this._lureStalkMat);
        this.lureStalk.position.y = 0.275;
        this.lureStalk.rotation.x = -0.4;
        this.lureGroup.add(this.lureStalk);
        this.lureBulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this._lureBulbMat);
        this.lureBulb.position.set(0, 0.55, -0.15);
        this.lureGroup.add(this.lureBulb);
        this.lureLight = new THREE.PointLight(0xfff2a0, 0.5, 4.0, 2.0);
        this.lureLight.position.copy(this.lureBulb.position);
        this.lureGroup.add(this.lureLight);
        this.bodyGroup.add(this.lureGroup);
        if (!this._eyeMat) {
            this._eyeMat = new THREE.MeshStandardMaterial({
                color: 0x0a0a0a,
                emissive: 0xfffbe0,
                emissiveIntensity: 3.2,
                roughness: 0.3
            });
            this._toothMat = new THREE.MeshStandardMaterial({
                color: 0x080604,
                emissive: 0x200000,
                emissiveIntensity: 0.3,
                roughness: 0.6
            });
        }
        this.faceGroup = new THREE.Group();
        this.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), this._eyeMat);
        this.eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), this._eyeMat);
        this.faceGroup.add(this.eyeL, this.eyeR);
        this.teeth = [];
        const toothCount = 7;
        for (let i = 0; i < toothCount; i++) {
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, i % 2 === 0 ? 0.2 : 0.15, 4), this._toothMat);
            this.faceGroup.add(tooth);
            this.teeth.push(tooth);
        }
        this.bodyGroup.add(this.faceGroup);
        this.core = new THREE.Group();
        this.core.position.y = 0.5;
        this.bodyGroup.add(this.core);
        this.light = new THREE.PointLight(0xff4400, 1.1, 40.0, 1.5);
        this.light.position.set(0, 0.5, 0);
        this.bodyGroup.add(this.light);
        this._buildEmberSlot();
        this.scene.add(this.group);
    }

    _buildEmberSlot() {
        if (!this._emberGeo) {
            this._emberGeo = new THREE.TetrahedronGeometry(0.06, 0);
            this._emberMat = new THREE.MeshStandardMaterial({
                color: 0xffaa33,
                emissive: 0xffaa33,
                emissiveIntensity: 2.0
            });
        }
        const group = new THREE.Group();
        this._emberAnchorY = 0.7;
        group.position.set(0, this._emberAnchorY, 0);
        const light = new THREE.PointLight(0xff8822, 0, 3.0, 2.0);
        group.add(light);
        const shards = [];
        for (let i = 0; i < 7; i++) {
            const mesh = new THREE.Mesh(this._emberGeo, this._emberMat);
            mesh.visible = false;
            group.add(mesh);
            shards.push({
                mesh,
                localX: 0,
                localY: 0,
                localZ: 0,
                velX: 0,
                velY: 0,
                velZ: 0,
                landed: true,
                launchDelay: 0
            });
        }
        this.bodyGroup.add(group);
        this.emberSlot = {group, light, shards, cycleTimer: 0.4};
    }

    _launchEmberBurst() {
        const angle = Math.random() * Math.PI * 2;
        this.emberSlot.shards.forEach(s => {
            const a = angle + (Math.random() - 0.5) * 0.9;
            const speed = 1.0 + Math.random() * 1.2;
            s.velX = Math.cos(a) * speed;
            s.velZ = Math.sin(a) * speed;
            s.velY = 1.4 + Math.random() * 1.2 + this.heatLevel * 0.15;
            s.localX = 0;
            s.localY = 0;
            s.localZ = 0;
            s.landed = false;
            s.launchDelay = Math.random() * 0.12;
            s.mesh.visible = false;
        });
    }

    _animateSparks(delta) {
        const slot = this.emberSlot;
        const gravity = 4.5;
        const anyLit = slot.shards.some(s => !s.landed);
        slot.light.intensity = anyLit ? (0.8 * (0.6 + Math.random() * 0.4)) : 0;
        slot.cycleTimer -= delta * (1.0 + this.heatLevel * 0.3);
        if (slot.cycleTimer <= 0 && slot.shards.every(s => s.landed)) {
            this._launchEmberBurst();
            slot.cycleTimer = 0.45 + Math.random() * 0.9;
        }
        const floorLocalY = -this._emberAnchorY;
        slot.shards.forEach(s => {
            if (s.landed) return;
            if (s.launchDelay > 0) {
                s.launchDelay -= delta;
                return;
            }
            s.mesh.visible = true;
            s.velY -= gravity * delta;
            s.localX += s.velX * delta;
            s.localY += s.velY * delta;
            s.localZ += s.velZ * delta;
            if (s.localY <= floorLocalY) {
                s.localY = floorLocalY;
                s.landed = true;
                s.mesh.visible = false;
            }
            s.mesh.position.set(s.localX, s.localY, s.localZ);
            s.mesh.rotation.x += 0.25;
            s.mesh.rotation.y += 0.2;
        });
    }

    _setBodyVisible(visible) {
        for (const lick of this.licks) lick.visible = visible;
        this.lureStalk.visible = visible;
        this.lureBulb.visible = visible;
        this.eyeL.visible = visible;
        this.eyeR.visible = visible;
        for (const tooth of this.teeth) tooth.visible = visible;
        if (!visible) {
            this.emberSlot.shards.forEach(s => {
                s.mesh.visible = false;
                s.landed = true;
            });
            this.emberSlot.light.intensity = 0;
            this.lureLight.intensity = 0;
        }
    }

    deactivate() {
        this.isActive = false;
        this._setBodyVisible(false);
        this.light.intensity = 0;
    }

    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 3.0;
        this.heatLevel = 0.0;
        this.stuckTimer = 0;
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('INCINERATOR') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this._setBodyVisible(true);
        this.light.intensity = 1.1;
    }

    _clampToBounds(x, z) {
        if (!this._bounds) return {x, z};
        const margin = 1.5;
        return {
            x: Math.max(this._bounds.minX + margin, Math.min(this._bounds.maxX - margin, x)),
            z: Math.max(this._bounds.minZ + margin, Math.min(this._bounds.maxZ - margin, z))
        };
    }

    update(delta, time) {
        if (!this.isActive) {
            return null;
        }
        this._updateHeading();
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animate(time);
            this._animateSparks(delta);
            return null;
        }
        const playerPos = this.camera.position;
        const distSq = this.group.position.distanceToSquared(playerPos);
        if (distSq > 6400.0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 40.0 + (Math.random() * 10.0);
            this.reset(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                0,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );
            return null;
        }
        const dx = this.group.position.x - playerPos.x;
        const dz = this.group.position.z - playerPos.z;
        const distSq2D = dx * dx + dz * dz;
        if (distSq2D < 2.0 && !this.player.isGodMode) {
            return {consumed: true};
        }
        const isSpotted = this._checkIfSpotted(playerPos, distSq);
        if (isSpotted) {
            this.heatLevel = Math.min(this.heatLevel + (delta * 1.5), 10.0);
            if (this.heatLevel > 2.0) {
                const drain = (this.heatLevel * delta * 0.1);
                this.player.stamina = Math.max(0.0, this.player.stamina - drain * this.player.maxStamina);
                this.player.exhaustion = Math.min(this.player.exhaustion + drain, 1.0);
            }
            this.light.intensity = 1.1 + this.heatLevel * 0.7;
            this.light.color.setHex(0xffaa00);
            if (Math.random() < delta * this.heatLevel * 2.0) {
                document.dispatchEvent(new CustomEvent('somatic-step', {
                    detail: {
                        distSq: distSq,
                        intensity: this.heatLevel * 0.5
                    }
                }));
            }
        } else {
            this.heatLevel = Math.max(0.0, this.heatLevel - (delta * 0.5));
            this.light.intensity = 1.1 + (Math.sin(time * 5.0) * 0.4);
            this.light.color.setHex(0xff4400);
            this.target.copy(playerPos);
            const speed = 1.4 + (this.heatLevel * 1.4);
            this._resolveLocomotion(speed, delta);
            if (Math.random() < delta * 5.0) {
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {distSq: distSq, intensity: 1.0}}));
            }
        }
        this._animate(time);
        this._animateSparks(delta);
        if (this.env) {
            const ambientHeat = this.heatLevel > 0 ? (this.heatLevel / 10.0) : 0.0;
        }
        return null;
    }

    _checkIfSpotted(playerPos, distSq) {
        let hasLOS = false;
        this._toPlayer.subVectors(this.group.position, playerPos).normalize();
        this.camera.getWorldDirection(this._camDir);
        const dot = this._camDir.dot(this._toPlayer);
        if (dot > 0.97) {
            const searchDist = Math.sqrt(distSq);
            hasLOS = !isRayPathBlocked(
                this.env, this.group.position.x, this.group.position.z, searchDist,
                playerPos, this._toPlayer, distSq, this._rayTarget
            );
        }
        return hasLOS;
    }

    _resolveLocomotion(speed, delta) {
        if (this.env && this.env.interactiveDoors) {
            for (let i = 0; i < this.env.interactiveDoors.length; i++) {
                const door = this.env.interactiveDoors[i];
                if (this.group.position.distanceToSquared(door.position) < 16.0) {
                    door.userData.entityOpen = true;
                    door.userData.entityZ = this.group.position.z;
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
            this._min.set(this._nextPos.x - 0.5, 0.0, this._nextPos.z - 0.5);
            this._max.set(this._nextPos.x + 0.5, 4.0, this._nextPos.z + 0.5);
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
                const {blockedX, blockedZ} = computeAxisBlocking(
                    this._boxX, this._boxZ, this._box, this.group.position.x, this.group.position.z, localBoxes
                );
                if (!blockedX && !blockedZ) {
                    if (Math.abs(moveVec.x) > Math.abs(moveVec.z)) this.group.position.x += moveVec.x;
                    else this.group.position.z += moveVec.z;
                    this.stuckTimer = 0;
                } else if (!blockedX) {
                    this.group.position.x += moveVec.x;
                    this.stuckTimer = 0;
                } else if (!blockedZ) {
                    this.group.position.z += moveVec.z;
                    this.stuckTimer = 0;
                } else {
                    this.stuckTimer += delta;
                    if (this.stuckTimer > 2.0) {
                        this.stuckTimer = 0;
                        const tpAngle = Math.random() * Math.PI * 2;
                        this.group.position.x = this.target.x + Math.cos(tpAngle) * 15.0;
                        this.group.position.z = this.target.z + Math.sin(tpAngle) * 15.0;
                    }
                }
            }
        }
        const clamped = this._clampToBounds(this.group.position.x, this.group.position.z);
        this.group.position.x = clamped.x;
        this.group.position.z = clamped.z;
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

    _animate(time) {
        const agitation = 1.0 + (this.heatLevel * 0.25);
        const heading = this._heading;
        const rightX = -heading.z, rightZ = heading.x;
        const waveSpeed = this._snakeWaveSpeed * (0.6 + agitation * 0.2);
        for (let i = 0; i < this.licks.length; i++) {
            const lick = this.licks[i];
            const d = lick.userData;
            const spineDist = d.segIndex * this._snakeSegSpacing;
            const lateral = Math.sin(time * waveSpeed - d.segIndex * this._snakeWaveNumber)
                * this._snakeWaveAmplitude * (0.4 + d.segIndex * 0.09);
            lick.position.x = -heading.x * spineDist + rightX * lateral;
            lick.position.z = -heading.z * spineDist + rightZ * lateral;
            const flicker = Math.sin(time * d.speed * agitation + d.phase) * 0.5 + 0.5;
            lick.position.y = d.baseHeight + flicker * 0.12;
            lick.scale.set(1.0, 0.85 + flicker * 0.35, 1.0);
            lick.rotation.y += 0.03 * agitation;
        }
        if (this.licks.length > 0) {
            const head = this.licks[0];
            this.lureGroup.position.set(head.position.x, head.position.y + 0.55, head.position.z);
            const lureBob = Math.sin(time * 1.6) * 0.04;
            this.lureBulb.position.y = 0.55 + lureBob;
            this.lureLight.position.copy(this.lureBulb.position);
            const watchIntensity = this.heatLevel / 10.0;
            this.lureLight.intensity = 0.5 + watchIntensity * 2.2;
            const eyeForward = 0.32, eyeUp = 0.18, eyeSpread = 0.14;
            this.eyeL.position.set(
                head.position.x + heading.x * eyeForward + rightX * eyeSpread,
                head.position.y + eyeUp,
                head.position.z + heading.z * eyeForward + rightZ * eyeSpread
            );
            this.eyeR.position.set(
                head.position.x + heading.x * eyeForward - rightX * eyeSpread,
                head.position.y + eyeUp,
                head.position.z + heading.z * eyeForward - rightZ * eyeSpread
            );
            this._eyeMat.emissiveIntensity = 2.4 + Math.sin(time * 3.0) * 0.8;
            const mouthForward = 0.3, mouthUp = -0.02;
            for (let i = 0; i < this.teeth.length; i++) {
                const tooth = this.teeth[i];
                const tt = (i / (this.teeth.length - 1)) - 0.5;
                const jagged = (i % 2 === 0) ? 0.03 : -0.02;
                tooth.position.set(
                    head.position.x + heading.x * mouthForward + rightX * tt * 0.32,
                    head.position.y + mouthUp + jagged,
                    head.position.z + heading.z * mouthForward + rightZ * tt * 0.32
                );
                tooth.rotation.x = Math.PI;
            }
        }
    }
}