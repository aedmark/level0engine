# Level 0 Engine

A procedural liminal-space horror game/engine that runs natively in the browser as plain ES6 modules on a locally
vendored three.js r160. The maze, textures, audio and narrative are all generated at runtime from a seed; there is no
bundler and no build step for development. A tiny Node server (`engine_server.js`) serves the files and exposes a few
dev-only save endpoints; a separate Lore Editor (`lore-editor/`) edits the narrative JSON in `data/`.

This is the canonical instruction file for coding agents. `CLAUDE.md` imports it; do not duplicate these rules in
tool-specific files. Project facts belong in the documents linked below, not in an agent's private memory.

## Start here

1. Read `docs/HANDOFF.md` for the current state, active work, and gotchas.
2. Read the relevant roadmap item and the parts of `docs/ARCHITECTURE.md` and `docs/TESTING.md` that apply.
3. Inspect `git status` and recent history. Do not overwrite work you did not create.
4. Verify important inherited claims before relying on them. Use the fastest relevant check first.
5. State the intended scope briefly, then work on one independently reviewable change at a time.

If the repository is new or unfamiliar, read `README.md` and `docs/README.md` first. If the request conflicts with
these instructions or the working tree contains overlapping edits, stop and ask the maintainer.

## While working

- Reference roadmap or issue IDs where one exists. Do not invent an ID for an incidental, self-contained fix.
- Keep changes scoped. Do not mix opportunistic refactors with requested work.
- Preserve user changes. Never reset, clean, or rewrite history without explicit permission.
- Record a decision in `docs/DECISIONS.md` when reasonable maintainers could revisit the choice later.
- Update documentation in the same change when behaviour, interfaces, commands, risks, or project structure change.
- Distinguish observed facts from inference. Include the command, date, environment, or source behind volatile claims.
- Prefer enforcement to prose: important invariants should have a test, type, schema, linter, or runtime check.
- Treat all external input as untrusted at its boundary. Never expose secrets in logs, fixtures, prompts, or commits.
- Add newly discovered work to `ROADMAP.md` only when it is genuinely out of scope for the current change.

## Finishing a change

1. Run the checks appropriate to the change, following `docs/TESTING.md`. Record failures and anything not run.
2. Review the diff for unrelated edits, generated files, credentials, stale names, and documentation drift.
3. Update `docs/HANDOFF.md` if work will continue in another session or if the repository's current state changed.
4. Update the roadmap item, decision record, architecture, security notes, and changelog only when their documented
   update trigger applies (see `docs/README.md`).
5. Run `python3 tools/check_docs.py` and report the result.

Do not manufacture ceremony: typo-only or mechanical changes do not need a decision, changelog entry, or handoff
rewrite unless they alter a claim those documents make.

## Working agreement

Direct-to-`master`, single maintainer (gordonk). Agents edit the working tree; the maintainer reviews, commits and
pushes unless they explicitly ask the agent to. Adding a dependency, deleting data in `data/`, or regenerating
`data/factory/` needs explicit permission.

- Default branch: `master`.
- Working branch pattern: none in use; work lands on `master`.
- Commit format: the release version as the message (e.g. `1.5.7.2`), matching the history. No roadmap IDs required.
- Release/version scheme: `vMAJOR.MINOR.PATCH[.HOTFIX]`. Sources of truth: the top entry of `docs/CHANGELOG.md`, the
  `README.md` title, and `package.json` `version` (which only carries three parts). Keep them in step.

Never force-push, rewrite shared history, publish, or rotate/delete production data without explicit permission.

## Maintainer preferences

Record durable preferences here so they survive agent and session changes. Keep temporary task instructions in the
task or handoff instead.

- **Writing:** Changelog entries follow the existing house style: a `[TAG]` prefix (`[ENGINE]`, `[WORLD]`,
  `[NARRATIVE]`, ...), a bold title-case headline, the touched files in parentheses, then the root cause and the fix
  in full sentences. Each release has an italic subtitle.
- **Code comments:** Explain *why* (the constraint, the bug it prevents), not what the line does.
- **Asking vs. doing:** Ask before adding dependencies, restructuring directories, or touching `data/factory/`.
- **Reporting:** Say what was run and observed in the browser, and what was not verified.

