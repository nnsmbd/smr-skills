#!/usr/bin/env node
/**
 * check-contrast.mjs — WCAG contrast ratio check for a design-tokens.css file.
 *
 * Uses ONLY Node.js built-ins (node:fs) so it runs anywhere with Node >= 18
 * and never becomes a hard dependency of a project.
 *
 * Usage:
 *   node scripts/qa/check-contrast.mjs <tokens.css> [--pairs fg/bg,muted/bg]
 *                                       [--min 4.5] [--large-min 3] [--json] [--help]
 *
 * Parses `--color-*: #rrggbb` (and `#rgb`) custom properties out of the file's
 * top-level `:root { ... }` block(s) — the base color set. Any `:root { ... }`
 * nested inside an `@media (prefers-color-scheme: dark) { ... }` block is
 * parsed as a separate "dark override" set (merged on top of the base set)
 * and reported separately. Values inside any other `@media` block (e.g.
 * `prefers-reduced-motion`) are ignored entirely.
 *
 * Pairs default to the `contrast-pairs: a/b, c/d, ...` comment in the file
 * (see assets/design-tokens.css); if that comment is absent and --pairs is
 * not given, the default is `fg/bg, muted/bg`. A pair name is the token's
 * role, i.e. `fg` means `--color-fg`. Suffix a pair with `:large` (e.g.
 * `accent-fg/accent:large`) to check it against --large-min instead of --min.
 *
 * Exit codes: 0 all pairs pass (in every set that exists), 1 any pair fails
 * or references a missing token, 64 usage error (bad/missing arguments).
 */

import { readFileSync } from "node:fs";

const HELP = `check-contrast.mjs — WCAG contrast ratio check for design tokens

Usage:
  node scripts/qa/check-contrast.mjs <tokens.css> [options]

Options:
  --pairs <list>    Comma-separated pairs to check, e.g. fg/bg,muted/bg
                    (default: the file's \`contrast-pairs:\` comment, or
                    fg/bg,muted/bg if that comment is absent)
  --min <n>         Minimum contrast ratio for normal-size pairs (default: 4.5)
  --large-min <n>   Minimum contrast ratio for pairs suffixed \`:large\` (default: 3)
  --json            Print machine-readable JSON instead of text
  --help            Show this help and exit

Checks the base :root color set, and separately a
\`@media (prefers-color-scheme: dark) { :root { ... } }\` override set if one
is present in the file (dark values are merged on top of the base values).

Exit codes: 0 all pairs pass, 1 any pair fails or references a missing token,
64 usage error (bad/missing arguments).
`;

function parseArgs(argv) {
  const args = {
    file: null,
    pairs: null,
    min: 4.5,
    largeMin: 3,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (a === "--pairs") {
      args.pairs = argv[++i];
    } else if (a === "--min") {
      args.min = argv[++i];
    } else if (a === "--large-min") {
      args.largeMin = argv[++i];
    } else if (a === "--json") {
      args.json = true;
    } else if (a.startsWith("--")) {
      console.error(`Unknown argument: ${a}`);
      process.exit(64);
    } else if (args.file === null) {
      args.file = a;
    } else {
      console.error(`Unexpected extra argument: ${a}`);
      process.exit(64);
    }
  }
  return args;
}

// --- tiny CSS structural parser (built-ins only) ----------------------------

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Walk the CSS and return every plain rule block (selector, not an at-rule)
 * together with the prelude of its immediate enclosing @-rule, if any.
 */
function extractBlocks(css) {
  const blocks = [];
  const stack = [];
  let buf = "";
  let i = 0;
  const n = css.length;
  while (i < n) {
    const ch = css[i];
    if (ch === "{") {
      const prelude = buf.trim();
      buf = "";
      if (prelude.startsWith("@")) {
        stack.push({ isAtRule: true, prelude });
        i++;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
        j++;
      }
      const body = css.slice(i + 1, j - 1);
      const parentAtRule = stack.length && stack[stack.length - 1].isAtRule ? stack[stack.length - 1].prelude : null;
      blocks.push({ selector: prelude, body, parentAtRule });
      i = j;
      continue;
    } else if (ch === "}") {
      if (stack.length) stack.pop();
      i++;
      continue;
    } else {
      buf += ch;
      i++;
    }
  }
  return blocks;
}

function parseColorVars(body) {
  const vars = {};
  const re = /--color-([a-zA-Z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})\s*(?:;|$)/g;
  let m;
  while ((m = re.exec(body))) {
    vars[m[1]] = normalizeHex(m[2]);
  }
  return vars;
}

function normalizeHex(hex) {
  const h = hex.slice(1);
  if (h.length === 3) {
    return "#" + h.split("").map((c) => c + c).join("").toLowerCase();
  }
  return "#" + h.toLowerCase();
}

