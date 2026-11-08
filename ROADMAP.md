# Roadmap

Item IDs are permanent: `P<phase>-<nn>`. Never renumber; append new items at the end of their phase.
`[ ]` open · `[~]` in progress (who holds it, since when, and what is left) · `[x]` done · `[-]` dropped (say why,
and the decision). An item held `[~]` by someone else is theirs until they or a maintainer release it.

A finished item says what was done, the decision if any, the evidence (the test, or the measurement), and the date.
A new item says where it came from (a test run, a real user, a maintainer) and the date. Keep an item's history in it:
"tried X, measured Y, then did Z" is how the next session avoids trying X again. Bugs are items too, filed under
the phase they belong to.

Work before 2026-09-30 (up to v1.5.7.2) is recorded in [docs/CHANGELOG.md](docs/CHANGELOG.md), not here.

## Phase 1: Project hygiene and automated testing

Goal: the repository can be checked by one command and resumed without tribal knowledge.

- [x] P1-01 Adopt the agent documentation scheme (AGENTS, ROADMAP, docs/, tools/check_docs.py). Retrofitted from the
  code and history; `python3 tools/check_docs.py` passes (2026-09-30)
- [x] P1-02 Add a `.gitignore`: `build/`, `node_modules/`, OS and editor clutter (`.DS_Store`, `Thumbs.db`, `.idea/`,
  `.vscode/`), logs (`*.log`), and local Claude settings (`.claude/settings.local.json`). Check nothing currently
  tracked matches before adding a pattern (`git ls-files -ci --exclude-standard`). Done when `npm run build` leaves
  `git status` clean. Found during P1-01, 2026-09-30
- [x] P1-03 Test harness with no new dependencies: Node's built-in `node:test`, with a small helper that loads
  `r160.js` onto `globalThis` so modules that use the `THREE` global can be imported. `npm test` runs
  `node --test test/`. Done when `npm test` runs one passing test and fails when that test is broken on purpose.
  Found during P1-01, 2026-09-30
- [x] P1-04 Reconcile the README with the code. Sector count, ACME, `NormalSector.js`, the sixth sector hazard
  (`SentryConeEntity`), and the physics-math claim fixed 2026-09-30; left: modules the README's architecture list
  still omits (`ChunkManager.js`, `ChunkWorker.js`, `PaintballSystem.js`, the `src/ui/` tuners). Found during P1-01,
  2026-09-30
- [x] P1-05 Syntax check for every module: a test that runs `node --check` over each `.js` file in `src/`,
  `lore-editor/js/`, and the root scripts. Needs P1-03. 2026-09-30
- [x] P1-06 Static import check: every name a module calls from a sibling module's exports is actually imported.
  Would have caught the v1.5.6 entity `ReferenceError`s (`isRayPathBlocked`, `resolveEntityLocomotion`). A
  lightweight scan of export and import lines is enough; no linter dependency. Needs P1-03.
  2026-09-30
- [x] P1-07 Registry tests: every file in `src/world/blueprints/` is registered in `StructuralBlueprints.js`;
  registered `prob` values sum to `1.0000` (±0.0001); every sector in `SectorBlueprints.js` has a `Sectors.js` entry
  and a `data/lore.json` pool; every `EntityManager` key is a real sector ID. Needs P1-03. 2026-09-30
- [x] P1-08 Narrative data tests: `data/*.json` parse; every `data/factory/` file has the same top-level shape as its
  live counterpart; every sector pool has at least one entry of each document type its generator places (the
  v1.5.6 Impound clipboard bug). Needs P1-03. 2026-09-30
- [x] P1-09 Server tests: start `engine_server.js` on a spare `PORT`, check that `/` serves `index.html`, that a
  `../` path is refused with 403, and that `/export` refuses a name escaping `assets/textures/`. Needs P1-03.
  2026-09-30
- [x] P1-10 Run `npm test` and `python3 tools/check_docs.py` on every push with a GitHub Actions workflow
  (`aedmark/level0engine`). Needs P1-03 and maintainer approval to add CI. 2026-09-30. Reopened 2026-10-28; resolved
  2026-10-28 by adding `npm ci` and `npx playwright install --with-deps chromium` to `.github/workflows/ci.yml` so
  fresh runner environments have Playwright and headless Chromium installed.

## Phase 2: Engine and world

