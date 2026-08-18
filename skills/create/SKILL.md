---
name: create
description: "Direct, generate, compose, render, edit, adapt, mutate, repair, and visually QA static creatives with Codex's built-in GPT Image workflow plus deterministic HTML/CSS/SVG composition when typography or layout must be exact. Use for Meta or Instagram ads, product and e-commerce creatives, UGC-style ads, service ads, personal-brand posts, carousel or Reels covers, Stories, Telegram and article visuals, editorial posters, announcement graphics, reference-led visual work, placement adaptations, and controlled iterations of an existing creative. Do not use for video, generic code or document creation, UI implementation, standalone website work, standalone SVG/vector production, or unrelated image requests that do not need advertising or personal-brand creative direction."
---

# Create

Lead static visual work as a creative director and art director before production. Turn a request into a deliberate concept, a normalized CreativeSpec, the smallest useful LayerPlan, correctly routed raster and deterministic layers, a reviewed image, and controlled follow-up iterations.

Write user-facing responses in the user's language. Keep internal labels and render prompts in English unless exact visible copy requires another language.

## Start every run

1. Reuse all useful context already present: brief, copy, product facts, references, prior images, performance data, format, and approvals.
2. Route the request across three axes:
   - `track`: `performance` or `personal-brand`;
   - `operation`: `create`, `reference`, `product`, `ugc`, `mutate`, `adapt`, or `repair`;
   - `pace`: `gated` by default or `direct` only when the user explicitly asks to generate immediately, use fast/direct mode, or skip concepts.
3. Inspect every supplied image before reasoning about it. Assign one explicit role to each image; assign multiple roles only when the user clearly intends that.
4. Ask only for missing information that blocks a meaningful creative decision. Do not run a ritual questionnaire.
5. State the inferred route and the next gate in one compact update.

Use `performance` when the primary job is an ad outcome. Read [references/performance.md](references/performance.md).

Use `personal-brand` when the primary job is communication, editorial expression, content packaging, or exploration for Samir's brand. Read [references/personal-brand.md](references/personal-brand.md).

## Route operations

- `create`: develop a new visual from a brief.
- `reference`: extract selected transferable principles from one or more visual references.
- `product`: treat a real product image or packshot as the only source of truth for product identity.
- `ugc`: create intentionally native, plausible creator/customer-style advertising.
- `mutate`: analyze an existing creative or winner and change one variable per hypothesis by default.
- `adapt`: recompose an approved creative for a new placement or locale; do not merely crop it.
- `repair`: make a surgical edit and preserve everything outside the requested change.

Operations may combine when needed, such as `performance + product + adapt`, but keep one primary job and one clear next action.

## Run the workflow

### 1. Normalize the brief

Extract only relevant inputs. Separate supplied facts from assumptions. Mark an unsupported strategic idea as a hypothesis, never as customer research or proven causality.

For every customer-facing claim, price, discount, rating, testimonial, certification, award, quantitative result, medical statement, or product feature, require supplied or verified evidence. A neutral placeholder may appear during concept discussion but never in a final advertising creative.

### 2. Develop concepts

In `gated` pace, offer 2-4 concepts for a new creative or exploration request. Each concept must differ in insight, advertising hypothesis, metaphor, framework, or visual language—not merely background, color, or camera.

Keep each concept compact:

- name;
- insight or communication idea;
- angle/framework for performance, or concept/art direction for personal brand;
- hook;
- visual idea;
- why it fits the goal.

Recommend one concept and request a clear selection. Do not write a full render prompt or generate before selection.

For `mutate`, `adapt`, or `repair`, replace the concept gate with a compact diagnosis and proposed change set. Ask for approval only when the requested change or preserved elements are ambiguous.

### 3. Build the production specification

After approval—or immediately in explicit `direct` pace—read [references/production.md](references/production.md) and build the smallest useful CreativeSpec. Keep absent or irrelevant fields out. Do not dump the complete internal schema unless the user asks for it.

Read [references/references-and-locks.md](references/references-and-locks.md) whenever images, product fidelity, identity preservation, locks, adaptation, or repair are involved.

Read [references/render-routing.md](references/render-routing.md) whenever the creative contains visible copy, a named font, exact colors, logos, shapes, charts, measured layout, reusable variants, or a mix of generated and deterministic elements. Route each layer to `imagegen` or `html`; do not route the entire creative by habit.

### 4. Compile and produce

For an `imagegen` layer, compile a structured, relatively concise prompt from the CreativeSpec. Include only relevant sections and remove duplicated instructions.

Before every raster generation or edit, load and follow the installed `$imagegen` skill. Use its default built-in image generation/editing path only. Do not introduce an OpenAI API dependency, request an API key, use its CLI fallback, or switch to another image service.

For a local edit target, make the image visible to the model through the supported image-inspection flow before editing. For multiple distinct deliverables, use separate built-in generation calls rather than pretending one result is a controlled batch.

For `hybrid` or `deterministic` production, read [references/layer-plan.md](references/layer-plan.md), serialize a JSON LayerPlan, and use `scripts/render-creative.cjs`. Keep exact copy, named fonts, logos, prices, badges, charts, and measured geometry out of the imagegen prompt and compose them as deterministic layers. Reuse approved raster assets when only deterministic fields change.

### 5. Inspect and iterate

After every generated, edited, or composed result that can be seen, read [references/qa-and-iteration.md](references/qa-and-iteration.md) and classify it as `PASS`, `EDIT`, or `REJECT`.

- Use `EDIT` for a local defect that can be changed without disturbing the successful image.
- Use `REJECT` when the concept, identity, hierarchy, composition, or fidelity is fundamentally wrong.
- Never claim visual QA was completed when the result was not visible.

Repeat preserved invariants on every edit. Change one targeted variable at a time unless the user explicitly requests a broader exploration.

## Approval contract

- Treat `gated` as the default for new creative work.
- Accept a concept number, concept name, or unambiguous user instruction as approval.
- Do not treat enthusiasm without a selection as approval to generate.
- Let explicit `direct` pace skip concept approval, but never skip brief normalization, factual integrity, reference roles, prompt compilation, or QA.
- Do not add a second approval gate after the user has already approved the exact change.

## Output contract

Keep responses short and decision-oriented. At concept stage, show concepts, recommendation, and the single next decision. At production stage, show the selected direction and production status, not internal documentation. After QA, report the classification, material findings, targeted next action, which render path was used, and saved paths when the asset is project-bound. Include the final imagegen prompt for generated layers; for deterministic work, report the LayerPlan and reproducibility artifacts instead of inventing an image prompt.

Use [references/examples.md](references/examples.md) only when a worked pattern would materially improve routing or execution.

## Hard boundaries

- Support static visual deliverables only. HTML/CSS/SVG may be used internally for deterministic composition, but the skill must not trigger for generic web or vector work.
- Do not automate Meta APIs, scrape competitors, control Canva/Figma, create persistent client databases, or build API wrappers.
- Do not promise perfect text, logos, identity, packaging, colors, or consistency. Protect them with references, locks, and visual QA.
- Do not ask image generation to render critical typography when the local compositor can place it exactly.
- Do not invent a permanent brand system from one generated image or temporary direction.
- Do not copy a reference's protected identity, logo, product, or complete composition; transfer only the explicitly assigned principles.

Use `scripts/install.sh` to install this Codex-only skill locally.
