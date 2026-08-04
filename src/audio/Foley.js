/**
 * [ROLE] Generates somatic and environmental sound events.
 * [WHY] Procedurally synthesizes short sound effects (footsteps, doors) to avoid relying on external audio assets.
 * [STATE] Stateless utility class. Operates on the provided audio engine context.
 * [DEPENDS] AcousticEngine nodes, Web Audio API, Sectors data.
 */
import SECTORS, {DEFAULT_FOLEY} from '../world/Sectors.js';

const VOICES = {
    'shuffle': ['sine', 10, 10, 0.1, 0.15, 0.15, 0.45, {type: 'bandpass', start: 1500, end: 400, ramp: 0.4}],
    'door': ['square', 120, 30, 0.3, 0.08, 0.03, 0.5, {type: 'lowpass', start: 1000, end: 100, ramp: 0.4}],
    'blastdoor': ['sawtooth', 65, 28, 0.7, 0.18, 0.06, 1.0, {type: 'bandpass', start: 2600, end: 200, ramp: 0.9}],
    'vent': ['sawtooth', 400, 80, 0.4, 0.1, 0.03, 0.5, {type: 'bandpass', start: 1500, end: 300, ramp: 0.4}],
    'breaker': ['square', 900, 100, 0.15, 0.12, 0.01, 0.15, null],
    'item': ['sine', 1200, 600, 0.3, 0.08, 0.02, 0.4, null],
    'whisper': ['sine', 25, 20, 1.2, 0.06, 0.4, 1.4, {type: 'bandpass', start: 2800, end: 1600, ramp: 1.2}],
    'cough': ['sine', 70, 45, 0.05, 0.22, 0.005, 0.16, {type: 'bandpass', start: 900, end: 350, ramp: 0.1}],
    'page': ['sine', 30, 20, 0.1, 0.02, 0.05, 0.35, {type: 'highpass', start: 2500, end: 1500, ramp: 0.3}],
    'phone_ring': ['square', 800, 800, 0.1, 0.04, 0.02, 1.2, {type: 'lowpass', start: 1500, end: 1500, ramp: 0}],
    'leaves': ['sine', 22, 18, 0.9, 0.05, 0.3, 1.1, {type: 'bandpass', start: 1600, end: 900, ramp: 0.9}],
    'rattle': ['sine', 40, 30, 0.3, 0.05, 0.02, 0.55, {type: 'bandpass', start: 2400, end: 1200, ramp: 0.45}],
    'hoot': ['sine', 340, 250, 0.3, 0.05, 0.08, 0.55, null],
    'drip': ['sine', 1100, 350, 0.06, 0.07, 0.005, 0.35, null],
    'laugh': ['square', 110, 35, 1.8, 0.25, 0.1, 2.5, {type: 'lowpass', start: 800, end: 150, ramp: 1.5}],
    'tape_garble': ['sawtooth', 300, 600, 0.05, 0.06, 0.02, 0.1, {type: 'bandpass', start: 1200, end: 600, ramp: 0.1}],
    'tape_click': ['square', 800, 100, 0.02, 0.15, 0.01, 0.05, null],
    'terminal_blip': ['square', 800, 1200, 0.03, 0.04, 0.01, 0.06, {
        type: 'highpass',
        start: 2000,
        end: 2000,
        ramp: 0.1
    }],
    'terminal_click': ['square', 1200, 200, 0.02, 0.1, 0.01, 0.05, null],
    'airlock_cycle': ['sawtooth', 85, 35, 1.2, 0.25, 0.1, 1.2, {type: 'bandpass', start: 1800, end: 300, ramp: 1.0}],
    'airlock_hiss': ['sine', 1, 1, 1.0, 0.4, 0.1, 2.5, {type: 'bandpass', start: 4000, end: 1000, ramp: 2.5}],
    'car_horn': ['square', 320, 310, 0.1, 0.35, 0.05, 0.65, null],
    'valve_turn': ['square', 300, 600, 0.05, 0.06, 0.02, 0.1, {type: 'bandpass', start: 1200, end: 600, ramp: 0.1}]
};
export default class Foley {
    static trigger(engine, type, distanceSq, intensity) {
        if (!engine.initialized || engine.ctx.state === 'suspended') return;
        if (distanceSq > 1600.0) return;
        const distScalar = Math.max(0, 1.0 - (Math.sqrt(distanceSq) / 40.0));
        if (distScalar <= 0.01) return;
        const t = engine.ctx.currentTime;
        const spawnVoice = (oscType, startFreq, targetFreq, rampTime, maxGain, attack, decay, noiseConfig) => {
            const osc = engine.ctx.createOscillator();
            osc.type = oscType;
            osc.frequency.setValueAtTime(startFreq, t);
            if (targetFreq) osc.frequency.exponentialRampToValueAtTime(targetFreq, t + rampTime);
            const localGain = engine.ctx.createGain();
            localGain.gain.setValueAtTime(0, t);
            localGain.gain.linearRampToValueAtTime(maxGain * intensity * distScalar, t + attack);
            localGain.gain.exponentialRampToValueAtTime(0.001, t + decay);
            osc.connect(localGain);
            let noise, filter;
            if (noiseConfig) {
                noise = engine.ctx.createBufferSource();
                noise.buffer = engine.noiseSrc.buffer;
                filter = engine.ctx.createBiquadFilter();
                filter.type = noiseConfig.type;
                filter.frequency.setValueAtTime(noiseConfig.start, t);
                if (noiseConfig.end) filter.frequency.exponentialRampToValueAtTime(noiseConfig.end, t + noiseConfig.ramp);
                noise.connect(filter);
                filter.connect(localGain);
                noise.start(t);
                noise.stop(t + decay);
            }
            localGain.connect(engine.masterGain);
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
        if (type === 'step') {
            const p = (SECTORS[engine.currentSector] && SECTORS[engine.currentSector].foley) || DEFAULT_FOLEY;
            spawnVoice(p.oscFreq > 200 ? 'triangle' : 'sine', p.oscFreq, 20, p.attack, p.gain, p.attack, p.decay, {
                type: p.filterType,
                start: p.filterFreq,
                end: null,
                ramp: 0
            });
        } else if (VOICES[type]) {
            spawnVoice(...VOICES[type]);
        }
    }

    static playMuzakNote(engine, freq, time, isChord = false) {
        if (!engine.muzakGain || engine.ctx.state === 'suspended') return;
        const osc = engine.ctx.createOscillator();
        osc.type = isChord ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        if (engine.muzakLFOGain) engine.muzakLFOGain.connect(osc.frequency);
        const env = engine.ctx.createGain();
        osc.connect(env);
        env.connect(engine.muzakFilter);
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(isChord ? 0.05 : 0.1, time + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
        osc.start(time);
        osc.stop(time + 1.5);
    }
}