Goal: make sector behaviour data-driven instead of scattered, and prove the world is reproducible from its seed.
Drafted 2026-09-30 from the code and changelog; confirmed by the maintainer the same day (Q-001).

- [x] P2-01 Move per-sector special cases into `Sectors.js` flags. `ChunkManager.js` hardcodes sector-ID lists for
  ceiling height, void ceilings, hallway floors and ceilings (around lines 383–520), `Anomaly.js` hardcodes its
  forbidden-sector list, and `PlayerController.js`, `Mixer.js`, `AtmosphereManager.js` and `main.js` special-case
  `ACME`. Adding a sector today means finding all of them. Done when a new sector needs only its generator and its
  `Sectors.js` entry, and P1-07 checks the flags. 2026-09-30
- [x] P2-02 Seed reproducibility test: generate the same chunks twice from one seed (via `ChunkWorker` and the
  sector matrix, headless) and compare a layout fingerprint. Then list and remove any `Math.random()` that affects
  layout rather than cosmetics (candidates: `ChunkManager.js` sector-matrix lookup, `buildBreakerPodium`'s default
  `random`). Needs P1-03. 2026-09-30
- [x] P2-03 Decide on `aoMap`: v1.5.7 found it probably inert because no geometry sets `uv2`. Either add `uv2` where
  AO matters and verify it visibly, or remove the dead `aoMap` wiring. 2026-09-30
- [x] P2-04 `Duct.js` arch-hall border tiling, deliberately skipped in v1.5.7 because ducts are built from 8–10
  pieces per branch. Only if the seam is noticed in play. 2026-09-30
- [x] P2-05 Firefox hitching budget: measured shader-link stalls via headless profile across a fixed seed and 5 distinct sector warps. Chromium uses `KHR_parallel_shader_compile` natively (0ms stall). Firefox falls back to blocking links, but `ShaderWarmup.js` caps this at 4 links per frame. Total Firefox blocking time was ~25.7ms across 127 variations spread over 50 frame boundaries (averaging ~0.5ms stall per frame). This easily hides within the 16.6ms frame budget, so no additional blast-door prewarming is needed. 2026-09-30
- [x] P2-06 Split `ChunkManager.js`: it owns streaming, cell building, zone bounds, lighting spawns and the
  airlock-apron checks. Extract along those lines once P2-01 has removed the sector special cases, with P2-02 as the
  safety net. 2026-09-30

## Phase 3: Narrative and content

Goal: every seed tells a complete, solvable case, and authors can see that before a player does.
Drafted 2026-09-30 from the code and changelog; confirmed by the maintainer the same day (Q-001).

- [x] P3-01 Solvability sweep: for a few hundred seeds, deal the case with `StoryEngine` headlessly and check that the
  tell is seeded into five sectors, each lock leg (rule, year, pen) has sources in three or more sectors, and no
  thread depends on a sector that seed never places. Needs P1-03. 2026-09-30
- [x] P3-02 Measure the Assembled Lock odds the README states (all three legs in three random sectors "roughly 44%")
  with the P3-01 sweep, and correct the README or the dealing to match. 2026-09-30
- [x] P3-03 Coverage report in the Lore Editor: per sector and document type, how many entries exist against how
  many the generators can place, so authors see when pickups will fall back to generic text. 2026-09-30
- [x] P3-04 Lore Editor validation: refuse to save an entry whose conditions reference an unknown thread, variable or
  sector, using the same `jsep` parse the game uses. 2026-09-30
- [x] P3-05 Deepen the thinnest sector pools. `data/lore.json` has 3 entries each for Incinerator, Checkpoint and
  Maintenance, against 7–8 for Clinic and Exit (counted 2026-09-30). Aim for at least 5 per sector, prioritised by the
  P3-03 report. 2026-09-30

## Phase 4: Quality: speed, robustness, browser parity

- [x] P4-01 Headless boot smoke test: load `engine.html` in headless Chromium, start a new game, walk a scripted path
  through each sector with Sector Warp, and fail on any console error. Needs Playwright as a dev dependency
  (maintainer approval). Found during P1-01, 2026-09-30
- [x] P4-02 Frame-time budget in the smoke test: record frame times on a fixed seed and route and fail on a large
  regression against a stored baseline. Needs P4-01. 2026-09-30
