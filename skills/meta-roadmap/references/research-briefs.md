# Research briefs for Sonnet subagents

Launch in parallel (`model: sonnet`, background). Fill `{since}`, `{open_items}` (id — title — technicalTitle — status — provenance.level) from `board.mjs pull`. Every brief ends with: read-only, never push/comment/deploy, never open `.env`/token/secret files, cite sources with dates, mark UNCERTAIN instead of guessing.

## A. GitHub delta
Repos nnsmbd/meta-agent-template and nnsmbd/meta-mcp (`gh` is authenticated). Since {since}: issues/PRs created or updated (`gh issue list --state all --search "updated:>={since}"`), every new comment (`gh api repos/<r>/issues/comments?since={since}T00:00:00Z`), branches with new commits (`gh api repos/<r>/commits?sha=<branch>&since=…`), tags/releases. For each fact: date, source URL/SHA, one line on what it implies for a roadmap. Say "nothing new" per source when so. ≤700 words.

## B. Evidence level of open items
For each of {open_items}: determine the level (planned / implemented / tested / deployed / verified / done) using exactly the definitions in evidence-policy.md, with the exact evidence (issue comment URL, SHA, test count, date). Flag CONFLICT when sources disagree (e.g. issue header vs latest comment). Table, ≤900 words.

## C. Off-GitHub work and records
List session folders `~/Documents/Codex/<date>/*/` with dates ≥ {since}. For each related to Meta Agent: `outputs/*.md` summaries, and read-only `git -C <work>/<repo> status --short` / `log -3` / `branch --show-current` for working copies (uncommitted files = local work in progress). Audit or report files: new findings or changed recommendations. Never open `.env`, `*token*`, `*secret*`, `*.key`. ≤600 words.

## Optional D. Plain-language check
When new technical items appear: for each, a plain Russian explanation (what it is, why it matters to users/business, when it's done) grounded in the source. ≤800 words.
