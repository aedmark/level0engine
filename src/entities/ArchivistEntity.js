// ArchivistEntity.js
// Level 0 Engine: The Archivist

import Vec3 from '../math/Vec3.js';

/**
 * A passive entity that spawns in the archive sector. Scatters when approached,
 * but drops documents when observed by the flashlight for a prolonged period.
 */
export default class ArchivistEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.target = new Vec3();
        this.graceTimer = 0;
        this.droppedDoc = false;
        this._buildMesh();
    }

    _buildMesh() {
        // The body: a small warm mote of light. This is the entity's "face" -- the observation
        // logic in update() scales and dims it directly, so it stays named `core` and stays the
        // primary read at a glance.
        const coreMat = new THREE.MeshBasicMaterial({color: 0xfff2d6, transparent: true, opacity: 0.95});
        const coreGeo = new THREE.IcosahedronGeometry(0.14, 1);
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.core.position.y = 1.2;
        this.group.add(this.core);

        // A pair of gossamer wings flanking the body. Thin, additive, double-sided so they read
        // from any angle -- flapped in _animate() rather than sitting rigid.
        const wingMat = new THREE.MeshBasicMaterial({
            color: 0xaa55ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const wingGeo = new THREE.PlaneGeometry(0.6, 0.92);
        this.wingL = new THREE.Mesh(wingGeo, wingMat);
        this.wingL.position.set(-0.1, 1.24, 0);
        this.wingL.rotation.y = Math.PI / 2.4;
        this.group.add(this.wingL);
        this.wingR = new THREE.Mesh(wingGeo, wingMat);
        this.wingR.position.set(0.1, 1.24, 0);
        this.wingR.rotation.y = -Math.PI / 2.4;
        this.group.add(this.wingR);

        // Fairy dust: a handful of tiny motes looping around the body at staggered radii/speeds,
        // the same "orbiting debris" trick IncineratorEntity uses for its slag chunks, just
        // smaller and warmer.
        this.motes = [];
        const moteMat = new THREE.MeshBasicMaterial({
            color: 0xffe9b0,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const moteGeo = new THREE.IcosahedronGeometry(0.035, 0);
        for (let i = 0; i < 5; i++) {
            const mote = new THREE.Mesh(moteGeo, moteMat);
            mote.userData = {
                radius: 0.22 + Math.random() * 0.3,
                speed: 1.5 + Math.random() * 2.5,
                offsetY: 1.2 + (Math.random() - 0.5) * 0.4,
                phase: Math.random() * Math.PI * 2
            };
            this.motes.push(mote);
            this.group.add(mote);
        }

        this.light = new THREE.PointLight(0xc9a6ff, 1.1, 6.0);
        this.light.position.y = 1.2;
        this.group.add(this.light);
        this.scene.add(this.group);
    }

    /**
     * Shows or hides the Archivist's visible body parts, leaving `group` (and therefore
     * `this.light`, its child) untouched.
     *
     * Educational Note: This used to be a plain `this.group.visible = true/false`, toggled not
     * just on sector entry/exit but constantly during ordinary ARCHIVE play -- every hide/flee
     * cycle (`hideTimer`/`fleeTimer` in update()) hid the whole group, `this.light` included.
     * Three.js excludes an invisible object's entire subtree from the current frame's light list,
     * so every one of those cycles changed the scene's active light count and forced a shader
     * recompile across every standard-lit material in the scene -- the same mechanism the
     * Incinerator/Maintenance chunk-streaming stutter and the Warden/Impound entity-switch
     * stutter turned out to share, just firing far more often here since it's tied to routine
     * behavior instead of a rarer sector transition. `group` now stays visible permanently;
     * only the meshes toggle, so the light is always present in the scene -- just dark when
     * `intensity` is zeroed alongside it.
     */
    _setBodyVisible(visible) {
        this.core.visible = visible;
        this.wingL.visible = visible;
        this.wingR.visible = visible;
        for (const mote of this.motes) mote.visible = visible;
    }

    /**
     * Hides the Archivist and silences its light without removing either from the scene graph.
     * Called by EntityManager when another entity type becomes active.
     */
    deactivate() {
        this.isActive = false;
        this._setBodyVisible(false);
        this.light.intensity = 0;
    }

    /**
     * Resets the entity and spawns it at the given coordinates.
     * @param {number} x - The X coordinate to spawn at.
     * @param {number} y - The Y coordinate to spawn at.
     * @param {number} z - The Z coordinate to spawn at.
     */
    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 10.0;
        this.fleeTimer = 0;
        this.hideTimer = 0;
        this.droppedDoc = false;
        this._curiousRetargetCooldown = 0;
        // Re-leash to the Archive sector's current geometry on every (re)spawn -- its wander
        // target can drift up to 40 units, easily enough to drift out through an open door.
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('ARCHIVE') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this._setBodyVisible(true);
        this.light.intensity = 1.1;
        this.observeTimer = 0;
    }

    /**
     * Clamps a world-space (x, z) into the Archivist's home sector, if bounds are known.
     * Called on every reset and every wander tick.
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
     * Updates the entity's behavior, tracking observation and scatter mechanics.
     * @param {number} delta - Time elapsed since the last frame.
     * @param {number} time - Total elapsed time.
     * @returns {Object|null} Returns null; the archivist does not attack or consume the player.
     */
    update(delta, time) {
        // EntityManager only ever calls update() on whichever entity is currently active, and
        // already called deactivate() the moment this one stopped being it -- this check is just
        // a defensive no-op guard, not the actual hide/show path (see deactivate()).
        if (!this.isActive) {
            return null;
        }
        // Tucked away after a scare. Stays invisible for a bit, then slips back in near the
        // player with a fresh grace period -- it went into hiding, it didn't cease to exist.
        if (this.hideTimer > 0) {
            this.hideTimer -= delta;
            if (this.hideTimer <= 0) {
                const playerPos = this.camera.position;
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDist = 15.0 + (Math.random() * 10.0);
                const clamped = this._clampToBounds(
                    playerPos.x + Math.cos(spawnAngle) * spawnDist,
                    playerPos.z + Math.sin(spawnAngle) * spawnDist
                );
                this.group.position.set(clamped.x, 0, clamped.z);
                this.target.copy(this.group.position);
                this._setBodyVisible(true);
                this.light.intensity = 1.1;
                this.graceTimer = 3.0;
                this.observeTimer = 0;
            }
            return null;
        }
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animate(time);
            return null;
        }
        const playerPos = this.camera.position;
        const distSq = this.group.position.distanceToSquared(playerPos);
        if (distSq > 3600.0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 15.0 + (Math.random() * 10.0);
            this.reset(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                0,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );
            return null;
        }
        // Caught mid-scurry: still visible, but sprinting for cover and spinning like it means
        // it. This is the "show" -- a beat the player can actually see -- before it ducks out via
        // hideTimer below, instead of just winking out of existence on the spot.
        if (this.fleeTimer > 0) {
            this.fleeTimer -= delta;
            const away = new Vec3().subVectors(this.group.position, playerPos);
            away.y = 0;
            if (away.lengthSq() > 0.0001) away.normalize();
            this.group.position.x += away.x * delta * 9.0;
            this.group.position.z += away.z * delta * 9.0;
            const clampedFlee = this._clampToBounds(this.group.position.x, this.group.position.z);
            this.group.position.x = clampedFlee.x;
            this.group.position.z = clampedFlee.z;
            this._animate(time * 4.0);
            if (this.fleeTimer <= 0) {
                this.hideTimer = 5.0 + Math.random() * 4.0;
                this._setBodyVisible(false);
                this.light.intensity = 0;
            }
            return null;
        }
        // Scatter only if the player sprints near it -- calm proximity (walking, not observing)
        // is what makes it curious rather than anxious, so it no longer bolts just for being
        // approached on foot.
        if (distSq < 100.0 && this.player.isRunning) {
            this.fleeTimer = 0.6;
            document.dispatchEvent(new CustomEvent('somatic-lost', { detail: { distSq: distSq, intensity: 1.0, isLaugh: false } }));
            return null;
        }
        this._animate(time);
        let isObserved = false;
        if (this.player.flashlightActive && distSq < 400.0) {
            const toEntity = new Vec3().subVectors(this.group.position, playerPos).normalize();
            const lookDir = new Vec3().set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (lookDir.dot(toEntity) > 0.85) {
                isObserved = true;
            }
        }
        if (isObserved) {
            this.observeTimer = (this.observeTimer || 0) + delta;
            this.core.scale.setScalar(1.0 - Math.min(0.8, this.observeTimer * 0.4));
            this.light.intensity = 1.1 - Math.min(0.8, this.observeTimer * 0.4);
            if (this.observeTimer > 2.0 && !this.droppedDoc) {
                this.dropDocument();
                // Give the drop a beat to register (still visible, still spinning) before it
                // scurries off the same way a scare would send it -- no need to be caught out to
                // get the document, but it doesn't just vanish the instant it lets go of it either.
                this.fleeTimer = 0.6;
                this.observeTimer = 0;
                document.dispatchEvent(new CustomEvent('somatic-item', { detail: { distSq: distSq, intensity: 1.5 } }));
                return null;
            }
        } else {
            this.observeTimer = Math.max(0, (this.observeTimer || 0) - delta);
            this.core.scale.setScalar(1.0);
            this.light.intensity = 1.1;
        }
        if (!isObserved) {
            // Curious, not anxious, not clingy: it wants to be somewhere in this comfortable
            // ring around the player, but it only picks a new perch on a cooldown rather than
            // every frame proximity holds -- re-rolling a random point every tick is what made
            // it read as a bee track-hovering you. Between retargets it just glides where it was
            // last told to go, so it can lag behind a moving player instead of laser-following.
            const ARCHIVIST_CURIOUS_NEAR = 6.0;
            const ARCHIVIST_CURIOUS_FAR = 13.0;
            this._curiousRetargetCooldown = (this._curiousRetargetCooldown || 0) - delta;
            if (this._curiousRetargetCooldown <= 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = ARCHIVIST_CURIOUS_NEAR + Math.random() * (ARCHIVIST_CURIOUS_FAR - ARCHIVIST_CURIOUS_NEAR);
                const clampedTarget = this._clampToBounds(
                    playerPos.x + Math.cos(angle) * dist,
                    playerPos.z + Math.sin(angle) * dist
                );
                this.target.x = clampedTarget.x;
                this.target.z = clampedTarget.z;
                this._curiousRetargetCooldown = 2.0 + Math.random() * 2.5;
            }
            this.group.position.lerp(this.target, 0.01);
            const clampedPos = this._clampToBounds(this.group.position.x, this.group.position.z);
            this.group.position.x = clampedPos.x;
            this.group.position.z = clampedPos.z;
        }
        return null;
    }

    /**
     * Spawns an interactable document drop in the world when successfully observed.
     */
    dropDocument() {
        this.droppedDoc = true;
        const docMat = new THREE.MeshBasicMaterial({color: 0xffffff});
        const docGeo = new THREE.BoxGeometry(0.3, 0.02, 0.4);
        const docMesh = new THREE.Mesh(docGeo, docMat);
        docMesh.position.copy(this.group.position);
        docMesh.position.y = 0.05;
        docMesh.rotation.y = Math.random() * Math.PI;
        docMesh.userData = {
            type: 'document',
            active: true,
            docId: 'DOC_' + Math.floor(Math.random() * 1000),
            zone: 'ARCHIVE'
        };
        this.scene.add(docMesh);
        if (this.env && this.env.interactables) {
            this.env.interactables.push(docMesh);
        }
    }

    _animate(time) {
        this.core.rotation.y = time * 1.2;

        // Fast, slightly uneven wingbeats -- two overlapping frequencies so it doesn't read as
        // a metronome. Rotation only, so this never fights the observation-scale logic in
        // update(), which owns this.core.scale directly.
        const flap = Math.sin(time * 16.0) * 0.55 + Math.sin(time * 23.0) * 0.15;
        this.wingL.rotation.z = flap;
        this.wingR.rotation.z = -flap;

        // Fairy dust looping around the body in loose, staggered orbits.
        for (const mote of this.motes) {
            const {radius, speed, offsetY, phase} = mote.userData;
            const a = time * speed + phase;
            mote.position.set(Math.cos(a) * radius, offsetY + Math.sin(a * 1.7) * 0.06, Math.sin(a) * radius);
        }

        // Erratic, insect-like drift in place of the old slow hover -- group.position.x/z are
        // owned by the wander/flee logic in update(), so only y and yaw move here.
        this.group.position.y = Math.sin(time * 3.2) * 0.08 + Math.sin(time * 7.3) * 0.03;
        this.group.rotation.y = Math.sin(time * 1.1) * 0.4;
    }
}