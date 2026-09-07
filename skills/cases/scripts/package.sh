#!/usr/bin/env bash
set -euo pipefail

skill_name="cases"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(cd -- "$script_dir/.." && pwd)
output_dir="${1:-$PWD/dist}"

command -v zip >/dev/null 2>&1 || { echo "zip is required" >&2; exit 1; }
[[ -f "$source_dir/SKILL.md" ]] || { echo "Cannot find skill source at $source_dir" >&2; exit 1; }
mkdir -p "$output_dir"
output_dir=$(cd -- "$output_dir" && pwd)
staging_root=$(mktemp -d)
trap 'rm -rf "$staging_root"' EXIT

for platform in codex claude; do
  root="$staging_root/$platform/$skill_name"
  mkdir -p "$root"
  cp -R "$source_dir/." "$root/"
  [[ "$platform" == claude ]] && rm -rf "$root/agents"
  (cd "$staging_root/$platform" && zip -qr "$output_dir/${skill_name}-${platform}.zip" "$skill_name")
done

echo "Created $output_dir/${skill_name}-codex.zip"
echo "Created $output_dir/${skill_name}-claude.zip"
