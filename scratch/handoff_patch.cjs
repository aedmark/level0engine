const fs = require('fs');
let handoff = fs.readFileSync('docs/HANDOFF.md', 'utf8');

const entry = `### Session 5: 2026-09-30: P3-04 Lore Editor save validation

**Contributor:** Antigravity
**Goal:** Complete P3-04 (Lore Editor validation: refuse to save an entry whose conditions reference an unknown thread, variable or sector).
**Done:** P3-04
**Changed:** Added \`runPreSaveConditionChecks\` to \`lore-editor/js/rendering.js\`. It intercepts \`handleSave()\` and parses all \`conditions\`, \`ACCESS_CODE\`, and \`\${...}\` templates across all edited data using \`window.jsep(expr)\`. It traverses the generated AST, verifying that any referenced variable (e.g. \`c.lead\`, \`ctx.coreVars.XYZ\`), thread (\`ctx.threads.TELL\`), or sector (\`ctx.sector === 'ANNEX'\`) actually exists in the cross-file project state. If an unknown reference is detected, \`handleSave\` aborts with an alert box rather than dispatching the network request.
**Verified:** Tests pass. Script checked.

`;

handoff = handoff.replace('### Session 3', entry + '### Session 3');
// also change "session 4" to "session 5" and "P3-03 (Coverage report)" to "P3-04 (Lore Editor validation)"
handoff = handoff.replace('_Last updated: 2026-09-30, session 4, on `master` after P3-03 (Coverage report)._', '_Last updated: 2026-09-30, session 5, on `master` after P3-04 (Lore Editor validation)._');
handoff = handoff.replace('1. Phase 3 (starting with P3-04, whatever is next).', '1. Phase 3 (starting with P3-05).');

fs.writeFileSync('docs/HANDOFF.md', handoff);
