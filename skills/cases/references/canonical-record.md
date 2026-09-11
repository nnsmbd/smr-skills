# Canonical record

Use JSON for the working record: it is portable, supports deterministic validation without a new runtime dependency, and maps directly to the existing `smr-web` JSON publisher. It remains a private working artifact by default.

Start from `assets/case.json`. New fields are allowed when they are evidence-bearing and named clearly; do not overload `public_case` with internal data.

## Source

```json
{
  "id": "meta-2026-q1",
  "type": "meta_mcp",
  "label": "Meta Ads account export, Q1 2026",
  "scope": {
    "project": "boxette",
    "account": "private-account-id",
    "from": "2026-01-01",
    "to": "2026-03-31",
    "currency": "USD",
    "timezone": { "value": "Asia/Tashkent", "status": "available" }
  },
  "evidence": { "package_path": "evidence/meta/meta-2026-q1.json" },
  "captured_at": "2026-04-01",
  "visibility": "private",
  "verified": true,
  "notes": "Reported conversion attribution window is retained with the export."
}
```

`type` may be `meta_mcp`, `spreadsheet`, `crm`, `shopify`, `screenshot`, `user`, `calculated`, or another truthful source type. A source reference is an ID, path, URL, or stable description; never paste secrets or raw credentials.

A `meta_mcp` source is an acquisition produced by the installed `meta-ads` adapter and must link its private Meta Evidence Package. Its scope keeps project, account, exact dates, currency, and timezone status. The source remains private by default; individual metrics decide their own visibility.

## Metric

```json
{
  "id": "meta-q1-cpa",
  "metric": "CPA",
  "value": 6.74,
  "unit": "USD per purchase",
  "period": { "from": "2026-01-01", "to": "2026-03-31" },
  "classification": "FACT",
  "source_ids": ["meta-2026-q1"],
  "source_scope": "Meta Ads reported purchases",
  "meta_evidence": {
    "reported_field": "cost_per_result",
    "result_spec": { "metric_status": "available", "result_type": "purchase", "result_accuracy": "exact" }
  },
  "verified": true,
  "visibility": "public",
  "notes": "Platform-reported, not Shopify orders."
}
```

`classification` is one of `FACT`, `OBSERVATION`, `CALCULATED`, `INFERENCE`, `USER_CLAIM`, or `UNKNOWN`. A `CALCULATED` metric also contains `calculation: { "formula": "spend / purchases", "input_metric_ids": ["…"] }`. A public metric needs a value, period or a clearly stated cumulative scope, source trace, non-private visibility, and no unresolved conflict.

A public `meta_mcp` metric additionally records `meta_evidence.reported_field`. When that field is Meta's typed `results` or `cost_per_result`, retain its `result_spec` and require `metric_status: available`; delivery fields such as `spend`, `ctr`, or `purchases` remain separately labeled fields, not replacements for an unavailable primary result.

## Claims and reasoning

Record business context, objectives, constraints, observations, decisions, experiments, results, limitations, proof, and quotes as objects with `id`, `text`, `classification`, `source_ids`, `verified`, `visibility`, and optional `status`/`notes`. An inference includes `basis_ids` and a confidence label. An experiment may link `hypothesis_id`, `decision_id`, dates, action, observed result IDs, and a status such as `successful`, `inconclusive`, or `failed`.

For a causal claim, record the causal basis separately: comparison, test design, external changes, and confidence. A temporal sequence alone supports “after”, not “because of”.

## Progress and conflicts

Use `workflow.missing` for fields worth asking, `skipped` for user-skipped questions, `needs_verification` for an identified but unverified claim, and `unresolved_conflicts` for incompatible material values. A conflict object includes the metric or claim, competing evidence IDs, their scopes, and a user resolution or an attribution note. The validator rejects a public metric that names an unresolved conflict.

A user correction never overwrites source evidence. Record it as its own metric with `classification: USER_CLAIM`, its own source (`type: "user"`), its own scope, and its own visibility; keep the external metric it disagrees with exactly as acquired. Then register the conflict and let the user decide which canonical metric the public case may use:

```json
{
  "metric_ids": ["meta-purchase-cpa", "owner-aggregate-cpa"],
  "evidence_ids": ["meta-2026-q1", "owner-confirmation"],
  "note": "Owner aggregate covers the whole engagement; the Meta metric covers the compatible purchase-only scope.",
  "resolution": {
    "decision": "publish_selected_metric",
    "selected_metric_id": "owner-aggregate-cpa",
    "approved_by": "owner",
    "approved_at": "2026-09-11",
    "note": "Published figure follows the owner-confirmed aggregate; source evidence is retained for re-reconciliation."
  }
}
```

`decision` is `publish_selected_metric` or `withhold_from_public`, and both need `approved_by` and `approved_at`. The resolution only states which canonical metric may appear publicly: the unselected side stays in the record and stays unpublishable. A public `USER_CLAIM` metric still needs provenance — at least one source — and stays subject to the same visibility and verification rules.

A resolution is a publication decision, not a factual reconciliation. The entry stays in `workflow.unresolved_conflicts`, every competing Meta/CRM/user metric stays in the record with its own scope, and the discrepancy stays open until someone actually re-reconciles it as a separate task. Do not delete, merge, or overwrite the losing metric, and do not describe the conflict as closed in a status summary.

`workflow.source_status` records each adapter independently. For Meta Ads, use `not_checked`, `disabled`, `unavailable`, `not_found`, `needs_selection`, `resolved`, `acquired`, or `limited`, with a reason and check time. In `case_config.sources.meta_ads`, retain the user preference (`mode`, depth, diagnostic opt-ins, and public campaign-name preference) separately from `selection`: selected project, account, one or more exact date periods with a role, and campaigns. Read [the Meta integration contract](meta-ads-integration.md) before filling either object.

## Public projection

`public_case` is a reviewable object in the current `smr-web` shape plus its evidence maps. Read [the publication contract](smr-web-contract.md) for the field list and limits.

```json
{
  "case": {
    "slug": "…",
    "title": "…",
    "niche": "…",
    "period": "…",
    "metrics": [],
    "summary": "…",
    "fullStory": { "task": "…", "approach": "…", "result": "…" },
    "article": { "heading": "…", "result": "…", "highlight": "…", "note": "…", "sections": [] }
  },
  "metric_evidence": { "CPA": ["meta-q1-cpa"] },
  "claim_evidence": {
    "title": ["meta-q1-cpa"],
    "summary": ["meta-q1-cpa"],
    "fullStory.task": ["client-brief"],
    "fullStory.approach": ["work-log"],
    "fullStory.result": ["meta-q1-cpa"],
    "article.result": ["meta-q1-purchases"],
    "article.highlight": ["meta-q1-cpa"],
    "article.sections.5": ["meta-q1-cpa"]
  },
  "approval": { "status": "pending", "approved_at": null }
}
```

The evidence maps are never copied into the website file. A projected metric must point to public, verified, non-conflicting canonical metrics. Quantified public text needs a trace: the validator requires `claim_evidence` for `title`, `summary`, each `fullStory` field, `article.result` and `article.highlight` when they contain numbers, and every article section whose paragraphs contain numbers. Editorial links and transitions are not separate factual claims and need no mapping — but any concrete action, date, result, or causal statement still has to be traceable in the record even where the validator cannot see it.

`article` is optional in the schema and `fullStory` is required in every case; write `fullStory` as a compressed projection for the cards, not as a second story.
