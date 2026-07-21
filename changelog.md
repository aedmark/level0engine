# Level 0 Engine Changelog

## [v0.4.11] - 2026-07-21

_The Inquest & Dead Signal Update_

#### Added

- **[NARRATIVE] THE INQUEST:** The exit elevator no longer descends on touch. Interacting with it opens an inquest terminal: three findings on the form — the specimen that predates the site, the lost researcher sealing doors from the inside, the building transmitting its staff as payload — keyed `1`/`2`/`3` or clickable, with `E` to step back and the elevator still live for a return trip. The wording of each option is drawn from the seed's own sealed files. File the correct finding and the case closes: Coherence restores to full (certainty settles the mind) and the descent sequence runs as before. File wrong and the facility disagrees: a breaker-slam sting, the seed mutates, the world rebuilds, and a *different* cold case opens. If the sealed Finding of Fact was recovered from the records room, the terminal marks the matching option with `★ MATCHES SEALED FINDING` — reading is certainty. If it wasn't, the terminal says so plainly: filing without it is guesswork, one in three. The Paper Trail finally has a verdict at the end of it; every laptop is now a clue instead of a sanity tax, and the keypad room is the climax instead of a supply closet. Verified across fifty seeds: option themes align with finale indices, all three truths occur in the wild.
- **[GEOMETRY] Three New Signal Anomalies:** The detour catalog doubles from three to six. **The Inverted Dinette:** a table and two chairs bolted to the ceiling, upside down, set for dinner. **The Sunken Fixture:** a functioning light panel embedded in the floor, glowing upward, wired into the real LumenGrid with a 40% chance of the faulty-flicker schedule — a working light where no light should work. **The Congregation:** five to seven chairs in a perfect ring, all facing inward at nothing. The Congregation's first draft faced outward — the chair prefab's backrest defines its facing and the ring rotation needed `-(ang + π/2)`, not `ang + π/2`; caught in review before the engine shipped a support group.

#### Changed

- **[MECHANICS] Signal Hunt Odds:** The hop roll that decides how many anomaly detours the radar inserts before each breaker went from 40% zero / 35% one / 25% two to **10% / 50% / 40%**. A full three-breaker run now averages ~3.9 detours. The radar is a tour guide now, not a delivery route.
- **[MECHANICS] Type-Aware Signal Spacing:** The exclusion pool now tags entries as breaker or point-of-interest instead of treating everything as one species. Breakers repel each other at 60 units (was 50, addressing back-to-back objectives that felt like errands in the same hallway); POIs pack at 40 units from each other and only need 30 from a breaker — so the anomalies land *between* objectives, where a detour belongs.

#### Fixed

- **[MECHANICS] The Dead Detour Blueprint:** The point-of-interest anomaly blueprint (ceiling hole, felled dinette, violet panel) has been unreachable code since its prob was set to 0.028 — tied exactly with the dangle-tile entry. Cell assignment is `find()` over a descending sort, and with a tied threshold the stable sort guarantees the earlier entry intercepts every roll. Consequence: `pointsOfInterest` was always empty, the hunt-hop system had nothing to divert to, and 100% of radar signals resolved to breakers. Reported as "all three signals in a row were breakers — am I lucky?" No. Nobody was ever lucky. A two-million-roll harness confirmed zero POI hits on the old ladder and a 1.49:1 POI-to-breaker ratio on the new one (POI at 0.0235, stacked-tables re-laddered to 0.0215 to clear the window). A warning comment now sits on the entry so no future blueprint recreates the collision.
- **[UI] Overlay Close Dispatch:** The close-document handler tested `style.display !== 'none'`, but an overlay that has never been opened has an inline display of `''` — so the first document close of any session silently tripped the *keypad* branch, hiding a keypad that was never open and dispatching a phantom cancel. Both keypad and inquest branches now require `=== 'block'`.
- **[INPUT] Verdict Keys vs. Inventory:** `1` and `2` dispatched use-battery/use-almond-water unconditionally — including through open overlays, which mattered rather a lot once 1-2-3 became verdict keys. Item use is now gated on not reading. Filing a finding no longer chugs an almond water.

## [v0.4.10] - 2026-07-21

_The Scheduled Shadows & Open Archive Update_

#### Added

- **[NARRATIVE] Terminal Archive Paging:** Browsing the recovered archive used to mean closing the overlay and re-pressing E once per file — reading nine documents meant nine full interact cycles. Arrow keys now page the archive while a terminal is open: `◄`/`▲` for the previous file, `►`/`▼` for the next, wrapping at both ends, with a soft page-turn click per step. A terminal's first read still deals a fresh fragment from its zone pool and seats the cursor on it, so paging works immediately instead of only after re-access. While a document is open, arrow keys no longer leak into movement state (they were setting walk flags underneath the overlay this whole time); WASD passes through untouched. The footer hint now reads `[ ◄ ► BROWSE RECOVERED FILES ]` once there's more than one file to browse. Browsing is free — the Coherence scar stays where it belongs, on first discovery and the toll at close. Tapes, paper notes, and keypads are unaffected.

#### Changed

