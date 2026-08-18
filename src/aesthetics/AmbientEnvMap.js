export default class AmbientEnvMap {
    static generate(renderer) {
        const width = 512, height = 256;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#3d3a30');
        grad.addColorStop(0.35, '#38383c');
        grad.addColorStop(0.65, '#2c2c2f');
        grad.addColorStop(1, '#141312');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        let seed = 0x9b1f2a4d;
        const rand = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const glow = (x, y, r) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255, 248, 214, 0.10)');
            g.addColorStop(1, 'rgba(255, 248, 214, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        for (let i = 0; i < 6; i++) {
            const x = rand() * width;
            const y = height * (0.05 + rand() * 0.2);
            const r = width * (0.12 + rand() * 0.10);
            glow(x, y, r);
            glow(x > width / 2 ? x - width : x + width, y, r);
        }

        const source = new THREE.CanvasTexture(canvas);
        source.mapping = THREE.EquirectangularReflectionMapping;
        if ('colorSpace' in source) {
            source.colorSpace = THREE.SRGBColorSpace;
        } else {
            source.encoding = THREE.sRGBEncoding;
        }

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envMap = pmremGenerator.fromEquirectangular(source).texture;
        pmremGenerator.dispose();
        source.dispose();

        return envMap;
    }

    static SAFE_MATERIAL_KEYS = [
        'tileMat', 'archiveFloorMat', 'serverFloorMat', 'atriumFloorMat',
        'clinicFloorMat', 'incinFloorMat', 'annexFloorMat', 'checkpointFloorMat',
        'diamondPlateMat',
        'baseHousingMat',
        'incinCeilingMat', 'clinicCeilingMat', 'clinicWallMat'
    ];

    static applyToMaterials(env, envMap, intensity = 0.2) {
        let count = 0;
        for (const key of AmbientEnvMap.SAFE_MATERIAL_KEYS) {
            const mat = env[key];
            if (mat && mat.isMaterial && mat.metalness > 0.1) {
                mat.envMap = envMap;
                mat.envMapIntensity = intensity;
                mat.needsUpdate = true;
                count++;
            }
        }
        return count;
    }
}
