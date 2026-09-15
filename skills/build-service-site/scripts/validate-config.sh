#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
config=${1:-.site-builder/project.yaml}

if [[ ! -f "$config" ]]; then
  echo "Config not found: $config" >&2
  exit 1
fi

python3 - "$config" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
try:
    text = path.read_text(encoding="utf-8")
except (OSError, UnicodeDecodeError) as exc:
    print(f"ERROR: cannot read {path}: {exc}", file=sys.stderr)
    raise SystemExit(1)

# --------------------------------------------------------------------------
# YAML loading: prefer PyYAML when installed, otherwise fall back to a small
# indentation-agnostic parser that understands the subset used by
# project.yaml (nested mappings at any indentation width, quoted/unquoted
# scalars, inline `[]`/`{}`, block `- item` lists, and comments).
# --------------------------------------------------------------------------


def _strip_comment(line: str) -> str:
    in_single = False
    in_double = False
    for i, ch in enumerate(line):
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single:
            in_double = not in_double
        elif ch == "#" and not in_single and not in_double:
            return line[:i]
    return line


def _split_key_value(content: str):
    """Split 'key: value' on the first unquoted ': ' (or trailing ':')."""
    in_single = False
    in_double = False
    for i, ch in enumerate(content):
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single:
            in_double = not in_double
        elif ch == ":" and not in_single and not in_double:
            if i + 1 == len(content) or content[i + 1] == " ":
                return content[:i], content[i + 1 :]
    return None, None


def _unquote(token: str) -> str:
    token = token.strip()
    if len(token) >= 2 and token[0] == token[-1] and token[0] in ("'", '"'):
        return token[1:-1]
    return token


def _split_flow_items(inner: str):
    """Split the inside of a `[a, b, "c, d"]` flow sequence on top-level commas."""
    items = []
    current = []
    in_single = False
    in_double = False
    for ch in inner:
        if ch == "'" and not in_double:
            in_single = not in_single
            current.append(ch)
        elif ch == '"' and not in_single:
            in_double = not in_double
            current.append(ch)
        elif ch == "," and not in_single and not in_double:
            items.append("".join(current))
            current = []
        else:
            current.append(ch)
    items.append("".join(current))
    return items


def _parse_scalar(raw: str):
    s = raw.strip()
    if s == "":
        return None
    if len(s) >= 2 and s[0] == "[" and s[-1] == "]":
        inner = s[1:-1].strip()
        if inner == "":
            return []
        return [_parse_scalar(part.strip()) for part in _split_flow_items(inner)]
    if s == "{}":
        return {}
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"'):
        return s[1:-1]
    if s in ("~", "null", "Null", "NULL", "None"):
        return None
    if s == "true":
        return True
    if s == "false":
        return False
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    return s


def _check_no_tabs(text: str) -> None:
    """YAML forbids tabs in indentation. Fail fast with a clear message instead
    of silently mis-parsing (PyYAML itself rejects these, but with a much less
    actionable error, and it also always ends up here since a scanner error on
    tabs makes `yaml.safe_load` raise and this fallback take over)."""
    for lineno, raw in enumerate(text.splitlines(), start=1):
        content_only = _strip_comment(raw)
        if content_only.strip() == "":
            continue
        prefix = raw[: len(raw) - len(raw.lstrip(" \t"))]
        if "\t" in prefix:
            print(
                f"ERROR: tabs are not valid YAML indentation (line {lineno})",
                file=sys.stderr,
            )
            raise SystemExit(1)


