# Design source and system

## Contents

1. Choose the design source
2. Brand inputs
3. Design system artifact
4. Motion budget
5. Signature elements
6. Refinement after selection
7. Product treatment axis
8. Handoff package
9. Selection record

## Choose the design source

Set `design.source` before doing design work. Begin only after the brief and production copy are approved. Three sources exist; a project may mix them by scope (for example an external mobile design with an existing desktop layout) — when mixed, record which scope uses which source in the selection record.

### `directions` — three live directions

The default when no design is supplied and no existing brand constrains the work.

Create three standalone HTML directions that are meaningfully different in:

- composition and grid;
- typography and density;
- surface and color logic;
- image treatment;
- rhythm and section transitions;
- motion concept.

Each direction must include enough representative sections to judge the system, not merely three hero variations. Include desktop and mobile behavior through responsive CSS. Keep the prototype semantically structured and easy to transfer. Use real copy volume, known assets, evidence availability, accessibility requirements, and reference cards grouped by property.

For each direction document:

- concept in one sentence;
- audience and offer fit;
- transferable reference principles;
- responsive behavior;
- motion role and reduced-motion fallback;
- asset requirements;
- accessibility, performance, and implementation risks;
- why it differs from the other two.

Do not copy a reference layout, brand system, or proprietary asset. Do not use stock photography as a substitute for missing proof without approval.

### `external` — a supplied design

The design already exists: a design-canvas export, a Figma file, a handed-over design system, or an owner's spec listing points with screenshots. Do not invent three alternatives against a supplied design — analyze what exists instead.

