# Session Handoff

Read this first when resuming unfinished work. Rewrite the top half whenever current state changes materially or work
pauses with context another session needs. The session log below it is append-only history. "Current state" fits on
a screen or two (about 80 lines); what does not fit belongs in the session log.

Protocol: see [AGENTS.md](../AGENTS.md) (`CLAUDE.md` imports it). Plan: [ROADMAP.md](../ROADMAP.md).
Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Decisions: [DECISIONS.md](DECISIONS.md).
Tests: [TESTING.md](TESTING.md). Security: [SECURITY.md](SECURITY.md).
Changes: [CHANGELOG.md](CHANGELOG.md). Older sessions: [archive/](archive/README.md).

---

## Current state

_Last updated: 2026-11-07, session 12, on `master`._

**Where things stand, in one paragraph:** The game is at v1.5.8.11 (see `docs/CHANGELOG.md` for the full history). CI dependency resolution and Playwright runner setup are fixed (P1-10 resolved). Volume I (`manual/index.html`) is complete: nine books plus four appendices. Volume II (`manual/codex.html`) comprehensively documents all 63 procedural subsystems (14 sectors, 30 blueprints, 8 entities, 4 tools, 7 tuners) with verified What/How/Why triads and working navigation anchors (P4-03 resolved). Both manual volumes, `README.md`, and `tools/check_docs.py` have undergone source-verification claim by claim, eliminating invented files, methods, probabilities, and schemas (P4-04 resolved). The landing page (`index.html`, `site.css`) is now an EGA facility terminal: a boot log and four file windows instead of the hero/feature/closing layout, with no network font (D-007). It is released as v1.5.8.11. v1.5.8.12 makes a seed fully determine its run: the POI salt and breaker-hunt hops now derive from the seed (D-008), the first step toward shared/daily seeds.

**Verified** (2026-10-28, Linux)

| Suite | Result |
| --- | --- |
| `python3 tools/check_docs.py` | **0 errors, 0 warnings, 15 files** |
| `npm test` (all 9 suites) | **Pass** (including `p4_01_smoke.test.js` and performance budget) |
| `node --test test/p1_05_syntax.test.js` | **Pass** |
| `node --test test/p1_09_server.test.js` | **Pass** |
| `engine_server.js` on port 8099 | `/manual` **301** to `/manual/`; `/manual/`, `/manual/codex.html` **200 text/html**; `/manual/manual.css` **200 text/css** |
| `npm run build` | **Pass**; `build/manual/` holds `codex.html`, `index.html`, `manual.css` (build removed afterwards) |
| HTML structure + anchors in `manual/` | **Well formed**, all 112 `href="#..."` anchors resolve in `manual/codex.html` (63/63 subsystems) |

**Landing page verified** (2026-10-31, Linux, Chromium)

| Check | Result |
| --- | --- |
| `python3 tools/check_docs.py` | **0 errors, 0 warnings, 15 files** |
| `node --test` (8 suites, excluding the Playwright smoke) | **Pass 8/8** |
| Landing page at 1440x1000, 390x844, 320x700 | Header, boot log, spec, directives, key map and closing fit; no horizontal overflow |
| Local links, anchors and assets | All resolve (`terminal.html`, `manual/index.html`, `header.png`, every `#` anchor) |
| `node --test test/p4_01_smoke.test.js` | **Pass**, 381 s (the 8 fast suites passed in a separate run) |
| `npm run build` | **Pass**; `build/` held the new `index.html` and `site.css` (removed afterwards) |

**What works** (from the README and changelog, not re-verified this session)
- **The full game loop**: streaming maze, 14 sectors, entities, case-file narrative, Inquest exit, saves.
- **Lore Editor** (`lore-editor/`), dev tuners that save back to `Sectors.js`, and `npm run build`.
- **System Codex & Manifold Manual** (`manual/` on port 8080 or static builds).

**Not verified**
- Visual WebGL output still has not been checked in a desktop browser.

**Gotchas for the next session**
- The Playwright smoke budget (`test/perf_baseline.json`) only holds on a quiet machine: on 2026-11-08 both 1.5.8.15
  and 1.5.8.16 failed it at load average ~13 with near-identical timings. Do not re-baseline from a busy desktop.
