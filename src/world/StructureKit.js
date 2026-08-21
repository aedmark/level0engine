import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

export const ARCH_WALK_CLEARANCE = 2.55;

const SEAT_UPRIGHT_DOT = 0.7;

const DESK_TOP_Y = 1.125;
const DESK_TOP_THICK = 0.075;

export default class StructureKit {
    constructor(env) {
        this.env = env;
        this._furnitureBox = new THREE.Box3();
        this._seatQuat = new THREE.Quaternion();
        this._seatUp = new THREE.Vector3();
    }

    isUprightSeat(group) {
        group.getWorldQuaternion(this._seatQuat);
        this._seatUp.set(0, 1, 0).applyQuaternion(this._seatQuat);
        return this._seatUp.y >= SEAT_UPRIGHT_DOT;
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

    cylinderGeo(rt, rb, h, rs) {
        return this.cacheGeo(`C:${rt}:${rb}:${h}:${rs}`, () => new THREE.CylinderGeometry(rt, rb, h, rs));
    }

    curvedCornerShape(size, margin = 0) {
        const t = 0.0;
        const outer = size + margin;
        const inner = -margin;
        const radius = size - margin;
        const shape = new THREE.Shape();
        shape.moveTo(outer, inner);
        shape.lineTo(outer, outer);
        shape.lineTo(inner, outer);
        shape.lineTo(inner, radius);
        shape.absarc(0, 0, radius, Math.PI / 2, 0, true);
        shape.lineTo(outer, inner);
        return shape;
    }

    createChunkHelpers(hash, chunkGroup, stagingMeshes, random) {
        const env = this.env;
        const BASEBOARD_H = 3.0 * (32 / 512);
        const TRIM_H = 3.0 * (4 / 512);
        let hasOasis = random() > 0.75;
        const helpers = {
            random,
            runSalt32: env._runSalt32 || 0,
            hash,
            chunkGroup,
            stagingMeshes,
            playerPos: env.camera ? env.camera.position : null,
            buildDefaultWall: (x, z) => {
                const wall = helpers.buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                wall.userData.isDefaultWall = true;
                wall.userData.cellX = x;
                wall.userData.cellZ = z;
                helpers.addGeometry(wall);
                return wall;
            },
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
                    for (let i = 8; i < 16; i++) {
                        uv.setX(i, uv.getX(i) * (w / env.cellSize));
                        uv.setY(i, uv.getY(i) * (d / env.cellSize));
                    }
                    if (h !== 3.0 || yOffset > 0) {
                        const vStart = yOffset / 3.0;
                        const vRange = h / 3.0;
                        for (let i = 0; i < 8; i++) uv.setY(i, vStart + uv.getY(i) * vRange);
                        for (let i = 16; i < 24; i++) uv.setY(i, vStart + uv.getY(i) * vRange);
                    }
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                const mesh = new THREE.Mesh(geo, mat);
                if (mat === env.sharedWallMat && yOffset === 0) {
                    mesh.userData.baseboardFootprint = {w, d, h};
                }
                return mesh;
            },
            buildCylinder: (radiusTop, radiusBottom, height, radialSegments, mat, yOffset = 0) => {
                const geo = this.cylinderGeo(radiusTop, radiusBottom, height, radialSegments);
                const mesh = new THREE.Mesh(geo, mat);
                if (mat === env.sharedWallMat && yOffset === 0 && radiusTop === radiusBottom) {
                    mesh.userData.baseboardFootprint = {r: radiusTop, h: height};
                }
                return mesh;
            },
            addArchCutoutColliders: (mesh, radius, thickness, outerY, depth, springY, steps = 24, walkClearance = 0) => {
                const EPS = 0.01;
                const outerX = radius + thickness;
                const totalY = springY + outerY;
                const halfDepth = depth / 2;
                mesh.updateMatrixWorld(true);
                const b3 = new THREE.Box3();
                const insert = (x0, y0, x1, y1) => {
                    if (x1 - x0 < EPS || y1 - y0 < EPS) return;
                    b3.min.set(x0, y0, -halfDepth);
                    b3.max.set(x1, y1, halfDepth);
                    b3.applyMatrix4(mesh.matrixWorld);
                    const box = new AABB(
                        new Vec3(b3.min.x, b3.min.y, b3.min.z),
                        new Vec3(b3.max.x, b3.max.y, b3.max.z)
                    );
                    box.isEntityBlocker = true;
                    box.chunkHash = hash;
                    env.spatialGrid.insert(box);
                };
                insert(-outerX, 0, -radius, totalY);
                insert(radius, 0, outerX, totalY);
                for (let i = 0; i < steps; i++) {
                    const t0 = Math.PI * (i / steps);
                    const t1 = Math.PI * ((i + 1) / steps);
                    const xa = radius * Math.cos(t0);
                    const xb = radius * Math.cos(t1);
                    let yb = springY + radius * Math.min(Math.sin(t0), Math.sin(t1));
                    if (yb < walkClearance) yb = walkClearance;
                    insert(Math.min(xa, xb), yb, Math.max(xa, xb), totalY);
                }
            },
            buildArchCutout: (radius, thickness, outerY, depth, springY, mat) => {
                const key = `archCutout_${radius}_${thickness}_${outerY}_${depth}_${springY}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    const EPS = 0.002;
                    const shape = new THREE.Shape();
                    const outerX = radius + thickness;
                    const totalY = springY + outerY;

                    shape.moveTo(-outerX + EPS, EPS);
                    shape.lineTo(-outerX + EPS, totalY - EPS);
                    shape.lineTo(outerX - EPS, totalY - EPS);
                    shape.lineTo(outerX - EPS, EPS);
                    shape.lineTo(radius, EPS);
                    shape.lineTo(radius, springY);
                    shape.absarc(0, springY, radius, 0, Math.PI, false);
                    shape.lineTo(-radius, EPS);

                    geo = new THREE.ExtrudeGeometry(shape, { depth: depth - EPS*2, bevelEnabled: false, curveSegments: 32 });
                    geo = geo.toNonIndexed();
                    geo.translate(0, 0, -(depth - EPS*2) / 2);

                    const pos = geo.attributes.position;
                    const uv = geo.attributes.uv;
                    geo.computeVertexNormals();
                    const norm = geo.attributes.normal;

                    const overTheTop = springY + radius * Math.PI;

                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const y = pos.getY(i);
                        const z = pos.getZ(i);

                        if (Math.abs(norm.getZ(i)) > 0.5) {
                            uv.setXY(i, x / env.cellSize, y / 3.0);
                            continue;
                        }

                        if (Math.abs(x) >= outerX - 0.05 || y >= totalY - 0.05) {
                            uv.setXY(i, z / env.cellSize, y / 3.0);
                            continue;
                        }

                        let walked;
                        if (y <= springY + 0.01) {
                            walked = x > 0 ? y : overTheTop + (springY - y);
                        } else {
                            walked = springY + radius * Math.atan2(y - springY, x);

                            const dy = y - springY;
                            const d = Math.hypot(x, dy);
                            if (Math.abs(d - radius) < 0.01) {
                                let nx = x / d;
                                let ny = dy / d;
                                if (nx * norm.getX(i) + ny * norm.getY(i) < 0) {
                                    nx = -nx;
                                    ny = -ny;
                                }
                                norm.setXYZ(i, nx, ny, 0);
                            }
                        }
                        uv.setXY(i, z / env.cellSize, walked / 3.0);
                    }

                    const g0 = { p: [], u: [], n: [] };
                    const g1 = { p: [], u: [], n: [] };

                    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
                    const nA = new THREE.Vector3(), nB = new THREE.Vector3(), nC = new THREE.Vector3();

                    for (let i = 0; i < pos.count; i += 3) {
                        vA.fromBufferAttribute(pos, i);
                        vB.fromBufferAttribute(pos, i+1);
                        vC.fromBufferAttribute(pos, i+2);
                        nA.fromBufferAttribute(norm, i);
                        nB.fromBufferAttribute(norm, i+1);
                        nC.fromBufferAttribute(norm, i+2);

                        const fnX = (nA.x + nB.x + nC.x) / 3;
                        const fnY = (nA.y + nB.y + nC.y) / 3;
                        const fnZ = (nA.z + nB.z + nC.z) / 3;
                        const cX = (vA.x + vB.x + vC.x) / 3;

                        let isInner = false;
                        if (Math.abs(fnZ) < 0.5) {
                            if (fnY < 0.5) {
                                if (!(fnX < -0.5 && cX < 0) && !(fnX > 0.5 && cX > 0)) {
                                    isInner = true;
                                }
                            }
                        }

                        const target = isInner ? g1 : g0;
                        for(let j=0; j<3; j++) {
                            target.p.push(pos.getX(i+j), pos.getY(i+j), pos.getZ(i+j));
                            target.u.push(uv.getX(i+j), uv.getY(i+j));
                            target.n.push(norm.getX(i+j), norm.getY(i+j), norm.getZ(i+j));
                        }
                    }

                    const newGeo = new THREE.BufferGeometry();
                    newGeo.setAttribute('position', new THREE.Float32BufferAttribute([...g0.p, ...g1.p], 3));
                    newGeo.setAttribute('uv', new THREE.Float32BufferAttribute([...g0.u, ...g1.u], 2));
                    newGeo.setAttribute('normal', new THREE.Float32BufferAttribute([...g0.n, ...g1.n], 3));
                    newGeo.addGroup(0, g0.p.length / 3, 0);
                    newGeo.addGroup(g0.p.length / 3, g1.p.length / 3, 1);
                    
                    geo = newGeo;
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return new THREE.Mesh(geo, [env.sharedWallMat, mat]);
            },
            buildCurvedCornerBlock: (size, mat) => {
                const t = 0.0;
                const key = `curvedCorner_${size}_${t}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    const shape = this.curvedCornerShape(size);

                    geo = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: false, curveSegments: 8 });

                    const pos = geo.attributes.position;
                    const uv = geo.attributes.uv;
                    const arcLen = size * (Math.PI / 2);

                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const y = pos.getY(i);
                        const z = pos.getZ(i);

                        let s = 0;
                        if (x < 0.01) {
                            s = size - y;
                        } else if (y < 0.01) {
                            s = arcLen + x;
                        } else if (x > size - 0.01) {
                            s = arcLen + y;
                        } else if (y > size - 0.01) {
                            s = arcLen + size + (size - x);
                        } else {
                            const angle = Math.atan2(y, x);
                            s = size * (Math.PI / 2 - angle);
                        }

                        uv.setXY(i, s / env.cellSize, z / 3.0);
                    }
                    uv.needsUpdate = true;

