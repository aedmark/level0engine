# Decisions

Short, append-only record of choices that a future session might otherwise re-litigate. One entry per decision.
Newest at the bottom. To reverse a decision, add a new entry that supersedes it; the old one keeps its text and only
its status changes ("superseded by D-MMM").

Format:

```
## D-NNN Title  (YYYY-MM-DD, status: proposed | accepted | rejected | superseded by D-MMM)
**Context:** why this came up.
**Decision:** what we chose.
**Alternatives:** what else was considered, and why not.
**Consequences:** what it costs or constrains.
**Review trigger:** an event that should cause reconsideration. Optional.
```

---

## D-001 No build tools; three.js as a vendored global  (2026-09-30, status: accepted, recorded retroactively)
**Context:** Inherited from the project's founding philosophy (README, "Core Philosophy" and "Dependencies").
**Decision:** Plain ES6 modules served as-is; three.js r160 loaded from `r160.js` as the global `THREE`. No bundler,
transpiler, or package-manager runtime dependencies.
**Alternatives:** Vite/webpack with npm three: rejected to keep the zero-build-tool architecture.
**Consequences:** `examples/jsm` add-ons (post-processing, `RectAreaLightUniformsLib`) must be vendored or hand-rolled
(v1.5.6.3 hand-rolled SSAO for this reason). `build_static.js` only adds `modulepreload` links and copies files.

## D-002 Everything procedural, no external media  (2026-09-30, status: accepted, recorded retroactively)
**Context:** README "Core Philosophy".
**Decision:** Geometry, textures and audio are generated at runtime. Static textures in `assets/textures/` exist only
as exported fallbacks of procedural ones.
**Consequences:** Texture work goes through `ProceduralTextureFactory`; audio through Web Audio synthesis.

## D-003 Desktop only  (2026-09-30, status: accepted, recorded retroactively)
**Context:** Touch support was removed in v0.4.7 (README).
**Decision:** Keyboard and mouse with Pointer Lock are the only input surface.

## D-004 Chromium is the reference browser  (2026-09-30, status: accepted, recorded retroactively)
**Context:** README "Browser Support": Firefox is slower for browser-side reasons.
**Decision:** Tune and verify against Chromium; keep Firefox playable.

## D-005 Agent documentation scheme  (2026-09-30, status: accepted)
**Context:** Development happens across many short agent sessions.
**Decision:** Adopt the agent-template layout (AGENTS, ROADMAP, docs/, `tools/check_docs.py`). The changelog was
first kept at the root; D-006 moved it.

## D-006 Changelog lives in docs/  (2026-09-30, status: accepted)
**Context:** D-005 left `changelog.md` at the root because `build_static.js` copied it into the build. The maintainer
confirmed the static build does not need it.
**Decision:** Move it to `docs/CHANGELOG.md` and drop it from `build_static.js`'s copy list.
**Consequences:** The itch.io build no longer contains the changelog. `tools/check_docs.py` scans it.

## Open questions

- **Q-001** ~~Are the proposed goals and order for ROADMAP phases 2 and 3 right?~~ Answered 2026-09-30 by the
  maintainer: yes, goals and order confirmed.
