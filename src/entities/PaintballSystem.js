
export default class PaintballSystem {
    constructor(engine, environment) {
        this.engine = engine;
        this.environment = environment;
        this.paintballs = [];
        this.splatters = [];
        
        this.ballGroup = new THREE.Group();
        this.engine.scene.add(this.ballGroup);
        
        this.splatterGroup = new THREE.Group();
        this.engine.scene.add(this.splatterGroup);

        this.raycaster = new THREE.Raycaster();

        // Basic sphere geometry for paintball
        this.ballGeo = new THREE.SphereGeometry(0.04, 8, 8);
        
        // Base material, will clone for random colors
        this.ballMatTemplate = new THREE.MeshStandardMaterial({
            roughness: 0.2, metalness: 0.1,
            emissiveIntensity: 0.2
        });

        // Splatter geometry
        this.splatterGeo = new THREE.CircleGeometry(0.15, 16);
    }

    _getRandomColor() {
        const colors = [0xff0055, 0x00ff55, 0x0055ff, 0xffff00, 0xff00ff, 0x00ffff];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    shoot(origin, direction) {
        const color = this._getRandomColor();
        
        const mat = this.ballMatTemplate.clone();
        mat.color.setHex(color);
        mat.emissive.setHex(color);
        
        const mesh = new THREE.Mesh(this.ballGeo, mat);
        mesh.position.copy(origin);
        this.ballGroup.add(mesh);
        
        const speed = 40.0; // Fast projectile
        const velocity = direction.normalize().multiplyScalar(speed);
        
        this.paintballs.push({
            mesh: mesh,
            velocity: velocity,
            color: color,
            life: 2.0 // seconds until despawn if it flies into the void
        });
        
        // Play sound if acoustics available
        if (window.acoustics) {
            // A simple pop sound using generic synthesis or just trigger a known effect
            // If nothing fits perfectly, it will fail silently or we can ignore it.
            // window.acoustics.playAudio(origin, 'footstep', 0.5); // Fallback
        }
    }

    _createSplatter(point, normal, color) {
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.6,
            metalness: 0.1,
            polygonOffset: true,
            polygonOffsetFactor: -1, // Pull it slightly towards camera to avoid z-fighting
            polygonOffsetUnits: -1
        });
        
        const group = new THREE.Group();
        // Orient group along normal
        group.position.copy(point).add(normal.clone().multiplyScalar(0.001));
        const lookTarget = point.clone().add(normal);
        group.lookAt(lookTarget);
        
        // Random overall rotation
        group.rotateZ(Math.random() * Math.PI * 2);
        
        // Core irregular blob
        const coreCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < coreCount; i++) {
            const splat = new THREE.Mesh(this.splatterGeo, mat);
            const r = Math.random() * 0.05;
            const theta = Math.random() * Math.PI * 2;
            splat.position.set(r * Math.cos(theta), r * Math.sin(theta), 0);
            const scale = 0.5 + Math.random() * 0.8;
            splat.scale.set(scale, scale, 1);
            group.add(splat);
        }
        
        // Satellite drops
        const satCount = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < satCount; i++) {
            const splat = new THREE.Mesh(this.splatterGeo, mat);
            // Further out
            const r = 0.1 + Math.random() * 0.2;
            const theta = Math.random() * Math.PI * 2;
            splat.position.set(r * Math.cos(theta), r * Math.sin(theta), 0);
            const scale = 0.1 + Math.random() * 0.25;
            splat.scale.set(scale, scale, 1);
            group.add(splat);
        }
        
        this.splatterGroup.add(group);
        this.splatters.push({
            group: group,
            mat: mat,
            life: 10.0 // stays for 10 seconds
        });
    }

    update(delta) {
        // Update paintballs
        for (let i = this.paintballs.length - 1; i >= 0; i--) {
            const pb = this.paintballs[i];
            
            pb.life -= delta;
            if (pb.life <= 0) {
                this.ballGroup.remove(pb.mesh);
                this.paintballs.splice(i, 1);
                continue;
            }
            
            // Apply gravity
            pb.velocity.y -= 9.8 * delta * 0.5; // low gravity for fun
            
            const p_old = pb.mesh.position.clone();
            const p_new = p_old.clone().addScaledVector(pb.velocity, delta);
            
            // Raycast for collision
            const moveDist = p_old.distanceTo(p_new);
            const moveDir = pb.velocity.clone().normalize();
            
            this.raycaster.set(p_old, moveDir);
            let hitPoint = null;
            let hitNormal = null;
            
            // 1. Check walls
            if (this.environment.walls) {
                const intersects = this.raycaster.intersectObjects(this.environment.walls, false);
                if (intersects.length > 0 && intersects[0].distance <= moveDist) {
                    const hit = intersects[0];
                    hitPoint = hit.point;
                    hitNormal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
                    
                    if (hit.object && hit.object.isInstancedMesh && hit.instanceId !== undefined) {
                        const instanceMatrix = new THREE.Matrix4();
                        hit.object.getMatrixAt(hit.instanceId, instanceMatrix);
                        const normalMatrix = new THREE.Matrix3().getNormalMatrix(instanceMatrix);
                        hitNormal.applyMatrix3(normalMatrix).normalize();
                    } else if (hit.object) {
                        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                        hitNormal.applyMatrix3(normalMatrix).normalize();
                    }
                }
            }
            
            // 2. Check floor
            if (!hitPoint && p_new.y <= 0) {
                // Intersected floor (Y=0 plane)
                // y = y0 + vy * t => t = -y0 / vy
                const t = -p_old.y / pb.velocity.y;
                if (t >= 0 && t <= delta) {
                    hitPoint = p_old.clone().addScaledVector(pb.velocity, t);
                    hitNormal = new THREE.Vector3(0, 1, 0);
                }
            }
            
            // 3. Check ceiling
            if (!hitPoint && p_new.y >= 3.0) {
                const t = (3.0 - p_old.y) / pb.velocity.y;
                if (t >= 0 && t <= delta) {
                    hitPoint = p_old.clone().addScaledVector(pb.velocity, t);
                    hitNormal = new THREE.Vector3(0, -1, 0);
                }
            }
            
            if (hitPoint) {
                this._createSplatter(hitPoint, hitNormal, pb.color);
                
                const cam = this.engine.camera;
                const distSq = cam ? hitPoint.distanceToSquared(cam.position) : 0;
                document.dispatchEvent(new CustomEvent('somatic-paint-splat', {
                    detail: {distSq: distSq, intensity: 0.8}
                }));
                
                this.ballGroup.remove(pb.mesh);
                this.paintballs.splice(i, 1);
            } else {
                pb.mesh.position.copy(p_new);
            }
        }
        
        // Update splatters (fade out)
        for (let i = this.splatters.length - 1; i >= 0; i--) {
            const sp = this.splatters[i];
            sp.life -= delta;
            if (sp.life <= 0) {
                this.splatterGroup.remove(sp.group);
                this.splatters.splice(i, 1);
            } else if (sp.life < 2.0) {
                // Fade out
                sp.mat.transparent = true;
                sp.mat.opacity = sp.life / 2.0;
            }
        }
    }
}
