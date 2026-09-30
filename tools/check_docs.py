#!/usr/bin/env python3
"""Check the project docs for the mistakes that make a handoff lie.

    python3 tools/check_docs.py              # from the repo root
    python3 tools/check_docs.py --template   # the template itself: placeholders are expected

Errors (exit 1):
  - a {{placeholder}} left in a doc
  - a roadmap ID used twice, filed under the wrong phase, or with an unknown checkbox
  - a decision number used twice or out of order, or superseded by one that does not exist or comes earlier
  - an open question (Q-NNN) defined twice
  - a roadmap ID, decision number or question mentioned in a doc that does not exist
  - two session-log entries with the same number (HANDOFF and docs/archive/ together)
  - a relative link, or a path in AGENTS.md's Repository map table, that points at nothing
Warnings (exit 0):
  - HANDOFF's "Last updated" is missing, or older than its newest session-log entry
  - HANDOFF's session log or "Current state" has outgrown the limits below (time to archive)

Standard library only. HTML comments are ignored, so examples can live in them.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = [
    "AGENTS.md", "CLAUDE.md", "README.md", "ROADMAP.md",
    "docs/README.md", "docs/ROADMAP.md", "docs/HANDOFF.md", "docs/ARCHITECTURE.md", "docs/DECISIONS.md",
    "docs/TESTING.md", "docs/SECURITY.md", "docs/CHANGELOG.md", "docs/CONTRIBUTING.md",
]
# Keep in step with AGENTS.md (end of session, step 3) and HANDOFF's header.
LOG_LIMIT = 10
CURRENT_STATE_LINES = 80

ITEM_RE = re.compile(r"\bP(\d+)-(\d+)\b")
DECISION_RE = re.compile(r"\bD-(\d{3})\b")
QUESTION_RE = re.compile(r"\bQ-(\d{3})\b")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
LINK_RE = re.compile(r"\]\(([^)\s]+)\)|\b(?:href|src)=\"([^\"]+)\"")

errors, warnings = [], []


def read(path):
    text = path.read_text(encoding="utf-8")
    return re.sub(r"<!--.*?-->", "", text, flags=re.S)


def where(path, text, pos):
    return f"{path.relative_to(ROOT)}:{text.count(chr(10), 0, pos) + 1}"


def section(text, heading):
    m = re.search(rf"^## {heading}\b.*?(?=^## |\Z)", text, flags=re.M | re.S)
    return (m.group(0), m.start()) if m else ("", 0)


def main():
    template = "--template" in sys.argv[1:]
    docs = [ROOT / d for d in DOCS if (ROOT / d).is_file()]
    for folder in ("docs/archive",):
        if (ROOT / folder).is_dir():
            docs += sorted(p for p in (ROOT / folder).iterdir()
                           if p.suffix in (".md", ".html") and not p.name.startswith("_"))
    texts = {p: read(p) for p in docs}

    if not template:
        for path, text in texts.items():
            for m in re.finditer(r"\{\{[^}]*\}\}", text):
                errors.append(f"{where(path, text, m.start())}: placeholder left: {m.group(0)[:60]}")

    roadmap = next((p for p in (ROOT / "ROADMAP.md", ROOT / "docs" / "ROADMAP.md") if p in texts), None)
    items = set()
    if roadmap is None:
        errors.append("no ROADMAP.md (looked in the root and in docs/)")
    else:
        text, phase = texts[roadmap], None
        for m in re.finditer(r"^## Phase (\d+)|^- \[(.)\] (P(\d+)-(\d+))\b", text, flags=re.M):
            if m.group(1):
                phase = m.group(1)
                continue
            box, item, item_phase = m.group(2), m.group(3), m.group(4)
            if item in items:
                errors.append(f"{where(roadmap, text, m.start())}: {item} is used twice")
            items.add(item)
            if box not in " x~-":
                errors.append(f"{where(roadmap, text, m.start())}: {item} has checkbox [{box}]; use [ ], [~], [x] or [-]")
            if phase is not None and item_phase != phase:
                errors.append(f"{where(roadmap, text, m.start())}: {item} is filed under Phase {phase}")
        # Archived phases keep their IDs reserved.
        for path, text in texts.items():
            if path.parent.name == "archive":
                items.update(m.group(1) for m in re.finditer(r"^- \[.\] (P\d+-\d+)\b", text, flags=re.M))

    decisions_path = ROOT / "docs" / "DECISIONS.md"
    decisions, supersessions, questions = set(), [], set()
    if decisions_path in texts:
        text, last = texts[decisions_path], 0
        for m in re.finditer(r"^## D-(\d{3})\b([^\n]*)", text, flags=re.M):
            number = int(m.group(1))
            if f"D-{m.group(1)}" in decisions:
                errors.append(f"{where(decisions_path, text, m.start())}: D-{m.group(1)} is used twice")
            elif number < last:
                errors.append(f"{where(decisions_path, text, m.start())}: D-{m.group(1)} comes after D-{last:03d}")
            decisions.add(f"D-{m.group(1)}")
            last = max(last, number)
            by = re.search(r"superseded by D-(\d{3})", m.group(2))
            if by:
                supersessions.append((number, int(by.group(1)), m.start()))
        for number, by, pos in supersessions:
            if f"D-{by:03d}" in decisions and by <= number:
                errors.append(f"{where(decisions_path, text, pos)}: D-{number:03d} is superseded by an earlier "
                              f"decision, D-{by:03d}")
        for m in re.finditer(r"^- \*\*Q-(\d{3})\*\*", text, flags=re.M):
            if f"Q-{m.group(1)}" in questions:
                errors.append(f"{where(decisions_path, text, m.start())}: Q-{m.group(1)} is used twice")
            questions.add(f"Q-{m.group(1)}")

    for path, text in texts.items():
        if roadmap is not None:
            for m in ITEM_RE.finditer(text):
                if m.group(0) not in items:
                    errors.append(f"{where(path, text, m.start())}: {m.group(0)} is not in the roadmap")
        if decisions_path in texts:
            for m in DECISION_RE.finditer(text):
                if m.group(0) not in decisions:
                    errors.append(f"{where(path, text, m.start())}: {m.group(0)} is not in DECISIONS.md")
            for m in QUESTION_RE.finditer(text):
                if m.group(0) not in questions:
                    errors.append(f"{where(path, text, m.start())}: {m.group(0)} is not in DECISIONS.md's open questions")
        for m in LINK_RE.finditer(text):
            target = (m.group(1) or m.group(2)).split("#")[0]
            if not target or "{{" in target or re.match(r"[a-z][a-z0-9+.-]*:", target):
                continue
            if not (path.parent / target).exists():
                errors.append(f"{where(path, text, m.start())}: link to {target}, which does not exist")

    agents = ROOT / "AGENTS.md"
    if agents in texts:
        layout, offset = section(texts[agents], "Repository map")
        for m in re.finditer(r"^\| `([^`]+)` \|", layout, flags=re.M):
            if "{{" not in m.group(1) and not (ROOT / m.group(1)).exists():
                errors.append(f"{where(agents, texts[agents], offset + m.start())}: Repository map lists {m.group(1)}, "
                              f"which does not exist")

    handoff = ROOT / "docs" / "HANDOFF.md"
    if handoff in texts:
        text = texts[handoff]
        session_re = re.compile(r"^### Session (\d+)\b([^\n]*)", flags=re.M)
        sessions = [(m.group(1), (DATE_RE.search(m.group(2)) or [None])[0]) for m in session_re.finditer(text)]
        seen = set()
        for path in [handoff] + [p for p in texts if p.parent.name == "archive"]:
            for m in session_re.finditer(texts[path]):
                if m.group(1) in seen:
                    errors.append(f"{where(path, texts[path], m.start())}: a second entry for Session {m.group(1)}")
                seen.add(m.group(1))
        updated = re.search(r"Last updated:\s*(\d{4}-\d{2}-\d{2})", text)
        newest = max((d for _, d in sessions if d), default=None)
        if not updated:
            if not template:
                warnings.append("docs/HANDOFF.md: no 'Last updated: YYYY-MM-DD' line in Current state")
        elif newest and updated.group(1) < newest:
            warnings.append(f"docs/HANDOFF.md: Current state was last updated {updated.group(1)}, "
                            f"but the session log has an entry from {newest}")
        if len(sessions) > LOG_LIMIT:
            warnings.append(f"docs/HANDOFF.md: {len(sessions)} session-log entries; move all but the newest "
                            f"{LOG_LIMIT} to docs/archive/")
        current, _ = section(text, "Current state")
        if current.count("\n") > CURRENT_STATE_LINES:
            warnings.append(f"docs/HANDOFF.md: Current state is {current.count(chr(10))} lines (limit "
                            f"{CURRENT_STATE_LINES}); move history to the session log")

    for line in errors:
        print(f"ERROR {line}")
    for line in warnings:
        print(f"WARN  {line}")
    print(f"{len(errors)} error(s), {len(warnings)} warning(s) in {len(texts)} file(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
