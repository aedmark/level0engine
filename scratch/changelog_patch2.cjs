const fs = require('fs');
let changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');

const entry = `## 1.5.8.6
*The Thinnest Pools*

### Added

- **[NARRATIVE] Expanded Thinnest Sector Pools in \`lore.json\` (\`lore.json\`):** Increased ambient lore coverage for Incinerator, Checkpoint, and Maintenance. Each sector received two new entries (document, note, or clipboard formats) weaving in existing variables (\`c.lead\`, \`WEEK\`, \`c.lost\`) and assigning them to established threads (\`LOST\`, \`GEOMETRY\`, \`HUM\`).

`;

changelog = changelog.replace('## 1.5.8.5', entry + '## 1.5.8.5');
fs.writeFileSync('docs/CHANGELOG.md', changelog);
