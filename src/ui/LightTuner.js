import SECTORS, {
    DEFAULT_LIGHT_INTENSITY,
    DEFAULT_LIGHT_COLOR,
    DEFAULT_LIGHT_RANGE,
    DEFAULT_SHADOWS_ENABLED,
    DEFAULT_SHADOW_RADIUS,
    DEFAULT_RECT_LIGHT_INTENSITY
} from '../world/Sectors.js';

const hexToCss = (hex) => '#' + hex.toString(16).padStart(6, '0');
const cssToHex = (css) => parseInt(css.slice(1), 16);

export const LightTuner = {
    el: null,
    visible: false,
    activeSector: null,
    _env: null,
    _snapshot: null,
    _inputs: null,

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyL') return;
            if (!window.EDMARK_DEBUG_MODE) return;
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            this.toggle();
        });

        this._inputs = {
            lightIntensity: document.getElementById('lt-lightIntensity'),
            lightColor: document.getElementById('lt-lightColor'),
            lightRange: document.getElementById('lt-lightRange'),
            shadowsEnabled: document.getElementById('lt-shadowsEnabled'),
            shadowRadius: document.getElementById('lt-shadowRadius'),
            rectLightIntensity: document.getElementById('lt-rectLightIntensity')
        };
        if (!this._inputs.lightIntensity) return;

        this._inputs.lightIntensity.addEventListener('input', () => this._applyNumeric('lightIntensity'));
        this._inputs.lightColor.addEventListener('input', () => this._applyColor('lightColor'));
        this._inputs.lightRange.addEventListener('input', () => this._applyNumeric('lightRange'));
        this._inputs.shadowsEnabled.addEventListener('change', () => this._applyBool('shadowsEnabled'));
        this._inputs.shadowRadius.addEventListener('input', () => this._applyNumeric('shadowRadius'));
        this._inputs.rectLightIntensity.addEventListener('input', () => this._applyNumeric('rectLightIntensity'));

        const saveBtn = document.getElementById('lt-export-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this._save());
    },

    toggle() {
        if (!this.el) this.el = document.getElementById('light-tuner');
        if (!this.el) return;
        this.visible = !this.visible;
        this.el.style.display = this.visible ? 'block' : 'none';
    },

    update(environment) {
        if (!this.visible || !this.el) return;
        this._env = environment;
        const sectorId = (environment._sectorFrame && environment._sectorFrame.activeSector) || 'NORMAL';
        if (sectorId !== this.activeSector) {
            this.activeSector = sectorId;
            this._snapshot = this._readSnapshot(sectorId);
            this._populateInputs(this._snapshot);
            const label = document.getElementById('lt-sector-label');
            if (label) label.textContent = sectorId;
        }
    },

    _row() {
        if (!SECTORS[this.activeSector]) SECTORS[this.activeSector] = {};
        return SECTORS[this.activeSector];
    },

    _readSnapshot(sectorId) {
        const row = SECTORS[sectorId] || {};
        return {
            sectorId,
            lightIntensity: row.lightIntensity !== undefined ? row.lightIntensity : DEFAULT_LIGHT_INTENSITY,
            lightColor: row.lightColor !== undefined ? row.lightColor : DEFAULT_LIGHT_COLOR,
            lightRange: row.lightRange !== undefined ? row.lightRange : DEFAULT_LIGHT_RANGE,
            shadowsEnabled: row.shadowsEnabled !== undefined ? row.shadowsEnabled : DEFAULT_SHADOWS_ENABLED,
            shadowRadius: row.shadowRadius !== undefined ? row.shadowRadius : DEFAULT_SHADOW_RADIUS,
            rectLightIntensity: row.rectLightIntensity !== undefined ? row.rectLightIntensity : DEFAULT_RECT_LIGHT_INTENSITY
        };
    },

    _populateInputs(snap) {
        const i = this._inputs;
        i.lightIntensity.value = snap.lightIntensity;
        this._setReadout('lightIntensity', snap.lightIntensity);
        i.lightColor.value = hexToCss(snap.lightColor);
        i.lightRange.value = snap.lightRange;
        this._setReadout('lightRange', snap.lightRange);
        i.shadowsEnabled.checked = snap.shadowsEnabled;
        i.shadowRadius.value = snap.shadowRadius;
        this._setReadout('shadowRadius', snap.shadowRadius);
        i.rectLightIntensity.value = snap.rectLightIntensity;
        this._setReadout('rectLightIntensity', snap.rectLightIntensity);
    },

    _setReadout(field, val) {
        const el = document.getElementById(`lt-${field}-val`);
        if (el) el.textContent = Number(val).toFixed(2);
    },

    _applyNumeric(field) {
        const val = Number(this._inputs[field].value);
        this._row()[field] = val;
        this._setReadout(field, val);
    },

    _applyColor(field) {
        this._row()[field] = cssToHex(this._inputs[field].value);
    },

    _applyBool(field) {
        this._row()[field] = this._inputs[field].checked;
    },

    async _save() {
        const out = document.getElementById('lt-export-output');
        if (!out || !this._snapshot) return;
        const row = this._row();

        const sectorFields = {};
        for (const f of ['lightIntensity', 'lightColor', 'lightRange', 'shadowsEnabled', 'shadowRadius', 'rectLightIntensity']) {
            const current = row[f];
            if (current === undefined || current === this._snapshot[f]) continue;
            sectorFields[f] = current;
        }

        if (Object.keys(sectorFields).length === 0) {
            out.textContent = 'No changes to save.';
            return;
        }

        out.textContent = 'Saving...';
        try {
            const resp = await fetch('/save-light', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sector: this.activeSector, sectorFields})
            });
            const text = await resp.text();
            if (!resp.ok) {
                out.textContent = `Save failed:\n${text}`;
                return;
            }
            out.textContent = `Saved:\n${text}`;
            this._snapshot = this._readSnapshot(this.activeSector);
        } catch (err) {
            out.textContent = `Save failed: ${err.message}`;
        }
    }
};

export default LightTuner;
