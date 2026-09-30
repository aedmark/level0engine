# Documentation map

This directory stores durable project knowledge. Each fact should have one authoritative home; other documents link
to it instead of copying it.

## Audiences and ownership

| Document | Primary audience | Owns | Does not own |
| --- | --- | --- | --- |
| `../README.md` | Players and newcomers | Purpose, quick start, controls, feature tour | Internal workflow or session state |
| `../AGENTS.md` | Coding agents and maintainers | Standing working rules and repository conventions | Feature history or design rationale |
| `../ROADMAP.md` | Maintainers and contributors | Planned scope and status | Detailed implementation notes |
| `HANDOFF.md` | The next work session | Current state, active context, immediate next steps | Permanent design rules |
| `ARCHITECTURE.md` | Developers | System shape, interfaces, invariants, data flow | Chronological history |
| `DECISIONS.md` | Future decision-makers | Rationale and alternatives for durable choices | Routine implementation detail |
| `TESTING.md` | Contributors and release owners | Verification commands, coverage boundaries, known pitfalls | A duplicate of current test results |
| `SECURITY.md` | Users and developers | Sensitive assets, trust boundaries, reporting, secure defaults | Full incident history |
| `CONTRIBUTING.md` | Contributors | Setup, change, review, and submission workflow | Agent-only instructions |
| `CHANGELOG.md` | Players | Released user-visible changes, per version | Commit-by-commit history |
| `../lore-editor/HowTo.md` | Narrative authors | Using the Lore Editor | Engine internals |

## Update triggers

Update documents because a relevant fact changed, not merely because a session ended.

| Change | Required documentation |
| --- | --- |
| User-visible behaviour | README if onboarding or controls changed; CHANGELOG |
| Component, interface, dependency, or data-flow change | ARCHITECTURE |
| Durable tradeoff or reversal | DECISIONS; mark the old decision superseded |
| Test command, coverage, fixture, or environment change | TESTING |
| Server endpoint, trust boundary, or sensitive data change | SECURITY |
| Work pauses with context another session needs | HANDOFF |
| Contribution or release workflow change | CONTRIBUTING and, if agents are affected, AGENTS |
| New planned work | ROADMAP, with origin and acceptance evidence |

## Style and evidence

- Lead with the reader's task or the current truth.
- Use exact commands and repository-relative paths.
- Label examples as examples.
- Date volatile observations and identify the environment or commit when it affects reproducibility.
- Link to the source of truth instead of restating it.
