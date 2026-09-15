# Responsive, motion, and QA

## Contents

1. Responsive rules
2. Motion rules
3. Viewport matrix
4. Implementation pitfalls
5. Quality gates
6. Owner acceptance
7. Automated checks
8. Product-profile QA

## Responsive rules

- Respond to width, height, aspect ratio, content length, input mode, and language expansion.
- Let static sections derive height from content.
- Use `clamp()`, `min()`, and `max()` for fluid type, spacing, media, and containers where appropriate.
- Reserve viewport-height units for intentional scenes and bound them with sensible minimums and maximums. Prefer `svh`/`dvh` over bare `vh` for first-screen scenes, and still bound them with an explicit `min()`/`max()` — a small dynamic toolbar swing should not collapse or overflow the scene.
- Derive sticky and horizontal-scroll distance from item count and actual travel, not arbitrary multiples of viewport height. Measure the real content or track length (item count × item size, or the track's own scrollable width/height) and derive the scene's scroll distance from that measurement, never from a fixed multiple of `vh` that happens to look right at one viewport.
- When a section gets a height cap (`max-height`, a fixed `vh`/`svh` value, or an aspect-ratio box), audit every child that shared the uncapped section's assumptions before shipping the cap — a media column, a sticky figure, or an absolutely positioned overlay sized against the old height will silently overflow, crop, or misalign under the new cap even though the section itself looks fine.
- Keep one semantic structure across breakpoints unless accessibility demands otherwise.
- Do not globally scale the page.
- Test intermediate widths instead of optimizing only supplied screenshots.
- Account for fixed headers in anchors, focus, and sticky content.

## Motion rules

- Give each animation a narrative or interaction purpose.
- Keep calm content calmer than showcase sections.
- Avoid several simultaneous perpetual effects competing for attention.
- Use small reveal distances for ordinary text.
- Enable custom cursors and hover-only effects only for compatible pointers.
- Ensure `prefers-reduced-motion` leaves every item visible, ordered, and usable without scroll-dependent transforms.
- Treat `prefers-reduced-motion` as a visibility regression check, not only an "animation is off" check: with reduced motion active, no element may remain hidden by an animation's initial style — a reveal's `opacity: 0` starting state, a transform that translates content out of view, or an SSR-rendered initial state that assumed JavaScript would run and remove it. If the animation library or a manual toggle skips the animation, it must also skip (or immediately resolve) whatever inline/class state that animation was going to clear.
- Prevent animation state from changing layout height unexpectedly or hijacking user scroll.
- Recalculate progress from the final content geometry.

## Viewport matrix

Adjust to the product, but cover at least:

- 375, 390, and 430 CSS px mobile widths;
- tablet and the transition into desktop;
- 1024–1100 px transition widths;
- 1280×720 and 1366×768 low desktop windows;
- 1440×900 and 1536×864 common desktop windows;
- 1920×1080;
- a tall fullscreen window;
- an ordinary non-fullscreen browser window;
- content zoom and long translated strings.

Cover height independently of width, not only as an incidental side effect of testing more widths. Use the height breakpoints from `assets/design-tokens.css` (`--bp-h-sm` at 720px max-height, `--bp-h-md` at 900px max-height, `--bp-h-tall` at 1100px min-height, and the landscape-phone query at 500px max-height) to build an explicit "same width, different heights" matrix, not just a list of device presets:

- 1440 width at 720, 900, and 1100+ px height (short laptop window, common laptop window, tall/external-monitor window) — this is the fullscreen-vs-windowed case: the same browser window resized shorter reveals height caps and sticky scenes that only got checked at one height;
- 390 width at 664 and 844 px height (a browser chrome/toolbar-heavy short viewport versus a tall one), representing a phone with visible browser UI versus one without;
- a landscape phone at width ≥ the phone's portrait height with height ≤ 500px (for example 844×390), since landscape phones combine a wide-ish width with a very short height and break height caps that width-only testing never exercises.

Inspect the beginning, end, and intermediate states of every sticky or horizontal scene. Verify touch, keyboard, hover, fine pointer, coarse pointer, and reduced motion where applicable.

## Implementation pitfalls

Rules learned from concrete regressions; treat each as a checklist item before calling a responsive or motion change done:

- **`fixed`/`sticky` inside a transformed ancestor.** Any ancestor with a `transform`, `filter`, `perspective`, or `will-change: transform` turns its own box into the containing block for `position: fixed` descendants — iOS Safari (and other engines) then pins that "fixed" element to the ancestor instead of the viewport, so it drifts or gets clipped during scroll/animation. Render fixed and sticky UI (headers, cookie banners, floating CTAs, modals) at the top level of the DOM or through a portal, never inside a component that itself gets a scroll- or state-driven transform.
- **Utility-CSS classes built from template strings.** Never assemble a Tailwind (or similar utility-framework) class name by interpolation, e.g. `` `pain-w${i}` `` or `` `text-${color}-500` ``. The framework's build-time class scanner only sees literal strings; a dynamically built name gets purged from the production bundle and silently does nothing outside dev. Use a literal class per branch (a lookup object or a switch mapping each known value to its own literal class), even when it duplicates a few characters.
- **Normalizing what the approved mockup made intentional.** Do not "fix" widths, alignment, or spacing an agent perceives as inconsistent when the approved design or design-decision record shows it was deliberate (for example two columns of visibly different width, or asymmetric spacing). Check the design decision or the mockup itself before changing a value that looks like an error — an intentional asymmetry is not a bug.
- **Stale dev server or build cache before declaring a regression.** Before reporting "this used to work and now it's broken," restart the dev server (and clear its cache if it has one) or A/B the behavior against the previous commit. A hot-reloading dev server can keep serving stale compiled output that no longer matches the source, producing a false regression report.
- **Silencing a failing typecheck or build.** Never comment out, weaken, or wrap a failing typecheck/build step to get a green run — fix the underlying type or build error, or stop and report it. Shipping past a red typecheck/build is not an acceptable QA shortcut.
- **Unscoped effects.** Scope motion/interaction effects (scroll listeners, intersection observers, resize handlers, global event listeners) to the route or section that owns them, and tear them down when that route or section unmounts — an effect left running site-wide keeps consuming events and battery after the user has navigated away from the section it was built for.

## Quality gates

Before pre-production preview:

- no unintended horizontal overflow or layout jumps;
- headings and controls are not hidden under fixed UI;
- forms have validation, failure, retry, and success behavior;
- links and buttons are keyboard reachable with visible focus;
- semantic landmarks and heading order are correct;
- images have appropriate dimensions, formats, loading behavior, and alternative text;
- metadata, canonical URL, sitemap, robots, and structured data fit the project;
- privacy and consent match actual integrations;
- typecheck, lint, tests, and production build pass where available;
- a production-like runtime smoke test passes;
- critical pages and CTAs are checked on a real device when possible;
- `scripts/qa/screenshots.mjs --reduced-motion` was run across the height matrix above (`--matrix height` or `--matrix all`) and its hidden-content report is clean — treat any non-zero hidden-content count in `summary.json` as a failure to fix before this gate, the same as an overflow finding, unless the flagged element carries `data-qa-allow-hidden` for a documented, intentionally-hidden case (an off-canvas menu, a closed accordion panel, and similar).

## Owner acceptance

Headless and emulated checks — including everything `screenshots.mjs` and the rest of `scripts/qa/` cover — are a prerequisite for release, not a substitute for the owner looking at the real thing. After release, the owner (or whoever holds sign-off authority for the project) reviews the site on production or a production-like environment, on real devices, not only in an emulator or a resized desktop browser window.

Record the result in `.site-builder/project.yaml`'s `approvals.acceptance`:

- `status`, `date`, and `evidence` (as with any other approval gate);
- `environment`: production or the specific production-like environment reviewed;
- `devices`: the actual devices used (for example "iPhone 14, Safari, real device"), not emulator profiles;
- `unverified`: an explicit list of what the review did not cover — do not leave this empty when real coverage was partial.

Do not record `approvals.acceptance` as satisfied from headless or emulated results alone, and do not let it stand in for or be silently merged into the `deploy` gate — deploy authorizes shipping; acceptance confirms the owner reviewed what shipped, and the two can have different dates and different evidence. When acceptance surfaces a regression, treat it the same as any other post-release bug, and note in `unverified` (or a fresh entry) what emulation specifically failed to catch, so the gap doesn't repeat next time. Call out concretely what emulation never exercises, for example:

- real Android Chrome with a dynamic address-bar/toolbar that resizes the visual viewport during scroll;
- content zoom past 100% (200% is a common accessibility baseline) on a real device's text-zoom or pinch-zoom, as opposed to a browser's desktop zoom;
- real touch scroll inertia, momentum, and rubber-banding, versus a synthetic wheel or pointer event in a headless browser;
- OS-level UI overlaying the page (browser chrome, home indicator, notch/safe-area insets, on-screen keyboard) on the specific devices in use.

## Automated checks

`scripts/qa/` (paths relative to this skill) has four scripts that run inside
the user's project, not the skill, to cover the mechanical parts of this
gate. None are hard dependencies: `screenshots.mjs` and `events-check.mjs`
import Playwright dynamically and print an install hint if it is missing;
`seo-check.mjs` uses only Node.js built-ins; `audit.sh` uses `npx --yes
lighthouse` and `npx --yes @axe-core/cli` only when invoked. Full usage is in
`scripts/qa/README.md`.

- `scripts/qa/screenshots.mjs` — the viewport matrix above (`--matrix
  width|height|all`), first-screen and full-page PNGs, a `--reduced-motion`
  pass with a hidden-content report, and horizontal-overflow detection per
  viewport.
- `scripts/qa/seo-check.mjs` — metadata, canonical, `lang`/hreflang, Open
  Graph/Twitter tags and OG image dimensions, `robots.txt`, `sitemap.xml`, and
  JSON-LD, with `--profile service|product` type hints.
- `scripts/qa/audit.sh` — Lighthouse (mobile + desktop) and axe-core, against
  the thresholds in `project.yaml`'s `qa.lighthouse_thresholds`.
- `scripts/qa/events-check.mjs` — clicks CTAs (by selector or `--auto-cta`)
  and confirms the events planned in `project.yaml`'s `analytics.events`
  actually fire.

Copy the needed scripts into the project (or run them from the skill
checkout against the project's dev server) before the `qa` gate. Record what
ran, when, and the outcome in `.site-builder/project.yaml`'s `qa` block —
`screenshots_path`, `lighthouse_thresholds` (update if the project overrode
the defaults), and `last_run`. A script exiting non-zero blocks the gate the
same as a manual check failing; do not silently ignore its output.

These scripts replace the mechanical portion of this gate, not the manual
portion:

- intermediate animation and scroll-driven states (start, middle, end of a
  sticky or horizontal scene) — screenshots only capture static frames;
- touch-only interaction and a real device pass;
- content zoom and long translated strings beyond what `--langs` verifies
  structurally;
- anything a script explicitly reports as best-effort or unavailable (for
  example a WebP OG-image or a missing Lighthouse category score).

## Product-profile QA

In addition to the shared checks above, product-profile projects (`site_type:
product`) verify:

- demo media weight: hero/demo video or screenshot sequence has a poster
  image, does not autoplay a large file, and is lazy-loaded below the first
  screen;
- pricing accuracy and consistency: the number and terms shown match across
  hero, pricing section, and CTA copy, and match the source of truth in the
  approved copy;
- external handoff attribution: a `signup`, `bot_deeplink`, or `external`
  primary action carries its UTM or start-parameter attribution through to
  the destination, per `references/site-profiles.md`'s adapter table;
- third-party script impact: chat widgets, pixels, and other embedded
  scripts are checked against the `audit.sh` performance budget, not added
  after the fact without re-running it.
