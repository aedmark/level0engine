import {placeSectorPaper} from '../NarrativeProps.js';

export const ACME_LEVEL_SPACING = 1.2;

// Raised from 0.75 - with ACME_LEVELS_EACH_SIDE now much bigger (see ChunkManager.js), a higher skip
// chance means longer average runs of empty levels between decks, which is what actually produces long
// ladder/chute segments (buildLadderSegment/buildChuteSegment both already take an arbitrary `rise`).
const ACME_PLATFORM_SKIP_CHANCE = 0.82;
const ACME_ENTRANCE_CLEARANCE_LEVELS = 3;
const ACME_LADDER_RUNG_SPACING = 0.3;
const ACME_CHUTE_ANGLE_DEG = 42;      // steep enough to read as a slide, shallow enough to look plausible
const ACME_CHUTE_WIDTH = 0.9;         // rail-to-rail
const ACME_CHUTE_CHANCE = 0.35;       // fraction of deck-to-deck hops that become a chute instead of a ladder

const DOORWAY_ANCHORS = [[7, 1], [7, 14], [1, 7], [14, 7]];

const LADDER_EDGES = [{dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1}];

const ensureAcmeMaterials = (env) => {
    if (!env.warehouseMat) {
        env.warehouseMat = new THREE.MeshStandardMaterial({color: 0x8a5a3a, roughness: 0.85, metalness: 0.15});
        env.sharedAssets.add(env.warehouseMat.uuid);
    }
    if (!env.blackIronMat) {
        env.blackIronMat = new THREE.MeshStandardMaterial({color: 0x151515, roughness: 0.7, metalness: 0.9});
        env.sharedAssets.add(env.blackIronMat.uuid);
    }
};

