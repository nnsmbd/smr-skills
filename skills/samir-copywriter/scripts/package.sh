#!/usr/bin/env bash
set -euo pipefail

skill_name="samir-copywriter"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(cd -- "$script_dir/.." && pwd)
output_dir="${1:-$PWD/dist}"

if ! command -v zip >/dev/null 2>&1; then
  echo "zip is required to build uploadable packages" >&2
  exit 1
fi

if [[ ! -f "$source_dir/SKILL.md" ]]; then
  echo "Cannot find the skill source at $source_dir" >&2
  exit 1
fi

mkdir -p "$output_dir"
output_dir=$(cd -- "$output_dir" && pwd)

staging_root=$(mktemp -d)
trap 'rm -rf "$staging_root"' EXIT

codex_root="$staging_root/codex/$skill_name"
claude_root="$staging_root/claude/$skill_name"
mkdir -p "$codex_root" "$claude_root"

cp -R "$source_dir/." "$codex_root/"
cp -R "$source_dir/." "$claude_root/"
rm -rf "$claude_root/agents"

(
  cd "$staging_root/codex"
  zip -qr "$output_dir/${skill_name}-codex.zip" "$skill_name"
)

(
  cd "$staging_root/claude"
  zip -qr "$output_dir/${skill_name}-claude.zip" "$skill_name"
)

echo "Created $output_dir/${skill_name}-codex.zip"
echo "Created $output_dir/${skill_name}-claude.zip"
