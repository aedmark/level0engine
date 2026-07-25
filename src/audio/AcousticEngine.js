// AcousticEngine.js
// LEVEL 0 ACOUSTIC GENERATION ENGINE

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
    
    setVolume(val) {
        this.masterVolume = val;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val * 2.5, this.ctx.currentTime, 0.1);
        }
    }
}
