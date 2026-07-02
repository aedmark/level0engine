# Procedural Liminal Engine (Level 0)

A zero-dependency, mathematically pure, procedural 3D environment generator running entirely in a single HTML file. 

There are no external image assets. There are no imported audio files. There are no build tools, package managers, or framework abstractions. Everything you see and hear is generated locally in the browser via raw physics, procedural mathematics, and the Web Audio API.

## Core Philosophy: Synergetic Language & Systems Heuristics (S.L.A.S.H.)
This engine is built on absolute architectural minimalism.
* **Procedural Geometry:** The maze is generated via a Julia Set fractal algorithm. It is infinite, chaotic, and deterministic based on the provided architecture seed.
* **Procedural Textures:** Wallpaper, carpet, and ceiling tiles are drawn pixel-by-pixel using the HTML5 Canvas API and injected directly into WebGL memory.
* **Procedural Audio:** The ambient drone is not an MP3. It is a live digital signal processor (DSP) combining a 60Hz sine wave, 120Hz sawtooth harmonics, a 1200Hz triangle wave ballast whine, and a Low-Frequency Oscillator (LFO) to simulate the breathing hum of decaying fluorescent lights.

## Usage

1. Clone the repository.
2. Open `index.html` in any modern web browser.
3. **Controls:**
    * `Click`: Engage Pointer Lock (Look around)
    * `W, A, S, D`: Navigate spatial coordinates
    * `Shift`: Sprint
    * `ESC`: Release Pointer Lock

## The Generator
The UI provides a structural control panel. 
* **Architecture Seed:** Enter any string. The engine hashes the string into a 32-bit integer to seed the Julia Set, creating a unique, repeatable spatial geometry.
* **Fog Density:** Adjust the volumetric atmospheric drag.
* **Rebuild Geometry:** Destroys the current manifold and generates a new one.
* **Capture Asset:** Triggers a simulated camera flash and downloads a mathematically pure `.png` of your exact coordinates.

## Dependencies
* `Three.js (r128)` - Loaded via CDN.
* `TailwindCSS` - Loaded via CDN (UI styling only).
