# Level 0 Engine Lore Editor

This directory contains the dynamic narrative content for the Level 0 Engine. The engine pulls from these JSON files at runtime to procedurally construct the story and generate case files that adapt to the randomized world state.

## Core Files

1. **`parameters.json`**: The central registry for dynamic variables and names. Contains the pools for randomized character names (`FIRST`, `LAST`), project titles (`PROJECT_NAMES`), your active cast `ROLES`, template shortcuts (`VARS`), and custom per-playthrough numbers (`CORE_VARS`).
2. **`threads.json`**: The global thread objective hub. Maps internal narrative thread tags (e.g., `LOST`) to an object containing a `title` and a `description`. These populate the player's PDA journal as actual quest objectives.
3. **`puzzles.json`**: Defines the "game modes" or end-goals for a playthrough. Each puzzle defines an `ACCESS_CODE` (the logic to calculate the final door code) and `LOCK_THREADS` (the narrative threads the player must find evidence for before the puzzle counts as solvable). A puzzle can also optionally set `cipher_title` / `cipher_description` to override the shared `CIPHER` heading in the player's journal while it's the active puzzle — see "Overriding CIPHER per puzzle" below.
4. **`clues.json`**: Puzzle-mechanic evidence — anything tagged with a thread that some puzzle's `LOCK_THREADS` actually locks against (`CIPHER`, the formula itself, plus whatever raw facts that formula is built from, e.g. `PEN`, `EPOCH`, `HOUR`). Every entry is gated to one or more puzzle IDs via its `puzzle` field, so it only spawns in a playthrough where that puzzle was rolled.
5. **`lore.json`**: General background text — audio logs, sticky notes, terminal messages, clipboards — that is **always** injected into every playthrough, regardless of which puzzle is active. Reserved for threads that aren't tied to solving anything (`LOST`, `HUM`, `GEOMETRY`, ...); a puzzle-mechanic thread doesn't belong here, even as flavor — see "The Thread system" below. Each entry has a `type` property (e.g., `document`, `tape`, `note`, `laptop`, `clipboard`) that dictates how it is rendered in-game.
6. **`foreshadow.json`**: Contains groups of clues that foreshadow specific finales. Every entry is always thread `TELL` (the editor sets this for you too).
7. **`finales.json`**: Contains the possible final revelation documents. It is fully dynamic — you can have as many finales as you want! Each finale is an object with an `option` (short summary for the verdict button), `text` (the full document), and `tell_title` / `tell_description` (to dynamically override the player's PDA journal objective).

## How It Works

When the game loads, it dynamically fetches all of these JSON files and merges them into memory. When the player explores the level, `StoryEngine` determines what documents drop in which sector by cross-referencing `lore.json`, `clues.json`, and `puzzles.json` against the current playthrough's rolled puzzle and world state.

### lore.json vs. clues.json — the one distinction that matters most

This is the single most important thing to understand before you add content, because it decides whether your document shows up in *every* playthrough or only in the ones where it's actually relevant:

* **`lore.json` is unconditional.** Every entry in it gets injected into every playthrough, no matter which puzzle was rolled. Use it for atmosphere, world-building, character texture — threads that aren't tied to solving anything (`LOST`, `HUM`, `GEOMETRY`, ...).
* **`clues.json` is puzzle-gated.** An entry only spawns if its `puzzle` field matches the puzzle that was actually rolled for that playthrough. Use it for anything tagged with a *puzzle-mechanic* thread — one that appears in some puzzle's `LOCK_THREADS` — whether that's the formula itself (`CIPHER`) or one of the raw facts the formula is built from (`PEN`, `EPOCH`, `HOUR`, ...).

The rule of thumb: if the thread is something a puzzle actually locks against, it's puzzle-mechanic evidence and belongs in `clues.json` with the right `puzzle` field set — never in `lore.json`, even as "harmless flavor," because that would let the objective corroborate regardless of which puzzle got rolled. If the thread doesn't gate any puzzle, it belongs in `lore.json`.

### The Thread system, and why CIPHER/TELL/PEN/EPOCH/HOUR are dropdowns, not free text

Every piece of content carries a `thread` tag (e.g. `LOST`, `HUM`, `GEOMETRY`, `PEN`). Threads are how the engine tracks "has the player found evidence of X yet" and how `threads.json` labels that objective in the player's journal. A puzzle's `LOCK_THREADS` list says which threads must be corroborated before that puzzle is considered solvable — and the *label* half of each `LOCK_THREADS` entry is just the text shown to the player when that objective is still missing (e.g. "still need: Pen Number"); it doesn't need to reference anything in `parameters.json`.

Threads split into two kinds:

* **Puzzle-mechanic threads** — `CIPHER` plus anything else that shows up in some puzzle's `LOCK_THREADS` (`PEN`, `EPOCH`, `HOUR`, or a brand-new one you invent for a puzzle you're building). These are only ever evidence for solving something, so they only ever live in `clues.json`, gated via the `puzzle` field to whichever puzzle(s) actually need them.
* **`TELL`** — always lives in `foreshadow.json` (and `finales.json`). It's the "this is foreshadowing a finale" thread, structurally separate from puzzle-solving.
* **Everything else** — `LOST`, `HUM`, `GEOMETRY`, or any custom narrative thread you invent that isn't tied to a puzzle — is universal `lore.json` content.

