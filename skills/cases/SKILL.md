---
name: cases
description: Build, restore, verify, or publish an SMR performance-marketing case study from Meta Ads, CRM, Shopify, spreadsheets, screenshots, and user evidence. Use for SMR / bysmr.uz case studies, adaptive case briefs, canonical case records, source conflicts, and publishing a verified case to smr-web; not for generic marketing copy without a case-evidence workflow.
---

# Cases

Create a factual case record first, then make a deliberately smaller public case from it. The public page is a communication choice; it is never the source of truth.

## Start and resume

1. Identify the operation from the request: `new`, `restore`, `import`, `configure`, `interview`, `verify`, `draft`, `review`, `publish`, or `resume`. Natural-language requests map to the same operations.
2. Inspect the supplied materials and relevant project before asking anything. For `smr-web`, read [the publication contract](references/smr-web-contract.md) before proposing a public result. When Meta Ads is an available, requested, or likely evidence source, read [the Meta Ads integration contract](references/meta-ads-integration.md).
3. Find an existing local record before starting another one. Store working records in `.smr-case-studies/<case-id>/case.json` by default and add that directory to the target project's ignored local files. Keep raw exports and screenshots outside version control unless the user explicitly approves their publication.
4. State the known facts, sources found, unresolved conflicts, current phase, and the single most useful next action. Resume from the earliest incomplete phase; do not restart the brief.

## Configure the case

Ask for a format only when it is not already clear. Offer `short`, `standard`, `deep`, and `custom`; use `standard` when the user delegates the choice. Presets are starting points, not restrictions.

Read [modules and presets](references/modules-and-presets.md) when selecting, changing, or omitting sections. Record every module as `included`, `excluded`, `pending`, or `not_applicable`, with its reason. Treat requests such as “do not ask about sales” as an exclusion of that interview topic, not as missing data.

The user can change the structure, privacy, selected metrics, questions, or depth at any time. Preserve that decision in `case_config`; apply it to the next interview and draft without asking the entire brief again.

## Gather and normalize evidence

Read [the canonical data model](references/canonical-record.md) before creating or editing a record.

- Discover relevant sources before interviewing. When Meta Ads is an available or likely source and `case_config.sources.meta_ads` permits it, use the installed `meta-ads` skill as the authoritative acquisition and interpretation layer before asking for advertising metrics. If it is unavailable, record that source status and continue without a direct Meta integration or alternate transport.
- Normalize acquired evidence into the canonical record, not into the public case. For Meta, keep its Evidence Package and any raw artifacts private and local, then import only traceable source records, metrics, observations, and limitations.
- Normalize units, currencies, periods, labels, and source scopes. Keep raw source references intact.
- Classify each material statement as `FACT`, `OBSERVATION`, `CALCULATED`, `INFERENCE`, `USER_CLAIM`, or `UNKNOWN`. A calculation records its formula and input metric IDs.
- Ask only for high-value missing information that an available source cannot answer. Ask in small, adaptive batches and give a direct skip path.
- Store an unanswered field as `unknown`, `unavailable`, `not_applicable`, `intentionally_omitted`, or `private`. Do not fill it from plausibility.
- When two sources disagree on a material metric, register an `unresolved_conflict` and stop that metric from becoming a public fact. Ask the user to resolve it or publish both scopes with an attribution note.

## Build the narrative and draft

For each substantive public claim, retain a trace to its canonical evidence. Prefer a decision chain where it is supported: observation → interpretation → decision → action → result. Interpretations are not evidence of causality; write the confidence and limitation that the evidence supports.

Read [interview, verification, and drafting](references/interview-verification-drafting.md) before interviewing, checking, drafting, or reviewing. The style is specific, economical, and honest: show decisions and evidence rather than agency boilerplate or superlatives.

Read [public narrative](references/public-narrative.md) before writing the public case. Verification decides what may be said; that file decides what is worth saying: the default `standard` structure, the separation of `что сделали` from `что получилось лучше` and `что сработало плохо`, the Narrative Value Gate, the rule that a confirmed result is stated plainly, compactness, and the narrator choice between `я` and `мы`.

When an editorial pass would help, hand `writer` the compact editorial packet described there — approved structure, locked facts and metrics, allowed interpretations, forbidden claims, privacy rules, material caveats, section notes, and the current draft. `writer` returns wording only; re-run the factual and publication review on what comes back. `cases` stays the source of truth, and `writer` is not a required dependency.

If an enabled module lacks substance, offer: collect evidence, reduce it to a short factual note, or omit it. Never write filler to preserve a preset.

## Publish

Publication is a separate approval gate. Before changing a site:

1. resolve or explicitly annotate all public conflicts and attribution gaps;
2. present the public projection, selected metrics, private omissions, and unverified claims for confirmation;
3. run the communication gate in [public narrative](references/public-narrative.md) next to the factual check: is the real scope of work visible, are actions separated from results, does every public number do a job, is the text overloaded with caveats, was a material limitation dropped, is a `standard` case too long;
4. validate the canonical record and projection with `scripts/validate-case-record.mjs`;
5. only after approval, update the target repository using its established data contract and run its relevant checks.

For the current `smr-web`, output only the public JSON shape documented in [the publication contract](references/smr-web-contract.md), including `article` for a full case and the required `fullStory` projection for cards. Do not add canonical fields or raw evidence to `data/cases.json` unless that repository is separately redesigned and approved. When updating an already published case, read its current runtime state first: admin edits are not overwritten by deploys, so the seed file in the repository may already be behind.

After a published case, run the retrospective described in [public narrative](references/public-narrative.md) and split findings into generalizable skill changes and case-specific notes.

## Bundled resources

- `assets/case.json`: a private-working-record template.
- `assets/public-case.json`: a reviewable public projection template for the current `smr-web` contract, with the default `standard` section set as an example.
- `scripts/validate-case-record.mjs`: validates record structure, evidence references, metric conflicts, and an optional public projection.
- `scripts/test-validator.mjs`: exercises the Meta source and publication guardrails without contacting Meta.
