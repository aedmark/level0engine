export const DEFAULT_FOLEY = {
    oscFreq: 60,
    filterType: 'lowpass',
    filterFreq: 600,
    gain: 0.10,
    attack: 0.04,
    decay: 0.18
};
export const DEFAULT_DUST = {
    drift: 'vertical',
    driftY: -0.0025,
    turbulence: 0.0,
    baseOpacity: 0.10,
    crawlOpacity: 0.35,
    baseSize: 0.05,
    crawlSize: 0.08,
    color: 0xffffff
};
export const DEFAULT_EXHAUST = {
    opacity: 0.0,
    color: 0x00ffcc,
    spinY: -0.07,
    spinX: 0.04,
    baseSize: 0.08,
    pulseRate: 12.0,
    pulseDepth: 0.02
};
export const DEFAULT_REVERB = {
    rt60: 0.8,
    predelay: 0.012,
    wet: 0.14
};

export const DEFAULT_AMBIENT = 0.65;

export const MIN_AMBIENT = 0.005;

const SECTORS = {
    NORMAL: {
        fog: 0.03,
        ambient: DEFAULT_AMBIENT,
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
        foley: {oscFreq: 85, filterType: 'lowpass', filterFreq: 1200, gain: 0.09, attack: 0.02, decay: 0.11},
        reverb: {rt60: 0.8, predelay: 0.010, wet: 0.14}
    },
    ARCHIVE: {
        fog: 0.07, fogColor: 0x000000,
        ambient: 0.58,
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
            drift: 'vertical', driftY: -0.0025,
            baseOpacity: 0.30, crawlOpacity: 0.45,
            baseSize: 0.07, crawlSize: 0.09,
            color: 0xffffff
        },
        reverb: {rt60: 1.1, predelay: 0.014, wet: 0.16}
    },
    IMPOUND: {
        fog: 0.12, fogColor: 0x1A1313,
        ambient: 0.02,
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
            drift: 'vertical', driftY: -0.04,
            baseOpacity: 0.6, crawlOpacity: 0.7,
            baseSize: 0.18, crawlSize: 0.22,
            color: 0xffffff
        },
        reverb: {rt60: 1.9, predelay: 0.040, wet: 0.22}
    },
    BOARDROOM: {
        fog: 0.02, fogColor: 0xa0bbd6,
        ambient: 0.2,
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
        reverb: {rt60: 0.7, predelay: 0.011, wet: 0.12}
    },
    SERVER: {
        fog: 0.01, fogColor: 0x380159,
        ambient: 0.08,
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
            drift: 'vertical', driftY: 0.18, turbulence: 0.6,
            baseOpacity: 0.90, crawlOpacity: 0.95,
            baseSize: 0.30, crawlSize: 0.35,
            color: 0xffffff
        },
        exhaust: {
            opacity: 0.35, color: 0x00ffcc,
            spinY: -0.07, spinX: 0.04,
            baseSize: 0.08, pulseRate: 12.0, pulseDepth: 0.02
        },
        reverb: {rt60: 0.55, predelay: 0.007, wet: 0.10}
    },
    CLINIC: {
        fog: 0.02, fogColor: 0x031233,
        ambient: 0.1,
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
        foley: {oscFreq: 800, filterType: 'highpass', filterFreq: 3000, gain: 0.15, attack: 0.01, decay: 0.06},
        reverb: {rt60: 1.0, predelay: 0.009, wet: 0.18}
    },

    MAINTENANCE: {
        fog: 0.08, fogColor: 0x572503,
        ambient: 0.18,
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
        reverb: {rt60: 0.6, predelay: 0.006, wet: 0.10}
    },
    INCINERATOR: {
        fog: 0.20, fogColor: 0xD15900,
        ambient: 0.15,
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
        foley: {oscFreq: 1400, filterType: 'bandpass', filterFreq: 3200, gain: 0.22, attack: 0.004, decay: 0.19},
        reverb: {rt60: 1.3, predelay: 0.012, wet: 0.18}
    },
    CHASM: {
        fog: 0.20, fogColor: 0x031B3B,
        ambient: 0.02,
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
            drift: 'vertical', driftY: 0.02,
            baseOpacity: 0.65, crawlOpacity: 0.75,
            baseSize: 0.35, crawlSize: 0.45,
            color: 0x2288ff
        },
        reverb: {rt60: 4.5, predelay: 0.085, wet: 0.38}
    },
    ATRIUM: {
        fog: 0.12, fogColor: 0x000000,
        ambient: 0.00,
        ambience: {
            noise: 0.13,
            peace: 0.0,
            rumble: 35,
            freq: 130,
            freqOcc: 80,
            whine: 0.0,
            whineOcc: 0.0,
            dynamicWhine: false
        },
        foley: {oscFreq: 900, filterType: 'bandpass', filterFreq: 2400, gain: 0.13, attack: 0.006, decay: 0.07},
        dust: {
            drift: 'vertical', driftY: -0.006, turbulence: 0.45,
            baseOpacity: 0.22, crawlOpacity: 0.34,
            baseSize: 0.16, crawlSize: 0.20,
            color: 0x8fa4b0
        },
        reverb: {rt60: 3.0, predelay: 0.045, wet: 0.30}
    },
    ANNEX: {
        fog: 0.03,
        ambient: 0.15,
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
            drift: 'vertical', driftY: 0.01,
            baseOpacity: 0.45, crawlOpacity: 0.55,
            baseSize: 0.45, crawlSize: 0.50,
            color: 0xe8ddc5
        },
        reverb: {rt60: 0.35, predelay: 0.005, wet: 0.08}
    },
    EXIT: {
        fog: 0.05, ambient: 0.18,
        foley: {oscFreq: 700, filterType: 'bandpass', filterFreq: 2700, gain: 0.14, attack: 0.008, decay: 0.075},
        reverb: {rt60: 0.9, predelay: 0.012, wet: 0.14}
    },
    CHECKPOINT: {
        fog: 0.01,
        ambient: 0.55,
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
        foley: {oscFreq: 800, filterType: 'bandpass', filterFreq: 2000, gain: 0.1, attack: 0.01, decay: 0.1},
        reverb: {rt60: 1.0, predelay: 0.010, wet: 0.15}
    }
};
export default SECTORS;