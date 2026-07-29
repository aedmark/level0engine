import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';
import {isRayPathBlocked, computeAxisBlocking} from './HazardUtils.js';

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
        const mat = new THREE.MeshStandardMaterial({color: 0x14161a, roughness: 0.55, metalness: 0.35});
        const legGeo = new THREE.CylinderGeometry(0.32, 0.4, 1.6, 8);
        this.legs = new THREE.Mesh(legGeo, mat);
        this.legs.position.y = 0.8;
        this.legs.castShadow = true;
        this.group.add(this.legs);
        this.upperBody = new THREE.Group();
        this.group.add(this.upperBody);
        const torsoGeo = new THREE.CylinderGeometry(0.58, 0.32, 1.4, 8);
        this.torso = new THREE.Mesh(torsoGeo, mat);
        this.torso.position.y = 2.3;
        this.torso.castShadow = true;
        this.upperBody.add(this.torso);
        const shoulderGeo = new THREE.BoxGeometry(0.26, 0.26, 0.5);
        for (const side of [-1, 1]) {
            const shoulder = new THREE.Mesh(shoulderGeo, mat);
            shoulder.position.set(side * 0.58, 2.85, 0);
            shoulder.castShadow = true;
            this.upperBody.add(shoulder);
        }
        const headGeo = new THREE.BoxGeometry(0.4, 0.38, 0.4);
        this.head = new THREE.Mesh(headGeo, mat);
        this.head.position.y = 3.3;
        this.head.castShadow = true;
        this.upperBody.add(this.head);
        this.core = this.head;
        this.eyeMat = new THREE.MeshBasicMaterial({color: 0xdadada, transparent: true, opacity: 0.55});
        const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(eyeGeo, this.eyeMat);
            eye.position.set(side * 0.11, 3.32, 0.2);
            this.upperBody.add(eye);
        }
        this.light = new THREE.SpotLight(0xffffff, 2.0, 30.0, Math.PI / 6, 0.3, 1.0);
        this.light.position.set(0, 3.6, 0);
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 256;
        this.light.shadow.mapSize.height = 256;
        this.light.shadow.autoUpdate = false;
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
        this._lastLOSTime = 0;
        this._lastLOSResult = false;
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('IMPOUND') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this.legs.visible = true;
        this.upperBody.visible = true;
        this.light.intensity = 2.0;
        this.light.shadow.autoUpdate = true;
        this.light.color.setHex(0xffffff);
        if (this.eyeMat) {
            this.eyeMat.color.setHex(0xdadada);
            this.eyeMat.opacity = 0.55;
        }
    }

    /**
     * Hides the Warden and silences its spotlight without removing either from the scene graph.
     * Called by EntityManager when another entity type becomes active. See
     * ArchivistEntity._setBodyVisible() for the full explanation of why `group` stays visible
     * permanently here and only the mesh children + light intensity toggle instead.
     */
    deactivate() {
        this.isActive = false;
        this.legs.visible = false;
        this.upperBody.visible = false;
        this.light.intensity = 0;
        this.light.shadow.autoUpdate = false;
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
        if (this._lastLOSTime === undefined) this._lastLOSTime = 0;
        let hasLOS = this._lastLOSResult || false;
        if (distSq < 900.0) {
            if (time - this._lastLOSTime > 0.1) {
                if (!this._lightWorldPos) this._lightWorldPos = new THREE.Vector3();
                this._lightWorldPos.copy(this.light.position).add(this.group.position);
                const toPlayerDir = this._toPlayer.subVectors(playerPos, this._lightWorldPos).normalize();
                const searchDist = Math.sqrt(distSq);
                hasLOS = !isRayPathBlocked(
                    this.env, this.group.position.x, this.group.position.z, searchDist,
                    this.group.position, toPlayerDir, distSq, this._rayTarget
                );
                this._lastLOSResult = hasLOS;
                this._lastLOSTime = time;
            }
        } else {
            hasLOS = false;
            this._lastLOSResult = false;
        }
        let isSpotted = false;
        if (hasLOS) {
            if (!this._spotDir) this._spotDir = new THREE.Vector3();
            if (!this._targetWorldPos) this._targetWorldPos = new THREE.Vector3();
            if (!this._lightWorldPos2) this._lightWorldPos2 = new THREE.Vector3();
            this.lightTarget.getWorldPosition(this._targetWorldPos);
            this.light.getWorldPosition(this._lightWorldPos2);
            const spotDir = this._spotDir.subVectors(this._targetWorldPos, this._lightWorldPos2).normalize();
            const toPlayer = this._toPlayer.subVectors(playerPos, this._lightWorldPos2).normalize();
            if (spotDir.dot(toPlayer) > 0.866) {
                isSpotted = true;
            }
        }
        if (isSpotted) {
            this.light.color.setHex(0xff0000);
            this.light.intensity = 4.0;
            if (this.eyeMat) {
                this.eyeMat.color.setHex(0xff0000);
                this.eyeMat.opacity = 1.0;
            }
            this.player.stamina = 0.0;
            this.player.exhaustion = Math.min(this.player.exhaustion + delta * 2.0, 1.0);
            this.player.coherence = Math.max(0.0, this.player.coherence - (delta * 0.02));
            this.target.copy(playerPos);
        } else {
            this.light.color.setHex(0xffffff);
            this.light.intensity = 2.0;
            if (this.eyeMat) {
                this.eyeMat.color.setHex(0xdadada);
                this.eyeMat.opacity = 0.55;
            }
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
                const {blockedX, blockedZ} = computeAxisBlocking(
                    this._boxX, this._boxZ, this._box, this.group.position.x, this.group.position.z, localBoxes
                );
                if (!blockedX && !blockedZ) {
                    if (Math.abs(moveVec.x) > Math.abs(moveVec.z)) this.group.position.x += moveVec.x;
                    else this.group.position.z += moveVec.z;
                } else if (!blockedX) {
                    this.group.position.x += moveVec.x;
                } else if (!blockedZ) {
                    this.group.position.z += moveVec.z;
                } else {
                    this.group.position.x += (Math.random() - 0.5) * speed * delta;
                    this.group.position.z += (Math.random() - 0.5) * speed * delta;
                }
            }
        }
        const clamped = this._clampToBounds(this.group.position.x, this.group.position.z);
        this.group.position.x = clamped.x;
        this.group.position.z = clamped.z;
    }

    _animate(time) {
        const yaw = Math.sin(time * 0.8) * (Math.PI / 3);
        const SWEEP_RADIUS = 10.0;
        this.lightTarget.position.set(Math.sin(yaw) * SWEEP_RADIUS, 0, Math.cos(yaw) * SWEEP_RADIUS);
        this.group.position.y = Math.sin(time * 4.0) * 0.05;
        if (this.upperBody) this.upperBody.rotation.y = yaw * 0.6;
    }
}