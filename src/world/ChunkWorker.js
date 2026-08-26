const CELL_KEY_SPAN = 4194304;
const cellKey = (x, z) => x * (CELL_KEY_SPAN * 2) + z;

function _airlockApron(airlock, cellSize) {
    // Just enough for standing-height approach to the threshold: the airlock's own built
    // chamber is already exactly one cell wide, so the apron only needs to guarantee the one
    // cell right outside the threshold isn't blocked - not a whole foyer.
    const wox = Math.round(airlock.outerPos.x / cellSize);
    const woz = Math.round(airlock.outerPos.z / cellSize);
    const dir = airlock.outSign;
    if (airlock.spansX) {
        return {
            clearX: [wox],
            clearZ: [woz, woz + dir]
        };
    }
    return {
        clearX: [wox, wox + dir],
        clearZ: [woz]
    };
}

function _isAirlockApron(x, z, airlocks, cellSize) {
    if (!airlocks || airlocks.length === 0) return false;
    for (let i = 0; i < airlocks.length; i++) {
        const {clearX, clearZ} = _airlockApron(airlocks[i], cellSize);
        if (clearX.indexOf(x) !== -1 && clearZ.indexOf(z) !== -1) return true;
    }
    return false;
}

const TERMINUS_EXITS = ["DUCT", "VENT", "CRAWLSPACE_DUCT", "CRAWLSPACE_DUCT"];

