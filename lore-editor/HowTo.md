# Level 0 Engine Narrative Data

This directory contains the dynamic narrative content for the Level 0 Engine. The engine pulls from these JSON files at runtime to procedurally construct the story and generate case files that adapt to the randomized world state.

## Core Files

1. **`names.json`**: The central registry for dynamic variables. Contains the pools for randomized character names (`FIRST`, `LAST`), project titles (`PROJECT_NAMES`), your active cast `ROLES`, and custom `VARS`. 
2. **`library.json`**: Contains the bulk of the text documents that can be found in each sector.
3. **`tags.json`**: Defines the metadata/thematic tagging for each sector, dictating what "types" of clues can be spawned there. **Note:** This file is managed automatically by the Archive Editor as part of `library.json` and should not be edited manually.
4. **`tapes.json`**: Contains the transcripts of audio logs that can be found in the game. Each tape is tagged with a "thread" to determine its relevance to finales.
5. **`foreshadow.json`**: Contains groups of clues that foreshadow specific finales. 
6. **`ephemera.json`**: Contains smaller snippets, sticky notes, and environmental storytelling elements, usually found near the exit.
7. **`finales.json`**: Contains the possible final revelation documents. It is fully dynamic—you can have as many finales as you want! Each finale is an object with an `option` (short summary for the verdict button) and `text` (the full document).
8. **`threads.json`**: The global thread registry. Maps internal narrative thread tags (e.g., `LOST`) to their evaluated UI presentation (e.g., `THE DISPOSITION OF ${LOST}`).

## How it Works

When the game loads, it dynamically fetches all of these JSON files and merges them into memory.

When the player explores the level, `StoryEngine` determines what files should drop in which sector. It cross-references `library.json` and `tags.json` to generate context-appropriate clues.

### Dynamic Tokens

The engine supports dynamic string replacement so that the text adapts to the specific, randomized parameters of the current run. You can safely include the following tokens in your JSON strings:

*   **Cast Tokens**:
    *   `${c.[role]}`: The procedurally generated name of any role defined in `names.json` `ROLES` (e.g., `${c.lead}`, `${c.scapegoat}`).
    *   `${[ROLE]}`: The generated name of any role in ALL CAPS (e.g., `${LOST}`, `${SCAPEGOAT}`).
*   **Project & World State**:
    *   `${P}`: The randomized project codename (e.g., THRESHOLD, YELLOW FIELD).
    *   `${hrs}`: The number of hours the facility has been isolated (a randomized large number).
    *   `${pen}`: The designated pen number in the impound sector.
    *   `${year}`: The simulated year the site was commissioned.
*   **Custom Vars & Procedural Math**:
    *   You can define custom shorthand variables in the `VARS` object of `names.json` (e.g., `"week": "Math.floor(ctx.hours / 168)"`), and then use them in your text as `${week}`.
    *   You can also embed actual JavaScript math evaluations inside the string directly, referencing `ctx` variables. *Example:* `ASYNC REPORT #${ctx.seed * ctx.hours % 666}`.

## Adding New Content

To add new documents, you no longer need to edit these files manually! The engine now ships with a built-in **Archive Editor**.

1. Double-click `start_editor.bat` (Windows) or run `./start_editor.sh` (Mac/Linux).
2. The editor will automatically open in your default browser at `http://localhost:3000`.
3. Use `stop_servers.bat` or `./stop_servers.sh` when you are done to shut down the backend.

The sleek Archive Editor allows you to visually explore the entire data structure:
* **Dynamic Variable Toolbar**: When editing documents, a toolbar appears above the text area with one-click injection buttons for all of your core variables, custom `ROLES`, and custom `VARS`. It automatically adapts whenever you add new variables to `names.json`!
* **library.json & tapes.json**: Edit the narrative text and seamlessly assign "Thread Tags" inline with autocomplete datalists (the editor manages `tags.json` in the background).
* **foreshadow.json**: Adding a new entry automatically scaffolds out the required sector keys (`ANNEX`, `ARCHIVE`, etc.).
* **finales.json**: The engine will dynamically recognize any new finale you append using the editor and pull it into the hat on the very next boot. 
* **names.json & threads.json**: Edit these directly to add new cast members, procedural math shortcuts, or overarching narrative threads without ever touching a line of Javascript.

## Tutorial: Creating a Custom Finale Arc

Want to add an entirely new mystery for the player to unravel? Follow these steps in the Archive Editor to build a complete narrative arc from scratch:

### 1. Define the Thread
First, establish the overarching theme of your mystery. 
- Open `threads.json`.
- Add a new entry (e.g., Key: `"MOLD"`, Value: `"THE CORRIDORS ARE OVERGROWN"`).
- This registers the thread with the engine and defines what objective label the player sees when they find evidence.

### 2. Create the Finale
Next, write the ultimate revelation.
- Open `finales.json` and click **+ Add Entry**.
- Edit the new object to include an `"option"` (the text on the button the player clicks to solve the mystery) and `"text"` (the final document they read).
- *Important:* Note the index of your new finale (e.g., Entry 4).

### 3. Write the Foreshadowing Clues
The engine guarantees that specific clues leading to the active finale will spawn in every sector.
- Open `foreshadow.json` and click **+ Add Entry**.
- The editor will automatically generate the required layout (`ANNEX`, `ARCHIVE`, `SERVER`, `CLINIC`, `CHASM`).
- Fill out each location with a clue pointing toward your finale.
- *Critical Rule:* The index of your foreshadow group **must** perfectly match the index of your finale in `finales.json`. The editor will show a "Target Finale" hint box to help you keep track of this linkage!

### 4. Scatter Additional Evidence
Finally, pad out the world with supplementary lore.
- Open `library.json` and `tapes.json` and create new entries.
- While editing these documents, use the **Thread Tag** input box to assign your new tag (e.g., `MOLD`). 
- When the player finds these documents, they will progress your custom thread!
