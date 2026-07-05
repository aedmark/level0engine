// RenderEngine.js
// LEVEL 0 CORE RENDER ENGINE

export default class RenderEngine {
    constructor() {
        this.aspectRatio = 'auto'; // Default state
        this.resolutionScale = 1.0; // Default rendering scale
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa89f68);
        this.scene.fog = new THREE.FogExp2(0xa89f68, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        this.renderer = new THREE.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        const ambient = new THREE.AmbientLight(0xffffe0, 0.45);
        this.scene.add(ambient);
        // POST-PROCESSING PIPELINE
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.exhaustion = 0.0; // Cross-class bridge variable

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
                    // 1. VHS Chromatic Aberration & Somatic Blur
                    vec2 offset = vec2(0.003, 0.0) * (uv.x - 0.5) * 2.0; 
                    float blurAmt = exhaustion * 0.012; // Terminal fatigue blur radius
                    vec3 col = vec3(0.0);
                    
                    // Base sharp sample
                    col.r = texture2D(tDiffuse, uv + offset).r;
                    col.g = texture2D(tDiffuse, uv).g;
                    col.b = texture2D(tDiffuse, uv - offset).b;
                    
                    if (exhaustion > 0.01) {
                        vec3 blur = vec3(0.0);
                        // Cheap 4-tap box blur for retinal fatigue
                        blur.r += texture2D(tDiffuse, uv + offset + vec2(blurAmt, blurAmt)).r;
                        blur.g += texture2D(tDiffuse, uv + vec2(blurAmt, blurAmt)).g;
                        blur.b += texture2D(tDiffuse, uv - offset + vec2(blurAmt, blurAmt)).b;
                        
                        blur.r += texture2D(tDiffuse, uv + offset + vec2(-blurAmt, -blurAmt)).r;
                        blur.g += texture2D(tDiffuse, uv + vec2(-blurAmt, -blurAmt)).g;
                        blur.b += texture2D(tDiffuse, uv - offset + vec2(-blurAmt, -blurAmt)).b;
                        
                        blur.r += texture2D(tDiffuse, uv + offset + vec2(-blurAmt, blurAmt)).r;
                        blur.g += texture2D(tDiffuse, uv + vec2(-blurAmt, blurAmt)).g;
                        blur.b += texture2D(tDiffuse, uv - offset + vec2(-blurAmt, blurAmt)).b;
                        
                        blur.r += texture2D(tDiffuse, uv + offset + vec2(blurAmt, -blurAmt)).r;
                        blur.g += texture2D(tDiffuse, uv + vec2(blurAmt, -blurAmt)).g;
                        blur.b += texture2D(tDiffuse, uv - offset + vec2(blurAmt, -blurAmt)).b;
                        
                        // Crossfade sharp vision into blurred vision based on exhaustion
                        col = mix(col, blur / 4.0, exhaustion);
                    }
                    
                    // 2. Animated Crawling Static
                    float noise = hash(uv * vec2(800.0, 800.0) + time * 15.0);
                    col += (noise - 0.5) * 0.07;
                    // 3. Rolling CRT Scanlines
                    float scanline = sin(uv.y * 800.0 - time * 10.0) * 0.02;
                    col -= scanline;
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
        // Force an initial dimension calculation on boot
        setTimeout(() => this.resize(), 0);
    }

    resize() {
        let w = window.innerWidth;
        let h = window.innerHeight;
        // Calculate letterboxing/pillarboxing if a strict aspect ratio is enforced
        if (this.aspectRatio !== 'auto') {
            const windowAspect = w / h;
            if (windowAspect > this.aspectRatio) {
                // Window is wider than needed; clamp width (pillarbox)
                w = h * this.aspectRatio;
            } else {
                // Window is taller than needed; clamp height (letterbox)
                h = w / this.aspectRatio;
            }
        }
        // Apply physical dimensions to the wrapper to crop the overlays perfectly
        const wrapper = document.getElementById('screen-wrapper');
        if (wrapper) {
            wrapper.style.width = `${w}px`;
            wrapper.style.height = `${h}px`;
        }
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        // Apply resolution scaling for performance and retro aesthetics
        const scale = this.resolutionScale;
        this.renderer.setSize(w * scale, h * scale, false); // false prevents overriding physical CSS size
        this.target.setSize(w * scale, h * scale);
    }

    get delta() {
        const now = performance.now();
        if (!this._lastTime) this._lastTime = now;

        // Calculate true thermodynamic delta and cap at 0.1s to prevent physics explosions on massive frame drops
        const diff = Math.min((now - this._lastTime) / 1000, 0.1);
        this._lastTime = now;

        return diff;
    }

    get time() {
        // Pure function: querying the time no longer cannibalizes the physics delta
        if (!this._startTime) this._startTime = performance.now();
        return (performance.now() - this._startTime) / 1000;
    }

    render() {
        // Pass 1: Render true 3D scene to the offscreen target
        this.renderer.setRenderTarget(this.target);
        this.renderer.render(this.scene, this.camera);
        // Pass 2: Update time variables, apply ShaderMaterial, and render to the physical screen
        this.postMaterial.uniforms.time.value = this.time;
        this.postMaterial.uniforms.exhaustion.value = this.exhaustion; // Push the somatic state to the GPU
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postScene, this.postCamera);
    }
}