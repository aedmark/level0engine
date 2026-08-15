import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {placeSectorPaper} from '../NarrativeProps.js';
import * as OfficeFurniture from '../OfficeFurniture.js';

export const ServerSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;
    if (!env.benchTopMat) {
        env.benchTopMat = new THREE.MeshStandardMaterial({color: 0x3d4a52, roughness: 0.6, metalness: 0.3});
        if (env.sharedAssets) env.sharedAssets.add(env.benchTopMat.uuid);
    }
    if (!env.cabinetMat) {
        env.cabinetMat = new THREE.MeshStandardMaterial({color: 0x5c6570, roughness: 0.55, metalness: 0.4});
        if (env.sharedAssets) env.sharedAssets.add(env.cabinetMat.uuid);
    }
    if (!env.pegboardMat) {
        env.pegboardMat = new THREE.MeshStandardMaterial({
            map: env.pegboardTex,
            roughness: 0.9,
            bumpMap: env.pegboardTex,
            bumpScale: 0.05
        });
        if (env.sharedAssets) env.sharedAssets.add(env.pegboardMat.uuid);
    }
    const buildWorkbench = (px, pz, faceYaw) => {
        const bench = new THREE.Group();
        const top = new THREE.Mesh(env._boxGeo(1.6, 0.08, 0.7), env.benchTopMat);
        top.position.y = 0.9;
        bench.add(top);
        const legGeo = env._boxGeo(0.06, 0.86, 0.06);
        for (const lx of [-1, 1]) {
            for (const lz of [-1, 1]) {
                const leg = new THREE.Mesh(legGeo, env.metalMat);
                leg.position.set(lx * 0.72, 0.43, lz * 0.28);
                bench.add(leg);
            }
        }
        const lowerShelf = new THREE.Mesh(env._boxGeo(1.5, 0.05, 0.6), env.benchTopMat);
        lowerShelf.position.y = 0.32;
        bench.add(lowerShelf);
        const pegboard = new THREE.Mesh(env._boxGeo(1.4, 1.0, 0.04), env.pegboardMat);
        pegboard.position.set(0, 1.75, -0.34);
        bench.add(pegboard);
        const toolGeo = env._boxGeo(0.06, 0.34, 0.03);
        for (let i = 0; i < 3; i++) {
            if (random() > 0.4) {
                const tool = new THREE.Mesh(toolGeo, env.metalMat);
                tool.position.set(-0.5 + i * 0.5, 1.78, -0.36);
                tool.rotation.z = (random() - 0.5) * 0.3;
                bench.add(tool);
            }
        }
        bench.position.set(px, 0, pz);
        bench.rotation.y = faceYaw;
        chunkGroup.add(bench);
    };

    return {
        id: "SERVER",
        foundationMat: env.serverFloorMat,
        ceilingMat: env.serverCeilingMat,
        build: (x, z, localX, localZ, maze) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.structMat, "SERVER")) {
                const edge = env.chunkSize - 1;
                const isDoorwayNS = (localZ === 0 || localZ === edge) && localX === 7;
                const isDoorwayEW = (localX === 0 || localX === edge) && localZ === 7;
                const isShoulderNS = (localZ === 0 || localZ === edge) && (localX === 6 || localX === 8);
                const isShoulderEW = (localX === 0 || localX === edge) && (localZ === 6 || localZ === 8);
                const isCorner = (localX === 0 || localX === edge) && (localZ === 0 || localZ === edge);
                const isPlainPerimeterWall = !isDoorwayNS && !isDoorwayEW && !isShoulderNS && !isShoulderEW && !isCorner;
                if (isPlainPerimeterWall && random() > 0.45) {
                    let faceYaw, ix, iz;
                    if (localX === 0) {
                        faceYaw = Math.PI / 2;
                        ix = 1;
                        iz = 0;
                    } else if (localX === edge) {
                        faceYaw = -Math.PI / 2;
                        ix = -1;
                        iz = 0;
                    } else if (localZ === 0) {
                        faceYaw = 0;
                        ix = 0;
                        iz = 1;
                    } else {
                        faceYaw = Math.PI;
                        ix = 0;
                        iz = -1;
                    }
                    if (maze && maze[localX + ix] && maze[localX + ix][localZ + iz]) {
                        return;
                    }
                    const inset = (env.cellSize / 2) + 0.45;
                    const px = x * env.cellSize + ix * inset;
                    const pz = z * env.cellSize + iz * inset;
                    if (random() > 0.5) buildWorkbench(px, pz, faceYaw);
                    else addFurniture(OfficeFurniture.buildFilingCabinet(env, random, px, 0, pz, faceYaw));
                }
                return;
            }
            const isWall = maze && maze[localX][localZ];
            if (isWall) {
                const edge = env.chunkSize - 1;
                const isNearDoorNS = (localZ === 1 || localZ === edge - 1) && (localX >= 6 && localX <= 8);
                const isNearDoorEW = (localX === 1 || localX === edge - 1) && (localZ >= 6 && localZ <= 8);
                if (!isNearDoorNS && !isNearDoorEW) {
                    const rack = buildWall(env.cellSize * 0.85, env.cellSize * 0.85, env.serverMat);
                    rack.position.set(x * env.cellSize, 1.5, z * env.cellSize);
                    rack.userData.isEntityBlocker = true;
                    addGeometry(rack);
                }
            } else {
                placeSectorPaper(env, ctx, "SERVER", x * env.cellSize, z * env.cellSize);
                const openE = localX < env.chunkSize - 1 ? !maze[localX + 1][localZ] : !maze[localX][localZ];
                const openS = localZ < env.chunkSize - 1 ? !maze[localX][localZ + 1] : !maze[localX][localZ];
                const openN = localZ > 0 ? !maze[localX][localZ - 1] : !maze[localX][localZ];
                const openW = localX > 0 ? !maze[localX - 1][localZ] : !maze[localX][localZ];
                const offset = 0.9;
                env._buildPipeCornerDressing(chunkGroup, addGeometry, random, x, z, openE, openS, openN, openW, offset, 2.75, 2.9, 2.75);
                if (random() > 0.85) {
                    const propType = random();
                    const ox = x * env.cellSize;
                    const oz = z * env.cellSize;
                    const rx = ox + (random() - 0.5) * 1.4;
                    const rz = oz + (random() - 0.5) * 1.4;
                    const ry = random() * Math.PI;
                    if (propType < 0.33) {
                        const pallet = env._buildPallet();
                        pallet.position.set(rx, 0, rz);
                        pallet.rotation.y = ry;
                        chunkGroup.add(pallet);
                    } else if (propType < 0.66) {
                        const spool = new THREE.Group();
                        if (!env.cat6Mat) {
                            env.cat6Mat = new THREE.MeshStandardMaterial({color: 0x2266ff, roughness: 0.6});
                            if (env.sharedAssets) env.sharedAssets.add(env.cat6Mat.uuid);
                        }
                        if (!env.spoolWoodMat) {
                            env.spoolWoodMat = new THREE.MeshStandardMaterial({color: 0xaa8866, roughness: 0.8});
                            if (env.sharedAssets) env.sharedAssets.add(env.spoolWoodMat.uuid);
                        }
                        const capGeo = env._cacheGeo('spoolCap', () => new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16));
                        const coreGeo = env._cacheGeo('spoolCore', () => new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16));
                        const cap1 = new THREE.Mesh(capGeo, env.spoolWoodMat);
                        cap1.position.y = 0.31;
                        const cap2 = new THREE.Mesh(capGeo, env.spoolWoodMat);
                        cap2.position.y = -0.31;
                        const cable = new THREE.Mesh(coreGeo, env.cat6Mat);
                        spool.add(cap1, cap2, cable);
                        if (random() > 0.5) {
                            spool.rotation.z = Math.PI / 2;
                            spool.position.set(rx, 0.55, rz);
                        } else {
                            spool.position.set(rx, 0.34, rz);
                        }
                        spool.rotation.y = ry;
                        chunkGroup.add(spool);
                    } else {
                        const cart = new THREE.Group();
                        if (!env.cartMat) {
                            env.cartMat = new THREE.MeshStandardMaterial({
                                color: 0x222222,
                                metalness: 0.6,
                                roughness: 0.7
                            });
                            if (env.sharedAssets) env.sharedAssets.add(env.cartMat.uuid);
                        }
                        const shelfGeo = env._boxGeo(1.1, 0.06, 0.7);
                        for (let i = 0; i < 3; i++) {
                            const shelf = new THREE.Mesh(shelfGeo, env.cartMat);
                            shelf.position.y = 0.28 + (i * 0.55);
                            cart.add(shelf);
                        }
                        const legGeo = env._boxGeo(0.05, 1.4, 0.05);
                        const positions = [[0.52, 0.32], [-0.52, 0.32], [0.52, -0.32], [-0.52, -0.32]];
                        positions.forEach(p => {
                            const leg = new THREE.Mesh(legGeo, env.cartMat);
                            leg.position.set(p[0], 0.7, p[1]);
                            cart.add(leg);
                        });
                        if (random() > 0.5) {
                            const crt = new THREE.Mesh(env._boxGeo(0.55, 0.4, 0.55), env.baseHousingMat);
                            crt.position.set(0, 1.61, 0);
                            cart.add(crt);
                        }
                        cart.position.set(rx, 0, rz);
                        cart.rotation.y = ry;
                        chunkGroup.add(cart);
                    }
                }
                if (random() > 0.78) {
                    if (!env.cableMats) {
                        const palette = [0x141414, 0x2b2b2b, 0x2266ff, 0xd4c419, 0xb52020, 0xd97a1f, 0xd8d8d8, 0x2f8f4e];
                        env.cableMats = palette.map(c => {
                            const m = new THREE.MeshStandardMaterial({color: c, roughness: 0.85});
                            if (env.sharedAssets) env.sharedAssets.add(m.uuid);
                            return m;
                        });
                    }
                    if (!env.cableEnergizedMat) {
                        env.cableEnergizedMat = new THREE.MeshStandardMaterial({
                            color: 0xbdf6ff, emissive: 0x6be8ff, emissiveIntensity: 2.2, roughness: 0.3
                        });
                        if (env.sharedAssets) env.sharedAssets.add(env.cableEnergizedMat.uuid);
                    }
                    const pickCableMat = () => env.cableMats[Math.floor(random() * env.cableMats.length)];
                    const wireGeo = env._cacheGeo('hangCableSeg', () => new THREE.CylinderGeometry(0.018, 0.018, 1, 6));
                    const hx = x * env.cellSize + (random() - 0.5) * 1.6;
                    const hz = z * env.cellSize + (random() - 0.5) * 1.6;
                    const registerCable = (mesh, midpoint) => {
                        env.hangingCables.push({
                            chunkHash: hash,
                            position: midpoint,
                            mesh: mesh,
                            material: mesh.material,
                            lit: false
                        });
                    };
                    const straightDrop = (px, pz, len) => {
                        const seg = new THREE.Mesh(wireGeo, pickCableMat());
                        seg.scale.y = len;
                        const midY = 3.0 - len / 2;
                        seg.position.set(px, midY, pz);
                        chunkGroup.add(seg);
                        registerCable(seg, new THREE.Vector3(px, midY, pz));
                    };
                    const looseDrop = (px, pz, len) => {
                        const driftX = (random() - 0.5) * 0.7;
                        const driftZ = (random() - 0.5) * 0.7;
                        const segs = 4;
                        const pts = [];
                        for (let i = 0; i <= segs; i++) {
                            const t = i / segs;
                            const ease = t * t;
                            pts.push(new THREE.Vector3(
                                px + driftX * ease + (random() - 0.5) * 0.05,
                                3.0 - len * t,
                                pz + driftZ * ease + (random() - 0.5) * 0.05
                            ));
                        }
                        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.018, 5, false);
                        const mesh = new THREE.Mesh(geo, pickCableMat());
                        chunkGroup.add(mesh);
                        registerCable(mesh, pts[Math.floor(pts.length / 2)].clone());
                    };
                    const swag = (px, pz) => {
                        const dx = (random() - 0.5) * 1.6;
                        const dz = (random() - 0.5) * 1.6;
                        const sag = 0.5 + random() * 1.0;
                        const segs = 6;
                        const pts = [];
                        for (let i = 0; i <= segs; i++) {
                            const t = i / segs;
                            pts.push(new THREE.Vector3(
                                px + dx * t,
                                3.0 - 4 * sag * t * (1 - t),
                                pz + dz * t
                            ));
                        }
                        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.018, 5, false);
                        const mesh = new THREE.Mesh(geo, pickCableMat());
                        chunkGroup.add(mesh);
                        registerCable(mesh, pts[Math.floor(pts.length / 2)].clone());
                    };
                    const strands = 1 + Math.floor(random() * 3);
                    for (let s = 0; s < strands; s++) {
                        const jx = hx + (random() - 0.5) * 0.3;
                        const jz = hz + (random() - 0.5) * 0.3;
                        const arrangement = random();
                        if (arrangement < 0.4) {
                            straightDrop(jx, jz, 0.6 + random() * 1.6);
                        } else if (arrangement < 0.75) {
                            looseDrop(jx, jz, 0.8 + random() * 1.6);
                        } else {
                            swag(jx, jz);
                        }
                    }
                    const stub = new THREE.Mesh(env._boxGeo(0.18, 0.1, 0.18), env.rustMat);
                    stub.position.set(hx, 2.95, hz);
                    chunkGroup.add(stub);
                }
                if (random() > 0.8) {
                    let rotY;
                    if ((openN || openS) && !(openE || openW)) rotY = Math.PI / 2;
                    else if ((openE || openW) && !(openN || openS)) rotY = 0;
                    else rotY = random() > 0.5 ? Math.PI / 2 : 0;
                    env._buildCheckpointCageLight(
                        chunkGroup, hash, stagingMeshes,
                        x * env.cellSize, z * env.cellSize,
                        rotY,
                        random() * 500,
                        random() > 0.6,
                        ctx.getLightMaterial,
                        0xE273FF, 0xC963FF, 1.0
                    );
                }
            }
        }
    };
};