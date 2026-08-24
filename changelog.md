## [v1.4.9] - 2026-08-24

_Acme Audit: Sealed, Lit, and Raining_

### Added

- **[NARRATIVE] ACME Case Files (`data/lore.json`, `data/factory/lore.json`):** A sector-governance audit turned up ACME as the only one of the game's thirteen sectors with no entry in either lore file - `CaseFiles.buildCaseFiles()` was silently falling back to `DEFAULT` for every document/tape/laptop/clipboard spawn in the sector. Added four new entries under threads already shared by other general-purpose sectors (`GEOMETRY`, `LOST`, `HUM` - deliberately skipping puzzle-only threads and EXIT's own `EPHEMERA`): "Solar Survey" (document), "Last Rung" (tape), "Site Frequency Log" (laptop), and "Deck Count" (clipboard). "Solar Survey" went through one rewrite before landing - the first draft framed the shaft's light as an unexplained phenomenon casting moving shadows, which didn't match how `RenderEngine.js`'s `acmeSun` actually behaves in-game (a `DirectionalLight` with a narrow 45-unit shadow frustum that gets physically blocked by the stacked decks and never reaches the lower shaft); rewritten to describe a real, physically-occluded light source that just doesn't reach far enough, reusing "fourth deck" language already established in "Last Rung" for consistency between the two.
- **[GRAPHICS] ACME Rain (`Environment.js`, `AtmosphereManager.js`, `Sectors.js`):** New PS1-era Silent-Hill-style rain, built as a texture-and-config swap on the existing shared dust particle system rather than a second particle system, scoped to ACME only. `Environment.js` gains a procedural streak texture (`this.rainTex`, a `THREE.CanvasTexture` with `NearestFilter` for a hard-edged retro look) alongside the existing dust texture (now also kept as `this.particleTex` instead of a throwaway local, so both can be swapped between); `AtmosphereManager._updateParticles` checks a new `dust.rain` flag on the active sector's config and swaps `dustCloud.material.map` between the two textures accordingly. First pass shipped with the streak texture's opaque column at 50% of canvas width and `driftY`/`baseSize`/`baseOpacity` carried over from a generic falling-object guess - in a screenshot it rendered as fat solid rectangles falling at a torrential rate rather than rain. Corrected: the opaque column narrowed to 12.5% of canvas width (so `NearestFilter` magnification doesn't blow it up into a rectangle), and `Sectors.js`'s ACME `dust` block retuned - `driftY` -1.0 → -0.18, `baseSize`/`crawlSize` 0.6 → 0.12, `baseOpacity`/`crawlOpacity` 0.55/0.6 → 0.3/0.35 - for a slower, thinner drizzle instead of a firehose.

### Changed

- **[GRAPHICS] ACME Hanging Bowl Lights Are Actually Bright Now (`SetPieces.js`, `Environment.js`, `AcmeSector.js`):** The same lighting audit turned up that ACME's borrowed Archive fixture (`buildHangingBowlLight`) was rendering at barely-visible brightness. Root cause was two Archive-tuned defaults ACME had inherited wholesale: a `baseIntensity` of `1.5` (fine for the Archive's moody reading-lamp look, not enough to actually light a walkway) stacked with `isFaulty: true`, which flickers the fixture to zero output on a 30% chance per cycle - so even that already-dim ceiling was frequently invisible on top of it. `buildHangingBowlLight` and `Environment.js`'s `_buildHangingBowlLight` delegation wrapper both picked up new optional `intensity`/`faulty` params (defaulting to the Archive's original `1.5`/`true`, so the Archive's own call site is unaffected), and `AcmeSector.js` now calls it with its own `ACME_HANGING_LIGHT_INTENSITY = 4.5` and `faulty: false` - a steady, functionally-bright fixture instead of the Archive's dim, flickering mood lighting.

### Fixed

- **[AI] Anomaly Could Enter ACME (`Anomaly.js`):** `_refreshForbiddenBounds()` listed every other void/hazard sector (Chasm, Atrium, Archive, etc.) but never picked up ACME when the sector was added, leaving it the only sector of its kind the roaming Anomaly could still wander into. Added `'ACME'` to `_forbiddenBounds`, matching the precedent already set for Chasm.
- **[WORLD] ACME's Perimeter Walls Didn't Actually Reach The Playable Area (`ChunkManager.js`):** The black shroud/skirt system that's supposed to hide the sector's edges was leaving the entire real playable height range unoccluded - you could see clean over the "walls" into the normal sector beyond. ACME's canopy sits at an effectively-unreachable `canopyY = 100000.0` to read as open sky, and the upper perimeter skirt's bottom edge was anchored just below that (`100000.0 - 6.15`) instead of down near the actual catwalks, leaving a roughly 100,000-unit gap between the top of the lower skirt (which already correctly spans from just below the deck stack down to the floor void) and the bottom of the upper skirt, with zero perimeter wall anywhere a player could actually stand. `skirtBottom` for ACME now starts at `0.15` - the same seam height where the lower skirt already ends - so the two skirts meet and form one continuous wall across every reachable height. Chasm and Atrium's skirt values are untouched.

## [v1.4.8] - 2026-08-23

_Better Light, Softer Landing_

### Removed

- **[GRAPHICS] ACME Work Light Fixtures (`AcmeSector.js`):** Pulled `buildWorkLight` (the tripod-mounted floodlight added in v1.4.7.7) along with both its placement call sites and the now-dead `ACME_WORK_LIGHT_CHANCE`, `WORK_LIGHT_CORNERS`, `WORK_LIGHT_UP` constants. Replaced by the hanging bowl lights below.

### Added

- **[GRAPHICS] ACME Hanging Bowl Lights, Borrowed From The Archive (`AcmeSector.js`, `SetPieces.js`, `Environment.js`):** New `buildHangingLight`, called once per connector gap between vertically-adjacent occupied ACME decks (`ACME_HANGING_LIGHT_CHANCE = 0.5`) - the exact same gaps `buildLadderSegment` already spans - instead of scattering standing worklights across the catwalks. Rather than duplicate the fixture, `SetPieces.buildHangingBowlLight` (the Archive's own wire-and-dome pendant) picked up two new optional params, `wireLen` and `ceilingY`, so ACME can re-hang the identical mesh at whatever length the gap calls for, while every existing call site (Archive included) keeps its old hardcoded length by just omitting them. Each fixture's wire length is derived straight from the real gap (`rise`) between the two decks it's mounted between, so lengths vary naturally with however far apart that column's platforms happened to land, instead of every fixture hanging at the same fixed height. Each one also mounts at one of four corner insets (`ACME_LIGHT_CORNER_INSET = 0.55`) offset from the ladder's own center-column mount (see v1.4.6), with a fixed clearance (`ACME_HANGING_LIGHT_CLEARANCE = 0.35`) kept from both the bowl's radius and the platform edges, so a fixture can never collide with a ladder rail or a deck. Also had to fix `Environment.js`'s `_buildHangingBowlLight` delegation wrapper, which still had the old 6-argument signature and was silently dropping both new params on the floor - every fixture rendered at the same hardcoded default height until that got caught and the wrapper widened to actually forward `wireLen`/`ceilingY` through.

### Changed

- **[GRAPHICS] Hanging Bowl Light Housing Is Now Green Enamel, Not Bare Rust (`SetPieces.js`, `LazyMaterialWarmup.js`):** `archiveBowlMat` was a straight clone of `rustMat` - unfinished and washed-out, reading more like raw sheet metal than a light fixture. Replaced with its own `MeshStandardMaterial` (low roughness `0.3`, low metalness `0.12`, a light corrosion bump) for a glossy old-school green-enamel-over-tin look. Had to make the identical change in `LazyMaterialWarmup.js`'s own copy of the same lazy-init - it prewarms `archiveBowlMat` at boot, before any sector actually builds a fixture, so its definition always wins the race against `SetPieces.js`'s and was quietly serving the old color even after the fix landed there.
- **[GRAPHICS] Bowl Lights No Longer Shine Through Their Own Housing:** They were plain omnidirectional point lights, and only a handful of the game's fixtures ever get a real-time shadow-map slot at any moment (`LumenGrid`'s `maxShadowLights = 6`) - everything outside that budget renders with no shadow occlusion, so the bulb's glow bled straight through the solid dome regardless. Converted to a downward-facing spotlight (`isSpot`, `targetPos`, `spotPenumbra: 0.5`) aimed through the bowl's open bottom, with its half-angle (`spotAngle`) derived from the bowl's actual radius and bulb height instead of an eyeballed constant, so the housing itself now physically blocks the light the way solid geometry should.

### Fixed

- **[PLAYER] Falling Into The ACME Void Before Ever Touching Ground Crashed The Engine (`PlayerController.js`):** `_applyCinematics`'s void-rescue fallback read `env._spawnElevator.position` - a field that never actually exists anywhere in the codebase; `ChunkManager.js` always resolves the real spawn coordinates into `.placement` (`{x, z, rotationY, ...}`) instead. The bug stayed hidden because the primary rescue path (`_acmeSafeSpot`, captured the first time the player stands on solid ACME ground with a valid footing) covers almost every fall - it only surfaced as `Cannot read properties of undefined (reading 'x')` when a player dropped into the pit before that safe spot ever got recorded. Now reads `.placement` instead, mirroring the exact pattern `ChunkManager.js` already uses to place the player at spawn, with a last-resort height-only rescue (`ACME_LOWEST_PLATFORM_Y + 3.0`) if even the elevator's placement isn't resolved yet - so there's no remaining path in the void-rescue branch that dereferences something undefined.

## [v1.4.7.7] - 2026-08-23

_Let There Be (Portable) Light_

### Added

- **[GRAPHICS] ACME Work Light Fixtures (`AcmeSector.js`):** New `buildWorkLight`, scattered across a fraction (`ACME_WORK_LIGHT_CHANCE = 0.4`) of ACME decks - a tripod-mounted halogen floodlight: three splayed legs rising to a hub, a flat rectangular housing, and a flat emissive panel offset in front of it, both aimed up and outward (a fixed 40° elevation, random azimuth per light) the way a real work lamp sits and points, not down at the floor. Went through a couple of shapes first - an early version's round can-and-sphere bulb read as a giant eyeball once actually lit, and got replaced with the current flat flood-panel look. Registers through the same `env.fixtureData`/`getLightMaterial` pool every other sector's fixtures already share, so `LumenGrid` handles its distance-based fade in/out and its dynamic light slot automatically - a plain point light, matching every other general-purpose fixture in the game (sconces, the hanging bowl light, etc.), rather than a directional spotlight; a narrow beam aimed into ACME's mostly-open vertical shaft frequently had nothing nearby to actually catch it.

## [v1.4.6] - 2026-08-23

_Ladders Move To The Middle_

### Changed

