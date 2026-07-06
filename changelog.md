# Level 0 Engine Changelog

## [v0.1.7] - 2026-07-05

### Changed
- [ARCHITECTURE] Excised the monolithic infinite water plane in The Poolrooms sector. Replaced it with localized, procedural ceramic containment basins utilizing the `clinicMat` and `waterMat` to distribute structural weight naturally and respect cellular boundaries[cite: 9].
- [AUDIO] Stabilized the thermodynamic acoustics in The Poolrooms sector. Rebalanced the `peaceGain` target multiplier from 0.35 to 0.03, lowered the baseline frequency to 140Hz, and crushed the 1200Hz triangle whine (`whineTarget` to 0.0002) to eliminate hardware clipping and restore systemic equilibrium[cite: 10].

## [v0.1.6] - 2026-07-05

### Added
- [LIGHTING] Synthesized the Optical Fake Bounce Light (`glowMat`). Untracked ceiling panels now project a zero-cost additive radial gradient onto the floor to simulate ambient radiosity without invoking the WebGL shadow map budget.

### Changed
- [ARCHITECTURE] Decoupled ceiling panel generation from floor decor evaluation. Ceiling panels now spawn independently based on a topological clearance flag (`hasTallObstacle`), preventing them from mathematically clipping into 10-foot tall structural partitions.
- [ARCHITECTURE] Enforced strict mutual exclusion within the Sector Matrix. Light fixtures and architectural pillars in The Archive, The Clinic, and The Poolrooms are now spatially isolated to prevent overlapping geometry.
- [LIGHTING] Expanded the volumetric fill light radius from 20 to 30 units and re-anchored all hardware WebGL lights strictly to the physical ceiling fixture (`Y=2.8`) to eliminate artificial floor spotlights.

### Fixed
- [PHYSICS] Implemented the Cartesian Clearance Protocol. Procedural furniture (chairs, tables) is now mathematically blocked from spawning within a 4.0-unit radius of the player's initial coordinates `(0, 0)`, preventing physical entrapment on the `ALMOND WATER` seed.
- [WEBGL] Mitigated additive blending artifacts by resetting the `THREE.Color` instance matrix to pure white `(1, 1, 1)` strictly for optical decals, preventing opacity compounding when spatial hashes overlap.

## [v0.1.5] - 2026-07-05

### Added
- [ARCHITECTURE] Integrated "The Poolrooms" Biome into the Sector Matrix. Instantiated a monolithic ceramic foundation (`clinicMat`), a translucent water volume (`waterMat`) at `y = 0.4`, and ethereal submerged cyan lighting.
- [AUDIO] Synthesized a resonant, echoing acoustic profile (160Hz baseline, 30Hz rumble) specifically mapped to the Poolrooms threshold.
- [ARCHITECTURE] Engineered the "Enclosed Stairwell" module. Replaced free-floating stairs with a fully framed architectural dead-end bounded by three load-bearing walls.

### Changed
- [ENVIRONMENT] Extracted all DOM mutations (coordinates tracking, mobile UI toggles, seed mutations) out of the physics step and into the `main.js` observer loop, completely decoupling the mathematical state from the browser's layout renderer.
- [TEXTURES] Excised the continuous 1024x1024 macroscopic mold plane. Replaced it with decoupled, procedurally generated 8x8 organic rot decals that randomly spawn in open spaces to eradicate grid tiling.
- [LIGHTING] Elevated the global `AmbientLight` baseline from 0.45 to 0.85 to establish standard liminal exposure.
- [LIGHTING] Expanded the active shadow-casting point light limit from 6 to 15 to multiply intersecting geometric shadow volumes.

### Fixed
- [PHYSICS] Rerouted the Null Anomaly's consumption event to return a pure spatial signal (`{ consumed: true }`), preventing the entity logic from halting its own thread to execute CSS styling.

## [v0.1.4] - 2026-07-05

