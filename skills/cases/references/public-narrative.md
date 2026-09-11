# Public narrative

Read this before turning a verified record into a public case. Verification decides what may be said; this file decides what is worth saying.

Guiding principle: **what the skill must know is not what the reader needs to see.** The canonical record keeps the full evidence structure, conflicts, calculations, scopes, attribution, technical limitations, and private notes. The public case carries only context, work, decisions, results, and the limitations that materially change their meaning.

## Default structure for `standard`

Preferred default, mapped one-to-one onto `article.sections`:

1. **Что было на старте** — business, product, and the state of the channel before the work.
2. **Запрос** — what the client asked for, including the starting benchmark if there was one.
3. **Что сделали** — the real scope of the service.
4. **Что получилось лучше** — the strongest directions selected out of that work.
5. **Что сработало плохо** — how weak hypotheses were identified and handled.
6. **Конечный результат** — the defensible outcome, usually with `showMetrics`.

`article` carries this narrative; the required `fullStory` is only its compressed card projection (`задача → действие → итог`), regenerated from the article rather than written separately.

This is a default, not a constraint. `deep` and `custom` may reorder, split, or add sections when the project genuinely needs it (timeline, hypotheses, attribution, lessons). Adapt `standard` only when the context requires it; otherwise keep it compact. Remember that sections cannot be added later in the admin editor.

## `Что сделали` ≠ `Что получилось лучше`

These were blended in the first production case. Keep them separate.

**Что сделали** answers one reader question: *what was actually done in this project?* After reading it, the reader should understand the scope of the service. Depending on the case that can include business and audience analysis, diagnostics, advertising strategy, Pixel/events/tracking, catalog work, campaign structure, several acquisition strategies, segmentation, retargeting, creative work, content work, landing/funnel, work with SMM or sales, analytics, optimization, budget reallocation, and reporting.

Use that list to interview and to check coverage, never as a checklist to publish. Only confirmed actions go in, grouped by meaning, with the reasoning shown where the reasoning matters.

**Что получилось лучше** is a selection from that work: the strongest approaches, mechanics, segments, creative directions, and results — included only when they help the story.

**Что сработало плохо** shows decision quality, not a warehouse of weak campaigns: some hypotheses were weak, some approaches did not survive the economics, they were cut, switched off, or rebuilt, and budget moved to stronger directions. Name a specific brand, campaign, segment, or number only when it makes the decision understandable.

## Narrative Value Gate

Before moving any detail from the canonical record into the public case, ask: **what does this give the reader?** Keep it only if it does at least one of:

1. shows the value of the work done;
2. explains an important decision;
3. proves a material result;
4. helps a prospective client understand the approach.

If it does none of them, it stays internal — being technically verified is not a reason to publish.

Internal by default: campaign names and IDs, ad set and account IDs, ResultSpec technical fields, API limitations, account scopes, Evidence Package details, small CTR/CPC/CPM readings, micro-results of individual launches, and platform-specific caveats. Site-wide privacy rules also apply: niche or products instead of project names — including slug, metadata, and screenshots — and «таргетированная реклама» instead of the platform name.

The validator blocks only the deterministic leaks (platform object IDs, internal field names). Everything else in this section is a judgment call that belongs to this gate.

## Do not hide a strong result behind verification language

If a result is confirmed, internally consistent, correctly scoped, and free of unresolved conflicts, state it plainly. Do not turn it into "вроде получили хороший результат, но есть множество технических нюансов". Technical nuance stays internal unless its absence would mislead the reader — then the caveat is mandatory and short.

## Compactness

Empirically, the owner's post-publication edits removed explanation, not facts. Apply that before publishing:

- one idea per paragraph, one to three sentences;
- no explanatory tail after an action when the value is already clear from context or from the next result — avoid turning every action into `сделали X → это позволило Y` when `Y` adds nothing;
- no closing paragraph that restates the numbers already shown;
- `standard` stays compact; reasoning, timeline, hypotheses, failed tests, detailed attribution, and deep evidence belong to `deep` or `custom`, or stay in the record.

## Narrator

SMR is a personal service, not an agency. Use `я` when Samir did the work himself; use `мы` only where the work was genuinely joint — with SMM, with the client, with a sales team. Do not flatten a personal case into faceless agency prose.

Avoid, unless the phrase is actually earned: «комплексный подход», «стратегический подход позволил», «выстроили механику», «сформировали систему», «уникальная стратегия», «революционный», «взрывной рост», «вывели на новый уровень», and similar agency or AI clichés.

## Communication gate before publication

Run this next to the factual check, not instead of it:

- is the real scope of the service visible?
- are actions separated from results?
- is there a clear story rather than a list of campaign metrics?
- does the case show the specialist's value?
- does every public number do a job?
- is the text overloaded with technical caveats?
- was an important limitation dropped to make the story prettier?
- is a `standard` case too long?

## Handoff to `writer`

`cases` owns facts, evidence, source scope, metrics, calculations, attribution, causal strength, privacy, the selected structure, what may be claimed, and narrative meaning. `writer` owns wording, Russian, clarity, rhythm, compression, TOV, removal of agency boilerplate, and naturalness.

Send `writer` a compact editorial packet — never a raw Meta dump: audience, case type, depth, approved structure, locked facts, locked metrics, allowed interpretations, forbidden or unsupported claims, privacy rules, material caveats, section notes, and the current draft if there is one. See [writer/references/case-study.md](../../writer/references/case-study.md) for the receiving side.

`writer` returns an editorial version only. Run the factual and publication review again on what comes back: locked facts and metrics unchanged, causal strength unchanged, no caveat dropped, no invented action or proof. `writer` never becomes the source of truth, and it is not a hard dependency — if it is unavailable, finish the draft here using this file.

## After a published case

Run a short retrospective: the corrections the user actually made, questions the skill asked needlessly, questions it failed to ask, parts of the draft that had to be rewritten, technical details that reached the public text without value, TOV failures, weak verification, and manual steps that had to be repeated.

Split the findings into **generalizable** (fix the skill) and **case-specific** (record in the case, not in the skill). Fix a repeatable problem; do not encode every user comment as a new rule, and do not add a rule that an existing one already covers.
