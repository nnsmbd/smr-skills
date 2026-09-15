#!/usr/bin/env bash
# Plain-bash test suite for build-service-site scripts. No external
# dependencies beyond bash + python3 (already required by the scripts
# themselves). Never touches the real $HOME.
set -uo pipefail

tests_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
skill_dir=$(cd -- "$tests_dir/.." && pwd)
scripts_dir="$skill_dir/scripts"
fixtures_dir="$tests_dir/fixtures"

pass_count=0
fail_count=0
failed_names=()

# --------------------------------------------------------------------------
# add_cleanup <command-string>
# Accumulates shell snippets to run (most-recently-added first) from a single
# EXIT trap, so multiple sections of this suite (tmp dirs, background
# servers) can each register their own cleanup without clobbering another
# section's `trap ... EXIT`.
# --------------------------------------------------------------------------
cleanup_actions=()
add_cleanup() {
  cleanup_actions+=("$1")
}
run_cleanup() {
  local idx
  for ((idx = ${#cleanup_actions[@]} - 1; idx >= 0; idx--)); do
    eval "${cleanup_actions[idx]}"
  done
}
trap run_cleanup EXIT

# --------------------------------------------------------------------------
# expect_exit <name> <expected_exit_code> <extra_check:contains|not_contains|none> <needle> -- <command...>
# Runs the command, captures combined stdout+stderr and exit code, and
# reports PASS/FAIL.
# --------------------------------------------------------------------------
expect_exit() {
  local name=$1 expected=$2 mode=$3 needle=$4
  shift 4
  if [[ "${1:-}" != "--" ]]; then
    echo "internal test harness error: expected -- before command" >&2
    exit 2
  fi
  shift

  local output rc
  output=$("$@" 2>&1)
  rc=$?

  local ok=true
  local reason=""

  if [[ "$rc" -ne "$expected" ]]; then
    ok=false
    reason="expected exit $expected, got $rc"
  fi

  if $ok; then
    case "$mode" in
      contains)
        if [[ "$output" != *"$needle"* ]]; then
          ok=false
          reason="expected output to contain: $needle"
        fi
        ;;
      not_contains)
        if [[ "$output" == *"$needle"* ]]; then
          ok=false
          reason="expected output NOT to contain: $needle"
        fi
        ;;
      none) ;;
      *)
        echo "internal test harness error: unknown mode $mode" >&2
        exit 2
        ;;
    esac
  fi

  if $ok; then
    echo "PASS: $name"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: $name -- $reason"
    echo "  command: $*"
    echo "  output:"
    while IFS= read -r line; do
      echo "    $line"
    done <<<"$output"
    fail_count=$((fail_count + 1))
    failed_names+=("$name")
  fi
}

echo "== validate-config.sh =="

expect_exit "validate-config: assets/project.yaml passes" 0 none "" -- \
  "$scripts_dir/validate-config.sh" "$skill_dir/assets/project.yaml"

expect_exit "validate-config: 4-space re-indented file passes" 0 none "" -- \
  "$scripts_dir/validate-config.sh" "$fixtures_dir/project-v2-4space.yaml"

expect_exit "validate-config: v1 fixture passes with migration warning" 0 contains "WARNING" -- \
  "$scripts_dir/validate-config.sh" "$fixtures_dir/project-v1.yaml"

expect_exit "validate-config: bad site_type fails" 1 contains "site_type" -- \
  "$scripts_dir/validate-config.sh" "$fixtures_dir/project-v2-bad-site-type.yaml"

expect_exit "validate-config: bad workflow.phase fails" 1 contains "phase" -- \
  "$scripts_dir/validate-config.sh" "$fixtures_dir/project-v2-bad-phase.yaml"

expect_exit "validate-config: destination_env with a URL fails" 1 contains "destination_env" -- \
  "$scripts_dir/validate-config.sh" "$fixtures_dir/project-v2-bad-destination-env.yaml"

expect_exit "validate-config: sensitive key (server_ip) fails" 1 contains "server_ip" -- \
  "$scripts_dir/validate-config.sh" "$fixtures_dir/project-v2-sensitive-key.yaml"

# --------------------------------------------------------------------------
# Fallback YAML parser regressions: tabs, PyYAML-dump-style same-indent
# sequences, and a required v2 field. Fixtures are built at runtime (never
# committed) since they exist only to exercise these edge cases.
# --------------------------------------------------------------------------
validate_tmp=$(mktemp -d "${TMPDIR:-/tmp}/bss-validate-test.XXXXXX")
add_cleanup 'rm -rf "$validate_tmp"'

