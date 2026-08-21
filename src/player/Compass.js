import AABB from '../math/AABB.js';
import * as SectorPlacement from '../world/SectorPlacement.js';

export default class Compass {
    constructor(engine, environment, player) {
        this.engine = engine;
        this.environment = environment;
        this.player = player;
        this.angle = 0;
        this.angVel = 0;
        this.hasFix = false;
        this._swayX = 0;
        this._swayY = 0;
        this._swayZ = 0;
        this._prevYaw = engine.camera ? engine.camera.rotation.y : 0;
        this._prevPitch = engine.camera ? engine.camera.rotation.x : 0;
        this._trailYaw = 0;
        this._trailPitch = 0;
        this._tuck = 0;
        this._probeVec = new THREE.Vector3();
        this._probeDir = new THREE.Vector3();
        this._probeHit = new THREE.Vector3();
        this._fallbackBearing = Math.random() * Math.PI * 2;
        this.raised = false;
        this.stow = 0;
        this._build();
        document.addEventListener('somatic-toggle-compass', () => {
            if (this.player.input && this.player.input.state.isReading) return;
            this.raised = !this.raised;
            document.dispatchEvent(new Event('somatic-inventory-woosh'));
            if (this.raised && this.player.input && this.player.input.state.flashlightActive) {
                this.player.input.state.flashlightActive = false;
                document.dispatchEvent(new CustomEvent('somatic-flashlight', {detail: {on: false}}));
            }
        });
        document.addEventListener('somatic-stow-compass', () => {
            if (this.raised) {
                this.raised = false;
                document.dispatchEvent(new Event('somatic-inventory-woosh'));
            }
        });
    }

