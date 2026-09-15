# Conversion copy workflow

## Contents

1. Inputs
2. Claim ledger
3. Message hierarchy
4. Page narrative
5. CTA wording
6. Legal checklist
7. Copy delegation
8. Copy gate

## Inputs

Use customer language, offer details, proof, objections, sales conversations, analytics, and reviewed competitor patterns. Mark missing source material instead of filling it with invented claims.

Write for the audience's level of understanding. Replace internal terminology with the language used to describe the problem, decision, risk, and outcome.

Read `site-profiles.md` first and note `project.site_type`. It holds the per-profile tables (discovery inputs, proof types, section sets, CTA adapters) this file builds on; do not duplicate those tables here.

## Claim ledger

Create a ledger before production copy:

| Claim | Evidence | Allowed wording | Location | Status |
|---|---|---|---|---|
| Specific result | Case record | Scope and timeframe attached | Case | verified/pending |
| Experience count | Source list | Exact or conservative wording | About | verified/pending |
| Delivery timeframe | Process history | State conditions, not outcome guarantee | Hero/process | verified/pending |

Product profile (`site_type: product`) adds these rows:

| Claim | Evidence | Allowed wording | Location | Status |
|---|---|---|---|---|
| AI/automation capability | Feature spec or test evidence | State scope and known limits; never claim full autonomy or unverified accuracy | How it works/product demo | verified/pending |
| Integration | Verified integration list | Name only integrations that are live today, not roadmapped | Integrations | verified/pending |
| Pricing/trial terms | Pricing source of record | Exact figures and conditions, identical wherever pricing appears | Pricing/hero/footer | verified/pending |
| Data handling | Security/privacy documentation | State only practices actually implemented, not intended | Security & data handling | verified/pending |
| Product status | Release state (waitlist/beta/GA) | State plainly wherever it changes the promise | Hero/access CTA | verified/pending |

Rules:

- never invent clients, metrics, testimonials, guarantees, certifications, scarcity, legal details, or media mentions;
- tie exceptional results to the relevant case and context;
- distinguish service commitments from business-result promises;
- remove a claim when evidence cannot be published;
- keep private evidence private and use safe public wording;
- never overstate AI autonomy, accuracy, or supported platforms — state the verified scope instead;
- never present a mockup or illustration as a real product screenshot; label it or use real UI;
- keep pricing and trial terms identical in every place they appear on the site.

## Message hierarchy

Resolve in this order:

1. Audience and buying situation.
2. Problem and consequence.
3. Offer and mechanism.
4. Difference from alternatives.
5. Proof.
6. Risk reduction and objection handling.
7. Primary next action.

The hero should communicate who it is for, what changes, why this option is credible, and what to do next without requiring the next section.

## Page narrative

Choose sections from the content, not a fixed template. Common roles include:

- hero and primary CTA;
- immediate proof or trust;
- problem recognition;
- method or mechanism;
- cases and evidence;
- offer, services, or packages;
- process and expectations;
- fit/not-fit criteria;
- objections and FAQ;
- final CTA and form;
- legal and contact details.

Product profile (`site_type: product`) adds these section roles: how it works, product demo/UI, use cases, integrations, pricing, security & data handling, comparison, and changelog/roadmap (optional).

Use intermediate CTAs where a reader has received enough information to act. Keep the main action consistent. Ask only the form fields needed for response or qualification, and explain any unusual field.

## CTA wording

Look up the visitor's next step in the primary/secondary action adapter table in `site-profiles.md` (`form`, `booking`, `signup`, `waitlist`, `bot_deeplink`, `checkout`, `external`). The CTA label must state what happens after the click, not an internal action name — "Start your free trial" rather than "Submit", "Get notified when we launch" rather than "Join".

Add microcopy under the CTA when the next step is not self-evident from the label:

- `waitlist`: what happens next and roughly when, plus a no-spam assurance;
- `bot_deeplink`: that the click opens a messenger app or bot, so leaving the site is expected;
- `signup`: trial length, whether a card is required, and what access is granted immediately;
- `checkout`: price and currency, matching the pricing section exactly;
- `booking`: call duration and format;
- `form`: expected response time;
- `external`: a brief description of the destination.

## Legal checklist

Add the page, not the wording. Structure only — the user or a legal owner supplies actual legal text; never draft it as ready copy.

- Privacy notice: required whenever the site collects personal data (forms, waitlist, signup, tracking that stores identifiers).
- Terms of service: required whenever the site grants product access or takes payment (signup, trial, checkout).
- Cookie/consent notice: required when tracking needs consent in the visitor's region.

Link required pages from the footer and from the CTA that triggers the need (signup, checkout, waitlist form). See `assets/design-handoff/legal-pages.md` for the placeholder structure to hand to design.

## Copy delegation

Check whether a compatible `writer` skill is installed before drafting copy from scratch.

1. If installed, and the project's language and voice fit what writer covers, prepare a copy brief packet from `assets/copy-brief.md`.
2. Save the completed packet at the path recorded in `content.copy_brief_path`.
3. Hand the packet to writer in sales mode. The packet is an already-answered intake: writer should not re-run its sales question gate over facts the packet already states (see writer's `references/intake.md`, "Accept a brief supplied by another skill"). Ask writer only about what the packet leaves open.
4. When writer returns a draft, still run the copy gate below over it — delegating wording never skips the gate.
5. Record `integrations.writer_available` (`true`/`false`) in project state.

This is never a hard dependency. If writer is absent, or the language/voice does not fit, write the copy directly using this file's workflow. Never report writer as used unless it was actually invoked and returned a draft.

Ownership split: build-service-site always owns message hierarchy, section map, claim ledger, and the copy gate. writer, when used, owns sentence-level wording inside that map — delegation does not move ledger or CTA-adapter decisions into writer's scope.

## Copy gate

Before approval verify:

- every claim exists in the ledger;
- headings form a coherent story when read alone;
- CTA wording describes the real next step;
- objections are answered without defensive over-explanation;
- desktop and mobile lengths are realistic;
- placeholders and internal notes are removed;
- the user approved the exact production copy or delegated final wording;
- when writer produced the draft, this gate was still run before approval.

Store approved copy in a dedicated document and reference its path from project state. Do not let visual exploration silently rewrite it.
