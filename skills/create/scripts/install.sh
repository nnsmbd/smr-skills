#!/usr/bin/env bash
set -euo pipefail

skill_name="create"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(cd -- "$script_dir/.." && pwd)
force=false
dry_run=false

usage() {
  cat <<'USAGE'
Usage: install.sh [--force] [--dry-run]

Install the create skill for Codex only.

Environment override:
  CODEX_HOME   Defaults to $HOME/.codex
USAGE
}

while (($#)); do
  case "$1" in
    --force)
      force=true
      shift
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$source_dir/SKILL.md" ]]; then
  echo "Cannot find the skill source at $source_dir" >&2
  exit 1
fi

codex_home=${CODEX_HOME:-"$HOME/.codex"}
parent="$codex_home/skills"
destination="$parent/$skill_name"

if [[ "$dry_run" == true ]]; then
  echo "Would install Codex skill to $destination"
  exit 0
fi

mkdir -p "$parent"

staging=$(mktemp -d "$parent/.${skill_name}.install.XXXXXX")
cleanup() {
  if [[ -n "${staging:-}" && -d "$staging" ]]; then
    rm -rf -- "$staging"
  fi
}
trap cleanup EXIT

cp -R "$source_dir/." "$staging/"

if [[ ! -f "$staging/SKILL.md" || ! -x "$staging/scripts/render-creative.cjs" ]]; then
  echo "Staging validation failed for Codex" >&2
  exit 1
fi

backup=""
if [[ -e "$destination" ]]; then
  if [[ "$force" != true ]]; then
    echo "$destination already exists; rerun with --force to replace it safely" >&2
    exit 1
  fi

  backup_parent="$codex_home/skill-backups"
  mkdir -p "$backup_parent"
  backup="$backup_parent/${skill_name}.$(date -u +%Y%m%dT%H%M%SZ).$$"
  mv "$destination" "$backup"
  echo "Backed up existing Codex skill to $backup"
fi

if ! mv "$staging" "$destination"; then
  echo "Installation failed for Codex" >&2
  if [[ -n "$backup" && ! -e "$destination" ]]; then
    mv "$backup" "$destination"
    echo "Restored the previous Codex skill at $destination" >&2
  fi
  exit 1
fi
staging=""

echo "Installed Codex skill at $destination"
