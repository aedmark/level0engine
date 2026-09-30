
import ChunkStreamer from './ChunkStreamer.js';
import ChunkBuilder from './ChunkBuilder.js';
import ShaderWarmup from './ShaderWarmup.js';

const CHUNK_PROFILE_PHASES = ['worker', 'cells', 'breach', 'instances', 'shadow', 'warm', 'yielded'];

export default class ChunkManager {
    constructor(env) {
        this.env = env;
        this.streamer = new ChunkStreamer(env, this);
        this.builder = new ChunkBuilder(env, this);
        this.shaderWarmup = new ShaderWarmup(env, this);
    }

    _profBegin(hash) {
        const p = {hash, t0: performance.now()};
        for (const k of CHUNK_PROFILE_PHASES) p[k] = 0;
        this._prof = p;
        return p;
    }

    _profAdd(phase, ms) {
        if (this._prof) this._prof[phase] += ms;
    }

    _profEnd() {
        const p = this._prof;
        if (!p) return;
        this._prof = null;
        const env = this.env;
        const total = performance.now() - p.t0;
        p.total = Math.round(total);
        for (const k of CHUNK_PROFILE_PHASES) p[k] = Math.round(p[k]);
        if (!env.genStats) env.genStats = {count: 0, totalMs: 0, worstMs: 0, lastMs: 0};
        const stats = env.genStats;
        if (!stats.phases) {
            stats.phases = {};
            for (const k of CHUNK_PROFILE_PHASES) stats.phases[k] = 0;
        }
        for (const k of CHUNK_PROFILE_PHASES) stats.phases[k] += p[k];
        if (!stats.worstProfile || total > stats.worstProfile.total) stats.worstProfile = p;
    }

    _getDebugLabelMaterial(name) {
        if (!this._debugLabelMatCache) this._debugLabelMatCache = new Map();
        let material = this._debugLabelMatCache.get(name);
        if (material) return material;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const c = canvas.getContext('2d');
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.font = 'bold 24px monospace';
        c.fillStyle = '#39ff6a';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(name, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        material = new THREE.SpriteMaterial({map: texture, depthWrite: false});
        this._debugLabelMatCache.set(name, material);
        return material;
    }

    _addDebugCellLabel(chunkGroup, x, z, name, hash) {
        const sprite = new THREE.Sprite(this._getDebugLabelMaterial(name));
        sprite.scale.set(3.2, 0.8, 1);
        sprite.position.set(x * this.env.cellSize, 4.5, z * this.env.cellSize);
        sprite.userData.chunkHash = hash;
        sprite.userData.isDebugLabel = true;
        chunkGroup.add(sprite);
    }

    // Delegations to ChunkStreamer
    updateChunks(playerPos) {
        return this.streamer.updateChunks(playerPos);
    }

    async processChunkQueue() {
        return this.streamer.processChunkQueue();
    }

    // Delegations to ChunkBuilder
    async buildChunk(chunkX, chunkZ, hash) {
        return this.builder.buildChunk(chunkX, chunkZ, hash);
    }

    beginMacroChunkContent(hash) {
        return this.builder.beginMacroChunkContent(hash);
    }

    isMacroChunkContentReady(hash) {
        return this.builder.isMacroChunkContentReady(hash);
    }

    // Delegations to ShaderWarmup
    warmChunkMaterials(chunkGroup) {
        return this.shaderWarmup.warmChunkMaterials(chunkGroup);
    }

    queueShadowPrewarm(materials) {
        return this.shaderWarmup.queueShadowPrewarm(materials);
    }

    drainShadowPrewarm(budgetMs) {
        return this.shaderWarmup.drainShadowPrewarm(budgetMs);
    }

    warmMaterialVariants(materials, drainNow = false) {
        return this.shaderWarmup.warmMaterialVariants(materials, drainNow);
    }

    _forgetMaterialPrograms(material) {
        return this.shaderWarmup._forgetMaterialPrograms(material);
    }
}