function _planDoorwayRun(random, doorX, doorZ, dir, inChunk, cellKey, reserved, approaches, runMin, runMax, airlocks, cellSize, getForcedFn, pathTheme, isWallFn) {
    const claimed = new Set();
    const key = (a, b) => cellKey(a, b);
    const approachX = doorX - dir.dx;
    const approachZ = doorZ - dir.dz;
    const isApproach = (cx, cz) => cx === approachX && cz === approachZ;
    const touchesApproach = (cx, cz) => {
        if (Math.abs(cx - approachX) + Math.abs(cz - approachZ) === 1) return true;
        return approaches.has(key(cx + 1, cz)) || approaches.has(key(cx - 1, cz)) ||
               approaches.has(key(cx, cz + 1)) || approaches.has(key(cx, cz - 1));
    };

    const isApron = (cx, cz) => _isAirlockApron(cx, cz, airlocks, cellSize);

    const isArtery = (cx, cz) => !!pathTheme && !!getForcedFn && getForcedFn(cx, cz) === pathTheme;

    const free = (cx, cz) => inChunk(cx, cz) &&
        !isApron(cx, cz) &&
        !isArtery(cx, cz) &&
        !reserved.has(key(cx, cz)) && !claimed.has(key(cx, cz)) &&
        !isApproach(cx, cz) &&
        !(cx === doorX && cz === doorZ);
        
    const contacts = (cx, cz) => {
        let n = 0;
        if (claimed.has(key(cx + 1, cz))) n++;
        if (claimed.has(key(cx - 1, cz))) n++;
        if (claimed.has(key(cx, cz + 1))) n++;
        if (claimed.has(key(cx, cz - 1))) n++;
        return n;
    };

    let cur = {cx: doorX + dir.dx, cz: doorZ + dir.dz};
    if (!free(cur.cx, cur.cz) || touchesApproach(cur.cx, cur.cz)) return null;

    const corridor = [cur];
    const alcoves = [];
    claimed.add(key(cur.cx, cur.cz));
    let heading = {dx: dir.dx, dz: dir.dz};
    const runLength = runMin + Math.floor(random() * (runMax - runMin + 1));

    for (let step = 1; step < runLength; step++) {
        const left = {dx: -heading.dz, dz: heading.dx};
        const right = {dx: heading.dz, dz: -heading.dx};
        const options = random() > 0.62
            ? (random() > 0.5 ? [left, right, heading] : [right, left, heading])
            : [heading, left, right];
        let advanced = null;
        for (const cand of options) {
            const nx = cur.cx + cand.dx;
            const nz = cur.cz + cand.dz;
            if (!free(nx, nz) || contacts(nx, nz) > 1 || touchesApproach(nx, nz)) continue;
            advanced = {cand, nx, nz};
            break;
        }
        if (!advanced) break;

        if (advanced.cand.dx !== heading.dx || advanced.cand.dz !== heading.dz) {
            const nook = {cx: cur.cx + heading.dx, cz: cur.cz + heading.dz};
            if (free(nook.cx, nook.cz) && random() > 0.35) {
                claimed.add(key(nook.cx, nook.cz));
                alcoves.push(nook);
            }
        }
        heading = advanced.cand;
        cur = {cx: advanced.nx, cz: advanced.nz};
        corridor.push(cur);
        claimed.add(key(cur.cx, cur.cz));
    }

    if (corridor.length < 2) return null;

    const sealSet = new Set();
    const seal = [];
    corridor.concat(alcoves).forEach(c => {
        for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
                if (!ox && !oz) continue;
                const sx = c.cx + ox;
                const sz = c.cz + oz;
                if (!inChunk(sx, sz)) continue;
                if (claimed.has(key(sx, sz))) continue;
                if (sx === doorX && sz === doorZ) continue;
                if (isApproach(sx, sz)) continue;
                if (isApron(sx, sz)) continue;
                if (isArtery(sx, sz)) continue;
                if (reserved.has(key(sx, sz))) continue;
                if (sealSet.has(key(sx, sz))) continue;
                sealSet.add(key(sx, sz));
                seal.push({cx: sx, cz: sz});
            }
        }
    });

    const corridorKeys = new Set(corridor.map(c => key(c.cx, c.cz)));
    const alcoveKeys = new Set(alcoves.map(c => key(c.cx, c.cz)));
    const openAfterPlan = (cx, cz) => {
        const k = key(cx, cz);
        if (corridorKeys.has(k)) return true;
        if (alcoveKeys.has(k) || sealSet.has(k)) return false;
        if (cx === doorX && cz === doorZ) return false;
        return isWallFn ? !isWallFn(cx, cz) : false;
    };
    for (const c of corridor) {
        const around = [[c.cx + 1, c.cz], [c.cx - 1, c.cz], [c.cx, c.cz + 1], [c.cx, c.cz - 1]];
        for (const [nx, nz] of around) {
            if (corridorKeys.has(key(nx, nz))) continue;
            if (openAfterPlan(nx, nz)) return null;
        }
    }

    let terminus = null;
    const last = corridor[corridor.length - 1];
    const beyond = {cx: last.cx + heading.dx, cz: last.cz + heading.dz};

    if (inChunk(beyond.cx, beyond.cz) && !reserved.has(key(beyond.cx, beyond.cz)) &&
        !claimed.has(key(beyond.cx, beyond.cz)) && !isApproach(beyond.cx, beyond.cz) &&
        !isApron(beyond.cx, beyond.cz) && !isArtery(beyond.cx, beyond.cz)) {
        const endRoll = random();
        if (endRoll > 0.60) {
            terminus = {cx: beyond.cx, cz: beyond.cz, name: "HINGED DOORWAY", heading};
        } else if (endRoll > 0.05) {
            terminus = {cx: beyond.cx, cz: beyond.cz, name: TERMINUS_EXITS[Math.floor(random() * TERMINUS_EXITS.length)], heading};
        }
    }

    return {corridor, alcoves, seal, terminus, heading};
}

