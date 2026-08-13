import TheArchitect from './TheArchitect.js';

/**
 * [ROLE] Links every shader program the world is going to need while the boot loading screen is
 *        still covering the view, and then pins those programs so they are never thrown away.
 * [WHY] With 32 pooled point lights, 32 pooled spot lights, 13 shadow slots, PCFSoft filtering 
 *       and a logarithmic depth buffer, each program is enormous. We now use renderer.compileAsync() 
 *       to link these asynchronously, avoiding the multi-second thread locks from older ThreeJS versions.
 * [STATE] Stateless entry point. Leaves env._programKeepAlive behind and nothing else.
 * [DEPENDS] THREE.js globally, plus the env produced by Environment.setup().
 */
export default class ShaderWarmup {
    /**
     * Two things have to be true for a warmup to actually take, and an earlier attempt at this
     * missed both:
     *
     * 1. r128's program cache key includes `instancing` and `instancingColor`, so one material is
     *    up to three distinct programs depending on whether ChunkManager._compileInstances emits
     *    a plain Mesh, an InstancedMesh, or an InstancedMesh carrying per-instance colour.
     *    Warming only the plain variant leaves the chunk builder asking for a program that was
     *    never built, which reads exactly like the warmup having done nothing at all.
     *
     * 2. Programs are refcounted per material. When a material switches between plain and
     *    instanced rendering, r128 releases the old program and acquires the new one, and if that
     *    release drops the count to zero the program is destroyed and has to be relinked from
     *    scratch next time. Warming both variants on the same material would therefore destroy
     *    the first program on the way to building the second. So each variant is warmed on its
     *    own clone, and the clones are retained for the life of the page: the refcount never
     *    reaches zero, and every later switch between plain and instanced is a cache hit.
     *
     * Every material gets all three probes. three keys its program cache on the real permutation
     * and acquireProgram returns the existing program on a hit, so the actual link work is bounded
     * by the number of distinct permutations however many materials are fed in.
     */
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

        const materials = this._collectMaterials(env);
        const BATCH = 8;
        const totalBatches = Math.ceil(materials.length / BATCH);
        let batchCount = 0;

        for (let i = 0; i < materials.length; i += BATCH) {
            await env.chunkManager.warmMaterialVariants(new Set(materials.slice(i, i + BATCH)));
            batchCount++;
            if (onProgress) {
                const pct = 75 + Math.round((batchCount / Math.max(1, totalBatches)) * 10);
                onProgress(pct, `PREWARMING MATERIAL VARIANTS [BATCH ${batchCount}/${totalBatches}]...`);
            }
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    /**
     * Sector builders create most of their materials lazily, behind `if (!env.someMat)` guards at
     * factory scope. getSectorMatrix() runs all twelve sector factories in one go -- which is
     * already what ChunkManager does for every macro chunk it builds -- so a single throwaway
     * call materialises the whole set without producing any geometry. Same for the structural
     * matrix that ordinary maze chunks draw from.
     */
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

    /**
     * Two passes. First a shallow walk of env, where materials sit directly on the object, in
     * small arrays (productBoxMats, cableMats) or in the Map/plain-object pools (_lightMatPool,
     * _pooledLightMats). Then a full scene traversal, which is what catches everything parked in
     * the graph rather than hung off env.
     */
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