# Tab-indented v2 config: a leading tab anywhere in a line's indentation must
# be rejected with an explicit, actionable error instead of being silently
# mis-parsed.
tab_config="$validate_tmp/project-tabs.yaml"
{
  printf 'schema_version: 2\n'
  printf 'project:\n'
  printf '\tsite_type: "undecided"\n'
} >"$tab_config"

expect_exit "validate-config: tab-indented file fails with explicit tab message" 1 contains "tabs are not valid YAML indentation" -- \
  "$scripts_dir/validate-config.sh" "$tab_config"

# Same-indent block sequence (PyYAML's default `yaml.dump()` style): the
# `- ` marker sits at the SAME indentation as the key that owns the list,
# not one level deeper.
same_indent_config="$validate_tmp/project-same-indent-events.yaml"
python3 - "$skill_dir/assets/project.yaml" "$same_indent_config" <<'PY'
import sys

src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()
text = text.replace(
    "  events: []\n",
    "  events:\n  - name: cta_click\n    selector: \"#hero\"\n",
    1,
)
open(dst, "w", encoding="utf-8").write(text)
PY

expect_exit "validate-config: same-indent block sequence (PyYAML dump style) passes" 0 none "" -- \
  "$scripts_dir/validate-config.sh" "$same_indent_config"

# Structural sub-check: the same-indent list must parse to an actual list of
# mappings, not a null/string/dropped value. The parser lives inline in a
# heredoc inside validate-config.sh (not an importable module), so extract
# and exec just the function definitions rather than duplicating the parser
# here; skip (not fail) if that extraction ever stops working.
structural_output=$(python3 - "$scripts_dir/validate-config.sh" "$same_indent_config" <<'PY'
import re
import sys

script_path, config_path = sys.argv[1], sys.argv[2]
script_text = open(script_path, encoding="utf-8").read()
m = re.search(r"python3 - \"\$config\" <<'PY'\n(.*)\nPY\n", script_text, re.S)
if not m:
    print("COULD_NOT_EXTRACT_PARSER")
    raise SystemExit(0)

body = m.group(1)
cut = body.split("\ndata = None", 1)[0]
ns = {}
try:
    exec(compile(cut, "<validate-config-parser>", "exec"), ns)
except Exception as exc:
    print(f"EXEC_ERROR: {exc}")
    raise SystemExit(0)

fallback_parse = ns.get("fallback_parse")
if fallback_parse is None:
    print("NO_FALLBACK_PARSE")
    raise SystemExit(0)

config_text = open(config_path, encoding="utf-8").read()
data = fallback_parse(config_text)
events = (data.get("analytics") or {}).get("events")
if events == [{"name": "cta_click", "selector": "#hero"}]:
    print("STRUCTURAL_OK")
else:
    print(f"STRUCTURAL_MISMATCH: {events!r}")
PY
)

if [[ "$structural_output" == *"STRUCTURAL_OK"* ]]; then
  echo "PASS: validate-config: same-indent events parse to a list of mappings"
  pass_count=$((pass_count + 1))
elif [[ "$structural_output" == *"COULD_NOT_EXTRACT_PARSER"* ]] || [[ "$structural_output" == *"NO_FALLBACK_PARSE"* ]]; then
  echo "SKIP: validate-config: same-indent events structural check ($structural_output)"
else
  echo "FAIL: validate-config: same-indent events parse to a list of mappings"
  echo "  output: $structural_output"
  fail_count=$((fail_count + 1))
  failed_names+=("validate-config: same-indent events structural check")
fi

# v2 missing brief.access_model (a required key, like project.site_type and
# deployment.runtime) must fail.
missing_access_config="$validate_tmp/project-missing-access-model.yaml"
grep -vF '  access_model: ""' "$skill_dir/assets/project.yaml" >"$missing_access_config"

expect_exit "validate-config: v2 missing brief.access_model fails" 1 contains "access_model" -- \
  "$scripts_dir/validate-config.sh" "$missing_access_config"

# v2 design.source: required key, must be one of the allowed enum values.
bad_design_source_config="$validate_tmp/project-bad-design-source.yaml"
sed 's/^  source: "undecided"$/  source: "bogus"/' "$skill_dir/assets/project.yaml" >"$bad_design_source_config"

expect_exit "validate-config: bad design.source fails" 1 contains "design.source" -- \
  "$scripts_dir/validate-config.sh" "$bad_design_source_config"

