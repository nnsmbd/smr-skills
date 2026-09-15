# Copy brief packet

Fill every field before handoff. A complete packet lets a compatible `writer` skill accept it as an already-answered intake (see writer's `references/intake.md`, "Accept a brief supplied by another skill") instead of re-running its sales question gate. Save the completed file at the path recorded in `content.copy_brief_path`.

Field-to-intake map, for reference only — do not fill this table in:

| This packet | Writer's sales intake field |
|---|---|
| Project, site type, offer/access model | Product and offer |
| Audience and decision context | Audience and situation, Awareness |
| Problem and desired outcome | Problem and desired outcome |
| Message hierarchy, comparison notes | Mechanism and difference |
| Claim ledger (verified rows only) | Proof |
| Objections and forbidden claims | Objections |
| Section map, primary/secondary action | Context and action |

If a field below is genuinely unknown, write `не знаю` / `unknown` rather than leaving it blank — a visible gap lets writer ask about only that gap instead of the whole questionnaire.

## Project

- Site type: `service` / `product`
- Product or service:
- Access model (product only): `waitlist` / `trial` / `freemium` / `paid` / `demo_call` / `open`

## Language and voice

- Language(s):
- Voice fit for writer (yes/no, and why):

## Audience and decision context

- Audience:
- Buying situation — what is happening right now:
- Alternatives they are weighing, including doing nothing or doing it manually:
- Awareness level (problem / solution / this product / offer):

## Problem and desired outcome

- Problem, in the audience's own words:
- Desired outcome that may be promised honestly:

## Offer

- What is delivered, priced, and excluded:
- Pricing/trial terms, verbatim — must match every place it appears on the site:
- Guarantees or bonuses (verified only):

## Message hierarchy

Resolved order for this project (see `conversion-copy.md`):

1.
2.
3.

## Section map

One row per planned section.

| Section | Role | Goal | Proof used |
|---|---|---|---|

## Claim ledger (verified only)

Copy only `verified` rows from the working claim ledger. Never hand writer a `pending` or `rejected` claim.

| Claim | Allowed wording | Location |
|---|---|---|

## Objections and forbidden claims

- Objections that actually matter (risk, trust, effort, timing, price, switching):
- Forbidden claims — never write these even if they would read well:

## Actions

- Primary action: type (`form`/`booking`/`signup`/`waitlist`/`bot_deeplink`/`checkout`/`external`), label, what happens after the click:
- Secondary action, if any — same fields:

## Length limits

- Hero headline: mobile ≤ ___ characters / desktop ≤ ___ characters
- Hero subheadline: mobile ≤ ___ characters / desktop ≤ ___ characters
- CTA label: mobile ≤ ___ characters / desktop ≤ ___ characters

## Tone constraints

-

## Open questions

List anything this packet could not resolve. Writer should ask about these only, not the fields already answered above.

-
