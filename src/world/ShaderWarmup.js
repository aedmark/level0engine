

const ALL_PROBE_FORMS = new Set(['plain', 'instanced', 'coloured']);
const SHADOW_PROBE_BATCH = 1;
const _urlFlags = new URLSearchParams(location.search);
const FORCE_NO_PARALLEL = _urlFlags.has('noparallel');
const LINK_PROFILE = FORCE_NO_PARALLEL || _urlFlags.has('linkprofile');
const BLOCKING_LINKS_PER_FRAME = 4;
const MASKED_LINKS_PER_FRAME = 16;

export default class ShaderWarmup {
    constructor(env, manager) {
        this.env = env;
        this.manager = manager;
    }

    warmChunkMaterials(chunkGroup) {
        const unwarmed = this._unwarmedMaterials(chunkGroup);
        if (unwarmed !== null) this.warmMaterialVariants(unwarmed, false);
    }

    static _warmableOnMeshProbe(material) {
        return !!material && material.isMaterial === true
            && !material.isSpriteMaterial
            && !material.isPointsMaterial
            && !material.isLineBasicMaterial
            && !material.isLineDashedMaterial;
    }

    queueShadowPrewarm(materials) {
        if (!materials) return;
        if (!this._shadowQueue) { this._shadowQueue = []; this._shadowQueued = new Set(); }
        const isMap = materials instanceof Map;
        const entries = isMap ? materials : new Map([...materials].map(m => [m, ALL_PROBE_FORMS]));
        for (const [material, forms] of entries) {
            if (!ShaderWarmup._warmableOnMeshProbe(material)) continue;
            for (const form of forms) {
                const key = ShaderWarmup._warmKey(material, form);
                if (this._shadowQueued.has(key)) continue;
                this._shadowQueued.add(key);
                this._shadowQueue.push({material, form});
            }
        }
    }

    _shadowProbeRig() {
        const env = this.env;
        if (this._shadowRig) return this._shadowRig;
        const point = new THREE.PointLight(0xffffff, 1, 10);
        point.castShadow = true;
        point.shadow.mapSize.set(64, 64);
        point.position.set(1, 1, 1);
        const spot = new THREE.SpotLight(0xffffff, 1, 10);
        spot.castShadow = true;
        spot.shadow.mapSize.set(64, 64);
        spot.position.set(1, 1, 1);
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20);
        camera.position.set(0, 0, 3);
        if (!env._probeGeo) env._probeGeo = new THREE.PlaneGeometry(0.001, 0.001);

