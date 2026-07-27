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
        const mat = new THREE.MeshBasicMaterial({color: 0xaa55ff, transparent: true, opacity: 0.5, wireframe: true});
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 3.0, 8, 1, true);
        this.core = new THREE.Mesh(geo, mat);
        this.core.position.y = 1.5;
        this.group.add(this.core);
        const innerMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
        const innerGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
        this.inner = new THREE.Mesh(innerGeo, innerMat);
        this.inner.position.y = 1.5;
        this.group.add(this.inner);
        this.light = new THREE.PointLight(0xaa55ff, 1.5, 10.0);
        this.light.position.y = 1.5;
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
        this.graceTimer = 10.0;
        this.fleeTimer = 0;
        this.hideTimer = 0;
        this.droppedDoc = false;
        // Re-leash to the Archive sector's current geometry on every (re)spawn -- its wander
        // target can drift up to 40 units, easily enough to drift out through an open door.
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('ARCHIVE') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this.group.visible = true;
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
        if (!this.isActive) {
            this.group.visible = false;
            return null;
        }
        // Tucked away after a scare. Stays invisible for a bit, then slips back in near the
        // player with a fresh grace period -- it went into hiding, it didn't cease to exist.
        if (this.hideTimer > 0) {
            this.hideTimer -= delta;
            this.group.visible = false;
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
                this.group.visible = true;
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
                this.group.visible = false;
            }
            return null;
        }
        // Scatter if player sprints near it, or gets too close -- run off and hide rather than
        // despawning outright.
        if ((distSq < 100.0 && this.player.isRunning) || distSq < 25.0) {
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
            this.light.intensity = 1.5 - Math.min(1.0, this.observeTimer * 0.5);
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
            this.light.intensity = 1.5;
        }
        if (!isObserved) {
            const ARCHIVIST_COMFORT_DIST_SQ = 81.0; // 9 units
            if (Math.random() < 0.02 || distSq < ARCHIVIST_COMFORT_DIST_SQ) {
                const awayAngle = distSq > 1.0
                    ? Math.atan2(this.group.position.z - playerPos.z, this.group.position.x - playerPos.x)
                    : Math.random() * Math.PI * 2;
                const angle = awayAngle + (Math.random() - 0.5) * (Math.PI * 0.7);
                const dist = 12.0 + Math.random() * 23.0;
                const clampedTarget = this._clampToBounds(
                    playerPos.x + Math.cos(angle) * dist,
                    playerPos.z + Math.sin(angle) * dist
                );
                this.target.x = clampedTarget.x;
                this.target.z = clampedTarget.z;
            }
            this.group.position.lerp(this.target, 0.015);
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
        this.core.rotation.y = time;
        this.inner.rotation.y = -time * 2.0;
        this.inner.rotation.x = time * 0.5;
        const pulse = 1.0 + Math.sin(time * 5.0) * 0.1;
        this.inner.scale.setScalar(pulse);
        this.group.position.y = Math.sin(time * 2.0) * 0.2;
    }
}