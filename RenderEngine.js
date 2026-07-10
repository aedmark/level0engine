// RenderEngine.js
// LEVEL 0 CORE RENDER ENGINE

export default class RenderEngine {
    constructor() {
        this.aspectRatio = 1.3333333333;
        this.resolutionScale = 1.0;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa89f68);
        this.scene.fog = new THREE.FogExp2(0xa89f68, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        this.renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: "high-performance"});
        this.renderer.setPixelRatio(1.0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        this.ambientLight = new THREE.HemisphereLight(0xfff5c2, 0x3d3520, 0.85);
        this.scene.add(this.ambientLight);
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter
        });
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.exhaustion = 0.0;
        this.postMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {value: this.target.texture},
                time: {value: 0.0},
                exhaustion: {value: 0.0},
                squeeze: {value: 0.0},
                anomaly: {value: 0.0},
                globalSeed: {value: 0.0}
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float exhaustion;
                uniform float squeeze;
                uniform float anomaly;
                uniform float globalSeed;
                varying vec2 vUv;
                
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                
                void main() {
                    vec2 uv = vUv;
                    vec2 centerUv = uv - 0.5;
                    
                    if (anomaly > 0.01) {
                        float tear = step(0.9, sin(uv.y * 40.0 + time * 15.0));
                        uv.x += tear * (globalSeed - 0.5) * anomaly * 0.3;
                    }
                    
                    float pulse = sin(time * 8.0);
                    float exhaustionDistort = (exhaustion * 0.018) * (1.0 + pulse * 0.3);
                    vec2 offset = vec2(0.001 + (squeeze * 0.004) + (anomaly * 0.04) + exhaustionDistort, exhaustionDistort * 0.4) * centerUv * 2.0; 
                    
                    vec3 col = vec3(0.0);
                    col.r = texture2D(tDiffuse, uv + offset).r;
                    col.g = texture2D(tDiffuse, uv).g;
                    col.b = texture2D(tDiffuse, uv - offset).b;
                    
                    float noise = random(uv + mod(time, 10.0));
                    float luminance = dot(col, vec3(0.299, 0.587, 0.114));
                    col -= (noise * (0.12 + anomaly * 0.8)) * (1.0 - luminance);
                    
                    float scanline = sin(gl_FragCoord.y * 1.5 - time * 10.0) * 0.04;
                    col -= scanline * luminance;
                    
                    float distSq = dot(centerUv, centerUv);
                    float vignettePulse = pulse * (exhaustion * 0.05); 
                    float vignetteRadius = 0.25 - (exhaustion * 0.15) - (anomaly * 0.1) + vignettePulse;
                    col *= smoothstep(0.9, vignetteRadius, distSq + 0.2); 
                    
                    float lateralDist = abs(centerUv.x);
                    col *= mix(1.0, smoothstep(0.45, 0.15, lateralDist), squeeze);
                    
                    col = mix(col, vec3(luminance * 0.6), anomaly * 0.85);
                    col = smoothstep(0.0, 1.0, col);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });
        const postPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
        this.postScene.add(postPlane);
        window.addEventListener('resize', () => this.resize(), false);
        setTimeout(() => this.resize(), 0);
    }

    resize() {
        let w = window.innerWidth;
        let h = window.innerHeight;
        if (this.aspectRatio !== 'auto') {
            const windowAspect = w / h;
            if (windowAspect > this.aspectRatio) {
                w = h * this.aspectRatio;
            } else {
                h = w / this.aspectRatio;
            }
        }
        const wrapper = document.getElementById('screen-wrapper');
        if (wrapper) {
            wrapper.style.width = `${w}px`;
            wrapper.style.height = `${h}px`;
        }
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        const scale = this.resolutionScale;
        this.renderer.setSize(w * scale, h * scale, false);
        this.target.setSize(w * scale, h * scale);
    }
    get delta() {
        const now = performance.now();
        if (!this._lastTime) this._lastTime = now;
        const diff = Math.min((now - this._lastTime) / 1000, 0.1);
        this._lastTime = now;
        return diff;
    }
    get time() {
        if (!this._startTime) this._startTime = performance.now();
        return (performance.now() - this._startTime) / 1000;
    }

    render() {
        this.renderer.setRenderTarget(this.target);
        this.renderer.render(this.scene, this.camera);
        this.postMaterial.uniforms.time.value = this.time;
        this.postMaterial.uniforms.exhaustion.value = this.exhaustion;
        this.postMaterial.uniforms.squeeze.value = this.squeeze || 0.0;
        this.postMaterial.uniforms.anomaly.value = this.anomaly || 0.0;
        this.postMaterial.uniforms.globalSeed.value = Math.random();
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postScene, this.postCamera);
    }
}