### Added
- [ARCHITECTURE] Installed "The Flange" (`pipeJointGeo`) primitive to cap and interlock overhead pipe segments.
- [ARCHITECTURE] Integrated continuous coolant pipelines bolted explicitly to the top outer edges of the Server Farm macro-structure racks, providing grounded, logical infrastructure.

### Changed
- [TEXTURES] Overhauled carpet mildew generation. Applied elliptical scaling and a 3x3 topological wraparound matrix to create organic, feathered moisture stains that seamlessly tile without hard clipping at the canvas boundaries.
- [TEXTURES] Drastically reduced mildew density (from 25 blooms to 4 per canvas) and increased radius variance to prevent the organic rot from forming an artificial, recognizable grid.
- [ENTITY] Implemented the Co-Metabolic Mirror. The Null Anomaly's shards now violently jitter and rotate in direct proportion to the player's stamina exhaustion ratio.
- [WEBGL] Refactored the post-processing box blur fragment shader, utilizing a static GLSL array loop to map texture offsets and dry up redundant procedural math.
- [PERFORMANCE] Optimized the Entity spatial pathfinding equations, converting expensive `distanceTo` square root operations to `distanceToSquared` to stabilize the CPU loop during active pursuits.

### Fixed
- [PERFORMANCE] Applied the Treadmill Optimization: Shrunk the infinite floor and ceiling planes from 8000x8000 down to 300x300. This completely eliminates GPU 32-bit floating-point precision loss (PS1 texture jitter) across UV interpolations while still safely encapsulating the 192x192 active render distance.
- [GEOMETRY] Excised the broken global pipe spawn from the standard probability matrix, eradicating disconnected, floating cylinders from the void.

## [v0.1.3] - 2026-07-05

### Added
- [SYSTEM] Installed a localized persistent Mnemonic Cache (`localStorage`) to continuously track and hydrate player coordinates, generation seeds, and UI parameters between sessions.
- [UI] Added a manual "PURGE MEMORY" escape hatch to the control panel to allow players to safely wipe their localized save state and reset to the spawn origin.
- [UI] Bound the 'M' key to a document-level event listener for ergonomic, frictionless control panel toggling.
- [ARCHITECTURE] Created `AcousticEngine.js`, amputating the Web Audio API synthesis graph from the Environment monolith into a dedicated, decoupled DSP module.

### Changed
- [PERFORMANCE] Implemented the Geodesic Compiler. Staged procedural geometry (chair legs, tables, shared walls) is now collapsed into `THREE.InstancedMesh` groups, reducing hundreds of identical GPU draw calls down to a single thermodynamic batch.
- [ARCHITECTURE] Rewrote the `updateLights` telemetry export to feed a clean, sanitized data payload to the external Acoustic Engine, strictly enforcing single-responsibility boundaries.

### Fixed
- [PERFORMANCE] Eliminated main-thread Garbage Collection (GC) stutters by replacing constant array instantiation in the lighting loop with a single, pre-allocated `localFixtures` memory block.
- [PERFORMANCE] Throttled the audio raycaster's `intersectObjects` evaluation against heavy `InstancedMesh` geometry from 60Hz down to a 10Hz biological rhythm, drastically reducing CPU occlusion calculations without breaking human auditory perception.

## [v0.1.2] - 2026-07-05

### Added
- [AUDIO] Synthesized the Resonant Channel (432Hz sine wave) for the Overgrown Atrium to provide a physiological breather.
- [AUDIO] Added the Anomaly's Acoustic Signature, a stuttering sawtooth wave (digital Geiger-counter) that scales exponentially with proximity.
- [MECHANICS] Implemented the Metabolic Economy. The player has a finite stamina pool that drains during a panic sprint and recovers slowly while walking or hiding.
- [MECHANICS] Added the Consumption Event. When the Anomaly overtakes the player, the engine executes a void blackout, mutates the seed with "NULL", and procedurally rebuilds a new reality.

