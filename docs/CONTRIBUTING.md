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

## Submit and release

Work lands directly on `master`. Each release bumps the version, adds a `docs/CHANGELOG.md` entry in the house style
(see AGENTS.md, "Maintainer preferences"), updates the README title and `package.json` version, and is committed
with the version number as the message. `npm run build` produces the itch.io upload in `build/`.

## Compatibility

Save data in `localStorage` should survive an update; if a change breaks old saves, say so in the changelog.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md).
