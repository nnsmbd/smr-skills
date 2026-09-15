# Eval: resume-v1

Tests the `schema_version: 1` → `2` migration described in
`references/site-profiles.md` ("State schema migration"): existing decisions
and approvals survive, old keys convert instead of getting dropped, and
approved gates do not silently reopen.

## Setup

Place this file at `.site-builder/project.yaml` before starting the run. It
uses the pre-v2 shape: a bare `primary_cta`/`secondary_cta` string instead of
action objects, a singular `content_owner`, no `site_type`, no product
modules, no `analytics` block.

```yaml
schema_version: 1

project:
  name: "Riverton Advisory"
  mode: "new"
  repository: ""
  public_url: ""

workflow:
  phase: "design"
  status: "in_progress"
  last_updated: "2026-06-01"

brief:
  audience: "Owners of small logistics companies (10-50 staff)"
  problem: "They lose money to route planning done by gut feel"
  offer: "A fixed-price 6-week route optimization audit and rollout"
  differentiation: "Former logistics ops lead, not a generic agency"
  primary_cta: "Book a free audit call"
  secondary_cta: "Download the 1-page audit checklist"
  proof_available: ["Two completed audits (unnamed, metrics verified)"]
  proof_needed: []
  languages: ["en"]
  regions: ["US"]
  success_signals: ["5 booked calls per month"]
  constraints: []
  non_goals: ["No e-commerce"]
  content_owner: "Dana (founder)"

content:
  research_path: "docs/research.md"
  copy_brief_path: ""
  approved_copy_path: "docs/copy-approved.md"
  claim_ledger_path: "docs/claims.md"
  assets_path: "assets/"

design:
  references_path: "docs/design-refs.md"
  directions_path: "docs/design-directions/"
  selected_direction: "b"
  decision_path: "docs/design-decision.md"
  motion_principles: ["Calm, no scroll-jacking, small reveals only"]

modules:
  core: true
  lead_form: true
  cases: true
  faq: true
  crm: false
  custom: []

approvals:
  brief:
    status: "approved"
    date: "2026-06-01"
    evidence: "Dana approved in chat: 'yes this brief is right, go ahead'"
  copy:
    status: "approved"
    date: "2026-06-10"
    evidence: "Dana approved final copy doc in review call"
  design:
    status: "pending"
    date: ""
    evidence: ""
  pre_production:
    status: "pending"
    date: ""
    evidence: ""
  deploy:
    status: "pending"
    date: ""
    evidence: ""

open_questions: []
assumptions: ["Assumed US-only regional compliance since audience is US logistics owners"]
```

## User prompt

> Let's continue the Riverton Advisory site. Where were we?

## Expected behaviors

- [ ] Reads `.site-builder/project.yaml`, recognizes `schema_version: 1`, and
      runs the documented migration rather than erroring or silently
      rewriting history.
- [ ] Sets `project.site_type: "service"` (no evidence of a product) and
      records this default per the migration steps.
- [ ] Converts `brief.primary_cta`/`secondary_cta` strings into
      `primary_action`/`secondary_action` objects, preserving the original
      string as `label` and recording the empty `type` in `open_questions`
      rather than guessing a `type` silently.
- [ ] Converts the singular `content_owner` into `content_owners` (a list)
      without losing the name.
- [ ] Adds missing v2 sections (`analytics`, `qa`, expanded `modules`,
      `deployment.runtime`, `integrations`) with template defaults instead
      of leaving them absent.
- [ ] Sets `schema_version: 2` and (if the environment allows running
      scripts) runs `scripts/validate-config.sh` and reports the result.
- [ ] Does **not** reopen the already-approved `brief` or `copy` gates
      merely because of the migration — their `status: "approved"` and
      evidence are preserved as-is.
- [ ] Resumes from the first incomplete phase (`design`, since `brief` and
      `copy` are approved and `design.selected_direction` is already set but
      the `design` approval is still `pending`) instead of restarting
      discovery.
- [ ] Reports the migration explicitly in its next compact update (what
      changed, what was preserved, what is now an open question).

## Failure signals

- The agent asks brief-phase questions again (audience, problem, offer)
  instead of resuming from `design`.
- `primary_cta`/`content_owner` data is dropped instead of converted.
- Approved gates (`brief`, `copy`) get reset to `pending` or re-litigated
  without the user raising a concern.
- The migration is performed silently with no mention in the compact update.