- **[WORLD] ACME Ladders Now Mount At The Column Center Instead Of An Edge (`AcmeSector.js`):** Ladders previously hung off whichever cell edge that column's single orientation roll picked (see v1.4.7), which meant two neighboring columns rolling facing edges could end up with nearly-overlapping ladder boxes - the "bump into an invisible wall" collision bug. `buildLadderSegment` now always mounts at the column's own center point `(gx, gz)`; a point 2 units in from every wall (`cellSize = 4`) can never overlap a different column's center, so cross-column ladder collisions are geometrically impossible now rather than just unlikely. The roll is still made once per column, but it only orients the rungs and the rails now, not the mount position.
- **[WORLD] Decks Get A Punched Hole Where A Ladder Passes Through (`AcmeSector.js`):** Center-mounting means a ladder run now passes straight through the middle of any deck between its two endpoints instead of sitting just past the deck's edge, so that deck needs an actual hole in its floor. New `buildHoledCatwalk` builds the same rim beams as a normal catwalk, but frames the floor out of four `buildWall` strips around a rectangular gap sized to the ladder instead of one solid plate. Which decks need a hole is decided up front for the whole column, before any floor gets built, so the floor pass always has the answer ready.
- **[WORLD] Ladders Are Now Climbable From Either Side (`AcmeSector.js`, `PlayerController.js`):** The punched hole was originally sized tight to the ladder itself, which only left standoff room to grab and climb from one side of it. Widened (`ACME_LADDER_HOLE_DEPTH` 0.5 → 1.4) so there's clearance on both sides, and `PlayerController`'s grab-detection facing check loosened from a one-directional `facing < 0.3` to `Math.abs(facing) < 0.3` so it accepts either approach. A new `_ladderApproachDir`, resolved from which side of the box the player is actually standing on at the moment they grab it, replaces the ladder box's single fixed `ladderOutDir` for the climb standoff and dismount math, so the climbing camera stands off correctly regardless of which side of the hole was used to mount.

## [v1.4.5] - 2026-08-23

_Crates Cleared Out_

### Removed

- **[WORLD] ACME Floating Shipping Containers (`AcmeSector.js`):** Pulled `buildFloatingContainer`, the container texture/material setup (`createAcmeContainerTexture`, `env.acmeContainerMats`), `ACME_CONTAINER_CHANCE`, and the Pass 4 placement pass that dropped one into a column's widest empty gap. Making room for something else in that space - no replacement built yet.

## [v1.4.4] - 2026-08-23

_Room To Breathe_

### Changed

