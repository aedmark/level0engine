import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {placeSectorPaper} from '../NarrativeProps.js';

/**
 * [ROLE] Defines the generation logic for the "Chasm" sector.
 * [WHY] Creates vast, empty spaces with catwalks and massive pillars to break up tight corridors and add vertical scale.
 * [STATE] Stateless factory. Returns a builder object that modifies the world generation environment.
 * [DEPENDS] Modifies `env`'s spatial grid for void areas and manages unique fixture data like lighthouses.
 */
export const ChasmSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        chunkGroup,
        hash
    } = ctx;
    return {
        id: "CHASM",
        foundationMat: null,
        build: (x, z, localX, localZ, maze) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.voidShroudMat || env.sharedWallMat, "CHASM")) return;
            const isVoid = !maze || maze[localX][localZ];
            const gx = x * env.cellSize, gz = z * env.cellSize;
            if (!isVoid) {

                const floorGeo = new THREE.PlaneGeometry(env.cellSize, env.cellSize);
                const bFloor = new THREE.Mesh(floorGeo, env.catwalkMat);
                bFloor.rotation.x = -Math.PI / 2;
                bFloor.position.set(gx, 0, gz);
                addGeometry(bFloor);
                if (!env.blackIronMat) env.blackIronMat = new THREE.MeshStandardMaterial({
                    color: 0x151515,
                    roughness: 0.7,
                    metalness: 0.9
                });
                placeSectorPaper(env, ctx, "CHASM", gx, gz);
                const hx = env.cellSize / 2;
                const tb1 = buildWall(env.cellSize, 0.1, env.blackIronMat, 0.2);
                tb1.position.set(gx, -0.1, gz - hx + 0.05);
                addGeometry(tb1);
                const tb2 = buildWall(env.cellSize, 0.1, env.blackIronMat, 0.2);
                tb2.position.set(gx, -0.1, gz + hx - 0.05);
                addGeometry(tb2);
                const tb3 = buildWall(0.1, env.cellSize - 0.2, env.blackIronMat, 0.2);
                tb3.position.set(gx - hx + 0.05, -0.1, gz);
                addGeometry(tb3);
                const tb4 = buildWall(0.1, env.cellSize - 0.2, env.blackIronMat, 0.2);
                tb4.position.set(gx + hx - 0.05, -0.1, gz);
                addGeometry(tb4);
                const drop = 80;
                const lPos = env.cellSize / 2 - 0.1;
                for (const dx of [-lPos, lPos]) {
                    for (const dz of [-lPos, lPos]) {
                        const leg = buildWall(0.2, 0.2, env.blackIronMat, drop);
                        leg.position.set(gx + dx, -drop / 2, gz + dz);
                        addGeometry(leg);
                    }
                }
                const span = env.cellSize - 0.2;
                const depth = 4.0;
                const diagLen = Math.sqrt(span * span + depth * depth);
                const angle = Math.atan2(depth, span);
                const braceFloor = Math.max(-drop, -24);
                const braceStep = 8;
                for (let y = -4; y > braceFloor; y -= braceStep) {
                    for (const dz of [-lPos, lPos]) {
                        const cross1 = buildWall(diagLen, 0.1, env.blackIronMat, 0.1);
                        cross1.rotation.z = angle;
                        cross1.position.set(gx, y, gz + dz);
                        addGeometry(cross1);
                        const cross2 = buildWall(diagLen, 0.1, env.blackIronMat, 0.1);
                        cross2.rotation.z = -angle;
                        cross2.position.set(gx, y, gz + dz);
                        addGeometry(cross2);
                    }
                    for (const dx of [-lPos, lPos]) {
                        const cross1 = buildWall(0.1, diagLen, env.blackIronMat, 0.1);
                        cross1.rotation.x = angle;
                        cross1.position.set(gx + dx, y, gz);
                        addGeometry(cross1);
                        const cross2 = buildWall(0.1, diagLen, env.blackIronMat, 0.1);
                        cross2.rotation.x = -angle;
                        cross2.position.set(gx + dx, y, gz);
                        addGeometry(cross2);
                    }
                }
                const checkVoid = (nx, nz) => {
                    if (nx < 0 || nx >= env.chunkSize || nz < 0 || nz >= env.chunkSize) return false;
                    return !maze || maze[nx][nz];
                };
                const vW = checkVoid(localX - 1, localZ);
                const vE = checkVoid(localX + 1, localZ);
                const vN = checkVoid(localX, localZ - 1);
                const vS = checkVoid(localX, localZ + 1);
                if (!env.blackIronMat) env.blackIronMat = new THREE.MeshStandardMaterial({
                    color: 0x151515,
                    roughness: 0.7,
                    metalness: 0.9
                });
                const buildRailZ = (x, z, len) => {
                    const top = buildWall(0.08, len, env.blackIronMat, 0.08);
                    top.position.set(x, 1.15, z);
                    addGeometry(top);
                    const mid = buildWall(0.05, len, env.blackIronMat, 0.05);
                    mid.position.set(x, 0.6, z);
                    addGeometry(mid);
                    for (let p = -len / 2 + 0.5; p < len / 2; p += 1.5) {
                        const vpost = buildWall(0.08, 0.08, env.blackIronMat, 1.2);
                        vpost.position.set(x, 0.6, z + p);
                        addGeometry(vpost);
                    }
                };
                const buildRailX = (x, z, len) => {
                    const top = buildWall(len, 0.08, env.blackIronMat, 0.08);
                    top.position.set(x, 1.15, z);
                    addGeometry(top);
                    const mid = buildWall(len, 0.05, env.blackIronMat, 0.05);
                    mid.position.set(x, 0.6, z);
                    addGeometry(mid);
                    for (let p = -len / 2 + 0.5; p < len / 2; p += 1.5) {
                        const vpost = buildWall(0.08, 0.08, env.blackIronMat, 1.2);
                        vpost.position.set(x + p, 0.6, z);
                        addGeometry(vpost);
                    }
                };
                if (vW) {
                    const extN = !vN, extS = !vS;
                    const len = env.cellSize + (extN ? 0.2 : 0) + (extS ? 0.2 : 0);
                    const cz = (extS ? 0.1 : 0) - (extN ? 0.1 : 0);
                    buildRailZ(gx - 1.8, gz + cz, len);
                }
                if (vE) {
                    const extN = !vN, extS = !vS;
                    const len = env.cellSize + (extN ? 0.2 : 0) + (extS ? 0.2 : 0);
                    const cz = (extS ? 0.1 : 0) - (extN ? 0.1 : 0);
                    buildRailZ(gx + 1.8, gz + cz, len);
                }
                if (vN) {
                    const extW = !vW, extE = !vE;
                    const len = env.cellSize + (extW ? 0.2 : 0) + (extE ? 0.2 : 0);
                    const cx = (extE ? 0.1 : 0) - (extW ? 0.1 : 0);
                    buildRailX(gx + cx, gz - 1.8, len);
                }
                if (vS) {
                    const extW = !vW, extE = !vE;
                    const len = env.cellSize + (extW ? 0.2 : 0) + (extE ? 0.2 : 0);
                    const cx = (extE ? 0.1 : 0) - (extW ? 0.1 : 0);
                    buildRailX(gx + cx, gz + 1.8, len);
                }
                const addCornerPost = (px, pz) => {
                    const post = buildWall(0.2, 0.2, env.blackIronMat, 1.2);
                    post.position.set(px, 0.6, pz);
                    addGeometry(post);
                };
                if (vW && vN) addCornerPost(gx - 1.8, gz - 1.8);
                if (vE && vN) addCornerPost(gx + 1.8, gz - 1.8);
                if (vW && vS) addCornerPost(gx - 1.8, gz + 1.8);
                if (vE && vS) addCornerPost(gx + 1.8, gz + 1.8);
                if (!vW && !vN && checkVoid(localX - 1, localZ - 1)) addCornerPost(gx - 1.8, gz - 1.8);
                if (!vE && !vN && checkVoid(localX + 1, localZ - 1)) addCornerPost(gx + 1.8, gz - 1.8);
                if (!vW && !vS && checkVoid(localX - 1, localZ + 1)) addCornerPost(gx - 1.8, gz + 1.8);
                if (!vE && !vS && checkVoid(localX + 1, localZ + 1)) addCornerPost(gx + 1.8, gz + 1.8);
            } else {
                const voidBox = new AABB();
                voidBox.min.set(gx - 2, -100, gz - 2);
                voidBox.max.set(gx + 2, 3, gz + 2);
                voidBox.isVoid = true;
                voidBox.chunkHash = hash;
                env.spatialGrid.insert(voidBox);
                if (env._chasmPillarHash !== hash) {
                    env._chasmPillarHash = hash;
                    const band = [];
                    for (let ix = 3; ix <= 11; ix++) for (let iz = 3; iz <= 11; iz++) {
                        if (!maze || maze[ix][iz]) band.push(ix * env.chunkSize + iz);
                    }
                    const set = new Set();
                    if (band.length) {
                        let s = (hash ^ 0x00C0FFEE) >>> 0;
                        const rng = () => {
                            s = (s * 1664525 + 1013904223) >>> 0;
                            return s / 4294967296;
                        };
                        for (let i = band.length - 1; i > 0; i--) {
                            const j = Math.floor(rng() * (i + 1));
                            const t = band[i];
                            band[i] = band[j];
                            band[j] = t;
                        }
                        const want = Math.min(band.length, 3 + ((hash >>> 3) % 3));
                        for (let k = 0; k < want; k++) set.add(band[k]);
                        const lhSet = new Set();
                        let s2 = (hash ^ 0x00BEEF00) >>> 0;
                        const rng2 = () => {
                            s2 = (s2 * 1664525 + 1013904223) >>> 0;
                            return s2 / 4294967296;
                        };
                        const lhBand = [...band];
                        for (let i = lhBand.length - 1; i > 0; i--) {
                            const j = Math.floor(rng2() * (i + 1));
                            const t = lhBand[i];
                            lhBand[i] = lhBand[j];
                            lhBand[j] = t;
                        }
                        const wantLH = Math.min(lhBand.length, 5);
                        let minSpacing = 4.0;
                        while (lhSet.size < wantLH && minSpacing >= 0) {
                            lhSet.clear();
                            let added = 0;
                            for (let k = 0; k < lhBand.length && added < wantLH; k++) {
                                const candidate = lhBand[k];
                                if (set.has(candidate)) continue;
                                const cx = Math.floor(candidate / env.chunkSize);
                                const cz = candidate % env.chunkSize;
                                let tooClose = false;
                                for (const existing of lhSet) {
                                    const ex = Math.floor(existing / env.chunkSize);
                                    const ez = existing % env.chunkSize;
                                    const dist = Math.sqrt((cx - ex) ** 2 + (cz - ez) ** 2);
                                    if (dist < minSpacing) {
                                        tooClose = true;
                                        break;
                                    }
                                }
                                if (!tooClose) {
                                    lhSet.add(candidate);
                                    added++;
                                }
                            }
                            minSpacing -= 0.5;
                        }
                        env._chasmLighthouseSet = lhSet;
                    }
                    env._chasmPillarSet = set;
                }
                const guaranteed = env._chasmPillarSet.has(localX * env.chunkSize + localZ);
                const guaranteedLighthouse = env._chasmLighthouseSet.has(localX * env.chunkSize + localZ);
                const scatter = random() > 0.90;
                const inBand = localX > 2 && localX < 12 && localZ > 2 && localZ < 12;
                if (guaranteed || (scatter && inBand)) {
                    const pw = 1.8 + random() * 1.5;
                    const pillar = buildWall(pw, pw, env.pipeMat || env.rustMat, 80.0);
                    pillar.position.set(gx, -30.0, gz);
                    addGeometry(pillar);
                } else if (guaranteedLighthouse) {
                    const lhIndex = Array.from(env._chasmLighthouseSet).indexOf(localX * env.chunkSize + localZ);
                    const isAbove = lhIndex < 4;
                    let poleStart, poleEnd, sign;
                    if (isAbove) {
                        poleStart = 10.0;
                        poleEnd = 3.0 + random() * 4.0;
                        sign = -1;
                    } else {
                        poleStart = -10.0;
                        poleEnd = -3.0 - random() * 4.0;
                        sign = 1;
                    }
                    const poleH = Math.abs(poleStart - poleEnd);
                    const poleY = (poleStart + poleEnd) / 2;
                    const pole = buildWall(0.6, 0.6, env.rustMat, poleH);
                    pole.position.set(gx, poleY, gz);
                    addGeometry(pole);
                    const lhMat = new THREE.MeshStandardMaterial({
                        color: 0xffeedd,
                        emissive: 0xffeedd,
                        transparent: true,
                        opacity: 0.5,
                        roughness: 0.1,
                        metalness: 0.1
                    });
                    const base = new THREE.Mesh(env._boxGeo(0.8, 0.4, 0.8), env.rustMat);
                    base.position.set(gx, poleEnd + sign * 0.2, gz);
                    chunkGroup.add(base);
                    const glass = new THREE.Mesh(env._cacheGeo('lhGlass', () => new THREE.CylinderGeometry(0.35, 0.35, 0.6, 8)), lhMat);
                    glass.position.set(gx, poleEnd + sign * 0.7, gz);
                    chunkGroup.add(glass);
                    if (!env._lhBulbMat) {
                        env._lhBulbMat = new THREE.MeshBasicMaterial({color: 0xffffee});
                        env.sharedAssets.add(env._lhBulbMat.uuid);
                    }
                    const bulb = new THREE.Mesh(env._cacheGeo('lhBulb', () => new THREE.SphereGeometry(0.15, 8, 8)), env._lhBulbMat);
                    bulb.position.set(gx, poleEnd + sign * 0.7, gz);
                    chunkGroup.add(bulb);
                    const cap = new THREE.Mesh(env._cacheGeo('lhCap', () => new THREE.CylinderGeometry(0.4, 0.45, 0.1, 8)), env.rustMat);
                    cap.position.set(gx, poleEnd + sign * 1.05, gz);
                    if (isAbove) cap.rotation.x = Math.PI;
                    chunkGroup.add(cap);
                    if (!env._lhBeamMat) {
                        env._lhBeamMat = new THREE.MeshBasicMaterial({
                            color: 0xffeedd,
                            transparent: true,
                            opacity: 0.02,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                            side: THREE.DoubleSide
                        });
                        env.sharedAssets.add(env._lhBeamMat.uuid);
                    }
                    const beamPivot = new THREE.Group();
                    beamPivot.position.set(gx, poleEnd + sign * 0.7, gz);
                    chunkGroup.add(beamPivot);
                    const beamGeo = env._cacheGeo('lhBeam', () => {
                        const geo = new THREE.CylinderGeometry(0.1, 8.0, 30.0, 16, 1, true);
                        geo.translate(0, -15.0, 0);
                        geo.rotateX(-Math.PI / 2);
                        return geo;
                    });
                    const beam = new THREE.Mesh(beamGeo, env._lhBeamMat);
                    beamPivot.add(beam);
                    const housingPivot = new THREE.Group();
                    housingPivot.position.set(gx, poleEnd + sign * 0.7, gz);
                    chunkGroup.add(housingPivot);
                    const housingGeo = env._cacheGeo('lhHousing', () => {
                        return new THREE.CylinderGeometry(0.38, 0.38, 0.62, 12, 1, false, Math.PI / 2, Math.PI);
                    });
                    const housing = new THREE.Mesh(housingGeo, env.rustMat);
                    housingPivot.add(housing);
                    base.userData.chunkHash = hash;
                    glass.userData.chunkHash = hash;
                    bulb.userData.chunkHash = hash;
                    cap.userData.chunkHash = hash;
                    housing.userData.chunkHash = hash;
                    base.updateMatrixWorld(true);
                    glass.updateMatrixWorld(true);
                    bulb.updateMatrixWorld(true);
                    cap.updateMatrixWorld(true);
                    housing.updateMatrixWorld(true);
                    env.walls.push(base, glass, cap, housing);
                    env.fixtureData.push({
                        chunkHash: hash,
                        position: new THREE.Vector3(gx, poleEnd + sign * 0.7, gz),
                        targetPos: new THREE.Vector3(gx, poleEnd + sign * 0.7, gz),
                        isSpot: true,
                        isLighthouse: true,
                        sweepSpeed: 0.4 + random() * 0.4,
                        sweepPhase: random() * Math.PI * 2,
                        flickerOffset: random() * 500,
                        material: lhMat,
                        isFaulty: false,
                        baseIntensity: 5.0,
                        targetIntensity: 5.0,
                        currentIntensity: 5.0,
                        volumetricMesh: beamPivot,
                        housingMesh: housingPivot
                    });
                }
            }
        }
    };
};