missing_design_source_config="$validate_tmp/project-missing-design-source.yaml"
grep -vF '  source: "undecided"' "$skill_dir/assets/project.yaml" >"$missing_design_source_config"

expect_exit "validate-config: missing design.source fails" 1 contains "design.source" -- \
  "$scripts_dir/validate-config.sh" "$missing_design_source_config"

# approvals.acceptance: optional, but its status (when present) is drawn from
# the same approval-status set as every other gate, and devices/unverified
# must be lists (not a bare string) when present.
bad_acceptance_status_config="$validate_tmp/project-bad-acceptance-status.yaml"
sed '/^  acceptance:$/,/^  unverified: \[\]$/ s/^    status: "pending"$/    status: "bogus"/' \
  "$skill_dir/assets/project.yaml" >"$bad_acceptance_status_config"

expect_exit "validate-config: bad approvals.acceptance.status fails" 1 contains "approvals.acceptance.status" -- \
  "$scripts_dir/validate-config.sh" "$bad_acceptance_status_config"

bad_acceptance_devices_config="$validate_tmp/project-bad-acceptance-devices.yaml"
sed 's/^    devices: \[\]$/    devices: "iphone"/' "$skill_dir/assets/project.yaml" >"$bad_acceptance_devices_config"

expect_exit "validate-config: approvals.acceptance.devices as a string fails" 1 contains "acceptance.devices" -- \
  "$scripts_dir/validate-config.sh" "$bad_acceptance_devices_config"

bad_acceptance_unverified_config="$validate_tmp/project-bad-acceptance-unverified.yaml"
sed 's/^    unverified: \[\]$/    unverified: "dark mode"/' "$skill_dir/assets/project.yaml" >"$bad_acceptance_unverified_config"

expect_exit "validate-config: approvals.acceptance.unverified as a string fails" 1 contains "acceptance.unverified" -- \
  "$scripts_dir/validate-config.sh" "$bad_acceptance_unverified_config"

echo
echo "== scan-private-data.sh =="

# Build a fake secret at runtime (never committed as a literal contiguous
# string) so this repo never carries a real-looking credential, and so it
# cannot trip GitHub push protection when this test file itself is scanned.
scan_tmp=$(mktemp -d "${TMPDIR:-/tmp}/bss-scan-test.XXXXXX")
add_cleanup 'rm -rf "$scan_tmp"'

secret_prefix="sk-live-"
secret_body="ABCDEFGHIJKLMNOPQRSTUVWX0123456789"
fake_secret="${secret_prefix}${secret_body}"
printf 'token: %s\n' "$fake_secret" > "$scan_tmp/config-with-secret.env"

secret_output=$("$scripts_dir/scan-private-data.sh" "$scan_tmp" 2>&1)
secret_rc=$?

if [[ "$secret_rc" -ne 0 ]] && [[ "$secret_output" == *"API secret"* ]] && [[ "$secret_output" != *"$fake_secret"* ]]; then
  echo "PASS: scan-private-data: fake secret is caught and never printed"
  pass_count=$((pass_count + 1))
else
  echo "FAIL: scan-private-data: fake secret detection/redaction"
  echo "  exit=$secret_rc"
  echo "  output: $secret_output"
  fail_count=$((fail_count + 1))
  failed_names+=("scan-private-data: fake secret detection/redaction")
fi
rm -f "$scan_tmp/config-with-secret.env"

expect_exit "scan-private-data: documentation IPs (RFC 5737) are not flagged" 0 none "" -- \
  "$scripts_dir/scan-private-data.sh" "$fixtures_dir/doc-ip-sample.txt"

# --allow-ip should allow an otherwise-flagged address.
allow_tmp=$(mktemp -d "${TMPDIR:-/tmp}/bss-scan-allow.XXXXXX")
# Build the private address at runtime so the skill's own privacy scan stays clean.
private_ip="10.99.99.$((90 + 9))"
printf 'internal_test_host: %s\n' "$private_ip" > "$allow_tmp/hosts.txt"

expect_exit "scan-private-data: unlisted private IP is flagged by default" 1 contains "IPv4 address" -- \
  "$scripts_dir/scan-private-data.sh" "$allow_tmp"

expect_exit "scan-private-data: --allow-ip suppresses a specific address" 0 none "" -- \
  "$scripts_dir/scan-private-data.sh" "$allow_tmp" --allow-ip "$private_ip"

rm -rf "$allow_tmp"

