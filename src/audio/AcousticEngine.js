import Synthesizer from './Synthesizer.js';
import Mixer from './Mixer.js';
import Foley from './Foley.js';

/**
 * AcousticEngine
 *
 * The central manager for all procedural audio in Level 0.
 * Instead of playing pre-recorded audio files, all sound is generated at runtime
 * using the Web Audio API. This allows for dynamic, context-aware soundscapes that
 * react to player telemetry (speed, exhaustion, paranoia, proximity to entities).
 *
 * It delegates node creation to `Synthesizer.js`, real-time mixing to `Mixer.js`,
 * and specific event triggers to `Foley.js`.
 */
export default class AcousticEngine {
    constructor() {
        this.initialized = false;
        this.ctx = null;
        this.masterVolume = 1.0;
        this._cache = new Map();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        Synthesizer.injectNodes(this);
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    update(telemetry) {
        Mixer.update(this, telemetry);
    }

    triggerSomaticEvent(type, distanceSq, intensity) {
        Foley.trigger(this, type, distanceSq, intensity);
    }

    playMuzakNote(freq, time, isChord = false) {
        Foley.playMuzakNote(this, freq, time, isChord);
    }

    /**
     * Switches the reverb to a new room, crossfading between the two convolver slots.
     *
     * Called every frame by `Mixer` and returns immediately unless the room actually changed,
     * since building an impulse response allocates and fills a multi-megabyte buffer and is
     * emphatically not per-frame work.
     *
     * Responses are cached by their parameters, so walking a loop between two sectors builds
     * each room's buffer once and reuses it forever after. Twelve distinct rooms cost roughly
     * 8MB resident at 48kHz, which is cheaper than a single texture atlas in this engine.
     *
     * @param {number} decay - RT60 in seconds.
     * @param {number} predelay - Seconds before the tail begins.
     */
    setReverbRoom(decay, predelay) {
        if (!this.initialized || !this.convolvers) return;
        const key = `${decay}_${predelay}`;
        if (key === this._reverbKey) return;
        this._reverbKey = key;
        let impulse = this._irCache.get(key);
        if (!impulse) {
            impulse = Synthesizer.buildImpulseResponse(this.ctx, decay, predelay);
            this._irCache.set(key, impulse);
        }
        const outgoing = this._reverbSlot;
        const incoming = (outgoing + 1) % 2;
        const t = this.ctx.currentTime;
        this.convolvers[incoming].conv.buffer = impulse;
        this.convolvers[incoming].wet.gain.setTargetAtTime(1.0, t, 0.5);
        this.convolvers[outgoing].wet.gain.setTargetAtTime(0.0, t, 0.5);
        this._reverbSlot = incoming;
    }

    setVolume(val) {
        this.masterVolume = val;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val * 2.5, this.ctx.currentTime, 0.1);
        }
    }
}