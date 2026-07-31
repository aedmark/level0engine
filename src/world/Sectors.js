/**
 * The default parameters for procedural footstep generation (synthesized via Web Audio API).
 *
 * Instead of loading hundreds of .wav files for footsteps on different
 * surfaces, this engine synthesizes them procedurally. This saves memory and allows for
 * infinite dynamic variation based on the player's momentum and the sector's acoustics.
 */
export const DEFAULT_FOLEY = {
    oscFreq: 60,
    filterType: 'lowpass',
    filterFreq: 600,
    gain: 0.10,
    attack: 0.04,
    decay: 0.18
};
/**
 * Baseline behaviour for the volumetric dust cloud that follows the camera.
 *
 * Sectors override this wholesale (same convention as `DEFAULT_FOLEY`): a sector either
 * supplies a complete `dust` block or inherits this one. Nothing is merged key-by-key,
 * so every override below is readable in isolation without chasing a prototype chain.
 */
export const DEFAULT_DUST = {
    drift: 'fall',
    fallSpeed: 0.0025,
    baseOpacity: 0.10,
    crawlOpacity: 0.35,
    baseSize: 0.05,
    crawlSize: 0.08,
    color: 0xffffff
};
/**
 * Baseline behaviour for the secondary exhaust/vapour cloud.
 *
 * Most sectors never show it (`opacity: 0.0`); the Incinerator and Server halls are the
 * only two that turn it on, so the defaults describe the dormant case.
 */
export const DEFAULT_EXHAUST = {
    opacity: 0.0,
    color: 0x00ffcc,
    spinY: -0.07,
    spinX: 0.04,
    baseSize: 0.08,
    pulseRate: 12.0,
    pulseDepth: 0.02
};
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
 * @typedef {Object} DustConfig
 * @property {'fall'|'drift'} drift - 'fall' sinks particles on Y; 'drift' pushes them along X/Z.
 * @property {number} fallSpeed - Y velocity per frame when drift is 'fall'. Negative rises.
 * @property {number} baseOpacity - Material opacity while standing.
 * @property {number} crawlOpacity - Material opacity while crawling (the choking effect).
 * @property {number} baseSize - Point size while standing.
 * @property {number} crawlSize - Point size while crawling.
 * @property {number} color - Hex tint lerped into the point material.
 *
 * @typedef {Object} ExhaustConfig
 * @property {number} opacity - Target opacity. 0.0 keeps the cloud dormant.
 * @property {number} color - Hex tint lerped into the point material.
 * @property {number} spinY - Yaw rotation rate, multiplied by elapsed time.
 * @property {number} spinX - Pitch rotation rate, multiplied by elapsed time.
 * @property {number} baseSize - Point size before the pulse is added.
 * @property {number} pulseRate - Angular frequency of the size pulse.
 * @property {number} pulseDepth - Amplitude of the size pulse.
 *
 * @typedef {Object} SectorConfig
 * @property {number} [fog] - Fog density for WebGL shader volumetric rendering.
 * @property {number} [fogColor] - Hex color code for the fog rendering.
 * @property {DustConfig} [dust] - Overrides the dust cloud for this sector.
 * @property {ExhaustConfig} [exhaust] - Overrides the exhaust cloud for this sector.
 * @property {AmbienceConfig} [ambience] - Parameters for the procedural drone synthesizer.
 * @property {FoleyConfig} [foley] - Overrides the procedural footstep synthesis for this sector.
 * @property {number} [delay] - Master delay time for acoustic echo in this sector.
 * @property {number} [feedback] - Master delay feedback loop intensity (how long the echo lasts).
 *
 * @type {Object.<string, SectorConfig>}
 */
