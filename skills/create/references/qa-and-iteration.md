# Visual QA and iteration

## Contents

1. Inspection requirement
2. QA checklist
3. PASS, EDIT, REJECT
4. Surgical iteration
5. Placement adaptation
6. Performance mutation

## Inspection requirement

Inspect every visible output after generation or edit. Compare it against the approved concept, CreativeSpec, source images, exact copy, locks, and destination.

If the result cannot be seen, report `NOT REVIEWED` rather than `PASS`. Ask the user to attach it again or use the supported image-inspection flow when a local file is available.

## QA checklist

### Critical fidelity

- product or subject identity;
- packaging geometry, label, logo, colors, and materials;
- exact headline, support, CTA, price, offer, and claims;
- role-specific reference fidelity;
- every active lock;
- absence of invented badges, reviews, ratings, prices, or claims.

### Visual quality

- one intentional focal point;
- clear hierarchy at target size;
- headline readability on a small screen when applicable;
- contrast and negative space;
- product or subject prominence;
- balanced composition without accidental clutter;
- art direction that supports the idea rather than generic AI aesthetics;
- correct aspect ratio and placement fit.

### Artifacts

- hands, fingers, faces, skin, teeth, and eyes;
- duplicated or fused objects;
- warped packaging or geometry;
- nonsense microtext or unwanted lettering;
- inconsistent shadows, reflections, scale, or perspective;
- damaged edges, masks, textures, or transparency.

### Track-specific checks

For performance, confirm that the angle is legible, the product/message survives mobile viewing, supplied proof is accurate, and no competing idea dilutes the hook.

For personal brand, confirm idea fidelity, intentional focal point, hierarchy, mood, art direction, exact text, preserved series language, and destination fit. Do not require direct-response conventions when they are irrelevant.

## PASS, EDIT, REJECT

Use `PASS` only when no critical defect blocks the intended use. Mention material limitations; do not imply perfection.

Use `EDIT` when the concept and most of the image work, and a local correction can preserve successful elements. Examples: one text error, a small unwanted object, a background-only change, a localized artifact, or a controlled color adjustment.

Use `REJECT` when the central concept, product/subject identity, composition, hierarchy, or reference interpretation is fundamentally wrong, or when local editing would cause more drift than regeneration.

Return a compact result:

```text
Classification: PASS | EDIT | REJECT
Critical findings:
Visual findings:
Next action:
```

## Surgical iteration

For `EDIT`, compile a prompt with `CHANGE ONLY` and `KEEP EXACTLY`. Repeat all relevant locks and reference roles. Do not introduce a new concept during repair.

After the edit, inspect the complete image again. A repaired defect does not guarantee that preserved elements remained intact.

For `REJECT`, return to the last sound artifact: approved concept, CreativeSpec, or master creative. Correct the root problem before regenerating.

## Placement adaptation

Adapt an approved master into `4:5`, `9:16`, or `1:1` by recomposing:

- preserve the central angle or communication idea;
- preserve exact copy and product/subject identity;
- preserve approved brand rules;
- change spacing, scale, position, negative space, and typography size as needed;
- keep critical content away from likely interface obstruction in `9:16` without relying on unverified universal percentages.

QA each placement independently. Passing the master does not make every adaptation a pass.

## Performance mutation

Before proposing mutations, decompose the winner into angle, hook, framework, composition, product treatment, proof, environment, and style.

Default to one changed variable per hypothesis. Express each mutation as:

```text
Hypothesis:
Changed variable:
Expected observable signal:
Locked elements:
```

Do not promise uplift or infer causality from one metric. If several variables must change, label the result as exploration rather than a controlled mutation.
