// AcousticEngine.js
// LEVEL 0 DEDICATED ACOUSTIC TOPOLOGY

export default class AcousticEngine {
    constructor() {
        this.initialized = false;
        this.ctx = null;
        this.masterVolume = 1.0;
        this._cache = new Map();
        this.sectors = {
            "NORMAL": {
                noise: 0.0,
                peace: 0.0,
                rumble: 60,
                freq: 250,
                freqOcc: 120,
                whine: 0.0005,
                whineOcc: 0.0001,
                dynamicWhine: true
            },
            "POOLROOMS": {
                noise: 0.08,
                peace: 0.03,
                rumble: 40,
                freq: 140,
                freqOcc: 140,
                whine: 0.0002,
                whineOcc: 0.0002,
                dynamicWhine: false
            },
            "BOARDROOM": {
                noise: 0.4,
                peace: 0.0,
                rumble: 60,
                freq: 250,
                freqOcc: 120,
                whine: 0.0,
                whineOcc: 0.0,
                dynamicWhine: false
            },
            "SERVER": {
                noise: 0.0,
                peace: 0.0,
                rumble: 35,
                freq: 250,
                freqOcc: 120,
                whine: 0.002,
                whineOcc: 0.0005,
                dynamicWhine: false
            },
            "ATRIUM": {
                noise: 0.8,
                peace: 0.15,
                rumble: 60,
                freq: 80,
                freqOcc: 80,
                whine: 0.0,
                whineOcc: 0.0,
                dynamicWhine: false
            },
            "CLINIC": {
                noise: 0.1,
                peace: 0.0,
                rumble: 60,
                freq: 180,
                freqOcc: 180,
                whine: 0.003,
                whineOcc: 0.003,
                dynamicWhine: false
            },
            "ARCHIVE": {
                noise: 0.0,
                peace: 0.0,
                rumble: 60,
                freq: 60,
                freqOcc: 60,
                whine: 0.0005,
                whineOcc: 0.0001,
                dynamicWhine: false
            },
            "MAINTENANCE": {
                noise: 0.02,
                peace: 0.0,
                rumble: 90,
                freq: 120,
                freqOcc: 120,
                whine: 0.006,
                whineOcc: 0.002,
                dynamicWhine: false
            },
            "CHASM": {
                noise: 0.25,
                peace: 0.0,
                rumble: 30,
                freq: 40,
                freqOcc: 40,
                whine: 0.0,
                whineOcc: 0.0,
                dynamicWhine: false
            }
        };
        this.foleyProfiles = {
            "POOLROOMS": {
                oscFreq: 100,
                filterType: 'bandpass',
                filterFreq: 1200,
                gain: 0.18,
                attack: 0.02,
                decay: 0.15
            },
            "CLINIC": {oscFreq: 800, filterType: 'highpass', filterFreq: 3000, gain: 0.15, attack: 0.01, decay: 0.06},
            "BOARDROOM": {oscFreq: 120, filterType: 'lowpass', filterFreq: 1400, gain: 0.18, attack: 0.02, decay: 0.12},
            "MAINTENANCE": {
                oscFreq: 400,
                filterType: 'bandpass',
                filterFreq: 2500,
                gain: 0.12,
                attack: 0.01,
                decay: 0.15
            },
            "DEFAULT": {oscFreq: 60, filterType: 'lowpass', filterFreq: 600, gain: 0.10, attack: 0.04, decay: 0.18}
        };
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.masterVolume * 2.5;
        this.masterGain.connect(this.ctx.destination);
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
        lfoGain.gain.value = 0.002;
        lfo.connect(lfoGain);
        lfoGain.connect(this.mainGain.gain);
        this.exertionLFO = this.ctx.createOscillator();
        this.exertionLFO.type = 'sine';
        this.exertionLFO.frequency.value = 1.27;
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
        this.atriumGain.connect(this.masterGain);
        this.peaceOsc = this.ctx.createOscillator();
        this.peaceOsc.type = 'sine';
        this.peaceOsc.frequency.value = 432;
        this.peaceGain = this.ctx.createGain();
        this.peaceGain.gain.value = 0.0;
        this.peaceOsc.connect(this.peaceGain);
        this.peaceGain.connect(this.masterGain);
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
        this.entityGain.connect(this.masterGain);
        this.stepFilter = this.ctx.createBiquadFilter();
        this.stepGain = this.ctx.createGain();
        this.stepFilter.connect(this.stepGain);
        this.stepGain.connect(this.masterGain);
        this.doorFilter = this.ctx.createBiquadFilter();
        this.doorFilter.type = 'lowpass';
        this.doorGain = this.ctx.createGain();
        this.doorFilter.connect(this.doorGain);
        this.doorGain.connect(this.masterGain);
        this.subRumble.connect(this.mainGain);
        this.kineticFilter.connect(this.mainGain);
        this.whineGain.connect(this.mainGain);
        this.mainGain.connect(this.masterGain);
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
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    update(telemetry) {
        if (!this.initialized || !this.mainGain || this.ctx.state === 'suspended') return;
        const time = this.ctx.currentTime;
        if (time < 0.1) return;
        const {minLightDist, isOccluded, activeSector, anomalyPressure, playerSpeed, playerExhaustion} = telemetry;
        const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
        const mix = this.sectors[activeSector] || this.sectors["NORMAL"];
        const setParam = (key, param, target, timeConstant) => {
            if (Math.abs((this._cache.get(key) || -999) - target) > 0.001) {
                param.setTargetAtTime(target, time + 0.02, timeConstant);
                this._cache.set(key, target);
            }
        };
        setParam('main', this.mainGain.gain, 0.003 + (proximity * 0.01), 0.5);
        const whineTarget = isOccluded ? mix.whineOcc : mix.whine + (mix.dynamicWhine ? proximity * 0.003 : 0.0);
        setParam('whine', this.whineGain.gain, whineTarget, 0.5);
        if (this.atriumGain) setParam('atrium', this.atriumGain.gain, mix.noise, 1.0);
        if (this.peaceGain) setParam('peace', this.peaceGain.gain, mix.peace, 2.0);
        if (this.entityGain) setParam('entity', this.entityGain.gain, anomalyPressure > 0.0 ? anomalyPressure * 0.4 : 0.0, 0.2);
        if (this.subRumble) {
            const heartbeatFreq = playerExhaustion > 0.3 ? 80.0 + (Math.sin(this.ctx.currentTime * (10.0 + playerExhaustion * 5.0)) * 20.0 * playerExhaustion) : 0.0;
            setParam('rumble', this.subRumble.frequency, mix.rumble + (anomalyPressure * 40.0) + heartbeatFreq, 1.0);
        }
        if (this.kineticFilter) {
            const baseFreq = isOccluded ? mix.freqOcc : mix.freq;
            if (this.exertionLFO) setParam('exertionRate', this.exertionLFO.frequency, 1.27 + (playerExhaustion * 4.0), 1.0);
            setParam('exertion', this.exertionGain.gain, (playerSpeed * 5.0) + (playerExhaustion * 150.0), 0.2);

            const targetFreq = Math.min(Math.max(40, baseFreq + (playerSpeed * (isOccluded ? 2.0 : 8.0)) - (anomalyPressure * 150.0) - (playerExhaustion * 100.0)), 2000);
            const timeConstant = (isOccluded || activeSector === "ATRIUM" || anomalyPressure > 0.0 || playerExhaustion > 0.0) ? 0.2 : 3.0;
            setParam('kinetic', this.kineticFilter.frequency, targetFreq, timeConstant);
            this.currentSector = activeSector;
        }
    }

    triggerSomaticEvent(type, distanceSq, intensity) {
        if (!this.initialized || this.ctx.state === 'suspended') return;
        if (distanceSq > 1600.0) return;
        const distScalar = Math.max(0, 1.0 - (Math.sqrt(distanceSq) / 40.0));
        if (distScalar <= 0.01) return;
        const t = this.ctx.currentTime;
        if (type === 'step') {
            const profile = this.foleyProfiles[this.currentSector] || this.foleyProfiles["DEFAULT"];
            this.stepFilter.type = profile.filterType;
            this.stepFilter.frequency.setValueAtTime(profile.filterFreq, t);
            const osc = this.ctx.createOscillator();
            osc.type = (profile.oscFreq > 200) ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(profile.oscFreq, t);
            osc.frequency.exponentialRampToValueAtTime(20, t + profile.attack);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseSrc.buffer;
            osc.connect(this.stepGain);
            noise.connect(this.stepFilter);
            this.stepGain.gain.cancelScheduledValues(t);
            this.stepGain.gain.setValueAtTime(0, t);
            this.stepGain.gain.linearRampToValueAtTime(profile.gain * intensity * distScalar, t + profile.attack);
            this.stepGain.gain.exponentialRampToValueAtTime(0.001, t + profile.decay);
            osc.start(t);
            osc.stop(t + profile.decay);
            noise.start(t);
            noise.stop(t + profile.decay);
            osc.onended = () => {
                osc.disconnect();
                noise.disconnect();
            };
        } else if (type === 'door') {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseSrc.buffer;
            this.doorFilter.frequency.setValueAtTime(1000, t);
            this.doorFilter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
            osc.connect(this.doorGain);
            noise.connect(this.doorFilter);
            this.doorGain.gain.setValueAtTime(0, t);
            this.doorGain.gain.linearRampToValueAtTime(0.08 * intensity * distScalar, t + 0.03);
            this.doorGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);
            noise.start(t);
            noise.stop(t + 0.5);
            osc.onended = () => {
                osc.disconnect();
                noise.disconnect();
            };
        } else if (type === 'vent') {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseSrc.buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1500, t);
            filter.frequency.exponentialRampToValueAtTime(300, t + 0.4);

            const localGain = this.ctx.createGain();
            osc.connect(localGain);
            noise.connect(filter);
            filter.connect(localGain);
            localGain.connect(this.masterGain);

            localGain.gain.setValueAtTime(0, t);
            localGain.gain.linearRampToValueAtTime(0.1 * intensity * distScalar, t + 0.03);
            localGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.start(t); osc.stop(t + 0.5);
            noise.start(t); noise.stop(t + 0.5);
            osc.onended = () => { osc.disconnect(); noise.disconnect(); filter.disconnect(); localGain.disconnect(); };
        } else if (type === 'breaker') {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(900, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);

            const localGain = this.ctx.createGain();
            osc.connect(localGain);
            localGain.connect(this.masterGain);

            localGain.gain.setValueAtTime(0, t);
            localGain.gain.linearRampToValueAtTime(0.12 * intensity * distScalar, t + 0.01);
            localGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.start(t); osc.stop(t + 0.15);
            osc.onended = () => { osc.disconnect(); localGain.disconnect(); };
        } else if (type === 'item') {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);

            const localGain = this.ctx.createGain();
            osc.connect(localGain);
            localGain.connect(this.masterGain);

            localGain.gain.setValueAtTime(0, t);
            localGain.gain.linearRampToValueAtTime(0.08 * intensity * distScalar, t + 0.02);
            localGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.start(t); osc.stop(t + 0.4);
            osc.onended = () => { osc.disconnect(); localGain.disconnect(); };
        }
    }

    setVolume(val) {
        this.masterVolume = val;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val * 2.5, this.ctx.currentTime, 0.1);
        }
    }
}