/**
 * [ROLE] Controls the real-time engine boot sequence UI, telemetry logs, and honest progress tracking.
 * [WHY] Replaces static/fake loading animations with deterministic work metrics, dark-whimsical liminal telemetry,
 *        smooth lerp interpolation, and an enforced minimum display window so fast boots feel intentional and premium.
 * [STATE] Stateful singleton during boot. Manages progress target, displayed lerped value, phase index, and console log lines.
 * [DEPENDS] Reads and updates DOM elements in engine.html.
 */
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
        this.phaseIndex = 1;
        this.phaseTitle = 'INITIALIZING SOMATIC LINK...';
        this.logs = [];
        this.maxLogs = 4;
        this.startTime = 0;
        this.minDurationMs = 1500; // Enforce minimum smooth animation window (1.5s)
        this.isComplete = false;
        this.rafId = null;
        this.resolveFinish = null;

        // Whimsical telemetry lines inspired by Sims "reticulating splines" tailored for Level 0 Engine
        this.whimsicalPool = {
            1: [
                'RETICULATING CASE FILE THREADS...',
                'PARSING ARCHIVAL PAYROLL REGISTRIES...',
                'RECOVERING LOST LOG ENTRIES...',
                'INDEXING UNSETTLED DISCOVERIES...',
                'AUDITING DEPARTED PERSONNEL RECORDS...'
            ],
            2: [
                'CALIBRATING CARPET MOISTURE METERS...',
                'MEASURING CEILING WATER STAIN DENSITY...',
                'SYNCHRONIZING FLUORESCENT BULB FLICKER...',
                'BAKING CORROSION & RUST METRICS...',
                'STABILIZING MONOLITHIC PANEL TEXTURES...'
            ],
            3: [
                'ALIGNING MAZE SPATIAL CORRIDORS...',
                'VERIFYING AIRLOCK PRESSURE DIFFERENTIALS...',
                'COMPUTING NON-EUCLIDEAN SECTOR SEEDS...',
                'PROJECTING LIMINAL RECEPTION HALLS...',
                'SPAWNING VENTILATION SHAFT DUCTS...'
            ],
            4: [
                'MATERIALIZING ANOMALOUS SECTOR BLUEPRINTS...',
                'CHARGING LUMEN GRID LIGHT PROBES...',
                'PREWARMING ARCHITECTURAL MATRICES...',
                'MAPPING ATRIUM ILLUMINATION CASCADES...'
            ],
            5: [
                'COMPILING SOMATIC PHOSPHOR SHADERS...',
                'LINKING LOGARITHMIC DEPTH PERMUTATIONS...',
                'INITIALIZING PARALLEL SHADER PROGRAM PIPELINE...',
                'LOCKING GRAPHICS SHADOW CASCADE SLOTS...'
            ],
            6: [
                'MEASURING PARANOIA COEFFICIENTS...',
                'TUNING SOMATIC FREQUENCY HARMONICS...',
                'PURGING VOLATILE MEMORY RESIDUE...',
                'STABILIZING SOMATIC LINK & UNVEILING THRESHOLD...'
            ]
        };

        this._onFrame = this._onFrame.bind(this);
    }

    init() {
        this.targetProgress = 0;
        this.displayedProgress = 0;
        this.phaseIndex = 1;
        this.phaseTitle = 'INITIALIZING SOMATIC LINK...';
        this.logs = [];
        this.startTime = performance.now();
        this.isComplete = false;

        const overlay = document.getElementById('flash-overlay');
        if (overlay) {
            overlay.style.transition = 'none';
            overlay.style.backgroundColor = '#050505';
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'all';
        }

        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'block';
        }

        this.addLog('SYSTEM.INIT // EDMARK LABS SOMATIC LINK v0.9.8');
        this.addLog('ESTABLISHING ISOLATED MEMORY MANIFOLD...');

        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(this._onFrame);
    }

    setPhase(phaseNum, title, targetPct) {
        this.phaseIndex = phaseNum;
        if (title) this.phaseTitle = title;
        if (targetPct !== undefined) {
            this.targetProgress = Math.max(this.targetProgress, targetPct);
        }

        // Add a random whimsical flavor line for this phase if not provided
        const pool = this.whimsicalPool[phaseNum] || [];
        if (pool.length > 0) {
            const flavor = pool[Math.floor(Math.random() * pool.length)];
            this.addLog(flavor);
        }

        this.updateDOM();
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
        
        // Avoid consecutive duplicate log lines
        if (this.logs.length > 0 && this.logs[this.logs.length - 1] === formatted) return;
        
        this.logs.push(formatted);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.updateDOM();
    }

    triggerWhimsicalFlavor(phaseNum) {
        const pool = this.whimsicalPool[phaseNum || this.phaseIndex] || [];
        if (pool.length > 0) {
            const line = pool[Math.floor(Math.random() * pool.length)];
            this.addLog(line);
        }
    }

    _onFrame() {
        if (this.isComplete && this.displayedProgress >= 100) return;

        const now = performance.now();
        const elapsed = now - this.startTime;

        // Time-based progress ceiling ensuring enforced minimum duration sweep (1.5s total duration)
        const timeProgressCap = Math.min(100, (elapsed / this.minDurationMs) * 100);

        // Actual progress target capped by minimum animation time (prevents instantaneous flash on cached loads)
        const effectiveTarget = Math.min(this.targetProgress, timeProgressCap);

        // Smooth lerp easing for visual progress
        const lerpSpeed = 0.15;
        const diff = effectiveTarget - this.displayedProgress;

        if (Math.abs(diff) > 0.05) {
            this.displayedProgress += diff * lerpSpeed;
        } else {
            this.displayedProgress = effectiveTarget;
        }

        // If real target is 100% and min time hasn't elapsed, keep advancing displayed progress smoothly up to 100%
        if (this.targetProgress >= 100 && elapsed >= this.minDurationMs) {
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
        }
    }

    updateDOM() {
        const pctInt = Math.floor(this.displayedProgress);
        
        // Title & Stepper
        const titleEl = document.getElementById('loading-text');
        if (titleEl) {
            titleEl.textContent = this.phaseTitle;
        }

        const phaseBadgeEl = document.getElementById('loading-phase-badge');
        if (phaseBadgeEl) {
            phaseBadgeEl.textContent = `PHASE 0${this.phaseIndex}/06`;
        }

        const pctEl = document.getElementById('loading-pct-counter');
        if (pctEl) {
            pctEl.textContent = `[ ${pctInt.toString().padStart(3, ' ')}% ]`;
        }

        // Progress Bar Width
        const barEl = document.getElementById('progress-bar');
        if (barEl) {
            barEl.style.width = `${this.displayedProgress}%`;
        }

        // Rolling Telemetry Log Box
        const logBox = document.getElementById('loading-log-box');
        if (logBox) {
            logBox.innerHTML = this.logs.map(line => `<div>${this.escapeHTML(line)}</div>`).join('');
            logBox.scrollTop = logBox.scrollHeight;
        }
    }

    finish() {
        this.targetProgress = 100;
        this.setPhase(6, 'STABILIZING SOMATIC LINK...', 100);
        this.addLog('SOMATIC LINK STABILIZED. THRESHOLD OPEN.');

        return new Promise((resolve) => {
            this.resolveFinish = () => {
                this.isComplete = true;
                const overlay = document.getElementById('flash-overlay');
                if (overlay) {
                    overlay.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    overlay.style.opacity = '0';
                    overlay.style.pointerEvents = 'none';
                    setTimeout(() => {
                        const indicator = document.getElementById('loading-indicator');
                        if (indicator) indicator.style.display = 'none';
                        resolve();
                    }, 800);
                } else {
                    resolve();
                }
            };
        });
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag)
        );
    }
}