        const group = new THREE.Group();
        const slots = [];
        for (let i = 0; i < SHADOW_PROBE_BATCH; i++) {
            const coloured = new THREE.InstancedMesh(env._probeGeo, null, 1);
            coloured.setColorAt(0, ShaderWarmup._probeColor());
            const plain = new THREE.Mesh(env._probeGeo, null);
            const instanced = new THREE.InstancedMesh(env._probeGeo, null, 1);
            const byForm = {plain, instanced, coloured};
            for (const mesh of [plain, instanced, coloured]) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.frustumCulled = false;
                mesh.visible = false;
                group.add(mesh);
            }
            slots.push(byForm);
        }

        this._shadowRig = {
            point, spot, camera, group, slots,
            target: new THREE.WebGLRenderTarget(4, 4),
            scoped: [point, spot, spot.target, group]
        };
        return this._shadowRig;
    }

    drainShadowPrewarm(budgetMs = 2.0) {
        const queue = this._shadowQueue;
        if (!queue || queue.length === 0) return 0;
        const env = this.env;
        const renderer = env.engine && env.engine.renderer;
        if (!renderer) return 0;

        const rig = this._shadowProbeRig();
        const scene = env.scene;
        const savedChildren = scene.children;
        const savedTarget = renderer.getRenderTarget();
        const savedEnabled = renderer.shadowMap.enabled;
        const savedAuto = renderer.shadowMap.autoUpdate;
        let warmed = 0;
        const start = performance.now();
        try {
            scene.children = rig.scoped;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.autoUpdate = true;
            renderer.setRenderTarget(rig.target);
            do {
                let filled = 0;
                const active = [];
                while (filled < rig.slots.length && queue.length > 0) {
                    const entry = queue.pop();
                    if (!entry || !entry.material) break;
                    const probe = rig.slots[filled][entry.form] || rig.slots[filled].plain;
                    probe.material = entry.material;
                    probe.visible = true;
                    active.push(probe);
                    filled++;
                }
                if (filled === 0) break;
                rig.point.shadow.needsUpdate = true;
                rig.spot.shadow.needsUpdate = true;
                renderer.render(scene, rig.camera);
                for (const p of active) {
                    p.material = null;
                    p.visible = false;
                }
                warmed += filled;
            } while (queue.length > 0 && performance.now() - start < budgetMs);
        } catch (err) {
            console.warn('Shadow prewarm failed:', err && err.stack ? err.stack : err);
        } finally {
            for (const slot of rig.slots) {
                for (const p of [slot.plain, slot.instanced, slot.coloured]) {
                    p.material = null;
                    p.visible = false;
                }
            }
            renderer.setRenderTarget(savedTarget);
            renderer.shadowMap.enabled = savedEnabled;
            renderer.shadowMap.autoUpdate = savedAuto;
            scene.children = savedChildren;
        }
        return warmed;
    }

    warmMaterialVariants(materials, drainNow = false) {
        const env = this.env;
        if (!materials || materials.size === 0) return;
        this.queueShadowPrewarm(materials);
        if (!env._programKeepAlive) env._programKeepAlive = new Map();
        if (!env._warmedMaterials) env._warmedMaterials = new Set();
        if (!env._probeGeo) env._probeGeo = new THREE.PlaneGeometry(0.001, 0.001);
        const keepAlive = env._programKeepAlive;
        const batch = new THREE.Group();

        const isMap = materials instanceof Map;
        const entries = isMap ? materials : new Map([...materials].map(m => [m, ALL_PROBE_FORMS]));

        for (const [material, forms] of entries) {
            for (const form of forms) {
                const warmKey = ShaderWarmup._warmKey(material, form);
                env._warmedMaterials.add(warmKey);
                const clone = material.clone();
                const stale = keepAlive.get(warmKey);
                if (stale) stale.dispose();
                keepAlive.set(warmKey, clone);
                if (form === 'plain') {
                    batch.add(new THREE.Mesh(env._probeGeo, clone));
                } else if (form === 'instanced') {
                    batch.add(new THREE.InstancedMesh(env._probeGeo, clone, 1));
                } else {
                    const colouredMesh = new THREE.InstancedMesh(env._probeGeo, clone, 1);
                    colouredMesh.setColorAt(0, ShaderWarmup._probeColor());
                    batch.add(colouredMesh);
                }
            }
        }
        this._scopedCompile(batch, drainNow);
    }

    static _warmKey(material, form) {
        return `${material.uuid}${material.version}|${form}`;
    }

    static _probeColor() {
        if (!ShaderWarmup.__probeColor) ShaderWarmup.__probeColor = new THREE.Color(1, 1, 1);
        return ShaderWarmup.__probeColor;
    }

    _unwarmedMaterials(group) {
        const env = this.env;
        if (!env._warmedMaterials) env._warmedMaterials = new Set();
        const warmed = env._warmedMaterials;
        let unwarmed = null;
        const note = (material, form) => {
            if (!material || !material.isMaterial) return;
            if (warmed.has(ShaderWarmup._warmKey(material, form))) return;
            if (!unwarmed) unwarmed = new Map();
            let forms = unwarmed.get(material);
            if (!forms) { forms = new Set(); unwarmed.set(material, forms); }
            forms.add(form);
        };
        group.traverse((obj) => {
            const material = obj.material;
            if (!material) return;
            const form = obj.isInstancedMesh
                ? (obj.instanceColor ? 'coloured' : 'instanced')
                : 'plain';
            if (Array.isArray(material)) {
                for (let m = 0; m < material.length; m++) note(material[m], form);
            } else {
                note(material, form);
            }
        });
        return unwarmed;
    }

    _scopedCompile(group, drainNow = false) {
        const env = this.env;
        const scene = env.scene;
        const saved = scene.children;
        const scoped = [];
        for (let i = 0; i < saved.length; i++) {
            const child = saved[i];
            if (child.isLight || child.isCamera) scoped.push(child);
        }
        scoped.push(group);
        scene.children = scoped;
        const wasVisible = group.visible;
        group.visible = true;
        try {
            env.engine.renderer.compile(scene, env.camera);
        } finally {
            group.visible = wasVisible;
            scene.children = saved;
        }
        if (drainNow) this._drainProgramLinks();
    }

    _drainProgramLinks(budgetMs = Infinity, stallMasked = false) {
        const renderer = this.env.engine.renderer;
        const programs = renderer.info.programs;
        if (!programs) return 0;
        if (!this._drainedPrograms) this._drainedPrograms = new WeakSet();
        if (this._parallelExt === undefined) {
            const gl = renderer.getContext();
            this._parallelExt = FORCE_NO_PARALLEL
                ? null
                : (gl.getExtension('KHR_parallel_shader_compile') || null);
            this._gl = gl;
            if (FORCE_NO_PARALLEL) {
                console.warn('[LINKPROF] ?noparallel — forcing the blocking link path.');
            }
        }
        const ext = this._parallelExt;
        const gl = this._gl;
        const polling = ext !== null && budgetMs !== Infinity;
        const limit = (ext === null && budgetMs !== Infinity)
            ? (stallMasked ? MASKED_LINKS_PER_FRAME : BLOCKING_LINKS_PER_FRAME)
            : Infinity;
        const start = performance.now();
        let drained = 0;
        for (let i = 0; i < programs.length; i++) {
            if (drained >= limit) break;
            const program = programs[i];
            if (!program || typeof program.getUniforms !== 'function') continue;
            if (this._drainedPrograms.has(program)) continue;
            if (polling && program.program &&
                !gl.getProgramParameter(program.program, ext.COMPLETION_STATUS_KHR)) continue;
            this._drainedPrograms.add(program);
            program.getUniforms();
            program.getAttributes();
            drained++;
            if (performance.now() - start > budgetMs) break;
        }
        if (LINK_PROFILE && drained > 0) {
            const prof = this._linkProf || (this._linkProf = {links: 0, ms: 0, calls: 0});
            prof.links += drained;
            prof.ms += performance.now() - start;
            prof.calls++;
            if (Math.floor(prof.links / 25) !== Math.floor((prof.links - drained) / 25)) {
                console.log(`[LINKPROF] links=${prof.links} calls=${prof.calls} ` +
                    `total=${prof.ms.toFixed(1)}ms per-link=${(prof.ms / prof.links).toFixed(3)}ms ` +
                    `parallelExt=${ext !== null} cap=${limit}`);
            }
        }
        return drained;
    }

    _forgetMaterialPrograms(material) {
        const env = this.env;
        const warmed = env._warmedMaterials;
        const keepAlive = env._programKeepAlive;
        if (!warmed && !keepAlive) return;
        for (const form of ALL_PROBE_FORMS) {
            const key = ShaderWarmup._warmKey(material, form);
            if (warmed) warmed.delete(key);
            if (keepAlive) {
                const clone = keepAlive.get(key);
                if (clone) {
                    clone.dispose();
                    keepAlive.delete(key);
                }
            }
        }
    }
}