function extractContrastPairsComment(rawCss) {
  const m = /contrast-pairs:\s*([^\n]+)/.exec(rawCss);
  if (!m) return null;
  const line = m[1].replace(/\*+\/?\s*$/, "").trim();
  if (!line) return null;
  return line.split(",").map((s) => s.trim()).filter(Boolean);
}

// --- WCAG relative luminance / contrast ratio --------------------------------

function srgbChannel(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- pair evaluation ----------------------------------------------------------

function evaluateSet(setName, vars, pairSpecs, min, largeMin) {
  const results = [];
  const errors = [];
  for (const spec of pairSpecs) {
    let raw = spec.trim();
    if (!raw) continue;
    let large = false;
    if (/:large$/i.test(raw)) {
      large = true;
      raw = raw.replace(/:large$/i, "");
    }
    const parts = raw.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      errors.push(`malformed pair spec (expected "a/b" or "a/b:large"): ${spec}`);
      continue;
    }
    const [nameA, nameB] = parts.map((s) => s.trim());
    const varA = `--color-${nameA}`;
    const varB = `--color-${nameB}`;
    const hexA = vars[nameA];
    const hexB = vars[nameB];
    const missing = [];
    if (!hexA) missing.push(varA);
    if (!hexB) missing.push(varB);
    if (missing.length) {
      errors.push(`[${setName}] pair ${spec} references missing token(s): ${missing.join(", ")}`);
      continue;
    }
    const ratio = contrastRatio(hexA, hexB);
    const threshold = large ? largeMin : min;
    const pass = ratio >= threshold;
    results.push({ set: setName, pair: spec, large, ratio, threshold, pass });
  }
  return { results, errors };
}

// --- main ----------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (!args.file) {
    console.error("Missing required argument: <tokens.css>");
    console.error(HELP);
    process.exit(64);
  }

  const min = Number(args.min);
  const largeMin = Number(args.largeMin);
  if (!Number.isFinite(min) || min <= 0) {
    console.error(`--min must be a positive number, got: ${args.min}`);
    process.exit(64);
  }
  if (!Number.isFinite(largeMin) || largeMin <= 0) {
    console.error(`--large-min must be a positive number, got: ${args.largeMin}`);
    process.exit(64);
  }

  let rawCss;
  try {
    rawCss = readFileSync(args.file, "utf8");
  } catch (err) {
    console.error(`Cannot read ${args.file}: ${err.message}`);
    process.exit(1);
  }

  let pairSpecs = args.pairs ? args.pairs.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (!pairSpecs) {
    pairSpecs = extractContrastPairsComment(rawCss) || ["fg/bg", "muted/bg"];
  }

  const css = stripComments(rawCss);
  const blocks = extractBlocks(css);

  let baseVars = {};
  let darkVars = null;
  for (const block of blocks) {
    if (block.selector !== ":root") continue;
    if (block.parentAtRule === null) {
      Object.assign(baseVars, parseColorVars(block.body));
    } else if (/prefers-color-scheme\s*:\s*dark/.test(block.parentAtRule)) {
      darkVars = { ...(darkVars || {}), ...parseColorVars(block.body) };
    }
    // Any other @media-nested :root is ignored entirely, per spec.
  }

  const sets = [];
  const baseEval = evaluateSet("base", baseVars, pairSpecs, min, largeMin);
  sets.push({ name: "base", ...baseEval });

  if (darkVars) {
    const mergedDark = { ...baseVars, ...darkVars };
    const darkEval = evaluateSet("dark", mergedDark, pairSpecs, min, largeMin);
    sets.push({ name: "dark", ...darkEval });
  }

  const allResults = sets.flatMap((s) => s.results);
  const allErrors = sets.flatMap((s) => s.errors);
  const anyFail = allResults.some((r) => !r.pass);
  const ok = !anyFail && allErrors.length === 0;

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          file: args.file,
          min,
          largeMin,
          sets: sets.map((s) => ({
            name: s.name,
            results: s.results.map((r) => ({
              pair: r.pair,
              large: r.large,
              ratio: Number(r.ratio.toFixed(3)),
              threshold: r.threshold,
              pass: r.pass,
            })),
            errors: s.errors,
          })),
          pass: ok,
        },
        null,
        2
      )
    );
  } else {
    for (const s of sets) {
      const label = s.name === "base" ? "Base :root" : "Dark override (prefers-color-scheme: dark)";
      console.log(`\n${label}:`);
      if (s.results.length === 0 && s.errors.length === 0) {
        console.log("  (no pairs evaluated)");
      }
      for (const r of s.results) {
        const status = r.pass ? "PASS" : "FAIL";
        console.log(`  ${r.pair}: ${r.ratio.toFixed(2)} (>= ${r.threshold}) ${status}`);
      }
      for (const e of s.errors) {
        console.log(`  ERROR: ${e}`);
      }
    }
    console.log("");
    console.log(ok ? "All contrast pairs pass." : "Contrast check FAILED.");
  }

  process.exit(ok ? 0 : 1);
}

main();
