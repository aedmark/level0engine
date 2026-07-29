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
        // MeshBasicMaterial on a plain box is exactly why it read as a flat black cutout instead
        // of a physical threat -- unlit materials don't shade, so it never picked up rim light
        // from its own spotlight or the yard's floodlights, no matter how dramatic the lighting
        // around it got. MeshStandardMaterial with real roughness/metalness lets it actually catch
        // and hold light like everything else in the scene.
        const mat = new THREE.MeshStandardMaterial({color: 0x14161a, roughness: 0.55, metalness: 0.35});

        // Planted legs, deliberately NOT part of the swiveling upper body below -- a figure that's
        // rooted in place but turning to track a sound reads as far more alert (and more
        // unsettling) than one that pivots as a single rigid pole.
        const legGeo = new THREE.CylinderGeometry(0.32, 0.4, 1.6, 8);
        this.legs = new THREE.Mesh(legGeo, mat);
        this.legs.position.y = 0.8;
        this.legs.castShadow = true;
        this.group.add(this.legs);

        // Torso, shoulders, head, and eyes all ride together so the whole upper body can turn as
        // one unit -- see _animate(). Kept as a sibling of the light/lightTarget below, not a
        // parent of them, so this cosmetic sway can never compound with the actual spotlight-aim
        // math (SWEEP_RADIUS etc.) that was just fixed.
        this.upperBody = new THREE.Group();
        this.group.add(this.upperBody);

        const torsoGeo = new THREE.CylinderGeometry(0.58, 0.32, 1.4, 8);
        this.torso = new THREE.Mesh(torsoGeo, mat);
        this.torso.position.y = 2.3;
        this.torso.castShadow = true;
        this.upperBody.add(this.torso);

        // Shoulder ridges break up the silhouette from the side so it doesn't read as a smooth
        // pole even in profile.
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
        this.core = this.head; // Kept as `core` for anything reading it as this entity's "face".

        // A pair of sensor eyes -- dim at rest, flare red in _updateSenses the instant it spots
        // the player. This is what makes the body itself look alert, not just the beam it carries.
        this.eyeMat = new THREE.MeshBasicMaterial({color: 0xdadada, transparent: true, opacity: 0.55});
        const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(eyeGeo, this.eyeMat);
            eye.position.set(side * 0.11, 3.32, 0.2);
            this.upperBody.add(eye);
        }

        this.light = new THREE.SpotLight(0xffffff, 2.0, 30.0, Math.PI / 6, 0.3, 1.0);
        this.light.position.set(0, 3.6, 0);
        // castShadow is set once, here, and never toggled again -- see deactivate() below for why.
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 256;
        this.light.shadow.mapSize.height = 256;
        // Only re-rendered on demand (see reset()/deactivate()) instead of every frame regardless
        // of whether the Warden is even the active entity right now.
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
        // Re-leash to the Impound sector's current geometry on every (re)spawn -- the generic
        // 40-50 unit spawn offset from EntityManager doesn't know this room's actual footprint.
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('IMPOUND') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        // `group` itself is never hidden (see deactivate()) -- only the body meshes and the
        // light's own intensity/shadow updates toggle. Restore both here.
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
     * Called by EntityManager when another entity type becomes active.
     *
     * Educational Note: The obvious way to "hide" an entity is `this.group.visible = false` --
     * but `this.light` is a child of that group, and Three.js excludes an invisible object's
     * entire subtree from the current frame's light list. A light popping in and out of that
     * list changes the scene's active light count, which forces Three.js to recompile shader
     * programs across every standard-lit material in the scene -- the exact mechanism behind the
     * Incinerator/Maintenance chunk-streaming stutter fixed earlier. `group` now stays visible
     * permanently; only the mesh children (which carry no such cost) and the light's own
     * intensity toggle instead, so the light is always present in the scene -- just dark.
     */
    deactivate() {
        this.isActive = false;
        this.legs.visible = false;
        this.upperBody.visible = false;
        this.light.intensity = 0;
        // Shadow-casting stays on permanently (see constructor) so the shadow-light count never
        // changes either; autoUpdate=false just stops it spending a render pass on a shadow map
        // nobody can see while inactive.
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
        // EntityManager only ever calls update() on whichever entity is currently active, and
        // already called deactivate() the moment this one stopped being it -- this check is just
        // a defensive no-op guard, not the actual hide/show path (see deactivate()).
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
        // The occlusion check below queries the spatial grid at up to a 30-unit radius (sqrt of
        // the 900.0 threshold) and ray-tests every isEntityBlocker box it finds -- and Impound is
        // by far the densest sector for that box type (fence segments on nearly every perimeter
        // cell, plus cars/machines/tire stacks), so that query's candidate set is much larger
        // there than in a typical corridor. Anomaly.js already solved this exact cost by only
        // re-running its LOS raycast a few times a second and reusing the cached result on the
        // frames in between (see _lastLOSTime there); the Warden never got the same treatment and
        // was paying the full query+raycast cost every single frame, unthrottled. That's the hard
        // spike: not a one-time cost, a recurring one, worst in the one sector with the most
        // blockers to test against.
        if (this._lastLOSTime === undefined) this._lastLOSTime = 0;
        let hasLOS = this._lastLOSResult || false;
        if (distSq < 900.0) {
            if (time - this._lastLOSTime > 0.1) {
                if (!this._lightWorldPos) this._lightWorldPos = new THREE.Vector3();
                this._lightWorldPos.copy(this.light.position).add(this.group.position);
                const toPlayerDir = this._toPlayer.subVectors(playerPos, this._lightWorldPos).normalize();
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
                this._lastLOSResult = hasLOS;
                this._lastLOSTime = time;
            }
        } else {
            hasLOS = false;
            this._lastLOSResult = false;
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
                } else {
                    // Wedged on both axes at once -- Impound's fence segments make this far more
                    // likely than in an open corridor. There was no fallback here at all, so
                    // hitting this case meant the position update was simply skipped for the
                    // frame, every frame, forever: it just freezes in place. Anomaly.js has the
                    // same "both blocked" case and escapes it with a small random nudge; mirroring
                    // that here instead of leaving it a dead end.
                    this.group.position.x += (Math.random() - 0.5) * speed * delta;
                    this.group.position.z += (Math.random() - 0.5) * speed * delta;
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
        // The light sits at local y=3.6; a horizontal target radius of 1 (the old value) put the
        // aim vector at ~15 degrees off straight down no matter what yaw was -- the "sweep" was
        // real but far too small to ever pull the beam off the Warden's own feet, which is what
        // "pointing its searchlight straight at the ground" actually looks like. A wider radius
        // aims it out across the floor at a much shallower, genuinely scanning angle instead.
        const SWEEP_RADIUS = 10.0;
        this.lightTarget.position.set(Math.sin(yaw) * SWEEP_RADIUS, 0, Math.cos(yaw) * SWEEP_RADIUS);
        this.group.position.y = Math.sin(time * 4.0) * 0.05;
        // Purely cosmetic torso/head swivel, timed to the same yaw wave as the light sweep so it
        // reads as "the beam moves because the body is turning" -- but it only rotates upperBody
        // (torso/shoulders/head/eyes), never light or lightTarget, so it can't feed back into the
        // aim math above.
        if (this.upperBody) this.upperBody.rotation.y = yaw * 0.6;
    }
}