/**
 * A handheld magnetic compass that points at the nearest sector threshold.
 *
 * The radar and this instrument are deliberately opposites. The radar knows exactly which breaker
 * it wants and refuses to say which way it is, reports a bare distance, and scrambles to `ERR!_m`
 * the moment the Anomaly leans on it. The compass knows nothing about objectives, cannot be
 * scrambled, and only ever answers one question: which way is the nearest way in.
 *
 * That division is the point. Losing the signal used to mean a random walk, because a shrinking
 * number gives you no vector to walk along. Now a lost signal means walking to a sector, which is
 * a fixed landmark you can always re-orient from, and picking the hunt back up from a known place.
 * The unreliable instrument stays unreliable; the honest one is honest about a different question.
 *
 * Built as held geometry parented to the camera rather than as a HUD overlay, so it inherits head
 * bob, lean, squeeze FOV and the post-processing stack for free, and so it is subject to the
 * darkness like everything else. Only the needle carries luminous paint.
 */
export default class Compass {
    /**
     * @param {Object} engine - RenderEngine, for the camera and scene.
     * @param {Object} environment - Environment, for the live `macroZones` registry.
     * @param {Object} player - PlayerController, for velocity sway and reading state.
     */
    constructor(engine, environment, player) {
        this.engine = engine;
        this.environment = environment;
        this.player = player;
        this.angle = 0;
        this.angVel = 0;
        this.hasFix = false;
        this._swayX = 0;
        this._swayY = 0;
        this._idlePhase = Math.random() * Math.PI * 2;
        this.raised = false;
        this.stow = 0;
        this._build();
        document.addEventListener('somatic-toggle-compass', () => {
            if (this.player.input && this.player.input.state.isReading) return;
            this.raised = !this.raised;
        });
    }

    /**
     * Skin. Mottled rather than flat, because a single albedo across a hand at arm's length reads
     * as a mannequin no matter how good the geometry underneath it is.
     *
     * @returns {THREE.CanvasTexture}
     * @private
     */
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

    /**
     * Builds one finger as a chain of nested joints.
     *
     * Each joint carries its own rotation and hangs the next joint off the far end of its segment,
     * so the curls compound the way knuckles do rather than each segment bending about the palm.
     * A sphere sits at every joint, which is most of what stops a finger reading as three
     * disconnected sticks.
     *
     * @param {number[]} lengths - Segment lengths, proximal to distal.
     * @param {number[]} curls - Per-joint bend in radians. Positive curls toward the viewer.
     * @param {number} rad - Segment radius at the base; tapers distally.
     * @param {THREE.Material} skin
     * @returns {THREE.Group}
     * @private
     */
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

    /**
     * The right hand cradling the case, plus wrist and sleeve.
     *
     * Laid out in the rig's own frame: +X right, +Y up the dial face, +Z toward the eye. The palm
     * is a slab sitting behind the case, four fingers rise off its far edge and curl forward over
     * the top rim, and the thumb comes up across the near-left edge. Fingertips land at roughly
     * y 0.088 against a case rim at 0.085, so they break the silhouette of the bezel without
     * covering the dial.
     *
     * The sleeve matters more than it sounds. A bare forearm running off the bottom of the frame
     * reads as a floating limb; a cuff terminates the arm at a garment and the eye accepts it.
     *
     * @private
     */
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

        const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.045, 0.075, 12), skin);
        wrist.position.set(0.012, -0.108, -0.055);
        wrist.rotation.set(-0.30, 0, 0.10);
        hand.add(wrist);
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.058, 0.055, 12), cuffMat);
        cuff.position.set(0.020, -0.156, -0.070);
        cuff.rotation.set(-0.30, 0, 0.10);
        hand.add(cuff);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.070, 0.26, 12), cuffMat);
        sleeve.position.set(0.038, -0.300, -0.106);
        sleeve.rotation.set(-0.30, 0, 0.10);
        hand.add(sleeve);

        return hand;
    }

    /**
     * Draws the dial face pixel by pixel, in keeping with the rest of the engine's textures.
     *
     * Aged cream rather than white, because a white dial in a corridor lit at ambient 0.65 is the
     * brightest thing on screen and pulls the eye off the world it is meant to help you read.
     *
     * @returns {THREE.CanvasTexture}
     * @private
     */
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

    /**
     * Assembles the instrument and parents it to the camera.
     * @private
     */
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

    /**
     * Nearest point on the nearest loaded sector's footprint.
     *
     * Reuses the same AABB clamp the exit-phase Annex routing already runs, which resolves to the
     * threshold you would actually walk through rather than the zone's centre — a bearing to the
     * middle of a sealed box would point you at a wall.
     *
     * @returns {{x: number, z: number}|null}
     * @private
     */
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
     * Ticks the needle and the sway.
     *
     * The needle is a damped spring rather than a lerp, so it overshoots a hard turn and settles,
     * which is what a real card does and what stops it reading as a HUD element that happens to be
     * drawn in perspective. With no sector loaded there is nothing to point at and it wanders.
     *
     * @param {number} delta - Frame time in seconds.
     */
    update(delta) {
        if (!this.rig) return;
        const dt = Math.min(delta, 0.05);
        const cam = this.engine.camera;
        const blocked = this.player.isDead ||
            (this.player.input && this.player.input.state.isReading);
        const wantStow = (this.raised && !blocked) ? 1 : 0;
        const rate = wantStow > this.stow ? 5.2 : 6.8;
        this.stow += (wantStow - this.stow) * Math.min(1, dt * rate);
        if (this.stow < 0.002) {
            this.stow = 0;
            this.rig.visible = false;
            return;
        }
        this.rig.visible = true;
        const eased = this.stow * this.stow * (3 - 2 * this.stow);
        const drop = (1 - eased) * 0.46;
        const roll = (1 - eased) * 0.85;
        this.rig.rotation.set(
            this.baseRot.x - roll * 0.55,
            this.baseRot.y - roll * 0.30,
            this.baseRot.z + roll
        );

        const target = this._nearestThreshold();
        this.hasFix = target !== null;
        let want;
        if (target) {
            const bearing = Math.atan2(target.x - cam.position.x, target.z - cam.position.z);
            want = bearing - cam.rotation.y - Math.PI;
        } else {
            this._idlePhase += dt * 0.35;
            want = this.angle + Math.sin(this._idlePhase) * 0.9;
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
        const jostle = Math.sin(this.engine.time * 11.0) * 0.004 * Math.min(1, speed / 30.0);
        this.angVel += (diff * stiffness - this.angVel * damping) * dt;
        this.angle += (this.angVel + jostle) * dt;
        this.needle.rotation.z = this.angle;

        const lagX = -(this.player.velocity.x * 0.0006);
        const lagY = -(Math.min(speed, 60) * 0.00035);
        this._swayX += (lagX - this._swayX) * Math.min(1, dt * 6.0);
        this._swayY += (lagY - this._swayY) * Math.min(1, dt * 5.0);
        this.rig.position.set(
            this.basePos.x + this._swayX + (1 - eased) * 0.10,
            this.basePos.y + this._swayY - drop,
            this.basePos.z
        );
    }
}
