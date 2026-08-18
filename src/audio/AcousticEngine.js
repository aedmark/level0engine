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
        
        // Wait for the 0.5s exponential fade (approx 3s for ~99% decay) then disconnect 
        // the wet path entirely. Firefox continues to spend heavy CPU on convolvers 
        // with 0 gain unless they are fully unhooked from the destination.
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