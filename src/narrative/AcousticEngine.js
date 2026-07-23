// AcousticEngine.js
// LEVEL 0 DEDICATED ACOUSTIC TOPOLOGY

import SECTORS, {DEFAULT_FOLEY} from '../world/Sectors.js';

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
        this.brownNoiseSrc = this.ctx.createBufferSource();
        this.brownNoiseSrc.buffer = noiseBuffer;
        this.brownNoiseSrc.loop = true;
        this.brownFilter = this.ctx.createBiquadFilter();
        this.brownFilter.type = 'lowpass';
        this.brownFilter.frequency.value = 140;
        this.brownGain = this.ctx.createGain();
        this.brownGain.gain.value = 0.0;
        this.brownNoiseSrc.connect(this.brownFilter);
        this.brownFilter.connect(this.brownGain);
        this.brownGain.connect(this.masterGain);
        this.brownNoiseSrc.start();
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
        this.hazardBell = this.ctx.createOscillator();
        this.hazardBell.type = 'triangle';
        this.hazardBell.frequency.value = 180;
        this.hazardBellGain = this.ctx.createGain();
        this.hazardBellGain.gain.value = 0.0;
        this.hazardBell.connect(this.hazardBellGain);
        this.hazardBellGain.connect(this.masterGain);
        this.hazardBell.start();
        this.idlingGain = this.ctx.createGain();
        this.idlingGain.gain.value = 0.0;
        this.idlingOsc = this.ctx.createOscillator();
        this.idlingOsc.type = 'sawtooth';
        this.idlingOsc.frequency.value = 55;
        this.idlingLFO = this.ctx.createOscillator();
        this.idlingLFO.type = 'sine';
        this.idlingLFO.frequency.value = 14;
        this.idlingLFOGain = this.ctx.createGain();
        this.idlingLFOGain.gain.value = 8;
        this.idlingLFO.connect(this.idlingLFOGain);
        this.idlingLFOGain.connect(this.idlingOsc.frequency);
        this.idlingFilter = this.ctx.createBiquadFilter();
        this.idlingFilter.type = 'lowpass';
        this.idlingFilter.frequency.value = 400;
        this.idlingOsc.connect(this.idlingFilter);
        this.idlingFilter.connect(this.idlingGain);
        this.idlingGain.connect(this.masterGain);
        this.idlingOsc.start();
        this.idlingLFO.start();
        
        this.muzakGain = this.ctx.createGain();
        this.muzakGain.gain.value = 0.0;
        this.muzakFilter = this.ctx.createBiquadFilter();
        this.muzakFilter.type = 'lowpass';
        this.muzakFilter.frequency.value = 500;
        this.muzakFilter.connect(this.muzakGain);
        this.muzakGain.connect(this.masterGain);
        
        this.muzakLFO = this.ctx.createOscillator();
        this.muzakLFO.type = 'sine';
        this.muzakLFO.frequency.value = 0.15;
        this.muzakLFOGain = this.ctx.createGain();
        this.muzakLFOGain.gain.value = 15;
        this.muzakLFO.connect(this.muzakLFOGain);
        this.muzakLFO.start();

        const t = this.ctx.currentTime;
        this.mainGain.gain.setValueAtTime(0, t);
        this.whineGain.gain.setValueAtTime(0, t);
        this.atriumGain.gain.setValueAtTime(0, t);
        this.peaceGain.gain.setValueAtTime(0, t);
        this.entityGain.gain.setValueAtTime(0, t);
        this.hazardBellGain.gain.setValueAtTime(0, t);
        this.idlingGain.gain.setValueAtTime(0, t);
        this.muzakGain.gain.setValueAtTime(0, t);
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
            eyesClosed = 0.0,
            idlingCarDistSq = 9999.0
        } = telemetry;
        const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
        const mix = (SECTORS[activeSector] && SECTORS[activeSector].ambience) || SECTORS.NORMAL.ambience;
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
        if (this.atriumGain) {
            let noiseTarget = (isBlackout ? mix.noise * 0.1 : mix.noise) + structuralTension;
            if (activeSector === "ATRIUM" && !isBlackout) {
                noiseTarget = mix.noise * (0.35 + 1.3 * Math.abs(Math.sin(time * 0.11) * Math.sin(time * 0.053))) + structuralTension;
            }
            setParam('atrium', this.atriumGain.gain, noiseTarget, 1.0);
        }
        const targetNoiseFreq = activeSector === "MAINTENANCE" ? 110.0 : (activeSector === "INCINERATOR" ? 400.0 : (activeSector === "SERVER" ? 2400.0 : (activeSector === "ATRIUM" ? 150.0 : 300.0)));
        setParam('noiseFreq', this.noiseFilter.frequency, targetNoiseFreq, 0.4);
        if (this.brownGain) {
            setParam('srvBrown', this.brownGain.gain, (activeSector === "SERVER" && !isBlackout) ? 0.05 : 0.0, 1.2);
        }
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
            const room = SECTORS[activeSector];
            const targetDelay = (room && room.delay) || 0.15;
            const targetFeedback = (room && room.feedback) || 0.2;
            setParam('delayTime', this.spatialDelay.delayTime, targetDelay, 1.0);
            setParam('feedback', this.feedbackGain.gain, targetFeedback, 1.0);
        }
        if (this.idlingGain) {
            const idleVol = Math.max(0.0, 1.0 - Math.sqrt(idlingCarDistSq) / 20.0);
            setParam('idling', this.idlingGain.gain, idleVol * 0.06, 0.5);
        }
        if (this.muzakGain) {
            if (activeSector === "ANNEX" && !isBlackout) {
                setParam('muzak', this.muzakGain.gain, 1.2, 2.0);
                if (!this._muzakNextBeat || time > this._muzakNextBeat - 0.5) {
                    if (!this._muzakNextBeat) this._muzakNextBeat = time + 0.1;
                    if (this._muzakStep === undefined) this._muzakStep = 0;
                    
                    const chords = [
                        [174.61, 220.00, 261.63, 329.63],
                        [185.00, 220.00, 261.63, 311.13],
                        [196.00, 233.08, 293.66, 349.23],
                        [196.00, 246.94, 293.66, 349.23],
                    ];
                    const melody = [
                        349.23, 392.00, 440.00, 523.25, 
                        349.23, null,   440.00, 392.00,
                        349.23, 392.00, 440.00, 523.25,
                        587.33, 523.25, 440.00, 392.00
                    ];
                    
                    const beatTime = this._muzakNextBeat;
                    const chordIdx = Math.floor(this._muzakStep / 4) % chords.length;
                    
                    if (this._muzakStep % 4 === 0) {
                        chords[chordIdx].forEach(f => this.playMuzakNote(f, beatTime, true));
                    }
                    
                    const mFreq = melody[this._muzakStep % melody.length];
                    if (mFreq) {
                        this.playMuzakNote(mFreq, beatTime, false);
                    }
                    
                    this._muzakNextBeat += 0.5;
                    this._muzakStep++;
                }
            } else {
                setParam('muzak', this.muzakGain.gain, 0.0, 2.0);
            }
        }
        if (activeSector === "ARCHIVE" && !isBlackout) {
            if (!this._archiveNextEvent) this._archiveNextEvent = time + 2.0;
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
        if (activeSector === "ATRIUM" && !isBlackout) {
            if (!this._atriumNextEvent) this._atriumNextEvent = time + 3.0;
            if (this._atriumHootAt && time >= this._atriumHootAt) {
                this.triggerSomaticEvent('hoot', this._atriumHootDistSq, 0.55 + Math.random() * 0.25);
                this._atriumHootAt = 0;
            }
            if (time >= this._atriumNextEvent) {
                this._atriumNextEvent = time + 5.0 + Math.random() * 10.0;
                const aRoll = Math.random();
                const aDistSq = 36.0 + Math.random() * 364.0;
                if (aRoll < 0.65) {
                    this.triggerSomaticEvent('leaves', aDistSq, 0.5 + Math.random() * 0.5);
                } else {
                    this.triggerSomaticEvent('hoot', aDistSq, 0.7 + Math.random() * 0.3);
                    this._atriumHootAt = time + 0.4 + Math.random() * 0.15;
                    this._atriumHootDistSq = aDistSq;
                }
            }
        } else {
            this._atriumNextEvent = 0;
            this._atriumHootAt = 0;
        }
        if (activeSector === "IMPOUND" && !isBlackout) {
            if (!this._impoundNextEvent) this._impoundNextEvent = time + 3.0;
            if (time >= this._impoundNextEvent) {
                this._impoundNextEvent = time + 6.0 + Math.random() * 10.0;
                const iRoll = Math.random();
                const iDistSq = 36.0 + Math.random() * 364.0;
                if (iRoll < 0.20) this.triggerSomaticEvent('car_horn', iDistSq, 0.6 + Math.random() * 0.4);
                else if (iRoll < 0.65) this.triggerSomaticEvent('rattle', iDistSq, 0.5 + Math.random() * 0.5);
                else this.triggerSomaticEvent('door', iDistSq, 0.25 + Math.random() * 0.15);
            }
        } else {
            this._impoundNextEvent = 0;
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
    
    playMuzakNote(freq, time, isChord = false) {
        if (!this.muzakGain || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        osc.type = isChord ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        if (this.muzakLFOGain) this.muzakLFOGain.connect(osc.frequency);
        const env = this.ctx.createGain();
        osc.connect(env);
        env.connect(this.muzakFilter);
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(isChord ? 0.05 : 0.1, time + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
        osc.start(time);
        osc.stop(time + 1.5);
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
        const p = (SECTORS[this.currentSector] && SECTORS[this.currentSector].foley) || DEFAULT_FOLEY;
        const voices = {
            'step': [p.oscFreq > 200 ? 'triangle' : 'sine', p.oscFreq, 20, p.attack, p.gain, p.attack, p.decay, {
                type: p.filterType,
                start: p.filterFreq,
                end: null,
                ramp: 0
            }],
            'shuffle': ['sine', 10, 10, 0.1, 0.15, 0.15, 0.45, {type: 'bandpass', start: 1500, end: 400, ramp: 0.4}],
            'door': ['square', 120, 30, 0.3, 0.08, 0.03, 0.5, {type: 'lowpass', start: 1000, end: 100, ramp: 0.4}],
            'blastdoor': ['sawtooth', 65, 28, 0.7, 0.18, 0.06, 1.0, {type: 'bandpass', start: 2600, end: 200, ramp: 0.9}],
            'vent': ['sawtooth', 400, 80, 0.4, 0.1, 0.03, 0.5, {type: 'bandpass', start: 1500, end: 300, ramp: 0.4}],
            'breaker': ['square', 900, 100, 0.15, 0.12, 0.01, 0.15, null],
            'item': ['sine', 1200, 600, 0.3, 0.08, 0.02, 0.4, null],
            'whisper': ['sine', 25, 20, 1.2, 0.06, 0.4, 1.4, {type: 'bandpass', start: 2800, end: 1600, ramp: 1.2}],
            'cough': ['sine', 70, 45, 0.05, 0.22, 0.005, 0.16, {type: 'bandpass', start: 900, end: 350, ramp: 0.1}],
            'page': ['sine', 30, 20, 0.1, 0.02, 0.05, 0.35, {type: 'highpass', start: 2500, end: 1500, ramp: 0.3}],
            'leaves': ['sine', 22, 18, 0.9, 0.05, 0.3, 1.1, {type: 'bandpass', start: 1600, end: 900, ramp: 0.9}],
            'rattle': ['sine', 40, 30, 0.3, 0.05, 0.02, 0.55, {type: 'bandpass', start: 2400, end: 1200, ramp: 0.45}],
            'hoot': ['sine', 340, 250, 0.3, 0.05, 0.08, 0.55, null],
            'drip': ['sine', 1100, 350, 0.06, 0.07, 0.005, 0.35, null],
            'laugh': ['square', 110, 35, 1.8, 0.25, 0.1, 2.5, {type: 'lowpass', start: 800, end: 150, ramp: 1.5}],
            'tape_garble': ['sawtooth', 300, 600, 0.05, 0.06, 0.02, 0.1, {type: 'bandpass', start: 1200, end: 600, ramp: 0.1}],
            'tape_click': ['square', 800, 100, 0.02, 0.15, 0.01, 0.05, null],
            'terminal_blip': ['square', 800, 1200, 0.03, 0.04, 0.01, 0.06, {type: 'highpass', start: 2000, end: 2000, ramp: 0.1}],
            'terminal_click': ['square', 1200, 200, 0.02, 0.1, 0.01, 0.05, null],
            'airlock_cycle': ['sawtooth', 85, 35, 1.2, 0.25, 0.1, 1.2, {type: 'bandpass', start: 1800, end: 300, ramp: 1.0}],
            'airlock_hiss': ['sine', 1, 1, 1.0, 0.4, 0.1, 2.5, {type: 'bandpass', start: 4000, end: 1000, ramp: 2.5}],
            'car_horn': ['square', 320, 310, 0.1, 0.35, 0.05, 0.65, null]
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