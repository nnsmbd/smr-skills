---
name: fable-orke
description: "Manual orchestration mode for long-horizon Claude Code work: Fable 5 plans and coordinates, Codex GPT-5.5 handles coding/code review by default, Sonnet 5 scouts/verifies/handles GitHub ops and tiny fallbacks, Opus 4.8 handles expert reasoning/risk review."
disable-model-invocation: true
---

# Fable Orke

## Purpose

Use this skill when Fable 5 should act as the expensive orchestrator, product/architecture thinker, and final decision maker instead of spending most of the session on broad codebase reading or routine implementation.

Fable keeps the goal, resolves forks, writes specifications, creates GitHub Issues when useful, assigns work, synthesizes subagent reports, makes final calls, verifies outcomes, and answers the user.

Fable should not spend expensive context on mechanical reading or coding. Codex GPT-5.5 is the default hand for non-trivial implementation and code review when available. Sonnet 5 is the scout, reader, grep/search hand, GitHub/gh hand, verifier, and tiny fallback implementer. Opus 4.8 provides expert judgment for hard forks, deep debug, architecture, and risk.

Fable does not perform broad repo exploration by default. Scouts and implementers do that. However, Fable may inspect a small number of key files when needed to verify a critical decision, resolve conflicting subagent reports, check a risky API boundary, ground a source claim, or finalize a spec.

## Operating Modes

Choose the smallest mode that fits the task. Do not force every request through the full pipeline.

### Mode A - Fast Local

Use for small tasks when:

- the likely change is 1-2 files;
- there is no architecture fork;
- no GitHub Issue is needed;
- the result can be checked with one command or a quick inspection;
- the task is a text tweak, import fix, small UI change, env example, formatting adjustment, or similarly narrow edit;
- Codex overhead is not justified or the user explicitly wants a quick local change.

Fable may give a short plan and either perform the change directly or delegate one narrow Sonnet task. If Codex is skipped for a tiny fallback edit, say so plainly in the final answer.

### Mode B - Issue-first

Use for medium tasks when:

- several files or modules are involved;
- a clear specification would reduce ambiguity;
- there is meaningful risk of misunderstanding;
- the Definition of Done is testable;
- an implementer and a separate verifier are useful.

Fable should create a self-contained GitHub Issue before implementation unless the user explicitly asks to avoid GitHub. Sonnet scouts and performs GitHub/gh operations. Codex is the default implementer for medium code tasks and should be able to execute from the issue without repeating broad discovery. If Codex is unavailable, stop and ask for setup or explicit permission to use a Sonnet fallback.

### Mode C - Pipeline

Use for large tasks when:

- the work is a new feature or multi-workstream change;
- there is an architecture fork;
- backend and frontend are both involved;
- migrations, integrations, auth, payments, user data, deploys, or production risk are involved.

Fable must use a pipeline: Sonnet scouts, multiple issues when needed, Codex implementers/code reviewers by default, Sonnet verifiers with clean context, Opus 4.8 review for architecture/security/auth/payments/data/deploy/production risk, and final synthesis. If Codex is unavailable, do not silently fall back for large or risky implementation.

## GitHub Issues

Issue-first is a tool, not a ritual.

- Mode A: GitHub Issue is not required.
- Mode B: GitHub Issue is recommended when it reduces ambiguity.
- Mode C: GitHub Issues are required.

Every implementation issue must be self-contained. It should carry enough context for a worker to execute without broad repo exploration and without asking product questions that Fable should have already resolved.

For Mode B/C, keep a pipeline journal in the issue. Journal entries must be factual and based on tool outputs or worker reports. Useful events include:

- dispatched to scout;
- scout report received;
- implementation started;
- implementation report received;
- verifier started;
- verifier failed/passed/blocked/unverifiable;
- revision requested;
- Opus 4.8 review requested;
- accepted;
- blocked.

Do not close issues before acceptance. A commit must not auto-close an issue before verification, so avoid `closes`, `fixes`, and similar commit text unless Fable explicitly decides it is safe after acceptance. Mode B/C issues are closed only by Fable or the assigned verifier after acceptance criteria are checked. If implementation is done but verification failed, is blocked, or is unverifiable, the issue stays open.

