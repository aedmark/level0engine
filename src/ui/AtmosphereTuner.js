import {DEFAULT_GROUND_COLOR, DEFAULT_ATMOSPHERE_COLOR} from '../world/Sectors.js';
import {createSectorTuner} from './SectorTunerFactory.js';

export const AtmosphereTuner = createSectorTuner({
    keyCode: 'KeyP',
    prefix: 'atm',
    panelId: 'atmosphere-tuner',
    saveUrl: '/save-atmosphere',
    fields: [
        {key: 'ambient', type: 'numeric', default: 0.30, decimals: 2},
        {
            key: 'fog', type: 'numeric', default: 0.05, decimals: 3,
            onApply: (val, env, tuner) => {
                if (env && env.macroZones) {
                    for (const zone of env.macroZones.values()) {
                        if (zone.id === tuner.activeSector) zone.fog = val;
                    }
                }
            }
        },
        {key: 'fogColor', type: 'color', default: DEFAULT_ATMOSPHERE_COLOR},
        {key: 'groundColor', type: 'color', default: DEFAULT_GROUND_COLOR}
    ],
    extra: {
        key: 'skyColor',
        read: (environment) => environment.engine.ambientLight.color.getHex(),
        apply: (hex, environment) => {
            environment.engine.ambientLight.color.setHex(hex);
        }
    }
});

export default AtmosphereTuner;
