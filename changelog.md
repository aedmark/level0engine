# Level 0 Engine Changelog

## [v0.9.0] - 2026-08-08

_The Signal Integrity Patch_

### Fixed

- **[WORLD] POI Signal Desync:** Fixed a chunk-streaming bug where the anomalous POI signal could silently swap targets mid-hunt. Chunk eviction pruned points of interest from the world state without checking whether the removed entry was the player's active hunt target, so a POI whose chunk streamed out from under it while still being tracked (common at low render-distance settings) would vanish and get quietly replaced by an unrelated virtual breaker target, reporting its distance under the same "POI DISTANCE" readout with no continuity between the two. `ChunkManager` now pins the active hunt target's chunk into the keep-set every time chunk coordinates update, so it can't be evicted while it's being hunted.
- **[ENGINE] Compass Free-Spin on Boot:** Fixed the compass needle wandering in a directionless sine drift for the entire window between spawn and the first sector triangulation. The needle now holds a fixed world-space fallback bearing, rolled once at spawn, and eases into the real bearing through the existing spring damper once a sector resolves — no more idle spin, no hard cut on acquisition.

### Changed

- **[WORLD] Faster Sector Triangulation:** Reduced `macroSpawnExclusionRadius` from 3 chunks to 1, cutting the mandatory dead zone before the nearest sector becomes eligible to spawn from roughly 192m to 64m. Shrinks the average time-to-first-fix for the compass and gets players into triangulated territory noticeably sooner.

## [v0.8.5] - 2026-08-07

_The Unified Lore Update_

### Added

- **[WORLD] Unified Lore Architecture:** Replaced the sprawling array of scattered JSON files (`library.json`, `tapes.json`, `ephemera.json`, `tags.json`) with a single, consolidated `lore.json` file. The `StoryEngine` now ingests this unified payload and intelligently buckets narrative fragments based on their assigned `type`.
- **[TOOLING] Lore Type Taxonomy:** Upgraded the Archive Editor to support a new `type` property dropdown when creating/editing entries in `lore.json`. Content creators can now explicitly designate text as a Document, Tape, Note, Laptop / Terminal, or Clipboard / Tag, directly dictating how the world generator physically instantiates it in the environment.
- **[WORLD] Data-Driven Rendering:** Updated the in-game UI logic (e.g. `DocumentViewer.js`) to decouple visual rendering (like the clipboard overlay) from hardcoded sector location checks. The rendering logic now natively respects the data fragment properties injected by the StoryEngine.
- **[TOOLING] Dynamic How-To Guide:** Overhauled the Archive Editor's empty welcome screen. The editor now dynamically fetches and renders a comprehensive, Markdown-based tutorial (`HowTo.md`) on the home screen, explaining exactly how the story engine logic flows and how data compiles.

### Fixed

- **[TOOLING] List View Rendering:** Fixed an oversight in the Archive Editor where opening array-based files (like `parameters.json`) would immediately auto-select the first index rather than cleanly rendering the full top-level list of categories.
- **[TOOLING] Input Field Stretching:** Fixed a CSS quirk where parameter input text boxes would aggressively expand to fill the entire width of the canvas. They now elegantly shrink-to-fit their character length.
- **[WORLD] Impound Tags Routing:** Fixed an issue where the `StoryEngine` was looking for `CLIPBOARD_` prefixes to supply the Impound sector, while the actual procedural generator was requesting `TAG_` prefixes.

## [v0.8.4] - 2026-08-06

_The Microsector Update_

### Added

- **[WORLD] Microsector Generation:** Procedural generation has been entirely overhauled. The generator no longer simply "deletes walls" to hollow out empty pathways. Instead, the Drunkard's Walk algorithm traces continuous routes through the chunk, encases the entire path in thick, inescapable solid rock, and forcefully injects dedicated architectural blueprints into the resulting empty space to create sprawling, unbroken microsectors.
- **[WORLD] The Crawlspace:** Added the `CRAWLSPACE_HALL` blueprint. Paths generating this theme feature a severely dropped ceiling (1.2m clearance), forcing players to crouch-walk through winding, claustrophobic corridors decorated with overhead pipes.
- **[WORLD] The Crevice:** Added the `CREVICE_HALL` blueprint. This microsector pushes massive false walls inward and blocks corners with jagged pillars, leaving only a tight 1m-wide gap for players to squeeze through.
- **[WORLD] The Queue:** Added the `RIDE_QUEUE_HALL` blueprint. This microsector lines the walls with partitioning alcoves, structural pillars, and occasional stanchions to emulate the winding queue lines of a theme park ride.

- **[WORLD] Airlock Clearance Override:** Upgraded the airlock generation loop to forcefully wipe any microsector themes (`CRAWLSPACE_HALL`, etc.) from its clearance zone. This guarantees the 3x3 area immediately in front of an airlock remains a clean, unobstructed hallway even if a procedural microsector path winds its way into the sector boundary.
- **[WORLD] Native Airlock Pathing:** Removed the legacy "Pocket Recovery" flood-fill algorithm (which was responsible for spawning strange, inaccessible Vents in flat walls). Sector airlocks are now natively integrated into the Drunkard's Walk algorithm, guaranteeing a seamless architectural path directly to the airlock doors.

## [v0.8.3] - 2026-08-05

_The Krull Mechanics Update_

### Added

- **[WORLD] Krull-Style Dynamic Breaker Spawning:** Breaker podiums no longer generate completely at random. The game now actively tracks when the player has earned a breaker (by visiting enough anomalous points of interest). When a breaker is earned, the engine dynamically generates a virtual location 3 chunks ahead of the player's path and seamlessly injects the physical breaker into the environment the moment the player arrives at the targeted chunk.
- **[WORLD] Virtual Breaker Relocation:** If a player ignores the tracking signal and walks too far away in the opposite direction from an unspawned virtual breaker, the engine will destroy the virtual target and immediately relocate it ahead of their new path to prevent soft-locking.
- **[AESTHETICS] Fern Shadow Polish:** Disabled shadow casting exclusively on fern leaves to fix a rendering quirk where the alpha-tested transparency layer would cast an ugly rectangular depth shadow. The ceramic pots still cast solid shadows for grounding.

### Fixed

- **[ENTITIES] Anomaly Grace Period:** Fixed a massive oversight where the Anomaly's 12-second grace period was both far too short and resulted in the Anomaly spawning directly in the center of the player's starting chunk. The grace period has been increased to 90 seconds, and the Anomaly is now safely parked far away in the void until the timer expires and it naturally teleports into the maze.
- **[WORLD] Generic Plant Generation:** Banished ferns and potted plants from the generic, procedural maze pool. They now exclusively spawn in curated locations (the Clinic, the Boardroom, and the Annex) to maintain their aesthetic rarity.

