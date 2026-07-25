// ArchivistEntity.js
// Level 0 Engine: The Archivist

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
        this._buildMesh();
    }

    _buildMesh() {
        const mat = new THREE.MeshBasicMaterial({color: 0xaa55ff, transparent: true, opacity: 0.5, wireframe: true});
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 3.0, 8, 1, true);
        this.core = new THREE.Mesh(geo, mat);
        this.core.position.y = 1.5;
        this.group.add(this.core);
        const innerMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
        const innerGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
        this.inner = new THREE.Mesh(innerGeo, innerMat);
        this.inner.position.y = 1.5;
        this.group.add(this.inner);
        this.light = new THREE.PointLight(0xaa55ff, 1.5, 10.0);
        this.light.position.y = 1.5;
        this.group.add(this.light);
        this.scene.add(this.group);
    }

    reset(x, y, z) {
        this.isActive = true;
        this.graceTimer = 10.0;
        this.droppedDoc = false;
        this.group.position.set(x, y, z);
        this.target.copy(this.group.position);
        this.group.visible = true;
        this.observeTimer = 0;
    }

    update(delta, time) {
        if (!this.isActive) {
            this.group.visible = false;
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
        this._animate(time);
        if (distSq < 100.0 && this.player.isRunning) {
            this.isActive = false;
            document.dispatchEvent(new CustomEvent('somatic-lost', {
                detail: {
                    distSq: distSq,
                    intensity: 1.0,
                    isLaugh: false
                }
            }));
            return null;
        }
        let isObserved = false;
        if (this.player.flashlightActive && distSq < 400.0) {
            const toEntity = new Vec3().subVectors(this.group.position, playerPos).normalize();
            const lookDir = new Vec3().set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (lookDir.dot(toEntity) > 0.85) {
                isObserved = true;
            }
        }
        if (isObserved) {
            this.observeTimer = (this.observeTimer || 0) + delta;
            this.core.scale.setScalar(1.0 - Math.min(0.8, this.observeTimer * 0.4));
            this.light.intensity = 1.5 - Math.min(1.0, this.observeTimer * 0.5);
            if (this.observeTimer > 2.0 && !this.droppedDoc) {
                this.dropDocument();
                this.isActive = false;
                this.observeTimer = 0;
                document.dispatchEvent(new CustomEvent('somatic-item', {detail: {distSq: distSq, intensity: 1.5}}));
                return null;
            }
        } else {
            this.observeTimer = Math.max(0, (this.observeTimer || 0) - delta);
            this.core.scale.setScalar(1.0);
            this.light.intensity = 1.5;
        }
        if (!isObserved) {
            if (Math.random() < 0.02) {
                this.target.x = playerPos.x + (Math.random() - 0.5) * 40.0;
                this.target.z = playerPos.z + (Math.random() - 0.5) * 40.0;
            }
            this.group.position.lerp(this.target, 0.015);
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
        this.core.rotation.y = time;
        this.inner.rotation.y = -time * 2.0;
        this.inner.rotation.x = time * 0.5;
        const pulse = 1.0 + Math.sin(time * 5.0) * 0.1;
        this.inner.scale.setScalar(pulse);
        this.group.position.y = Math.sin(time * 2.0) * 0.2;
    }
}