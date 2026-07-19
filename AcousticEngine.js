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
                noise: 0.06,
                peace: 0.0,
                rumble: 45,
                freq: 60,
                freqOcc: 60,
                whine: 0.0005,
                whineOcc: 0.0001,
                dynamicWhine: false
            },
            "MAINTENANCE": {
                noise: 0.55,
                peace: 0.0,
                rumble: 110,
                freq: 90,
                freqOcc: 60,
                whine: 0.008,
                whineOcc: 0.003,
                dynamicWhine: true
            },
            "INCINERATOR": {
                noise: 0.65,
                peace: 0.0,
                rumble: 180,
                freq: 60,
                freqOcc: 60,
                whine: 0.0,
                whineOcc: 0.0,
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
            },
            "ATRIUM": {
                noise: 0.16,
                peace: 0.04,
                rumble: 40,
                freq: 130,
                freqOcc: 80,
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
            "ARCHIVE": {oscFreq: 90, filterType: 'lowpass', filterFreq: 900, gain: 0.12, attack: 0.03, decay: 0.10},
            "ATRIUM": {oscFreq: 70, filterType: 'lowpass', filterFreq: 700, gain: 0.09, attack: 0.04, decay: 0.22},
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

        this.paranoiaOsc = this.ctx.createOscillator();
        this.paranoiaOsc.type = 'triangle';
        this.paranoiaOsc.frequency.value = 650;

        this.paranoiaLFO = this.ctx.createOscillator();
        this.paranoiaLFO.type = 'sine';
        this.paranoiaLFO.frequency.value = 2.0;

        this.paranoiaLFOGain = this.ctx.createGain();
        this.paranoiaLFOGain.gain.value = 10;
        this.paranoiaLFO.connect(this.paranoiaLFOGain);
        this.paranoiaLFOGain.connect(this.paranoiaOsc.frequency);

        this.paranoiaFilter = this.ctx.createBiquadFilter();
        this.paranoiaFilter.type = 'lowpass';
        this.paranoiaFilter.frequency.value = 1200;

        this.paranoiaGain = this.ctx.createGain();
        this.paranoiaGain.gain.value = 0.0;
        this.paranoiaOsc.connect(this.paranoiaFilter);
        this.paranoiaFilter.connect(this.paranoiaGain);
        this.paranoiaGain.connect(this.masterGain);

        this.paranoiaOsc.start();
        this.paranoiaLFO.start();

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
        this.spatialDelay = this.ctx.createDelay(2.0);
        this.spatialDelay.delayTime.value = 0.1;
        this.feedbackGain = this.ctx.createGain();
        this.feedbackGain.gain.value = 0.2;
        this.mainGain.connect(this.spatialDelay);
        this.spatialDelay.connect(this.feedbackGain);
        this.feedbackGain.connect(this.spatialDelay);
        this.spatialDelay.connect(this.masterGain);
        this.mainGain.connect(this.masterGain);
        this.tinnitusOsc = this.ctx.createOscillator();
        this.tinnitusOsc.type = 'sine';
        this.tinnitusOsc.frequency.value = 4500.0;
        this.tinnitusGain = this.ctx.createGain();
        this.tinnitusGain.gain.value = 0.0;
        this.tinnitusOsc.connect(this.tinnitusGain);
        this.tinnitusGain.connect(this.masterGain);
        this.tinnitusOsc.start();

        // Specialized industrial warning relay for high-danger sectors
        this.hazardBell = this.ctx.createOscillator();
        this.hazardBell.type = 'triangle';
        this.hazardBell.frequency.value = 180;
        this.hazardBellGain = this.ctx.createGain();
        this.hazardBellGain.gain.value = 0.0;
        this.hazardBell.connect(this.hazardBellGain);
        this.hazardBellGain.connect(this.masterGain);
        this.hazardBell.start();

        const t = this.ctx.currentTime;
        this.mainGain.gain.setValueAtTime(0, t);
        this.whineGain.gain.setValueAtTime(0, t);
        this.atriumGain.gain.setValueAtTime(0, t);
        this.peaceGain.gain.setValueAtTime(0, t);
        this.entityGain.gain.setValueAtTime(0, t);
        this.hazardBellGain.gain.setValueAtTime(0, t);
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
        const {
            minLightDist,
            isOccluded,
            activeSector,
            anomalyPressure,
            playerSpeed,
            playerExhaustion,
            isBlackout,
            paranoia,
            adrenaline = 0.0,
            eyesClosed = 0.0
        } = telemetry;
        const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
        const mix = this.sectors[activeSector] || this.sectors["NORMAL"];
        const structuralTension = Math.max(0.0, ((paranoia || 0.0) - 0.5) * 1.0);
        const setParam = (key, param, target, timeConstant) => {
            if (Math.abs((this._cache.get(key) || -999) - target) > 0.001) {
                param.setTargetAtTime(target, time + 0.02, timeConstant);
                this._cache.set(key, target);
            }
        };
        const voidBreath = isBlackout ? 0.0008 + (Math.sin(time * 0.25) * 0.0004) : 0.0;
        const mainTarget = isBlackout ? voidBreath : 0.003 + (proximity * 0.01);
        setParam('main', this.mainGain.gain, mainTarget, 0.5);
        const baseWhine = isBlackout ? 0.0 : (isOccluded ? mix.whineOcc : mix.whine + (mix.dynamicWhine ? proximity * 0.003 : 0.0));
        setParam('whine', this.whineGain.gain, baseWhine, 0.5);
        if (this.atriumGain) setParam('atrium', this.atriumGain.gain, (isBlackout ? mix.noise * 0.1 : mix.noise) + structuralTension, 1.0);

        const targetNoiseFreq = activeSector === "MAINTENANCE" ? 110.0 : (activeSector === "INCINERATOR" ? 400.0 : 300.0);
        setParam('noiseFreq', this.noiseFilter.frequency, targetNoiseFreq, 0.4);

        const bellPulse = activeSector === "MAINTENANCE" && !isBlackout ? (Math.max(0, Math.sin(time * 2.5)) ** 6.0) * 0.07 : 0.0;
        if (this.hazardBellGain) setParam('hazardBell', this.hazardBellGain.gain, bellPulse, 0.05);

        if (this.peaceGain) setParam('peace', this.peaceGain.gain, Math.max(0, mix.peace - structuralTension), 2.0);

        if (this.entityGain) setParam('entity', this.entityGain.gain, anomalyPressure > 0.0 ? anomalyPressure * 0.4 : 0.0, 0.2);
        if (this.paranoiaGain) {
            setParam('paranoiaVol', this.paranoiaGain.gain, structuralTension > 0.0 ? structuralTension * 0.2 : 0.0, 1.0);
            setParam('paranoiaLFO', this.paranoiaLFO.frequency, Math.max(0.5, 4.0 - (structuralTension * 4.0)), 1.0);
            setParam('paranoiaPitch', this.paranoiaOsc.frequency, Math.max(300, 650 - (structuralTension * 300.0)), 1.0);
        }

        if (this.spatialDelay) {
            const delayTimes = {
                "POOLROOMS": 0.6,
                "CHASM": 0.8,
                "ATRIUM": 0.4,
                "MAINTENANCE": 0.05,
                "INCINERATOR": 0.02,
                "ARCHIVE": 0.35,
                "NORMAL": 0.15
            };
            const feedbackVals = {
                "POOLROOMS": 0.5,
                "CHASM": 0.7,
                "ATRIUM": 0.3,
                "MAINTENANCE": 0.1,
                "INCINERATOR": 0.05,
                "ARCHIVE": 0.45,
                "NORMAL": 0.2
            };
            const targetDelay = delayTimes[activeSector] || 0.15;
            const targetFeedback = feedbackVals[activeSector] || 0.2;
            setParam('delayTime', this.spatialDelay.delayTime, targetDelay, 1.0);
            setParam('feedback', this.feedbackGain.gain, targetFeedback, 1.0);
        }

        // ARCHIVE room tone: a quiet library that isn't actually quiet. Unseen
        // patrons whisper, cough, and turn pages somewhere in the stacks, washed
        // through the sector's long soft reverb.
        if (activeSector === "ARCHIVE" && !isBlackout) {
            if (!this._archiveNextEvent) this._archiveNextEvent = time + 2.0;
            // Second burst of a double cough ("k-khh")
            if (this._archiveCoughAt && time >= this._archiveCoughAt) {
                this.triggerSomaticEvent('cough', this._archiveCoughDistSq, 0.7 + Math.random() * 0.4);
                this._archiveCoughAt = 0;
            }
            if (time >= this._archiveNextEvent) {
                this._archiveNextEvent = time + 4.0 + Math.random() * 9.0;
                const roll = Math.random();
                const fakeDistSq = 36.0 + Math.random() * 364.0;
                if (roll < 0.45) this.triggerSomaticEvent('whisper', fakeDistSq, 0.5 + Math.random() * 0.4);
                else if (roll < 0.75) {
                    this.triggerSomaticEvent('cough', fakeDistSq, 0.9 + Math.random() * 0.4);
                    this._archiveCoughAt = time + 0.1 + Math.random() * 0.06;
                    this._archiveCoughDistSq = fakeDistSq;
                } else {
                    this.triggerSomaticEvent('page', fakeDistSq, 0.5 + Math.random() * 0.4);
                }
            }
        } else {
            this._archiveNextEvent = 0;
            this._archiveCoughAt = 0;
        }

        // ATRIUM room tone: something rustles in the overgrowth; water finds
        // its way down from wherever the vines come from.
        if (activeSector === "ATRIUM" && !isBlackout) {
            if (!this._atriumNextEvent) this._atriumNextEvent = time + 3.0;
            if (time >= this._atriumNextEvent) {
                this._atriumNextEvent = time + 5.0 + Math.random() * 10.0;
                const aRoll = Math.random();
                const aDistSq = 36.0 + Math.random() * 364.0;
                if (aRoll < 0.55) this.triggerSomaticEvent('leaves', aDistSq, 0.5 + Math.random() * 0.5);
                else this.triggerSomaticEvent('drip', aDistSq, 0.6 + Math.random() * 0.5);
            }
        } else {
            this._atriumNextEvent = 0;
        }
        if (this.tinnitusGain) {
            const isPanicking = paranoia > 0.7 && playerExhaustion > 0.6;
            const tinnitusVolume = (isPanicking ? (paranoia - 0.7) * 0.15 : 0.0) + (adrenaline * 0.4);
            setParam('tinnitus', this.tinnitusGain.gain, tinnitusVolume, 2.0);
        }
        if (this.subRumble) {
            const heartbeatFreq = playerExhaustion > 0.3 ? 80.0 + (Math.sin(time * (10.0 + playerExhaustion * 5.0 + adrenaline * 10.0)) * 20.0 * playerExhaustion) : 0.0;
            const blackoutLFO = isBlackout ? 25.0 + (Math.sin(time * 0.15) * 10.0) : 0.0;
            const baseRumble = isBlackout ? blackoutLFO : mix.rumble;
            const eyeCloseRumble = eyesClosed > 0.5 ? 40.0 : 0.0;
            setParam('rumble', this.subRumble.frequency, baseRumble + (anomalyPressure * 40.0) + heartbeatFreq + eyeCloseRumble + (adrenaline * 30.0), 1.0);
        }
        if (this.kineticFilter) {
            const baseFreq = isOccluded ? mix.freqOcc : mix.freq;
            if (this.exertionLFO) setParam('exertionRate', this.exertionLFO.frequency, 1.27 + (playerExhaustion * 4.0) + (adrenaline * 5.0), 1.0);
            setParam('exertion', this.exertionGain.gain, (playerSpeed * 5.0) + (playerExhaustion * 150.0) + (adrenaline * 200.0), 0.2);
            let targetFreq = Math.min(Math.max(40, baseFreq + (playerSpeed * (isOccluded ? 2.0 : 8.0)) - (anomalyPressure * 150.0) - (playerExhaustion * 100.0)), 2000);
            if (eyesClosed > 0.5) {
                targetFreq = 80.0;
            } else if (adrenaline > 0.0) {
                targetFreq = Math.min(2500, targetFreq + (adrenaline * 1000.0));
            }
            const timeConstant = (eyesClosed > 0.5 || adrenaline > 0.0 || isOccluded || activeSector === "ATRIUM" || anomalyPressure > 0.0 || playerExhaustion > 0.0) ? 0.2 : 3.0;
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
        const spawnVoice = (oscType, startFreq, targetFreq, rampTime, maxGain, attack, decay, noiseConfig) => {
            const osc = this.ctx.createOscillator();
            osc.type = oscType;
            osc.frequency.setValueAtTime(startFreq, t);
            if (targetFreq) osc.frequency.exponentialRampToValueAtTime(targetFreq, t + rampTime);
            const localGain = this.ctx.createGain();
            localGain.gain.setValueAtTime(0, t);
            localGain.gain.linearRampToValueAtTime(maxGain * intensity * distScalar, t + attack);
            localGain.gain.exponentialRampToValueAtTime(0.001, t + decay);
            osc.connect(localGain);
            let noise, filter;
            if (noiseConfig) {
                noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseSrc.buffer;
                filter = this.ctx.createBiquadFilter();
                filter.type = noiseConfig.type;
                filter.frequency.setValueAtTime(noiseConfig.start, t);
                if (noiseConfig.end) filter.frequency.exponentialRampToValueAtTime(noiseConfig.end, t + noiseConfig.ramp);
                noise.connect(filter);
                filter.connect(localGain);
                noise.start(t);
                noise.stop(t + decay);
            }
            localGain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + decay);
            osc.onended = () => {
                osc.disconnect();
                localGain.disconnect();
                if (noise) {
                    noise.disconnect();
                    filter.disconnect();
                }
            };
        };
        const p = this.foleyProfiles[this.currentSector] || this.foleyProfiles["DEFAULT"];
        const voices = {
            'step': [p.oscFreq > 200 ? 'triangle' : 'sine', p.oscFreq, 20, p.attack, p.gain, p.attack, p.decay, {
                type: p.filterType,
                start: p.filterFreq,
                end: null,
                ramp: 0
            }],
            'shuffle': ['sine', 10, 10, 0.1, 0.15, 0.15, 0.45, {type: 'bandpass', start: 1500, end: 400, ramp: 0.4}],
            'door': ['square', 120, 30, 0.3, 0.08, 0.03, 0.5, {type: 'lowpass', start: 1000, end: 100, ramp: 0.4}],
            'vent': ['sawtooth', 400, 80, 0.4, 0.1, 0.03, 0.5, {type: 'bandpass', start: 1500, end: 300, ramp: 0.4}],
            'breaker': ['square', 900, 100, 0.15, 0.12, 0.01, 0.15, null],
            'item': ['sine', 1200, 600, 0.3, 0.08, 0.02, 0.4, null],
            'whisper': ['sine', 25, 20, 1.2, 0.06, 0.4, 1.4, {type: 'bandpass', start: 2800, end: 1600, ramp: 1.2}],
            'cough': ['sine', 70, 45, 0.05, 0.22, 0.005, 0.16, {type: 'bandpass', start: 900, end: 350, ramp: 0.1}],
            'page': ['sine', 30, 20, 0.1, 0.02, 0.05, 0.35, {type: 'highpass', start: 2500, end: 1500, ramp: 0.3}],
            'leaves': ['sine', 22, 18, 0.9, 0.05, 0.3, 1.1, {type: 'bandpass', start: 1600, end: 900, ramp: 0.9}],
            'drip': ['sine', 1100, 350, 0.06, 0.07, 0.005, 0.35, null],
            'laugh': ['square', 110, 35, 1.8, 0.25, 0.1, 2.5, {type: 'lowpass', start: 800, end: 150, ramp: 1.5}]
        };
        if (voices[type]) spawnVoice(...voices[type]);
    }

    setVolume(val) {
        this.masterVolume = val;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val * 2.5, this.ctx.currentTime, 0.1);
        }
    }
}