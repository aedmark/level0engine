import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadGlobalVendor(filename) {
    const code = fs.readFileSync(path.join(__dirname, '../', filename), 'utf8');
    const _module = globalThis.module;
    const _exports = globalThis.exports;
    globalThis.module = undefined;
    globalThis.exports = undefined;
    try {
        vm.runInThisContext(code, { filename });
    } finally {
        globalThis.module = _module;
        globalThis.exports = _exports;
    }
}

loadGlobalVendor('r160.js');
loadGlobalVendor('jsep.min.js');
loadGlobalVendor('purify.min.js');

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && (url.startsWith('./') || url.startsWith('../'))) {
        try {
            const filepath = path.resolve(__dirname, '../', url);
            const buffer = fs.readFileSync(filepath);
            return {
                ok: true,
                arrayBuffer: async () => buffer,
                json: async () => JSON.parse(buffer.toString()),
                text: async () => buffer.toString(),
            };
        } catch (e) {
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                arrayBuffer: async () => { throw new Error('Not found'); }
            };
        }
    }
    return originalFetch(url, options);
};

globalThis.location = { search: '' };

globalThis.document = {
    createElement: () => ({
        getContext: () => ({
            fillRect: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(4) })
        }),
        width: 1, height: 1
    }),
    dispatchEvent: () => {}
};

const origGetContext = globalThis.document.createElement().getContext;
globalThis.document.createElement = () => ({
    getContext: () => ({
        fillRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        fillText: () => {},
        measureText: () => ({ width: 10 })
    }),
    width: 1, height: 1
});