- **[WORLD] ACME Platforms Spaced Further Apart (`AcmeSector.js`):** `ACME_PLATFORM_SKIP_CHANCE` raised from `0.58` to `0.75`. At the old value, any given pair of levels in a column had roughly an 18% chance of both landing a deck, which was frequent enough that stacks routinely piled several catwalks directly on top of each other with barely a body-height of clearance between them. Decks are now farther apart on average, with the sector's near-infinite vertical space actually put to use instead of being carved into piddly little slices.
- **[WORLD] Ladders Span Whatever Gap Actually Lands, Not Just Adjacent Decks (`AcmeSector.js`):** Previously a ladder only ever appeared between two levels that were both immediately adjacent (`decisions[li] && decisions[li+1]`) - with decks spaced further apart now, that rule would have left most of them completely unconnected by any ladder at all. Pass 3 now walks the column's actual decks in order and builds one continuous run from each to the next, however many empty levels sit between them, instead of requiring zero gap. `buildLadderSegment` takes the run's total rise as a parameter rather than assuming a fixed one-level climb, and its rung count now scales with that rise (`Math.max(4, Math.round(rise / ACME_LADDER_RUNG_SPACING))`) so a long climb still reads as evenly-rung ladder instead of four rungs stretched thin over several stories. Checked for collisions with the existing floating-container placement (Pass 4, which can land in the same now-larger gap a ladder spans): the container's footprint is deliberately undersized (`cellSize - 0.3`) relative to the cell, and the ladder mounts outside the cell's true edge entirely (see v1.4.9's mount-offset fix), so there's always clearance between them regardless of which edge the ladder picked - worst case they now share a gap visually, a ladder climbing past a suspended container in open air, which isn't a bug.

## [v1.4.3] - 2026-08-22

_One Sun Over ACME_

### Removed

- **[GRAPHICS] ACME Lamp Posts (`AcmeSector.js`):** Deleted the scattered pole-and-glow-cube props (`env._acmeLampMat`, the per-chunk `_acmeLampHash`/`_acmeLampSet` placement pass) that used to dot the sector's catwalk band. They never cast real light in the first place - pure emissive decoration, no `THREE.Light` behind them - which is very likely why they read as "weird": a handful of disconnected glowing orbs in an already brightly-lit (`ambient: 0.90`), fog-lit open sky, contributing no actual illumination or shadow of their own.

### Added

- **[GRAPHICS] ACME Sun - One Global Directional Light (`RenderEngine.js`, `AtmosphereManager.js`):** Replaces the lamp posts with a single `THREE.DirectionalLight` (`engine.acmeSun`), added once in `RenderEngine`'s constructor alongside the existing hemisphere `ambientLight`. A new `AtmosphereManager._updateAcmeSun`, called every frame from `updateLights()` right after the existing ambient-light update, fades its intensity toward `2.2` only while `activeSector === 'ACME'` (`0` everywhere else, same tutorial-darkness gate the ambient light already respects) and re-centers it - position and target both - directly above the current camera position every frame. That re-centering matters: ACME is an open, near-infinite stack of levels, so a directional light fixed over one point in the world would leave the shadow frustum (a `45`-unit half-extent around the light - see the shadow camera bounds in `RenderEngine`) behind the moment the player moved any real distance from wherever it started.

### Changed

- **[WORLD] ACME Ambient Knocked Down To A Fill Light (`Sectors.js`):** `ambient: 0.90` (the highest of any sector, previously doing all the work alone) is now `0.35` - a supporting fill light instead of the sector's sole illumination, so the new sun actually reads as the dominant source and the catwalks/containers pick up real directional shading and cast shadows instead of sitting under flat, all-around glow with nothing to give the space depth.

## [v1.4.2] - 2026-08-22

_Ladders Get The Same "[E]" Prompt As Everything Else_

### Added

- **[PLAYER] Ladder Interact Prompt (`PlayerController.js`):** Grabbing a ladder had no crosshair prompt - every other interactable (doors, props) shows `[E]` via `env.isLookingAtInteractable`, driven by `InteractionController.updateInteractives`' own raycast-ish proximity/facing check over `env.interactables`/`env.interactiveDoors`, but ladders are bare `Box3` entries in the spatial grid, never registered there. `_updateLadder`'s "not attached" branch now runs its proximity/height/facing scan every frame instead of only on an actual E press, and sets `env.isLookingAtInteractable = true` the instant a mountable run is found in range and in the facing cone - same flag, same crosshair, same `[E]`. It only ever adds a `true`, never writes `false`, so it can't clobber a door/prop hit that `updateInteractives` already found earlier in the same frame (confirmed the call order in `main.js`: `updateInteractives` runs before `player.update`). The mount check itself is unchanged - this just surfaces its result before you commit to pressing E, exactly like the prompt already did for everything else.

## [v1.4.1] - 2026-08-22

_Ladders Actually Work Now_

### Fixed

- **[PLAYER] Ladder Boxes Were Registering As A Ceiling (`PlayerController.js`):** The root cause of "grab a ladder, get forced into a crouch": the overhead-clearance scan (`update()`, the one that auto-crouches/crawls under low ceilings) never excluded `isLadder` boxes. Climbing locks the camera's X/Z onto the ladder's own column, and ACME chains ladder segments up a single column one level-spacing (`1.2`) apart - just under the `1.3` crawl threshold - so the *next* segment up almost always sat directly overhead the moment you were centered on it, forcing a crouch or crawl for the whole climb. Ladder boxes are now skipped by that scan (and by the separate squeeze-radius re-expansion check, same class of bug). They were never meant to act as ceilings in the first place - you climb past their vertical span, you don't hit your head on it.
- **[PLAYER] Climbing Camera Was Positioned Inside The Rungs (`PlayerController.js`):** `_updateLadder` centered the camera exactly on the ladder's mount line (`cx, cz`) every frame - and the rungs and rails are built with zero depth offset from that same line (see `buildLadderSegment` in `AcmeSector.js`), so the camera sat *inside* the rung geometry: invisible, or clipping straight through it. It's now offset off the mount line by a new `LADDER_CLIMB_STANDOFF` (`0.4`, in `ladderOutDir` - back into the room, the same direction dismounts already push) for every frame spent attached, mount included, so there's no extra re-center snap once climbing starts and the rungs sit visibly in front of the camera instead of on top of it. This is very likely also what read as "get pushed to the left of it" - the old hard center-snap landing wherever the approach happened to leave you, off-axis from the ladder's actual line.
- **[PLAYER] Mounting Didn't Check Which Way You Were Facing (`PlayerController.js`):** Any press of E within grab range mounted a ladder regardless of which direction the player was looking - including with their back to it. Mounting now also requires the camera's look direction to roughly agree (within a permissive ~70-degree cone) with `-ladderOutDir` - the direction you'd actually be facing to climb that run - skipped only when looking close to straight up/down, where a horizontal facing check doesn't mean anything.

### Changed

- **[PLAYER] Ladder Dismount Is Jump-Only, Plus An Automatic Landing (`PlayerController.js`):** Removed the E-to-dismount "snap to the nearer end" behavior added in v1.4.8 - simpler is better here, and the existing pieces already covered both cases cleanly. Jump still lets go from anywhere on the run, on purpose with no safety check. The natural top/bottom exit - already firing whenever climbing carried your feet past either end of the segment - is now the *only* automatic dismount, and it was never actually removed, just no longer competing with a second, redundant E-driven version of the same idea. E is mount-only again.
- **[PLAYER] Mounting Now Works Mid-Air (`PlayerController.js`):** No code changed to make this true - `_updateLadder` was already called every frame ahead of the fall/ground physics branch, mount or not, so pressing E toward a ladder run while still rising out of a jump already worked once the two bugs above (forced-crouch, camera-in-the-rungs) stopped making a successful mid-air grab look and feel like a failure. Worth calling out explicitly: jump toward a run above you, press E near the top of the arc to catch a rung, then climb the rest of the way up from there.

## [v1.4.0] - 2026-08-22

_Interactive Ladders_

### Changed

- **[PLAYER] Ladders Are Now Grab-On, Not Walk-Into (`PlayerController.js`, `SomaticInput.js`):** Mounting a ladder previously happened automatically the instant `moveForward` overlapped a ladder box's proximity/height check - no way to walk *past* the foot of one without grabbing it, and no explicit "let go" beyond releasing forward, which is what the old `climbDir === 0` branch used to do (drop off immediately - see the auto-release note in v1.4.7). Mounting is now interact-driven: `state.interactPressed`, a new edge-triggered flag `SomaticInput` sets alongside its existing `somatic-interact` event dispatch (keyboard `KeyE` and gamepad, both non-repeat), replaces the old `state.moveForward` check in `_updateLadder`'s mount scan. Once gripped, W/S still climb up/down exactly as before (`climbDir` off `moveForward`/`moveBackward`), but letting go of both now just holds position on the rail instead of dropping you - only jump or E end the climb.
- **[PLAYER] Two Dismount Options With Different Guarantees (`PlayerController.js`):** Jump lets go from anywhere on the run, same push-off-and-hop as before - on purpose no safety check, so a jump dismount can drop you into open air if that's where you are. Interact instead computes which end of the current segment - `box.max.y` or `box.min.y` - is nearer to the player's feet and snaps them there, guaranteeing an E dismount always lands on the platform at the top or bottom of that segment rather than wherever they happened to be climbing.

## [v1.3.9] - 2026-08-22

_Ladders, Posture, and the Half-Life Duck Jump_

### Fixed

- **[WORLD] ACME Ladders Mounted Inside The Platform Instead Of On Its Edge (`AcmeSector.js`):** `buildLadderSegment`'s mount line sat at `cellSize/2 - 0.15` - 0.15 units *inward* of the platform's true edge - so the rails and rungs were built on top of the catwalk's own floor slab instead of hanging off it, which is what read as ladders pushed back and clipping through the deck above while climbing. The ladder's own collision box already carries a `0.15` half-depth, so the fix is a sign flip rather than a new constant: `cellSize/2 + 0.15` puts the box's inner face flush with the platform's true edge (matching the rim) and its outer face `0.3` past it, hanging in open air, clear of any floor geometry above.
- **[PLAYER] Crawling/Crouching Never Released Once The Environment Forced It (`PlayerController.js`):** The overhead-clearance check in `update()` only ever set `state.isCrawling`/`state.isCrouching` to `true` when headroom above the player dropped below `1.3`/`2.5` units - there was no branch to clear either flag once headroom opened back up. Paired with the ladder bug above (the solid deck one level up registered as a `1.2`-unit-high ceiling - just under the `1.3` crawl threshold - for the whole climb, since `currentFeetY` stays pinned to the level a player mounted the ladder from), every ladder climb forced the player onto their belly and left them stuck crawling even after stepping onto the open platform at the top. Wired up the already-declared-but-previously-unused `_envForcedDown` flag: it's now set whenever this system forces a posture, and cleared - along with `isCrawling`/`isCrouching` - the first frame headroom is back above `2.5`. A voluntary crouch toggle (the `crouch` key) never touches `_envForcedDown`, so manually ducking in the open is unaffected by the auto-release.

### Added

- **[PLAYER] Crouch Jumping (`PlayerController.js`):** The Half-Life "duck jump" - jump while crouched, or duck immediately after a standing jump, to tuck under a ledge lip a standing jump can't clear and land on top of it. The collision math already supported this without changes: `physicalTop`/`ceilingClearance` are recomputed from the *current* crouch state every frame regardless of grounded/airborne, so a shorter hull already bought more headroom under `dynamicMaxCamY` mid-flight, and toggling crouch was never gated on being grounded. The only missing piece was the jump gate itself - jumping previously required `!state.isCrouching`, so a crouched player couldn't leave the ground at all. That gate is now `!state.isCrawling && !this.isSqueezing` (crawling and squeeze-shimmying still can't jump; there's no leaving the ground from either posture). A crouched jump uses the same `7.0` walk-jump velocity as standing - running is already disabled while crouched - matching the source material: the extra reach comes from the smaller hull clearing the overhang, not a bigger jump.
- **[PLAYER] Stale Jump Presses No Longer Queue Silently (`PlayerController.js`):** Found while loosening the gate above: a jump press that failed its eligibility check left `state.jump` sitting `true` indefinitely rather than being consumed, so a crouched jump press used to just wait, armed, until the player next stood up - potentially seconds later - and fired then, with no relation to the input that triggered it. An ineligible jump now clears `state.jump` the same frame it's rejected, for all three gate conditions (crawling, squeezing, exhaustion).

## [v1.3.8] - 2026-08-21

_ACME Catwalk & Container Rendering Fixes_

### Changed

- **[GRAPHICS] ACME Catwalk Guard Railing Removed (`AcmeSector.js`):** Stripped the CHASM-style guard railing from ACME catwalks. CHASM needs it to guard an open void edge, but ACME's platforms are already densely packed with crates and containers to catch a fall, so the railing was just visual clutter (and dropped the now-unused `buildWall`/`addGeometry` plumbing along with it).
- **[GRAPHICS] ACME Catwalk Edge Framing (`AcmeSector.js`):** Welded a black-iron frame (four beams, offset `0.1` below the floor plane) around the border of each catwalk tile so the grate reads as a fabricated plate with real thickness instead of a bare flat sheet, borrowing the same framing CHASM already uses around its own catwalks.
- **[WORLD] ACME Entrance Ring Now Builds a Catwalk (`AcmeSector.js`):** The guaranteed solid ground placed around the sector's entrance ring (so stepping through an airlock never drops you into the void) is now a real catwalk platform instead of a flat, near-black tile pad, so it actually reads as part of the structure instead of as a dead patch of floor.

### Fixed

- **[GRAPHICS] ACME Container Trim Z-Fighting (`AcmeSector.js`):** The shipping container's decorative trim band was positioned with its top face flush with the container's own top face, so the two overlapping surfaces fought for the same depth-buffer pixels across almost the entire walkable top. Moved the trim to the container's midline, matching the pattern the crate trim band already used safely.
- **[GRAPHICS] ACME Entrance Ring Double-Building (`AcmeSector.js`):** The entrance-ring floor and the normal per-level platform roll (crate/container/catwalk) could both build geometry at the exact same cell and height, since nothing skipped platform generation for cells that already had guaranteed ground. Because the maze generator force-carves a straight corridor in front of every airlock, this collision was practically guaranteed right at the doors. The per-level platform build now skips the entrance-level maze entirely within the entrance ring.
- **[GRAPHICS] ACME Airlock Threshold Floor Material (`SetPieces.js`):** The hallway floor patch built at each door threshold (`buildHallwaySegment`) only special-cased CHASM's catwalk material; every other sector, including ACME (which shares the same `needsFloor` requirement), fell through to the plain near-black tile, leaving a dark square right in front of every ACME airlock. ACME now uses the catwalk material there too, matching the floor on both sides of the door.
- **[GRAPHICS] ACME Catwalk Tile Seams (`AcmeSector.js`):** Catwalk floor tiles were undersized by `cellSize - 0.1`, leaving a visible gap between adjacent tiles. Sized the floor (and its collision box) to the full `cellSize`, matching CHASM's original (gapless) version, so neighboring catwalk tiles now butt edge-to-edge.

## [v1.3.7] - 2026-08-21

_ACME Sector Fall Physics & Environmental Integration_

### Added

- **[WORLD] The Fall Teleport Safety Net (`main.js`):** The core engine was hardcoded to trigger a blackout death sequence anytime the camera dipped below `Y = -15.0`. This has been intercepted. The engine now scans the `macroZones` to resolve the current sector and instantly teleports the player back to that sector's entrance airlock (`startX + 7.5`, `startZ + 1.5`) when falling out of bounds.

### Changed

- **[WORLD] ACME Sector Environment Registration (`Sectors.js`):** Registered the ACME sector in the core environment matrix. It now properly applies a desert orange fog (`0xd96c40`), high ambient lighting to simulate an open sky, and a large canyon-style audio reverb profile (`rt60: 3.5`).
- **[GRAPHICS] ACME Open Sky (`AcmeSector.js`):** Stripped the `ceilingMat` from the sector definition to visually open the sky above the canyon.

### Fixed

- **[PHYSICS] Horizontal Void Collision ("Invisible Walls") (`HazardUtils.js`):** Fixed a severe structural bug where the engine's `voidBox`—the trigger meant to initiate falling—was being evaluated by the collision sweeper as a solid object on the horizontal axis. The engine now strictly excludes `isVoid` boxes from horizontal intersection checks (`hitX`/`hitZ`), allowing the player to actually step off the edge of walkable paths and fall into the abyss.
- **[PHYSICS] ACME Jump Ceiling Block (`PlayerController.js`):** Fixed an issue where jumping from crates in the ACME sector was physically capped by the default camera height ceiling. The `activeSector` evaluation was lifted up the stack to dynamically set the ceiling height to `40.0` for open-sky sectors like ACME and CHASM.
- **[BUGFIX] ACME Easter Egg Reference Error (`PlayerController.js`):** Addressed a lingering `manifold is not defined` crash in the `_applyCinematics` jump handler when interacting with ACME crates by ensuring the active collision manifold is passed down from the physics update loop.

## [v1.3.6] - 2026-08-21

_Security Hardening & Intersection Geometry Fixes_

### Changed

- **[SECURITY] AST Evaluation for Procedural Logic (`SafeEval.js`, `jsep.min.js`):** Addressed a critical SAST vulnerability by completely excising all usage of `new Function('ctx', ...)` from both the Lore Editor (`validation.js`, `inspector.js`, `puzzle-wizard.js`) and the core engine (`CaseFiles.js`, `StoryEngine.js`). Procedural expressions found in JSON config files are now parsed into an Abstract Syntax Tree via the local `jsep` parser, then safely processed by our custom `safeEval` module using a strict whitelist of mathematical operators and `ctx` boundaries. 
- **[SECURITY] HTML XSS Sanitization (`DOMPurify`, `PlayerController.js`):** To safely accommodate the heavy use of HTML template literal generation in the `lore-editor` UI loop, we downloaded and deployed `DOMPurify` locally. Over 30 instances of direct `.innerHTML` assignments in the editor, as well as the dynamic objective injection in `PlayerController.js`, were successfully wrapped in `DOMPurify.sanitize()`.
- **[SECURITY] Exporter DOM Operations (`export_textures.html`):** Stripped out `.innerHTML` string concatenation from the local texture exporter logging UI, rewriting it to utilize native `document.createElement()` and `div.textContent`, naturally eliminating any risk of XSS payload execution without needing an external library.
- **[BUGFIX] Intersection Z-Fighting and Tile Bleed (`ArchHall.js`, `StructureKit.js`):** Fixed a visual error where the subway tile on Arch Hall intersection ribs was "bleeding" outward, Z-fighting with the yellow wallpaper of adjacent rooms. Standardized the instantiation loop to strictly align all ribs' local `+z` axes towards the exterior so that the geometry generator can consistently apply the tile material exclusively to the inner-facing depth normals (`fnZ < -0.5`). 
- **[BUGFIX] Server Inode Crash (`engine_server.js`):** Fixed a severe latent server crash where the local development server was mistakenly passing a file's inode number (`stats.ino`) to `fs.readFile()` instead of its file path, throwing a `500 Internal Server Error` (Bad file descriptor) on any un-cached `GET` request.

# Level 0 Engine Changelog

## [v1.3.5] - 2026-08-21

_Core Engine Stabilization & Frame-Pacing Optimization_

### Changed

- **[ARCHITECTURE] Unified Math Primitives (`HazardUtils.js`, `AABB.js`, `Vec3.js`):** Purged the custom `AABB` and `Vec3` dual-math paradigm in favor of native `THREE.Box3` and `THREE.Vector3` primitives. Extracted redundant swept-collision logic into a centralized `sweepGroundedCollision()` helper to ensure entities and the somatic camera share the exact same physical constraints.
- **[PERFORMANCE] Zero-Allocation Frame Pacing (`PlayerController.js`, `HazardUtils.js`, `IncineratorEntity.js`, `WardenEntity.js`):** Eliminated Garbage Collection (GC) micro-stutters during high-frequency update loops. By extracting entity pathfinding into `resolveEntityLocomotion()` and pre-allocating scratch vectors in object constructors, the engine no longer allocates memory during physics and collision detection, stabilizing the 1% low frame rates.
- **[PERFORMANCE] Zero-Allocation Chunk Carving (`ChunkManager.js`):** Eliminated thousands of transient `THREE.Box3` allocations that occurred during procedural chunk generation when testing for wall and fixture intersections. Replaced the `.clone()` methodology with static `_scratchBox` references, preventing memory spikes and latency hitches when crossing sector boundaries.
- **[PERFORMANCE] Zero-Allocation Interaction Loops (`InteractionController.js`):** Surgically inlined array iteration loops for the `somatic-interact` click event and the continuous `updateInteractives` render loop. This purges anonymous closure creation on every frame, further mitigating GC pressure.


## [v1.3.4] - 2026-08-20

_Mechanic Tensegrity & Optics Refinement_

### Changed

- **[GAMEPLAY] Flashlight Depletion & Cooldown (`PlayerController.js`, `SomaticInput.js`, `SaveManager.js`):** The flashlight now enforces a 10-second penalty cooldown when the battery hits 0%. Additionally, a mechanical hysteresis lock prevents the player from toggling the flashlight back on until it has recharged to at least 25% capacity.
- **[GAMEPLAY] Stamina Depletion & "Winded" Cooldown (`PlayerController.js`, `SaveManager.js`):** The stamina system now mirrors the flashlight penalty. Hitting 0% stamina initiates a 7-second cooldown where no regeneration occurs, and sprinting remains locked until the player has "caught their breath" (regenerated to 50% max stamina).
- **[GRAPHICS] Arch Hall Fixture Shadow Culling (`ArchHall.js`, `ChunkManager.js`):** The geometry compiler in `ChunkManager` now respects a per-mesh `noShadow` flag (previously only checking materials), allowing the physical casing and panel meshes of Arch Hall light fixtures to be flagged as non-shadow-casting. This prevents the fixtures from casting harsh shadows of their own geometry while allowing their emitted light sources to continue casting dynamic shadows.
- **[GRAPHICS] Flashlight Physical Optics Rework (`Environment.js`, `AtmosphereManager.js`):** Converted the flashlight's physical decay exponent from `2.0` (inverse square) to `1.0` (linear) to correctly emulate a collimated lens beam and prevent blowout/clipping when illuminating objects at point-blank range. To compensate, the base target intensity was lowered from `2.2` to `1.4` and the terminal falloff distance was extended from `45.0` to `55.0`.
- **[GRAPHICS] Flashlight Beam Spread (`Environment.js`, `AtmosphereManager.js`):** Widened the flashlight's cone angle from 25 degrees (`Math.PI / 7`) to 45 degrees (`Math.PI / 4`) during standard traversal, and up to 60 degrees (`Math.PI / 3`) while crawling in vents. Penumbra was slightly increased to soften the edges of the wider cone.

## [v1.3.3] - 2026-08-19
_Spawn Safety & Shadow Lighting Optimization_

### Changed

- **[ARCHITECTURE] Spawn Elevator Clearance:** The `ChunkManager` now defers placing the spawn elevator until the very end of chunk generation and guarantees the space in front of the door is free of dynamic obstructions and forced structures (like crawlspace ducts), preventing them from being partially deleted during initialization.
- **[GRAPHICS] Shadow Slot Optimization:** Randomized the lights in the Clinic sector patient rooms to have a 50% chance of being non-shadow-casting (`noShadow`), freeing up valuable shadow light slots in dense areas.
- **[GRAPHICS] Shadow Caster Occlusion Fade:** Refined `LumenGrid.js` occlusion-fade mechanics. Shadow-casting lights now bypass occlusion fading completely (since shadow maps handle proper wall occlusion without bleeding) preventing them from looking "motion activated" when un-occluded. Non-shadow-casting lights still fade in to hide light bleed, but the fade speed was increased 5x for a subtler, tighter transition.

## [v1.3.2] - 2026-08-19

_Architectural Decoupling & The Elevator Update_

### Changed

- **[GRAPHICS] Adjustable Max Shadow Lights:** The `maxShadowLights` pool size (previously hardcoded to 6) is now an adjustable slider in the settings menu, ranging from 2 to 12. Adjustments require a refresh to trigger reallocation within `LumenGrid.js`.
- **[ARCHITECTURE] Blueprint De-Coupling (`StructuralBlueprints.js`):** The legacy pattern of compounding mutually exclusive geometries into single blueprint files ("CRATES OR STAIRWAY", "DUCT OR VENT") has been dismantled. The probabilistic branching that once occurred during the spawn event has been baked directly into the global weighting matrix, mapping exact fractional probabilities to dedicated files.
- **[ARCHITECTURE] The Staircase Extraction (`Crates.js`, `Elevator.js`):** The cosmetic staircase logic was excised from the engine and replaced with an elevator cabin. The geometry seamlessly inherits the old staircase's warp mechanics by shifting the `isWarpZone` collision boundary from the top step to the elevator floor. Spawn frequency of functional teleportation elevators increased from 25% to 40%.
- **[ARCHITECTURE] Duct and Vent Segregation (`Duct.js`, `Vent.js`):** The complex floor-level crawlspace routing and the generic fallback wall were split into dedicated logic streams. The `Duct.js` fail-state (when no viable adjacent exits exist) was modified to return `false`, relying on the `ChunkManager` to fall back to a standard wall cleanly rather than polluting the blueprint with `isDefaultWall` logic.
- **[SYSTEM] Module Preload Map (`engine.html`):** The application's preload directive map was explicitly updated to target the newly decoupled asset graph and prevent 404 cache failures.


## [v1.3.1] - 2026-08-19

_Player Traversal & Dynamic Entities_

### Added

- **[GAMEPLAY] Player Jumping (`PlayerController.js`, `SomaticInput.js`):** Implemented true ballistic jumping mechanics with gravity. The player can now jump over obstacles.
  - A standard walking jump costs minimal stamina and clears smaller debris (chairs, cones).
  - A running jump provides higher velocity to vault over large obstacles like tables, but costs double the stamina.
- **[WORLD] Dynamic Ceiling Eyes (`AnomalousPointOfInterest.js`):** The previously static "ping pong ball" eyes in the ceiling hole POI are now fully dynamic. They constantly track the player, feature vertical slit pupils, and will squint and scurry away into the darkness if directly stared at for 2 seconds.

### Fixed

- **[PHYSICS] Dynamic Head Collision (`PlayerController.js`):** Fixed an issue where the player could jump and clip their head through lower architectural features like Archways. The physics controller now casts a vertical bounding column upward from the player's footprint to dynamically scan for the lowest ceiling AABB and enforce true vertical head collision.

## [v1.3.0] - 2026-08-19

_Tutorial Progression & Asset Pipeline Fixes_

### Added

- **[GAMEPLAY] Kinetic Flashlight Charging (`PlayerController.js`):** The flashlight can now be recharged by kinetically shaking the camera wildly, but only when the flashlight is unequipped. 

### Changed

- **[GAMEPLAY] Stowed Default Equipment (`Compass.js`, `ElevatorSpawn.js`):** The player now spawns with both the compass and flashlight stowed by default.
- **[GAMEPLAY] Tutorial Power Progression (`InteractionController.js`):** The tutorial airlock blast door and the room's main power grid will no longer activate until the flashlight battery reaches a full 100% charge. 

### Fixed

- **[WORLD] Keypad Wall Mounting (`ElevatorSpawn.js`):** Migrated the tutorial keypad completely off the blast door's structural housing bezel. It is now mounted perfectly flush on the adjacent solid perpendicular wall. 
- **[GRAPHICS] Asymmetrical Blast Door Decals (`SetPieces.js`, `PropTextures.js`):** Fixed an issue where the warning decals on the blast doors were visually skewed towards the outer frames because half the door texture is hidden inside the wall pocket. The right-hand door panel now dynamically flips its UV mapping on creation, and the procedural decal was shifted to perfectly bisect the exposed visible area of the door panels.
- **[GRAPHICS] Scaled Warning Decals (`PropTextures.js`):** Scaled down the procedural hazard warning decals on the blast doors by exactly 50%.
- **[SYSTEM] Tutorial State Save Persistence (`Environment.js`, `ElevatorSpawn.js`):** Fixed a progression reset bug where reloading a save inside the starting room would erroneously rebuild the chunk with a dead light fixture and a reset code-locked blast door. The `level0_tutorial_unlocked` state is now permanently written to `localStorage` and correctly initializes the spawn chunk as fully powered and fully unlocked with a green, inert keypad on reload.
- **[GRAPHICS] Zero-Battery Ghost Lighting (`AtmosphereManager.js`):** Prevented the flashlight from casting a residual ambient illumination when at 0% battery.
- **[SYSTEM] Texture Cache Invalidation (`export_textures.html`):** Bumped the master procedural texture export version to `1.3.0` to force the IndexedDB cache to purge stale assets and apply the new scaled door decal textures.

## [v1.2.9] - 2026-08-19

_Procedural Winding Hallways, Enclosed Pods & Wall-Aligned Clutter_

### Added

- **[WORLD] Procedural Seed-Based Layout Generation (`AnnexSector.js`):** Completely replaced the static, hardcoded layout in the Annex sector with a seed-driven procedural generator mapping a 7x7 node grid across the 13x13 playable sector area. Hallways are carved via randomized Depth-First Search with a heavy directional turning bias and loop connections, generating authentic winding serpentine corridors connecting all four sector airlock doorways (`(7,1)`, `(7,13)`, `(1,7)`, `(13,7)`).
- **[WORLD] Narrow Corridors via Wall Liners (`AnnexSector.js`):** Placed mahogany wall liners (`0.55m` depth) on solid wall faces along corridors, narrowing the physical walking space from 4.0m down to a cozy ~2.9m width for a more atmospheric Backrooms experience.
- **[WORLD] Water Cooler Prop Rotation (`AnnexSector.js`):** Added water coolers (`OfficeFurniture.buildWaterCooler`) to the Annex prop pool, placing them flush against corridor walls and scattered sparingly.

### Changed

- **[WORLD] Wall-Flush Prop Alignment & Fern Pairing (`AnnexSector.js`):** Filing cabinets now only spawn flush against solid corridor walls with correct outward orientation. Fern pots no longer spawn isolated in hallways; they now exclusively spawn beside filing cabinets along the wall as rare decorative accents (~45% chance when a cabinet spawns). Dead-end corridor branches reliably spawn facing filing cabinets (with paired fern pots) or water coolers.

### Fixed

- **[WORLD] Corridor Prop Spatial Grid Occlusion Drop (`AnnexSector.js`):** Fixed an issue where corridor furniture instances were being silently rejected by generic furniture bounding box intersection checks against wall liners. Created `spawnAnnexProp` to reliably attach corridor props directly to the chunk hierarchy and spatial grid.
- **[WORLD] Prop Wall Liner Clipping (`AnnexSector.js`):** Fixed a coordinate calculation error where props were pushed `0.5m` past the `0.55m` mahogany wall liners, causing them to visibly clip halfway through the walls. Distances are now precisely mapped (`1.075m`, `1.17m`, `1.225m`) so prop bounds rest exactly flush against the `1.45m` liner faces. Additionally, fern pots are now strictly instantiated on the local `-X` side of filing cabinets, preventing them from clipping into the double-cabinet tower expansion.
- **[WORLD] Pod Open Wall Leaks (`AnnexSector.js`):** Fixed an issue where research pod interior cells had missing wall boundaries facing open corridor tiles. Every research pod is now strictly bounded by solid walls on all sides except for its single custom wooden doorway cell.

## [v1.2.8] - 2026-08-19

_Research Pods, Retro Terminals & Security Keypads_

### Added

- **[WORLD] Research Pods & Narrow Hallway Layout (`AnnexSector.js`):** Revamped the Research Annex layout from open computer bay clusters into discrete, enclosed research pods connected by narrow branch corridors, while preserving open arterial cross-hallways (`X=7`, `Z=7`) to guarantee unobstructed access to all four sector airlock doorways.
- **[GRAPHICS] Procedural Wood & Beveled Glass Pod Doors (`AnnexTextures.js`, `AnnexSector.js`):** Replaced the generic steel doors with procedural mahogany and dark walnut wood-grain doors featuring upper 6-pane beveled glass windows with brass mullions, lower recessed raised panels with gold diamond medallions, and bottom brass kick plates matching the 1920s Art Deco aesthetic.
- **[WORLD] Mid-Century Writer's Desks & 60's Retro CRT Terminals (`AnnexSector.js`):** Outfitted research pods with bespoke mid-century writer's desks with tapered brass-ferruled legs and 1960s-style bulky CRT computer terminals complete with rounded bakelite housings, angled mechanical typewriter decks, control dials, toggle switches, and green/amber cathode phosphor screen glow. Terminals act as multi-format lore hubs (`PC_`, `NOTE_`, `LAPTOP_`, `TAPE_`, `LOG_`).
- **[WORLD] Physical Wall-Mounted Security Keypad (`AnnexSector.js`, `InteractionController.js`):** Created a detailed physical electronic security keypad mounted on the outer hallway wall jamb beside the code-locked pod door, featuring a brushed gunmetal housing, glowing red status LED bar, cyan backlit LCD screen readout, 3x4 numerical button matrix, and subtle red ambient glow. Interacting with either the keypad or door activates the code entry interface.

### Changed

- **[INTERACTION] Persistent Mesh & Screen Dimming on Lore Consumption (`InteractionController.js`, `AnnexSector.js`, `NarrativeProps.js`):** Interacting with CRT computer terminals and laptops no longer causes them to vanish into thin air. Instead, the prop remains physically in the scene, the dynamic prop light is extinguished, the screen dims to a powered-down dark state (`annexCrtDimMat`), and the interactable state is deactivated.

### Fixed

- **[SYSTEM] Duplicate `drawDiamond` Identifier Syntax Error (`AnnexTextures.js`):** Consolidated multiple conflicting `drawDiamond` declarations in `_buildAnnexAssets` into a single parameterized helper accepting the target 2D canvas context.
- **[WORLD] Keypad Wall Occlusion & Placement (`AnnexSector.js`):** Corrected security keypad coordinates to mount flush on the exposed hallway wall face on the approach side in front of the locked door rather than being occluded within solid 4-meter wall geometry or behind the locked door.

## [v1.2.7] - 2026-08-19

_Surface-Bounded Prop Radiance & Annex Cleanup_

### Removed

- **[WORLD] Watercooler & Breaker Podium Spawns (`AnnexSector.js`):** Removed random drop rolls for watercoolers and broken breaker podiums from open floor tiles in the Annex sector.

### Fixed

- **[GRAPHICS] Desk & Table Light Bleed Prevention (`PropGlow.js`, `NarrativeProps.js`, `LumenGrid.js`):** Converted prop luminescence (laptops, notes, documents, and clipboards) from unoccluded omnidirectional point lights into directional spotlights with hemispherical and forward target vectors. Lights emitted by props resting on desks or tables now radiate upward into the room and forward from screens rather than bleeding through solid tabletop geometry onto the floor beneath.
- **[WORLD] Annex Document Prop Glow (`AnnexSector.js`):** Registered interactive desk document spawns with the narrative prop glow system so desk notes emit appropriate localized surface radiance.

## [v1.2.6] - 2026-08-19

_The Arcade Annex_

### Added

- **[WORLD] Winding Hallways & Computer Bays (`AnnexSector.js`):** Completely replaced the previous grid-like corridor and office generation in the Annex with a perfect recursive backtracker maze. The maze organically branches into 3x3 open computer bays equipped with clusters of desks, filing cabinets, and scattered lore.
- **[WORLD] The Locked Closet (`AnnexSector.js`):** Instead of randomly assigning keypads to multiple office doors, the generator now identifies a structural dead-end in the maze within the first sector chunk and converts it into a dedicated 1x1 locked closet. The Exit Key and essential supplies are securely stashed inside behind a single keypad door.

### Changed

- **[GRAPHICS] 1920s Union Arcade Textures (`AnnexTextures.js`):** Completely replaced the padded cell aesthetic with procedurally generated 1920s Art Deco textures. The walls now feature dark wood wainscoting and brass diamond accents. The floors are an intricate dark green and cream terrazzo, and the ceiling utilizes ornate geometric bronze plaster tiles.

### Fixed

- **[GRAPHICS] Z-Fighting Documents (`NarrativeProps.js`, `AnnexSector.js`):** Addressed an issue where 2D document meshes would perfectly overlap with table geometry, causing severe z-fighting. All documents spawned via `placeEphemera` and `placeSectorPaper` (as well as explicit manual placements) now possess a `+0.001` unit Y-clearance from the surface.

## [v1.2.5] - 2026-08-18

_The Bathysphere Booth_

### Added

- **[WORLD] Bathysphere Phone Booth Elevator (`ExitSector.js`):** Completely replaced the basic placeholder box for the exit elevator. It is now a detailed, procedurally generated capsule utilizing a hybrid Bathysphere/Telephone Booth design. It features a heavy welded steel hull, an intricate tiered metal roof with an antenna, folding glass doors, side portholes, and glowing green exit beacons. The collision boundary has been expanded to encompass the entire structural footprint.

### Changed

- **[GRAPHICS] Exit Sector Lighting (`Sectors.js`, `ExitSector.js`):** Completely overhauled the atmosphere in the Exit sector. Ambient lighting was drastically reduced to `0.02` and the fog was heavily tinted to a deep red (`0x330505`). The heavy ceiling trusses were removed, and the warning point-lights are now mounted completely flush against the ceiling tiles with boosted intensity and range to compensate for the darkness.
- **[GRAPHICS] Epoxy Concrete & Route Decals (`ExitTextures.js`, `ExitSector.js`):** The exit floor texture has been overhauled into a seamlessly tiling sparkled epoxy concrete. The large directional hazard arrows have been extracted into an independent `exitArrowMat` and are now instantiated as dedicated decal meshes along the pathways, ensuring perfect rotation and scaling rather than being stretched and baked into the global chunk geometry.

### Fixed

- **[GRAPHICS] Texture Tiling Clamp Bug (`ExitTextures.js`):** The `clampT` property on the `_createWrappedTexture` utility was mistakenly left as `true` for both the floor and the ceiling materials in the Exit sector. This caused a severe stretching artifact where the top row of pixels was dragged endlessly across the Y-axis. The flag has been disabled, allowing the epoxy speckles and the acoustic ceiling tiles to repeat naturally in both dimensions.
- **[GRAPHICS] "Glazed Glass" Ceiling (`ExitTextures.js`):** The exit ceiling material previously had an extremely dark base color paired with high metalness, turning it into a pitch-black void that absorbed all flashlight beams. It has been brightened to an acoustic off-white (`#666666`), `metalness` dropped to `0.0`, and `roughness` pushed to `1.0` (fully matte), ensuring it catches and reflects illumination properly.
- **[SYSTEM] Missing Environment Primitive (`Environment.js`):** The engine crashed during procedural chunk generation because `env._cylinderGeo` was being called but had not been bound to the `StructureKit` cache. The wrapper has now been successfully mapped.

## [v1.2.4] - 2026-08-18

_Stepping Over Ropes And Out Of The Dead Ends_

### Changed

- **[AUDIO] Inactive Convolvers Disconnect To Save CPU (`Synthesizer.js`, `AcousticEngine.js`):** Convolution is the most expensive node in the Web Audio graph, and Firefox notoriously continues dedicating CPU time to it even after the tail decays. The `AcousticEngine` now gracefully crossfades and fully unhooks inactive wet `ConvolverNode`s from the audio graph, recovering the background CPU cost.

### Fixed

- **[INPUT] Mouse Look Stability Decoupled From Browser Event Rates (`SomaticInput.js`):** Mouse rotation is now accumulated in `_pendingMouseMovement` and applied predictably during the frame update loop instead of immediately inside the `mousemove` event handler. This fixes erratic camera sensitivity in browsers like Firefox which dispatch multiple uncoalesced mouse events per frame.
- **[WORLD] The Spawn Elevator No Longer Traps The Player (`ChunkManager.js`):** The spawn chunk logic previously laid claim to the first non-wall cell it encountered. Because the elevator explicitly seals its rear three walls, spawning inside a critical hallway segment could physically sever the maze. A pre-pass now correctly anchors the elevator inside a dead-end cell (exactly 1 open neighbor) so it behaves as a clean end-cap for a branch.
- **[WORLD] Queue Line Ropes Left Floating Without Poles (`RideQueueHall.js`):** A straight queue cell previously omitted its terminating boundary pole if the adjacent cell was *any* queue block, assuming its neighbor would build the pole instead. Corner queue blocks do not build boundary poles, leaving the connection floating. Logic now specifically validates that the neighbor is a *straight* queue of matching orientation before omitting its own pole.
- **[GAMEPLAY] Queue Hitboxes Forced Crouching (`RideQueueHall.js`):** The bounding boxes for queue ropes and stanchions have been explicitly clamped to a maximum world-space Y-height of `0.3m`. This drops the geometry's collision bounds low enough that the player controller treats them as a shallow stair step, allowing players to walk straight over them without needing to manually crouch under the original 1.0m hitboxes.
- **[GRAPHICS] Tucked Flashlight Grazing Angle In Vents (`Flashlight.js`):** When crawling, the flashlight tucked exactly to `(0, 0, 0)` center. In a narrow straight vent, this perfectly centered angle resulted in near-zero diffuse light bounce (`dot(N, L)`) on the parallel walls. The tucked position is now offset to `(0.15, -0.2, -0.1)`, providing a steeper grazing angle and successfully illuminating the tunnel.
- **[GRAPHICS] Spawn Elevator Exterior Fixes (`ElevatorSpawn.js`):** Fixed light leaks and exposed z-fighting around the elevator by dropping a shroud over the exterior structure. Reused the `woodMat` paneling from the Oasis for consistent aesthetics. Additionally, enabled `castShadow` on the blast door meshes.
- **[GRAPHICS] Battery Z-Fighting (`MaterialLibrary.js`):** Re-positioned the top and bottom metallic rims of the battery prefab by `±0.001` vertically to fix Z-fighting with the underlying yellow paint on the battery body.


## [v1.2.3] - 2026-08-18

_Somewhere To Wake Up, And The Manual On The Table_

### Added

- **[WORLD] The Arrival Car (`src/world/blueprints/ElevatorSpawn.js`):** A brand-new save now starts inside a sealed one-cell room instead of being dropped into open maze. Built on `THE OASIS`'s footprint — `checkpointFloorMat` floor, ceiling panel light at `y=2.98` (`0xffeedd`/`0xffaa55`, intensity `0.8`), a `buildTable` against the back wall — but shelled in `stainlessMat` on three sides with a **reused airlock door pair** on the fourth. Geometry is driven off the door rather than hardcoded: panels occupy `±1.55` of the cell's `±2.0`, so each side gets a `0.45` jamb, and a `0.4` header spans `2.6 → 3.0` above them, which is what stops the shell reading as a wall with a hole in it. The exit side is the first of `S, E, N, W` whose neighbour is not `isWall`, and `ctx.setWall(front, false)` then carves that neighbour regardless — the landing outside the door is guaranteed walkable even when the maze wanted a wall there, and `setWall` retires any wall mesh already staged for the cell. The player is stood `0.3` off centre toward the door facing `atan2(dx, dz)`, which puts the table and all three props in frame on the first rendered frame. Claims the first empty cell of the spawn chunk from `_buildEmptyCell` and returns early, so none of the usual floor clutter, breakers or props land inside the car.
- **[WORLD] The Car Is A Persistent Anchor (`env.elevatorAnchor`, `SaveManager.saveState`):** `{cellX, cellZ, exitIndex, seed}` is written into the save as `state.elevator` and restored in `main.js` **before `setup()`**, because `generate()` re-arms the room from it during setup. Rebuild is keyed on the cell, not on a one-shot flag, so the car is reconstructed every time its chunk comes back into range — walk 900 units away until `0,0` unloads, walk back, and the room, its door and its table are all there again. The stored `exitIndex` is replayed verbatim rather than re-derived, so the way out never moves between visits. Re-armed on every `generate()` including warps. Moving the player into the car stays one-shot (`placePlayer`), so a restored session keeps the position that came out of the save rather than being yanked back to the start.
- **[SYSTEM] One-Shot Props (`env.consumedProps`, `userData.consumeKey`):** Chunk unload prunes interactables by `chunkHash` and a rebuild re-creates every prop, so anything taken from a room came back the moment the player walked out of render range and returned. Harmless for procedural clutter; not harmless for a fixed, permanently anchored room full of supplies. A prop can now opt in by carrying a `consumeKey`, and the three consumption branches in the interact handler record that key in `env.consumedProps`. `ElevatorSpawn` checks the set before building its battery and its almond water, so the car itself is always rebuilt while its supplies are not. The set is deliberately **not** cleared by `generate()` — chunk churn, warps and reloads all have to preserve it. It is persisted as `state.consumed` and restored in `main.js` before `setup()`, since the first chunk build needs to know what is already spent. Only two things empty it: a storage purge, and `somatic-run-reset`.
- **[WORLD] Sliding Doors Take A Tunable Trigger Radius (`InteractionController.updateSliderDoor`):** `openRadiusSq` on a door's `userData`, defaulting to the previous hardcoded `20.0` (4.47m). The car is 4m deep, so on the corridor default its doors were already open the moment the player spawned 1.1m from them — the room could never be presented sealed. It uses `1.44` (1.2m), which holds shut at the spawn position (1.7m) and opens on approach well before the closed door's collision box stops the player at 0.65m. No existing door changes behaviour.

### Changed

- **[GAMEPLAY] Stamina Drains ~12% Slower (`PlayerController.js:350`):** `baseBurn` sprinting **8.0 → 7.0**/s, sprinting while chased **12.0 → 10.5**/s, squeezing **1.5 → 1.3**/s. A full-stamina sprint goes from 12.5s to 14.3s, and a chased sprint from 8.3s to 9.5s. Deliberately confined to the base rate: the coherence multiplier on the next line (`×1.0` to `×1.6` as coherence falls) still scales the new base identically, so low-coherence sprinting stays proportionally punishing, and the `maxStamina` decay (`3.5`/s, floor `40`) and every recovery rate are untouched.
- **[GAMEPLAY] Kinetic Charging From Movement Doubled (`PlayerController.js:408`):** Coefficient `0.15 → 0.30`. Velocity is integrated as `currentSpeed * delta` against `exp(-25 * delta)` damping, so it settles near `currentSpeed / 25` — roughly 2.4 u/s walking and 5 u/s running. Charge therefore moves from 0.36/s to 0.72/s walking and 0.75/s to 1.5/s running, against the flashlight's 1.0/s drain. That shifts the economy from about 3 seconds of walking in the dark per second of light down to ~1.4: still a deficit, so the light stays rationed, but movement now visibly contributes instead of trickling. Held at 2× on purpose — much past this and walking in the dark roughly breaks even with light-on time, and the flashlight stops being a constraint at all. The `100.0 - linguisticDarkMatter` ceiling is untouched.
- **[WORLD] The Airlock Door Builder Is Now Reusable (`SetPieces.buildBlastDoor`):** `buildDoor` was a closure inside `buildAirlock` and therefore unreachable by anything that wanted one door pair rather than a whole two-door chamber with a shell and a cycle switch. Lifted out to a method taking `(chunkGroup, hash, cx, cz, spansX, opts)`; `buildAirlock` now delegates to it twice and is otherwise unchanged. The body is a byte-for-byte move apart from `isAirlockDoor` and `openRadiusSq` becoming parameters — `isAirlockDoor` is what routes a door to the airlock state machine versus the proximity slider, and the car wants the latter. A `doorMat` binding left dead in `buildAirlock` by the extraction was removed; the version inside `buildBlastDoor` expands to the same material chain in every case.
- **[GAMEPLAY] Death Restarts The Run In A Fresh Arrival Car (`somatic-run-reset`):** `resetMetabolism()` — the single call both death paths and a rejected inquest already share — now dispatches `somatic-run-reset`, and `Environment` listens for it to clear `consumedProps`, drop `elevatorAnchor` and re-arm `wantsElevatorSpawn`. This is what makes "gone until you die" mean anything. Dying already rebuilt the world rather than respawning you in it: `triggerBlackout()` appends `" NULL"` to the seed string before `generate()` runs, so the maze on the other side of a death is a different maze, and an anchor pointing into the old one is meaningless. The next `generate()` therefore carves a new car at the new origin with its supplies restocked, exactly like a first boot. Verified end to end — seed `Q♠|7♦|K♥|9♠|7♣` becomes `Q♠|7♦|K♥|9♠|7♣ NULL`, `consumedProps` empties, a fresh anchor is stamped against the new `baseSeed`, and all three props are back on the table.
- **[WORLD] The Spawn Chunk Is Never A Sector (`Environment._pickSpawnChunk`):** A macro chunk builds through `activeSector.build` and never reaches `_buildEmptyCell`, so spawning into one meant no arrival car and a player dropped into whatever the sector put there. The spawn chunk now walks outward in rings from the requested one and takes the first non-macro chunk it finds. Macro placement itself is untouched and still depends only on the seed — perturbing *that* to dodge the spawn would have made world layout depend on where the player happened to be standing when `generate()` ran, and made a mid-session regenerate diverge from a reload of the same save. Chunk `0,0` was already safe via `macroSpawnExclusionRadius = 1`, so a first boot never hit this; the paths that did are the ones that pick the chunk from the player's current position — death respawns, the Generate button, and inquest rejections. Computing `baseSeed` moved above the spawn block, because choosing the chunk now has to ask `SectorPlacement` a question that needs the seed.
- **[UI] The Tutorial Manual Is An Object Now, Not A Popup (`main.js`):** The `pointerlockchange` listener that force-fed `NOTE_TUTORIAL` 1.5 seconds after the first pointer lock is gone. The manual is a readable `document` prop on the car's table, sat at the centre of the three items and `0.22` nearer the player than the battery and the almond water, so it is what the first press of `E` reaches. Reading it opens exactly the same fragment through the same `somatic-read` path.

### Fixed

- **[GAMEPLAY] Camera-Shake Charging Was Framerate-Dependent, And Paid Less The Faster You Ran (`PlayerController.js:407`):** `angularSpeed` is a **per-frame** rotation delta in radians, and the charge term then multiplied it by `delta` a second time. The reward for a given physical hand movement was therefore proportional to frame time — the same 360° spin earned less charge the higher the framerate, which is the opposite of what a kinetic charger should do, and at 60fps a full spin was worth **0.84** battery. The `Math.min(5.0, angularSpeed)` clamp was inert on top of that: 5 radians inside one frame is ~300 rad/s at 60fps and unreachable, so it never once fired. Now converted to a true angular **rate** (`angularSpeed / Math.max(delta, 1e-5)`) clamped at `6.0` rad/s, which makes the same motion pay the same on any hardware. A full spin is worth **6.3**, and a sustained fast shake pays 6.0/s against roughly 1.6/s before. The `Math.max(delta, 1e-5)` guard is load-bearing rather than decorative: a zero `delta` would otherwise produce `0/0` and put `NaN` straight into the battery.
- **[WORLD] The Manual Z-Fought The Tabletop (`ElevatorSpawn.js`):** `buildTable` puts its top's upper face at `legH + 0.025 + 0.025`, which is **exactly 0.93** — the same height the Oasis places its props at, and the height the note was laid at. The battery and the almond water are solids sitting on that plane and were fine; the note is a flat `PlaneGeometry` and was therefore perfectly coplanar with the tabletop across its whole face, tearing between paper and wood every frame. Paper now sits at `SURFACE_Y + 0.005`. The 5mm is enough at this depth range (near `0.1`, far `100`) to resolve cleanly without the sheet reading as hovering.
- **[SYSTEM] Spent Props Swallowed Interacts Meant For Their Neighbours (`InteractionController`, `somatic-interact`):** Reading a document or taking a pickup sets `visible = false` but leaves the object in `env.interactables`, and the interact handler picks the **nearest object within the cone** (`closestDistSq` from 9.0, `dot > 0.75`). An invisible spent prop therefore kept winning and matched none of the dispatch branches, so the interact silently did nothing. Reproduced directly in the car: read the note, and the battery and almond water 0.38m either side of it both became unreachable from the spawn position. The handler now skips `obj.visible === false`. Deliberately keyed on visibility rather than `active === false`, which was the obvious candidate and is wrong — `BreakerPodiumSpawn` creates the exit switch with `active: false` and `exit_switch` is interacted with precisely when `!active`, while breakers set `active = false` on trigger and stay visible. Every interactable that goes invisible (`InteractionController.js:333`, `789`, `797`, `804`, `810`) is genuinely spent.

### Known

- **[SYSTEM] Only the arrival car's props opt into one-shot behaviour.** `consumedProps` is a general mechanism, but `consumeKey` is currently set in exactly one blueprint. Every other prop in the game still respawns on chunk reload, because a procedurally placed prop has no identity stable across rebuilds to key on — the car can do this only because its cell and contents are fixed. Extending it means giving world props durable ids, which is a larger change than this release.
- **[SYSTEM] The manual is deliberately not one-shot.** It carries no `consumeKey`, so unlike the battery and the water it comes back when the room is rebuilt. `NOTE_TUTORIAL` returns `ephemera: true` and `StoryEngine.getFragment` returns early on it without ever pushing to `collected`, which means it is **not** filed in the journal — making it permanent-consume would delete the game's only controls reference on a single read. It behaves as an ordinary document instead: spent for the chunk's lifetime, recoverable by leaving and coming back.
- **[GAMEPLAY] Death restocks the car but does not empty the player's pockets.** `resetMetabolism()` resets stamina, coherence and objectives, and it never cleared `inventory`. Dying with a battery in hand and then collecting the new car's battery is therefore a net gain of one. Pre-existing behaviour, surfaced rather than introduced by this release, and left alone because inventory-on-death is a balance decision rather than part of this change.
- **[WORLD] Changing the seed drops the anchor.** The stored cell describes a maze that no longer exists, so `generate()` compares `elevatorAnchor.seed` against the freshly computed `baseSeed` and discards it rather than rebuilding the car into a wall. A reseed is therefore a one-way loss of the original start point, which is correct but worth knowing before typing in a new seed.
- **[WORLD] From dead centre, the three table props are ambiguous to aim at.** The interact cone (`dot > 0.75`, ~41°) covers all three at that range, so the pick falls to whichever is nearest and ties resolve on array order. Both items are still collectable and any real head movement breaks the tie, but it is a consequence of the cone test rather than a layout decision.

## [v1.2.2] - 2026-08-18

_Papering A Crawlspace, And What The Old Paper Was Hiding_

### Added

- **[ASSETS] A Real Paisley Generator (`SurfaceTextures._buildPaisleyWallpaper`):** The first pass drew its boteh as a hand-tuned chain of eight bezier segments, which is why it read as a symmetrical blob rather than a motif. The outline is now generated: a spine walks forward while its heading accelerates from straight into a curl (`angle = bend * t^1.5`), carrying a half-width profile that peaks close to the base (`sin(PI * t^0.6)` — the fractional exponent is what pulls the maximum down to t≈0.31). That combination is what produces a round belly and a long hooked tip. Layout moved from a 2x2 grid to **two serpentine stems**, the second phase-shifted half a period for a half-drop, each stem a single sine over the full canvas height so its endpoints share an x and it rejoins itself across the seam. Motifs hang off the stem's extremes rather than sitting on a grid, which is the difference between reading as wallpaper and reading as tiled stamps. Bodies are two-tone with a beaded inner border, leaves are angled to the stem tangent, and the ground carries roll striae and foxing. **Seamless by construction** — every mark is emitted through a `tile()` helper that repeats it at the nine neighbouring canvas origins, so anything crossing an edge arrives on the far side. Verified against a 2x2 with the seams drawn in, and a 4x4 to confirm the repeat does not announce itself.
- **[ASSETS] Duct Interior Is Now Four Materials, Not One (`SurfaceTextures._buildDuctInteriorSet`):** `ductWallMat` (paisley), `ductFloorMat` / `ductCeilingMat` (worn butt-jointed boards, one material shared by both), and `ductTornMat` (see below). Not only an art split — the lining's vertical and horizontal faces cannot share a UV scale (see Fixed), and a repeat lives on a texture, which lives on a material. All four run through `makeDuctInterior`, so the whole tube stays AO-killed. World tile is 0.8m on every face; one UV unit is 4m on every axis except wall V, which `buildWall` maps to 3m, so only that repeat differs — `(5, 3.75)` for walls against `(5, 5)` for the panels.
- **[ASSETS] Torn Wallpaper Edge (`SurfaceTextures._buildDuctTornEdge`):** A cutout strip standing 2mm proud of each wall panel along the bottom 12cm — plaster below an irregular tear, a hairline of paper backing along the cut, fully transparent above so the paisley shows through. Cut with `alphaTest` rather than blended, so there is no transparency sorting to get wrong. Two things make it hold: the tear profile is a low flat baseline plus four narrow gaussian lifts evaluated across the wrap (`k = -1, 0, 1`) so they cross the seam intact, with only integer-frequency jitter carrying the ragged fibre; and the strip tiles at **1.6m against the wallpaper's 0.8m**, so its period outlasts the panels it sits on and no wall shows the same tear twice. The first attempt used a single sine the width of the tile outlined in a 3-7px pale cream ribbon, which produced a continuous rolling silhouette that read as fungus and repeated visibly — recorded here because the failure was entirely in the low frequency and the bright continuous lip, not in the idea.
- **[WORLD] Guaranteed Far Exit On Duct Runs (`CrawlspaceDuct`):** A post-pass after pruning measures the Manhattan distance from the start cell to the farthest cell carrying an exit. Under 3 cells, it collects every network face bordering a genuinely openable neighbour — same `isWall` / `isAirlockApron` / `isLowClearance` tests growth uses, so it cannot open a door into solid — and promotes the farthest. At most one exit added, and only to networks that are currently clustered.

### Fixed

- **[WORLD] Duct Floor And Ceiling Sampled A 1/75th Sliver Of Their Texture (`CrawlspaceDuct.buildDuctLining`):** `buildWall` gives side faces world-proportional UVs against a 4m x 3m reference, but scales a slab's top and bottom V by `h / 3.0`. The duct floor and ceiling linings are 0.04m thick, so their visible faces sampled **V ∈ [0, 0.0133]** — one seventy-fifth of the texture stretched across the entire panel. Every horizontal surface in the duct was a smear of a single texture row, and no texture would have survived it. Those faces now build through a duct-local helper that puts world-proportional UVs on ±Y against the same 4m reference the walls use. Contained to the duct rather than changing `buildWall`, which every thin horizontal slab in the game depends on.
- **[WORLD] Z-Fighting At Every Duct Junction (`CrawlspaceDuct.buildDuctLining`):** `buildWall` inflates every box by 0.02 on all three axes to hide seams between maze walls. Duct lining is not maze wall — its pieces are laid out to abut exactly, a hub's 1.2m footprint meeting a 1.4m branch at `holeW/2` — so that inflation turned every junction into a band of two coplanar surfaces: hub-to-branch floor and ceiling overlapping 2cm with tops both at `ductY+0.05` and `ductY+1.15`, and corner-to-side lining overlapping in a 2cm column with inner faces both at `cx-0.55`. It had always been there and was invisible only because the old smeared UVs made both sides of each fight identical. All **11 lining pieces** now build at exact nominal size and meet edge to edge with nothing overlapping.
- **[WORLD] Dead Ends Rendered As Bare Yellow Maze Wall (`CrawlspaceDuct`):** `capLining` seals the hub face where a branch would have gone, but was positioned off the dead branch cell rather than the hub's own lining plane. Measured from hub centre: corner posts present their inner face at `0.56`, the `block` behind is a `buildWall` and so grows to `0.59`, and the cap sat at `0.60` — strictly behind the block, which therefore occluded it on every pixel. With everything still inflated the cap had landed at `0.59`, exactly coplanar with the block face, which was itself a good share of the reported fighting. Now placed at `holeW/2 - liningT/2 = 0.58`, level with the posts and `0.03` clear of the block, with width `holeW - 2*liningT = 1.12` so it spans *between* the posts and abuts rather than overlaps.
- **[WORLD] Duct Runs Had Both Doors At The Entrance (`CrawlspaceDuct`):** `initialExits` was doing double duty — deciding whether the duct had any exit at all, *and* spending `maxExits`. Every open side of the starting cell became a door and incremented `numExits`, so a duct punched into a wall between two corridors began with the whole budget (2 or 3) already gone, and `numExits < maxExits` then refused every exit growth tried to place along the run. A 15-tile network could end with both its doors side by side at the mouth: crawl the length of it and the only way out is where you came in. The existing `totalRemainingExits < 2` guard never caught it because it counts exits without caring where they are. The start cell now claims **one** entrance chosen at random from its open sides, the budget is raised to `3 + random()*2`, and growth spends the remaining 2-3 out along the run. The four-way openable test, previously written out three times in three slightly different shapes, is now a single hoisted predicate.

### Changed

- **[ASSETS] Duct Ceiling Uses The Floor Boards:** In a crawlspace the ceiling is the underside of the floor above, so papering it was the odd choice out. Both keys point at one material rather than two clones, so they share a merge group instead of splitting into two draw batches; the differing ±Y box face winding keeps the ceiling from reading as an exact mirror of the floor underfoot.

### Known

- **[ASSETS] `rustMat`'s override is correct and should stay.** Flagged in v1.2.1 as an open art decision; investigated and closed. The pipeline's version (`HazardTextures.js:99`) is `{color: 0x3a1c14, roughness: 1.0, metalness: 0.3}` — a bare flat colour with no map and no bump — while the `MaterialLibrary` version that has been silently winning carries `corrosionBumpTexture`. Swapping would have downgraded every rusted surface in the game. It stays declared in `ASSET_OVERRIDES`.
- **[ASSETS] The `makeDuctDoorMat` concern from v1.2.1 is withdrawn.** It was raised without checking. `doorMat` is a genuine six-material array (`StructuralTextures.js:97`), the `isX` branch swaps the large faces onto ±X before selecting, and the duct-facing face is darkened correctly in both orientations. Only the four 10cm edges stay bright, which is defensible since they sit in the wall aperture.
- **[WORLD] The duct door casing must not be run through `makeDuctInterior`.** Tried, and it blacked out the jamb as seen from the lit corridor — the trim sits at the cell face and is visible from both sides, and a black AO map cannot serve both. It is deliberately left at full ambient with a comment at the call site. The correct fix, if the interior glare ever matters, is separate interior and exterior trim pieces, not one material trying to be both.
- **[ASSETS] `_buildPaisleyWallpaper` still accepts `faded` and `stained`, and nothing calls them.** Roughly 30 lines — the washed palette and the water-stain blooms — left reachable only by argument. Kept because they are parameters of a reusable generator rather than dead branches in a hot path, and they are exactly what a papered ceiling would want back.
- **[WORLD] The torn strip's phase steps at panel boundaries.** Its period is world-fixed at 1.6m while adjacent panels differ in length (`lDepth` 1.4 against a cap's 1.12), so the tear does not flow continuously around a corner. It reads as separate strips of paper, which is arguably correct, but it is a consequence rather than a decision.
- **[WORLD] Duct frequency may fall slightly.** A network that previously qualified on two entrance-cell doors now needs growth or the far-exit backstop to find a genuine second exit, or it is rejected by the `< 2` guard. That is the intended outcome — a duct whose only doors are side by side is not worth generating — but `MIN_EXIT_SPREAD` and `maxExits` are the dials if ducts start feeling scarce, or if 3-4 doors per network reads as too permeable.

