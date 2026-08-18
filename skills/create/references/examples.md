# Worked examples

## Contents

1. E-commerce product
2. UGC
3. Service ad
4. Winner mutation
5. Reference adaptation
6. Personal-brand editorial

These examples demonstrate workflow shape. Adapt them to the actual brief; do not copy their claims, copy, or art direction into unrelated work.

## 1. E-commerce product

### Request

"Create a 4:5 Instagram ad for this real coffee concentrate bottle. Emphasize a faster morning."

### Route

```text
track: performance
operation: product + create
pace: gated
```

Assign the bottle image as `Image 1 = PRODUCT SOURCE`. Record the convenience insight as a hypothesis unless the user supplies customer evidence.

### Concepts

1. `One Less Morning Decision` — convenience angle; Hero Product + Benefit; bottle centered against a simplified breakfast rhythm.
2. `From Alarm to Ready` — speed angle; Problem -> Solution; a compressed visual sequence ending in the product.
3. `The Calm Counter` — desire angle; Lifestyle; product as the anchor of an uncluttered morning.

Recommend the first concept for clear mobile hierarchy and direct product visibility. Stop for selection.

### CreativeSpec excerpt after approval

```yaml
track: performance
operation: product
objective: communicate morning convenience
placement: Instagram feed
aspect_ratio: 4:5
insight: busy mornings make small decisions feel expensive
insight_status: hypothesis
angle: convenience
framework: Hero Product + Benefit
reference_roles:
  Image 1: PRODUCT SOURCE
locks: [PRODUCT, COPY]
mutable: [background, supporting breakfast props]
```

Compile the prompt with Image 1 as the only product authority. Do not invent a price, discount, rating, or product benefit beyond the supplied brief.

### QA

Check bottle geometry, label spelling, headline, focal point, and 4:5 readability. Use `EDIT` for one label character; use `REJECT` if the package identity was redesigned.

## 2. UGC

### Request

"Make a native-looking Story ad for this hand cream. It should feel like a creator's real bathroom shelf, not a studio."

### Route

```text
track: performance
operation: ugc + product
pace: gated
```

### Concept

`Actually Used, Not Displayed` — trust/convenience hypothesis; UGC framework; handheld smartphone framing, ordinary available light, believable shelf clutter, and natural skin texture. Keep the product readable without making the scene look staged.

### Production controls

```text
IMMUTABLE
- Product geometry, tube design, label, and colors from Image 1
- Supplied headline

MUTABLE
- Shelf objects, hand position, bathroom background
```

Avoid beauty retouching, perfect symmetry, cinematic lighting, invented testimonial text, and fake ratings.

### QA

Check hands, tube geometry, label, natural light, authentic object placement, mobile hierarchy, and `9:16` edge safety.

## 3. Service ad

### Request

"Create a square Meta ad for a bookkeeping service. Message: founders should see cash problems before month-end. No physical product."

### Route

```text
track: performance
operation: create
pace: gated
```

### Concepts

1. `The Warning Before the Report` — prevention angle; Problem -> Solution; one calm signal surfacing before a dense month-end report.
2. `Cash Visibility` — clarity angle; Feature Breakdown; a simple visual hierarchy from transactions to one clear runway view.
3. `Old Way / Current View` — comparison angle; Old Way vs New Way; cluttered delayed view against a focused current view.

Do not fabricate dashboards, client counts, savings, guarantees, or financial results. After selection, make message hierarchy and metaphor—not a product packshot—the focal system.

### QA

Check the exact supplied message, readability, metaphor clarity, absence of fake financial metrics, and square composition.

## 4. Winner mutation

### Request

"This 4:5 product ad is our winner. Give me three variants. Keep the winning idea."

### Route and diagnosis

```text
track: performance
operation: mutate
pace: gated
phase: exploitation
```

Decompose the winner before proposing variants. Suppose its core is a value angle, offer framework, oversized product on the right, price proof on the left, and a warm kitchen environment.

### Controlled mutations

1. Change only `headline hook`; lock offer, layout, product, environment, and style.
2. Change only `product scale`; lock hook, offer, positions, environment, and style.
3. Change only `human presence`; lock hook, offer, product scale, layout, and environment.

Each is a separate hypothesis. Do not combine all three changes and call the outputs a controlled A/B test.

### QA

Compare every variant to the master and verify that only the declared variable changed. Classify drift in locked elements as `EDIT` or `REJECT`.

## 5. Reference adaptation

### Request

"Use this competitor ad's editorial layout for my product, but do not copy their brand."

### Route

```text
track: performance
operation: reference + product
pace: gated
```

Assign:

```text
Image 1 = PRODUCT SOURCE
Image 2 = COMPOSITION REFERENCE
```

Extract only transferable principles from Image 2: asymmetric hierarchy, oversized headline scale, narrow negative-space channel, and hard directional light. Explicitly exclude its logo, copy, product, palette, and proprietary graphic marks.

### Concept

Apply the editorial tension to the user's own benefit angle and product identity. Change enough subject matter and arrangement to create an original work, not a traced replica.

### QA

Check product fidelity, originality, excluded identity elements, approved composition principles, exact copy, and mobile legibility.

## 6. Personal-brand editorial

### Request

"Create a Telegram visual for an article about why more ad spend does not fix a weak offer. I do not have fixed brand colors yet."

### Route

```text
track: personal-brand
operation: create
pace: gated
brand_state: experimental direction
```

### Directions

1. `Fuel Into a Broken Machine` — conceptual editorial metaphor; restrained industrial photography; one machine receiving excess fuel while its core mechanism is visibly disconnected.
2. `The Louder Empty Sign` — graphic poster; type-led scale increase around an intentionally empty center.
3. `Pressure Without Structure` — abstract 3D; pressure deforms a weak framework instead of producing movement.

Recommend based on article tone and desired viewer reaction. Do not create a permanent palette or enable `BRAND LOCK`.

### CreativeSpec excerpt after approval

```yaml
track: personal-brand
operation: create
destination: Telegram article visual
communication_goal: show that media pressure cannot repair a weak offer
desired_reaction: recognition followed by curiosity
aspect_ratio: 4:5
art_direction: conceptual editorial photography
locks: [COPY]
mutable: [palette, material treatment, lighting]
```

If the user supplies an exact headline, named font, hexadecimal colors, or measured layout, route the scene and typography separately:

```text
render_mode: hybrid
imagegen: conceptual editorial scene without critical text
html: exact headline, font, color, position, and transforms
```

Create a LayerPlan with the approved scene as a ready raster layer and the headline as one or more text layers. If the user later asks to change only headline scale, tracking, or position, update the LayerPlan and rerender without calling imagegen.

### QA

First require deterministic PASS for canvas size, exact headline, font, colors, bounds, and protected zones. Then inspect the PNG for idea fidelity, focal point, hierarchy, intentional art direction, artifacts, and destination fit. Do not reject it merely for lacking a CTA or product.
