// RenderEngine.js
// LEVEL 0 CORE RENDER ENGINE

export default class RenderEngine {
    constructor() {
        this.aspectRatio = 'auto';
        this.resolutionScale = 1.0;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa89f68);
        this.scene.fog = new THREE.FogExp2(0xa89f68, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        this.renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: "high-performance"});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        const ambient = new THREE.AmbientLight(0xffffe0, 0.15);
        this.scene.add(ambient);
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.exhaustion = 0.0;
        this.postMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {value: this.target.texture},
                time: {value: 0.0},
                exhaustion: {value: 0.0}
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
                varying vec2 vUv;
                
                float hash(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * .1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }
                
                void main() {
                    vec2 uv = vUv;
                    vec2 offset = vec2(0.001, 0.0) * (uv.x - 0.5) * 2.0; 
                    float blurAmt = exhaustion * 0.012; 
                    vec3 col = vec3(0.0);
                    
                    // 1. Base Chromatic Aberration
                    col.r = texture2D(tDiffuse, uv + offset).r;
                    col.g = texture2D(tDiffuse, uv).g;
                    col.b = texture2D(tDiffuse, uv - offset).b;
                    
                    // 2. Unified Somatic Blur (Ephemeralized 4-tap radial)
                    if (exhaustion > 0.01) {
                        vec3 blur;
                        blur.r = texture2D(tDiffuse, uv + offset + vec2(blurAmt, blurAmt)).r 
                               + texture2D(tDiffuse, uv + offset + vec2(-blurAmt, -blurAmt)).r;
                        blur.g = texture2D(tDiffuse, uv + vec2(-blurAmt, blurAmt)).g 
                               + texture2D(tDiffuse, uv + vec2(blurAmt, -blurAmt)).g;
                        blur.b = texture2D(tDiffuse, uv - offset + vec2(blurAmt, -blurAmt)).b 
                               + texture2D(tDiffuse, uv - offset + vec2(-blurAmt, blurAmt)).b;
                        
                        col = mix(col, blur * 0.5, exhaustion);
                    }
                    
                    // 3. High-Frequency Crawling Static & Rolling Scanlines
                    float noise = hash(uv * vec2(800.0, 800.0) + time * 15.0);
                    float scanline = sin(uv.y * 800.0 - time * 10.0) * 0.02;
                    col += (noise - 0.5) * 0.07 - scanline;
                    
                    // 4. Claustrophobic Vignette
                    float dist = distance(uv, vec2(0.5));
                    col *= smoothstep(0.8, 0.25, dist * dist + 0.3);
                    
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
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postScene, this.postCamera);
    }
}