## [v1.2.1] - 2026-08-17

_The Wallpaper Was Never Missing, And Neither Was The Save_

### Fixed

- **[ASSETS] The Paisley Duct Lining Was Built Correctly And Then Thrown Away (`MaterialLibrary.js`):** A new procedural paisley wallpaper was wired into `ProceduralTextureFactory.generateAssets` as `ductWallMat` and never appeared in engine. The generator was never at fault. `Environment.setup()` does `Object.assign(this, assets)` at line 81, but `MaterialLibrary.injectMaterials` runs later — from `generate()` at line 497 — and did `env.ductWallMat = makeDuctInterior(env.sharedWallMat.clone())` unconditionally, replacing the paisley material with a duct-darkened clone of the ordinary wall texture before a single duct was built. Every `env.ductWallMat` reference in `CrawlspaceDuct.js` was therefore reading the overwrite. The local build is now a fallback (`if (!env.ductWallMat)`) for boot paths that supply nothing. Verified off the running engine: `ductWallMat` is the 512x512 canvas material at `repeat 2,2`, sRGB, `roughness 0.9`, `bumpScale 0.02`, `aoMapIntensity 0.98`, `userData.ductInterior === true`; **40 meshes reference it**, and a camera raycast inside a crawlspace duct hits a lining face carrying the paisley map at 1.91m.
- **[SYSTEM] Autosave Was Silently Not Running (`SaveManager.idleSaveState`):** Reported as "the save didn't put me back where I left off", which looked like a restore bug and was not one. `startAutoSave` fires a 2500ms interval into `idleSaveState`, which queued every write through `requestIdleCallback` **with no `timeout` option**. A continuously rendering WebGL loop can saturate the frame budget indefinitely, and the browser then never reports an idle period, so the callback simply never runs — no error, no warning, no write. Measured live with the page reporting `visibilityState: 'visible'` and `hasFocus: true`: **`requestIdleCallback` fired 0 times in 3000ms while a control `setTimeout` fired normally.** The stored blob consequently kept whatever had been written during an early moment of boot when idle time still existed, which is exactly the "returned to the spawn point" symptom. Now `{timeout: 1000}`, which is what actually guarantees the callback runs. The failure is non-deterministic by nature — an earlier probe in the same session *did* persist within 3505ms — so it presents as an intermittent save bug rather than a scheduling one. Persistence and restore themselves were verified sound both before and after: a distinctive position round-trips through reload and CONTINUE exactly.

