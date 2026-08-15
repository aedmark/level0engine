export default class TextureMechanics {
static _createContext(width, height, opaque = true) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return {canvas, ctx: canvas.getContext('2d', opaque ? {alpha: false, willReadFrequently: true} : {willReadFrequently: true})};
    }

    static _seededRandom(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296.0;
        };
    }

    static _ditherCanvas(ctx, w, h, rand, amount = 5) {
        const img = ctx.getImageData(0, 0, w, h);
        const px = img.data;
        for (let i = 0; i < px.length; i += 4) {
            const n = (rand() - 0.5) * amount;
            px[i] += n;
            px[i + 1] += n;
            px[i + 2] += n;
        }
        ctx.putImageData(img, 0, 0);
    }

    static _wrapDraw(size, x, y, reach, fn) {
        const ox = x < reach ? size : (x > size - reach ? -size : 0);
        const oy = y < reach ? size : (y > size - reach ? -size : 0);
        fn(x, y);
        if (ox) fn(x + ox, y);
        if (oy) fn(x, y + oy);
        if (ox && oy) fn(x + ox, y + oy);
    }

    static _createWrappedTexture(canvas, repeatX = 1, repeatY = 1, clampT = false) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        if (repeatX !== 1 || repeatY !== 1) {
            texture.repeat.set(repeatX, repeatY);
        }
        return texture;
    }

    static _generateMasterNoise() {
        const {canvas, ctx} = this._createContext(512, 512, false);
        const img = ctx.createImageData(512, 512);
        const data = img.data;
        let seed = 1337;
        for (let i = 0; i < data.length; i += 4) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            if ((seed >>> 24) > 217) {
                const val = (seed & 0x10000) ? 0 : 255;
                data[i] = data[i + 1] = data[i + 2] = val;
                data[i + 3] = 10 + ((seed >>> 8) % 50);
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas;
    }

    static _yield() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }
}
