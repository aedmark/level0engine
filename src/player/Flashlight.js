/**
 * [ROLE] Visual physical flashlight instrument for the player.
 * [WHY] Provides diegetic flashlight holding and dynamic beam swaying.
 * [STATE] Stateful, tracks orientation, physics swaying, and visual meshes.
 * [DEPENDS] Three.js (THREE), engine camera, player velocity, environment spot light.
 */

export default class Flashlight {
    constructor(engine, environment, player) {
        this.engine = engine;
        this.environment = environment;
        this.player = player;
        this._swayX = 0;
        this._swayY = 0;
        this._swayZ = 0;
        this._prevYaw = engine.camera ? engine.camera.rotation.y : 0;
        this._prevPitch = engine.camera ? engine.camera.rotation.x : 0;
        this._trailYaw = 0;
        this._trailPitch = 0;
        this._tuck = 0;
        this._probeVec = new THREE.Vector3();
        this.stow = 0;
        this._build();
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

        // Fingers curled around a flashlight body
        const FINGERS = [
            {x: -0.030, len: [0.040, 0.030, 0.022], curl: [1.2, 1.3, 1.1], r: 0.0125, y: 0.055},
            {x: 0.002, len: [0.044, 0.033, 0.024], curl: [1.25, 1.3, 1.15], r: 0.0130, y: 0.057},
            {x: 0.033, len: [0.041, 0.031, 0.022], curl: [1.25, 1.35, 1.15], r: 0.0122, y: 0.055},
            {x: 0.061, len: [0.033, 0.025, 0.019], curl: [1.3, 1.4, 1.2], r: 0.0108, y: 0.049}
        ];
        for (const f of FINGERS) {
            const finger = this._finger(f.len, f.curl, f.r, skin);
            finger.position.set(f.x, f.y, -0.040);
            finger.rotation.z = -f.x * 1.6;
            hand.add(finger);
        }

        // Thumb curled over the top/side
        const thumb = this._finger([0.048, 0.032], [0.8, 0.62], 0.0155, skin);
        thumb.position.set(-0.086, -0.010, -0.024);
        thumb.rotation.set(0.35, 0.18, -1.0);
        hand.add(thumb);

        const forearm = new THREE.Group();
        forearm.position.set(0.0083, -0.0724, -0.0660);
        forearm.rotation.set(-0.30, 0, 0.10);

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

    _build() {
        const cam = this.engine.camera;

        this.group = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({
            color: 0x333333, roughness: 0.6, metalness: 0.8,
            emissive: 0x050505, emissiveIntensity: 0.5
        });
        const rubber = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.9, metalness: 0.1
        });
        
        // Flashlight body
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 16), metal);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);

        // Flashlight head (flares out towards -Z)
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.06, 16), metal);
        head.position.z = -0.13;
        head.rotation.x = Math.PI / 2;
        this.group.add(head);

        // Rubber grip
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 16), rubber);
        grip.rotation.x = Math.PI / 2;
        grip.position.z = 0.02;
        this.group.add(grip);

        // The spotlight is updated in the update() loop to match the rig's matrix.

        this.rig = new THREE.Group();
        this.rig.add(this.group);
        const hand = this._buildHand();
        // Rotate hand to wrap fingers around the Z-axis cylinder
        hand.rotation.set(Math.PI / 6, -Math.PI / 2, 0); 
        hand.position.set(-0.025, -0.05, 0.05);
        this.rig.add(hand);
        
        // Positioned slightly off-center like the compass, but pointing mostly forward
        this.rig.position.set(0.35, -0.35, -0.45);
        this.rig.rotation.set(0, 0.15, 0.05); // Slight inward angle
        this.basePos = this.rig.position.clone();
        this.baseRot = this.rig.rotation.clone();
        this.rig.visible = false;
        
        if (cam) cam.add(this.rig);
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

        const REACH = 0.60; 
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
        
        const isRaised = this.player.flashlightActive && this.player.flashlightBattery > 0;
        
        const blocked = this.player.isDead ||
            (this.player.input && this.player.input.state.isReading);
        const wantStow = (isRaised && !blocked) ? 1 : 0;
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

        const speed = Math.sqrt(
            this.player.velocity.x * this.player.velocity.x +
            this.player.velocity.z * this.player.velocity.z
        );

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

        if (this.environment.flashlight) {
            this.rig.updateMatrix();
            const spot = this.environment.flashlight;
            // The flashlight head is around -0.15 on the Z axis of the rig's local space
            const localHead = new THREE.Vector3(0, 0, -0.15);
            // The target should be far ahead on the Z axis
            const localTarget = new THREE.Vector3(0, 0, -10.0);
            
            // Transform these points from the rig's local space to the camera's local space
            localHead.applyMatrix4(this.rig.matrix);
            localTarget.applyMatrix4(this.rig.matrix);

            // Set the spot light properties (which are attached to the camera)
            spot.position.copy(localHead);
            spot.target.position.copy(localTarget);
            spot.target.updateMatrixWorld();
        }
    }
}
