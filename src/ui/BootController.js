import RenderEngine from '../core/RenderEngine.js';

/**
 * Boot phase table — the single source of truth for both ordering and the progress
 * bar's weighting.
 *
 * `from`/`to` are percentage bands, and they are sized by *measured* cost rather than by
 * how important a step feels. A representative warm boot (4607ms of engine time) breaks
 * down as:
 *
 *     DATA      195ms  ( 4.2%)   narrative JSON + engine object construction
 *     ASSETS    180ms  ( 3.9%)   core WebP texture load
 *     GRID        2ms  ( 0.0%)   world grid generation
 *     BLUEPRNT  282ms  ( 6.1%)   sector textures + material warmup
 *     CHUNKS   2000ms  (43.4%)   initial chunk build
 *     SHADERS  1947ms  (42.3%)   program link + first frame
 *     STABLE      1ms  ( 0.0%)
 *
 * The old hardcoded milestones (15/40/65/70/85/98, scattered across three files) gave
 * the two cheapest steps 40% of the bar, and gave the chunk build no representation at
 * all: it ran inside a single unreported `await`, so the bar sat motionless for seconds
 * in the middle of its sweep.
 *
 * These bands were re-measured after form-aware shader warming cut the chunk phase from
 * 3678ms to 2000ms, which moved it from three fifths of boot to roughly level with the
 * program link. Re-measure with the console table this controller prints and adjust
 * `from`/`to` here — no other file hardcodes a boot percentage any more.
 */
export const BOOT_PHASES = [
    {key: 'DATA',     title: 'RETICULATING NARRATIVE THREADS & CASE FILES...', from: 0,  to: 4},
    {key: 'ASSETS',   title: 'CALIBRATING CARPET MOISTURE & CEILING GRAIN...', from: 4,  to: 8},
    {key: 'GRID',     title: 'ALIGNING MAZE SPATIAL CORRIDORS...',             from: 8,  to: 9},
    {key: 'BLUEPRNT', title: 'PREWARMING ANOMALOUS SECTOR BLUEPRINTS...',      from: 9,  to: 15},
    {key: 'CHUNKS',   title: 'MATERIALIZING SPATIAL CHUNK GEOMETRY...',        from: 15, to: 58},
    {key: 'SHADERS',  title: 'COMPILING SOMATIC PHOSPHOR SHADERS...',          from: 58, to: 99},
    {key: 'STABLE',   title: 'STABILIZING SOMATIC LINK...',                    from: 99, to: 100}
];

const PHASE_BY_KEY = new Map(BOOT_PHASES.map((p, i) => [p.key, {...p, index: i + 1}]));

export default class BootController {
    static instance = null;

    static getInstance() {
        if (!BootController.instance) {
            BootController.instance = new BootController();
        }
        return BootController.instance;
    }

