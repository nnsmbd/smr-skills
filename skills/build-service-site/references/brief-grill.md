# Pressure-testing the brief

## Contents

1. Purpose and ownership
2. When to grill
3. With a compatible grill-me skill
4. Without grill-me
5. One interview, not two
6. Recording results

## Purpose and ownership

Discovery collects facts; grilling tests the decisions built on them. Use both in the same interview so the user is briefed once.

- `build-service-site` owns the question budget, round order, `.site-builder/project.yaml`, and every approval gate.
- A compatible `grill-me` skill, when installed, owns the decision tree, the evidence-versus-assumption split, and the decision memo for the contested decisions handed to it.
- The brief gate still needs the user's explicit approval. A decision that survived grilling is not approval to proceed.

## When to grill

Grill a decision only when its alternatives materially change the page, cost, public claims, or delivery:

- audience and buying situation, when more than one segment is plausible;
- positioning, offer, or product access model;
- primary action adapter, when two adapters compete (for example waitlist versus bot deep link);
- differentiation and the proof that must support it;
- scope and non-goals, when the launch scope is larger than the evidence or timeline supports;
- later, on request or when contested: design source, stack or runtime, deployment model.

Do not grill discoverable facts, cosmetic preferences, or decisions the user already approved with evidence — unless new evidence invalidates an assumption behind them.

## With a compatible grill-me skill

Check whether a compatible `grill-me` skill is installed. If it is:

1. Finish inspection first and pass the verified facts, known constraints, and already-approved decisions, so grill-me does not ask for them again.
2. Name the contested decisions as its topic and give it this skill's round limit: at most three questions per round.
3. Let grill-me keep its private record in its own ignored location. Do not copy that raw record into tracked files.
4. When grill-me returns a checkpoint or memo, map the results into project state (see Recording results) and continue discovery from the next missing brief field.
5. Record `integrations.grill_me_available: true`. Never report grill-me as used unless it actually ran.

## Without grill-me

Apply the same discipline inside discovery:

- Build a small decision tree from the brief fields. A node is ready when its prerequisites are settled; ask only ready nodes.
- For each contested question state why it matters, the realistic options, and a recommendation with its reason.
- Separate facts with sources from assumptions. Mark uncertainty as `unknown`, `needs_research`, `deferred`, or `accepted_risk` instead of forcing an answer.
- Name the weak point directly when an answer rests on an untested assumption, and say what evidence would settle it.
- Before the brief gate, write a short decision memo: decisions and rejected alternatives, evidence and material assumptions, risks and accepted risks, and conditions that would change a decision.

Record `integrations.grill_me_available: false`.

## One interview, not two

- Merge grilling questions into the current discovery round. Never run a separate questionnaire in parallel with discovery.
- Keep the round limit of three questions. A grilling question replaces a lower-priority discovery question in that round; it does not add a fourth.
- Use one question format for both: question, why it matters, options, recommended option first.
- Ask discovery questions whose answers a contested decision depends on first; grill the decision in the next round.
- Stop grilling a node when the user decides, delegates the choice (record it under `assumptions`), or accepts the risk.

## Recording results

`.site-builder/project.yaml` stays the source of truth for the site:

- settled decisions → the matching `brief`, `design`, `architecture`, or `deployment` fields;
- delegated or unproven choices → `assumptions`, with their uncertainty state;
- unresolved questions → `open_questions`;
- risks that constrain the page or launch → `brief.constraints` or `brief.non_goals`;
- the decision memo → a project document whose path is stored in `brief.decision_memo_path`.

Include the memo summary in the plain-language brief shown at the brief gate. Keep private evidence out of tracked files.