### Changed
- [AUDIO] Consolidated spatial evaluation into a Unified Thermodynamic Read to prevent atmospheric fog and sector audio from drifting out of phase.
- [AUDIO] Decoupled environmental audio tracks (Atrium noise, Peace tones) from the hardware light proximity gain, routing them directly to the master output.
- [WEBGL] Injected the player's exhaustion state into the post-processing shader, applying a dynamic 4-tap box blur to simulate retinal fatigue when stamina drops below 30%.
- [PHYSICS] Re-calibrated kinetic inflows to allow the player to physically outrun the Anomaly (6.0 units/sec sprint vs 4.2 units/sec pursuit).
- [TEXTURES] Cloned the fabric material into a dedicated `mossMat` with a 32x32 UV wrap to maintain high-frequency noise across the Atrium macro-foundation.

### Fixed
- [AUDIO] Linked the kinetic low-pass filter to the player's exhaustion state, mathematically crushing high frequencies to simulate the physical toll of a depleted stamina pool.
- [GEOMETRY] Enforced strict vertical clearance on Atrium canopy generation. Floating greenery is now physically anchored flush against the 3.0 ceiling to prevent clipping the 1.6 camera viewport.
- [GEOMETRY] Shattered the rigid cell grid in the Atrium by applying chaotic planar offsets and organic yaw rotations to tree trunks and canopies.

## [v0.1.1] - 2026-07-05

### Added

- [ENTITY] Integrated the Null Anomaly, a procedural unlit entity constructed from Platonic solids that actively pathfinds and hunts the player across the grid.
- [AUDIO] Implemented thermodynamic crossfading and acoustic proximity pressure. The engine dynamically crushes the kinetic low-pass filter and injects a sickening sub-bass throb as the Anomaly approaches the player's coordinates.
- [ARCHITECTURE] Installed the Sector Matrix to support modular, data-driven "Villages". Added distinct macro-structures with unique generation rules: The Boardroom, The Archive, The Server Farm, and The Overgrown Atrium.
- [TEXTURES] Procedurally synthesized an Obsidian Corporate Tile and a metallic Server Rack material featuring randomized, blinking diagnostic diodes.
- [AUDIO] Generated a continuous white-noise buffer using the Web Audio API to natively synthesize the dense, damp acoustics of the Overgrown Atrium.

### Changed

- [PHYSICS] Replaced brittle linear friction subtraction with true continuous exponential decay to mathematically guarantee stability and prevent velocity inversion during heavy frame drops.
- [GEOMETRY] Drastically increased structural density by tightening fractal generation bounds and shattering contiguous open plains with standalone geometric injections.
- [ENVIRONMENT] Scaled the Boardroom centerpiece into a massive double-wide array anchored to the grid to eliminate unutilized negative space and establish psychological weight.
- [CONTROLS] Corrected the mobile touch movement X-axis polarity to establish 1:1 parity with the desktop vector math.
- [PHYSICS] Stiffened the camera's somatic suspension lerp to prevent the viewport from floating behind the physics body during sudden elevation changes.

### Fixed

- [PERFORMANCE] Replaced the state-mutating `THREE.Clock` with a deterministic `performance.now()` delta, preventing the post-processing shaders from cannibalizing the physics engine's time-step.
- [PERFORMANCE] Optimized the thermodynamic lighting loop by spatially culling fixtures outside a 30-unit volumetric boundary before executing shadow hysteresis and sorting.
- [PHYSICS] Added a Kinematic Latch to interactive doors, caching the player's initial approach vector to prevent the hinge polarity from violently snapping back while crossing the threshold.
- [GEOMETRY] Implemented Geometric Confinement for standalone alcove furniture. Chairs now explicitly spawn within the safe topological pocket of structural dividers rather than clipping through the drywall.
- [TEXTURES] Wrapped and tiled the procedural HVAC vent canvas to repair extreme visual stretching across macro-structure foundations.
- [PHYSICS] Secured the player movement vector matrix against `NaN` poisoning by explicitly validating the direction vector's length before normalization.