                    geo.translate(-size / 2, -size / 2, -1.5);
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return new THREE.Mesh(geo, mat);
            },
            addCurvedCornerColliders: (mesh, size, steps = 32) => {
                const EPS = 0.01;
                const half = size / 2;
                const halfDepth = 3.0 / 2;
                mesh.updateMatrixWorld(true);
                const b3 = new THREE.Box3();
                for (let i = 0; i < steps; i++) {
                    const a0 = (Math.PI / 2) * (i / steps);
                    const a1 = (Math.PI / 2) * ((i + 1) / steps);
                    const sx0 = size * Math.sin(a0);
                    const sx1 = size * Math.sin(a1);
                    const sy0 = size * Math.cos(a1);
                    if (sx1 - sx0 < EPS || size - sy0 < EPS) continue;
                    b3.min.set(sx0 - half, sy0 - half, -halfDepth);
                    b3.max.set(sx1 - half, size - half, halfDepth);
                    b3.applyMatrix4(mesh.matrixWorld);
                    const box = new AABB(
                        new Vec3(b3.min.x, b3.min.y, b3.min.z),
                        new Vec3(b3.max.x, b3.max.y, b3.max.z)
                    );
                    box.isEntityBlocker = true;
                    box.chunkHash = hash;
                    env.spatialGrid.insert(box);
                }
            },
            curvedFlatGeo: (size, height) => {
                const key = `curvedFlat_${size}_${height}`;
                let geo = env.geoCache.get(key);
                if (!geo) {
                    const shape = this.curvedCornerShape(size, 0.03);
                    geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 8 });
                    geo.translate(-size / 2, -size / 2, -height / 2);
                    env.geoCache.set(key, geo);
                    env.geoCache.set(geo.uuid, true);
                }
                return geo;
            },
            addBaseboardBox: (cx, cz, w, d) => {
                const bw = w + 0.06;
                const bd = d + 0.06;

                const body = new THREE.Mesh(this.boxGeo(1, BASEBOARD_H, 1), env.baseboardMat);
                body.scale.set(bw, 1, bd);
                body.position.set(cx, BASEBOARD_H / 2, cz);
                body.userData.noCollision = true;
                helpers.addGeometry(body);

                const trim = new THREE.Mesh(this.boxGeo(1, TRIM_H, 1), env.baseboardTrimMat);
                trim.scale.set(bw, 1, bd);
                trim.position.set(cx, BASEBOARD_H + TRIM_H / 2, cz);
                trim.userData.noCollision = true;
                helpers.addGeometry(trim);
            },
            addCurvedAlcoveBaseboard: (cx, cz, angle) => {
                const size = env.cellSize;
                const body = new THREE.Mesh(helpers.curvedFlatGeo(size, BASEBOARD_H), env.baseboardMat);
                body.rotation.set(-Math.PI / 2, 0, angle, 'XYZ');
                body.position.set(cx, BASEBOARD_H / 2, cz);
                body.userData.noCollision = true;
                helpers.addGeometry(body);

                const trim = new THREE.Mesh(helpers.curvedFlatGeo(size, TRIM_H), env.baseboardTrimMat);
                trim.rotation.set(-Math.PI / 2, 0, angle, 'XYZ');
                trim.position.set(cx, BASEBOARD_H + TRIM_H / 2, cz);
                trim.userData.noCollision = true;
                helpers.addGeometry(trim);
            },
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
                    mesh.userData.collisionBox = box;
                }
                stagingMeshes.push(mesh);
                const bbFootprint = mesh.userData.baseboardFootprint;
                const wallBottomY = bbFootprint ? mesh.position.y - bbFootprint.h / 2 : null;
                if (bbFootprint && Math.abs(wallBottomY) < 0.05) {
                    const baseY = wallBottomY;
                    let body, trim;
                    
                    if (bbFootprint.r !== undefined) {
                        const br = bbFootprint.r + 0.03;
                        body = new THREE.Mesh(this.cylinderGeo(br, br, BASEBOARD_H, 16),
                            mesh.userData.baseboardFaceMats || env.baseboardMat);
                        trim = new THREE.Mesh(this.cylinderGeo(br, br, TRIM_H, 16),
                            mesh.userData.baseboardTrimFaceMats || env.baseboardTrimMat);
                    } else {
                        const bw = bbFootprint.w + 0.06;
                        const bd = bbFootprint.d + 0.06;
                        body = new THREE.Mesh(this.boxGeo(1, BASEBOARD_H, 1),
                            mesh.userData.baseboardFaceMats || env.baseboardMat);
                        body.scale.set(bw, 1, bd);
                        trim = new THREE.Mesh(this.boxGeo(1, TRIM_H, 1),
                            mesh.userData.baseboardTrimFaceMats || env.baseboardTrimMat);
                        trim.scale.set(bw, 1, bd);
                    }
                    
                    body.position.set(mesh.position.x, baseY + BASEBOARD_H / 2, mesh.position.z);
                    body.rotation.y = mesh.rotation.y;
                    body.userData.chunkHash = hash;
                    body.userData.noCollision = true;
                    body.updateMatrixWorld(true);
                    stagingMeshes.push(body);
                    
                    trim.position.set(mesh.position.x, baseY + BASEBOARD_H + TRIM_H / 2, mesh.position.z);
                    trim.rotation.y = mesh.rotation.y;
                    trim.userData.chunkHash = hash;
                    trim.userData.noCollision = true;
                    trim.updateMatrixWorld(true);
                    stagingMeshes.push(trim);

                    mesh.userData.baseboardParts = [body, trim];
                    body.userData.baseboardOwner = mesh;
                    trim.userData.baseboardOwner = mesh;
                }
            },
            claimedCells: new Map(),
            claimCell: (cx, cz) => {
                helpers.claimedCells.set(`${cx},${cz}`, {x: cx, z: cz});
            },
            isCellClaimed: (cx, cz) => helpers.claimedCells.has(`${cx},${cz}`),
            permeableCells: new Map(),
            markPermeable: (cx, cz) => {
                helpers.permeableCells.set(`${cx},${cz}`, {x: cx, z: cz});
            },
            isCellPermeable: (cx, cz) => helpers.permeableCells.has(`${cx},${cz}`),
            retractSpanWall: (mesh, newLength) => {
                const span = mesh.userData.wallSpan;
                if (!span) return false;
                const len = Math.floor(Math.max(0, newLength) * 20 + 1e-6) / 20;
                if (len < 0.05) return false;
                if (len >= span.length) return true;

                const rebuilt = helpers.buildWall(len, span.thickness, span.mat, span.height, span.yOffset);
                mesh.geometry = rebuilt.geometry;
                mesh.position.set(
                    span.anchorX + span.dirX * (len / 2),
                    span.y,
                    span.anchorZ + span.dirZ * (len / 2)
                );
                mesh.updateMatrixWorld(true);
                span.length = len;

                if (mesh.userData.collisionBox) {
                    env.spatialGrid.remove(mesh.userData.collisionBox);
                    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
                    box.chunkHash = hash;
                    if (mesh.userData.isEntityBlocker) box.isEntityBlocker = true;
                    env.spatialGrid.insert(box);
                    mesh.userData.collisionBox = box;
                }

                if (mesh.userData.baseboardFootprint) mesh.userData.baseboardFootprint.w = len;
                for (const part of mesh.userData.baseboardParts || []) {
                    part.scale.x = len + 0.06;
                    part.position.x = mesh.position.x;
                    part.position.z = mesh.position.z;
                    part.updateMatrixWorld(true);
                }
                return true;
            },
            retireStagedMesh: (mesh) => {
                const idx = stagingMeshes.indexOf(mesh);
                if (idx > -1) stagingMeshes.splice(idx, 1);
                if (mesh.userData.collisionBox) {
                    env.spatialGrid.remove(mesh.userData.collisionBox);
                    mesh.userData.collisionBox = null;
                }
                for (const part of mesh.userData.baseboardParts || []) {
                    const partIdx = stagingMeshes.indexOf(part);
                    if (partIdx > -1) stagingMeshes.splice(partIdx, 1);
                    part.userData.baseboardOwner = null;
                }
                mesh.userData.baseboardParts = null;
                mesh.userData.retired = true;
            },
            spanClearanceToCell: (mesh, wx, wz) => {
                const span = mesh.userData.wallSpan;
                if (!span) return Infinity;
                const half = env.cellSize / 2;
                const alongX = Math.abs(span.dirX) > 0.5;
                const perpPos = alongX ? span.anchorZ : span.anchorX;
                const perpCell = (alongX ? wz : wx) * env.cellSize;
                if (Math.abs(perpPos - perpCell) > half + span.thickness / 2) return span.length;

                const dir = alongX ? span.dirX : span.dirZ;
                const anchor = alongX ? span.anchorX : span.anchorZ;
                const cellCentre = (alongX ? wx : wz) * env.cellSize;
                const stopAt = (cellCentre - dir * half - anchor) * dir;
                if (stopAt < 0) {
                    return Math.abs(anchor - cellCentre) <= half ? 0 : span.length;
                }
                return Math.min(span.length, stopAt);
            },
            spanClearanceToBox: (mesh, box) => {
                const span = mesh.userData.wallSpan;
                if (!span) return Infinity;
                const alongX = Math.abs(span.dirX) > 0.5;
                const dir = alongX ? span.dirX : span.dirZ;
                const anchor = alongX ? span.anchorX : span.anchorZ;
                const nearFace = alongX
                    ? (dir > 0 ? box.min.x : box.max.x)
                    : (dir > 0 ? box.min.z : box.max.z);
                return Math.min(span.length, (nearFace - anchor) * dir - 0.02);
            },
            addFurniture: (group) => {
                if (Math.abs(group.position.x) < 4.0 && Math.abs(group.position.z) < 4.0) return false;
                group.userData.chunkHash = hash;
                group.updateMatrixWorld(true);
                const probe = this._furnitureBox.setFromObject(group);
                const localBoxes = env.spatialGrid.getNearby(group.position.x, group.position.z, 2.0);
                for (let i = 0; i < localBoxes.length; i++) {
                    if (localBoxes[i].intersectsBox(probe)) return false;
                }
                const box = probe.clone();
                box.chunkHash = hash;
                env.spatialGrid.insert(box);
                group.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.chunkHash = hash;
                        child.updateMatrixWorld(true);
                        stagingMeshes.push(child);
                    }
                });
                if (group.userData.type === 'seat' && this.isUprightSeat(group)) {
                    if (!env.interactables) env.interactables = [];
                    env.interactables.push(group);
                }
                return true;
            },
            addObserver: (px, pz) => {
                const obs = new THREE.Mesh(env.observerGeo, env.observerMat.clone());
                obs.position.set(px, 0.95, pz);
                obs.userData = {chunkHash: hash, active: true, fade: 0.85};
                chunkGroup.add(obs);
                env.observers.push(obs);
            },
            buildFlange: (px, py, pz, isX, dirSign) => {
                const fT = 0.04;
                const fW = 0.14;
                const hW = 1.12;
                const hH = 0.68;
                const oW = hW + fW * 2;
                const mat = env.flangeMat || env.ductMat;

                const shape = new THREE.Shape();
                shape.moveTo(-oW / 2, 0);
                shape.lineTo(oW / 2, 0);
                shape.lineTo(oW / 2, hH + fW);
                shape.lineTo(-oW / 2, hH + fW);
                shape.lineTo(-oW / 2, 0);

                const hole = new THREE.Path();
                hole.moveTo(-hW / 2, 0);
                hole.lineTo(-hW / 2, hH);
                hole.lineTo(hW / 2, hH);
                hole.lineTo(hW / 2, 0);
                hole.lineTo(-hW / 2, 0);
                shape.holes.push(hole);

                const fGeo = new THREE.ExtrudeGeometry(shape, {
                    depth: fT,
                    bevelEnabled: true,
                    bevelThickness: 0.005,
                    bevelSize: 0.005,
                    bevelSegments: 2
                });
                fGeo.translate(0, 0, -fT / 2);

                const pos = fGeo.attributes.position;
                const uv = fGeo.attributes.uv;
                for (let i = 0; i < pos.count; i++) {
                    uv.setXY(i, pos.getX(i) * 2, pos.getY(i) * 2);
                }
                uv.needsUpdate = true;

                const tFlange = new THREE.Mesh(fGeo, mat);
                tFlange.userData.noCollision = true;
                const cDepth = isX ? px + dirSign * (fT / 2) : pz + dirSign * (fT / 2);

                if (isX) {
                    tFlange.position.set(cDepth, py, pz);
                    tFlange.rotation.y = dirSign === 1 ? Math.PI / 2 : -Math.PI / 2;
                } else {
                    tFlange.position.set(px, py, cDepth);
                    tFlange.rotation.y = dirSign === 1 ? 0 : Math.PI;
                }

                helpers.addGeometry(tFlange);

                const screwGeo = env._boxGeo(0.015, 0.015, 0.015);
                const screwMat = env.pittedMetalMat || env.metalMat || mat;
                const sDepth = isX ? cDepth + dirSign * (fT / 2 + 0.005) : cDepth + dirSign * (fT / 2 + 0.005);
                const sY = py + hH + fW / 2;
                const screwPositions = [];
                if (isX) {
                    screwPositions.push({x: sDepth, y: sY, z: pz - hW / 2});
                    screwPositions.push({x: sDepth, y: sY, z: pz + hW / 2});
                    screwPositions.push({x: sDepth, y: py + 0.05, z: pz - hW / 2 - fW / 2});
                    screwPositions.push({x: sDepth, y: py + 0.05, z: pz + hW / 2 + fW / 2});
                } else {
                    screwPositions.push({x: px - hW / 2, y: sY, z: sDepth});
                    screwPositions.push({x: px + hW / 2, y: sY, z: sDepth});
                    screwPositions.push({x: px - hW / 2 - fW / 2, y: py + 0.05, z: sDepth});
                    screwPositions.push({x: px + hW / 2 + fW / 2, y: py + 0.05, z: sDepth});
                }
                for (const pos of screwPositions) {
                    const s = new THREE.Mesh(screwGeo, screwMat);
                    s.position.set(pos.x, pos.y, pos.z);
                    helpers.addGeometry(s);
                }
            },
            buildDoorKnob: (thickness, blocksX) => {
                const brassMat = env.brassMat || new THREE.MeshStandardMaterial({
                    color: 0xc9a34b,
                    metalness: 0.8,
                    roughness: 0.3
                });
                const group = new THREE.Group();
                const zOffset = thickness / 2;

                for (const side of [1, -1]) {
                    const sideZ = side * zOffset;
                    
                    const roseGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 16);
                    const rose = new THREE.Mesh(roseGeo, brassMat);
                    rose.rotation.x = Math.PI / 2;
                    rose.position.set(0, 0, sideZ + side * 0.0075);
                    group.add(rose);
                    
                    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12);
                    const shaft = new THREE.Mesh(shaftGeo, brassMat);
                    shaft.rotation.x = Math.PI / 2;
                    shaft.position.set(0, 0, sideZ + side * 0.03);
                    group.add(shaft);
                    
                    const knobGeo = new THREE.SphereGeometry(0.045, 16, 16);
                    const knob = new THREE.Mesh(knobGeo, brassMat);
                    knob.position.set(0, 0, sideZ + side * 0.065);
                    group.add(knob);
                }
                
                if (blocksX) {
                    group.rotation.y = Math.PI / 2;
                }
                
                group.children.forEach(c => { c.castShadow = true; c.receiveShadow = true; });
                return group;
            },
            addGrate: (px, py, pz, blocksX, opts = {}) => {
                const {
                    width = 1.08,
                    height = 0.58,
                    thickness = 0.05,
                    hinged = false,
                    openSign = 1,
                    mat = env.wallVentMat
                } = opts;
                const localBoxes = env.spatialGrid.getNearby(px, pz, 1.0);
                for (let i = 0; i < localBoxes.length; i++) {
                    const b = localBoxes[i];
                    if (b.isGrate) {
                        const refPos = b.meshRef.userData.worldPos || b.meshRef.position;
                        const dist = Math.abs(refPos.x - px) + Math.abs(refPos.z - pz);
                        if (dist < 0.1) {
                            return;
                        }
                    }
                }
                const grateGeo = this.boxGeo(blocksX ? thickness : width, height, blocksX ? width : thickness);
                const grate = new THREE.Mesh(grateGeo, mat);
                grate.userData = {
                    type: 'grate', active: true, chunkHash: hash,
                    blocksX: blocksX, worldPos: {x: px, z: pz},
                    fallDir: opts.fallDir
                };
                grate.castShadow = (!mat.userData || !mat.userData.noShadow);
                grate.receiveShadow = true;
                if (hinged) {
                    const pivot = new THREE.Group();
                    pivot.position.set(
                        blocksX ? px : px - width / 2,
                        py,
                        blocksX ? pz - width / 2 : pz
                    );
                    grate.position.set(blocksX ? 0 : width / 2, 0, blocksX ? width / 2 : 0);
                    pivot.add(grate);
                    
                    if (opts.isMiniDoor) {
                        const handle = helpers.buildDoorKnob(thickness, blocksX);
                        handle.position.set(
                            blocksX ? 0 : width / 2 - 0.15, 
                            0, 
                            blocksX ? width / 2 - 0.15 : 0
                        );
                        grate.add(handle);
                    }
                    
                    pivot.userData.chunkHash = hash;
                    chunkGroup.add(pivot);
                    pivot.updateMatrixWorld(true);
                    grate.userData.pivot = pivot;
                    grate.userData.openRot = openSign * (blocksX ? Math.PI / 2 : -Math.PI / 2);
                } else {
                    grate.position.set(px, py, pz);
                    chunkGroup.add(grate);
                }
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
                const l1 = new THREE.Mesh(env.legGeo, env.woodMat);
                l1.position.set(0.3, 0.2, 0.3);
                group.add(l1);
                const l2 = new THREE.Mesh(env.legGeo, env.woodMat);
                l2.position.set(-0.3, 0.2, 0.3);
                group.add(l2);
                const l3 = new THREE.Mesh(env.legGeo, env.woodMat);
                l3.position.set(0.3, 0.2, -0.3);
                group.add(l3);
                const l4 = new THREE.Mesh(env.legGeo, env.woodMat);
                l4.position.set(-0.3, 0.2, -0.3);
                group.add(l4);
                group.position.set(x, y, z);
                group.rotation.y = rotY;

                group.userData = {type: 'seat', active: true};

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
                const l1 = new THREE.Mesh(env.legGeo, env.woodMat);
                l1.position.set(0.9, 0.15, 0.35);
                group.add(l1);
                const l2 = new THREE.Mesh(env.legGeo, env.woodMat);
                l2.position.set(-0.9, 0.15, 0.35);
                group.add(l2);
                const l3 = new THREE.Mesh(env.legGeo, env.woodMat);
                l3.position.set(0.9, 0.15, -0.35);
                group.add(l3);
                const l4 = new THREE.Mesh(env.legGeo, env.woodMat);
                l4.position.set(-0.9, 0.15, -0.35);
                group.add(l4);
                group.position.set(x, y, z);
                group.rotation.y = rotY;

                group.userData = {type: 'seat', active: true};

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
                const topGeo = env._cacheGeo('deskTop15', () => new THREE.BoxGeometry(2.4, DESK_TOP_THICK, 1.2));
                const top = new THREE.Mesh(topGeo, env.woodMat);
                top.position.set(0, DESK_TOP_Y, 0);
                group.add(top);
                group.userData.surfaceY = DESK_TOP_Y + DESK_TOP_THICK / 2;
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
                    const headerH = height - 2.6;
                    if (headerH > 0) {
                        const headY = 2.6 + headerH / 2;
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
                    wall.userData.isEntityBlocker = true;
                    wall.userData.baseboardFootprint = {w: segW, d: segD, h: segH};
                    helpers.addGeometry(wall);
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