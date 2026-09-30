import * as SectorPlacement from './SectorPlacement.js';
import TheArchitect from '../core/TheArchitect.js';

export function airlockApron(env, airlock) {

                const wox = Math.round(airlock.outerPos.x / env.cellSize);
        const woz = Math.round(airlock.outerPos.z / env.cellSize);
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

export function isAirlockApron(env, x, z) {

        const airlocks = env.airlocks;
        if (airlocks) {
            for (let i = 0; i < airlocks.length; i++) {
                const {clearX, clearZ} = airlockApron(env, airlocks[i]);
                if (clearX.indexOf(x) !== -1 && clearZ.indexOf(z) !== -1) return true;
            }
        }

        const placement = SectorPlacement.placementConfig(env);
        const cx = Math.floor(x / env.chunkSize);
        const cz = Math.floor(z / env.chunkSize);
        const lx = ((x % env.chunkSize) + env.chunkSize) % env.chunkSize;
        const lz = ((z % env.chunkSize) + env.chunkSize) % env.chunkSize;
        
        const isMacro = (mcx, mcz) => {
            if (!SectorPlacement.isMacroChunk(placement, mcx, mcz)) return false;
            if (!placement.ids) {
                try {
                    let prngSeed = (env.baseSeed || 0) >>> 0;
                    const seededRandom = () => {
                        prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
                        return prngSeed / 4294967296.0;
                    };
                    const sectorMatrix = TheArchitect.getSectorMatrix.call(env, {random: seededRandom});
                    placement.ids = sectorMatrix.filter(s => s.id !== "EXIT").map(s => s.id);
                } catch (err) {
                    console.error('[ChunkManager] getSectorMatrix failed during airlock-apron check:', err);
                    placement.ids = [];
                }
            }
            const sectorId = SectorPlacement.sectorIdFor(placement, placement.ids, mcx, mcz);
            return sectorId !== "ATRIUM";
        };

        if (lx >= 6 && lx <= 8) {
            if (lz <= 2 && isMacro(cx, cz - 1)) return true;
            if (lz >= env.chunkSize - 3 && isMacro(cx, cz + 1)) return true;
        }
        if (lz >= 6 && lz <= 8) {
            if (lx <= 2 && isMacro(cx - 1, cz)) return true;
            if (lx >= env.chunkSize - 3 && isMacro(cx + 1, cz)) return true;
        }

        return false;
    }
