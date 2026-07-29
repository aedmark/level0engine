// BackupDaemonEntity.js
// Level 0 Engine: The Backup Daemon

import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

/**
 * The Server sector's dedicated hazard.
 *
 * Unlike every other hazard in this file, the Backup Daemon never touches the player directly --
 * it has no capture radius at all. It rides the ceiling near Server's own hanging cable props
 * (registered in `env.hangingCables` by ServerSector.js), shadowing the direction the player is
 * actually moving rather than their current position, and tries to get *ahead* of them along that
 * heading instead of tailing behind. Once it's near a stretch of cable ahead of the player, it
 * energizes it (swaps the cable's shared decorative material for `env.cableEnergizedMat`). Contact
 * with a lit cable is the actual hazard: a "zap" that displaces the player to a random safe nearby
 * point, never a wall and never outside a currently-loaded chunk, instead of the death/consumption
 * every other hazard in this file uses.
 */
export default class BackupDaemonEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.graceTimer = 0;
        this._hasLastPlayerPos = false;
        this._lastPlayerPos = new Vec3();
        this._heading = new Vec3(0, 0, 1);
        this._predicted = new Vec3();
        this._relightTimer = 0;
        this._zapCooldown = 0;
        // Cable registry entries this daemon currently has energized -- kept separate from
        // env.hangingCables itself so un-lighting on deactivate/reset only ever touches cables
        // this particular instance lit, never something another system might be doing with the list.
        this.MAX_LIT = 2;
        this._litCables = [];
        // Parallel array to _litCables (same index, same length, spliced together) -- each entry
        // is one of the two pooled spark/glow slots below, whichever one that lit cable is
        // currently borrowing.
        this._litSlots = [];
        this._teleMin = new Vec3();
        this._teleMax = new Vec3();
        this._teleBox = new AABB();
        this._buildMesh();
        this._slotPool = [];
        for (let i = 0; i < this.MAX_LIT; i++) this._slotPool.push(this._buildSparkSlot());
    }

    _buildMesh() {
        // Deliberately bright/emissive and small, the opposite silhouette from Anomaly's black
        // void core -- this thing is meant to read as a live current running along the ceiling,
        // not a shadow-creature on the floor.
        const glowMat = new THREE.MeshBasicMaterial({color: 0x8ff2ff});
        const coreGeo = new THREE.IcosahedronGeometry(0.2, 0);
        this.core = new THREE.Mesh(coreGeo, glowMat);
        this.group.add(this.core);
        this.sparks = [];
        for (let i = 0; i < 5; i++) {
            const spark = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06, 0), glowMat);
            this.sparks.push({mesh: spark, speed: Math.random() * 3.0 + 1.5, offset: Math.random() * Math.PI * 2});
            this.group.add(spark);
        }
        // One modest, non-shadow-casting point light -- same precedent as Warden's own spotlight:
        // a single dedicated light for the one active hazard entity is a trivial addition next to
        // LumenGrid's pooled fixtures, not something that needs pooling itself.
        this.light = new THREE.PointLight(0x8ff2ff, 0.7, 4.5, 2.0);
        this.group.add(this.light);
        this.scene.add(this.group);
        this.group.visible = false;
    }

    /**
     * Builds one pooled "energized cable" slot: a small non-shadow point light for the glow plus
     * a handful of crackling shard meshes, positioned independently of the daemon's own body since
     * a lit cable and the daemon itself are rarely in the same spot. Pre-built (MAX_LIT of them,
     * see the constructor) rather than created/destroyed per cable so lighting and un-lighting a
     * cable is just moving a light and flipping mesh.visible flags, never a shader recompile --
     * see Warden's own deactivate() for why that specifically matters for lights: the group and
     * light stay permanently in the scene graph, only the light's intensity and the shards'
     * individual visibility ever toggle.
     */
    _buildSparkSlot() {
        if (!this._sparkGeo) this._sparkGeo = new THREE.TetrahedronGeometry(0.05, 0);
        // Hot-metal yellow -- deliberately warmer than the cyan-white glow light/cable material,
        // the same way real arc flash (blue-white) and the molten spark particles it throws off
        // (yellow-orange) read as two different colors.
        if (!this._sparkMat) this._sparkMat = new THREE.MeshBasicMaterial({color: 0xffd83c});
        const group = new THREE.Group();
        const light = new THREE.PointLight(0x9ff6ff, 0, 3.2, 2.0);
        group.add(light);
        const shards = [];
        for (let i = 0; i < 6; i++) {
            const mesh = new THREE.Mesh(this._sparkGeo, this._sparkMat);
            mesh.visible = false;
            shards.push({
                mesh, localX: 0, localY: 0, localZ: 0, velX: 0, velY: 0, velZ: 0,
                landed: true, launchDelay: 0
            });
            group.add(mesh);
        }
        this.scene.add(group);
        // cycleTimer counts down the *minimum* gap before the next burst is even eligible; the
        // actual trigger in _animateSparks also waits for every shard to have landed first, so a
        // burst can never get cut off mid-flight by the next one starting early.
        return {group, light, shards, cycleTimer: 0};
    }

    /**
     * Fires one synchronized burst: every shard in this slot launches together along a single
     * freshly-rolled direction (with a little per-shard angular spread and speed variance so it
     * doesn't read as one rigid clump), then falls under gravity same as before. The direction
     * itself only gets re-rolled here, once per burst -- that's what makes each new cycle shoot
     * off a different way instead of every shard picking its own independent heading.
     */
    _launchBurst(slot) {
        const angle = Math.random() * Math.PI * 2;
        slot.shards.forEach(s => {
            const a = angle + (Math.random() - 0.5) * 0.9;
            const speed = 1.0 + Math.random() * 1.2;
            s.velX = Math.cos(a) * speed;
            s.velZ = Math.sin(a) * speed;
            s.velY = 0.6 + Math.random() * 0.9;
            s.localX = 0;
            s.localY = 0;
            s.localZ = 0;
            s.landed = false;
            // A tiny ignition stagger within the burst -- sparks catching one after another over
            // a fraction of a second reads as more electrical than everything popping in one frame.
            s.launchDelay = Math.random() * 0.15;
            s.mesh.visible = false;
        });
    }

    _activateSlot(slot, position) {
        slot.group.position.copy(position);
        slot.light.intensity = 0.9;
        slot.cycleTimer = 0;
        slot.shards.forEach(s => { s.landed = true; s.mesh.visible = false; });
    }

    _deactivateSlot(slot) {
        slot.light.intensity = 0;
        slot.shards.forEach(s => { s.mesh.visible = false; });
    }

    /**
     * Resets the daemon to a starting position near the ceiling and clears tracking state.
     * @param {number} x - World X to spawn at.
     * @param {number} y - Ignored; the daemon always rides at its own fixed ceiling height.
     * @param {number} z - World Z to spawn at.
     */
    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 3.0;
        this._zapCooldown = 0;
        this._hasLastPlayerPos = false;
        this._relightTimer = 0;
        this._unlightAll();
        this.group.position.set(x, this._ceilingY(), z);
        this.group.visible = true;
        this.light.intensity = 0.7;
    }

    /**
     * Hides the daemon and de-energizes anything it left lit, without discarding `group`/`light`
     * the way EntityManager's fallback path would -- mirrors Warden/Archivist/Incinerator's own
     * deactivate() so switching sectors doesn't force a shader recompile.
     */
    deactivate() {
        this.isActive = false;
        this.group.visible = false;
        this.light.intensity = 0;
        this._unlightAll();
    }

    _ceilingY() {
        // Just under Server's own 3.0 ceiling -- the same height its hanging cables drop from.
        return 2.85;
    }

    _unlightAll() {
        for (let i = 0; i < this._litCables.length; i++) {
            const entry = this._litCables[i];
            if (entry.mesh && entry.material) entry.mesh.material = entry.material;
            entry.lit = false;
            if (this._litSlots[i]) this._deactivateSlot(this._litSlots[i]);
        }
        this._litCables.length = 0;
        this._litSlots.length = 0;
    }

    update(delta, time) {
        if (!this.isActive) return null;
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animate(time);
            return null;
        }
        if (this._zapCooldown > 0) this._zapCooldown -= delta;

        const playerPos = this.camera.position;
        if (!this._hasLastPlayerPos) {
            this._lastPlayerPos.copy(playerPos);
            this._hasLastPlayerPos = true;
        }
        const dx = playerPos.x - this._lastPlayerPos.x;
        const dz = playerPos.z - this._lastPlayerPos.z;
        const moveLenSq = dx * dx + dz * dz;
        // Only update heading when the player has actually moved a meaningful amount this frame --
        // otherwise standing still would decay the heading toward garbage as dx/dz hover near zero.
        if (moveLenSq > 0.0004) {
            const moveLen = Math.sqrt(moveLenSq);
            this._heading.x = dx / moveLen;
            this._heading.z = dz / moveLen;
        }
        this._lastPlayerPos.copy(playerPos);

        // Shadows the player's trajectory: the target isn't where the player IS, it's a point
        // well ahead of them along their own heading, so the daemon spends its time trying to
        // win the race to a spot you haven't reached yet rather than tailing behind you.
        const lookAhead = 9.0;
        this._predicted.set(
            playerPos.x + this._heading.x * lookAhead,
            0,
            playerPos.z + this._heading.z * lookAhead
        );
        const toTargetX = this._predicted.x - this.group.position.x;
        const toTargetZ = this._predicted.z - this.group.position.z;
        const toTargetLen = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);
        const speed = 7.5; // faster than the player's own top speed -- it's built to outrun you
        if (toTargetLen > 0.05) {
            const step = Math.min(toTargetLen, speed * delta);
            this.group.position.x += (toTargetX / toTargetLen) * step;
            this.group.position.z += (toTargetZ / toTargetLen) * step;
        }
        this.group.position.y = this._ceilingY() + Math.sin(time * 3.0) * 0.05;

        this._relightTimer -= delta;
        if (this._relightTimer <= 0) {
            this._relightTimer = 0.5 + Math.random() * 0.3;
            this._refreshLitCables();
        }

        if (this._zapCooldown <= 0) this._checkContact(playerPos);
        this._animate(time);
        this._animateSparks(delta, time);
        return null;
    }

    /**
     * Drops any energized cable the daemon has drifted away from, then energizes the nearest
     * un-lit cable still within reach -- capped at 2 simultaneously lit cables so the whole
     * ceiling doesn't light up at once.
     */
    _refreshLitCables() {
        for (let i = this._litCables.length - 1; i >= 0; i--) {
            const entry = this._litCables[i];
            const ddx = entry.position.x - this.group.position.x;
            const ddz = entry.position.z - this.group.position.z;
            if (ddx * ddx + ddz * ddz > 144.0) {
                if (entry.mesh && entry.material) entry.mesh.material = entry.material;
                entry.lit = false;
                this._deactivateSlot(this._litSlots[i]);
                this._litCables.splice(i, 1);
                this._litSlots.splice(i, 1);
            }
        }
        if (this._litCables.length >= this.MAX_LIT) return;
        const cables = this.env.hangingCables;
        if (!cables || cables.length === 0) return;
        let best = null;
        let bestDistSq = Infinity;
        for (let i = 0; i < cables.length; i++) {
            const entry = cables[i];
            if (entry.lit) continue;
            const ddx = entry.position.x - this.group.position.x;
            const ddz = entry.position.z - this.group.position.z;
            const distSq = ddx * ddx + ddz * ddz;
            if (distSq < bestDistSq && distSq < 64.0) {
                bestDistSq = distSq;
                best = entry;
            }
        }
        if (best) {
            best.lit = true;
            best.mesh.material = this.env.cableEnergizedMat;
            this._litCables.push(best);
            // _litCables.length just grew by one above, so its new last index is exactly which
            // pooled slot (0 or 1) is free -- the two arrays are always spliced together in lockstep.
            const slot = this._slotPool[this._litCables.length - 1];
            this._activateSlot(slot, best.position);
            this._litSlots.push(slot);
        }
    }

    _checkContact(playerPos) {
        // The registered position is a single representative point along the strand (its
        // midpoint), not the whole cable's extent, and cables range from a short 0.6 drop up to a
        // 2.3-unit one whose lower half can dangle well below the midpoint -- generous radius and
        // vertical tolerance here are standing in for "anywhere along the strand," not a precise
        // point-touch, since a pixel-perfect hitbox on a thin wire would just feel unfair.
        const touchRadiusSq = 0.49; // ~0.7 unit reach around the midpoint
        for (let i = 0; i < this._litCables.length; i++) {
            const entry = this._litCables[i];
            const ddx = entry.position.x - playerPos.x;
            const ddy = entry.position.y - playerPos.y;
            const ddz = entry.position.z - playerPos.z;
            if ((ddx * ddx + ddz * ddz) < touchRadiusSq && Math.abs(ddy) < 1.6) {
                this._zapPlayer();
                return;
            }
        }
    }

    _zapPlayer() {
        this._unlightAll();
        this._relightTimer = 1.0;
        this._zapCooldown = 1.5;
        const spot = this._findSafeTeleport(this.camera.position);
        this.camera.position.set(spot.x, 1.6, spot.z);
        this.player.velocity.set(0, 0, 0);
        if (this.env.updateChunks) this.env.updateChunks(this.camera.position);
        // Physical jolt -- PlayerController already lerps camera.rotation.z back toward its own
        // velocity/peek roll every frame, so a one-off kick here recovers on its own over the next
        // few frames without any extra cleanup logic on this end.
        this.camera.rotation.z += (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.25);
        document.dispatchEvent(new CustomEvent('somatic-breaker', {detail: {distSq: 1.0, intensity: 1.6}}));
    }

    /**
     * Finds a random point that's inside a currently-loaded chunk and not overlapping any
     * isEntityBlocker box -- never a wall, never a stretch of unloaded/ungenerated world.
     */
    _findSafeTeleport(playerPos) {
        const cellSize = this.env.cellSize || 4;
        const chunkSize = this.env.chunkSize || 16;
        for (let attempt = 0; attempt < 24; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            // Search radius grows with each retry so a cluster of nearby blockers doesn't starve
            // every attempt at the same short distance.
            const dist = 6 + (attempt * 0.6) + Math.random() * 6;
            const cx = playerPos.x + Math.cos(angle) * dist;
            const cz = playerPos.z + Math.sin(angle) * dist;
            const chunkX = Math.floor(cx / (chunkSize * cellSize));
            const chunkZ = Math.floor(cz / (chunkSize * cellSize));
            const hash = `${chunkX},${chunkZ}`;
            if (!this.env.activeChunks || !this.env.activeChunks.has(hash)) continue;
            const clearance = 0.6;
            this._teleMin.set(cx - clearance, 0.0, cz - clearance);
            this._teleMax.set(cx + clearance, 2.2, cz + clearance);
            this._teleBox.set(this._teleMin, this._teleMax);
            let blocked = false;
            if (this.env.spatialGrid) {
                const nearby = this.env.spatialGrid.getNearby(cx, cz, 2.5);
                for (let i = 0; i < nearby.length; i++) {
                    if (nearby[i].isEntityBlocker && this._teleBox.intersectsBox(nearby[i])) {
                        blocked = true;
                        break;
                    }
                }
            }
            if (!blocked) return {x: cx, z: cz};
        }
        // Fallback: the player's own current spot is already known-safe, so a small nudge off it
        // never leaves them stuck even if every sampled candidate above came up blocked.
        return {x: playerPos.x + (Math.random() - 0.5) * 2.0, z: playerPos.z + (Math.random() - 0.5) * 2.0};
    }

    _animate(time) {
        const pulse = 1.0 + Math.sin(time * 6.0) * 0.25;
        this.core.scale.set(pulse, pulse, pulse);
        this.core.rotation.y = time * 2.0;
        this.sparks.forEach((s, i) => {
            const angle = time * s.speed + s.offset;
            s.mesh.position.set(Math.cos(angle) * 0.35, Math.sin(time * 4.0 + i) * 0.15, Math.sin(angle) * 0.35);
            s.mesh.rotation.x += 0.1;
        });
    }

    /**
     * Animates every currently-active spark slot: a flickering point light (real illumination,
     * not a fake bloom sprite -- this engine has no post-process bloom pass to fake it with) plus
     * a burst of shards that falls under gravity from the cable's own height. Bursts repeat on a
     * random interval, and only once every shard from the previous one has landed (see
     * _launchBurst) -- so it reads as the cable throwing off a fresh shower every so often, each
     * one kicked off in its own new direction, rather than one continuous drizzle.
     */
    _animateSparks(delta, time) {
        const gravity = 5.0;
        for (let i = 0; i < this._litSlots.length; i++) {
            const slot = this._litSlots[i];
            const entry = this._litCables[i];
            if (!slot || !entry) continue;
            slot.group.position.copy(entry.position);
            // Fast, uneven flicker -- an electrical crackle, not a smooth breathing pulse.
            const flicker = 0.65 + Math.random() * 0.45;
            slot.light.intensity = 0.9 * flicker;

            slot.cycleTimer -= delta;
            if (slot.cycleTimer <= 0 && slot.shards.every(s => s.landed)) {
                this._launchBurst(slot);
                // Random gap before the *next* cycle is even eligible -- combined with the
                // all-landed check above, this is what makes the interval irregular rather than
                // a fixed metronome tick.
                slot.cycleTimer = 0.6 + Math.random() * 1.2;
            }

            // The floor sits at world Y 0, and this slot's own group is already anchored at the
            // cable's world height, so "reached the floor" is just local Y crossing -groupY.
            const floorLocalY = -slot.group.position.y;
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
                s.mesh.rotation.x += 0.2;
                s.mesh.rotation.y += 0.15;
            });
        }
    }
}
