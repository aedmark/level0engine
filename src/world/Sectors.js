// Sectors.js
// LEVEL 0 SECTOR REGISTRY

export const DEFAULT_FOLEY = {oscFreq: 60, filterType: 'lowpass', filterFreq: 600, gain: 0.10, attack: 0.04, decay: 0.18};

const SECTORS = {
    NORMAL: {
        fog: 0.05,
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
        fog: 0.01, fogColor: 0xa0bbd6,
        ambience: {noise: 0.05, peace: 0.0, rumble: 60, freq: 250, freqOcc: 120, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        foley: {oscFreq: 120, filterType: 'lowpass', filterFreq: 1400, gain: 0.18, attack: 0.02, decay: 0.12},
        delay: 0.25, feedback: 0.35
    },
    SERVER: {
        fog: 0.08, fogColor: 0x5f2fc2,
        ambience: {noise: 0.1, peace: 0.0, rumble: 35, freq: 250, freqOcc: 120, whine: 0.002, whineOcc: 0.0005, dynamicWhine: false},
        foley: {oscFreq: 620, filterType: 'bandpass', filterFreq: 1800, gain: 0.14, attack: 0.005, decay: 0.14},
        delay: 0.06, feedback: 0.08
    },
    CLINIC: {
        fog: 0.03, fogColor: 0x7799aa,
        ambience: {noise: 0.1, peace: 0.0, rumble: 60, freq: 180, freqOcc: 180, whine: 0.003, whineOcc: 0.003, dynamicWhine: false},
        foley: {oscFreq: 800, filterType: 'highpass', filterFreq: 3000, gain: 0.15, attack: 0.01, decay: 0.06}
    },
    ARCHIVE: {
        fog: 0.02, fogColor: 0x11111,
        ambience: {noise: 0.06, peace: 0.0, rumble: 45, freq: 60, freqOcc: 60, whine: 0.0005, whineOcc: 0.0001, dynamicWhine: false},
        foley: {oscFreq: 90, filterType: 'lowpass', filterFreq: 900, gain: 0.12, attack: 0.03, decay: 0.10},
        delay: 0.35, feedback: 0.45
    },
    MAINTENANCE: {
        fog: 0.10, fogColor: 0xf6b26b,
        ambience: {noise: 0.55, peace: 0.0, rumble: 110, freq: 90, freqOcc: 60, whine: 0.008, whineOcc: 0.003, dynamicWhine: true},
        foley: {oscFreq: 400, filterType: 'bandpass', filterFreq: 2500, gain: 0.12, attack: 0.01, decay: 0.15},
        delay: 0.05, feedback: 0.1
    },
    INCINERATOR: {
        fog: 0.18, fogColor: 0x551100,
        ambience: {noise: 0.60, peace: 0.01, rumble: 169, freq: 60, freqOcc: 60, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        delay: 0.02, feedback: 0.05
    },
    CHASM: {
        fog: 0.20, fogColor: 0x0f1036,
        ambience: {noise: 0.25, peace: 0.0, rumble: 30, freq: 40, freqOcc: 40, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        foley: {oscFreq: 240, filterType: 'bandpass', filterFreq: 1600, gain: 0.18, attack: 0.005, decay: 0.3},
        delay: 0.8, feedback: 0.7
    },
    ATRIUM: {
        fog: 0.19, fogColor: 0x020202,
        ambience: {noise: 0.09, peace: 0.0, rumble: 35, freq: 130, freqOcc: 80, whine: 0.0, whineOcc: 0.0, dynamicWhine: false},
        foley: {oscFreq: 70, filterType: 'lowpass', filterFreq: 700, gain: 0.09, attack: 0.04, decay: 0.22},
        delay: 0.4, feedback: 0.3
    },
    ANNEX: {
        fog: 0.02, fogColor: 0x7d7568,
        ambience: {noise: 0.03, peace: 0.0, rumble: 50, freq: 200, freqOcc: 100, whine: 0.001, whineOcc: 0.0003, dynamicWhine: false},
        foley: {oscFreq: 420, filterType: 'highpass', filterFreq: 2200, gain: 0.1, attack: 0.01, decay: 0.07},
        delay: 0.1, feedback: 0.12
    },
    EXIT: {fog: 0.05},
    CHECKPOINT: {
        fog: 0.05,
        ambience: {noise: 0.2, peace: 0.0, rumble: 80, freq: 1000, freqOcc: 500, whine: 0.05, whineOcc: 0.01, dynamicWhine: true},
        foley: {oscFreq: 800, filterType: 'bandpass', filterFreq: 2000, gain: 0.1, attack: 0.01, decay: 0.1}
    }
};

export default SECTORS;
