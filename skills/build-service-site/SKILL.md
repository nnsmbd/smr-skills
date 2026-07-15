---
name: build-service-site
description: Guide a service, expert, consultant, agency, or personal-brand website from discovery through research, conversion copy, three live design directions, architecture, implementation, responsive motion QA, GitHub workflow, and deployment. Use for a new website, an existing-site redesign, a site audit that may lead to implementation, or resuming a previously recorded website project. Works in Codex and Claude Code and adapts to the user's stack, hosting, project instructions, evidence, and approval preferences.
---

# Build Service Site

Lead the user from an incomplete idea to a verified website without importing another project's brand, claims, infrastructure, or secrets. Inspect first, ask only material questions, record decisions, and move through explicit approval gates.

## Start every run

1. Determine the request mode:
   - `new`: create a site from scratch;
   - `redesign`: improve an existing site or codebase;
   - `audit`: inspect and recommend without mutating unless the user also asks to implement;
   - `resume`: continue from `.site-builder/project.yaml`.
2. Inspect available context before asking questions: repository files, current site, screenshots, briefs, copy, assets, analytics, issues, `AGENTS.md`, and `CLAUDE.md`.
3. Read `.site-builder/project.yaml` when it exists. Treat it as the project state, but verify stale facts against the repository and live systems when relevant.
4. Preserve unrelated user changes. Never replace an existing implementation merely to match the starter assets.
5. Report the inferred mode, current phase, known facts, and the next decision in a compact update.

For a new project, copy `assets/project.yaml` to `.site-builder/project.yaml` and fill only known, non-secret fields. Copy `assets/env.example` to the project's chosen env example only when deployment or integrations require it.

## Conversation contract

- Explore discoverable facts before asking the user.
- Ask at most three short, high-impact questions per round.
- Prefer the environment's native structured question UI when available; otherwise ask concise numbered questions in chat.
- Offer a recommended option first and explain the consequence of each real alternative.
- Do not ask a question already answered in the conversation or project state.
- After each answer round, summarize decisions and update `project.yaml` when writes are in scope.
- If the user says to use best judgment, choose the recommended defaults, record them under `assumptions`, and continue.
- Stop for a decision only when alternatives materially change the outcome, cost, public behavior, data handling, or deployment.
- Ask before production deployment, public GitHub writes, destructive changes, paid services, or sending data to third parties unless the user already authorized that exact action.

## State machine

Use these phases in order unless the request is a bounded audit or the project already completed earlier phases:

1. `discovery`
2. `brief`
3. `research`
4. `copy`
5. `design`
6. `architecture`
7. `build`
8. `qa`
9. `deploy`
10. `handoff`

Record `workflow.phase`, `workflow.status`, `open_questions`, `assumptions`, and approval states in `.site-builder/project.yaml`. On resume, continue from the first incomplete phase instead of restarting.

## Approval gates

Do not silently cross these gates:

1. `brief`: audience, problem, offer, proof, CTA, scope, and languages are approved.
2. `copy`: page structure and production copy are approved.
3. `design`: one of three live HTML directions is selected and its transferable principles are recorded.
4. `pre_production`: implementation scope, stack, modules, acceptance criteria, and deployment target are approved.
5. `deploy`: checks pass and the user authorizes the specific production action.

An approval can be an explicit user statement or a prior approval recorded with evidence and a date. A vague positive reaction is not approval to deploy.

## Phase routing

### Discovery and brief

Read `references/discovery.md`. Establish the business outcome, audience, offer, proof readiness, primary CTA, content owner, page scope, languages, integrations, constraints, and success measures. For redesigns, distinguish what must remain, what may change, and what is broken.

### Research

Read `references/competitor-research.md`. Research competitors and references by property, not by copying entire sites. Separate observed evidence, inference, inspiration, and conversion hypotheses. Never claim a source was reviewed unless it was opened or provided.

### Conversion copy

Read `references/conversion-copy.md`. Build the message hierarchy, claim ledger, page narrative, objections, proof plan, CTA architecture, forms, and final copy. Do not invent metrics, testimonials, clients, guarantees, legal details, or urgency.

### Design

Read `references/design-directions.md`. Create three genuinely different live HTML directions using approved copy and realistic content volume. Keep them framework-independent unless the user asks otherwise. Record why the selected direction fits the audience and offer before production transfer.

### Architecture

Read `references/stack-selection.md`. Select the stack from requirements instead of habit. Record the decision, rejected alternatives, package manager, rendering model, data ownership, integrations, and deployment implications.

### Build

Implement only the approved direction and modules. Prefer semantic HTML, accessible components, content-driven height, reusable tokens, and one responsive structure. Keep optional modules optional. Preserve the project's established conventions unless they conflict with an approved requirement.

### Responsive motion and QA

Read `references/responsive-motion.md`. Validate width, height, aspect ratio, content growth, keyboard, touch, reduced motion, intermediate animation states, no-JS/recovery behavior where relevant, SEO, performance, forms, build, and production-like runtime.

### GitHub workflow

Read `references/github-workflow.md` when GitHub tracking or publication is requested. If a compatible `manager` skill is installed and configured, use it rather than duplicating its issue synchronization contract. Otherwise use the documented fallback. Never make `manager` a hard dependency.

### Deployment and handoff

Read `references/deployment.md`. Ask which deployment model applies unless project instructions already decide it. Do not default strangers to a particular host. Run the relevant preflight, backup, build, health check, and rollback procedure. Finish with verified URLs, open risks, operations notes, and project-state updates.

## Privacy boundary

- Never copy secrets or private infrastructure values into the skill, tracked project state, issue bodies, PR descriptions, examples, or final reports.
- Store only environment variable names in tracked examples. Keep values in ignored local files or the user's secret manager.
- Do not expose absolute home paths, private key paths, server addresses, account IDs, private webhook URLs, personal contact details, or unrelated browser content.
- Check secret presence without printing values.
- Before public commits or distribution, run `scripts/scan-private-data.sh` on the intended scope and add user-specific forbidden terms through `--term` or `--terms-file`.
- Run `scripts/validate-config.sh` after creating or changing `project.yaml`.
- Treat public-repository publication as a separate privacy gate.

## Portable behavior

Use capability descriptions rather than hard-coded tool aliases. In Codex and Claude Code:

- use the available filesystem/search/browser/GitHub tools that truthfully support the task;
- fall back to normal chat questions if structured input is unavailable;
- do not require platform-specific frontmatter or command interpolation;
- honor both `AGENTS.md` and `CLAUDE.md`; surface conflicts instead of choosing silently;
- keep the canonical workflow in this skill, not in platform wrappers.

## Bundled resources

- `assets/project.yaml`: public project-state template.
- `assets/env.example`: names-only environment template.
- `assets/gitignore.snippet`: ignore rules for local env and private project state.
- `assets/design-handoff/`: neutral handoff documents for external design exploration.
- `assets/github-templates/`: optional issue and PR templates.
- `assets/deploy/`: neutral VPS templates; use only when the user chooses VPS.
- `scripts/install.sh`: install the same skill for Codex, Claude Code, or both.
- `scripts/validate-config.sh`: validate state structure and reject obvious private values.
- `scripts/scan-private-data.sh`: scan intended publication scope for common secrets and user-supplied forbidden terms.

Do not copy every asset into every project. Use only the resources selected by the approved scope.
