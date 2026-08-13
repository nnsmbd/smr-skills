# Learn From Edits

Compare a known AI draft with Samir's edited version and propose durable learning without pretending to observe inaccessible edits.

## Acquire the pair

Accept one of:

1. an AI draft in the current conversation plus the user's edited text;
2. explicit `before` and `after` files;
3. an accessible current file plus an identified prior Git revision.

If the original cannot be identified reliably, ask for it. A final text alone can become a corpus candidate but cannot support claims about what Samir changed.

## Produce the mechanical diff

When two files are available, run:

```bash
python3 scripts/diff_edits.py BEFORE AFTER --format markdown
```

The script reports hashes, line ranges, and replaced text. It does not interpret style.

## Classify each meaningful change

Use one primary class:

- `fact-correction`;
- `grammar-only`;
- `structure`;
- `relevance-cut`;
- `voice-rejection`;
- `voice-preference`;
- `channel-adaptation`;
- `position-or-meaning`;
- `formatting-only`.

Then map style-bearing changes to `lexicon`, `syntax`, `rhythm`, `structure`, or `voice-marker`.

## Decide whether it teaches the profile

- Explicit statements such as `не в моём стиле`, `убрать`, or `так не пишу` may become approved negative cues immediately.
- A user-final rewrite is strong evidence for that source and channel, but a general rule inferred from one change remains a candidate.
- Repeated independent edits can promote a candidate after user confirmation.
- Grammar corrections, factual corrections, and formatting changes do not become voice rules by default.
- A cut may mean `irrelevant here`, not `never use`; keep task-local decisions scoped.

## Return proposals

For every proposed learning, return:

```text
status → layer → scope → observed edit → proposed rule → provenance
```

Separate:

- immediate approved cues from explicit feedback;
- candidate cues requiring confirmation;
- article-specific decisions that should not update the profile;
- normalized-anchor candidates.

Do not modify durable corpus files until the user approves, except when the user has explicitly instructed the skill to add the identified rules.
