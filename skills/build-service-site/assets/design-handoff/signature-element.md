# Signature element spec

One copy of this file per signature interactive or animated element (an element built specifically for this project, not a standard reveal or hover state). Fill it before build starts; list the element in `design.signature_elements`. See `references/design-directions.md` "Signature elements" for when this applies, and `references/responsive-motion.md` for the general motion and viewport QA this spec feeds into (this file does not repeat that QA detail).

## Contents

1. Purpose and narrative role
2. States
3. Transitions and forbidden transitions
4. Protected zones
5. Units
6. Lifecycle of transient state
7. Mobile behavior
8. Reduced-motion and failure fallback
9. Performance budget
10. Implementation
11. Measurement plan
12. Failed attempts log

## Purpose and narrative role

- What this element communicates or does for the visitor, in one or two sentences.
- Why it needs to be bespoke rather than a standard component.

## States

| State | Entry condition | Exit condition | Visual behavior |
|---|---|---|---|
| | | | |

List every state the element can be in, including idle/rest. An element with an implicit state machine (behavior that "just happens" based on scattered conditionals) is the recurring failure mode this table exists to prevent.

## Transitions and forbidden transitions

- Allowed transitions between the states above (which state can follow which).
- Forbidden transitions and why — for example, no instant A → B → A oscillation; require hysteresis (a minimum dwell time or distance before reversing) so the element doesn't flicker between two states under normal input noise.

## Protected zones

What the element must never cover, and what it merely makes more expensive to cover:

- **Forbidden zones:** headings, CTAs, form fields, and anything else the element must never overlap regardless of viewport or state.
- **Costly-but-allowed zones:** areas where overlap is technically acceptable but degrades the page and should be avoided when possible.

State explicitly which is which — "must not" and "better not" are different constraints and get confused when left implicit.

## Units

Specify speeds, travel distances, thresholds, and offsets relative to the element's own size or the viewport (element diameters per second, percentages, `em`, viewport units) — never as absolute pixels or pixels per second. Static sizes may use tokens. An absolute speed that felt right at one viewport is the most common way this kind of element breaks at another.

## Lifecycle of transient state

- What state survives a client-side (SPA) navigation, and what resets.
- What state survives a hard reload, and what resets.
- Storage choice (memory, session storage, local storage, URL, none) and why that choice fits the lifecycle above — do not choose persistence for its own sake.

## Mobile behavior

- How the element adapts below the pointer/hover breakpoints in `assets/design-tokens.css`.
- A fixed slot is allowed when there is no free space for a floating or cursor-following version — record that decision here rather than leaving mobile behavior as an afterthought.

## Reduced-motion and failure fallback

- Exact behavior under `prefers-reduced-motion: reduce` (per the project's single reduced-motion switch) — the element's purpose must still read without its motion.
- Behavior when the element's script fails to load or throws: what the page shows, and confirmation that the failure never hides required content (headings, CTAs, forms).

## Performance budget

- Frame cost budget (target frame time or FPS floor) for the element's active states.
- Asset weight budget (images, video, fonts, or data the element loads) and how it's measured.
- Collision or hit-test boxes, when the element detects overlap or proximity, measured from the real asset's alpha channel or actual rendered bounds — not from the asset's bounding rectangle, which is usually larger than what's visually there.

## Implementation

- The element's state logic lives in a pure module with no DOM access (no direct reads/writes of `window`, `document`, or layout) so it can be unit tested without a browser.
- Unit tests cover the state table and the forbidden transitions above, not just the happy path.

## Measurement plan

- Viewports and synthetic gestures the automated pass covers (name them, don't leave "the usual matrix" implicit).
- A real-device review is mandatory in addition to the automated pass — name which devices, and record the result in `.site-builder/project.yaml`'s `approvals.acceptance`. Headless emulation has repeatedly passed while a real touch/scroll interaction on this kind of element failed; that gap is why the device pass is not optional.

## Failed attempts log

| Attempt | What was tried | Why it was reverted | When it might make sense again |
|---|---|---|---|
| | | | |

Keep this even for approaches that "obviously wouldn't work" — a later iteration re-attempting an already-failed approach without knowing it failed before is wasted work.
