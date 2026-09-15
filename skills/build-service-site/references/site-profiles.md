# Site profiles

## Contents

1. Choose the profile
2. Differences by phase
3. Primary action adapters
4. State schema migration

## Choose the profile

Set `project.site_type` before the brief gate:

- `service`: the visitor buys expertise, delivery, or a relationship — experts, consultants, agencies, studios, local businesses, personal brands.
- `product`: the visitor adopts a product they will use themselves — SaaS, AI tools, apps, bots, APIs, digital products.

Infer the profile from the request and supplied materials. Ask one question only when both profiles fit, for example a productized service or an agency launching a tool. Record hybrids as the profile that owns the primary action and list the other side's sections as modules.

The shared workflow, gates, privacy boundary, QA, and deployment rules apply to both profiles. This file lists only what changes.

## Differences by phase

| Phase | `service` | `product` |
|---|---|---|
| Discovery | Offer, packages, buying context, qualification, delivery process | Access model, time-to-value, product status (beta/GA), demo and UI availability, integrations, data handling, pricing |
| Research | Positioning, proof, packages, process, lead forms | Pricing and trial model, onboarding promise, integrations, hero product treatment, alternatives including manual work and hiring an agency |
| Proof types | Cases, testimonials, credentials, client logos, photos | Real UI, demo video, usage or customer counts, integrations, security and data practices, changelog, founder credibility |
| Copy sections | Problem, method, cases, services/packages, process, fit, FAQ, form | How it works, product demo/UI, use cases, integrations, pricing, security and data, comparison, FAQ, access CTA |
| Design axes | Imagery, portraits, case presentation | Product treatment: real UI, stylized UI, video loop, interactive demo, abstract visualization |
| Modules | `lead_form`, `cases`, `faq`, `crm` | `pricing`, `product_demo`, `integrations`, `security_trust`, `comparison`, `waitlist` |
| Default events | `cta_click`, `lead_submit` | `cta_click`, `signup_start` or `waitlist_submit` or `bot_handoff`, `pricing_view`, `demo_play` |
| Extra QA | Form delivery and qualification fields | Media weight of demo assets, pricing accuracy, external handoff attribution, legal pages for data collection |

Both profiles may use `faq`, `legal_pages`, `analytics`, and `localization`.

Product-specific honesty rules:

- do not present a mockup as a real screenshot; label illustrations or use real UI;
- do not overstate AI autonomy, accuracy, or supported platforms;
- state product status (waitlist, beta, generally available) where it affects the promise;
- keep pricing and trial terms identical everywhere they appear.

## Primary action adapters

Record `brief.primary_action` and `brief.secondary_action` as objects. The CTA label must describe what happens after the click.

| `type` | Next step for the visitor | Build needs | Attribution |
|---|---|---|---|
| `form` | Sends a request and waits for a reply | Form endpoint, validation, success/failure states, spam protection | UTM fields stored with the lead |
| `booking` | Picks a time slot | Embedded or linked scheduler | UTM passed to the scheduler when supported |
| `signup` | Creates an account in the product | Link to the app domain | UTM query forwarded to the app |
| `waitlist` | Leaves contact details for access later | Storage, consent, confirmation message | UTM stored with the entry |
| `bot_deeplink` | Opens a messenger bot | Deep link with a start parameter | Short start-parameter code mapped to UTM |
| `checkout` | Pays | Payment provider, legal terms, receipt flow | UTM or client reference forwarded |
| `external` | Leaves for another site | Outbound link | UTM appended when the destination accepts it |

Store destinations as environment variable names in `destination_env`, never as private URLs or tokens. Set `attribution` to `utm`, `start_param`, or `none`.

A static site cannot process private form data itself. When the action needs private server processing, record the choice in architecture: an existing endpoint, a third-party form backend, a messenger handoff, or the optional Node runtime.

## State schema migration

`schema_version: 2` adds `project.site_type`, action objects, `brief.access_model`, `brief.content_owners`, `content.copy_brief_path`, design source and token fields, product modules, `analytics`, `deployment.runtime`, `qa`, `integrations`, and `approvals.acceptance`.

When resuming a version 1 state:

1. keep every existing decision and approval;
2. set `site_type: service` unless project evidence clearly shows a product;
3. convert `primary_cta` and `secondary_cta` strings into action objects with the string as `label` and an empty `type` recorded in `open_questions`;
4. convert the singular content owner, if any, into `content_owners`;
5. add missing sections with template defaults; set `design.source` to `existing` when a site already exists, otherwise `undecided`;
6. set `schema_version: 2` and run `scripts/validate-config.sh`.

Report the migration in the next compact update. Do not re-open approved gates because of the migration alone.
