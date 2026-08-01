import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

/**
 * A procedural sector generator for the atrium: the interior of a shopping mall, built on
 * top of the sector's blank-white-void groundwork rather than discarding it.
 *.
 */
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
    const DETAIL_TIERS = 5;
    const TOP_TIER_Y = TIER_BASE + (TIER_COUNT - 1) * TIER_STEP;
    const STRUCTURE_TOP_Y = TOP_TIER_Y + 15.0;
    const VENDING_GLOW = 2.2;
    // The atrium runs at ambient 0.0, so these machines and the flashlight are the whole
    // lighting budget. Reach is stated explicitly rather than inherited from LumenGrid's
    // slot defaults (20.0 for the first eight, 10.0 after), because a machine that halves
    // its throw the moment a ninth fixture comes into range reads as a power fault.
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
    const buildBalconyTier = (cx0, cz0, roomHalf, y, simple) => {
        const railLen = roomHalf * 2 - 4.0;
        const cantilever = 0.9;
        const slabGeo = env._boxGeo(railLen, 0.25, cantilever);
        const railGeo = env._boxGeo(railLen, 0.08, 0.08);
        const balusterGeo = env._boxGeo(0.06, 0.85, 0.06);
        const bandGeo = env._boxGeo(railLen, 0.7, 0.05);
        const balusterCount = Math.max(4, Math.round(railLen / 2.0));
        const sides = [{nx: 0, nz: 1}, {nx: 0, nz: -1}, {nx: 1, nz: 0}, {nx: -1, nz: 0}];
        for (const s of sides) {
            const rotY = Math.atan2(s.nx, s.nz);
            const group = new THREE.Group();
            const slab = new THREE.Mesh(slabGeo, env.structMat);
            slab.position.set(0, -0.13, cantilever / 2);
            group.add(slab);
            const rail = new THREE.Mesh(railGeo, env.blackIronMat);
            rail.position.set(0, 0.9, cantilever - 0.04);
            group.add(rail);
            if (simple) {
                const band = new THREE.Mesh(bandGeo, env.blackIronMat);
                band.position.set(0, 0.45, cantilever - 0.06);
                group.add(band);
            } else {
                for (let i = 0; i <= balusterCount; i++) {
                    const bx = -railLen / 2 + i * (railLen / balusterCount);
                    const baluster = new THREE.Mesh(balusterGeo, env.blackIronMat);
                    baluster.position.set(bx, 0.45, cantilever - 0.04);
                    group.add(baluster);
                }
            }
            group.position.set(cx0 - s.nx * roomHalf, y, cz0 - s.nz * roomHalf);
            group.rotation.y = rotY;
            chunkGroup.add(group);
        }
    };
    const inAisleMaze = (maze, nx, nz) => nx >= 0 && nx < env.chunkSize && nz >= 0 && nz < env.chunkSize && maze[nx][nz];
    const aisleRunOrientation = (maze, lx, lz) => {
        const zR = inAisleMaze(maze, lx, lz - 1) || inAisleMaze(maze, lx, lz + 1);
        const xR = inAisleMaze(maze, lx - 1, lz) || inAisleMaze(maze, lx + 1, lz);
        return zR && !xR ? true : (xR && !zR ? false : ((lx + lz) % 2 === 0));
    };
    const AISLE_DETAIL_TOP_Y = 2.92;
    const AISLE_HEIGHT = 14.0;
    const AISLE_BAND_STEP = 3.2;
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
                    const box = new THREE.Mesh(env._cacheGeo('aisleProductBox', () => new THREE.BoxGeometry(0.34, 0.28, 0.34)), mat);
                    const slide = -slotSpan / 2 + slotWidth * (i + 0.5) + (random() - 0.5) * jitterRange;
                    box.position.set(
                        sx + (alongZ ? side * 0.2 : slide),
                        shelfY + 0.18,
                        sz + (alongZ ? slide : side * 0.2)
                    );
                    box.rotation.y = random() * Math.PI * 2;
                    addGeometry(box);
                }
            }
            const cap = buildWall(alongZ ? 0.96 : runSpan, alongZ ? runSpan : 0.96, frameMat, 0.06);
            cap.position.set(sx, AISLE_DETAIL_TOP_Y, sz);
            addGeometry(cap);
            let bandY = AISLE_DETAIL_TOP_Y;
            while (bandY < AISLE_HEIGHT) {
                const segH = Math.min(AISLE_BAND_STEP, AISLE_HEIGHT - bandY);
                const band = buildWall(alongZ ? 0.9 : runSpan, alongZ ? runSpan : 0.9, frameMat, segH);
                band.position.set(sx, bandY + segH / 2, sz);
                addGeometry(band);
                bandY += segH;
            }
        }
    };
    const buildVendingMachine = (cx, cz) => {
        const bodyGeo = env._cacheGeo('vendingBody', () => new THREE.BoxGeometry(1.2, 2.0, 1.0));
        const body = new THREE.Mesh(bodyGeo, env.blackIronMat);
        body.position.set(cx, 1.0, cz);
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
                // LumenGrid copies this uniform tint into the PointLight colour, not the
                // emissiveMap. Left at pure white the machine threw clinical white light
                // into a room lit by nothing else. A cold fluorescent cast is what a lamp
                // sitting behind a cyan acrylic panel actually puts on the floor.
                emissive: 0xd8f2ff,
                emissiveIntensity: VENDING_GLOW,
                roughness: 0.2
            });
            if (env.sharedAssets) env.sharedAssets.add(env.vendingPanelMat.uuid);
        }

        const panelGeo = env._cacheGeo('vendingPanel', () => new THREE.PlaneGeometry(1.2, 2.0));
        const panel = new THREE.Mesh(panelGeo, env.vendingPanelMat);
        panel.position.set(0, 0, 0.51);
        panel.userData.chunkHash = hash;
        body.add(panel);

        // The body carries a child mesh, so it cannot go through `addGeometry`. That helper
        // stages the mesh for `_compileInstances`, which batches by geometry+material and
        // writes only the parent's matrix into an InstancedMesh -- children are dropped. Two
        // machines in one chunk share a signature, so the glowing panel disappeared exactly
        // when the atrium had the most of them. The body is parented directly and its
        // collider is inserted by hand instead.
        chunkGroup.add(body);
        body.updateMatrixWorld(true);
        if (!bodyGeo.boundingBox) bodyGeo.computeBoundingBox();
        const collider = bodyGeo.boundingBox.clone().applyMatrix4(body.matrixWorld);
        collider.chunkHash = hash;
        collider.isEntityBlocker = true;
        env.spatialGrid.insert(collider);
        env.walls.push(body);

        // The panel faces the body's local +Z, so rotating that unit vector by rotY gives the
        // outward normal. The lamp goes there, clear of the 1.0-deep cabinet. Sat at the
        // body's centre it would be sealed inside its own collider, lighting the inside of a
        // box and casting no shadow the player could ever stand in.
        const outX = Math.sin(rotY);
        const outZ = Math.cos(rotY);
        const lampX = cx + outX * 0.85;
        const lampZ = cz + outZ * 0.85;
        const LAMP_Y = 1.35;
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(lampX, LAMP_Y, lampZ),
            // A backlit acrylic panel emits into the hemisphere it faces and nothing behind it.
            // A PointLight emits into a full sphere, so the cabinet occluded only the narrow
            // cone directly behind itself and the rest of the throw curled around both sides --
            // the machine appeared to light the wall it was standing against. A near-90-degree
            // spot on the panel normal is the cheapest honest shape for a one-sided emitter:
            // everything forward stays lit, everything behind the plane of the panel goes dark
            // by construction rather than by hoping a shadow slot was free.
            isSpot: true,
            targetPos: new THREE.Vector3(lampX + outX * 4.0, LAMP_Y, lampZ + outZ * 4.0),
            // Three clamps the half-angle at PI/2. Sitting just under it keeps the cone edge off
            // the hard clamp, and full penumbra dissolves the ellipse the apex would otherwise
            // stamp on the floor.
            spotAngle: Math.PI / 2.15,
            spotPenumbra: 1.0,
            flickerOffset: random() * 500,
            material: env.vendingPanelMat,
            // `vendingPanelMat` is one shared material across every machine in the world, and
            // LumenGrid writes `material.emissiveIntensity` per fixture per frame. Whichever
            // machine is evaluated last drives the glow on all of them. A steady fixture makes
            // that coupling invisible; flag one machine faulty and the whole atrium blinks in
            // unison. Per-machine flicker needs a cloned material first.
            isFaulty: false,
            emissiveIntensity: VENDING_GLOW,
            distance: VENDING_REACH,
            baseIntensity: VENDING_INTENSITY,
            targetIntensity: VENDING_INTENSITY,
            currentIntensity: VENDING_INTENSITY
        });
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
                const roomHalf = innerSpan / 2;
                for (let i = 0; i < TIER_COUNT; i++) {
                    buildBalconyTier(cx0, cz0, roomHalf, TIER_BASE + i * TIER_STEP, i >= DETAIL_TIERS);
                }
                const capY = TOP_TIER_Y + 25.0;
                const skyGeo = env._planeGeo(innerSpan, innerSpan);
                const sky = new THREE.Mesh(skyGeo, env.matrixVoidMat);
                sky.rotation.x = Math.PI / 2;
                sky.position.set(cx0, capY, cz0);
                ctx.chunkGroup.add(sky);
            }
            if (maze && maze[localX][localZ]) {
                buildAisleWallSegment(maze, localX, localZ, x * env.cellSize, z * env.cellSize);
            } else if (random() > 0.90) {
                buildVendingMachine(x * env.cellSize, z * env.cellSize);
            }
        }
    };
};