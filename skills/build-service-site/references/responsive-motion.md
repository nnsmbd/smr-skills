# Responsive, motion, and QA

## Contents

1. Responsive rules
2. Motion rules
3. Viewport matrix
4. Quality gates

## Responsive rules

- Respond to width, height, aspect ratio, content length, input mode, and language expansion.
- Let static sections derive height from content.
- Use `clamp()`, `min()`, and `max()` for fluid type, spacing, media, and containers where appropriate.
- Reserve viewport-height units for intentional scenes and bound them with sensible minimums and maximums.
- Derive sticky and horizontal-scroll distance from item count and actual travel, not arbitrary multiples of viewport height.
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

Inspect the beginning, end, and intermediate states of every sticky or horizontal scene. Verify touch, keyboard, hover, fine pointer, coarse pointer, and reduced motion where applicable.

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
- critical pages and CTAs are checked on a real device when possible.
