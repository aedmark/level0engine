// RenderEngine.js
// LEVEL 0 CORE RENDER ENGINE

export default class RenderEngine {
    constructor() {
        this.aspectRatio = 1.3333333333;
        this.resolutionScale = 0.5;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa89f68);
        this.scene.fog = new THREE.FogExp2(0xa89f68, 0.05);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6;
        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl2', {antialias: false, powerPreference: "high-performance"});
        if (!this.gl) this.gl = this.canvas.getContext('webgl', {
            antialias: false,
            powerPreference: "high-performance"
        });
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            context: this.gl,
            antialias: false,
            powerPreference: "high-performance"
        });
        this.renderer.setPixelRatio(1.0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(this.canvas);
        this.ambientLight = new THREE.HemisphereLight(0xfff5c2, 0x3d3520, 0.85);
        this.scene.add(this.ambientLight);
        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter
        });
        this.exhaustion = 0.0;
        const quadVertices = new Float32Array([
            -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
        ]);
        this.nativeQuadBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nativeQuadBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);
        const vertSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        const fragSource = `
            precision highp float;
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
            varying vec2 vUv;
            float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
            vec2 curve(vec2 uv) {
                vec2 coord = uv * 2.0 - 1.0;
                coord *= 1.1;
                coord.x *= 1.0 + (coord.y * coord.y) * 0.04;
                coord.y *= 1.0 + (coord.x * coord.x) * 0.0625;
                return coord * 0.46 + 0.5;
            }
            void main() {
                vec2 uv = curve(vUv);
                vec2 centerUv = uv - 0.5;
                float distSq = dot(centerUv, centerUv);
                float border = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x) *
                                smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.97, uv.y);
                if (border <= 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
                float phasePos = fract(time * 0.05);
                float phaseBand = 1.0 - smoothstep(0.0, 0.02, abs(uv.y - phasePos));
                float pCurve = pow(panic, 3.0);
                if (anomaly > 0.01 || panic > 0.01) {
                    float intensity = max(anomaly, pCurve * 1.5);
                    float tearThreshold = 0.98 - (pCurve * 0.3);
                    float tear = step(tearThreshold, sin(uv.y * (40.0 + pCurve * 60.0) + time * 15.0));
                    uv.x += tear * (globalSeed - 0.5) * intensity * 0.3;
                    uv.y += tear * (globalSeed - 0.5) * intensity * 0.05;
                }
                uv.x += phaseBand * 0.0002 * sin(time * 50.0);
                float heartbeatCA = exhaustion > 0.3 ? sin(time * (10.0 + exhaustion * 5.0)) * 0.004 * exhaustion : 0.0;
                float panicTear = panic > 0.3 ? (sin(time * 25.0) * 0.02 * pCurve) : 0.0;
                float caShift = 0.0005 + (distSq * 0.0015) + (squeeze * 0.003) + pow(anomaly, 1.5) * 0.05 + pow(exhaustion, 2.0) * 0.01 + heartbeatCA + panicTear;
                vec2 offset = vec2(caShift, 0.0);
                vec4 texR = texture2D(tDiffuse, uv + offset);
                vec4 texG = texture2D(tDiffuse, uv);
                vec4 texB = texture2D(tDiffuse, uv - offset);
                vec3 col = vec3(texR.r, texG.g, texB.b);
                float luminance = dot(col, vec3(0.299, 0.587, 0.114));
                vec3 fauxHalation = (texR.rgb + texB.rgb) * 0.3;
                col += max(vec3(0.0), fauxHalation - 0.5) * 0.15;
                float noise = random(uv + mod(time, 10.0));
                col -= (noise * (0.015 + darkness * 0.15 + anomaly * 0.9)) * (1.0 - luminance);
                float scanline = sin((uv.y - time * 0.02) * 800.0) * (0.015 + exhaustion * 0.05);
                col -= scanline * luminance;
                col += phaseBand * 0.004 * (1.0 + noise);
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
                col = smoothstep(0.0, 1.0, col);
                gl_FragColor = vec4(col, 1.0);
            }
        `;
        this.nativePostProgram = this._buildNativePipeline(vertSource, fragSource);
        this.uniformLocs = {
            tDiffuse: this.gl.getUniformLocation(this.nativePostProgram, "tDiffuse"),
            time: this.gl.getUniformLocation(this.nativePostProgram, "time"),
            exhaustion: this.gl.getUniformLocation(this.nativePostProgram, "exhaustion"),
            squeeze: this.gl.getUniformLocation(this.nativePostProgram, "squeeze"),
            anomaly: this.gl.getUniformLocation(this.nativePostProgram, "anomaly"),
            darkness: this.gl.getUniformLocation(this.nativePostProgram, "darkness"),
            panic: this.gl.getUniformLocation(this.nativePostProgram, "panic"),
            globalSeed: this.gl.getUniformLocation(this.nativePostProgram, "globalSeed"),
            adrenaline: this.gl.getUniformLocation(this.nativePostProgram, "adrenaline"),
            eyesClosed: this.gl.getUniformLocation(this.nativePostProgram, "eyesClosed")
        };
        this.attribLocs = {
            position: this.gl.getAttribLocation(this.nativePostProgram, "position")
        };

        // [SLASH] SURGICAL EXTRACTION PHASE 8: NATIVE TEXTURE ATLAS PIPELINE
        const spatialVert = `
            uniform mat4 viewMatrix;
            uniform mat4 projectionMatrix;
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            attribute vec3 color;
            attribute vec4 atlasRect;
            varying vec3 vNormal;
            varying vec3 vColor;
            varying vec2 vUv;
            varying vec4 vAtlasRect;
            varying vec3 vWorldPos;

            void main() {
                vNormal = normal;
                vColor = color;
                vUv = uv;
                vAtlasRect = atlasRect;
                vWorldPos = position;
                // Vertices are already baked into world space by The Architect
                gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
            }
        `;

        const spatialFrag = `
            precision highp float;
            uniform sampler2D atlas;
            
            // Photometric Variables
            uniform vec3 uAmbient;
            uniform vec3 uFlashPos;
            uniform vec3 uFlashDir;
            uniform float uFlashInt;
            uniform vec3 uLightPos[12];
            uniform vec3 uLightCol[12];

            varying vec3 vNormal;
            varying vec3 vColor;
            varying vec2 vUv;
            varying vec4 vAtlasRect;
            varying vec3 vWorldPos;

            // [SLASH] Tone Mapping: ACES Filmic curve to match Three.js parity
            vec3 ACESFilmicToneMapping(vec3 color) {
                color *= 1.2; // Match global exposure parameter
                return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
            }

            void main() {
                // [SLASH] Fragment-Level UV Wrapping
                vec2 wrapUv = fract(vUv);
                vec2 atlasUv = vec2(
                    vAtlasRect.x + (wrapUv.x * vAtlasRect.z),
                    vAtlasRect.y + (wrapUv.y * vAtlasRect.w)
                );

                // Decode native sRGB atlas to Linear space for math
                vec4 texColor = texture2D(atlas, atlasUv);
                vec3 linearTex = pow(texColor.rgb, vec3(2.2));
                
                vec3 normal = normalize(vNormal);
                
                // Baseline structural color driven by ambient pressure
                vec3 finalColor = uAmbient * linearTex * vColor;
                
                // 1. Somatic Flashlight Solver
                vec3 fToLight = uFlashPos - vWorldPos;
                float fDist = length(fToLight);
                if(fDist < 45.0 && uFlashInt > 0.0) {
                    vec3 fLDir = fToLight / fDist;
                    float theta = dot(fLDir, -uFlashDir); // Inverse dot product for cone angle
                    float spotEffect = smoothstep(0.85, 0.90, theta); 
                    float fDiff = max(dot(normal, fLDir), 0.0);
                    float fAtten = pow(clamp(1.0 - (fDist / 45.0), 0.0, 1.0), 2.0);
                    finalColor += linearTex * vColor * fDiff * fAtten * spotEffect * uFlashInt * vec3(1.0, 0.9, 0.7);
                }
                
                // 2. Local LumenGrid Points
                for(int i = 0; i < 12; i++) {
                    vec3 lCol = uLightCol[i];
                    if(dot(lCol, vec3(1.0)) > 0.0) {
                        vec3 toLight = uLightPos[i] - vWorldPos;
                        float dist = length(toLight);
                        if(dist < 30.0) {
                            float diff = max(dot(normal, toLight / dist), 0.0);
                            float atten = pow(clamp(1.0 - (dist / 30.0), 0.0, 1.0), 2.0);
                            finalColor += linearTex * vColor * diff * atten * lCol;
                        }
                    }
                }
                
                // Apply curve and convert back to sRGB for the final FBO composite
                finalColor = ACESFilmicToneMapping(finalColor);
                finalColor = pow(finalColor, vec3(1.0 / 2.2));
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        this.nativeSpatialProgram = this._buildNativePipeline(spatialVert, spatialFrag);
        this.spatialUniforms = {
            viewMatrix: this.gl.getUniformLocation(this.nativeSpatialProgram, "viewMatrix"),
            projectionMatrix: this.gl.getUniformLocation(this.nativeSpatialProgram, "projectionMatrix"),
            atlas: this.gl.getUniformLocation(this.nativeSpatialProgram, "atlas"),
            uAmbient: this.gl.getUniformLocation(this.nativeSpatialProgram, "uAmbient"),
            uFlashPos: this.gl.getUniformLocation(this.nativeSpatialProgram, "uFlashPos"),
            uFlashDir: this.gl.getUniformLocation(this.nativeSpatialProgram, "uFlashDir"),
            uFlashInt: this.gl.getUniformLocation(this.nativeSpatialProgram, "uFlashInt"),
            uLightPos: this.gl.getUniformLocation(this.nativeSpatialProgram, "uLightPos"),
            uLightCol: this.gl.getUniformLocation(this.nativeSpatialProgram, "uLightCol")
        };
        this.spatialAttribs = {
            position: this.gl.getAttribLocation(this.nativeSpatialProgram, "position"),
            normal: this.gl.getAttribLocation(this.nativeSpatialProgram, "normal"),
            uv: this.gl.getAttribLocation(this.nativeSpatialProgram, "uv"),
            color: this.gl.getAttribLocation(this.nativeSpatialProgram, "color"),
            atlasRect: this.gl.getAttribLocation(this.nativeSpatialProgram, "atlasRect")
        };

        this.nativeChunks = []; // Cache for pure raw-metal geometry

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

    allocateNativeChunk(positions, normals, uvs, colors, atlasRects, count) {
        return {
            posBuffer: this._createNativeBuffer(positions),
            normBuffer: this._createNativeBuffer(normals),
            uvBuffer: this._createNativeBuffer(uvs),
            colBuffer: this._createNativeBuffer(colors),
            rectBuffer: this._createNativeBuffer(atlasRects),
            count: count
        };
    }

    setMasterAtlas(texture) {
        if (!texture || !texture.image) return;
        this.masterAtlasTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.masterAtlasTexture);

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture.image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }

    _createNativeBuffer(data) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        return buffer;
    }

    _compileNativeShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('// RAW WEBGL COMPILATION FAULT //', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    _buildNativePipeline(vertexSource, fragmentSource) {
        const vertexShader = this._compileNativeShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this._compileNativeShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('// RAW WEBGL LINK FAULT //', this.gl.getProgramInfoLog(program));
            return null;
        }
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        return program;
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
        if (this.nativeChunks.length === 0) console.warn('// DIAGNOSTIC: Native buffer is empty //');

        // 1. Render dynamic entities into the FBO
        this.renderer.setRenderTarget(this.target);
        this.renderer.render(this.scene, this.camera);

        // [SLASH] Do NOT unbind the FBO. Do NOT clear the buffer.
        // The dynamic entities are now staged in the color/depth buffers.

        // 2. Native Draw Loop (Directly into the active FBO)
        // [SLASH] GL STATE SANITIZATION: Three.js leaves the hardware state machine
        // poisoned (dirty VAOs, disabled depth masks from transparent particles).
        if (this.gl.bindVertexArray) this.gl.bindVertexArray(null);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthMask(true);
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.disable(this.gl.BLEND);

        // Force FBO binding to guarantee raw arrays don't write to the void
        const targetProps = this.renderer.properties.get(this.target);
        if (targetProps && targetProps.__webglFramebuffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, targetProps.__webglFramebuffer);
        }

        this.gl.useProgram(this.nativeSpatialProgram);

        // Update matrices
        const viewMat = this.camera.matrixWorldInverse.elements;
        const projMat = this.camera.projectionMatrix.elements;
        this.gl.uniformMatrix4fv(this.spatialUniforms.viewMatrix, false, viewMat);
        this.gl.uniformMatrix4fv(this.spatialUniforms.projectionMatrix, false, projMat);

        if (this.masterAtlasTexture) {
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.masterAtlasTexture);
            this.gl.uniform1i(this.spatialUniforms.atlas, 1);
        }

        // [SLASH] PHOTOMETRIC SCRAPING: Feed the dynamic light data to the raw GPU
        const ambient = this.ambientLight;
        const ambColor = ambient.color.clone().lerp(ambient.groundColor, 0.5).multiplyScalar(ambient.intensity);
        this.gl.uniform3f(this.spatialUniforms.uAmbient, ambColor.r, ambColor.g, ambColor.b);

        let flashObj = null;
        for (let i = 0; i < this.camera.children.length; i++) {
            if (this.camera.children[i].isSpotLight) { flashObj = this.camera.children[i]; break; }
        }

        if (flashObj) {
            const fPos = new THREE.Vector3().setFromMatrixPosition(flashObj.matrixWorld);
            const fTarget = new THREE.Vector3().setFromMatrixPosition(flashObj.target.matrixWorld);
            const fDir = fTarget.sub(fPos).normalize();
            this.gl.uniform3f(this.spatialUniforms.uFlashPos, fPos.x, fPos.y, fPos.z);
            this.gl.uniform3f(this.spatialUniforms.uFlashDir, fDir.x, fDir.y, fDir.z);
            this.gl.uniform1f(this.spatialUniforms.uFlashInt, flashObj.intensity);
        } else {
            this.gl.uniform1f(this.spatialUniforms.uFlashInt, 0.0);
        }

        const pLights = [];
        for (let i = 0; i < this.scene.children.length; i++) {
            const c = this.scene.children[i];
            if (c.isPointLight && c.intensity > 0.01) pLights.push(c);
        }

        pLights.sort((a, b) => b.intensity - a.intensity);
        const posArray = new Float32Array(36);
        const colArray = new Float32Array(36);

        for (let i = 0; i < 12; i++) {
            if (i < pLights.length) {
                const l = pLights[i];
                posArray[i*3] = l.position.x;
                posArray[i*3+1] = l.position.y;
                posArray[i*3+2] = l.position.z;
                colArray[i*3] = l.color.r * l.intensity;
                colArray[i*3+1] = l.color.g * l.intensity;
                colArray[i*3+2] = l.color.b * l.intensity;
            } else {
                colArray[i*3] = colArray[i*3+1] = colArray[i*3+2] = 0.0;
            }
        }
        this.gl.uniform3fv(this.spatialUniforms.uLightPos, posArray);
        this.gl.uniform3fv(this.spatialUniforms.uLightCol, colArray);

        // Draw the static structural chunks
        for (let i = 0; i < this.nativeChunks.length; i++) {
            const chunk = this.nativeChunks[i];

            if (this.spatialAttribs.position >= 0) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.posBuffer);
                this.gl.enableVertexAttribArray(this.spatialAttribs.position);
                this.gl.vertexAttribPointer(this.spatialAttribs.position, 3, this.gl.FLOAT, false, 0, 0);
            }

            if (this.spatialAttribs.normal >= 0) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.normBuffer);
                this.gl.enableVertexAttribArray(this.spatialAttribs.normal);
                this.gl.vertexAttribPointer(this.spatialAttribs.normal, 3, this.gl.FLOAT, false, 0, 0);
            }

            if (this.spatialAttribs.uv >= 0) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.uvBuffer);
                this.gl.enableVertexAttribArray(this.spatialAttribs.uv);
                this.gl.vertexAttribPointer(this.spatialAttribs.uv, 2, this.gl.FLOAT, false, 0, 0);
            }

            if (this.spatialAttribs.color >= 0) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.colBuffer);
                this.gl.enableVertexAttribArray(this.spatialAttribs.color);
                this.gl.vertexAttribPointer(this.spatialAttribs.color, 3, this.gl.FLOAT, false, 0, 0);
            }

            if (this.spatialAttribs.atlasRect >= 0 && chunk.rectBuffer) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.rectBuffer);
                this.gl.enableVertexAttribArray(this.spatialAttribs.atlasRect);
                this.gl.vertexAttribPointer(this.spatialAttribs.atlasRect, 4, this.gl.FLOAT, false, 0, 0);
            }

            this.gl.drawArrays(this.gl.TRIANGLES, 0, chunk.count);
        }

        // [SLASH] HYBRID RECOVERY: Restore the framework's internal caching
        if (this.gl.bindVertexArray) this.gl.bindVertexArray(null);
        this.renderer.state.reset();

        // 3. Unbind FBO to target the hardware screen
        this.renderer.setRenderTarget(null);

        // 4. Execute the Native Post Pipeline over the final composite FBO
        this.gl.useProgram(this.nativePostProgram);
        this.gl.activeTexture(this.gl.TEXTURE0);
        const texProps = this.renderer.properties.get(this.target.texture);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texProps.__webglTexture);
        this.gl.uniform1i(this.uniformLocs.tDiffuse, 0);
        this.gl.uniform1f(this.uniformLocs.time, this.time);
        this.gl.uniform1f(this.uniformLocs.exhaustion, this.exhaustion);
        this.gl.uniform1f(this.uniformLocs.squeeze, this.squeeze || 0.0);
        this.gl.uniform1f(this.uniformLocs.anomaly, this.anomaly || 0.0);
        this.gl.uniform1f(this.uniformLocs.darkness, this.darkness || 0.0);
        this.gl.uniform1f(this.uniformLocs.panic, this.paranoia || 0.0);
        this.gl.uniform1f(this.uniformLocs.globalSeed, Math.random());
        this.gl.uniform1f(this.uniformLocs.adrenaline, this.adrenaline || 0.0);
        this.gl.uniform1f(this.uniformLocs.eyesClosed, this.eyesClosed || 0.0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nativeQuadBuffer);
        this.gl.enableVertexAttribArray(this.attribLocs.position);
        this.gl.vertexAttribPointer(this.attribLocs.position, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}