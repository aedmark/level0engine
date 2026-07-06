// AcousticEngine.js
// LEVEL 0 DEDICATED ACOUSTIC TOPOLOGY

export default class AcousticEngine {
    constructor() {
        this.initialized = false;
        this.ctx = null;
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

        // ANCHOR THE AUTOMATION TIMELINE
        // Prevents the Web Audio API from ramping down from a default 1.0 volume
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
    }

    update(telemetry) {
        if (!this.initialized || !this.mainGain) return;
        const {minLightDist, isOccluded, activeSector, anomalyPressure, playerSpeed, playerExhaustion} = telemetry;
        const time = this.ctx.currentTime;
        const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
        this.mainGain.gain.setTargetAtTime(0.005 + (proximity * 0.02), time, 0.5);
        let whineTarget = isOccluded ? 0.0001 : 0.0005 + (proximity * 0.003);
        let noiseTarget = 0.0;
        let rumbleFreq = 60;
        let peaceTarget = 0.0;
        let baseFreq = isOccluded ? 120 : 250;
        switch (activeSector) {
            case "POOLROOMS":
                noiseTarget = 0.08;
                whineTarget = 0.0002;
                peaceTarget = 0.03;
                baseFreq = 140;
                rumbleFreq = 40;
                break;
            case "BOARDROOM":
                noiseTarget = 0.4;
                whineTarget = 0.0;
                break;
            case "SERVER":
                rumbleFreq = 35;
                whineTarget = isOccluded ? 0.0005 : 0.002;
                break;
            case "ATRIUM":
                noiseTarget = 0.8;
                whineTarget = 0.0;
                peaceTarget = 0.15;
                baseFreq = 80;
                break;
            case "CLINIC":
                noiseTarget = 0.1;
                whineTarget = 0.003;
                baseFreq = 180;
                break;
            case "ARCHIVE":
                baseFreq = 60;
                break;
        }
        this.whineGain.gain.setTargetAtTime(whineTarget, time, 0.5);
        if (this.atriumGain) this.atriumGain.gain.setTargetAtTime(noiseTarget, time, 1.0);
        if (this.peaceGain) this.peaceGain.gain.setTargetAtTime(peaceTarget, time, 2.0);
        if (this.entityGain) {
            this.entityGain.gain.setTargetAtTime(anomalyPressure > 0 ? (anomalyPressure * 0.4) : 0, time, 0.2);
        }
        if (this.subRumble) {
            this.subRumble.frequency.setTargetAtTime(rumbleFreq + (anomalyPressure * 40), time, 2.0);
        }
        if (this.kineticFilter) {
            const exertionPulse = Math.sin(performance.now() / 1000 * 8.0) * (playerSpeed * 5);
            const speedScale = isOccluded ? 2 : 8;
            const rawFreq = baseFreq + (playerSpeed * speedScale) + exertionPulse - (anomalyPressure * 150) - (playerExhaustion * 100);
            const targetFreq = Math.min(Math.max(40, rawFreq), 2000);
            const timeConstant = (isOccluded || activeSector === "ATRIUM" || anomalyPressure > 0 || playerExhaustion > 0) ? 0.2 : 3.0;
            this.kineticFilter.frequency.setTargetAtTime(targetFreq, time, timeConstant);
        }
    }
}