## [v0.1.0] - 2026-07-04

### Added
- [ARCHITECTURE] Modularized the monolithic codebase. Split the core logic into discrete ES6 modules (`main.js`, `RenderEngine.js`, `PlayerController.js`, `Environment.js`) using `export default` to drastically reduce cognitive load and establish strict semantic boundaries.
- [PHYSICS] Implemented Geodesic Spatial Hashing. Replaced the expensive O(N) global `wallBoxes` array with a highly efficient `SpatialHashGrid`, indexing geometry into 4-unit cells.
- [LIGHTING] Added Spatial Hysteresis to the shadow allocation loop. Fixtures currently holding a shadow map are mathematically biased closer by 40 units during sorting to prevent flickering and thrashing at index boundaries.
- [LIGHTING] Added a Fade Envelope to the virtual light pool. Hardware `THREE.PointLight` intensities now smoothly scale from 0 to 1 over the outer 8 units of their 20-unit radius, eliminating abrupt popping while the physical ceiling panel's `emissiveIntensity` remains visually constant.

### Changed
- [SYSTEM] Updated `index.html` to load `main.js` as an ES6 `<script type="module">`.
- [PHYSICS] Player collision and gravity step-up detection now execute an O(1) grid lookup via `spatialGrid.getNearby(px, pz, 2.0)`, ensuring physics processing cost remains flat regardless of infinite world scale.
- [SYSTEM] Updated the Thermodynamic Cache in the Service Worker (`sw.js`) to cache the new discrete ES6 modules instead of the deprecated monolith[cite: 10].

### Fixed
- [PERFORMANCE] Restored the active shadow-casting point light pool back to a strict limit of 4. This resolved severe GPU choking and delta-time capping (the "slow walking" bug) caused by attempting to render 72 shadow passes per frame.
- [SYSTEM] Repaired fatal ES6 lexical encapsulation errors by ensuring all classes strictly declare `export default`.
- [SYSTEM] Repaired the Service Worker offline asset array to map to `Environment.js` instead of the non-existent `Engine.js`[cite: 10].

## [v0.0.9] - 2026-07-04

### Added
- [ENVIRONMENT] Implemented Geodesic Chunking. The engine now dynamically generates and culls 16x16 geometry chunks based on the player's somatic coordinates to maintain a strict thermodynamic memory budget.
- [ENVIRONMENT] Added procedural furniture (Waiting-room chairs and end-tables) utilizing a novel `fabricMat` and a stamped `woodMat` to populate alcoves and corners[cite: 7].
- [PHYSICS] Added Dynamic Interactive Doors. Doors now execute a kinematic lerp to swing open when the player approaches within 3.5 units, dynamically squashing their AABB collision volumes to allow passage[cite: 7].

### Changed
- [GEOMETRY] Replaced static floor and ceiling planes with 8000x8000 "Treadmill Planes" that dynamically snap to the player's current chunk, completely bypassing WebGL `Float32` texture precision boundaries[cite: 7].
- [TEXTURES] Recalculated UV repeats for the floor (2000x2000) and ceiling (8000x8000) to perfectly align 4-unit texture tiles with 64-unit chunk shifts, eliminating visual sliding[cite: 7].
- [TEXTURES] Decoupled the woodgrain generation algorithm into a standalone `woodMat` and utilized `drawImage()` to stamp the pattern onto the door canvas, optimizing initialization load and allowing furniture upholstery[cite: 7].

### Fixed
- [WEBGL] Eradicated Z-fighting on the dynamic doorway headers by dropping the door and frame 0.05 units and expanding the jamb depth to 0.32, forcing the trim to sit structurally proud of the drywall[cite: 7].
- [PERFORMANCE] Plugged severe WebGL memory leaks by explicitly traversing and executing `.dispose()` on all child geometries and materials when a stale chunk is purged from the spatial hash map[cite: 7].