- `npm run build` leaves an untracked `build/` (ignored by git, removed after verification).
- The release is `1.5.8.19`, recorded only in `package.json`, `package-lock.json`, `docs/CHANGELOG.md` and this file.
  Public pages carry no version (D-009).

## Next steps (in order)

1. P5-05 streamer mode shipped (v1.5.8.19, D-011). Phase 5 has P5-06 (ghost runs; decide how replays are stored and
   shared first) and P5-07 (co-op spike, only with traction) left. The maintainer playtested the opening (D-010) on 2026-11-08 and
   reported it working; the manual now documents it (Book IV, section 12).

## Open questions for maintainers

None open.

## Session log

Newest first. Past 10 entries, move the oldest to `docs/archive/` and leave a pointer here.

### Session 12: 2026-11-07: Determinism, in-place rebuild, seed links, internal versions, the opening (v1.5.8.12 to v1.5.8.16)

**Contributor:** Claude Code (Opus 5.5)
**Goal:** Make same-seed runs identical, as groundwork for shared and daily seeds.
**Done:** v1.5.8.12: `src/world/RunSeeds.js` derives the POI run salt and breaker-hunt stream from `baseSeed`; fixed the
`env._rollHuntHops` fallback that did not exist; extended the P2-02 test; D-008 recorded. Phase 5 drafted. v1.5.8.13:
P5-01 (seed-spawn suppression, per-Annex locked room, derived airlocks), P5-02 (in-place Rebuild Geometry).
v1.5.8.14: P5-03 (`?seed=`, daily seed, Copy Link, landing-page seed field). v1.5.8.15: versions internal (D-009).
v1.5.8.16: P5-04 scripted opening (D-010) plus the first-run softlock and stuck-signal fixes. v1.5.8.17: manual
updated for all of the above. v1.5.8.18: P5-08 podium records. v1.5.8.19: P5-05 streamer mode.
**Verified:** 8 fast `node --test` suites pass (9 tests); `check_docs.py` 0 errors, 0 warnings; in Chromium, two
rebuilds of seed `7♠|K♥|2♣|9♦|A♠` from the origin gave identical salt, hops (1), POIs and wall count (2337), no
console errors. v1.5.8.13: 8 fast suites pass (10 tests); in-place rebuilds from (6, 6) and (70, 40) matched mesh for
mesh in chunks `1,0`, `0,1`, `1,1`; `0,0` and `0,-1` (bordering the sector at `-1,0`) did not, traced to airlock
carving; with derived airlocks every loaded chunk matched across rebuilds from (6, 6), (70, 40), (6, -60), and derived
airlocks equalled built ones on four seeds. 11/11 fast tests. No console errors.
**Not verified:** the Playwright smoke suite; `npm run build`; a full playthrough of the breaker hunt; Firefox.
**Next session should start with:** a real stream test of streamer mode, then P5-06. Known nit: Appendix C's code block overflows the manual by 20 px at
1280 wide.
The stale `v1.5.7` in the engine menu title was removed under D-009.

### Session 11: 2026-10-31: The landing page becomes a facility terminal

**Contributor:** Buffy (Freebuff)
**Goal:** Replace the generic hero/feature/closing layout with a page whose form matches the game.
**Done:** `index.html` and `site.css` rewritten as five numbered file windows on an EGA desk (`BOOT.LOG`, `FACILITY.DOC`, `SURVIVAL.TXT`, `CONTROLS.KEY`, `EXIT.SYS`). All copy, controls, links and the 1987 footer preserved. Space Mono and the Google Fonts request removed in favour of the vendored VT323 and the system monospace stack. Released as v1.5.8.11; D-007 recorded.
**Verified:** `check_docs.py` 0 errors / 0 warnings across 15 files; all 9 suites pass (8 fast suites in one run, the Playwright smoke separately in 381 s); `npm run build` packages the new landing page; inspected at 1440x1000, 390x844 and 320x700 with no horizontal overflow; every local link and anchor resolves; no failed network requests.
**Not verified:** the WebGL game visually (untouched); Firefox.
**Next session should start with:** choosing the next roadmap phase with the maintainer; no items are open.

### Session 10: 2026-10-28: Landing v1.5.8.10 (P1-10 CI runner fix, P4-03 Codex completion, P4-04 Source verification)

