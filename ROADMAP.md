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
  (`aedmark/level0engine`). Needs P1-03 and maintainer approval to add CI. 2026-09-30

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
- [ ] P2-05 Firefox hitching budget: measure shader-link stalls with the Debug HUD on a fixed seed and route in
  Chromium vs. Firefox, then see whether more warmup in `ShaderWarmup.js`/`LazyMaterialWarmup.js` before a zone's
  blast door opens hides them. Record the numbers either way. 2026-09-30
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
- [ ] P3-04 Lore Editor validation: refuse to save an entry whose conditions reference an unknown thread, variable or
  sector, using the same `jsep` parse the game uses. 2026-09-30
- [ ] P3-05 Deepen the thinnest sector pools. `data/lore.json` has 3 entries each for Incinerator, Checkpoint and
  Maintenance, against 7–8 for Clinic and Exit (counted 2026-09-30). Aim for at least 5 per sector, prioritised by the
  P3-03 report. 2026-09-30

## Phase 4: Quality: speed, robustness, browser parity

- [ ] P4-01 Headless boot smoke test: load `engine.html` in headless Chromium, start a new game, walk a scripted path
  through each sector with Sector Warp, and fail on any console error. Needs Playwright as a dev dependency
  (maintainer approval). Found during P1-01, 2026-09-30
- [ ] P4-02 Frame-time budget in the smoke test: record frame times on a fixed seed and route and fail on a large
  regression against a stored baseline. Needs P4-01. 2026-09-30
