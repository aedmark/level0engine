# Level 0 Engine: Procedural Liminal Space Simulator v0.4.3

A minimal-dependency, mathematically pure, procedural 3D environment generator running natively in a browser via ES6 modules.

There are no external image assets. There are no imported audio files. There are no build tools, package managers, or framework abstractions. Everything you see and hear is generated locally via raw physics, procedural mathematics, and the Web Audio API.

## Core Philosophy

This engine is built on absolute architectural minimalism and efficiency:
- **Procedural Geometry & The Sector Matrix:** The maze is generated via a Julia Set fractal algorithm. It is infinite, chaotic, and deterministic. The engine utilizes Geodesic Chunking to maintain a strict memory budget, routing the generation through a **Sector Matrix** to procedurally spawn distinct "Zones" (The Boardroom, The Archive, The Server Farm, The Overgrown Atrium, The Poolrooms, etc.), each with unique materials, density, and atmospheric physics.
- **Physics & Lighting:** Collision detection relies on a highly optimized O(1) `SpatialHashGrid`. Dynamic lighting is managed by a'Lumen Grid' that teleports a fixed set of hardware shadow-casters and continuous 'Fade Envelopes' to eliminate visual popping.
- **Procedural Textures:** Every single texture is drawn pixel-by-pixel using the HTML5 Canvas API and injected directly into WebGL memory.
- **Procedural Audio & Acoustic Routing:** The ambient soundscape is powered by a live, made-from-scratch digital signal processor (DSP). The engine shifts the acoustics natively based on spatial logic from the sterile hiss of corporate HVACs to 35Hz sub-bass server growls. The engine also casts volumetric audio raycasts to physically muffle sounds when occluded by walls. This is paired with **Surface-Aware Foley**, dynamically shifting the acoustic profile of your footsteps based on the zone.
- **Adrenaline & Lethargy Curves:** Sprinting during casual exploration is efficient, but active pursuit by the Anomaly spikes adrenaline, burning oxygen twice as fast. Reaching terminal exhaustion physically crushes the audio filter, blurs the WebGL pipeline, and triggers a seamless decay of your velocity into a heavy, dragging stumble. This heavy breathing dynamically expands the Anomaly's auditory perception radius, and its pursuit speed is inversely coupled to your exhaustion: it literally feeds on panic. Furthermore, the body rejects preemptive healing; drinking Almond Water while above 70% capacity locks stamina recovery until the player reaches absolute exhaustion.
- **The Psychological Threshold:** The flashlight acts as a psychological shield, throttling the accumulation of paranoia but never reversing it. Hallucinations are strictly gated; visual FOV distortion, phantom auditory footsteps, and entity proximity hallucinations remain completely dormant until the player's psyche fractures past the 50% threshold.
- **The Quantum Observer Effect & Decoys:** The Anomaly actively hunts via line-of-sight and utilizes short-term spatial memory. It is also attracted to dropped UV tags, allowing for intentional misdirection. Catching the entity within a 30-degree cone of your flashlight mathematically freezes it in place. This angers it. And if it catches you, the engine executes a void blackout, mutates your seed string, and procedurally rebuilds a new reality.
- **Illumination & Systemic Cascades:** Traversal requires managing a heavy, incandescent flashlight that recharges from kinetic energy by sprinting in the dark or violently shaking your camera to crank out voltage. Players can find and interact with articulated **Surge Breakers** in the environment. Pulling a breaker triggers a catastrophic localized illumination cascade, shattering the bulbs and plunging the sector's atmospheric fog into a true, pitch-black void before executing a flickering reboot sequence.
- **Native Post-Processing:** The engine features a custom `WebGLRenderTarget` pipeline, applying dynamic Chromatic Aberration, crawling static, CRT scanlines, claustrophobic vignettes, and somatic retinal blurring. The optical feed is directly tethered to the Anomaly's proximity pressure, violently degrading into horizontal V-Hold tearing and desaturated static as the entity enters striking distance.

## Usage

