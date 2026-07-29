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
        buildChair,
        buildTable,
        buildCouch,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;
    const TIER_STEP = 2.8;
    const TIER_BASE = 4.2;
    const TIER_COUNT = 14;
    const DETAIL_TIERS = 5;
    const TOP_TIER_Y = TIER_BASE + (TIER_COUNT - 1) * TIER_STEP;
    const STRUCTURE_TOP_Y = TOP_TIER_Y + 15.0;
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
    const buildHangingLight = (cx, cz) => {
        const bowlRadius = 0.4;
        const rimY = 2.65;
        const domeTopY = rimY + bowlRadius;
        const wireLen = 3.0;
        const wireGeo = env._cacheGeo('archiveWire', () => new THREE.CylinderGeometry(0.012, 0.012, wireLen, 5));
        const wire = new THREE.Mesh(wireGeo, env.metalMat);
        wire.position.set(cx, domeTopY + wireLen / 2, cz);
        chunkGroup.add(wire);
        wire.updateMatrixWorld(true);
        env.walls.push(wire);
        const bowlGeo = env._cacheGeo('archiveBowl', () => new THREE.SphereGeometry(bowlRadius, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2));
        if (!env.archiveBowlMat) {
            env.archiveBowlMat = env.rustMat.clone();
            env.archiveBowlMat.side = THREE.DoubleSide;
            env.sharedAssets.add(env.archiveBowlMat.uuid);
        }
        const bowl = new THREE.Mesh(bowlGeo, env.archiveBowlMat);
        bowl.position.set(cx, rimY, cz);
        chunkGroup.add(bowl);
        bowl.updateMatrixWorld(true);
        env.walls.push(bowl);
        const bulbRadius = 0.08;
        const bulbGeo = env._cacheGeo('archiveBulb', () => new THREE.SphereGeometry(bulbRadius, 8, 6));
        const bulbMat = ctx.getLightMaterial(0xd8b276, 0xc89858, false);
        bulbMat.map = null;
        bulbMat.emissiveMap = null;
        const bulbY = domeTopY - bulbRadius;
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(cx, bulbY, cz);
        bulb.userData.chunkHash = hash;
        chunkGroup.add(bulb);
        bulb.updateMatrixWorld(true);
        env.walls.push(bulb);
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(cx, bulbY, cz),
            flickerOffset: random() * 500,
            material: bulbMat,
            isFaulty: true,
            isArchiveLight: true,
            isShadowCaster: true,
            baseIntensity: 1.5,
            targetIntensity: 1.5,
            currentIntensity: 1.5
        });
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
    return {
        id: "ATRIUM",
        foundationMat: env.clinicMat || env.matrixVoidMat,
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
            } else if (random() > 0.85) {
                buildHangingLight(x * env.cellSize, z * env.cellSize);
            }
        }
    };
};