### Added

- **[SYSTEM] Asset-Clobber Detector And Override Registry (`MaterialLibrary.ASSET_OVERRIDES`, `_snapshotAssets`, `_reportClobberedAssets`):** The `ductWallMat` bug is a class, not an incident — anything `injectMaterials` assigns unconditionally silently wins over the asset bundle, because the bundle always lands first. All 36 keys `injectMaterials` writes were cross-referenced against everything the pipeline produces (`assets/textures/metadata.json` for the static path, the generator return objects for the fallback), and **exactly two collide: `ductWallMat` and `rustMat`.** `injectMaterials` now snapshots every material and texture on `env` at entry, diffs by identity at exit, and warns for any replaced key not declared in `ASSET_OVERRIDES`. Scoping the snapshot to materials and textures is deliberate: it keeps mutation-in-place (the `serverFloorMat.map.repeat` calls) and non-asset resets like `env.observers` — which `generate()` legitimately re-initialises at line 457, before this runs — from generating noise. Verified silent on a clean boot and correctly loud against a simulated clobber, with the declared `rustMat` override suppressed.
- **[SYSTEM] Per-Boot Save Backup And Recovery (`SaveManager.recoverBackup`):** `loadState()` now snapshots the previous session's raw blob into `level0_state_backup` once per boot, before the current session's autosave can touch it, and `recoverBackup()` promotes it back to the live slot and reseeds the IndexedDB copy. A boot that fails to restore and then overwrites is now recoverable rather than terminal — the failure mode that destroyed the evidence while diagnosing the entry above. The blob measured **861 bytes**, so the second slot costs nothing.