function _planDoorways(random, startX, startZ, size, isWallFn, forcedStructureFn, setWallFn, forceStructureFn, airlocks, cellSize, outPlans, pathTheme) {
    const DOORWAY_RATE = 0.08;
    const RUN_MIN = 4;
    const RUN_MAX = 8;
    const SOLID = "SOLID FILL";
    const DIRS = [{dx: 0, dz: 1}, {dx: 1, dz: 0}, {dx: 0, dz: -1}, {dx: -1, dz: 0}];

    const endX = startX + size - 1;
    const endZ = startZ + size - 1;
    const inChunk = (cx, cz) => cx >= startX && cx <= endX && cz >= startZ && cz <= endZ;
    const reserved = new Set();
    const approaches = new Set();
    const key = (a, b) => cellKey(a, b);

    for (let cx = startX; cx <= endX; cx++) {
        for (let cz = startZ; cz <= endZ; cz++) {
            if (reserved.has(key(cx, cz))) continue;
            if (forcedStructureFn(cx, cz)) continue;
            if (_isAirlockApron(cx, cz, airlocks, cellSize)) continue;
            if (!isWallFn(cx, cz)) continue;
            if (random() > DOORWAY_RATE) continue;

            const offset = Math.floor(random() * DIRS.length);
            let plan = null;
            let dir = null;
            for (let d = 0; d < DIRS.length && !plan; d++) {
                const cand = DIRS[(d + offset) % DIRS.length];
                const approachX = cx - cand.dx;
                const approachZ = cz - cand.dz;
                if (!inChunk(approachX, approachZ)) continue;
                if (isWallFn(approachX, approachZ)) continue;
                plan = _planDoorwayRun(random, cx, cz, cand, inChunk, cellKey, reserved, approaches, RUN_MIN, RUN_MAX, airlocks, cellSize, forcedStructureFn, pathTheme, isWallFn);
                if (plan) dir = cand;
            }
            if (!plan) continue;

            const apply = (p, dx, dz, facing) => {
                p.corridor.forEach(c => {
                    setWallFn(c.cx, c.cz, false);
                    forceStructureFn(c.cx, c.cz, pathTheme || null);
                    reserved.add(key(c.cx, c.cz));
                });
                p.alcoves.forEach(c => {
                    setWallFn(c.cx, c.cz, true);
                    forceStructureFn(c.cx, c.cz, random() > 0.5 ? "ALCOVE CORNER" : "ROUND ALCOVE");
                    reserved.add(key(c.cx, c.cz));
                });
                p.seal.forEach(c => {
                    setWallFn(c.cx, c.cz, true);
                    forceStructureFn(c.cx, c.cz, SOLID);
                    reserved.add(key(c.cx, c.cz));
                });
                setWallFn(dx, dz, true);
                forceStructureFn(dx, dz, "HINGED DOORWAY");
                reserved.add(key(dx, dz));
                reserved.add(key(dx - facing.dx, dz - facing.dz));
                approaches.add(key(dx - facing.dx, dz - facing.dz));
                outPlans.set(key(dx, dz), {rot: Math.atan2(facing.dx, facing.dz), facing});
            };

            apply(plan, cx, cz, dir);

            let pending = plan.terminus;
            let chainBudget = 2;
            while (pending) {
                const t = pending;
                pending = null;
                if (t.name !== "HINGED DOORWAY") {
                    setWallFn(t.cx, t.cz, true);
                    forceStructureFn(t.cx, t.cz, t.name);
                    reserved.add(key(t.cx, t.cz));
                    break;
                }
                const nextPlan = chainBudget-- > 0
                    ? _planDoorwayRun(random, t.cx, t.cz, t.heading, inChunk, cellKey, reserved, approaches, RUN_MIN, RUN_MAX, airlocks, cellSize, forcedStructureFn, pathTheme, isWallFn)
                    : null;
                if (!nextPlan) {
                    t.name = TERMINUS_EXITS[Math.floor(random() * TERMINUS_EXITS.length)];
                    setWallFn(t.cx, t.cz, true);
                    forceStructureFn(t.cx, t.cz, t.name);
                    reserved.add(key(t.cx, t.cz));
                    break;
                }
                apply(nextPlan, t.cx, t.cz, t.heading);
                pending = nextPlan.terminus;
            }
        }
    }
}

