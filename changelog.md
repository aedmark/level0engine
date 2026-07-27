# Level 0 Engine Changelog

## [v0.5.9] - 2026-07-26

_The Line of Sight Update_

### Added
- **[ENTITIES] Anomaly Contact Drought Catch-Up:** The Anomaly's passive search — used whenever it can't currently see or hear the player — crept toward their last known position at a flat 0.5%-per-frame lerp, with no way to actually close the gap if walls, bad luck, or a cautious playstyle kept breaking its line of sight. It now tracks `timeSinceContact`, seconds since it last genuinely sensed the player (sight or sound), resetting on real detection. Past 45 seconds of nothing, passive tracking eases in from 0.5% up to a 5% lerp and base pursuit speed gains +1.2, so a long drought is recoverable instead of indefinite. It still has to physically path around walls — it isn't omniscient, just no longer able to get permanently lost.

### Changed
- **[RENDERING] Incinerator Heat Wave Granularity:** The heat-wave screen distortion in the Incinerator sector was a single product-of-sines pattern at one frequency, reading as one large, overly intense ripple rather than a shimmer. Reworked into three layered wave bands (22x/55x/90x frequency, weighted 55/30/15) sampled through a domain-warped direction that rotates before the waves are applied, so the plume now curls and boils instead of scrolling in a straight grid. Peak displacement also trimmed from ~0.0158 to ~0.0117 per unit of `heat` to soften the overall intensity at the same trigger threshold.

### Fixed
- **[SOMATICS] Coherence Runaway Drain:** Coherence recovery had a hard cutoff at `perceivedDarkness >= 0.3` — below it you recovered, at or above it you drained continuously with zero recovery path until ambient darkness receded on its own, which doesn't respond to the player standing still, closing distance, or waiting. Reworked into a single continuous curve: darkness-driven drain now only begins past `perceivedDarkness > 0.4` (genuine darkness, not merely being off to the side of a working light) and eases in quadratically from that floor, so there is no longer any darkness value at which recovery becomes permanently unreachable.
- **[ENTITIES] The Anomaly Was Always Invisible:** `Anomaly.reset()` never set `this.group.visible = true`. The other three sector hazards (the Warden, the Archivist, the Ember) all explicitly restore visibility on activation; the Anomaly never did, so its mesh has been rendering invisible since `EntityManager`'s constructor first hid all entities at boot — for the life of every session. It still hunted, generated pressure, chased, and could kill the player the entire time; it was just never actually seen. One-line fix, bringing `reset()` in line with the other three entities' pattern.
- **[ENTITIES] Anomaly Sector-Routing Staleness:** `Environment.updateEntity()` (called early in the frame from `main.js`) read `_stickySectorId` before `updateLights()` — the only place that computed it — ran later in that same frame, so entity routing (which hazard is active) always worked off the *previous* frame's sector classification. Extracted the resolution logic into `Environment._resolveActiveSector()`, now called once at the top of `updateEntity`, with `updateLights` reusing that same cached result instead of recomputing its own. Both systems now agree on the current frame's sector instead of disagreeing by one frame.
- **[ENTITIES] Sector-Locked Hazards Escaping Their Territory:** The Warden and the Ember pursue with a raw `target.copy(playerPos)` and actively force open any interactive door within range while chasing, with no awareness of their own sector's boundaries — a determined chase (or a door left open) could walk either straight out into the hallway, directly into the Anomaly's own territory. Added `Environment.getSectorBounds(id)`, which unions every generated macro-zone carrying a given sector id into one bounding box. The Warden, the Archivist, and the Ember now clamp to their own sector's bounds on every spawn (including the generic 40-55 unit respawn offset, which didn't know a given room's actual footprint) and unconditionally at the end of every locomotion tick, so they can neither be chased out nor get stranded outside if ever displaced.
- **[RENDERING] Distance Z-Fighting:** `WebGLRenderer`'s `logarithmicDepthBuffer` option existed in `RenderEngine.js` but was gated behind an undocumented `?logdepth` URL flag, off by default. With the camera's 1000:1 far/near ratio (100 / 0.1), a standard depth buffer front-loads its precision near the camera and runs out fast at range — coplanar textures that resolved cleanly up close would start fighting for the same pixel once the player backed away, reported as textures visibly overlapping only at a distance. Logarithmic depth buffering is now the default; `?nologdepth` is left as an opt-out for perf comparisons on lower-end GPUs.

