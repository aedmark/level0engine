# Security

This document describes the project's security assumptions and reporting path. It is not a claim that the project
is vulnerability-free.

## Supported versions

| Version / branch | Security fixes |
| --- | --- |
| `master` (latest release) | supported |

## Report a vulnerability

Report privately to the maintainer (gordonk) rather than in a public issue. Include the affected version, impact and
reproduction steps.

## Assets and boundaries

| Asset or boundary | Sensitivity / threat | Protection and validation | Owner |
| --- | --- | --- | --- |
| Local servers (`engine_server.js` 8080, `lore-editor/editor_server.js` 3000) | Anything that can reach the port can read repo files and call write endpoints | Path-prefix checks; intended for localhost only | servers |
| Write endpoints (`/export`, `/export-meta`, `/save-light`, `/save-atmosphere`, editor `/api/*`) | Overwriting source or data files | `/export` confines writes to `assets/textures/`; the others write fixed files. No auth. | servers |
| Narrative text rendered as HTML | XSS | DOMPurify before DOM injection | UI |
| Editor expressions | Code execution | `jsep` / `SafeEval.js`, never `new Function` | narrative |
| Save data | Player progress only; no personal data | `localStorage`, backup copy | SaveManager |

The shipped `build/` (itch.io) is static and has none of the server endpoints.

## Secure development rules

- Keep the servers development-only; do not expose them beyond localhost.
- New write endpoints must confine paths with `path.relative` checks, as `/export` does.
- Sanitise any HTML built from data with DOMPurify; never `eval` or `new Function` on data.
- Vendored libraries are updated deliberately, with the version recorded in ARCHITECTURE.

## Security verification

No automated checks. The endpoint path checks are verified by reading the code only.