- Inventory every screen and state the source provides; note what it does not cover (states, breakpoints, empty/error/loading).
- Extract tokens from the source (colors, type scale, spacing, radii, motion) into `assets/design-tokens.css` rather than eyeballing values from a screenshot.
- List gaps and conflicts against the approved copy (heading lengths that don't fit, missing sections, proof the design has no slot for) before build starts.
- Ask before deviating from the supplied design. A deviation the owner did not request is a defect, not an improvement.
- Save the source material itself (export files, screenshots, spec text) in the project's copy of the handoff folder under `screens/` so the original stays checkable after tokens are extracted.

### `existing` — redesign within current brand and code

The project keeps its current brand and most of its code; only part of the design changes.

- Inventory current tokens and components first — read the live CSS/component code, not memory of what it probably looks like.
- Change by targeted diffs. Do not rewrite whole sections without a specific request, even when the rewrite would look cleaner.
- Record what must remain, what may change, and what is broken (this also belongs in `site-context.md`'s "Existing project" section).
- Save current screens and relevant current code in the project's copy of the handoff folder under `current-code/` before changing it, so the diff has a documented baseline.

## Brand inputs

Every source needs these inputs before tokens are filled in. Record where they live in `design.brand_assets_path`.

- Logo: source files, usable variants (light/dark, mark-only), minimum size and clear space.
- Colors: role-based, not hue-based (see `assets/design-tokens.css`); confirm which color is replaceable without touching components.
- Fonts: which faces, license terms, subset/script coverage (for example Cyrillic) for every language the project ships, and which weights are actually licensed and loaded.
- Imagery rules: what subjects, crops, and treatments are on-brand; what stock substitutes are or are not allowed.
- Forbidden styles: effects and patterns the owner has ruled out. Record them in `design.forbidden_styles` as concrete rules, not vibes — for example "no glow/neon/glossy effects" is the kind of rule to capture; the actual list is project-specific.

## Design system artifact

Fill `assets/design-tokens.css` at the design gate, from the selected direction, the supplied external design, or the existing brand. Copy it into the project and record its path in `design.tokens_path`. The file itself defines the required categories (color roles and contrast pairs, fonts, fluid type scale, spacing/section rhythm, radii/shadows, layout constants, one breakpoint set including height breakpoints, motion durations/easings, and the reduced-motion switch) — treat that file as the contract, not this document.

- One breakpoint set, mirrored into the framework config; add a value only with a recorded reason (see the file's comment for the current set, including height breakpoints and the landscape-phone case).
- One motion source for both CSS and JS — durations and easings defined once, imported or read by both, never redeclared with slightly different numbers in a component.
- A single reduced-motion switch (one media query or one class) that the whole system honors, not a per-component check repeated five different ways.
- Run `scripts/qa/check-contrast.mjs` against the filled file (`node scripts/qa/check-contrast.mjs path/to/design-tokens.css`) and fix every failing pair before the design gate closes.
- Single source of truth: once tokens are filled and copied into the project, mark any superseded prototype or export as stale (rename its folder with a `STALE-` prefix, or add a note at its top) instead of leaving two live token sources for the next person to guess between.

## Motion budget

- One perpetual (looping, always-on) effect per viewport at a time — not one per section stacked on top of each other.
- Cursor-following and hover-only effects are gated to `(hover: hover) and (pointer: fine)`; they do not run for touch or coarse pointers.
- Keep heavy effects removable and scoped to the route or section that needs them — a heavy effect on one page must not cost anything on pages that don't use it.
- Use small reveal distances for ordinary content; a large translate-in reads as a delay, not as polish.
- Every motion needs a narrative or interaction purpose. If it can't be named, cut it.
- Content is fully visible without animation — reduced-motion and a JS failure both leave every item visible, ordered, and usable.

## Signature elements

When a direction (of any source) includes a signature interactive or animated element — something built specifically for this project rather than a standard reveal or hover state — write its spec in `assets/design-handoff/signature-element.md` (one copy per element) before build starts. List each one in `design.signature_elements`. Building a signature element without a spec is how state machines end up implicit and untestable; see that template for the required fields.

## Refinement after selection

Selecting a direction, an external design, or an existing-brand scope is not the end of design work. Most of the real effort happens here, inside the design → build boundary, as iteration against what was chosen — not as a second round of alternatives.

- Number iterations. Each one is a small, nameable change, not a batch of unrelated tweaks.
- Checkpoint every accepted state: a git commit or tag, or a saved copy, that can be returned to exactly. Record it in the refinement log (`assets/design-handoff/refinement-log.md`; path in `design.refinement_log_path`).
- When the owner rejects an iteration, roll back to the last accepted checkpoint instead of patching on top of the rejected state. Patching over a rejected state tends to leave traces of it behind.
- Implementation must not "normalize" what the mockup or external design made intentionally asymmetric or a specific size. When a width, offset, or size looks like an inconsistency, compare it against the recorded decision before changing it — it may be deliberate.
- Log every deviation from the mockup or spec, with a reason, in the refinement log. A silent deviation is a defect even if it looks better.
- List what emulation (headless screenshots, synthetic gestures) did not verify, so the real-device pass in `references/responsive-motion.md` knows what to check first.

## Product treatment axis

For `site_type: product`, add product treatment to the axes each direction must vary:

- real UI (actual screenshots or a live embed);
- stylized UI (illustrated interface, clearly not a literal screenshot);
- video loop (short, muted demo loop);
- interactive demo (embedded and functional);
- abstract visualization (no interface shown at all).

A direction must use real UI or a clearly labeled illustration — never a mockup presented as a real screenshot (see the claim ledger rules in `conversion-copy.md`).

### Hero demo media weight budget

- ship a poster image for any hero video or animated demo; never autoplay with unmuted audio;
- lazy-load video and defer any hero demo asset that is not the primary element until viewport entry or interaction;
- provide a static fallback (poster image or a still UI frame) for `prefers-reduced-motion` instead of the loop;
- weigh hero demo assets against the same budget as the project's `qa.lighthouse_thresholds` — one hero asset must not blow the performance budget for the whole page.

### Realistic content volume

Test the pricing table and integration grid with the real number of tiers or integrations, not two placeholder cards. Confirm wrapping, alignment, and scroll behavior at the audience's actual column count before the design gate.

## Handoff package

Use `assets/design-handoff/` as the neutral structure; see `assets/design-handoff/README.md` for the full folder layout and what belongs in each file. In summary, it carries project context, locked copy, reference notes, the token artifact, current or supplied screens, each live direction, the decision record, and — after selection — the refinement log and any signature-element specs.

Framework-independent HTML/CSS is preferred for early exploration because it exposes the design system without binding it to production architecture.

## Selection record

The design gate is complete when the user selects a direction, approves the supplied external design, or approves the scoped existing-brand plan. Record in `design-decision.md`:

- design source (and, for a mixed case, source per scope);
- selected direction or approved external/existing plan;
- approved changes requested during selection;
- tokens path and forbidden styles;
- signature elements built for this project;
- typography, color, grid, image, and motion principles;
- image processing parameters as numbers (crop, rotation, aspect ratio, masks) — not "cropped to look right";
- product treatment and hero demo asset plan (product profile);
- rejected ideas that must not reappear;
- unresolved asset dependencies;
- approval date and evidence.

Do not transfer all experimental effects into production. Implement the smallest set that carries the selected concept.
