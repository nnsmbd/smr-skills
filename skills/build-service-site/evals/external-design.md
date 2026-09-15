# Eval: external-design

Tests the `design.source: external` path: a supplied design export plus
brand fonts should replace the three-directions phase with extraction and
refinement, not get treated as one more input to a from-scratch direction
exercise.

## Setup

- An existing `.site-builder/project.yaml` at the `design` phase, with the
  `brief` and `copy` gates already approved (`approvals.brief.status:
  "approved"`, `approvals.copy.status: "approved"`) and `content.approved_copy_path`
  pointing at a small approved copy file with a handful of headline and body
  strings.
- A supplied design export in the project directory: a folder of static HTML
  or image exports from a design tool (a design-canvas export or an
  equivalent Figma export), plus two brand font files and a short brand note
  naming the accent color and stating "no glow, neon, glossy, or liquid
  effects" as forbidden styles.
- The supplied export's copy differs from the approved copy in a couple of
  places (an older headline variant, a CTA label that no longer matches).
- Git is initialized with a clean working tree.

## User prompt

> Here's the design our brand team already produced, plus our two brand
> fonts. Build the site to match this.

## Expected behaviors

- [ ] Recognizes this as `design.source: external` (a supplied design export)
      rather than defaulting to the three-live-directions flow, and records
      `design.source` accordingly in `project.yaml` without asking the user
      to pick from invented directions.
- [ ] Does not generate three original design directions for the user to
      choose from — the supplied export is the design decision, not one
      option among three.
- [ ] Extracts the export's visual system into `design-tokens.css` (colors,
      fonts including the supplied brand fonts, spacing/radii/shadows, width
      and height breakpoints, motion durations/easings) and records the path
      in `design.tokens_path`, rather than leaving tokens undocumented in
      component code.
- [ ] Runs (or explicitly reports running) a contrast check against the
      extracted color roles before treating the design gate as ready, per
      `assets/design-tokens.css`'s documented contrast pairs.
- [ ] Detects and lists the conflicts between the supplied export's copy and
      the already-approved copy (the older headline variant, the mismatched
      CTA label) as an explicit list for the user to resolve, instead of
      silently picking one side or silently overwriting the approved copy
      with the export's older text.
- [ ] Records the brand note's forbidden styles in `design.forbidden_styles`
      (glow, neon, glossy, liquid) and does not introduce any of them while
      building.
- [ ] Keeps a refinement log with numbered iterations and a checkpoint
      (e.g. a git commit or tag) per accepted state while translating the
      export into working code — not one uncommitted pass with no
      intermediate record.
- [ ] When a refinement is rejected during the exchange (simulate the
      evaluator rejecting one iteration, such as a spacing change that drifts
      from the export), the agent rolls back to the prior checkpoint rather
      than patching forward from the rejected state.
- [ ] Treats the `design` approval gate as the sign-off on the extracted
      system and its conflict list, separate from any later `approvals.acceptance`
      (owner acceptance after release) — does not conflate "design matches
      the export" with "owner reviewed the live site on a real device."
      `approvals.acceptance` stays `"pending"` until a release actually
      happens and the owner reviews it.

## Failure signals

- Three original design directions are proposed for the user to choose
  between when a design export was already supplied.
- `design-tokens.css` (or an equivalent tokens file) is left unfilled while
  components hard-code the export's colors/fonts/spacing inline.
- The copy conflicts between the export and the approved copy are resolved
  silently (either direction) instead of being surfaced as a list.
- A forbidden style (glow/neon/glossy/liquid, or whatever the brand note
  specified) appears in the implementation.
- No refinement log or checkpoints exist, so a rejected iteration cannot be
  rolled back cleanly.
- `approvals.acceptance` is marked approved from the design/build work itself,
  with no separate post-release, real-device review recorded.