def fallback_parse(text: str):
    _check_no_tabs(text)

    lines = []
    for raw in text.splitlines():
        stripped = _strip_comment(raw)
        if stripped.strip() == "":
            continue
        lines.append(stripped)

    root: dict = {}
    # Stack entries are (indent, container, same_indent_list). `same_indent_list`
    # marks a block-sequence container that was opened at the SAME indentation
    # as its owning key (PyYAML's default dump style), e.g.:
    #   events:
    #   - name: cta_click
    # For those, a following line at that same indent continues the list only
    # if it is itself another `- ` item; otherwise it is a dedent back out to
    # the sibling mapping and the list container must be popped like normal.
    stack = [(-1, root, False)]
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        indent = len(line) - len(line.lstrip(" "))
        content = line.strip()

        is_item_line = content.startswith("- ") or content == "-"

        while len(stack) > 1:
            top_indent, _top_container, top_sil = stack[-1]
            if top_sil and top_indent == indent and is_item_line:
                # Same-indent list continuation: keep the list container open.
                break
            if top_indent >= indent:
                stack.pop()
                continue
            break
        _, parent, _ = stack[-1]

        if is_item_line:
            item_content = content[2:].strip() if content.startswith("- ") else ""
            if not isinstance(parent, list):
                # Malformed relative to expectations; skip defensively.
                i += 1
                continue
            if item_content == "":
                new_item: dict = {}
                parent.append(new_item)
                stack.append((indent, new_item, False))
                i += 1
                continue
            key, val = _split_key_value(item_content)
            if key is not None:
                item_map = {}
                key = _unquote(key)
                val = val.strip()
                if val == "":
                    item_map[key] = None
                else:
                    item_map[key] = _parse_scalar(val)
                parent.append(item_map)
                stack.append((indent, item_map, False))
            else:
                parent.append(_parse_scalar(item_content))
            i += 1
            continue

        key, val = _split_key_value(content)
        if key is None:
            # Not a recognizable mapping/list line; ignore.
            i += 1
            continue
        key = _unquote(key)
        val = val.strip()

        if val == "":
            new_container = None
            same_indent_list = False
            if i + 1 < n:
                next_line = lines[i + 1]
                next_indent = len(next_line) - len(next_line.lstrip(" "))
                next_content = next_line.strip()
                next_is_item = next_content.startswith("- ") or next_content == "-"
                if next_indent > indent:
                    new_container = [] if next_is_item else {}
                elif next_indent == indent and next_is_item:
                    # PyYAML default dump style: the `- ` marker sits at the
                    # same indentation as the key that owns the sequence.
                    new_container = []
                    same_indent_list = True
            if new_container is None:
                if isinstance(parent, dict):
                    parent[key] = None
                i += 1
                continue
            if isinstance(parent, dict):
                parent[key] = new_container
            stack.append((indent, new_container, same_indent_list))
        else:
            value = _parse_scalar(val)
            if isinstance(parent, dict):
                parent[key] = value
        i += 1

    return root


data = None
try:
    import yaml  # type: ignore

    try:
        data = yaml.safe_load(text)
    except Exception:
        data = None
except ImportError:
    data = None

if data is None:
    try:
        data = fallback_parse(text)
    except Exception as exc:  # defensive: never crash the validator on parse quirks
        print(f"ERROR: failed to parse YAML: {exc}", file=sys.stderr)
        raise SystemExit(1)

if not isinstance(data, dict):
    print("ERROR: top-level YAML content is not a mapping", file=sys.stderr)
    raise SystemExit(1)


def get_path(node, dotted: str):
    cur = node
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None, False
        cur = cur[part]
    return cur, True


errors = []
warnings = []

required = {
    "schema_version",
    "project",
    "workflow",
    "brief",
    "content",
    "design",
    "modules",
    "architecture",
    "deployment",
    "github",
    "approvals",
    "open_questions",
    "assumptions",
}

top_level = set(data.keys())
missing = sorted(required - top_level)
if missing:
    errors.append("missing top-level keys: " + ", ".join(missing))

schema_version_raw, sv_present = get_path(data, "schema_version")
schema_version = None
if sv_present:
    try:
        schema_version = int(schema_version_raw)
    except (TypeError, ValueError):
        schema_version = None

if schema_version not in (1, 2):
    errors.append("schema_version must be 1 or 2")
    schema_version = 2  # keep validating the rest with the stricter ruleset

if schema_version == 1:
    warnings.append(
        "schema_version 1 detected; migrate to schema_version 2 per the "
        "'State schema migration' section of references/site-profiles.md"
    )

allowed_phases = {
    "discovery", "brief", "research", "copy", "design",
    "architecture", "build", "qa", "deploy", "handoff",
}
phase, has_phase = get_path(data, "workflow.phase")
if not has_phase or phase not in allowed_phases:
    errors.append("workflow.phase is missing or unsupported")

allowed_status = {"pending", "in_progress", "blocked", "complete"}
status, has_status = get_path(data, "workflow.status")
if not has_status or status not in allowed_status:
    errors.append("workflow.status is missing or unsupported")

