#!/usr/bin/env python3
"""Produce a deterministic line-level diff for learn-from-edits."""

from __future__ import annotations

import argparse
import hashlib
import json
from difflib import SequenceMatcher
from pathlib import Path


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_report(before_path: Path, after_path: Path) -> dict:
    before_text = read_text(before_path)
    after_text = read_text(after_path)
    before_lines = before_text.splitlines()
    after_lines = after_text.splitlines()
    matcher = SequenceMatcher(a=before_lines, b=after_lines, autojunk=False)

    changes = []
    for tag, before_start, before_end, after_start, after_end in matcher.get_opcodes():
        if tag == "equal":
            continue
        changes.append(
            {
                "kind": tag,
                "before_lines": [before_start + 1, before_end],
                "after_lines": [after_start + 1, after_end],
                "before": before_lines[before_start:before_end],
                "after": after_lines[after_start:after_end],
            }
        )

    return {
        "before": {
            "path": str(before_path.resolve()),
            "sha256": digest(before_text),
            "lines": len(before_lines),
        },
        "after": {
            "path": str(after_path.resolve()),
            "sha256": digest(after_text),
            "lines": len(after_lines),
        },
        "change_count": len(changes),
        "changes": changes,
    }


def line_range(bounds: list[int]) -> str:
    start, end = bounds
    if end < start:
        return "∅"
    return str(start) if start == end else f"{start}-{end}"


def quote_lines(lines: list[str]) -> str:
    if not lines:
        return "_empty_"
    return "\n".join(f"> {line}" if line else ">" for line in lines)


def render_markdown(report: dict) -> str:
    output = [
        "# Edit Diff",
        "",
        f"- Before: `{report['before']['path']}` (`{report['before']['sha256']}`)",
        f"- After: `{report['after']['path']}` (`{report['after']['sha256']}`)",
        f"- Changed blocks: {report['change_count']}",
    ]
    for index, change in enumerate(report["changes"], start=1):
        output.extend(
            [
                "",
                f"## Change {index}: {change['kind']}",
                "",
                f"Before lines {line_range(change['before_lines'])}:",
                "",
                quote_lines(change["before"]),
                "",
                f"After lines {line_range(change['after_lines'])}:",
                "",
                quote_lines(change["after"]),
            ]
        )
    return "\n".join(output)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare an AI draft with a user-edited version."
    )
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args()

    for path in (args.before, args.after):
        if not path.is_file():
            parser.error(f"not a readable file: {path}")

    report = build_report(args.before, args.after)
    if args.format == "json":
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(render_markdown(report))


if __name__ == "__main__":
    main()