    _skinTexture() {
        const S = 128;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = S;
        const c = canvas.getContext('2d');
        c.fillStyle = '#a87a5e';
        c.fillRect(0, 0, S, S);
        for (let i = 0; i < 420; i++) {
            const x = Math.random() * S, y = Math.random() * S;
            const r = 1 + Math.random() * 7;
            const warm = Math.random() > 0.45;
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fillStyle = warm
                ? `rgba(158,96,72,${(0.03 + Math.random() * 0.07).toFixed(3)})`
                : `rgba(206,168,138,${(0.03 + Math.random() * 0.07).toFixed(3)})`;
            c.fill();
        }
        for (let i = 0; i < 26; i++) {
            const x = Math.random() * S, y = Math.random() * S;
            c.strokeStyle = `rgba(92,56,40,${(0.06 + Math.random() * 0.10).toFixed(3)})`;
            c.lineWidth = 0.6 + Math.random() * 1.0;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 8);
            c.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    _finger(lengths, curls, rad, skin) {
        const root = new THREE.Group();
        let parent = root;
        for (let i = 0; i < lengths.length; i++) {
            const len = lengths[i];
            const r = rad * (1 - i * 0.13);
            const joint = new THREE.Group();
            joint.rotation.x = curls[i];
            parent.add(joint);
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 8, 6), skin);
            joint.add(knuckle);
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.88, len, 8), skin);
            seg.position.y = len / 2;
            joint.add(seg);
            if (i === lengths.length - 1) {
                const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 8, 6), skin);
                tip.position.y = len;
                tip.scale.set(1, 0.85, 1);
                joint.add(tip);
            }
            const next = new THREE.Group();
            next.position.y = len;
            joint.add(next);
            parent = next;
        }
        return root;
    }

    _buildHand() {
        const hand = new THREE.Group();
        const skinTex = this._skinTexture();
        const skin = new THREE.MeshStandardMaterial({
            map: skinTex, roughness: 0.78, metalness: 0.0,
            emissive: 0x120a06, emissiveIntensity: 0.35
        });
        const cuffMat = new THREE.MeshStandardMaterial({
            color: 0x3f4438, roughness: 0.96, metalness: 0.0,
            emissive: 0x0a0b08, emissiveIntensity: 0.3
        });

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.122, 0.032), skin);
        palm.position.set(-0.004, -0.008, -0.036);
        palm.rotation.x = -0.06;
        hand.add(palm);
        const heel = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), skin);
        heel.scale.set(1.15, 0.72, 0.42);
        heel.position.set(-0.004, -0.062, -0.038);
        hand.add(heel);

        const FINGERS = [
            {x: -0.061, len: [0.033, 0.025, 0.019], curl: [0.58, 1.00, 0.84], r: 0.0108, y: 0.049},
            {x: -0.033, len: [0.041, 0.031, 0.022], curl: [0.53, 0.97, 0.88], r: 0.0122, y: 0.055},
            {x: -0.002, len: [0.044, 0.033, 0.024], curl: [0.48, 0.95, 0.90], r: 0.0130, y: 0.057},
            {x: 0.030, len: [0.040, 0.030, 0.022], curl: [0.52, 0.92, 0.86], r: 0.0125, y: 0.055}
        ];
        for (const f of FINGERS) {
            const finger = this._finger(f.len, f.curl, f.r, skin);
            finger.position.set(f.x, f.y, -0.040);
            finger.rotation.z = -f.x * 1.6;
            hand.add(finger);
        }

        const thumb = this._finger([0.048, 0.032], [0.0, 0.62], 0.0155, skin);
        thumb.position.set(0.086, -0.030, -0.024);
        thumb.rotation.set(0.35, -0.18, 0.0);
        hand.add(thumb);

        const forearm = new THREE.Group();
        forearm.position.set(-0.0083, -0.0724, -0.0660);
        forearm.rotation.set(-0.30, 0, -0.10);

        const WRIST_LEN = 0.075, CUFF_LEN = 0.055, SLEEVE_LEN = 0.26;
        const CUFF_LAP = 0.014, SLEEVE_LAP = 0.010;
        const cuffTop = -(WRIST_LEN - CUFF_LAP);
        const sleeveTop = cuffTop - CUFF_LEN + SLEEVE_LAP;

        const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.045, WRIST_LEN, 12), skin);
        wrist.position.y = -WRIST_LEN / 2;
        forearm.add(wrist);
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.062, CUFF_LEN, 12), cuffMat);
        cuff.position.y = cuffTop - CUFF_LEN / 2;
        forearm.add(cuff);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.070, SLEEVE_LEN, 12), cuffMat);
        sleeve.position.y = sleeveTop - SLEEVE_LEN / 2;
        forearm.add(sleeve);
        hand.add(forearm);
        this.forearm = forearm;

        return hand;
    }

    _dialTexture() {
        const S = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = S;
        const c = canvas.getContext('2d');
        const r = S / 2;
        c.fillStyle = '#0b0a08';
        c.fillRect(0, 0, S, S);
        const face = c.createRadialGradient(r, r * 0.82, 4, r, r, r);
        face.addColorStop(0, '#d9cfb2');
        face.addColorStop(0.72, '#bdb08e');
        face.addColorStop(1, '#8e8468');
        c.beginPath();
        c.arc(r, r, r - 6, 0, Math.PI * 2);
        c.fillStyle = face;
        c.fill();
        for (let i = 0; i < 90; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.random() * (r - 12);
            const rad = 1 + Math.random() * 5;
            c.beginPath();
            c.arc(r + Math.cos(a) * d, r + Math.sin(a) * d, rad, 0, Math.PI * 2);
            c.fillStyle = `rgba(96,74,44,${(0.02 + Math.random() * 0.05).toFixed(3)})`;
            c.fill();
        }
        c.strokeStyle = '#3a3225';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(r, r, r - 7, 0, Math.PI * 2);
        c.stroke();
        for (let i = 0; i < 72; i++) {
            const a = (i / 72) * Math.PI * 2 - Math.PI / 2;
            const major = i % 6 === 0;
            const len = major ? 15 : (i % 2 === 0 ? 9 : 5);
            const inner = r - 12 - len;
            c.strokeStyle = major ? '#2b2318' : '#4a4030';
            c.lineWidth = major ? 3 : 1.4;
            c.beginPath();
            c.moveTo(r + Math.cos(a) * inner, r + Math.sin(a) * inner);
            c.lineTo(r + Math.cos(a) * (r - 12), r + Math.sin(a) * (r - 12));
            c.stroke();
        }
        c.fillStyle = '#241d13';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        const marks = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
        for (const [ch, deg] of marks) {
            const a = (deg / 180) * Math.PI - Math.PI / 2;
            c.font = `${ch === 'N' ? 'bold ' : ''}30px monospace`;
            c.fillText(ch, r + Math.cos(a) * (r - 42), r + Math.sin(a) * (r - 42));
        }
        c.font = '11px monospace';
        c.fillStyle = 'rgba(36,29,19,0.75)';
        c.fillText('THRESHOLD', r, r + 40);
        c.font = '9px monospace';
        c.fillText('LVL 0 FACILITIES', r, r + 56);
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        return tex;
    }

    _build() {
        const cam = this.engine.camera;
        if (!cam.parent) this.engine.scene.add(cam);

        this.group = new THREE.Group();
        const brass = new THREE.MeshStandardMaterial({
            color: 0x8a6a2c, roughness: 0.44, metalness: 0.92,
            emissive: 0x140d02, emissiveIntensity: 0.5
        });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.022, 28), brass);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 8, 28), brass);
        this.group.add(bezel);
        const lug = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 14), brass);
        lug.position.set(0, 0.098, 0);
        this.group.add(lug);

        const dial = new THREE.Mesh(
            new THREE.CircleGeometry(0.079, 32),
            new THREE.MeshStandardMaterial({
                map: this._dialTexture(),
                roughness: 0.9,
                emissive: 0xffffff,
                emissiveIntensity: 0.16
            })
        );
        dial.position.z = 0.012;
        this.group.add(dial);

        this.needle = new THREE.Group();
        this.needle.position.z = 0.016;
        const north = new THREE.Mesh(
            new THREE.BoxGeometry(0.008, 0.062, 0.003),
            new THREE.MeshStandardMaterial({
                color: 0x8d2418, roughness: 0.6,
                emissive: 0x6e3b1a, emissiveIntensity: 0.85
            })
        );
        north.position.y = 0.031;
        this.needle.add(north);
        const south = new THREE.Mesh(
            new THREE.BoxGeometry(0.008, 0.052, 0.003),
            new THREE.MeshStandardMaterial({
                color: 0xb9b3a2, roughness: 0.7,
                emissive: 0x2a2820, emissiveIntensity: 0.4
            })
        );
        south.position.y = -0.026;
        this.needle.add(south);
        this.group.add(this.needle);
        const pin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.006, 10),
            new THREE.MeshStandardMaterial({color: 0x5d5346, roughness: 0.35, metalness: 0.9})
        );
        pin.rotation.x = Math.PI / 2;
        pin.position.z = 0.019;
        this.group.add(pin);

        const glass = new THREE.Mesh(
            new THREE.CircleGeometry(0.082, 32),
            new THREE.MeshStandardMaterial({
                color: 0xcfd6d2, roughness: 0.06, metalness: 0.1,
                transparent: true, opacity: 0.17
            })
        );
        glass.position.z = 0.022;
        this.group.add(glass);

        this.rig = new THREE.Group();
        this.rig.add(this.group);
        this.rig.add(this._buildHand());
        this.rig.position.set(0.30, -0.32, -0.62);
        this.rig.rotation.set(-0.52, -0.30, 0.12);
        this.basePos = this.rig.position.clone();
        this.baseRot = this.rig.rotation.clone();
        this.rig.visible = false;
        cam.add(this.rig);
    }

    _nearestThreshold() {
        const env = this.environment;
        const p = this.engine.camera.position;
        const isExitPhase = env.player && env.player.objectives && env.player.objectives.fixed >= env.player.objectives.total &&
            env.player.inventory && env.player.inventory.hasExitKey && !env.player.objectives.escaped;
        let best = null, bestSq = Infinity;
        const consider = (minX, maxX, minZ, maxZ) => {
            const nx = Math.max(minX, Math.min(p.x, maxX));
            const nz = Math.max(minZ, Math.min(p.z, maxZ));
            const dx = p.x - nx, dz = p.z - nz;
            const dSq = dx * dx + dz * dz;
            if (dSq < bestSq) {
                bestSq = dSq;
                best = {x: nx, z: nz};
            }
        };

        if (isExitPhase) {
            if (env.dynamicExitHash) {
                const comma = env.dynamicExitHash.indexOf(',');
                if (comma > 0) {
                    const cx = parseInt(env.dynamicExitHash.slice(0, comma), 10);
                    const cz = parseInt(env.dynamicExitHash.slice(comma + 1), 10);
                    const ox = cx * env.chunkSize * env.cellSize;
                    const oz = cz * env.chunkSize * env.cellSize;
                    consider(ox + 2, ox + 58, oz + 2, oz + 58);
                    if (best) return best;
                }
            } else {
                const chunkW = env.chunkSize * env.cellSize;
                const centerCx = Math.floor(p.x / chunkW);
                const centerCz = Math.floor(p.z / chunkW);
                const placement = SectorPlacement.placementConfig(env);
                for (let r = 0; r <= 8; r++) {
                    for (let dx = -r; dx <= r; dx++) {
                        for (let dz = -r; dz <= r; dz++) {
                            if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                            const cx = centerCx + dx;
                            const cz = centerCz + dz;
                            if (SectorPlacement.isMacroChunk(placement, cx, cz)) {
                                const hash = `${cx},${cz}`;
                                if (!env.discoveredSectors.has(hash) || env.discoveredSectors.get(hash) === "EXIT") {
                                    const ox = cx * env.chunkSize * env.cellSize;
                                    const oz = cz * env.chunkSize * env.cellSize;
                                    consider(ox + 2, ox + 58, oz + 2, oz + 58);
                                }
                            }
                        }
                    }
                    if (best) break;
                }
                if (best) return best;
            }
        }

        if (env.macroZones) {
            for (const zone of env.macroZones.values()) {
                consider(zone.minX, zone.maxX, zone.minZ, zone.maxZ);
            }
        }
        const claimed = env._macroChunkHashes;
        if (claimed && claimed.size > 0) {
            for (const key of claimed) {
                if (env.macroZones && env.macroZones.has(key)) continue;
                const comma = key.indexOf(',');
                if (comma < 1) continue;
                const cx = parseInt(key.slice(0, comma), 10);
                const cz = parseInt(key.slice(comma + 1), 10);
                if (!Number.isFinite(cx) || !Number.isFinite(cz)) continue;
                const ox = cx * env.chunkSize * env.cellSize;
                const oz = cz * env.chunkSize * env.cellSize;
                consider(ox + 2, ox + 58, oz + 2, oz + 58);
            }
        }
        return best;
    }

    _proximityTuck(cam) {
        const state = this.player.input ? this.player.input.state : null;
        if (this.player.isSqueezing || (state && state.isCrawling)) return 1;
        const env = this.environment;
        if (!env || !env.spatialGrid || !env.spatialGrid.getNearby) return 0;

        this._probeVec.copy(this.basePos).applyQuaternion(cam.quaternion);
        const cx = cam.position.x + this._probeVec.x;
        const cy = cam.position.y + this._probeVec.y;
        const cz = cam.position.z + this._probeVec.z;

        const REACH = 0.50; 
        const CLEAR = 0.15; 

        const boxes = env.spatialGrid.getNearby(cx, cz, REACH + 0.5);
        let nearestSq = Infinity;

        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            if (box.isInvisibleBlocker) continue;

            const clampX = Math.max(box.min.x, Math.min(cx, box.max.x));
            const clampY = Math.max(box.min.y, Math.min(cy, box.max.y));
            const clampZ = Math.max(box.min.z, Math.min(cz, box.max.z));

            const dx = cx - clampX;
            const dy = cy - clampY;
            const dz = cz - clampZ;
            const dSq = dx * dx + dy * dy + dz * dz;

            if (dSq < nearestSq) nearestSq = dSq;
        }

        if (nearestSq >= REACH * REACH) return 0;
        const d = Math.sqrt(nearestSq);
        return Math.max(0, Math.min(1, 1 - (d - CLEAR) / (REACH - CLEAR)));
    }

    update(delta) {
        if (!this.rig) return;
        const dt = Math.min(delta, 0.05);
        const cam = this.engine.camera;
        const blocked = this.player.isDead ||
            (this.player.input && this.player.input.state.isReading);
        const wantStow = (this.raised && !blocked) ? 1 : 0;
        const rate = wantStow > this.stow ? 5.2 : 6.8;
        this.stow += (wantStow - this.stow) * Math.min(1, dt * rate);

        const proximity = this._proximityTuck(cam);
        this._tuck += (proximity - this._tuck) * Math.min(1, dt * (proximity > this._tuck ? 14.0 : 6.0));
        const shown = this.stow * (1 - this._tuck);

        if (shown < 0.002) {
            if (this.stow < 0.002) this.stow = 0;
            this.rig.visible = false;
            this._prevYaw = cam.rotation.y;
            this._prevPitch = cam.rotation.x;
            this._trailYaw = 0;
            this._trailPitch = 0;
            return;
        }
        this.rig.visible = true;
        const eased = shown * shown * (3 - 2 * shown);
        const drop = (1 - eased) * 0.46;
        const roll = (1 - eased) * 0.85;

        const phase = (this.player.headBobPhase || 0) * 0.35;
        const gait = this.player.gait || 0;

        const swingX = Math.sin(phase) * 0.020 * gait;
        const swingY = Math.sin(phase * 2.0) * 0.013 * gait;
        const swingRoll = Math.sin(phase) * 0.055 * gait;
        const swingPitch = Math.sin(phase * 2.0 + 0.6) * 0.030 * gait;

        const counterBob = -(this.player.bobOffset || 0) * 0.34;

        let dYaw = cam.rotation.y - this._prevYaw;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        const dPitch = cam.rotation.x - this._prevPitch;
        this._prevYaw = cam.rotation.y;
        this._prevPitch = cam.rotation.x;
        const clamp = (v, m) => Math.max(-m, Math.min(m, v));
        const invDt = 1 / Math.max(dt, 1e-4);
        const yawRate = clamp(dYaw * invDt, 6.0);
        const pitchRate = clamp(dPitch * invDt, 6.0);
        const follow = Math.min(1, dt * 9.0);
        this._trailYaw += (yawRate - this._trailYaw) * follow;
        this._trailPitch += (pitchRate - this._trailPitch) * follow;

        this.rig.rotation.set(
            this.baseRot.x - roll * 0.55 + swingPitch - this._trailPitch * 0.013,
            this.baseRot.y - roll * 0.30 - this._trailYaw * 0.030,
            this.baseRot.z + roll + swingRoll - this._trailYaw * 0.022
        );

        const target = this._nearestThreshold();
        this.hasFix = target !== null;
        let want;
        if (target) {
            const bearing = Math.atan2(target.x - cam.position.x, target.z - cam.position.z);
            want = bearing - cam.rotation.y - Math.PI;
        } else {
            want = this._fallbackBearing - cam.rotation.y - Math.PI;
        }
        let diff = want - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const stiffness = target ? 26.0 : 6.0;
        const damping = target ? 6.4 : 3.0;
        const speed = Math.sqrt(
            this.player.velocity.x * this.player.velocity.x +
            this.player.velocity.z * this.player.velocity.z
        );

        const jostle = Math.sin(this.engine.time * 11.0) * 0.004 * gait;
        this.angVel += (diff * stiffness - this.angVel * damping) * dt;
        this.angle += (this.angVel + jostle) * dt;
        this.needle.rotation.z = this.angle;

        const sinY = Math.sin(cam.rotation.y), cosY = Math.cos(cam.rotation.y);
        const vRight = this.player.velocity.x * cosY - this.player.velocity.z * sinY;
        const vForward = -this.player.velocity.x * sinY - this.player.velocity.z * cosY;
        const lagX = -clamp(vRight * 0.0105, 0.045);
        const lagY = -clamp(speed * 0.0060, 0.035);
        const lagZ = clamp(vForward * 0.0075, 0.032);
        this._swayX += (lagX - this._swayX) * Math.min(1, dt * 11.0);
        this._swayY += (lagY - this._swayY) * Math.min(1, dt * 10.0);
        this._swayZ += (lagZ - this._swayZ) * Math.min(1, dt * 8.0);
        const pullIn = (1 - eased) * 0.28;
        const pullLeft = (1 - eased) * 0.12;

        this.rig.position.set(
            this.basePos.x + this._swayX + swingX + this._trailYaw * 0.008 - pullLeft,
            this.basePos.y + this._swayY + swingY + counterBob - this._trailPitch * 0.008 - drop,
            this.basePos.z + this._swayZ + pullIn
        );
    }
}
