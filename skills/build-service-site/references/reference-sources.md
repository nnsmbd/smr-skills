# Recommended reference and workflow sources

## Contents

1. Source catalog
2. How to use the catalog
3. Access and evidence rules
4. Project-specific materials

## Source catalog

### Mobbin

- URL: https://mobbin.com/discover/apps/web/latest
- Use for: real web-product screens, flows, navigation, forms, onboarding, account areas, interaction states, and recurring UX patterns.
- Capture: the exact screen or flow, product category, reviewed date, and the specific pattern that may transfer.
- Boundary: a shipped pattern is useful evidence of real-world use, not proof that it converts for the current audience.

### Awwwards

- URL: https://www.awwwards.com/
- Use for: art direction, composition, large typography, image treatment, section transitions, expressive scrolling, and motion concepts.
- Capture: the exact visual or motion principle and why it supports the current brand.
- Boundary: independently validate readability, accessibility, mobile behavior, performance, and conversion clarity. An award is not evidence that a pattern fits a service website.

### Refero Styles

- URL: https://styles.refero.design/
- Use for: AI-readable design-system references, colors, typography, spacing, surfaces, components, and `DESIGN.md` patterns.
- Capture: tokens and system principles rather than a complete branded style.
- Boundary: rebuild an original system for the current project; do not copy another product's identity or proprietary assets.

### Framer Marketplace

- URL: https://www.framer.com/community/marketplace/templates/
- Use for: full landing-page rhythm, responsive section arrangements, service-site structures, portfolio/case presentation, and motion examples.
- Capture: structure, breakpoint behavior, content density, and the reusable principle behind a section.
- Boundary: verify template and asset licensing, avoid copying an entire template, and do not assume a Framer implementation determines the production stack.

### Landingfolio

- URL: https://www.landingfolio.com/
- Use for: a curated gallery of landing page designs organized by industry (SaaS, Product, Business) and by page type, including a dedicated pricing-page category — full-page rhythm, section order, and pricing-page layout patterns for product landings.
- Capture: the exact page or section, category, reviewed date, and the specific pattern that may transfer.
- Boundary: a featured design is a layout example, not proof it converts for the current audience; verify licensing before reusing any component or template.
- Checked: 2026-09.

### Page Flows

- URL: https://pageflows.com/
- Use for: real, annotated screen recordings of SaaS product flows — onboarding, signup, login, checkout, and upgrade/pricing sequences — across web, iOS, and Android.
- Capture: the exact flow, product, reviewed date, and the specific interaction that may transfer.
- Boundary: same as Mobbin — a shipped flow is evidence of real-world use, not proof it fits the current product. Full access is a paid subscription (a short paid trial is offered); do not share captured screens beyond what licensing allows.
- Checked: 2026-09.

### Manager skill

- Use for: a compatible manager skill, if installed — optional GitHub issue lookup and synchronization, parent hierarchy, Project placement, work records, and commit links.
- Boundary: `build-service-site` must still work without manager. Use the fallback in `github-workflow.md` when manager is absent or incompatible.

### Writer skill

- Use for: a compatible writer skill, if installed — optional delegation of copy drafting once the copy brief packet is ready (see `assets/copy-brief.md` and `conversion-copy.md`).
- Boundary: `build-service-site` keeps ownership of the claim ledger and the copy gate regardless of who drafts the words. `build-service-site` must still work without writer; write copy directly following `conversion-copy.md` when writer is absent or incompatible.

## How to use the catalog

1. Start with the user-provided competitors, research, screenshots, and references.
2. Choose catalog sources only for a decision they can inform.
3. Save each useful item as a reference card with URL, date, evidence, transferable property, and risks.
4. Group references by structure, typography, color, component, motion, responsive behavior, or conversion role.
5. Use a small compatible set of principles to form each design direction.
6. Keep launch requirements separate from optional inspiration and post-launch hypotheses.

The catalog is a recommended starting point, not a mandatory checklist. Do not spend time browsing a source that cannot affect a pending decision.

## Access and evidence rules

- Use an already authenticated browser session only through the environment's supported browser integration.
- Never ask for passwords, cookies, session tokens, or copied authentication data.
- If a source is unavailable, record the limitation and use public alternatives or user-supplied screenshots.
- Do not claim a page, animation, flow, or responsive state was reviewed unless it was actually opened or supplied.
- Record the review date because libraries, templates, and live sites change.
- Respect licensing and attribution requirements before reusing any asset.

## Project-specific materials

Treat a user-provided competitor analysis as a primary project input, not as permanent truth:

- check when it was created;
- distinguish visible facts from estimates and recommendations;
- re-verify unstable offers, pricing, metrics, pages, and claims;
- extract the reusable research method without publishing private file paths or client data;
- never transfer unsupported conversion percentages into production copy.