## [v0.0.8] - 2026-07-03

### Added
- [UI] Added dynamic internal resolution scaling (Native, 50%, 25%) via `#canvas-container canvas` CSS pixelation and Three.js `.setSize(..., false)`. This drastically boosts mobile GPU performance while organically enhancing the retro VHS aesthetic.
- [UI] Added an accessibility toggle for the Somatic Head Bob to assist players prone to motion sickness.
- [UI] Implemented on-screen action buttons ("RUN" and "CROUCH") with smart cancellation logic. These are dynamically hidden from desktop users via the `@media (pointer: coarse)` CSS hardware detection query.
- [SYSTEM] Added strict landscape orientation enforcement using `@media (orientation: portrait)` to display a retro system warning overlay if a mobile device is held vertically.
- [WEBGL] Enabled true point light shadows to drastically enhance the liminal atmosphere.

### Changed
- [CONTROLS] Increased the mobile virtual joystick radius from 50px to 120px and added a 10px deadzone for smoother, high-DPI thumb navigation.
- [CONTROLS] Boosted the right-thumb camera rotation sensitivity multiplier from `0.002` to `0.020`, allowing players to comfortably check 90-degree corners in a single swipe.
- [UI] Added responsive CSS media queries to the `.status-bar` to dynamically scale down VHS fonts and padding on smaller landscape screens, preventing the text from obstructing the viewport.
- [SYSTEM] Updated `manifest.json` `start_url` to `.` for better offline directory routing.

### Fixed
- [WEBGL] Mitigated "delta time explosions" (physics catapulting the player out of bounds) by explicitly clamping the `delta` multiplier to a maximum of `0.05` to survive expensive shader compilation lag spikes.
- [WEBGL] Fixed GPU shader compilation crashes (`MAX_FRAGMENT_UNIFORM_VECTORS`) by limiting high-resolution cubemap shadows to a maximum of 4 lights closest to the player's spawn point.
- [PHYSICS] Fixed a severe Z-axis collision lag spike by casting against the spatially filtered `localBoxes` array instead of the massive global `wallBoxes` array.
- [SYSTEM] Fixed PWA `ERR_FAILED` crashes on Neocities by caching `manifest.json`, bumping the `sw.js` cache version, wrapping the fetch listener in a `.catch()` block, and utilizing `ignoreSearch: true` to safely bypass host-injected cache-busting query strings.

## [v0.0.7] - 2026-07-03

### Added
- [SYSTEM] Integrated a Progressive Web App (PWA) `manifest.json` and a Thermodynamic Cache Service Worker (`sw.js`) to amputate browser UI chrome and enable native OS installation.
- [AUDIO] Implemented Volumetric Audio Raycasting. The engine now casts a dynamic geodesic ray to the nearest light source, physically muffling high-frequency DSP signals when the player breaks line-of-sight behind structural geometry.
- [TEXTURES] Created the Procedural Fluorescent Diffuser. Constructed a diamond-grid prismatic cover and a dark institutional plastic housing using a hidden canvas and a 6-face `THREE.MeshStandardMaterial` array.
- [ENVIRONMENT] Added Atmospheric Particulates. Instantiated a single `THREE.Points` cloud of 800 localized microscopic dust motes that tether to the camera and slowly rotate to simulate stale, unventilated air.
- [PHYSICS] Added Somatic Head Bob. Tethered the camera's Y-axis interpolation to the player's physical kinetic velocity vector using a low-amplitude sine wave, simulating physical mass without requiring new WebGL geometry.

