# LayerPlan and deterministic compositor

## Contents

1. LayerPlan contract
2. Supported layers
3. Runtime workflow
4. Deterministic QA
5. Security and portability

## LayerPlan contract

Create a JSON LayerPlan after concept approval and renderer selection. Use JSON for the executable artifact even when discussing the plan in another format.

```json
{
  "version": 1,
  "id": "telegram-article-banner",
  "canvas": {
    "width": 468,
    "height": 120,
    "background": "#000000",
    "pixelRatio": 1
  },
  "zones": [
    { "id": "subject", "x": 300, "y": 0, "width": 168, "height": 120 }
  ],
  "layers": [],
  "constraints": {
    "avoidOverlap": []
  }
}
```

Canvas width and height describe CSS pixels. With `pixelRatio: 1`, they are also the exact PNG dimensions. Use a higher pixel ratio only when the user explicitly requests scaled pixel output.

Define a protected `zone` when a meaningful subject is baked into a raster layer and deterministic layers must avoid it.

## Supported layers

Every layer requires:

```json
{
  "id": "unique_id",
  "type": "raster | svg | text | shape",
  "renderer": "imagegen | html",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100,
  "zIndex": 0
}
```

Common optional fields:

```json
{
  "opacity": 1,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1,
  "transformOrigin": "left top",
  "overflow": "hidden",
  "borderRadius": 0,
  "allowOverflow": false,
  "avoidZones": ["subject"]
}
```

### Raster and SVG

Use a local asset only. Remote URLs are rejected.

```json
{
  "id": "background",
  "type": "raster",
  "renderer": "imagegen",
  "status": "ready",
  "asset": { "path": "assets/background.png" },
  "fit": "cover",
  "position": "center center",
  "x": 0,
  "y": 0,
  "width": 468,
  "height": 120,
  "zIndex": 0
}
```

Use `status: pending` before an imagegen asset exists. `route` and `validate` may inspect a pending plan; `render` refuses it.

Supported raster formats are PNG, JPEG, WebP, and AVIF. SVG assets render through an isolated image layer rather than executable inline markup.

### Text

```json
{
  "id": "headline",
  "type": "text",
  "renderer": "html",
  "text": "ОС из",
  "font": {
    "family": "Unbounded",
    "path": "fonts/Unbounded-Bold.ttf",
    "weight": 700,
    "style": "normal"
  },
  "fontSize": 22,
  "lineHeight": 0.9,
  "letterSpacing": 0,
  "fill": "#fafafa",
  "whiteSpace": "pre",
  "overflow": "visible",
  "scaleY": 1.25,
  "transformOrigin": "left top",
  "x": 20,
  "y": 14,
  "width": 270,
  "height": 28,
  "zIndex": 2,
  "avoidZones": ["subject"]
}
```

Provide a local `.ttf`, `.otf`, `.woff`, or `.woff2` file whenever a named font is critical. The renderer fails closed when `font.path` is absent; set `font.required: false` only when system fallback is explicitly acceptable. Do not commit a user font into the skill or project unless its license and requested scope permit it.

Preserve exact strings in `text`. Use explicit newlines for required line breaks. Do not place HTML markup in text values.

### Shape

Supported shapes are `rectangle`, `ellipse`, and `line`.

```json
{
  "id": "accent",
  "type": "shape",
  "shape": "rectangle",
  "renderer": "html",
  "fill": "#c14649",
  "x": 16,
  "y": 14,
  "width": 4,
  "height": 72,
  "zIndex": 2
}
```

## Runtime workflow

Use `scripts/render-creative.cjs`:

```bash
node scripts/render-creative.cjs route layer-plan.json
node scripts/render-creative.cjs validate layer-plan.json
node scripts/render-creative.cjs render layer-plan.json --out-dir output
```

The CLI requires Node.js and the `playwright` package. In Codex desktop, locate the bundled workspace dependencies, use the returned Node executable, and set `NODE_PATH` to the returned Node modules directory. Do not add an npm install step when the bundled runtime already satisfies the dependency.

Set `CREATE_BROWSER_EXECUTABLE` or pass `--browser-executable` only when automatic Chromium discovery fails.

The renderer refuses to overwrite existing artifacts. Use a new output directory for each iteration, or pass `--force` only when replacing those exact derived files is intentional.

The render command writes:

```text
output/
├── creative.html
├── creative.png
└── manifest.json
```

Treat HTML and the manifest as reproducibility artifacts. Treat the LayerPlan as the editable production source.

## Deterministic QA

The renderer checks:

- CSS canvas and PNG pixel dimensions;
- local asset loading;
- exact text strings;
- font availability;
- computed text colors;
- layer bounds;
- text overflow and clipping;
- protected zones;
- declared layer-to-layer overlap constraints.

The manifest begins with `visualStatus: NOT_REVIEWED`. Inspect `creative.png` through the supported image viewer, then apply the visual QA workflow. Never turn deterministic `PASS` into visual `PASS` without seeing the image.

If deterministic QA fails, correct the LayerPlan, font, asset, or geometry. Do not hide a failure with `--allow-qa-fail` in normal production.

## Security and portability

- Accept JSON data, not arbitrary user-authored HTML or JavaScript.
- Keep user strings as text content; never interpolate them as markup.
- Accept local assets and fonts only; reject remote URLs.
- Embed approved assets into the generated HTML so the render is reproducible.
- Block remote scripts, styles, images, fonts, and other network requests during rendering.
- Keep proprietary fonts and client assets out of the skill repository.
- Store project-bound outputs in the user's project or requested output directory.
- Do not claim identical rendering across machines unless the same font files, renderer version, and browser environment are used.
