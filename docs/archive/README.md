# Archive

History moved out of the live docs so they stay short enough to read. Nothing here is current; everything here was
true when it was written. Search it before re-trying something that sounds new.

- **Session logs:** when HANDOFF's session log passes 10 entries, move the oldest to
  `SESSION_LOG_YYYY_MM.md` (the month the sessions happened), oldest at the bottom as in HANDOFF. Move entries
  whole; do not summarise them on the way. `tools/check_docs.py` reads these files too, so session numbers stay
  unique and references in them still resolve.
- **Roadmap phases:** a finished phase can move to `ROADMAP_YYYY_MM.md`, items unchanged. Its IDs stay reserved.
- **Anything else** (an old handoff section, a retired doc): one file per thing, with a line at the top saying when
  and why it was moved.

Archive content is historical, not normative. Never store secrets or sensitive incident evidence here merely
because it is old; follow `docs/SECURITY.md` and the project's retention policy.

Leave a one-line pointer where the text used to be ("Sessions 1 to 24: `docs/archive/SESSION_LOG_2026_05.md`").
