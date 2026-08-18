import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {placeSectorPaper} from '../NarrativeProps.js';
import {attachPropGlow} from '../PropGlow.js';

export const AtriumSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        chunkGroup,
        hash
    } = ctx;
    const TIER_STEP = 2.8;
    const TIER_BASE = 4.2;
    const TIER_COUNT = 14;
    const TOP_TIER_Y = TIER_BASE + (TIER_COUNT - 1) * TIER_STEP;
    const STRUCTURE_TOP_Y = TOP_TIER_Y + 15.0;
    const VENDING_GLOW = 2.2;
    const VENDING_REACH = 13.0;
    const VENDING_INTENSITY = 2.4;
    if (!env.matrixVoidMat) {
        env.matrixVoidMat = new THREE.MeshBasicMaterial({color: 0xffffff});
    }
    if (!env.blackIronMat) {
        env.blackIronMat = new THREE.MeshStandardMaterial({color: 0x151515, roughness: 0.7, metalness: 0.9});
    }
    if (!env.productBoxMats) {
        env.productBoxMats = [
            new THREE.MeshStandardMaterial({color: 0xc9b78a, roughness: 0.9}),
            new THREE.MeshStandardMaterial({color: 0x8a3a3a, roughness: 0.7}),
            new THREE.MeshStandardMaterial({color: 0x3a5a45, roughness: 0.7}),
            new THREE.MeshStandardMaterial({color: 0x35496b, roughness: 0.7}),
            new THREE.MeshStandardMaterial({color: 0xd9d2b8, roughness: 0.85})
        ];
    }
    if (!env.cartLatticeMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx2d = canvas.getContext('2d', {alpha: false});
        ctx2d.fillStyle = '#000000';
        ctx2d.fillRect(0, 0, 64, 64);
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 0, 64, 8);
        ctx2d.fillRect(0, 0, 8, 64);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        env.cartLatticeMat = new THREE.MeshStandardMaterial({
            color: env.paintedSteelMat ? env.paintedSteelMat.color : 0x777777,
            roughness: 0.3,
            metalness: 0.8,
            alphaMap: tex,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        if (env.sharedAssets) env.sharedAssets.add(env.cartLatticeMat.uuid);
    }
    if (!env.soupCanMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx2d = canvas.getContext('2d', {alpha: false});
        ctx2d.fillStyle = '#999999'; 
        ctx2d.fillRect(0, 0, 128, 128);
        ctx2d.fillStyle = '#cc2222'; 
        ctx2d.fillRect(0, 20, 128, 44);
        ctx2d.fillStyle = '#ffffff'; 
        ctx2d.fillRect(0, 64, 128, 44);
        ctx2d.fillStyle = '#000000';
        ctx2d.font = 'bold 24px monospace';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('SOUP', 64, 52);
        const tex = new THREE.CanvasTexture(canvas);
        env.soupCanMat = new THREE.MeshStandardMaterial({
            map: tex, roughness: 0.4, metalness: 0.5
        });
        if (env.sharedAssets) env.sharedAssets.add(env.soupCanMat.uuid);
    }
    if (!env.brownPaperMat) {
        env.brownPaperMat = new THREE.MeshStandardMaterial({
            color: 0x8b6546, roughness: 0.9, bumpMap: env.carpetMat ? env.carpetMat.map : null, bumpScale: 0.05,
            side: THREE.DoubleSide
        });
    }
    if (!env.flyerMat) {
        env.flyerMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd, roughness: 0.8
        });
    }
    const inAisleMaze = (maze, nx, nz) => nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze[nx][nz];
    const aisleRunOrientation = (maze, lx, lz) => {
        const zR = inAisleMaze(maze, lx, lz - 1) || inAisleMaze(maze, lx, lz + 1);
        const xR = inAisleMaze(maze, lx - 1, lz) || inAisleMaze(maze, lx + 1, lz);
        return zR && !xR ? true : (xR && !zR ? false : ((lx + lz) % 2 === 0));
    };
    const AISLE_DETAIL_TOP_Y = 2.92;
    const SMEAR_TOP_Y = STRUCTURE_TOP_Y;
    const SMEAR_SOURCE_SPAN = 1.15;
    const SMEAR_SEGMENTS = 24;
    const smearGeo = (alongZ, runSpan) => env._cacheGeo(`atriumSmear_${alongZ ? 'z' : 'x'}`, () => {
        const h = SMEAR_TOP_Y - AISLE_DETAIL_TOP_Y;
        const g = new THREE.BoxGeometry(
            alongZ ? 0.92 : runSpan, h, alongZ ? runSpan : 0.92, 1, SMEAR_SEGMENTS, 1);
        const pos = g.attributes.position;
        const uv = g.attributes.uv;
        const col = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
            const rise = pos.getY(i) + h / 2;
            uv.setY(i, rise / SMEAR_SOURCE_SPAN);
            const fade = Math.pow(Math.max(0, 1 - rise / h), 1.7);
            col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = fade;
        }
        uv.needsUpdate = true;
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
    });

    const buildAisleWallSegment = (maze, localX, localZ, acx, acz) => {
        const alongZ = aisleRunOrientation(maze, localX, localZ);
        const runSpan = env.cellSize;
        const continuesNeg = alongZ
            ? (inAisleMaze(maze, localX, localZ - 1) && aisleRunOrientation(maze, localX, localZ - 1) === true)
            : (inAisleMaze(maze, localX - 1, localZ) && aisleRunOrientation(maze, localX - 1, localZ) === false);
        const continuesPos = alongZ
            ? (inAisleMaze(maze, localX, localZ + 1) && aisleRunOrientation(maze, localX, localZ + 1) === true)
            : (inAisleMaze(maze, localX + 1, localZ) && aisleRunOrientation(maze, localX + 1, localZ) === false);
        const openNeg = !continuesNeg;
        const openPos = !continuesPos;
        const capOffset = runSpan / 2 - 0.03;
        const frameMat = env.shelfMat || env.metalMat;
        const heights = [0.05, 0.85, 1.6, 2.3];
        for (let side = -1; side <= 1; side += 2) {
            const sx = acx + (alongZ ? side * 0.7 : 0);
            const sz = acz + (alongZ ? 0 : side * 0.7);
            for (let e = -1; e <= 1; e += 2) {
                if (e < 0 ? !openNeg : !openPos) continue;
                const upright = buildWall(alongZ ? 1.0 : 0.12, alongZ ? 0.12 : 1.0, frameMat, 3.0);
                upright.position.set(sx + (alongZ ? 0 : e * capOffset), 1.5, sz + (alongZ ? e * capOffset : 0));
                addGeometry(upright);
            }
            const spine = buildWall(alongZ ? 0.08 : runSpan, alongZ ? runSpan : 0.08, frameMat, 3.0);
            spine.position.set(sx, 1.5, sz);
            spine.userData.isEntityBlocker = true;
            addGeometry(spine);
            for (const shelfY of heights) {
                const board = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, frameMat, 0.06);
                board.position.set(sx, shelfY, sz);
                addGeometry(board);
                const boxCount = 2 + Math.floor(random() * 3);
                const slotSpan = runSpan - 0.6;
                const slotWidth = slotSpan / boxCount;
                const jitterRange = Math.max(0, slotWidth - 0.5);
                for (let i = 0; i < boxCount; i++) {
                    const mat = env.productBoxMats[Math.floor(random() * env.productBoxMats.length)];
                    const box = new THREE.Mesh(env._cacheGeo('aisleProductBox', () => new THREE.BoxGeometry(0.425, 0.35, 0.425)), mat);
                    const slide = -slotSpan / 2 + slotWidth * (i + 0.5) + (random() - 0.5) * jitterRange;
                    box.position.set(
                        sx + (alongZ ? side * 0.2 : slide),
                        shelfY + 0.175,
                        sz + (alongZ ? slide : side * 0.2)
                    );
                    box.rotation.y = random() * Math.PI * 2;
                    addGeometry(box);
                }
            }
            const cap = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, frameMat, 0.06);
            cap.position.set(sx, AISLE_DETAIL_TOP_Y, sz);
            addGeometry(cap);
            const smear = new THREE.Mesh(smearGeo(alongZ, runSpan), env.atriumSmearMat);
            smear.position.set(sx, AISLE_DETAIL_TOP_Y + (SMEAR_TOP_Y - AISLE_DETAIL_TOP_Y) / 2, sz);
            smear.userData.chunkHash = hash;
            smear.updateMatrixWorld(true);
            ctx.stagingMeshes.push(smear);
        }
    };
    const buildVendingMachine = (cx, cz) => {
        const bodyGeo = env._cacheGeo('vendingBody', () => new THREE.BoxGeometry(1.44, 2.4, 1.2));
        const body = new THREE.Mesh(bodyGeo, env.blackIronMat);
        body.position.set(cx, 1.2, cz);
        const rotY = Math.floor(random() * 4) * (Math.PI / 2);
        body.rotation.y = rotY;
        body.userData.isEntityBlocker = true;
        body.userData.chunkHash = hash;
        body.castShadow = true;
        body.receiveShadow = true;

        if (!env.vendingPanelMat) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 512;
            const ctx2d = canvas.getContext('2d', {alpha: false});
            ctx2d.fillStyle = '#ccffff';
            ctx2d.fillRect(0, 0, 256, 512);
            ctx2d.fillStyle = '#ff3333';
            ctx2d.font = 'bold 50px monospace';
            ctx2d.textAlign = 'center';
            ctx2d.fillText('SODA', 128, 80);
            ctx2d.fillStyle = '#1155cc';
            ctx2d.fillRect(80, 150, 96, 160);
            ctx2d.fillStyle = '#aaaaaa';
            ctx2d.beginPath();
            ctx2d.ellipse(128, 150, 48, 16, 0, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.beginPath();
            ctx2d.ellipse(128, 310, 48, 16, 0, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.fillStyle = '#ffffff';
            ctx2d.font = 'bold 24px monospace';
            ctx2d.fillText('COLA', 128, 240);
            ctx2d.fillStyle = '#111111';
            ctx2d.fillRect(200, 100, 40, 300); 
            for(let i=0; i<6; i++) {
                ctx2d.fillStyle = '#555555';
                ctx2d.fillRect(208, 120 + i*40, 24, 20); 
            }
            ctx2d.fillStyle = '#000000';
            ctx2d.fillRect(216, 380, 8, 24); 
            ctx2d.fillStyle = '#0a0a0a';
            ctx2d.fillRect(20, 400, 216, 80);
            const tex = new THREE.CanvasTexture(canvas);
            env.vendingPanelMat = new THREE.MeshStandardMaterial({
                map: tex,
                emissiveMap: tex,
                color: 0xffffff,
                emissive: 0xd8f2ff,
                emissiveIntensity: VENDING_GLOW,
                roughness: 0.2
            });
            if (env.sharedAssets) env.sharedAssets.add(env.vendingPanelMat.uuid);
        }

        if (!env.vendingPanelGeo) {
            env.vendingPanelGeo = env._cacheGeo('vendingPanel', () => new THREE.PlaneGeometry(1.44, 2.4));
        }
        const panel = new THREE.Mesh(env.vendingPanelGeo, env.vendingPanelMat);
        panel.position.set(0, 0, 0.605);
        panel.userData.chunkHash = hash;
        body.add(panel);

        chunkGroup.add(body);
        body.updateMatrixWorld(true);
        if (!bodyGeo.boundingBox) bodyGeo.computeBoundingBox();
        const collider = bodyGeo.boundingBox.clone().applyMatrix4(body.matrixWorld);
        collider.chunkHash = hash;
        collider.isEntityBlocker = true;
        env.spatialGrid.insert(collider);
        env.walls.push(body);

        const outX = Math.sin(rotY);
        const outZ = Math.cos(rotY);
        const lampX = cx + outX * 0.85;
        const lampZ = cz + outZ * 0.85;
        const LAMP_Y = 1.35;
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(lampX, LAMP_Y, lampZ),
            isSpot: true,
            targetPos: new THREE.Vector3(lampX + outX * 4.0, LAMP_Y, lampZ + outZ * 4.0),
            spotAngle: Math.PI / 2.15,
            spotPenumbra: 1.0,
            flickerOffset: random() * 500,
            material: env.vendingPanelMat,
            isFaulty: false,
            emissiveIntensity: VENDING_GLOW,
            distance: VENDING_REACH,
            baseIntensity: VENDING_INTENSITY,
            targetIntensity: VENDING_INTENSITY,
            currentIntensity: VENDING_INTENSITY
        });

        attachPropGlow(env, body, hash, {
            color: 0xccffff,
            intensity: VENDING_INTENSITY,
            distance: VENDING_REACH,
            offset: [0, 0.48, 0.72],
            flickerOffset: random() * 500
        });
    };
    const buildShoppingCart = (cx, cz, overturned = false) => {
        const cart = new THREE.Group();
        const frameMat = env.paintedSteelMat || env.metalMat;
        const latticeMat = env.cartLatticeMat;
        
        const bottomGeo = env._cacheGeo('cartBottom', () => new THREE.BoxGeometry(0.5, 0.02, 0.7));
        const bottom = new THREE.Mesh(bottomGeo, latticeMat);
        bottom.position.set(0, 0.25, 0);
        cart.add(bottom);
        
        const sideZGeo = env._cacheGeo('cartSideZ', () => new THREE.BoxGeometry(0.5, 0.45, 0.02));
        const sideXGeo = env._cacheGeo('cartSideX', () => new THREE.BoxGeometry(0.02, 0.45, 0.7));
        const front = new THREE.Mesh(sideZGeo, latticeMat);
        front.position.set(0, 0.485, 0.34);
        cart.add(front);
        const back = new THREE.Mesh(sideZGeo, latticeMat);
        back.position.set(0, 0.485, -0.34);
        cart.add(back);
        const left = new THREE.Mesh(sideXGeo, latticeMat);
        left.position.set(0.24, 0.485, 0);
        cart.add(left);
        const right = new THREE.Mesh(sideXGeo, latticeMat);
        right.position.set(-0.24, 0.485, 0);
        cart.add(right);
        
        const underGeo = env._cacheGeo('cartUnder', () => new THREE.BoxGeometry(0.4, 0.02, 0.6));
        const under = new THREE.Mesh(underGeo, frameMat);
        under.position.set(0, 0.12, -0.05);
        cart.add(under);
        
        const strutGeo = env._cacheGeo('cartStrut', () => new THREE.CylinderGeometry(0.015, 0.015, 0.13, 6));
        const positions = [[0.18, 0.23], [-0.18, 0.23], [0.18, -0.33], [-0.18, -0.33]];
        for (const [sx, sz] of positions) {
            const strut = new THREE.Mesh(strutGeo, frameMat);
            strut.position.set(sx, 0.185, sz);
            cart.add(strut);
        }
        
        const wheelGeo = env._cacheGeo('cartWheel', () => {
            const w = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8);
            w.rotateZ(Math.PI / 2);
            return w;
        });
        for (const wx of [-0.18, 0.18]) {
            for (const wz of [-0.33, 0.23]) {
                const wheel = new THREE.Mesh(wheelGeo, env.blackIronMat);
                wheel.position.set(wx, 0.05, wz);
                cart.add(wheel);
            }
        }
        
        const hSupportGeo = env._cacheGeo('cartHSupport', () => {
            const g = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6);
            g.rotateX(-Math.PI / 6);
            return g;
        });
        const hS1 = new THREE.Mesh(hSupportGeo, frameMat);
        hS1.position.set(0.24, 0.78, -0.4);
        cart.add(hS1);
        const hS2 = new THREE.Mesh(hSupportGeo, frameMat);
        hS2.position.set(-0.24, 0.78, -0.4);
        cart.add(hS2);
        
        const hBarGeo = env._cacheGeo('cartHBar', () => {
            const g = new THREE.CylinderGeometry(0.02, 0.02, 0.48, 8);
            g.rotateZ(Math.PI / 2);
            return g;
        });
        const handleBar = new THREE.Mesh(hBarGeo, env.blackIronMat);
        handleBar.position.set(0, 0.88, -0.46);
        cart.add(handleBar);
        
        cart.position.set(cx, 0, cz);
        cart.rotation.y = random() * Math.PI * 2;
        if (overturned) {
            cart.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.2;
            cart.position.y = 0.45;
        }
        cart.scale.set(1.4, 1.4, 1.4);
        cart.userData.chunkHash = hash;
        env.walls.push(cart);
        ctx.addFurniture(cart);
        
        cart.updateMatrixWorld(true);
        const collider = new THREE.Box3().setFromObject(cart);
        collider.chunkHash = hash;
        collider.isEntityBlocker = true;
        env.spatialGrid.insert(collider);
    };

    const soupCanGeo = env._cacheGeo('soupCan', () => new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12));
    const sackGeo = env._cacheGeo('sackGeo', () => {
        const g = new THREE.BoxGeometry(0.3125, 0.5625, 0.25, 2, 2, 2);
        
        const indices = g.getIndex().array;
        const normals = g.getAttribute('normal').array;
        const newIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const idx = indices[i];
            const ny = normals[idx * 3 + 1];
            if (ny < 0.5) { 
                newIndices.push(indices[i], indices[i+1], indices[i+2]);
            }
        }
        g.setIndex(newIndices);
        
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) {
                pos.setX(i, pos.getX(i) * 0.85);
                pos.setZ(i, pos.getZ(i) * 0.85);
            }
            pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.02);
            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.02);
        }
        g.computeVertexNormals();
        return g;
    });
    const flyerGeo = env._cacheGeo('flyerGeo', () => {
        const g = new THREE.PlaneGeometry(0.15, 0.2);
        g.rotateX(-Math.PI / 2);
        return g;
    });

    const buildScatteredCans = (cx, cz) => {
        const count = 2 + Math.floor(random() * 4);
        for (let i = 0; i < count; i++) {
            const can = new THREE.Mesh(soupCanGeo, env.soupCanMat);
            can.position.set(cx + (random() - 0.5) * 0.8, 0, cz + (random() - 0.5) * 0.8);
            if (random() > 0.5) {
                can.position.y = 0.06;
                can.rotation.y = random() * Math.PI;
            } else {
                can.position.y = 0.04;
                can.rotation.x = Math.PI / 2;
                can.rotation.z = random() * Math.PI;
            }
            ctx.addFurniture(can);
        }
    };

    const buildSpilledGroceries = (cx, cz) => {
        const g = new THREE.Group();
        const sack = new THREE.Mesh(sackGeo, env.brownPaperMat);
        const isUpright = random() > 0.6;
        if (isUpright) {
            sack.rotation.y = random() * Math.PI * 2;
            sack.position.set(0, 0.28125, 0);
        } else {
            sack.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3;
            sack.rotation.y = random() * Math.PI * 2;
            sack.position.set(0, 0.16, 0);
        }
        g.add(sack);
        
        const count = 3 + Math.floor(random() * 5);
        const spillDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), sack.rotation.y);
        for (let i = 0; i < count; i++) {
            const isCan = random() > 0.3;
            let mesh;
            if (isCan) {
                mesh = new THREE.Mesh(soupCanGeo, env.soupCanMat);
                mesh.position.y = 0.05;
                mesh.rotation.x = Math.PI / 2;
                mesh.rotation.z = random() * Math.PI;
            } else {
                const mat = env.productBoxMats[Math.floor(random() * env.productBoxMats.length)];
                mesh = new THREE.Mesh(env._cacheGeo('aisleProductBox', () => new THREE.BoxGeometry(0.425, 0.35, 0.425)), mat);
                mesh.scale.set(0.6, 0.6, 0.6);
                mesh.position.y = 0.1;
                mesh.rotation.x = (Math.floor(random() * 4) * Math.PI / 2) + (random() > 0.5 ? Math.PI/2 : 0);
                mesh.rotation.y = random() * Math.PI;
            }
            const dist = 0.2 + random() * 0.6;
            const spread = (random() - 0.5) * 0.6;
            mesh.position.x = spillDir.x * dist + spillDir.z * spread;
            mesh.position.z = spillDir.z * dist - spillDir.x * spread;
            g.add(mesh);
        }
        g.position.set(cx, 0, cz);
        ctx.addFurniture(g);
    };

    const buildAbandonedFlyers = (cx, cz) => {
        const count = 2 + Math.floor(random() * 4);
        for (let i = 0; i < count; i++) {
            const flyer = new THREE.Mesh(flyerGeo, env.flyerMat);
            flyer.position.set(cx + (random() - 0.5) * 1.5, 0.005, cz + (random() - 0.5) * 1.5);
            flyer.rotation.y = random() * Math.PI * 2;
            ctx.addFurniture(flyer);
        }
    };

    return {
        id: "ATRIUM",
        foundationMat: env.atriumFloorMat || env.clinicMat || env.matrixVoidMat,
        build: (x, z, localX, localZ, maze) => {
            const edge = env.chunkSize - 1;
            const isDoorwayNS = (localZ === 0 || localZ === edge) && localX === 7;
            const isDoorwayEW = (localX === 0 || localX === edge) && localZ === 7;
            const isShoulderNS = (localZ === 0 || localZ === edge) && (localX === 6 || localX === 8);
            const isShoulderEW = (localX === 0 || localX === edge) && (localZ === 6 || localZ === 8);
            const isDoorwayCell = isDoorwayNS || isDoorwayEW;
            if (ctx.buildPerimeter(x, z, localX, localZ, env.marbleMat || env.matrixVoidMat, "ATRIUM")) {
                const gx = x * env.cellSize, gz = z * env.cellSize;
                const isShoulder = isShoulderNS || isShoulderEW;
                if (!isDoorwayCell) {
                    const BAND_STEP = TIER_STEP * 2.0;
                    let wallY = isShoulder ? 3.0 : 5.0;
                    while (wallY < STRUCTURE_TOP_Y) {
                        const segH = Math.min(BAND_STEP, STRUCTURE_TOP_Y - wallY);
                        const band = buildWall(env.cellSize, env.cellSize, env.marbleMat, segH, wallY);
                        band.position.set(gx, wallY + segH / 2, gz);
                        addGeometry(band);
                        wallY += segH;
                    }
                }
                return;
            }
            if (localX === 7 && localZ === 7) {
                const gx = x * env.cellSize, gz = z * env.cellSize;
                const cx0 = gx + 2, cz0 = gz + 2;
                const innerSpan = (env.chunkSize - 2) * env.cellSize;
                const capY = TOP_TIER_Y + 25.0;
                const skyGeo = env._planeGeo(innerSpan, innerSpan);
                const sky = new THREE.Mesh(skyGeo, env.matrixVoidMat);
                sky.rotation.x = Math.PI / 2;
                sky.position.set(cx0, capY, cz0);
                ctx.chunkGroup.add(sky);
            }
            if (maze && maze[localX][localZ]) {
                if (!env.aisleCells) env.aisleCells = new Set();
                env.aisleCells.add(`${x},${z}`);
                buildAisleWallSegment(maze, localX, localZ, x * env.cellSize, z * env.cellSize);
            } else {
                const roll = random();
                if (roll > 0.95) {
                    buildVendingMachine(x * env.cellSize, z * env.cellSize);
                } else if (roll > 0.92) {
                    buildShoppingCart(x * env.cellSize, z * env.cellSize, false);
                } else if (roll > 0.89) {
                    buildShoppingCart(x * env.cellSize, z * env.cellSize, true);
                    buildScatteredCans(x * env.cellSize + (random() - 0.5) * 1.5, z * env.cellSize + (random() - 0.5) * 1.5);
                } else if (roll > 0.85) {
                    buildSpilledGroceries(x * env.cellSize, z * env.cellSize);
                } else if (roll > 0.80) {
                    buildScatteredCans(x * env.cellSize, z * env.cellSize);
                } else if (roll > 0.75) {
                    buildAbandonedFlyers(x * env.cellSize, z * env.cellSize);
                } else {
                    placeSectorPaper(env, ctx, "ATRIUM", x * env.cellSize, z * env.cellSize);
                }
            }
        }
    };
};