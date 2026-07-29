// AtriumSector.js
// LEVEL 0 ENGINE SECTOR DATA


import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

/**
 * A procedural sector generator for the atrium: the interior of a shopping mall, built on
 * top of the sector's blank-white-void groundwork rather than discarding it.
 *
 * The floor is a genuine forced-navigation maze of grocery aisles now, not an open plaza with
 * scattered shelf islands -- built straight off the shared `maze` parameter `build()` receives
 * (see SetPieces.js's `generateSectorMaze`), which no longer forces a giant open cross down the
 * center the way it originally did. Wall cells get a continuous run of shelving -- frame,
 * boards, and product boxes near the floor, then a few cheap stacked bands climbing well past
 * head height -- so aisles read as endless, not just tall. The wall ring is bare glossy marble
 * (see env.marbleMat / ProceduralTextureFactory._buildAtriumAssets) with no storefront dressing
 * at ground level, stretched all the way up to STRUCTURE_TOP_Y so the texture climbs with the
 * building instead of handing off to flat void partway up. Fourteen cantilevered balcony tiers
 * wrap the room above head height. Fog (now dark, see Sectors.js)
 * is what actually sells the illusion: the balconies, the marble, and the aisles themselves
 * all keep climbing past the point where fog has already erased them, so everything reads as
 * going up forever because nothing ever gives the eye a ceiling to land on -- it's swallowed
 * by dark, not capped by white.
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

    // Shared vertical layout -- the wall height, the balcony loop, the core column, and the
    // cap plane all need to agree on where the "real" structure stops so nothing shows a
    // seam. Defined once here instead of re-derived in each builder below.
    const TIER_STEP = 2.8;
    const TIER_BASE = 4.2;
    const TIER_COUNT = 14;
    const DETAIL_TIERS = 5;
    const TOP_TIER_Y = TIER_BASE + (TIER_COUNT - 1) * TIER_STEP;
    const STRUCTURE_TOP_Y = TOP_TIER_Y + 15.0;

    if (!env.matrixVoidMat) {
        // Unlit white -- MeshBasicMaterial ignores scene *lighting*, so the wall ring reads
        // as flat, shadowless white up close instead of a lit room with a white paint job.
        // It does NOT ignore fog: fog is exactly what's supposed to swallow the cap plane and
        // the upper balcony tiers into the dark at range. (An earlier pass set `fog: false`
        // here to kill a gradient on the walls -- that was fighting a near-white fog that's
        // since been replaced with a dark one for ambiance, so the fix doesn't apply anymore
        // and was actively hiding the fog from the ceiling. Fog defaults to enabled.)
        env.matrixVoidMat = new THREE.MeshBasicMaterial({color: 0xffffff});
    }
    if (!env.blackIronMat) {
        // Same dark rail material ChasmSector lazily creates for its guardrails. Guarded
        // here too since sector generation order isn't guaranteed.
        env.blackIronMat = new THREE.MeshStandardMaterial({color: 0x151515, roughness: 0.7, metalness: 0.9});
    }
    if (!env.productBoxMats) {
        // A small flat-color palette instead of a procedural texture -- at the density these
        // get placed (multiple per shelf, dozens of shelves per chunk), a handful of cheap
        // untextured materials reads as "assorted product" just as well as anything fancier
        // and costs nothing to generate.
        env.productBoxMats = [
            new THREE.MeshStandardMaterial({color: 0xc9b78a, roughness: 0.9}),
            new THREE.MeshStandardMaterial({color: 0x8a3a3a, roughness: 0.7}),
            new THREE.MeshStandardMaterial({color: 0x3a5a45, roughness: 0.7}),
            new THREE.MeshStandardMaterial({color: 0x35496b, roughness: 0.7}),
            new THREE.MeshStandardMaterial({color: 0xd9d2b8, roughness: 0.85})
        ];
    }

    // The ground-floor ring used to get a repeating storefront module (recessed glass, dark
    // frame, lit sign band) per non-doorway perimeter cell -- see buildStorefront, removed.
    // Ground level is bare marble now, same as the rest of the wall ring above it; the
    // balcony tiers (buildBalconyTier, still below) are unaffected.

    // One cantilevered balcony tier: a floor-slab edge plus a handrail, wrapped around all
    // four sides of the room at height `y`. `simple` swaps the individually-placed balusters
    // for a single solid band -- for the upper tiers, which exist to be seen from far below
    // and fogged toward illegibility, not to be inspected up close, so there's no reason to
    // pay for dozens of thin boxes the fog is about to erase anyway.
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

    // A hanging bowl light, reused wholesale from ArchiveSector.js's own light fixture --
    // same wire/rust-bowl-shroud/bulb geometry, same materials, same LumenGrid registration
    // (including `isArchiveLight`, which just flags "recessed dome that only opens downward"
    // for the glare/falloff logic in Environment.js -- it's a shape descriptor, not a
    // sector check). Standing in for real Atrium-specific lighting for now.
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

    // Grocery aisle shelving for one `maze` wall cell (the shared per-chunk maze `build()`
    // receives -- see SetPieces.js's `generateSectorMaze`). Unlike the old freestanding-rack
    // version, this follows ArchiveSector's continuous-spine approach: run direction and
    // continuation are read off neighboring wall cells so consecutive cells along a run share
    // a single unbroken wall face (full cellSize width, no gap) instead of each rendering as
    // its own independent island, and end caps only appear where a run genuinely terminates.
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
        // No full-cell invisible blocker here -- that was blocking the entire cellSize x
        // cellSize footprint of the maze wall cell regardless of how much of it the actual
        // shelf geometry below fills, which is only a couple of thin spines a bit either side
        // of center. It read as walking into an invisible wall a foot or two out from the
        // visible shelf. ArchiveSector's identical shelf-spine pattern has no such blocker: the
        // `spine` mesh below carries `isEntityBlocker` and its own real geometry (via
        // `addGeometry`, which derives the collider straight from `mesh.geometry.boundingBox`)
        // is the collider. Matching that here makes the hitbox track the visible shelf exactly.
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
        // Corporate beige gondola-shelving steel (see env.shelfMat / _buildAtriumAssets) --
        // these are meant to read as impossibly tall, mundane store racks, not industrial
        // fixtures, so this deliberately isn't the hazard-yellow/gunmetal frameMat used
        // elsewhere in the game.
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
                // Each box gets its own slot along the board instead of a fully independent
                // random slide. With box footprints of 0.34 (more once rotated to a diagonal)
                // and up to 4 of them scattered across the same board, naive uniform-random
                // placement let boxes land close enough to intersect, which read as flickering
                // z-fighting where their faces overlapped. Slotting plus a capped jitter keeps
                // a minimum ~0.5 unit gap between any two box centers -- comfortably more than
                // a box's worst-case diagonal half-width -- while still looking scattered.
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

            // Past head height the aisle stops needing real shelf detail -- it already reads
            // as shelving by now, and the sector's dark fog erases anything a few units out
            // regardless (same logic the perimeter marble bands and upper balcony tiers lean
            // on). A handful of cheap stacked slabs sells "this keeps going" for a fraction of
            // the cost of repeating the full board-and-product pattern all the way up, and is
            // what actually makes the aisles read as endless rather than just "tall for a
            // shelf."
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

                    // The room-facing wall surface is marble now, not flat void-white -- see
                    // env.marbleMat (ProceduralTextureFactory._buildAtriumAssets). The airlock
                    // jamb/header and the truly-exterior wall face still get routed to the unlit
                    // env.matrixVoidMat inside buildPerimeter itself (keyed off sectorId, not off
                    // whatever's passed here), since those still have no practical light nearby
                    // and a lit marble material would just go black there again.
                    //
                    // Height: an earlier pass stretched buildPerimeter's own wall box the whole
                    // way to STRUCTURE_TOP_Y in one piece. The UV math for that was correct, but
                    // in practice the texture went visibly flat a couple of tiers up -- almost
                    // certainly the ~19x vertical repeat on a single box getting mip-blurred into
                    // an average color at real viewing distance, the same way any texture goes
                    // to mush when stretched far past its native tiling scale. So: leave
                    // buildPerimeter's own wall at its normal, already-proven height, and stack
                    // additional marble bands above it in TIER_STEP-ish increments instead of one
                    // continuous stretch -- keeps every individual segment's texel density in the
                    // same range the ground-floor wall already renders correctly at.
                    const isDoorwayCell = isDoorwayNS || isDoorwayEW;
                    if (ctx.buildPerimeter(x, z, localX, localZ, env.marbleMat || env.matrixVoidMat, "ATRIUM")) {
                        const gx = x * env.cellSize, gz = z * env.cellSize;
                        const isShoulder = isShoulderNS || isShoulderEW;
                        if (!isDoorwayCell) {
                            // buildPerimeter's own box tops out at 5.0 (non-shoulder) or 3.0
                            // (shoulder, the two cells flanking each doorway). Pick up exactly
                            // where it left off so there's no gap or overlap seam.
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

                        // One duplicated tier alone reads as a second floor with a lid on it --
                        // it doesn't read as "the building keeps going" until there are enough
                        // repeats climbing far enough that the later ones are visibly fading,
                        // not just present. At density 0.03 (see Sectors.js), a centered
                        // viewer's distance to a tier at height Y is roughly sqrt(roomHalf^2 +
                        // Y^2); that only starts crossing into "mostly fogged" territory past
                        // Y=~35-40. So: floor-to-floor spacing matching the original two tiers
                        // (2.8), fourteen of them, dropping individual balusters for a flat
                        // band past the point they'd already be too fogged to read as distinct
                        // bars anyway.
                        for (let i = 0; i < TIER_COUNT; i++) {
                            buildBalconyTier(cx0, cz0, roomHalf, TIER_BASE + i * TIER_STEP, i >= DETAIL_TIERS);
                        }

                        // The cap plane still exists structurally (it's what the void-ceiling
                        // skip in Environment.js is keying off of existing), but it now sits
                        // well past the point fog has already erased everything -- it's a
                        // backstop, not a visible lid.
                        const capY = TOP_TIER_Y + 25.0;
                        const skyGeo = env._planeGeo(innerSpan, innerSpan);
                        const sky = new THREE.Mesh(skyGeo, env.matrixVoidMat);
                        sky.rotation.x = Math.PI / 2;
                        sky.position.set(cx0, capY, cz0);
                        ctx.chunkGroup.add(sky);
                    }

                    // Forced-navigation grocery aisles on every `maze` wall cell. Continuous
                    // runs read as one unbroken wall of shelving rather than independent
                    // islands; see `buildAisleWallSegment`.
                    if (maze && maze[localX][localZ]) {
                        buildAisleWallSegment(maze, localX, localZ, x * env.cellSize, z * env.cellSize);
                    } else if (random() > 0.85) {
                        // Same density Archive uses for its own hanging bulbs -- scattered
                        // across the open aisle floor now that the single center pillar (and
                        // the fountain it rose out of) are gone.
                        buildHangingLight(x * env.cellSize, z * env.cellSize);
                    }
                }
            };
};
