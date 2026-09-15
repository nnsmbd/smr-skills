# Refinement log

Record every iteration made against the selected direction, the approved external design, or the approved existing-brand plan, after the design gate. See `references/design-directions.md` "Refinement after selection" for the rules this log enforces: checkpoint accepted states, roll back rejected ones instead of patching over them, and log every deviation from the mockup or spec.

## Iteration template

Copy this block per iteration.

- **Iteration:** #
- **Date:**
- **Scope:** page/section/component touched
- **Change:** what was changed and why, in one or two sentences
- **Checkpoint ref:** git commit SHA or tag, or saved-copy path, for this accepted state
- **Owner verdict:** accepted / rejected / pending
- **Rollback target (if rejected):** checkpoint ref to restore instead of patching
- **Deviations from mockup/spec:** each deviation with its reason; "none" if there are none
- **Unverified by emulation:** what headless screenshots or synthetic gestures did not check for this iteration, to hand to the real-device pass

## Log

| Iteration | Date | Scope | Change | Checkpoint ref | Owner verdict | Rollback target | Deviations | Unverified by emulation |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | pending | | | |
