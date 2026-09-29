#!/usr/bin/env bash
# Runs the meta-roadmap sync-core tests (node:test, no dependencies), then — when the board repo is
# available — the parity regression: board UI (src/sync.ts) and sync-core.mjs must apply proposals identically.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
node --test sync-core.test.mjs
board_repo="${META_BOARD_REPO:-$HOME/meta-roadmap-board}"
if [[ -f "$board_repo/scripts/check-sync-parity.mjs" && -d "$board_repo/node_modules" ]]; then
  node "$board_repo/scripts/check-sync-parity.mjs" --skill "$PWD/../scripts/sync-core.mjs"
else
  echo "parity check skipped: board repo not found at $board_repo (set META_BOARD_REPO)"
fi
