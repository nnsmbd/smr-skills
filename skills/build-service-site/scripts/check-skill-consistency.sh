#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
default_skill_dir=$(cd -- "$script_dir/.." && pwd)
skill_dir=${1:-$default_skill_dir}

usage() {
  cat <<'USAGE'
Usage: check-skill-consistency.sh [skill_dir]

Checks internal consistency of a Claude Code / Codex skill directory:
  (a) SKILL.md frontmatter `name` equals the skill directory name;
  (b) agents/openai.yaml exists and its default_prompt mentions $<name>;
  (c) every references/*.md, assets/..., scripts/... path backticked in
      SKILL.md exists (a trailing / marks a directory reference);
  (d) every file under references/ is mentioned somewhere in SKILL.md
      (orphan check);
  (e) SKILL.md is at most 190 lines;
  (f) every references/*.md over 40 lines has a "## Contents" section.

Exits non-zero with a clear message per failed check when any check fails.
skill_dir defaults to the parent directory of this script.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -d "$skill_dir" ]]; then
  echo "Skill directory not found: $skill_dir" >&2
  exit 1
fi

python3 - "$skill_dir" <<'PY'
from pathlib import Path
import re
import sys

skill_dir = Path(sys.argv[1]).resolve()
skill_md = skill_dir / "SKILL.md"
failures = []


def fail(message: str) -> None:
    failures.append(message)


if not skill_md.is_file():
    fail(f"SKILL.md not found at {skill_md}")
    for f in failures:
        print(f"FAIL: {f}", file=sys.stderr)
    raise SystemExit(1)

skill_text = skill_md.read_text(encoding="utf-8")
skill_lines = skill_text.splitlines()

# --- Frontmatter extraction -------------------------------------------------
frontmatter = ""
if skill_lines and skill_lines[0].strip() == "---":
    for idx in range(1, len(skill_lines)):
        if skill_lines[idx].strip() == "---":
            frontmatter = "\n".join(skill_lines[1:idx])
            break

name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
declared_name = name_match.group(1).strip().strip("'\"") if name_match else None
dir_name = skill_dir.name

# (a) name equals directory name
if declared_name is None:
    fail("SKILL.md frontmatter has no `name` field")
elif declared_name != dir_name:
    fail(f"SKILL.md frontmatter name ({declared_name!r}) does not match skill directory name ({dir_name!r})")
else:
    print(f"PASS: SKILL.md name matches directory ({dir_name})")

effective_name = declared_name or dir_name

# (b) agents/openai.yaml exists and default_prompt mentions $<name>
openai_yaml = skill_dir / "agents" / "openai.yaml"
if not openai_yaml.is_file():
    fail(f"agents/openai.yaml not found at {openai_yaml}")
else:
    openai_text = openai_yaml.read_text(encoding="utf-8")
    prompt_match = re.search(r"^\s*default_prompt:\s*(.+)$", openai_text, re.MULTILINE)
    token = f"${effective_name}"
    if not prompt_match:
        fail("agents/openai.yaml has no `default_prompt` field")
    elif token not in prompt_match.group(1):
        fail(f"agents/openai.yaml default_prompt does not mention {token}")
    else:
        print(f"PASS: agents/openai.yaml default_prompt mentions {token}")

# --- Collect backticked paths mentioned in SKILL.md -------------------------
backticked = re.findall(r"`([^`]+)`", skill_text)
prefixes = ("references/", "assets/", "scripts/")
mentioned_paths = sorted({p for p in backticked if p.startswith(prefixes)})

# (c) every mentioned path exists
missing_paths = []
for rel in mentioned_paths:
    target = skill_dir / rel
    if rel.endswith("/"):
        if not target.is_dir():
            missing_paths.append(rel)
    else:
        if not target.exists():
            missing_paths.append(rel)

if missing_paths:
    for rel in missing_paths:
        fail(f"SKILL.md mentions `{rel}` but it does not exist")
else:
    print(f"PASS: all {len(mentioned_paths)} referenced references/assets/scripts paths exist")

# (d) orphan check: every file under references/ is mentioned in SKILL.md
references_dir = skill_dir / "references"
orphans = []
if references_dir.is_dir():
    for path in sorted(references_dir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(skill_dir).as_posix()
        if rel not in skill_text:
            orphans.append(rel)

if orphans:
    for rel in orphans:
        fail(f"{rel} exists under references/ but is not mentioned in SKILL.md")
else:
    print("PASS: no orphaned files under references/")

# (e) SKILL.md line count
max_lines = 190
line_count = len(skill_lines)
if line_count > max_lines:
    fail(f"SKILL.md has {line_count} lines, exceeds the {max_lines}-line limit")
else:
    print(f"PASS: SKILL.md is {line_count} lines (limit {max_lines})")

# (f) references/*.md over 40 lines must have a "## Contents" section
if references_dir.is_dir():
    contents_missing = []
    for path in sorted(references_dir.glob("*.md")):
        content = path.read_text(encoding="utf-8")
        lines = content.splitlines()
        if len(lines) > 40 and "## Contents" not in content:
            contents_missing.append(path.relative_to(skill_dir).as_posix())

    if contents_missing:
        for rel in contents_missing:
            fail(f"{rel} is over 40 lines but has no '## Contents' section")
    else:
        print("PASS: references/*.md over 40 lines all have a '## Contents' section")

# (g) design tokens declare contrast pairs whose color roles exist
tokens_path = skill_dir / "assets" / "design-tokens.css"
if tokens_path.is_file():
    tokens_text = tokens_path.read_text(encoding="utf-8")
    pairs_match = re.search(r"contrast-pairs:\s*(.+)", tokens_text)
    if not pairs_match:
        fail("assets/design-tokens.css has no 'contrast-pairs:' line")
    else:
        defined = set(re.findall(r"--color-([a-z0-9-]+)\s*:", tokens_text))
        missing_roles = []
        for pair in pairs_match.group(1).split(","):
            names = pair.strip().split(":")[0].split("/")
            missing_roles += [n for n in names if n and n not in defined]
        if missing_roles:
            fail("assets/design-tokens.css contrast-pairs reference undefined roles: " + ", ".join(sorted(set(missing_roles))))
        else:
            print("PASS: design-tokens.css contrast pairs reference defined color roles")

# (h) every design-handoff file is described in its README
handoff_dir = skill_dir / "assets" / "design-handoff"
handoff_readme = handoff_dir / "README.md"
if handoff_readme.is_file():
    readme_text = handoff_readme.read_text(encoding="utf-8")
    undocumented = [p.name for p in sorted(handoff_dir.iterdir()) if p.is_file() and p.name != "README.md" and p.name not in readme_text]
    if undocumented:
        fail("assets/design-handoff/README.md does not mention: " + ", ".join(undocumented))
    else:
        print("PASS: assets/design-handoff/README.md mentions every handoff file")

if failures:
    print("", file=sys.stderr)
    for message in failures:
        print(f"FAIL: {message}", file=sys.stderr)
    print(f"\n{len(failures)} consistency check(s) failed.", file=sys.stderr)
    raise SystemExit(1)

print("\nAll skill consistency checks passed.")
PY
