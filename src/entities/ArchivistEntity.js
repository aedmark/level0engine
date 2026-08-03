import Vec3 from '../math/Vec3.js';

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
        this._away = new Vec3();
        this._toEntity = new Vec3();
        this._lookDir = new Vec3();
        this._buildMesh();
    }

    _buildMesh() {
        const coreMat = new THREE.MeshBasicMaterial({color: 0xfff2d6, transparent: true, opacity: 0.95});
        const coreGeo = new THREE.IcosahedronGeometry(0.14, 1);
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.core.position.y = 1.2;
        this.group.add(this.core);
        const wingMat = new THREE.MeshBasicMaterial({
            color: 0xaa55ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const wingGeo = new THREE.PlaneGeometry(0.6, 0.92);
        this.wingL = new THREE.Mesh(wingGeo, wingMat);
        this.wingL.position.set(-0.1, 1.24, 0);
        this.wingL.rotation.y = Math.PI / 2.4;
        this.group.add(this.wingL);
        this.wingR = new THREE.Mesh(wingGeo, wingMat);
        this.wingR.position.set(0.1, 1.24, 0);
        this.wingR.rotation.y = -Math.PI / 2.4;
        this.group.add(this.wingR);
        this.motes = [];
        const moteMat = new THREE.MeshBasicMaterial({
            color: 0xffe9b0,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const moteGeo = new THREE.IcosahedronGeometry(0.035, 0);
        for (let i = 0; i < 5; i++) {
            const mote = new THREE.Mesh(moteGeo, moteMat);
            mote.userData = {
                radius: 0.22 + Math.random() * 0.3,
                speed: 1.5 + Math.random() * 2.5,
                offsetY: 1.2 + (Math.random() - 0.5) * 0.4,
                phase: Math.random() * Math.PI * 2
            };
            this.motes.push(mote);
            this.group.add(mote);
        }
        this.light = new THREE.PointLight(0xc9a6ff, 1.1, 6.0);
        this.light.position.y = 1.2;
        this.group.add(this.light);
        this.scene.add(this.group);
    }

    _setBodyVisible(visible) {
        this.core.visible = visible;
        this.wingL.visible = visible;
        this.wingR.visible = visible;
        for (const mote of this.motes) mote.visible = visible;
    }

    deactivate() {
        this.isActive = false;
        this._setBodyVisible(false);
        this.light.intensity = 0;
    }

    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 10.0;
        this.fleeTimer = 0;
        this.hideTimer = 0;
        this.droppedDoc = false;
        this._curiousRetargetCooldown = 0;
        this._bounds = this.env && this.env.getSectorBounds ? this.env.getSectorBounds('ARCHIVE') : null;
        const clamped = this._clampToBounds(x, z);
        this.group.position.set(clamped.x, y, clamped.z);
        this.target.copy(this.group.position);
        this._setBodyVisible(true);
        this.light.intensity = 1.1;
        this.observeTimer = 0;
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
        if (this.hideTimer > 0) {
            this.hideTimer -= delta;
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
                this._setBodyVisible(true);
                this.light.intensity = 1.1;
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
        if (this.fleeTimer > 0) {
            this.fleeTimer -= delta;
            const away = this._away.subVectors(this.group.position, playerPos);
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
                this._setBodyVisible(false);
                this.light.intensity = 0;
            }
            return null;
        }
        if (distSq < 100.0 && this.player.isRunning) {
            this.fleeTimer = 0.6;
            document.dispatchEvent(new CustomEvent('somatic-lost', {
                detail: {
                    distSq: distSq,
                    intensity: 1.0,
                    isLaugh: false
                }
            }));
            return null;
        }
        this._animate(time);
        let isObserved = false;
        if (this.player.flashlightActive && distSq < 400.0) {
            const toEntity = this._toEntity.subVectors(this.group.position, playerPos).normalize();
            const lookDir = this._lookDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (lookDir.dot(toEntity) > 0.85) {
                isObserved = true;
            }
        }
        if (isObserved) {
            this.observeTimer = (this.observeTimer || 0) + delta;
            this.core.scale.setScalar(1.0 - Math.min(0.8, this.observeTimer * 0.4));
            this.light.intensity = 1.1 - Math.min(0.8, this.observeTimer * 0.4);
            if (this.observeTimer > 2.0 && !this.droppedDoc) {
                this.dropDocument();
                this.fleeTimer = 0.6;
                this.observeTimer = 0;
                document.dispatchEvent(new CustomEvent('somatic-item', {detail: {distSq: distSq, intensity: 1.5}}));
                return null;
            }
        } else {
            this.observeTimer = Math.max(0, (this.observeTimer || 0) - delta);
            this.core.scale.setScalar(1.0);
            this.light.intensity = 1.1;
        }
        if (!isObserved) {
            const ARCHIVIST_CURIOUS_NEAR = 6.0;
            const ARCHIVIST_CURIOUS_FAR = 13.0;
            this._curiousRetargetCooldown = (this._curiousRetargetCooldown || 0) - delta;
            if (this._curiousRetargetCooldown <= 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = ARCHIVIST_CURIOUS_NEAR + Math.random() * (ARCHIVIST_CURIOUS_FAR - ARCHIVIST_CURIOUS_NEAR);
                const clampedTarget = this._clampToBounds(
                    playerPos.x + Math.cos(angle) * dist,
                    playerPos.z + Math.sin(angle) * dist
                );
                this.target.x = clampedTarget.x;
                this.target.z = clampedTarget.z;
                this._curiousRetargetCooldown = 2.0 + Math.random() * 2.5;
            }
            this.group.position.lerp(this.target, 0.01);
            const clampedPos = this._clampToBounds(this.group.position.x, this.group.position.z);
            this.group.position.x = clampedPos.x;
            this.group.position.z = clampedPos.z;
        }
        return null;
    }

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
        this.core.rotation.y = time * 1.2;
        const flap = Math.sin(time * 16.0) * 0.55 + Math.sin(time * 23.0) * 0.15;
        this.wingL.rotation.z = flap;
        this.wingR.rotation.z = -flap;
        for (const mote of this.motes) {
            const {radius, speed, offsetY, phase} = mote.userData;
            const a = time * speed + phase;
            mote.position.set(Math.cos(a) * radius, offsetY + Math.sin(a * 1.7) * 0.06, Math.sin(a) * radius);
        }
        this.group.position.y = Math.sin(time * 3.2) * 0.08 + Math.sin(time * 7.3) * 0.03;
        this.group.rotation.y = Math.sin(time * 1.1) * 0.4;
    }
}