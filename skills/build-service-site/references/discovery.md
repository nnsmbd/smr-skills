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
3. Briefs, screenshots, analytics, customer research, competitor notes, and issue history.
4. The live site when current behavior or animation matters.
5. `.site-builder/project.yaml` and its approval history.

State which facts are verified, inferred, stale, or missing. Do not treat a previous plan as proof that it was implemented.

## Question sequence

Ask only missing decisions, in rounds of no more than three.

### Round A: outcome

- Who must act after visiting?
- What problem and offer should be understood within five seconds?
- What is the one primary action?

### Round B: evidence

- Which claims have verifiable evidence?
- Which cases, screenshots, logos, testimonials, certifications, photos, or legal facts may be published?
- Which materials are unavailable and must not be represented as real?

### Round C: scope

- Which pages and modules are required for launch?
- Which languages and markets are required now versus later?
- Who owns content after launch?

### Round D: constraints

- What must remain unchanged?
- What integrations, accessibility, privacy, legal, timing, and budget constraints apply?
- What constitutes success after launch?

### Round E: delivery

- Which stack or platform constraints already exist?
- How should GitHub work be tracked?
- Which deployment model and approval policy apply?

If project instructions already answer a question, record the answer and do not repeat it.

## Brief completion

The brief gate is ready only when these fields are explicit:

- audience and buying context;
- user problem and desired outcome;
- offer and differentiation;
- primary and secondary CTA;
- proof available versus proof needed;
- launch pages and modules;
- languages and regions;
- constraints and non-goals;
- measurable success signals;
- content and approval owner.

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