    constructor() {
        this.targetProgress = 0;
        this.displayedProgress = 0;
        this.phase = PHASE_BY_KEY.get('DATA');
        this.phaseTitle = 'INITIALIZING SOMATIC LINK...';
        this.logs = [];
        this.maxLogs = 4;
        this.fullLog = [];
        this.phaseDurations = [];
        this._phaseStartTime = 0;
        this.startTime = 0;
        this.minDurationMs = 1500;
        this.isComplete = false;
        this.rafId = null;
        this.resolveFinish = null;
        this._crawl = null;
        this.isSubLoad = false;

        // Timing marks captured before this controller exists (module fetch/parse, and
        // the user-gated Continue prompt). See init().
        this._preInitMs = 0;
        this._promptMs = 0;

        this._els = null;
        this._logsDirty = true;
        this._lastRenderedPct = -1;
        this._lastRenderedTitle = null;
        this._lastRenderedBadge = null;

        this.whimsicalPool = {
            DATA: [
                'RETICULATING CASE THREADS...',
                'PARSING ARCHIVAL PAYROLL REGISTRIES...',
                'RECOVERING LOST LOG ENTRIES...',
                'INDEXING UNSETTLED DISCOVERIES...',
                'AUDITING DEPARTED PERSONNEL RECORDS...'
            ],
            ASSETS: [
                'CALIBRATING CARPET MOISTURE METERS...',
                'MEASURING CEILING WATER STAIN DENSITY...',
                'SYNCHRONIZING FLUORESCENT BULB FLICKER...',
                'BAKING CORROSION & RUST METRICS...',
                'STABILIZING MONOLITHIC PANEL TEXTURES...'
            ],
            GRID: [
                'ALIGNING MAZE SPATIAL CORRIDORS...',
                'VERIFYING AIRLOCK PRESSURE DIFFERENTIALS...',
                'COMPUTING NON-EUCLIDEAN SECTOR SEEDS...',
                'PROJECTING LIMINAL RECEPTION HALLS...'
            ],
            BLUEPRNT: [
                'MATERIALIZING ANOMALOUS SECTOR BLUEPRINTS...',
                'CHARGING LUMEN GRID LIGHT PROBES...',
                'PREWARMING ARCHITECTURAL MATRICES...',
                'MAPPING ATRIUM ILLUMINATION CASCADES...'
            ],
            CHUNKS: [
                'SPAWNING VENTILATION SHAFT DUCTS...',
                'POURING FOUNDATION SLABS & FLOOR PLATES...',
                'THREADING CONDUIT THROUGH DEAD CORRIDORS...',
                'SETTLING FURNITURE INTO ABANDONED OFFICES...',
                'RESOLVING WALL COLLISION BOUNDARIES...'
            ],
            SHADERS: [
                'COMPILING SOMATIC PHOSPHOR SHADERS...',
                'LINKING LOGARITHMIC DEPTH PERMUTATIONS...',
                'INITIALIZING PARALLEL SHADER PROGRAM PIPELINE...',
                'LOCKING GRAPHICS SHADOW CASCADE SLOTS...'
            ],
            STABLE: [
                'MEASURING PARANOIA COEFFICIENTS...',
                'TUNING SOMATIC FREQUENCY HARMONICS...',
                'PURGING VOLATILE MEMORY RESIDUE...',
                'STABILIZING SOMATIC LINK & UNVEILING THRESHOLD...'
            ]
        };

        this._onFrame = this._onFrame.bind(this);
    }

    /**
     * @param {object} [marks]
     * @param {number} [marks.preInitMs] performance.now() at the top of main.js — i.e.
     *   everything the browser did before any engine code ran: HTML parse, r160.js,
     *   and the 121-module graph.
     * @param {number} [marks.promptMs] time spent blocked on the Continue / New Game
     *   prompt. User-gated, so it is reported separately and never folded into engine
     *   boot time.
     */
    init(marks = {}) {
        this.targetProgress = 0;
        this.displayedProgress = 0;
        this.phase = PHASE_BY_KEY.get('DATA');
        this.phaseTitle = 'INITIALIZING SOMATIC LINK...';
        this.logs = [];
        this.fullLog = [];
        this.phaseDurations = [];
        this.startTime = performance.now();
        this._phaseStartTime = this.startTime;
        this.isComplete = false;
        this.isSubLoad = false;
        this._crawl = null;
        this._preInitMs = marks.preInitMs || 0;
        this._promptMs = marks.promptMs || 0;
        this._logsDirty = true;

        const overlay = this._el('flash-overlay');
        if (overlay) {
            overlay.style.transition = 'none';
            overlay.style.backgroundColor = '#050505';
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'all';
        }

        const indicator = this._el('loading-indicator');
        if (indicator) {
            indicator.style.display = 'block';
        }

        console.log(
            '%c[BOOT] Starting — full timeline logged below, phase durations tabulated at the end. ' +
            'If boot is unexpectedly slow, copy this console output.',
            'color:#7fd; font-weight:bold;'
        );
        this.addLog('SYSTEM.INIT // EDMARK LABS SOMATIC LINK v0.9.8');
        this.addLog('ESTABLISHING ISOLATED MEMORY MANIFOLD...');

        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(this._onFrame);
    }

    /** Cached element lookups — updateDOM runs every frame and used to re-query all five. */
    _el(id) {
        if (!this._els) this._els = {};
        if (this._els[id] === undefined) this._els[id] = document.getElementById(id);
        return this._els[id];
    }

