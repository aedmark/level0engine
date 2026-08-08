# Level 0 Engine Lore Editor

This directory contains the dynamic narrative content for the Level 0 Engine. The engine pulls from these JSON files at runtime to procedurally construct the story and generate case files that adapt to the randomized world state.

## Core Files

1. **`parameters.json`**: The central registry for dynamic variables and names. Contains the pools for randomized character names (`FIRST`, `LAST`), project titles (`PROJECT_NAMES`), your active cast `ROLES`, template shortcuts (`VARS`), and custom per-playthrough numbers (`CORE_VARS`).
2. **`threads.json`**: The global thread objective hub. Maps internal narrative thread tags (e.g., `LOST`) to an object containing a `title` and a `description`. These populate the player's PDA journal as actual quest objectives.
3. **`puzzles.json`**: Defines the "game modes" or end-goals for a playthrough. Each puzzle defines an `ACCESS_CODE` (the logic to calculate the final door code) and `LOCK_THREADS` (the narrative threads the player must find evidence for before the puzzle counts as solvable).
4. **`clues.json`**: Puzzle-specific evidence — the documents that actually teach the player how to compute a puzzle's access code. Every entry here is always thread `CIPHER` (the editor sets this for you, see below) and is gated to one or more puzzle IDs via its `puzzle` field, so it only spawns in a playthrough where that puzzle was rolled.
5. **`lore.json`**: General background text — audio logs, sticky notes, terminal messages, clipboards — that is **always** injected into every playthrough, regardless of which puzzle is active. Each entry has a `type` property (e.g., `document`, `tape`, `note`, `laptop`, `clipboard`) that dictates how it is rendered in-game.
6. **`foreshadow.json`**: Contains groups of clues that foreshadow specific finales. Every entry is always thread `TELL` (the editor sets this for you too).
7. **`finales.json`**: Contains the possible final revelation documents. It is fully dynamic — you can have as many finales as you want! Each finale is an object with an `option` (short summary for the verdict button), `text` (the full document), and `tell_title` / `tell_description` (to dynamically override the player's PDA journal objective).

## How It Works

When the game loads, it dynamically fetches all of these JSON files and merges them into memory. When the player explores the level, `StoryEngine` determines what documents drop in which sector by cross-referencing `lore.json`, `clues.json`, and `puzzles.json` against the current playthrough's rolled puzzle and world state.

### lore.json vs. clues.json — the one distinction that matters most

This is the single most important thing to understand before you add content, because it decides whether your document shows up in *every* playthrough or only in the ones where it's actually relevant:

* **`lore.json` is unconditional.** Every entry in it gets injected into every playthrough, no matter which puzzle was rolled. Use it for atmosphere, world-building, character texture — anything that's true regardless of which mystery the player is currently solving.
* **`clues.json` is puzzle-gated.** An entry only spawns if its `puzzle` field matches the puzzle that was actually rolled for that playthrough. Use it for anything that's *only* meaningful in the context of solving a specific access code — the actual instructions, formulas, or "here's how the lock works" evidence.

A good rule of thumb: if the text would be confusing or irrelevant to a player who rolled a *different* puzzle, it belongs in `clues.json` with the right `puzzle` field set. If it would make sense no matter what, it belongs in `lore.json`.

### The Thread system, and why CIPHER/TELL are "invisible"

Every piece of content carries a `thread` tag (e.g. `LOST`, `HUM`, `GEOMETRY`, `PEN`). Threads are how the engine tracks "has the player found evidence of X yet" and how `threads.json` labels that objective in the player's journal. A puzzle's `LOCK_THREADS` list says which threads must be corroborated before that puzzle is considered solvable.

Two threads are special, because they aren't really "topics" the way `LOST` or `HUM` are — they're structural markers meaning "this document is instructional content for solving something," and every entry that carries them lives in one specific file:

* **`CIPHER`** — always lives in `clues.json`. It's the "here's the formula" thread that every access-code puzzle locks against.
* **`TELL`** — always lives in `foreshadow.json` (and `finales.json`). It's the "this is foreshadowing a finale" thread.

Because the thread is 100% implied by which file you're editing, **the editor locks the Thread field for `clues.json` and hides it for `foreshadow.json` / `finales.json`.** You never type "CIPHER" or "TELL" by hand — the editor sets it for you automatically. This exists specifically to prevent a class of bug where a clue meant for one puzzle accidentally gets miscounted toward a different puzzle's requirements (both puzzles can lock on `CIPHER`, but a pen-cipher clue and an hour-cipher clue are not interchangeable — see the next section).

Everything else — `LOST`, `HUM`, `GEOMETRY`, `PEN`, `HOUR`, `EPOCH`, or any custom thread you invent — is a normal, freely-typed thread tag, usable in `lore.json` (universal) or as a puzzle's `LOCK_THREADS` requirement.

### How a `clues.json` entry actually gets matched to a puzzle

Since every `clues.json` entry is thread `CIPHER`, the thing that distinguishes "this is the ORIGINAL_PEN cipher clue" from "this is the HOUR_PUZZLE cipher clue" is the `puzzle` field, not the thread:

* `"puzzle": "ORIGINAL_PEN"` — only spawns, and only counts toward reachability, for that one puzzle.
* `"puzzle": ["ORIGINAL_PEN", "HOUR_PUZZLE"]` — an array shares the same clue text across multiple puzzles (handy for a generic "the combination is two numbers" hint that applies no matter which variant got rolled).
* No `puzzle` field at all — the clue is ungated and counts toward *every* puzzle that locks `CIPHER`. This is rarely what you want for `clues.json`; leave the Puzzle checkboxes unchecked only if you deliberately want a clue to apply everywhere.

The editor's Puzzle Inspector, the Data Validation tab, and the little corroboration badge next to the Thread field all respect this `puzzle` scoping — they'll tell you specifically whether *that puzzle* has something delivering `CIPHER`, not just whether *anything, anywhere* is tagged `CIPHER`.

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
    * `${hours}`: The number of hours the facility has been isolated (a randomized large number). `${hrs}` is also supported as a legacy alias for the same value.
    * `${pen}`: The designated pen number in the impound sector.
    * `${year}`: The simulated year the site was commissioned.
* **Custom Vars & Procedural Math**:
    * You can define custom shorthand *templates* in the `VARS` object of `parameters.json` (e.g., `"week": "Math.floor(ctx.hours / 168)"`) — these are JavaScript expressions computed from existing values, and then usable in text as `${week}`.
    * You can also define brand-new *random numbers*, generated once per playthrough exactly like `pen`/`year`/`hours` are, by adding an entry to `CORE_VARS` in `parameters.json` (e.g., `"SERIAL": { "min": 1000, "max": 9999 }`). Once defined, `${SERIAL}` works in any lore/clue text, and `ctx.SERIAL` is usable inside a puzzle's `ACCESS_CODE` expression. The Puzzle Wizard (below) lets you create these inline without ever opening `parameters.json` by hand.
    * You can also embed actual JavaScript math evaluations inside the string directly, referencing `ctx` variables. *Example:* `ASYNC REPORT #${ctx.seed * ctx.hours % 666}`.

    The difference between `VARS` and `CORE_VARS`: `VARS` is a computed shortcut derived from other values; `CORE_VARS` is a brand-new independent random number generated fresh for that playthrough's seed.

## Authoring Content: Using the Archive Editor

To add new documents, you no longer need to edit these files manually! The engine ships with a built-in **Archive Editor**.

1. Double-click `start_editor.bat` (Windows) or run `./start_editor.sh` (Mac/Linux).
2. The editor will automatically open in your default browser at `http://localhost:3000`.
3. Use `stop_servers.bat` or `./stop_servers.sh` when you are done to shut down the backend.

### The sidebar tools

Beyond the seven data files, the sidebar has several tools that exist specifically to keep your narrative logic internally consistent as it grows:

* **+ New Puzzle (Wizard)**: A guided, 4-step flow (Identify → Access Code → Lock Threads → Review) for creating a brand-new puzzle without hand-editing `puzzles.json`. Covered in detail below.
* **Puzzle Inspector**: A read-only dashboard, per puzzle, showing every `LOCK_THREADS` requirement and whether anything actually delivers it, plus a "simulate a run" button that re-rolls a mock seed/pen/year/hours (and any `CORE_VARS`) so you can preview what an access code looks like across a few different playthroughs without launching the game.
* **Data Validation**: A compiler-style pass across all seven files that flags broken references (unknown thread/puzzle IDs), logic mismatches (a clue gated to a puzzle whose `LOCK_THREADS` doesn't even include that thread), unreachable `LOCK_THREADS` (nothing ever delivers a thread a puzzle requires), and stray `clues.json` entries whose thread isn't `CIPHER`. Run this after any batch of edits — it's the fastest way to catch a puzzle that's quietly unsolvable.
* **Export Lore Pack / Import Lore Pack / Factory Reset**: Export bundles all seven live files into one shareable JSON file (handy for backups or sharing a homebrew narrative pack). Import loads one back in, overwriting your live data after a confirmation. Factory Reset is a blunt "undo everything" — it overwrites a file wholesale with the factory baseline, discarding *all* your edits to it (new entries included), not just changes to `_locked` ones, so use Export first if you want a way back. Separately, factory-default entries are marked `_locked` in the data and show a lock icon instead of a delete button in the tree — this only protects them from being deleted one-by-one while you're editing day-to-day; it's not related to what Factory Reset wipes.

### Editing each file

* **Dynamic Variable Toolbar**: When editing documents, a toolbar appears above the text area with one-click injection buttons for all of your core variables, custom `ROLES`, and custom `VARS`/`CORE_VARS`. It automatically adapts whenever you add new variables to `parameters.json`.
* **lore.json**: Edit the narrative text, assign a Thread Tag (any tag except `CIPHER`/`TELL`), and select the Lore Type (Document, Tape, Note, Laptop, Clipboard) which dictates how it renders in the game. Remember: everything here is universal and shows up in *every* playthrough.
* **clues.json**: The Thread field is locked to `CIPHER` automatically — you don't set it. What you *do* set is the **Puzzle checkboxes**: check every puzzle this clue's text applies to. A badge next to the Thread field tells you whether the currently-checked puzzle(s) already have enough corroborating evidence, or whether this clue is the only thing delivering `CIPHER` for that puzzle.
* **foreshadow.json**: Adding a new entry automatically scaffolds out the required sector keys (`ANNEX`, `ARCHIVE`, etc.), each pre-set to thread `TELL`. Use the "Dev Note" field on the root group to leave internal comments for your team.
* **finales.json**: The engine will dynamically recognize any new finale you append using the editor and pull it into the hat on the very next boot. You can also edit the "TELL Thread" overrides here to customize the player's ultimate objective in their PDA journal.
* **parameters.json, puzzles.json & threads.json**: Edit these directly to add new cast members, design new game modes/logic, define new `CORE_VARS`, or expand the overarching narrative quests — without ever touching a line of JavaScript. (For new puzzles specifically, prefer the Puzzle Wizard over hand-editing `puzzles.json` — it validates your access code expression and warns you if a `LOCK_THREADS` requirement has nothing delivering it, before you can create a broken puzzle.)

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
- For a thread with no coverage, click **+ Add a starter clue** to write one on the spot — the wizard routes it to `clues.json` (puzzle-gated, auto-tagged `CIPHER`) if the thread is `CIPHER`/`TELL`, or to `lore.json` (universal) for anything else.

### 4. Review & Create
- Confirms the final access code, the full Lock Thread list with reachability badges, and any starter clues or new `CORE_VARS`/threads you staged. Click **Create Puzzle** to write everything out at once.

After creating a puzzle, open the **Puzzle Inspector** to double check the full picture, and **Data Validation** to confirm nothing else in the project references it incorrectly.

## Tutorial: Adding a Clue to an Existing Puzzle

The most common authoring task once a puzzle already exists — for example, giving `HOUR_PUZZLE` a second, differently-worded hint elsewhere in the map.

1. Open `clues.json` in the sidebar and pick a sector (e.g. `ARCHIVE`), then **+ Add Entry**.
2. Write the document text and title, and pick a Lore Type. Notice the Thread field already reads `CIPHER` and can't be edited — that's expected.
3. Under **Puzzle**, check `HOUR_PUZZLE`. If this exact wording should *also* apply to a different puzzle, check that one too — the field becomes an array automatically.
4. Watch the corroboration badge next to the Thread field: it reflects reachability for whichever puzzle(s) you just checked, so you'll immediately see if you've just satisfied a previously-red requirement.
5. Save, then run **Data Validation** to confirm the puzzle/thread linkage is clean.

## Tutorial: Creating a Custom Finale Arc

Want to add an entirely new mystery for the player to unravel? Follow these steps in the Archive Editor to build a complete narrative arc from scratch:

### 1. Define the Thread
First, establish the overarching theme of your mystery.
- Open `threads.json`.
- Add a new entry and provide a Title (e.g., `"THE CORRIDORS ARE OVERGROWN"`) and a Description to guide the player.
- This registers the thread with the engine and defines what objective label the player sees when they find evidence.

### 2. Create the Finale
Next, write the ultimate revelation.
- Open `finales.json` and click **+ Add Entry**.
- Edit the new object to include an `"option"` (the text on the button the player clicks to solve the mystery), `"text"` (the final document they read), and the TELL Thread Overrides (the text that dynamically displays as their journal objective).
- *Important:* Note the index of your new finale (e.g., Entry 4).

### 3. Write the Foreshadowing Clues
The engine guarantees that specific clues leading to the active finale will spawn in every sector.
- Open `foreshadow.json` and click **+ Add Entry**.
- The editor will automatically generate the required layout (`ANNEX`, `ARCHIVE`, `SERVER`, `CLINIC`, `CHASM`).
- Fill out each location with a clue pointing toward your finale.
- *Critical Rule:* The index of your foreshadow group **must** perfectly match the index of your finale in `finales.json`. The editor will show a "Target Finale" hint box to help you keep track of this linkage!

### 4. Scatter Additional Evidence
Finally, pad out the world with supplementary lore.
- Open `lore.json` and create new entries.
- While editing these documents, use the **Thread Tag** input box to assign your new tag, and set the appropriate **Type** (Tape, Note, etc.).
- When the player finds these documents, they will progress your custom thread!
