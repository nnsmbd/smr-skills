# CreativeSpec and production

## Contents

1. CreativeSpec
2. Render selection
3. Prompt compiler
4. Exact visible copy
5. Generation and edit routing
6. Built-in raster runtime contract

## CreativeSpec

Build a normalized internal representation after concept approval or during explicit direct mode. Include only known and relevant fields.

```yaml
track: performance | personal-brand
operation: create | reference | product | ugc | mutate | adapt | repair
pace: gated | direct
render_mode: generative | hybrid | deterministic

objective:
destination:
placement:
aspect_ratio:
delivery:
  raster: true
  reproducible_source: false

audience:
segment:
insight:
insight_status: evidence | inference | hypothesis
angle:
framework:

content_topic:
communication_goal:
desired_reaction:

subject:
product:
offer:
proof:

copy:
  headline:
  support:
  cta:

composition:
art_direction:
reference_roles:
locks:
mutable:
constraints:
```

Performance requests commonly use audience, insight, angle, framework, offer, and proof. Personal-brand requests commonly use content topic, communication goal, desired reaction, subject, and art direction. Do not force either track through the other's fields.

Keep facts and hypotheses distinct. Preserve exact user strings as literal values. Do not expose the full schema unless it helps the user review or reuse the specification.

## Render selection

Read [render-routing.md](render-routing.md) and select renderers from actual layer requirements.

- `generative`: image-led work without critical deterministic elements;
- `hybrid`: generated raster assets plus exact text, logos, shapes, or layout;
- `deterministic`: typography-, shape-, card-, chart-, or layout-led work without generated assets.

When `hybrid` or `deterministic` applies, read [layer-plan.md](layer-plan.md) and create the JSON LayerPlan before final production. Keep the CreativeSpec strategic and semantic; keep coordinates, fonts, colors, transforms, and asset paths in the LayerPlan.

## Prompt compiler

Compile the render prompt from the CreativeSpec. Use only relevant sections in this order:

1. `ROLE / JOB`
2. `OBJECTIVE`
3. `AUDIENCE` when useful
4. `REFERENCE ROLES`
5. `CREATIVE ANGLE` or `COMMUNICATION IDEA`
6. `EXACT COPY`
7. `COMPOSITION`
8. `ART DIRECTION`
9. `PHOTOGRAPHY / REALISM`
10. `IMMUTABLE`
11. `MUTABLE`
12. `CONSTRAINTS`
13. `OUTPUT FORMAT`

Prefer short, explicit sentences over keyword soup. Specify concrete layout, subject, lighting, material, and hierarchy only when they support the chosen concept. Remove duplicate requirements and omit empty sections.

Use the `$imagegen` taxonomy only when compiling an imagegen layer prompt. Most performance work maps to `ads-marketing`, product-led scenes may map to `product-mockup`, natural creator scenes to `photorealistic-natural`, and repairs to the closest edit taxonomy.

Example scaffold:

```text
ROLE / JOB
Create a mobile-first static Instagram feed ad.

OBJECTIVE
Communicate one supplied benefit through the approved concept.

REFERENCE ROLES
Image 1 is the PRODUCT SOURCE and the only source of truth for product identity.
Image 2 is COMPOSITION REFERENCE only. Do not transfer its branding or product.

EXACT COPY
Headline: "YOUR MORNING. SIMPLIFIED."
Render every supplied string verbatim. Do not rewrite, translate, duplicate, or add text.

COMPOSITION
One dominant product focal point with headline legible on a small screen.

IMMUTABLE
Product geometry, package proportions, label, supplied copy.

MUTABLE
Background surface and supporting props.

CONSTRAINTS
Do not invent badges, price, discount, review, rating, or microtext.

OUTPUT FORMAT
4:5 portrait static raster creative.
```

## Exact visible copy

Represent every customer-facing string literally and quote it. For generative typography, include:

```text
Render every supplied string verbatim.
Do not rewrite, translate, paraphrase, duplicate, or add additional text.
```

For difficult names, optionally spell the word character by character while preserving the final intended string. Treat generative text rendering as something to inspect, not as guaranteed accuracy.

When the text, font, capitalization, line break, color, position, or transform is critical, route it to an HTML text layer instead of repeating stronger wording to imagegen. A named font should normally have an approved local font file in the LayerPlan.

Do not let the image model invent price, discount, review, rating, certification, medical claim, feature, statistic, or legal copy. If missing factual text is essential, stop before final generation and ask for it.

## Generation and edit routing

Use generation when creating a new scene or asset and references only guide product, style, composition, mood, or subject.

Use edit when changing an existing image while preserving selected elements. For `repair`, write an edit prompt with:

```text
CHANGE ONLY
- <requested local change>

KEEP EXACTLY
- <all protected elements>
```

Repeat the invariants on every edit. Do not regenerate a successful scene to fix one localized defect. Do not call imagegen when the requested change affects only deterministic copy, color, size, spacing, position, or transform fields.

For multiple distinct concepts or deliverables, use one built-in generation call per concept or deliverable. Do not treat several uncontrolled outputs as an A/B test.

## Built-in raster runtime contract

Load and follow `$imagegen` before calling image generation or editing. Use its default built-in path. Never:

- add an API client or API key requirement;
- use the imagegen CLI fallback;
- hard-code API parameters as though they were built-in tool arguments;
- switch to another provider;
- promise a destination-path argument on the built-in tool.

Inspect local edit targets with the supported image viewer first. Respect `$imagegen` save-path behavior: preview-only assets may remain in the generated-image location, while project-bound finals must be copied into the project and reported to the user.

Treat GPT Image 2 capabilities as useful but not guaranteed outcomes: generation and editing, flexible image sizes, high-fidelity image inputs, strong instruction following, text rendering, layout handling, and visual reasoning. Rely on QA rather than marketing percentages or promises.

The local compositor is a separate deterministic production path. It requires no additional image API or provider. Use it to assemble approved local raster assets with exact HTML/CSS/SVG layers, then render through Playwright. Do not confuse local deterministic composition with an imagegen fallback.

When a request depends on exact current model limits or behavior, verify the current official OpenAI documentation instead of relying on remembered parameters:

- `https://developers.openai.com/api/docs/models/gpt-image-2`
- `https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide`

Do not encode volatile prices, rate limits, or unsupported guarantees in this skill.
