#!/usr/bin/env bash
set -euo pipefail

root="."
terms_file=""
terms=()
allow_ips=()

usage() {
  cat <<'USAGE'
Usage: scan-private-data.sh [path] [--term VALUE ...] [--terms-file FILE] [--allow-ip ADDR ...]

Scans text files for common credentials, private infrastructure values, personal
home paths, and optional project-specific forbidden terms. Match values are not
printed, so the scan itself does not repeat potential secrets into logs.

Documentation IPv4 ranges (RFC 5737: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
plus 0.0.0.0 and 127.0.0.1 are never flagged. Use --allow-ip (repeatable) to allow
an additional single address or CIDR range, e.g. --allow-ip 10.0.0.5 or
--allow-ip 10.0.0.0/8.
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
    --allow-ip)
      allow_ips+=("${2:-}")
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

# Pass variable-length lists via the environment (newline-separated) so we
# don't need a fragile argv separator scheme between terms and allow-ips.
export SCAN_TERMS_FILE="$terms_file"
export SCAN_TERMS=""
if ((${#terms[@]})); then
  SCAN_TERMS=$(printf '%s\n' "${terms[@]}")
  export SCAN_TERMS
fi
export SCAN_ALLOW_IPS=""
if ((${#allow_ips[@]})); then
  SCAN_ALLOW_IPS=$(printf '%s\n' "${allow_ips[@]}")
  export SCAN_ALLOW_IPS
fi

python3 - "$root" <<'PY'
from pathlib import Path
import ipaddress
import os
import re
import sys

root = Path(sys.argv[1]).resolve()

terms_file = os.environ.get("SCAN_TERMS_FILE", "")
terms = [t for t in os.environ.get("SCAN_TERMS", "").splitlines() if t]
if terms_file:
    terms.extend(
        line.strip()
        for line in Path(terms_file).read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )

allow_ip_args = [t for t in os.environ.get("SCAN_ALLOW_IPS", "").splitlines() if t]

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

allowed_ip_exact = {"0.0.0.0", "127.0.0.1"}

# RFC 5737 documentation ranges, never flagged.
allowed_ip_networks = [
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
]

for entry in allow_ip_args:
    entry = entry.strip()
    if not entry:
        continue
    try:
        if "/" in entry:
            allowed_ip_networks.append(ipaddress.ip_network(entry, strict=False))
        else:
            allowed_ip_networks.append(ipaddress.ip_network(f"{entry}/32", strict=False))
    except ValueError:
        # Not a parseable address/CIDR; fall back to exact string matching.
        allowed_ip_exact.add(entry)


def ip_is_allowed(addr: str) -> bool:
    if addr in allowed_ip_exact:
        return True
    try:
        parsed = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return any(parsed in net for net in allowed_ip_networks)


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
                if label == "IPv4 address" and ip_is_allowed(match.group(0)):
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
