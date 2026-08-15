import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

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
        this.MAX_LIT = 2;
        this._litCables = [];
        this._litSlots = [];
        this._teleMin = new Vec3();
        this._teleMax = new Vec3();
        this._teleBox = new AABB();
        this._buildMesh();
        this._slotPool = [];
        for (let i = 0; i < this.MAX_LIT; i++) this._slotPool.push(this._buildSparkSlot());
    }

    _buildMesh() {
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
        this.light = new THREE.PointLight(0x8ff2ff, 0.7, 4.5, 2.0);
        this.group.add(this.light);
        this.scene.add(this.group);
    }

    _setBodyVisible(visible) {
        this.core.visible = visible;
        for (const spark of this.sparks) spark.mesh.visible = visible;
    }

    _buildSparkSlot() {
        if (!this._sparkGeo) this._sparkGeo = new THREE.TetrahedronGeometry(0.05, 0);
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
        return {group, light, shards, cycleTimer: 0};
    }

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
            s.launchDelay = Math.random() * 0.15;
            s.mesh.visible = false;
        });
        if (window.acoustics) {
            const distSq = this.camera.position.distanceToSquared(slot.group.position);
            window.acoustics.triggerSomaticEvent('electric_spark', distSq * 15.0, 0.2 + Math.random() * 0.2);
        }
    }

    _activateSlot(slot, position) {
        slot.group.position.copy(position);
        slot.light.intensity = 0.9;
        slot.cycleTimer = 0;
        slot.shards.forEach(s => {
            s.landed = true;
            s.mesh.visible = false;
        });
    }

    _deactivateSlot(slot) {
        slot.light.intensity = 0;
        slot.shards.forEach(s => {
            s.mesh.visible = false;
        });
    }

    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 3.0;
        this._zapCooldown = 0;
        this._hasLastPlayerPos = false;
        this._relightTimer = 0;
        this._unlightAll();
        this.group.position.set(x, this._ceilingY(), z);
        this._setBodyVisible(true);
        this.light.intensity = 0.7;
    }

    deactivate() {
        this.isActive = false;
        this._setBodyVisible(false);
        this.light.intensity = 0;
        this._unlightAll();
    }

    _ceilingY() {
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
        if (moveLenSq > 0.0004) {
            const moveLen = Math.sqrt(moveLenSq);
            this._heading.x = dx / moveLen;
            this._heading.z = dz / moveLen;
        }
        this._lastPlayerPos.copy(playerPos);
        const lookAhead = 9.0;
        this._predicted.set(
            playerPos.x + this._heading.x * lookAhead,
            0,
            playerPos.z + this._heading.z * lookAhead
        );
        const toTargetX = this._predicted.x - this.group.position.x;
        const toTargetZ = this._predicted.z - this.group.position.z;
        const toTargetLen = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);
        const speed = 7.5;
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
            const slot = this._slotPool[this._litCables.length - 1];
            this._activateSlot(slot, best.position);
            this._litSlots.push(slot);
        }
    }

    _checkContact(playerPos) {
        const touchRadiusSq = 0.49;
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
        this.camera.rotation.z += (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.07);
        document.dispatchEvent(new CustomEvent('somatic-breaker', {detail: {distSq: 1.0, intensity: 1.6}}));
    }

    _findSafeTeleport(playerPos) {
        const cellSize = this.env.cellSize || 4;
        const chunkSize = this.env.chunkSize || 16;
        for (let attempt = 0; attempt < 24; attempt++) {
            const angle = Math.random() * Math.PI * 2;
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
        return {x: playerPos.x + (Math.random() - 0.5) * 2.0, z: playerPos.z + (Math.random() - 0.5) * 2.0};
    }

    _animate(time) {
        const pulse = 1.0 + Math.sin(time * 6.0) * 0.25;
        this.core.scale.set(pulse, pulse, pulse);
        this.core.rotation.y = time * 2.0;
        for (let i = 0; i < this.sparks.length; i++) {
            const s = this.sparks[i];
            const angle = time * s.speed + s.offset;
            s.mesh.position.set(Math.cos(angle) * 0.35, Math.sin(time * 4.0 + i) * 0.15, Math.sin(angle) * 0.35);
            s.mesh.rotation.x += 0.1;
        }
    }

    _animateSparks(delta, time) {
        const gravity = 5.0;
        for (let i = 0; i < this._litSlots.length; i++) {
            const slot = this._litSlots[i];
            const entry = this._litCables[i];
            if (!slot || !entry) continue;
            slot.group.position.copy(entry.position);
            const flicker = 0.65 + Math.random() * 0.45;
            slot.light.intensity = 0.9 * flicker;
            slot.cycleTimer -= delta;
            if (slot.cycleTimer <= 0 && slot.shards.every(s => s.landed)) {
                this._launchBurst(slot);
                slot.cycleTimer = 0.6 + Math.random() * 1.2;
            }
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