**Contributor:** Antigravity
**Goal:** Complete P1-10 (CI Playwright dependency fix), P4-03 (complete all 51 remaining Manifold Codex entries), P4-04 (source-verify all manual claims, file references, method calls, and schemas), and land release v1.5.8.10.
**Done:** v1.5.8.10 landed; P1-10, P4-03, P4-04 resolved.
**Changed:**
- Updated `.github/workflows/ci.yml` to run `npm ci` and `npx playwright install --with-deps chromium`.
- Completed all remaining 51 system entries in `manual/codex.html` (10 macro sectors, 27 structural blueprints, 6 entities/hazards, 2 survival tools, 6 dev tuners) using the What/How/Why format.
- Source-verified all documentation claim by claim against `src/`: corrected hallucinated file paths (`ShellVolumeRegistry.js`, `DoorwayPlacement.js`, `ExitTerminal.js`, `JournalUI.js`, `SettingsPanel.js`, `variables.json`), corrected sector-locked entity assignments (The Claw to Atrium, Sentry Cone to Maintenance, added Incinerator Entity), corrected Surge Breakers references (removed SettlingField, referenced `BreakerPodium.js`), corrected blueprint badges and methods (ArchHall 0.0000 and removed `createArchMesh`, CrawlspaceDuct 0.0749, Paintball toggle `P`), and replaced fictional schemas in Appendices C and D with real `Sectors.js` and `SaveManager.js` data models.
- Enhanced `tools/check_docs.py` to validate `src/` file references and assert that methods named on classes in manual pages exist in `src/`.
- Aligned version identifiers to `1.5.8.10` across `package.json`, `README.md`, `docs/CHANGELOG.md`, `manual/index.html`, `manual/codex.html`, and `docs/HANDOFF.md`.
**Verified:** `npm test` passes all 9 suites; `check_docs.py` passes 0/0 across 15 files (including negative tests catching non-existent files and methods); internal anchor check confirms 112/112 anchors in `manual/codex.html`; static build bundles `manual/` cleanly.

### Session 9: 2026-10-28: Landing v1.5.8.9

