# Testing

How to verify a change, what each check proves, and what it cannot. Read this before claiming anything works.
Results live in HANDOFF's "Current state"; this file is how to get them.

Tests use Node's built-in `node:test` with no extra dependency (`test/setup.js` loads the vendored `r160.js`,
`jsep.min.js` and `purify.min.js` onto `globalThis`); the one dev dependency is Playwright, for the smoke test. CI
(`.github/workflows/ci.yml`) runs `npm test` and the doc checker on every push and pull request to `master`.

## The suites

| Suite | File | Proves | Does not prove | Time, needs |
| --- | --- | --- | --- | --- |
| Docs | `tools/check_docs.py` | Placeholders, IDs, tensions, links, sessions, manual source references, no public release numbers, no invisible characters | That the prose is true | seconds |
| Harness | `test/basic.test.js` | `THREE` loads as a global in Node | Anything about the game | seconds |
| Syntax | `test/p1_05_syntax.test.js` | Every module in `src/` parses | That it runs | seconds |
| Imports | `test/p1_06_imports.test.js` | Every static import names a file and an export that exist | Dynamic imports; runtime behaviour | seconds |
| Registries | `test/p1_07_registry.test.js` | Every blueprint is imported and probabilities sum to 1.0; every sector is in `Sectors.js` and `lore.json` with well-typed flags; every entity key is a sector | That they build well | seconds |
| Narrative data | `test/p1_08_narrative.test.js` | `data/*.json` parses, keeps the shape of `data/factory/`, and every zone placement has a lore pool | That a case reads well | seconds |
| Server | `test/p1_09_server.test.js` | Static routes, MIME types and path-traversal refusals of `engine_server.js` | The save endpoints' effects | seconds, a free port |
| Determinism | `test/p2_02_reproducibility.test.js` | Sector matrix, run salt and hunt stream repeat per seed; no camera-based suppression; derived airlock layout (D-008, P5-01) | A full chunk fingerprint (needs WebGL) | seconds |
| Solvability | `test/p3_01_solvability.test.js` | A few hundred seeds deal a complete, solvable case | That the clues read well | seconds |
| Seed links | `test/p5_03_seed_link.test.js` | Daily seed, URL sanitising, run seeds, share links (P5-03) | The clipboard in a real browser | seconds |
| Opening | `test/p5_04_opening.test.js` | Sighting choice, first-breaker band, marks, the door release and podium-record guards (D-010, P5-08) | How the opening plays | seconds |
| Chat | `test/p5_05_chat.test.js` | IRC parsing, the fixed command set, vote tallies, event thresholds and cooldown (D-011) | A live Twitch connection | seconds |
| Ghosts | `test/p5_06_ghosts.test.js` | Sample encoding, playback, file validation, choosing and pruning runs (D-012) | Recording in a real run; downloads | seconds |
| Smoke | `test/p4_01_smoke.test.js` | Headless Chromium boots `engine.html` in debug mode on seed `0x12345678` and warps to every sector with no console errors, within 1.5x of each sector's baseline generation time (P4-01, P4-02) | A normal new game; Firefox; how anything looks; budgets on a busy machine (T-003) | 6 to 14 min, Chromium, port 8080 |

**The fast set** (before every commit): every suite except the smoke test:

```bash
node --test $(ls test/*.test.js | grep -v p4_01_smoke)
```

plus `python3 tools/check_docs.py`, `node --check` on changed files, and the game in a browser with the console open.

**The full set** (after deleting or moving code, and before a release): `npm test` (all suites, smoke included),
`python3 tools/check_docs.py`, `npm run build`, and the manual checks below.

## Running each suite

### Everything

```bash
npm test
```

- What it does: `node --test test/*.test.js`, smoke test included.
- What a pass looks like: the summary ends `# fail 0`. A run that aborts partway can print `ok` lines and no summary:
  check for the summary, not only for `not ok`.
- Where it writes: nothing, except the smoke test (below).

### The smoke test

```bash
node --test test/p4_01_smoke.test.js
```

- What it does, in order: starts `engine_server.js` on port 8080, launches headless Chromium, boots `engine.html` in
  debug mode on seed `0x12345678`, warps to each sector, records console errors and generation time per sector, and
  fails a sector more than 1.5x (and 50 ms) over `test/perf_baseline.json`.
- What a pass looks like: `# pass 1`. A failure names either console errors or the sectors over budget.
- Where it writes: if `test/perf_baseline.json` is missing, it writes a new one from this run (see "Runs that vary"
  before letting it).