Because which bucket a thread falls into is 100% determined by whether some puzzle currently locks against it, **the editor never lets you free-type a thread onto the wrong file.** `lore.json`'s Thread field bounces `TELL` and any current puzzle-mechanic thread back to `UNCLASSIFIED` if you try to type it there. `clues.json`'s Thread field is a dropdown — not free text — scoped to whichever puzzle(s) you've checked for that entry (see below). `foreshadow.json`/`finales.json` hide the field entirely and always write `TELL`. This exists specifically to prevent a clue meant for one puzzle from accidentally getting miscounted toward a different puzzle's requirements, and to stop puzzle evidence from quietly becoming universal by living in the wrong file.

### How a `clues.json` entry actually gets matched to a puzzle

`clues.json`'s Thread dropdown only ever offers threads that every currently-checked puzzle actually locks against — the **intersection** of their `LOCK_THREADS`, not the union. Check one puzzle and you'll see every thread it locks against; check two, and the dropdown narrows to only what they share (which is always at least `CIPHER`, since every puzzle requires it). That's what makes a mismatch structurally impossible instead of something Data Validation has to catch after the fact: you literally cannot select a thread that's wrong for a puzzle you've checked.

The `puzzle` field itself:

* `"puzzle": "ORIGINAL_PEN"` — only spawns, and only counts toward reachability, for that one puzzle.
* `"puzzle": ["ORIGINAL_PEN", "HOUR_PUZZLE"]` — an array shares the same clue text across multiple puzzles (handy for a generic "the combination is two numbers" hint that applies no matter which variant got rolled). Since both are checked, the Thread dropdown for this entry only offers threads both puzzles share.
* No `puzzle` field at all — the clue is ungated and counts toward *every* puzzle. The dropdown falls back to the union of every puzzle's `LOCK_THREADS` in this case, since you haven't scoped it yet. This is rarely what you want; leave the Puzzle checkboxes unchecked only if you deliberately want a clue to apply everywhere.

The editor's Puzzle Inspector, the Data Validation tab, and the little corroboration badge next to the Thread field all respect this `puzzle` scoping — they'll tell you specifically whether *that puzzle* has something delivering *that thread*, not just whether *anything, anywhere* is tagged with it.

### Dynamic Tokens

The engine supports dynamic string replacement so that the text adapts to the specific, randomized parameters of the current run. You can safely include the following tokens in your JSON strings:

* **Cast Tokens**:
    * `${c.[role]}` or `${[role]}`: The procedurally generated full name of any role defined in `parameters.json` `ROLES` (e.g., `${lead}`, `${scapegoat}`).
    * `${[ROLE]}`: The generated full name of any role in ALL CAPS (e.g., `${LOST}`, `${SCAPEGOAT}`).
    * `${[role].first_name}`: Extracts only the first name of the role (e.g., `${lead.first_name}`).
    * `${[role].last_name}`: Extracts only the last name of the role (e.g., `${lead.last_name}`).
    * `${first_name}` / `${last_name}`: Pulls a generic, random first or last name from the parameter pools. The parser guarantees that multiple uses of this within the *same document* will render the *same* generic name for consistency!