### Changed
- [GEOMETRY] Refactored emissive light panel geometry. Scaled the fixture to `0.98 x 1.98` and applied a `0.5` unit minor-axis offset to seamlessly socket into a standard 1x2 drop-ceiling tile void.
- [AUDIO] Dampened the LFO phase loop and amplitude to simulate a slow ambient breath rather than a high-frequency, nauseating wave.
- [AUDIO] Replaced the aggregated ambient light volume logic with a strict geodesic proximity multiplier tied to `minLightDist`.
- [AUDIO] Dampened kinetic exertion multipliers in the biquad filter to prevent acoustic blowout while sprinting.
- [ENVIRONMENT] Re-routed the UI fog slider to update a `baseFogDensity` state variable, enabling the volumetric fog to autonomically "breathe" (+/- 30%) on a slow sine-wave loop without snapping the UI state.

### Fixed
- [PERFORMANCE] Replaced an expensive square root calculation (`distanceTo`) in the autophagic light culling loop with a mathematically cheaper squared distance comparison (`distanceToSquared`).
- [PHYSICS] Implemented Broad-Phase Spatial Filtering. The AABB collision detector now spatially isolates the `wallBoxes` array, restricting intersection tests strictly to geometry within a 6.0 unit radius of the player.
- [PERFORMANCE] Eliminated garbage-collection memory leaks in the generation loop by extracting the instantiation of the `MeshStandardMaterial` to the setup phase and utilizing `.clone()` for individual light meshes.

## [v0.0.6] - 2026-07-03

### Added
- [UI] Added an Aspect Ratio dropdown (Dynamic, 4:3, 16:9, 21:9) and encapsulated the render layers within `#screen-wrapper` to mathematically enforce cinematic letterboxing/pillarboxing.
- [UI] Added a Field of View (FOV) slider to dynamically adjust the WebGL `PerspectiveCamera` projection matrix.
- [UI] Added a real-time VHS OSD clock utilizing pure CSS keyframes (`phosphor-flicker`) to simulate cathode ray tube blooming, electrical tracking glitches, and voltage drops.
- [AUDIO] Bound player kinetic velocity to the Web Audio API's Low-Frequency Oscillator (LFO), generating dynamic, procedural breathing and footstep acoustics without external audio assets.
- [TEXTURES] Created `ventMat`, a procedural canvas texture utilizing optical illusions (horizontal louvers and pure black voids) to simulate recessed HVAC depth without relying on expensive CSG boolean operations.

### Changed
- [ARCHITECTURE] Decoupled the `generate()` structural rules from execution by implementing a Weighted Probability Matrix (`structuralMatrix`), eliminating 150 lines of brittle, nested conditional logic.
- [ARCHITECTURE] Encapsulated mobile touch event listeners and global state variables directly into the `PlayerController` to eliminate global scope leakage and establish a strict Lexical Firewall.
- [WEBGL] Decoupled physical `THREE.PointLight` instantiation from emissive ceiling meshes. Simulated ambient lighting using cheap emissive materials on all panels, while restricting physical point lights to ~25% spawn rate to prevent premature exhaustion of WebGL limitations.
- [TEXTURES] Scaled the ceiling tile UV map repeat from 50 to 300, mathematically correcting the scale to standard 3x3 foot corporate drop-ceiling proportions.

### Fixed
- [PHYSICS] Applied a 0.05 unit `snagShrink` to the player's AABB collision detection, allowing the movement vector to seamlessly glide along perpendicular planes without catching on microscopic procedural cell seams.
- [GEOMETRY] Constrained HVAC generations to a fixed dimension on a single axis to prevent bounding boxes from overlapping and generating infinite, sprawling black belts across the grid.
- [AUDIO] Fixed kinetic audio phase-jumping by isolating the dynamic speed multiplier strictly to the amplitude of the pulse, leaving the baseline sine time-step continuous.

## [v0.0.5] - 2026-07-03

### Added
- [GEOMETRY] Introduced "The Monolithic Pillar" to the generation cascade, featuring independent dynamic X/Z scaling (0.5 to 2.5 units) to break spatial predictability and line-of-sight.
- [GEOMETRY] Added "The HVAC Recess", a zero-albedo (`0x020202`) void geometry intersecting standard walls at the floor or ceiling to simulate ventilation flow without expensive boolean CSG operations.

