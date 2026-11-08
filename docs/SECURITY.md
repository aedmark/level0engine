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
| `?seed=` in shared links (`terminal.html`, `engine.html`) | Untrusted text from anyone's link: injection into the page, oversized input | `SeedLink.sanitizeSeed` strips control characters and caps at 64 characters; the value only reaches `input.value`, `textContent` and the seed hash, never `innerHTML`; `terminal.html` forwards only `seed`, URL-encoded | SeedLink |
| Twitch chat in streamer mode (`TwitchChat.js`, `StreamerMode.js`) | Untrusted text from any viewer: injection, spam, one viewer or a raid steering the run, offensive names shown on stream | Anonymous read-only connection with no token stored. Channel names are validated (`^[A-Za-z0-9_]{3,25}$`). Lines over 2048 and messages over 200 characters are dropped. Text is matched only against fixed commands and never displayed, and viewer names are never shown. Votes are one per viewer. Events need distinct viewers scaled to active chat, and share a cooldown and game vetoes (D-011). | StreamerMode |
| Imported ghost files (`GhostCodec.parseGhostFile`) | Untrusted JSON from anyone: oversized input, malformed data, injection through the seed | Files over 512 KB are refused. The format, version, sample rate and keyframes are checked, and sample count and data length must match. The seed must survive `sanitizeSeed` unchanged. Text reaches the page only through `textContent` (D-012). | GhostRuns |

The shipped `build/` (itch.io) is static and has none of the server endpoints.

## Secure development rules

- Keep the servers development-only; do not expose them beyond localhost.
- New write endpoints must confine paths with `path.relative` checks, as `/export` does.
- Sanitise any HTML built from data with DOMPurify; never `eval` or `new Function` on data.
- Vendored libraries are updated deliberately, with the version recorded in ARCHITECTURE.

## Security verification

No automated checks. The endpoint path checks are verified by reading the code only.