if schema_version == 2:
    allowed_site_types = {"undecided", "service", "product"}
    site_type, has_site_type = get_path(data, "project.site_type")
    if not has_site_type or site_type not in allowed_site_types:
        errors.append("project.site_type is missing or unsupported")

    allowed_action_types = {
        "", "form", "booking", "signup", "waitlist", "bot_deeplink", "checkout", "external",
    }
    allowed_attribution = {"none", "utm", "start_param"}
    env_name_re = re.compile(r"^[A-Z][A-Z0-9_]*$")

    # primary_action's fields are required keys (like project.site_type and
    # deployment.runtime below): the brief isn't actionable without them.
    # secondary_action stays optional-presence: only validated when present.
    for action_key in ("primary_action", "secondary_action"):
        required = action_key == "primary_action"

        action_type, has_type = get_path(data, f"brief.{action_key}.type")
        if required:
            if not has_type or (action_type or "") not in allowed_action_types:
                errors.append(f"brief.{action_key}.type is missing or unsupported: {action_type!r}")
        elif has_type and (action_type or "") not in allowed_action_types:
            errors.append(f"brief.{action_key}.type is unsupported: {action_type!r}")

        attribution, has_attr = get_path(data, f"brief.{action_key}.attribution")
        if required:
            if not has_attr or attribution not in allowed_attribution:
                errors.append(f"brief.{action_key}.attribution is missing or unsupported: {attribution!r}")
        elif has_attr and attribution not in allowed_attribution:
            errors.append(f"brief.{action_key}.attribution is unsupported: {attribution!r}")

        dest_env, has_dest = get_path(data, f"brief.{action_key}.destination_env")
        if required and not has_dest:
            errors.append(f"brief.{action_key}.destination_env is missing")
        elif has_dest:
            dest_val = "" if dest_env in (None, "") else str(dest_env)
            if dest_val != "" and not env_name_re.match(dest_val):
                errors.append(
                    f"brief.{action_key}.destination_env must be an ENV_NAME "
                    f"(e.g. LEAD_FORM_ENDPOINT), not a literal URL/token: {dest_val!r}"
                )

    allowed_access_model = {"", "waitlist", "trial", "freemium", "paid", "demo_call", "open"}
    access_model, has_access = get_path(data, "brief.access_model")
    if not has_access or (access_model or "") not in allowed_access_model:
        errors.append(f"brief.access_model is missing or unsupported: {access_model!r}")

    allowed_design_source = {"undecided", "directions", "external", "existing"}
    design_source, has_design_source = get_path(data, "design.source")
    if not has_design_source or design_source not in allowed_design_source:
        errors.append(f"design.source is missing or unsupported: {design_source!r}")

    allowed_runtime = {
        "undecided", "vps_static", "vps_node", "managed", "static_host", "existing", "other",
    }
    runtime, has_runtime = get_path(data, "deployment.runtime")
    if not has_runtime or runtime not in allowed_runtime:
        errors.append("deployment.runtime is missing or unsupported")

# approvals.*.status applies to both schema versions: the field itself has not
# changed shape across the v1 -> v2 migration.
allowed_approval_status = {"pending", "approved", "rejected", "not_required"}
approvals, has_approvals = get_path(data, "approvals")
if has_approvals and isinstance(approvals, dict):
    for gate_name, gate_value in approvals.items():
        if isinstance(gate_value, dict) and "status" in gate_value:
            gate_status = gate_value["status"]
            if gate_status not in allowed_approval_status:
                errors.append(f"approvals.{gate_name}.status is unsupported: {gate_status!r}")

# approvals.acceptance is optional (many gates precede a real release), but
# when present its list-shaped fields must actually be lists: a bare string
# here silently drops every device/unverified-item but the first at read time.
acceptance, has_acceptance = get_path(data, "approvals.acceptance")
if has_acceptance and isinstance(acceptance, dict):
    for list_field in ("devices", "unverified"):
        if list_field in acceptance and acceptance[list_field] is not None:
            if not isinstance(acceptance[list_field], list):
                errors.append(
                    f"approvals.acceptance.{list_field} must be a list: {acceptance[list_field]!r}"
                )

# --------------------------------------------------------------------------
# Private-value checks (text-based, indentation-agnostic already via \s+).
# --------------------------------------------------------------------------

sensitive_keys = re.compile(
    r"^\s+(password|token|secret|private_key|ssh_key_path|host|server_ip|app_dir):\s*[\"']?([^\"'\s][^#]*)$",
    re.IGNORECASE | re.MULTILINE,
)
for match in sensitive_keys.finditer(text):
    value = match.group(2).strip()
    if value not in {"", "null", "~", "[]", "{}"}:
        errors.append(f"private value is not allowed in tracked config: {match.group(1)}")

absolute_home = re.compile(r"/(?:Users|home)/[^/\s]+/")
if absolute_home.search(text):
    errors.append("absolute home path found")

for warning in warnings:
    print(f"WARNING: {warning}", file=sys.stderr)

if errors:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    raise SystemExit(1)

print(f"Config is structurally valid: {path}")
PY

"$script_dir/scan-private-data.sh" "$config"
