function clamp(val, max) {
    return Math.max(-max, Math.min(max, val));
}

export default class PaintballGun {
    constructor(engine, environment, player) {
        this.engine = engine;
        this.environment = environment;
        this.player = player;

        this.raised = false;
        this.recoil = 0;

        this.basePos = new THREE.Vector3(0.18, -0.35, -0.4);
        this.baseRot = new THREE.Euler(0, 0, 0);

        this._swayX = 0;
        this._swayY = 0;
        this._swayZ = 0;

        this._tuck = 0;
        this._probeVec = new THREE.Vector3();

        this._trailPitch = 0;
        this._trailYaw = 0;
        
        this._prevYaw = 0;
        this._prevPitch = 0;
        
        this._build();

        document.addEventListener('somatic-toggle-gun', () => {
            if (this.player.input && this.player.input.state.isReading) return;
            this.raised = !this.raised;
            document.dispatchEvent(new Event('somatic-inventory-woosh'));
            if (this.raised && this.player.input) {
                if (this.player.input.state.flashlightActive) {
                    this.player.input.state.flashlightActive = false;
                    document.dispatchEvent(new CustomEvent('somatic-flashlight', {detail: {on: false}}));
                }
                document.dispatchEvent(new CustomEvent('somatic-stow-compass'));
            }
        });

        document.addEventListener('somatic-stow-gun', () => {
            if (this.raised) {
                this.raised = false;
                document.dispatchEvent(new Event('somatic-inventory-woosh'));
            }
        });

        document.addEventListener('somatic-shoot', () => {
            if (this.raised && this.recoil < 0.1) {
                this.recoil = 1.0;
                
                document.dispatchEvent(new CustomEvent('somatic-paint-pew', {
                    detail: {distSq: 0, intensity: 0.8}
                }));
                
                if (window.paintballSystem) {
                    this.group.updateMatrixWorld();
                    
                    const localTip = new THREE.Vector3(0, 0.05, -0.2);
                    localTip.applyMatrix4(this.group.matrixWorld);
                    
                    const direction = new THREE.Vector3(0, 0, -1);
                    direction.applyMatrix4(this.engine.camera.matrixWorld).sub(this.engine.camera.position).normalize();
                    
                    window.paintballSystem.shoot(localTip, direction);
                }
            }
        });
    }

