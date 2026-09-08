import {
    DEFAULT_LIGHT_INTENSITY,
    DEFAULT_LIGHT_COLOR,
    DEFAULT_LIGHT_RANGE,
    DEFAULT_SHADOWS_ENABLED,
    DEFAULT_SHADOW_RADIUS,
    DEFAULT_RECT_LIGHT_INTENSITY
} from '../world/Sectors.js';
import {createSectorTuner} from './SectorTunerFactory.js';

export const LightTuner = createSectorTuner({
    keyCode: 'KeyL',
    prefix: 'lt',
    panelId: 'light-tuner',
    saveUrl: '/save-light',
    fields: [
        {key: 'lightIntensity', type: 'numeric', default: DEFAULT_LIGHT_INTENSITY, decimals: 2},
        {key: 'lightColor', type: 'color', default: DEFAULT_LIGHT_COLOR},
        {key: 'lightRange', type: 'numeric', default: DEFAULT_LIGHT_RANGE, decimals: 2},
        {key: 'shadowsEnabled', type: 'bool', default: DEFAULT_SHADOWS_ENABLED},
        {key: 'shadowRadius', type: 'numeric', default: DEFAULT_SHADOW_RADIUS, decimals: 2},
        {key: 'rectLightIntensity', type: 'numeric', default: DEFAULT_RECT_LIGHT_INTENSITY, decimals: 2}
    ]
});

export default LightTuner;
