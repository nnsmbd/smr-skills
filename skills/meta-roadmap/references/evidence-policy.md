# Evidence policy

## Levels (provenance.level)

| level | means | typical evidence |
|---|---|---|
| `planned` | only a plan / recommendation exists | issue scope item, audit recommendation |
| `implemented` | code exists (any branch, incl. local — say "local, not pushed") | commit SHA, file paths |
| `tested` | tests for that code confirmed passing | "664/664 tests" in an issue record, CI run |
| `deployed` | released to a production instance | deploy record with instance + SHA |
| `verified` | checked on the target environment / manual acceptance recorded | smoke/acceptance record, doctor PASS for that feature |
| `done` | the item's own acceptance criterion (`doneWhen`) is recorded as met | closed issue with acceptance, explicit owner confirmation |

commit found ≠ production verified · tests green ≠ user flow accepted · deploy ≠ acceptance.

## Automatic minimums (enforced by `sync-core.mjs`)

| change | minimum level | otherwise |
|---|---|---|
| task → `done` | `done` | demoted to needs_verification |
| task → `in_progress` / `review` | `implemented` | demoted |
| milestone → `done` | `done` | demoted |
| release → `current` / `shipped` | `deployed` | demoted |
| any `confirmed` item without evidence | — | demoted |

Demoted items are still shown to the owner; they can accept them explicitly (`apply --ids`).

## Confidence

- `confirmed` — the evidence directly supports the change and nothing newer contradicts it.
- `needs_verification` — plausible but incomplete (e.g. local uncommitted work, a single secondary source, stale issue header).
- `conflict` — sources disagree; put both in `evidence` and explain in `reason`.

## Source priority

production evidence > merged/current code + tests > issue with current status/latest comment > commits/branches > audit/report > old board text. Dates beat rank when a lower-rank source is clearly newer and specific. Local unpushed work is real evidence of `implemented`, never of `deployed`.