## Protected areas

| Path or thing | Rule | Why |
| --- | --- | --- |
| `r160.js`, `jsep.min.js`, `purify.min.js`, `src/aesthetics/RectAreaLightUniforms.js` | Do not edit by hand | Vendored third-party code (D-001) |
| `data/factory/` | Do not edit without permission | The Lore Editor's factory-reset baseline |
| `THREE` global | Never add `import ... from 'three'` | No bundler; the global is injected by `r160.js` (D-001) |

## Names and terms

| Canonical term | Meaning | Formerly / not to be confused with |
| --- | --- | --- |
| Sector / zone | A themed macro region (Archive, Atrium, ...) with its own generator, fog, audio | A chunk |
| Chunk | A fixed-size streaming unit of the maze, built in `ChunkWorker.js` | A sector |
| Blueprint | A structural variation placed in the base maze (`src/world/blueprints/`) | A sector generator |
| The Anomaly | The roaming default hazard; sector-locked hazards are "entities" | |
| Tell / Inquest | The seeded cold-case truth and the exit terminal that asks for it | |

## Repository map

| Path | Purpose |
| --- | --- |
| `index.html`, `engine.html`, `main.js` | Boot page, engine page, and the entry script |
| `src/` | All engine modules, by concern (see `docs/ARCHITECTURE.md`) |
| `data/` | Narrative JSON consumed at runtime; `data/factory/` is the editor's reset baseline |
| `assets/` | Static textures, fonts, and LTC tables |
| `lore-editor/` | Standalone narrative editor and its server (port 3000) |
| `engine_server.js` | Dev/static server (port 8080) with save endpoints |
| `build_static.js` | `npm run build`: produces `build/` for itch.io |
| `AGENTS.md` | Canonical agent instructions |
| `ROADMAP.md` | Planned work with stable IDs |
| `docs/README.md` | Documentation map and update triggers |
| `docs/HANDOFF.md` | Current state, next steps, gotchas, and bounded session history |
| `docs/ARCHITECTURE.md` | Components, boundaries, invariants, state, and failure modes |
| `docs/DECISIONS.md` | Append-only architectural and product decisions; open questions |
| `docs/TESTING.md` | Test strategy, commands, limitations, and environment recipes |
| `docs/SECURITY.md` | Assets, trust boundaries, secret handling, and reporting |
| `docs/CONTRIBUTING.md` | Human and agent contribution workflow |
| `docs/CHANGELOG.md` | User-visible release notes |
| `docs/archive/` | Historical material no longer current |
| `tools/check_docs.py` | Documentation consistency checks |

## Engineering conventions

- Plain ES6 modules, no bundler, no transpiler, no TypeScript. `THREE` is a global.
- Hot paths (player/entity loops, collision) use preallocated scratch vectors; do not allocate per frame.
- One blueprint per file in `src/world/blueprints/`; register it in `StructuralBlueprints.js`. Registered
  probabilities must sum to `1.0000`.
- Sector-wide tuning (fog, tint, light, audio) lives in the `Sectors.js` table, not in generators.
- Determinism: world layout draws from the seeded RNG so a seed rebuilds the same world. `Math.random()` is only for
  cosmetics (texture noise, flicker, entity spawn jitter). Not yet enforced by a test (P2-02).
- Reference browser is Chromium; Firefox must stay playable. Desktop only (touch removed in v0.4.7).
- Dependencies are vendored as files; `package.json` exists only for `npm run build`.
- `build/` is generated by `npm run build` and is not committed.

## Environments

| Environment | Can access | Cannot access / caveats |
| --- | --- | --- |
| Local development (Linux, fish shell) | Node, a browser, ports 8080/3000 | No automated tests; WebGL output must be checked by eye |
| CI | None configured | — |

## Run and verify

- Setup: none (Node only; no `npm install` needed to run).
- Run: `./start_engine.sh` (or `node engine_server.js`), open `http://localhost:8080`.
- Fast checks: `node --check <changed file>` and load the game in the browser with the console open.
- Full checks: the manual pass in `docs/TESTING.md`, plus `npm run build`.
- Detailed test guidance: `docs/TESTING.md`.
