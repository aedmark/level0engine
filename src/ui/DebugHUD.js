/**
 * An on-screen developer console for tracking performance and game state.
 *
 * This overlay is critical for profiling performance in a browser environment.
 * It specifically tracks frame "hitches" (drops below 20 FPS) and correlates them with
 * chunk generation, allowing developers to see if procedural generation is causing stuttering.
 */
export const DebugHUD = {
    el: null,
    visible: false,
    _last: 0,
    _fps: 60,
    _hitches: 0,
    _genHitches: 0,
    _worstHitch: 0,
    /**
     * Records anomalous frame times to identify stuttering ("hitches").
     *
     * A delta of `> 0.05` means the frame took longer than 50 milliseconds
     * to render (less than 20 FPS). This usually means the garbage collector ran or a heavy
     * procedural chunk was just built.
     *
     * @param {number} delta - The time in seconds the last frame took to render.
     * @param {Object} environment - The environment instance (to check generation state).
     */
    recordFrame(delta, environment) {
        if (delta <= 0.05) return;
        this._hitches++;
        if (environment.isBuildingChunk) this._genHitches++;
        if (delta > this._worstHitch) this._worstHitch = delta;
    },
    toggle() {
        if (!this.el) this.el = document.getElementById('debug-hud');
        if (!this.el) return;
        this.visible = !this.visible;
        this.el.style.display = this.visible ? 'block' : 'none';
    },
    update(time, delta, telemetry, engine, player, environment) {
        if (!this.visible || !this.el) return;
        if (delta > 0) this._fps = this._fps * 0.95 + (1.0 / delta) * 0.05;
        if (time - this._last < 0.25) return;
        this._last = time;
        const cam = engine.camera.position;
        const info = engine.renderer.info.render;
        const anomaly = environment.anomaly;
        const anomalyDist = anomaly && anomaly.isActive
            ? Math.sqrt(anomaly.group.position.distanceToSquared(cam)).toFixed(1) + 'm'
            : 'inactive';
        const grace = anomaly && anomaly.graceTimer > 0 ? ` grace:${anomaly.graceTimer.toFixed(1)}s` : '';
        const pois = environment.pointsOfInterest || [];
        const unclaimed = pois.filter(p => !p.active).length;
        const seedStr = document.getElementById('seedInput').value;
        this.el.innerText =
            `SEED  ${seedStr} (0x${(environment.baseSeed >>> 0).toString(16)})\n` +
            `SECT  ${telemetry.activeSector}  CHUNK ${environment.currentChunkCoords.x},${environment.currentChunkCoords.z}\n` +
            `POS   ${cam.x.toFixed(1)}, ${cam.y.toFixed(2)}, ${cam.z.toFixed(1)}${player.isGodMode ? '  [GOD]' : ''}\n` +
            `FPS   ${this._fps.toFixed(0)}  CALLS ${info.calls}  TRIS ${(info.triangles / 1000).toFixed(0)}k\n` +
            `ANOM  ${anomalyDist}${grace}${player.isChased ? ' CHASING' : ''}\n` +
            `POI   ${unclaimed}/${pois.length} unclaimed  HOPS ${environment._breakerHuntHops ?? '-'}\n` +
            `FIXT  ${environment.fixtureData.length}  CHUNKS ${environment.activeChunks.size}\n` +
            // raw is the stimulus before smoothing, out is what the shader receives. If raw is
            // healthy and out is not, adaptation is working. If they track each other, the
            // pupil is stuck -- check dot against the 0.95 gate and dist against the 1.0 floor.
            `GLARE raw ${(environment._glareRaw ?? 0).toFixed(3)}` +
            `  smooth ${(environment.currentGlare ?? 0).toFixed(3)}` +
            `  out ${(engine.glare ?? 0).toFixed(3)}\n` +
            `PUPIL ${((environment.pupilAdapt ?? 0) * 100).toFixed(0)}%` +
            `  exp ${engine.renderer.toneMappingExposure.toFixed(2)}` +
            `  dot ${(environment._glareDot ?? -1).toFixed(3)}` +
            `  dist ${Number.isFinite(environment._glareDist) ? environment._glareDist.toFixed(1) + 'm' : '-'}\n` +
            `OBJ   ${player.objectives.fixed}/${player.objectives.total}  COH ${(player.coherence * 100).toFixed(0)}%\n` +
            `PERF  hitch ${this._hitches} (${this._genHitches} gen) worst ${(this._worstHitch * 1000).toFixed(0)}ms` +
            (environment.genStats ? `  chunk avg ${(environment.genStats.totalMs / environment.genStats.count).toFixed(1)}ms worst ${environment.genStats.worstMs.toFixed(1)}ms` : '');
    },
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'Backquote') return;
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            this.toggle();
        });
    }
};