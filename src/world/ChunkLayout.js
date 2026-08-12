const CELL_KEY_SPAN = 4194304;
const cellKey = (x, z) => x * (CELL_KEY_SPAN * 2) + z;

export default class ChunkLayout {
    constructor(chunkSize) {
        this.chunkSize = chunkSize;
        const totalCells = chunkSize * chunkSize;
        this.INF = 1 << 30;
        this.bfsDist = new Int32Array(totalCells);
        this.bfsParent = new Int32Array(totalCells);
        this.dqBuf = new Int32Array(totalCells * 8);
        this.grid = new Int8Array(totalCells);
    }

    _airlockApron(airlock, cellSize) {
        const wox = Math.round(airlock.outerPos.x / cellSize);
        const woz = Math.round(airlock.outerPos.z / cellSize);
        const dir = airlock.outSign;
        if (airlock.spansX) {
            return {
                clearX: [wox - 1, wox, wox + 1],
                clearZ: [woz, woz + dir, woz + dir * 2, woz + dir * 3]
            };
        }
        return {
            clearX: [wox, wox + dir, wox + dir * 2, wox + dir * 3],
            clearZ: [woz - 1, woz, woz + 1]
        };
    }

    isAirlockApron(x, z, env) {
        const airlocks = env.airlocks;
        if (!airlocks) return false;
        for (let i = 0; i < airlocks.length; i++) {
            const {clearX, clearZ} = this._airlockApron(airlocks[i], env.cellSize);
            if (clearX.indexOf(x) !== -1 && clearZ.indexOf(z) !== -1) return true;
        }
        return false;
    }

