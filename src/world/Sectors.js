// Sectors.js
// LEVEL 0 SECTOR REGISTRY

/**
 * The default parameters for procedural footstep generation (synthesized via Web Audio API).
 * 
 * Instead of loading hundreds of .wav files for footsteps on different
 * surfaces, this engine synthesizes them procedurally. This saves memory and allows for 
 * infinite dynamic variation based on the player's momentum and the sector's acoustics.
 */
export const DEFAULT_FOLEY = {oscFreq: 60, filterType: 'lowpass', filterFreq: 600, gain: 0.10, attack: 0.04, decay: 0.18};

/**
 * Configuration dictionary mapping sector IDs to their specific atmospheric properties.
 * 
 * This object acts as the "DNA" for the engine's dynamic atmosphere.
 * As the player walks from a 'NORMAL' chunk into an 'INCINERATOR' chunk, the `RenderEngine` 
 * and `Foley` system smoothly interpolate these values.
 * 
 * @typedef {Object} FoleyConfig
 * @property {number} oscFreq - Base oscillator frequency for the footstep impact.
 * @property {string} filterType - Biquad filter type ('lowpass', 'highpass', 'bandpass').
 * @property {number} filterFreq - Frequency cutoff for the biquad filter.
 * @property {number} gain - Master volume of the footstep.
 * @property {number} attack - Fade-in time (in seconds) for the footstep envelope.
 * @property {number} decay - Fade-out time (in seconds) for the footstep envelope.
 * 
 * @typedef {Object} AmbienceConfig
 * @property {number} noise - White noise intensity.
 * @property {number} peace - Smooths out harsh frequencies.
 * @property {number} rumble - Low frequency oscillator gain (LFO).
 * @property {number} freq - Base cutoff frequency for the ambient rumble.
 * @property {number} freqOcc - Frequency occlusion (how muffled the ambient sound gets).
 * @property {number} whine - High-frequency sine wave intensity (e.g., electrical whine).
 * @property {number} whineOcc - High-frequency occlusion.
 * @property {boolean} dynamicWhine - If true, the whine modulates in pitch over time.
 * 
 * @typedef {Object} SectorConfig
 * @property {number} [fog] - Fog density for WebGL shader volumetric rendering.
 * @property {number} [fogColor] - Hex color code for the fog rendering.
 * @property {AmbienceConfig} [ambience] - Parameters for the procedural drone synthesizer.
 * @property {FoleyConfig} [foley] - Overrides the procedural footstep synthesis for this sector.
 * @property {number} [delay] - Master delay time for acoustic echo in this sector.
 * @property {number} [feedback] - Master delay feedback loop intensity (how long the echo lasts).
 * 
 * @type {Object.<string, SectorConfig>}
 */
