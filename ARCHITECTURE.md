# System Architecture & Metabolic Physics

This codebase rejects the "god-object" anti-pattern. It is strictly encapsulated into discrete biological ES6 modules that maintain internal state and communicate via `main.js`.

## 1. `RenderEngine.js` (The Heartbeat & Post-Processing Pipeline)
**Responsibility:** WebGL initialization, the render loop, temporal mathematics, and Shader injection.
* Encapsulates `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
* **Deterministic Time:** Utilizes a pure `performance.now()` delta loop, completely decoupled from `THREE.Clock()` to prevent post-processing shaders from cannibalizing the physics time-step during frame drops.
* **The Post-Processing Pipeline:** The primary scene is rendered to a `WebGLRenderTarget` (an off-screen buffer). This buffer is passed as a `tDiffuse` uniform into an Orthographic camera's `ShaderMaterial`, applying the custom VHS/Static fragment shaders.
* **Somatic Retinal Blur:** Injects the player's exhaustion float directly into the fragment shader, executing a dynamic 4-tap box blur to physically simulate biological fatigue.
* **Dynamic Optical Frustum:** Dynamically puppets the camera's near clipping plane between `0.1` and `0.01` based on the player's kinematic compression state, mathematically preventing void-peeking within crevices while preserving global Z-buffer precision.

## 2. `PlayerController.js` (The Somatic Vector)
**Responsibility:** Input parsing, spatial translation, collision geometry, and metabolic economy.
* Binds natively to the browser's `Pointer Lock API` and a custom dual-hemisphere mobile touch interface.
* **Thermodynamic Decay:** Applies true continuous exponential decay to the velocity vector, guaranteeing kinetic stability and preventing polarity inversion at low framerates.
* **Metabolic State & Illumination:** Tracks biological stamina and terminal exhaustion. Furthermore, it manages the Flashlight's battery circuit, calculating drain and implementing a piezoelectric kinetic recharge when the unit is disabled.
* **Geodesic Physics & Compression:** Executes strict AABB collision detection via the `SpatialHashGrid`. Players can dynamically compress their physical collision cylinder (Squeeze mode) to slip through narrow geometry. This utilizes a predictive clearance box constraint to prevent catastrophic structural entrapment upon release.

## 3. `Environment.js` (The World Substrate)
**Responsibility:** Procedural generation, The Sector Matrix, DSP audio processing, Entity AI, and memory Autophagy.
* **The Sector Matrix:** Replaces brute-force generation with a data-driven registry of specialized architectural "Villages" (The Boardroom, The Archive, The Server Farm, The Overgrown Atrium). The Julia Set fractal delegates local coordinate constraints, foundation materials, and density logic to the active sector.
* **The Null Anomaly:** A procedural entity constructed from unlit Platonic solids. It pathfinds to the player but is subject to **Structural Repulsion**—it easily ghosts through standard drywall but is violently deflected by dense, load-bearing concrete (`isEntityBlocker`). Furthermore, it projects severe **Electromagnetic Interference**, dynamically throttling the player's flashlight voltage based on proximity, and triggers a "Consumption Event" (a complete reality rebuild and seed mutation) if it breaches the player's bounding box.
* **The Spatial Hash Grid:** Maps all physical bounding boxes into a 4-unit mathematical grid, enabling hyper-fast O(1) physics lookups.
* **Unified Thermodynamic Read:** Evaluates the player's spatial chunk seed exactly once per frame, routing the deterministic output to drive both the volumetric fog density and the bespoke DSP audio channels synchronously.
* **Systemic Autophagy:** Before destroying chunks, the engine explicitly executes `.dispose()` on all geometries/materials, flushes stale fixtures, and deletes spatial grid cells to mathematically eliminate GPU memory leaks.

## System Bootstrap (`main.js`)
The engine boots at the top of the ES6 entry point. The `animate()` loop delegates authority linearly:

1. Request animation frame.
2. Query `RenderEngine` for deterministic temporal data (`delta`, `time`).
3. Command `Environment` to update active chunks based on camera coordinates.
4. Command `Environment` to kinematically update interactive doors via the Latch system.
5. Command `Environment` to update the Null Anomaly's pathfinding and hunt vectors.
6. Pass delta and the `spatialGrid` to `PlayerController.update()`.
7. Bridge the `player.exhaustion` state to the `engine.exhaustion` uniform.
8. Command `Environment.updateLights()` to route the Virtual Light Pool, Unified Thermodynamic Read, and Acoustic Proximity Pressure.
9. Command `RenderEngine.render()`.