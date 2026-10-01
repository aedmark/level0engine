const fs = require('fs');
let changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');

const entry = `## 1.5.8.5
*The AST Check*

### Changed

- **[LORE] Lore Editor Save Validation Parses Logic Strings For Dead References (\`rendering.js\`):** Added a pre-save check that sweeps every property of the currently loaded data file. If any property is named \`conditions\` or \`ACCESS_CODE\`, or if any string contains \`\${...}\` template expressions, the engine's exact \`jsep\` parser converts it into an AST. A new validation hook then traverses that AST, verifying that any referenced cast variable, core variable, thread, or sector actually exists in the current project data. If a dead reference is found, \`handleSave\` aborts the network request entirely rather than letting the author silently break a spawning condition or access code in production.

`;

changelog = changelog.replace('## 1.5.8', entry + '## 1.5.8');
fs.writeFileSync('docs/CHANGELOG.md', changelog);
