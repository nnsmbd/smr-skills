# QA scripts

These scripts run **inside the user's website project**, not inside this skill.
Copy the `scripts/qa/` directory into the project (or reference it directly if
the skill is installed alongside the project) and run the scripts with the
project's own `node`/`npx`. None of them are hard dependencies of the skill or
of the project: each documents exactly what it needs and fails with a clear,
actionable message instead of a stack trace when a dependency is missing.

All scripts:

- support `--help`;
- take `--url` (default `http://localhost:4321` or `http://localhost:4321/` —
  point it at whatever dev server or preview the project actually runs;
  documented per-script below);
- write output under `.site-builder/qa/<YYYY-MM-DD>/<tool>/` by default,
  overridable with `--out`;
- exit non-zero on failure;
- never print environment/secret values.

Add `assets/gitignore.snippet`'s `.site-builder/qa/` line to the project's
`.gitignore` — these outputs are screenshots and reports of the live page and
may show unpublished content.

An unrecognized CLI flag always exits `64` (a usage error) across
`screenshots.mjs`, `seo-check.mjs`, and `events-check.mjs` — distinct from
each script's own runtime/unreachable-page exit codes documented below.

`lib/url.mjs` exports `joinUrl(base, path)`, the shared helper `screenshots.mjs`
uses to resolve each `--paths` entry against `--url` (a `/` path always maps
back to the base URL itself; anything else is joined onto the base's own
path, not just its origin). `events-check.mjs` takes a single `--url` page
and has no `--paths` option, so it does not use this helper.

## screenshots.mjs

Viewport screenshot matrix + horizontal-overflow check, driven by
[Playwright](https://playwright.dev). Playwright is optional: install it in
the **project**, not the skill:

```
npm i -D playwright && npx playwright install chromium
```

```
node scripts/qa/screenshots.mjs --url http://localhost:4321 --paths /,/pricing --reduced-motion
node scripts/qa/screenshots.mjs --url http://localhost:4321 --matrix height --reduced-motion
```

Captures first-screen and full-page PNGs at the matrix from
`references/responsive-motion.md`, and reports `document.scrollingElement.scrollWidth >
innerWidth` per viewport in `summary.json`. `--matrix width|height|all` (default
`all`) picks which half of the matrix to run — the underlying list lives in
`scripts/qa/lib/viewports.mjs` so its pure selection logic can be unit-tested
without Playwright:

- `width` (the original matrix): 375/390/430 mobile, 768 tablet, 1024/1100
  transition, 1280x720/1366x768/1440x900/1536x864/1920x1080 desktop, and a
  tall 1440x1600 window;
- `height` (same width at different heights, plus landscape phone): 1440 wide
  at 720/900/1100 px tall (fullscreen vs. windowed), 390 wide at 664/844 px
  tall (short vs. tall phone viewport), and a landscape phone at 844x390;
- `all` runs the union — a viewport that satisfies both (390x844) is only
  captured once, never twice.

Pass `--reduced-motion` to add a `prefers-reduced-motion: reduce` pass
alongside the normal one. That pass also scrolls the page to the bottom and
back (to trigger scroll-driven reveals) and then runs a **hidden-content
check**: it scans for elements that carry text or are `img`/`video`/`svg` and
remain invisible — `opacity` below `0.05`, `visibility: hidden`, or a
transform that puts them fully outside their box — after the scroll pass.
Elements hidden by design are excluded automatically: `[aria-hidden="true"]`,
`[hidden]`, `display: none`, anything inside a `<template>`, anything inside
an `[aria-expanded="false"]` off-canvas container (a closed menu/drawer), and
anything carrying `data-qa-allow-hidden` (add this attribute to mark an
intentionally-hidden element and exclude it from the check). Findings are
written per viewport+path in `summary.json` as `hiddenContentCount` and up to
10 `hiddenContentSamples` CSS-path strings, and the run fails (exit `1`) if
any are found — this is what catches reduced-motion leaving content stuck at
its initial animation state (e.g. `opacity: 0`) instead of visible.

Exit codes: `0` clean, `1` overflow, page-load failure, or hidden-content
found, `2` Playwright not installed, `3` unexpected error, `64` usage error
(unknown CLI argument).

## seo-check.mjs

Metadata, social tags, robots/sitemap, and JSON-LD check. Uses **only Node.js
built-ins** (global `fetch`, `node:zlib` for image-header parsing) — no
install step, runs anywhere with Node >= 18.

```
node scripts/qa/seo-check.mjs --url http://localhost:4321/ --profile service --langs en,ru
```

Checks title/description length, canonical, `html[lang]`, hreflang (when
`--langs` given), Open Graph and Twitter tags, OG image reachability and
1200x630 dimensions (PNG/JPEG parsed from header bytes; WebP is best-effort —
verify manually if warned), `robots.txt`, `sitemap.xml` (reachable and
contains the checked URL), and that every JSON-LD block parses. `--profile
service|product` changes which JSON-LD `@type`s are hinted as expected
(`Organization`/`LocalBusiness`/`ProfessionalService` vs
`SoftwareApplication`/`Product`/`Organization`) — a mismatch is a warning, not
an error.

Most checks are warnings by default (recommended, not build-breaking). Pass
`--strict` to promote every warning to an error before a real production
deploy. Pass `--production` to specifically make "`robots.txt` disallows
everything" and "sitemap is missing this URL" errors — outside production
this is common on staging and only warns.

The `robots.txt` "disallows everything" check only looks at the group(s)
whose `User-agent` line(s) include `*` (a group is one or more consecutive
`User-agent` lines followed by their rules, up to the next `User-agent` line
after rules) — an unrelated bot's own `Disallow: /` never counts.

Exit codes: `0` no errors, `1` errors found (or warnings under `--strict`),
`2` the page itself could not be fetched, `64` usage error (unknown CLI
argument).

## audit.sh

Lighthouse (performance, accessibility, best-practices, SEO; mobile and
desktop presets) plus an axe-core accessibility pass. Both tools run through
`npx --yes` on demand — they are not dependencies of this script, and `npx`
needs network access the first time it fetches them.

```
scripts/qa/audit.sh --url http://localhost:4321/ \
  --min-performance 85 --min-accessibility 95 --min-seo 95
```

Thresholds default to 85/95/95 (performance/accessibility/seo), matching the
skill's `project.yaml` `qa.lighthouse_thresholds` template, plus a
`--min-best-practices` default of 90 that isn't tracked in `project.yaml`
today. The script does not parse YAML — copy the project's actual thresholds
into flags by hand if they were changed from the template. Saves
`lighthouse-mobile.json/.html`, `lighthouse-desktop.json/.html`, and `axe.json`
under the output directory. Fails if any threshold is missed or axe reports a
`serious`/`critical` violation.

Exit codes: `0` pass, `1` a threshold was missed or axe found a serious/
critical violation.

## events-check.mjs

Verifies analytics events actually fire from real page interactions, matching
`project.yaml`'s `analytics.events`. Also needs Playwright (see
`screenshots.mjs` above for the install command).

