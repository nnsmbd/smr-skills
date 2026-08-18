# Render routing

## Contents

1. Decision rule
2. Render modes
3. Asset production
4. Deterministic triggers
5. Iteration behavior

## Decision rule

Choose a renderer per layer, not once for the entire creative.

```text
Does the layer require semantic or generative creation?
YES -> imagegen

Does the layer require exact copy, typography, geometry, or placement?
YES -> html

Does the creative contain both kinds of layers?
YES -> hybrid
```

The source of truth is `CreativeSpec + LayerPlan`. Treat generated assets, HTML, and PNG files as derived artifacts.

`needsImagegen` means that at least one `imagegen` layer is still `pending`. A ready approved raster may retain its imagegen provenance while being reused without another generation call.

## Render modes

### `generative`

Use when the deliverable is primarily a photographic, illustrative, surreal, product, texture, or environmental image and no critical text, logo, chart, exact color block, or reusable layout is required.

Image generation may produce the complete image, but still normalize final dimensions and visually inspect the result.

### `hybrid`

Use when generated or edited raster assets must combine with exact text, logos, shapes, prices, badges, charts, or controlled layout. This is the normal route for text-bearing advertising and personal-brand creative.

Generate raster assets without critical typography. Compose them with native HTML/CSS/SVG layers and render the final static image locally.

### `deterministic`

Use when the creative is typography-, diagram-, card-, layout-, or shape-led and does not need a generated raster asset. Build the entire visual through the local compositor.

Do not select `hybrid` merely because the track is performance or personal brand. Select it because the layer requirements demand both renderer classes.

## Asset production

For every `imagegen` layer:

1. Define its role, locks, desired crop, and relationship to the final canvas.
2. Mark it `pending` in the LayerPlan before production.
3. Load and follow `$imagegen`.
4. Generate or edit the asset without exact typography when typography will be composed later.
5. Inspect the asset visually.
6. Copy a project-bound asset into the working output directory.
7. Set the layer to `ready` and assign its local path.

Do not rerun image generation when the requested change affects only an HTML text, shape, position, size, or color layer.

## Deterministic triggers

Route a layer to `html` when any of these must be exact or independently editable in the production source:

- visible copy, spelling, capitalization, or line breaks;
- a named font, supplied font file, weight, tracking, line height, or `scaleX`/`scaleY`;
- hexadecimal colors;
- arbitrary pixel dimensions;
- logos, SVG marks, rules, cards, badges, prices, charts, or CTA elements;
- measured alignment, spacing, protected zones, or overlap constraints;
- repeatable variants or single-variable layout mutations.

Treat a request such as “make the letters taller” as a deterministic transform when the text must otherwise remain identical.

## Iteration behavior

- Text, color, position, spacing, or scale change: update the LayerPlan and rerender only.
- Background or subject repair: edit only the relevant raster asset, then rerender with deterministic layers unchanged.
- Placement adaptation: create a new canvas and recompose layer geometry; reuse approved assets when suitable.
- Variant production: change only the declared LayerPlan fields and preserve all other values.

After every render, run deterministic QA first and visual QA second. A deterministic `PASS` does not imply a visual `PASS`.