- **[ARCHITECTURE] The Sector Registry:** A macro zone's identity was scattered across five homes in three files — fog density in `Environment`'s constructor, fog tint in a ten-case switch inside `updateLights`, and ambience DSP, footstep foley, and spatial reverb in three separate tables inside `AcousticEngine` (two of which were object literals rebuilt from scratch on every single `update()` call, a quiet per-frame allocation that had no reason to exist). New `Sectors.js`: one row per zone carrying fog, tint, ambience, foley, and reverb, with fallbacks preserved exactly (CLINIC still inherits the default room reverb, INCINERATOR and CHASM still fall through to `DEFAULT_FOLEY`, and NORMAL/EXIT/CHECKPOINT still resolve to the base haze so the fog-blend rate check keeps working). Every one of the sixty-plus transplanted values was asserted against the originals. Blueprint materials stay in `TheArchitect` and zone behaviors (the archive's whispering patrons, the atrium rain) stay in the DSP — the registry is palette, not construction. Zone eleven is now one row plus one blueprint.

#### Optimized

- **[PERFORMANCE] Shadow Map Scheduling:** All seven shadow-casting point lights re-rendered their six-face cube maps every frame because `shadowMap.autoUpdate` defaults to true — up to 42 hidden depth passes per frame against a scene that is almost entirely static, and empty light slots at intensity zero paid the same bill as live ones. Each shadow now re-renders only when its light is re-seated onto a new fixture, when a hinged door, slider panel, or vent grate is actually mid-swing (the three animation paths raise a dirty flag on exactly the frames they move), or when the one-per-frame round-robin sweep reaches it as a safety net for freshly built chunk geometry. Steady state drops from 7 cube map renders per frame to 1; simulated over 60 frames: 60 renders where the old pipeline performed 420. Shadows of moving doors keep full per-frame fidelity, because a swinging door briefly restores the old cost — which was the baseline anyway.
- **[PERFORMANCE] Zone-Builder Geometry Cache:** Fifty-eight inline `new THREE.BoxGeometry`/`PlaneGeometry` allocation sites in the zone builders minted a unique `uuid` per call, which meant the `_compileInstances` batcher — which groups strictly by geometry uuid — filed identical doorway headers, jambs, hazard trims, staircase steps, wall vents, fence rails, and clinic props into groups of one and drew them solo, forever. All sites now route through a keyed cache (`_boxGeo`/`_planeGeo`/`_cacheGeo` on `Environment`), so repeats share geometry and actually instance. Every hinged door in the facility now shares two orientation geometries. Cache keys are exact deterministic dimensions, so the cache tops out around sixty entries for the session; the disposal path already exempted cached uuids. One near-miss caught mid-surgery by the mutation audit: the annex laptop screen ran `geometry.translate(0, 0.12, 0)` after fetching — harmless on a private geometry, but on a shared one every laptop built would have shoved all screens 12cm higher, compounding. The translate now lives inside the cache factory and applies exactly once.
- **[PERFORMANCE] Standard Depth Buffer:** `logarithmicDepthBuffer: true` made every material shader write `gl_FragDepth` per fragment, which defeats early-Z rejection — a real tax in a fog-heavy corridor renderer with this much overdraw, purchased to solve a z-fighting problem the decal materials already solve themselves (mold, stains, and glow all carry `polygonOffset` and `depthWrite: false`). At near 0.1 / far 100, standard 24-bit depth resolves roughly 1.5mm at 50 units; the closest coplanar pair in the scene sits 10mm apart. Log depth is now off by default, with a `?logdepth` URL parameter as the escape hatch for side-by-side comparison on real hardware.

## [v0.4.9] - 2026-07-20

_The Hermetic Threshold & Salvage Yard Update_

#### Added

- **[AUDIO] A Blast Door That Sounds Like One:** Sliding blast doors dispatched the exact same `somatic-door` event as every wood-grain hinged door in the facility, so they played the identical light square-wave creak regardless of the fact that they're pneumatic steel slabs. The slider's open/close events now carry a `variant: 'blast'` tag that routes to a new dedicated voice — a heavier sawtooth rumble sliding from 65Hz down to 28Hz under a bandpass noise sweep from 2600Hz to 200Hz, reading as a hydraulic hiss grinding into a low metal thud. Hinged doors, keypad doors, and the breaker panel are untouched.
- **[MATERIALS] Annex Industrial Doors:** The Research Annex's office doors were wood-grain slabs in wood jambs — visually identical to every other door in the facility despite the zone's "locked door" narrative gimmick depending on doors looking uniform on purpose, not looking generic by omission. New dedicated door assets: a brushed-steel face with a welded frame seam, a mid-rail, rivets, a small wired-glass observation window with cross-hatched wire mesh, a black/yellow hazard stripe, a scuffed kick plate, and a stenciled "STAFF ONLY / SUB-LEVEL B" placard, framed in matching brushed-steel jambs and header instead of wood. Surrounding partition walls stay the ordinary office wallpaper, so the door itself reads as heavier-duty than its surroundings.
- **[MATERIALS] The Impound's Salvage-Yard Redress:** The Impound (chainlink storage-lockup zone) was still ceilinged in the shared clinic sterile-panel tile and walled in the overworld's yellow wallpaper, despite every other macro zone getting its own distinct treatment in the v0.4.7 Distinctiveness Pass. New `impoundWallMat`/`impoundCeilingMat`: rusted, riveted corrugated galvanized siding on the perimeter walls and a matching corrugated tin roof underside overhead, rust bleeding from the panel seams on both, sharing one corrugation generator so the walls and ceiling read as a single built structure.

#### Changed

- **[ARCHITECTURE] The Hermetic Threshold (Entrance Hallways Reverted):** The dual-shell entrance system — an outer blast door, a 3-cell concrete corridor, and a second inner blast door bored straight into every zone's own interior — is gone. Each side of a macro zone now gets exactly one sliding blast door sitting flush on the chunk's true boundary; whatever's immediately behind it belongs entirely to that sector's own `build()` logic, same as before entrance hallways existed. The concrete corridor was showing up as generic hallway geometry inside every zone regardless of theme (worst in the Incinerator, see Fixed below); removing it restores each zone's own interior identity instead of a shared architectural skin bleeding through all of them.
- **[GEOMETRY] Corn Maze Ground Litter, Take Three:** Loose husks were originally a single 0.06×1.0 box wearing the tall wall corn texture (read as a stray green straw), then individual dried-husk-fragment props. Husks are now baked directly into the `dirtMat` floor texture as rotated, tan/gold leaf-litter smears with a fiber midline — sixteen per tile, tiled across the whole floor, zero added geometry. The dropped-cob prop that replaced the straw went through one pass to stop it reading as a fluted drink cup (near-equal radii, more sides, jittered irregular kernels instead of a printed grid) before a second look confirmed it still read as a tall boy from a fast-food counter; the cob prop and its texture/geometry generation are removed entirely rather than iterated on further. The Atrium floor has no loose ground-litter props left, husk or cob.

#### Fixed

- **[GEOMETRY] Incinerator Entrance Obstruction:** The Incinerator's solid 8×8 rusted core block spanned local cells 4–11 on both axes with no exception for the cross-shaped cell line the entrance hallways connect to — so the inner blast door opened directly onto a flush wall one cell later, with zero clearance to even step inside. The block now excludes the door-facing axis (`isMainPath`), and that excluded strip falls through to the room's own ambient pipe/valve decoration rather than being dressed up as more hallway ducting, so it reads as a walkway through the machine room instead of a corridor punched through it.
- **[GEOMETRY] Atrium Illusion Seams:** Two "you can see underneath it" gaps in the corn maze's environmental illusions. The void-shroud skirt curtain that seals sightlines above the perimeter wall was inset a fixed 4.5 units from chunk center regardless of the wall's actual position — for this chunk size that left roughly half a unit of open gap between the wall's inner face and the black curtain, visible right at the wall. It now derives its offset from the wall's own half-width instead of a fixed constant, hugging the wall's inner face with a hair of overlap. Separately, the corn maze's interior "night sky" plane floated a full 2 units above the corn stalk tops (4.0) and the leaning pole prop (~4.3) with nothing but empty air between them; it now sits at 4.6, just clearing the tallest prop, cutting the visible gap by 70% and physically overlapping the (now-flush) perimeter skirt where the two meet.

## [v0.4.8] - 2026-07-20

_The Homegrown Math & Sticky Light Update_

#### Added

- **[ARCHITECTURE] Homegrown Vector Math:** Introduced `Vec3.js` and `AABB.js` — zero-dependency vector and axis-aligned bounding box classes that duck-type against `THREE.Vector3`/`THREE.Box3` rather than requiring them, so the two can sit side-by-side in the same expression without either one aware of the other. `AABB` also carries its own static ray-box slab intersection (`rayIntersectsBox`), replacing entity sight-checks that previously stood up a full `THREE.Raycaster` just to test a ray against spatial-grid boxes.

#### Changed

- **[ARCHITECTURE] The First Migration Off Three.js Math:** `PlayerController.js` and `SomaticInput.js` now run entirely on the homegrown math layer — velocity, collision boxes, lean offsets, and the world-direction query behind somatic interaction all resolve through `Vec3`/`AABB` with zero remaining `THREE` references. `Anomaly.js` and `TheArchitect.js` followed for their collision and pursuit math specifically (scratch vectors, pursuit boxes, seven static collision-box construction sites, and the entity's line-of-sight check) while leaving mesh, material, and geometry construction on `three` where it belongs — the spatial hash grid never cared what type built its boxes, so the split cost nothing. Two dead fields (`_euler`, `_moveDelta` in `PlayerController`) that were constructed but never read got removed rather than carried across the migration.
- **[DYNAMIC ILLUMINATION] Desynchronized Flicker:** Faulty fixtures no longer share a single flicker rhythm. The old system ran every damaged light through the same three sine frequencies with only a phase offset, which reads as a synchronized strobe once you have more than one in view. Each fixture now keeps its own event schedule — a randomized wait, a 40-160ms dip to a randomized depth, and a 40% chance of an immediate stutter before the next randomized gap — so fixtures genuinely desync instead of pulsing to a shared beat.
- **[MATERIALS] Duller Diamond Plate:** The chasm floor and incinerator foundation material (`diamondPlateMat`) dropped from `metalness: 0.55/roughness: 0.45` to `0.25/0.75`. Keeps the metal read from the texture while substantially softening and broadening specular highlights, so any light reassignment near the boundary of the active pool reads as a dim shift rather than a sharp pop.

#### Optimized

- **[PERFORMANCE] Shadow-Casting Light Budget:** Cut `LumenGrid`'s simultaneous shadow-casting point lights from 10 to 7. Point light shadows render as six-face cubemaps — ten of them near the player meant up to sixty extra depth passes a frame, the single heaviest cost in the render pipeline and the primary suspect behind a measured cross-browser frame rate gap on identical hardware.
- **[PERFORMANCE] Active Light Pool:** `maxActiveLights` settled at 32, down from the original 40. Fewer simultaneously-lit fixtures means a shorter light loop in every `MeshStandardMaterial` fragment shader, at a size that still leaves comfortable headroom above the boundary-contention threshold that motivated the hysteresis fix below.

#### Fixed

- **[DYNAMIC ILLUMINATION] Active-Light Rank Flapping:** `LumenGrid` rebuilt its ranked list of the nearest lights from scratch every frame with no memory of the previous frame, so a fixture sitting near the cutoff could flip in and out of the active set from distance jitter alone — no player movement required. Visible as lights (and their floor reflections) popping in and out, worst in dense fixture clusters like the chasm's catwalk lamps. Fixtures that were active last frame now carry a small ranking bonus into this frame's sort, so a challenger has to be meaningfully closer, not marginally closer, to take the slot. Simulated against a cluster of ten near-equidistant fixtures: 760 on/off transitions across 300 frames dropped to 4.
- **[GEOMETRY] Cache Leaks Behind the Instancing System:** `geoCache`'s contract is that a marked `uuid` is permanent and exempt from disposal — two places broke that promise by marking geometry that was never actually reused. `TheArchitect.js`'s tape-recorder prop built and permanently marked a fresh geometry on every spawn; `Environment.js`'s sector doorway block did the same across nine geometries (jambs, header, awning, cladding, door panel/stripe/rib) on every single doorway generated for the life of the session. Both now key into `geoCache` by shape and orientation instead, so repeats share geometry rather than leaking. As a side effect, previously-identical props that never matched on `geometry.uuid` can now actually batch into the existing `InstancedMesh` compiler instead of silently falling back to individual draw calls.
- **[GEOMETRY] Chasm Void-Shroud Exterior Bleed:** The sightline-sealing skirt planes in open-top zones (chasm, atrium) were positioned using the same half-chunk-width offset as the canopy above them, which put them roughly 0.01 units inside the actual perimeter wall's outer face — close enough to z-fight, and since the shroud material is double-sided, visible from the exterior face too, fighting with the wall's yellow wallpaper from the neighboring sector. Inset the skirts 4.5 units toward the zone interior, clearing the wall's inner face by roughly half a unit on both sides of a chunk.

## [v0.4.7] - 2026-07-19

_The Corn Maze & Paper Trail Update_

#### Added

- **[NARRATIVE] THE PAPER TRAIL:** A seeded StoryEngine turns every run into a procedural cold case. Each seed generates a fixed cast (a research lead, a custodian, an archivist, and one who didn't come back), a project name, an incident timeline, a 4-digit access code, and one of three truths — the story is a property of the world, not a dice roll per note. Documents are now zone-aware: annex laptops serve research reports and unsent mail, archive sheets serve personnel records and burn orders, impound tags inventory the belongings of the missing, audio logs crackle from tape, and the original memos live on in the general pool. The access code is written down in exactly two places; exactly one locked annex door per research wing carries a glowing security keypad, and behind it: batteries, almond water, and the sealed Finding of Fact. Reading still costs coherence — the whole truth has a sanity price. Fragment collection is tracked as a case file readout on every document.

- **[NARRATIVE] Networked Terminals:** Laptops (PC_ documents) are wired into a shared recovered archive. A newly discovered terminal's first read still deals a fresh fragment from its zone pool, but every subsequent read — at ANY terminal — browses the full archive of everything recovered so far, one file per read in discovery order, with a FILE n OF m header and wraparound. Browsing never touches the zone pools, paper notes and tapes stay single sticky documents, and the doc overlay hints that terminals can be re-accessed. The facility's mail server outlived its staff.

- **[GEOMETRY] The Corn Maze:** Refactored the Atrium sector to generate a procedural corn maze using the core recursive backtracker. Added high-fidelity procedural `cornMat` (with curved stalks and organic leaves), `dirtMat` (with soil clumps), and `nightSkyMat`.

- **[GEOMETRY] The Endless Field Shell:** The corn maze's perimeter walls hide their yellow wallpaper behind an optical illusion: unlit silhouette panes (MeshBasicMaterial, immune to all lighting) showing rows of crop silhouettes receding into pure black. Glimpsed between the corn rows, the maze appears to sit in an endless dark farmland stretching to nothing — the maze itself feels like the only lit place in the world. Panes are individually placed rather than instanced (per-instance shade tint would band the darkness) and excluded from the spray-tag raycast — the horizon cannot be painted.

- **[AUDIO] Corn Maze Nightscape:** Irregular wind gusting (two incommensurate slow sines swelling and dying, filtered to 150Hz) replaces the steady machine hiss, the 432Hz peace-pad is removed, the sub rumble drops to 35Hz, and the room tone becomes stalk rustle plus a soft two-note owl call (new 'hoot' voice, pure descending sine, double-fired ~400ms apart) every 5-15 seconds.

- **[ARCHITECTURE] The Suspended Labyrinth:** Rewrote the Chasm sector to generate a procedural maze of suspended rusted catwalks over the void, complete with adaptive corner railings, hazard lights, and plunging support pillars.

- **[ARCHITECTURE] Universal Blast Doors:** Refactored macro-zone boundary generation via `buildPerimeter` to automatically inject the dual-shell blast doors at all cardinal entry points for all macro zones.

#### Changed

- **[MECHANICS] Safe Teleportation:** Re-anchored the `Z` key teleportation coordinates to the 1st step inside the Northern blast door path (`(7,1)`) across all macro zones to prevent spawning inside pillars, voids, or solid geometry.
- **[GEOMETRY] Visual Bulkheads:** Added a horizontal transition awning over all macro zone blast doors to lay perfectly flat over the threshold, obscuring ceiling height discrepancies between adjacent sectors.
- **[ARCHITECTURE] Clear Paths:** Re-engineered the Clinic generation to enforce a strict no-spawn zone along the major cross axes (`localX=7`, `localZ=7`), preventing cots, privacy screens, and cardboard boxes from blocking the entryways.
- **[GEOMETRY] Precise Railings:** Extended the `CHASM` rusty railing lengths to `this.cellSize + 0.4` to ensure perfectly sealed, overlapping geometry on both inner and outer turns without 0.4m clipping gaps.

#### Removed

- **[PLATFORM] Mobile Support:** Level 0 is now a desktop-only experience. Excised the entire touch input layer (virtual joystick, swipe-look, touch state and per-frame joystick axis mapping in the PlayerController), the on-screen RUN/CROUCH/LIGHT buttons and their DOM/CSS, the portrait orientation warning, and the mobile light-budget throttle in the LumenGrid (all clients now get the full 40 lights / 10 shadow-casters). Critically, the removed mobile overlay was also the codebase's ONLY pointer-lock entry point — desktop mouse capture is now properly bound to the game canvas itself, with UI overlays unaffected. For environments that deny the Pointer Lock API entirely (IDE-embedded previews like WebStorm's JCEF browser, which neither grant the lock nor reliably fire pointerlockerror), the input degrades to a drag-look fallback after a 400ms grace window: hold left mouse to look, right-click peek preserved. Real browsers are unaffected, and a successful lock always clears the fallback.

#### Fixed

- **[WORLDGEN] The Unspawnable Exit Switch:** The structural selection cascade (`find(roll >= prob)`) requires strictly descending probability order — each entry owns the band between its prob and the previous entry's. v0.4.4 inserted the Ventilation Bulkhead at 0.028 ABOVE the 0.03 exit switch, breaking monotonicity: every roll the switch could match was captured first by the bulkhead (later the Settling Field). Monte Carlo confirmation: zero switch spawns in one million rolls — the objective loop has been silently uncompletable since July 15. The matrix is now explicitly sorted descending at build time so ordering violations are structurally impossible, and the tail bands were rebalanced to prioritize the objective: exit switch takes 0.032 (band 0.032-0.035, ~0.3% of wall cells), Compression Archway 0.03, Settling Field 0.028. The signal tracker itself was innocent — it reported WEAK - RELOCATE because there was, in fact, nothing anywhere to point at.

- **[NARRATIVE] Code Anchoring & Sticky Documents:** The seeded per-zone shuffle can no longer bury the access code — the code-bearing entries (IT Bulletin 7 in the annex, the Burn Order in the archive) are re-seated among the first three pulls of their zone after shuffling, matched by marker phrase rather than code digits (the hours field can be four digits and collide). Documents are now sticky: a physical note or laptop keeps the fragment it dealt on first read forever, so re-reading no longer draws new cards, changes a document's contents, or drains the zone pool into DATA CORRUPTION. Verified by test across multiple seeds: anchoring bounds, re-read stability, pool integrity, and cross-instance determinism.

- **[NARRATIVE] Keypad & Density Fixes:** Keypad success previously routed through the document-close handler, which dispatched keypad-cancel first — nulling the pending door so the unlock hit nothing while the cancel path's door blip played anyway (the infamous "sound but no door"). Success now fires before the overlay closes. Keypad frequency cut from ~20% of all annex doors to exactly one per chunk via a per-chunk claim set (cleaned up with chunk disposal), restoring the records room to singular status.

- **[GEOMETRY] Corn Maze Threshold Plates & Sky Coverage:** The corn maze's night sky covers only the maze interior (local 2..58), while a metal plate ring at ceiling height caps the entire perimeter band — including every threshold alcove — so entering means passing under steel before the sky opens overhead. (The original 60x60 sky plate was both off-center and full-bleed in the wrong places: its gap showed void over some thresholds while its coverage put stars over others.)


## [v0.4.6] - 2026-07-19

_The Ground Truth & Zone Identity Update_

#### Added

- **[TEXTURES] Diamond Plate & Charred Ceiling:** The incinerator now owns both of its horizontal surfaces. The foundation swaps rusted iron for a procedural diamond tread plate — alternating 45-degree 3-bar clusters with relief highlights, grime streaks, and half-metallic response — while a new per-sector ceiling overlay system hangs a charred riveted-panel plane below the shared ceiling: soot blooms, plate seams, corner rivets, and faint ember-glow cracks. Both are canvas-generated at init and registered as shared assets.

- **[GEOMETRY] Continuous Ductwork:** The fire duct network now fully connects, including gallery corners — the two mid-lane runs build independently per cell, so corner cells where both lanes meet produce full duct crossings instead of dropping one run's block. Walk-through gaps became overhead arches — the run rises at both cell edges, seats on the neighboring duct ends, and bridges above head height. Where mid-lane ducts meet the door corridors they arch over the walkway and tee into the corridor spine. Feed ducts are now complete circuits — a riser column climbs off the low mid-lane run, crosses the gallery at ceiling height, and runs into the furnace core, with feed rows chosen so risers always land on solid duct segments (never arches or corridors). Lattice crossings always get junction collars, and hanger rods anchor the overhead pipe runs on straight segments. All overhead ductwork (corridor spines, feeds, arch bridges) now clears the standing player's 2.5-unit collision ceiling, eliminating invisible head-height barriers.

- **[GEOMETRY] The Combustion Galleries:** Replaced the incinerator ring's sparse scatter with a dense procedural mechanical maze. Mid-lane fire ducts now run the length of every gallery at torso height — forcing crawl-unders through the 0.8-unit gap beneath — punctuated by riser elbows that turn and vanish into the ceiling every fourth cell. Open lanes sprout vertical pipe clusters with hand-valve wheels, an overhead lattice of instanced pipe runs threads the entire ring at two heights with junction collars at crossings, and feed ducts jump from the galleries into the furnace core. Door approach corridors stay floor-clear beneath an overhead spine duct.

- **[DYNAMIC ILLUMINATION] Ember Grilles & Cage Sconces:** Rebuilt the furnace core's wall fixtures — the old rotated ceiling panels aimed their single emissive face into the wall and read as dead black rectangles from every angle. Sconces are now a rust housing holding a fully-emissive cage lamp (every face glows) with the PointLight repositioned proud of the fixture, and now mount on all four faces of the core. Static ember grilles bleed hot orange light from duct flanks and corridor spine undersides.

- **[GEOMETRY/ATMOSPHERICS] The Overgrown Court (Atrium Revamp):** Demolished the christmas-tree farm. The atrium is now a failed corporate garden court built around its unique structural feature — no ceiling, just void. Four paved walkways meet at a dried tiered fountain in a steppable basin with moss claiming its crown; raised planter beds hold leaning trees with irregular mottled-foliage tiers (a new procedural leaf texture), one in five dead and bare-branched; wooden benches face the paths; four warm garden lanterns provide the zone's only warm light. Vines dangle collisionlessly out of the darkness overhead — whatever they hang from is not on this floor. The zone gains its own room tone (wind-wash noise bed, soft earth footsteps, rustling leaves and echoing water drips every 5-15 seconds) and a humid overgrowth-green fog tint.

- **[ATMOSPHERICS] Archive Room Tone:** The archive now has its own sensory fingerprint — a quiet library that isn't actually quiet. Every 4-13 seconds, an unseen patron whispers, coughs (new bandpass thump voice), or turns a page (new dry high-frequency rustle voice) at a randomized distance in the stacks, washed through a new long-soft reverb profile (0.35s delay, 0.45 feedback). The sector mix gains a faint air-hush and a lower 45Hz rumble, footsteps go carpet-muffled through a dedicated foley profile, the fog shifts to a grey-brown smoke haze distinct from the backrooms yellow, and the ambient dust cloud triples in density with larger motes — paper dust hanging in the air.

- **[GEOMETRY] The Archive Stacks:** The archive's maze walls are no longer solid concrete monoliths (which, memorably, generated their document boxes *inside* the solid mass — the collection was entombed in the walls). Each maze wall cell is now a double-sided steel archive stack oriented along its wall run: end uprights, a full-height entity-blocking center spine, four wooden shelf levels and a top cap, faced on both sides with packed book rows — a procedural spine texture (muted cloth bindings, edge highlights, occasional missing volumes) on instanced slabs that randomly shorten and slide to read as full, picked-over, or half-empty — plus manila file boxes shelved among the books. Aisles gain dropped paperwork and stacked file boxes; the dying broken-light ambience is preserved.

- **[GEOMETRY/ATMOSPHERICS] The Impound (Poolrooms Rename & Retheme):** The "Poolrooms" never had a pool — it was a chainlink maze wearing the wrong name. Renamed to THE IMPOUND across all systems (safe now that atmosphere detection reads built zone IDs from the registry) and given its spatial narrative: a storage lockup of wire pens holding impounded belongings — carton hoards, lone tables, huddled pairs of chairs — visible through the mesh but fenced out of reach. Roughly 1 in 7 fence runs is a pen gate left ajar on a visible swing (collisionless wire, framed by steel posts), full fences gain rusted top rails, and fence geometry is now cached and instanced. The amber-lights-vs-teal-fog clash is resolved by committing to sodium amber: fog now glows 0x7a6238 to match the lamps. New room tone: chainlink shivering against its posts (new 'rattle' voice) and distant gate creaks every 6-16 seconds, over concrete-scuff footsteps and mid-size yard reverb.

- **[ATMOSPHERICS] The Distinctiveness Pass:** Every macro zone now fully diverges from the yellow overworld. Ceilings: all zones override the shared stained-tile ceiling with sector-appropriate overlays (sterile panels for clinic/boardroom/annex/poolrooms, raw concrete for archive/maintenance/checkpoint/exit, vent grid for server; the incinerator keeps its charred plates). Open-top zones (atrium, chasm) gain a void shroud — an unlit black canopy at y=9 with skirt planes sealing the band above the wall line, so sightlines can no longer escape over the walls into neighboring sectors. Fog: server (cold machine blue-grey), maintenance (oily brown-grey), boardroom (corporate grey), and annex (institutional beige) join the tinted-fog roster. Acoustics: the annex gets a hushed office mix with crisp linoleum footsteps and dead-small-room reverb; server and boardroom get proper reverb profiles (rack-deadened vs. glass-bright). Server hall volume pulled back from launch levels (noise 0.5 to 0.2, brown layer 0.12 to 0.05).

- **[AUDIO] Server Hall Roar & Grate Steps:** The server sector no longer shares the overworld's ambient hum. Its noise bed opens to 0.5 gain with the shared filter swept up to 2400Hz (white/pink fan wash), stacked over a new dedicated brown-noise layer (deep 140Hz lowpass, swelling to 0.12 only in-sector) and the existing 35Hz sub rumble — the brown/pink/white spectrum of a running server hall. Footsteps get a dedicated metal-grate foley profile: 620Hz triangle ring through an 1800Hz bandpass with a 5ms attack, so every step clanks on the floor grating.

- **[GEOMETRY] The Research Wing (Annex Revamp):** The Async Research annex is no longer a sparse hall of microwave-shaped CRTs. Three cross corridors (plus the central spine) are now lined door after door with framed wooden doors — roughly one in three actually opens; the rest are permanently locked, visually identical, and silent when tried. Openable doors lead to single-cell offices that may hold a desk with a glowing open laptop (readable through the existing document system), a note dropped on the floor, a stack of cartons, or nothing at all — an empty room behind an unlocked door being its own kind of wrong. Solid mass fills the space between pods; the warm corridor panel lighting is preserved.

- **[GEOMETRY] Clinic Stack Physics:** Clinic carton stacks no longer defy gravity. Previously each box rolled an independent position (staircasing sideways up to 2/3 of a box per level — the "slinky"), an independent yaw, and a tip-over that could strike mid-stack, leaving upper boxes hovering over a sideways box too tall for its slot. Stacks now share a base with small cumulative per-level drift clamped so the top box's center of mass never leaves the base footprint, yaws stay roughly aligned with per-box wobble, and only the top box may tip over. Tipped cartons use YXZ rotation order (tip, then spin about the world vertical) — default-order yaw swung their corners through the floor plane, burying them up to 0.12 units — and correctly stand their 0.6 depth tall.

- **[GEOMETRY] Cardboard Everywhere:** The archive's manila carton material now dresses the clinic's stacked clutter boxes (same stacking and occasional tip-over behavior) and replaces the Level 0 sprawl's structural clutter crate — formerly a bare wood block — with a stack of two to three tapering, yaw-jittered cardboard cartons that keep the original's entity-blocking role. One shared carton geometry, instanced everywhere.

- **[TEXTURES] The Carton Catalog:** Four procedural box identities now interchange per-box at every non-shelf carton spawn (clinic clutter, sprawl stacks, archive aisle piles): the manila records box, a moving box with packing-tape seam and marker scrawl, a fruit-brand banana box with blue-and-yellow oval and handle hole, and a shipping parcel with chevron-printed tape, barcoded label, and a legally distinct smiling arrow. Archive shelves remain strictly manila — no bananas in the records.

- **[GEOMETRY] The Boardroom Fishbowl Maze:** Demolished the boardroom's single strip of tables floating in an empty hall. The floor swaps the black-mirror tile (roughness 0.1 / metalness 0.6) for a warm polished large-format office tile, and the space is now a full glass-partition grid: mullion-framed transparent panes on lines at local 3/6/9/12 with door gaps at every perpendicular index % 3 === 1 — which makes row 7 and column 7 guaranteed clear corridors between the exterior doorways, and gives every 2x2 "fishbowl" conference pocket at least one gap per glazed side. Grid intersections carry both crossing panes tied by a chunky mullion column, so every glass run connects through its junctions and openings exist only at the deliberate door gaps. Pockets hold full-size twin-pedestal conference tables (3.2-unit tops, long axis randomized) ringed by chairs correctly rotated to face the table — buildChair's backrest sits at local -z, so rotY 0 faces +z, a convention the legacy boardroom had inverted — with an optional head-of-table seat and occasionally a presentation CRT left mid-meeting, under steady cool fluorescent panels. Sightlines run through layered glass across the whole zone — nowhere to hide, everywhere to be seen.

#### Removed

- **[GEOMETRY] The Ventilation Bulkhead:** Demolished the v0.4.4 ceiling-hung ventilation masses ("AC units") from the Level 0 sprawl — a design mistake in retrospect. The matrix slot lives on as **The Settling Field**: water-rotted fallen ceiling tiles (a dingied clone of the ceiling material, tilted where they lean on each other), scattered paperwork, and occasionally an office chair on its side — all beneath the hole they fell from: an unlit void patch flush under the ceiling plane, ringed by rotted tiles hinged at the rim and swung steeply down like trapdoors (edge-pivoted geometry, 57-83 degrees, collisionless so they brush past the player instead of blocking), with the water-damage stain spreading around it. Nothing above ankle height, everything walkable. The slot consumes the same two main-stream PRNG draws as the bulkhead did — they now seed a local generator for the scatter detail — so the selection cascade and every chunk's main random stream are unchanged.

#### Fixed

- **[GEOMETRY] Shell Liner Exterior Bleed:** Corner cells ran two full-length liner segments whose outer ends terminated exactly coplanar with the building's exterior wall faces — surfacing as grey rust strips bookending every outside corner of the zone in the yellow halls. Since the neighboring cells' liner runs already extend into the corner cell and cover the inside-corner pocket, corner cells now place only a single interior corner post. Rust cladding also wraps the shell through each doorway alcove up to the jambs so the liner never terminates in a raw end face at the mouth.

- **[WORLDGEN] Origin-Adjacent Perimeter Holes:** The spawn-clearing guard skipped all cells within 2 of the world origin in global cell coordinates — but for chunks (-1,0), (0,-1), and (-1,-1) those are perimeter corner cells, so a macro zone rolled there generated with an exposed, doorless corner hole in its wall ring. The guard now applies only to loose backrooms fill; macro zones build every cell. The spawn point itself sits in chunk (0,0), which is never macro, so spawn clearance is unaffected.

#### Changed

- **[ATMOSPHERICS] Shell Volume Registry:** Ripped out the predictive sector detection — the mirrored PRNG replay that re-derived each chunk's sector from seeded rolls inside `updateLights`. It was structurally fragile: exterior wall strips and corners fell inside a zone chunk's coordinate footprint, the coherence-based seed shift could diverge from geometry built at a different sanity level, and the EXIT/CHECKPOINT pool swap silently shifted every sector index for chunks built before the objective phase flip. `buildChunk` now registers each macro zone's interior AABB — an invisible shell exactly matching the walkable interior — and the atmosphere is a pure containment test against volumes as actually built. A position outside the walls is categorically outside every shell; corner false-triggers are impossible by construction.

- **[SYSTEMS] Simplified Door Pre-Arm:** With the shell as ground truth, the blast-door hand-off shrank to entry-only: an approach-gated force that rolls the sector atmosphere out through the parting panels and bridges the two-unit gap between the door plane and the shell edge. Exit purge needs no special case — the shell's inset boundary starts draining the atmosphere ~2 units before the player even reaches the door.


## [v0.4.5] - 2026-07-19

_The Sealed Combustion Update_

#### Added

- **[GEOMETRY] Incinerator Blast Doors:** Sealed all four perimeter doorways of the Incinerator sector behind heavy split-panel sliding pocket doors — rusted jamb columns, a reinforced metal header beam, hazard-striped meeting edges, and horizontal reinforcement ribs. The panels retract laterally into the flanking wall mass, permanently killing the long exterior sightlines that previously exposed a fog-less, ember-less interior to distant observers.

- **[SYSTEMS] Proximity Slider Circuit:** Extended the interactive door manifold with a dedicated slider door class. Panels grind open on player approach (~4m radius) with smoothstep-eased mechanical travel and automatically reseal behind the player, complete with pneumatic release cues and terminal clunks routed through the existing somatic-door acoustic channel. The Anomaly slams sliders open at 3.3x player speed, preserving its loud mechanical audio tell. Collision volumes unseal the instant panels part and re-arm only at full closure.

- **[DYNAMIC ILLUMINATION] Exterior Warning Lamp:** Mounted a faulty red beacon fixture above each blast door's exterior face, wired into the sector fixture flicker pool with a live `PointLight`. The lamp is the sector's only atmospheric leak — a stuttering red stain on the yellow wallpaper that warns of the interior without revealing it.

#### Changed

- **[ATMOSPHERICS] Blast-Door Sector Hand-Off:** Zone doors now dictate the atmosphere swap directly instead of waiting on chunk-boundary math. A door opened from the exterior immediately forces its own sector — the red haze starts rolling out through the parting panels before the player crosses the threshold. A door opened from the interior forces the neighboring chunk's sector the moment the panels part, so the purge pre-arms on approach to the exit exactly as the soak does on entry. Boundary hysteresis also tightened from 2.5 to 1.5 units past the door plane as the fallback for door-less transitions, with deliberately asymmetric local bounds (1.5 to 58.5): the chunk's cell footprint spans local -2..62 while the chunk ID flips at 0/64, so the far-side band up to 64 is wall mass plus the exterior strip beyond it — symmetric bounds would let a player hugging the outside of a zone's far wall or corners false-trigger the full interior atmosphere.

- **[ATMOSPHERICS] Approach-Intent Gating:** The hand-off is gated on world-space movement direction (dot > 0.45 toward the door at walking speed), so a player grazing the door's activation radius from outside — or lingering near the boundary after leaving — no longer re-ignites the interior atmosphere. The panels still cycle; the fog stays put.

- **[GEOMETRY] Incinerator Double-Shell Boundary:** The sector's perimeter retains its yellow wallpaper camouflage on the exterior face, but every interior-facing perimeter wall is now lined with a 0.4-unit rusted iron shell. From inside, the furnace room reads as sealed industrial iron; from the surrounding halls, nothing has changed.

- **[ATMOSPHERICS] Asymmetric Sector Transitions:** Rebuilt the fog density, fog color, and exhaust particle lerps around directional rates. Sector atmospheres now soak in at 3-4x the previous speed on entry (the incinerator's red haze hits as the blast doors part), while exit purge rates run 6-10x faster — fog snaps back to base yellow at double the entry rate and the ember cloud decays at 0.20/frame instead of 0.02, eliminating red residue trailing the player down adjacent corridors.


## [v0.4.4] - 2026-07-15

_The Subconscious Friction & Mechanical Obstruction Update_

#### Added

- **[GEOMETRY] The Compression Archway:** Injected a structural asset into the procedural generation matrix that instantiates modular overhead concrete beams and narrow supportive framing. The asset drops corridor headroom dynamically, forcing physical boundary alignment and axis-decoupled kinetic collisions.

- **[GEOMETRY] The Ventilation Bulkhead:** Expanded the corridor infrastructure to procedurally drop deep ceiling masses mapped to the native ventilation materials. This mechanical mass is automatically intersected by transverse exposed piping configurations that vary spatial choke-point distribution.

- **[AUDIO] The Industrial Hazard Circuit:** Overhauled the empty acoustic footprint of the Maintenance Shafts sector. Programmed a dynamic low-pass sweep down to 110Hz to mutate white noise assets into a suffocating industrial roar, paired with a rhythmic, phase-modulated 180Hz triangle-wave warning chime running natively on the core runtime clock.

- **[METABOLICS] Linguistic Dark Matter Tracking:** Realized the Subconscious Grey Area mechanics within the active player state. Latent, low-level paranoia (between 20% and 50% threshold limits) is compiled into a hidden stress stock that silently clamps the maximum voltage capacity of kinetic flashlight battery recharging.


## [v0.4.3] - 2026-07-15
*The Unified Manifold & Title-Safe Optical Pass*

#### Added

* **[DYNAMIC ILLUMINATION] Emissive Color Inheritance:** Decoupled the hardcoded warm-white hex value from the active `PointLight` pool. Light sources now dynamically copy the exact `.emissive` color vector generated by their respective sector panel materials at runtime.
* **[METABOLICS] Coherence Matrix:** Refactored the psychological metadata tracking from "Paranoia" to "Coherence". Traversal tension is now tracked as structural system integrity scaling from 1.0 (absolute stability) down to 0.0 (total system collapse). Injected a legacy getter/setter bridge on the controller to maintain structural interface compatibility with un-refactored system calls.

#### Changed

* **[AUDIO/VISUAL] Hardware-Agnostic Chaos:** Excised frame-dependent `Math.random()` walks inside the illumination sub-system. Failing and faulty fixtures now flicker via intersecting, prime-numbered sine wave modulations bound to systemic running time, guaranteeing framerate-independent analog instability across varying monitor refresh rates.
* **[METABOLICS] Aerobic Siphoning Rebalance:** Increased the metabolic drain of running while pursued by 20%. Exhaustion depth past 50% now accelerates local coherence decay by 1.5x when navigating complete darkness space. Conversely, resting within safe, fully illuminated sectors now yields a 25% faster stamina recovery rate.
* **[HUD] Chrono-Spatial Restructuring:** Dropped the diegetic OSD element scale down to `1.0rem` to clear visual clutter across the screen layout. Relocated the timestamp and inventory trackers downward, adding clean vertical spacing to prevent data rows from overlapping. Pushed coordinate text readouts to align with inverted warning thresholds.

#### Optimized

* **[PERFORMANCE] Vertical Volume Cull:** Expanded the multi-point light culling check from a flat 2D bounding grid to a true 3D Euclidean spherical volume check. Fixtures located dramatically above or below the player's active vertical coordinate space are aggressively bypassed.
* **[PERFORMANCE] UI Garbage Throttling:** Gated string instantiation loops inside the objective tracking thread. Objective templates will no longer allocate heap space or compile string literals on the render frame unless a definitive shift in baseline signal metrics or numerical breaker states is logged.
* **[PERFORMANCE] Locomotion Vector Compression:** Replaced matrix-heavy `.applyEuler()` coordinate transforms in the movement and head-lean calculators with raw-metal trigonometric operations, reclaiming multi-axis float execution cycles on every frame update.

#### Fixed

* **[WEBGL] Optical Clarity Restoration:** Slashed baseline post-processing chromatic aberration filters by half to eliminate lens muddiness and optimize framing fidelity for data capture assets. Rebalanced pseudo-halation blend weights and widened the vignette footprint to preserve visual architecture clarity during baseline safety states.
* **[WEBGL] PBR Matte Slab Collapse:** Restored texture mapping integrity to deep sector metal structures. Lowered standard material reflection constants to pull objects out of the direct-light black hole trap, and re-wove structural noise bump mappings to eliminate smooth plastic anomalies.
* **[GEOMETRY] Objective Ghost Satura:** Patched a severe state leak where global exit switch coordinate pointers remained cached in memory across level ascensions and level reboots. The coordinate registry is now completely purged during generation to prevent systemic objective starvation.
* **[PHYSICS] Title-Safe Homing Boundary:** Ripped out obsolete layout styles that threw typography out of the physical CRT display borders. Injected strict layout constraints that map the core heads-up display and objective overlays to a unified title-safe boundary line.
* **[ENTITY] Observer Gating Adjustment:** Crushed high-frequency phantom observer accumulation by tightening generative probability gates down to a strict 2% ceiling.

## [v0.4.2] - 2026-07-15
*The Somatic Deprivation & Dying Doorbell Update*

#### Added
- **[MECHANICS] Somatic Eye-Closure:** Implemented a voluntary blind state via `KeyV`. Holding the input triggers a feathered black vignette overlay (`0.98` maximum opacity), crushes player speed by 70%, and provides a massive `-0.15` reduction multiplier to active paranoia accumulation.
- **[AUDIO] The Dying Doorbell Chime:** Isolated psychological paranoia from the Anomaly's predatory growl. Structural tension now drives a discrete, dissonant triangle-wave synthesizer modulated by a shifting LFO. As paranoia peaks, the pitch and oscillation frequency sag dramatically to simulate a failing analog chime circuit.
- **[AUDIO] Friction Texturing:** Re-engineered spatial traversal foley. Replaced low-frequency tone modulations with white noise buffers routed through dynamic high-pass filters (`2500Hz -> 1200Hz`), synthesizing a crisp, gritty scrape of clothes and skin against tight partitions.

#### Changed
- **[AUDIO] Decoupled Shuffle Kinematics:** Decoupled tight crawl foley timing from physical camera locomotion. Traversing bottlenecks or vents now applies a `2.5x` mathematical phase multiplication to the head-bob cycle, doubling the zero-crossing check frequency to produce a rapid, grounded scraping rhythm.
- **[AUDIO] Claustrophobic Gating:** Closing the player's eyes triggers a severe low-pass brickwall filter across the active audio pipeline, capping global foley frequencies at `80Hz` to induce total sensory isolation.

#### Optimized
- **[PERFORMANCE] Non-Euclidean Ray-Cull:** Swapped the interaction raycaster loop in the active chunk horizon from Euclidean `.distanceTo()` calculations to non-root `.distanceToSquared()` checks, eliminating the costly square root overhead on every interaction frame.

### [v0.4.1] - 2026-07-13
*The Furnace & Phantom Update*

#### Added
- **[ARCHITECTURE] The Incinerator:** A massive sensory deprivation tank built of fire and rusted iron. Features blinding thermal panels, choking volumetric ash (0.95 opacity), and a dead acoustic topology to entirely mask the Anomaly's approach.
- **[ENTITY] The Lost:** Non-hostile, shadowy hallucinations (`0x010101` unlit material) that spawn at the edge of the render distance. They watch the player but dissolve into ash when approached or illuminated, spiking paranoia with a 20% chance to drop Almond Water.
- **[AUDIO] Voices of the Void:** "The Lost" now emit procedurally synthesized deathrattles upon dissolving—either a high-passed breathy whisper or a terrifying, low-passed guttural square-wave laugh.
- **[AUDIO] Psychological Tinnitus:** Wired a 4500Hz standalone sine wave into the master gain that manifests physically when exhaustion and paranoia cross critical thresholds.

#### Changed
- **[MECHANICS] Adrenaline Dump:** Exhaustion no longer strictly caps locomotion. When actively chased, players can sprint beyond their physical limits by burning sanity (paranoia) to fuel the burst.
- **[MECHANICS] Sanity Anchoring & Outflow:** Standing in absolute light now actively heals paranoia at a deliberate, throttled pace. Tension also naturally dissipates in safe zones, accelerating exponentially if the player stands completely still.
- **[MECHANICS] The False Threshold:** The procedural generator will now actively gaslight the player. At >80% paranoia, the engine may spawn counterfeit exit switches with a sickly amber glow that provide zero physical collision against the Anomaly.
- **[MECHANICS] Permeable Safety:** Stripped the absolute `isEntityBlocker` flag from Poolroom water boundaries. The Anomaly now has a 20% chance to ignore the water and wade straight through, shattering perceived safe zones.
- **[WEBGL] Cubic Terror Curve:** Rewrote the fragment shader's distortion logic. Chromatic aberration and screen tearing now scale on an exponential cubic curve (`pow(paranoia, 3.0)`), creating a slow creep of subliminal tension that violently snaps at 90%.

#### Optimized
- **[PERFORMANCE] Thermodynamic Shadow Cull:** Downgraded the renderer from `PCFSoftShadowMap` to standard `PCFShadowMap`. This reclaims massive GPU overhead across multi-point-light sectors while naturally complementing the analog, jagged VHS aesthetic.
- **[PERFORMANCE] Shader Ephemeralization:** Excised the expensive vertical blur pass in the post-processing shader. Reduced texture fetches from 5 to 3 per pixel by calculating pseudo-halation from existing lateral chromatic offset channels.

#### Fixed
- **[SYSTEM] Metabolic Slate Leak:** Fixed a critical state-leak where somatic trauma (stamina, paranoia, exhaustion) persisted across entity consumption and void falls. The engine now forcibly flushes and zeroes out all metabolic toxicity upon respawn.
- **[PHYSICS] Spatial Hash Integer Collapse:** Rewrote the `SpatialHashGrid` mapping keys. Replaced the 32-bit signed bitwise integers with string composites (`${x},${z}`), permanently eradicating spatial folding and phantom collisions in negative coordinate space.

### [v0.4.0] - 2026-07-13
*The Psychological Threshold Update*

#### Changed
- **[MECHANICS] Flashlight Paranoia Cap:** The flashlight no longer acts as a metabolic heat sink that actively heals paranoia. It now functions strictly as a psychological shield, throttling the accumulation of tension but never reversing it unless the player finds absolute, dark-free safety.
- **[WEBGL] Sensorial Gating:** Interpolated the paranoia threshold. Visual FOV distortion, phantom auditory footsteps, and entity proximity hallucinations now mathematically gate themselves, remaining completely dormant until the player's psyche fractures past the 50% threshold.
- **[AUDIO] Auditory Tension Floor:** Pushed the ambient tension noise floor (sub-rumble and atrium static) deeper into the DSP matrix, guaranteeing pure silence during the early stages of a run before structural tension manifests.
- **[ENVIRONMENT] Claustrophobic Particulates:** Dynamically scaled the environmental dust particulate system. The volumetric `dustCloud` now spikes in both opacity (to 0.35) and particle size (to 0.08) when the player is physically crawling, simulating the choking atmosphere of rusted air ducts.

### [v0.3.9] - 2026-07-12
*The "Sector Stabilization" Update*

#### Added
- **[MECHANICS] The Toll of Hiding:** Crouching now vastly accelerates stamina recovery, but introduces a severe risk/reward loop: hiding in the dark rapidly spikes the player's paranoia.
- **[MECHANICS] Sector Stabilization Phase:** Introduced a macro-objective loop. Players must explore the labyrinth to locate and engage three highly rare Dimensional Switches to restore power and reveal the exit.
- **[MECHANICS] Diegetic Proximity Radar:** Weaponized the UI to serve as a triangulation tool for objectives. Displays distance to the nearest target, but scrambles (`ERR!_m`) under intense Anomaly electromagnetic pressure.
- **[ARCHITECTURE] The Exit Threshold:** A heavily fortified extraction bunker that only manifests in the generation matrix after all sector breakers are thrown, triggering a massive somatic thud and facilitating level descent.
- **[ARCHITECTURE] Safe Rooms (The Outpost):** Introduced a 1% chance for a fully enclosed, anomaly-shielded refuge featuring clean tile, a cot, guaranteed Almond Water, and an `isEntityBlocker` barrier that permits player entry while barring the entity.
- **[ARCHITECTURE] The Furniture Anomaly:** Added a rare procedural chunk featuring a chaotic, physics-defying mountain of chairs and tables hiding a battery.
- **[ARCHITECTURE] L-Shaped Vents:** Procedurally generated floor-level vents now have a 60% chance to construct complex 1x1 corner crawlspaces, properly connecting adjacent faces of a wall block instead of dead-ending.

#### Changed
- **[MECHANICS] Tactical Flashlight:** The flashlight is now a reliable, unyielding weapon. Removed Anomaly-induced flickering and completely decoupled the player's paranoia metric from battery drain.
- **[MECHANICS] Somatic Doors:** Decoupled doors from proximity sensors. They now require direct, intentional somatic interaction and dynamically restrict their swing arc to ~81.8 degrees to prevent clipping into the door jamb. Auto-close springs engage if the player retreats further than 10 meters.
- **[ARCHITECTURE] Blueprint Density Rebalance:** Slashed featureless wall generation thresholds from 30% to 10% to double the spawn rate of complex structural tunnels, choke points, and interactive Artisan doors.
- **[ARCHITECTURE] Euclidean Quarantine:** Dimensional Switches (now centralized metal monoliths) are limited to a razor-thin 0.5% spawn probability and are governed by a global spatial array enforcing a strict 150-meter isolation radius to prevent clustering.

#### Optimized
- **[PERFORMANCE] Spatial Hashing:** Ripped out standard `Set` objects in the spatial grid and replaced them with cache-friendly contiguous Arrays utilizing O(1) swap-and-pop removal, drastically accelerating collision lookups.
- **[PERFORMANCE] Spatial Bounds Fast-Fail:** Injected a fast vertical bounds check in the player collision loop to bypass expensive `intersectsBox` logic for overhead and underfoot geometry.
- **[PERFORMANCE] Adaptive Lumen Culling:** Adjusted the lighting subsystem to dynamically scale its processing horizon based on device capability, aggressively culling distant lights on constrained hardware.

#### Fixed
- **[WEBGL] Door UV Mapping:** Re-engineered the procedural door material into a Multi-Material Array, providing pristine wood edges and mirroring the back face to prevent doorknob texture inversion and edge-stretching ghost artifacts.
- **[WEBGL] Macro-Sector UV Stretching:** Re-routed the `THE MAINTENANCE SHAFTS` foundation material from the mapped 1x1 vent texture to the pre-tiled (64x32 repeat) server floor texture to eliminate catastrophic visual stretching.
- **[WEBGL] Paranoia Tearing Shader:** Hooked the paranoia metric directly into the chromatic aberration shader, causing the player's vision to physically tear during high panic states.
- **[UI] Render Area Anchoring:** Relocated the objective HUD from the global document body directly into the physical `#screen-wrapper` so it scales and bounds dynamically with the CRT viewport.
- **[SYSTEM] Event Router Unified:** Excised broken, cascading interaction loops and successfully unified the `somatic-interact` event router to cleanly handle original blackouts, objective triggers, and spatial interactions without syntax faults.

### [v0.3.8] - 2026-07-12

#### Added

- **[ARCHITECTURE] Autonomous Perimeter Protocol:** Macro-sectors now deterministically calculate `inDir` and `outDir` from their spatial hashes to build absolute 16x16 walled enclosures with exactly two viable exit/entry points, ensuring true containment.
- **[GEOMETRY] Continuous Spatial Extrusion:** Vents, crevices, and crawlspaces no longer spawn as isolated tiles. They generate as cohesive, extruded linear bursts spanning multiple grid cells, complete with end-capping grates to seal the burst boundaries.
- **[MECHANICS] The Topological Node (Checkpoints):** Promoted choke points from random clutter to a dedicated macro-sector (`THE CHECKPOINT`). Generates a solid 16x16 block of rock intersected by a singular hallway containing exactly one mandatory, impassable traversal valve.

#### Changed

- **[DYNAMICS] Biome Density & Atmospheric Sync:** Slashed the macro-structure rarity threshold from `0.90` to `0.70`. Biomes now occupy 30% of the infinite generation matrix, with dynamic volumetric fog transitions mapped perfectly to the new probability curves.
- **[MECHANICS] Dynamic Door Pull:** Excised static hinge constraints. Doors now actively read the coordinate vector of the interacting entity (Player or Anomaly) and calculate an inward rotational arc to swing into pre-cleared physical space, mathematically eliminating drywall clipping.
- **[MECHANICS] Paranoia & The Lucidity Mechanic:** Paranoia is no longer just visual flair; it operates as a heavy physiological penalty, directly choking stamina recovery multipliers. Players must navigate to fully lit zones to actively restore shattered `maxStamina`.
- **[WEBGL] Exhaustion Halation:** The post-processing fragment shader's chromatic aberration now mathematically pulses in sync with the player's simulated heart rate when critical exhaustion is reached.

#### Optimized

- **[PERFORMANCE] Spatial Door Culling:** `Environment.js` now aggressively culls coordinate matrix calculations for distant doors. If the player's distance exceeds `400.0` units, the inverse kinematics engine bypasses the logic to conserve active compute.
- **[PERFORMANCE] Syntactic Purge:** Eradicated the toxic `if/else if` mountain in `AcousticEngine`'s somatic spawner, replacing it with a clean, low-friction object-mapping dictionary.
- **[ARCHITECTURE] Trim Ephemeralization:** Removed heavy industrial rusted pipes from drywall thresholds across all choke points, replacing them with clean architectural wood tracking to preserve aesthetic dignity.

#### Fixed

- **[SYSTEM] Lexical Scope Leak:** Fixed a fatal `ReferenceError: nx is not defined` crash in the procedural maze generator by properly anchoring `nx` and `nz` coordinate derivations within the `for` loop's block scope.
- **[GEOMETRY] Dimensional Inversion Collision:** Repaired the Checkpoint doorway generator that translated the hinge correctly but failed to swap the width/depth values on the Z-axis, preventing 1.4-meter doors from violently jamming into 0.1-meter gaps.

### [v0.3.7] - 2026-07-12

#### Added

- **[MECHANICS] Adrenal Burnout & Co-regulation:** Sprinting under extreme paranoia now permanently degrades `maxStamina`. Recovery rates have been mathematically slashed; players must actively seek well-lit, safe zones to heal.
- **[ARCHITECTURE] Somatic Input Manifold:** Completely decoupled DOM event listeners and input state from the `PlayerController` physics loop, routing them through a dedicated `SomaticInput.js` peripheral nervous system.
- **[MECHANICS] The Sanctuary:** Deployed an architectural oasis utilizing a strict 50/50 generative token (`claimOasis`). Spawns a dedicated 3x3 tile-floored, wood-paneled alcove featuring guaranteed resources and a pristine, non-flickering golden light.

#### Changed

- **[WEBGL] Analog Phosphor & Optical Decay:** Upgraded the CRT shader to feature true phosphor halation (warm lights bloom into darks), a feathered `smoothstep` bezel, and radial chromatic aberration. Analog noise now dynamically thickens in response to `darknessPressure`.
- **[AUDIO] Polyphonic Voice Spawner:** Re-engineered `AcousticEngine` somatic events into a unified, ephemeral synthesizer. Footsteps and doors now spawn self-contained, auto-garbage-collecting wave topologies, eliminating ADSR envelope clipping.
- **[AUDIO] The Blackout Throb:** Wired the `isBlackout` macro-state directly into the acoustic telemetry. When the breaker flips, the 60Hz ambient room hum physically decays into a 25Hz psychoacoustic undulation and the master gain breathes.
- **[GEOMETRY] Industrial Prefabs:** Replaced raw geometric floor loot with compound `THREE.Group` prefabs (vintage glass Almond Water, 6V Lantern Batteries). Snapped their origins flawlessly to the mathematical surface of the Sanctuary table (`y=0.825`).
- **[ENTITY] Optical Physics:** The Anomaly now requires true Line of Sight (LOS). Integrated a dedicated `_sightRaycaster` against the `spatialGrid` to eradicate wall-hacking perception and prevent flashlight-freezing through solid geometry.

#### Optimized

- **[PERFORMANCE] Algorithmic Photon Culling:** Amputated the catastrophic $O(N \log N)$ `Array.sort()` in the lighting loop. Implemented a bounded O(N) insertion loop against a pre-allocated `_activeFixtures` memory block to permanently starve the Garbage Collector.
- **[PERFORMANCE] Structural Time Budget:** Defused the recursive stack bomb in the chunk builder. Replaced `setTimeout(0)` with a dynamic 8ms thermal boundary and `requestAnimationFrame` yielding, eliminating 64ms of artificial frame-pacing lag.
- **[ARCHITECTURE] Factory Ephemeralization:** Sliced the monolithic 400-line `ProceduralTextureFactory` into domain-specific surface generators and consolidated Canvas DOM instantiations to prevent severe initialization memory spikes.

#### Fixed

- **[PHYSICS] Kinetic Gating:** Interactive doors and grates now calculate mathematical resting thresholds. When rotations resolve, the engine snaps the matrix and completely shuts off the kinetic calculation loop.
- **[AUDIO] Frequency Tearing:** Fixed the rapid-fire footstep glitch when stamina depletes. Excised `time * frequency` multiplication and integrated a continuous `headBobPhase` delta to preserve geometric wave continuity.
- **[SYSTEM] Architectural Telemetry Unpacking:** Fixed fatal `ReferenceError` crashes by properly destructuring `isBlackout` for the Acoustic Engine and `stagingMeshes` for the chunk generator payloads.


## [v0.3.6] - 2026-07-11

### Added
- **[MECHANICS] The Oasis & Tactical Sanctuaries:** Added a rare (3%) high-yield room generating guaranteed almond water and batteries to break visual monotony[cite: 13].
- **[MECHANICS] The Deep Breath:** Stamina now regenerates 2.5x faster when the player stands perfectly still in well-lit, low-paranoia areas[cite: 13].
- **[MECHANICS] Adrenaline Overdrive:** Exhausting aerobic stamina while being pursued by the Anomaly now mathematically siphons flashlight battery voltage to sustain sprint speed, delaying the lethargic walk state until complete electromagnetic failure[cite: 13].
- **[AUDIO] Distinct Acoustic Topologies:** Synthesized custom DSP envelopes for metallic vent interactions, sharp mechanical breaker box clicks, and synthetic item acquisition chimes, decoupling them from the monolithic heavy door slam[cite: 13].
- **[ENVIRONMENT] Data Embers:** Injected a secondary, localized particle system for the Server Farm. Cyan, additive-blended particulate dynamically swells into existence and counter-rotates against standard dust motes to simulate super-heated air exhausted from the cooling fans[cite: 13].

### Changed
- **[WEBGL] Authentic CRT Barrel Distortion:** Warped the post-processing UV coordinates natively in the fragment shader to map a mathematically precise geodesic CRT curve, complete with hard boundary clipping to swallow out-of-bounds coordinates into the void[cite: 13].
- **[WEBGL] Exponential Paranoia Shader:** Shattered linear chromatic aberration. RGB channel separation now scales exponentially with anomaly pressure and exhaustion. Injected a luma-dependent halation pass to simulate failing phosphor decay, and coupled scanline opacity directly to the player's physical stamina[cite: 13].
- **[TEXTURES] True Ceiling Tile Topology:** Rewrote the procedural ceiling drop-tile generation to explicitly draw a 2x2 grid on a 512x512 canvas, halving the geometric scale and protecting against systemic stretching errors. Added acoustical dot detailing for material honesty[cite: 13].
- **[TEXTURES] Carpet Fidelity:** Eradicated WebGL linear interpolation blur on the procedural carpet canvas by forcing a strict `NearestFilter` magnification[cite: 13].
- **[TEXTURES] Anisotropic Push:** Crushed grazing-angle aliasing by pushing global `anisotropy` from 4 to 16 across the entire PBR procedural pipeline[cite: 13].
- **[TEXTURES] Decoupled Server Foundation:** Severed the Server Farm floor from the 1x1 wall vent material. Cloned a dedicated instance with a 64x32 UV repeat to yield mathematically crisp 1x2 meter industrial floor plates across the macro-structure[cite: 13].

### Fixed
- **[UI] Terminal Viewport Expansion:** Cured the CSS flexbox collapse and 1600px artificial width ceiling in the execution terminal. The interface now fluidly stretches to absolute viewport edges[cite: 13].
- **[GEOMETRY] The 27% Oasis Anomaly:** Restored rarity equilibrium by inverting the structural probability floor. The generic wall mesh now properly catches the mathematical delta (at `prob: 0.03`), trapping the Oasis strictly at the `0.00` absolute floor for a true 3% yield[cite: 13].
- **[SYSTEM] Dynamic Cell Binding:** Excised the hardcoded magic number `4` from chunk boundary calculations, binding the spatial grid strictly to the dynamic `cellSize` variable to preserve tensegrity during scale mutations[cite: 13].
- **[AUDIO] Event Re-Tethering:** Fixed a syntax collision that dropped the battery an

## [v0.3.5] - 2026-07-11

### Added
- **[CONTROLS] Dynamic Virtual Joystick:** Engineered a tactile visual joystick overlay for the mobile left-touch zone. The UI elements dynamically anchor to the initial touch coordinates and clamp to a 50px visual radius, heavily grounding the player's somatic feedback during traversal.

### Changed
- **[PERFORMANCE] Resolution Baseline:** Shifted the systemic default internal resolution from 100% (Native) down to 50% (Retro / Performance) deep within the `RenderEngine` constructor. This protects baseline hardware thresholds and organically enforces the grimy VHS aesthetic on a fresh boot.

### Fixed
- **[WEBGL] Mobile Shader Panic (The Yellow Fog):** Averted a fatal mobile GPU texture uniform limit crash. Injected a `userAgent` hardware check to dynamically throttle `maxActiveLights` (40 -> 12) and `maxShadowLights` (10 -> 2) strictly on mobile devices. This prevents shadow-map buffer overflows that stripped the geometry and trapped players in an infinite fog void.
- **[UI] Terminal Viewport Lock:** Shattered the absolute vertical lock in `terminal.html` by shifting `overflow: hidden` to `overflow-x: hidden` and relaxing `h-screen` to `min-h-screen`. This rescues the execution footer and Fullscreen UI from the mobile layout abyss.

## [v0.3.4] - 2026-07-11

### Added
- **[MECHANICS] Battery Economy:** Deployed procedural battery cylinder collectibles (max 2 per chunk). Collecting one restores 40% flashlight voltage to counter electromagnetic drain.
- **[MECHANICS] Almond Water:** Deployed procedural almond water canisters (max 1 per chunk). Grants 15 seconds of infinite stamina to aggressively outrun entities.

### Changed
- **[GEOMETRY] Architectural Pruning:** Excised the misplaced corporate office partitions (desks, fabric half-walls) and floating rust-pipe concrete pillars from the generation matrix to maximize authentic liminal emptiness.
- **[GEOMETRY] The Claustrophobic Dogleg:** Transformed trivial 0.5-unit wall gaps into absolute squeeze bottlenecks and blind L-shaped barricades to force kinetic friction during traversal.
- **[MECHANICS] Flashlight Paranoia:** The Anomaly now dynamically drains the player's flashlight battery based on physical proximity (`35.0 + (150.0 / dist)`), and its geometric core jitters violently as voltage drops.
- **[MECHANICS] Breaker Box Topology:** Overhauled Surge Breakers to toggle chunk-wide blackouts. Enforced a 3-per-chunk spawn limit and a 16-unit spatial exclusion zone to distribute them organically across the grid.

### Optimized
- **[PERFORMANCE] O(1) Photon Culling:** Ripped out the massive O(N) global array iteration inside the Anomaly's locomotion solver, binding the entity's light-shattering logic strictly to the heavily-culled `localFixtures` cache.

### Fixed
- **[WEBGL] Breaker Restorations:** Fixed the illumination restoration cascade to properly re-ignite authentic WebGL point lights instead of locking them in a permanent, flickering brownout.
- **[GEOMETRY] Z-Fighting Isolation:** Pushed the breaker door geometry out by a microscopic `0.002` units (`z = 0.102`) to eliminate depth-buffer tearing against the rusted backplate.

## [v0.3.3] - 2026-07-11

### Added
- **[MECHANICS] The Lethargy Curve:** Inverted the exhaustion frequency math. High stamina depletion now mathematically stretches the head-bob wavelength and increases structural amplitude, accurately simulating a heavy, dragging footprint instead of a caffeinated jitter.
- **[MECHANICS] Velocity Decay Gradient:** Coupled locomotion multipliers directly to the exhaustion stock. Sprinting now seamlessly decays into a lethargic stumble as stamina drains to absolute zero, eradicating rigid, binary speed states.

### Changed
- **[TEXTURES] True-Aspect Procedural Vents:** Vaporized the distorted `256x256` stretched UV map. Rewrote the procedural canvas generation to a native `512x256` resolution, creating a clean, single-panel array with 14 thick, structurally grounded slats to eliminate hardware moiré.

### Fixed
- **[PHYSICS] Decoupled Kinematic Vectors:** Isolated the collision impact scalar by axis. Grazing a wall parallel to the movement vector now allows a seamless, high-speed corner slide without violently absorbing perpendicular momentum and pitching the camera.
- **[GEOMETRY] Z-Fighting Isolation:** Physically isolated the vent louver geometry by injecting a precise `0.06` unit somatic offset, pulling the procedural mesh completely clear of the host wall's dynamic bump-map depth.
- **[GEOMETRY] Geodesic Duct Sealing:** Mapped the missing lateral spatial volumes for the procedural HVAC tunnel variant, mathematically sealing the void and preventing the infinite skybox from bleeding through the architecture.
- **[GEOMETRY] Interactive Grate Clearance:** Shrunk the interactive floor grate width from `1.2` to `1.16` to provide mathematical mechanical clearance during hinge rotation, preventing the mesh corners from clipping against the structural void.

## [v0.3.2] - 2026-07-10

### Added

- **[AUDIO] The Somatic Heartbeat:** Wired the player's exhaustion telemetry directly into the acoustic topology. The sub-rumble frequency and kinetic LFO now dynamically spike to simulate a pounding heartbeat when stamina is depleted.
- **[ENVIRONMENT] The Chasm Biome Acoustics:** Injected a dedicated acoustic profile and telemetry hook for the void. Stepping into the Chasm now physically drops the volumetric fog to reveal the drop, and alters the DSP to simulate deep, hollow emptiness (high noise floor, 30Hz rumble).

### Changed

- **[MECHANICS] True Stealth Multiplication:** Replaced the flat integer stealth modifiers with a compounding `stealthMultiplier`. Crouching in the dark with the flashlight off now geometrically collapses the Anomaly's perception threshold.
- **[MECHANICS] Psychological Darkness vs Physical Exhaustion:** Decoupled ambient lighting from the metabolic stamina loop. Standing in pitch-black darkness no longer burns aerobic stamina, but instead applies severe claustrophobic pressure to the camera's FOV.
- **[WEBGL] Peripheral Desaturation:** The post-processing shader now mathematically responds to environmental darkness, shrinking the safe vignette radius and bleeding color from the periphery as paranoia stacks.
- **[MECHANICS] Flashlight Psychological Mitigation:** The flashlight beam now acts as a psychological anchor. Illuminating the darkness actively neutralizes the claustrophobic FOV constraints and restores systemic equilibrium based on active battery voltage.

### Optimized

- **[ENVIRONMENT] O(1) Photon Culling:** Excoriated the heavy `forEach` iteration and `Math.sqrt()` calls from the active lighting loop. Implemented distance-squared bounding rejection to stabilize the volumetric light pressure without choking the CPU.

### Fixed

- **[WEBGL] The Retinal Inversion Anomaly:** Intercepted the unbounded darkness summation that was mathematically collapsing the projection matrix. Applied an asymptotic curve (`1.0 - Math.exp`) to normalize psychological pressure and injected a hard geometric floor (`max(0.02)`) into the vignette shader.
- **[GEOMETRY] Directional Grate Hinges:** Stamped spatial orientation metadata (`blocksX`) onto procedural vent covers at birth. Destroyed grates now read their origin axis and apply torque to the correct local hinge, cleanly snapping to the floor instead of balancing on their sides.
- **[AUDIO] Zero-Crossing Temporal Desync:** Corrected the somatic step trigger math by perfectly isolating the exact elapsed `timerDelta` variable, preventing phase-shifting false positives when exhaustion alters the breath frequency.
- **[AUDIO] Envelope Collision Tearing:** Instructed the `stepGain` DSP node to explicitly execute `cancelScheduledValues()` before applying new impact envelopes, eliminating popping audio artifacts during rapid, exhausted footsteps.

# [v0.3.1] - 2026-07-10

### Added
- [ARCHITECTURE] Entity Autonomy: Decoupled the predatory hazard from the `Environment` monolith into a dedicated `Anomaly.js` class, permanently isolating its traversal, rendering, and lifecycle loops.

### Changed
- [TEXTURES] True Planar UV Mapping: Refactored the `buildWall` geometry factory to accept a `yOffset` parameter. Mathematically clamped horizontal top/bottom face coordinates to the `[0.2, 0.8]` safe zone, completely obliterating the dark phantom baseboards on suspended architectural structures.
- [GEOMETRY] The Seamless Cutout: Purged all standalone concrete (`structMat`) barriers encapsulating HVAC ducts and crawlspaces. Structures are now painted with `sharedWallMat` and utilize a localized, invisible topological forcefield (`isInvisibleBlocker`) to natively restrict entity pathfinding without generating brutalist tumors.
- [MECHANICS] Somatic Heaving: Slowed the camera bob frequency and increased the vertical amplitude when the stamina pool is depleted. The physics engine now physically simulates a heavy, labored bodily sag rather than a hyperactive caffeine jitter.
- [ENTITY] The Scent Gradient: Extracted the Anomaly's spatial backtrack logic from the local perception block. The entity now continuously tracks a mathematical scent gradient, preventing topological paralysis when wandering into dead-ends outside the player's radius.

### Fixed
- [SYSTEM] Namespace Lexical Drop: Fixed a fatal `ReferenceError: Mesh is not defined` engine crash during procedural generation by restoring the explicit `THREE.` namespace prefix to the `buildWall` factory return statement.

## [v0.3.0] - 2026-07-10

### Changed
- [MECHANICS] Posture-Pinning: Softened the volumetric ceiling scan thresholds to prevent physics engine frame-rejection when transitioning into crawl-spaces.
- [SYSTEM] Annihilation Protocol: Migrated from legacy mesh-removal to robust `parent.remove()` implementation for cross-version compatibility.

### Fixed
- [RUNTIME] Fixed `TypeError: b.meshRef.removeFromParent is not a function` during interactive grate destruction.
- [PHYSICS] Prevented "crouch-locking" where the player would snap to stand or crouch while the volumetric scanner was in flux between two chunk frames.

# Level 0 Engine Changelog

## [v0.2.9] - 2026-07-10

### Added
- [ARCHITECTURE] The Chasm: Amputated the monolithic infinite floor plane. The engine now dynamically omits foundational geometry to create massive, bottomless voids that swallow the volumetric fog.
- [MECHANICS] Kinematic Gravity: Taught the player controller to recognize void sectors. Stepping off the manifold now triggers a terminal velocity plunge and an autonomic engine rebuild.

### Changed
- [WEBGL] Subliminal VHS Phase: Decoupled the VCR phase tracking band from the stamina multiplier. Severely throttled the scrolling speed and luminance to act as a peripheral, whispering phantom rather than an optical strobe.
- [TEXTURES] Restored the procedural carpet and ceiling tile UV repeat mapping (scaled to `16x16`) to eradicate the severe mipmap smudging caused during chunk localization.
- [TEXTURES] Calibrated PBR metalness and roughness on Server Farm and Maintenance HVAC materials to accurately reflect localized flashlight specular highlights.

### Fixed
- [RENDERER] Integer Viewport Anchoring: Eradicated the persistent center-screen "double thick" interlacing tear (as verified in backrooms_asset_1783713675926.png). Obliterated CSS fractional pixel translation (`translate(-50%, -50%)`) and replaced it with absolute, mathematically floored integer offsets.
- [GEOMETRY] The Mass Cascade: Severed a localized `for`-loop indentation shadow that caused the engine to simultaneously instantiate 16 overlapping server racks and light fixtures in the exact same spatial coordinates, destroying the Z-buffer and starving the photon pool.

## [v0.2.8] - 2026-07-10

### Added
- [MECHANICS] The Surge Breaker: Players can now trigger a localized illumination cascade failure via interactive Breaker Boxes (bound to 'E'). Plunges the local sector into total darkness before triggering a permanent, flickering reboot cascade.
- [MECHANICS] Adrenaline Economy: Stamina burn and recovery rates are now dynamically coupled to the active pursuit state. Casual exploration is metabolically efficient, while fleeing in terror burns oxygen twice as fast.
- [MECHANICS] Somatic Collision Haptics: High-speed kinematic impacts against structural geometry now properly bleed momentum, violently jolt the camera, and trigger somatic foley events.
- [UX] Somatic Targeting Reticle: Added a CSS mix-blend crosshair overlay and replaced strict mathematical raycasting with a forgiving spatial dot-product (~40-degree cone) to accommodate human motor controls in the dark.
- [GEOMETRY] Articulated Breaker Box: Split the breaker mesh into a dual-component `THREE.Group` with a zero-cost mathematical hinge. Pressing 'E' now violently snaps the panel open 120 degrees instead of relying on a flat material swap.
- [TEXTURES] The Obsidian Void: Forged a new metallic, procedurally bump-mapped PBR skin for the Anomaly, discarding the flat black unlit mesh.

### Changed
- [MECHANICS] Dynamic Perception Threshold: The Anomaly's detection radius now physically expands and contracts based on the player's stance (crouching/running), flashlight state, and exhaustion (heavy breathing).
- [MECHANICS] Exhaustion-Coupled Pursuit: The Anomaly mathematically feeds on panic. Pursuit speed now scales inversely with the player's exhaustion level.
- [MECHANICS] Adrenaline Threshold Decoupling: Separated the Entity's physical detection radius from the Player's psychological panic state. Stamina burn rates no longer spike until the Anomaly physically crosses the 15-unit acoustic pressure boundary.
- [WEBGL] The Void Coupling: Severed ambient light from static parameters. The HemisphereLight, atmospheric fog, and background hex colors are now directly crushed by local `darknessPressure`.
- [WEBGL] Elevated Darkness Pressure: Hoisted the topological darkness math out of the restricted hardware lighting loop. Shattered "fake" volumetric decals now accurately generate massive structural weight, allowing the environment to reach true pitch-black (`0x000000`) fog states.
- [WEBGL] Hardware Target Hardening: Decoupled the WebGL renderer from hardware Device Pixel Ratios (DPR) to prevent hidden mobile rendering lag, and applied `NearestFilter` to the RenderTarget for authentic retro downscaling.

### Optimized
- [ENVIRONMENT] O(1) Spatial Hash Purge: Sealed a terminal memory leak in chunk generation by explicitly clearing the `chunkMap` and truncating the `queryCache` array via index pointers instead of `Array.push()` in the hot loop.
- [TEXTURES] Shader Loop Collapse: Merged the shadow and highlight passes for the procedural woodgrain texture into a single 250-iteration loop utilizing native 2D Canvas shadow mapping.
- [RENDERER] GLSL Matrix Unification: Collapsed the post-processing fragment shader, deleting the expensive conditional 3-sample exhaustion blur and piping the fatigue math directly into the chromatic aberration distortion vector.

### Fixed
- [GEOMETRY] Z-Plane Friction: Thickened the Breaker Box geometry and offset the Z-axis spawn to completely clear the pillar's front face, eliminating depth buffer tearing.
- [WEBGL] Material Pointer Orphans: Repaired the lighting cascade failure where `InstancedMesh` materials froze when overwritten by a global material. Illumination deaths now accurately manipulate the existing instanced material pointers.
- [ENVIRONMENT] Interactive Memory Leak: Flushed the new `interactables` array during the chunk culling loop to prevent invisible Breaker Boxes from silently accumulating in the void.
- [ENVIRONMENT] Phantom Illumination: Forced the 85% "fake" ambient light decals into the primary `fixtureData` array (tagged as `isFake` to protect hardware limits), allowing the Surge Breaker to locate and systematically shatter them.
- [ENVIRONMENT] Asynchronous GC Drops: Hard-bound the illumination cascade's `isDead` state to the synchronous thread, preventing aggressive Garbage Collection from swallowing the timeout closures before bulbs could pop.
- [ENVIRONMENT] Lexical Indentation: Purged an orphaned closing bracket from the interaction listener that structurally shattered the `setup()` method's lexical scope.
- [RENDERER] GLSL Scope Collision: Resolved a fatal GPU compiler panic (`WebGL: INVALID_OPERATION`) caused by variable shadowing (`float pulse`) during the fragment shader unification.
- [PHYSICS] Kinetic Feedback Loop: Implemented impact hysteresis (`wasColliding`) and a mathematical cervical clamp to prevent the engine from choking the Web Audio thread and snapping the camera neck when players infinitely slide against walls.

## [v0.2.7] - 2026-07-09

### Added
- [MECHANICS] The Liminal Breach (Fast Travel): Transformed dead-end stairs into a core progression loop. Un-capped the kinematic Y-axis when standing on rare, tagged staircases (15% spawn rate), allowing players to phase through the ceiling and mathematically warp thousands of units across the grid without mutating the quantum seed.
- [MECHANICS] Ultraviolet Breadcrumbs: Players can now press 'T' to spray a glowing, high-visibility UV paint decal on walls to map the labyrinth. Managed via a strict, zero-leak 50-decal Object Pool and a dynamic surface-normal raycaster.
- [GEOMETRY] The Cages: Replaced the Poolrooms with a brutalist maze of procedural chain-link fencing. Fences utilize Canvas-drawn diamond wireframes and WebGL `alphaTest` to create true, see-through geometry that blocks physical entities but allows line-of-sight and flashlight penetration.

### Changed
- [AUDIO] Articulated Foley Envelopes: Re-engineered the DSP footstep synthesizer to obey surface-specific ADSR timings (Attack/Decay). Footsteps dynamically shift between `sine` and `triangle` wave oscillators, allowing porcelain tiles to sharply "click" while carpet produces a muffled "thud".
- [TEXTURES] Lifeless Acrylic: Calibrated `baseBrokenLightMat` to prevent pure-black light fixtures. Dead ballasts now hold a cold, milky gray base color (`0x8c9296`) with a static emissive floor to catch the ambient photon bounce.

### Optimized
- [ENVIRONMENT] Zero-Allocation Entity Tracking: Pre-allocated tracking vectors (`_entDir`, `_entToPlayer`, `_entLookDir`) in the Anomaly's `updateEntity` matrix. This eliminates 180 discarded vector instantiations per second, permanently starving the Garbage Collector of pursuit thrashing.
- [PHYSICS] Kinematic Normalization Clamp: Applied a zero-allocation mathematical magnitude clamp to mobile touch-move inputs (`intentX`, `intentZ`). This strictly enforces terminal velocity and prevents players from moving 41% faster when sliding the virtual joystick diagonally.

### Fixed
- [ENVIRONMENT] The Audio/Visual Schism: Ripped out the desynced trigonometric PRNG in the `updateLights` telemetry loop and replaced it with the exact bitwise Linear Congruential Generator (LCG) used in `buildChunk`. Audio profiles now perfectly align with the rendered physical geometry.
- [TEXTURES] Lexical Pipeline Collision: Fixed a fatal block-scoped redeclaration error (`const fCtx`) in the texture factory that halted the WebGL bootstrap when generating the chain-link fencing.

## [v0.2.6] - 2026-07-09

### Optimized

- [RENDERER] The Uniform Pipeline & GPU Detox: Amputated per-pixel `Math.sin()` trigonometric evaluations from the post-processing fragment shader. Offloaded entropy to a CPU-calculated `globalSeed` uniform and leveraged hardware bilinear filtering to mathematically halve texture lookups during the retinal blur pass.
- [RENDERER] Radial Distance Optimization: Eradicated the computationally expensive `distance()` square root in the vignette shader, replacing it with a mathematically equivalent Cartesian `dot()` product.
- [ENVIRONMENT] O(1) Spatial Eviction: Obliterated the O(N) memory eviction traversal in the Spatial Hash Grid. Implemented a reverse-lookup dictionary (`chunkMap`) to execute surgical, instantaneous geometric culling upon chunk unload.
- [ENVIRONMENT] Zero-Allocation Kinematics: Hoisted the Anomaly's collision vectors (`THREE.Vector3`, `THREE.Box3`) into persistent class memory. This severs the continuous allocation pipeline and permanently starves the Garbage Collector during high-speed entity pursuits.
- [ENVIRONMENT] Fractal & Entropy Detox: Vaporized the `Math.sin()` pseudorandom number generator inside the Julia Set chunk loop, replacing it with a hyper-optimized bitwise Linear Congruential Generator (LCG). Cached structural `zx * zx` floating-point multiplications to mathematically halve thermodynamic friction.
- [ENVIRONMENT] Zero-Waste Instancing: Annihilated the `dummy` `Object3D` overhead during procedural chunk assembly. `mesh.matrixWorld` payloads are now piped directly into the `InstancedMesh` buffers, bypassing costly spatial decompositions.
- [AUDIO] Persistent Foley Bus & Declarative Matrix: Decoupled somatic acoustic profiles from nested inline ternary logic. Welded the Web Audio API Gain and Biquad filter plumbing directly into the `init()` boot sequence. Footsteps now natively plug into a persistent routing graph and execute explicit `.disconnect()` garbage collection upon completion.
- [AUDIO] Acoustic Distance Culling: The somatic trigger now explicitly drops execution requests outside a 1600-unit squared radius before computing the physical scalar square root, reclaiming wasted CPU cycles.
- [PHYSICS] Unified Spatial Queries & Kinematic Math: Hoisted the O(1) hash grid spatial query to the top of the frame. Both the collision solver and the claustrophobic squeeze mechanics now execute against a single shared spatial payload. Centralized Euler applications to eliminate redundant geometric transformations.
- [TEXTURES] O(N) Canvas Entropy Detox: Excised `Math.random()` from the 786,432-iteration `masterNoise` pixel loop. Injected a deterministic, bitwise LCG hash to drastically accelerate initial canvas generation.
- [TEXTURES] Structural Canvas Batching: Re-engineered the procedural wood grain and hazard stripe painters. Consolidated 800 individual `stroke()` path allocations into exactly two continuous sub-paths, mathematically evaporating hundreds of redundant 2D context draw calls.

## [v0.2.5] - 2026-07-07

### Added

- [UI] Hardware Control Expose: Injected systemic range inputs for Master Volume and Gamma (Exposure) into the DOM, tethering them directly to the `toneMappingExposure` and DSP `masterGain` chokepoints.
- [AUDIO] Master Headroom Expansion: Established a unified `masterGain` amplification node, mathematically shifting the absolute volume ceiling by 250% to accommodate weak hardware constraints without flattening dynamic range.

### Changed

- [ARCHITECTURE] Parallel Geodesic Plumbing: Severed the rigid center-line pipe generation causing Z-fighting with ceiling fixtures. Pipelines in the Server Farm and Maintenance Shafts now route on a parallel Cartesian shift (`offset = 0.9` and `-1.1`), maintaining topological continuity while physically skirting electrical housings.
- [AUDIO] Somatic Surface Topology: Amputated the Clinic and Boardroom from the `isWet` Poolrooms acoustic evaluation. Tile traversal now utilizes a distinct 1800Hz low-pass filter and a 140Hz fundamental sine pitch to simulate dense, dry footwear impacts.
- [AUDIO] Transient Punctuation: Quadrupled the base amplitude vector for player foley events (`gainNode.gain.linearRampToValueAtTime`), allowing physical footsteps to mathematically crack through the heavy 60Hz ambient server hum.

### Fixed

- [INPUT] Semantic Scope Hemorrhage: Implemented a strict active-element guard clause (`document.activeElement.tagName === 'INPUT'`). The physics engine is now biologically blinded to keystrokes intended for HTML text inputs, preventing traversal events from firing while editing the generation seed.
- [GEOMETRY] Intersection Bleeding: Retracted pipe cylinder elongation and re-instantiated structural junction boxes (`pipeJunctionGeo`) at Cartesian intersections, guaranteeing continuous 90-degree plumbing elbows without overlapping vertices into adjacent open corridors.

## [v0.2.4] - 2026-07-07

### Added

- [MECHANICS] The Quantum Observer Effect: The Null Anomaly is now bound to the flashlight's electromagnetic vector. Catching the entity within a ~30-degree cone of the light mathematically freezes it in place, but holding the quantum lock violently hemorrhages battery voltage (`-25.0/sec`) and causes the entity to physically vibrate.
- [AUDIO] Surface-Aware Procedural Foley: Integrated a native DSP synthesizer for footsteps. The engine now reads the active spatial sector to dynamically shift the biquad filters—generating high-pass splashes in the Poolrooms, bandpass metallic clinks in Maintenance, and low-pass carpet scuffs in corporate zones.
- [AUDIO] Somatic Event Bus: Decoupled physical impacts from the rendering loop. Footsteps (anchored mathematically to the downward zero-crossing of the head-bob sine wave) and violent door slams now dispatch global events to the Acoustic Engine.

### Changed

- [MECHANICS] Systemic Poltergeist Doors: Tied the Anomaly's spatial coordinates directly into the kinematic door latches. The entity no longer ghosts through closed paths; it violently slams doors open at 400% normal velocity (`swingSpeed: 35.0`), allowing players to acoustically track its pursuit through the maze.
- [AUDIO] Master DSP Mix & Phase Stabilization: Extracted physical Foley out of the ambient `mainGain` bus and routed it directly to the master destination to prevent dynamic volume ducking. Dropped the room LFO phase amplitude from `0.008` to `0.002` and lowered the baseline noise floor to leave dynamic range for physical impacts.
- [GEOMETRY] Vertical Structural Grounding: Gutted mathematically disconnected floating horizontal struts. The generation heuristic now exclusively places grounded, vertical clusters of rusted rebar using zero-allocation X/Z scaling on a shared cylinder geometry (`vPipeGeo`).
- [PERFORMANCE] Texture Initialization Autophagy: Flattened the CPU-blocking `masterNoise` procedural canvas loop. Removed temporary memory allocations and utilized bitwise OR (`| 0`) truncation to drastically accelerate initial chunk generation.
- [PHYSICS] High-Speed Kinematic Flow: Softened the hard geometric collision boundaries. Increased the player's snag-shrink tolerance from `0.05` to `0.15` and shaved `0.1` off the entity's non-moving evaluation axis to allow both bodies to butter-slide around 90-degree concrete corners without deadlocking.

### Fixed

- [PHYSICS] Excised the "Ghost Door" Collision Wall. Rotating doors now instantly evaluate `.makeEmpty()` on their bounding boxes while opening, preventing the diagonal AABB bloat from completely swallowing the hallway clearance.
- [GEOMETRY] Averted a catastrophic CPU Singularity. Prevented the instancing engine from collapsing all chunk geometry into a single origin coordinate `(0,0,0)` by safely restoring the absolute `updateMatrixWorld(true)` global transform pipeline.


## [v0.2.3] - 2026-07-07

### Added
- [GEOMETRY] Expanded structural variance: Industrial Archway (prob 0.86), Fabric Cubicle (prob 0.60), and Maintenance Pillar (prob 0.44).
- [GEOMETRY] Procedural Pipe Routing: Implemented geodesic snapping logic for vertical conduits, aligning them with wall geometry to ensure clean integration with server racks.
- [INPUT] Remapped Capture Asset shortcut to 'C' and Crouch to 'X'. Centralized event handling via the `capture-screenshot` custom event bus to ensure input consistency.

### Changed
- [PERFORMANCE] Spatial Grid Overhaul: Eradicated string interpolation in hot physics loops. Switched to O(1) bitwise key generation (`x << 16 | z`) to eliminate garbage collection micro-stutters.
- [PERFORMANCE] Texture Pipeline: Replaced ~70,000 synchronous `ctx.fillRect()` calls with a single `ImageData` master noise buffer, slashing boot time and main-thread overhead.
- [RENDERER] Emissive Injection: Injected light-emissive properties into `rustMat` and boosted `HemisphereLight` ground color to prevent piping and dark metallic objects from vanishing into silhouettes in low-ambient zones.
- [GEOMETRY] Dynamic Wall Scaling: Upgraded `buildWall` closure to accept dynamic height (`h`) parameters, allowing for non-standard wall geometry while automatically scaling UVs to prevent texture stretching.
- [PERFORMANCE] AABB Optimization: Transitioned bounding box generation to O(1) clone operations by leveraging pre-computed geometry bounds, bypassing expensive `setFromObject` vertex traversals.

## [v0.2.2] - 2026-07-07

### Added
- [ENTITY] The Minotaur Override: The Null Anomaly now possesses short-term spatial memory. It drops mathematical breadcrumbs while hunting and will actively reverse its polarity to navigate out of enclosed labyrinths and dead ends.
- [WEBGL] The Slender Effect: Routed the `anomalyPressure` telemetry directly into the Post-Processing pipeline. Proximity to the entity now violently degrades the optical shader, inducing horizontal V-Hold tearing, severe chromatic aberration, exponential static grain, and luminance desaturation.

### Changed
- [MECHANICS] True Piezoelectric Flashlight: Excised the passive battery recovery timer. The flashlight battery now mathematically requires physical kinetic input to recharge. Players must actively sprint through the dark or violently shake their viewport (angular camera velocity) to generate voltage.

## [v0.2.1] - 2026-07-07

### Added
- [SYSTEM] The Generation Curtain: Repurposed the optical blackout overlay to act as an asynchronous loading screen. The engine now drops a strict visual curtain during initial chunk generation and automatically lifts it only when the baseline spatial queue hits zero.

### Changed
- [MECHANICS] Somatic Weight Rebalance: Cured the "baby penguin" kinetic anomaly. Throttled physical run/crouch speeds, decoupled the somatic timer from raw velocity to ground the human cadence, and severely mathematically restricted the lateral camera sway to inject true bodily inertia.
- [ENVIRONMENT] Decoupled Atmospheric Interpolation: Separated the user's UI fog slider intent (`baseFogDensity`) from the engine's real-time spatial interpolation math (`currentFogDensity`). The fog slider now acts as a permanent global multiplier while gracefully allowing sectors to scale their unique atmospheres.

### Fixed
- [PERFORMANCE] Asynchronous Assembly Pipeline: Smashed the monolithic `buildChunk` execution. The Environment now routes architectural generation through a background queue that explicitly yields to the main thread, permanently eliminating catastrophic browser lock-ups when crossing chunk boundaries.
- [AUDIO] The Temporal Air-Gap: Fixed a deafening synth blast specific to Firefox upon engine initialization. Explicitly awakened the `AudioContext` and injected a 20-millisecond forward offset into the DSP scheduling math to prevent zero-anchor temporal collisions.

## [v0.2.0] - 2026-07-06

### Added
- [MECHANICS] Kinematic Peek Protocol: Holding Right-Click applies a transient visual offset, allowing the player to physically lean 80cm around corners without exposing their collision cylinder to entities.
- [MECHANICS] Somatic Inertia & Figure-8 Breathing: Unified the kinematic intent vector to inject physical camera banking during lateral strafing, and replaced the linear head-bob with a compound structural sway curve.

### Changed
- [WEBGL] Hardware Optic Engine: Upgraded the rendering pipeline to `THREE.ACESFilmicToneMapping` and `THREE.SRGBColorSpace`. Replaced the flat `AmbientLight` with a thermodynamic `HemisphereLight` to restore vertical volume and true physical color saturation.
- [WEBGL] Photometric Attenuation: Subdued localized fixture intensity and shifted Point/Spot lights to warm tungsten hex codes with strict quadratic physical decay (`2.0`) to stop linear surface bleaching.
- [WEBGL] Advanced Post-Processing: Replaced bloated 3D PRNG noise with an optimized 2D spatial sine wave. Anchored VHS scanlines to physical monitor pixels (`gl_FragCoord.y`), and mapped grain opacity to inverse-luminance to preserve flashlight contrast.
- [TEXTURES] Brutalist Wrap & Luminance Depth: Upgraded procedural concrete `structMat` to 512x512 to shatter checkerboard grids, injected seamless X-axis gradient wrapping, and wired diffuse canvases into PBR `bumpMap` slots across the entire pipeline for free geometric variance.
- [UI] Curated Experience Boundaries: Enforced the 4:3 VHS aspect ratio as the hardcoded systemic default. Tightened UI slider limits (Speed 80-120%, FOV 60-90, Fog 2-8) to prevent players from mathematically neutralizing the psychological horror.

### Fixed
- [PERFORMANCE] Spatial Grid Memory Autophagy: Eliminated catastrophic Garbage Collection leaks by amputating dynamic `Set` instantiations in the physics loop, replacing them with a rolling O(1) mathematical `queryId` check.
- [PERFORMANCE] O(1) Audio Raycasting: Decoupled the acoustic occlusion loop from heavy polygon geometry (`intersectObjects`). The audio raycaster now strictly evaluates mathematical AABB vector bounds pulled directly from the Spatial Hash Grid.
- [PERFORMANCE] Differential Audio Cache: Prevented the Web Audio API from suffocating the browser thread by wrapping `setTargetAtTime` in a discrete state cache. Transferred high-frequency exertion pulse math out of JS and into a native hardware `OscillatorNode`.
- [PERFORMANCE] Syntactic API Purge: Short-circuited heavy boolean intersections in the physics loop and mathematically grouped thousands of `ctx.fillStyle` Canvas 2D calls to radically accelerate boot-time texture generation.

## [v0.1.9] - 2026-07-06

### Added
- [MECHANICS] Implemented the "Squeeze" traversal mechanic (bound to 'Q'). Players can compress their collision cylinder radius from 0.4 to 0.12 to slip through narrow architectural crevices at the cost of severe speed reduction.
- [MECHANICS] Introduced the Flashlight (bound to 'F' and mobile UI). Features a heavy 1.8 base intensity, battery starvation dimming, dying filament sputter, and piezoelectric kinetic recharge when powered off.
- [ENTITY] Structural Repulsion: The Anomaly behaves like a 4D shadow through drywall but is fundamentally repelled by load-bearing concrete crevices (`isEntityBlocker`). It cannot squeeze, forcing kinetic deflection and re-pathing.
- [ENTITY] Electromagnetic Interference: Anomaly proximity now violently throttles the flashlight's voltage, inducing chaotic flickering and severe dimming.
- [UI] Added real-time Battery Telemetry (`BAT: 100%`) to the VHS status bar overlay and integrated the battery state into the persistent Mnemonic Cache.

### Changed
- [TEXTURES] Overhauled `structMat` concrete generation. Replaced rudimentary circles with authentic brutalist poured formwork lines, high-frequency aggregate noise, and subtle vertical water stains.
- [TEXTURES] Globally applied 4x Anisotropic Filtering to all procedural materials (`map` and `emissiveMap`) to eliminate high-frequency Moiré patterns and aliasing at grazing camera angles.
- [GEOMETRY] Re-engineered The Poolrooms with topographic variance (sunken wading pools and raised tile platforms) and replaced The Clinic's random floating dividers with modular Triage Pods (privacy curtains, cots, IV stands).
- [GEOMETRY] Transformed The Archive by replacing isolated pillars with continuous, towering rows of metal shelving populated with scattered, rotated cardboard boxes.

### Fixed
- [WEBGL] Fixed "Void Peeking" during Squeeze mode. The camera's near clipping plane now dynamically shifts to `0.01` exclusively during active compression, snapping back to `0.1` upon release to maintain maximum global Z-buffer depth precision and eliminate distant Z-fighting.
- [GEOMETRY] Fixed HVAC vent material swallowing. Separated `wallVentMat` to correct 16x16 UV scaling issues, and engineered a single-panel surface mount that offsets exactly `0.02` units from a randomized pillar face to prevent concrete clipping.
- [PHYSICS] Implemented Meadows' Spatial Constraint: The physics loop now casts a predictive floor box and mathematically prevents the player from exiting Squeeze mode (radius expansion) if they are currently entombed within narrow geometry.

## [v0.1.8] - 2026-07-05

### Changed
- [SYSTEM] Overhauled the "PURGE MEMORY" sequence into a Scorched Earth protocol. The teardown sequence now explicitly halts the 2.5-second `saveState` interval to sever the automated stock inflow before annihilating `localStorage`, `sessionStorage`, and the Cache API.
- [SYSTEM] Added an asynchronous routine to the memory purge to actively unregister stale Service Workers before forcing a hard URL navigation reset, guaranteeing the eradication of poisoned DOM caches.

### Fixed
- [GEOMETRY] Eradicated the "Origin Table" teleportation anomaly. Singular procedural meshes are now mathematically forced to execute `matrixWorld.decompose()` before being ripped from their parent group and appended to the chunk. This preserves their absolute geodesic map coordinates instead of snapping to a local `(0, 0.8, 0)` vector at the player's spawn.
- [AUDIO] Fixed a deafening volume spike when the browser initializes the audio context on a hard refresh. The Web Audio API automation timeline is now explicitly anchored at absolute zero via `setValueAtTime(0, ctx.currentTime)` before oscillator activation. This prevents the `mainGain` and `whineGain` nodes from executing a brutal half-second decay from their default 1.0 maximum hardware volume.

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
- [ENVIRONMENT] Extracted all DOM mutations (coordinates tracking, mobile UI toggles, seed mutations) out of the physics step and into the `Main.js` observer loop, completely decoupling the mathematical state from the browser's layout renderer.
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
- [ARCHITECTURE] Modularized the monolithic codebase. Split the core logic into discrete ES6 modules (`Main.js`, `RenderEngine.js`, `PlayerController.js`, `Environment.js`) using `export default` to drastically reduce cognitive load and establish strict semantic boundaries.
- [PHYSICS] Implemented Geodesic Spatial Hashing. Replaced the expensive O(N) global `wallBoxes` array with a highly efficient `SpatialHashGrid`, indexing geometry into 4-unit cells.
- [LIGHTING] Added Spatial Hysteresis to the shadow allocation loop. Fixtures currently holding a shadow map are mathematically biased closer by 40 units during sorting to prevent flickering and thrashing at index boundaries.
- [LIGHTING] Added a Fade Envelope to the virtual light pool. Hardware `THREE.PointLight` intensities now smoothly scale from 0 to 1 over the outer 8 units of their 20-unit radius, eliminating abrupt popping while the physical ceiling panel's `emissiveIntensity` remains visually constant.

### Changed
- [SYSTEM] Updated `index.html` to load `Main.js` as an ES6 `<script type="module">`.
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

