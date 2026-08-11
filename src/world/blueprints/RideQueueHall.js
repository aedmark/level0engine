/**
 * [ROLE] Generates a corridor cell lined with thin pillars and a floating header, evoking a switchback queue lane.
 * [WHY] Adds spatial variety to straight corridor stretches with an aesthetic distinct from plain walls.
 * [STATE] Stateless; returns a configuration object with a build function. `prob: 0` means it's only placed by explicit reference, not random rolls.
 * [DEPENDS] Depends on env properties and context functions like addGeometry, buildWall, and isWall.
 */
export const RideQueueHallProfile = (env, ctx) => {
    const { addGeometry, buildWall, isWall } = ctx;
    return {
        name: "RIDE_QUEUE_HALL",
        prob: 0,
        build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            
            const pathZ = !isWall(x, z+1) || !isWall(x, z-1);
            const pathX = !isWall(x+1, z) || !isWall(x-1, z);

            const pillarThickness = 1.0;
            const alcoveDepth = 0.8;
            
            const verticalClearance = 2.2; 
            
            if (pathZ && !pathX) {
                const w1 = buildWall(pillarThickness, env.cellSize, env.sharedWallMat, verticalClearance, 0);
                w1.position.set(cx - (env.cellSize/2) + (pillarThickness/2), verticalClearance/2, cz);
                w1.userData.isEntityBlocker = true;
                addGeometry(w1);

                const w2 = buildWall(pillarThickness, env.cellSize, env.sharedWallMat, verticalClearance, 0);
                w2.position.set(cx + (env.cellSize/2) - (pillarThickness/2), verticalClearance/2, cz);
                w2.userData.isEntityBlocker = true;
                addGeometry(w2);

                const top1 = buildWall(pillarThickness, env.cellSize, env.sharedWallMat);
                top1.position.set(cx - (env.cellSize/2) + (pillarThickness/2), 2.6, cz);
                addGeometry(top1);
                
                const top2 = buildWall(pillarThickness, env.cellSize, env.sharedWallMat);
                top2.position.set(cx + (env.cellSize/2) - (pillarThickness/2), 2.6, cz);
                addGeometry(top2);
                
            } else if (pathX && !pathZ) {
                const w1 = buildWall(env.cellSize, pillarThickness, env.sharedWallMat, verticalClearance, 0);
                w1.position.set(cx, verticalClearance/2, cz - (env.cellSize/2) + (pillarThickness/2));
                w1.userData.isEntityBlocker = true;
                addGeometry(w1);

                const w2 = buildWall(env.cellSize, pillarThickness, env.sharedWallMat, verticalClearance, 0);
                w2.position.set(cx, verticalClearance/2, cz + (env.cellSize/2) - (pillarThickness/2));
                w2.userData.isEntityBlocker = true;
                addGeometry(w2);
                
                const top1 = buildWall(env.cellSize, pillarThickness, env.sharedWallMat);
                top1.position.set(cx, 2.6, cz - (env.cellSize/2) + (pillarThickness/2));
                addGeometry(top1);
                
                const top2 = buildWall(env.cellSize, pillarThickness, env.sharedWallMat);
                top2.position.set(cx, 2.6, cz + (env.cellSize/2) - (pillarThickness/2));
                addGeometry(top2);
            } else {
                const p = buildWall(1.2, 1.2, env.sharedWallMat);
                p.position.set(cx, 1.5, cz);
                p.userData.isEntityBlocker = true;
                addGeometry(p);
            }

            const sGeo = env._cacheGeo('stanchion', () => new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8));
            const stanchion = new THREE.Mesh(sGeo, env.metalMat || env.pittedMetalMat);
            stanchion.position.set(cx, 0.5, cz);
            addGeometry(stanchion);

            if (!env.ropeMat) {
                env.ropeMat = new THREE.MeshStandardMaterial({color: 0x660000, roughness: 0.9, metalness: 0.1});
                env.sharedAssets.add(env.ropeMat.uuid);
            }

            const halfRopeGeo = env._cacheGeo('ropeHalf', () => {
                const curve = new THREE.QuadraticBezierCurve3(
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, -0.3, env.cellSize / 4),
                    new THREE.Vector3(0, 0, env.cellSize / 2)
                );
                return new THREE.TubeGeometry(curve, 6, 0.015, 5, false);
            });

            if (pathZ && !pathX) {
                const rope1 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                rope1.position.set(cx, 0.9, cz);
                addGeometry(rope1);
                
                const rope2 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                rope2.position.set(cx, 0.9, cz);
                rope2.rotation.y = Math.PI;
                addGeometry(rope2);
            } else if (pathX && !pathZ) {
                const rope1 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                rope1.position.set(cx, 0.9, cz);
                rope1.rotation.y = Math.PI / 2;
                addGeometry(rope1);
                
                const rope2 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                rope2.position.set(cx, 0.9, cz);
                rope2.rotation.y = -Math.PI / 2;
                addGeometry(rope2);
            }
        }
    };
};