echo
echo "== install.sh =="

install_root=$(mktemp -d "${TMPDIR:-/tmp}/bss-install-test.XXXXXX")
codex_home="$install_root/codex-home"
claude_home="$install_root/claude-home"
mkdir -p "$codex_home" "$claude_home"

# Pre-create only the codex destination, simulating a prior install, and
# leave the claude destination absent.
mkdir -p "$codex_home/skills/build-service-site"
echo "pre-existing codex install marker" > "$codex_home/skills/build-service-site/PREEXISTING"

install_output=$(CODEX_HOME="$codex_home" CLAUDE_HOME="$claude_home" \
  "$scripts_dir/install.sh" --target both 2>&1)
install_rc=$?

claude_installed=false
if [[ -f "$claude_home/skills/build-service-site/SKILL.md" ]]; then
  claude_installed=true
fi

if [[ "$install_rc" -ne 0 ]] && $claude_installed; then
  echo "PASS: install.sh --target both: codex pre-exists without --force -> claude still installed, exit non-zero"
  pass_count=$((pass_count + 1))
else
  echo "FAIL: install.sh --target both without --force"
  echo "  exit=$install_rc claude_installed=$claude_installed"
  echo "  output: $install_output"
  fail_count=$((fail_count + 1))
  failed_names+=("install.sh --target both without --force")
fi

# Now retry with --force: codex should be backed up and both should install.
force_output=$(CODEX_HOME="$codex_home" CLAUDE_HOME="$claude_home" \
  "$scripts_dir/install.sh" --target both --force 2>&1)
force_rc=$?

backup_created=false
if compgen -G "$codex_home/skill-backups/build-service-site.*" >/dev/null 2>&1; then
  backup_created=true
fi

codex_reinstalled=false
if [[ -f "$codex_home/skills/build-service-site/SKILL.md" ]]; then
  codex_reinstalled=true
fi

if [[ "$force_rc" -eq 0 ]] && $backup_created && $codex_reinstalled; then
  echo "PASS: install.sh --target both --force: backs up and reinstalls both"
  pass_count=$((pass_count + 1))
else
  echo "FAIL: install.sh --target both --force"
  echo "  exit=$force_rc backup_created=$backup_created codex_reinstalled=$codex_reinstalled"
  echo "  output: $force_output"
  fail_count=$((fail_count + 1))
  failed_names+=("install.sh --target both --force")
fi

rm -rf "$install_root"

echo
echo "== scripts/qa/lib/url.mjs =="