## [v0.8.2] - 2026-08-05

_The Atrium Terror Update_

### Added

- **[ENTITIES] The Atrium Claw:** Added a terrifying new entity to the Atrium sector. If a player stands still or moves too slowly in an aisle without overhead cover, a giant mechanical claw will descend from the ceiling, snatch them up, and pull them into the darkness above.
- **[AUDIO] Foley Engine Expansions:** Added new synthesized procedural sounds for the mechanical claw (`claw_warning`, `claw_drop`, `claw_snap`, `claw_ascent`) to create a tense and heavy industrial feel during its descent and capture phases.
- **[ENGINE] Cinematic Camera Lift Fix:** Fixed a major bug where the `PlayerController`'s ground-snapping physics would fight cinematic overrides. The camera physics engine now cleanly disengages when the player is frozen, allowing custom events like the Claw to lift the player freely into the air.
- **[WORLD] Atrium Scale Pass:** Increased the scale of vending machines by 20% to make them more imposing. Scaled up grocery bags, soup cans, and product boxes by 25% to better fit the shelves and environment.
- **[WORLD] Grocery Bag Overhaul:** Completely reworked the geometry of the paper grocery bags. They are now generated as open-topped, double-sided meshes with slight randomized crinkles instead of aggressively tapered blocks. They now properly lay flat when spilled and have a 40% chance of spawning upright.
## [v0.8.1] - 2026-08-05

_The Archive Editor Update_

### Added

- **[TOOLING] Zero-Dependency Archive Editor:** Replaced the bloated 500MB Node.js/Next.js lore editor with a hyper-lightweight, zero-dependency Vanilla JS, CSS, and Node.js stack. The `lore-editor` directory now contains just two core files (`server.js` and `editor.html`), reducing the entire footprint to under 20KB while preserving the sleek glassmorphism UI.
- **[WORLD] Dynamic Finale Generation:** Extracted the hardcoded bounds in `StoryEngine.js`. The engine now dynamically calculates its random seed limits directly from the length of `finales.json`. Adding a 4th or 5th ending into `finales.json` will automatically throw it into the selection pool on the next boot without requiring any code changes.
- **[UI] Inline Tag Editor for Library:** `tags.json` is no longer managed as a standalone dictionary of raw text boxes. The Archive Editor now surfaces "Thread Tag" fields directly inside the `library.json` entry view. Editing a narrative entry seamlessly manages its corresponding tag in the background, preventing engine desyncs.
- **[UI] Visual Form for Names:** Replaced the cumbersome array-of-entries tree view for `names.json` with a bespoke, visually clean list interface. Users can scroll, add, and remove strings via a pinned input bar instead of manipulating raw JSON objects.
- **[UI] Finale Hint Box Extraction:** Re-architected `finales.json` to be an array of objects (`{option, text}`) so the `option` property can cleanly power the final Verdict button text. The editor's Foreshadow view has been upgraded to parse this new structure for its Target Finale hints.
## [v0.8.0] - 2026-08-05

_The Seamless UI Update_

### Added

- **[UI] In-Engine Virtual Cursor:** Overhauled the pointer lock system. Opening menus (Journal, Keypad, Documents, Inquest) no longer drops the browser's pointer lock. Instead, the engine intercepts mouse movement to drive a custom, glowing amber virtual cursor. This allows for seamless interactions with in-game UI overlays without the jarring appearance of the OS cursor, significantly improving immersion.
- **[UI] Seamless Settings Menu:** Adjusted the pause/settings menu (`Tab`) to smartly drop pointer lock so users can natively interact with complex HTML form elements (like sliders and dropdowns), and automatically request pointer lock again when the menu closes, immediately returning the player to the action.
- **[UI] Personal Journal System:** Introduced an amber PDA-style Journal overlay (`J` key) that dynamically tracks and lists all collected story fragments and data recovered throughout the facility. Players can now review the lore they've discovered at any time.

## [v0.7.9] - 2026-08-04

_Atrium Clutter & Room Connectivity_

### Added

- **[WORLD] Guaranteed Room Connectivity:** The procedural generation algorithm now runs a topological flood-fill pass on every generated chunk immediately after the fractal noise walls are carved. Any completely isolated rooms or empty pockets that got sealed off are identified, and the generator forces open the thinnest wall separating them from the main maze.
- **[WORLD] Breach Geometries:** The holes punched by the connectivity pass are populated with one of three randomized "breach" structures: a formal heavy iron doorway frame, a floor-level ventilation grating you must crouch through, or a jagged, misaligned wall crevice. You will no longer find completely inaccessible rooms on the minimap.
- **[AESTHETICS] Atrium Environmental Clutter:** The Atrium aisles now feature a variety of abandoned clutter that randomly spawns in empty spaces to enhance the chaotic supermarket vibe:
  - Scattered soup cans with procedural red-and-white retro labels.
  - Spilled paper grocery sacks (reusing the carpet bump map for wrinkly texture) with contents spilling outward in a cone.
  - Abandoned, scaled-up shopping carts.
  - Knocked-over shopping carts lying on their sides with spilled cans.
  - Piles of forgotten promotional flyers littering the floor.

### Fixed

- **[WORLD] Spawning Inside Solid Walls:** Fixed an issue where the player's initial warp coordinates were hardcoded to the exact center of the starting chunk. Because every chunk's center acts as a guaranteed solid "blocker" to break up sightlines, the initial safe-spawn logic would push the player into the nearest randomly generated noise pocket, occasionally leaving them permanently trapped. The spawn point has been relocated to the designated 4x4 safe zone in the corner of the chunk that always connects directly to the main artery pathways.
- **[WORLD] Missing ChunkManager Else Block:** Restored a missing closing bracket in `ChunkManager.js` that caused an `Unexpected end of input` and `Identifier has already been declared` syntax errors when isolating empty space generation logic from wall cell generation.

## [v0.7.8] - 2026-08-04

_Narrative Unbound & Archive Aesthetics_

### Added

- **[AESTHETICS] Detailed Archive Books:** Refined Archive shelf geometry so that the ends of book rows display actual book faces or bookend plates instead of flat spine textures.
- **[WORLD] Dynamic Narrative Loading:** Completely stripped out hardcoded case files and names. The engine now dynamically loads `library.json`, `tapes.json`, `finales.json`, `foreshadow.json`, `ephemera.json`, `tags.json`, and `names.json` at runtime, meaning lore can be expanded without touching code.
- **[WORLD] Smart Token Replacement:** The narrative system now uses a custom string template parser that deeply iterates over the loaded JSON text and intelligently substitutes character names and procedural math equations on the fly.
- **[DOCUMENTATION] Narrative Guide:** Added `data/HowTo.md` detailing how to use and extend the dynamic narrative JSON structures.

