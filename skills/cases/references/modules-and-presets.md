# Modules and presets

Modules are public-story choices. Canonical evidence is retained independently even when a module is excluded.

## Module catalogue

Use the smallest useful set. The groups are navigation aids, not a required page order.

| Group | Modules |
| --- | --- |
| Framing | hero, context, objective, KPI, baseline, constraints |
| Reasoning | diagnosis, observations, decisions, hypotheses, strategy |
| Execution | experiments, failed_tests, timeline, creatives, audiences, funnel, sales_process |
| Outcome | results, before_after, business_result, lessons |
| Trust | attribution, limitations, evidence, client_quote |
| Conversion | CTA |

An enabled module moves from `pending` to `included` only when it has substantive, publishable content. Mark it `excluded` when the user does not want it, `not_applicable` when it cannot describe the engagement, and keep the reason.

## Starting presets

| Preset | Default public modules | Use when |
| --- | --- | --- |
| `short` | hero, context, objective, results, CTA | a compact proof asset is sufficient |
| `standard` | hero, context, baseline, objective, decisions, experiments, results, limitations, CTA | the default website case |
| `deep` | all standard modules plus constraints, diagnosis, hypotheses, timeline, failed_tests, attribution, evidence, lessons | the learning and decision logic are central |
| `custom` | no assumptions; choose modules in conversation | privacy, format, or audience needs differ materially |

`standard` maps onto the six default article sections in [public narrative](public-narrative.md): старт, запрос, что сделали, что получилось лучше, что сработало плохо, конечный результат. That mapping is a default, not a validation rule — `deep` and `custom` keep full freedom over the section set, and `standard` may be adapted when the project needs it. Keep `standard` compact: it is not a small `deep` case. Reasoning, timeline, hypotheses, failed tests, and detailed attribution belong to `deep`, `custom`, or the record.

Since the admin editor cannot add or remove sections after publication, settle the section set before publishing.

Specialization (lead generation, e-commerce, traffic/awareness, education, local business, audit) may suggest metrics and questions, but never prevents module selection or data disclosure choices.

## Conversational configuration

Do not require a YAML edit. Translate ordinary language into `case_config`, for example:

- “Без блока про продажи” → exclude the `sales_process` module and topic.
- “Покажем только CPA, spend и purchases” → replace `metrics.include`.
- “Название клиента скрываем” → `privacy.client_name: private`; use approved neutral naming.
- “Добавь вопрос про возвраты” → append a custom question; ask it only if still unanswered.

When the user asks to remove or add a module after drafting, update configuration, check whether the evidence supports the new selection, then revise the projection rather than restarting the case.
