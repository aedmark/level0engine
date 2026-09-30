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

_Last updated: 2026-09-30, session 3, on `master` after P2-02 (Seed reproducibility test) changes._

**Where things stand, in one paragraph:** The game is at v1.5.7.2 (see `docs/CHANGELOG.md` for the full history). Session 3 moved sector hardcodes into Sectors.js flags (P2-01). Sessions 1–2 changed documentation plus one line of `build_static.js` (it no longer copies the changelog). Tests are now available via `npm test` which runs `node:test`.

**Verified** (2026-09-30, Linux)

| Suite | Result |
| --- | --- |
| `python3 tools/check_docs.py` | **0 errors** |
| `npm test` | **Pass (7 tests)** |

**What works** (from the README and changelog, not re-verified this session)
- **The full game loop**: streaming maze, 12+ sectors, entities, case-file narrative, Inquest exit, saves.
- **Lore Editor** (`lore-editor/`), dev tuners that save back to `Sectors.js`, and `npm run build`.

**Not verified**
- Nothing was run in a browser this session.

**Gotchas for the next session**
- No `.gitignore`: `npm run build` leaves an untracked `build/` (P1-02).
- `package.json` `version` has three parts; the real version (e.g. 1.5.7.2) is in `docs/CHANGELOG.md` and the README title.

## Next steps (in order)

1. Phase 2 (starting with P2-03 Decide on `aoMap`).

## Open questions for maintainers

None open.

## Session log

Newest first. Past 10 entries, move the oldest to `docs/archive/` and leave a pointer here.

### Session 3: 2026-09-30: P2-01 Move per-sector special cases into Sectors.js

**Contributor:** Antigravity (Gemini 3.1 Pro)
**Goal:** Complete P2-01: Move per-sector special cases from ChunkManager.js, Anomaly.js, PlayerController.js, Mixer.js, AtmosphereManager.js, and main.js into Sectors.js.
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
**Next session should start with:** P2-03.

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

### Session 1: 2026-09-30: adopt the agent documentation scheme

**Contributor:** Claude Code (Opus 5.5)
**Goal:** Retrofit the agent-template documentation scheme onto the existing project.
**Done:** P1-01
**Changed:** added AGENTS.md, CLAUDE.md, ROADMAP.md, docs/*, tools/check_docs.py; removed docs/agent-template/
**Decisions:** D-001 to D-004 recorded retroactively; D-005 added
**Verified:** `python3 tools/check_docs.py` passes
**Not verified:** no code run; architecture claims come from reading the code and README
**Problems / surprises:** the template's checker looked for an AGENTS.md "Layout" section while the template names it
"Repository map"; the checker was changed to match.
**Corrections:** README says twelve sector generators; there are fourteen sector files (P1-04).
**Left undone:** P1-02 to P1-04, P4-01
**Next session should start with:** Q-001, then P1-02.
