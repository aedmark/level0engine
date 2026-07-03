# Level 0 Engine Changelog

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