### Changed

- **[AESTHETICS] Subtler Archive Floors:** The scuff and smudge bump mapping on the Archive floors was adjusted. They are no longer heavily embossed like crayon marks, but are instead faint and reflective, catching the flashlight realistically similar to the Clinic floors.

## [v0.7.7] - 2026-08-03

_Context-Aware Generation_

### Added

- **[AESTHETICS] Bespoke Server Textures:** The Server Sector used to simply recycle standard vent textures for both its floor and ceiling, which looked overly emissive and bright. It now features two brand new, custom-drawn procedural textures: a dark perforated raised floor tile texture for the ground, and a dark slotted acoustic panel texture for the ceiling.
- **[WORLD] The Vents Are Context-Aware:** `DuctOrVent` and `TunnelBurst` procedural structures now dynamically query the generated wall grid around them to orient their openings toward clear floor cells, meaning they no longer randomly point into solid walls. If placed inside a thick wall segment, they will forcefully carve a pathway through the adjacent generation grid to guarantee an exit on the other side, turning useless dead-end crevices into functional secret passages that bridge rooms. If a tunnel evaluates that it is completely buried with no accessible entrance at all, it smartly aborts generation and defaults back to a solid wall block rather than spawning a dead end.
- **[WORLD] Doors Hide Complete Micro-Sectors:** `HingedDoorway.js` has been upgraded to a Micro-Sector Generator. Instead of just placing a door in a wall that opens to whatever random hallway the engine spawned behind it, a doorway will now intentionally hijack the generator and carve out a fully enclosed 2x2 to 4x4 room into the grid space behind it, bordering it off with solid walls so the room is hermetically sealed and hidden from the rest of the maze until the door is opened.
- **[WORLD] Recursive Corridors:** Added a `ctx.forceStructure` command into the core loop of `Environment.js` that allows blueprints to enforce rules onto cells yet to be generated. When a hidden doorway room is generated, it now has a 30% chance to forcefully spawn *another* door on its back wall, which will in turn carve out its own hidden room, chaining together into deep, recursive corridors of interconnected mystery rooms hidden entirely behind the facade of the mundane maze walls.

### Changed

- **[AESTHETICS] Outpost Saferoom Tidy:** Replaced the weird concrete slab cots in the Outpost saferooms with a much cozier wooden cot complete with a rolled up sleeping bag pillow and a carton of almond water resting on the end of it.
- **[AESTHETICS] Eradicated the Black Mold:** Removed the buggy, floating black mold (`SurfaceTextures._buildCeilingStainAtlas`) and all of its associated logic. We now rely entirely on the native procedural stains baked into the ceiling tiles for water damage effects.

### Fixed

- **[WORLD] Annex Airlocks Cleared:** Fixed an issue where `AnnexSector` was blindly running perimeter generation across doorway coordinates and blocking the airlocks with yellow walls. Added explicit `isDoorway` guard clauses to ensure those cells remain completely open.
- **[AESTHETICS] Server Ceiling Shadows:** Corrected an issue where the new Server Ceiling texture remained pitch black except under direct flashlight illumination. The ceiling now uses its own texture as an `emissiveMap` with a subtle cool-grey glow, providing just enough ambient definition to prevent it from getting lost in the dark while preserving realistic shadow contrast.
- **[WORLD] Stairs No Longer Spawn Trapped:** Fixed a bug where `CratesOrStairway` structures would often generate fully encased by 4 solid walls. Stairways now utilize the same context-aware grid checking as vents, intelligently rotating to face an open path, or carving one if necessary, ensuring the steps are always accessible.


## [v0.7.6] - 2026-08-02

_The Structural Extraction_

### Notes

- Extracted architectural generation code into blueprints folder.

## [v0.7.5] - 2026-08-02

_Bedside Manner_

### Added

- **[WORLD] CLINIC Is No Longer Just Empty Hallways:** The sector's maze produced a wall/corridor grid and nothing else, so every trip through it was a straight walk between blank panels. Any wall cell backing onto exactly one corridor now has a 60% chance to open into a patient room instead of filling solid: three of its sides go up as thin dressed walls, the fourth carries a doorway (stub jambs plus a header) instead of a full block, and a privacy curtain — a rail with two bunched fabric panels pulled to the jambs — hangs across the opening. The curtain is purely visual, not collision, so it never blocks the doorway it's dressed onto.
- **[WORLD] `src/world/ClinicFurniture.js`:** Four reusable prop builders — a bed (frame, mattress, head/footboard, side rails, casters), an IV pole (base, pole, hook arm, translucent bag), a heart monitor (cart, post, housing, buttons), and a bedpan. The bed is guaranteed per room, since it's what makes a room read as a room; the IV pole, monitor, and bedpan are each rolled independently (75%/70%/60%) so rooms vary instead of reading as one prefab copy-pasted down the corridor. Furniture position and facing are derived from a forward/right basis built off the doorway direction, so the same placement math works regardless of which side of the cell the corridor lands on.
- **[AESTHETICS] The Heart Monitor's Screen Is An Actual ECG:** A small canvas texture draws a scrolling waveform — grid lines, a repeating QRS-complex zigzag in green, a heart rate readout — rather than a flat emissive rectangle standing in for "screen."
- **[WORLD] Chasm Airlock Approaches Get Guardrails:** The catwalk cell directly outside a Chasm airlock door used to have a floor and nothing else, dropping straight to void on either side with no fence — a genuine hazard given every other catwalk cell in the sector already fences its void-facing edges. That approach cell is built by the entrance-hallway system, not by the sector's own per-cell pass, so it never got the sector's railing logic; it now gets it explicitly, gated on the same maze data the sector uses everywhere else so a rail only appears where the flank is actually void and never across a branch that's supposed to stay walkable.
- **[WORLD] The Warden Has Arms:** Shoulder pivots on both sides carry an upper arm, an elbow pivot, a forearm, and a hand, replacing what used to be a pair of flat shoulder stubs with nothing hanging off them. They swing gently opposite each other in the existing idle animation instead of sitting rigid.

### Changed

