/**
 * [ROLE] Spawns a physical, interactable hinged door inside a frame.
 * [WHY] Creates discrete room divisions and requires player interaction, controlling pacing.
 * [STATE] Stateless builder, but pushes door entities into environment tracking arrays (interactiveDoors, spatialGrid).
 * [DEPENDS] Shared geometry, chunk groups, grid hashes, and door materials.
 */
export const HingedDoorwayProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, chunkGroup, hash} = ctx;
    return {
        name: "HINGED DOORWAY",
        prob: 0.78, build: (x, z) => {
            const pW = 1.2, offset = (env.cellSize / 2) - (pW / 2), gap = env.cellSize - (pW * 2);
            const p1 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p1.position.set(x * env.cellSize - offset, 1.5, z * env.cellSize);
            addGeometry(p1);
            const p2 = buildWall(pW, env.cellSize, env.sharedWallMat);
            p2.position.set(x * env.cellSize + offset, 1.5, z * env.cellSize);
            addGeometry(p2);
            const top = new THREE.Mesh(env._boxGeo(gap, 0.3, env.cellSize), env.headerMat);
            top.position.set(x * env.cellSize, 2.85, z * env.cellSize);
            addGeometry(top);
            const frameMat = env.woodMat;
            const jambL = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.32), frameMat);
            jambL.position.set(x * env.cellSize - 0.75, 1.325, z * env.cellSize + 1.85);
            addGeometry(jambL);
            const jambR = new THREE.Mesh(env._boxGeo(0.1, 2.65, 0.32), frameMat);
            jambR.position.set(x * env.cellSize + 0.75, 1.325, z * env.cellSize + 1.85);
            addGeometry(jambR);
            const jambT = new THREE.Mesh(env._boxGeo(1.6, 0.1, 0.32), frameMat);
            jambT.position.set(x * env.cellSize, 2.70, z * env.cellSize + 1.85);
            addGeometry(jambT);
            const doorGeo = env._cacheGeo('hingedDoor:X', () => {
                const g = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                g.translate(0.7, 0, 0.05);
                return g;
            });
            const door = new THREE.Mesh(doorGeo, env.doorMat);
            door.position.set(x * env.cellSize - 0.7, 1.325, z * env.cellSize + 1.85);
            door.castShadow = door.receiveShadow = true;
            door.userData = {
                chunkHash: hash,
                closedRot: 0,
                currentRot: 0
            };
            chunkGroup.add(door);
            env.interactiveDoors.push(door);
            env.walls.push(door);
            door.updateMatrixWorld();
            const dBox = new THREE.Box3().setFromObject(door);
            dBox.chunkHash = hash;
            door.userData.box = dBox;
            env.spatialGrid.insert(dBox);

            if (!ctx.setWall) return;

            const chunkX = Math.floor(x / env.chunkSize);
            const chunkZ = Math.floor(z / env.chunkSize);
            const startX = chunkX * env.chunkSize;
            const startZ = chunkZ * env.chunkSize;
            const endX = startX + env.chunkSize - 1;
            const endZ = startZ + env.chunkSize - 1;

            const key = (cx, cz) => `${cx},${cz}`;
            const claimed = new Set();
            const inChunk = (cx, cz) => cx >= startX && cx <= endX && cz >= startZ && cz <= endZ;
            // ChunkManager iterates x-major (x outer, z inner), so every cell in a column left
            // of this one, and every cell above this one in this column, has already been built
            // and staged. The run is confined to the half-plane ahead of that cursor -- carving
            // backwards would mark a cell open whose wall geometry is already in the scene.
            const ahead = (cx, cz) => cx > x || (cx === x && cz > z);
            const processed = (cx, cz) => cx < x || (cx === x && cz < z);
            const free = (cx, cz) => inChunk(cx, cz) && ahead(cx, cz) && !claimed.has(key(cx, cz));
            // A candidate touching the run on more than one side would fuse two legs into a
            // two-wide space, which stops reading as a corridor and becomes a room.
            const contacts = (cx, cz) => {
                let n = 0;
                if (claimed.has(key(cx + 1, cz))) n++;
                if (claimed.has(key(cx - 1, cz))) n++;
                if (claimed.has(key(cx, cz + 1))) n++;
                if (claimed.has(key(cx, cz - 1))) n++;
                return n;
            };

            const corridor = [];
            const alcoves = [];
            let dir = {dx: 0, dz: 1};
            let cur = {cx: x, cz: z + 1};

            if (free(cur.cx, cur.cz)) {
                corridor.push(cur);
                claimed.add(key(cur.cx, cur.cz));
                const runLength = 4 + Math.floor(random() * 5);
                for (let step = 1; step < runLength; step++) {
                    const left = {dx: -dir.dz, dz: dir.dx};
                    const right = {dx: dir.dz, dz: -dir.dx};
                    // Straight is the default; on a turn roll, a perpendicular leg is preferred
                    // but straight stays as fallback so a blocked turn doesn't end the run early.
                    const options = random() > 0.62
                        ? (random() > 0.5 ? [left, right, dir] : [right, left, dir])
                        : [dir, left, right];
                    let advanced = null;
                    for (const cand of options) {
                        const nx = cur.cx + cand.dx;
                        const nz = cur.cz + cand.dz;
                        if (!free(nx, nz) || contacts(nx, nz) > 1) continue;
                        advanced = {cand, nx, nz};
                        break;
                    }
                    if (!advanced) break;

                    if (advanced.cand.dx !== dir.dx || advanced.cand.dz !== dir.dz) {
                        // The wall a corner faces is the natural spot for a recess: it's what
                        // you walk at before turning away from it.
                        const nook = {cx: cur.cx + dir.dx, cz: cur.cz + dir.dz};
                        if (free(nook.cx, nook.cz) && random() > 0.35) {
                            claimed.add(key(nook.cx, nook.cz));
                            alcoves.push(nook);
                        }
                    }
                    dir = advanced.cand;
                    cur = {cx: advanced.nx, cz: advanced.nz};
                    corridor.push(cur);
                    claimed.add(key(cur.cx, cur.cz));
                }
            }

            corridor.forEach(cell => {
                ctx.setWall(cell.cx, cell.cz, false);
                if (ctx.forceStructure) ctx.forceStructure(cell.cx, cell.cz, null);
            });
            // Alcoves stay wall cells: their profiles build a shallow back-and-side treatment
            // and leave the rest of the cell open, so as a grid wall they read as a recess off
            // the corridor while the pathfinder still treats them as solid.
            alcoves.forEach(cell => {
                ctx.setWall(cell.cx, cell.cz, true);
                if (ctx.forceStructure) {
                    ctx.forceStructure(cell.cx, cell.cz, random() > 0.5 ? "ALCOVE CORNER" : "ROUND ALCOVE");
                }
            });

            // An unmatched forced name resolves to no profile, and ChunkManager's fallback for
            // that case is a plain solid wall -- which is exactly what's wanted. Left unforced,
            // these border cells roll the full structural matrix and land on header gaps, vents
            // and tunnels; that is what was perforating the space behind the door and reducing
            // the door itself to decoration.
            const SOLID = "SOLID FILL";
            const sealed = new Set();
            const seal = (cx, cz) => {
                if (!inChunk(cx, cz)) return;
                if (claimed.has(key(cx, cz))) return;
                if (cx === x && cz === z) return;
                if (sealed.has(key(cx, cz))) return;
                sealed.add(key(cx, cz));
                const wasWall = ctx.isWall(cx, cz);
                ctx.setWall(cx, cz, true);
                if (ctx.forceStructure) ctx.forceStructure(cx, cz, SOLID);
                if (processed(cx, cz) && !wasWall) {
                    const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                    wall.position.set(cx * env.cellSize, 1.5, cz * env.cellSize);
                    addGeometry(wall);
                }
            };
            corridor.concat(alcoves).forEach(cell => {
                for (let ox = -1; ox <= 1; ox++) {
                    for (let oz = -1; oz <= 1; oz++) {
                        if (ox === 0 && oz === 0) continue;
                        seal(cell.cx + ox, cell.cz + oz);
                    }
                }
            });

            if (corridor.length && ctx.forceStructure) {
                const last = corridor[corridor.length - 1];
                const beyond = {cx: last.cx + dir.dx, cz: last.cz + dir.dz};
                if (inChunk(beyond.cx, beyond.cz) && !claimed.has(key(beyond.cx, beyond.cz)) && !processed(beyond.cx, beyond.cz)) {
                    const endRoll = random();
                    if (endRoll > 0.72 && dir.dz === 1) {
                        // Chaining only works while still heading +Z. The door, its frame and its
                        // own carve are all built facing that way, so a chained door on a sideways
                        // terminus would hang across the corridor rather than close it off.
                        ctx.forceStructure(beyond.cx, beyond.cz, "HINGED DOORWAY");
                    } else if (endRoll > 0.46) {
                        const exits = ["CRAWLSPACE_HALL", "breach", "DUCT OR VENT"];
                        const pick = exits[Math.floor(random() * exits.length)];
                        // DuctOrVent runs from the wall path and carves its own way through the
                        // grid; the other two are handled from the empty-cell path and need the
                        // cell open before they will build at all.
                        ctx.setWall(beyond.cx, beyond.cz, pick === "DUCT OR VENT");
                        ctx.forceStructure(beyond.cx, beyond.cz, pick);
                    }
                    // Otherwise the seal stands and the run is a dead end.
                }
            }
        }
    };
};
