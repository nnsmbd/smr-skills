#!/usr/bin/env bash
# Runs the meta-roadmap sync-core tests (node:test, no dependencies).
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
node --test sync-core.test.mjs