- **[WORLD] The Warden Hovers Instead Of Rolling:** First pass gave it a tank chassis — hull, twin treads, four wheels a side, all spinning — built to replace the single leg cylinder it shipped with. It read as a ground vehicle bolted under a floating torso, which wasn't the intent, so it's gone. In its place is a tapered repulsor skirt with a glowing ring and three emissive nodes underneath, using the same alert-state colour swap already driving the eyes and spotlight (white when idle, red when it spots the player), plus a continuous pulse independent of that state so the glow doesn't read as static. The body's vertical bob amplitude was doubled and a slight independent wobble added to the base so it settles like something holding itself up rather than something standing on a fixed platform.
- **[AESTHETICS] Chasm's Large Columns Wear The Same Weathered Steel As Everything Else:** The columns were textured in flat `rustMat`, the same material used for one-off scrap and fixtures, while every pipe elsewhere in the sector wears the dedicated `pipeMat` skin — seams, collars, chip-and-rust detailing. Swapped to `pipeMat` (falling back to `rustMat` if it's ever unset) so the columns read as the same fabricated infrastructure as the pipework around them instead of a different, flatter material standing next to it.
- **[WORLD] Chasm's Perimeter Walls Look Like Void, Not Wallpaper:** The chunk boundary walls ringing the Chasm's open drop used the same yellow `sharedWallMat` every other sector's exterior wears, which put a lit, textured surface floating in the middle of an otherwise unlit abyss. `buildPerimeter`'s doorway jamb, header, and outward-facing wall segments also hardcoded that same material regardless of what a sector passed in — a bug already worked around for Atrium's marble walls, just never extended to Chasm. Both are now routed to the sector's own unlit `voidShroudMat` when `sectorId === "CHASM"`, so every face of a boundary wall segment resolves to the same flat black the ceiling canopy already uses, and the airlock is left as the only lit, material thing out in the dark.
- **[WORLD] Chasm's Void Now Has A Floor, Not Just A Ceiling:** The sector had a black canopy and skirt hiding the space above the drop, but nothing below y≈2.85 — looking down showed whatever sat behind the scene rather than more void. Added a matching black floor plane at y=-100 (below the deepest pillar geometry) and a lower skirt sealing the chunk boundary down to it, using the same unlit material as the ceiling, so the abyss now reads as bottomless in both directions instead of only one.

### Fixed

- **[WORLD] Chasm Airlocks Had The Same Low-Ceiling-Cap Bug Impound Already Had:** `buildEntranceHallways` caps every sector's entrance with a flat ~3-unit ceiling by default and swaps in per-sector materials for a few exceptions; Archive, Impound, and Atrium were already excluded because each has its own real ceiling far above that cap. Chasm's void canopy sits at y=9 for the same reason and was never added to that exclusion list, so its airlocks got a flat plane hanging low over the doors — the exact bug already diagnosed and fixed for Impound's "corrugated-metal awning," just missed on this sector. `CHASM` is now in the exclusion list; its entrances open straight up into the void like the others.
- **[WORLD] Airlock Guardrails Had No Collision:** The rails added for the Chasm airlock approach were wired through a fallback pattern — `env.addGeometry ? env.addGeometry(x) : chunkGroup.add(x)` — copied from existing code elsewhere in the file. `env.addGeometry` has never existed as a property anywhere in the codebase, so the fallback always fired: the rails rendered but had no collision box and no chunk-lifecycle tag, meaning a player could walk straight through a fence that looked solid. Routed through `ctx.addGeometry` instead, the helper the rest of the catwalk/rail system already uses, which inserts the blocker box and tags the mesh correctly.
- **[WORLD] Airlock Guardrails Were Fencing Off Open Catwalks:** Once collision was added, the same rails turned out to be generating unconditionally on both flanks of the entrance cell regardless of what was actually there — an airlock with catwalks branching left, right, and forward had both branches fenced shut, since the game has no vault or climb. The rail-building code never checked the sector's own maze data before deciding to build; it now does, via the same `checkVoid` logic the sector's interior cells already use, so a flank only fences when it's genuinely void and stays open wherever it leads somewhere walkable.

### Notes

- **Verified without a browser.** WebGL isn't available in this environment, so the Chasm rail-symmetry claim and the Clinic room count were checked by loading the real `StructureKit`, the real maze generator, and the real sector modules into a headless Node harness and running actual generation across dozens of seeds rather than eyeballing the source. One inspected seed produced 13 rooms from a 97-wall/99-corridor split, each with exactly one doorway; furniture placement succeeded 1723 of 1786 attempts, with the ~3.5% drop coming from the engine's existing overlap-rejection in `addFurniture` rather than a bug in the new placement math. The curtain's drape, the hover base's proportions, and the arm swing are correct by construction but haven't been seen rendered — worth a look in an actual playthrough.

## [v0.7.4] - 2026-08-02

_The Unibody Airlock_

The airlock was nine separate assemblies stacked in the same cell and it looked like it. This release throws all of them away except the doors and the button, and puts a single stainless shell around what is left.

### Added

- **[WORLD] The Airlock Is One Object:** Two side walls, a floor pan, a roof, and a header over each doorway, all in one pressed stainless. It replaces two door headers, two lamp housings, two emissive lens bars, a black-iron roof slab, a separate bezel and a metal floor plate. The shell exists mainly so the chamber has an inside of its own: you used to stand in the airlock and see the host sector's wall material in the corners, because the corridor segment underneath was still showing through, and a sealed box cannot leak what it completely covers.
- **[AESTHETICS] `_buildStainlessMaterial` And `_buildStainlessDoorMaterial`:** Brushed steel with the grain running one direction only — a random speckle reads as concrete, a directional grain reads as milled metal. The albedo leans deliberately blue. A neutral grey came out khaki in situ, because every light in this facility is warm amber and a diffuse surface simply returns what it is given; leaning it cool lets the warm light neutralise it back to grey, which is the only way to read as steel in a room with no cool source and no environment map to reflect one. The door runs several stops darker than the shell, because a leaf finished identically to its own frame disappears into it and the whole assembly reads as one blank slab.

### Changed

- **[WORLD] The Sector No Longer Builds Walls Inside The Airlock:** `buildEntranceHallways` passed `buildWalls = true` for the airlock's own cell, so the corridor was raising the host sector's `structMat` side walls in exactly the same place as the shell. Now `false`. The shell brings its own walls and, importantly, the collision those corridor walls used to provide — spatial-grid boxes are inserted to match, or the airlock would have become a hole you could walk out the side of.
- **[WORLD] The Shell Is Built To 2.0, Not To The Corridor Half-Width:** Measured rather than assumed: the sector's wall blocks present their inner faces at ±1.99, so a shell built to `CORRIDOR_HALF` stopped 0.18 short of them and left a strip of bare plaster running floor to ceiling down each side of the portal, with a wider strip again above the doors where the header ran out before the opening did. Building to 2.0 buries the shell edge inside the sector wall so there is no seam left to show.
- **[WORLD] A Real Fixture Instead Of A Glowing Ceiling:** The first pass lit the chamber with a flush emissive panel, which read as a lightbox with no lamp in it and, at the intensity needed to beat the warm ambient, blew the whole room to white. The Checkpoint cage light is reused instead — housing, tube, end caps, cage bars — at **0.55** against the panel's 2.6. The shell and door materials also had their emissive dropped to 0.45; that lift was added to keep the steel out of the amber, and against a glowing ceiling the two were compounding. Cutting only the lamp would have left a dim room made of self-lit walls.
- **[AESTHETICS] Doors Keep Their Warnings:** The warning triangle that used to live in the titanium texture is baked into the door map, as a dark tint rather than a solid fill so the brushed grain runs through it and it reads as painted onto steel. The hazard stripe is back as geometry on the meeting edge where the two leaves close.

