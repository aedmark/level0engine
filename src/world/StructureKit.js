/**
 * [ROLE] Provides a utility toolkit for procedural generation scripts, offering common functions for geometry, caching, and building parts.
 * [WHY] Reduces duplication in procedural generation algorithms by wrapping caching logic and common boilerplate.
 * [STATE] Class instance wraps the `env` object. Helper methods mutate the environment (spatial grid, staging meshes, etc.).
 * [DEPENDS] Requires `THREE` globally and an active environment object `env`.
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
        let hasOasis = random() > 0.75;
        const helpers = {
            random,
            runSalt32: env._runSalt32 || 0,
            hash,
            chunkGroup,
            stagingMeshes,
            playerPos: env.camera.position,
            claimOasis: (x, z) => {
                if (hasOasis) {
                    if (x !== undefined && z !== undefined) {
                        const localZ = ((z % env.chunkSize) + env.chunkSize) % env.chunkSize;
                        if (localZ === env.chunkSize - 1) return false;
                        if (helpers.markOccupied) helpers.markOccupied(x, z + 1);
                    }
                    hasOasis = false;
                    return true;
                }
                return false;
            },
            getLightMaterial: (colorHex, emissiveHex, isBroken = false, plain = false, variant = '') => {
                if (!env._lightMatPool) env._lightMatPool = new Map();
                const key = `${colorHex}_${emissiveHex}_${isBroken}_${plain}_${variant}`;
                if (!env._lightMatPool.has(key)) {
                    const bases = {
                        '': [env.baseLightMat, env.baseBrokenLightMat],
                        ember: [env.emberLightMat, env.emberLightBrokenMat]
                    }[variant] || [env.baseLightMat, env.baseBrokenLightMat];
                    const base = (isBroken ? bases[1] : bases[0]) || env.baseLightMat;
                    const mat = base.clone();
                    mat.color.setHex(colorHex);
                    mat.emissive.setHex(emissiveHex);
                    if (plain) {
                        mat.map = null;
                        mat.emissiveMap = null;
                    }
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
                    geo = new THREE.BoxGeometry(w + 0.02, h + 0.02, d + 0.02);
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
            buildCylinder: (radiusTop, radiusBottom, height, radialSegments, mat) => {
                const key = `cyl_${radiusTop}_${radiusBottom}_${height}_${radialSegments}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return new THREE.Mesh(geo, mat);
            },
            buildArchCutout: (radius, thickness, outerY, depth, yOffset, mat) => {
                const key = `archCutout_${radius}_${thickness}_${outerY}_${depth}_${yOffset}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    const shape = new THREE.Shape();
                    const outerX = radius + thickness;
                    
                    // Single continuous path to avoid triangulation failures
                    shape.moveTo(-outerX, 0);
                    shape.lineTo(-outerX, outerY);
                    shape.lineTo(outerX, outerY);
                    shape.lineTo(outerX, 0);
                    shape.lineTo(radius, 0);
                    shape.absarc(0, 0, radius, 0, Math.PI, false);
                    // Automatically closes to (-outerX, 0)
                    
                    geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: 16 });
                    geo.translate(0, 0, -depth / 2); // Center only in Z. Y rests at 0.
                    
                    const pos = geo.attributes.position;
                    const uv = geo.attributes.uv;
                    geo.computeVertexNormals();
                    const norm = geo.attributes.normal;
                    
                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const y = pos.getY(i);
                        const z = pos.getZ(i);
                        const nz = Math.abs(norm.getZ(i));
                        
                        if (nz > 0.5) {
                            uv.setXY(i, x / env.cellSize, (yOffset + y) / 3.0);
                        } else {
                            if (Math.abs(x) >= outerX - 0.01 || y >= outerY - 0.01 || y < 0.01) {
                                uv.setXY(i, z / env.cellSize, (yOffset + y) / 3.0);
                            } else {
                                let angle = Math.atan2(y, x);
                                if (angle < 0) angle += Math.PI * 2;
                                let dist = radius * angle;
                                uv.setXY(i, z / env.cellSize, (yOffset + dist) / 3.0);
                            }
                        }
                    }
                    uv.needsUpdate = true;
                    
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return new THREE.Mesh(geo, mat);
            },
            buildCurvedCornerBlock: (size, mat) => {
                const t = 0.15; // roughly 6 inches
                const key = `curvedCorner_${size}_${t}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    const shape = new THREE.Shape();
                    shape.moveTo(size, 0);
                    shape.lineTo(size, size);
                    shape.lineTo(0, size);
                    shape.lineTo(0, size - t); // Left edge thickness
                    shape.absarc(0, 0, size - t, Math.PI/2, 0, true); 
                    shape.lineTo(size, 0); // Bottom edge thickness
                    
                    geo = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: false, curveSegments: 16 });
                    
                    const pos = geo.attributes.position;
                    const uv = geo.attributes.uv;
                    const arcLen = (size - t) * (Math.PI / 2);
                    
                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const y = pos.getY(i);
                        const z = pos.getZ(i);
                        
                        let s = 0;
                        if (x < 0.01) {
                            s = size - y;
                        } else if (y < 0.01) {
                            s = t + arcLen + (x - (size - t));
                        } else if (x > size - 0.01) {
                            s = t + arcLen + t + y;
                        } else if (y > size - 0.01) {
                            s = t + arcLen + t + size + (size - x);
                        } else {
                            const angle = Math.atan2(y, x);
                            s = t + (size - t) * (Math.PI / 2 - angle);
                        }
                        
                        uv.setXY(i, s / env.cellSize, z / 3.0);
                    }
                    uv.needsUpdate = true;
                    
                    geo.center();
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return new THREE.Mesh(geo, mat);
            },
            /**
             * Adds a single Mesh to the chunk's staging array for instancing and adds it to the spatial grid.
             * WARNING: MUST be a THREE.Mesh. Passing a THREE.Group will crash the compiler when it reads `geometry.boundingBox`.
             * If you have a Group, traverse it and pass its mesh children individually!
             * @param {THREE.Mesh} mesh - The mesh to add
             * @param {boolean} [isWarp=false] - Whether this object acts as a warp zone
             */
            addGeometry: (mesh, isWarp = false) => {
                mesh.userData.chunkHash = hash;
                mesh.updateMatrixWorld(true);
                if (!mesh.userData.noCollision) {
                    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
                    box.chunkHash = hash;
                    if (mesh.userData.isEntityBlocker) box.isEntityBlocker = true;
                    if (isWarp) box.isWarpZone = true;
                    env.spatialGrid.insert(box);
                }
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
                const grateGeo = this.boxGeo(blocksX ? 0.05 : 1.08, 0.58, blocksX ? 1.08 : 0.05);
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
            buildChair: (x, y, z, rotY, matOverride = null) => {
                const group = new THREE.Group();
                const mat = matOverride || env.fabricMat;
                const seat = new THREE.Mesh(env.cushionGeo, mat);
                seat.position.set(0, 0.4, 0);
                group.add(seat);
                const back = new THREE.Mesh(env.backrestGeo, mat);
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
                
                group.userData = {type: 'seat', active: true};
                if (!env.interactables) env.interactables = [];
                env.interactables.push(group);
                
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
                
                group.userData = {type: 'seat', active: true};
                if (!env.interactables) env.interactables = [];
                env.interactables.push(group);
                
                return group;
            },
            buildTable: (x, y, z) => {
                const group = new THREE.Group();
                const legH = 0.88;
                const top = new THREE.Mesh(env.tableTopGeo, env.woodMat);
                top.position.set(0, legH + 0.025, 0);
                group.add(top);
                const legInset = 0.45;
                for (const lx of [legInset, -legInset]) {
                    for (const lz of [legInset, -legInset]) {
                        const leg = new THREE.Mesh(env.tableLegGeo, env.woodMat);
                        leg.position.set(lx, legH / 2, lz);
                        group.add(leg);
                    }
                }
                group.position.set(x, y, z);
                return group;
            },
            buildDesk: (x, y, z, rotY = 0) => {
                const group = new THREE.Group();
                const topGeo = env._cacheGeo('deskTop15', () => new THREE.BoxGeometry(2.4, 0.075, 1.2));
                const top = new THREE.Mesh(topGeo, env.woodMat);
                top.position.set(0, 1.125, 0);
                group.add(top);
                const baseMat = env.paintedSteelMat || env.metalMat;
                const pedGeo = env._cacheGeo('deskPed15', () => new THREE.BoxGeometry(0.6, 1.08, 1.14));
                const pedL = new THREE.Mesh(pedGeo, baseMat);
                pedL.position.set(-0.87, 0.54, 0);
                group.add(pedL);
                const pedR = new THREE.Mesh(pedGeo, baseMat);
                pedR.position.set(0.87, 0.54, 0);
                group.add(pedR);
                const drawerGeo = env._cacheGeo('deskDrawer', () => new THREE.BoxGeometry(0.56, 0.48, 0.04));
                const handleGeo = env._cacheGeo('deskHandle', () => new THREE.BoxGeometry(0.12, 0.02, 0.03));
                for (const px of [-0.87, 0.87]) {
                    for (const dy of [0.28, 0.80]) {
                        const drawer = new THREE.Mesh(drawerGeo, baseMat);
                        drawer.position.set(px, dy, 0.57 + 0.02);
                        group.add(drawer);
                        const handle = new THREE.Mesh(handleGeo, env.metalMat);
                        handle.position.set(px, dy + 0.15, 0.57 + 0.04 + 0.015);
                        group.add(handle);
                    }
                }
                const modGeo = env._cacheGeo('deskMod15', () => new THREE.BoxGeometry(2.25, 0.75, 0.075));
                const modPanel = new THREE.Mesh(modGeo, baseMat);
                modPanel.position.set(0, 0.675, -0.525);
                group.add(modPanel);
                group.position.set(x, y, z);
                group.rotation.y = rotY;
                return group;
            },
            buildPerimeter: (x, z, localX, localZ, wallMat, sectorId, height = 3.0) => {
                const isPerimeter = localX === 0 || localX === env.chunkSize - 1 || localZ === 0 || localZ === env.chunkSize - 1;
                if (!isPerimeter) return false;
                const cx = x * env.cellSize;
                const cz = z * env.cellSize;
                if (sectorId && helpers.markOccupied) helpers.markOccupied(x, z);
                const edge = env.chunkSize - 1;
                const isDoorwayNS = (localZ === 0 || localZ === edge) && localX === 7;
                const isDoorwayEW = (localX === 0 || localX === edge) && localZ === 7;
                const isShoulderNS = (localZ === 0 || localZ === edge) && (localX === 6 || localX === 8);
                const isShoulderEW = (localX === 0 || localX === edge) && (localZ === 6 || localZ === 8);
                const isShoulder = isShoulderNS || isShoulderEW;
                if (isDoorwayNS || isDoorwayEW) {
                    const wMat = wallMat || env.sharedWallMat;
                    const isVoidSector = sectorId === "CHASM";
                    const aMat = isVoidSector ? wMat : (env.metalMat || env.structMat);
                    const outerMat = env.sharedWallMat;
                    const buildMat = (isNS) => {
                        return [
                            isNS ? aMat : wMat,
                            isNS ? aMat : wMat,
                            wMat,
                            aMat,
                            !isNS ? aMat : wMat,
                            !isNS ? aMat : wMat
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
                const outerWMat = env.sharedWallMat;
                const w = env.cellSize + 0.02;
                const d = env.cellSize + 0.02;
                const wallHeight = isShoulder ? height : height + 2.0;
                const multiMat = [
                    localX === env.chunkSize - 1 ? outerWMat : wMat,
                    localX === 0 ? outerWMat : wMat,
                    wMat,
                    wMat,
                    localZ === env.chunkSize - 1 ? outerWMat : wMat,
                    localZ === 0 ? outerWMat : wMat
                ];
                const pushWallSegment = (segW, segH, segD, segCx, segCz) => {
                    let offsetX = 0;
                    let offsetZ = 0;
                    if (localX === 0) offsetX = 0.02;
                    if (localX === env.chunkSize - 1) offsetX = -0.02;
                    if (localZ === 0) offsetZ = 0.02;
                    if (localZ === env.chunkSize - 1) offsetZ = -0.02;
                    
                    const key = `perim_${segW}_${segH}_${segD}`;
                    let geo = env.geoCache.get(key);
                    if (!geo) {
                        geo = new THREE.BoxGeometry(segW, segH, segD);
                        const uv = geo.attributes.uv;
                        for (let i = 0; i < 8; i++) uv.setX(i, uv.getX(i) * (segD / d));
                        for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * (segW / w));
                        if (segH !== 3.0) {
                            const vRange = segH / 3.0;
                            for (let i = 0; i < 8; i++) uv.setY(i, uv.getY(i) * vRange);
                            for (let i = 16; i < 24; i++) uv.setY(i, uv.getY(i) * vRange);
                            for (let i = 8; i < 16; i++) uv.setY(i, uv.getY(i) * vRange);
                        }
                        env.geoCache.set(key, geo);
                        env.geoCache.set(geo.uuid, true);
                    }
                    const wall = new THREE.Mesh(geo, multiMat);
                    wall.position.set(segCx + offsetX, segH / 2, segCz + offsetZ);
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