import Synthesizer from './Synthesizer.js';
import Mixer from './Mixer.js';
import Foley from './Foley.js';

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

    startAcmeFallWhistle() {
        Foley.startAcmeFallWhistle(this);
    }

    stopAcmeFallWhistle(caught) {
        Foley.stopAcmeFallWhistle(this, caught);
    }

    startChuteSlide() {
        Foley.startChuteSlide(this);
    }

    stopChuteSlide(caught) {
        Foley.stopChuteSlide(this, caught);
    }

    playMuzakNote(freq, time, isChord = false) {
        Foley.playMuzakNote(this, freq, time, isChord);
    }

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
        this.convolvers[incoming].wet.connect(this.ctx.destination);
        this.convolvers[incoming].wet.gain.setTargetAtTime(1.0, t, 0.5);
        
        const outWet = this.convolvers[outgoing].wet;
        outWet.gain.setTargetAtTime(0.0, t, 0.5);

        setTimeout(() => {
            if (this._reverbSlot !== outgoing) {
                outWet.disconnect();
            }
        }, 3000);
        
        this._reverbSlot = incoming;
    }

    setVolume(val) {
        this.masterVolume = val;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val * 2.5, this.ctx.currentTime, 0.1);
        }
    }
}