export const AcmeSector = (env, ctx) => {
    const {random, buildWall, addGeometry, hash} = ctx;
    ensureAcmeMaterials(env);

    const isNearEntrance = (localX, localZ, maze) => {
        if (!maze || maze[localX][localZ]) return false;
        for (const [ax, az] of DOORWAY_ANCHORS) {
            if (Math.abs(localX - ax) <= 2 && Math.abs(localZ - az) <= 2) return true;
        }
        return false;
    };

    const buildCatwalk = (gx, gz, y) => {
        const floorGeo = env._planeGeo(env.cellSize, env.cellSize);
        const floor = new THREE.Mesh(floorGeo, env.catwalkMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(gx, y, gz);
        addGeometry(floor);
        const hx = env.cellSize / 2;
        const frameY = y - 0.1;
        const rim1 = buildWall(env.cellSize, 0.08, env.blackIronMat, 0.12);
        rim1.position.set(gx, frameY, gz - hx + 0.04);
        addGeometry(rim1);
        const rim2 = buildWall(env.cellSize, 0.08, env.blackIronMat, 0.12);
        rim2.position.set(gx, frameY, gz + hx - 0.04);
        addGeometry(rim2);
        const rim3 = buildWall(0.08, env.cellSize - 0.16, env.blackIronMat, 0.12);
        rim3.position.set(gx - hx + 0.04, frameY, gz);
        addGeometry(rim3);
        const rim4 = buildWall(0.08, env.cellSize - 0.16, env.blackIronMat, 0.12);
        rim4.position.set(gx + hx - 0.04, frameY, gz);
        addGeometry(rim4);
        placeSectorPaper(env, ctx, "ACME", gx, gz, y + 0.02);
    };

    const buildLadderSegment = (mountX, mountZ, yBottom, rise, edge, outDir) => {
        const perp = edge.dx !== 0 ? {x: 0, z: 1} : {x: 1, z: 0};
        const railGap = 0.3;
        for (const sign of [1, -1]) {
            const rail = buildWall(0.06, 0.06, env.blackIronMat, rise);
            rail.position.set(mountX + perp.x * railGap * sign, yBottom + rise / 2, mountZ + perp.z * railGap * sign);
            addGeometry(rail);
        }
        const rungCount = Math.max(4, Math.round(rise / ACME_LADDER_RUNG_SPACING));
        const rungRise = rise / rungCount;
        for (let i = 0; i < rungCount; i++) {
            const ly = yBottom + rungRise * (i + 0.5);
            const rung = perp.x !== 0
                ? buildWall(0.68, 0.05, env.blackIronMat, 0.05)
                : buildWall(0.05, 0.68, env.blackIronMat, 0.05);
            rung.position.set(mountX, ly, mountZ);
            addGeometry(rung);
        }
        const halfDepth = 0.15, halfWidth = 0.4;
        const box = new THREE.Box3();
        box.min.set(
            mountX - Math.abs(edge.dx) * halfDepth - Math.abs(perp.x) * halfWidth,
            yBottom,
            mountZ - Math.abs(edge.dz) * halfDepth - Math.abs(perp.z) * halfWidth
        );
        box.max.set(
            mountX + Math.abs(edge.dx) * halfDepth + Math.abs(perp.x) * halfWidth,
            yBottom + rise,
            mountZ + Math.abs(edge.dz) * halfDepth + Math.abs(perp.z) * halfWidth
        );
        box.isLadder = true;
        box.chunkHash = hash;
        box.ladderOutDir = outDir;
        env.spatialGrid.insert(box);
    };

    // Angled chute: a one-way slide from `yTop` down to `yTop - rise`, mounted on the same edge/outDir
    // ladders use. Unlike the ladder, it doesn't stack straight up the column - it runs outward along
    // `outDir` as it descends, so a long chute drifts well clear of the vertical column below it. The
    // collision box is a trigger volume only (see PlayerController#_updateChute / the isChute carve-outs
    // in HazardUtils.sweepGroundedCollision) - it is never solid, the player is expected to walk straight
    // onto it and get picked up by contact, not grab-and-climb like a ladder.
    const buildChuteSegment = (mountX, mountZ, yTop, rise, edge, outDir) => {
        const perp = edge.dx !== 0 ? {x: 0, z: 1} : {x: 1, z: 0};
        const angleRad = ACME_CHUTE_ANGLE_DEG * Math.PI / 180;
        const run = rise / Math.tan(angleRad);
        const slopeLen = Math.sqrt(rise * rise + run * run);

        const topX = mountX, topZ = mountZ, topY = yTop;
        const bottomX = mountX + outDir.x * run;
        const bottomZ = mountZ + outDir.z * run;
        const bottomY = yTop - rise;
        const midX = (topX + bottomX) / 2;
        const midY = (topY + bottomY) / 2;
        const midZ = (topZ + bottomZ) / 2;

        // Built flat (long axis along the run direction, `run` is always world X or world Z since `edge`
        // is axis-aligned) then rotated down into the incline. Sign chosen so the end further along
        // `outDir` is the low end.
        const runsAlongX = edge.dx !== 0;
        const tiltAxis = runsAlongX ? 'z' : 'x';
        const tiltSign = runsAlongX ? -Math.sign(outDir.x) : Math.sign(outDir.z);
        const tilt = tiltSign * angleRad;

        const makeSlopedMesh = (mat, thickness, widthOffsetSign) => {
            const w = runsAlongX ? slopeLen : ACME_CHUTE_WIDTH;
            const d = runsAlongX ? ACME_CHUTE_WIDTH : slopeLen;
            const mesh = buildWall(w, d, mat, thickness);
            mesh.rotation[tiltAxis] = tilt;
            const offX = widthOffsetSign ? perp.x * (ACME_CHUTE_WIDTH / 2) * widthOffsetSign : 0;
            const offZ = widthOffsetSign ? perp.z * (ACME_CHUTE_WIDTH / 2) * widthOffsetSign : 0;
            mesh.position.set(midX + offX, midY, midZ + offZ);
            // addGeometry auto-boxes every mesh it's handed (see StructureKit.js's addGeometry) unless told
            // not to - same as the baseboard trim meshes elsewhere in this codebase. Without this, the
            // rotated surface/rail meshes would each silently get their own solid, axis-aligned bounding
            // box (a box that encloses the whole tilted ramp), on top of the one deliberate `isChute`
            // trigger volume below - which is exactly the "invisible wall under every chute" bug this
            // fixes. The visible geometry here is purely cosmetic; only the isChute box should collide.
            mesh.userData.noCollision = true;
            return mesh;
        };

        const surface = makeSlopedMesh(env.blackIronMat, 0.06, 0);
        addGeometry(surface);
        for (const sign of [1, -1]) {
            const rail = makeSlopedMesh(env.blackIronMat, 0.16, sign);
            addGeometry(rail);
        }

        const halfWidth = ACME_CHUTE_WIDTH / 2, halfDepth = 0.15;
        const box = new THREE.Box3();
        box.min.set(
            Math.min(topX, bottomX) - Math.abs(perp.x) * halfWidth - Math.abs(edge.dx) * halfDepth,
            bottomY,
            Math.min(topZ, bottomZ) - Math.abs(perp.z) * halfWidth - Math.abs(edge.dz) * halfDepth
        );
        box.max.set(
            Math.max(topX, bottomX) + Math.abs(perp.x) * halfWidth + Math.abs(edge.dx) * halfDepth,
            topY,
            Math.max(topZ, bottomZ) + Math.abs(perp.z) * halfWidth + Math.abs(edge.dz) * halfDepth
        );
        box.isChute = true;
        box.chunkHash = hash;
        box.chuteOutDir = outDir;
        box.chuteTopX = topX;
        box.chuteTopY = topY;
        box.chuteTopZ = topZ;
        box.chuteBottomX = bottomX;
        box.chuteBottomY = bottomY;
        box.chuteBottomZ = bottomZ;
        box.chuteSlopeLen = slopeLen;
        env.spatialGrid.insert(box);
    };

    return {
        id: "ACME",
        foundationMat: null,
        build: (x, z, localX, localZ, maze, levelMazes) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.warehouseMat, "ACME")) return;
            if (!levelMazes || !levelMazes.length) return;

            const gx = x * env.cellSize;
            const gz = z * env.cellSize;
            const midLevel = Math.floor(levelMazes.length / 2);
            const nearEntrance = isNearEntrance(localX, localZ, maze);

            const voidBox = new THREE.Box3();
            voidBox.min.set(gx - env.cellSize / 2, -100000, gz - env.cellSize / 2);
            voidBox.max.set(gx + env.cellSize / 2, 100000, gz + env.cellSize / 2);
            voidBox.isVoid = true;
            voidBox.chunkHash = hash;
            env.spatialGrid.insert(voidBox);

            if (nearEntrance) {
                buildCatwalk(gx, gz, 0);
            }

            const inClearance = (li) => nearEntrance && li >= midLevel && li <= midLevel + ACME_ENTRANCE_CLEARANCE_LEVELS;
            const decisions = new Array(levelMazes.length).fill(null);
            for (let li = 0; li < levelMazes.length; li++) {
                if (inClearance(li)) continue;
                const levelMaze = levelMazes[li];
                const isVoidAtLevel = !levelMaze || levelMaze[localX][localZ];
                if (isVoidAtLevel) continue;
                if (random() < ACME_PLATFORM_SKIP_CHANCE) continue;
                decisions[li] = 'catwalk';
            }

            for (let li = 0; li < levelMazes.length; li++) {
                if (!decisions[li]) continue;
                const levelBaseY = (li - midLevel) * ACME_LEVEL_SPACING;
                buildCatwalk(gx, gz, levelBaseY);
            }

            const edge = LADDER_EDGES[Math.floor(random() * LADDER_EDGES.length)];
            const mountOffset = env.cellSize / 2 + 0.15;
            const mountX = gx + edge.dx * mountOffset;
            const mountZ = gz + edge.dz * mountOffset;
            const outDir = {x: -edge.dx, z: -edge.dz};
            let prevDeckLevel = -1;
            for (let li = 0; li < levelMazes.length; li++) {
                if (!decisions[li]) continue;
                if (prevDeckLevel !== -1) {
                    const yBottom = (prevDeckLevel - midLevel) * ACME_LEVEL_SPACING;
                    const rise = (li - prevDeckLevel) * ACME_LEVEL_SPACING;
                    if (random() < ACME_CHUTE_CHANCE) {
                        buildChuteSegment(mountX, mountZ, yBottom + rise, rise, edge, outDir);
                    } else {
                        buildLadderSegment(mountX, mountZ, yBottom, rise, edge, outDir);
                    }
                }
                prevDeckLevel = li;
            }
        }
    };
};
