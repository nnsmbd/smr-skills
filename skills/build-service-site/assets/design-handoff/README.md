# Design handoff folder

## Contents

1. Purpose
2. Folder structure
3. Single source of truth

## Purpose

This folder is the neutral package that carries design decisions from discovery through build, regardless of `design.source` (`directions`, `external`, or `existing`). Copy only the files a given project actually needs; do not ship empty placeholders into the project repository.

## Folder structure

| Path | Purpose |
|---|---|
| `site-context.md` | Business, scope, and existing-project facts; design source and brand assets location. |
| `copy.md` | Locked production copy. Design must fit this copy, not the other way around. |
| `design-tokens.css` | Copy of the project's filled token file (`design.tokens_path` points here once copied into the project). Treat the in-project copy as authoritative once build starts. |
| `references.md` | Reference cards: transferable properties, not sources to copy outright. |
| `screens/` | Current screenshots (redesign) or the owner's/external design's screenshots and exports. The read-only record of what was supplied or what existed before. |
| `current-code/` | Relevant current code for an `existing`-source redesign — the baseline the targeted diffs are measured against. |
| `result/` | The delivered design session output: `index.html` (or equivalent) plus `DESIGN-NOTES.md` explaining what it contains and any open items. |
| `design-decision.md` | The decision record: selected source, tokens, forbidden styles, signature elements, image processing parameters, motion budget, approval. |
| `refinement-log.md` | Numbered iterations after selection, checkpoints, owner verdicts, rollbacks, and deviations from the mockup/spec. |
| `signature-element.md` | One copy per signature interactive/animated element, filled from the template before that element is built. |
| `legal-pages.md` | Legal page structure and placeholders (privacy, terms, cookie notice) — not project-specific, generally usable as-is. |

Not every project populates every path. A `directions`-sourced project may have no `current-code/`; a small `existing` redesign may need no `signature-element.md`. Add the paths the project actually uses to `.site-builder/project.yaml` (`design.brand_assets_path`, `design.tokens_path`, `design.refinement_log_path`, `design.signature_elements`).

## Single source of truth

Exactly one live token file and one live design record exist at a time.

- When a new export or prototype supersedes an older one, mark the older one stale immediately — rename its folder with a `STALE-` prefix or add a note at the top of its main file. Do not leave two folders that both look current.
- `design-tokens.css` in this folder is a copy for handoff review; the file inside the project (`design.tokens_path`) is authoritative once build starts. Do not keep editing the handoff copy after that point without also updating the project copy.
- If in doubt which of two files is current, that is itself a defect — fix the labeling before continuing design or build work.
