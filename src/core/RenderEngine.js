import {DEFAULT_GROUND_COLOR, DEFAULT_ATMOSPHERE_COLOR} from '../world/Sectors.js';

export default class RenderEngine {
    constructor() {
        this.aspectRatio = 1.3333333333;
        this.resolutionScale = RenderEngine.getSavedResolutionScale();
        this.enablePostProcessing = RenderEngine.getSavedPostProcess();
        this.enableFXAA = RenderEngine.getSavedFXAA();
        this.timerQuantumMs = RenderEngine.detectTimerQuantum();
        this.smoothsDelta = this.timerQuantumMs >= 0.5;
        console.log(`[BOOT] Timer quantum ${this.timerQuantumMs.toFixed(4)}ms ` +
            `(crossOriginIsolated=${self.crossOriginIsolated === true}) — ` +
            `delta smoothing ${this.smoothsDelta ? 'ON' : 'off'}.`);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(DEFAULT_ATMOSPHERE_COLOR);
        this.scene.fog = new THREE.FogExp2(DEFAULT_ATMOSPHERE_COLOR, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        const logDepth = new URLSearchParams(window.location.search).has('logdepth');
        this.renderer = new THREE.WebGLRenderer({
            antialias: RenderEngine.getSavedAA() > 0,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: logDepth
        });
        this.renderer.debug.checkShaderErrors =
            new URLSearchParams(window.location.search).has('shaderdebug');
        this.renderer.setPixelRatio(1.0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        const shadowQuality = RenderEngine.getSavedShadowQuality();
        this.renderer.shadowMap.enabled = shadowQuality !== 'off';
        
        if (shadowQuality === 'low') {
            this.renderer.shadowMap.type = THREE.BasicShadowMap;
        } else if (shadowQuality === 'ultra') {
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        } else {
            this.renderer.shadowMap.type = THREE.PCFShadowMap;
        }
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const gammaSlider = document.getElementById('gammaSlider');
        this.baseExposure = gammaSlider ? Number(gammaSlider.value) / 100 : 1.40;
        this.renderer.toneMappingExposure = this.baseExposure;
        if ('outputColorSpace' in this.renderer) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        this.ambientLight = new THREE.HemisphereLight(0xfffbe5, DEFAULT_GROUND_COLOR, 0.30);
        this.scene.add(this.ambientLight);
        this.lightningLight = new THREE.DirectionalLight(0xdbe6ff, 0);
        this.lightningLight.castShadow = false;
        this.scene.add(this.lightningLight);
        this.scene.add(this.lightningLight.target);
        const aaSamples = RenderEngine.getSavedAA();
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            samples: aaSamples > 0 ? aaSamples : 0
        });
        this.fxaaTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter
        });
        this.fxaaScene = new THREE.Scene();
        this.fxaaCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.fxaaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {value: this.target.texture},
                resolution: {value: new THREE.Vector2(1 / window.innerWidth, 1 / window.innerHeight)}
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
                uniform vec2 resolution;
                varying vec2 vUv;
                void main() {
                    float FXAA_SPAN_MAX = 8.0;
                    float FXAA_REDUCE_MUL = 1.0 / 8.0;
                    float FXAA_REDUCE_MIN = 1.0 / 128.0;
                    vec3 luma = vec3(0.299, 0.587, 0.114);

                    vec3 rgbNW = texture2D(tDiffuse, vUv + (vec2(-1.0, -1.0) * resolution)).rgb;
                    vec3 rgbNE = texture2D(tDiffuse, vUv + (vec2(1.0, -1.0) * resolution)).rgb;
                    vec3 rgbSW = texture2D(tDiffuse, vUv + (vec2(-1.0, 1.0) * resolution)).rgb;
                    vec3 rgbSE = texture2D(tDiffuse, vUv + (vec2(1.0, 1.0) * resolution)).rgb;
                    vec3 rgbM  = texture2D(tDiffuse, vUv).rgb;

                    float lumaNW = dot(rgbNW, luma);
                    float lumaNE = dot(rgbNE, luma);
                    float lumaSW = dot(rgbSW, luma);
                    float lumaSE = dot(rgbSE, luma);
                    float lumaM  = dot(rgbM, luma);

                    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
                    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

                    vec2 dir;
                    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
                    dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

                    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
                    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
                    dir = clamp(dir * rcpDirMin, vec2(-FXAA_SPAN_MAX), vec2(FXAA_SPAN_MAX)) * resolution;

                    vec3 rgbA = 0.5 * (
                        texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
                        texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
                    vec3 rgbB = rgbA * 0.5 + 0.25 * (
                        texture2D(tDiffuse, vUv + dir * -0.5).rgb +
                        texture2D(tDiffuse, vUv + dir * 0.5).rgb);

                    float lumaB = dot(rgbB, luma);
                    vec3 result = (lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB;
                    gl_FragColor = vec4(result, 1.0);
                }
            `
        });
        const fxaaPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.fxaaMaterial);
        this.fxaaScene.add(fxaaPlane);
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.exhaustion = 0.0;
        this.currentHeat = 0.0;
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
                enableVHS: {value: 1.0},
                exposure: {value: this.baseExposure || 0.70}
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
                uniform float exposure;
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
                    if (anomaly > 0.01 || panic > 0.01) {
                        float gpuSeed = random(uv + time);
                        float intensity = max(anomaly, pCurve * 1.5);
                        float tearThreshold = 0.98 - (pCurve * 0.3);
                        float tear = step(tearThreshold, sin(uv.y * (40.0 + pCurve * 60.0) + time * 15.0));
                        uv.x += tear * (gpuSeed - 0.5) * intensity * 0.3;
                        uv.y += tear * (gpuSeed - 0.5) * intensity * 0.05;
                    }
                    uv.x += phaseBand * 0.0002 * sin(time * 50.0) * stressGate * enableVHS;
                    float heartbeatCA = exhaustion > 0.3 ? sin(time * (10.0 + exhaustion * 5.0)) * 0.004 * exhaustion : 0.0;
                    float panicTear = panic > 0.3 ? (sin(time * 25.0) * 0.02 * pCurve) : 0.0;
                    float caShift = (0.0005 + (distSq * 0.0015)) * stressGate * enableVHS + (squeeze * 0.003) + (anomaly * anomaly * sqrt(anomaly)) * 0.05 + (exhaustion * exhaustion) * 0.01 + heartbeatCA + panicTear;
                    vec2 offset = vec2(caShift, 0.0); 
                    vec2 heatOffset = vec2(0.0);
                    if (heat > 0.01) {
                        float swirlAngle = sin(uv.y * 8.0 + time * 0.6) * 0.6 + cos(uv.x * 6.0 - time * 0.4) * 0.6;
                        vec2 swirlUv = uv + vec2(cos(swirlAngle), sin(swirlAngle)) * 0.015 * heat;
                        float wave1 = sin(swirlUv.x * 22.0 + time * 6.0) * sin(swirlUv.y * 18.0 - time * 4.0);
                        float wave2 = sin(swirlUv.x * 55.0 - time * 9.0 + wave1 * 2.0) * sin(swirlUv.y * 47.0 + time * 7.0);
                        float wave3 = sin(swirlUv.x * 90.0 + time * 13.0) * cos(swirlUv.y * 80.0 - time * 11.0);
                        float heatWave = wave1 * 0.55 + wave2 * 0.30 + wave3 * 0.15;
                        heatOffset = vec2(heatWave * 0.004, heatWave * 0.011) * heat;
                    }
                    vec2 sampleUv = uv + heatOffset;
                    vec3 col;
                    vec3 fauxHalation;
                    if (stressLevel < 0.02 && enableVHS < 0.01) {
                        vec4 tex = texture2D(tDiffuse, sampleUv);
                        col = tex.rgb;
                        fauxHalation = tex.rgb * 0.6;
                    } else {
                        vec4 texR = texture2D(tDiffuse, sampleUv + offset);
                        vec4 texG = texture2D(tDiffuse, sampleUv);
                        vec4 texB = texture2D(tDiffuse, sampleUv - offset);
                        col = vec3(texR.r, texG.g, texB.b);
                        fauxHalation = (texR.rgb + texB.rgb) * 0.3;
                        
                        if (enableVHS > 0.01) {
                            float cb = 0.0015;
                            vec3 c1 = texture2D(tDiffuse, sampleUv + vec2(cb, 0.0)).rgb;
                            vec3 c2 = texture2D(tDiffuse, sampleUv + vec2(cb * 2.0, 0.0)).rgb;
                            vec3 c3 = texture2D(tDiffuse, sampleUv + vec2(cb * 3.0, 0.0)).rgb;
                            vec3 c4 = texture2D(tDiffuse, sampleUv + vec2(-cb, 0.0)).rgb;
                            
                            vec3 blurred = (texG.rgb + c1 + c2 + c3 + c4) * 0.2;
                            float origLuma = dot(col, vec3(0.299, 0.587, 0.114));
                            float blurredLuma = dot(blurred, vec3(0.299, 0.587, 0.114));
                            
                            vec3 vhsCol = blurred + (origLuma - blurredLuma);
                            col = mix(col, vhsCol, enableVHS);
                        }
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
                    float luminance = dot(col, vec3(0.299, 0.587, 0.114));
                    col += max(vec3(0.0), fauxHalation - 0.5) * 0.15 * enableVHS;
                    float noise = random(uv + mod(time, 10.0));
                    col -= (noise * (0.015 * enableVHS + darkness * 0.15 + anomaly * 0.9)) * (1.0 - luminance);
                    float scanline = sin((uv.y - time * 0.02) * 800.0) * (0.015 * enableVHS + exhaustion * 0.05); 
                    col -= scanline * luminance;
                    col += phaseBand * 0.004 * (1.0 + noise) * enableVHS;
                    col += vec3(adrenaline * 0.25, 0.0, 0.0) * distSq;
                    col += max(vec3(0.0), col - 0.5) * adrenaline * 1.2;
                    float vignettePulse = sin(time * (8.0 + adrenaline * 10.0)) * (exhaustion * 0.05 + adrenaline * 0.05); 
                    float vignetteRadius = 0.35 - (exhaustion * 0.12) - (anomaly * 0.15) - (darkness * 0.15) + vignettePulse;
                    vignetteRadius = max(0.02, vignetteRadius);
                    col *= smoothstep(0.9, vignetteRadius, distSq + 0.15); 
                    float lateralDist = abs(centerUv.x);
                    col *= mix(1.0, smoothstep(0.45, 0.15, lateralDist), squeeze);
                    col = mix(col, vec3(luminance * 0.6), anomaly * 0.85);
                    col = mix(col, vec3(luminance * 0.15), darkness * 0.8 * smoothstep(0.0, 0.5, distSq));
                    col = mix(col, vec3(0.02) * noise, eyesClosed);
                    col *= border;
                    col *= (exposure / 0.70);
                    col = smoothstep(0.0, 1.0, col);
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

    static getSavedState() {
        if (RenderEngine._savedState) return RenderEngine._savedState;
        try {
            const raw = localStorage.getItem('level0_state');
            RenderEngine._savedState = raw ? JSON.parse(raw) : {};
        } catch (e) {
            RenderEngine._savedState = {};
        }
        return RenderEngine._savedState;
    }

    static getSavedResolutionScale() {
        const state = RenderEngine.getSavedState();
        const parsed = parseFloat(state.res);
        return Number.isFinite(parsed) ? parsed : 1.0;
    }

    static getSavedAA() {
        const state = RenderEngine.getSavedState();
        if (state.aa === true) return 4;
        if (state.aa === false) return 0;
        return parseInt(state.aa) || 0;
    }

    static getSavedPostProcess() {
        const state = RenderEngine.getSavedState();
        return state.post !== false;
    }

    static getSavedFXAA() {
        const state = RenderEngine.getSavedState();
        return state.fxaa === true;
    }

    static getSavedMaxShadowLights() {
        const state = RenderEngine.getSavedState();
        return state.shadowLights !== undefined ? parseInt(state.shadowLights) : 6;
    }

    static getSavedShadowQuality() {
        const state = RenderEngine.getSavedState();
        return state.shadows || 'high';
    }

    static getSavedRenderDistance() {
        const state = RenderEngine.getSavedState();
        return state.renderDist !== undefined ? parseInt(state.renderDist) : 1;
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
        this.fxaaTarget.setSize(renderW, renderH);
        this.fxaaMaterial.uniforms.resolution.value.set(1 / renderW, 1 / renderH);
    }

    static detectTimerQuantum() {
        let prev = performance.now();
        let min = Infinity;
        const end = prev + 8;
        while (performance.now() < end) {
            const now = performance.now();
            if (now !== prev) {
                const step = now - prev;
                if (step < min) min = step;
                prev = now;
            }
        }
        return min === Infinity ? 0 : min;
    }

    get delta() {
        const now = performance.now();
        if (!this._lastTime) this._lastTime = now;
        const raw = Math.min((now - this._lastTime) / 1000, 0.1);
        this._lastTime = now;
        if (!this.smoothsDelta) return raw;
        if (this._emaDelta === undefined) this._emaDelta = raw;
        this._emaDelta += (raw - this._emaDelta) * 0.25;
        return this._emaDelta;
    }

    get time() {
        const now = performance.now();
        if (!this._startTime) this._startTime = now;
        return (now - this._startTime) / 1000;
    }

    render() {
        if (this.enablePostProcessing) {
            this.renderer.setRenderTarget(this.target);
            this.renderer.render(this.scene, this.camera);
            if (this.enableFXAA) {
                this.fxaaMaterial.uniforms.tDiffuse.value = this.target.texture;
                this.renderer.setRenderTarget(this.fxaaTarget);
                this.renderer.render(this.fxaaScene, this.fxaaCamera);
                this.postMaterial.uniforms.tDiffuse.value = this.fxaaTarget.texture;
            } else {
                this.postMaterial.uniforms.tDiffuse.value = this.target.texture;
            }
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
            this.postMaterial.uniforms.exposure.value = this.baseExposure !== undefined ? this.baseExposure : 0.70;
            if (this.glareColor) this.postMaterial.uniforms.glareColor.value.copy(this.glareColor);
            if (this.heatTarget !== undefined) {
                if (this.currentHeat === undefined) this.currentHeat = 0.0;
                this.currentHeat += (this.heatTarget - this.currentHeat) * 0.016 * 2.0;
                this.postMaterial.uniforms.heat.value = this.currentHeat;
            }
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.postScene, this.postCamera);
        } else if (this.enableFXAA) {
            this.renderer.setRenderTarget(this.target);
            this.renderer.render(this.scene, this.camera);
            this.fxaaMaterial.uniforms.tDiffuse.value = this.target.texture;
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.fxaaScene, this.fxaaCamera);
            if (this.heatTarget !== undefined) {
                if (this.currentHeat === undefined) this.currentHeat = 0.0;
                this.currentHeat += (this.heatTarget - this.currentHeat) * 0.016 * 2.0;
            }
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