### Fixed

- **[UI] The Call Button Had Never Changed Colour:** `InteractionController` computed `targetMat` from the airlock state on every frame and then dropped it on the floor — the red/green readout has never once rendered. Now applied, and the button mesh is named in `userData` rather than reached for by child index, since an index would silently start painting the housing the moment anything else joined that group.
- **[WORLD] The Chamber Ceiling Was The Sector's, Not The Shell's:** Fitting the cage fixture meant moving the roof out of its way, and moving it to 3.00 let the corridor's own stained ceiling tile at 2.99 become the chamber's ceiling, quietly undoing the self-contained shell. The roof sits at **2.97** — a 20mm window with the tile hidden above it and the cage housing recessed into it, which is how a troffer mounts anyway.

### Notes

- **The airlock's two spotlights are gone and nothing in the shell casts.** The hard shadows thrown across the chamber came from two `fixtureData` entries with `isSpot: true` aimed straight down at the doors. The world-wide `isSpot` count is now zero.
- **`buildCheckpointCageLight` stages its meshes for instancing with world matrices pre-baked.** `buildAirlock` adds straight to the chunk group, so the transform has to be decomposed back out of `matrixWorld` or every part of the fixture collapses onto the chunk origin.
- **The switch still does nothing from `IDLE`, by design.** You interact with a *door* to get in; the switch is only read in `AWAITING_SWITCH`. Pre-existing and untouched, but now that the chamber is stripped to doors and a button, a button that ignores you on approach is more conspicuous than it used to be.

## [v0.7.3] - 2026-08-02

_The Texture Polish Update_

### Added

- **[WORLD] `src/world/BreakerPodium.js` — The Objective Breakers Are Podiums:** The three breakers the radar hunts were a rusted panel bolted to the face of a 1.5m metal column, which read as a texture swatch on a pillar rather than as a thing somebody built and somebody else operates. The cell is now an open pocket in the maze with a free-standing podium in it: plinth, ribbed stalk, collar, tilted console head, and a palm reader on dark glass with a procedurally drawn hand etched into it. Being free-standing is the point — the reader can be approached from any side, and nothing about placement needs to know what the neighbouring cells resolved to. A slim conduit runs from the head to the ceiling so the fixture still throws a silhouette down a fogged corridor; cutting the column to hip height with nothing above it would have made the objectives invisible at fog distance and turned the hunt into a stumble.
- **[PLAYER] Breakers Are Held, Not Tapped:** `E` on a podium starts a 1.2 second palm scan rather than firing instantly. The plate blooms, a sweep bar crosses it, and a conic-gradient ring fills around the crosshair. The scan dies three ways — release the key, look away past a 0.70 dot product, or step beyond 3m — and nothing is committed until it completes, so an aborted scan has nothing to undo and leaves the world exactly as it found it. `SomaticInput` gained a `KeyE` keyup dispatch and an `event.repeat` guard, without which the browser's auto-repeat reads as a stream of fresh presses.
- **[UI] The Crosshair Reports Scan Progress:** A masked annulus concentric with the crosshair, with the `[E]` prompt suppressed while a scan is live so two labels are not competing inside a 40px circle. Progress is quantised to whole percent, because the ring is a conic gradient and sub-percent precision would dirty a paint every frame of every scan for nothing visible.

### Changed

- **[WORLD] Light-Panel Breakers Moved Onto The Walls:** The incidental chunk breakers came off their own `structMat` columns and now hang flush on the yellow walls, keeping their instant throw — the palm reader belongs to the objective breakers alone, so seeing one means you have found what the radar wanted. Finding a wall to hang on needs neighbour knowledge the generic chunk generator does not keep, so `_buildChunkInterior` now records wall cells into a set as the loop resolves them. The loop is x-outer, z-inner, which means only the west and north neighbours are ever safe to ask about; a breaker takes whichever of those two is solid and is skipped entirely when neither is. Placement is probabilistic across a whole chunk, so losing the occasional candidate cell costs nothing and beats burying a switch inside a wall.
- **[AESTHETICS] Procedural Texture Refactor:** Extracted the massive monolithic `ProceduralTextureFactory.js` into modular domain-specific classes (`TextureMechanics`, `OrganicTextures`, `SurfaceTextures`, etc.) grouped in `common/` and `sectors/` subdirectories for easier sector-specific maintenance. 
- **[AESTHETICS] Mold Corner Spreading:** When wall mold hits an inside crease, it no longer stops dead at the seam. The engine now detects the perpendicular wall and spawns a dynamically rotated secondary decal. Since both share the exact same jittered origin but use different random scales from the atlas, they merge seamlessly into an asymmetrical fungal bloom wrapping across both faces.
- **[AESTHETICS] Ceiling Stains Reworked:** Completely removed the dark, floating overlay meshes that were generating water stains on the ceiling. We now rely entirely on the native procedural stains baked into the ceiling tiles, which have had their alpha transparency values slightly boosted to pop a little more naturally without looking stamped-on.

### Fixed

- **[AESTHETICS] Metal That Rendered As Black Holes:** The breaker housings resolved to featureless black rectangles on lit yellow walls, and the diagnosis generalises: `pittedMetalMat` carries `metalness: 0.75` and this engine has no environment map, so a surface that physically-correct has almost nothing to reflect and returns almost nothing. The pipes read properly for one reason only — `_buildPipeMaterial` sits at `metalness: 0.05` and lets the scene lights do the work. Added `_buildBreakerPanelMaterial`, the same alloy authored for a flat panel instead of a cylinder: welded flange, four hex bolts, recessed brushed face, and the same chipped-paint and rust-run vocabulary so the two age as though they came off one rack. The door handle had the same disease at `metalness: 0.8` and is now dark painted steel at 0.15.
- **[AESTHETICS] Cage Bars And Door Ribs Were Also Voids:** Same root cause, different fix. `env.structuralSteelMat` is deliberately untextured — the things wearing it are three-centimetre cage bars and eight-centimetre blast door ribs, and a map at that scale is noise nobody can read. What they needed was never a texture, it was a lighting response.
- **[WORLD] Missing Ceiling Tiles No Longer Cast Shadows:** The engine generates missing ceiling tiles by placing a black square geometry flush with the ceiling. Because solid geometries default to casting shadows when instanced, these "holes" were blocking the room's global lighting. Added a custom `userData.noShadow = true` flag to the `ceilingHoleMat` material in `StructuralBlueprints.js` and modified the geometry merging loops in `Environment.js` to respect it. Light now shines straight through the missing tiles to the floor beneath.

