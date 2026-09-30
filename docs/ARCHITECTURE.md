# Architecture

How Level 0 Engine fits together, for a session that has never seen it. This is the map, not the territory: it names
the parts and the rules between them, and leaves the detail to the code. Update it when the shape changes (a module
added, moved or merged), not for every change inside one. The README's "Architecture" section is the player-facing
tour; this file is the working map.

Why things are this way lives in [DECISIONS.md](DECISIONS.md); this file says *what* is, and points there.

## The shape, in one paragraph

`node engine_server.js` serves the repository on port 8080 with cross-origin-isolation headers. `index.html` boots
into `engine.html`, which loads the vendored `r160.js` (the `THREE` global), `purify.min.js`, and `main.js`. `main.js`
builds the `Environment` (`src/core/Environment.js`), which owns the render loop and wires every subsystem together.
`ChunkManager` streams the Julia-set maze in chunks around the player, offloading layout to `ChunkWorker.js`, and
routes cells through the sector matrix (`Sectors.js`, `SectorBlueprints.js`) and structural blueprints. Textures are
drawn procedurally on canvas (with static fallbacks from `assets/textures/`), audio is synthesised with Web Audio, and
the narrative is dealt from `data/*.json` by `StoryEngine`. Progress persists in `localStorage`. Nothing leaves the
machine.

## Code map

| Area | Where | Entry point | Talks to |
| --- | --- | --- | --- |
| Boot | `main.js`, `src/ui/BootController.js` | `main.js` | Environment, SaveManager |
| Core / render | `src/core/` | `Environment.js`, `RenderEngine.js` | everything |
| World generation | `src/world/` | `ChunkManager.js` | ChunkWorker, sectors, blueprints, StructureKit |
| Sector generators | `src/world/sectors/` | `SectorBlueprints.js` | StructureKit, NarrativeProps |
| Structural blueprints | `src/world/blueprints/` | `StructuralBlueprints.js` (probability matrix) | StructureKit |
| Textures / materials / lights | `src/aesthetics/` | `ProceduralTextureFactory.js`, `MaterialLibrary.js`, `LumenGrid.js` | RenderEngine |
| Entities | `src/entities/` | `EntityManager.js` | HazardUtils, SpatialHashGrid |
| Player | `src/player/` | `PlayerController.js` | SomaticInput, InteractionController |
| Narrative | `src/narrative/` | `StoryEngine.js` | `data/*.json`, CaseFiles |
| Audio | `src/audio/` | `AcousticEngine.js` | Mixer, Foley |
| UI / dev tuners | `src/ui/` | `UIManager.js`; `LightTuner.js`, `AtmosphereTuner.js` | server save endpoints |
| Persistence / events | `src/system/` | `SaveManager.js`, `SomaticController.js` | `localStorage` |
| Lore Editor | `lore-editor/` | `editor_server.js` (port 3000) | `data/`, `data/factory/` |
| Release build | `build_static.js` | `npm run build` | writes `build/` |

## Interfaces and data flow

```text
seed -> Julia-set wall grid (ChunkWorker) -> sector/blueprint selection -> StructureKit meshes -> scene
data/*.json -> StoryEngine (seeded dealing) -> documents stuck to props -> journal / Inquest
dev tuners -> POST /save-light, /save-atmosphere -> rewrite Sectors.js on disk
```

| Interface | Producer | Consumer | Contract / compatibility |
| --- | --- | --- | --- |
| `data/*.json` | Lore Editor, hand edits | `StoryEngine` | Shape defined by the editor; `data/factory/` is the reset baseline |
| `localStorage['level0_state']` | `SaveManager` | `SaveManager` | A backup copy is written to `level0_state_backup` before overwrite |
| `THREE` global | `r160.js` | every module | three.js r160 API; no module imports of `three` |
| `SECTORS` table | `Sectors.js` / `/save-*` endpoints | generators, audio, fog | The server rewrites this file textually |

## Invariants

- `THREE` is a global; no bare `three` imports. Enforced by: nothing (convention; D-001).
- Structural blueprint `prob` values sum to `1.0000`. Enforced by: a runtime console warning in
  `StructuralBlueprints.js`, not a test (P1-03).
- The same seed produces the same layout. Enforced by: nothing yet (P2-02).
- Every zone is sealed by a single blast door on its true boundary, and fog follows the Shell Volume Registry.
  Enforced by: nothing automated.
- Per-frame hot paths do not allocate. Enforced by: nothing automated.

## Boundaries

| Boundary | Comes in as | Checked by | Rule |
| --- | --- | --- | --- |
| Static file requests | URL path | `engine_server.js` path-prefix check | Never serve outside the repo root |
| `/export` texture upload | JSON with base64 image and name | `path.relative` check | Writes only under `assets/textures/` |
| `/save-light`, `/save-atmosphere` | JSON | `saveLight`/`saveAtmosphere` | Rewrites source files; dev-only |
| Lore text in documents | JSON strings | DOMPurify before DOM injection | Never inject unsanitised HTML |
| Editor logic expressions | strings | `jsep` / `src/utils/SafeEval.js` | Never `eval`/`new Function` |

## Dependencies

All vendored as files; nothing is fetched at runtime. A new one needs maintainer approval.

| Dependency | Version | For | Why this one |
| --- | --- | --- | --- |
| three.js | r160 (`r160.js`) | Rendering | D-001 |
| RectAreaLightUniformsLib | r160 (`src/aesthetics/RectAreaLightUniforms.js`) | Ceiling panel area lights | Not in the core bundle |
| jsep | 1.4 (`jsep.min.js`) | Safe expression parsing | Replaces `new Function` |
| DOMPurify | 3.x (`purify.min.js`) | HTML sanitising | XSS protection |
| marked | 18.x (npm, editor) | Markdown in the Lore Editor | |

## State and caches

| What | Where | Written by | Reset by | Committed? |
| --- | --- | --- | --- | --- |
| Save game and settings | browser `localStorage` (`level0_state`, `_backup`) | SaveManager | "Purge Memory" / "Purge & Start New Game" | no |
| Narrative data | `data/*.json` | Lore Editor | editor factory reset (copies `data/factory/`) | yes |
| Exported textures | `assets/textures/` | `/export`, `/export-meta` | by hand | yes |
| Release build | `build/` | `npm run build` | delete the folder | no (should be; no `.gitignore` yet, P1-02) |

## Failure modes and observability

| Failure | User-visible behaviour | Detection | Recovery |
| --- | --- | --- | --- |
| Opened via `file://` | Module/CORS errors, blank screen | console | Use the server |
| Missing import in an entity | `ReferenceError` when the entity first acts | console | Fix the import (see v1.5.6) |
| Shader compile stalls (Firefox) | Hitching as geometry streams in | Debug HUD (`` ` ``) | Browser limitation; README "Browser Support" |
| Blueprint probabilities off | Plain walls more/less often | console warning | Rebalance `prob` values |

Debug aids: the Debug HUD (`` ` ``), `?ssaodebug=normal|ao`, `?logdepth`, God Mode (`G`), Sector Warp (`Z`).

## Claims vs. code

- The README's architecture list omits several modules that exist (e.g. `ChunkManager.js`, `ChunkWorker.js`,
  `PaintballSystem.js`, `SentryConeEntity.js`, the `src/ui/` tuners).
- `package.json` has a `test` script that only prints an error; there are no tests (P1-03).
- Sector special cases are hardcoded by ID across `ChunkManager.js`, `Anomaly.js`, `PlayerController.js`, `Mixer.js`,
  `AtmosphereManager.js` and `main.js`, although `Sectors.js` claims to be the per-sector registry (P2-01).
