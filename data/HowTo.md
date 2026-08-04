# Level 0 Engine Narrative Data

This directory contains the dynamic narrative content for the Level 0 Engine. The engine pulls from these JSON files at runtime to procedurally construct the story and generate case files that adapt to the randomized world state.

## Core Files

1. **`names.json`**: Contains the pools for randomized character names (`FIRST`, `LAST`) and project titles (`PROJECT_NAMES`). These are used to generate the "Cast" and the specific operation the player is investigating in their run.
2. **`library.json`**: Contains the bulk of the text documents that can be found in each sector.
3. **`tags.json`**: Defines the metadata/thematic tagging for each sector, dictating what "types" of clues can be spawned there (e.g., `GEOMETRY`, `CIPHER`, `HUM`).
4. **`tapes.json`**: Contains the transcripts of audio logs that can be found in the game.
5. **`foreshadow.json`**: Contains an array of three distinct sets of clues. The game randomly picks one of these three sets (the "truth" state) when the world is generated. These files heavily hint at the game's ultimate conclusion.
6. **`ephemera.json`**: Contains smaller snippets, sticky notes, and environmental storytelling elements, usually found near the exit.
7. **`finales.json`**: Contains the three possible final revelation documents. Only the one corresponding to the selected "truth" state will be available to the player at the end.

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

To add new documents, simply append a new string to the appropriate array in `library.json` under the sector you want it to appear in (e.g., `"ANNEX": [ ... ]`).

To ensure it gets picked up properly in the randomization pool, you should also add a corresponding theme tag (like `"LOST"` or `"GEOMETRY"`) to the same sector array in `tags.json`.
