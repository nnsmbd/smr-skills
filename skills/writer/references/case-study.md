# Case Study (sales subtype)

A case study is `sales` proof content, not a new top-level mode. Use this file when the request is an SMR case study or when `cases` hands over an editorial packet.

`cases` owns the facts; `writer` owns the words. Nothing here permits changing what the case claims.

## Editorial packet

`cases` should supply a compact packet — never a raw Meta dump:

| Field | What it carries |
|---|---|
| `audience` | who reads the case and what they are deciding |
| `case type` and `depth` | `short`, `standard`, `deep`, or `custom` |
| `approved structure` | the section list, already agreed with the user |
| `locked facts` | statements that must survive editing unchanged in meaning |
| `locked metrics` | numbers, units, periods, and their scope wording |
| `allowed interpretations` | what may be said about why something worked |
| `forbidden or unsupported claims` | what must not be asserted |
| `privacy rules` | names, platforms, campaigns, and screenshots that stay hidden |
| `material caveats` | limitations that must remain visible |
| `section notes` | what each section has to accomplish |
| `current draft` | the text to edit, when one exists |

If the packet is missing, ask `cases` or the user for it before writing; do not reconstruct facts from memory or from a published page.

## Intake

When the packet covers the brief, **do not run the ordinary `sales` intake**. Audience, offer, proof, mechanism, objections, and CTA are already decided upstream, and re-asking them repeats work the user has already done.

Ask only when:

- the packet contradicts itself or the conversation;
- something is missing without which the text cannot be written correctly;
- an editorial fork remains that cannot be resolved safely alone.

Ask in one compact batch, then continue.

## What `writer` may not do

Never, without explicit permission:

- change a number, or round a material metric;
- change the scope or period a metric refers to;
- strengthen causality — `после` must not become `благодаря`;
- invent an action, a proof point, a client reaction, or a result;
- change the approved structure or section order;
- delete a material caveat;
- change the meaning of an approved claim.

`writer` is an editorial layer, not an evidence layer. Return questions instead of guesses, and flag anything that looks factually wrong rather than fixing it silently.

## Voice

Use [voice-core.md](voice-core.md) as the base, plus for cases specifically: calm, concrete, natural, professional. No agency tone, no bureaucratic tone, no generic expert persona, and no attempt to make every sentence sound expert.

The text should read the way a marketer explains work to a business owner or another marketer: what was there, what was noticed, what was decided, what was done, what came out of it. Do not apply that chain mechanically to every paragraph.

SMR is a personal service. Use `я` where Samir did the work himself and `мы` only where the work was genuinely joint — with SMM, with the client, with a sales team. Do not turn a personal case into «мы провели анализ, мы разработали стратегию».

Avoid unless genuinely earned: «комплексный подход», «стратегический подход позволил», «выстроили механику», «сформировали систему», «уникальная стратегия», «революционный», «взрывной рост», «вывели на новый уровень», and the rest of the AI/agency register.

## Compression

Taken from real post-publication edits on the first case — the owner removed explanation, not facts:

- one idea per paragraph, one to three sentences;
- do not append an explanatory tail to every action when its value is already clear from context or from the result that follows; avoid a mechanical `сделали X → это позволило Y` when `Y` adds nothing new;
- no closing paragraph that merely restates the numbers already shown;
- keep a `standard` case compact — depth belongs to `deep` or to the internal record.

## Silent case-study gate

After a quick read, the reader should understand: what was there at the start, what was asked, what specifically was done, what turned out stronger, what turned out weaker, and the final result.

Then check:

- has the real scope of the service disappeared?
- has the case turned into a list of campaign metrics?
- are there details without narrative value?
- have internal verification notes leaked (campaign names or IDs, technical fields, account scopes, platform caveats, the ad platform's name)?
- are locked facts and metrics unchanged?
- is causal strength unchanged?
- has the Russian become artificially expert?
- is there agency boilerplate?
- is there a conclusion that just repeats the numbers?

## Output

Return the edited text in the approved structure, plus a short list of editorial questions or factual flags when any remain. Do not return a rationale essay, and do not present the edited version as approved: `cases` re-runs its factual and publication review afterwards.