- [x] P4-03 Complete and keep verifying the Manifold Codex: `manual/codex.html` outlines 63 systems and all 63 now
  have complete What/How/Why entries (14 sectors, 30 blueprints, 8 entities, 4 tools, 7 tuners). Written and verified
  against `Sectors.js`, `StructuralBlueprints.js`, `EntityManager.js`, and respective source modules. All 112 internal
  anchor links resolve, sidebar navigation and category badges reflect 63 of 63, and static builds bundle cleanly. 2026-10-28
- [x] P4-04 Source-verify the documentation that already claims to be factual. Verified claim by claim across `manual/index.html`
  (31 sections and 4 appendices), `manual/codex.html`, and `README.md`. Corrected hallucinated file paths (`ShellVolumeRegistry.js`,
  `DoorwayPlacement.js`, `ExitTerminal.js`, `JournalUI.js`, `SettingsPanel.js`, `variables.json`), corrected sector entity
  assignments (The Claw to Atrium, Sentry Cone to Maintenance, added Incinerator Entity), corrected Surge Breakers wiring
  (removed SettlingField, referenced `BreakerPodium.js`), corrected Anomaly freeze conditions (dot > 0.85 within 25m),
  corrected blueprint badges and methods (`ArchHall.js` 0.0000, `CrawlspaceDuct.js` 0.0749, removed fictional `createArchMesh`),
  and replaced fictional schemas in Appendices C and D with real `Sectors.js` and `SaveManager.js` data models. Enhanced
  `tools/check_docs.py` to assert that all `src/` files and method calls in manual pages exist in `src/`. 2026-10-28

## Phase 5: Shareable runs and streaming

Goal: a seed is a run anyone can replay, share and watch, and the game gives streamers and their chat something to do
together. Drafted 2026-11-07 from a conversation with the maintainer about streamer appeal; P2-02 and D-008 made the
run salt and breaker hunt seed-derived first.

- [x] P5-01 Chunks independent of player position and build order. v1.5.8.13: breaker and POI suppression measure from
  the seed spawn (`env._seedSpawn`) instead of the live camera; every Annex rolls its own locked room instead of the
  first one built; and base maze chunks derive neighbouring sector airlocks (`AirlockLayout.js`, `airlocksNear()`)
  instead of reading `env.airlocks`, which only held sectors already built. Chosen over carving the apron after the
  fact because airlocks sit at a fixed cross-cell on every side of every sector chunk, so derivation is exact.
  Evidence: in Chromium on seed `7♠|K♥|2♣|9♦|A♠`, in-place rebuilds from (6, 6), (70, 40) and (6, -60) gave identical
  meshes in every chunk loaded in both runs, including `0,0` and `0,-1` beside the sector at `-1,0`; derived airlocks
  equal the built ones on four seeds including an Atrium. `test/p2_02_reproducibility.test.js` guards the pieces.
  Not covered: a headless chunk fingerprint test (the builder needs WebGL); the exit-phase `dynamicExitHash` is still
  first-come by design. Found 2026-11-07 while verifying D-008; done 2026-11-07.
- [x] P5-02 "Rebuild Geometry" restores the seed-default world around the player. The button now calls
  `generate({inPlace: true})`: position and facing kept (safe-spawn nudges only out of geometry; (70, 40) moved to
  (66, 36) in the test above), coherence untouched, breaker-hunt stream and exit-phase exit chunk kept on an unchanged
  seed; objectives and inventory were never reset by `generate()`. Boot, death, Inquest and ascension unchanged. With
  P5-01 the rebuilt geometry matches the seed default. Maintainer request and choice ("world only, keep progress"),
  2026-11-07