### Changed

- **[SYSTEM] Autosave Refuses Unsafe Writes (`SaveManager._refuseSaveReason`):** `saveState` previously guarded only on `player.isDead` and otherwise wrote unconditionally every 2.5s. It now returns a reason string and refuses on four conditions: the player is dead; boot has not finished restoring (`bootComplete`, armed by `main.js` immediately before `startAutoSave`); spawn placement is in progress; or `bestDepth` would regress below the stored value, which is the signature of a boot that failed to restore. The spawn check reads `isSpawning || needsSafeSpawn` rather than `isSpawning` alone, because `ChunkManager` clears `isSpawning` at line 218 *immediately before* it relocates the player, leaving a window where the camera still sits on the raw reset position. Refusals log once per distinct reason rather than every tick. The load-bearing case is a mid-session `generate()` — what a warp or inquest regeneration does, with autosave live — and it was measured directly: `generate()` parked the camera at the chunk-origin reset position `-826` with `isSpawning` true, the save **held at `-777` for the whole spawning window**, and only resumed once the player had been safe-spawned to a valid cell at `-822`. **The raw reset position never reached disk.** The predicate itself returns the correct reason for all four refusal branches and `null` when healthy.

### Known

- **[ASSETS] `rustMat` is overwritten by `injectMaterials` on every boot, and always has been.** It ships in `metadata.json`, is also built by `HazardTextures`, and `MaterialLibrary` replaces it unconditionally with a material built from `corrosionBumpTexture`. Every rusted surface in the game therefore renders with the `injectMaterials` version and the pipeline's copy is dead weight. It was **deliberately not guarded**: doing so would swap in a material the game has never rendered with and change the appearance of every rusted surface, which is an art decision rather than a bug fix. It is declared in `ASSET_OVERRIDES` instead, which preserves current behaviour exactly and makes the precedence explicit. If the pipeline's version is the intended one, that is a separate, deliberate change.
- **[SYSTEM] The `bestDepth` guard blocks deliberate rollbacks.** Autosave will not write a state whose `bestDepth` is lower than the stored blob's, so restoring an older save by letting the engine overwrite is no longer possible — use `recoverBackup()` or edit `localStorage` directly. A New Game is unaffected, since its purge clears the store first.
- **[SYSTEM] The original lost-position event could not be reconstructed.** By the time the save blob was inspected it already held the spawn coordinates, and the mechanism that produced them destroys its own evidence. The starved `requestIdleCallback` explains the symptom completely and is independently demonstrated, but it is an inference about that specific event rather than a replay of it. The backup slot exists so the next occurrence leaves something to read.

