# Measurement and events

## Contents

1. Event plan
2. Provider selection
3. Consent by region
4. UTM policy and adapter attribution
5. Verifying events at QA
6. Experiments backlog at handoff
7. Setting `analytics.verified`

## Event plan

Approve the event plan at the `brief` gate, alongside audience, offer, and CTA. Do not defer it to QA.

Standard event names, extended per project:

| Event | When it fires | Required properties |
|---|---|---|
| `page_view` | Each page render | — |
| `cta_click` | Any primary or secondary CTA click | `location`, `action_type` (matches `brief.primary_action.type` / `secondary_action.type`) |
| `lead_submit` | Form adapter completes successfully | — |
| `signup_start` | Signup adapter is opened or submitted | — |
| `waitlist_submit` | Waitlist adapter completes successfully | — |
| `bot_handoff` | Bot deep-link adapter is opened | — |
| `pricing_view` | Pricing section enters view (product) | — |
| `demo_play` | Product demo or video is started (product) | — |
| `scroll_depth` | Optional; fixed thresholds (e.g. 25/50/75/100%) | `threshold` |

Include only the events that match the approved CTA adapters and modules; do not add events for modules the project does not use. Record the approved list in `analytics.events` as an array of event names (extend with a project-specific superset only when the brief calls for it).

## Provider selection

Choose one primary provider from project requirements, not habit:

- **Privacy-friendly analytics** (e.g. cookieless, aggregate-only tools): default when the project has no advertising attribution requirement and wants to minimize consent friction.
- **GA4**: default when the user already standardizes on Google's ecosystem or needs its audience/funnel tooling.
- **Yandex Metrica**: when the audience or stakeholder is in a market where it is the standard.
- **Meta Pixel**, optionally with **Conversions API (CAPI)**: when paid Meta acquisition is in scope. Client-side Pixel only needs the static site. Server-side CAPI requires a server runtime — see `references/stack-selection.md` for when that pulls in `vps_node`. Do not select CAPI while the deployment stays `vps_static`; either add the Node runtime or drop CAPI to a later phase.

Record the choice in `analytics.provider`. Multiple providers are allowed only when the brief explicitly justifies the added consent and maintenance cost.

## Consent by region

Read `brief.regions` and any regulatory notes from discovery. Determine whether a consent banner or cookie notice is required before analytics or ad pixels fire, and whether it must be opt-in (block by default) or opt-out (fire by default, allow refusal). Record the outcome in `analytics.consent_required` (`required`, `not_required`, or `unknown` until decided) and reflect it in the `legal_pages` module and cookie notice content. Do not hardcode a single region's rule as universal; treat this as a brief-time decision, not a launch-time afterthought.

## UTM policy and adapter attribution

Record `analytics.utm_policy` at the brief gate: which UTM parameters are accepted (typically `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`), how long they persist across the session, and whether they attach to stored leads.

Attribution carries through each CTA adapter differently (see `references/site-profiles.md` for the full adapter table):

- `form` / `waitlist`: store the captured UTM parameters alongside the submission.
- `signup` / `external`: forward the UTM query string to the destination when it accepts one.
- `bot_deeplink`: messenger start parameters are short codes, not full query strings. Maintain a mapping table from short `start_param` code to the originating UTM combination (in the project's own state, not in the skill), and log the code at `bot_handoff` so the bot side can resolve attribution after the fact.

Set `brief.primary_action.attribution` / `secondary_action.attribution` to `utm`, `start_param`, or `none` to match.

## Verifying events at QA

Verify the approved event plan actually fires before the `qa` gate closes. `scripts/qa/events-check.mjs` (bundled separately) clicks each CTA in a browser, captures network requests or `dataLayer`/provider calls, and diffs the result against `analytics.events`. Run it after the provider is installed and before requesting the `pre_production` or `deploy` approval. Do not mark `analytics.verified: true` from a manual glance at devtools alone when the script is available; prefer the script output as evidence.

If the script is not yet available in a given project, verify manually per event (trigger the action, confirm the network call or provider debug view fires with the right properties) and record that the check was manual in the QA notes.

## Experiments backlog at handoff

At handoff, create a hypothesis backlog file (path recorded in `analytics.experiments_path`, e.g. `docs/experiments.md` in the target project) so post-launch experiment ideas have a home. This closes the promise made in `references/competitor-research.md` without building experiment infrastructure.

Entry template:

```
## <short title>

- Hypothesis: <what we believe and why, tied to observed evidence or a conversion gap>
- Metric: <the event or ratio that would move, e.g. cta_click -> lead_submit rate>
- Expected change: <direction and rough magnitude, or "unknown, exploratory">
- Priority: <high | medium | low>
```

Seed the backlog with ideas surfaced during research and copy review; do not fabricate data-backed claims that were never observed.

This skill does not build or operate A/B testing, feature flags, or experiment-assignment infrastructure. The backlog is a prioritized idea list for the user or a separate tool to execute later.

## Setting `analytics.verified`

Set `analytics.verified: true` only after the events-check script (or an equivalent manual pass) confirms every entry in `analytics.events` fires with its required properties in a production-like build. Keep it `false` while the provider is still being wired up or while consent gating is unresolved.
