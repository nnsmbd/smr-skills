---
name: smr-case-study
description: Build, restore, verify, or publish an SMR performance-marketing case study from Meta Ads, CRM, Shopify, spreadsheets, screenshots, and user evidence. Use for SMR / bysmr.uz case studies, adaptive case briefs, canonical case records, source conflicts, and publishing a verified case to smr-web; not for generic marketing copy without a case-evidence workflow.
---

# SMR Case Study

Create a factual case record first, then make a deliberately smaller public case from it. The public page is a communication choice; it is never the source of truth.

## Start and resume

1. Identify the operation from the request: `new`, `restore`, `import`, `configure`, `interview`, `verify`, `draft`, `review`, `publish`, or `resume`. Natural-language requests map to the same operations.
2. Inspect the supplied materials and relevant project before asking anything. For `smr-web`, read [the publication contract](references/smr-web-contract.md) before proposing a public result.
3. Find an existing local record before starting another one. Store working records in `.smr-case-studies/<case-id>/case.json` by default and add that directory to the target project's ignored local files. Keep raw exports and screenshots outside version control unless the user explicitly approves their publication.
4. State the known facts, sources found, unresolved conflicts, current phase, and the single most useful next action. Resume from the earliest incomplete phase; do not restart the brief.

## Configure the case

Ask for a format only when it is not already clear. Offer `short`, `standard`, `deep`, and `custom`; use `standard` when the user delegates the choice. Presets are starting points, not restrictions.

Read [modules and presets](references/modules-and-presets.md) when selecting, changing, or omitting sections. Record every module as `included`, `excluded`, `pending`, or `not_applicable`, with its reason. Treat requests such as “do not ask about sales” as an exclusion of that interview topic, not as missing data.

The user can change the structure, privacy, selected metrics, questions, or depth at any time. Preserve that decision in `case_config`; apply it to the next interview and draft without asking the entire brief again.

## Gather and normalize evidence

Read [the canonical data model](references/canonical-record.md) before creating or editing a record.

- Import every available source before interviewing. With Meta access, identify the account and period, retrieve reported metrics and entities, then prepare findings. Distinguish an observed sequence from a causal claim.
- Normalize units, currencies, periods, labels, and source scopes. Keep raw source references intact.
- Classify each material statement as `FACT`, `CALCULATED`, `INFERENCE`, `USER_CLAIM`, or `UNKNOWN`. A calculation records its formula and input metric IDs.
- Ask only for high-value missing information that an available source cannot answer. Ask in small, adaptive batches and give a direct skip path.
- Store an unanswered field as `unknown`, `unavailable`, `not_applicable`, `intentionally_omitted`, or `private`. Do not fill it from plausibility.
- When two sources disagree on a material metric, register an `unresolved_conflict` and stop that metric from becoming a public fact. Ask the user to resolve it or publish both scopes with an attribution note.

## Build the narrative and draft

For each substantive public claim, retain a trace to its canonical evidence. Prefer a decision chain where it is supported: observation → interpretation → decision → action → result. Interpretations are not evidence of causality; write the confidence and limitation that the evidence supports.

Read [interview, verification, and drafting](references/interview-verification-drafting.md) before interviewing, checking, drafting, or reviewing. The style is specific, economical, and honest: show decisions and evidence rather than agency boilerplate or superlatives.

If an enabled module lacks substance, offer: collect evidence, reduce it to a short factual note, or omit it. Never write filler to preserve a preset.

## Publish

Publication is a separate approval gate. Before changing a site:

1. resolve or explicitly annotate all public conflicts and attribution gaps;
2. present the public projection, selected metrics, private omissions, and unverified claims for confirmation;
3. validate the canonical record and projection with `scripts/validate-case-record.mjs`;
4. only after approval, update the target repository using its established data contract and run its relevant checks.

For the current `smr-web`, output only the public JSON shape documented in [the publication contract](references/smr-web-contract.md). Do not add canonical fields or raw evidence to `data/cases.json` unless that repository is separately redesigned and approved.

## Bundled resources

- `assets/case.json`: a private-working-record template.
- `assets/public-case.json`: a reviewable public projection template for the current `smr-web` contract.
- `scripts/validate-case-record.mjs`: validates record structure, evidence references, metric conflicts, and an optional public projection.

