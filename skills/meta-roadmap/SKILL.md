---
name: meta-roadmap
description: Bring the Meta Agent product roadmap board up to date with reality. Researches nnsmbd/meta-agent-template and nnsmbd/meta-mcp (issues, comments, commits, branches, releases, audits, local work) since the board's last verified state, compares with the board, and prepares an evidence-backed proposal that the owner reviews before anything is applied. Use for "обнови roadmap Meta Agent", "синхронизируй доску с GitHub", "что изменилось в Meta Agent с прошлого обновления", or reviewing/applying a pending roadmap proposal. Not for editing single cards by hand or for other projects' boards.
---

# Meta Roadmap Sync

Keep the Meta Agent roadmap board (https://meta-roadmap-board.vercel.app, code in `~/meta-roadmap-board`) truthful without rewriting it every run. The board is the owner's product interface: plain Russian first, technical detail second. You propose; the owner decides.

**Hard rules**

- Never apply a change the owner has not approved. The only automatic write is storing a *proposal* (`propose`), which changes no card.
- Never overwrite a hand-edited field silently. `manualFields` on an entity → the change becomes a conflict. `manualNote`, `manualPriority`, `history`, `manualFields` are never proposed at all (the scripts reject them).
- Never declare work done from weak evidence. A commit is `implemented`; green tests are `tested`; a deploy is `deployed`; only a recorded acceptance is `done` (see `references/evidence-policy.md`). The planner demotes anything that overclaims.
- If sources disagree, do not pick one quietly: propose a `check` item or an update with `confidence: "conflict"` and show both sides in `reason`/`evidence`.
- Only change what new facts support. No restyling of wording, no reordering of milestones, no "cleanups" without a fact.
- Read-only research: never push, comment, deploy, or open secret/token/`.env` files (the board key is read by the script from its file and never printed).

## Pipeline

1. **Read the board.** `node scripts/board.mjs pull --out <tmp>/board.json`. It prints `since` (last sync date), the current milestone, pending proposal count, and which entities were edited by hand. If a proposal is already pending, show its report (`report`) and ask whether to review/apply it first.
2. **Fix the window.** `since` = `meta.lastSync.at`; also note entities whose `provenance.lastVerified` is older (they need re-checking). Research from `since` (inclusive) to now.
3. **Research in parallel with Sonnet subagents** (use the briefs in `references/research-briefs.md`; pass them the board's open items and `since`). Split so they don't overlap: (a) GitHub delta — issues, comments, PRs, branches, commits, tags/releases in both repos; (b) evidence levels for every open board item; (c) off-GitHub work — local Codex session folders, audit/reports, production records. Subagents return facts with sources; they do not decide board changes.
4. **Cross-check** anything that would change a status, add a blocker, or mark done: open the cited issue comment/commit yourself (small `gh` calls). One subagent's claim is not enough for a critical change.
5. **Diff reality vs board.** For each fact decide: completed? new work? status change? new blocker / blocker gone? no longer relevant? new decision? Write a proposal JSON (`assets/proposal.template.json`, schema in `references/board-model.md`). Plain-language `label` (what the owner reads), `reason`, `evidence`, `level`, `confidence`, `source`. New entities get both layers: human `title/summary/why/doneWhen` and `technicalTitle/technicalDetails`.
6. **Dry run.** `node scripts/board.mjs plan proposal.json` — validates, fills `from` values, drops no-ops, applies evidence rules, flags manual conflicts, prints the report. Fix and re-run until the report is right.
7. **Show the report** to the owner (format: `references/report-format.md`).
8. **Store for review.** `node scripts/board.mjs propose proposal.json` writes it to the board as a pending proposal; the owner sees a banner and «Ещё → Обновить из GitHub» with «Применить подтверждённое» and per-item decisions.
9. **Apply only on explicit request.** `node scripts/board.mjs apply` applies confirmed items only; `--ids a,b` applies chosen items (e.g. ones the owner accepted despite `needs_verification`); `--ids x --accept-manual` resolves a manual conflict in the agent's favour. Applying records provenance (`source`, `evidence`, `lastVerified`, `confidence`, `level`) and a history entry on every touched entity, and closes the proposal when nothing is left (`meta.lastSync`).
10. **Changelog.** Finish with a short list: applied, waiting for a decision, conflicts, and what could not be verified.

A 409 from the board means someone edited it meanwhile: nothing was written — pull and re-plan.

## Sources and priority

Prefer, in order, but weigh dates and context — a newer production record beats an older issue text:

1. confirmed production evidence (deploy/acceptance records, doctor/smoke results);
2. merged/current code + tests;
3. GitHub issue with a current status header or latest comment;
4. commits / branches (incl. unpushed local branches — label them as local);
5. audits and reports;
6. old board text.

Issue *bodies* in this project go stale (headers are updated less often than comments): trust the latest dated comment, and flag the stale header as a conflict if it matters.

## Status semantics (board)

- Task: `backlog` → `next` → `in_progress` → `review` → `done`; `blocked` when something outside the task stops it (put the reason in `blockers`, in plain words).
- Milestone: `done`, `current` (exactly one — `meta.currentMilestoneId`), `next`, `planned`, `blocked`. Changing the current milestone is the owner's call: propose it, never slip it in.
- Evidence level (`provenance.level`) is separate from status: a task can be `in_progress` with level `implemented`.

## What stays manual

Owner-only: `manualNote`, `manualPriority`, milestone order, the current-milestone choice, any field listed in `manualFields` (the board adds a field there whenever the owner edits it by hand, including drag-and-drop status changes), playbooks. Conflicts on these appear in the report as ⚠ and are applied only when the owner accepts them one by one.

## Writing for the owner

The owner is a product person and marketer, not an engineer. Labels and new titles are plain Russian that answer "что происходит / зачем / что должно получиться / что мешает / что дальше". Technical names (H1, WAL, OAuth, tenant isolation, SHAs) go to `technicalTitle`, `technicalDetails` and `evidence`. If a technical word is unavoidable in the main text, explain it in brackets.

## Files

- `scripts/board.mjs` — CLI (`pull`, `plan`, `propose`, `apply`, `report`). Config: `META_BOARD_URL`, `META_BOARD_KEY` or `META_BOARD_KEY_FILE` (default `~/meta-roadmap-board/.env.local`).
- `scripts/sync-core.mjs` — planning/apply rules (pure, unit-tested). The board UI mirrors the apply rules in `~/meta-roadmap-board/src/sync.ts`; change both together.
- `tests/run-tests.sh` — fixtures for: evidence demotion, manual conflicts, explicit acceptance, stale patches, idempotency, create, check items, report.
- `references/board-model.md`, `references/evidence-policy.md`, `references/research-briefs.md`, `references/report-format.md`, `assets/proposal.template.json`.
