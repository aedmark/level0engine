// ChasmSector.js
import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

export const ChasmSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildChair,
        buildTable,
        buildCouch,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;

    return {
                id: "CHASM",
                foundationMat: null,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.sharedWallMat, "CHASM")) return;
                    const isVoid = !maze || maze[localX][localZ];
                    const gx = x * env.cellSize, gz = z * env.cellSize;
                    if (!isVoid) {
                        const bFloor = buildWall(env.cellSize, env.cellSize, env.diamondPlateMat || env.structMat, 0.2);
                        bFloor.position.set(gx, -0.1, gz);
                        addGeometry(bFloor);
                        const checkVoid = (nx, nz) => {
                            if (nx < 0 || nx >= env.chunkSize || nz < 0 || nz >= env.chunkSize) return false;
                            return !maze || maze[nx][nz];
                        };
                        const vW = checkVoid(localX - 1, localZ);
                        const vE = checkVoid(localX + 1, localZ);
                        const vN = checkVoid(localX, localZ - 1);
                        const vS = checkVoid(localX, localZ + 1);
                        if (vW) {
                            const extN = !vN, extS = !vS;
                            const len = env.cellSize + (extN ? 0.2 : 0) + (extS ? 0.2 : 0);
                            const cz = (extS ? 0.1 : 0) - (extN ? 0.1 : 0);
                            const railing = buildWall(0.15, len, env.rustMat, 1.2);
                            railing.position.set(gx - 1.8, 0.6, gz + cz);
                            addGeometry(railing);
                        }
                        if (vE) {
                            const extN = !vN, extS = !vS;
                            const len = env.cellSize + (extN ? 0.2 : 0) + (extS ? 0.2 : 0);
                            const cz = (extS ? 0.1 : 0) - (extN ? 0.1 : 0);
                            const railing = buildWall(0.15, len, env.rustMat, 1.2);
                            railing.position.set(gx + 1.8, 0.6, gz + cz);
                            addGeometry(railing);
                        }
                        if (vN) {
                            const extW = !vW, extE = !vE;
                            const len = env.cellSize + (extW ? 0.2 : 0) + (extE ? 0.2 : 0);
                            const cx = (extE ? 0.1 : 0) - (extW ? 0.1 : 0);
                            const railing = buildWall(len, 0.15, env.rustMat, 1.2);
                            railing.position.set(gx + cx, 0.6, gz - 1.8);
                            addGeometry(railing);
                        }
                        if (vS) {
                            const extW = !vW, extE = !vE;
                            const len = env.cellSize + (extW ? 0.2 : 0) + (extE ? 0.2 : 0);
                            const cx = (extE ? 0.1 : 0) - (extW ? 0.1 : 0);
                            const railing = buildWall(len, 0.15, env.rustMat, 1.2);
                            railing.position.set(gx + cx, 0.6, gz + 1.8);
                            addGeometry(railing);
                        }
                        const addCornerPost = (px, pz) => {
                            const post = buildWall(0.3, 0.3, env.rustMat, 1.2);
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
                        if (random() > 0.78) {
                            const lampMat = env.baseLightMat.clone();
                            lampMat.color.setHex(0xff2200);
                            lampMat.emissive.setHex(0xff0000);
                            const edge = 1.7;
                            let ex = checkVoid(localX - 1, localZ) ? -edge : (checkVoid(localX + 1, localZ) ? edge : 0);
                            let ez = 0;
                            if (ex === 0) ez = checkVoid(localX, localZ - 1) ? -edge : (checkVoid(localX, localZ + 1) ? edge : 0);
                            const post = buildWall(0.12, 0.12, env.rustMat, 0.5);
                            post.position.set(gx + ex, 0.25, gz + ez);
                            addGeometry(post);
                            const lamp = buildWall(0.28, 0.28, lampMat, 0.3);
                            lamp.position.set(gx + ex, 0.6, gz + ez);
                            lamp.userData.chunkHash = hash;
                            chunkGroup.add(lamp);
                            lamp.updateMatrixWorld(true);
                            env.walls.push(lamp);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(gx + ex, 0.55, gz + ez),
                                flickerOffset: random() * 500,
                                material: lampMat,
                                isFaulty: random() > 0.75,
                                baseIntensity: 2.4,
                                targetIntensity: 2.4,
                                currentIntensity: 2.4
                            });
                        }
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
                                const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
                                for (let i = band.length - 1; i > 0; i--) {
                                    const j = Math.floor(rng() * (i + 1));
                                    const t = band[i]; band[i] = band[j]; band[j] = t;
                                }
                                const want = Math.min(band.length, 3 + ((hash >>> 3) % 3));
                                for (let k = 0; k < want; k++) set.add(band[k]);
                            }
                            env._chasmPillarSet = set;
                        }
                        const guaranteed = env._chasmPillarSet.has(localX * env.chunkSize + localZ);
                        const scatter = random() > 0.90;
                        const inBand = localX > 2 && localX < 12 && localZ > 2 && localZ < 12;
                        if (guaranteed || (scatter && inBand)) {
                            const pw = 1.8 + random() * 1.5;
                            const pillar = buildWall(pw, pw, env.rustMat, 80.0);
                            pillar.position.set(gx, -30.0, gz);
                            addGeometry(pillar);
                            const isVoidCell = (nx, nz) =>
                                (nx < 0 || nx >= env.chunkSize || nz < 0 || nz >= env.chunkSize)
                                    ? true : (!maze || maze[nx][nz]);
                            let ox = 0, oz = 0;
                            const nb = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                            for (let n = 0; n < nb.length; n++) {
                                if (!isVoidCell(localX + nb[n][0], localZ + nb[n][1])) { ox = nb[n][0]; oz = nb[n][1]; break; }
                            }
                            if (ox === 0 && oz === 0) ox = localX < 7 ? 1 : -1;
                            const off = pw / 2 + 0.5;
                            const canX = gx + ox * off, canZ = gz + oz * off;
                            const upMat = env.baseLightMat.clone();
                            upMat.color.setHex(0xff3a00);
                            upMat.emissive.setHex(0xff2200);
                            const can = new THREE.Mesh(env._boxGeo(0.4, 0.25, 0.4), upMat);
                            can.position.set(canX, 0.35, canZ);
                            can.userData.chunkHash = hash;
                            chunkGroup.add(can);
                            can.updateMatrixWorld(true);
                            env.walls.push(can);
                            env.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(canX, 1.2, canZ),
                                flickerOffset: random() * 500,
                                material: upMat,
                                isFaulty: false,
                                baseIntensity: 3.0,
                                targetIntensity: 3.0,
                                currentIntensity: 3.0
                            });
                        }
                    }
                }
            };
};
