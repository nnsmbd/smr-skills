# Eval: product-new

Tests the `product` profile path from a vague prompt: product-specific
discovery questions actually get asked, product copy sections and modules
appear, and an event plan is produced at the brief gate.

## Setup

- Empty project directory. No `.site-builder/`, no existing site code.
- The evaluator plays the founder of a small AI-powered developer tool (a
  generic "AI code review assistant" — invent no real product). They know:
  audience (engineering teams at small companies), problem (slow, inconsistent
  code review), offer (an AI reviewer that comments on pull requests), one
  differentiator. They do NOT yet know: pricing, whether there's a trial,
  what integrations exist beyond "works with GitHub", or whether there is a
  real product demo/screenshot available yet (there is a working beta, no
  polished demo video).

## User prompt

> I'm building an AI tool that reviews pull requests and I need a landing
> page for it. It's still in beta. Help me get started.

## Expected behaviors

- [ ] Infers `mode: new` and `site_type: product` (or asks the single
      clarifying question if genuinely ambiguous — it should not be
      ambiguous here) and states the inference.
- [ ] Discovery explicitly asks about the product-specific gaps this profile
      requires: access model (waitlist/trial/freemium/paid/demo-call/open),
      demo/UI availability (real screenshots vs. none yet), and integrations
      — within the 3-questions-per-round budget, across as many rounds as
      needed.
- [ ] Surfaces product status (beta) as a fact to state honestly on the page
      rather than glossing over it or inflating it to "generally available".
- [ ] Does not invent a pricing model, usage numbers, integration list, or
      accuracy/autonomy claim beyond what beta status supports.
- [ ] `brief.access_model` gets recorded once known; `brief.primary_action`
      is recorded as an object (`type`, `label`, `destination_env`,
      `attribution`), not a bare string.
- [ ] Product-specific modules are enabled/considered as relevant
      (`product_demo`, `integrations`, `pricing` if applicable,
      `security_trust`) rather than only the service defaults
      (`lead_form`, `cases`).
- [ ] At the `brief` approval gate, an event plan is proposed (e.g.
      `page_view`, `cta_click`, `signup_start` or `waitlist_submit` or
      `bot_handoff`) per `references/site-profiles.md`'s default-events row —
      this should happen before or at the brief gate, not deferred silently
      to `qa` with no earlier mention.
- [ ] Later copy work (if the eval continues that far) does not present a
      mockup as a real screenshot without labeling it as an illustration.

## Failure signals

- The agent treats this as a service site and never asks about access
  model, demo availability, or integrations.
- A concrete price, trial length, integration name, or usage claim appears
  that the user never supplied.
- `primary_action` is recorded as a plain string instead of the schema-v2
  action object.
- No mention of an event/analytics plan anywhere before or at the `qa`
  phase.
- The beta/product status is stated as GA or otherwise oversold.