    _skinTexture() {
        if (this._skinTexCache) return this._skinTexCache;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#9c6f5a';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#7a5241';
        for (let i = 0; i < 400; i++) {
            const x = Math.random() * 256, y = Math.random() * 256;
            const r = Math.random() * 4 + 1;
            ctx.globalAlpha = Math.random() * 0.15;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        this._skinTexCache = tex;
        return tex;
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

    _build() {
        const cam = this.engine.camera;

        this.group = new THREE.Group();
        const gunGroup = new THREE.Group();
        
        const darkMetal = new THREE.MeshStandardMaterial({
            color: 0x1f1f1f, roughness: 0.8, metalness: 0.1
        });
        const slideMetal = new THREE.MeshStandardMaterial({
            color: 0x999d9f, roughness: 0.4, metalness: 0.4
        });
        const gripMat = new THREE.MeshStandardMaterial({
            color: 0x121212, roughness: 0.9, metalness: 0.0
        });
        const sightRed = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5, roughness: 0.2
        });

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.022, 0.14), darkMetal);
        frame.position.set(0, 0.016, -0.035);
        gunGroup.add(frame);

        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.036, 0.15), slideMetal);
        slide.position.set(0, 0.045, -0.04);
        gunGroup.add(slide);

        const ejectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.03), darkMetal);
        ejectionPort.position.set(0.016, 0.048, -0.03);
        gunGroup.add(ejectionPort);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 16), darkMetal);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.045, -0.13);
        gunGroup.add(barrel);


        const gripBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.11, 0.045), gripMat);
        gripBase.rotation.x = -Math.PI * 0.12;
        gripBase.position.set(0, -0.04, 0.015);
        gunGroup.add(gripBase);

        const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.10, 0.038), gripMat);
        leftPanel.rotation.x = -Math.PI * 0.12;
        leftPanel.position.set(-0.014, -0.04, 0.015);
        gunGroup.add(leftPanel);
        
        const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.10, 0.038), gripMat);
        rightPanel.rotation.x = -Math.PI * 0.12;
        rightPanel.position.set(0.014, -0.04, 0.015);
        gunGroup.add(rightPanel);

        const underBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 16), darkMetal);
        underBarrel.rotation.x = Math.PI / 2;
        underBarrel.position.set(0, 0.028, -0.11);
        gunGroup.add(underBarrel);

        const guardBottom = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.003, 0.030), darkMetal);
        guardBottom.position.set(0, -0.015, -0.035);
        gunGroup.add(guardBottom);
        
        const guardFront = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.025, 0.003), darkMetal);
        guardFront.position.set(0, -0.002, -0.0485);
        gunGroup.add(guardFront);

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.015, 0.008), slideMetal);
        trigger.position.set(0, 0.005, -0.025);
        gunGroup.add(trigger);

        const slideBackInset = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.005), darkMetal);
        slideBackInset.position.set(0, 0.045, 0.036);
        gunGroup.add(slideBackInset);

        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.01), darkMetal);
        hammer.rotation.x = -Math.PI / 6;
        hammer.position.set(0, 0.04, 0.038);
        gunGroup.add(hammer);

        const frontSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.01), darkMetal);
        frontSightBase.position.set(0, 0.065, -0.11);
        gunGroup.add(frontSightBase);
        
        const frontSightDot = new THREE.Mesh(new THREE.BoxGeometry(0.0042, 0.003, 0.002), sightRed);
        frontSightDot.position.set(0, 0.066, -0.104);
        gunGroup.add(frontSightDot);
        
        const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.008), darkMetal);
        rearSightBase.position.set(0, 0.064, 0.030);
        gunGroup.add(rearSightBase);

        const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, 0.004), darkMetal);
        rearSightL.position.set(-0.005, 0.066, 0.030);
        gunGroup.add(rearSightL);
        
        const rearSightR = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, 0.004), darkMetal);
        rearSightR.position.set(0.005, 0.066, 0.030);
        gunGroup.add(rearSightR);

        const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.003, 0.002), sightRed);
        rearDotL.position.set(-0.005, 0.067, 0.028);
        gunGroup.add(rearDotL);
        
        const rearDotR = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.003, 0.002), sightRed);
        rearDotR.position.set(0.005, 0.067, 0.028);
        gunGroup.add(rearDotR);

        gunGroup.scale.set(1.5, 1.5, 1.5);
        this.group.add(gunGroup);

        this.rig = new THREE.Group();
        this.rig.add(this.group);

        if (cam) cam.add(this.rig);

        this.targetRaise = 0;
        this.currentRaise = 0;
    }

    update(dt) {
        this.targetRaise = this.raised ? 1 : 0;
        const diff = this.targetRaise - this.currentRaise;
        this.currentRaise += diff * Math.min(1, dt * 6.0);

        this.recoil = Math.max(0, this.recoil - dt * 5.0);

        const cam = this.engine.camera;
        const proximity = this._proximityTuck(cam);
        this._tuck += (proximity - this._tuck) * Math.min(1, dt * (proximity > this._tuck ? 14.0 : 6.0));
        
        let shown = this.currentRaise * (1 - this._tuck);
        
        if (shown < 0.002) {
            this.rig.visible = false;
            this._prevYaw = cam.rotation.y;
            this._prevPitch = cam.rotation.x;
            this._trailYaw = 0;
            this._trailPitch = 0;
            return;
        }
        this.rig.visible = true;

        const eased = 1.0 - Math.pow(1.0 - shown, 3);
        const drop = (1 - eased) * 0.46;
        const roll = (1 - eased) * 0.85;
        const pullIn = (1 - eased) * 0.2;
        
        const phase = (this.player.headBobPhase || 0) * 0.35;
        const gait = this.player.gait || 0;

        const swingX = Math.sin(phase) * 0.020 * gait;
        const swingY = Math.sin(phase * 2.0) * 0.013 * gait;
        const swingRoll = Math.sin(phase) * 0.055 * gait;
        const swingPitch = Math.sin(phase * 2.0 + 0.6) * 0.030 * gait;

        const pitch = cam.rotation.x;
        const counterBob = Math.sin(phase * 2.0) * 0.015 * gait;

        const limit = 0.8;
        const p = Math.max(-limit, Math.min(limit, pitch));
        let pullLeft = p * 0.05;

        const recoilPitch = this.recoil * 0.3;
        const recoilZ = this.recoil * 0.05;

        this.rig.rotation.set(
            this.baseRot.x - roll * 0.55 + swingPitch - this._trailPitch * 0.013 + recoilPitch,
            this.baseRot.y - roll * 0.30 - this._trailYaw * 0.030,
            this.baseRot.z + roll + swingRoll - this._trailYaw * 0.022
        );

        this.rig.position.set(
            this.basePos.x + this._swayX + swingX + this._trailYaw * 0.008 - pullLeft,
            this.basePos.y + this._swayY + swingY + counterBob - this._trailPitch * 0.008 - drop,
            this.basePos.z + this._swayZ + pullIn + recoilZ
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

        if (this._prevYaw === undefined) this._prevYaw = cam.rotation.y;
        if (this._prevPitch === undefined) this._prevPitch = cam.rotation.x;

        let dYaw = cam.rotation.y - this._prevYaw;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        const dPitch = cam.rotation.x - this._prevPitch;
        
        this._prevYaw = cam.rotation.y;
        this._prevPitch = cam.rotation.x;
        
        const invDt = 1 / Math.max(dt, 1e-4);
        const yawRate = clamp(dYaw * invDt, 6.0);
        const pitchRate = clamp(dPitch * invDt, 6.0);
        const follow = Math.min(1, dt * 9.0);
        
        this._trailYaw += (yawRate - this._trailYaw) * follow;
        this._trailPitch += (pitchRate - this._trailPitch) * follow;
    }
}
