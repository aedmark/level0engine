# System Architecture & Metabolic Physics

This codebase rejects the "god-object" anti-pattern. It is strictly encapsulated into three discrete biological modules that maintain internal state and communicate via the Global System Bootstrap.

## 1. `RenderEngine` (The Heartbeat & Post-Processing Pipeline)
**Responsibility:** WebGL initialization, the render loop, temporal mathematics, and Shader injection.
* Encapsulates `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
* Owns the `THREE.Clock()`. All spatial and dynamic modules query the engine for `delta` and `time` rather than managing their own internal clocks.
* **The Post-Processing Pipeline:** The primary scene is not rendered directly to the monitor. It is rendered to a `WebGLRenderTarget` (an off-screen buffer). This buffer is then passed as a `tDiffuse` uniform into an Orthographic camera's `ShaderMaterial`, applying the custom VHS/Static fragment shaders before hitting the user's screen.
* Automatically manages window resize events, scaling both the primary renderer and the off-screen render target dynamically.

## 2. `PlayerController` (The Somatic Vector)
**Responsibility:** Input parsing, spatial translation, and collision geometry.
* Binds natively to the browser's `Pointer Lock API`. Raw mouse movement deltas are converted directly into the camera's rotational matrix.
* Maintains a localized velocity vector for fluid movement and momentum deceleration (drag).
* Executes strict AABB (Axis-Aligned Bounding Box) collision detection against the environment's `wallBoxes` array. Movement vectors are evaluated and clamped before the render frame is painted.

## 3. `Environment` (The World Substrate)
**Responsibility:** Procedural generation, DSP audio processing, and memory Autophagy.
* **The Audio Context:** Manages an isolated `window.AudioContext`. Modulates volume gain dynamically based on the camera's proximity to active light sources.
* **The Texture Synthesizer:** Instantiates hidden `<canvas>` elements to mathematically draw the required 2D textures (wallpaper, carpet, ceiling, and structures), which are then cast into `THREE.CanvasTexture` objects.
* **The Generation Loop:** Uses a deterministic pseudorandom number generator (PRNG) fueled by the user's string seed to execute a Julia Set fractal, determining wall placement, arches, and directional (N, S, E, W) 5-step staircases.
* **Stochastic Lighting:** Injects point lights with faulty properties that use stochastic target-seeking math (rather than deterministic sine waves) to simulate realistically broken ballasts.
* **Systemic Autophagy (Garbage Collection):** Three.js does not automatically clean the GPU. Before `generate()` calculates new geometry, the Environment explicitly executes `.dispose()` on all active geometries and dynamic materials, followed by array nullification. This mathematically eliminates memory leaks.

## System Bootstrap
The engine boots at the bottom of the script. The `animate()` loop delegates authority linearly:

1. Request animation frame.
2. Query `RenderEngine` for temporal data.
3. Pass delta and collision boxes to `PlayerController.update()`.
4. Pass temporal data to `Environment.updateLights()` for flickering math.
5. Command `RenderEngine.render()`.
