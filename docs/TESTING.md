# Testing

How to verify a change, what each check proves, and what it cannot. Read this before claiming anything works.
Results live in HANDOFF's "Current state"; this file is how to get them.

**There is no automated test suite yet.** The plan is ROADMAP Phase 1 (P1-03 to P1-10) and P4-01. Verification today is syntax checks plus a manual run in the
browser.

## The checks

| Check | Command | Proves | Does not prove | Time, needs |
| --- | --- | --- | --- | --- |
| Docs | `python3 tools/check_docs.py` | Doc links and IDs are consistent | Anything about the code | seconds |
| Syntax | `node --check path/to/file.js` | The module parses | Imports resolve; it runs | seconds |
| Build | `npm run build` | `build/` is produced | That the build plays | seconds |
| Manual boot | `./start_engine.sh`, then `http://localhost:8080` | The engine boots and plays in that browser | Other seeds, sectors, browsers | minutes, a browser |

**The fast set** (before every commit): `node --check` on changed files; boot the game with the console open.
**The full set** (before a release): the manual checks below, plus `npm run build`.

## Before any run

- **Clean state:** saves live in `localStorage`. Use "Purge & Start New Game" (or the Purge Memory button) when a
  test depends on a fresh run; "Continue Session" otherwise carries state over.
- **Services:** the engine server on port 8080 (`./stop_engine.sh` to stop). The Lore Editor uses port 3000.
- **Hard reload** after editing: the server sends `no-cache`, but some routes are marked immutable.

## Manual checks (before a release)

- Boot, start a new game, walk for a minute: no console errors, no missing textures.
- Visit the changed sector or blueprint. Sector Warp (`Z`), the settings panel's "Find Sector..." dropdown, and
  X/Z teleport get there fast; God Mode (`G`) removes the threat while inspecting.
- Look at the Debug HUD (`` ` ``) for FPS and draw calls before and after a performance-sensitive change.
- If an entity changed, let it sense and chase you (entity bugs often surface only on first sense or move).
- Rebuild Geometry with the same seed and confirm the layout repeats.
- Firefox: boots and is playable.

## Change-to-check matrix

| Changed area | Minimum checks | Additional evidence |
| --- | --- | --- |
| Documentation only | `python3 tools/check_docs.py` | |
| A module in `src/` | `node --check`; boot | Visit the code path in game |
| World generation / blueprints | Boot; visit it; reseed | Check the blueprint probability warning in the console |
| Rendering / lighting | Boot; before/after Debug HUD numbers | Firefox pass; `?ssaodebug=` views |
| Narrative data | Open in the Lore Editor; read the document in game | |
| Server endpoints | Exercise the endpoint; try a `..` path | SECURITY review |

## Known pitfalls

- **Opening `index.html` via `file://` fails** on ES6 module CORS. Always use the server.
- **Missing imports only throw when the code path runs.** Entity files have shipped with functions used but not
  imported (v1.5.6). A boot without errors does not mean every entity is fine.
- **`aoMap` is probably inert here:** it needs a `uv2` attribute that no geometry sets (v1.5.7 in CHANGELOG.md; P2-03). Do not build
  on it.