## [v0.7.2] - 2026-08-02

_A Hand To Hold It_

### Added

- **[PLAYER] The Compass Is Held In A Hand:** A floating instrument reads as a HUD element drawn in perspective no matter how good the model is, because nothing in the frame explains why it is there. The case now sits at the origin of a rig with a right hand built around it: a palm slab behind the case, a rounded heel where it meets the wrist, four fingers rising off the far edge and curling forward over the top rim, a thumb with its pad on the near-left rim, then wrist, cuff and sleeve. The sleeve does more work than its polygon count suggests — a bare forearm running off the bottom of the frame reads as a floating limb, while a cuff terminates the arm at a garment and the eye stops asking.
- Fingers are chains of nested joints rather than three rotated sticks, so curls compound the way knuckles do, with a sphere at every joint and a tapering radius down each digit. Segment lengths, curls and base heights are varied per finger; the little finger is shorter, set lower, and comes to rest against the side of the case instead of reaching the rim, which is what a little finger does. Verified: index, middle and ring tips land at y 0.077 to 0.084 against a case rim at 0.085, sitting just in front of the glass at z 0.026 to 0.030, so they break the bezel silhouette without covering the dial.
- **[PLAYER] Skin Is Mottled, Not Flat:** A procedural 128px canvas of warm and pale blotches with sparse short creases. A single albedo across a hand this close to the eye reads as a mannequin regardless of the geometry under it.
- **[PLAYER] The Compass Toggles On `M`:** Always-on was wrong for an instrument you are meant to raise. Raising and lowering is a movement rather than a visibility flag: the rig eases on a smoothstep, drops 0.46 and rolls out of the wrist on the way down, and only stops rendering once it is genuinely below the frame, so there is no pop at either end. Lowering is slightly faster than raising. It refuses to raise while a document is open and stows itself on death.

### Fixed

- **[UI] The Menu Moved To Tab, Because M Was Firing Twice:** `Environment.js` bound the settings panel to a bare `e.key` of `m`, so the new compass toggle opened the menu on the same press. The menu is now on `Tab`, whose own default of focus traversal is already suppressed by the handler's existing `preventDefault`, and `Tab` has been added to `PREVENT_KEYS` alongside it.
- **[UI] The Menu No Longer Opens While You Are Typing:** Pre-existing and unrelated to the collision. The old binding matched `e.key === 'm'` on a document-level listener with no target check, so typing any word containing an M into the seed field toggled the settings panel mid-word. The handler now ignores events originating from an `INPUT`, `SELECT` or `TEXTAREA`.
- **[PLAYER] The Thumb Was Solved, Not Eyeballed:** The first pass leaned the thumb inward at `-0.92` on Z. Composing that lean with the joint curl through Euler XYZ walked the fingertip to a radius of **0.003** — dead centre on the dial, squarely over the needle pivot, hiding the one thing the instrument exists to show. Caught by computing the actual transform chain rather than trusting the two-dimensional estimate that produced it. The replacement values put the tip at radius 0.089 against a case radius of 0.085, so the pad rests on the outside of the rim.

## [v0.7.1] - 2026-08-02

_The Threshold Compass_

### Added

- **[PLAYER] `src/player/Compass.js` — A Second Instrument, Answering A Different Question:** First-playthrough feedback was that a lost signal is unrecoverable and that the hunt never routes anywhere near a sector. Both are true and they share a cause. `Environment.js` builds the entire radar readout as `${nearestDist.toFixed(1)}m` — distance and nothing else, no bearing anywhere in the system. The player is meant to triangulate by walking and watching the number move, which the README says out loud, but in fog with blind doglegs that makes every lost signal a random walk. Past 1000m it degrades to `WEAK - RELOCATE`, which asks you to relocate without saying where. Separately, confirmed: the radar targets unvisited POIs while `_breakerHuntHops` lasts and then the nearest inactive `exit_switch`. Macro zones are never targets, the sole exception being the Annex during exit phase.
- The fix keeps the two instruments opposed rather than fixing the radar. The radar stays distance-only and stays scrambleable, because that unreliability is where its whole character lives. The compass knows nothing about objectives, cannot be scrambled, and only ever points at the nearest sector threshold. A lost signal now means walking to a sector, re-establishing position against a fixed landmark, and resuming the hunt from a known place.
- **[PLAYER] Built As Held Geometry, Not A HUD Overlay:** Parented to the camera, so it inherits head bob, lean, squeeze FOV and the full post-processing stack for free and is subject to darkness like everything else. Brass case, torus bezel and lug, procedurally drawn dial with 72 graduations, cardinal marks and foxing spotted across the face, glass at 17% opacity, and a needle on a pin. Only the needle carries luminous paint — with the torch off the dial is as dark as the room. The camera is added to the scene on construction, since children of a camera do not render unless the camera is itself in the graph and it never needed to be until now.
- **[PLAYER] The Needle Is A Damped Spring, Not A Lerp:** Stiffness 26 against damping 6.4, so it overshoots a hard turn and hunts before settling, plus a jostle term scaled by player speed. A needle that eases perfectly to its mark reads as a HUD element drawn in perspective. Bearing is derived from world angle minus camera heading, where heading is `yaw + π` because three.js cameras look down their own -Z. Verified across five headings: target ahead resolves to 0°, east to -90° (right), west to +90° (left), and a 90° left turn correctly moves a formerly-ahead target to the right.

### Notes

- **The compass remembers thresholds after they unload.** Pointing only at `macroZones` would blank the needle the moment the nearest sector left the load radius, which is precisely when a lost player needs it. It reads `_macroChunkHashes` instead — the standing record of every macro chunk the seed has claimed, pruned only on reseed and never on chunk unload — and rederives bounds from the chunk key with the same arithmetic `buildChunk` uses. Loaded zones still take priority and use the bounds the world actually registered.
- Unloaded macro chunks cannot be *predicted*, only remembered. `isMacroStructure` draws from the chunk's seeded PRNG mid-sequence and then consults `_macroChunkHashes` for minimum spacing, so which chunks become sectors is path-dependent on build order by design. The compass can only point at thresholds the world has already committed to.
- On a fresh seed that has not yet produced a single macro zone the needle has nothing to hold and wanders on a slow sine. It is hidden entirely while reading a document or on death.

