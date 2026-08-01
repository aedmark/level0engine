/**
 * Wraps Three.js to provide the core graphics pipeline, post-processing, and viewport scaling.
 *
 * Educational Note: This engine utilizes a "deferred" or "post-processing" style pipeline.
 * Instead of drawing directly to the screen, we draw the 3D scene into an off-screen buffer
 * (`this.target`). We then map that buffer onto a 2D plane (`postPlane`) and run a custom
 * GLSL fragment shader over it to apply CRT curves, chromatic aberration, and paranoia tearing.
 */
export default class RenderEngine {
    /**
     * Bootstraps the WebGL pipeline, establishes the Three.js scene, configures
     * the volumetric fog patch, and compiles the post-processing shader stack.
     */
    constructor() {
        if (!THREE.__radialFogPatched) {
            THREE.ShaderChunk.fog_vertex = THREE.ShaderChunk.fog_vertex.replace(
                /vFogDepth\s*=\s*-\s*mvPosition\.z\s*;/,
                'vFogDepth = length( mvPosition.xyz );'
            );
            THREE.__radialFogPatched = true;
        }
        this.aspectRatio = 1.3333333333;
        this.resolutionScale = RenderEngine.getSavedResolutionScale();
        this.enablePostProcessing = RenderEngine.getSavedPostProcess();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa89f68);
        this.scene.fog = new THREE.FogExp2(0xa89f68, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        const logDepth = !new URLSearchParams(window.location.search).has('nologdepth');
        this.renderer = new THREE.WebGLRenderer({
            antialias: RenderEngine.getSavedAA(),
            powerPreference: "high-performance",
            logarithmicDepthBuffer: logDepth
        });
        this.renderer.setPixelRatio(1.0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        const shadowQuality = RenderEngine.getSavedShadowQuality();
        this.renderer.shadowMap.enabled = shadowQuality !== 'off';
        // Both PCF variants take nine taps; the soft one weights them by the fractional
        // position within the texel instead of snapping to texel centres, so the extra cost is
        // arithmetic rather than bandwidth. This is global -- flashlight, warden, and every
        // LumenGrid slot inherit it.
        //
        // Worth knowing before tuning: the PCF kernel is measured in texels, not world units,
        // so shadow softness is inversely coupled to shadow map resolution. Raising the atrium
        // spots to 2048 shrank each texel to a quarter of its former footprint, which is what
        // fixed the combing and also what made the remaining edges read harder. If these are
        // still too crisp, the next dial is DOWN to 1024 in LumenGrid, not up.
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        // The gamma slider writes `baseExposure`, not `toneMappingExposure` directly. Pupil
        // adaptation in `Environment.updateLights` multiplies this every frame to produce the
        // live exposure, so the two need separate storage -- otherwise each write clobbers the
        // other and whichever ran last that frame wins. This value is the player's preference;
        // `toneMappingExposure` is that preference as their eyes currently have it.
        this.baseExposure = 1.2;
        this.renderer.toneMappingExposure = this.baseExposure;
        if ('outputColorSpace' in this.renderer) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        this.ambientLight = new THREE.HemisphereLight(0xfff5c2, 0x3d3520, 0.45);
        this.scene.add(this.ambientLight);
        this.globalShadowLight = new THREE.SpotLight(0xfff5c2, 0.40);
        this.globalShadowLight.angle = 1.0;
        this.globalShadowLight.penumbra = 0.8;
        this.globalShadowLight.distance = 30.0;
        this.globalShadowLight.decay = 0.5;
        this.globalShadowLight.castShadow = shadowQuality !== 'off';
        this.globalShadowLight.shadow.mapSize.width = shadowQuality === 'low' ? 512 : 1024;
        this.globalShadowLight.shadow.mapSize.height = shadowQuality === 'low' ? 512 : 1024;
        this.globalShadowLight.shadow.camera.near = 1.0;
        this.globalShadowLight.shadow.camera.far = 30.0;
        this.globalShadowLight.shadow.bias = -0.0005;
        this.scene.add(this.globalShadowLight);
        this.scene.add(this.globalShadowLight.target);
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            samples: RenderEngine.getSavedAA() ? 4 : 0
        });
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.exhaustion = 0.0;
        this.currentHeat = 0.0;
        /**
         * The Somatic Shader. Handles all post-processing effects including:
         * CRT curvature, chromatic aberration, exhaustion vignettes, paranoia tearing,
         * blink state, heat waves, and anomalous visual corruption.
         *
         *  A ShaderMaterial lets us write raw WebGL (GLSL) code.
         * `uniforms` are variables passed from the CPU (JavaScript) to the GPU (GLSL)
         * every frame. By feeding our player's metabolic stats (panic, exhaustion)
         * into these uniforms, the shader mathematically warps the pixels on the GPU,
         * which is vastly faster than trying to calculate screen-distortion on the CPU.
         */
        this.postMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {value: this.target.texture},
                time: {value: 0.0},
                exhaustion: {value: 0.0},
                squeeze: {value: 0.0},
                anomaly: {value: 0.0},
                darkness: {value: 0.0},
                panic: {value: 0.0},
                adrenaline: {value: 0.0},
                eyesClosed: {value: 0.0},
                heat: {value: 0.0},
                glare: {value: 0.0},
                glareColor: {value: new THREE.Color(1, 1, 1)},
                enableVHS: {value: 1.0}
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
                uniform float darkness;
                uniform float panic;
                uniform float globalSeed;
                uniform float adrenaline;
                uniform float eyesClosed;
                uniform float heat;
                uniform float glare;
                uniform vec3 glareColor;
                uniform float enableVHS;
                varying vec2 vUv;
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                vec3 linearToSRGB(vec3 value) {
                    vec3 lo = value * 12.92;
                    vec3 hi = pow(value, vec3(1.0 / 2.4)) * 1.055 - vec3(0.055);
                    return mix(lo, hi, step(vec3(0.0031308), value));
                }
                vec2 curve(vec2 uv) {
                    vec2 coord = uv * 2.0 - 1.0;
                    coord *= 1.1;
                    coord.x *= 1.0 + (coord.y * coord.y) * 0.04;
                    coord.y *= 1.0 + (coord.x * coord.x) * 0.0625;
                    return coord * 0.46 + 0.5;
                }
                void main() {
                    vec2 uv = mix(vUv, curve(vUv), enableVHS);
                    vec2 centerUv = uv - 0.5;
                    float distSq = dot(centerUv, centerUv);
                    // Screen Border Cutoff
                    float border = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x) * 
                                   smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.97, uv.y);
                    border = mix(1.0, border, enableVHS);
                    if (border <= 0.0) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        return;
                    }
                    float phasePos = fract(time * 0.05);
                    float phaseBand = 1.0 - smoothstep(0.0, 0.02, abs(uv.y - phasePos));
                    float pCurve = panic * panic * panic;
                    float stressLevel = max(squeeze, max(anomaly, max(exhaustion, max(panic, adrenaline))));
                    float stressGate = smoothstep(0.0, 0.2, stressLevel);
                    // Paranoia / Anomaly Tearing
                    if (anomaly > 0.01 || panic > 0.01) {
                        float gpuSeed = random(uv + time);
                        float intensity = max(anomaly, pCurve * 1.5);
                        float tearThreshold = 0.98 - (pCurve * 0.3);
                        float tear = step(tearThreshold, sin(uv.y * (40.0 + pCurve * 60.0) + time * 15.0));
                        uv.x += tear * (gpuSeed - 0.5) * intensity * 0.3;
                        uv.y += tear * (gpuSeed - 0.5) * intensity * 0.05;
                    }
                    // VHS Tracking Error
                    uv.x += phaseBand * 0.0002 * sin(time * 50.0) * stressGate * enableVHS;
                    // Chromatic Aberration
                    float heartbeatCA = exhaustion > 0.3 ? sin(time * (10.0 + exhaustion * 5.0)) * 0.004 * exhaustion : 0.0;
                    float panicTear = panic > 0.3 ? (sin(time * 25.0) * 0.02 * pCurve) : 0.0;
                    float caShift = (0.0005 + (distSq * 0.0015)) * stressGate * enableVHS + (squeeze * 0.003) + (anomaly * anomaly * sqrt(anomaly)) * 0.05 + (exhaustion * exhaustion) * 0.01 + heartbeatCA + panicTear;
                    vec2 offset = vec2(caShift, 0.0); 
                    // Sector Environmental Distortion
                    vec2 heatOffset = vec2(0.0);
                    if (heat > 0.01) {
                        // Domain warp: bend the sampling direction before we lay waves onto it,
                        // so the plume swirls and curls instead of scrolling in a straight grid.
                        float swirlAngle = sin(uv.y * 8.0 + time * 0.6) * 0.6 + cos(uv.x * 6.0 - time * 0.4) * 0.6;
                        vec2 swirlUv = uv + vec2(cos(swirlAngle), sin(swirlAngle)) * 0.015 * heat;
                        // Layered turbulence: a broad base wave plus two smaller, faster waves
                        // stacked on top for a granular, boiling shimmer rather than one smooth ripple.
                        float wave1 = sin(swirlUv.x * 22.0 + time * 6.0) * sin(swirlUv.y * 18.0 - time * 4.0);
                        float wave2 = sin(swirlUv.x * 55.0 - time * 9.0 + wave1 * 2.0) * sin(swirlUv.y * 47.0 + time * 7.0);
                        float wave3 = sin(swirlUv.x * 90.0 + time * 13.0) * cos(swirlUv.y * 80.0 - time * 11.0);
                        float heatWave = wave1 * 0.55 + wave2 * 0.30 + wave3 * 0.15;
                        heatOffset = vec2(heatWave * 0.004, heatWave * 0.011) * heat;
                    }
                    vec2 sampleUv = uv + heatOffset;
                    vec3 col;
                    vec3 fauxHalation;
                    if (caShift < 0.0001) {
                        vec4 tex = texture2D(tDiffuse, sampleUv);
                        col = tex.rgb;
                        fauxHalation = tex.rgb * 0.6;
                    } else {
                        vec4 texR = texture2D(tDiffuse, sampleUv + offset);
                        vec4 texG = texture2D(tDiffuse, sampleUv);
                        vec4 texB = texture2D(tDiffuse, sampleUv - offset);
                        col = vec3(texR.r, texG.g, texB.b);
                        fauxHalation = (texR.rgb + texB.rgb) * 0.3;
                    }
                    if (glare > 0.01) {
                        float gBlur = glare * 0.03;
                        vec3 blurCol = vec3(0.0);
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(gBlur, gBlur)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(-gBlur, gBlur)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(gBlur, -gBlur)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(-gBlur, -gBlur)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(0.0, gBlur * 1.5)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(0.0, -gBlur * 1.5)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(gBlur * 1.5, 0.0)).rgb;
                        blurCol += texture2D(tDiffuse, sampleUv + vec2(-gBlur * 1.5, 0.0)).rgb;
                        col = mix(col, blurCol * 0.125, clamp(glare * 2.5, 0.0, 1.0));
                        col += glareColor * (glare * 0.9);
                    }
                    // Image Adjustments
                    float luminance = dot(col, vec3(0.299, 0.587, 0.114));
                    col += max(vec3(0.0), fauxHalation - 0.5) * 0.15 * enableVHS;
                    float noise = random(uv + mod(time, 10.0));
                    col -= (noise * (0.015 * enableVHS + darkness * 0.15 + anomaly * 0.9)) * (1.0 - luminance);
                    float scanline = sin((uv.y - time * 0.02) * 800.0) * (0.015 * enableVHS + exhaustion * 0.05); 
                    col -= scanline * luminance;
                    col += phaseBand * 0.004 * (1.0 + noise) * enableVHS;
                    // Adrenaline Overlay
                    col += vec3(adrenaline * 0.25, 0.0, 0.0) * distSq;
                    col += max(vec3(0.0), col - 0.5) * adrenaline * 1.2;
                    // Somatic Vignettes
                    float vignettePulse = sin(time * (8.0 + adrenaline * 10.0)) * (exhaustion * 0.05 + adrenaline * 0.05); 
                    float vignetteRadius = 0.35 - (exhaustion * 0.12) - (anomaly * 0.15) - (darkness * 0.15) + vignettePulse;
                    vignetteRadius = max(0.02, vignetteRadius);
                    col *= smoothstep(0.9, vignetteRadius, distSq + 0.15); 
                    float lateralDist = abs(centerUv.x);
                    col *= mix(1.0, smoothstep(0.45, 0.15, lateralDist), squeeze);
                    // Desaturation / Blackout
                    col = mix(col, vec3(luminance * 0.6), anomaly * 0.85);
                    col = mix(col, vec3(luminance * 0.15), darkness * 0.8 * smoothstep(0.0, 0.5, distSq));
                    col = mix(col, vec3(0.02) * noise, eyesClosed);
                    col *= border;
                    col = smoothstep(0.0, 1.0, col);
                    // Final linear -> sRGB encode. Must be the last step (see linearToSRGB above) --
                    // everything before this, including the smoothstep contrast curve, is grading
                    // done in linear space.
                    col = linearToSRGB(clamp(col, 0.0, 1.0));
                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });
        const postPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
        this.postScene.add(postPlane);
        window.addEventListener('resize', () => this.resize(), false);
        setTimeout(() => this.resize(), 0);
    }

    /**
     * Reads the internal resolution scale the player last explicitly chose via the
     * settings menu, persisted by SaveManager as `res` inside the `level0_state`
     * localStorage blob. Falls back to 1.0 (native) whenever no saved state exists yet,
     * storage is unavailable (e.g. private browsing), or the stored value is malformed --
     * mirroring the `parseFloat(state.res) || 1.0` fallback SaveManager.loadState() uses.
     *
     * Read directly from localStorage (rather than waiting on SaveManager) because
     * RenderEngine is constructed before SaveManager exists, and the render target/canvas
     * need the correct size on the very first frame instead of being resized a moment later.
     *
     * @returns {number} The resolution scale to boot with.
     */
    static getSavedResolutionScale() {
        try {
            const raw = localStorage.getItem('level0_state');
            if (!raw) return 1.0;
            const state = JSON.parse(raw);
            const parsed = parseFloat(state.res);
            return Number.isFinite(parsed) ? parsed : 1.0;
        } catch (e) {
            return 1.0;
        }
    }

    /**
     * Reads the anti-aliasing preference from localStorage.
     * Defaults to false for performance.
     * @returns {boolean} Whether AA should be enabled.
     */
    static getSavedAA() {
        try {
            const raw = localStorage.getItem('level0_state');
            if (!raw) return false;
            const state = JSON.parse(raw);
            return state.aa === true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Reads the post-processing preference from localStorage.
     * Defaults to true for full fidelity.
     * @returns {boolean} Whether post-processing should be enabled.
     */
    static getSavedPostProcess() {
        try {
            const raw = localStorage.getItem('level0_state');
            if (!raw) return true;
            const state = JSON.parse(raw);
            return state.post !== false;
        } catch (e) {
            return true;
        }
    }

    static getSavedShadowQuality() {
        try {
            const raw = localStorage.getItem('level0_state');
            if (!raw) return 'high';
            const state = JSON.parse(raw);
            return state.shadows || 'high';
        } catch (e) {
            return 'high';
        }
    }

    static getSavedRenderDistance() {
        try {
            const raw = localStorage.getItem('level0_state');
            if (!raw) return 1;
            const state = JSON.parse(raw);
            return state.renderDist !== undefined ? parseInt(state.renderDist) : 1;
        } catch (e) {
            return 1;
        }
    }

    /**
     * Calculates the canvas dimensions while enforcing the target aspect ratio.
     * Scales the internal render target to match pixel ratios.
     */
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
        w = Math.floor(w);
        h = Math.floor(h);
        if (w % 2 !== 0) w -= 1;
        if (h % 2 !== 0) h -= 1;
        const wrapper = document.getElementById('screen-wrapper');
        if (wrapper) {
            wrapper.style.width = `${w}px`;
            wrapper.style.height = `${h}px`;
        }
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        const scale = this.resolutionScale;
        const renderW = Math.floor(w * scale);
        const renderH = Math.floor(h * scale);
        this.renderer.setSize(renderW, renderH, false);
        this.target.setSize(renderW, renderH);
    }

    /**
     * @returns {number} The time delta in seconds since the last frame, capped at 0.1s.
     */
    get delta() {
        const now = performance.now();
        if (!this._lastTime) this._lastTime = now;
        const diff = Math.min((now - this._lastTime) / 1000, 0.1);
        this._lastTime = now;
        return diff;
    }

    /**
     * @returns {number} Global elapsed time since engine boot, in seconds.
     */
    get time() {
        if (!this._startTime) this._startTime = performance.now();
        return (performance.now() - this._startTime) / 1000;
    }

    /**
     * The core rendering pipeline execution.
     * 1. Renders the main scene into a raw diffuse texture.
     * 2. Pumps telemetry data into the somatic shader uniforms.
     * 3. Renders the final post-processed composition to the screen.
     */
    render() {
        if (this.globalShadowLight) {
            this.globalShadowLight.position.set(this.camera.position.x, 15.0, this.camera.position.z);
            this.globalShadowLight.target.position.set(this.camera.position.x, 0.0, this.camera.position.z);
        }
        
        if (this.enablePostProcessing) {
            this.renderer.setRenderTarget(this.target);
            this.renderer.render(this.scene, this.camera);
            this.postMaterial.uniforms.time.value = this.time;
            this.postMaterial.uniforms.exhaustion.value = this.exhaustion;
            this.postMaterial.uniforms.squeeze.value = this.squeeze || 0.0;
            this.postMaterial.uniforms.anomaly.value = this.anomaly || 0.0;
            this.postMaterial.uniforms.darkness.value = this.darkness || 0.0;
            this.postMaterial.uniforms.panic.value = this.paranoia || 0.0;
            this.postMaterial.uniforms.adrenaline.value = this.adrenaline || 0.0;
            this.postMaterial.uniforms.eyesClosed.value = this.eyesClosed || 0.0;
            this.postMaterial.uniforms.glare.value = this.glare || 0.0;
            this.postMaterial.uniforms.enableVHS.value = 1.0;
            if (this.glareColor) this.postMaterial.uniforms.glareColor.value.copy(this.glareColor);
            if (this.heatTarget !== undefined) {
                if (this.currentHeat === undefined) this.currentHeat = 0.0;
                this.currentHeat += (this.heatTarget - this.currentHeat) * 0.016 * 2.0;
                this.postMaterial.uniforms.heat.value = this.currentHeat;
            }
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.postScene, this.postCamera);
        } else {
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.scene, this.camera);
            if (this.heatTarget !== undefined) {
                if (this.currentHeat === undefined) this.currentHeat = 0.0;
                this.currentHeat += (this.heatTarget - this.currentHeat) * 0.016 * 2.0;
            }
        }
    }
}