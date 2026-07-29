// AtriumSector.js
// LEVEL 0 ENGINE SECTOR DATA


import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';

/**
 * A procedural sector generator for the atrium: the interior of a shopping mall, built on
 * top of the sector's blank-white-void groundwork rather than discarding it.
 *
 * The floor is one structurally open plaza -- nothing here blocks the center cross or the
 * doorway approaches, since the maze generator guarantees those stay clear -- but every
 * interior cell the maze marks as a wall now gets a retail shelving unit instead of standing
 * empty, giving the player actual aisles to navigate instead of a bare box. The wall ring is
 * glossy marble (see
 * env.marbleMat / ProceduralTextureFactory._buildAtriumAssets) with a repeating storefront
 * module per non-doorway boundary cell, stretched all the way up to STRUCTURE_TOP_Y so the
 * texture climbs with the building instead of handing off to flat void partway up. Fourteen
 * cantilevered balcony tiers wrap the room above head height, and a central fountain/
 * light-column landmark anchors the plaza. Fog (now dark, see Sectors.js) is what actually
 * sells the illusion: the balconies and the marble both keep climbing past the point where
 * fog has already erased them, so the building reads as going up forever because nothing
 * ever gives the eye a ceiling to land on -- it's swallowed by dark, not capped by white.
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

    // A storefront module: a recessed glass window in a dark frame with a lit sign band on
    // top, sized to one boundary cell (env.cellSize wide). Built once per non-doorway
    // perimeter cell, so it tiles around the whole ring automatically.
    const buildStorefront = (faceX, faceZ, rotY) => {
        const group = new THREE.Group();
        const glass = new THREE.Mesh(env._boxGeo(3.2, 2.3, 0.06), env.glassMat || env.matrixVoidMat);
        glass.position.set(0, 1.35, 0.03);
        group.add(glass);
        const railGeo = env._boxGeo(3.4, 0.14, 0.1);
        const railTop = new THREE.Mesh(railGeo, env.blackIronMat);
        railTop.position.set(0, 2.57, 0.03);
        group.add(railTop);
        const railBottom = new THREE.Mesh(railGeo, env.blackIronMat);
        railBottom.position.set(0, 0.13, 0.03);
        group.add(railBottom);
        const postGeo = env._boxGeo(0.14, 2.5, 0.1);
        for (const sx of [-1.68, 1.68]) {
            const post = new THREE.Mesh(postGeo, env.blackIronMat);
            post.position.set(sx, 1.32, 0.03);
            group.add(post);
        }
        // Static emissive sign band -- not registered with LumenGrid. A storefront ring this
        // size (roughly one module per 4m of wall) would be 30-40 modules per chunk; giving
        // each one a real dynamic light would blow through LumenGrid's 32-light budget on
        // its own. The pooled emissive material still reads as lit without costing a slot.
        const signMat = ctx.getLightMaterial(0xfff2cc, 0xffe9b0, false);
        const sign = new THREE.Mesh(env._boxGeo(3.2, 0.35, 0.08), signMat);
        sign.position.set(0, 2.95, 0.02);
        group.add(sign);
        group.position.set(faceX, 0, faceZ);
        group.rotation.y = rotY;
        chunkGroup.add(group);
    };

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

    // The plaza's centerpiece: a low fountain ring at ground level and a slender light
    // column rising out of it, as tall as the balcony stack, into the void above -- the one
    // real dynamic fixture in the sector, since it's singular rather than repeated dozens
    // of times per chunk. Fog fades it out at the top exactly like the balconies; it's not
    // artificially capped shorter than they are.
    const buildAtriumCore = (cx0, cz0, columnTop) => {
        const ringGeo = env._cacheGeo('atriumFountainRing', () => new THREE.CylinderGeometry(2.4, 2.5, 0.5, 24, 1, true));
        const ring = new THREE.Mesh(ringGeo, env.structMat);
        ring.position.set(cx0, 0.25, cz0);
        addGeometry(ring);
        const capGeo = env._cacheGeo('atriumFountainCap', () => new THREE.CylinderGeometry(2.45, 2.45, 0.06, 24));
        const cap = new THREE.Mesh(capGeo, env.glassMat || env.matrixVoidMat);
        cap.position.set(cx0, 0.51, cz0);
        chunkGroup.add(cap);

        const coreMat = ctx.getLightMaterial(0xf5faff, 0xdcefff, false);
        const coreGeo = env._cacheGeo(`atriumCoreColumn_${columnTop}`, () => new THREE.CylinderGeometry(0.35, 0.35, columnTop, 16));
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(cx0, columnTop / 2, cz0);
        chunkGroup.add(core);
        env.fixtureData.push({
            chunkHash: hash,
            position: new THREE.Vector3(cx0, 4.0, cz0),
            flickerOffset: 0,
            material: coreMat,
            isFaulty: false,
            baseIntensity: 1.6,
            targetIntensity: 1.6,
            currentIntensity: 1.6,
            noShadow: true
        });
    };

    // One shelving unit filling an interior maze "wall" cell. Collision is a single cheap
    // invisible box sized to the whole cell -- the same proven approach the old cornfield
    // used for its stalks (one blocker per wall cell, decoration layered on top with no
    // collision of its own). That keeps the racks reliably solid without needing every post
    // and shelf board to be individually registered in the spatial grid, which matters here
    // since a dense maze can put several dozen of these in a single chunk.
    const buildAisleUnit = (gx, gz, alongX) => {
        const blockerGeo = env._cacheGeo('atriumAisleBlocker', () => new THREE.BoxGeometry(env.cellSize - 0.3, 2.6, env.cellSize - 0.3));
        if (!env._invisibleMat) env._invisibleMat = new THREE.MeshBasicMaterial({visible: false});
        const blocker = new THREE.Mesh(blockerGeo, env._invisibleMat);
        blocker.position.set(gx, 1.3, gz);
        blocker.userData.isEntityBlocker = true;
        addGeometry(blocker);

        const rackLen = env.cellSize - 0.6;
        const rackDepth = 1.1;
        const frameMat = env.hazardMat || env.metalMat;
        const group = new THREE.Group();

        const shelfGeo = env._cacheGeo('aisleShelfBoard', () => new THREE.BoxGeometry(rackLen, 0.05, rackDepth));
        const heights = [0.05, 0.85, 1.6, 2.3];
        for (const h of heights) {
            const shelf = new THREE.Mesh(shelfGeo, frameMat);
            shelf.position.set(0, h, 0);
            group.add(shelf);
        }
        const postGeo = env._cacheGeo('aislePost', () => new THREE.BoxGeometry(0.08, 2.3, 0.08));
        const hw = rackLen / 2 - 0.06, hd = rackDepth / 2 - 0.06;
        for (const ox of [-hw, hw]) {
            for (const oz of [-hd, hd]) {
                const post = new THREE.Mesh(postGeo, frameMat);
                post.position.set(ox, 1.15, oz);
                group.add(post);
            }
        }
        const boxGeo = env._cacheGeo('aisleProductBox', () => new THREE.BoxGeometry(0.34, 0.28, 0.34));
        for (let level = 0; level < 3; level++) {
            const boxCount = 3 + Math.floor(random() * 3);
            for (let i = 0; i < boxCount; i++) {
                const mat = env.productBoxMats[Math.floor(random() * env.productBoxMats.length)];
                const box = new THREE.Mesh(boxGeo, mat);
                box.position.set((random() - 0.5) * (rackLen - 0.4), heights[level] + 0.18, (random() - 0.5) * (rackDepth - 0.4));
                box.rotation.y = random() * Math.PI * 2;
                group.add(box);
            }
        }
        group.position.set(gx, 0, gz);
        group.rotation.y = alongX ? 0 : Math.PI / 2;
        chunkGroup.add(group);
    };

    return {
                id: "ATRIUM",
                foundationMat: env.clinicMat || env.matrixVoidMat,
                build: (x, z, localX, localZ, maze) => {
                    const edge = env.chunkSize - 1;
                    const isDoorwayNS = (localZ === 0 || localZ === edge) && localX === 7;
                    const isDoorwayEW = (localX === 0 || localX === edge) && localZ === 7;
                    const isCorner = (localX === 0 || localX === edge) && (localZ === 0 || localZ === edge);
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
                        const isPlainWall = !isDoorwayCell && !isCorner && !isShoulder;
                        if (isPlainWall) {
                            const half = env.cellSize / 2;
                            let faceX = gx, faceZ = gz, nx = 0, nz = 0;
                            if (localZ === 0) { nz = 1; faceZ = gz + half; }
                            else if (localZ === edge) { nz = -1; faceZ = gz - half; }
                            else if (localX === 0) { nx = 1; faceX = gx + half; }
                            else if (localX === edge) { nx = -1; faceX = gx - half; }
                            buildStorefront(faceX, faceZ, Math.atan2(nx, nz));
                        }
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

                        buildAtriumCore(cx0, cz0, STRUCTURE_TOP_Y);

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

                    // Retail shelving on every interior cell the maze marks as a wall --
                    // the plaza is still one open floor structurally (nothing here blocks
                    // the center cross or the doorway approaches, since the maze generator
                    // guarantees those stay clear), but it's no longer an empty box to walk
                    // across. Orientation follows whichever axis the cell has wall-neighbors
                    // on, so runs of adjacent wall cells read as one continuous aisle of
                    // shelving instead of independently-rotated islands.
                    if (maze && maze[localX] && maze[localX][localZ]) {
                        const gx = x * env.cellSize, gz = z * env.cellSize;
                        const hasWallX = (localX > 0 && maze[localX - 1][localZ]) || (localX < edge && maze[localX + 1][localZ]);
                        const hasWallZ = (localZ > 0 && maze[localX][localZ - 1]) || (localZ < edge && maze[localX][localZ + 1]);
                        let alongX;
                        if (hasWallX && !hasWallZ) alongX = true;
                        else if (hasWallZ && !hasWallX) alongX = false;
                        else alongX = (localX + localZ) % 2 === 0;
                        buildAisleUnit(gx, gz, alongX);
                    }
                }
            };
};
