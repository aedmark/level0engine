import {computeAxisBlocking, isRayPathBlocked, resolveEntityLocomotion} from './HazardUtils.js';
import {LEGACY_LIGHT_COMPENSATION} from '../world/Sectors.js';

export default class WardenEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        this.group = new THREE.Group();
        this.target = new THREE.Vector3();
        this.graceTimer = 0;
        this.stepTimer = 0;
        this._dir = new THREE.Vector3();
        this._toPlayer = new THREE.Vector3();
        this._nextPos = new THREE.Vector3();
        this._box = new THREE.Box3();
        this._boxX = new THREE.Box3();
        this._boxZ = new THREE.Box3();
        this._locomotionScratch = {
            dir: new THREE.Vector3(),
            moveVec: new THREE.Vector3(),
            nextPos: new THREE.Vector3(),
            box: this._box,
            boxX: this._boxX,
            boxZ: this._boxZ
        };
        this._locomotionOptions = {
            doorRadiusSq: 16.0,
            boxRadius: 0.8,
            stuckStrategy: 'jitter',
            stuckTimeLimit: 0.0,
            teleportDist: 0.0
        };
        this._min = new THREE.Vector3();
        this._max = new THREE.Vector3();
        this._rayTarget = new THREE.Vector3();
        this._buildMesh();
    }

    _buildMesh() {
        const mat = new THREE.MeshStandardMaterial({color: 0x14161a, roughness: 0.55, metalness: 0.35});
        this.base = new THREE.Group();
        this.group.add(this.base);

        const skirtGeo = new THREE.CylinderGeometry(0.3, 0.62, 0.5, 12);
        const skirt = new THREE.Mesh(skirtGeo, mat);
        skirt.position.y = 0.55;
        skirt.castShadow = true;
        this.base.add(skirt);

        this.hoverGlowMat = new THREE.MeshBasicMaterial({color: 0xdadada, transparent: true, opacity: 0.6});
        const glowRingGeo = new THREE.TorusGeometry(0.55, 0.045, 8, 20);
        this.glowRing = new THREE.Mesh(glowRingGeo, this.hoverGlowMat);
        this.glowRing.rotation.x = Math.PI / 2;
        this.glowRing.position.y = 0.3;
        this.base.add(this.glowRing);

        const nodeGeo = new THREE.SphereGeometry(0.07, 8, 8);
        this.hoverNodes = [];
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const node = new THREE.Mesh(nodeGeo, this.hoverGlowMat);
            node.position.set(Math.cos(angle) * 0.5, 0.28, Math.sin(angle) * 0.5);
            this.base.add(node);
            this.hoverNodes.push(node);
        }

        this.upperBody = new THREE.Group();
        this.group.add(this.upperBody);
        const torsoGeo = new THREE.CylinderGeometry(0.58, 0.32, 1.4, 8);
        this.torso = new THREE.Mesh(torsoGeo, mat);
        this.torso.position.y = 2.3;
        this.torso.castShadow = true;
        this.upperBody.add(this.torso);
        const shoulderGeo = new THREE.BoxGeometry(0.26, 0.26, 0.5);
        for (const side of [-1, 1]) {
            const shoulder = new THREE.Mesh(shoulderGeo, mat);
            shoulder.position.set(side * 0.58, 2.85, 0);
            shoulder.castShadow = true;
            this.upperBody.add(shoulder);
        }
        const upperArmGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 6);
        const forearmGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.55, 6);
        const handGeo = new THREE.BoxGeometry(0.16, 0.18, 0.14);
        this.arms = [];
        for (const side of [-1, 1]) {
            const shoulderPivot = new THREE.Group();
            shoulderPivot.position.set(side * 0.58, 2.85, 0);
            shoulderPivot.rotation.z = side * 0.12;
            this.upperBody.add(shoulderPivot);

            const upperArm = new THREE.Mesh(upperArmGeo, mat);
            upperArm.position.y = -0.3;
            upperArm.castShadow = true;
            shoulderPivot.add(upperArm);

            const elbowPivot = new THREE.Group();
            elbowPivot.position.y = -0.6;
            elbowPivot.rotation.x = 0.15;
            shoulderPivot.add(elbowPivot);

            const forearm = new THREE.Mesh(forearmGeo, mat);
            forearm.position.y = -0.275;
            forearm.castShadow = true;
            elbowPivot.add(forearm);

            const hand = new THREE.Mesh(handGeo, mat);
            hand.position.y = -0.64;
            hand.castShadow = true;
            elbowPivot.add(hand);

            this.arms.push({shoulderPivot, elbowPivot, side});
        }
        const headGeo = new THREE.BoxGeometry(0.4, 0.38, 0.4);
        this.head = new THREE.Mesh(headGeo, mat);
        this.head.position.y = 3.3;
        this.head.castShadow = true;
        this.upperBody.add(this.head);
        this.core = this.head;
        this.eyeMat = new THREE.MeshBasicMaterial({color: 0xdadada, transparent: true, opacity: 0.55});
        const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(eyeGeo, this.eyeMat);
            eye.position.set(side * 0.11, 3.32, 0.2);
            this.upperBody.add(eye);
        }
        this.light = new THREE.SpotLight(0xffffff, 2.0, 30.0, Math.PI / 6, 0.3, 1.0);
        this.light.position.set(0, 3.6, 0);
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 256;
        this.light.shadow.mapSize.height = 256;
        this.light.shadow.autoUpdate = false;
        this.lightTarget = new THREE.Object3D();
        this.lightTarget.position.set(0, 0, 1);
        this.group.add(this.lightTarget);
        this.light.target = this.lightTarget;
        this.group.add(this.light);
        this.scene.add(this.group);
    }

    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 2.0;
        this.stepTimer = 0;
        this._lastLOSTime = 0;
        this._lastLOSResult = false;
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('IMPOUND') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this.base.visible = true;
        this.upperBody.visible = true;
        this.light.intensity = 2.0 * LEGACY_LIGHT_COMPENSATION;
        this.light.shadow.autoUpdate = true;
        this.light.color.setHex(0xffffff);
        if (this.eyeMat) {
            this.eyeMat.color.setHex(0xdadada);
            this.eyeMat.opacity = 0.55;
        }
        if (this.hoverGlowMat) {
            this.hoverGlowMat.color.setHex(0xdadada);
        }
    }

    deactivate() {
        this.isActive = false;
        this.base.visible = false;
        this.upperBody.visible = false;
        this.light.intensity = 0;
        this.light.shadow.autoUpdate = false;
    }

    _clampToBounds(x, z) {
        if (!this._bounds) return {x, z};
        const margin = 1.5;
        return {
            x: Math.max(this._bounds.minX + margin, Math.min(this._bounds.maxX - margin, x)),
            z: Math.max(this._bounds.minZ + margin, Math.min(this._bounds.maxZ - margin, z))
        };
    }

    update(delta, time) {
        if (!this.isActive) {
            return null;
        }
        if (this.graceTimer > 0) {
            this.graceTimer -= delta;
            this._animate(time);
            return null;
        }
        const playerPos = this.camera.position;
        const distSq = this.group.position.distanceToSquared(playerPos);
        if (distSq > 6400.0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 40.0 + (Math.random() * 10.0);
            this.reset(
                playerPos.x + Math.cos(spawnAngle) * spawnDist,
                0,
                playerPos.z + Math.sin(spawnAngle) * spawnDist
            );
            return null;
        }
        if (distSq < 1.0 && !this.player.isGodMode) {
            this.player.stamina = this.player.maxStamina;
            this.player.exhaustion = 0.0;
            return {consumed: true};
        }
        this._animate(time);
        this.stepTimer += delta;
        if (this.stepTimer > 2.5) {
            this.stepTimer = 0;
            document.dispatchEvent(new CustomEvent('somatic-step', {detail: {distSq: distSq, intensity: 2.0}}));
        }
        const speed = this._updateSenses(playerPos, distSq, delta, time);
        this._resolveLocomotion(speed, delta);
        return null;
    }

    _updateSenses(playerPos, distSq, delta, time) {
        if (this._lastLOSTime === undefined) this._lastLOSTime = 0;
        let hasLOS = this._lastLOSResult || false;
        if (distSq < 900.0) {
            if (time - this._lastLOSTime > 0.1) {
                if (!this._lightWorldPos) this._lightWorldPos = new THREE.Vector3();
                this._lightWorldPos.copy(this.light.position).add(this.group.position);
                const toPlayerDir = this._toPlayer.subVectors(playerPos, this._lightWorldPos).normalize();
                const searchDist = Math.sqrt(distSq);
                hasLOS = !isRayPathBlocked(
                    this.env, this.group.position.x, this.group.position.z, searchDist,
                    this.group.position, toPlayerDir, distSq, this._rayTarget
                );
                this._lastLOSResult = hasLOS;
                this._lastLOSTime = time;
            }
        } else {
            hasLOS = false;
            this._lastLOSResult = false;
        }
        let isSpotted = false;
        if (hasLOS) {
            if (!this._spotDir) this._spotDir = new THREE.Vector3();
            if (!this._targetWorldPos) this._targetWorldPos = new THREE.Vector3();
            if (!this._lightWorldPos2) this._lightWorldPos2 = new THREE.Vector3();
            this.lightTarget.getWorldPosition(this._targetWorldPos);
            this.light.getWorldPosition(this._lightWorldPos2);
            const spotDir = this._spotDir.subVectors(this._targetWorldPos, this._lightWorldPos2).normalize();
            const toPlayer = this._toPlayer.subVectors(playerPos, this._lightWorldPos2).normalize();
            if (spotDir.dot(toPlayer) > 0.866) {
                isSpotted = true;
            }
        }
        if (isSpotted) {
            this.light.color.setHex(0xff0000);
            this.light.intensity = 4.0 * LEGACY_LIGHT_COMPENSATION;
            if (this.eyeMat) {
                this.eyeMat.color.setHex(0xff0000);
                this.eyeMat.opacity = 1.0;
            }
            if (this.hoverGlowMat) this.hoverGlowMat.color.setHex(0xff0000);
            this.player.stamina = 0.0;
            this.player.exhaustion = Math.min(this.player.exhaustion + delta * 2.0, 1.0);
            this.player.coherence = Math.max(0.0, this.player.coherence - (delta * 0.02));
            this.target.copy(playerPos);
        } else {
            this.light.color.setHex(0xffffff);
            this.light.intensity = 2.0 * LEGACY_LIGHT_COMPENSATION;
            if (this.eyeMat) {
                this.eyeMat.color.setHex(0xdadada);
                this.eyeMat.opacity = 0.55;
            }
            if (this.hoverGlowMat) this.hoverGlowMat.color.setHex(0xdadada);
            if (Math.random() < 0.02) {
                this.target.x = playerPos.x + (Math.random() - 0.5) * 15.0;
                this.target.z = playerPos.z + (Math.random() - 0.5) * 15.0;
            }
            if (Math.random() < 0.05) {
                this.target.x += (Math.random() - 0.5) * 5.0;
                this.target.z += (Math.random() - 0.5) * 5.0;
            }
        }
        return isSpotted ? 1.8 : 1.2;
    }

    _resolveLocomotion(speed, delta) {
        resolveEntityLocomotion(this, speed, delta, this._locomotionOptions, this._locomotionScratch);
        const clamped = this._clampToBounds(this.group.position.x, this.group.position.z);
        this.group.position.x = clamped.x;
        this.group.position.z = clamped.z;
    }

    _animate(time) {
        const yaw = Math.sin(time * 0.8) * (Math.PI / 3);
        const SWEEP_RADIUS = 10.0;
        this.lightTarget.position.set(Math.sin(yaw) * SWEEP_RADIUS, 0, Math.cos(yaw) * SWEEP_RADIUS);
        this.group.position.y = Math.sin(time * 4.0) * 0.08;
        if (this.upperBody) this.upperBody.rotation.y = yaw * 0.6;
        if (this.arms) {
            const swing = Math.sin(time * 3.2) * 0.18;
            for (const arm of this.arms) {
                arm.shoulderPivot.rotation.x = swing * arm.side;
            }
        }
        if (this.base) {
            this.base.rotation.x = Math.sin(time * 2.1) * 0.03;
            this.base.rotation.z = Math.sin(time * 1.7 + 1.3) * 0.03;
        }
        if (this.hoverGlowMat) {
            this.hoverGlowMat.opacity = 0.5 + Math.sin(time * 5.0) * 0.2;
        }
    }
}