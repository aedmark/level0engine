/**
 * [ROLE] Giant mechanical claw entity in the Atrium.
 * [WHY] Punishes players who linger or move too slowly inside store aisles.
 * [STATE] Stateful. Manages claw mesh, descent animation, and tracking timers.
 * [DEPENDS] three.js (implicit), environment data, Math utils.
 */
import Vec3 from '../math/Vec3.js';
import {isRayPathBlocked} from './HazardUtils.js';

export default class ClawEntity {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.env = environment;
        this.isActive = false;
        
        this.state = 'IDLE'; // IDLE, WARNING, DROP, SNAP
        this.idleTimer = 0;
        this.warningTimer = 0;
        this.dropTimer = 0;
        this.snapTimer = 0;
        
        this.group = new THREE.Group();
        this.prongs = [];
        this._buildMesh();
        
        this.lastPlayerPos = new Vec3();
        this._rayTarget = new Vec3();
    }

    _buildMesh() {
        const metalMat = new THREE.MeshStandardMaterial({color: 0x555555, roughness: 0.5, metalness: 0.8});
        const darkMetalMat = new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.7, metalness: 0.9});
        
        // Base housing
        this.housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), metalMat);
        this.group.add(this.housing);
        
        // Piston/arm extending upwards
        this.piston = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 10.0, 8), darkMetalMat);
        this.piston.position.y = 5.2; // Extends upwards from housing
        this.group.add(this.piston);
        
        // Prongs
        const prongGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
        prongGeo.translate(0, -0.6, 0); // Origin at top hinge
        
        for (let i = 0; i < 4; i++) {
            const pivot = new THREE.Group();
            pivot.rotation.y = (Math.PI / 2) * i;
            
            const prong = new THREE.Mesh(prongGeo, metalMat);
            prong.position.set(0.35, -0.1, 0);
            prong.rotation.z = -Math.PI / 8; // Open angle
            
            // Lower curve of prong
            const tipGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
            tipGeo.translate(0, -0.3, 0);
            const tip = new THREE.Mesh(tipGeo, metalMat);
            tip.position.set(0, -1.2, 0);
            tip.rotation.z = Math.PI / 4;
            prong.add(tip);
            
            pivot.add(prong);
            this.group.add(pivot);
            this.prongs.push({ pivot, prong, openRot: -Math.PI / 8, closedRot: Math.PI / 8 });
        }
        
        // Warning light (spotlight shining down)
        this.warningLight = new THREE.SpotLight(0xff0000, 0, 15.0, Math.PI / 4, 0.5, 1);
        this.warningLight.position.set(0, -0.2, 0);
        this.warningLightTarget = new THREE.Object3D();
        this.warningLightTarget.position.set(0, -10, 0);
        this.warningLight.target = this.warningLightTarget;
        this.group.add(this.warningLightTarget);
        this.group.add(this.warningLight);
        
        this.group.visible = false;
        this.scene.add(this.group);
    }

    deactivate() {
        this.isActive = false;
        this.group.visible = false;
        this.warningLight.intensity = 0;
    }

    reset(x, y, z) {
        this.isActive = true;
        this.state = 'IDLE';
        this.idleTimer = 0;
        this.group.visible = false;
        this.warningLight.intensity = 0;
        this.lastPlayerPos.copy(this.camera.position);
    }

    update(delta, time, activeSector) {
        if (!this.isActive || activeSector !== 'ATRIUM') return null;
        
        const playerPos = this.camera.position;
        
        if (this.state === 'IDLE') {
            const distMoved = Math.sqrt(this.lastPlayerPos.distanceToSquared(playerPos));
            const speed = distMoved / delta;
            this.lastPlayerPos.copy(playerPos);
            
            // Player is slow or still
            if (speed < 1.5 && !this.player.isGodMode) {
                // Check if in aisle
                if (this.env && this.env.aisleCells && this.env.cellSize) {
                    const cx = Math.floor(playerPos.x / this.env.cellSize);
                    const cz = Math.floor(playerPos.z / this.env.cellSize);
                    if (this.env.aisleCells.has(`${cx},${cz}`)) {
                        
                        // Raycast up to ensure no shelf cover
                        const upDir = new Vec3(0, 1, 0);
                        const playerHead = new Vec3(playerPos.x, 1.5, playerPos.z);
                        // Cast a ray 3 units upwards to check for shelves
                        const isCovered = isRayPathBlocked(
                            this.env, playerHead.x, playerHead.z, 2.0,
                            playerHead, upDir, 9.0, this._rayTarget
                        );
                        
                        if (!isCovered) {
                            this.idleTimer += delta;
                            // Wait 5 seconds before dropping
                            if (this.idleTimer > 5.0) {
                                this.state = 'WARNING';
                                this.warningTimer = 0;
                                this.group.position.set(playerPos.x, playerPos.y + 12.0, playerPos.z);
                                this.group.visible = true;
                                this.warningLight.intensity = 2.0;
                                
                                // Reset prongs to open
                                for (let i = 0; i < this.prongs.length; i++) {
                                    this.prongs[i].prong.rotation.z = this.prongs[i].openRot;
                                }
                            }
                        } else {
                            // Recover safely if they take cover
                            this.idleTimer = Math.max(0, this.idleTimer - delta * 2);
                        }
                    } else {
                        // Recover if they leave aisle
                        this.idleTimer = Math.max(0, this.idleTimer - delta * 2);
                    }
                }
            } else {
                // Recover if moving quickly
                this.idleTimer = Math.max(0, this.idleTimer - delta * 2);
            }
        } else if (this.state === 'WARNING') {
            this.warningTimer += delta;
            this.group.position.set(playerPos.x, playerPos.y + 12.0, playerPos.z); // Track player briefly
            
            // Pulse warning light rapidly on the floor
            this.warningLight.intensity = 3.0 + Math.sin(time * 30.0) * 2.0;
            
            if (this.warningTimer > 1.2) {
                this.state = 'DROP';
                this.dropTimer = 0;
                this.warningLight.intensity = 0;
                // Snap to player's final position for drop
                this.dropTargetY = playerPos.y + 1.6; // Hover slightly above ground
            }
        } else if (this.state === 'DROP') {
            this.dropTimer += delta;
            const dropDuration = 0.25; // extremely fast drop
            const t = Math.min(1.0, this.dropTimer / dropDuration);
            // Ease in
            const ease = t * t * t;
            
            this.group.position.y = (playerPos.y + 12.0) - ((playerPos.y + 12.0) - this.dropTargetY) * ease;
            
            if (t >= 1.0) {
                this.state = 'SNAP';
                this.snapTimer = 0;
            }
        } else if (this.state === 'SNAP') {
            this.snapTimer += delta;
            const snapDuration = 0.15;
            const t = Math.min(1.0, this.snapTimer / snapDuration);
            
            for (let i = 0; i < this.prongs.length; i++) {
                const p = this.prongs[i];
                p.prong.rotation.z = p.openRot + (p.closedRot - p.openRot) * t;
            }
            
            if (t >= 1.0) {
                // Determine if player escaped during the drop/snap phase
                const distToPlayerSq = this.group.position.distanceToSquared(playerPos);
                if (distToPlayerSq < 4.0 && !this.player.isGodMode) {
                    return {consumed: true};
                } else {
                    // Missed! Retract
                    this.state = 'IDLE';
                    this.idleTimer = 0;
                    this.group.visible = false;
                }
            }
        }
        
        return null;
    }
}
