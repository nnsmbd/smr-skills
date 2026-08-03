#!/usr/bin/env bash
set -euo pipefail

skill_name="samir-copywriter"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir=$(cd -- "$script_dir/.." && pwd)
target="both"
force=false
dry_run=false

usage() {
  cat <<'USAGE'
Usage: install.sh [--target codex|claude|both] [--force] [--dry-run]

Environment overrides:
  CODEX_HOME   Defaults to $HOME/.codex
  CLAUDE_HOME  Defaults to $HOME/.claude
USAGE
}

while (($#)); do
  case "$1" in
    --target)
      target=${2:-}
      shift 2
      ;;
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

case "$target" in
  codex|claude|both) ;;
  *)
    echo "--target must be codex, claude, or both" >&2
    exit 2
    ;;
esac

if [[ ! -f "$source_dir/SKILL.md" ]]; then
  echo "Cannot find the skill source at $source_dir" >&2
  exit 1
fi

install_one() {
  local platform=$1
  local base=$2
  local parent="$base/skills"
  local destination="$parent/$skill_name"

  if [[ "$dry_run" == true ]]; then
    echo "Would install $platform skill to $destination"
    return
  fi

  mkdir -p "$parent"

  if [[ -e "$destination" ]]; then
    if [[ "$force" != true ]]; then
      echo "$destination already exists; rerun with --force to replace it safely" >&2
      return 1
    fi
    local backup_parent="$base/skill-backups"
    mkdir -p "$backup_parent"
    local backup="$backup_parent/${skill_name}.$(date -u +%Y%m%dT%H%M%SZ)"
    mv "$destination" "$backup"
    echo "Backed up existing $platform skill to $backup"
  fi

  local staging
  staging=$(mktemp -d "$parent/.${skill_name}.install.XXXXXX")
  cp -R "$source_dir/." "$staging/"
  if [[ "$platform" == claude ]]; then
    rm -rf "$staging/agents"
  fi
  mv "$staging" "$destination"

  if [[ ! -f "$destination/SKILL.md" ]]; then
    echo "Installation failed for $platform" >&2
    exit 1
  fi

  echo "Installed $platform skill at $destination"
}

codex_home=${CODEX_HOME:-"$HOME/.codex"}
claude_home=${CLAUDE_HOME:-"$HOME/.claude"}

case "$target" in
  codex)
    install_one codex "$codex_home"
    ;;
  claude)
    install_one claude "$claude_home"
    ;;
  both)
    install_one codex "$codex_home"
    install_one claude "$claude_home"
    ;;
esac