## [v1.2.0] - 2026-08-17

_Plugging The Leaks In The Render Pipeline_

### Changed

- **[GRAPHICS] Shadow Map Resolution And Filtering (`RenderEngine.js`):** The engine was previously hardcoded to use `THREE.PCFSoftShadowMap` regardless of the quality setting. With 6 active shadow-casting point lights, this forced the GPU to take 120 shadow texture samples per fragment, destroying fill-rate performance on even high-end hardware (e.g., 45fps on a 7800XT at 1080p). The default 'high' setting now correctly maps to the much cheaper `THREE.PCFShadowMap` (4 samples per light), and `PCFSoftShadowMap` has been moved to a new 'ultra' quality tier.
- **[GRAPHICS] Drastically Reduced Fragment Shader Lighting Loops (`LumenGrid.js`):** `maxActiveLights` was reduced from 32 to 16. In a forward renderer, Three.js compiles standard materials with distance and attenuation loops sized to the maximum number of lights in the scene, meaning every pixel on screen was running math for 64 total lights (32 point + 32 spot) even if their intensities were zero. Halving the active pool cuts the shader overhead by 50%. As an added architectural benefit, reducing the pool means the engine is no longer forced to assign slots to "bare" (non-shadow-casting) lights from distant rooms, which inadvertently fixed a massive light-bleed issue where specular highlights from adjacent sectors were shining straight through solid walls.
- **[PERFORMANCE] Bypassed Expensive Scene Graph Recalculations (`InteractionController.js`):** The interaction hot loop previously called `.getWorldPosition()` on hundreds of interactive objects and doors every frame. This implicitly triggered `updateWorldMatrix(true, false)` in Three.js, forcing a recursive check up the entire scene hierarchy. Replaced with a direct read (`setFromMatrixPosition(obj.matrixWorld)`), as the renderer's pre-render matrix update ensures this data is already perfectly fresh.
- **[GRAPHICS] Disabled Logarithmic Depth Buffer By Default (`RenderEngine.js`):** `logarithmicDepthBuffer` breaks early-Z hardware culling on many GPUs. Since the camera frustum sits comfortably between `0.1` and `100`, standard 24-bit depth precision handles it flawlessly. Disabled by default, recovering significant fill-rate overhead.

### Fixed

- **[PERFORMANCE] Shadow Prewarm Queue Now Properly Drains (`ChunkManager.js`):** The asynchronous `drainShadowPrewarm` loop used during chunk generation was hard-capped to 12 passes (`~96ms`). If a chunk contained more materials than could be compiled within that window, the queue aborted. When those remaining materials eventually fell into a shadow map frustum during gameplay (e.g., on first movement or light switch), Three.js was forced to synchronously compile the missing shaders on the main thread, causing severe frame drops. The pass limit has been raised to 150, guaranteeing the queue finishes entirely in the background before the chunk goes live.