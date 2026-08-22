import {placeSectorPaper} from '../NarrativeProps.js';

// ACME is a bottomless-canyon sector: a stack of sparse catwalk levels
// straddling y=0, open to a near-infinite sky above and a near-infinite drop
// below, with shipping containers hanging loose in the gaps between them.
// The level count/spacing live here; ChunkManager reads ACME_LEVEL_SPACING
// to size the per-level maze stack it hands into `build`.
export const ACME_LEVEL_SPACING = 1.2;

const ACME_PLATFORM_SKIP_CHANCE = 0.58;
const ACME_CONTAINER_CHANCE = 0.05;
const ACME_ENTRANCE_CLEARANCE_LEVELS = 3;

// Doorway approach cells the maze generator force-carves a straight corridor
// to from the sector center - see SetPieces.generateSectorMaze.
const DOORWAY_ANCHORS = [[7, 1], [7, 14], [1, 7], [14, 7]];

const createAcmeContainerTexture = (serial) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx2d = canvas.getContext('2d', {alpha: false});
    ctx2d.fillStyle = '#c06a35';
    ctx2d.fillRect(0, 0, 512, 512);
    ctx2d.strokeStyle = '#8a4a22';
    ctx2d.lineWidth = 5;
    for (let i = 16; i < 512; i += 22) {
        ctx2d.beginPath();
        ctx2d.moveTo(0, i);
        ctx2d.lineTo(512, i);
        ctx2d.stroke();
    }
    ctx2d.fillStyle = '#2a1608';
    ctx2d.font = 'bold 64px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('ACME-' + serial, 256, 230);
    ctx2d.font = '32px sans-serif';
    ctx2d.fillText('WB HOLDINGS', 256, 290);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

const ensureAcmeMaterials = (env) => {
    if (!env.acmeContainerMats) {
        env.acmeContainerMats = [412, 187, 903, 256].map(serial => {
            const mat = new THREE.MeshStandardMaterial({map: createAcmeContainerTexture(serial), roughness: 0.75, metalness: 0.2});
            env.sharedAssets.add(mat.uuid);
            return mat;
        });
    }
    if (!env.warehouseMat) {
        env.warehouseMat = new THREE.MeshStandardMaterial({color: 0x8a5a3a, roughness: 0.85, metalness: 0.15});
        env.sharedAssets.add(env.warehouseMat.uuid);
    }
    if (!env.blackIronMat) {
        env.blackIronMat = new THREE.MeshStandardMaterial({color: 0x151515, roughness: 0.7, metalness: 0.9});
        env.sharedAssets.add(env.blackIronMat.uuid);
    }
    if (!env._acmeLampMat) {
        env._acmeLampMat = new THREE.MeshStandardMaterial({color: 0xffcf8a, emissive: 0xffaa44, emissiveIntensity: 1.6, roughness: 0.4});
        env.sharedAssets.add(env._acmeLampMat.uuid);
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

    // Containers don't sit on a level's catwalk - they hang loose in the
    // open shaft, so they're free to be full height and just need a clear
    // vertical gap to occupy, checked by the caller.
    const buildFloatingContainer = (gx, gz, centerY, h) => {
        const mat = env.acmeContainerMats[Math.floor(random() * env.acmeContainerMats.length)];
        const alongX = random() < 0.5;
        const long = env.cellSize - 0.3;
        const short = env.cellSize * 0.5;
        const box = buildWall(alongX ? long : short, alongX ? short : long, mat, h);
        box.position.set(gx, centerY, gz);
        addGeometry(box);
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

            if (env._acmeLampHash !== hash) {
                env._acmeLampHash = hash;
                const band = [];
                for (let ix = 3; ix <= 12; ix++) for (let iz = 3; iz <= 12; iz++) band.push(ix * env.chunkSize + iz);
                let s = (hash ^ 0x00AC4E00) >>> 0;
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
                const want = 2 + Math.floor(rng() * 2);
                env._acmeLampSet = new Set(band.slice(0, want));
            }
            if (env._acmeLampSet && env._acmeLampSet.has(localX * env.chunkSize + localZ)) {
                const poleH = (levelMazes.length - 1) * ACME_LEVEL_SPACING + 2.0;
                const poleBaseY = -(midLevel * ACME_LEVEL_SPACING) - 1.0;
                const pole = buildWall(0.15, 0.15, env.blackIronMat, poleH);
                pole.position.set(gx, poleBaseY + poleH / 2, gz);
                addGeometry(pole);
                for (let ly = poleBaseY + 1.5; ly < poleBaseY + poleH; ly += 4.0) {
                    const lamp = buildWall(0.3, 0.3, env._acmeLampMat, 0.2);
                    lamp.position.set(gx, ly, gz);
                    addGeometry(lamp);
                }
            }

            // Pass 1: decide which levels get a catwalk in this cell.
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

            // Pass 2: build the catwalks.
            for (let li = 0; li < levelMazes.length; li++) {
                if (!decisions[li]) continue;
                const levelBaseY = (li - midLevel) * ACME_LEVEL_SPACING;
                buildCatwalk(gx, gz, levelBaseY);
            }

            // Pass 3: containers don't belong to any one level - drop one
            // into the widest clear vertical gap in this column, as long as
            // there's room for it (with margin) so it never grows through
            // whatever's built above or below.
            if (!nearEntrance && random() < ACME_CONTAINER_CHANCE) {
                let bestStart = -1, bestLen = 0, runStart = -1;
                for (let li = 0; li <= levelMazes.length; li++) {
                    const isGap = li < levelMazes.length && !decisions[li];
                    if (isGap) {
                        if (runStart === -1) runStart = li;
                    } else if (runStart !== -1) {
                        const len = li - runStart;
                        if (len > bestLen) { bestLen = len; bestStart = runStart; }
                        runStart = -1;
                    }
                }
                if (bestLen >= 2) {
                    const loY = (bestStart - midLevel) * ACME_LEVEL_SPACING - ACME_LEVEL_SPACING / 2;
                    const hiY = (bestStart + bestLen - 1 - midLevel) * ACME_LEVEL_SPACING + ACME_LEVEL_SPACING / 2;
                    const gap = hiY - loY;
                    const h = Math.min(2.6, gap - 0.6);
                    const centerY = loY + gap / 2;
                    buildFloatingContainer(gx, gz, centerY, h);
                }
            }
        }
    };
};