    _planDoorwayRun(ctx, random, doorX, doorZ, dir, inChunk, reserved, approaches, runMin, runMax, env) {
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
        const free = (cx, cz) => inChunk(cx, cz) &&
            !this.isAirlockApron(cx, cz, env) &&
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
                    if (this.isAirlockApron(sx, sz, env)) continue;
                    if (reserved.has(key(sx, sz))) continue;
                    if (sealSet.has(key(sx, sz))) continue;
                    sealSet.add(key(sx, sz));
                    seal.push({cx: sx, cz: sz});
                }
            }
        });

        let terminus = null;
        const last = corridor[corridor.length - 1];
        const beyond = {cx: last.cx + heading.dx, cz: last.cz + heading.dz};
        if (inChunk(beyond.cx, beyond.cz) && !reserved.has(key(beyond.cx, beyond.cz)) &&
            !claimed.has(key(beyond.cx, beyond.cz)) && !isApproach(beyond.cx, beyond.cz) &&
            !this.isAirlockApron(beyond.cx, beyond.cz, env)) {
            const endRoll = random();
            if (endRoll > 0.60) {
                terminus = {cx: beyond.cx, cz: beyond.cz, name: "HINGED DOORWAY", heading};
            } else if (endRoll > 0.05) {
                const exits = ["CRAWLSPACE_HALL", "breach", "DUCT OR VENT", "CREVICE_HALL"];
                terminus = {cx: beyond.cx, cz: beyond.cz, name: exits[Math.floor(random() * exits.length)], heading};
            }
        }

        return {corridor, alcoves, seal, terminus, heading};
    }

    _planDoorways(ctx, random, startX, startZ, doorwayPlans, env) {
        const DOORWAY_RATE = 0.08;
        const RUN_MIN = 4;
        const RUN_MAX = 8;
        const SOLID = "SOLID FILL";
        const DIRS = [{dx: 0, dz: 1}, {dx: 1, dz: 0}, {dx: 0, dz: -1}, {dx: -1, dz: 0}];

        const size = this.chunkSize;
        const endX = startX + size - 1;
        const endZ = startZ + size - 1;
        const inChunk = (cx, cz) => cx >= startX && cx <= endX && cz >= startZ && cz <= endZ;
        const reserved = new Set();
        const approaches = new Set();

        for (let cx = startX; cx <= endX; cx++) {
            for (let cz = startZ; cz <= endZ; cz++) {
                if (reserved.has(cellKey(cx, cz))) continue;
                if (ctx.getForcedStructure && ctx.getForcedStructure(cx, cz)) continue;
                if (this.isAirlockApron(cx, cz, env)) continue;
                if (!ctx.isWall(cx, cz)) continue;
                if (random() > DOORWAY_RATE) continue;

                const offset = Math.floor(random() * DIRS.length);
                let plan = null;
                let dir = null;
                for (let d = 0; d < DIRS.length && !plan; d++) {
                    const cand = DIRS[(d + offset) % DIRS.length];
                    const approachX = cx - cand.dx;
                    const approachZ = cz - cand.dz;
                    if (!inChunk(approachX, approachZ)) continue;
                    if (ctx.isWall(approachX, approachZ)) continue;
                    plan = this._planDoorwayRun(ctx, random, cx, cz, cand, inChunk, reserved, approaches, RUN_MIN, RUN_MAX, env);
                    if (plan) dir = cand;
                }
                if (!plan) continue;

                const key = (a, b) => cellKey(a, b);
                const apply = (p, dx, dz, facing) => {
                    p.corridor.forEach(c => {
                        ctx.setWall(c.cx, c.cz, false);
                        ctx.forceStructure(c.cx, c.cz, null);
                        reserved.add(key(c.cx, c.cz));
                    });
                    p.alcoves.forEach(c => {
                        ctx.setWall(c.cx, c.cz, true);
                        ctx.forceStructure(c.cx, c.cz, random() > 0.5 ? "ALCOVE CORNER" : "ROUND ALCOVE");
                        reserved.add(key(c.cx, c.cz));
                    });
                    p.seal.forEach(c => {
                        ctx.setWall(c.cx, c.cz, true);
                        ctx.forceStructure(c.cx, c.cz, SOLID);
                        reserved.add(key(c.cx, c.cz));
                    });
                    ctx.setWall(dx, dz, true);
                    ctx.forceStructure(dx, dz, "HINGED DOORWAY");
                    reserved.add(key(dx, dz));
                    reserved.add(key(dx - facing.dx, dz - facing.dz));
                    approaches.add(key(dx - facing.dx, dz - facing.dz));
                    doorwayPlans.set(key(dx, dz), {rot: Math.atan2(facing.dx, facing.dz), facing});
                };

                apply(plan, cx, cz, dir);

                let pending = plan.terminus;
                let chainBudget = 2;
                while (pending) {
                    const t = pending;
                    pending = null;
                    if (t.name !== "HINGED DOORWAY") {
                        ctx.setWall(t.cx, t.cz, t.name === "DUCT OR VENT");
                        ctx.forceStructure(t.cx, t.cz, t.name);
                        reserved.add(key(t.cx, t.cz));
                        break;
                    }
                    const nextPlan = chainBudget-- > 0
                        ? this._planDoorwayRun(ctx, random, t.cx, t.cz, t.heading, inChunk, reserved, approaches, RUN_MIN, RUN_MAX, env)
                        : null;
                    if (!nextPlan) {
                        const exits = ["CRAWLSPACE_HALL", "breach", "DUCT OR VENT", "CREVICE_HALL"];
                        t.name = exits[Math.floor(random() * exits.length)];
                        ctx.setWall(t.cx, t.cz, t.name === "DUCT OR VENT");
                        ctx.forceStructure(t.cx, t.cz, t.name);
                        reserved.add(key(t.cx, t.cz));
                        break;
                    }
                    apply(nextPlan, t.cx, t.cz, t.heading);
                    pending = nextPlan.terminus;
                }
            }
        }
    }

    generate(env, ctx, random, startX, startZ, stagingMeshes, isMacroStructure) {
        const forcedStructuresGrid = new Map();
        const isWallGrid = new Map();
        const doorwayPlans = new Map();
        ctx.getDoorwayPlan = (px, pz) => doorwayPlans.get(cellKey(px, pz)) || null;
        
        ctx.setWall = (wx, wz, val) => {
            isWallGrid.set(cellKey(wx, wz), val);
            if (!val) {
                for (let i = stagingMeshes.length - 1; i >= 0; i--) {
                    const m = stagingMeshes[i];
                    if (m.userData.isDefaultWall && m.userData.cellX === wx && m.userData.cellZ === wz) {
                        stagingMeshes.splice(i, 1);
                    }
                }
            }
        };
        ctx.forceStructure = (wx, wz, name) => forcedStructuresGrid.set(cellKey(wx, wz), name);
        ctx.getForcedStructure = (wx, wz) => forcedStructuresGrid.get(cellKey(wx, wz));

        const pathThemeRoll = random();
        let pathTheme = null;
        if (pathThemeRoll > 0.75) pathTheme = 'CRAWLSPACE_HALL';
        else if (pathThemeRoll > 0.50) pathTheme = 'CREVICE_HALL';
        else if (pathThemeRoll > 0.25) pathTheme = 'RIDE_QUEUE_HALL';

        const cX = startX + Math.floor(env.chunkSize/2);
        const cZ = startZ + Math.floor(env.chunkSize/2);
        const pathGrid = new Map();
        
        const carvePath = (tx, tz) => {
            let currX = cX;
            let currZ = cZ;
            let failsafe = 0;
            while ((currX !== tx || currZ !== tz) && failsafe < 200) {
                pathGrid.set(cellKey(currX, currZ), true);
                const dx = tx - currX;
                const dz = tz - currZ;
                if (Math.abs(dx) > Math.abs(dz)) {
                    currX += Math.sign(dx);
                    if (random() > 0.5 && dz !== 0) currZ += Math.sign(dz);
                    else if (random() > 0.8) currZ += (random() > 0.5 ? 1 : -1);
                } else {
                    currZ += Math.sign(dz);
                    if (random() > 0.5 && dx !== 0) currX += Math.sign(dx);
                    else if (random() > 0.8) currX += (random() > 0.5 ? 1 : -1);
                }
                failsafe++;
            }
            pathGrid.set(cellKey(tx, tz), true);
        };
        
        carvePath(startX + 7, startZ);
        carvePath(startX + 7, startZ + env.chunkSize - 1);
        carvePath(startX, startZ + 7);
        carvePath(startX + env.chunkSize - 1, startZ + 7);
        
        if (startX === 0 && startZ === 0) {
            carvePath(0, 0);
        }
        
        if (env.airlocks) {
            for (const airlock of env.airlocks) {
                const chunkCx = (startX + env.chunkSize/2) * env.cellSize;
                const chunkCz = (startZ + env.chunkSize/2) * env.cellSize;
                const dx = airlock.chamberCenter.x - chunkCx;
                const dz = airlock.chamberCenter.z - chunkCz;
                if (Math.abs(dx) <= env.chunkSize * env.cellSize && Math.abs(dz) <= env.chunkSize * env.cellSize) {
                    const wox = Math.round(airlock.outerPos.x / env.cellSize);
                    const woz = Math.round(airlock.outerPos.z / env.cellSize);
                    carvePath(wox, woz);
                }
            }
        }

        const cx_val = Math.sin(env.baseSeed) * 0.8;
        const cy_val = Math.cos(env.baseSeed * 0.5) * 0.8;

        ctx.isWall = (wx, wz) => {
            const key = cellKey(wx, wz);
            if (isWallGrid.has(key)) return isWallGrid.get(key);
            
            let zx = wx * 0.15;
            let zy = wz * 0.15;
            let iter = 0;
            let zx2 = zx * zx;
            let zy2 = zy * zy;
            while (zx2 + zy2 < 4 && iter < 15) {
                zy = 2 * zx * zy + cy_val;
                zx = zx2 - zy2 + cx_val;
                zx2 = zx * zx;
                zy2 = zy * zy;
                iter++;
            }
            let isW = iter > 6;
            const flipSeed = (env.baseSeed + (wx * 104729) + (wz * 1299827)) >>> 0;
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

            const cx_id = Math.floor(wx / env.chunkSize);
            const cz_id = Math.floor(wz / env.chunkSize);
            const lx = wx - (cx_id * env.chunkSize);
            const lz = wz - (cz_id * env.chunkSize);

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

        if (!isMacroStructure) {
            const size = this.chunkSize;
            const grid = this.grid;
            grid.fill(0);
            const q = [];

            for (let lx = 0; lx < size; lx++) {
                for (let lz = 0; lz < size; lz++) {
                    if (!ctx.isWall(startX + lx, startZ + lz)) {
                        grid[lz * size + lx] = 1;
                        if (lx === 7 || lz === 7 || lx === 3 || lx === 11 || lz === 3 || lz === 11) {
                            grid[lz * size + lx] = 2;
                            q.push({lx, lz});
                        }
                    }
                }
            }

            if (env.airlocks) {
                for (const airlock of env.airlocks) {
                    const chunkCx = (startX + size/2) * env.cellSize;
                    const chunkCz = (startZ + size/2) * env.cellSize;
                    const dx = airlock.chamberCenter.x - chunkCx;
                    const dz = airlock.chamberCenter.z - chunkCz;

                    if (Math.abs(dx) <= size * env.cellSize && Math.abs(dz) <= size * env.cellSize) {
                        const {clearX, clearZ} = this._airlockApron(airlock, env.cellSize);

                        for (const cx of clearX) {
                            for (const cz of clearZ) {
                                const lx = cx - startX;
                                const lz = cz - startZ;
                                if (lx >= 0 && lx < size && lz >= 0 && lz < size) {
                                    ctx.setWall(cx, cz, false);
                                    ctx.forceStructure(cx, cz, null);
                                    if (grid[lz * size + lx] !== 2) {
                                        grid[lz * size + lx] = 2;
                                        q.push({lx, lz});
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const totalCells = size * size;
            const bfsDist = this.bfsDist;
            const bfsParent = this.bfsParent;
            bfsDist.fill(this.INF);
            bfsParent.fill(-1);

            let dqBuf = this.dqBuf;
            let dqHead = totalCells * 4;
            let dqTail = dqHead;

            const recentre = () => {
                const used = dqTail - dqHead;
                if (used * 4 > dqBuf.length) {
                    const newBuf = new Int32Array(Math.max(dqBuf.length * 2, used * 4));
                    this.dqBuf = newBuf;
                    dqBuf = newBuf;
                }
                const start = (dqBuf.length - used) >> 1;
                dqBuf.set(dqBuf.subarray(dqHead, dqTail), start);
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
                const idx = seed.lz * size + seed.lx;
                if (bfsDist[idx] === this.INF) {
                    bfsDist[idx] = 0;
                    pushBack(idx);
                }
            }

            while (dqHead < dqTail) {
                const idx = dqBuf[dqHead++];
                const clx = idx % size;
                const clz = (idx - clx) / size;
                const d = bfsDist[idx];
                const neighbors = [[clx + 1, clz], [clx - 1, clz], [clx, clz + 1], [clx, clz - 1]];
                for (const [nlx, nlz] of neighbors) {
                    if (nlx < 0 || nlz < 0 || nlx >= size || nlz >= size) continue;
                    const nIdx = nlz * size + nlx;
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
                const lx = idx % size;
                const lz = (idx - lx) / size;
                const gx = startX + lx;
                const gz = startZ + lz;
                ctx.setWall(gx, gz, false);
                if (this.isAirlockApron(gx, gz, env)) continue;
                ctx.forceStructure(gx, gz, 'breach');
            }

            this._planDoorways(ctx, random, startX, startZ, doorwayPlans, env);
        }
    }
}