if command -v node >/dev/null 2>&1; then
  url_helper_output=$(node -e "
    import('$scripts_dir/qa/lib/url.mjs').then(({ joinUrl }) => {
      const cases = [
        ['http://localhost:4321', '/', 'http://localhost:4321/'],
        ['http://localhost:4321/', '/', 'http://localhost:4321/'],
        ['http://localhost:4321', '/pricing', 'http://localhost:4321/pricing'],
        ['http://localhost:4321/', '/pricing', 'http://localhost:4321/pricing'],
        ['http://localhost:4321/preview/', '/pricing', 'http://localhost:4321/preview/pricing'],
        ['http://localhost:4321', 'pricing', 'http://localhost:4321/pricing'],
      ];
      for (const [base, p, expected] of cases) {
        const actual = joinUrl(base, p);
        if (actual !== expected) {
          console.log('MISMATCH: joinUrl(' + JSON.stringify(base) + ', ' + JSON.stringify(p) + ') = ' + actual + ' (expected ' + expected + ')');
          process.exit(1);
        }
      }
      console.log('OK');
    }).catch((err) => {
      console.log('ERROR: ' + (err && err.message ? err.message : err));
      process.exit(1);
    });
  " 2>&1)
  url_helper_rc=$?

  if [[ "$url_helper_rc" -eq 0 ]] && [[ "$url_helper_output" == *"OK"* ]]; then
    echo "PASS: lib/url.mjs joinUrl: --paths join relative to --url's path, '/' maps to the base"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: lib/url.mjs joinUrl"
    echo "  exit=$url_helper_rc"
    echo "  output: $url_helper_output"
    fail_count=$((fail_count + 1))
    failed_names+=("lib/url.mjs joinUrl")
  fi
else
  echo "SKIP: lib/url.mjs joinUrl (node not found)"
fi

echo
echo "== scripts/qa/seo-check.mjs: robots.txt group scoping =="

if command -v node >/dev/null 2>&1; then
  seo_tmp=$(mktemp -d "${TMPDIR:-/tmp}/bss-seo-test.XXXXXX")
  add_cleanup 'rm -rf "$seo_tmp"'

  # A minimal page that trips zero seo-check ERRORS (title, description, and
  # html[lang] are the only hard errors outside --strict) so a --production
  # run's exit code reflects only the robots.txt group-scoping behavior.
  cat >"$seo_tmp/page.html" <<'HTML'
<!doctype html>
<html lang="en">
<head>
<title>Regression Test Fixture Page</title>
<meta name="description" content="A meta description long enough to clear the fifty character minimum for this seo-check regression test.">
</head>
<body>Hello</body>
</html>
HTML

  # server.mjs serves the fixture page at "/" and a robots.txt whose content
  # is picked by the ROBOTS_MODE env var, on an OS-assigned free port.
  cat >"$seo_tmp/server.mjs" <<'JS'
import http from "node:http";
import fs from "node:fs";

const mode = process.env.ROBOTS_MODE || "good";
const html = fs.readFileSync(new URL("./page.html", import.meta.url), "utf8");

const robotsByMode = {
  // A group scoped to an unrelated bot disallows everything, but the "*"
  // group only disallows /admin: this must NOT be reported as disallow-all.
  good: "User-agent: *\nDisallow: /admin\n\nUser-agent: BadBot\nDisallow: /\n",
  // The "*" group itself disallows everything: this MUST be reported.
  bad: "User-agent: *\nDisallow: /\n",
};
const robotsBody = robotsByMode[mode] ?? robotsByMode.good;

const server = http.createServer((req, res) => {
  if (req.url === "/" ) {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(html);
    return;
  }
  if (req.url === "/robots.txt") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(robotsBody);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(0, "127.0.0.1", () => {
  console.log(`LISTENING ${server.address().port}`);
});
JS

  run_seo_robots_case() {
    local mode=$1 expected_exit=$2 mode_check=$3 needle=$4
    local log_file
    log_file=$(mktemp "${TMPDIR:-/tmp}/bss-seo-server-log.XXXXXX")
    ROBOTS_MODE="$mode" node "$seo_tmp/server.mjs" >"$log_file" 2>&1 &
    local server_pid=$!
    add_cleanup "kill $server_pid 2>/dev/null || true"

    local port=""
    for _ in $(seq 1 50); do
      if grep -q "LISTENING" "$log_file" 2>/dev/null; then
        port=$(grep "LISTENING" "$log_file" | head -1 | awk '{print $2}')
        break
      fi
      if ! kill -0 "$server_pid" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done

    if [[ -z "$port" ]]; then
      echo "FAIL: seo-check robots ($mode): test server did not start"
      echo "  log: $(cat "$log_file" 2>/dev/null)"
      fail_count=$((fail_count + 1))
      failed_names+=("seo-check robots ($mode): test server startup")
      kill "$server_pid" 2>/dev/null || true
      rm -f "$log_file"
      return
    fi

    local seo_out_dir
    seo_out_dir=$(mktemp -d "${TMPDIR:-/tmp}/bss-seo-out.XXXXXX")
    expect_exit "seo-check: robots group scoping ($mode)" "$expected_exit" "$mode_check" "$needle" -- \
      node "$scripts_dir/qa/seo-check.mjs" --url "http://127.0.0.1:$port/" --production --out "$seo_out_dir"

    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
    rm -rf "$seo_out_dir"
    rm -f "$log_file"
  }

  # "*" group only disallows /admin; an unrelated bot's own disallow-all must
  # not be attributed to "*" -> zero seo-check errors -> exit 0.
  run_seo_robots_case "good" 0 not_contains "disallows all crawling"
  # "*" group itself disallows everything -> --production must error.
  run_seo_robots_case "bad" 1 contains "disallows all crawling"
else
  echo "SKIP: seo-check.mjs robots.txt group scoping (node not found)"
fi

echo
echo "== scripts/qa/check-contrast.mjs =="

if command -v node >/dev/null 2>&1; then
  contrast_tmp=$(mktemp -d "${TMPDIR:-/tmp}/bss-contrast-test.XXXXXX")
  add_cleanup 'rm -rf "$contrast_tmp"'

  expect_exit "check-contrast: assets/design-tokens.css passes" 0 contains "All contrast pairs pass" -- \
    node "$scripts_dir/qa/check-contrast.mjs" "$skill_dir/assets/design-tokens.css"

  # Constructed fixture: fg/bg contrast is far below the 4.5 minimum.
  cat >"$contrast_tmp/failing.css" <<'CSS'
:root {
  --color-bg: #ffffff;
  --color-fg: #eeeeee;
}
CSS

  expect_exit "check-contrast: failing pair reports FAIL and exits 1" 1 contains "FAIL" -- \
    node "$scripts_dir/qa/check-contrast.mjs" "$contrast_tmp/failing.css" --pairs fg/bg

  # A pair referencing a token that does not exist in the file is an error.
  cat >"$contrast_tmp/missing-token.css" <<'CSS'
:root {
  --color-bg: #ffffff;
}
CSS

  expect_exit "check-contrast: missing token is reported as an error" 1 contains "missing token" -- \
    node "$scripts_dir/qa/check-contrast.mjs" "$contrast_tmp/missing-token.css" --pairs fg/bg

  # 3-digit #rgb shorthand must parse and expand like a 6-digit hex.
  cat >"$contrast_tmp/rgb-shorthand.css" <<'CSS'
:root {
  --color-bg: #fff;
  --color-fg: #000;
}
CSS

  expect_exit "check-contrast: #rgb shorthand parses and passes" 0 contains "PASS" -- \
    node "$scripts_dir/qa/check-contrast.mjs" "$contrast_tmp/rgb-shorthand.css" --pairs fg/bg
else
  echo "SKIP: check-contrast.mjs (node not found)"
fi

echo
echo "== deploy templates: release guard =="

record_result() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "PASS: $name"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: $name (expected $expected, got $actual)"
    fail_count=$((fail_count + 1))
    failed_names+=("$name")
  fi
}

guard_tmp=$(mktemp -d "${TMPDIR:-/tmp}/bss-release-guard.XXXXXX")
add_cleanup "rm -rf '$guard_tmp'"
guard_repo="$guard_tmp/repo"
git init -q "$guard_repo"
guard_git() { git -C "$guard_repo" -c user.name=test -c user.email=test@example.com "$@"; }
guard_git commit -q --allow-empty -m base
rev_base=$(guard_git rev-parse HEAD)
guard_git commit -q --allow-empty -m next
rev_next=$(guard_git rev-parse HEAD)
guard_git checkout -q -b side "$rev_base"
guard_git commit -q --allow-empty -m side
rev_side=$(guard_git rev-parse HEAD)

for template in vps-static-deploy.sh.template vps-deploy.sh.template; do
  guard_fn=$(sed -n '/^# BEGIN release-guard$/,/^# END release-guard$/p' "$skill_dir/assets/deploy/$template")
  if [[ -z "$guard_fn" ]]; then
    record_result "$template: release guard block present" present missing
    continue
  fi
  eval "$guard_fn"
  record_result "$template: no deployed revision -> ok" ok "$(release_guard_decision "" "$rev_next" "$guard_repo")"
  record_result "$template: ancestor deployed -> ok" ok "$(release_guard_decision "$rev_base" "$rev_next" "$guard_repo")"
  record_result "$template: diverged branch -> diverged" diverged "$(release_guard_decision "$rev_next" "$rev_side" "$guard_repo")"
  record_result "$template: unknown revision -> unknown" unknown "$(release_guard_decision "0000000000000000000000000000000000000000" "$rev_next" "$guard_repo")"
  unset -f release_guard_decision
done

echo
echo "== scripts/qa/lib/viewports.mjs =="
if command -v node >/dev/null 2>&1; then
  viewport_counts=$(node -e '
    import(process.argv[1]).then(({ selectViewports }) => {
      const key = (v) => `${v.width}x${v.height}`;
      const all = selectViewports("all").map(key);
      const width = selectViewports("width").length;
      const height = selectViewports("height").map(key);
      const unique = new Set(all).size === all.length;
      const hasLandscape = height.includes("844x390");
      console.log(`${unique && hasLandscape && width > 0 && height.length > 0 ? "ok" : "bad"}`);
    }).catch(() => console.log("error"));
  ' "$skill_dir/scripts/qa/lib/viewports.mjs")
  record_result "viewports: all matrix deduplicated, height matrix includes landscape phone" ok "$viewport_counts"
else
  echo "SKIP: viewports.mjs (node not found)"
fi

echo
echo "== summary =="
echo "Passed: $pass_count"
echo "Failed: $fail_count"

if ((fail_count > 0)); then
  echo "Failing tests:"
  for name in "${failed_names[@]}"; do
    echo "  - $name"
  done
  exit 1
fi

exit 0
