# Level 0 Engine: Procedural Liminal Space Simulator v0.3.1

A minimal-dependency, mathematically pure, procedural 3D environment generator running entirely natively in the browser via ES6 modules.

There are no external image assets. There are no imported audio files. There are no build tools, package managers, or framework abstractions. Everything you see and hear is generated locally via raw physics, procedural mathematics, and the Web Audio API.

## Core Philosophy
This engine is built on absolute architectural minimalism and thermodynamic efficiency.
* **Procedural Geometry & The Sector Matrix:** The maze is generated via a Julia Set fractal algorithm. It is infinite, chaotic, and deterministic. The engine utilizes Geodesic Chunking to maintain a strict memory budget, routing the generation through a **Sector Matrix** to procedurally spawn distinct "Villages" (The Boardroom, The Archive, The Server Farm, The Overgrown Atrium, The Poolrooms, etc.), each with unique materials, density, and atmospheric physics.
* **Geodesic Physics & Lighting:** Collision detection relies on a highly optimized O(1) `SpatialHashGrid`. Dynamic lighting is managed by a Virtual Light Pool that teleports a fixed set of hardware shadow-casters using Spatial Hysteresis and continuous Fade Envelopes to eliminate visual popping.
* **Procedural Textures:** The Obsidian Void PBR skin, overgrown moss, structural concrete, interactive wood doors, and server racks are drawn pixel-by-pixel using the HTML5 Canvas API and injected directly into WebGL memory.
* **Procedural Audio & Acoustic Routing:** The ambient soundscape is not an MP3. It is a live digital signal processor (DSP). The engine uses a Unified Thermodynamic Read to shift the acoustics natively based on your spatial sector—from the sterile hiss of corporate HVACs to 35Hz sub-bass server growls. The engine also casts volumetric audio raycasts to physically muffle sounds when occluded by walls. This is paired with **Surface-Aware Foley**, dynamically shifting the acoustic profile of your footsteps based on the spatial sector (wet splashes in the Poolrooms, metallic clinks in Maintenance).
* **Adrenaline Economy & The Null Anomaly:** The player has a biological carrying capacity governed by an **Adrenaline Economy**. Sprinting during casual exploration is efficient, but active pursuit by the Anomaly spikes adrenaline, burning oxygen twice as fast. Reaching terminal exhaustion physically crushes the audio filter, blurs the WebGL pipeline, and triggers heavy breathing—which dynamically expands the Anomaly's auditory perception radius. The Anomaly's pursuit speed is inversely coupled to your exhaustion: it literally feeds on panic.
* **The Quantum Observer Effect:** The Anomaly actively hunts via line-of-sight and utilizes short-term spatial memory to mathematically reverse out of complex labyrinths. Catching the entity within a 30-degree cone of your flashlight mathematically freezes it in place, but holding this quantum lock violently hemorrhages your battery voltage. The environment is systemic: the Anomaly does not ghost through walls; it violently slams doors off their hinges during pursuit. If it catches you, the engine executes a void blackout, mutates your seed string, and procedurally rebuilds a new reality.
* **Illumination & Systemic Cascades:** Traversal requires managing a heavy, incandescent flashlight operating on a true piezoelectric circuit—you must generate physical kinetic energy by sprinting in the dark or violently shaking your camera to crank out voltage. Players can find and interact with articulated **Surge Breakers** in the environment. Pulling a breaker triggers a catastrophic localized illumination cascade, shattering the bulbs and plunging the sector's atmospheric fog into a true, pitch-black void before executing a flickering reboot sequence.
* **Native Post-Processing:** The engine features a custom `WebGLRenderTarget` pipeline, applying dynamic Chromatic Aberration, crawling static, CRT scanlines, claustrophobic vignettes, and somatic retinal blurring. The optical feed is directly tethered to the Anomaly's proximity pressure, violently degrading into horizontal V-Hold tearing and desaturated static as the entity enters striking distance.
* **Progressive Web App (PWA):** Built with a Thermodynamic Cache Service Worker and web manifest, the engine can be installed directly to your OS and runs entirely offline.

## Usage

1. Clone the repository or install as a PWA on supported browsers.
2. Serve the directory using a local web server (e.g., `python -m http.server`, `npx http-server`, or VSCode Live Server). *Note: Opening `index.html` directly via the `file://` protocol will fail due to strict ES6 module CORS policies.*
3. Open the localhost URL in any modern web browser.
4. **Desktop Controls:**
   * `Left-Click`: Engage a Pointer Lock (Look around)
   * `Right-Click` (Hold): Kinematic Peek (Physically lean your camera 80cm around corners)
   * `W, A, S, D`: Navigate spatial coordinates
   * `Shift`: Sprint (Metabolically efficient until chased, then burns Adrenaline)
   * `C`: Crouch (Lowers detection radius)
   * `Q`: Squeeze (Compress collision radius to slide through narrow cracks)
   * `F`: Toggle Flashlight (Consumes battery, expands detection radius)
   * `E`: Somatic Interact (Crack open Surge Breakers)
   * `T`: Spray UV Breadcrumb (Mark your path)
   * `ESC`: Release Pointer Lock/rest
5. **Mobile Controls (Landscape Only):**
   * `Left Screen Half`: Virtual joystick for movement.
   * `Right Screen Half`: Swipe to look around.
   * `On-Screen Buttons`: Smart-canceling toggles for Run, Crouch, and the Flashlight.

## The Environment
* **The Surge Breakers:** Interactive, articulated breaker boxes. Press 'E' to crack the panel open and trigger a catastrophic, localized blackout cascade that drains the ambient light into true pitch-black before a flickering system reboot.
* **The Liminal Breach (Fast Travel):** Dead-end staircases have a 15% chance to spawn as open breaches. Walking up them uncaps the Y-axis constraints, allowing you to mathematically phase through the ceiling and warp thousands of units across the grid without mutating the quantum seed.
* **Ultraviolet Breadcrumbs:** Press 'T' to spray a glowing, high-visibility UV paint decal on walls (via surface-normal raycasting) to map the labyrinth and prevent circling.
* **Somatic Collisions:** High-speed kinematic impacts against structural geometry violently jolt the camera, bleed momentum, and trigger acoustic foley events.
* **Interactive Doors:** Approach a wood-grain door to trigger a kinematic latch, swinging it open precisely 90 degrees away from your approach vector.
* **Structural Crevices:** Massive, load-bearing concrete pillars often form tight 0.5-unit gaps. These are physical safe zones; you must compress your body to slide through them, but the Anomaly cannot penetrate the dense geometry.

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