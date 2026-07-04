# Level 0 Engine: Procedural Liminal Space Simulatorvc0.0.8

A zero-dependency, mathematically pure, procedural 3D environment generator running entirely in a single HTML file. 

There are no external image assets. There are no imported audio files. There are no build tools, package managers, or framework abstractions. Everything you see and hear is generated locally in the browser via raw physics, procedural mathematics, and the Web Audio API.

## Core Philosophy
This engine is built on absolute architectural minimalism.
* **Procedural Geometry:** The maze is generated via a Julia Set fractal algorithm. It is infinite, chaotic, and deterministic based on the provided architecture seed.
* **Procedural Textures:** Wallpaper, structural concrete, damp carpet, and ceiling tiles are drawn pixel-by-pixel using the HTML5 Canvas API and injected directly into WebGL memory.
* **Procedural Audio:** The ambient drone is not an MP3. It is a live digital signal processor (DSP) combining a 60Hz sine wave, 120Hz sawtooth harmonics, a 1200Hz triangle wave ballast whine, and a Low-Frequency Oscillator (LFO) to simulate the breathing hum of decaying fluorescent lights. The engine also casts volumetric audio raycasts to physically muffle sounds when occluded by walls.
* **Native Post-Processing:** The engine features a custom `WebGLRenderTarget` pipeline, routing the primary camera through a raw GLSL fragment shader to apply dynamic Chromatic Aberration, crawling static, CRT scanlines, and a heavy vignette.
* **Progressive Web App (PWA):** Built with a Thermodynamic Cache Service Worker and web manifest, the engine can be installed directly to your OS or mobile home screen and runs entirely offline.

## Usage

1. Clone the repository or install via browser prompt.
2. Open `index.html` in any modern web browser.
3. **Desktop Controls:**
   * `Click`: Engage Pointer Lock (Look around)
   * `W, A, S, D`: Navigate spatial coordinates
   * `Shift`: Sprint
   * `C`: Crouch
   * `ESC`: Release Pointer Lock
4. **Mobile Controls (Landscape Only):**
   * `Left Screen Half`: Virtual joystick for movement.
   * `Right Screen Half`: Swipe to look around.
   * `On-Screen Buttons`: Smart-canceling toggles for Run and Crouch.

## The Generator
The UI provides a structural control panel.
* **Architecture Seed:** Enter any string. The engine hashes the string into a 32-bit integer to seed the Julia Set, creating a unique, repeatable spatial geometry.
* **Display Format:** Enforce strict cinematic aspect ratios (Dynamic, 4:3, 16:9, 21:9) via dynamic letterboxing.
* **Fog Density:** Adjust the volumetric atmospheric drag (which dynamically "breathes" using an LFO).
* **Camera FOV:** Dynamically adjust the perspective projection matrix.
* **Internal Resolution:** Downscale the internal WebGL rendering (100%, 50%, 25%) to boost GPU performance and heavily enhance the retro VHS pixelation.
* **Somatic Head Bob:** An accessibility toggle to disable camera bobbing for users prone to motion sickness.
* **Rebuild Geometry:** Destroys the current manifold and generates a new one.
* **Capture Asset:** Triggers a simulated camera flash and downloads a mathematically pure `.png` of your exact coordinates.

## Dependencies
* `Three.js (r128)` - Loaded via local minfied js.
