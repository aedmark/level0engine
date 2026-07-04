# Level 0 Engine: Procedural Liminal Space Simulator v0.1.0

A minimal-dependency, mathematically pure, procedural 3D environment generator running entirely natively in the browser via ES6 modules.

There are no external image assets. There are no imported audio files. There are no build tools, package managers, or framework abstractions. Everything you see and hear is generated locally via raw physics, procedural mathematics, and the Web Audio API.

## Core Philosophy
This engine is built on absolute architectural minimalism and thermodynamic efficiency.
* **Procedural Geometry & Chunking:** The maze is generated via a Julia Set fractal algorithm. It is infinite, chaotic, and deterministic based on the provided architecture seed. The engine utilizes Geodesic Chunking, dynamically building and culling 16x16 geometry chunks around the player to maintain a strict memory budget.
* **Geodesic Physics & Lighting:** Collision detection relies on a highly optimized O(1) `SpatialHashGrid` rather than expensive arrays. Dynamic lighting is managed by a Virtual Light Pool that teleports a fixed set of hardware shadow-casters using Spatial Hysteresis and continuous Fade Envelopes to eliminate visual popping and save GPU cycles.
* **Procedural Textures:** Wallpaper, structural concrete, damp carpet, ceiling tiles, interactive wood doors, and fabric waiting-room chairs are drawn pixel-by-pixel using the HTML5 Canvas API and injected directly into WebGL memory.
* **Procedural Audio:** The ambient drone is not an MP3. It is a live digital signal processor (DSP) combining a 60Hz sine wave, 120Hz sawtooth harmonics, a 1200Hz triangle wave ballast whine, and a Low-Frequency Oscillator (LFO) to simulate the breathing hum of decaying fluorescent lights. The engine also casts volumetric audio raycasts to physically muffle sounds when occluded by walls.
* **Native Post-Processing:** The engine features a custom `WebGLRenderTarget` pipeline, routing the primary camera through a raw GLSL fragment shader to apply dynamic Chromatic Aberration, crawling static, CRT scanlines, and a heavy vignette.
* **Progressive Web App (PWA):** Built with a Thermodynamic Cache Service Worker and web manifest, the engine can be installed directly to your OS or mobile home screen and runs entirely offline.

## Usage

1. Clone the repository or install as a PWA on supported browsers from here: https://oopismcgoopis/level0
2. Serve the directory using a local web server (e.g., `python -m http.server`, `npx http-server`, or VSCode Live Server). *Note: Opening `index.html` directly via the `file://` protocol will fail due to strict ES6 module CORS policies.*
3. Open the localhost URL in any modern web browser.
4. **Desktop Controls:**
   * `Click`: Engage a Pointer Lock (Look around)
   * `W, A, S, D`: Navigate spatial coordinates
   * `Shift`: Sprint
   * `C`: Crouch
   * `ESC`: Release Pointer Lock
5. **Mobile Controls (Landscape Only):**
   * `Left Screen Half`: Virtual joystick for movement.
   * `Right Screen Half`: Swipe to look around.
   * `On-Screen Buttons`: Smart-canceling toggles for Run and Crouch.

## The Environment
* **Interactive Doors:** Approach a wood-grain door to trigger a kinematic lerp, swinging it open and dynamically squashing its AABB collision volume.
* **Structural Furniture:** Explore procedural alcoves to find unnerving, procedurally stamped end-tables and institutional waiting-room chairs.

## The Generator
The UI provides a structural control panel.
* **Architecture Seed:** Enter any string. The engine hashes the string into a 32-bit integer to seed the Julia Set, creating a unique, repeatable spatial geometry.
* **Display Format:** Enforce strict cinematic aspect ratios (Dynamic, 4:3, 16:9, 21:9) via dynamic letterboxing.
* **Fog Density:** Adjust the volumetric atmospheric drag (which dynamically "breathes" using an LFO).
* **Camera FOV:** Dynamically adjust the perspective projection matrix.
* **Internal Resolution:** Downscale the internal WebGL rendering (100%, 50%, 25%) to boost GPU performance and heavily enhance the retro VHS pixelation.
* **Somatic Head Bob:** An accessibility toggle to disable camera bobbing for users prone to motion sickness.
* **Rebuild Geometry:** Destroys the current manifold, resets the Spatial Hash Grid, and generates a new one.
* **Capture Asset:** Triggers a simulated camera flash and downloads a mathematically pure `.png` of your exact coordinates.

## Dependencies
* `Three.js (r128)` - Loaded via local minified JS to preserve the zero-build-tool philosophy.