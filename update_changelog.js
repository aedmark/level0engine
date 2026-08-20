const fs = require('fs');
const changelogPath = 'changelog.md';
let content = fs.readFileSync(changelogPath, 'utf8');

const newEntry = `## [v1.3.2] - 2026-08-19

_Architectural Decoupling & The Elevator Update_

### Changed

- **[ARCHITECTURE] Blueprint De-Coupling (\`StructuralBlueprints.js\`):** The legacy pattern of compounding mutually exclusive geometries into single blueprint files ("CRATES OR STAIRWAY", "DUCT OR VENT") has been dismantled. The probabilistic branching that once occurred during the spawn event has been baked directly into the global weighting matrix, mapping exact fractional probabilities to dedicated files.
- **[ARCHITECTURE] The Staircase Extraction (\`Crates.js\`, \`Elevator.js\`):** The cosmetic staircase logic was excised from the engine and replaced with an elevator cabin. The geometry seamlessly inherits the old staircase's warp mechanics by shifting the \`isWarpZone\` collision boundary from the top step to the elevator floor. Spawn frequency of functional teleportation elevators increased from 25% to 40%.
- **[ARCHITECTURE] Duct and Vent Segregation (\`Duct.js\`, \`Vent.js\`):** The complex floor-level crawlspace routing and the generic fallback wall were split into dedicated logic streams. The \`Duct.js\` fail-state (when no viable adjacent exits exist) was modified to return \`false\`, relying on the \`ChunkManager\` to fall back to a standard wall cleanly rather than polluting the blueprint with \`isDefaultWall\` logic.
- **[SYSTEM] Module Preload Map (\`engine.html\`):** The application's preload directive map was explicitly updated to target the newly decoupled asset graph and prevent 404 cache failures.

`;

content = content.replace('# Level 0 Engine Changelog\n', '# Level 0 Engine Changelog\n\n' + newEntry);
fs.writeFileSync(changelogPath, content);
