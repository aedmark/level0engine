import SECTORS, {DEFAULT_GROUND_COLOR, DEFAULT_ATMOSPHERE_COLOR} from '../world/Sectors.js';

const hexToCss = (hex) => '#' + hex.toString(16).padStart(6, '0');
const cssToHex = (css) => parseInt(css.slice(1), 16);

export const AtmosphereTuner = {
    el: null,
    visible: false,
    activeSector: null,
    _env: null,
    _snapshot: null,
    _inputs: null,

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyP') return;
            if (!window.EDMARK_DEBUG_MODE) return;
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            this.toggle();
        });

        this._inputs = {
            ambient: document.getElementById('atm-ambient'),
            fog: document.getElementById('atm-fog'),
            fogColor: document.getElementById('atm-fogColor'),
            groundColor: document.getElementById('atm-groundColor'),
            skyColor: document.getElementById('atm-skyColor'),
            baseColor: document.getElementById('atm-baseColor')
        };
        if (!this._inputs.ambient) return;

        this._inputs.ambient.addEventListener('input', () => this._applyNumeric('ambient'));
        this._inputs.fog.addEventListener('input', () => this._applyNumeric('fog'));
        this._inputs.fogColor.addEventListener('input', () => this._applyColor('fogColor'));
        this._inputs.groundColor.addEventListener('input', () => this._applyColor('groundColor'));
        this._inputs.skyColor.addEventListener('input', () => this._applyBaseColor('skyColor'));
        this._inputs.baseColor.addEventListener('input', () => this._applyBaseColor('baseColor'));

        const saveBtn = document.getElementById('atm-export-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this._save());
    },

    toggle() {
        if (!this.el) this.el = document.getElementById('atmosphere-tuner');
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
            this._snapshot = this._readSnapshot(sectorId, environment);
            this._populateInputs(this._snapshot);
            const label = document.getElementById('atm-sector-label');
            if (label) label.textContent = sectorId;
        }
    },

    _row() {
        if (!SECTORS[this.activeSector]) SECTORS[this.activeSector] = {};
        return SECTORS[this.activeSector];
    },

    _readSnapshot(sectorId, environment) {
        const row = SECTORS[sectorId] || {};
        const baseColorHex = environment._baseFogColor ? environment._baseFogColor.getHex() : DEFAULT_ATMOSPHERE_COLOR;
        return {
            sectorId,
            ambient: row.ambient !== undefined ? row.ambient : 0.30,
            fog: row.fog !== undefined ? row.fog : 0.05,
            fogColor: row.fogColor !== undefined ? row.fogColor : baseColorHex,
            groundColor: row.groundColor !== undefined ? row.groundColor : DEFAULT_GROUND_COLOR,
            skyColor: environment.engine.ambientLight.color.getHex(),
            baseColor: baseColorHex
        };
    },

    _populateInputs(snap) {
        const i = this._inputs;
        i.ambient.value = snap.ambient;
        this._setReadout('ambient', snap.ambient);
        i.fog.value = snap.fog;
        this._setReadout('fog', snap.fog);
        i.fogColor.value = hexToCss(snap.fogColor);
        i.groundColor.value = hexToCss(snap.groundColor);
        i.skyColor.value = hexToCss(snap.skyColor);
        i.baseColor.value = hexToCss(snap.baseColor);
    },

    _setReadout(field, val) {
        const el = document.getElementById(`atm-${field}-val`);
        if (el) el.textContent = val.toFixed(field === 'fog' ? 3 : 2);
    },

    _applyNumeric(field) {
        const val = Number(this._inputs[field].value);
        this._row()[field] = val;
        this._setReadout(field, val);
        if (field === 'fog' && this._env && this._env.macroZones) {
            for (const zone of this._env.macroZones.values()) {
                if (zone.id === this.activeSector) zone.fog = val;
            }
        }
    },

    _applyColor(field) {
        this._row()[field] = cssToHex(this._inputs[field].value);
    },

    _applyBaseColor(field) {
        const env = this._env;
        if (!env) return;
        const hex = cssToHex(this._inputs[field].value);
        if (field === 'skyColor') {
            env.engine.ambientLight.color.setHex(hex);
        } else if (field === 'baseColor') {
            if (!env._baseFogColor) env._baseFogColor = new THREE.Color();
            env._baseFogColor.setHex(hex);
        }
    },

    async _save() {
        const out = document.getElementById('atm-export-output');
        if (!out || !this._snapshot) return;
        const row = this._row();

        const sectorFields = {};
        for (const f of ['ambient', 'fog', 'fogColor', 'groundColor']) {
            const current = row[f];
            if (current === undefined || current === this._snapshot[f]) continue;
            sectorFields[f] = current;
        }

        const baseFields = {};
        const skyHex = cssToHex(this._inputs.skyColor.value);
        const baseHex = cssToHex(this._inputs.baseColor.value);
        if (skyHex !== this._snapshot.skyColor) baseFields.skyColor = skyHex;
        if (baseHex !== this._snapshot.baseColor) baseFields.atmosphereColor = baseHex;

        if (Object.keys(sectorFields).length === 0 && Object.keys(baseFields).length === 0) {
            out.textContent = 'No changes to save.';
            return;
        }

        out.textContent = 'Saving...';
        try {
            const resp = await fetch('/save-atmosphere', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sector: this.activeSector, sectorFields, baseFields})
            });
            const text = await resp.text();
            if (!resp.ok) {
                out.textContent = `Save failed:\n${text}`;
                return;
            }
            out.textContent = `Saved:\n${text}`;
            this._snapshot = this._readSnapshot(this.activeSector, this._env);
        } catch (err) {
            out.textContent = `Save failed: ${err.message}`;
        }
    }
};

export default AtmosphereTuner;