1. Clone the repository or install as a PWA on supported browsers.
2. Serve the directory using a local web server (e.g., `python -m http.server`, `npx http-server`, or VSCode Live Server). _Note: Opening `index.html` directly via the `file://` protocol will fail due to strict ES6 module CORS policies._
3. Open the localhost URL in any modern web browser.
4. **Desktop Controls:**
- `Left-Click`: Engage a Pointer Lock (Look around)
- `Right-Click` (Hold): Kinematic Peek (Physically lean your camera 80cm around corners)
- `W, A, S, D`: Navigate spatial coordinates
- `Shift`: Sprint (Metabolically efficient until chased, then burns Adrenaline)
- `C`: Crouch (Lowers detection radius)
- `Q`: Squeeze (Compress collision radius to slide through narrow cracks)
- `F`: Toggle Flashlight (Consumes battery, expands detection radius)
- `E`: Somatic Interact (Crack open Surge Breakers, consume items)
- `T`: Spray UV Decoy Breadcrumb (Mark your path and distract the Anomaly)
- `1`: Use Battery
- `2`: Use Almond Water
- `ESC`: Release Pointer Lock/rest
5. **Mobile Controls (Landscape Only):**
- `Left Screen Half`: Virtual joystick for movement.
- `Right Screen Half`: Swipe to look around.
- `On-Screen Buttons`: Smart-canceling toggles for Run, Crouch, and the Flashlight.

## The Environment

- **Sector Stabilization & Diegetic Radar:** Players must explore the labyrinth to locate and engage three highly rare Dimensional Switches to restore power and reveal the exit. The UI serves as a triangulation tool for these objectives, displaying distance to the nearest target, but scrambles (`ERR!_m`) under intense Anomaly electromagnetic pressure.
- **The Exit Threshold:** A heavily fortified extraction bunker that only manifests in the generation matrix after all sector breakers are thrown, triggering a massive somatic thud and facilitating level descent.
- **Safe Rooms (The Outpost):** A rare chance for a fully enclosed, anomaly-shielded refuge featuring clean tile, a cot, guaranteed Almond Water, and an `isEntityBlocker` barrier that permits player entry while barring the entity.
- **The Surge Breakers:** Interactive, articulated breaker boxes. Press 'E' to crack the panel open and trigger a chunk-wide blackout cascade. Blackouts automatically resolve and restore lighting via an autonomic 25-35 second timer to preserve dynamic equilibrium.
- **Scavenged Resources:** Procedural battery cylinders restore 40% flashlight voltage, capped at 2 per chunk. Almond Water canisters grant 15 seconds of infinite stamina to aggressively outrun entities.
- **The Liminal Breach (Fast Travel):** Dead-end staircases have a 15% chance to spawn as open breaches. Walking up them uncaps the Y-axis constraints, allowing you to mathematically phase through the ceiling and warp thousands of units across the grid without mutating the quantum seed.
- **Ultraviolet Breadcrumbs:** Spray a glowing, high-visibility UV paint decal on walls (via surface-normal raycasting) to map the labyrinth and prevent circling.
- **Somatic Collisions:** High-speed kinematic impacts against structural geometry violently jolt the camera, bleed momentum, and trigger acoustic foley events. Kinematic vectors are decoupled, allowing you to seamlessly graze and slide along walls without losing perpendicular momentum.
- **Interactive Doors:** Approach a wood-grain door to trigger a kinematic latch, swinging it open precisely 90 degrees away from your approach vector.
- **Claustrophobic Bottlenecks:** Corporate partitions have been excised in favor of absolute liminal emptiness and brutalist friction. The labyrinth dynamically generates blind L-shaped doglegs and tight 0.3-unit gaps. You must physically compress your body ('Q') to slide through them, restricting traversal speed.
- **Claustrophobic Particulates:** The volumetric dust cloud dynamically spikes in opacity and particle size when the player physically crawls through vents, simulating a choking atmosphere.

## The Generator

The UI provides a structural control panel.
- **Architecture Seed:** Enter any string. The engine hashes the string into a 32-bit integer to seed the Julia Set.
- **Display Format:** Enforce strict cinematic aspect ratios (Dynamic, 4:3, 16:9, 21:9) via dynamic letterboxing.
- **Fog Density:** Adjust the volumetric atmospheric drag (which dynamically "breathes" using an LFO).
- **Internal Resolution:** Downscale the internal WebGL rendering (100%, 50%, 25%) to boost GPU performance and heavily enhance the retro VHS pixelation.
- **Rebuild Geometry:** Destroys the current manifold, resets the Spatial Hash Grid, and generates a new one.
- **Capture Asset:** Triggers a simulated camera flash and downloads a mathematically pure `.png` of your exact coordinates.

## Dependencies

- `Three.js (r128)` - Loaded via local minified JS to preserve the zero-build-tool philosophy.