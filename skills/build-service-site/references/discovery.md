# Discovery and project state

## Contents

1. Inspection order
2. Question sequence
3. Brief completion
4. Redesign rules
5. State updates

## Inspection order

Before asking questions, inspect what the user already supplied:

1. Project instructions and repository status.
2. Existing routes, components, content, styles, assets, integrations, tests, and deployment files.
3. Design sources specifically: an existing `design-handoff/`-style folder, a token file (`design-tokens.css` or equivalent), design-tool exports (a design-canvas export, Figma file, or other handed-over design system), and any owner spec with screenshots. Look before asking — most projects that have a design source already have it sitting in the repository or in supplied files, not only in the requester's memory.
4. Briefs, screenshots, analytics, customer research, competitor notes, and issue history.
5. The live site when current behavior or animation matters.
6. `.site-builder/project.yaml` and its approval history.

Determine `project.site_type` (`service` or `product`) as early as possible from the request and supplied materials — see `references/site-profiles.md` for the profile definitions and what changes per phase. Ask a single clarifying question only when both profiles plausibly fit (for example a productized service, or an agency launching a tool); otherwise record the inferred profile as a decision, not a question.

State which facts are verified, inferred, stale, or missing. Do not treat a previous plan as proof that it was implemented.

## Question sequence

Ask only missing decisions, in rounds of no more than three. Pressure-test contested decisions inside the same rounds as described in `references/brief-grill.md`, using a compatible `grill-me` skill when installed; never run a second questionnaire alongside discovery. When `site_type` is `product`, a product-specific question replaces the service-specific question it corresponds to instead of adding a fourth question to the round; ask only what the inspection step could not already answer.

### Round A: outcome

- Who must act after visiting?
- What problem and offer should be understood within five seconds?
- What is the one primary action, described as an adapter (`form`, `booking`, `signup`, `waitlist`, `bot_deeplink`, `checkout`, or `external`), and what happens right after the click?

### Round B: evidence

- Which claims have verifiable evidence?
- Service: which cases, screenshots, logos, testimonials, certifications, photos, or legal facts may be published? Which materials are unavailable and must not be represented as real?
- Product: is the interface shown real UI or a mockup, is a demo video available, what usage or customer numbers and integrations may be published, and what security or data-handling facts may be published? What is the current product status — waitlist, beta, or generally available?
- Is there an existing brand (logo, colors, fonts, imagery rules), a supplied design (a design-canvas export, Figma file, or other handed-over design system), or an owner spec with screenshots? Which styles are explicitly forbidden? Skip this question when the inspection step already found a design-handoff folder, a token file, an export, or spec screenshots — record what was found instead of asking.

### Round C: scope

- Which pages and modules are required for launch? For a product, also fix the access model (`waitlist`, `trial`, `freemium`, `paid`, `demo_call`, or `open`), which pricing tiers apply and whether they are final, which integrations should be shown, and whether the product lives on a separate app domain.
- Which languages and markets are required now versus later?
- Who owns content and approvals after launch? Name every owner when there is more than one.

### Round D: constraints

- What must remain unchanged?
- What integrations, accessibility, privacy, legal, timing, and budget constraints apply — including geographic or regulatory restrictions in target markets and any dependency on a third-party platform that may be restricted, throttled, or regulated in some regions (for example a platform the product depends on, or region-specific consent/cookie law)?
- What constitutes success after launch?

### Round E: delivery

- Which stack or platform constraints already exist?
- How should GitHub work be tracked?
- Which deployment model and approval policy apply?

If project instructions already answer a question, record the answer and do not repeat it.

## Brief completion

The brief gate is ready only when these fields are explicit:

- project profile (`site_type`: `service` or `product`);
- audience and buying context;
- user problem and desired outcome;
- offer and differentiation;
- primary and secondary action, each recorded as an adapter type with what happens after the click;
- access model, for a product (`waitlist`, `trial`, `freemium`, `paid`, `demo_call`, or `open`);
- proof available versus proof needed;
- design source (`design.source`: `directions`, `external`, or `existing`), `design.brand_assets_path` when a brand already exists, and `design.forbidden_styles`;
- launch pages and modules;
- languages and regions;
- constraints and non-goals;
- measurable success signals and an analytics event plan (see `references/measurement.md`);
- content and approval owners (name every owner when there is more than one);
- a decision memo for contested decisions, with rejected alternatives, material assumptions, and accepted risks (`brief.decision_memo_path`).

Summarize the brief in plain language and ask for approval. Do not use implementation jargon in the business summary.

## Redesign rules

For an existing site, classify each area:

- `keep`: working and approved;
- `refine`: direction is right, execution needs adjustment;
- `replace`: no longer supports the business or user task;
- `unknown`: evidence or intent is missing.

Inspect responsive states and animation code, not only screenshots. Preserve existing user changes and working integrations. Diagnose before implementing unless the user explicitly asked for both diagnosis and repair.

## State updates

Store durable, non-secret decisions in `.site-builder/project.yaml`:

- update the current phase and status;
- replace resolved questions with decisions;
- record assumptions when the user delegated a choice;
- record approval date and evidence;
- keep deployment values as environment variable names, never values.

Do not mirror large documents into YAML. Store paths to approved copy, research, and design decisions.

`project.yaml` uses `schema_version: 2`. When resuming a `schema_version: 1` project, run the v1→v2 migration in `references/site-profiles.md` before recording new decisions, and report the migration in the next compact update rather than re-opening approved gates.
