# Level 0 Engine Narrative Data

This directory contains the dynamic narrative content for the Level 0 Engine. The engine pulls from these JSON files at runtime to procedurally construct the story and generate case files that adapt to the randomized world state.

## Core Files

1. **`names.json`**: Contains the pools for randomized character names (`FIRST`, `LAST`) and project titles (`PROJECT_NAMES`). These are used to generate the "Cast" and the specific operation the player is investigating in their run.
2. **`library.json`**: Contains the bulk of the text documents that can be found in each sector.
3. **`tags.json`**: Defines the metadata/thematic tagging for each sector, dictating what "types" of clues can be spawned there. **Note:** This file is managed automatically by the Archive Editor as part of `library.json` and should not be edited manually.
4. **`tapes.json`**: Contains the transcripts of audio logs that can be found in the game. Each tape is tagged with a "thread" to determine its relevance to finales.
5. **`foreshadow.json`**: Contains groups of clues that foreshadow specific finales. 
6. **`ephemera.json`**: Contains smaller snippets, sticky notes, and environmental storytelling elements, usually found near the exit.
7. **`finales.json`**: Contains the possible final revelation documents. It is fully dynamic—you can have as many finales as you want! Each finale is an object with an `option` (short summary for the verdict button) and `text` (the full document).

## How it Works

When the game loads, it dynamically fetches all of these JSON files and merges them into memory.

When the player explores the level, `StoryEngine` determines what files should drop in which sector. It cross-references `library.json` and `tags.json` to generate context-appropriate clues.

### Dynamic Tokens

The engine supports dynamic string replacement so that the text adapts to the specific, randomized parameters of the current run. You can safely include the following tokens in your JSON strings:

*   **Cast Tokens**:
    *   `${c.lead}`: The randomly generated name of the lead researcher.
    *   `${c.custodian}`: The name of the facility custodian.
    *   `${c.archivist}`: The name of the archivist/records keeper.
    *   `${c.lost}`: The name of the missing individual.
    *   `${LOST}`: The missing individual's name in ALL CAPS.
*   **Project & World State**:
    *   `${P}`: The randomized project codename (e.g., THRESHOLD, YELLOW FIELD).
    *   `${hrs}`: The number of hours the facility has been isolated (a randomized large number).
    *   `${pen}`: The designated pen number in the impound sector.
    *   `${year}`: The simulated year the site was commissioned.
*   **Procedural Math Equations**:
    *   You can also embed actual JavaScript math evaluations inside the string, referencing the `ctx` (context) variables like `ctx.seed`, `ctx.hours`, and `ctx.siteYear`.
    *   *Example:* `ASYNC RESEARCH REPORT #${ctx.seed * ctx.hours % 666}` will be evaluated and rendered as a static number in the game based on the current procedural seed.

## Adding New Content

To add new documents, you no longer need to edit these files manually! The engine now ships with a built-in **Archive Editor**.

1. Navigate to `lore-editor/` in your terminal.
2. Run `node server.js` to boot up the zero-dependency backend.
3. Open your browser to `http://localhost:3000`.

The sleek Archive Editor allows you to visually explore the entire data structure:
* **library.json**: You can edit the narrative text and seamlessly assign "Thread Tags" inline (the editor updates `tags.json` automatically in the background!).
* **finales.json**: The engine will dynamically recognize any new finale you append using the editor and pull it into the hat on the very next boot. The editor handles the `option` and `text` object structures natively.
* **names.json**: Visualized as a clean, scrollable list where you can quickly add and remove character/project names without dealing with raw JSON arrays.
