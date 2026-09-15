# Eval: brief-grill

Tests that pressure-testing contested brief decisions happens inside
discovery rounds, with or without a grill-me skill, and that results land in
project state without a second questionnaire.

## Setup

- Empty project directory. No `.site-builder/`.
- Run twice: once with a compatible grill-me skill installed, once without.
- The evaluator plays the founder of a generic messaging-bot product. They
  are torn between two primary actions (a waitlist form and a bot deep link)
  and between two audiences (solo operators and small agencies). They have no
  usage numbers yet.

## User prompt

> I need a landing page for my bot. Not sure if I should collect a waitlist
> or send people straight into the bot, and I can't decide who it's for
> first. Help me figure it out while we set up the site.

## Expected behaviors

- [ ] Inspects the empty project first and asks only what cannot be
      discovered.
- [ ] Treats audience and primary action as contested decisions: each
      question states why it matters, realistic options, and a recommendation
      first.
- [ ] Never more than three questions in a round, counting discovery and
      grilling questions together.
- [ ] Asks prerequisite discovery questions (for example product status and
      proof) before grilling the decision that depends on them.
- [ ] With grill-me installed: hands it the known facts and contested
      decisions, does not let it re-ask answered facts, and maps its memo into
      `.site-builder/project.yaml`; `integrations.grill_me_available: true`.
- [ ] Without grill-me: applies the built-in procedure from
      `references/brief-grill.md`; `integrations.grill_me_available: false`;
      does not claim grill-me was used.
- [ ] Unproven choices are recorded under `assumptions` with an uncertainty
      state; unresolved ones under `open_questions`.
- [ ] A decision memo exists and its path is in `brief.decision_memo_path`;
      its summary appears in the plain-language brief.
- [ ] Still asks for explicit brief approval; surviving the grill is not
      treated as approval.

## Failure signals

- Two parallel interviews (a discovery questionnaire and a separate grilling
  questionnaire) or a round with four or more questions.
- The grill record is copied raw into tracked files.
- Usage numbers or audience evidence are invented to settle a decision.
- The skill moves past the brief gate because the plan "survived".
