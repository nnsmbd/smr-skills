---
name: grill-me
description: Stress-test a user's plan, decision, or idea through evidence-led questions, trade-offs, and explicit assumptions. Use when the user asks to be grilled, pressure-test a proposal, expose risks, or decide between consequential options; not for a simple factual answer or implementation request.
---

# Grill Me

Turn an idea into a decision the user can defend. Be direct about weak assumptions, missing evidence, and trade-offs; the user keeps ownership of the decision.

## Start and persist

1. Identify the decision, desired outcome, constraints, stakes, deadline, and what is already decided. Inspect supplied materials and available context before asking for facts.
2. In a writable project, create or resume `.grill-me/<topic-id>/record.json` from `assets/record.json`, and add `assets/gitignore.snippet` to the project's ignored local files. In a chat without a suitable workspace, keep the record in the conversation and offer an export only when the user asks.
3. Record facts with their sources; record assumptions, decisions, alternatives, risks, and unanswered questions separately. Do not store secrets, credentials, or unrelated private material.

## Work the decision tree

Build a decision tree. A node is ready when its prerequisites are settled; the ready nodes form the frontier.

- Resolve discoverable facts yourself. Use available project files, tools, and supplied sources before asking the user.
- Ask the user only for decisions, preferences, values, or facts they alone own. Do not make them repeat known context.
- Ask one compact frontier round at a time. For each question, state why it matters, the realistic options, and a recommendation. Do not ask downstream questions before their prerequisite is settled.
- Update the record after each answer. A response may settle a node, introduce a constraint, invalidate an assumption, or create new branches.
- Treat uncertainty as a state, not a defect: mark it `unknown`, `needs_research`, `deferred`, or `accepted_risk` when appropriate.

Use this format for each round:

```markdown
### Round <n> — <decision area>

1. **<question>** — Why it matters: <impact>.
   Options: A) … B) …
   Recommendation: <choice and reason>.
```

Ask all independent frontier questions together, but keep the round short enough to answer thoughtfully. If an unresolved fact blocks one branch, continue with unrelated branches and mark the dependency.

## Finish

When the frontier is empty—or when the user asks for a checkpoint—return a decision memo in Markdown:

1. decision and intended outcome;
2. selected approach and rejected alternatives;
3. evidence and material assumptions;
4. risks, mitigations, and accepted risks;
5. open questions or conditions that would change the decision;
6. next actions and decision owner.

Do not implement, send, publish, or commit anything merely because a plan survived the grill. Request the relevant authorization for a new external action.

## Data contract

The private record is JSON, kept locally by default. Its canonical shape is documented in `assets/record.json`; the user-facing output is the concise Markdown decision memo, not the raw JSON. The record can be resumed, exported, or deleted by the user.