    /**
     * Dumps everything relevant to "why is this person's boot/framerate different
     * from mine" — GPU/driver strings, CPU/memory hints, tab visibility, and the
     * exact graphics settings this session is booting with. Call once the RenderEngine
     * exists (BootController.init() runs before it's constructed, so this can't live there).
     */
    logDeviceInfo(engine) {
        const info = {
            userAgent: navigator.userAgent,
            hardwareConcurrency: navigator.hardwareConcurrency ?? 'n/a',
            deviceMemoryGB: navigator.deviceMemory ?? 'n/a',
            screen: `${screen.width}x${screen.height} @ dpr${window.devicePixelRatio}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            documentVisibility: document.visibilityState,
            hasFocus: document.hasFocus()
        };
        try {
            const gl = engine.renderer.getContext();
            const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
            info.glVendor = dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
            info.glRenderer = dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
            info.glVersion = gl.getParameter(gl.VERSION);
            info.isWebGL2 = engine.renderer.capabilities.isWebGL2;
            info.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            info.parallelShaderCompile = !!gl.getExtension('KHR_parallel_shader_compile');
        } catch (e) {
            info.glError = String(e);
        }
        info.settings = {
            resolutionScale: RenderEngine.getSavedResolutionScale(),
            shadowQuality: RenderEngine.getSavedShadowQuality(),
            aaSamples: RenderEngine.getSavedAA(),
            fxaa: RenderEngine.getSavedFXAA(),
            postProcessing: RenderEngine.getSavedPostProcess(),
            renderDistance: RenderEngine.getSavedRenderDistance()
        };
        console.log('%c[BOOT] Device / settings snapshot:', 'color:#7fd; font-weight:bold;', info);
        this.fullLog.push(`[DEVICE] ${JSON.stringify(info)}`);
    }

    /** Advance to a phase by key. Bands come from BOOT_PHASES; callers never pass percentages. */
    setPhase(key, title) {
        const phase = PHASE_BY_KEY.get(key);
        if (!phase) {
            console.warn(`[BOOT] Unknown phase key "${key}"`);
            return;
        }
        if (this.phase && phase.key !== this.phase.key) {
            this._recordPhaseDuration(this.phase);
            this._phaseStartTime = performance.now();
        }
        this.phase = phase;
        this.phaseTitle = title || phase.title;
        this._crawl = null;
        this.targetProgress = Math.max(this.targetProgress, phase.from);

        console.log(`%c[BOOT] ---- PHASE ${phase.index}/${BOOT_PHASES.length}: ${this.phaseTitle} ----`, 'color:#fd7; font-weight:bold;');

        const pool = this.whimsicalPool[phase.key] || [];
        if (pool.length > 0) {
            this.addLog(pool[Math.floor(Math.random() * pool.length)]);
        }
        this.updateDOM();
    }

    /**
     * Report progress as a 0..1 fraction *within the current phase's band*. This is the
     * primary API — it means a step reports how far along it is without needing to know
     * where it sits in the overall boot, so reweighting is a one-line change to
     * BOOT_PHASES rather than an edit to every call site.
     */
    setPhaseProgress(fraction, logMsg) {
        const phase = this.phase;
        if (!phase) return;
        const clamped = Math.max(0, Math.min(1, fraction));
        const pct = phase.from + (phase.to - phase.from) * clamped;
        this._crawl = null;
        this.setProgress(pct, logMsg);
    }

    /**
     * Synthetic crawl for steps that cannot report real progress — principally
     * `renderer.compileAsync`, which is opaque until it resolves.
     *
     * It eases asymptotically toward the phase's ceiling and never actually arrives, so
     * the bar always looks alive but can never claim a step finished before it did. A
     * real setPhaseProgress/setPhase call cancels it.
     *
     * @param {number} estimatedMs roughly how long the step usually takes; the curve is
     *   shaped so ~63% of the remaining band is covered by that point.
     */
    beginCrawl(estimatedMs, ceilingFraction = 1.0) {
        const phase = this.phase;
        if (!phase) return;
        this._crawl = {
            from: Math.max(this.targetProgress, phase.from),
            to: phase.from + (phase.to - phase.from) * ceilingFraction,
            startedAt: performance.now(),
            estMs: Math.max(1, estimatedMs)
        };
    }

    _recordPhaseDuration(phase) {
        const durationMs = performance.now() - this._phaseStartTime;
        this.phaseDurations.push({
            phase: `${phase.index}. ${phase.key}`,
            ms: Math.round(durationMs),
            band: `${phase.from}-${phase.to}%`
        });
    }

    setProgress(targetPct, logMsg) {
        this.targetProgress = Math.min(100, Math.max(this.targetProgress, targetPct));
        if (logMsg) {
            this.addLog(logMsg);
        }
        this.updateDOM();
    }

    addLog(msg) {
        if (!msg) return;
        const timestamp = ((performance.now() - (this.startTime || performance.now())) / 1000).toFixed(2);
        const formatted = `> [${timestamp}s] ${msg}`;

        if (this.logs.length > 0 && this.logs[this.logs.length - 1] === formatted) return;

        this.logs.push(formatted);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.fullLog.push(formatted);
        this._logsDirty = true;
        console.log(`[BOOT] ${formatted}`);
        this.updateDOM();
    }

    triggerWhimsicalFlavor(phaseKey) {
        const key = phaseKey || (this.phase && this.phase.key);
        const pool = this.whimsicalPool[key] || [];
        if (pool.length > 0) {
            this.addLog(pool[Math.floor(Math.random() * pool.length)]);
        }
    }

    _onFrame() {
        if (this.isComplete && this.displayedProgress >= 100) {
            this.rafId = null;
            return;
        }

        const now = performance.now();
        const elapsed = now - this.startTime;

        if (this._crawl) {
            const c = this._crawl;
            // 1 - e^-t: fast at first, asymptotic toward the ceiling, never reaching it.
            const eased = 1 - Math.exp(-(now - c.startedAt) / c.estMs);
            this.targetProgress = Math.max(this.targetProgress, c.from + (c.to - c.from) * eased);
        }

        const timeProgressCap = this.isSubLoad ? 100 : Math.min(100, (elapsed / this.minDurationMs) * 100);
        const effectiveTarget = Math.min(this.targetProgress, timeProgressCap);

        const lerpSpeed = 0.15;
        const diff = effectiveTarget - this.displayedProgress;

        if (Math.abs(diff) > 0.05) {
            this.displayedProgress += diff * lerpSpeed;
        } else {
            this.displayedProgress = effectiveTarget;
        }

        if (this.targetProgress >= 100 && (this.isSubLoad || elapsed >= this.minDurationMs)) {
            if (this.displayedProgress < 99.9) {
                this.displayedProgress += (100 - this.displayedProgress) * 0.25;
            } else {
                this.displayedProgress = 100;
                if (this.resolveFinish) {
                    this.resolveFinish();
                    this.resolveFinish = null;
                }
            }
        }

        this.updateDOM();

        if (!this.isComplete || this.displayedProgress < 100) {
            this.rafId = requestAnimationFrame(this._onFrame);
        } else {
            this.rafId = null;
        }
    }

    /**
     * Runs every frame, so everything here is guarded by a change check. The previous
     * version rewrote the log box's innerHTML and then read scrollHeight on every single
     * frame of boot — an HTML parse plus a forced synchronous layout, ~60 times a
     * second, competing with the very work it was reporting on.
     */
    updateDOM() {
        const pctInt = Math.floor(this.displayedProgress);

        if (this._lastRenderedTitle !== this.phaseTitle) {
            const titleEl = this._el('loading-text');
            if (titleEl) titleEl.textContent = this.phaseTitle;
            this._lastRenderedTitle = this.phaseTitle;
        }

        const badge = this.isSubLoad
            ? 'SECTOR LOAD'
            : `PHASE ${String(this.phase ? this.phase.index : 1).padStart(2, '0')}/${String(BOOT_PHASES.length).padStart(2, '0')}`;
        if (this._lastRenderedBadge !== badge) {
            const phaseBadgeEl = this._el('loading-phase-badge');
            if (phaseBadgeEl) phaseBadgeEl.textContent = badge;
            this._lastRenderedBadge = badge;
        }

        if (this._lastRenderedPct !== pctInt) {
            const pctEl = this._el('loading-pct-counter');
            if (pctEl) pctEl.textContent = `[ ${pctInt.toString().padStart(3, ' ')}% ]`;
            this._lastRenderedPct = pctInt;
        }

        const barEl = this._el('progress-bar');
        if (barEl) barEl.style.width = `${this.displayedProgress}%`;

        if (this._logsDirty) {
            const logBox = this._el('loading-log-box');
            if (logBox) {
                logBox.textContent = '';
                for (const line of this.logs) {
                    const div = document.createElement('div');
                    div.textContent = line;
                    logBox.appendChild(div);
                }
                logBox.scrollTop = logBox.scrollHeight;
            }
            this._logsDirty = false;
        }
    }

    finish() {
        this.setPhase('STABLE');
        this.targetProgress = 100;
        this.addLog('SOMATIC LINK STABILIZED. THRESHOLD OPEN.');
        this._recordPhaseDuration(this.phase);

        const engineMs = Math.round(performance.now() - this.startTime);
        const preInit = Math.round(this._preInitMs);
        const prompt = Math.round(this._promptMs);
        const total = preInit + prompt + engineMs;

        // Reported as a breakdown rather than one number, because `startTime` is set when
        // this controller is constructed — after the browser has already parsed the HTML,
        // fetched r160.js and evaluated 121 ES modules, and after the Continue prompt has
        // been answered. Quoting only the engine phases understated true boot; quoting
        // only the total would blame the engine for however long a player sat looking at
        // the Continue screen. Both are shown, separately.
        console.log('%c[BOOT] Complete. Wall-clock breakdown:', 'color:#7fd; font-weight:bold;');
        console.table([
            {stage: 'Document + modules (pre-engine)', ms: preInit},
            {stage: 'Continue prompt (user-gated)', ms: prompt},
            {stage: 'Engine boot (phases)', ms: engineMs},
            {stage: 'TOTAL', ms: total}
        ]);
        console.log('%c[BOOT] Phase breakdown:', 'color:#7fd; font-weight:bold;');
        console.table(this.phaseDurations);
        console.log('[BOOT] Full log:', this.fullLog);

        return new Promise((resolve) => {
            this.resolveFinish = () => {
                this.isComplete = true;
                const overlay = this._el('flash-overlay');
                if (overlay) {
                    overlay.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    overlay.style.opacity = '0';
                    overlay.style.pointerEvents = 'none';
                    setTimeout(() => {
                        const indicator = this._el('loading-indicator');
                        if (indicator) indicator.style.display = 'none';
                        resolve();
                    }, 800);
                } else {
                    resolve();
                }
            };
        });
    }

    /**
     * In-game sector loads reuse this same overlay, and previously just called
     * setPhase(3, ...) on the finished controller. That could not work: targetProgress
     * only ever moves via Math.max, so it was still pinned at 100, and the rAF loop had
     * already exited — leaving the player looking at a frozen "PHASE 03/06 [ 100% ]"
     * bar on every single sector transition.
     *
     * beginSubLoad tears that state down and restarts the animation loop in a distinct
     * mode: no six-phase framing, no minimum duration, and a synthetic crawl, because
     * the chunk builder cannot report meaningful progress mid-transition.
     */
    beginSubLoad(title = 'LOADING ANOMALOUS SECTOR...', estimatedMs = 1200) {
        this.isSubLoad = true;
        this.isComplete = false;
        this.targetProgress = 0;
        this.displayedProgress = 0;
        this.phaseTitle = title;
        this.logs = [];
        this._logsDirty = true;
        this._lastRenderedPct = -1;
        this._lastRenderedTitle = null;
        this._lastRenderedBadge = null;
        this.resolveFinish = null;

        this._crawl = {
            from: 0,
            to: 92,
            startedAt: performance.now(),
            estMs: Math.max(1, estimatedMs)
        };

        const indicator = this._el('loading-indicator');
        if (indicator) indicator.style.display = 'block';

        this.updateDOM();
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(this._onFrame);
    }

    /** Completes a sub-load: snaps the bar to 100, stops the loop, hides the indicator. */
    endSubLoad() {
        if (!this.isSubLoad) return;
        this._crawl = null;
        this.targetProgress = 100;
        this.displayedProgress = 100;
        this.isComplete = true;
        this.isSubLoad = false;
        this.updateDOM();
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        const indicator = this._el('loading-indicator');
        if (indicator) indicator.style.display = 'none';
    }
}