const SECTORS = {
    NORMAL: {
        fog: 0.03,
        ambience: {
            noise: 0.0,
            peace: 0.0,
            rumble: 60,
            freq: 250,
            freqOcc: 120,
            whine: 0.0005,
            whineOcc: 0.0001,
            dynamicWhine: true
        },
        delay: 0.15, feedback: 0.2
    },
    ARCHIVE: {
        fog: 0.06, fogColor: 0x101010,
        ambience: {
            noise: 0.06,
            peace: 0.0,
            rumble: 45,
            freq: 60,
            freqOcc: 60,
            whine: 0.0005,
            whineOcc: 0.0001,
            dynamicWhine: true
        },
        foley: {oscFreq: 90, filterType: 'lowpass', filterFreq: 900, gain: 0.12, attack: 0.03, decay: 0.10},
        dust: {
            drift: 'fall', fallSpeed: 0.0025,
            baseOpacity: 0.30, crawlOpacity: 0.45,
            baseSize: 0.07, crawlSize: 0.09,
            color: 0xffffff
        },
        delay: 0.35, feedback: 0.45
    },
    IMPOUND: {
        fog: 0.12, fogColor: 0x1A1313,
        ambience: {
            noise: 0.19,
            peace: 0.0,
            rumble: 55,
            freq: 160,
            freqOcc: 90,
            whine: 0.0008,
            whineOcc: 0.0003,
            dynamicWhine: false
        },
        foley: {oscFreq: 120, filterType: 'lowpass', filterFreq: 900, gain: 0.12, attack: 0.02, decay: 0.12},
        dust: {
            drift: 'fall', fallSpeed: 0.04,
            baseOpacity: 0.6, crawlOpacity: 0.7,
            baseSize: 0.18, crawlSize: 0.22,
            color: 0xffffff
        },
        delay: 0.45, feedback: 0.35
    },
    BOARDROOM: {
        fog: 0.02, fogColor: 0xa0bbd6,
        ambience: {
            noise: 0.05,
            peace: 0.0,
            rumble: 10,
            freq: 150,
            freqOcc: 120,
            whine: 0.0,
            whineOcc: 0.0,
            dynamicWhine: false
        },
        foley: {oscFreq: 120, filterType: 'lowpass', filterFreq: 1400, gain: 0.18, attack: 0.02, decay: 0.12},
        delay: 0.25, feedback: 0.35
    },
    SERVER: {
        fog: 0.01, fogColor: 0x380159,
        ambience: {
            noise: 0.1,
            peace: 0.0,
            rumble: 35,
            freq: 250,
            freqOcc: 120,
            whine: 0.002,
            whineOcc: 0.0005,
            dynamicWhine: false
        },
        foley: {oscFreq: 620, filterType: 'bandpass', filterFreq: 1800, gain: 0.14, attack: 0.005, decay: 0.14},
        dust: {
            drift: 'drift', fallSpeed: 0.0025,
            baseOpacity: 0.35, crawlOpacity: 0.45,
            baseSize: 0.12, crawlSize: 0.16,
            color: 0xffffff
        },
        exhaust: {
            opacity: 0.35, color: 0x00ffcc,
            spinY: -0.07, spinX: 0.04,
            baseSize: 0.08, pulseRate: 12.0, pulseDepth: 0.02
        },
        delay: 0.06, feedback: 0.08
    },
    CLINIC: {
        fog: 0.04, fogColor: 0x7799aa,
        ambience: {
            noise: 0.1,
            peace: 0.0,
            rumble: 60,
            freq: 180,
            freqOcc: 180,
            whine: 0.003,
            whineOcc: 0.003,
            dynamicWhine: false
        },
        foley: {oscFreq: 800, filterType: 'highpass', filterFreq: 3000, gain: 0.15, attack: 0.01, decay: 0.06}
    },

    MAINTENANCE: {
        fog: 0.08, fogColor: 0x572503,
        ambience: {
            noise: 0.55,
            peace: 0.0,
            rumble: 110,
            freq: 90,
            freqOcc: 60,
            whine: 0.008,
            whineOcc: 0.003,
            dynamicWhine: true
        },
        foley: {oscFreq: 400, filterType: 'bandpass', filterFreq: 2500, gain: 0.12, attack: 0.01, decay: 0.15},
        delay: 0.05, feedback: 0.1
    },
    INCINERATOR: {
        fog: 0.20, fogColor: 0xD15900,
        ambience: {
            noise: 0.65,
            peace: 0.01,
            rumble: 269,
            freq: 60,
            freqOcc: 60,
            whine: 0.0,
            whineOcc: 0.0,
            dynamicWhine: false
        },
        exhaust: {
            opacity: 0.95, color: 0xff4400,
            spinY: -0.18, spinX: 0.12,
            baseSize: 0.18, pulseRate: 24.0, pulseDepth: 0.05
        },
        delay: 0.02, feedback: 0.15
    },
    CHASM: {
        fog: 0.20, fogColor: 0x031B3B,
        ambience: {
            noise: 0.25,
            peace: 0.0,
            rumble: 30,
            freq: 40,
            freqOcc: 40,
            whine: 0.0,
            whineOcc: 0.0,
            dynamicWhine: false
        },
        foley: {oscFreq: 240, filterType: 'bandpass', filterFreq: 1600, gain: 0.18, attack: 0.005, decay: 0.3},
        dust: {
            drift: 'fall', fallSpeed: -0.02,
            baseOpacity: 0.65, crawlOpacity: 0.75,
            baseSize: 0.35, crawlSize: 0.45,
            color: 0x2288ff
        },
        delay: 0.8, feedback: 0.7
    },
    ATRIUM: {
        fog: 0.09, fogColor: 0x010101,
        ambience: {
            noise: 0.09,
            peace: 0.0,
            rumble: 35,
            freq: 130,
            freqOcc: 80,
            whine: 0.0,
            whineOcc: 0.0,
            dynamicWhine: false
        },
        foley: {oscFreq: 70, filterType: 'lowpass', filterFreq: 700, gain: 0.09, attack: 0.04, decay: 0.22},
        delay: 0.4, feedback: 0.3
    },
    ANNEX: {
        fog: 0.03,
        ambience: {
            noise: 0.03,
            peace: 0.0,
            rumble: 50,
            freq: 200,
            freqOcc: 100,
            whine: 0.001,
            whineOcc: 0.0003,
            dynamicWhine: true
        },
        foley: {oscFreq: 420, filterType: 'highpass', filterFreq: 2200, gain: 0.1, attack: 0.01, decay: 0.07},
        dust: {
            drift: 'fall', fallSpeed: -0.01,
            baseOpacity: 0.45, crawlOpacity: 0.55,
            baseSize: 0.45, crawlSize: 0.50,
            color: 0xe8ddc5
        },
        delay: 0.1, feedback: 0.12
    },
    EXIT: {fog: 0.05},
    CHECKPOINT: {
        fog: 0.07, fogColor: 0x4E3E5E,
        ambience: {
            noise: 0.2,
            peace: 0.0,
            rumble: 80,
            freq: 1000,
            freqOcc: 500,
            whine: 0.05,
            whineOcc: 0.01,
            dynamicWhine: true
        },
        foley: {oscFreq: 800, filterType: 'bandpass', filterFreq: 2000, gain: 0.1, attack: 0.01, decay: 0.1}
    }
};
export default SECTORS;