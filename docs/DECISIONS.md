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

## D-007 The landing page is a facility terminal, not a one-page product site  (2026-10-31, status: accepted)
**Context:** The landing page used the same hero / feature-section / closing-CTA layout as a generic product site, and
loaded Space Mono from Google Fonts. The game's own interface is EGA-era hardware: sixteen colours, bevelled windows,
a terminal that asks for the Finding of Fact.
**Decision:** `index.html` is an induction session in that hardware language: a dithered desk, a grey pull-down menu
bar, and five double-bordered file windows (`BOOT.LOG`, `FACILITY.DOC`, `SURVIVAL.TXT`, `CONTROLS.KEY`, `EXIT.SYS`).
All existing copy, controls and links are preserved. `site.css` uses the sixteen-colour EGA palette shared with the
portfolio and Plainchant. Display type is VT323 from `assets/fonts/`; body text is the system monospace stack. The
Google Fonts link is removed, so the page loads no network font.
**Alternatives:** A dark editorial page in the portfolio's style (rejected: it does not carry the game's terminal
fiction); one long scroll without window chrome (rejected: the file-per-concern structure is what makes the density
legible).
**Consequences:** Each section is a file, so a new section means a new window and a numbered bar; the page remains one
HTML file and one stylesheet. `header.png` is the in-page capture, lazy-loaded; `screenshot.png` is no longer
referenced by the landing page.
**Review trigger:** If the manual or codex get the same treatment, or a new section no longer fits a file.

## D-008 A seed fully determines a run, including anomalies and the breaker hunt  (2026-11-07, status: accepted)
**Context:** Since v0.4.13 a per-run salt from `Math.random()` fed every anomalous point of interest, deliberately, so a
replayed seed "keeps its maze but deals different anomalies". The breaker-hunt hop count also used `Math.random()`.
Shared seeds, daily seeds, ghost runs and streamer challenges need everyone on a seed to play the same run.
**Decision:** The run salt and the breaker-hunt stream derive from `baseSeed` (`src/world/RunSeeds.js`). Variety
comes from choosing a new seed, which the default card-hand seed already does on every new game.
**Alternatives:** Keep the random salt (rejected: breaks shared runs); seed-derived by default with a `?reroll` opt-in
(rejected for now: no player asked for it).
**Consequences:** Replaying a seed now replays its anomalies. Points of interest that would spawn within 30 units of
the player still became walls, so POI placement could differ with the route; v1.5.8.13 measures that from the seed
spawn instead (P5-01).
Cosmetic `Math.random()` (flicker, particles, spawn jitter) is unchanged.
**Review trigger:** If players ask for same-maze, different-anomalies replays, add the `?reroll` flag.

## D-009 Release numbers are internal  (2026-11-07, status: accepted)
**Context:** The release number appeared in the `README.md` title, both manual volumes (title, header tag, badge,
footer) and the engine menu, which still read `v1.5.7` several releases later. Keeping every copy in step was a chore,
and players gain nothing from a four-part hotfix number.
**Decision:** Versions stay internal: the top entry of `docs/CHANGELOG.md`, `package.json` `version`, commit messages
and internal docs. Public pages (`README.md`, `index.html`, `engine.html`, `terminal.html`, `manual/`) carry no release
number. `tools/check_docs.py` fails on a `vN.N.N` pattern in those pages.
**Alternatives:** Keep versions public and add a check that they match (rejected: the maintainer prefers not to
show them).
**Consequences:** The changelog is the internal release record. In-fiction strings that are not release numbers,
such as `SECURE BOOT v1.4` in `terminal.html`, are allowed because the check only matches three-part numbers.
**Review trigger:** If a public build needs a visible version for bug reports, show it in one place, such as the
pause menu, driven from `package.json`.

## D-010 A new run opens with a scripted, seeded sequence  (2026-11-07, status: accepted)
**Context:** P5-04 measured the opening. Load to control took about 2.7 s, which was fine. A first-time player then
woke in a pitch-black car with an empty flashlight, a red keypad that did nothing, and a note covering six mechanics.
The car door waited for a 100% kinetic charge the battery ceiling could fall short of. Nothing frightening was
guaranteed until the Anomaly's 90 s grace ran out, and that grace counted down while the player was still reading.
**Decision:** `OpeningDirector` runs five beats on every new run. Beat 1, arrival: a dim car (a quarter of normal
ambient), half a charge, a rumble and a ding, and on a first run the door releases on its own. Beat 2, the sighting:
the Anomaly stands at the end of a corridor and vanishes when the lights stutter. Beat 3, the objective: it is hidden
until the player steps out, and the first hunt goes to a podium 28-56 m from the seed spawn. Beat 4: grace is held
until the doorway. Beat 5: timing marks go to the console and the debug HUD. The sighting spot comes from the layout
around the car (the nearest open cell within 24 m with a 16 m+ straight run, outside sectors), not from the player's
route, so a shared seed shows everyone the same corridor.
**Alternatives:** Shortening the old tutorial text only (rejected: it left the dark car, the softlock and the empty
first minutes); a random jump scare (rejected: not seeded, and it spends the Anomaly's menace before it can hunt).
**Consequences:** The kinetic-charge lesson moves to a one-time hint when the flashlight first dies. Returning players
still enter `0451` until the keypad remembers it. The sighting borrows the Anomaly mesh during its grace period, so
any change to grace or to the Anomaly's visibility must keep the sighting working. Timing values live in
`OpeningPlan.js` (`OPENING`).
**Review trigger:** If playtests or streams show the sighting missed (the `sighting missed` mark) on most seeds, or
show players reaching the first hunt much earlier or later than about 90 s after leaving the car.

## Open questions

- **Q-001** ~~Are the proposed goals and order for ROADMAP phases 2 and 3 right?~~ Answered 2026-09-30 by the
  maintainer: yes, goals and order confirmed.