self.onmessage = function(e) {
    const hash = e.data && e.data.hash;
    try {
    const {
        chunkX,
        chunkZ,
        startX,
        startZ,
        chunkSize,
        cellSize,
        baseSeed,
        cx,
        cy,
        airlocks
    } = e.data;

    let prngSeed = (baseSeed + (chunkX * 104729) + (chunkZ * 1299827)) >>> 0;
    const random = () => {
        prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
        return prngSeed / 4294967296.0;
    };

    const isWallGrid = new Map();
    const forcedStructuresGrid = new Map();
    const doorwayPlans = new Map();

    const pathThemeRoll = random();
    let pathTheme = null;
    if (pathThemeRoll > 0.80) pathTheme = 'CRAWLSPACE_HALL';
    else if (pathThemeRoll > 0.60) pathTheme = 'CREVICE_HALL';
    else if (pathThemeRoll > 0.40) pathTheme = 'RIDE_QUEUE_HALL';
    else if (pathThemeRoll > 0.18) pathTheme = 'ARCH_HALL';

    const wanderingPath = pathTheme === 'ARCH_HALL';
    const clampX = (v) => Math.max(startX, Math.min(startX + chunkSize - 1, v));
    const clampZ = (v) => Math.max(startZ, Math.min(startZ + chunkSize - 1, v));

    const cX = startX + Math.floor(chunkSize/2);
    const cZ = startZ + Math.floor(chunkSize/2);
    const pathGrid = new Map();

    const pathTouchCount = (px, pz) => {
        let n = 0;
        if (pathGrid.has(cellKey(px + 1, pz))) n++;
        if (pathGrid.has(cellKey(px - 1, pz))) n++;
        if (pathGrid.has(cellKey(px, pz + 1))) n++;
        if (pathGrid.has(cellKey(px, pz - 1))) n++;
        return n;
    };

    const carvePath = (tx, tz) => {
        let currX = cX;
        let currZ = cZ;
        let failsafe = 0;
        let detour = 0;
        let detourAlongX = false;
        let detourSign = 1;
        while ((currX !== tx || currZ !== tz) && failsafe < 200) {
            pathGrid.set(cellKey(currX, currZ), true);
            const dx = tx - currX;
            const dz = tz - currZ;
            if (wanderingPath) {
                const spent = detourAlongX ? dx === 0 : dz === 0;
                if (detour <= 0 || spent) {
                    let preferX = Math.abs(dx) > Math.abs(dz);
                    if (random() > 0.70) preferX = !preferX;
                    if (preferX && dx === 0) preferX = false;
                    if (!preferX && dz === 0) preferX = true;
                    const delta = preferX ? dx : dz;
                    detourAlongX = preferX;
                    detourSign = delta !== 0 ? Math.sign(delta) : (random() > 0.5 ? 1 : -1);
                    if (random() > 0.86) detourSign = -detourSign;
                    detour = 2 + Math.floor(random() * 4);
                }
                detour--;
                const ax = detourAlongX ? detourSign : 0;
                const az = detourAlongX ? 0 : detourSign;

                let nextX = clampX(currX + ax);
                let nextZ = clampZ(currZ + az);
                if (pathTouchCount(nextX, nextZ) > 1) {
                    detour = 0;
                    const backX = Math.abs(dx) > Math.abs(dz) ? Math.sign(dx) : 0;
                    const backZ = backX === 0 ? Math.sign(dz) : 0;
                    const altX = clampX(currX + backX);
                    const altZ = clampZ(currZ + backZ);
                    if (pathTouchCount(altX, altZ) <= 1) {
                        nextX = altX;
                        nextZ = altZ;
                    }
                }
                currX = nextX;
                currZ = nextZ;
                failsafe++;
                continue;
            }
            if (Math.abs(dx) > Math.abs(dz)) {
                currX += Math.sign(dx);
                pathGrid.set(cellKey(currX, currZ), true);
                if (random() > 0.5 && dz !== 0) currZ += Math.sign(dz);
                else if (random() > 0.8) currZ += (random() > 0.5 ? 1 : -1);
            } else {
                currZ += Math.sign(dz);
                pathGrid.set(cellKey(currX, currZ), true);
                if (random() > 0.5 && dx !== 0) currX += Math.sign(dx);
                else if (random() > 0.8) currX += (random() > 0.5 ? 1 : -1);
            }
            failsafe++;
        }
        pathGrid.set(cellKey(tx, tz), true);
    };
    
    carvePath(startX + 7, startZ);
    carvePath(startX + 7, startZ + chunkSize - 1);
    carvePath(startX, startZ + 7);
    carvePath(startX + chunkSize - 1, startZ + 7);
    
    if (startX === 0 && startZ === 0) {
        carvePath(0, 0);
    }
    
    if (airlocks) {
        for (const airlock of airlocks) {
            const chunkCx = (startX + chunkSize/2) * cellSize;
            const chunkCz = (startZ + chunkSize/2) * cellSize;
            const dx = airlock.chamberCenter.x - chunkCx;
            const dz = airlock.chamberCenter.z - chunkCz;
            if (Math.abs(dx) <= chunkSize * cellSize && Math.abs(dz) <= chunkSize * cellSize) {
                const wox = Math.round(airlock.outerPos.x / cellSize);
                const woz = Math.round(airlock.outerPos.z / cellSize);
                carvePath(wox, woz);
            }
        }
    }

    const isWallFn = (wx, wz) => {
        const key = cellKey(wx, wz);
        if (isWallGrid.has(key)) return isWallGrid.get(key);
        
        let zx = wx * 0.15;
        let zy = wz * 0.15;
        let iter = 0;
        let zx2 = zx * zx;
        let zy2 = zy * zy;
        while (zx2 + zy2 < 4 && iter < 15) {
            zy = 2 * zx * zy + cy;
            zx = zx2 - zy2 + cx;
            zx2 = zx * zx;
            zy2 = zy * zy;
            iter++;
        }
        let isW = iter > 6;
        const flipSeed = (baseSeed + (wx * 104729) + (wz * 1299827)) >>> 0;
        const flipRand = ((flipSeed * 1664525 + 1013904223) >>> 0) / 4294967296.0;
        if (flipRand > 0.70) isW = !isW;

        let isOnPath = pathGrid.has(key);
        let isNearPath = isOnPath;
        if (!isNearPath) {
            for (let ox = -1; ox <= 1; ox++) {
                for (let oz = -1; oz <= 1; oz++) {
                    if (pathGrid.has(cellKey(wx + ox, wz + oz))) {
                        isNearPath = true;
                        break;
                    }
                }
                if (isNearPath) break;
            }
        }

        if (isNearPath) isW = true;

        const cx_id = Math.floor(wx / chunkSize);
        const cz_id = Math.floor(wz / chunkSize);
        const lx = wx - (cx_id * chunkSize);
        const lz = wz - (cz_id * chunkSize);

        const isSpawnClear = (cx_id === 0 && cz_id === 0) && (lx <= 4 && lz <= 4);
        if (isSpawnClear) isW = false;

        if (isOnPath && !isSpawnClear) {
            if (pathTheme) {
                forcedStructuresGrid.set(key, pathTheme);
            }
            isW = false;
        }

        isWallGrid.set(key, isW);
        return isW;
    };
    
    const setWallFn = (wx, wz, val) => {
        isWallGrid.set(cellKey(wx, wz), val);
    };
    const forceStructureFn = (wx, wz, name) => forcedStructuresGrid.set(cellKey(wx, wz), name);
    const getForcedStructureFn = (wx, wz) => forcedStructuresGrid.get(cellKey(wx, wz));

    const grid = new Int8Array(chunkSize * chunkSize);
    const q = [];

    for (let lx = 0; lx < chunkSize; lx++) {
        for (let lz = 0; lz < chunkSize; lz++) {
            if (!isWallFn(startX + lx, startZ + lz)) {
                grid[lz * chunkSize + lx] = 1;
                if (lx === 7 || lz === 7 || lx === 3 || lx === 11 || lz === 3 || lz === 11) {
                    grid[lz * chunkSize + lx] = 2;
                    q.push({lx, lz});
                }
            }
        }
    }

    if (airlocks) {
        for (const airlock of airlocks) {
            const chunkCx = (startX + chunkSize/2) * cellSize;
            const chunkCz = (startZ + chunkSize/2) * cellSize;
            const dx = airlock.chamberCenter.x - chunkCx;
            const dz = airlock.chamberCenter.z - chunkCz;

            if (Math.abs(dx) <= chunkSize * cellSize && Math.abs(dz) <= chunkSize * cellSize) {
                const {clearX, clearZ} = _airlockApron(airlock, cellSize);

                for (const a_cx of clearX) {
                    for (const a_cz of clearZ) {
                        const lx = a_cx - startX;
                        const lz = a_cz - startZ;
                        if (lx >= 0 && lx < chunkSize && lz >= 0 && lz < chunkSize) {
                            setWallFn(a_cx, a_cz, false);
                            forceStructureFn(a_cx, a_cz, null);
                            if (grid[lz * chunkSize + lx] !== 2) {
                                grid[lz * chunkSize + lx] = 2;
                                q.push({lx, lz});
                            }
                        }
                    }
                }
            }
        }
    }

    const totalCells = chunkSize * chunkSize;
    const INF = 1 << 30;
    const bfsDist = new Int32Array(totalCells).fill(INF);
    const bfsParent = new Int32Array(totalCells).fill(-1);
    let dqBuf = new Int32Array(totalCells * 8);
    let dqHead = totalCells * 4;
    let dqTail = dqHead;
    const recentre = () => {
        const used = dqTail - dqHead;
        const next = new Int32Array(Math.max(dqBuf.length * 2, used * 4));
        const start = (next.length - used) >> 1;
        next.set(dqBuf.subarray(dqHead, dqTail), start);
        dqBuf = next;
        dqHead = start;
        dqTail = start + used;
    };
    const pushFront = (v) => {
        if (dqHead === 0) recentre();
        dqBuf[--dqHead] = v;
    };
    const pushBack = (v) => {
        if (dqTail === dqBuf.length) recentre();
        dqBuf[dqTail++] = v;
    };
    for (const seed of q) {
        const idx = seed.lz * chunkSize + seed.lx;
        if (bfsDist[idx] === INF) {
            bfsDist[idx] = 0;
            pushBack(idx);
        }
    }
    while (dqHead < dqTail) {
        const idx = dqBuf[dqHead++];
        const clx = idx % chunkSize;
        const clz = (idx - clx) / chunkSize;
        const d = bfsDist[idx];
        const neighbors = [[clx + 1, clz], [clx - 1, clz], [clx, clz + 1], [clx, clz - 1]];
        for (const [nlx, nlz] of neighbors) {
            if (nlx < 0 || nlz < 0 || nlx >= chunkSize || nlz >= chunkSize) continue;
            const nIdx = nlz * chunkSize + nlx;
            const cost = grid[nIdx] === 0 ? 1 : 0;
            const nd = d + cost;
            if (nd < bfsDist[nIdx]) {
                bfsDist[nIdx] = nd;
                bfsParent[nIdx] = idx;
                if (cost === 0) {
                    pushFront(nIdx);
                } else {
                    pushBack(nIdx);
                }
            }
        }
    }

    const forcedOpen = new Set();
    for (let idx = 0; idx < totalCells; idx++) {
        if (grid[idx] === 0 || bfsDist[idx] <= 0) continue;
        let cur = idx;
        let guard = 0;
        while (cur !== -1 && bfsDist[cur] > 0 && guard < totalCells) {
            if (grid[cur] === 0) forcedOpen.add(cur);
            cur = bfsParent[cur];
            guard++;
        }
    }
    for (const idx of forcedOpen) {
        const lx = idx % chunkSize;
        const lz = (idx - lx) / chunkSize;
        const gx = startX + lx;
        const gz = startZ + lz;
        setWallFn(gx, gz, false);
        if (_isAirlockApron(gx, gz, airlocks, cellSize)) continue;
        forceStructureFn(gx, gz, 'empty_door_frame');
    }

    _planDoorways(random, startX, startZ, chunkSize, isWallFn, getForcedStructureFn, setWallFn, forceStructureFn, airlocks, cellSize, doorwayPlans, pathTheme);

    self.postMessage({
        hash,
        isWallGrid: Array.from(isWallGrid.entries()),
        forcedStructuresGrid: Array.from(forcedStructuresGrid.entries()),
        doorwayPlans: Array.from(doorwayPlans.entries())
    });
    } catch (err) {
        // Never let a thrown exception here vanish as an unhandled worker error: the main
        // thread is awaiting a resolver keyed on `hash` for every chunk build, and an
        // uncaught error would leave that await pending forever, permanently wedging
        // ChunkManager.isBuildingChunk and halting all future chunk generation for the rest
        // of the session with no console output. Resolve with empty (wall-less) grids instead
        // so the requesting chunk build can complete — degraded for this one chunk, not fatal.
        self.postMessage({
            hash,
            isWallGrid: [],
            forcedStructuresGrid: [],
            doorwayPlans: [],
            error: (err && err.message) || String(err)
        });
    }
};
