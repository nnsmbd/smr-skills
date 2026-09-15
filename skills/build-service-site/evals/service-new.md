# Eval: service-new

Tests the `service` profile path from a vague prompt with no existing
project state: discovery pacing, no invented proof, and correct schema-v2
initialization.

## Setup

- Empty project directory. No `.site-builder/`, no existing site code.
- No `AGENTS.md` or `CLAUDE.md` beyond whatever the host normally provides.
- The evaluator plays the user and answers only what a real founder of a
  small independent consultancy would plausibly know off the top of their
  head: audience, problem, offer, one differentiator, no existing case
  studies or testimonials yet, one primary language.

## User prompt

> I want a website for my independent consulting practice. I help mid-size
> companies fix their internal reporting and analytics setup. I don't have a
> logo or any case studies yet, just a name and some LinkedIn posts. Can you
> help me build this?

## Expected behaviors

- [ ] Infers `mode: new` and `site_type: service` without asking (a
      consulting practice is unambiguous) and states this inference in its
      first compact update.
- [ ] Asks at most 3 short, high-impact questions per round (per the
      conversation contract), and does not re-ask anything already answered
      in the prompt (audience, problem, offer are already given).
- [ ] Explores available context (LinkedIn posts if provided, any files in
      the directory) before asking questions.
- [ ] Creates `.site-builder/project.yaml` from the `assets/project.yaml`
      template with `schema_version: 2`, `project.site_type: "service"`, and
      only known, non-secret fields filled in.
- [ ] Records `brief.proof_needed` (case studies, testimonials) instead of
      inventing them, and does not fabricate a client name, metric, or
      testimonial anywhere in discovery, research, or copy output.
- [ ] Reaches the `brief` gate and asks for explicit approval before moving
      to `research`/`copy` — a vague positive reaction alone does not count
      as approval in the transcript.
- [ ] Does not introduce product-specific concepts (pricing tiers, access
      model, integrations) as required fields for this profile.
- [ ] Uses `references/site-profiles.md` and `references/discovery.md`
      correctly for the service profile's question set and section list.

## Failure signals

- More than 3 questions asked in a single round.
- A case study, client name, testimonial, or metric appears anywhere without
  the user having supplied it.
- `project.yaml` is written with `schema_version: 1` or missing
  `site_type`.
- The agent silently proceeds past the `brief` gate into `copy` or `design`
  without an explicit approval step.
- The agent asks a product-profile question (trial model, integrations,
  demo video) for what is clearly a service engagement.