* **Project & World State**:
    * `${P}`: The randomized project codename (e.g., THRESHOLD, YELLOW FIELD).
    * `${seed}`, `${pen}`, `${year}`, `${hours}`: The playthrough's core random values, straight off the current run's state — these resolve with zero setup, no `VARS` entry required. `${hrs}` is also supported as a shorter alias for `${hours}`.
    * Any `CORE_VARS` you've defined in `parameters.json` work exactly the same way. Add `"REQ": { "min": 10, "max": 99 }` and `${REQ}` immediately works in any lore/clue text — same mechanism as `${pen}`, just for a value you invented.
* **Custom Vars & Procedural Math**:
    * You can define custom shorthand *templates* in the `VARS` object of `parameters.json` (e.g., `"WEEK": "Math.floor(ctx.hours / 168)"`) — these are JavaScript expressions computed from existing values, and then usable in text as `${WEEK}`. VAR names are matched case-sensitively wherever they're used, so if you rename one in `parameters.json`, update every `${...}` token that references it too — Data Validation will flag a mismatch as a "does not evaluate" error, but it won't fix it for you.
    * The factory-default `VARS` also include `PEN`, `EPOCH`, and `HOUR` — these are just convenience aliases onto `ctx.pen`, `ctx.siteYear`, and `ctx.hours` respectively, so a document can write `${PEN}` instead of `${pen}` if you'd rather match the thread name exactly. Purely cosmetic; `${pen}` and `${PEN}` render identically. **Do not add a similar alias for `CIPHER`** — its `VARS` expression (`ctx.cipher`) resolves to the fully-solved access code, so writing `${CIPHER}` into *any* visible document would print the literal answer to the keypad. It's defined only so `LOCK_THREADS: { "CIPHER": ... }` has a `threads.json` entry to point at; it must never appear inside a `text`/`description` field. Data Validation intentionally never nags about `${CIPHER}` being "unreferenced" — that's the only correct state for it.
    * You can define brand-new *random numbers*, generated once per playthrough exactly like `pen`/`year`/`hours` are, by adding an entry to `CORE_VARS` in `parameters.json` (e.g., `"SERIAL": { "min": 1000, "max": 9999 }`). Once defined, `${SERIAL}` works in any lore/clue text, and `ctx.SERIAL` is usable inside a puzzle's `ACCESS_CODE` expression. The Puzzle Wizard (below) lets you create these inline without ever opening `parameters.json` by hand.
    * You can also embed actual JavaScript math evaluations inside the string directly, referencing `ctx` variables. *Example:* `ASYNC REPORT #${ctx.seed * ctx.hours % 666}`.

    **In the editor these are one screen.** Selecting either `VARS` or `CORE_VARS` in `parameters.json` opens the same VAR list: the engine built-ins (`P`, `pen`, `year`, `hours`, `seed`) as locked rows, then everything you've defined, each with its resolved preview value. You don't pick which kind you're making — type a range like `10-99` (or `10..99`) and it's stored as a rolled-per-playthrough number; type anything else and it's stored as an expression. Editing an entry from one form to the other moves it for you.

    On disk the two remain separate, because the engine treats them differently: a `VARS` entry is a computed shortcut derived from other values (including, trivially, an alias for a single existing value like `PEN`), while a `CORE_VARS` entry is a brand-new independent random number generated fresh for that playthrough's seed. Factory-default entries keep whichever form they shipped in and can't be converted — the lock icon marks them.

## Authoring Content: Using the Lore Editor

To add new documents, you no longer need to edit these files manually! The engine ships with a built-in **Lore Editor**.

1. Double-click `start_editor.bat` (Windows) or run `./start_editor.sh` (Mac/Linux).
2. The editor will automatically open in your default browser at `http://localhost:3000`.
3. Use `stop_editor.bat` or `./stop_editor.sh` when you are done to shut down the backend.

### The sidebar tools

Beyond the seven data files, the sidebar has several tools that exist specifically to keep your narrative logic internally consistent as it grows:

* **+ New Puzzle (Wizard)**: A guided, 4-step flow (Identify → Access Code → Lock Threads → Review) for creating a brand-new puzzle without hand-editing `puzzles.json`. Covered in detail below.
* **+ New Finale (Wizard)**: A guided, 4-step flow (Identify → The Reveal → Foreshadowing → Review) for creating a new finale and its matching foreshadow group *together*, so they can't end up index-mismatched. Covered in detail below.
* **Puzzle Inspector**: A read-only dashboard, per puzzle, listing every `LOCK_THREADS` requirement with exactly which `lore.json`/`clues.json` entries deliver it, plus a badge: **0 sources** (unreachable — Data Validation will error on this), **1 source** (reachable, not yet corroborated — technically solvable, but a player who misses that one document is stuck), or **2+ sources** (corroborated). Only *distinct sectors* count toward that 2+ — two documents sitting in the same room aren't two independent ways for a player to find the answer, so a puzzle with both its `CIPHER` docs stuffed into one sector still reads as "not yet corroborated" here even though something technically delivers it. Also includes a "simulate a run" button that re-rolls a mock seed/pen/year/hours (and any `CORE_VARS`) so you can preview what an access code looks like across a few different playthroughs without launching the game.
* **Data Validation**: A compiler-style pass across all seven files. Errors (things that break the game): unknown thread/puzzle/`lock_thread` references, a clue gated to a puzzle whose `LOCK_THREADS` doesn't even include that thread, a `LOCK_THREADS` requirement with zero corroborating sources (unsolvable), content living in the wrong file (`CIPHER`/`TELL`/any puzzle-mechanic thread in `lore.json`; a non-`TELL` thread in `finales.json`/`foreshadow.json`), a `finales.json`/`foreshadow.json` length mismatch, and malformed `${...}` tokens — actually *resolved* against a mock playthrough (not just checked for known identifiers), so a typo'd variable name or an expression that throws or evaluates to `undefined`/`NaN` gets caught before it ships. Warnings (won't break anything, but worth a look): an empty `LOCK_THREADS` label, a `cipher_title`/`cipher_description` set on a puzzle that doesn't lock `CIPHER` (dead data), a `threads.json` entry or `VARS` entry that's never actually used anywhere, and a tape-type collision (two tape entries eligible for the same sector under the same puzzle — only one can ever play; the rest are silently dropped). Run this after any batch of edits — it's the fastest way to catch a puzzle that's quietly unsolvable, or a finale that's about to point at the wrong foreshadow group.
* **Export Lore Pack / Import Lore Pack / Factory Reset**: Export bundles all seven live files into one shareable JSON file (handy for backups or sharing a homebrew narrative pack). Import loads one back in, overwriting your live data after a confirmation. Factory Reset is a blunt "undo everything" — it overwrites a file wholesale with the factory baseline, discarding *all* your edits to it (new entries included), not just changes to `_locked` ones, so use Export first if you want a way back. Separately, factory-default entries are marked `_locked` in the data and show a lock icon instead of a delete button in the tree — this only protects them from being deleted one-by-one while you're editing day-to-day; it's not related to what Factory Reset wipes.

### Editing each file

* **Dynamic Variable Toolbar**: When editing documents, a toolbar appears above the text area with one-click injection for your `ROLES` and a single **Insert Var** list covering every variable there is — engine built-ins alongside anything you've defined, each showing what it currently resolves to. It automatically adapts whenever you add new variables to `parameters.json`.
* **lore.json**: Edit the narrative text, assign a Thread Tag (any tag except `TELL` or a current puzzle-mechanic thread — those get bounced back to `UNCLASSIFIED`), and select the Lore Type (Document, Tape, Note, Laptop, Clipboard) which dictates how it renders in the game. Remember: everything here is universal and shows up in *every* playthrough.
* **clues.json**: The Thread field is a dropdown, not free text — set the **Puzzle checkboxes** first (check every puzzle this clue's text applies to), and the dropdown narrows to only the threads all of those puzzles actually share. A badge next to the Thread field tells you whether the currently-checked puzzle(s) already have enough corroborating evidence for the selected thread, or whether this clue is the only thing delivering it.
* **foreshadow.json**: Each group is keyed by sector (`ANNEX`, `ARCHIVE`, etc.), and every entry in it is always thread `TELL` — the Thread field is hidden entirely here (same as `finales.json`) since there's nothing to choose. While viewing a group, a "Target Finale" hint box shows the `option` text of the `finales.json` entry it's linked to, so you can always see the pairing at a glance. Prefer the Finale Wizard over `+ Add Entry` for brand-new groups — it's the only path that guarantees the new group lands at the same index as its finale.
* **finales.json**: The engine will dynamically recognize any new finale you append and pull it into the hat on the very next boot. You can edit the "TELL Thread" overrides here to customize the player's ultimate objective in their PDA journal. As with `foreshadow.json`, prefer the Finale Wizard for creating new entries.
* **parameters.json, puzzles.json & threads.json**: Edit these directly to add new cast members, design new game modes/logic, define new `CORE_VARS`, or expand the overarching narrative quests — without ever touching a line of JavaScript. (For new puzzles specifically, prefer the Puzzle Wizard over hand-editing `puzzles.json` — it validates your access code expression and warns you if a `LOCK_THREADS` requirement has nothing delivering it, before you can create a broken puzzle.) Selecting a puzzle also exposes an optional **CIPHER Override** — see below.

### Overriding CIPHER per puzzle

`CIPHER` is the one thread every puzzle shares — each one locks against it, so `threads.json`'s `CIPHER` title/description is a single generic default for all of them ("The Keypad Cipher"). If a specific puzzle's cipher method deserves its own heading in the journal, select that puzzle (`puzzles.json` → the puzzle's ID) and fill in the **CIPHER Override** section: **CIPHER Title** and **CIPHER Description**. Both fields support the same `${...}` template tokens as any other narrative text (`${P}`, `${c.lead}`, a `CORE_VARS` name, etc.) and are resolved the same way. Leave either blank to keep using `threads.json`'s shared default for that field. This only appears for a puzzle whose `LOCK_THREADS` actually includes `CIPHER` — every factory-default and wizard-created puzzle does, so in practice it's always available. Setting it on a puzzle that *doesn't* lock `CIPHER` is harmless but pointless — Data Validation will flag it as dead data that never gets applied.

## Tutorial: Creating a New Puzzle with the Wizard

This is the recommended way to add a new access-code puzzle, since it actively prevents the exact kind of bug that hand-editing `puzzles.json` can introduce (a `LOCK_THREADS` requirement that nothing in the world ever actually delivers, making the puzzle unsolvable).

### 1. Identify the Puzzle
- Click **+ New Puzzle (Wizard)**.
- Give it a unique, all-caps ID (e.g. `SERIAL_PUZZLE`). This is internal only — players never see it.

### 2. Compute the Access Code
- Pick a starting pattern (Year + Pen, Hours + Pen) or write a custom JavaScript expression evaluated against `ctx`.
- Need a variable that isn't `pen`/`year`/`hours`/`seed`? Click **+ New Variable** under the Variables section, name it (e.g. `SERIAL`), and give it a min/max range. It's immediately usable in your expression as `ctx.SERIAL`, and — once you finish the wizard — as `${SERIAL}` in any lore or clue text. This is exactly how you'd support a puzzle built around a serial number, a birthday, or any other custom procedural fact.
- The live preview evaluates your expression against a mock playthrough so you can sanity-check the output format before moving on.

### 3. Lock Threads
- Add every thread the player needs evidence of before this puzzle should count as solvable (typically `CIPHER` plus whatever real-world facts your access code is built from, e.g. `PEN`, `HOUR`, or a brand-new thread you name here).
- Each thread shows a badge: green if something already delivers it, red/warning if nothing does yet.
- For a thread with no coverage, click **+ Add a starter clue** to write one on the spot — every thread listed in this step is a Lock Thread on the puzzle you're building, so the wizard always routes it to `clues.json`, gated to this puzzle.

### 4. Review & Create
- Confirms the final access code, the full Lock Thread list with reachability badges, and any starter clues or new `CORE_VARS`/threads you staged. Click **Create Puzzle** to write everything out at once.

After creating a puzzle, open the **Puzzle Inspector** to double check the full picture, and **Data Validation** to confirm nothing else in the project references it incorrectly. If this puzzle's cipher method deserves its own journal heading rather than the shared `CIPHER` default, see "Overriding CIPHER per puzzle" above.

## Tutorial: Adding a Clue to an Existing Puzzle

The most common authoring task once a puzzle already exists — for example, giving `HOUR_PUZZLE` a second, differently-worded hint elsewhere in the map.

1. Open `clues.json` in the sidebar and pick a sector (e.g. `ARCHIVE`), then **+ Add Entry**.
2. Write the document text and title, and pick a Lore Type.
3. Under **Puzzle**, check `HOUR_PUZZLE`. The Thread dropdown narrows to only the threads `HOUR_PUZZLE` locks against — pick `CIPHER` for a formula hint, or e.g. `HOUR` if this document is meant to reveal the hour count itself. If this exact wording should *also* apply to a different puzzle, check that one too — the field becomes an array automatically, and the dropdown narrows further to only what both puzzles share.
4. Watch the corroboration badge next to the Thread field: it reflects reachability for whichever puzzle(s) you just checked, so you'll immediately see if you've just satisfied a previously-red requirement.
5. Save, then run **Data Validation** to confirm the puzzle/thread linkage is clean.

## Tutorial: Creating a Custom Finale Arc with the Wizard

Want to add an entirely new mystery for the player to unravel? `finales.json` and `foreshadow.json` are two files that must stay index-aligned (see "How a foreshadow group finds its finale" below) — the Finale Wizard is the recommended way to create a new one specifically because it writes both files together in a single step, so a misaligned pair is structurally impossible.

### 1. Identify the Finale
- From either `finales.json` or `foreshadow.json`'s tree view, click **+ New Finale (Wizard)**.
- Give it a **Nickname** — the internal label used in the tree for both the finale and its foreshadow group. Must be unique.
- Write the **Verdict Button Text** (the `option` field) — the short text on the button the player clicks to commit to this ending.

### 2. The Reveal
- Write the full **Reveal Text** — the document the player reads once they've committed to this ending. Dynamic tokens work here same as anywhere else.
- Optionally set a **TELL Thread Override** (`tell_title` / `tell_description`) to customize the player's PDA journal objective while this finale is the active truth. Leave blank to keep `threads.json`'s default `TELL` title/description.

### 3. Foreshadowing
- The wizard pre-seeds the five conventional sectors (`ANNEX`, `ARCHIVE`, `SERVER`, `CLINIC`, `CHASM`). Write a short foreshadowing document for each — this becomes the matching `foreshadow.json` group, with every entry automatically thread `TELL`.
- A badge on each sector shows **written** or **empty — will be skipped**; a sector left blank simply won't be added to the group, no placeholder document is created.
- Pick a sector from the **"Add another sector..."** dropdown and click **Add** to foreshadow in a location beyond the default five (anything `lore.json`/`clues.json` already use).

### 4. Review & Create
- Confirms the nickname, verdict text, a preview of the reveal, the TELL override (if set), and exactly which sectors will be written. Click **Create Finale Arc** to write both files at once.

The wizard refuses to open at all if `finales.json` and `foreshadow.json` are already out of sync (checked against Data Validation's own sync error) — fix that mismatch by hand first, since appending to two already-misaligned arrays would only make the drift worse.

### How a foreshadow group finds its finale

Nothing about a `foreshadow.json` group's *content* points back at its finale — the link is purely **positional**. The group at index 2 in `foreshadow.json` is the lead-up to the finale at index 2 in `finales.json`, full stop. While editing an existing group, the editor shows a "Target Finale" hint box with that index's `option` text so you can sanity-check the pairing. If you ever need to reorder or delete finales by hand instead of through the wizard, both files' entries have to move together, or the pairing silently breaks — Data Validation's sync check only catches a *length* mismatch, not two arrays that are the same length but shuffled, so treat the wizard as the safe path for structural changes.

### Going further: extra flavor lore

The wizard covers what's mechanically required (a finale plus its foreshadow group). If you also want a dedicated investigative thread that `lore.json` content can build toward before the reveal — independent of the guaranteed foreshadow.json evidence — you can still do that by hand:
- Open `threads.json` and add a new entry with a Title and Description (e.g. `"THE CORRIDORS ARE OVERGROWN"`) to register the thread and its journal label.
- Open `lore.json`, create new entries, and tag them with that thread. This is purely optional texture — nothing gates on it — but it gives players a sense of mounting evidence before they ever reach the finale itself.
