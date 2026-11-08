# Session log, September 2026

Moved from `docs/HANDOFF.md` when the log passed 10 entries: session 1 on 2026-11-07, session 2 on 2026-11-08.

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
