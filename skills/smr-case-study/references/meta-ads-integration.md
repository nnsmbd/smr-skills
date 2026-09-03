# Meta Ads integration contract

`smr-case-study` orchestrates a case. `meta-ads` owns Meta Ads project resolution, authentication/profile routing, data acquisition, objective/intent and ResultSpec interpretation, inspection, and Meta-specific reporting limitations. Do not copy those rules into this skill or use any direct Meta API path.

## Source discovery

Before the adaptive interview, determine whether Meta Ads is requested, present in supplied evidence, or likely for the named project.

```text
case request
→ identify project and source preferences
→ Meta Ads likely and permitted?
  → meta-ads available: delegate acquisition
  → meta-ads unavailable: record unavailable; continue
  → Meta disabled: record disabled; continue
→ normalize acquired sources
→ compute the missing-information map
→ adaptive interview
```

Use `case_config.sources.meta_ads` to preserve user control:

```json
{
  "mode": "auto",
  "depth": "standard",
  "inspect": { "creatives": "auto", "targeting": "auto" },
  "public": { "campaign_names": false }
}
```

`mode` is `auto`, `disabled`, or `verify_only`; `depth` is `overview`, `standard`, or `deep`; inspection values are `auto` or `never`. “Meta не используй” sets `disabled`; “только общие цифры” selects `overview`; “Meta только для сверки” selects `verify_only`. These preferences are not credentials or Meta routing instructions.

If the runtime can invoke another installed skill, invoke `meta-ads` before the interview. In a portable environment, pass the requested project, exact known period or period question, source depth, and diagnostic need to that skill; let it use its own documented commands and safeguards. Do not hard-code an invocation syntax.

If `meta-ads` is unavailable, do not access Meta directly, request a token, read Keychain data, create an API client, or invent a transport. Record `workflow.source_status.meta_ads` as `unavailable` with its reason, then proceed with other sources.

## Selection gate

Do not make an account-wide export the default for a case with multiple projects, campaigns, or possible periods. Before acquisition, create or reuse `case_config.sources.meta_ads.selection`.

1. Ask `meta-ads` for its available project list. Show the user a compact, human-readable list and ask for the exact project. If a project was already explicitly selected in the current case record or conversation, reuse it rather than asking again.
2. If the selected project has several ad accounts, show only those accounts and ask the user to select one. Never treat a project as permission to merge account data.
3. Ask the user to choose the reporting interval. Offer known engagement dates or compact concrete-date choices when available; otherwise request `from` and `to`. Do not persist a relative phrase such as “last 30 days”: `meta-ads` must resolve and return exact dates.
4. Obtain an overview report for that selected account and interval. From its returned campaign rows, show campaigns grouped by their confirmed intent/objective and ask which campaigns or compatible campaign group belongs in this case. Include campaign name, intent, objective/result label, and selected-period delivery in the choice list. Do not preselect similarly named campaigns, blend multiple intents, or silently include paused/currently configured campaigns that had no selected-period delivery.
5. Persist the selected project, account, exact period, and campaign IDs/names in the case record, including each campaign's applicable period IDs. Only then request the case-specific campaign evidence and any justified diagnostics.

The user can choose `all compatible campaigns` for a clearly stated intent; expand that choice into the returned campaign IDs before saving it. This is a deliberate selection, not permission to mix sales, lead, traffic, or awareness efficiency measures. If a case needs multiple periods, store each period as a separate named selection and compare them only when their scopes are compatible. Ask the user whether each period is a baseline, intervention, or result period; do not infer that meaning from dates alone.

```json
{
  "project": { "value": "boxette", "status": "selected" },
  "account": { "value": "Main account", "status": "selected" },
  "periods": [
    { "id": "baseline", "from": "2026-05-01", "to": "2026-05-31", "role": "baseline", "status": "selected" },
    { "id": "result", "from": "2026-07-01", "to": "2026-07-30", "role": "result", "status": "selected" }
  ],
  "campaigns": [
    { "id": "123", "name": "Sales — Prospecting", "intent": "sales", "period_ids": ["baseline", "result"], "status": "selected" }
  ]
}
```

Selections are case scoping data, not raw evidence. Exact account IDs and campaign names remain private unless the user separately permits their public display.

## Delegated acquisition

The delegated request begins after the selection gate. `meta-ads` resolves the selected project and account under its own declared-auth-profile rules. A project or account with multiple matches requires user selection; do not choose one. A profile or permission failure is a limitation, not a reason to switch an auth boundary.

Use progressive acquisition. The orchestrator requests the minimum evidence that answers the case question; `meta-ads` chooses the exact supported commands and applies its intent rules.