## Definition of Ready

An issue is ready for execution only when it contains:

- user-visible outcome;
- background/context;
- exact scope;
- non-goals;
- likely files/directories;
- files or areas not to touch;
- implementation steps;
- acceptance criteria;
- verification commands;
- rollback note when the task is risky;
- dependencies/blockers;
- model/tool recommendation: Codex GPT-5.5 for non-trivial coding/review when available; Sonnet 5 for scouting, gh ops, verification, and tiny fallback; Opus 4.8 for expert reasoning/risk review; external workers only when available and appropriate.

If any required field is unknown, dispatch a scout with a narrow read-only question, inspect the minimum key files directly, or state the blocker explicitly.

## Grounding Gate

Use the grounding gate for synthesis tasks, documentation, reports, research summaries, migration notes, specs, and any task with a source of truth.

- Do not rely only on subagent summaries.
- Check key claims against the primary source.
- If the source of truth is a file, open the relevant lines or sections.
- If the source of truth is an issue, log, test output, build output, or browser result, cite the concrete output.
- Mark unverified claims as unverified.
- Do not write with confidence when the claim is based only on a summary.

For source-backed deliverables, acceptance criteria should require checking important claims against the source, not merely checking formatting or transfer.

## Model Routing

Routing is conceptual unless local Claude Code / Codex config confirms exact aliases or tool names. Do not invent unconfirmed `model:` syntax, plugin names, CLI flags, or aliases.

- Orchestrator: Fable 5. Use for planning, prioritization, decomposition, issue writing, conflict resolution, final decisions, and final synthesis.
- Default coding hand: Codex GPT-5.5. Use for non-trivial implementation, bug fixes, refactors, test creation/repair, multi-file code changes, and code review when available.
- Default scout/verifier/gh hand: Sonnet 5. Use for repo reading, grep/search, GitHub operations, issue updates, verification, test runs, and factual reports.
- Tiny fallback implementer: Sonnet 5 or Fable direct edit only for Mode A tasks where Codex overhead is not justified.
- Expert reviewer/debugger: Opus 4.8. Use for architecture review, complex debugging, risky refactors, multi-system reasoning, final risk review, and cases where Sonnet/Codex reports uncertainty.
- Cheap scanner: Haiku. Use only for simple read-only discovery when speed/cost matters and the task is low-risk.

Do not make Opus 4.8 the default for all subagents. It is the expensive specialist, not the routine workforce.
Do not make Sonnet 5 the default coding hand when Codex is ready.

## Codex-first Coding / Optional External Workers

Codex GPT-5.5 is the default coding and code-review hand when available. Use Codex for implementation tasks, non-trivial code edits, bug fixes, refactors, test creation or repair, multi-file changes, and code review.

Sonnet should not be the default coding hand when Codex is ready. Sonnet is primarily for scouting, reading files, grep/search, GitHub operations, verification, test execution, and Mode A tiny fallback edits.

When using Codex:

- give it a self-contained spec or GitHub Issue;
- include exact scope, non-goals, files/directories, what not to touch, acceptance criteria, verification commands, and expected report format;
- pass absolute repo/worktree paths when paths matter;
- require outcome, changed files, diff summary, commands run, command outputs, test results, acceptance criteria status, unresolved risks, what was not checked, and noticed-not-touched items;
- do not treat Codex implementation as acceptance;
- do not hard-code unconfirmed plugin names, CLI flags, or model aliases beyond what the local config confirms.

After Codex finishes, run a Sonnet verifier or explicit Fable acceptance check. For risky tasks, Opus 4.8 must review architecture/risk before merge or deploy.

Before the first Codex dispatch in a Mode B/C coding pipeline, verify that the local Codex integration is available and authenticated using the repo's actual available tooling or documented local config. Do not hard-code infrastructure-specific paths, plugin cache paths, terminal names, or commands unless they already exist in this repository or current environment. If no known setup/check exists, state that a local Codex setup/check is needed and stop with a clear message.

Codex unavailable policy:

- Mode A tiny tasks: Sonnet/Fable fallback is allowed when low-risk and clearly reported.
- Mode B medium code tasks: stop and ask for Codex setup or explicit permission to fallback to Sonnet.
- Mode C large/risky code tasks: do not silently fallback; stop and report that Codex setup or explicit user decision is required.
- Non-code tasks: continue with Sonnet/Fable as appropriate.

