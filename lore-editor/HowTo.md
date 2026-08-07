# Level 0 Engine Lore Editor

This directory contains the dynamic narrative content for the Level 0 Engine. The engine pulls from these JSON files at runtime to procedurally construct the story and generate case files that adapt to the randomized world state.

## Core Files

1. **`parameters.json`**: The central registry for dynamic variables and names. Contains the pools for randomized character names (`FIRST`, `LAST`), project titles (`PROJECT_NAMES`), your active cast `ROLES`, and custom equation shortcuts (`VARS`). 
2. **`threads.json`**: The global thread objective hub. Maps internal narrative thread tags (e.g., `LOST`) to an object containing a `title` and a `description`. These populate the player's PDA journal as actual quest objectives.
3. **`puzzles.json`**: Defines the "game modes" or end-goals for a playthrough. Each puzzle defines an `ACCESS_CODE` (the logic to calculate the final door code) and `LOCK_THREADS` (the narrative threads the player must find to solve it).
4. **`clues.json`**: Contains puzzle-specific hints. These clues can be optionally bound to a specific Puzzle ID. The engine will only spawn them if their assigned puzzle is rolled for that playthrough.
5. **`lore.json`**: Contains the bulk of the background text, audio logs, sticky notes, terminal messages, and clipboards. Each entry has a `type` property (e.g., `document`, `tape`, `note`, `laptop`, `clipboard`) that dictates how it is rendered in-game.
6. **`foreshadow.json`**: Contains groups of clues that foreshadow specific finales. 
7. **`finales.json`**: Contains the possible final revelation documents. It is fully dynamic—you can have as many finales as you want! Each finale is an object with an `option` (short summary for the verdict button), `text` (the full document), and `tell_title` / `tell_description` (to dynamically override the player's PDA journal objective).

## How it Works

When the game loads, it dynamically fetches all of these JSON files and merges them into memory.

When the player explores the level, `StoryEngine` determines what files should drop in which sector. It cross-references `lore.json`, `puzzles.json`, and `clues.json` to generate context-appropriate clues that allow the player to solve the current run.

### Dynamic Tokens

The engine supports dynamic string replacement so that the text adapts to the specific, randomized parameters of the current run. You can safely include the following tokens in your JSON strings:

*   **Cast Tokens**:
    *   `${c.[role]}` or `${[role]}`: The procedurally generated full name of any role defined in `parameters.json` `ROLES` (e.g., `${lead}`, `${scapegoat}`).
    *   `${[ROLE]}`: The generated full name of any role in ALL CAPS (e.g., `${LOST}`, `${SCAPEGOAT}`).
    *   `${[role].first_name}`: Extracts only the first name of the role (e.g., `${lead.first_name}`).
    *   `${[role].last_name}`: Extracts only the last name of the role (e.g., `${lead.last_name}`).
    *   `${first_name}` / `${last_name}`: Pulls a generic, random first or last name from the parameter pools. The parser guarantees that multiple uses of this within the *same document* will render the *same* generic name for consistency!
*   **Project & World State**:
    *   `${P}`: The randomized project codename (e.g., THRESHOLD, YELLOW FIELD).
    *   `${hrs}`: The number of hours the facility has been isolated (a randomized large number).
    *   `${pen}`: The designated pen number in the impound sector.
    *   `${year}`: The simulated year the site was commissioned.
*   **Custom Vars & Procedural Math**:
    *   You can define custom shorthand variables in the `VARS` object of `parameters.json` (e.g., `"week": "Math.floor(ctx.hours / 168)"`), and then use them in your text as `${week}`.
    *   You can also embed actual JavaScript math evaluations inside the string directly, referencing `ctx` variables. *Example:* `ASYNC REPORT #${ctx.seed * ctx.hours % 666}`.

## Adding New Content

To add new documents, you no longer need to edit these files manually! The engine now ships with a built-in **Archive Editor**.

1. Double-click `start_editor.bat` (Windows) or run `./start_editor.sh` (Mac/Linux).
2. The editor will automatically open in your default browser at `http://localhost:3000`.
3. Use `stop_servers.bat` or `./stop_servers.sh` when you are done to shut down the backend.

The sleek Archive Editor allows you to visually explore the entire data structure:
* **Dynamic Variable Toolbar**: When editing documents, a toolbar appears above the text area with one-click injection buttons for all of your core variables, custom `ROLES`, and custom `VARS`. It automatically adapts whenever you add new variables to `parameters.json`!
* **lore.json**: Edit the narrative text, assign "Thread Tags", and select the "Lore Type" (Document, Tape, Note, Laptop, Clipboard) which dictates how it renders in the game.
* **clues.json**: Assign clues directly to specific puzzles using the Puzzle checkboxes so they only spawn when mathematically relevant.
* **foreshadow.json**: Adding a new entry automatically scaffolds out the required sector keys (`ANNEX`, `ARCHIVE`, etc.). Use the "Dev Note" field on the root group to leave internal comments for your team.
* **finales.json**: The engine will dynamically recognize any new finale you append using the editor and pull it into the hat on the very next boot. You can also edit the dynamic "TELL Thread" overrides here to customize the player's ultimate objective in their PDA journal.
* **parameters.json, puzzles.json & threads.json**: Edit these directly to add new cast members, design new game modes/logic, or expand the overarching narrative quests without ever touching a line of Javascript.
* **Data Validation Tool**: An integrated compiler that checks all puzzle linkages, thread requirements, and variable definitions to ensure your narrative logic is airtight.

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
- Edit the new object to include an `"option"` (the text on the button the player clicks to solve the mystery), `"Text"` (the final document they read), and the TELL Thread Overrides (the text that dynamically displays as their journal objective).
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