1. **Overview:** selected project/account/period evidence, actual resolved period, account currency when returned, campaign-level performance and intent. Its first purpose is the campaign choice list; after the user chooses campaigns, retain only the rows in the selected scope. Capture spend, reported primary result and cost only when its `metric_status` supports it, plus reported purchases, leads, purchase value/ROAS, impressions, reach, clicks/link clicks, CTR, CPC, and CPM when returned.
2. **Campaign context:** retain only campaigns needed to explain the period. Keep objective, `campaign_intent`, `result_spec`, `metric_status`, scope, status snapshot, and relevant performance. Do not rank or combine incompatible intents such as sales CPA and lead CPL.
3. **Diagnostics:** request `inspect` or `compare-campaigns` only to answer a concrete narrative, comparison, or hypothesis question. Inspect ad sets, ads, creatives, targeting, or configuration selectively; do not dump every object. `deep` enables this only when evidence needs it, while `overview` stops after sufficient account/campaign evidence.

Use the exact dates that `meta-ads` returns after resolving any relative range. The ordinary reporting contract proves that its date range was resolved in the account timezone, but may not expose the timezone name. Store the timezone name only when the delegated output makes it available; otherwise set its status to `unavailable` and retain the exact period rather than guessing.

## Meta Evidence Package

Create one private intermediate package per acquisition at `.smr-case-studies/<case-id>/evidence/meta/<package-id>.json`. It is a compact, normalized evidence input—not a public case and not a raw Ads Manager dump.

```json
{
  "schema_version": "1.0",
  "adapter": { "skill": "meta-ads", "acquisition": "delegated" },
  "captured_at": "2026-09-03T10:00:00Z",
  "project": { "query": "Boxette Shop", "status": "resolved", "slug": "boxette", "name": "Boxette Shop" },
  "account": {
    "id": "private-account-id",
    "currency": "USD",
    "timezone": { "value": "Asia/Tashkent", "status": "available" }
  },
  "period": { "from": "2026-07-01", "to": "2026-07-30" },
  "reports": [],
  "campaigns": [],
  "comparisons": [],
  "inspections": [],
  "observations": [],
  "limitations": []
}
```

Preserve source scope and Meta-reported semantics in the package: a `results`/`cost_per_result` value carries its `result_spec`, `result_type`, `metric_status`, accuracy/calibration notes when supplied, intent, and reporting period. Keep current `status`, `effective_status`, or `configured_status` under a configuration snapshot; never present them as historical status evidence.

If reproducibility needs raw output, place it under `.smr-case-studies/<case-id>/raw/meta/` (for example `project.json`, `report.json`, `campaign-*.json`, or `inspect-*.json`). These artifacts and the package are private/local by default, ignored by Git, and never contain tokens, credentials, or Keychain data.

## Normalize into the case record

Add a private source record with the Evidence Package path or ID and an explicit scope containing project, account, exact period, currency, and timezone status. The source may be private while an individual verified metric is public.

Map each Meta quantity separately. For example, preserve `Meta Ads reported purchases`, `Shopify orders`, and `CRM sales` as distinct metrics with distinct source scopes. Map Meta's typed primary result or its cost only when `metric_status` is `available`. A `mixed`, `ambiguous`, or `unavailable` ResultSpec becomes a limitation or inspection need; it never becomes a verified public result through a substitute calculation.

Use `FACT` for Meta-reported values and `OBSERVATION` for a directly supported comparison. Use `INFERENCE` for an explanation that remains uncertain. A campaign with different CTR and CPA can support a performance observation; it cannot, by itself, establish that a landing page caused the CPA difference.

For a public Meta-derived metric, retain: source ID, exact `from`/`to`, unit/currency, `source_scope` such as `Meta Ads reported purchases`, verification state, and Meta result status where relevant. If Meta and Shopify/CRM conflict, create an `unresolved_conflict` containing both IDs and scopes. Do not choose a winner automatically; obtain a decision or disclose the attribution difference.

## Failure states

| Situation | Record and next action |
| --- | --- |
| `meta-ads` unavailable | `source_status.meta_ads: unavailable`; continue other sources. |
| Project or account ambiguous | `source_status.meta_ads: needs_selection`; ask the user to choose. |
| Project not found | `source_status.meta_ads: not_found`; request an alias or project clarification. |
| Auth/profile/permission failure | Record the limitation and use the safe setup guidance returned by `meta-ads`; do not route around it. |
| Metric not returned | Store it as unavailable; do not use a similar metric or zero. |
| Incompatible Meta scopes | Keep separate metrics or create a conflict; do not aggregate. |
| User disables Meta | `source_status.meta_ads: disabled`; make no Meta invocation. |
