// AcousticEngine.js
// LEVEL 0 DEDICATED ACOUSTIC TOPOLOGY

export default class AcousticEngine {
    constructor() {
        this.initialized = false;
        this.ctx = null;
        this._cache = new Map();
        this.sectors = {
            "NORMAL": { noise: 0.0, peace: 0.0, rumble: 60, freq: 250, freqOcc: 120, whine: 0.0005, whineOcc: 0.0001, dynamicWhine: true },
            "POOLROOMS": { noise: 0.08, peace: 0.03, rumble: 40, freq: 140, freqOcc: 140, whine: 0.0002, whineOcc: 0.0002, dynamicWhine: false },
            "BOARDROOM": { noise: 0.4, peace: 0.0, rumble: 60, freq: 250, freqOcc: 120, whine: 0.0, whineOcc: 0.0, dynamicWhine: false },
            "SERVER": { noise: 0.0, peace: 0.0, rumble: 35, freq: 250, freqOcc: 120, whine: 0.002, whineOcc: 0.0005, dynamicWhine: false },
            "ATRIUM": { noise: 0.8, peace: 0.15, rumble: 60, freq: 80, freqOcc: 80, whine: 0.0, whineOcc: 0.0, dynamicWhine: false },
            "CLINIC": { noise: 0.1, peace: 0.0, rumble: 60, freq: 180, freqOcc: 180, whine: 0.003, whineOcc: 0.003, dynamicWhine: false },
            "ARCHIVE": { noise: 0.0, peace: 0.0, rumble: 60, freq: 60, freqOcc: 60, whine: 0.0005, whineOcc: 0.0001, dynamicWhine: false }
        };
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.subRumble = this.ctx.createOscillator();
        this.subRumble.type = 'sine';
        this.subRumble.frequency.value = 60;
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = 120;
        this.kineticFilter = this.ctx.createBiquadFilter();
        this.kineticFilter.type = 'lowpass';
        this.kineticFilter.frequency.value = 250;
        osc2.connect(this.kineticFilter);
        const osc3 = this.ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = 1200;
        this.whineGain = this.ctx.createGain();
        this.whineGain.gain.value = 0;
        osc3.connect(this.whineGain);
        this.mainGain = this.ctx.createGain();
        this.mainGain.gain.value = 0;
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.008;
        lfo.connect(lfoGain);
        lfoGain.connect(this.mainGain.gain);
        this.exertionLFO = this.ctx.createOscillator();
        this.exertionLFO.type = 'sine';
        this.exertionLFO.frequency.value = 1.27; // ~8.0 rad/s
        this.exertionGain = this.ctx.createGain();
        this.exertionGain.gain.value = 0;
        this.exertionLFO.connect(this.exertionGain);
        this.exertionGain.connect(this.kineticFilter.frequency);
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        this.noiseSrc = this.ctx.createBufferSource();
        this.noiseSrc.buffer = noiseBuffer;
        this.noiseSrc.loop = true;
        this.noiseFilter = this.ctx.createBiquadFilter();
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.value = 300;
        this.atriumGain = this.ctx.createGain();
        this.atriumGain.gain.value = 0.0;
        this.noiseSrc.connect(this.noiseFilter);
        this.noiseFilter.connect(this.atriumGain);
        this.atriumGain.connect(this.ctx.destination);
        this.peaceOsc = this.ctx.createOscillator();
        this.peaceOsc.type = 'sine';
        this.peaceOsc.frequency.value = 432;
        this.peaceGain = this.ctx.createGain();
        this.peaceGain.gain.value = 0.0;
        this.peaceOsc.connect(this.peaceGain);
        this.peaceGain.connect(this.ctx.destination);
        this.entityOsc = this.ctx.createOscillator();
        this.entityOsc.type = 'sawtooth';
        this.entityOsc.frequency.value = 40;
        this.entityLFO = this.ctx.createOscillator();
        this.entityLFO.type = 'square';
        this.entityLFO.frequency.value = 12;
        this.entityLFOGain = this.ctx.createGain();
        this.entityLFOGain.gain.value = 100;
        this.entityLFO.connect(this.entityLFOGain);
        this.entityLFOGain.connect(this.entityOsc.frequency);
        this.entityGain = this.ctx.createGain();
        this.entityGain.gain.value = 0.0;
        this.entityOsc.connect(this.entityGain);
        this.entityGain.connect(this.ctx.destination);
        this.subRumble.connect(this.mainGain);
        this.kineticFilter.connect(this.mainGain);
        this.whineGain.connect(this.mainGain);
        this.mainGain.connect(this.ctx.destination);

        const t = this.ctx.currentTime;
        this.mainGain.gain.setValueAtTime(0, t);
        this.whineGain.gain.setValueAtTime(0, t);
        this.atriumGain.gain.setValueAtTime(0, t);
        this.peaceGain.gain.setValueAtTime(0, t);
        this.entityGain.gain.setValueAtTime(0, t);
        this.subRumble.frequency.setValueAtTime(60, t);
        this.kineticFilter.frequency.setValueAtTime(250, t);

        this.subRumble.start();
        osc2.start();
        osc3.start();
        lfo.start();
        this.noiseSrc.start();
        this.peaceOsc.start();
        this.entityOsc.start();
        this.entityLFO.start();
        this.exertionLFO.start();
    }

    update(telemetry) {
        if (!this.initialized || !this.mainGain) return;
        const {minLightDist, isOccluded, activeSector, anomalyPressure, playerSpeed, playerExhaustion} = telemetry;
        const time = this.ctx.currentTime;
        const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
        const mix = this.sectors[activeSector] || this.sectors["NORMAL"];

        // The Gatekeeper: Only dispatch hardware events if the target has actually shifted.
        const setParam = (key, param, target, timeConstant) => {
            if (Math.abs((this._cache.get(key) || -999) - target) > 0.001) {
                param.setTargetAtTime(target, time, timeConstant);
                this._cache.set(key, target);
            }
        };

        setParam('main', this.mainGain.gain, 0.005 + (proximity * 0.02), 0.5);

        const whineTarget = isOccluded ? mix.whineOcc : mix.whine + (mix.dynamicWhine ? proximity * 0.003 : 0.0);
        setParam('whine', this.whineGain.gain, whineTarget, 0.5);

        if (this.atriumGain) setParam('atrium', this.atriumGain.gain, mix.noise, 1.0);
        if (this.peaceGain) setParam('peace', this.peaceGain.gain, mix.peace, 2.0);
        if (this.entityGain) setParam('entity', this.entityGain.gain, anomalyPressure > 0.0 ? anomalyPressure * 0.4 : 0.0, 0.2);
        if (this.subRumble) setParam('rumble', this.subRumble.frequency, mix.rumble + (anomalyPressure * 40.0), 2.0);

        if (this.kineticFilter) {
            const baseFreq = isOccluded ? mix.freqOcc : mix.freq;

            // Modulate the amplitude of the native hardware LFO, extracting the sine math from Javascript
            setParam('exertion', this.exertionGain.gain, playerSpeed * 5.0, 0.2);

            const targetFreq = Math.min(Math.max(40, baseFreq + (playerSpeed * (isOccluded ? 2.0 : 8.0)) - (anomalyPressure * 150.0) - (playerExhaustion * 100.0)), 2000);
            const timeConstant = (isOccluded || activeSector === "ATRIUM" || anomalyPressure > 0.0 || playerExhaustion > 0.0) ? 0.2 : 3.0;
            setParam('kinetic', this.kineticFilter.frequency, targetFreq, timeConstant);
        }
    }
}