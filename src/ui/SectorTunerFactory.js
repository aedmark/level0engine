// Shared scaffold for the debug sector tuners (AtmosphereTuner, LightTuner): both edit a set of
// per-sector fields on SECTORS[id] live, then diff against a snapshot to save only what changed
// via a small POST endpoint. See AtmosphereTuner.js / LightTuner.js for the field configs.

import SECTORS from '../world/Sectors.js';

export const hexToCss = (hex) => '#' + hex.toString(16).padStart(6, '0');
export const cssToHex = (css) => parseInt(css.slice(1), 16);

// config: {
//   keyCode, prefix, panelId, saveUrl,
//   fields: [{key, type: 'numeric'|'color'|'bool', default, decimals?, onApply?(val, environment, tuner)}],
//   extra?: {key, read(environment), apply(val, environment)}  // a field that lives outside SECTORS[id]
// }
export function createSectorTuner(config) {
    const {keyCode, prefix, panelId, saveUrl, fields, extra} = config;
    const id = (key) => `${prefix}-${key}`;

    const tuner = {
        el: null,
        visible: false,
        activeSector: null,
        _env: null,
        _snapshot: null,
        _inputs: null,

        bindEvents() {
            document.addEventListener('keydown', (e) => {
                if (e.code !== keyCode) return;
                if (!window.EDMARK_DEBUG_MODE) return;
                if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
                this.toggle();
            });

            const inputs = {};
            for (const f of fields) inputs[f.key] = document.getElementById(id(f.key));
            if (extra) inputs[extra.key] = document.getElementById(id(extra.key));
            this._inputs = inputs;
            if (!inputs[fields[0].key]) return;

            for (const f of fields) {
                const el = inputs[f.key];
                const event = f.type === 'bool' ? 'change' : 'input';
                const handler = f.type === 'bool' ? () => this._applyBool(f.key)
                    : f.type === 'color' ? () => this._applyColor(f.key)
                    : () => this._applyNumeric(f.key);
                el.addEventListener(event, handler);
            }
            if (extra) {
                inputs[extra.key].addEventListener('input', () => this._applyExtra());
            }

            const saveBtn = document.getElementById(id('export-btn'));
            if (saveBtn) saveBtn.addEventListener('click', () => this._save());
        },

        toggle() {
            if (!this.el) this.el = document.getElementById(panelId);
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
                const label = document.getElementById(id('sector-label'));
                if (label) label.textContent = sectorId;
            }
        },

        _row() {
            if (!SECTORS[this.activeSector]) SECTORS[this.activeSector] = {};
            return SECTORS[this.activeSector];
        },

        _readSnapshot(sectorId, environment) {
            const row = SECTORS[sectorId] || {};
            const snap = {sectorId};
            for (const f of fields) snap[f.key] = row[f.key] !== undefined ? row[f.key] : f.default;
            if (extra) snap[extra.key] = extra.read(environment);
            return snap;
        },

        _populateInputs(snap) {
            const i = this._inputs;
            for (const f of fields) {
                if (f.type === 'bool') {
                    i[f.key].checked = snap[f.key];
                } else if (f.type === 'color') {
                    i[f.key].value = hexToCss(snap[f.key]);
                } else {
                    i[f.key].value = snap[f.key];
                    this._setReadout(f.key, snap[f.key], f.decimals);
                }
            }
            if (extra) i[extra.key].value = hexToCss(snap[extra.key]);
        },

        _setReadout(field, val, decimals = 2) {
            const el = document.getElementById(id(`${field}-val`));
            if (el) el.textContent = Number(val).toFixed(decimals);
        },

        _applyNumeric(field) {
            const val = Number(this._inputs[field].value);
            this._row()[field] = val;
            this._setReadout(field, val, fields.find(f => f.key === field).decimals);
            const f = fields.find(f => f.key === field);
            if (f.onApply) f.onApply(val, this._env, this);
        },

        _applyColor(field) {
            this._row()[field] = cssToHex(this._inputs[field].value);
        },

        _applyBool(field) {
            this._row()[field] = this._inputs[field].checked;
        },

        _applyExtra() {
            if (!this._env || !extra) return;
            extra.apply(cssToHex(this._inputs[extra.key].value), this._env);
        },

        async _save() {
            const out = document.getElementById(id('export-output'));
            if (!out || !this._snapshot) return;
            const row = this._row();

            const sectorFields = {};
            for (const f of fields) {
                const current = row[f.key];
                if (current === undefined || current === this._snapshot[f.key]) continue;
                sectorFields[f.key] = current;
            }

            const baseFields = {};
            if (extra) {
                const currentExtra = cssToHex(this._inputs[extra.key].value);
                if (currentExtra !== this._snapshot[extra.key]) baseFields[extra.key] = currentExtra;
            }

            if (Object.keys(sectorFields).length === 0 && Object.keys(baseFields).length === 0) {
                out.textContent = 'No changes to save.';
                return;
            }

            out.textContent = 'Saving...';
            try {
                const body = {sector: this.activeSector, sectorFields};
                if (extra) body.baseFields = baseFields;
                const resp = await fetch(saveUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body)
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

    return tuner;
}