const SECTORS = {
    NORMAL: {
        fog: 0.01, fogColor: 0x868686,
        ambience: {noise: 0.0, peace: 0.0, rumble: 60, freq: 250, freqOcc: 120, whine: 0.0005, whineOcc: 0.0001, dynamicWhine: true},
        delay: 0.15, feedback: 0.2
    },
    IMPOUND: {
        fog: 0.15, fogColor: 0x3a4a52,
        ambience: {noise: 0.19, peace: 0.0, rumble: 55, freq: 160, freqOcc: 90, whine: 0.0008, whineOcc: 0.0003, dynamicWhine: false},
        foley: {oscFreq: 120, filterType: 'lowpass', filterFreq: 900, gain: 0.12, attack: 0.02, decay: 0.12},
        delay: 0.45, feedback: 0.35
    },
    BOARDROOM: {
        fog: 0.02, fogColor: 0xa0bbd6,
        ambience: {noise: 0.05, peace: 0.0, rumble: 10, freq: 150, freqOcc: 120, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        foley: {oscFreq: 120, filterType: 'lowpass', filterFreq: 1400, gain: 0.18, attack: 0.02, decay: 0.12},
        delay: 0.25, feedback: 0.35
    },
    SERVER: {
        fog: 0.05, fogColor: 0x803838,
        ambience: {noise: 0.1, peace: 0.0, rumble: 35, freq: 250, freqOcc: 120, whine: 0.002, whineOcc: 0.0005, dynamicWhine: false},
        foley: {oscFreq: 620, filterType: 'bandpass', filterFreq: 1800, gain: 0.14, attack: 0.005, decay: 0.14},
        delay: 0.06, feedback: 0.08
    },
    CLINIC: {
        fog: 0.04, fogColor: 0x7799aa,
        ambience: {noise: 0.1, peace: 0.0, rumble: 60, freq: 180, freqOcc: 180, whine: 0.003, whineOcc: 0.003, dynamicWhine: false},
        foley: {oscFreq: 800, filterType: 'highpass', filterFreq: 3000, gain: 0.15, attack: 0.01, decay: 0.06}
    },
    ARCHIVE: {
        fog: 0.06, fogColor: 0x0f0f0f,
        ambience: {noise: 0.06, peace: 0.0, rumble: 45, freq: 60, freqOcc: 60, whine: 0.0005, whineOcc: 0.0001, dynamicWhine: true},
        foley: {oscFreq: 90, filterType: 'lowpass', filterFreq: 900, gain: 0.12, attack: 0.03, decay: 0.10},
        delay: 0.35, feedback: 0.45
    },
    MAINTENANCE: {
        fog: 0.08, fogColor: 0x572503,
        ambience: {noise: 0.55, peace: 0.0, rumble: 110, freq: 90, freqOcc: 60, whine: 0.008, whineOcc: 0.003, dynamicWhine: true},
        foley: {oscFreq: 400, filterType: 'bandpass', filterFreq: 2500, gain: 0.12, attack: 0.01, decay: 0.15},
        delay: 0.05, feedback: 0.1
    },
    INCINERATOR: {
        fog: 0.25, fogColor: 0xFF6B00,
        ambience: {noise: 0.65, peace: 0.01, rumble: 269, freq: 60, freqOcc: 60, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        delay: 0.02, feedback: 0.15
    },
    CHASM: {
        fog: 0.20, fogColor: 0x052047,
        ambience: {noise: 0.25, peace: 0.0, rumble: 30, freq: 40, freqOcc: 40, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        foley: {oscFreq: 240, filterType: 'bandpass', filterFreq: 1600, gain: 0.18, attack: 0.005, decay: 0.3},
        delay: 0.8, feedback: 0.7
    },
    ATRIUM: {
        fog: 0.18, fogColor: 0x000000,
        ambience: {noise: 0.09, peace: 0.0, rumble: 35, freq: 130, freqOcc: 80, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        foley: {oscFreq: 70, filterType: 'lowpass', filterFreq: 700, gain: 0.09, attack: 0.04, decay: 0.22},
        delay: 0.4, feedback: 0.3
    },
    ANNEX: {
        fog: 0.02, fogColor: 0x7d7568,
        ambience: {noise: 0.03, peace: 0.0, rumble: 50, freq: 200, freqOcc: 100, whine: 0.001, whineOcc: 0.0003, dynamicWhine: true},
        foley: {oscFreq: 420, filterType: 'highpass', filterFreq: 2200, gain: 0.1, attack: 0.01, decay: 0.07},
        delay: 0.1, feedback: 0.12
    },
    EXIT: {fog: 0.05},
    CHECKPOINT: {
        fog: 0.07, fogColor: 0x4E3E5E,
        ambience: {noise: 0.2, peace: 0.0, rumble: 80, freq: 1000, freqOcc: 500, whine: 0.05, whineOcc: 0.01, dynamicWhine: true},
        foley: {oscFreq: 800, filterType: 'bandpass', filterFreq: 2000, gain: 0.1, attack: 0.01, decay: 0.1}
    }
};

export default SECTORS;
