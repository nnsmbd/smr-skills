# Current `smr-web` publication contract

Inspected on 2026-09-11 from `nnsmbd/smr-web@64b767a` (case release `bf29443`). `lib/cases.ts` owns the schema; `content/cases/<slug>.json` is an agreed seed; `data/cases.json` (or `BYSMR_DATA_DIR`) is the runtime store that admin edits write to.

## Public record

```json
{
  "slug": "lowercase-hyphenated-id",
  "title": "string",
  "niche": "string",
  "period": "string",
  "metrics": [{ "value": "string", "label": "string", "isPrimary": true }],
  "summary": "string",
  "fullStory": { "task": "string", "approach": "string", "result": "string" },
  "article": {
    "heading": "string",
    "result": "string",
    "highlight": "string",
    "note": "string (optional)",
    "sections": [
      {
        "title": "string",
        "paragraphs": ["string"],
        "showMetrics": true,
        "screenshot": { "src": "/cases/... or https://…", "title": "string", "description": "string" }
      }
    ]
  }
}
```

`article` is optional; `fullStory` is **required for every case**, including an article case. Limits: title ≤220; niche ≤120; period ≤120; summary ≤500; metric value/label ≤80; 1–12 metrics with exactly one `isPrimary`; `article.heading`/`result`/`highlight`/section title ≤220; `note` ≤500; 1–20 sections; 1–30 non-empty paragraphs per section; `screenshot.src` must be a root-relative `/…` path or an `https://` URL; `screenshot.description` ≤1000. A slug uses lowercase Latin letters, digits, and single hyphens.

## How each field is rendered

| Field | Where it appears |
| --- | --- |
| `title` | browser tab, `/cases` card, home preview card. Must read on its own, away from the article. |
| `niche` | card label, article breadcrumb, article eyebrow. |
| `period` | legacy detail page only. An article case never displays it, but it is still required and still must be truthful. |
| `summary` | card text and the article intro paragraph under the H1. |
| `metrics` | card primary metric, the stats block under the article hero, and any section with `showMetrics`. |
| `fullStory.task/approach/result` | `/cases` card preview lines (`Задача · / Действие · / Итог ·`), home preview, and the whole detail page when `article` is absent. |
| `article.heading` + `result` + `highlight` | the H1: `heading`, line break, then `result` with `highlight` emphasized. |
| `article.sections[].paragraphs` | one `<p>` each; `**bold**` is the only inline markup the renderer understands. |
| `article.sections[].showMetrics` | repeats the metrics block after that section's first paragraph. |
| `article.sections[].screenshot` | a captioned image slot; a missing file degrades to a placeholder. |
| `article.note` | one small line at the end of the last section. |

Because `fullStory` drives the cards, write it as a compressed projection of the article — three short, self-contained lines — not as a second version of the story. `article` is the single narrative source of truth for a full case: derive `fullStory` (`задача → действие → итог`) from it and regenerate it whenever the article changes. Never maintain the two as independently edited narratives.

## Publication mechanics

- The admin editor (`/admin/cases`) edits heading fields, section titles, paragraphs, `showMetrics`, screenshots, `note`, and metrics. It **cannot add or remove sections**: the section set is fixed at publication time, so publish the structure the case actually needs.
- `POST /api/admin/cases` validates with the same schema and revalidates the public, demo, and index paths. `DEFAULT_CASES` imports seed files explicitly, so adding a new `content/cases/<slug>.json` without a code change publishes nothing on its own.
- **Runtime beats seed.** A published case keeps living in the runtime store and normal deploys do not overwrite it. Before updating an existing case, read its current public state (admin API or the live page) and treat that as the base; `content/cases/<slug>.json` may already be behind the owner's later edits. Never re-publish a seed over a diverged runtime record without showing the difference.

## Implications for the record

- This is a public projection, not a canonical record. Sources, privacy states, raw metrics, calculations, conflicts, attribution, and excluded modules stay in the working record.
- Select at most 12 metrics deliberately, and ask whether a business-level metric the owner can stand behind (revenue, ROMI, orders) belongs next to the platform metrics. The primary metric is a presentation decision, not a guarantee of business impact.
- There is still no place for a custom CTA, evidence gallery, timeline, quote, or attribution block. A material limitation goes into `article.note` or a section paragraph when it remains accurate and readable; otherwise request a separately approved `smr-web` extension before publishing.
- Existing seed figures are historical content, not verified evidence. A restored case starts with those figures as `USER_CLAIM` or `UNKNOWN` until a source verifies them.
- Site-wide editorial rules from `docs/cases.md`: use the niche or the products instead of project names — in the text, the slug, metadata, and screenshots — and say «таргетированная реклама» rather than naming the ad platform. These are privacy and editorial rules, not schema validation: see [public narrative](public-narrative.md).
