import {CreviceHallProfile} from './CreviceHall.js';

export const CreviceNetworkProfile = (env, ctx) => {
    const { random } = ctx;
    const creviceProfile = CreviceHallProfile(env, ctx);

    return {
        name: "CREVICE_NETWORK",
        prob: 0.0301,
        build: (x, z) => {
            const startX = Math.floor(x / env.chunkSize) * env.chunkSize;
            const startZ = Math.floor(z / env.chunkSize) * env.chunkSize;

            const network = new Map();
            let numExits = 0;
            const maxTiles = 6 + Math.floor(random() * 8); // 6 to 13 cells
            const maxExits = 2 + Math.floor(random() * 2); // 2 to 3 exits

            const getOpposite = (dir) => {
                if (dir === 'N') return 'S';
                if (dir === 'S') return 'N';
                if (dir === 'E') return 'W';
                if (dir === 'W') return 'E';
                return null;
            };

            const cellKey = (cx, cz) => `${cx}_${cz}`;

            const openable = (nx, nz) => !!(
                ctx.isWall &&
                !ctx.isWall(nx, nz) &&
                !(ctx.isAirlockApron && ctx.isAirlockApron(nx, nz)) &&
                !(ctx.isLowClearance && ctx.isLowClearance(nx, nz))
            );

            const initialExits = { N: false, S: false, E: false, W: false };
            const startOpenings = [];
            if (openable(x, z - 1)) startOpenings.push('N');
            if (openable(x, z + 1)) startOpenings.push('S');
            if (openable(x + 1, z)) startOpenings.push('E');
            if (openable(x - 1, z)) startOpenings.push('W');

            if (startOpenings.length === 0) {
                return false;
            }

            initialExits[startOpenings[Math.floor(random() * startOpenings.length)]] = true;
            numExits++;

            network.set(cellKey(x, z), {
                x, z,
                connections: { N: false, S: false, E: false, W: false },
                exits: initialExits,
                isAlcove: false
            });

            const q = [];
            const addFrontier = (cx, cz, fromDir) => {
                if (cx < startX || cx >= startX + env.chunkSize) return;
                if (cz < startZ || cz >= startZ + env.chunkSize) return;
                q.push({ x: cx, z: cz, cameFrom: fromDir });
            };

            if (ctx.isWall && ctx.isWall(x, z - 1)) addFrontier(x, z - 1, 'S');
            if (ctx.isWall && ctx.isWall(x, z + 1)) addFrontier(x, z + 1, 'N');
            if (ctx.isWall && ctx.isWall(x + 1, z)) addFrontier(x + 1, z, 'W');
            if (ctx.isWall && ctx.isWall(x - 1, z)) addFrontier(x - 1, z, 'E');

            while (q.length > 0 && network.size < maxTiles) {
                let idx = q.length - 1;
                if (random() < 0.45) idx = Math.floor(random() * q.length);
                const cell = q.splice(idx, 1)[0];
                const key = cellKey(cell.x, cell.z);

                const prevCellX = cell.x + (cell.cameFrom === 'E' ? 1 : cell.cameFrom === 'W' ? -1 : 0);
                const prevCellZ = cell.z + (cell.cameFrom === 'S' ? 1 : cell.cameFrom === 'N' ? -1 : 0);
                const pKey = cellKey(prevCellX, prevCellZ);
                const p = network.get(pKey);

                if (network.has(key)) {
                    if (p && random() < 0.20) {
                        p.connections[getOpposite(cell.cameFrom)] = true;
                        network.get(key).connections[cell.cameFrom] = true;
                    }
                    continue;
                }

                if (ctx.isWall && !ctx.isWall(cell.x, cell.z)) {
                    if (ctx.isAirlockApron && ctx.isAirlockApron(cell.x, cell.z)) continue;
                    if (ctx.isLowClearance && ctx.isLowClearance(cell.x, cell.z)) continue;
                    if (p && numExits < maxExits) {
                        p.exits[getOpposite(cell.cameFrom)] = true;
                        numExits++;
                    }
                    continue;
                }

                if (ctx.isOccupied && ctx.isOccupied(cell.x, cell.z)) continue;

                if (p) {
                    p.connections[getOpposite(cell.cameFrom)] = true;
                }

                const newCell = {
                    x: cell.x, z: cell.z,
                    connections: { N: false, S: false, E: false, W: false },
                    exits: { N: false, S: false, E: false, W: false },
                    isAlcove: false
                };
                newCell.connections[cell.cameFrom] = true;
                network.set(key, newCell);

                if (ctx.isWall) {
                    addFrontier(cell.x, cell.z - 1, 'S');
                    addFrontier(cell.x, cell.z + 1, 'N');
                    addFrontier(cell.x + 1, cell.z, 'W');
                    addFrontier(cell.x - 1, cell.z, 'E');
                }
            }

            // Pruning pass: recursively remove dead-ends, but allow 1 intentional alcove stub
            let hasAlcove = false;
            let pruned = true;
            while (pruned) {
                pruned = false;
                for (const [key, cell] of network.entries()) {
                    let connCount = 0;
                    if (cell.connections.N) connCount++;
                    if (cell.connections.S) connCount++;
                    if (cell.connections.E) connCount++;
                    if (cell.connections.W) connCount++;

                    let exitCount = 0;
                    if (cell.exits.N) exitCount++;
                    if (cell.exits.S) exitCount++;
                    if (cell.exits.E) exitCount++;
                    if (cell.exits.W) exitCount++;

                    if (connCount === 1 && exitCount === 0) {
                        // Allow rare, intentional dead-end alcoves (12% chance for at most 1 in the network)
                        if (!hasAlcove && random() < 0.12 && network.size >= 4) {
                            cell.isAlcove = true;
                            hasAlcove = true;
                            continue;
                        }

                        if (!cell.isAlcove) {
                            if (cell.connections.N) {
                                const nKey = cellKey(cell.x, cell.z - 1);
                                if (network.has(nKey)) network.get(nKey).connections.S = false;
                            }
                            if (cell.connections.S) {
                                const nKey = cellKey(cell.x, cell.z + 1);
                                if (network.has(nKey)) network.get(nKey).connections.N = false;
                            }
                            if (cell.connections.E) {
                                const nKey = cellKey(cell.x + 1, cell.z);
                                if (network.has(nKey)) network.get(nKey).connections.W = false;
                            }
                            if (cell.connections.W) {
                                const nKey = cellKey(cell.x - 1, cell.z);
                                if (network.has(nKey)) network.get(nKey).connections.E = false;
                            }
                            network.delete(key);
                            pruned = true;
                        }
                    }
                }
            }

            let totalRemainingExits = 0;
            for (const cell of network.values()) {
                if (cell.exits.N) totalRemainingExits++;
                if (cell.exits.S) totalRemainingExits++;
                if (cell.exits.E) totalRemainingExits++;
                if (cell.exits.W) totalRemainingExits++;
            }

            // Must connect at least 2 distinct exits and span multiple tiles
            if (network.size <= 1 || totalRemainingExits < 2) {
                return false;
            }

            // Commit and build geometry for all cells in the network
            for (const cell of network.values()) {
                if (ctx.markOccupied) ctx.markOccupied(cell.x, cell.z);
                if (ctx.claimCell) ctx.claimCell(cell.x, cell.z);
                if (ctx.setWall) ctx.setWall(cell.x, cell.z, false);
                if (ctx.forceStructure) ctx.forceStructure(cell.x, cell.z, 'CREVICE_HALL');

                const mergedConnections = {
                    N: cell.connections.N || cell.exits.N,
                    S: cell.connections.S || cell.exits.S,
                    E: cell.connections.E || cell.exits.E,
                    W: cell.connections.W || cell.exits.W
                };

                creviceProfile.build(cell.x, cell.z, mergedConnections);
            }

            return true;
        }
    };
};
