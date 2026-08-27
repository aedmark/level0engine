export const RideQueueHallProfile = (env, ctx) => {
    const { addGeometry, buildWall } = ctx;
    // ctx.isWall isn't assigned until the per-cell build loop runs, which happens after this
    // factory does (see WideHeaderGap.js for the bug this pattern already caused once) - several
    // closures below (isStraightQueueZ/isStraightQueueX) capture `isWall` at factory time, so a
    // plain destructure would freeze in `undefined`. Wrapping it keeps every downstream closure
    // reading ctx.isWall live.
    const isWall = (bx, bz) => ctx.isWall(bx, bz);
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
                delete top1.userData.baseboardFootprint;
                addGeometry(top1);
                
                const top2 = buildWall(pillarThickness, env.cellSize, env.sharedWallMat);
                top2.position.set(cx + (env.cellSize/2) - (pillarThickness/2), 2.6, cz);
                delete top2.userData.baseboardFootprint;
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
                delete top1.userData.baseboardFootprint;
                addGeometry(top1);
                
                const top2 = buildWall(env.cellSize, pillarThickness, env.sharedWallMat);
                top2.position.set(cx, 2.6, cz + (env.cellSize/2) - (pillarThickness/2));
                delete top2.userData.baseboardFootprint;
                addGeometry(top2);
            } else {
                const p = buildWall(1.2, 1.2, env.sharedWallMat);
                p.position.set(cx, 1.5, cz);
                p.userData.isEntityBlocker = true;
                addGeometry(p);
            }

            const sGeo = env._cacheGeo('stanchion', () => {
                const geo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
                geo.computeBoundingBox();
                geo.boundingBox.max.y = -0.2;
                return geo;
            });
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
                const geo = new THREE.TubeGeometry(curve, 6, 0.015, 5, false);
                geo.computeBoundingBox();
                geo.boundingBox.max.y = -0.6;
                geo.boundingBox.min.y = -0.9;
                return geo;
            });

            const isStraightQueueZ = (bx, bz) => {
                if (!ctx.getForcedStructure || ctx.getForcedStructure(bx, bz) !== 'RIDE_QUEUE_HALL') return false;
                const pZ = !isWall(bx, bz+1) || !isWall(bx, bz-1);
                const pX = !isWall(bx+1, bz) || !isWall(bx-1, bz);
                return pZ && !pX;
            };
            const isStraightQueueX = (bx, bz) => {
                if (!ctx.getForcedStructure || ctx.getForcedStructure(bx, bz) !== 'RIDE_QUEUE_HALL') return false;
                const pZ = !isWall(bx, bz+1) || !isWall(bx, bz-1);
                const pX = !isWall(bx+1, bz) || !isWall(bx-1, bz);
                return pX && !pZ;
            };

            if (pathZ && !pathX) {
                if (!isWall(x, z + 1)) {
                    const rope1 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                    rope1.position.set(cx, 0.9, cz);
                    addGeometry(rope1);
                    
                    const p1 = new THREE.Mesh(sGeo, env.metalMat || env.pittedMetalMat);
                    p1.position.set(cx, 0.5, cz + env.cellSize/2);
                    addGeometry(p1);
                }
                
                if (!isWall(x, z - 1)) {
                    const rope2 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                    rope2.position.set(cx, 0.9, cz);
                    rope2.rotation.y = Math.PI;
                    addGeometry(rope2);

                    if (!isStraightQueueZ(x, z - 1)) {
                        const p2 = new THREE.Mesh(sGeo, env.metalMat || env.pittedMetalMat);
                        p2.position.set(cx, 0.5, cz - env.cellSize/2);
                        addGeometry(p2);
                    }
                }
            } else if (pathX && !pathZ) {
                if (!isWall(x + 1, z)) {
                    const rope1 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                    rope1.position.set(cx, 0.9, cz);
                    rope1.rotation.y = Math.PI / 2;
                    addGeometry(rope1);
                    
                    const p1 = new THREE.Mesh(sGeo, env.metalMat || env.pittedMetalMat);
                    p1.position.set(cx + env.cellSize/2, 0.5, cz);
                    addGeometry(p1);
                }
                
                if (!isWall(x - 1, z)) {
                    const rope2 = new THREE.Mesh(halfRopeGeo, env.ropeMat);
                    rope2.position.set(cx, 0.9, cz);
                    rope2.rotation.y = -Math.PI / 2;
                    addGeometry(rope2);
                    
                    if (!isStraightQueueX(x - 1, z)) {
                        const p2 = new THREE.Mesh(sGeo, env.metalMat || env.pittedMetalMat);
                        p2.position.set(cx - env.cellSize/2, 0.5, cz);
                        addGeometry(p2);
                    }
                }
            }
        }
    };
};
