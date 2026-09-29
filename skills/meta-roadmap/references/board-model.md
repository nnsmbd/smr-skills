# Board model (schema 3)

`GET/PUT /api/board` with header `x-board-key`; optimistic locking via `x-board-rev` (send the revision you read; a 409 means someone saved first). The server accepts only schema-3-shaped boards (`milestones` + `tasks` arrays with `id`/`title`).

```text
Board
  meta: title, position (one sentence "где мы"), criterion, asOf, sources,
        currentMilestoneId, lastSync {at, summary} | null, pendingSync Proposal | null
  milestones[]   ordered = the roadmap
  tasks[]        work; milestoneId links to a milestone (or null)
  releases[]     shipped versions
  decisions[]    rules and open questions; milestoneIds[]
  facts[]        "Продукт уже умеет" (kind=can) / "Ещё не готово" (kind=cant)
  playbooks[]    release checklists (manual only)
```

## Field ownership

Every milestone / task / release / decision / fact has:

| field | owner | notes |
|---|---|---|
| `title`, `summary`, `why`, `doneWhen`, `nextAction`, `blockers`, `goal`, `statement` | agent-managed, **product layer** | plain Russian; what the owner reads first |
| `technicalTitle`, `technicalDetails`, `links` | agent-managed, **technical layer** | H1, WAL, SHAs, issue numbers |
| `status`, `category`, `milestoneId`, `phase`, `progress`, `date` | agent-managed | status changes follow the evidence policy |
| `provenance` `{source, evidence[], lastVerified, confidence, level}` | written on every applied change | `confidence`: confirmed / needs_verification / conflict |
| `history[]` `{at, by: agent|user, text}` | append-only log | never proposed |
| `manualFields[]` | set by the board UI when the owner edits a field by hand | never proposed; a patch touching a listed field becomes a conflict |
| `manualNote`, `manualPriority` (tasks) | **owner only** | never proposed |

Milestone order and `meta.currentMilestoneId` are owner decisions: propose them as items with a clear reason; never bundle them into other changes.

Task categories (directions of work): `security` Безопасность · `isolation` Изоляция пользователей · `access` Meta Login · `reliability` Надёжность · `infra` Инфраструктура · `release` Выпуск · `validation` Проверка с людьми · `pilot` Пилот · `product` Продукт · `quality` Порядок в проекте.

## Proposal

```jsonc
{
  "summary": "one line for the banner",
  "items": [
    {
      "id": "unique-in-proposal",
      "kind": "task | milestone | release | decision | fact",
      "op": "update | create | check",
      "targetId": "existing entity id (update, check)",
      "label": "Человеческая строка для отчёта",
      "reason": "почему — коротко",
      "confidence": "confirmed | needs_verification | conflict",
      "level": "planned | implemented | tested | deployed | verified | done | ''",
      "source": "github | audit | production | local | board",
      "evidence": ["issue #48 comment 2026-10-02", "commit abc1234", "tests 688 passed"],
      "patch": [{ "field": "status", "to": "in_progress" }],   // update; `from` is filled by the planner
      "entity": { "id": "new-id", "title": "…", "…": "…" }     // create
    }
  ]
}
```

`check` marks the target «Нужно проверить» without changing its content — use it for open questions ("жив ли блок Meta у Garik?").