## [v0.5.8] - 2026-07-26

_The Threshold Update_

### Added
- **[PERFORMANCE] Airlock-Gated Sector Loading:** Macro-structure sectors (CHASM, ARCHIVE, BOARDROOM, INCINERATOR, and other airlock-accessed sectors) no longer generate their full interior geometry the moment the player walks within render distance. Only the entrance shell — walls, floor/ceiling, and the airlock itself — builds on approach. The expensive interior (CHASM's catwalks and pillars, for example) now generates only once the player commits by pressing that airlock's switch, and the inner door won't open until it's finished loading. A sector's full generation cost is paid once, at the one moment the game can plausibly hide it behind an in-fiction loading beat, instead of landing silently mid-exploration.

### Fixed
- **[PERFORMANCE] CHASM Lighthouse Shader Recompiles:** CHASM lighthouse fixtures were instantiating a redundant raw `THREE.PointLight` in addition to registering with the engine's pooled lighting system (`LumenGrid`). Because that extra light entered and left the scene graph with every CHASM chunk load/unload, WebGL had to recompile shader programs across every standard-lit material in the scene each time the active light count changed — the actual cause of the hard stutter reported when traversing CHASM. Removed; the pooled fixture already lights the bulb.
- **[WORLD] Missing/Invisible Macro-Sector Perimeter Walls:** Macro-structure chunks could show a gap in their boundary wall, or a wall that was solid to collide with but invisible, before the sector had ever been entered. Both were side effects of deferring a sector's interior generation; the perimeter wall and entrance module are now fully built and rendered as part of the eager entrance shell described above.

## [v0.5.7] - 2026-07-25

_The Maintenance Update_

### Added
- **[WORLD] Hazard Cone Physics:** Added interactive hazard cones to the MAINTENANCE sector. Sprinting into a cone will procedurally trip it over, calculating the impact angle and animating it falling away from the player.
- **[SOMATICS] Stumble & Trip Mechanics:** Implemented a new `somatic-trip` event in the `PlayerController`. Tripping over objects immediately forces the player out of their sprint state and applies a violent, decaying camera dip and roll to simulate losing balance.
- **[RENDERING] Custom Spot Angles:** Upgraded the `LumenGrid` illumination system to accept custom `spotAngle` and `spotPenumbra` definitions for individual fixtures.

### Changed
- **[WORLD] Hazard Light Sweeps:** Hazard lights in the MAINTENANCE sector now utilize the upgraded `LumenGrid` system to cast an ultra-wide (60-degree), soft-edged spotlight beam. This restores their ability to cast sweeping, rotating shadows while maintaining a broad area of illumination.
- **[WORLD] Hazard Trim Seamless Extensions:** Updated the `MaintenanceSector` generator to treat off-chunk airlock coordinates as open space, permitting the yellow-and-black hazard floor trims to seamlessly extend across chunk boundaries and directly touch the airlock doors.

### Fixed
- **[PHYSICS] 3D Interaction Bounds:** Fixed a bug where interactions with small floor objects (like cones) would fail because the 3D distance check included the camera's Y-height (1.6m), putting it outside the 0.8m radius. Replaced it with a 2D planar X/Z distance check.

## [v0.5.6] - 2026-07-25

_The Photophobia Update_

### Added
- **[SOMATICS] Photophobia Effect:** Implemented a new somatic post-processing shader. When the player stares directly into bright light sources (like the CHASM searchlights), the engine triggers an extreme luminance blowout and a radial ghosting blur to simulate ocular strain and pupil dilation.
- **[ARCHITECTURE] Volumetric Beam Heuristic:** Added a lightweight, high-performance translucent cone geometry using additive blending to simulate atmospheric god rays in the CHASM.
- **[ARCHITECTURE] Dynamic Housing Shields:** Attached procedurally rotating metal housing shields to the CHASM lighthouses. These physically block the emitting bulb from the rear and sides, ensuring the photophobia effect only triggers when the sweeping beam directly intersects the player's foveal cone.

### Changed
- **[WORLD] CHASM Density Calibration:** Reduced the procedural lighthouse generation cap from 7 to 4 to optimize visual density and structural carrying capacity.
- **[ARCHITECTURE] Sector Light Culling:** Updated the environment loop to strictly cull CHASM searchlights and volumetric beams until the player explicitly crosses the airlock threshold, preventing light bleed into adjacent sectors.
- **[ARCHITECTURE] Codebase Documentation:** Expanded the taxonomical in-line JSDoc documentation across the `src/world` directory, covering `Sectors.js` and `SetPieces.js`.

### Fixed
- **[RENDERING] Depth-Sorting Artifacts:** Resolved a Z-buffer depth sorting bug in the CHASM lighthouses where nested transparent materials caused the physical bulbs to become invisible behind the glass casing.

## [v0.5.5] - 2026-07-24

_The Ember & Taxonomy Update_

### Added
- **[ENTITIES] The Ember:** A lethal new entity unique to the `INCINERATOR` sector. It employs a Catch-22 "Weeping Angel" mechanic—moving blindingly fast when unobserved, but rapidly absorbing heat and draining the player's stamina if stared at for too long.
- **[ENTITIES] Somatic Heat Signatures:** The Ember radiates heat into the `AcousticEngine` via procedural heavy footstep and fire crackle acoustics that scale dynamically with its internal heat level.

### Changed
- **[ARCHITECTURE] Engine Taxonomy & Documentation:** Reorganized the internal structures of `Environment.js`, `main.js`, and `RenderEngine.js` using a custom AST parser script (`organize_env.cjs`). Categorized massive monoliths into strict taxonomical blocks and applied comprehensive JSDoc banners for human-readability.

### Fixed
- **[ENTITIES] Entity Spawn Point Clumping:** Fixed a critical rendering oversight where inactive entities (like the Warden and Archivist) were being added to the scene at `(0,0,0)` upon initialization before being assigned to a sector, causing massive geometry clipping at the default player spawn point.
- **[ENTITIES] Entity Pathfinding:** Added a `stuckTimer` failsafe to `IncineratorEntity` so it automatically blinks closer to the player if it gets trapped behind maze walls for more than two seconds.

## [v0.5.4] - 2026-07-24

### Added
- Procedural card-based random seed system (`generateCardSeed()`) for unique world generation on every cold boot.
- New post-processing heat wave distortion shader active in the INCINERATOR sector.
- Massive particle system upgrade for the INCINERATOR, adding thousands of fast-moving, glowing orange embers.

### Changed
- Refactored the procedural chunk generation to guarantee all macro-structure airlocks connect perfectly to a 9x9 perimeter ring in adjacent chunks, preventing impassable walls.
- Placed a 5x5 solid pillar in the center of all procedural maze chunks to prevent unnaturally long, straight corridors and preserve the maze feeling.
- Improved lighting in the CHASM sector by enabling double-sided shadows on floors and increasing shadow camera depth for the giant lighthouse fixtures.
- Dropped the ambient light and glow intensity in the INCINERATOR to create a darker, more oppressive atmosphere that emphasizes the glowing embers and emergency lights.

### Fixed
- Fixed an issue where the heat wave shader's UV coordinate shift was breaking the CRT monitor border effect by moving the distortion to the texture lookup phase.
- Fixed a major framerate drop in the post-processing shader by eliminating divergent `if` branching.
- Fixed a bug where reading the `delta` timer in the rendering loop was accidentally resetting the physics simulation clock, causing the player to move at a fraction of the intended speed.

## [v0.5.3] - 2026-07-24

_The Archive Aesthetics Update_

#### Added

- **[AESTHETICS] Procedural Clutter:** Completely removed the generic banana boxes and file cartons scattered across the Archive sector. Replaced them with massive, dense clusters of procedurally generated books, sprawling piles of typed papers, and large coffee stain ring decals to simulate the frantic aftermath of panicked researchers.
- **[GEOMETRY] The Scholar's Desk:** Designed and integrated a brand new wooden desk object into the Archive's procedural generation pool, featuring dual drawer pedestals and a heavy modesty panel.
- **[AESTHETICS] Authentic Book Materials:** Dynamic books now map independent, high-detail procedural canvas textures per-face, allowing rich archival colors (crimson, navy, forest green, leather brown) to wrap the spines and covers while exposing finely striated, off-white pages on the edges.

#### Changed

- **[GEOMETRY] Archive Ceiling Expansion:** Doubled the physical height of the Archive sector's perimeter walls from 3.0 to 6.0 meters, pushing the upper bounds into the darkness and preventing the hanging bowl lights from casting hard, immersion-breaking cutoffs against the void.
- **[AESTHETICS] Wainscoting Calibration:** The procedural wall texture in the Archive was mathematically shifted to keep the bottom walnut paneling physically anchored at its original waist-height, allowing the upper forest-green wallpaper to seamlessly stretch upward into the darkness without distorting the wood.
- **[GEOMETRY] Furniture Scaling & Refinement:** Re-calibrated the architectural scale of the desks and book carts in the Archive, bringing them up from awkwardly miniature dimensions to a sturdy 1.5x and 1.25x scale respectively, ensuring they read as imposing, heavy furniture. Clutter algorithms were also updated to allow books and papers to randomly spawn directly on top of the new desk surfaces.

## [v0.5.2] - 2026-07-23

_The Chasm Overhaul Update_

#### Added

- **[GEOMETRY] Procedural Chasm Lighthouses:** Completely replaced ambient lighting in the Chasm sector with a procedural lighthouse system. Massive spotlight towers now spawn dynamically deep in the abyss (between `y = -25.0` and `y = 9.0`), casting sweeping, volumetric beams that explicitly track the walkable catwalk level. The engine strictly guarantees 4 to 7 lighthouses per chunk, providing dramatic, intersecting shadows that emphasize the vast verticality.
- **[AUDIO] Chasm Foley Profile:** The Chasm now features a custom procedural footstep acoustic profile. Stepping on the catwalk triggers a fast-attack `240Hz` triangle wave passed through a `1600Hz` bandpass filter with a long decay, perfectly simulating the heavy, echoing clank of walking across rusty industrial grating (reminiscent of the grating sounds from Silent Hill).
- **[GEOMETRY] Catwalk Truss Infrastructure:** The Chasm's floating floor tiles have been completely overhauled. The catwalks are now supported by a massive, procedural structural truss system consisting of corner support legs dropping 80 meters into the void, reinforced by an intricate network of X-braced diagonal crossbeams. The generic half-wall railings were also replaced with harsh black-iron bar railings.
- **[FX] Abyssal Spore Particles:** The Chasm's particle system now generates a slow-moving, upward-drifting cloud of bioluminescent blue spores, creating an eerie, deep-sea aquatic aesthetic as they float up from the darkness below.

#### Changed

- **[LIGHTING] LumenGrid Lighthouse Culling:** Updated the engine's `LumenGrid` occlusion subsystem with a special architectural exception for lighthouses. Previously, aggressive bounds would cull all light sources over 35 meters away. Lighthouses now have an expanded culling boundary of 120 meters and their physical `SpotLight` distance has been boosted to 150 meters, allowing them to remain active and cast dynamic shadows from across the entire sector.
- **[GEOMETRY] Sector-Aware Airlock Ceilings:** The engine's chunk builder now dynamically passes sector IDs down into the perimeter hallway logic. Airlocks transitioning into the Chasm no longer generate an immersion-breaking 2D drop-ceiling plane; instead, they generate a 3D flush structural cap with an internal dropped bezel ring rendered in dark industrial metal, perfectly framing the entrance into the void.
- **[LIGHTING] Flashlight Calibration:** Drastically boosted the player's flashlight intensity in `Environment.js` to counteract the total removal of ambient lighting in dark sectors like the Chasm and the Impound, rendering it highly effective and essential for navigation.
- **[AESTHETICS] Catwalk Perforated Grating:** The generic tile floor of the Chasm has been replaced with a procedural rusted metal material. It utilizes a dynamically generated canvas texture that simulates a dotted perforation pattern using `destination-out` composite operations, making the floor physically transparent so players can see the darkness—and the sweeping lighthouse beams—directly through the grating beneath their feet.
- **[AUDIO] Environmental Groans:** Implemented procedural metallic groaning synthesis in `AcousticEngine` with randomized pitch drops and varied durations, sounding like a sinking ship settling into the abyss.


## [v0.5.1] - 2026-07-23

_The Checkpoint Guidance & Sector Hunt Update_

#### Added

- **[UI] Sector Hunt Debug Tool:** Added a sector selection dropdown to the debug overlay. Engaging it triggers a rapid background generation loop that hunts for the chosen sector and immediately teleports the player to it, removing the guesswork from targeted environment testing.
- **[UI] Interactive Crosshair:** The center reticle now acts as a dynamic interaction probe. When the player aims at an interactable entity (clipboards, keypads, doors, etc.) within range, the crosshair expands to clearly signal that an action is available, bridging the gap between presence and interaction.
- **[AUDIO] Procedural Sector Foley:** Added two new sector-specific acoustic loops to `AcousticEngine`:
  - `CHECKPOINT`: Emits erratic digital static, data processing hums, and monitor glitches to give life to the massive central terminal core.
  - `BOARDROOM`: Features eerie, muffled corporate echoes—shuffling papers, distant ringing phones, and intermittent pen clicks—cutting through a heavily reduced white-noise floor.

#### Changed

- **[GEOMETRY] Checkpoint Painted Guiding Lines:** The Checkpoint sector floor has been upgraded from generic tile to a tiling concrete texture layered with colored directional stripes (red, yellow, blue). Rather than stretching a low-res texture across the chunk, the stripes are generated natively as dedicated planar decals that flawlessly trace the corridors. They intersect seamlessly at the central monitor core via a custom cross texture and properly extend underneath the sector's entrance airlocks.
- **[PARTICLES] Volumetric Smoke Particles:** Refactored the engine's particle geometry. Smoke and dust clouds (most notably in the Annex) no longer render as flat, ghostly squares. They now use a procedural radial-alpha sphere mapping, smoothly blending out at the edges to simulate authentic volumetric gas.
- **[NARRATIVE] Context-Aware Document UI:** The document reading interface now adapts to the nature of the prop. Paper notes and records are rendered pinned to a physical clipboard overlay, while electronic logs and laptop terminals display within a high-contrast, glowing retro CRT interface.

#### Fixed

- **[LIGHTING] Solid Fence Shadows:** Chainlink fences in the Impound yard and throughout the facility incorrectly cast solid, impenetrable wall shadows. The fence material has been properly exempted from the shadow-caster pass.
- **[LIGHTING] Stadium Light Cones:** Stadium fixtures in the Impound sector were casting omnidirectional light, projecting impossible shadows directly backward onto their own poles. They now correctly project a focused 45-degree spotlight cone.
- **[AUDIO] The Anomaly Airlock Stutter:** Fixed a critical acoustic collision where the Anomaly attempting to shoulder through a sliding airlock door would continuously re-trigger the interaction event, causing the heavy hydraulic hiss to stack into a deafening, infinite audio glitch.

## [v0.5.0] - 2026-07-22

_The Architectural Exodus & Agricultural Expansion Update_

#### Added

- **[AUDIO & FX] Dynamic Sector Acoustics:** The `AcousticEngine` now triggers procedural audio dynamically based on sector conditions:
  - `IMPOUND`: Parked vehicles occasionally emit procedural idling engine rumbles (modulated sawtooth waves passed through a lowpass filter) and sporadic square-wave car horns in the distance.
  - `ANNEX`: A tape-warped, heavily detuned Bossa Nova sequence fades in, simulating degraded Muzak playing through cheap PA speakers.
- **[FX] Procedural Sector Particulates:** The global dust loop in `Environment.js` now alters its behavior dynamically per sector:
  - `IMPOUND`: Dust simulates falling ash/snow with slow downward drift.
  - `ANNEX`: Dust simulates thick nicotine smoke by increasing particle opacity/size, reversing drift upwards, and lerping to a dingy pale yellow color.
  - `SERVER`: Dust is caught in aggressive horizontal drafts simulating massive industrial cooling fans.
- **[GEOMETRY] Server Sector IT Clutter:** The random floor clutter in the Server sector aisles has been replaced with procedural IT-specific geometry: empty wooden pallets, large wooden spools of CAT6 cable, and rolling metal A/V carts occasionally carrying CRT monitors.
- **[GEOMETRY] Atrium Agriculture Expansion:** The Atrium's previously cubist corn walls have been supplemented with organic, procedural narrative artifacts. Scarecrows (constructed from wood and fabric geometry), scattered wheelbarrows (metallic trays on cylindrical wheels, occasionally overturned as obstacles), and abandoned scythes now spawn within the pathways and corn blocks. This breaks up the purely Euclidean grid and injects thematic density into the sector.

#### Changed

- **[GEOMETRY] Impound Sector Lighting:** The standard claustrophobic ceiling lighting fixtures have been entirely removed from the Impound yard. Illumination is now provided by towering stadium lights mounted on poles scattered randomly throughout the environment.
- **[ARCHITECTURE] The Great Root Exodus:** The engine's monolithic, root-level structure has been completely modularized. Over 20 core Javascript files were migrated from the root directory into a categorized `src/` hierarchy (`core/`, `math/`, `world/`, `world/sectors/`, `aesthetics/`, `player/`, `entities/`, `narrative/`). An automated sequence updated all relative ES module imports across the repository mathematically. The root directory is now clean, housing only the HTML entry points and `main.js` to preserve web server mapping.
- **[GEOMETRY] Clinic Ceiling Collapses:** Previously, ceiling cave-ins were simulated by a massive, solid concrete block hanging mid-air from the ceiling. This has been replaced with a proper grounded, impassable rubble pile. The generation now includes a simulated dark void in the ceiling layer, scattered broken concrete chunks, exposed rebar, a severed ventilation duct, and fallen ceiling tiles resting on the rubble base. The collision matrix has been updated to track the grounded pile.
- **[GENERATION] Clinic Collapse Frequency:** The threshold for a Clinic structural failure was previously an 8% probability per eligible path chunk, generating an excessive number of cave-ins per zone. The probability curve has been sharply tuned down to 1.5%, ensuring these collapses remain rare anomalies that yield roughly 1 or 2 per Clinic sector.
- **[GEOMETRY] Impound Ceiling Raised:** The Impound sector no longer shares the claustrophobic 3.0-unit standard ceiling height. The base environment logic was updated to support dynamic sector heights, forcing the Impound roof up to a 6.0-unit elevation. The `buildPerimeter` structural kit was similarly synchronized to build 6.0-unit perimeter walls to mathematically seal the newly increased volume against the surrounding void.