### Changed
- [ARCHITECTURE] Implemented the `buildWall` heuristic to dynamically normalize UV coordinates based on physical world-scale, ensuring absolute 1:1 texture mapping on narrow procedural geometry.

### Fixed
- [TEXTURES] Clamped the primary wall texture's V-axis (`THREE.ClampToEdgeWrapping`) to prevent the bottom baseboard from bleeding into the top ceiling seam via linear filtering.
- [TEXTURES] Scaled and offset the `headerMat` UV map to sample only the top 10% of the wallpaper canvas, eliminating severe vertical texture compression on procedural drop ceilings.
- [PHYSICS] Fixed a deadlock entrapment bug by injecting an extraction protocol into the `generate()` method, automatically resetting player coordinates to the systemic safe zone `(0, 1.6, 0)` upon manual geometry rebuilds.

## [v0.0.4] - 2026-07-02

### Added
- [ARCHITECTURE] Integrated procedural Hallways and Ajar Doorways into the primary generation heuristic.
- [TEXTURES] Implemented `doorMat`, a procedural corporate woodgrain texture utilizing segmented alpha Bezier curves, recessed panels, and a brass knob.
- [TEXTURES] Created `headerMat` by bifurcating the wall canvas generation state to prevent baseboard texture stretching on structural drop ceilings.

### Changed
- [GEOMETRY] Expanded the procedural manifold grid from 20x20 to 40x40, quadrupling the spatial volume to 1,600 total cells.
- [GEOMETRY] Scaled the physical floor and ceiling bounding planes to 300x300 to safely encapsulate the expanded grid boundary.
- [GEOMETRY] Extended procedural stair generation to 10 steps, explicitly spanning the full 3.0 Y-axis to eliminate entrapment gaps.
- [SYSTEM] Increased `MAX_LIGHTS` to 75 to maintain ambient visibility across the expanded square footage without breaking WebGL shader limits.

### Fixed
- [PHYSICS] Fixed stair ceiling clipping by clamping maximum camera height interpolation to Y=2.8.
- [PHYSICS] Fixed stair step-off entrapment by expanding the Y-axis gravity mapping detector to match the `playerRadius` (0.4), preventing premature vertical drops.
- [GEOMETRY] Fixed Z-fighting and structural clipping between Archways, Hallways, and Doorways by enforcing absolute geodesic parity (all headers locked to Y=2.85, all supporting walls locked to Y=2.7).
- [GEOMETRY] Translated the mathematical origin of door geometries by 0.75 units to create a true edge-hinge, and aligned placement flush with the cell threshold rather than the center void.

## [v0.0.3] - 2026-07-02

### Added
- [UI] Added a dual-hemisphere mobile touch overlay (`#mobile-ui`) for smartphone navigation.
- [UI] Added a dedicated `#menuToggleBtn` to collapse the main control panel and free up the viewport on smaller screens.

### Changed
- [UI] Applied `max-height: 60vh` and `overflow-y: auto` to `.control-panel` to ensure the menu remains accessible and scrollable in landscape orientation.
- [CONTROLS] Swapped the menu toggle listener from a standard `click` to `pointerdown` to bypass the 300ms mobile browser delay.
- [CONTROLS] Applied `touch-action: manipulation` to the menu toggle button to intercept raw touches instantly.
- [CONTROLS] Re-routed desktop pointer lock requests to target `document.body` instead of the canvas, ensuring seamless desktop support beneath the mobile overlay.

### Fixed
- [UI] Lowered the mobile touch zone `z-index` to 5 so it no longer intercepts and consumes clicks meant for the generation and capture buttons.
- [CONTROLS] Injected the mobile translation inputs (`touchMove.deltaX` and `touchMove.deltaY`) directly into the `PlayerController` physics velocity vector.
- [CONTROLS] Enforced a strict `YXZ` camera rotation order on the right touch zone to prevent diagonal thumb dragging from introducing Z-axis roll (gimbal lock).