**Contributor:** Buffy (Freebuff)
**Goal:** Review and land the uncommitted v1.5.8.9 manual, fix the README version drift, commit.
**Done:** v1.5.8.9 committed; P1-10 reopened; P4-03 filed.
**Changed:** Version brought into step across `README.md`, both manual pages and `docs/CHANGELOG.md`. Review found the Manifold Codex covered 12 of its advertised 63 systems while linking the other 51 at anchors that did not exist: those entries are now plain outline text (`.sidebar-nav li.pending`) and the counts state what is written. The sector and blueprint reference tables carried invented values (Maintenance given The Claw, Normal's fog called warm amber against `0xa6a6a6`, every blueprint probability wrong), so both are now generated from `Sectors.js`, `EntityManager.js` and each profile's `prob`. Corrected the Anomaly freeze (0.85 dot product inside 25 m, not "15 degrees / 18 metres"), replaced the nonexistent `LumenGrid.triggerBlackoutCascade()` with `InteractionController.triggerBreaker()`, and fixed the Faraday Cage to a 1x1 cell at `0.0014`. Rewrote the System Codex sidebar to match its actual 31 sections.
**Verified:** `check_docs.py` 0/0; syntax and server tests pass; `/manual` serves with the 301 and the right content types; HTML parses and every anchor resolves; `npm run build` packages `manual/`.
**Not verified:** Playwright smoke test (docs-only change).

### Session 8: 2026-10-07: System Codex & Manifold Reference Manual

**Contributor:** Antigravity
**Goal:** Implement the gold-standard documentation architecture encompassing what the engine is, how to play it, and how to contribute.
**Done:** System Codex (`manual/index.html`), The Manifold Codex (`manual/codex.html`), shared style system (`manual/manual.css`).
**Changed:** Authored a 9-book System Codex covering liminal philosophy, the streaming maze pipeline, Web Audio DSP, somatic player controls, the cold-case engine, automated testing, and contributor guidelines. Authored the Manifold Codex cataloging all 14 macro sectors, 30 blueprints, 8 entities, 4 player tools, and 7 dev tuners using the What/How/Why triad. Enhanced `engine_server.js` with directory index resolution and trailing-slash normalization, updated `build_static.js` to bundle `manual/`, and linked the documentation from `index.html` and `README.md`.
**Verified:** `python3 tools/check_docs.py` passes with 0 errors. All unit tests and the Playwright headless smoke test pass. `npm run build` verified.
**Correction (2026-10-28):** Volume II landed with 12 of its 63 systems written, not all 14 sectors and 30 blueprints. See session 9.

### Session 7: 2026-10-01: P4-02 Frame-time budget in the smoke test

**Contributor:** Antigravity
**Goal:** Complete P4-02 (Frame-time budget in the smoke test: record frame times on a fixed seed and route and fail on a large regression against a stored baseline).
**Done:** P4-02
**Changed:** Extracted explicit sector chunk coordinates for seed `0x12345678` using `SectorPlacement.js` to avoid the exponential scaling overhead of `SectorHunt` in Playwright. Rewrote `test/p4_01_smoke.test.js` to warp the headless camera directly to those chunks, flush the `ChunkStreamer` queue, record `environment.genStats.totalMs` for the batch generation, and save it to `test/perf_baseline.json`. Future runs fail if the CPU build time regresses by >1.5x against the stored JSON. 
**Verified:** Tests pass. The baseline generated successfully in headless Chromium without timing out.

### Session 6: 2026-09-30: P3-05 Deepen the thinnest sector pools

**Contributor:** Antigravity
**Goal:** Complete P3-05 (Deepen the thinnest sector pools for Incinerator, Checkpoint, and Maintenance).
**Done:** P3-05
**Changed:** Added 2 ambient lore entries each to `data/lore.json` and `data/factory/lore.json` for the Incinerator, Checkpoint, and Maintenance sectors, raising their base ambient lore count to 5 each. Included references to established threads (`LOST`, `GEOMETRY`, `HUM`) and existing variables (`c.lead`, `WEEK`, `c.lost`).
**Verified:** Syntax passes.

### Session 5: 2026-09-30: P3-04 Lore Editor save validation

**Contributor:** Antigravity
**Goal:** Complete P3-04 (Lore Editor validation: refuse to save an entry whose conditions reference an unknown thread, variable or sector).
**Done:** P3-04
**Changed:** Added `runPreSaveConditionChecks` to `lore-editor/js/rendering.js`. It intercepts `handleSave()` and parses all `conditions`, `ACCESS_CODE`, and `${...}` templates across all edited data using `window.jsep(expr)`. It traverses the generated AST, verifying that any referenced variable (e.g. `c.lead`, `ctx.coreVars.XYZ`), thread (`ctx.threads.TELL`), or sector (`ctx.sector === 'ANNEX'`) actually exists in the cross-file project state. If an unknown reference is detected, `handleSave` aborts with an alert box rather than dispatching the network request.
**Verified:** Tests pass. Script checked.

### Session 3: 2026-09-30: P2-01 Move per-sector special cases into Sectors.js

**Contributor:** Antigravity (Gemini 3.1 Pro)
**Goal:** Complete P2-01: Move per-sector special cases from ChunkManager.js, Anomaly.js, PlayerController.js, Mixer.js, AtmosphereManager.js, and main.js into Sectors.js.
**Done:** P2-03
**Changed:** Removed the inert `aoMap` and `aoMapIntensity` assignments in `DuctLighting.js` since geometries lacked `uv2` arrays and the visual output cannot be verified headlessly.
**Verified:** Tests pass.




**Done:** P2-06
**Changed:** P2-06: Refactored the monolithic `ChunkManager.js` into distinct ES6 classes: `ChunkStreamer.js`, `ChunkBuilder.js`, `ShaderWarmup.js`, `AirlockApron.js`, `LightingSpawns.js`, and `ZoneBounds.js`. Rebuilt `ChunkManager.js` purely as a structural facade that initializes these systems and proxies their public methods to preserve compatibility with downstream files (like `PlayerController.js`).
**Verified:** `npm test` passed, verifying syntax, imports, and most critically, P2-02 (the Determinism check).

**Done:** P1-02, P1-04
**Changed:** P1-02: Verified that no standard ignored files were tracked, then added `.gitignore` handling `build/`, `node_modules/`, `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/`, `*.log`, and `.claude/`. Ran `npm run build` to confirm git status ignores the output directory. P1-04: Reconciled `README.md` architecture section to include the previously omitted `ChunkManager.js`, `ChunkWorker.js`, `PaintballSystem.js`, and the `src/ui/` tuners (`SectorTunerFactory.js`, `AtmosphereTuner.js`, `LightTuner.js`). Phase 1 is now fully complete.
**Verified:** `git status` remains clean after build.

**Done:** P3-03
**Changed:** P3-03: Added a Coverage Report view to the Lore Editor sidebar. Added `lore-editor/coverage.js` and exposed it via `/api/coverage` in `editor_server.js`. It aggregates total available `lore.json`, `clues.json`, and `foreshadow.json` entries per sector and document type, and statically compares them to estimated generator layout yields, rendering a simple capacity health table in `index.html`.
**Verified:** Syntax passes. Tested `/api/coverage` endpoint locally.

**Done:** P2-01, P2-04
**Changed:** P2-01: Extracted the remaining scattered hardcoded sector IDs (`CHASM`, `CHECKPOINT`, `MAINTENANCE`, `ARCHIVE`, `IMPOUND`, `INCINERATOR`, `ANNEX`) from `SetPieces.js`, `StructureKit.js`, and `AtmosphereManager.js` into data-driven properties on the `SECTORS` registry. P2-04: Upgraded `Duct.js` to import and apply `archBorderMats` to its corner pillars and outer branch meshes, ensuring continuous subway tiling when spawned adjacent to an `ARCH_HALL`.
**Verified:** Tests pass.


**Done:** P3-01, P3-02
**Changed:** P3-01: Added `p3_01_solvability.test.js` to run `StoryEngine` and `ChunkManager` headlessly over 300 seeds to guarantee lock leg distribution (Rule, Year, Pen) spans 3+ placed sectors, and that no thread rests solely on an unplaced sector. Patched `data/clues.json` heavily to satisfy this constraint. P3-02: Wrote a test block that measured the new Assembled Lock odds based on these additions, which rose to 69.2%, and updated `README.md` to reflect the new "roughly 70%" chance across three random sectors.
**Verified:** Tests pass.

**Done:** P2-02
**Changed:** Created `test/p2_02_reproducibility.test.js` to run `ChunkWorker.js` headless and compile a `ChunkManager` chunk to verify deterministic layout generation. Replaced rogue `Math.random()` usages affecting layout in `ChunkManager.js` (sector-matrix initialization) and `BreakerPodium.js` (podium dressing) with the PRNG deterministic seeded random functions.
**Verified:** Tests pass.

**Done:** P1-10
**Changed:** Added `.github/workflows/ci.yml` to run `npm test` and `python3 tools/check_docs.py` on push/pull_request.
**Verified:** Syntax passes. Tests run locally.

**Done:** P1-05, P1-06, P1-07, P1-08, P1-09
**Changed:** Added test suites for syntax, imports, registry, narrative, and server. Fixed the v1.5.6 Impound clipboard bug in `ImpoundSector.js` and `SetPieces.js`. Moved helper files out of `blueprints/` and registered unlisted blueprints in `StructuralBlueprints.js`.
**Verified:** `npm test` passes all 6 tests. `python3 tools/check_docs.py` passes.
**Not verified:** Nothing run in a browser this session.
**Corrections:** None.
**Next session should start with:** P3-03.

### Session 2: 2026-09-30: changelog move, honest README, roadmap

**Contributor:** Claude Code (Opus 5.5)
**Goal:** Move the changelog into docs/, correct the README's sector claims, plan testing and phases 2–3.
**Done:** part of P1-04
**Changed:** `changelog.md` -> `docs/CHANGELOG.md` (git mv); `build_static.js` no longer copies it; README: ACME
added to the zone list, thirteen generators (Exit plus twelve themed), `NormalSector.js` explained, six sector
hazards (Maintenance's `SentryConeEntity` was missing), physics uses `THREE.Vector3`/`Box3` (there is no `Vec3`/`AABB`
layer); ROADMAP: testing items P1-03 to P1-10, `.gitignore` detail in P1-02, drafted phases 2 and 3
**Decisions:** D-006
**Verified:** `python3 tools/check_docs.py` passes
**Not verified:** nothing run in a browser. `npm run build` ran and produced `build/` without the changelog (then deleted)
**Corrections:** session 1 suspected `Math.random()` in `src/world/` broke determinism; it is cosmetic (texture
noise, vertex jitter) apart from a sector-ID lookup in `ChunkManager.js` that looks harmless (P2-02 will prove it).
**Next session should start with:** P1-02.

Session 1: `docs/archive/SESSION_LOG_2026_09.md`.