## [v0.7.0] - 2026-08-02

_The Corroboration Update_

The engine had two loops running the full length of a level that touched at exactly one point. Power restoration sent you after breakers; the case file sat in three sectors being optional. They met for the first and only time at the Inquest terminal, where a sealed file named the correct verdict outright and made every document in the wing redundant. This release couples them. Documents now assert claims, claims are settled by walking to a second sector, the records room lock has to be assembled out of three separate facts, and nothing anywhere tells you the answer.

### Added

- **[NARRATIVE] `src/narrative/CaseFiles.js`:** The authored contents of the cold case, separated from the machinery that deals them. StoryEngine owns shuffling, assignment, thread bookkeeping and progress; CaseFiles owns what the documents say. They change for different reasons and at wildly different rates, and a writer editing a memo should not have to scroll past a Fisher-Yates shuffle to find it.
- **[WORLD] `src/world/NarrativeProps.js`:** Shared placement so a sector can drop paper and recorders in two lines, with optional surface height and scatter width so the same helper lands a document on a floor, a desk or a table top. The module has no view of the maze by design and documents that: callers must only invoke it from a branch they have already cleared as walkable. Budgeted per chunk hash at three documents and one recorder so no sector can carpet itself in paperwork.
- **[NARRATIVE] Eight Sectors Stopped Being Scenery:** Incinerator, Boardroom, Server, Checkpoint, Atrium, Clinic, Maintenance and Chasm had full geometry, foley, hazards and room tone, and zero narrative payload. Each now carries a pool written against its own institutional voice — combustion logs and charge-door weights, quarterly minutes and a seating chart one chair long, thermal exceptions on a rack that was never powered, decon gate counts that do not reconcile, a planogram being corrected after the fact, an intake form for a patient who could describe the route and not walk it twice, a shaft that measures differently going down than coming up, and a load certificate that reads backwards. Eleven sectors are now live sources.
- **[NARRATIVE] Tapes Are Sector-Bound:** Every sector holds exactly one recorder with its own line, dealt only to `TAPE_` objects found in that sector, each carrying a thread. A second recorder in the same sector has nothing left to play and falls through to that sector's paper.
- **[NARRATIVE] The Elevator Release Key:** The records room no longer holds the sealed Finding of Fact. It holds a brass key that arms the exit machine. Exit sector manifestation and radar routing both gate on `inventory.hasExitKey` rather than the old `hasVisitedAnnex` boolean, so the reason the elevator will not move is an object the player can hold rather than a flag they tripped by walking through a door.
- **[NARRATIVE] Ephemera, And The One Room Where Paper Is Just People:** A second class of document that carries no thread, settles nothing, costs nothing to read, never enters the terminal archive and does not move DATA RECOVERED. Eight pieces spawn in the extraction bunker, one on each chamber cell ringing the elevator car: a shift rota with one name on every weekday, a coffee fund nobody has touched since the disappearance, a debrief script with step four scratched through the lamination, a birthday card with eleven signatures, eleven complaints about nine seconds of hold music, a lost and found holding a cold wedding ring, a hand-drawn guide to folding a hazmat suit whose fifth panel is the word PATIENCE, and a note from the custodian to whoever got further than he did. Dealt round-robin, so eight desks read as eight different notes.
- **[UI] The Battery Cell Shrinks:** `#battery-tension`, a hazard-striped overlay that eats the battery indicator from the right in proportion to `linguisticDarkMatter`. The player watches capacity disappear rather than reading a second number for it.

### Changed

