// IncineratorEntity.js
// Level 0 Engine: The Ember

import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

/**
 * A highly aggressive, heat-based entity ("The Ember") found in the incinerator sector.
 * Freezes when observed but radiates lethal heat that drains stamina. Charges when unobserved.
 */
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
        
        this.chunks = [];
        this._buildMesh();
    }

    _buildMesh() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x110500,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const coreGeo = new THREE.IcosahedronGeometry(1.2, 1);
        this.core = new THREE.Mesh(coreGeo, mat);
        this.core.position.y = 2.0;
        this.group.add(this.core);
        
        // Add floating slag chunks
        for (let i = 0; i < 12; i++) {
            const size = 0.2 + Math.random() * 0.4;
            const chunkGeo = new THREE.BoxGeometry(size, size, size);
            const chunk = new THREE.Mesh(chunkGeo, mat);
            
            chunk.userData = {
                radius: 1.5 + Math.random() * 1.5,
                speed: 1.0 + Math.random() * 2.0,
                offsetY: (Math.random() - 0.5) * 3.0,
                phase: Math.random() * Math.PI * 2
            };
            
            this.chunks.push(chunk);
            this.group.add(chunk);
        }
        
        this.light = new THREE.PointLight(0xff4400, 2.0, 40.0, 1.5);
        this.light.position.set(0, 2.0, 0);
        this.group.add(this.light);
        
        this.scene.add(this.group);
    }

    /**
     * Resets the entity and spawns it at the given coordinates, resetting heat levels.
     * @param {number} x - The X coordinate to spawn at.
     * @param {number} y - The Y coordinate to spawn at.
     * @param {number} z - The Z coordinate to spawn at.
     */
    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 3.0;
        this.heatLevel = 0.0;
        this.stuckTimer = 0;
        // Re-leash to the Incinerator sector's current geometry every time it (re)spawns --
        // EntityManager's generic 40-55 unit spawn offset doesn't know how big this room
        // actually is, so without this a fresh spawn could land past the doorway entirely.
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('INCINERATOR') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this.group.visible = true;
        this.light.intensity = 2.0;
    }

    /**
     * Clamps a world-space (x, z) into the Ember's home sector, if bounds are known.
     * Called on every reset and every locomotion tick so it can never wander -- or be
     * chased -- out through an open door into the hallway.
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
     * Updates the entity's behavior, including the weeping angel mechanic, heat radiation, and pursuit.
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
        
        // Despawn/Respawn logic if too far
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
        
        // 2D Distance for collision check (ignore Y height difference)
        const dx = this.group.position.x - playerPos.x;
        const dz = this.group.position.z - playerPos.z;
        const distSq2D = dx * dx + dz * dz;

        // Lethal collision
        if (distSq2D < 2.0 && !this.player.isGodMode) {
            return {consumed: true};
        }
        
        const isSpotted = this._checkIfSpotted(playerPos, distSq);
        
        // Weeping Angel Mechanic
        if (isSpotted) {
            // Freezes in place, but gets incredibly hot
            this.heatLevel = Math.min(this.heatLevel + (delta * 1.5), 10.0);
            
            // Radiate heat onto player stamina
            if (this.heatLevel > 2.0) {
                const drain = (this.heatLevel * delta * 0.1);
                this.player.stamina = Math.max(0.0, this.player.stamina - drain * this.player.maxStamina);
                this.player.exhaustion = Math.min(this.player.exhaustion + drain, 1.0);
            }
            
            this.light.intensity = 2.0 + this.heatLevel * 2.0;
            this.light.color.setHex(0xffaa00); // White-hot
            
            // Somatic Audio cue
            if (Math.random() < delta * this.heatLevel * 2.0) {
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {distSq: distSq, intensity: this.heatLevel * 0.5}}));
            }
        } else {
            // Cools down and charges
            this.heatLevel = Math.max(0.0, this.heatLevel - (delta * 0.5));
            this.light.intensity = 2.0 + (Math.sin(time * 5.0) * 1.0);
            this.light.color.setHex(0xff4400); // Emissive orange
            
            this.target.copy(playerPos);
            // Very fast pursuit speed
            const speed = 7.0 + this.heatLevel; 
            this._resolveLocomotion(speed, delta);
            
            if (Math.random() < delta * 5.0) {
                document.dispatchEvent(new CustomEvent('somatic-step', {detail: {distSq: distSq, intensity: 1.0}}));
            }
        }
        
        this._animate(time);
        
        if (this.env) {
            const ambientHeat = this.heatLevel > 0 ? (this.heatLevel / 10.0) : 0.0;
        }
        
        return null;
    }

    _checkIfSpotted(playerPos, distSq) {
        let hasLOS = false;
        
        this._toPlayer.subVectors(this.group.position, playerPos).normalize();
        this.camera.getWorldDirection(this._camDir);
        
        // Is it in front of the camera viewport?
        const dot = this._camDir.dot(this._toPlayer);
        
        if (dot > 0.5) { // Roughly 60-degree FOV cone
            let isOccluded = false;
            const searchDist = Math.sqrt(distSq);
            if (this.env && this.env.spatialGrid) {
                const localBoxes = this.env.spatialGrid.getNearby(this.group.position.x, this.group.position.z, searchDist);
                for (let i = 0; i < localBoxes.length; i++) {
                    const box = localBoxes[i];
                    if (box.isEntityBlocker && !box.isInvisibleBlocker) {
                        if (AABB.rayIntersectsBox(playerPos, this._toPlayer, box, this._rayTarget)) {
                            if (playerPos.distanceToSquared(this._rayTarget) < distSq) {
                                isOccluded = true;
                                break;
                            }
                        }
                    }
                }
            }
            hasLOS = !isOccluded;
        }
        
        // If the player is looking at it AND the flashlight is generally on
        // Note: Even if flashlight is off, the player looking at it triggers the mechanic
        return hasLOS;
    }

    _resolveLocomotion(speed, delta) {
        // Automatically open interactive doors if passing through
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
            
            // Collision AABB
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
                // Slide along walls
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
                        // Teleport randomly close to player if stuck
                        const tpAngle = Math.random() * Math.PI * 2;
                        this.group.position.x = this.target.x + Math.cos(tpAngle) * 15.0;
                        this.group.position.z = this.target.z + Math.sin(tpAngle) * 15.0;
                    }
                }
            }
        }
        // Unconditional re-leash: whatever branch above moved (or teleported) it, this is the
        // one guarantee it never ends up standing in the hallway.
        const clamped = this._clampToBounds(this.group.position.x, this.group.position.z);
        this.group.position.x = clamped.x;
        this.group.position.z = clamped.z;
    }

    _animate(time) {
        const agitation = 1.0 + (this.heatLevel * 2.0);
        
        // Wobble core
        this.core.rotation.x = time * 2.0 * agitation;
        this.core.rotation.y = time * 3.0 * agitation;
        
        // Orbit chunks
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            const data = chunk.userData;
            const angle = time * data.speed * agitation + data.phase;
            
            chunk.position.x = Math.cos(angle) * data.radius;
            chunk.position.z = Math.sin(angle) * data.radius;
            chunk.position.y = 2.0 + data.offsetY + Math.sin(time * 4.0 + data.phase) * 0.5;
            
            chunk.rotation.x += 0.05 * agitation;
            chunk.rotation.y += 0.05 * agitation;
        }
    }
}