- Needs: port 8080 free (stop `./start_engine.sh` or the desktop app's preview first), Playwright's Chromium
  (`npx playwright install chromium`).

### Adding a check

- New suites go in `test/` as `<item-id>_<topic>.test.js` using `node:test`; import `./setup.js` first when the module
  under test uses `THREE`, `jsep` or `DOMPurify`.
- Put pure rules in a module without DOM or `THREE` (like `GhostCodec.js`, `ChatCommands.js`, `OpeningPlan.js`) so
  they can be tested directly. Where a rule lives in browser-only code, a source guard (read the file, assert the
  pattern is present or absent) is the fallback; say in the test what regression it guards.
- Assert on what happened (a returned value, a file on disk), not on words in a message: a message can mention the
  right word for the wrong reason.
- Before trusting a new check, make it fail: undo the fix (only the fix) and run it. A check that passes either way
  proves nothing.

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

## Runs that vary

Some results depend on something outside the code: machine load, a live service, frame timing.

- **The smoke test's performance budget** swings two to eight times with machine load (T-003). One red run proves
  little. Run the previous commit side by side under the same load (a scratch `git worktree` with `node_modules`
  symlinked in) and compare per-sector times before blaming the change; record both tallies in the handoff. Never
  re-baseline `test/perf_baseline.json` from a busy machine.
- **Twitch chat** (D-011) depends on Twitch. A connection that does not go `LIVE` may be the network or Twitch, not the
  code; test the parsing and gating with injected messages (`environment.streamer.chat.onMessage({userId, text})`)
  rather than waiting for a real chat to say the right thing.
- **Game time** advances only with rendered frames, so anything timed in game seconds (the opening's marks, ghost
  samples) runs slower under SwiftShader or in a throttled tab. Compare game-time marks, not wall-clock times.

## Environment recipes

- **Desktop app browser pane hidden:** it can stop rendering frames entirely, so the game never advances. Use headless
  Chromium from the project's Playwright instead: a scratch script that imports
  `node_modules/playwright/index.mjs`, spawns `node engine_server.js`, and launches Chromium with
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Drive the game through `window.environment`.
- **Testing a fresh run without losing a save:** copy every `level0*` key of `localStorage` to `sessionStorage`, clear
  them, test, then restore them, before navigating away from the engine page so its save-on-exit cannot overwrite them.
- **A first-time run:** clear `level0_tutorial` and `level0_tutorial_unlocked`; set both to skip the first-run arrival.

## Change-to-check matrix

| Changed area | Minimum checks | Additional evidence |
| --- | --- | --- |
| Documentation only | `python3 tools/check_docs.py` | |
| A module in `src/` | `node --check`; boot | Visit the code path in game |
| World generation / blueprints | Boot; visit it; reseed | Check the blueprint probability warning in the console |
| Rendering / lighting | Boot; before/after Debug HUD numbers | Firefox pass; `?ssaodebug=` views |
| Narrative data | Open in the Lore Editor; read the document in game | |
| Server endpoints | Exercise the endpoint; try a `..` path; `p1_09_server` | SECURITY review |
| Seeds, links, rebuilds | Fast set (`p2_02`, `p5_03`); rebuild the same seed from two positions and compare chunks | A shared link in a second browser profile |
| The opening | Fast set (`p5_04`); a first run with storage cleared | A human playtest at full size; the `[OPENING]` marks |
| Streamer mode, chat | Fast set (`p5_05`); connect to a live public channel | A real stream with viewers |
| Ghost runs | Fast set (`p5_06`); record, replay, export and import in headless Chromium | Export inside the itch.io frame |
| Anything in a new game's path | Full set, smoke included | Compare with the previous commit if the budget fails (T-003) |

## Known pitfalls (already hit, already fixed: don't re-discover these)

- **Opening `index.html` via `file://` fails** on ES6 module CORS. Always use the server.
- **Missing imports only throw when the code path runs.** Entity files have shipped with functions used but not
  imported (v1.5.6). A boot without errors does not mean every entity is fine.
- **`aoMap` is probably inert here:** it needs a `uv2` attribute that no geometry sets (v1.5.7 in CHANGELOG.md; P2-03). Do not build
  on it.
- **A podium's chunk unloading does not detach the podium from its chunk group.** `mesh.parent` stays set; compare it
  with `env.activeChunks.get(mesh.userData.chunkHash)` to know whether it is live (P5-08).
- **The OSD flicker animation overrides inline opacity.** A HUD element that fades must set `animation: none`.
- **Rebuild Geometry used to move the player and rebuild around them,** so two rebuilds of a seed differed. It now
  rebuilds in place (P5-02); compare chunks only across in-place rebuilds or fresh loads.
