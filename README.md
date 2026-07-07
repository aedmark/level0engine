# Level 0 Engine: Procedural Liminal Space Simulator v0.2.1

A minimal-dependency, mathematically pure, procedural 3D environment generator running entirely natively in the browser via ES6 modules.

There are no external image assets. There are no imported audio files. There are no build tools, package managers, or framework abstractions. Everything you see and hear is generated locally via raw physics, procedural mathematics, and the Web Audio API.

## Core Philosophy
This engine is built on absolute architectural minimalism and thermodynamic efficiency.
* **Procedural Geometry & The Sector Matrix:** The maze is generated via a Julia Set fractal algorithm. It is infinite, chaotic, and deterministic. The engine utilizes Geodesic Chunking to maintain a strict memory budget, routing the generation through a **Sector Matrix** to procedurally spawn distinct "Villages" (The Boardroom, The Archive, The Server Farm, and The Overgrown Atrium), each with unique materials, density, and atmospheric physics.
* **Geodesic Physics & Lighting:** Collision detection relies on a highly optimized O(1) `SpatialHashGrid`. Dynamic lighting is managed by a Virtual Light Pool that teleports a fixed set of hardware shadow-casters using Spatial Hysteresis and continuous Fade Envelopes to eliminate visual popping.
* **Procedural Textures:** Obsidian tile, overgrown moss, structural concrete, interactive wood doors, and server racks with blinking diagnostic diodes are drawn pixel-by-pixel using the HTML5 Canvas API and injected directly into WebGL memory.
* **Procedural Audio & Acoustic Routing:** The ambient soundscape is not an MP3. It is a live digital signal processor (DSP). The engine uses a Unified Thermodynamic Read to shift the acoustics natively based on your spatial sector—from the sterile hiss of corporate HVACs to 35Hz sub-bass server growls and 432Hz resonant chimes. The engine also casts volumetric audio raycasts to physically muffle sounds when occluded by walls.
* **Metabolic Economy & The Null Anomaly:** The player is not a floating camera; they have a biological carrying capacity. Sprinting away from the active pursuit of the **Null Anomaly** drains a finite stamina pool. Reaching terminal exhaustion physically crushes the audio filter and blurs the WebGL render pipeline. If the Anomaly catches you, the engine executes a void blackout, mutates your seed string, and procedurally rebuilds a new reality.
* **Illumination & Kinematic Restraint:** Traversal requires managing a heavy, incandescent flashlight with a dying battery that recharges piezoelectrically when disabled. The Anomaly's proximity induces severe electromagnetic interference, starving the bulb. When cornered, players can dynamically compress their physical collision cylinder to squeeze through narrow structural crevices—safe zones that the Anomaly's 4D geometry is violently repelled by.
* **Native Post-Processing:** The engine features a custom `WebGLRenderTarget` pipeline, applying dynamic Chromatic Aberration, crawling static, CRT scanlines, claustrophobic vignettes, and somatic retinal blurring. All procedural textures utilize global 4x Anisotropic Filtering for maximum clarity at grazing angles.
* **Progressive Web App (PWA):** Built with a Thermodynamic Cache Service Worker and web manifest, the engine can be installed directly to your OS and runs entirely offline.

## Usage

1. Clone the repository or install as a PWA on supported browsers.
2. Serve the directory using a local web server (e.g., `python -m http.server`, `npx http-server`, or VSCode Live Server). *Note: Opening `index.html` directly via the `file://` protocol will fail due to strict ES6 module CORS policies.*
3. Open the localhost URL in any modern web browser.
4. **Desktop Controls:**
   * `Click`: Engage a Pointer Lock (Look around)
   * `W, A, S, D`: Navigate spatial coordinates
   * `Shift`: Sprint (Consumes Stamina during a Hunt)
   * `C`: Crouch
   * `Q`: Squeeze (Compress collision radius to slide through narrow cracks)
   * `F`: Toggle Flashlight (Consumes battery, recharges when off)
   * `ESC`: Release Pointer Lock
5. **Mobile Controls (Landscape Only):**
   * `Left Screen Half`: Virtual joystick for movement.
   * `Right Screen Half`: Swipe to look around.
   * `On-Screen Buttons`: Smart-canceling toggles for Run, Crouch, and the Flashlight.

## The Environment
* **Interactive Doors:** Approach a wood-grain door to trigger a kinematic latch, swinging it open precisely 90 degrees away from your approach vector.
* **Structural Crevices:** Massive, load-bearing concrete pillars often form tight 0.5-unit gaps. These are physical safe zones; you must compress your body to slide through them, but the Anomaly cannot penetrate the dense geometry.
* **The Sectors:** Explore the infinite grid to transition seamlessly between diverse architectural biomes (The Poolrooms, The Clinic, The Archive, etc.), featuring high-frequency texturing and dense procedural clutter like triage pods, wading pools, and towering metal shelving.

## The Generator
The UI provides a structural control panel.
* **Architecture Seed:** Enter any string. The engine hashes the string into a 32-bit integer to seed the Julia Set.
* **Display Format:** Enforce strict cinematic aspect ratios (Dynamic, 4:3, 16:9, 21:9) via dynamic letterboxing.
* **Fog Density:** Adjust the volumetric atmospheric drag (which dynamically "breathes" using an LFO).
* **Internal Resolution:** Downscale the internal WebGL rendering (100%, 50%, 25%) to boost GPU performance and heavily enhance the retro VHS pixelation.
* **Rebuild Geometry:** Destroys the current manifold, resets the Spatial Hash Grid, and generates a new one.
* **Capture Asset:** Triggers a simulated camera flash and downloads a mathematically pure `.png` of your exact coordinates.

## Dependencies
* `Three.js (r128)` - Loaded via local minified JS to preserve the zero-build-tool philosophy.