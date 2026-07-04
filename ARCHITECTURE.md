# System Architecture & Metabolic Physics

This codebase rejects the "god-object" anti-pattern. It is strictly encapsulated into discrete biological ES6 modules that maintain internal state and communicate via `main.js`.

## 1. `RenderEngine.js` (The Heartbeat & Post-Processing Pipeline)
**Responsibility:** WebGL initialization, the render loop, temporal mathematics, and Shader injection.
* Encapsulates `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
* Owns the `THREE.Clock()`. All spatial and dynamic modules query the engine for `delta` and `time`.
* **The Post-Processing Pipeline:** The primary scene is not rendered directly to the monitor. It is rendered to a `WebGLRenderTarget` (an off-screen buffer). This buffer is passed as a `tDiffuse` uniform into an Orthographic camera's `ShaderMaterial`, applying the custom VHS/Static fragment shaders before hitting the user's screen.
* **Dynamic Downscaling:** Manages internal resolution scaling (100%, 50%, 25%) independent of CSS layout to boost mobile GPU performance and enhance retro pixelation.

## 2. `PlayerController.js` (The Somatic Vector)
**Responsibility:** Input parsing, spatial translation, and collision geometry.
* Binds natively to the browser's `Pointer Lock API` and a custom dual-hemisphere mobile touch interface.
* Maintains a localized velocity vector for fluid movement, momentum deceleration (drag), and somatic head-bobbing.
* **Geodesic Physics:** Executes strict AABB (Axis-Aligned Bounding Box) collision detection by querying the `Environment`'s `SpatialHashGrid`. Using a 2.0-unit radius lookup drops the mathematical friction of movement from O(N) to O(1), making collision processing cost a flat constant regardless of infinite world scale.

## 3. `Environment.js` (The World Substrate)
**Responsibility:** Procedural generation, Spatial Hashing, DSP audio processing, and memory Autophagy.
* **The Generation Loop:** Uses a deterministic pseudorandom number generator (PRNG) fueled by the user's string seed to execute a Julia Set fractal, feeding a Weighted Probability Matrix (`structuralMatrix`) to generate walls, interactive doors, structural alcoves, vents, and waiting-room furniture[cite: 11].
* **Geodesic Chunking:** Dynamically builds and culls 16x16 geometry chunks around the player's somatic coordinates.
* **The Spatial Hash Grid:** Maps all physical bounding boxes into a 4-unit mathematical grid, enabling hyper-fast O(1) physics lookups for the player and future entities.
* **The Virtual Light Pool:** Maintains a strict thermodynamic budget of exactly 24 hardware `THREE.PointLight` objects (only 4 casting shadows). As the player moves, the engine calculates distances to all theoretical fixtures, applying **Spatial Hysteresis** to prevent flickering and a **Fade Envelope** to smoothly teleport and ramp up the hardware lights out of the darkness[cite: 11].
* **Volumetric Audio:** Manages an isolated `window.AudioContext`. Modulates volume gain and applies low-pass biquad filters dynamically by firing a `THREE.Raycaster` to the nearest light to detect physical wall occlusion[cite: 11].
* **Systemic Autophagy:** Before destroying chunks, the engine explicitly executes `.dispose()` on all geometries/materials, flushes stale fixtures, and deletes spatial grid cells to mathematically eliminate GPU memory leaks[cite: 11].

## System Bootstrap (`main.js`)
The engine boots at the top of the ES6 entry point. The `animate()` loop delegates authority linearly:

1. Request animation frame.
2. Query `RenderEngine` for temporal data (`delta`, `time`).
3. Command `Environment` to update active chunks based on camera coordinates.
4. Command `Environment` to kinematically update interactive doors.
5. Pass delta and the `spatialGrid` to `PlayerController.update()`.
6. Pass temporal data to `Environment.updateLights()` for Virtual Light Pool routing.
7. Command `RenderEngine.render()`.