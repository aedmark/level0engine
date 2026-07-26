// WardenEntity.js
// Level 0 Engine: The Warden

import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

/**
 * A patrol-based hazard ("The Warden") that roams the impound sector.
 * Uses a spotlight to sweep the area; detects the player via line-of-sight and spotlight cone intersection.
 */
export default class WardenEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.target = new Vec3();
        this.graceTimer = 0;
        this.stepTimer = 0;
        this._dir = new Vec3();
        this._toPlayer = new Vec3();
        this._nextPos = new Vec3();
        this._box = new AABB();
        this._boxX = new AABB();
        this._boxZ = new AABB();
        this._min = new Vec3();
        this._max = new Vec3();
        this._rayTarget = new Vec3();
        this._buildMesh();
    }

    _buildMesh() {
        const mat = new THREE.MeshBasicMaterial({color: 0x111111});
        const geo = new THREE.BoxGeometry(0.8, 4.0, 0.8);
        this.core = new THREE.Mesh(geo, mat);
        this.core.position.y = 2.0;
        this.group.add(this.core);
        this.light = new THREE.SpotLight(0xffffff, 2.0, 30.0, Math.PI / 6, 0.3, 1.0);
        this.light.position.set(0, 3.8, 0);
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 256;
        this.light.shadow.mapSize.height = 256;
        this.lightTarget = new THREE.Object3D();
        this.lightTarget.position.set(0, 0, 1);
        this.group.add(this.lightTarget);
        this.light.target = this.lightTarget;
        this.group.add(this.light);
        this.scene.add(this.group);
    }

    /**
     * Resets the entity and spawns it at the given coordinates.
     * @param {number} x - The X coordinate to spawn at.
     * @param {number} y - The Y coordinate to spawn at.
     * @param {number} z - The Z coordinate to spawn at.
     */
    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 2.0;
        this.stepTimer = 0;
        // Re-leash to the Impound sector's current geometry on every (re)spawn -- the generic
        // 40-50 unit spawn offset from EntityManager doesn't know this room's actual footprint.
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('IMPOUND') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this.group.visible = true;
        this.light.color.setHex(0xffffff);
    }

    /**
     * Clamps a world-space (x, z) into the Warden's home sector, if bounds are known.
     * Called on every reset and every locomotion tick so a spotlight chase can't walk it
     * out through an open door into the hallway.
     */
    _clampToBounds(x, z) {
        if (!this._bounds) return {x, z};
        const margin = 1.5;
        return {
            x: Math.max(this._bounds.minX + margin, Math.min(this._bounds.maxX - margin, x)),
            z: Math.max(this._bounds.minZ + margin, Math.min(this._bounds.maxZ - margin, z))
        };
    }

    /**
     * Updates the entity's behavior, including spotlight sweeping, tracking, and locomotion.
     * @param {number} delta - Time elapsed since the last frame.
     * @param {number} time - Total elapsed time.
     * @returns {Object|null} Returns a state object (e.g., {consumed: true}) if the player is caught, otherwise null.
     */
    update(delta, time) {
        if (!this.isActive) {
            this.group.visible = false;
            return null;
        }
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animate(time);
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
        if (distSq < 1.0 && !this.player.isGodMode) {
            this.player.stamina = this.player.maxStamina;
            this.player.exhaustion = 0.0;
            return {consumed: true};
        }
        this._animate(time);
        this.stepTimer += delta;
        if (this.stepTimer > 2.5) {
            this.stepTimer = 0;
            document.dispatchEvent(new CustomEvent('somatic-step', {detail: {distSq: distSq, intensity: 2.0}}));
        }
        const speed = this._updateSenses(playerPos, distSq, delta, time);
        this._resolveLocomotion(speed, delta);
        return null;
    }

    _updateSenses(playerPos, distSq, delta, time) {
        let hasLOS = false;
        if (distSq < 900.0) {
            const toPlayerDir = this._toPlayer.subVectors(playerPos, this.light.position.clone().add(this.group.position)).normalize();
            let isOccluded = false;
            const searchDist = Math.sqrt(distSq);
            if (this.env && this.env.spatialGrid) {
                const localBoxes = this.env.spatialGrid.getNearby(this.group.position.x, this.group.position.z, searchDist);
                for (let i = 0; i < localBoxes.length; i++) {
                    const box = localBoxes[i];
                    if (box.isEntityBlocker && !box.isInvisibleBlocker) {
                        if (AABB.rayIntersectsBox(this.group.position, toPlayerDir, box, this._rayTarget)) {
                            if (this.group.position.distanceToSquared(this._rayTarget) < distSq) {
                                isOccluded = true;
                                break;
                            }
                        }
                    }
                }
            }
            hasLOS = !isOccluded;
        }
        let isSpotted = false;
        if (hasLOS) {
            const spotDir = new THREE.Vector3().subVectors(
                this.lightTarget.getWorldPosition(new THREE.Vector3()),
                this.light.getWorldPosition(new THREE.Vector3())
            ).normalize();
            const toPlayer = this._toPlayer.subVectors(playerPos, this.light.getWorldPosition(new THREE.Vector3())).normalize();
            if (spotDir.dot(toPlayer) > 0.866) {
                isSpotted = true;
            }
        }
        if (isSpotted) {
            this.light.color.setHex(0xff0000);
            this.light.intensity = 4.0;
            this.player.stamina = 0.0;
            this.player.exhaustion = Math.min(this.player.exhaustion + delta * 2.0, 1.0);
            this.player.coherence = Math.max(0.0, this.player.coherence - (delta * 0.02));
            this.target.copy(playerPos);
        } else {
            this.light.color.setHex(0xffffff);
            this.light.intensity = 2.0;
            if (Math.random() < 0.02) {
                this.target.x = playerPos.x + (Math.random() - 0.5) * 15.0;
                this.target.z = playerPos.z + (Math.random() - 0.5) * 15.0;
            }
            if (Math.random() < 0.05) {
                this.target.x += (Math.random() - 0.5) * 5.0;
                this.target.z += (Math.random() - 0.5) * 5.0;
            }
        }
        return isSpotted ? 1.8 : 1.2;
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
            this._min.set(this._nextPos.x - 0.8, 0.0, this._nextPos.z - 0.8);
            this._max.set(this._nextPos.x + 0.8, 4.0, this._nextPos.z + 0.8);
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
                if (!blockedX && !blockedZ) {
                    if (Math.abs(moveVec.x) > Math.abs(moveVec.z)) this.group.position.x += moveVec.x;
                    else this.group.position.z += moveVec.z;
                } else if (!blockedX) {
                    this.group.position.x += moveVec.x;
                } else if (!blockedZ) {
                    this.group.position.z += moveVec.z;
                }
            }
        }
        // Unconditional re-leash so a spotlight chase can never end with it standing outside.
        const clamped = this._clampToBounds(this.group.position.x, this.group.position.z);
        this.group.position.x = clamped.x;
        this.group.position.z = clamped.z;
    }

    _animate(time) {
        const yaw = Math.sin(time * 0.8) * (Math.PI / 3);
        this.lightTarget.position.set(Math.sin(yaw), 0, Math.cos(yaw));
        this.group.position.y = Math.sin(time * 4.0) * 0.05;
    }
}