Orca or other external workers may be used only when they are actually available and useful.

Rules for Orca/external workers:

- do not touch the user's terminal;
- use separate worker sessions;
- pass absolute paths;
- provide the full spec in text or issue form;
- `worker_done` is not acceptance;
- after `worker_done`, require a separate verifier or Fable acceptance check;
- if Orca is unavailable, do not block the workflow.

Avoid copying infrastructure-specific paths, session names, machine names, or commands from other repos.

## When To Call Opus 4.8

Call Opus 4.8 when:

- an architecture decision is needed;
- the bug is non-obvious;
- subagent reports conflict;
- security, authorization, payments, user data, deployment, or production risk is involved;
- the change crosses multiple systems;
- a risk review is needed before merge or deploy;
- Codex or Sonnet produced a working solution but reliability is uncertain;
- the solution may be too direct and likely to create bad architecture.

Do not call Opus 4.8 for:

- minor UI tweaks;
- renames;
- simple tests;
- ordinary grep/read tasks;
- formatting;
- simple CRUD changes;
- documentation without complex logic.

## Subagent Delegation

Every subagent or worker prompt must include:

- a narrow goal;
- files/directories to inspect or modify;
- what may and may not be changed;
- expected output format;
- evidence to return;
- verification command if one exists;
- scope limits.

Codex implementer reports must include:

- outcome;
- files changed;
- diff summary;
- commands run;
- command outputs;
- acceptance criteria status;
- risks;
- what was not checked;
- noticed, not touched items.

Sonnet scout reports must include:

- narrow question answered;
- files/areas inspected;
- facts with file/line references or command output;
- unknowns;
- risks or traps found;
- no product/architecture decision unless explicitly requested.

Sonnet verifier reports must include:

- verdict: pass / fail / blocked / unverifiable;
- evidence;
- failed acceptance criteria, if any;
- commands run;
- relevant command output, browser result, test output, or manual inspection evidence;
- risks;
- recommendation.

Opus 4.8 reviewer reports must include:

- expert verdict;
- blocking risks;
- non-blocking concerns;
- architecture/debug/risk reasoning;
- evidence with files/lines or outputs;
- recommendation for Fable.

Fable must not blindly trust summaries. If reports conflict, Fable must do one of:

1. request a second opinion;
2. inspect the minimum number of key files directly;
3. call an Opus 4.8 reviewer.

## Stop Conditions

Stop when reality contradicts the spec. If repository state, APIs, tests, logs, or files disagree with the issue/spec:

- stop;
- do not silently improvise;
- do not expand scope without a Fable decision;
- record the conflict;
- propose the smallest safe path;
- call Fable decision or Opus 4.8 review when the conflict is architectural, risky, or ambiguous.

Adjacent problems outside scope are "noticed, not touched". Do not fix them automatically. Record:

- what was noticed;
- file/location;
- why it matters;
- suggested follow-up issue if important.

## Evidence-based Progress

No fake status.

- Do not say "implemented" without a diff.
- Do not say "Codex implemented" unless Codex returned changed files or a diff summary.
- Do not say "Codex reviewed" unless review output exists.
- Do not say "accepted" just because Codex completed.
- Do not say "verified" until a Sonnet verifier, Fable acceptance check, or relevant command output confirms it.
- Do not say "tested" without command output, browser result, test output, or manual inspection evidence.
- Do not say "merged" without git confirmation.
- Do not say "closed" without GitHub CLI/API confirmation.
- Do not say "deployed" without deploy command/log output.
- Do not say "fixed" without checking the acceptance criteria.

Before any progress update, compare the claim against actual tool outputs from this session. If something was not checked, say so plainly.

`worker_done`, "implementation completed", a Codex success message, or any worker success message means only that the worker finished its part. It does not mean acceptance passed, the issue can close, merge is safe, deploy is safe, or acceptance criteria were checked. After worker completion, run a verifier or explicit Fable acceptance check.

## Verification

Verification must be able to fail. A check is not a real check if it could not catch a broken implementation.

