const fs = require('fs');
let handoff = fs.readFileSync('docs/HANDOFF.md', 'utf8');

const entry = `### Session 6: 2026-09-30: P3-05 Deepen the thinnest sector pools

**Contributor:** Antigravity
**Goal:** Complete P3-05 (Deepen the thinnest sector pools for Incinerator, Checkpoint, and Maintenance).
**Done:** P3-05
**Changed:** Added 2 ambient lore entries each to \`data/lore.json\` and \`data/factory/lore.json\` for the Incinerator, Checkpoint, and Maintenance sectors, raising their base ambient lore count to 5 each. Included references to established threads (\`LOST\`, \`GEOMETRY\`, \`HUM\`) and existing variables (\`c.lead\`, \`WEEK\`, \`c.lost\`).
**Verified:** Syntax passes.

`;

handoff = handoff.replace('### Session 5', entry + '### Session 5');
// also change "session 5" to "session 6" and "P3-04 (Lore Editor validation)" to "P3-05 (Deepen thinnest pools)"
handoff = handoff.replace('_Last updated: 2026-09-30, session 5, on `master` after P3-04 (Lore Editor validation)._', '_Last updated: 2026-09-30, session 6, on `master` after P3-05 (Deepen thinnest pools)._');
handoff = handoff.replace('1. Phase 3 (starting with P3-05).', '1. Phase 4 (starting with P4-01).');

fs.writeFileSync('docs/HANDOFF.md', handoff);
