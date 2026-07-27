// StructureKit.js
// LEVEL 0 STRUCTURAL BUILD TOOLKIT

/**
 * A utility class providing common geometry-building helpers passed via `ctx` to all sectors.
 * 
 * This class is vital for performance. Notice the `cacheGeo` and `buildWall`
 * functions. Instead of creating a new `THREE.BoxGeometry` for every wall in the maze (which 
 * would destroy memory and crash the browser), we hash the dimensions (`w_h_d_yOffset`) and 
 * re-use the exact same geometry reference. This allows Three.js to render thousands of walls 
 * with minimal overhead.
 */
export default class StructureKit {
    constructor(env) {
        this.env = env;
    }

    cacheGeo(key, make) {
        const env = this.env;
        let geo = env.geoCache.get(key);
        if (!geo) {
            geo = make();
            env.geoCache.set(key, geo);
            env.geoCache.set(geo.uuid, true);
        }
        return geo;
    }

    boxGeo(w, h, d) {
        return this.cacheGeo(`B:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
    }

    planeGeo(w, h) {
        return this.cacheGeo(`P:${w}:${h}`, () => new THREE.PlaneGeometry(w, h));
    }

    createChunkHelpers(hash, chunkGroup, stagingMeshes, random) {
        const env = this.env;
        let hasOasis = random() > 0.95;
        const helpers = {
            random,
            runSalt32: env._runSalt32 || 0,
            hash,
            chunkGroup,
            stagingMeshes,
            playerPos: env.camera.position,
            claimOasis: () => {
                if (hasOasis) {
                    hasOasis = false;
                    return true;
                }
                return false;
            },
            getLightMaterial: (colorHex, emissiveHex, isBroken = false) => {
                if (!env._lightMatPool) env._lightMatPool = new Map();
                const key = `${colorHex}_${emissiveHex}_${isBroken}`;
                if (!env._lightMatPool.has(key)) {
                    const mat = (isBroken ? env.baseBrokenLightMat : env.baseLightMat).clone();
                    mat.color.setHex(colorHex);
                    mat.emissive.setHex(emissiveHex);
                    env.sharedAssets.add(mat.uuid);
                    env._lightMatPool.set(key, mat);
                }
                return env._lightMatPool.get(key);
            },
            buildWall: (w, d, mat, h = 3.0, yOffset = 0) => {
                w = Math.round(w * 20) / 20;
                d = Math.round(d * 20) / 20;
                h = Math.round(h * 20) / 20;
                yOffset = Math.round(yOffset * 20) / 20;
                const key = `${w}_${h}_${d}_${yOffset}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    geo = new THREE.BoxGeometry(w + 0.02, h, d + 0.02);
                    const uv = geo.attributes.uv;
                    for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (d / env.cellSize));
                    for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (w / env.cellSize));
                    if (h !== 3.0 || yOffset > 0) {
                        const vStart = yOffset / 3.0;
                        const vRange = h / 3.0;
                        for (let i = 0; i < 8; i++) uv.setY(i, vStart + uv.getY(i) * vRange);
                        for (let i = 16; i < 24; i++) uv.setY(i, vStart + uv.getY(i) * vRange);
                    }
                    if (h !== 3.0 && yOffset === 0) {
                        for (let i = 8; i < 16; i++) uv.setY(i, uv.getY(i) * (h / 3.0));
                    }
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return new THREE.Mesh(geo, mat);
            },
            addGeometry: (mesh, isWarp = false) => {
                mesh.userData.chunkHash = hash;
                mesh.updateMatrixWorld(true);
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
                box.chunkHash = hash;
                if (mesh.userData.isEntityBlocker) box.isEntityBlocker = true;
                if (isWarp) box.isWarpZone = true;
                env.spatialGrid.insert(box);
                stagingMeshes.push(mesh);
            },
            addFurniture: (group) => {
                if (Math.abs(group.position.x) < 4.0 && Math.abs(group.position.z) < 4.0) return;
                group.userData.chunkHash = hash;
                group.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(group);
                const localBoxes = env.spatialGrid.getNearby(group.position.x, group.position.z, 2.0);
                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].intersectsBox(box)) return;
                }
                box.chunkHash = hash;
                env.spatialGrid.insert(box);
                group.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.chunkHash = hash;
                        child.updateMatrixWorld(true);
                        stagingMeshes.push(child);
                    }
                });
            },
            addObserver: (px, pz) => {
                const obs = new THREE.Mesh(env.observerGeo, env.observerMat.clone());
                obs.position.set(px, 0.95, pz);
                obs.userData = {chunkHash: hash, active: true, fade: 0.85};
                chunkGroup.add(obs);
                env.observers.push(obs);
            },
            addGrate: (px, py, pz, blocksX) => {
                const localBoxes = env.spatialGrid.getNearby(px, pz, 1.0);
                for (let i = 0; i < localBoxes.length; i++) {
                    const b = localBoxes[i];
                    if (b.isGrate) {
                        const dist = Math.abs(b.meshRef.position.x - px) + Math.abs(b.meshRef.position.z - pz);
                        if (dist < 0.1) {
                            if (b.meshRef.parent) {
                                b.meshRef.parent.remove(b.meshRef);
                            }
                            env.interactables = env.interactables.filter(item => item !== b.meshRef);
                            b.isGrate = false;
                            return;
                        }
                    }
                }
                const grateGeo = this.boxGeo(blocksX ? 0.05 : 1.16, 0.65, blocksX ? 1.16 : 0.05);
                const grate = new THREE.Mesh(grateGeo, env.wallVentMat);
                grate.position.set(px, py, pz);
                grate.userData = {type: 'grate', active: true, chunkHash: hash, blocksX: blocksX};
                chunkGroup.add(grate);
                env.interactables.push(grate);
                const grateBox = new THREE.Box3().setFromObject(grate);
                grateBox.chunkHash = hash;
                grateBox.isGrate = true;
                grateBox.meshRef = grate;
                grate.userData.box = grateBox;
                env.spatialGrid.insert(grateBox);
            },
            buildChair: (x, y, z, rotY) => {
                const group = new THREE.Group();
                const seat = new THREE.Mesh(env.cushionGeo, env.fabricMat);
                seat.position.set(0, 0.4, 0);
                group.add(seat);
                const back = new THREE.Mesh(env.backrestGeo, env.fabricMat);
                back.position.set(0, 0.8, -0.3);
                group.add(back);
                const l1 = new THREE.Mesh(env.legGeo, env.structMat);
                l1.position.set(0.3, 0.2, 0.3);
                group.add(l1);
                const l2 = new THREE.Mesh(env.legGeo, env.structMat);
                l2.position.set(-0.3, 0.2, 0.3);
                group.add(l2);
                const l3 = new THREE.Mesh(env.legGeo, env.structMat);
                l3.position.set(0.3, 0.2, -0.3);
                group.add(l3);
                const l4 = new THREE.Mesh(env.legGeo, env.structMat);
                l4.position.set(-0.3, 0.2, -0.3);
                group.add(l4);
                group.position.set(x, y, z);
                group.rotation.y = rotY;
                return group;
            },
            buildCouch: (x, y, z, rotY) => {
                const group = new THREE.Group();
                const seat = new THREE.Mesh(env.couchSeatGeo, env.fabricMat);
                seat.position.set(0, 0.35, 0.1);
                group.add(seat);
                const back = new THREE.Mesh(env.couchBackGeo, env.fabricMat);
                back.position.set(0, 0.7, -0.32);
                group.add(back);
                const armL = new THREE.Mesh(env.couchArmGeo, env.fabricMat);
                armL.position.set(-1.05, 0.55, 0.05);
                group.add(armL);
                const armR = new THREE.Mesh(env.couchArmGeo, env.fabricMat);
                armR.position.set(1.05, 0.55, 0.05);
                group.add(armR);
                const l1 = new THREE.Mesh(env.legGeo, env.structMat);
                l1.position.set(0.9, 0.15, 0.35);
                group.add(l1);
                const l2 = new THREE.Mesh(env.legGeo, env.structMat);
                l2.position.set(-0.9, 0.15, 0.35);
                group.add(l2);
                const l3 = new THREE.Mesh(env.legGeo, env.structMat);
                l3.position.set(0.9, 0.15, -0.35);
                group.add(l3);
                const l4 = new THREE.Mesh(env.legGeo, env.structMat);
                l4.position.set(-0.9, 0.15, -0.35);
                group.add(l4);
                group.position.set(x, y, z);
                group.rotation.y = rotY;
                return group;
            },
            buildTable: (x, y, z) => {
                const group = new THREE.Group();
                const top = new THREE.Mesh(env.tableTopGeo, env.woodMat);
                top.position.set(0, 0.8, 0);
                group.add(top);
                const base = new THREE.Mesh(env.tableBaseGeo, env.structMat);
                base.position.set(0, 0.4, 0);
                group.add(base);
                group.position.set(x, y, z);
                return group;
            },
            buildDesk: (x, y, z, rotY = 0) => {
                const group = new THREE.Group();
                const topGeo = env._cacheGeo('deskTop15', () => new THREE.BoxGeometry(2.4, 0.075, 1.2));
                const top = new THREE.Mesh(topGeo, env.woodMat);
                top.position.set(0, 1.125, 0);
                group.add(top);
                
                const pedGeo = env._cacheGeo('deskPed15', () => new THREE.BoxGeometry(0.6, 1.08, 1.14));
                
                const pedL = new THREE.Mesh(pedGeo, env.metalMat);
                pedL.position.set(-0.87, 0.54, 0);
                group.add(pedL);
                
                const pedR = new THREE.Mesh(pedGeo, env.metalMat);
                pedR.position.set(0.87, 0.54, 0);
                group.add(pedR);
                
                const modGeo = env._cacheGeo('deskMod15', () => new THREE.BoxGeometry(2.25, 0.75, 0.075));
                const modPanel = new THREE.Mesh(modGeo, env.metalMat);
                modPanel.position.set(0, 0.675, -0.525);
                group.add(modPanel);
                
                group.position.set(x, y, z);
                group.rotation.y = rotY;
                return group;
            },
            buildPerimeter: (x, z, localX, localZ, wallMat, sectorId, height = 3.0) => {
                const isPerimeter = localX === 0 || localX === env.chunkSize - 1 || localZ === 0 || localZ === env.chunkSize - 1;
                if (!isPerimeter) return false;
                if (sectorId && helpers.markOccupied) helpers.markOccupied(x, z);
                const edge = env.chunkSize - 1;
                const isDoorwayNS = (localZ === 0 || localZ === edge) && localX === 7;
                const isDoorwayEW = (localX === 0 || localX === edge) && localZ === 7;
                const isShoulderNS = (localZ === 0 || localZ === edge) && (localX === 6 || localX === 8);
                const isShoulderEW = (localX === 0 || localX === edge) && (localZ === 6 || localZ === 8);
                const isShoulder = isShoulderNS || isShoulderEW;
                if (isDoorwayNS || isDoorwayEW) {
                    const wMat = wallMat || env.sharedWallMat;
                    const aMat = env.metalMat || env.structMat; // Airlock texture
                    
                    const buildMat = (isNS) => {
                        return [
                            isNS ? aMat : (localX === edge ? env.sharedWallMat : wMat),
                            isNS ? aMat : (localX === 0 ? env.sharedWallMat : wMat),
                            wMat,
                            aMat, // always airlock texture on the ceiling of the pocket
                            !isNS ? aMat : (localZ === edge ? env.sharedWallMat : wMat),
                            !isNS ? aMat : (localZ === 0 ? env.sharedWallMat : wMat)
                        ];
                    };
                    
                    const jambW = 0.25;
                    const jambH = height + 2.0;
                    const keyJ = `jamb_${jambW}_${jambH}_${isDoorwayNS}`;
                    let jGeo = env.geoCache.get(keyJ);
                    if (!jGeo) {
                        jGeo = new THREE.BoxGeometry(isDoorwayNS ? jambW : env.cellSize, jambH, isDoorwayNS ? env.cellSize : jambW);
                        env.geoCache.set(keyJ, jGeo);
                        env.geoCache.set(jGeo.uuid, true);
                    }
                    
                    for (let s = -1; s <= 1; s += 2) {
                        const jMesh = new THREE.Mesh(jGeo, buildMat(isDoorwayNS));
                        const offset = 1.875 * s;
                        jMesh.position.set(cx + (isDoorwayNS ? offset : 0), height / 2, cz + (isDoorwayEW ? offset : 0));
                        jMesh.castShadow = jMesh.receiveShadow = true;
                        jMesh.userData.chunkHash = hash;
                        jMesh.updateMatrixWorld(true);
                        if (!jMesh.geometry.boundingBox) jMesh.geometry.computeBoundingBox();
                        const box = jMesh.geometry.boundingBox.clone().applyMatrix4(jMesh.matrixWorld);
                        box.chunkHash = hash;
                        box.isEntityBlocker = true;
                        env.spatialGrid.insert(box);
                        stagingMeshes.push(jMesh);
                    }
                    
                    const headerH = height - 2.4;
                    if (headerH > 0) {
                        const headY = 3.4 + headerH / 2;
                        const keyH = `header_${headerH}`;
                        let hGeo = env.geoCache.get(keyH);
                        if (!hGeo) {
                            hGeo = new THREE.BoxGeometry(env.cellSize, headerH, env.cellSize);
                            env.geoCache.set(keyH, hGeo);
                            env.geoCache.set(hGeo.uuid, true);
                        }
                        const hMesh = new THREE.Mesh(hGeo, buildMat(isDoorwayNS));
                        hMesh.position.set(cx, headY, cz);
                        hMesh.castShadow = hMesh.receiveShadow = true;
                        hMesh.userData.chunkHash = hash;
                        hMesh.updateMatrixWorld(true);
                        if (!hMesh.geometry.boundingBox) hMesh.geometry.computeBoundingBox();
                        const box = hMesh.geometry.boundingBox.clone().applyMatrix4(hMesh.matrixWorld);
                        box.chunkHash = hash;
                        box.isEntityBlocker = true;
                        env.spatialGrid.insert(box);
                        stagingMeshes.push(hMesh);
                    }
                    return true;
                }
                const wMat = wallMat || env.sharedWallMat;
                const w = env.cellSize + 0.02;
                const d = env.cellSize + 0.02;
                const cx = x * env.cellSize;
                const cz = z * env.cellSize;
                const wallHeight = isShoulder ? height : height + 2.0;
                const multiMat = [
                    localX === edge ? env.sharedWallMat : wMat, // +X
                    localX === 0 ? env.sharedWallMat : wMat,    // -X
                    wMat,                                       // +Y
                    wMat,                                       // -Y
                    localZ === edge ? env.sharedWallMat : wMat, // +Z
                    localZ === 0 ? env.sharedWallMat : wMat     // -Z
                ];
                const pushWallSegment = (segW, segH, segD, segCx, segCz) => {
                    const key = `perim_${segW}_${segH}_${segD}`;
                    let geo = env.geoCache.get(key);
                    if (!geo) {
                        geo = new THREE.BoxGeometry(segW, segH, segD);
                        // The wallpaper/wall textures are tuned assuming a full-size cell (w x d).
                        // A narrower segment (e.g. the shoulder's near/far split) still gets the
                        // default 0..1 UV range from BoxGeometry, which squeezes that same full
                        // texture into less physical space -- the "scrunched" look on the narrow
                        // piece next to the doorway. Scale the UVs down to match how much of the
                        // reference cell this segment actually covers, so texture density (and
                        // the pattern's scale) stays consistent across differently-sized segments.
                        const uv = geo.attributes.uv;
                        for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (segD / d));
                        for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (segW / w));
                        env.geoCache.set(key, geo);
                        env.geoCache.set(geo.uuid, true);
                    }
                    const wall = new THREE.Mesh(geo, multiMat);
                    wall.position.set(segCx, segH / 2, segCz);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    wall.userData.chunkHash = hash;
                    wall.updateMatrixWorld(true);
                    if (!wall.geometry.boundingBox) wall.geometry.computeBoundingBox();
                    const box = wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
                    box.chunkHash = hash;
                    box.isEntityBlocker = true;
                    env.spatialGrid.insert(box);
                    stagingMeshes.push(wall);
                };
                if (!isShoulder) {
                    pushWallSegment(w, wallHeight, d, cx, cz);
                } else {
                    // These shoulder cells still need to read as solid perimeter wall (flush with
                    // every neighboring full-block cell) -- they're only split in two along the
                    // width so the pieces closest to the doorway can be swapped for a recessed
                    // pocket later without touching the outer piece. Both pieces must keep the
                    // *full* cell depth/width on their thickness axis; previously that axis used a
                    // fixed 0.4 "SHOULDER_THICKNESS" instead, which left the wall only 0.4 units
                    // deep in the middle of a 4-unit cell -- a gap on both the corridor-facing and
                    // outward-facing sides that exposed the floor and the backside of the airlock
                    // structure through the missing wall mass.
                    const NEAR_WIDTH = 0.8;
                    const FAR_WIDTH = (isShoulderNS ? w : d) - NEAR_WIDTH;
                    if (isShoulderNS) {
                        const doorSign = Math.sign(7 - localX) || 1;
                        const nearCx = cx + doorSign * (w / 2 - NEAR_WIDTH / 2);
                        const farCx = cx - doorSign * (w / 2 - FAR_WIDTH / 2);
                        pushWallSegment(NEAR_WIDTH, wallHeight, d, nearCx, cz);
                        pushWallSegment(FAR_WIDTH, wallHeight, d, farCx, cz);
                    } else {
                        const doorSign = Math.sign(7 - localZ) || 1;
                        const nearCz = cz + doorSign * (d / 2 - NEAR_WIDTH / 2);
                        const farCz = cz - doorSign * (d / 2 - FAR_WIDTH / 2);
                        pushWallSegment(w, wallHeight, NEAR_WIDTH, cx, nearCz);
                        pushWallSegment(w, wallHeight, FAR_WIDTH, cx, farCz);
                    }
                }
                return true;
            }
        };
        return helpers;
    }
}
