import TheArchitect from './TheArchitect.js';

/**
 * [ROLE] Links every shader program the world is going to need while the boot loading screen is
 *        still covering the view, and then pins those programs so they are never thrown away.
 * [WHY] three r128 links synchronously and has no compileAsync. With 32 pooled point lights, 32
 *       pooled spot lights, 13 shadow slots, PCFSoft filtering and a logarithmic depth buffer,
 *       each program is enormous, so the first chunk of a sector that introduced unseen materials
 *       used to stall the main thread for seconds. The Atrium was the worst case: AtriumSector
 *       creates roughly a dozen materials lazily, and every one of them wanted a fresh link the
 *       moment you walked in through the airlock.
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
     * Programs are keyed by permutation, not by material, so only one probe per distinct
     * permutation is built -- see _permutationSignature.
     */
    static async run(env) {
        if (env._programKeepAlive) return;
        const renderer = env.engine && env.engine.renderer;
        if (!renderer || !env.chunkManager) return;
        try {
            await this._warm(env);
        } catch (err) {
            console.warn('Shader warmup aborted:', err);
        }
    }

    static async _warm(env) {
        this._materialiseLazySectorAssets(env);

        const keepAlive = [];
        env._programKeepAlive = keepAlive;

        const probeGeo = new THREE.PlaneGeometry(0.001, 0.001);
        const probeColor = new THREE.Color(1, 1, 1);
        const batch = new THREE.Group();
        const seen = new Set();
        const BATCH_LIMIT = 24;

        const flush = () => {
            if (batch.children.length === 0) return Promise.resolve();
            env.chunkManager._scopedCompile(batch);
            for (let i = batch.children.length - 1; i >= 0; i--) {
                batch.remove(batch.children[i]);
            }
            return new Promise(resolve => setTimeout(resolve, 0));
        };

        for (const material of this._collectMaterials(env)) {
            const signature = this._permutationSignature(material);
            if (seen.has(signature)) continue;
            seen.add(signature);

            const plain = material.clone();
            keepAlive.push(plain);
            batch.add(new THREE.Mesh(probeGeo, plain));

            const instanced = material.clone();
            keepAlive.push(instanced);
            batch.add(new THREE.InstancedMesh(probeGeo, instanced, 1));

            const coloured = material.clone();
            keepAlive.push(coloured);
            const colouredMesh = new THREE.InstancedMesh(probeGeo, coloured, 1);
            colouredMesh.setColorAt(0, probeColor);
            batch.add(colouredMesh);

            if (batch.children.length >= BATCH_LIMIT) await flush();
        }
        await flush();
        probeGeo.dispose();
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
     * An approximation of the parts of r128's program cache key that these materials actually
     * vary in -- which map slots are populated, and the handful of flags that switch shader
     * chunks on and off. Being approximate is safe in both directions: too coarse and a genuinely
     * distinct permutation just links on first sight, exactly as it does today; too fine and we
     * build a few redundant probes.
     */
    static _permutationSignature(material) {
        const MAP_SLOTS = [
            'map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap', 'displacementMap',
            'specularMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'envMap', 'gradientMap',
            'matcap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap'
        ];
        let signature = material.type;
        for (let i = 0; i < MAP_SLOTS.length; i++) {
            signature += material[MAP_SLOTS[i]] ? '1' : '0';
        }
        return signature + '|' + [
            material.vertexColors ? 1 : 0,
            material.flatShading ? 1 : 0,
            material.side,
            material.transparent ? 1 : 0,
            material.alphaTest > 0 ? 1 : 0,
            material.depthPacking || 0,
            material.dithering ? 1 : 0,
            material.premultipliedAlpha ? 1 : 0,
            material.wireframe ? 1 : 0,
            material.toneMapped === false ? 0 : 1,
            material.combine === undefined ? '' : material.combine,
            material.defines ? Object.keys(material.defines).sort().join(',') : ''
        ].join(',');
    }

    /**
     * Walks env for materials. Shallow on purpose: materials sit directly on env, in small arrays
     * (productBoxMats, cableMats), or in the pools keyed by Map or plain object (_lightMatPool,
     * _pooledLightMats). Anything deeper is scene content, which is either already covered or not
     * worth the traversal.
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
        return Array.from(found.values());
    }
}