- [x] P5-03 Shareable seed cards and a daily seed. v1.5.8.14: `?seed=` on `terminal.html` and `engine.html`,
  `?seed=daily` (a five-card hand dealt from the UTC date), a link-aware continue prompt, a pause-menu Copy Link
  button that shares the run's starting seed, and a seed field plus Today's Seed button on the landing page.
  Evidence: `test/p5_03_seed_link.test.js`; in the desktop app's Chromium pane, the landing form opened
  `terminal.html?seed=...` and the frame received it, the prompt named the linked seed when another save existed,
  Continue resumed the save and removed `?seed` from both URLs, `?seed=daily` with no save started `3♦|4♦|4♣|A♥|9♣`
  on 2026-11-07, and a real click on Copy Link produced the right link through the prompt fallback (that pane refuses
  clipboard access). Not verified: the clipboard success path in a normal browser tab, Firefox, the purge path with a
  link (skipped so as not to wipe the pane's saved game and cached assets), and itch.io embedding. 2026-11-07
- [x] P5-04 Time to first scare, and a better opening. Measured 2026-11-07 in the desktop app's Chromium pane on seed
  `7♠|K♥|2♣|9♦|A♠`: load to control took about 2.7 s (pre-engine 0.13 s, seven boot phases 1.8 s, fade 0.8 s), so boot
  is not the problem. The first minutes were: a pitch-black first-run car, a softlockable charge gate, and no
  guaranteed threat until a 90 s grace that started at world generation. v1.5.8.16 adds `OpeningDirector` with five
  beats: arrival, a seeded corridor sighting, the objective reveal with a first podium 28-56 m away, grace held to the
  doorway, and timing marks (D-010). Evidence: `test/p5_04_opening.test.js`; in the pane, a first run logged door +5.0 s,
  exit +5.2 s and a sighting 13.5 m down a corridor near the car (screenshot taken). The cut then hid the Anomaly. The
  signal read 27.8 m to the first podium, and restoring it moved the hunt to POIs. A returning run kept the code lock,
  held grace at 90 and hid the objective. Not verified: real human timings (the exit was teleported and the first
  threat forced), the look of the sighting at full size (the pane was hidden and small), how often a seed has no
  qualifying corridor, and Firefox. Smoke test (`p4_01_smoke`): no console errors, but the performance budget failed
  on a loaded desktop (load average about 13). The previous commit 1.5.8.15 failed the same way, side by side at about
  the same load, and its per-sector generation times were within about 15% of this build (IMPOUND 45.3 s against 45.2 s,
  EXIT 63.5 s against 66.5 s), so this change is not the cause. The budget needs a quiet machine. 2026-11-08
- [x] P5-05 Streamer mode. v1.5.8.19: an OBS-friendly seed and chat panel, chat votes on the Inquest (the streamer
  files chat's finding with key 4), and `!blackout` and `!lure` events gated by distinct viewers, a cooldown and game
  vetoes (D-011). The chat connection is anonymous and read-only (Twitch IRC WebSocket), chosen by the maintainer
  2026-11-08 over signed-in EventSub, Predictions and bot bridges. Security note in `docs/SECURITY.md`. Evidence:
  `test/p5_05_chat.test.js`; in the desktop app's Chromium pane, the game connected to a live public channel (2 real
  messages in 6 s, panel and menu showing LIVE, setting saved). Injected messages then produced a correct tally that
  ignored non-commands, key 4 filed finding [2], a blackout fired at 3 viewers and started the cooldown, and a lure
  waited out the Anomaly's grace before sending it searching (last-known position 3.1 m away). Not verified: a real
  stream with real viewers voting, and Firefox. 2026-11-08
- [ ] P5-06 Ghost runs: record position every 250 ms against the seed and replay other runs as a translucent figure.
  Needs P5-01 so the world matches. 2026-11-07
- [ ] P5-07 Real-time co-op spike: peers share only the seed; one host simulates entities. `EntityManager`, the Anomaly
  and the hazards assume one `player`/`camera` (about 65 references in `src/entities`), so scope the work before
  committing to it. Any networking library needs maintainer approval. Do last, and only if P5-03 to P5-06 get
  traction. 2026-11-07
- [x] P5-08 Spent breakers come back when their chunk rebuilds. On inspection the reverse was true: objective podiums
  are planted once (a `spawned` flag), so a chunk that streamed out or was rebuilt came back without its podium, and
  the POI signal pointed at bare floor for the rest of the run, the opening's first breaker included. Nothing could
  count twice. v1.5.8.18 records every podium for the run (`env._podiumRecords`) and restores it, spent or not, on
  chunk build. Evidence in the desktop app's Chromium pane on seed `7♠|K♥|2♣|9♦|A♠`: the opening podium at cell
  (0, 9) vanished with chunk `0,0` at 330 m away, returned as a rebuilt object that the signal retargeted (27.8 m).
  After restoring it, it came back spent, with the count still 1 and a rescan refused. It survived Rebuild Geometry,
  and a seed change cleared the records. Found 2026-11-07 while scoping P5-02; fixed 2026-11-08.