```
node scripts/qa/events-check.mjs --url http://localhost:4321/ --events events.json
node scripts/qa/events-check.mjs --url http://localhost:4321/ --auto-cta
```

`events.json` is an array of `{ "name": "...", "selector": "...", "trigger":
"load"|"click" }`. `--auto-cta` clicks every `[data-cta]` element instead of
(or in addition to) selectors from `--events`. For each expected event, the
script checks outgoing network request URLs/bodies and any `window.dataLayer`
pushes for a substring match on the event name, and reports which expected
events were and weren't observed.

Safety: it **blocks every navigation away from the tested page** (external
links included) so it can keep observing the page after a click — the
click's own network/dataLayer side effects are still captured before the
navigation is aborted. It **does not submit real forms** unless
`--allow-submit` is passed; with that flag, the next main-frame navigation
after a submit event is let through regardless of the form's HTTP method
(GET or POST).

Exit codes: `0` all expected events observed (or `--auto-cta` alone, which is
informational and always exits `0`), `1` one or more expected events were not
observed, `2` Playwright not installed, `3` unexpected error, `64` usage error
(unknown CLI argument).

## How the skill's QA phase uses these

During the `qa` phase (`references/responsive-motion.md`), after copying
whichever scripts are needed into the project:

1. Run `screenshots.mjs` across the viewport matrix (`--matrix all` by
   default; run `--matrix height` on its own after any height-cap or
   fullscreen/windowed layout change) and review for overflow and layout
   breaks; add `--reduced-motion` once per redesign or major layout change
   and treat any `hiddenContentCount` above zero as a blocking finding.
2. Run `seo-check.mjs --profile <site_type-mapped profile>` against the
   built/preview page; use `--production` and `--strict` right before a real
   deploy.
3. Run `audit.sh` with the thresholds from `project.yaml`'s `qa` block.
4. Run `events-check.mjs --events <path>` built from
   `project.yaml`'s `analytics.events` once the analytics provider is wired
   up.
5. Record what ran and the outcome in `project.yaml`'s `qa` block
   (`screenshots_path`, `lighthouse_thresholds`, `last_run`).

**Still manual, not covered by these scripts:**

- intermediate animation/scroll-driven states (start, middle, end of a
  sticky or horizontal scene);
- touch-only interaction and real mobile devices;
- content zoom and long translated strings beyond what `seo-check.mjs`'s
  `--langs` flag verifies structurally;
- anything the scripts explicitly flag as best-effort (WebP OG-image
  dimensions) or unavailable (a Lighthouse category score missing from a
  report).
