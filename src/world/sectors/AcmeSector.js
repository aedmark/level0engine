import {placeSectorPaper} from '../NarrativeProps.js';

export const ACME_LEVEL_SPACING = 1.2;

const ACME_PLATFORM_SKIP_CHANCE = 0.82;
const ACME_ENTRANCE_CLEARANCE_LEVELS = 3;
const ACME_LADDER_RUNG_SPACING = 0.3;
const ACME_LADDER_HOLE_DEPTH = 1.4;
const ACME_LADDER_HOLE_WIDTH = 1.15;
const ACME_LADDER_RAIL_GAP = 0.3;
const ACME_LADDER_WELD_WIDTH = 0.3;
const ACME_LADDER_WELD_THICKNESS = 0.12;
const ACME_LADDER_TOP_OVERHANG = 1.2;

const ACME_HANGING_LIGHT_CHANCE = 0.5;
const ACME_LIGHT_CORNERS = [{x: 1, z: 1}, {x: 1, z: -1}, {x: -1, z: 1}, {x: -1, z: -1}];
const ACME_LIGHT_CORNER_INSET = 0.55;
const ACME_HANGING_LIGHT_BOWL_RADIUS = 0.4;
const ACME_HANGING_LIGHT_CLEARANCE = 0.35;
const ACME_HANGING_LIGHT_MIN_WIRE = 0.5;
const ACME_HANGING_LIGHT_INTENSITY = 4.5;

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
    const {random, buildWall, addGeometry, hash, getLightMaterial, chunkGroup} = ctx;
    ensureAcmeMaterials(env);

    const isNearEntrance = (localX, localZ, maze) => {
        if (!maze || maze[localX][localZ]) return false;
        for (const [ax, az] of DOORWAY_ANCHORS) {
            if (Math.abs(localX - ax) <= 2 && Math.abs(localZ - az) <= 2) return true;
        }
        return false;
    };

    const buildCatwalk = (gx, gz, y, size = env.cellSize) => {
        const floorGeo = size === env.cellSize ? env._planeGeo(env.cellSize, env.cellSize) : env._planeGeo(size, size);
        const floor = new THREE.Mesh(floorGeo, env.catwalkMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(gx, y, gz);
        addGeometry(floor);
        const hx = size / 2;
        const frameY = y - 0.07;
        const rim1 = buildWall(size, 0.08, env.blackIronMat, 0.12);
        rim1.position.set(gx, frameY, gz - hx + 0.04);
        addGeometry(rim1);
        const rim2 = buildWall(size, 0.08, env.blackIronMat, 0.12);
        rim2.position.set(gx, frameY, gz + hx - 0.04);
        addGeometry(rim2);
        const rim3 = buildWall(0.08, size - 0.16, env.blackIronMat, 0.12);
        rim3.position.set(gx - hx + 0.04, frameY, gz);
        addGeometry(rim3);
        const rim4 = buildWall(0.08, size - 0.16, env.blackIronMat, 0.12);
        rim4.position.set(gx + hx - 0.04, frameY, gz);
        addGeometry(rim4);
        if (size === env.cellSize) placeSectorPaper(env, ctx, "ACME", gx, gz, y + 0.02);
    };

    const buildHoledCatwalk = (gx, gz, y, edge) => {
        const size = env.cellSize;
        const hx = size / 2;
        const holeHalfX = edge.dx !== 0 ? ACME_LADDER_HOLE_DEPTH / 2 : ACME_LADDER_HOLE_WIDTH / 2;
        const holeHalfZ = edge.dx !== 0 ? ACME_LADDER_HOLE_WIDTH / 2 : ACME_LADDER_HOLE_DEPTH / 2;

        const nsDepth = hx - holeHalfZ;
        if (nsDepth > 0.02) {
            const north = new THREE.Mesh(env._planeGeo(size, nsDepth), env.catwalkMat);
            north.rotation.x = -Math.PI / 2;
            north.position.set(gx, y, gz - holeHalfZ - nsDepth / 2);
            addGeometry(north);
            const south = new THREE.Mesh(env._planeGeo(size, nsDepth), env.catwalkMat);
            south.rotation.x = -Math.PI / 2;
            south.position.set(gx, y, gz + holeHalfZ + nsDepth / 2);
            addGeometry(south);
        }
        const ewWidth = hx - holeHalfX;
        if (ewWidth > 0.02) {
            const east = new THREE.Mesh(env._planeGeo(ewWidth, holeHalfZ * 2), env.catwalkMat);
            east.rotation.x = -Math.PI / 2;
            east.position.set(gx + holeHalfX + ewWidth / 2, y, gz);
            addGeometry(east);
            const west = new THREE.Mesh(env._planeGeo(ewWidth, holeHalfZ * 2), env.catwalkMat);
            west.rotation.x = -Math.PI / 2;
            west.position.set(gx - holeHalfX - ewWidth / 2, y, gz);
            addGeometry(west);
        }

        const frameY = y - 0.07;
        const rim1 = buildWall(size, 0.08, env.blackIronMat, 0.12);
        rim1.position.set(gx, frameY, gz - hx + 0.04);
        addGeometry(rim1);
        const rim2 = buildWall(size, 0.08, env.blackIronMat, 0.12);
        rim2.position.set(gx, frameY, gz + hx - 0.04);
        addGeometry(rim2);
        const rim3 = buildWall(0.08, size - 0.16, env.blackIronMat, 0.12);
        rim3.position.set(gx - hx + 0.04, frameY, gz);
        addGeometry(rim3);
        const rim4 = buildWall(0.08, size - 0.16, env.blackIronMat, 0.12);
        rim4.position.set(gx + hx - 0.04, frameY, gz);
        addGeometry(rim4);
    };

    const buildLadderSegment = (gx, gz, yBottom, rise, edge, outDir) => {
        const perp = edge.dx !== 0 ? {x: 0, z: 1} : {x: 1, z: 0};
        const railGap = ACME_LADDER_RAIL_GAP;
        for (const sign of [1, -1]) {
            const rail = buildWall(0.06, 0.06, env.blackIronMat, rise);
            rail.position.set(gx + perp.x * railGap * sign, yBottom + rise / 2, gz + perp.z * railGap * sign);
            addGeometry(rail);
        }
        const rungCount = Math.max(4, Math.round(rise / ACME_LADDER_RUNG_SPACING));
        const rungRise = rise / rungCount;
        for (let i = 0; i < rungCount; i++) {
            const ly = yBottom + rungRise * (i + 0.5);
            const rung = perp.x !== 0
                ? buildWall(0.68, 0.05, env.blackIronMat, 0.05)
                : buildWall(0.05, 0.68, env.blackIronMat, 0.05);
            rung.position.set(gx, ly, gz);
            addGeometry(rung);
        }
        const halfDepth = 0.15, halfWidth = 0.4;
        const box = new THREE.Box3();
        box.min.set(
            gx - Math.abs(edge.dx) * halfDepth - Math.abs(perp.x) * halfWidth,
            yBottom,
            gz - Math.abs(edge.dz) * halfDepth - Math.abs(perp.z) * halfWidth
        );
        box.max.set(
            gx + Math.abs(edge.dx) * halfDepth + Math.abs(perp.x) * halfWidth,
            yBottom + rise,
            gz + Math.abs(edge.dz) * halfDepth + Math.abs(perp.z) * halfWidth
        );
        box.isLadder = true;
        box.chunkHash = hash;
        box.ladderOutDir = outDir;
        env.spatialGrid.insert(box);
    };

    const buildLadderWeld = (gx, gz, topY, edge) => {
        const perp = edge.dx !== 0 ? {x: 0, z: 1} : {x: 1, z: 0};
        const holeHalfSpan = ACME_LADDER_HOLE_WIDTH / 2;
        const span = holeHalfSpan - ACME_LADDER_RAIL_GAP;
        if (span <= 0.02) return;
        const frameY = topY - 0.04;
        for (const sign of [1, -1]) {
            const center = ACME_LADDER_RAIL_GAP + span / 2;
            const weld = perp.x !== 0
                ? buildWall(span, ACME_LADDER_WELD_WIDTH, env.blackIronMat, ACME_LADDER_WELD_THICKNESS)
                : buildWall(ACME_LADDER_WELD_WIDTH, span, env.blackIronMat, ACME_LADDER_WELD_THICKNESS);
            weld.position.set(gx + perp.x * center * sign, frameY, gz + perp.z * center * sign);
            addGeometry(weld);
        }
    };

    const buildHangingLight = (gx, gz, ceilingY, rise) => {
        const maxWire = rise - ACME_HANGING_LIGHT_BOWL_RADIUS - ACME_HANGING_LIGHT_CLEARANCE;
        if (maxWire < ACME_HANGING_LIGHT_MIN_WIRE) return;
        const wireLen = ACME_HANGING_LIGHT_MIN_WIRE + random() * (maxWire - ACME_HANGING_LIGHT_MIN_WIRE);
        const corner = ACME_LIGHT_CORNERS[Math.floor(random() * ACME_LIGHT_CORNERS.length)];
        const inset = env.cellSize / 2 * ACME_LIGHT_CORNER_INSET;
        const lx = gx + corner.x * inset;
        const lz = gz + corner.z * inset;
        env._buildHangingBowlLight(chunkGroup, hash, lx, lz, random, getLightMaterial, wireLen, ceilingY, ACME_HANGING_LIGHT_INTENSITY, false);
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

            const ladderEdge = LADDER_EDGES[Math.floor(random() * LADDER_EDGES.length)];
            const ladderOutDir = {x: -ladderEdge.dx, z: -ladderEdge.dz};

            const needsHole = new Array(levelMazes.length).fill(false);
            const connectors = [];
            let prevDeckLevel = -1;
            for (let li = 0; li < levelMazes.length; li++) {
                if (!decisions[li]) continue;
                if (prevDeckLevel !== -1) {
                    const rise = (li - prevDeckLevel) * ACME_LEVEL_SPACING;
                    connectors.push({prevDeckLevel, li, rise});
                    needsHole[li] = true;
                }
                prevDeckLevel = li;
            }

            for (let li = 0; li < levelMazes.length; li++) {
                if (!decisions[li]) continue;
                const levelBaseY = (li - midLevel) * ACME_LEVEL_SPACING;
                if (needsHole[li]) buildHoledCatwalk(gx, gz, levelBaseY, ladderEdge);
                else buildCatwalk(gx, gz, levelBaseY);
            }

            const topSegment = connectors[connectors.length - 1];
            for (const seg of connectors) {
                const yBottom = (seg.prevDeckLevel - midLevel) * ACME_LEVEL_SPACING;
                const overhang = seg === topSegment ? ACME_LADDER_TOP_OVERHANG : 0;
                buildLadderSegment(gx, gz, yBottom, seg.rise + overhang, ladderEdge, ladderOutDir);
                const topY = (seg.li - midLevel) * ACME_LEVEL_SPACING;
                buildLadderWeld(gx, gz, topY, ladderEdge);
            }

            for (const seg of connectors) {
                if (random() >= ACME_HANGING_LIGHT_CHANCE) continue;
                const ceilingY = (seg.li - midLevel) * ACME_LEVEL_SPACING;
                buildHangingLight(gx, gz, ceilingY, seg.rise);
            }
        }
    };
};