- **[NARRATIVE] Reading Was Never Actually Costing Anything:** Closing a document deducted a flat `0.15` coherence. Coherence regenerates passively at up to `0.24/sec` standing still in a lit room with no anomaly pressure, so the entire sanity price of the case file was repaid in roughly six tenths of a second. The document layer was inert: no cost, no return, and no reason to engage with it beyond the memos carrying the access code.
- **[METABOLIC] Unverified Reading Pins The Flashlight Ceiling:** Reading a tagged document you cannot yet verify adds `7.0` to a new `player.narrativeTension` stock, capped at `40.0`, which floors `linguisticDarkMatter` from below. Ordinary paranoia-derived dark matter bleeds off at `1.5/sec` in a lit room; narrative tension does not. It sits on the battery ceiling until it is settled. Six unverified reads and the flashlight will not charge past 60%. The cap sits below the global `50.0` ceiling deliberately, leaving ambient paranoia headroom to stack on top.
- **[METABOLIC] Corroboration Is The Payout, And The Sector Is The Unit:** A thread resolves the first time two **independent sectors** assert it. Two impound tags naming the same person do not corroborate each other, and neither does a tape and a memo pulled from the same room. An earlier cut keyed this on document *category* and claimed verification cost traversal; it did not, because `AnnexSector` spawned recorders tagged `zone: 'AUDIO'` and the Annex could therefore corroborate itself without the player leaving the wing. Settling a claim refunds `16.0` tension, returns `0.12` coherence, and heals `6.0` maxStamina — the last of which matters because maxStamina degrades permanently under sprinting below `0.2` coherence and otherwise only recovers while resting in light.
- **[METABOLIC] Ephemera Runs The Transaction Backwards:** Case material costs a coherence flinch and, unverified, pins the ceiling. Ephemera returns `+0.06` coherence and nothing else. Documents print `>> NOT CASE MATERIAL.` so the distinction is legible on sight.
- **[NARRATIVE] The Records Code Is Assembled, Never Issued:** No document anywhere in the wing prints the four digits. The lock is the last two digits of the year the slab was poured, followed by the impound pen that has never shut, two digits each. Three threads carry the three legs: `CIPHER` states the rule, `EPOCH` the year, `PEN` the pen. The old `CODE` thread is gone. Verified across 600 seeds: no document, tape or finale ever contains the literal access code, every code is well-formed, and every leg is sourced from at least three sectors so no shuffle can produce an unopenable records room. Across three random sectors a player holds all three legs only 44% of the time, so the door reliably costs a fourth or fifth.
- **[NARRATIVE] The Tell Is Sourced Across Five Sectors:** The seeded foreshadow was three documents in three fixed pools. It is now five, one apiece in Annex, Archive, Server, Clinic and Chasm, each authored per truth. A player who settles TELL from two of those five has triangulated the verdict without ever opening the records room.
- **[NARRATIVE] The Inquest Stopped Grading The Player:** `★ MATCHES SEALED FINDING` is gone, along with the sealed Finding that produced it. The hint reports how many claims are settled and across how many sectors, and says plainly when filing would be a one-in-three guess.
- **[UI] Keypad Denials Name The Missing Leg:** A wrong entry reads `DENIED — NO RULE / YEAR / PEN` against whichever legs are absent from the record, held for 1.4s instead of 0.8s. It never reports which digits were wrong. A player holding all three legs who still cannot open the door has an arithmetic problem, and that one is theirs.
- **[NARRATIVE] Code Anchoring Selects On Thread, Not Substrings:** `_anchorCodeFragments` matched hardcoded prose fragments. It now floats any document tagged with a lock leg toward the front of its own pool, so new code-bearing memos need no change there.
- **[NARRATIVE] `caseStrength()` Counts Breadth Honestly:** Sources are recorded before the settled check, so a claim confirmed across five sectors reads as a stronger case than the same claim confirmed across two. An earlier cut stopped recording once a thread settled and reported a strength of 3 on a full eleven-sector sweep.
- **[NARRATIVE] `totalTemplates` No Longer Counts The Finale:** The finale text has no object in the world dealing it, so counting it kept DATA RECOVERED permanently short of 100%. The `FINALE_` branch survives as a dormant fallback.
- **[AESTHETICS] Wood Albedo Lifted From 21-29% To 30-39% Lightness:** The grain was not failing to light. It was being multiplied into black by two dark values at once. `_buildWood` filled each board at a true walnut albedo of roughly `(0.28, 0.20, 0.14)`, and the engine's fill is a `HemisphereLight` whose ground colour is `0x3d3520` — `(0.24, 0.21, 0.13)`, nearly black. A downward-facing board resolved to `0.28 × 0.24 × 0.65` = **RGB (11, 7, 3)**, and every grain, pore, ray and stain layer is drawn at low alpha over that fill. Measured, not estimated: a vertical face goes from RGB (30,20,9) to (43,28,13), an upward face from (49,32,16) to (70,46,23), and the lightest board reaches (56,36,17) and (90,60,30). Hue and saturation are untouched and the `rand()` call count is unchanged, so the seeded grain pattern is bit-identical. Only its value moves.
- **[WORLD] Atrium Darkness Pass:** `ambient` dropped from `0.10` to `0.00` and `fog` from `0.20` to `0.12`, completing the v0.6.2 premise that the vending machines are the sector's entire lighting budget.
- **[WORLD] Checkpoint Air Cleared:** `fog` dropped from `0.05` to `0.01` and `ambient` from `0.65` to `0.55`.
- **[AESTHETICS] The Atrium Aisle Smear Is Lit Geometry Now:** The `UNLIT` dial left open in v0.6.3 is resolved. The smear is a `MeshStandardMaterial` with a low emissive floor rather than a `MeshBasicMaterial` that ignored the scene, so it still glows faintly where nothing else does but obeys distance and dark instead of burning at constant value. Note when tuning: `vertexColors` multiplies `diffuseColor` and never reaches `totalEmissiveRadiance`, so the geometry's height falloff governs the diffuse only and the emissive floor recedes on fog and distance instead.
- **[AESTHETICS] The Smear Palette Is Weighted, Not Uniform:** The previous flat split is why it came out beige. It ran shelf-face 44% of the time and picked uniformly from five box colours for the rest, two of which are themselves beige, so 52% of the canvas was one hue and only 24% was red, green or blue between them. A supermarket shelf seen head-on is almost entirely product; the shelf survives as slivers between facings, not as the majority surface. Now 11% shelf, 8% gap, and the rest product with red, green and blue at roughly 20% each. Saturation is raised over `productBoxMats` rather than copied from it, because those are authored to sit in a lit room where the eye has a whole box to judge, and a two-inch vertical streak at forty metres under a vending machine's cyan cast has no such context and collapses to grey-brown. Each family spans three values so a run of adjacent facings varies the way stock on a shelf does.

### Fixed

- **[COLLISION] Checkpoint Side Rooms Could Only Be Entered Crouched:** The hazard stripe over every side room door was registered as collision geometry. It is a `0.14` tall box centred at `y = 2.5`, putting its underside at **2.43**, and `PlayerController` forces a crouch whenever headroom falls below **2.5**. The doorway was never the problem — the header clears at 2.65 and the jambs leave a full 1.4 of width. The player was walking into seven centimetres of paint. Now staged as decor, matching the pattern the Clinic crash rails already use and the reasoning already written in that file: a lip you cannot walk past is worse than no lip at all.
- **[COLLISION] Checkpoint Suit Racks Forced A Crouch Along Their Whole Length:** `suitRack` stages its posts as decor and then registered the rail itself as collision, an inconsistency inside a single function. The rail's underside sits at **2.32**, so walking the length of a hanging clothes rack put the player in a crouch under a rail that clears seven and a half feet.
- **[COLLISION] Incinerator Ceiling Grilles Caught The Player By Six Centimetres:** The ember grilles are `0.12` thick and centred at `y = 2.50`, underside at **2.44**. Both spawn on the duct spines running the length of a through-corridor, so crossing a gallery meant repeatedly popping into a crouch under something flush with the ceiling. The sector's duct **risers, collars and end caps stay collidable**: a riser physically drops in from 1.4 and ducking under it is the correct read. The rule is a distinction rather than a height — geometry that descends into the room is solid, geometry that only reads as ceiling is not.

### Known Limits

- **Downward-facing wood is barely improved and cannot be fixed from the material.** The same measurement puts an underside at RGB (12,7,3) before the albedo lift and (17,10,4) after. The hemisphere ground term is the binding constraint on any surface facing the floor, and even a pure white ground colour would cap that underside at RGB 46 against this albedo. The upside-down dinette POI is the worst case in the game, since every face it presents points down or sideways by design. Fixing it means raising the hemisphere ground colour, which lifts every underside in all twelve sectors.
- **A single tidy pass tops out at 58 of 63 documents.** The DEFAULT pool only deals as overflow when a sector's own pool runs dry. Since the sector bag reshuffles and sectors recur, a long enough run does reach it, so 100% is achievable but not on one pass.
- **Boardroom and Checkpoint place paper on furniture rather than floor.** Neither generates from a maze grid, so neither has a single cleared-floor branch to hook. Boardroom lands documents on the conference table top at `y = 0.925` with scatter narrowed to 1.0; Checkpoint places into the side room its own builder just carved, narrowed to 0.9 to clear the door stubs and frame.