#!/usr/bin/env bash
# audit.sh — Lighthouse (mobile + desktop) and axe-core accessibility audit.
#
# Runs INSIDE the user's website project. Uses `npx --yes lighthouse` and
# `npx --yes @axe-core/cli` on demand — neither is a dependency of this
# script or the skill; npx downloads them into its cache the first time this
# script is invoked, which requires network access.
#
# Usage:
#   scripts/qa/audit.sh --url http://localhost:4321/ [options]
#
# Options:
#   --url <url>                  URL to audit (default: http://localhost:4321/)
#   --out <dir>                  Output dir (default: .site-builder/qa/<date>/audit)
#   --min-performance <n>        Threshold 0-100 (default: 85, matches project.yaml
#                                 qa.lighthouse_thresholds.performance)
#   --min-accessibility <n>      Threshold 0-100 (default: 95, matches project.yaml
#                                 qa.lighthouse_thresholds.accessibility)
#   --min-seo <n>                Threshold 0-100 (default: 95, matches project.yaml
#                                 qa.lighthouse_thresholds.seo)
#   --min-best-practices <n>     Threshold 0-100 (default: 90; not tracked in
#                                 project.yaml today, override to taste)
#   --skip-lighthouse            Skip the Lighthouse pass
#   --skip-axe                   Skip the axe-core pass
#   --help                       Show this help and exit
#
# This script does not parse project.yaml (no YAML dependency). Copy the
# thresholds from the project's qa.lighthouse_thresholds block into flags by
# hand, or leave the defaults, which already match the template.
#
# Exit codes: 0 all thresholds met and no serious/critical axe violations,
# 1 a threshold was missed or axe found serious/critical violations.

set -uo pipefail

URL="http://localhost:4321/"
OUT=""
MIN_PERF=85
MIN_A11Y=95
MIN_SEO=95
MIN_BP=90
SKIP_LH=0
SKIP_AXE=0

print_help() {
  sed -n '2,33p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --min-performance) MIN_PERF="$2"; shift 2 ;;
    --min-accessibility) MIN_A11Y="$2"; shift 2 ;;
    --min-seo) MIN_SEO="$2"; shift 2 ;;
    --min-best-practices) MIN_BP="$2"; shift 2 ;;
    --skip-lighthouse) SKIP_LH=1; shift ;;
    --skip-axe) SKIP_AXE=1; shift ;;
    --help|-h) print_help; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$OUT" ]]; then
  DATE_STAMP="$(date +%Y-%m-%d)"
  OUT=".site-builder/qa/${DATE_STAMP}/audit"
fi
mkdir -p "$OUT"

FAIL=0

check_threshold() {
  local preset="$1" label="$2" value="$3" min="$4"
  if [[ "$value" == "NA" ]]; then
    echo "  WARN: ${label} score unavailable in ${preset} report." >&2
    return
  fi
  if (( value < min )); then
    echo "  FAIL: ${preset} ${label} ${value} < ${min}" >&2
    FAIL=1
  fi
}

if [[ "$SKIP_LH" -eq 0 ]]; then
  if ! command -v npx >/dev/null 2>&1; then
    echo "npx not found; cannot run Lighthouse. Install Node.js (>=18) or pass --skip-lighthouse." >&2
    FAIL=1
  else
    for PRESET in mobile desktop; do
      JSON_PATH="$OUT/lighthouse-${PRESET}.json"
      HTML_PATH="$OUT/lighthouse-${PRESET}.html"
      echo "Running Lighthouse (${PRESET}) against ${URL} ..."
      PRESET_FLAG=""
      if [[ "$PRESET" == "desktop" ]]; then
        PRESET_FLAG="--preset=desktop"
      fi
      # shellcheck disable=SC2086
      npx --yes lighthouse "$URL" \
        --only-categories=performance,accessibility,best-practices,seo \
        --output=json --output=html \
        --output-path="$OUT/lighthouse-${PRESET}" \
        --chrome-flags="--headless=new --no-sandbox" \
        $PRESET_FLAG \
        --quiet
      LH_STATUS=$?
      # lighthouse writes "<output-path>.report.json" / ".report.html"
      if [[ -f "$OUT/lighthouse-${PRESET}.report.json" ]]; then
        mv "$OUT/lighthouse-${PRESET}.report.json" "$JSON_PATH"
      fi
      if [[ -f "$OUT/lighthouse-${PRESET}.report.html" ]]; then
        mv "$OUT/lighthouse-${PRESET}.report.html" "$HTML_PATH"
      fi
      if [[ ! -f "$JSON_PATH" ]]; then
        echo "Lighthouse (${PRESET}) did not produce a report (exit ${LH_STATUS})." >&2
        FAIL=1
        continue
      fi

      SCORES=$(node -e '
        const fs = require("fs");
        const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const cats = report.categories || {};
        const pct = (c) => (c && typeof c.score === "number" ? Math.round(c.score * 100) : "NA");
        console.log([pct(cats.performance), pct(cats.accessibility), pct(cats["best-practices"]), pct(cats.seo)].join(" "));
      ' "$JSON_PATH")
      read -r PERF A11Y BP SEO <<< "$SCORES"

      echo "  ${PRESET}: performance=${PERF} accessibility=${A11Y} best-practices=${BP} seo=${SEO}"

      check_threshold "$PRESET" "performance" "$PERF" "$MIN_PERF"
      check_threshold "$PRESET" "accessibility" "$A11Y" "$MIN_A11Y"
      check_threshold "$PRESET" "best-practices" "$BP" "$MIN_BP"
      check_threshold "$PRESET" "seo" "$SEO" "$MIN_SEO"
    done
  fi
else
  echo "Skipping Lighthouse (--skip-lighthouse)."
fi

if [[ "$SKIP_AXE" -eq 0 ]]; then
  if ! command -v npx >/dev/null 2>&1; then
    echo "npx not found; cannot run axe-core. Install Node.js (>=18) or pass --skip-axe." >&2
    FAIL=1
  else
    AXE_JSON="$OUT/axe.json"
    echo "Running axe-core against ${URL} ..."
    npx --yes @axe-core/cli "$URL" --save "$AXE_JSON" --chrome-options=no-sandbox,headless=new
    if [[ ! -f "$AXE_JSON" ]]; then
      echo "axe-core did not produce a report." >&2
      FAIL=1
    else
      SERIOUS_COUNT=$(node -e '
        const fs = require("fs");
        const raw = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const results = Array.isArray(raw) ? raw : [raw];
        let count = 0;
        for (const r of results) {
          for (const v of (r.violations || [])) {
            if (v.impact === "serious" || v.impact === "critical") count += (v.nodes || []).length || 1;
          }
        }
        console.log(count);
      ' "$AXE_JSON")
      echo "  axe: ${SERIOUS_COUNT} serious/critical violation node(s)."
      if [[ "$SERIOUS_COUNT" -gt 0 ]]; then
        FAIL=1
      fi
    fi
  fi
else
  echo "Skipping axe-core (--skip-axe)."
fi

echo "Reports written to ${OUT}"
if [[ "$FAIL" -ne 0 ]]; then
  echo "audit.sh: FAIL (threshold miss or accessibility violation found)" >&2
  exit 1
fi
echo "audit.sh: PASS"
exit 0
