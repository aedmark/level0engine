import {buildHeldHand, computeProximityTuck, computeGaitSwing, updateTrailTracking, updateSway} from './HeldItemRig.js';

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

    _buildHand() {
        const {hand, forearm} = buildHeldHand({
            palmX: 0.004,
            fingers: [
                {x: -0.030, len: [0.040, 0.030, 0.022], curl: [1.2, 1.3, 1.1], r: 0.0125, y: 0.055},
                {x: 0.002, len: [0.044, 0.033, 0.024], curl: [1.25, 1.3, 1.15], r: 0.0130, y: 0.057},
                {x: 0.033, len: [0.041, 0.031, 0.022], curl: [1.25, 1.35, 1.15], r: 0.0122, y: 0.055},
                {x: 0.061, len: [0.033, 0.025, 0.019], curl: [1.3, 1.4, 1.2], r: 0.0108, y: 0.049}
            ],
            thumb: {
                len: [0.048, 0.032], curl: [0.8, 0.62], r: 0.0155,
                position: new THREE.Vector3(-0.086, -0.010, -0.024),
                rotation: new THREE.Euler(0.35, 0.18, -1.0)
            },
            forearmPosition: new THREE.Vector3(0.0083, -0.0724, -0.0660),
            forearmRotation: new THREE.Euler(-0.30, 0, 0.10)
        });
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

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 16), metal);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);

        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.06, 16), metal);
        head.position.z = -0.13;
        head.rotation.x = Math.PI / 2;
        this.group.add(head);

        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 16), rubber);
        grip.rotation.x = Math.PI / 2;
        grip.position.z = 0.02;
        this.group.add(grip);

        this.rig = new THREE.Group();
        this.rig.add(this.group);
        const hand = this._buildHand();
        hand.rotation.set(Math.PI / 6, -Math.PI / 2, 0);
        hand.position.set(-0.025, -0.05, 0.05);
        this.rig.add(hand);

        this.rig.position.set(0.35, -0.35, -0.45);
        this.rig.rotation.set(0, 0.15, 0.05);
        this.basePos = this.rig.position.clone();
        this.baseRot = this.rig.rotation.clone();
        this.rig.visible = false;
        
        if (cam) cam.add(this.rig);
    }

    _proximityTuck(cam) {
        return computeProximityTuck(this, cam, 0.60);
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
            
            if (this.environment.flashlight && isRaised) {
                const spot = this.environment.flashlight;
                spot.position.set(0, 0, 0);
                spot.target.position.set(0, 0, -10.0);
                spot.target.updateMatrixWorld();
            }

            return;
        }
        this.rig.visible = true;
        const eased = shown * shown * (3 - 2 * shown);
        const drop = (1 - eased) * 0.46;
        const roll = (1 - eased) * 0.85;

        const {swingX, swingY, swingRoll, swingPitch} = computeGaitSwing(this.player);

        const counterBob = -(this.player.bobOffset || 0) * 0.34;

        updateTrailTracking(this, cam, dt);

        this.rig.rotation.set(
            this.baseRot.x - roll * 0.55 + swingPitch - this._trailPitch * 0.013,
            this.baseRot.y - roll * 0.30 - this._trailYaw * 0.030,
            this.baseRot.z + roll + swingRoll - this._trailYaw * 0.022
        );

        updateSway(this, cam, dt);
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
            const localHead = new THREE.Vector3(0, 0, -0.15);
            const localTarget = new THREE.Vector3(0, 0, -10.0);

            localHead.applyMatrix4(this.rig.matrix);
            localTarget.applyMatrix4(this.rig.matrix);

            if (this._tuck > 0) {
                localHead.lerp(new THREE.Vector3(0.15, -0.2, -0.1), this._tuck);
                localTarget.lerp(new THREE.Vector3(0.15, -0.2, -10.0), this._tuck);
            }

            spot.position.copy(localHead);
            spot.target.position.copy(localTarget);
            spot.target.updateMatrixWorld();
        }
    }
}
