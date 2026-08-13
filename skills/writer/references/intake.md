# Adaptive Intake

Run the intake before drafting. Extract known answers first, ask only for material gaps, and continue as soon as the brief is usable.

## Extract before asking

Inspect the full conversation, supplied copy, files, links, prior decisions, constraints, and approved facts. Fill an internal brief from explicit information. Treat an inference as an assumption, not as a user-provided fact.

Never ask the user to repeat:

- the requested deliverable or channel;
- facts already stated in the current conversation;
- preferences established for this task;
- content available in a supplied source that can be inspected safely.

If the user says `не знаю`, `предложи сам`, or equivalent, offer a neutral recommendation or two to three concrete options. Do not disguise a proposal as a confirmed fact.

## Select intake depth

Honor an explicit depth:

- `quick`: minimize friction and ask only for blocking information;
- `brief`: complete the required brief before drafting;
- `audit`: inspect existing copy and report findings before creating new copy.

When no depth is specified:

- use `audit` for review-only requests;
- use `brief` for new sales pages, offers, ads, email sequences, or materially commercial rewrites;
- use `quick` for ordinary content and small rewrites when enough context is available;
- upgrade to `brief` for regulated, high-stakes, strategically ambiguous, or evidence-sensitive work.

Do not interpret `audit` as permission to rewrite. Rewrite only when the user asks for a revision or new draft.

## Decide whether a gap is material

Treat a missing answer as material when it could change the audience, central message, promise, offer, CTA, factual accuracy, format, or compliance risk.

Do not block drafting for a preference that can be handled conservatively, such as an unspecified exact length for an ordinary Telegram post. State an assumption only when the user benefits from seeing it.

## Run `quick`

1. Fill the brief from available context.
2. If the brief is usable, draft immediately.
3. Otherwise ask one compact batch of at most three questions covering only blocking gaps.
4. After the answer, continue without another confirmation unless a material contradiction appears.

Do not produce a speculative draft in the same response as blocking questions.

## Run `brief`

1. Fill all known fields before asking anything.
2. Ask unanswered required fields in one compact, numbered batch. Ask no more than seven questions in one turn; combine closely related fields.
3. Continue with a second batch only when the answers expose new material gaps.
4. Build a compact internal brief from the answers.
5. Confirm the brief only when:
   - multiple plausible audiences, offers, promises, or CTAs remain;
   - supplied facts conflict;
   - regulated or high-stakes claims remain unresolved;
   - the user explicitly asks to approve strategy first.
6. Otherwise begin drafting immediately after receiving enough answers.

Let the user answer `нет`, `не знаю`, or `не определено`. Adapt the strategy instead of forcing invented certainty.

## Ask for content inputs

Establish these required fields:

1. `Subject`: what happened, changed, was learned, or should be explained.
2. `Grounding`: concrete events, details, examples, numbers, quotations, or limitations that may be used.
3. `Reader`: who should care and what they already know.
4. `Value`: what the reader should understand, try, feel, or discuss.
5. `Response`: conversation, documentation, authority, traffic, announcement, or another intended result.
6. `Delivery`: channel, approximate format, and constraints when they matter.

For social content, identify `telegram`, `instagram`, `threads`, or `x`. For Instagram, identify caption, carousel, Reel caption, or Story sequence when it materially changes the result. For cross-posting, identify the canonical source, target channels, and whether the user wants `verbatim`, `adapted`, or `teaser`; infer these when obvious.

For `learn-from-edits`, require a reliably identified before/after pair. Ask which version is the AI draft only when filenames and context do not establish it. Do not request a questionnaire about the article again.

Ask about the desired emotion, hook, or ending only when it materially affects the piece. Do not demand a personal story for a non-personal explainer.

## Ask for sales inputs

Establish these required fields:

1. `Product and offer`: what is sold, delivered, excluded, priced, and conditioned.
2. `Audience and situation`: who buys, what is happening now, and which alternatives exist.
3. `Problem and desired outcome`: what matters and which result may be promised honestly.
4. `Mechanism and difference`: why the solution should work and why choose it over alternatives.
5. `Proof`: cases, data, demonstrations, reviews, credentials, process evidence, or an explicit statement that outcome proof is unavailable.
6. `Objections`: risk, trust, effort, timing, price, and switching friction that actually matter.
7. `Context and action`: asset type, traffic or funnel position, and the single next step.

Ask for awareness level only when it cannot be inferred from traffic and context. Ask for price only when it belongs in the asset or changes the offer. Never fill a missing result, deadline, testimonial, guarantee, scarcity, or authority claim by inference.

## Run `audit`

Require the source copy or an inspectable source plus enough context to identify the intended reader and action. Ask for whichever of those is missing.

Then return the review format from [quality-checks.md](quality-checks.md). Separate:

- strategic mismatch;
- voice mismatch;
- structural weakness;
- unsupported or risky claims;
- mechanical errors.

If the user also requests a rewrite, finish the audit first, then use the resolved brief to rewrite.

## Hand off to drafting

When questions are required, return only:

1. one short sentence explaining what must be clarified;
2. the numbered questions;
3. an optional note that `не знаю` is an acceptable answer.

After the answers arrive, do not repeat the question list. Draft the requested asset, or show the brief first only when confirmation is required.
