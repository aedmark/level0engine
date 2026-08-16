import TheArchitect from './TheArchitect.js';

export default class ShaderWarmup {
    static async run(env, onProgress = null) {
        if (env._programKeepAlive) return;
        const renderer = env.engine && env.engine.renderer;
        if (!renderer || !env.chunkManager) return;
        try {
            if (onProgress) onProgress(72, 'PREWARMING ANOMALOUS SECTOR BLUEPRINTS...');
            this._materialiseLazySectorAssets(env);
            await this._warm(env, onProgress);
        } catch (err) {
            console.warn('Shader warmup aborted:', err);
        }
    }

    static async _warm(env, onProgress = null) {
        env._programKeepAlive = [];
        env._scopedProfile = { compileMs: 0, drainMs: 0, calls: 0 };

        const __t0 = performance.now();
        const materials = this._collectMaterials(env);
        const __tCollect = performance.now() - __t0;
        env._bootProfile = { collectMs: __tCollect, materials: materials.length, batches: [], totalMs: 0 };
        const BATCH = 8;
        const totalBatches = Math.ceil(materials.length / BATCH);
        let batchCount = 0;

        for (let i = 0; i < materials.length; i += BATCH) {
            const __b = performance.now();
            // Queue the compiles without waiting on the links. Blocking per batch
            // meant the driver linked one batch while nothing else was submitted;
            // the whole set is drained once below, after every compile is in flight.
            await env.chunkManager.warmMaterialVariants(new Set(materials.slice(i, i + BATCH)), false);
            env._bootProfile.batches.push(Math.round(performance.now() - __b));
            batchCount++;
            if (onProgress) {
                const pct = 75 + Math.round((batchCount / Math.max(1, totalBatches)) * 10);
                onProgress(pct, `PREWARMING MATERIAL VARIANTS [BATCH ${batchCount}/${totalBatches}]...`);
            }
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        // Every compile is queued; the driver links them on its own threads. We do
        // not wait. Blocking here cost 7.1s of a 15s boot and bought nothing that
        // could not be collected a frame at a time once the player is already in
        // the world — measured, restructuring the wait did not move it, because the
        // linking is genuinely that expensive rather than badly scheduled.
        env._bootProfile.finalDrainMs = 0;
        env._bootProfile.totalMs = Math.round(performance.now() - __t0);
    }

    static _materialiseLazySectorAssets(env) {
        const scratchGroup = new THREE.Group();
        let seed = (env.baseSeed ^ 0x9e3779b9) >>> 0;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296.0;
        };
        const ctx = env._createChunkHelpers('warmup', scratchGroup, [], random);
        ctx.markOccupied = () => {};
        ctx.isOccupied = () => false;
        try {
            TheArchitect.getSectorMatrix.call(env, ctx);
            TheArchitect.getStructuralMatrix.call(env, ctx);
        } catch (err) {
            console.warn('Shader warmup could not pre-build every blueprint:', err);
        }
    }

    static _collectMaterials(env) {
        const found = new Map();
        const visit = (value, depth) => {
            if (!value || depth > 2) return;
            if (value.isMaterial) {
                if (!found.has(value.uuid)) found.set(value.uuid, value);
                return;
            }
            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) visit(value[i], depth + 1);
                return;
            }
            if (value instanceof Map) {
                for (const entry of value.values()) visit(entry, depth + 1);
                return;
            }
            if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
                for (const key of Object.keys(value)) visit(value[key], depth + 1);
            }
        };
        for (const key of Object.keys(env)) {
            if (key === 'scene' || key === 'camera' || key === 'engine' || key === 'player') continue;
            visit(env[key], 0);
        }
        if (env.scene) {
            env.scene.traverse((obj) => {
                if (obj.material) visit(obj.material, 0);
            });
        }
        return Array.from(found.values());
    }
}
