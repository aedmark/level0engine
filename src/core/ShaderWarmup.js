import TheArchitect from './TheArchitect.js';
import {warmLazySectorMaterials} from './LazyMaterialWarmup.js';
import AmbientEnvMap from '../aesthetics/AmbientEnvMap.js';

/** See the note in _warm: the instanced forms are deferred to the chunks that need them. */
const BOOT_WARM_FORMS = new Set(['plain']);

export default class ShaderWarmup {
    static async run(env, onProgress = null) {
        if (env._programKeepAlive) return;
        const renderer = env.engine && env.engine.renderer;
        if (!renderer || !env.chunkManager) return;
        try {
            // onProgress now reports a 0..1 fraction of this step, not an absolute
            // percentage — the caller owns where that lands on the bar.
            if (onProgress) onProgress(0, 'PREWARMING ANOMALOUS SECTOR BLUEPRINTS...');
            const t0 = performance.now();
            this._materialiseLazySectorAssets(env);
            warmLazySectorMaterials(env);
            console.log(`[BOOT] Lazy blueprint/material materialisation: ${Math.round(performance.now() - t0)}ms`);

            // Env map applied before materials are collected for _warm below, so the
            // compile pass sees its effect on the handful of allowlisted materials it
            // touches — see AmbientEnvMap.SAFE_MATERIAL_KEYS for why that list is short
            // rather than "every metallic material."
            const envMapStart = performance.now();
            env.ambientEnvMap = AmbientEnvMap.generate(renderer);
            const metallicCount = AmbientEnvMap.applyToMaterials(env, env.ambientEnvMap);
            console.log(`[BOOT] Ambient env map baked, applied to ${metallicCount} metallic materials (${Math.round(performance.now() - envMapStart)}ms)`);

            const materials = this._collectMaterials(env);
            await this._warm(env, onProgress, materials);
        } catch (err) {
            console.warn('Shader warmup aborted:', err);
        }
    }

    static async _warm(env, onProgress = null, materials = null) {
        env._programKeepAlive = [];

        materials = materials || this._collectMaterials(env);
        const BATCH = 8;
        const totalBatches = Math.ceil(materials.length / BATCH);
        let batchCount = 0;
        console.log(`[BOOT] Shader warmup: ${materials.length} distinct materials to compile across ${totalBatches} batches.`);

        for (let i = 0; i < materials.length; i += BATCH) {
            const batchStart = performance.now();
            // Only the `plain` form is warmed blind here.
            //
            // This pass runs before any chunk exists, so it cannot know how a material
            // will actually be used, and warming all three forms meant compiling three
            // programs each for 200+ materials — measured at 3.7s, which was 96% of the
            // entire chunk-build phase and 60% of boot. A survey of a live scene found
            // that of 328 materials, 317 are used as `plain`, 28 as `coloured` and 7 as
            // `instanced`, with **no** material using all three. So `plain` is nearly
            // always the right guess and the other two are nearly always dead work.
            //
            // The two instanced forms are not dropped, just deferred to whoever actually
            // needs them: `_compileInstances` decides a group's form, then
            // `warmChunkMaterials` reports that exact form, and the shadow drain at the
            // tail of `_buildChunkInterior` compiles it — all before the chunk is marked
            // `contentReady`, so it still lands ahead of visibility.
            const batch = new Map(materials.slice(i, i + BATCH).map(m => [m, BOOT_WARM_FORMS]));
            await env.chunkManager.warmMaterialVariants(batch, false);
            const batchMs = Math.round(performance.now() - batchStart);
            batchCount++;
            if (onProgress) {
                onProgress(batchCount / Math.max(1, totalBatches),
                    `PREWARMING MATERIAL VARIANTS [BATCH ${batchCount}/${totalBatches}] (${batchMs}ms)`);
            }
            if (batchMs > 200) {
                console.warn(`[BOOT] Slow warmup batch ${batchCount}/${totalBatches}: ${batchMs}ms for materials`,
                    materials.slice(i, i + BATCH).map(m => m.type + (m.name ? `(${m.name})` : '')));
            }
            await new Promise(resolve => setTimeout(resolve, 0));
        }
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
