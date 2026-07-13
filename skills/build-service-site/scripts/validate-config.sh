#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
config=${1:-.site-builder/project.yaml}

if [[ ! -f "$config" ]]; then
  echo "Config not found: $config" >&2
  exit 1
fi

python3 - "$config" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

required = {
    "schema_version",
    "project",
    "workflow",
    "brief",
    "content",
    "design",
    "modules",
    "architecture",
    "deployment",
    "github",
    "approvals",
    "open_questions",
    "assumptions",
}

top_level = {
    match.group(1)
    for line in text.splitlines()
    if (match := re.match(r"^([a-z][a-z0-9_]*):(?:\s|$)", line))
}
missing = sorted(required - top_level)
errors = []

if missing:
    errors.append("missing top-level keys: " + ", ".join(missing))

if not re.search(r"^schema_version:\s*1\s*$", text, re.MULTILINE):
    errors.append("schema_version must be 1")

phase_match = re.search(r"^\s{2}phase:\s*[\"']?([a-z_]+)", text, re.MULTILINE)
allowed_phases = {
    "discovery", "brief", "research", "copy", "design",
    "architecture", "build", "qa", "deploy", "handoff",
}
if not phase_match or phase_match.group(1) not in allowed_phases:
    errors.append("workflow.phase is missing or unsupported")

status_match = re.search(r"^\s{2}status:\s*[\"']?([a-z_]+)", text, re.MULTILINE)
if not status_match or status_match.group(1) not in {"pending", "in_progress", "blocked", "complete"}:
    errors.append("workflow.status is missing or unsupported")

sensitive_keys = re.compile(
    r"^\s+(password|token|secret|private_key|ssh_key_path|host|server_ip|app_dir):\s*[\"']?([^\"'\s][^#]*)$",
    re.IGNORECASE | re.MULTILINE,
)
for match in sensitive_keys.finditer(text):
    value = match.group(2).strip()
    if value not in {"", "null", "~", "[]", "{}"}:
        errors.append(f"private value is not allowed in tracked config: {match.group(1)}")

absolute_home = re.compile(r"/(?:Users|home)/[^/\s]+/")
if absolute_home.search(text):
    errors.append("absolute home path found")

if errors:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    raise SystemExit(1)

print(f"Config is structurally valid: {path}")
PY

"$script_dir/scan-private-data.sh" "$config"
