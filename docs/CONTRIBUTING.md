# Contributing

The workflow for human and automated contributors. Agent-specific standing instructions are in
[AGENTS.md](../AGENTS.md).

## Before changing code

1. Read the README, the relevant roadmap item, the architecture section, and the test guidance.
2. Setup: Node only. Run `./start_engine.sh` (or `start_engine.bat`) and open `http://localhost:8080`.
3. Check `git status` and make sure your change does not overlap unrelated work.

## Make the change

- Keep each change focused on one outcome.
- Follow the conventions in AGENTS.md (no build tools, `THREE` global, one blueprint per file).
- Update documentation according to [the documentation triggers](README.md#update-triggers).
- Do not commit `build/`, local config, or save data.

## Verify

Follow [TESTING.md](TESTING.md). Report the exact checks run and anything skipped.

## Submit and review

Work lands directly on `master`; there are no branches or pull requests. Agents edit the working tree, and the
maintainer reviews, commits and pushes unless they ask the agent to. Each release bumps the version, adds a
`docs/CHANGELOG.md` entry in the house style (see AGENTS.md, "Maintainer preferences"), updates `package.json`
version (versions stay internal, D-009), and is committed with the version number as the message. CI runs `npm test`
and the doc checker on every push. `npm run build` produces the itch.io upload in `build/`.

A change is ready when its scope is clear, the checks in `docs/TESTING.md` for the area pass (or their failure is
explained, as with T-003), the player-visible and save-data impact is described, no sensitive data is present, and
the documentation it invalidated has been updated.

## Compatibility and migrations

The game keeps everything a player has in `localStorage`, and an update must not lose it silently:

| Key | Format | Owner |
| --- | --- | --- |
| `level0_state`, `level0_state_backup` | The save (manual Appendix D); a backup is written before every overwrite | `SaveManager.js` |
| `level0_ghosts` | `{version: 1, seeds: {...}}` per-seed runs (D-012) | `GhostRuns.js` |
| `level0_streamer`, `level0_ghost_show` | Streamer and ghost settings | `StreamerMode.js`, `GhostRuns.js` |
| `level0_tutorial`, `level0_tutorial_unlocked`, `level0_hint_shake` | First-run flags | the opening (D-010) |
| `level0_bindings` | Key bindings | `InputBindings.js` |

Exported ghost files (`level0-ghost`, version 1) are read by other people's builds, so they are a format too.

For a change to any of these:

1. **Forward step:** read the old shape and convert it, or bump the version and keep a reader for the old one.
   Never assume a key is present or well formed: treat stored data as untrusted on load, as `GhostRuns._store()` does.
2. **Recovery:** say what a player loses if conversion fails (the save backup, the ghost cap, a reset setting) and
   prefer dropping one entry to failing the boot.
3. **Verification:** load the old shape in a browser (or a unit test) before release, and say in the changelog what
   changed for existing players.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md).