## [v0.0.2] - 2026-07-01

### Added
- [WEBGL] Added a custom native Post-Processing Pipeline using `WebGLRenderTarget` and a custom GLSL ShaderMaterial.
- [WEBGL] Added a 4-layer VHS effect (Distance-scaled Chromatic Aberration, Animated High-Frequency Static, CRT Scanlines, Claustrophobic Vignette).
- [WEBGL] Created `structMat`, a new procedural Canvas-drawn texture (dark concrete/wood) to provide visual contrast for stairs and archways against the yellow wallpaper.

### Changed
- [WEBGL] Expanded the procedural manifold grid from 100x100 to 250x250, with properly scaled UV texture repeating.
- [WEBGL] Completely overhauled procedural stair generation: Replaced stacked tiers with authentic 5-step directional staircases (N, S, E, W).
- [WEBGL] Drastically reduced staircase spawn rate from 6% to 1.5% to increase liminal rarity.
- [WEBGL] Replaced deterministic sine-wave lighting with stochastic, random-target-seeking intensity logic for authentic broken fluorescent flickering.

### Fixed
- [TESTS] Fixed `test_main.py` execution hook (`.step()` -> `.process_turn()`) for metabolic token integration tests.
- [TESTS] Fixed `test_spatial_parser.py` markdown regex extraction bugs (stripped markdown asterisks preventing capture).
- [TESTS] Added defensive float casting and `try/except` blocks in `brain/cortex.py` to allow metabolic math to safely swallow `MagicMock` objects during isolated unit tests.
- [WEBGL] Eliminated Z-fighting rendering artifacts by adjusting the height and clipping boundaries of procedural archways and stacked stair geometry.
- [WEBGL] Ensured all newly generated stair steps are pushed to the `this.walls` array individually to prevent memory leaks during WebGL Autophagy loop.

## [v0.0.1] - 2026-07-01
-Proof of Concept

## [v0.0.2] - 2026-07-01

### Added
- [WEBGL] Added a custom native Post-Processing Pipeline using `WebGLRenderTarget` and a custom GLSL ShaderMaterial.
- [WEBGL] Added a 4-layer VHS effect (Distance-scaled Chromatic Aberration, Animated High-Frequency Static, CRT Scanlines, Claustrophobic Vignette).
- [WEBGL] Created `structMat`, a new procedural Canvas-drawn texture (dark concrete/wood) to provide visual contrast for stairs and archways against the yellow wallpaper.

### Changed
- [WEBGL] Expanded the procedural manifold grid from 100x100 to 250x250, with properly scaled UV texture repeating.
- [WEBGL] Completely overhauled procedural stair generation: Replaced stacked tiers with authentic 5-step directional staircases (N, S, E, W).
- [WEBGL] Drastically reduced staircase spawn rate from 6% to 1.5% to increase liminal rarity.
- [WEBGL] Replaced deterministic sine-wave lighting with stochastic, random-target-seeking intensity logic for authentic broken fluorescent flickering.

### Fixed
- [TESTS] Fixed `test_main.py` execution hook (`.step()` -> `.process_turn()`) for metabolic token integration tests.
- [TESTS] Fixed `test_spatial_parser.py` markdown regex extraction bugs (stripped markdown asterisks preventing capture).
- [TESTS] Added defensive float casting and `try/except` blocks in `brain/cortex.py` to allow metabolic math to safely swallow `MagicMock` objects during isolated unit tests.
- [WEBGL] Eliminated Z-fighting rendering artifacts by adjusting the height and clipping boundaries of procedural archways and stacked stair geometry.
- [WEBGL] Ensured all newly generated stair steps are pushed to the `this.walls` array individually to prevent memory leaks during WebGL Autophagy loop.

## [v0.0.1] - 2026-07-01
-Proof of Concept