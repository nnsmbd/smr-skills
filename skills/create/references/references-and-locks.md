# References and locks

## Contents

1. Assign reference roles
2. Transfer and exclusion rules
3. Lock definitions
4. Product fidelity
5. Repair and adaptation

## Assign reference roles

Inspect each input and label it explicitly before concept or prompt work. Supported roles include:

- `EDIT TARGET`
- `PRODUCT SOURCE`
- `SUBJECT SOURCE`
- `COMPOSITION REFERENCE`
- `BRAND REFERENCE`
- `STYLE REFERENCE`
- `TYPOGRAPHY REFERENCE`
- `LIGHTING / MOOD REFERENCE`
- `TEXTURE / MATERIAL REFERENCE`

Use numbered language in the prompt:

```text
Image 1 = PRODUCT SOURCE
Image 2 = COMPOSITION REFERENCE
Image 3 = LIGHTING / MOOD REFERENCE
```

Do not call an image a product source when it only illustrates a similar category. Do not call an image an edit target when the user wants a new scene inspired by it.

## Transfer and exclusion rules

For every reference, state:

- what may transfer;
- what must remain unique to the user's creative;
- which source is authoritative when references conflict.

Examples:

```text
Image 1 is the only source of truth for product identity.
Use Image 2 only for composition and negative-space logic.
Do not transfer branding, product identity, copy, or logo from Image 2.
```

Extract hierarchy, contrast, scale, spacing, lighting, texture, tension, type treatment, composition, or abstraction level as appropriate. Do not clone the reference wholesale or mix identities from multiple products.

## Lock definitions

### PRODUCT LOCK

Preserve exact geometry, proportions, packaging, label, spelling, colors, materials, and product identity.

### SUBJECT LOCK

Preserve the supplied person's or character's identity and any explicitly protected pose, expression, wardrobe, or distinguishing features. Never promise perfect identity preservation; inspect every result.

### BRAND LOCK

Preserve only supplied or approved durable identity rules: logo, palette, typography direction, and recurring system rules. Do not infer a brand lock from one mood board or generated image.

### COPY LOCK

Preserve headline, support, CTA, price, offer, claim, and other supplied strings exactly. Inspect every character after generation.

### COMPOSITION LOCK

Preserve framing, camera, layout, subject position, product position, and copy hierarchy when the approved composition must survive an edit or mutation.

### STYLE LOCK

Preserve the approved visual language within a series. Keep this scoped to the current series unless the user makes it a fixed brand rule.

Separate every production prompt into:

```text
IMMUTABLE
- locked elements

MUTABLE
- elements permitted to change
```

Do not mark the same element as both immutable and mutable.

For hybrid production, carry locks into the LayerPlan. Keep protected raster asset paths unchanged during typography or layout iterations, and keep protected text values, font files, colors, and geometry unchanged during raster repairs. A lock applies across renderer boundaries.

## Product fidelity

When a real product source exists:

1. Treat it as the only authority for product identity.
2. Preserve exact geometry, package proportions, label, spelling, surface material, and color relationships.
3. Use other references only for their assigned roles.
4. Avoid hiding critical label areas behind props, hands, highlights, or typography.
5. Repeat product invariants during every iteration.
6. Reject rather than repair when the product has been substantially redesigned or mixed with another identity.

Do not ask the image model to redesign packaging when fidelity is the goal.

## Repair and adaptation

For a surgical repair, identify one edit target, one local change, and all protected elements. Example:

```text
CHANGE ONLY
- Correct the final letter in the product label to match Image 1.

KEEP EXACTLY
- Product geometry and materials
- Camera and crop
- Product position
- Headline and typography
- Background and lighting direction
```

Use adaptation when the destination changes. Preserve angle, copy, subject/product identity, and applicable brand rules, but allow a deliberate reflow of spacing, scale, position, negative space, and typography size. Do not apply `COMPOSITION LOCK` so rigidly that it forces a broken crop; preserve composition logic rather than exact coordinates when recomposing between aspect ratios.

When the defect belongs to a deterministic layer, update the LayerPlan rather than sending the full composited PNG to imagegen. When the defect belongs to a raster layer, edit that source asset and rerender deterministic layers unchanged.
