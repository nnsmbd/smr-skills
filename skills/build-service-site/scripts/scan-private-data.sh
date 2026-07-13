#!/usr/bin/env bash
set -euo pipefail

root="."
terms_file=""
terms=()

usage() {
  cat <<'USAGE'
Usage: scan-private-data.sh [path] [--term VALUE ...] [--terms-file FILE]

Scans text files for common credentials, private infrastructure values, personal
home paths, and optional project-specific forbidden terms. Match values are not
printed, so the scan itself does not repeat potential secrets into logs.
USAGE
}

if (($#)) && [[ $1 != --* ]]; then
  root=$1
  shift
fi

while (($#)); do
  case "$1" in
    --term)
      terms+=("${2:-}")
      shift 2
      ;;
    --terms-file)
      terms_file=${2:-}
      shift 2
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

if [[ ! -e "$root" ]]; then
  echo "Scan path not found: $root" >&2
  exit 1
fi

if [[ -n "$terms_file" && ! -f "$terms_file" ]]; then
  echo "Terms file not found: $terms_file" >&2
  exit 1
fi

python_args=("$root" "$terms_file")
if ((${#terms[@]})); then
  python_args+=("${terms[@]}")
fi

python3 - "${python_args[@]}" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1]).resolve()
terms_file = sys.argv[2]
terms = [term for term in sys.argv[3:] if term]
if terms_file:
    terms.extend(
        line.strip()
        for line in Path(terms_file).read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )

patterns = [
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("API secret", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("Slack token", re.compile(r"\bxox[a-z]-[A-Za-z0-9-]{20,}\b")),
    ("bot token", re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}\b")),
    ("credential in URL", re.compile(r"https?://[^\s/:]+:[^\s/@]+@")),
    ("absolute home path", re.compile(r"/(?:Users|home)/[^/\s]+/")),
    ("private SSH key path", re.compile(r"(?:^|[/\\])id_(?:rsa|dsa|ecdsa|ed25519)(?:\b|$)")),
    ("email address", re.compile(r"\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b", re.IGNORECASE)),
    ("IPv4 address", re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])")),
]

allowed_ips = {"0.0.0.0", "127.0.0.1"}
allowed_email_domains = {"example.com", "example.org", "example.net"}
excluded_names = {".git", "node_modules", ".next", "dist", "build"}
scanner_name = "scan-private-data.sh"
findings = []

def iter_files(path: Path):
    if path.is_file():
        yield path
        return
    for candidate in path.rglob("*"):
        if not candidate.is_file():
            continue
        if any(part in excluded_names for part in candidate.parts):
            continue
        yield candidate

for path in iter_files(root):
    if path.name == scanner_name:
        continue
    try:
        if path.stat().st_size > 2_000_000:
            continue
        raw = path.read_bytes()
        if b"\x00" in raw:
            continue
        text = raw.decode("utf-8", errors="strict")
    except (OSError, UnicodeDecodeError):
        continue

    relative = path.relative_to(root) if root.is_dir() else Path(path.name)
    lines = text.splitlines()
    for line_number, line in enumerate(lines, start=1):
        for label, pattern in patterns:
            for match in pattern.finditer(line):
                if label == "IPv4 address" and match.group(0) in allowed_ips:
                    continue
                if label == "email address" and match.group(1).lower() in allowed_email_domains:
                    continue
                findings.append((str(relative), line_number, label))
        folded = line.casefold()
        for term in terms:
            if term.casefold() in folded:
                findings.append((str(relative), line_number, "user-supplied forbidden term"))

for path, line, label in sorted(set(findings)):
    print(f"{path}:{line}: {label}")

if findings:
    print(f"Privacy scan failed with {len(set(findings))} finding(s).", file=sys.stderr)
    raise SystemExit(1)

print(f"Privacy scan passed: {root}")
PY
