# Evals

Scenario files for manually evaluating this skill end to end. Each scenario
is generic — no real product or client names — so it can be run against a
fresh agent session without mixing a real client's brief into the test.

## How to run one manually

1. Start a fresh agent session (Claude Code or Codex) in an empty or
   throwaway project directory with this skill installed.
2. Give the agent the scenario's **setup** (as files/context it should find)
   and then the **user prompt**, verbatim.
3. Let the agent run several rounds without steering it — do not hint at the
   "right" answer. Only answer questions the scenario's user would plausibly
   answer, using the scenario's implied facts.
4. After the run (or after the phase the scenario targets), score against
   the scenario's **expected behaviors** checklist and note any **failure
   signals** observed.
5. Record pass/fail per checklist item and keep the transcript if a failure
   needs to be filed as an issue against the skill.

Run scenarios independently — do not carry `.site-builder/project.yaml` state
from one scenario into another, unless a scenario's setup explicitly says to
reuse a file (for example `resume-v1.md`, which supplies its own starting
state).

## Adapting `claude plugin eval`

If this skill is packaged as a plugin, `claude plugin eval` can run a subset
of these scenarios non-interactively: turn each scenario's user prompt into
an eval case, and turn the expected-behaviors checklist into that case's
grading rubric. This is optional — the manual process above is the primary
way to evaluate the skill and does not require plugin packaging.

## Scenarios

- `service-new.md` — a brand-new service/expert site from a vague prompt.
- `product-new.md` — a brand-new product/SaaS landing page from a vague
  prompt.
- `redesign-audit.md` — an audit-mode request against an existing site that
  must not mutate anything.
- `resume-v1.md` — resuming a project recorded under schema v1, exercising
  the v1→v2 migration.
- `deploy-gate.md` — a project at the deploy phase, checking the skill never
  deploys to production without explicit authorization for that specific
  action.
- `external-design.md` — a supplied external design export plus brand fonts
  with an instruction to "build it," checking `design.source: external`
  replaces the three-directions flow with token extraction, contrast
  checking, copy-conflict surfacing, forbidden-style recording, a refinement
  log with rollback, and owner acceptance recorded separately from deploy.
