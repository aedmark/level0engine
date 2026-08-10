/**
 * [ROLE] Visual navigation instrument for the player.
 * [WHY] Provides diegetic guidance towards objectives (thresholds) without standard UI elements.
 * [STATE] Stateful, tracks orientation, physics swaying, and visual meshes.
 * [DEPENDS] Three.js (THREE), engine camera, player velocity, DOM events for toggling.
 */
import AABB from '../math/AABB.js';

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
        /** [WHY] Seeded from the live camera rather than 0 so the first frame after construction
         *  reports a zero look-delta. Seeding at 0 would read the camera's whole starting yaw as
         *  one frame of rotation and fling the arm on spawn. */
        this._prevYaw = engine.camera ? engine.camera.rotation.y : 0;
        this._prevPitch = engine.camera ? engine.camera.rotation.x : 0;
        this._trailYaw = 0;
        this._trailPitch = 0;
        this._tuck = 0;
        this._probeVec = new THREE.Vector3();
        this._probeDir = new THREE.Vector3();
        this._probeHit = new THREE.Vector3();
        this._fallbackBearing = Math.random() * Math.PI * 2;
        this.raised = true;
        this.stow = 0;
        this._build();
        document.addEventListener('somatic-toggle-compass', () => {
            if (this.player.input && this.player.input.state.isReading) return;
            this.raised = !this.raised;
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
        palm.position.set(0.004, -0.008, -0.036);
        palm.rotation.x = -0.06;
        hand.add(palm);
        const heel = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), skin);
        heel.scale.set(1.15, 0.72, 0.42);
        heel.position.set(0.004, -0.062, -0.038);
        hand.add(heel);

        const FINGERS = [
            {x: -0.030, len: [0.040, 0.030, 0.022], curl: [0.52, 0.92, 0.86], r: 0.0125, y: 0.055},
            {x: 0.002, len: [0.044, 0.033, 0.024], curl: [0.48, 0.95, 0.90], r: 0.0130, y: 0.057},
            {x: 0.033, len: [0.041, 0.031, 0.022], curl: [0.53, 0.97, 0.88], r: 0.0122, y: 0.055},
            {x: 0.061, len: [0.033, 0.025, 0.019], curl: [0.58, 1.00, 0.84], r: 0.0108, y: 0.049}
        ];
        for (const f of FINGERS) {
            const finger = this._finger(f.len, f.curl, f.r, skin);
            finger.position.set(f.x, f.y, -0.040);
            finger.rotation.z = -f.x * 1.6;
            hand.add(finger);
        }

        const thumb = this._finger([0.048, 0.032], [0.0, 0.62], 0.0155, skin);
        thumb.position.set(-0.086, -0.030, -0.024);
        thumb.rotation.set(0.35, 0.18, 0.0);
        hand.add(thumb);

        /**
         * [WHY] The forearm is one limb, so it is built as one chain. Wrist, cuff and sleeve
         * were previously three meshes positioned independently in hand space while sharing
         * `rotation.set(-0.30, 0, 0.10)`. The z-component of that placement line ran opposite
         * to the axis the cylinders were rotated onto, putting the line 34 degrees off the
         * tilt: measured at the seams, the cuff's top cap sat 0.0288 laterally from the
         * wrist's bottom cap (53% of the cuff's own radius, so half the cuff was buried in
         * the wrist) and the sleeve's top cap missed the cuff by 0.0771, or 135% of its
         * radius. Parenting makes that class of error unrepresentable: the tilt is applied
         * exactly once at the root and the children carry local Y offsets only, so the seams
         * are colinear by construction and only the three LEN constants can move a joint.
         * The root sits where the old wrist's top cap was, which preserves the silhouette
         * at the hand and lets the divergence unwind down the arm instead of at the cuff.
         */
        const forearm = new THREE.Group();
        forearm.position.set(0.0083, -0.0724, -0.0660);
        forearm.rotation.set(-0.30, 0, 0.10);

        const WRIST_LEN = 0.075, CUFF_LEN = 0.055, SLEEVE_LEN = 0.26;
        /** [WHY] Fabric sits on top of skin, not flush against it. The laps also cap the open
         *  ends of the cylinders below them, which is why the cuff is the wider radius at
         *  both seams -- it swallows the wrist's bottom face and the sleeve's top face. */
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
        this.rig.position.set(0.30, -0.235, -0.62);
        this.rig.rotation.set(-0.52, -0.30, 0.12);
        this.basePos = this.rig.position.clone();
        this.baseRot = this.rig.rotation.clone();
        this.rig.visible = false;
        cam.add(this.rig);
    }

    _nearestThreshold() {
        const env = this.environment;
        const p = this.engine.camera.position;
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

    /**
     * [ROLE] How hard the compass should be pulled in this frame, 0 (clear) to 1 (fully tucked).
     * [WHY] The rig is a child of the camera inside the main scene, so at 0.62 out it is a real
     * world object and anything within arm's length intersects it. Rather than lift it into a
     * separate render pass -- which would take the hand out of world lighting, and this game
     * spends most of its runtime in the dark with a flashlight -- the arm simply gets out of the
     * way. Pulling it in is also the more honest read: you tuck a compass against your chest to
     * fit through a gap, you do not push it through the wall.
     * [HOW] One ray from the eye along the direction the rig actually sits, against the same
     * spatialGrid and AABB.rayIntersectsBox the peek-lean already uses. Cheap: at REACH the query
     * spans one or two 4-unit grid cells.
     */
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

        /**
         * [WHY] The tuck drives the stow pose rather than a retract pose of its own. Two reasons.
         * A second pose would be a second retracted envelope to verify against every wall in the
         * game, where the stow pose is already shipping and already known not to clip -- it is
         * what the compass does every time you press M. And it gives the player one vocabulary
         * instead of two: the compass lowers, for whatever reason it is lowering.
         * [WHY ASYMMETRIC] 14 in, 6 out. Getting out of a wall is urgent and a fast pull reads as
         * the player protecting the instrument; easing back out is what stops a compass held
         * alongside a corridor wall from strobing on every small step toward and away from it.
         */
        const proximity = this._proximityTuck(cam);
        this._tuck += (proximity - this._tuck) * Math.min(1, dt * (proximity > this._tuck ? 14.0 : 6.0));
        const shown = this.stow * (1 - this._tuck);

        if (shown < 0.002) {
            if (this.stow < 0.002) this.stow = 0;
            this.rig.visible = false;
            /** [WHY] Keep tracking the camera while stowed. Skipping this would let the look
             *  reference go stale for as long as the compass is down, and the first frame after
             *  raising it would read every degree turned in the meantime as one frame of
             *  rotation. The rate clamp would cap the damage at a full-scale flick, but a
             *  full-scale flick is still the wrong thing to play when you press M standing still. */
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

        /**
         * [WHY] The rig is a child of the camera, so the head bob moves the hand and the eye as
         * one welded object and produces exactly zero relative motion -- the reason a compass
         * held at arm's length read as painted on the screen. Everything below is the hand
         * refusing to track the head perfectly: it lags the bob, swings on the step, trails the
         * turn, and pushes back under acceleration. All four are scaled by `gait` or by a rate
         * that goes to zero when you stand still, so a stationary player gets a stationary hand.
         */
        const phase = this.player.headBobPhase || 0;
        const gait = this.player.gait || 0;

        /** [WHY] x on sin(p), y on sin(2p) is a figure eight -- the arm crosses the body once per
         *  stride but rises and falls twice, once per footfall. A single sine on both axes would
         *  draw a diagonal line and read as a slide rather than a swing. */
        const swingX = Math.sin(phase) * 0.020 * gait;
        const swingY = Math.sin(phase * 2.0) * 0.013 * gait;
        const swingRoll = Math.sin(phase) * 0.055 * gait;
        const swingPitch = Math.sin(phase * 2.0 + 0.6) * 0.030 * gait;

        /** [WHY] Counter-bob. The camera has already displaced by bobOffset this frame and the rig
         *  inherited all of it; giving back a third in local space leaves the hand travelling
         *  two thirds as far as the eye, which is what makes it look connected to a shoulder
         *  rather than to the skull. Full cancellation looks worse -- the hand hangs dead still
         *  in a bobbing world and reads as a bug. */
        const counterBob = -(this.player.bobOffset || 0) * 0.34;

        /** [WHY] Look trail. Nothing anywhere read camera rotation, and mouse look is the most
         *  frequent motion in the game, so this is the bulk of what felt stationary. Rates are
         *  clamped because a fast flick can move the camera a fifth of a radian inside one frame
         *  and an unclamped rate would fling the arm off screen. */
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
        /** [WHY] `Math.min(1, speed / 30.0)` was the same units error as the sway constants: sized
         *  for `currentSpeed` (30 = a crouch walk, so the term was authored to sit clamped at 1.0
         *  from a normal walk upward) but fed `velocity`, which peaks at 7.34 on a chased sprint.
         *  It resolved to 0.098, running the needle at a tenth of its authored 0.004 rad -- a
         *  3.9e-4 rad wobble on a 0.079 dial, well under a pixel. Reusing the smoothed `gait`
         *  restores the intent and costs nothing: it is already the clamped, eased speed ratio,
         *  and it correctly gives a crawl less jostle than a walk rather than treating every
         *  crouch-and-above the same. */
        const jostle = Math.sin(this.engine.time * 11.0) * 0.004 * gait;
        this.angVel += (diff * stiffness - this.angVel * damping) * dt;
        this.angle += (this.angVel + jostle) * dt;
        this.needle.rotation.z = this.angle;

        /**
         * [WHY] Velocity lag was reading world-space `velocity.x`, so the hand swung according to
         * which way north was rather than which way the player was moving: strafing east and
         * strafing north produced opposite sway from identical footwork. Projecting onto the
         * camera's own right and forward axes makes the lag mean what it was always trying to
         * mean -- the hand falls behind the body it is attached to.
         * [WHY THE CONSTANTS MOVED 25x] The old factors were sized for `currentSpeed` (60 at a
         * walk) but multiplied against `velocity`, which the exp(-25 * delta) damping in
         * PlayerController holds near 2.9. `-velocity.x * 0.0006` came out to 0.0018 units on a
         * full-speed strafe, at a rig sitting 0.62 from the eye -- comfortably under one pixel.
         * The sway was not subtle, it was absent. The `Math.min(speed, 60)` clamp below was
         * likewise unreachable: peak speed in the game is 7.34, on a chased sprint.
         */
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

        /**
         * [WHY] Swing and counter-bob are added after the smoothers, not through them. Velocity
         * lag is the only noisy input here and the only one that wants filtering; the lissajous
         * is already an analytic sine and the counter-bob has to stay exactly in phase with the
         * camera's bob or it cancels against the wrong part of the step. Running these through
         * the same one-pole filter cost both: the filter's corner sits near 1.75Hz against a
         * 3.41Hz running stride, so a run came out swinging 19.9mm against a walk's 36.0mm --
         * the arm going quiet exactly when the body is working hardest.
         */
        this.rig.position.set(
            this.basePos.x + this._swayX + swingX + this._trailYaw * 0.008 - pullLeft,
            this.basePos.y + this._swayY + swingY + counterBob - this._trailPitch * 0.008 - drop,
            this.basePos.z + this._swayZ + pullIn
        );
    }
}
