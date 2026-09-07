# Current `smr-web` publication contract

Inspected on 2026-09-02 from `nnsmbd/smr-web`.

`lib/cases.ts` validates the public case and `data/cases.json` is its seed and runtime data. The public record has exactly these fields:

```json
{
  "slug": "lowercase-hyphenated-id",
  "title": "string",
  "niche": "string",
  "period": "string",
  "metrics": [{ "value": "string", "label": "string", "isPrimary": true }],
  "summary": "string",
  "fullStory": { "task": "string", "approach": "string", "result": "string" }
}
```

Constraints: all text is required; `metrics` contains 1–12 entries; exactly one metric has `isPrimary: true`; a slug uses lowercase Latin letters, digits, and single hyphens. The public `/cases` index reads title, niche, summary, the primary metric, and short previews of all three story fields. The detail page renders all metrics plus the same three story fields and a fixed CTA. Admin uses the same schema through `/api/admin/cases`.

Implications:

- This is a public projection, not a canonical record. Keep sources, privacy states, raw metrics, calculations, conflicts, attribution, and optional narrative modules in the working record.
- Select at most 12 metrics deliberately. The primary metric is a presentation decision, not a guarantee of business impact.
- Current pages have no place for a custom CTA, evidence gallery, timeline, quote, or attribution block. Summarize a necessary limitation in an existing field only when it remains accurate and readable. Otherwise request a separately approved `smr-web` extension before publishing.
- Existing seed figures are historical content, not automatically verified source evidence. A restored case starts with those figures as `USER_CLAIM` or `UNKNOWN` until a source verifies them.