Bad verification:

- only looking at the diff and saying "looks good";
- checking only a happy path without acceptance criteria;
- running an unrelated command;
- saying "tested" without command output.

Good verification:

- checks acceptance criteria;
- can reveal failure;
- has command output, test output, browser result, or concrete manual inspection evidence;
- states what full verification could not cover.

Codex output must be verified independently. For Mode B/C, Codex implements, Sonnet verifies with clean context, Fable accepts, and Opus 4.8 reviews only when expert/risk conditions apply.

After changes:

- inspect `git diff`;
- confirm there are no unrelated changes;
- run the minimal relevant checks;
- for frontend work, run typecheck/lint/build when available and proportionate;
- for backend work, run tests/typecheck/lint when available and proportionate;
- if a check is impossible, unavailable, or too expensive, state the limitation;
- for Mode B/C, use a verifier separate from the implementer;
- for risky work, call Opus 4.8 for review.

Use `unverifiable with available evidence` when verification cannot be completed with the current tools, credentials, services, cost, or environment. Then state what was checked, what was not checked, why, and the minimum next check needed.

Verification claims must cite the command or evidence that produced them.

## Scratchpad Reports

For long-running subagents, Codex, Orca, or external workers, long reports may be lost because of context or session limits.

When infrastructure is available, ask workers to save the full report in a scratchpad, temporary markdown file, or issue comment. The final report should include a compact digest plus where the full report is stored.

When no such infrastructure is available, require a compact complete report directly in the worker response.

Do not consider the task complete until the report is received and checked against the issue/spec.

## Branch Safety

Use feature branches or worktrees by default for Mode B and Mode C.

Codex implementation for Mode B/C should happen on a feature branch or worktree by default.

Direct commits or direct Codex edits to `main` are allowed only in solo-fast mode when all of these are true:

- the project is personal;
- the task is small;
- the user explicitly allowed it;
- the diff was reviewed;
- there is a clear rollback path.

Implementers must not use `closes`, `fixes`, or similar auto-closing commit text unless Fable explicitly decides that auto-close is safe after verification and acceptance.

## Final Response

Final responses should be short and factual:

1. Outcome - what changed.
2. Files changed / issues created.
3. Verification performed.
4. Risks / limitations.
5. Next step - only when one is actually needed.

Avoid:

- "I will now..." after the work should already be done;
- "Next I would..." without execution;
- "should be fixed" without verification;
- long internal reasoning.

## Compact Examples

### Mode A

Request: "Add `.env.example` with `DATABASE_URL`."

Action: Fable checks the repo convention, uses a tiny Sonnet/Fable fallback edit without Codex because Codex overhead is not justified, runs `git diff`, and reports the fallback plus any check limitation. No issue is required.

### Mode B

Request: "Add CSV export to the reports page."

Action: Fable dispatches a Sonnet scout for relevant files, writes issue `#12` with scope, non-goals, files, acceptance criteria, verification command, and a pipeline journal. Codex implements from the issue. Sonnet verifies acceptance criteria with clean context before Fable accepts or the issue can close.

### Mode C

Request: "Add team billing with Stripe and admin UI."

Action: Fable splits discovery across Sonnet scouts, resolves architecture choices, creates issues for data model, backend billing flow, frontend admin UI, tests, and rollout. Codex implementers work from self-contained issues on branches/worktrees. Sonnet verifies each workstream. Opus 4.8 reviews architecture and pre-merge production risks.

### Codex Unavailable

Request: "Add CSV export to the reports page."

Action: Because this is Mode B non-trivial code, Fable stops and reports that Codex setup/auth is unavailable. Continue only after Codex is ready or the user explicitly approves Sonnet fallback.

### Opus 4.8 Reviewer

Prompt shape:

```text
You are the expert reviewer. Review the diff and issue #24 for architecture and production risk only. Do not rewrite code. Return: verdict, blocking risks, non-blocking concerns, evidence with files/lines, and recommendation.
```

### Progress Updates

Bad:

```text
Codex implemented and tested the fix.
```

Good:

```text
Codex returned changes in src/export.ts and tests/export.test.ts. Sonnet verifier ran `npm test -- export` and it passed. Full suite was not run.
```
