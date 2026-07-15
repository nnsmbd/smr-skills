# GitHub workflow

## Contents

1. Mode selection
2. Optional manager integration
3. Fallback workflow
4. Publication safety

## Mode selection

Ask whether the user wants no GitHub tracking, Issues only, Issues plus Project, or a branch/PR workflow. Honor repository instructions and existing conventions.

## Optional manager integration

If a compatible `manager` skill is installed and configured, use it for issue lookup and synchronization. Let manager own its parent, weekly label, Project placement, body update, work-record, and commit-link rules. Do not copy those rules into issue comments independently.

If manager is absent, continue with the fallback. Do not block website delivery or pretend manager was used.

## Fallback workflow

For substantial work, use one website launch epic with phase tasks:

1. Brief and research.
2. Structure and copy.
3. Visual directions.
4. Architecture and implementation.
5. Responsive and motion QA.
6. Content and proof readiness.
7. Deployment and handoff.

Each task must contain:

- outcome and context;
- concrete scope and non-goals;
- observable checklist;
- acceptance criteria and verification commands;
- dependencies and sensitive-data warning;
- next step.

Search before creating a duplicate. Prefer a focused branch and draft PR for implementation. Stage only intended files, preserve unrelated changes, and run relevant checks before pushing.

Do not auto-close a delivery issue after local checks. Close only when its acceptance criteria and required published/runtime checks are complete and the user has authorized closure.

## Publication safety

Before public issues, commits, or PRs:

1. Review the exact diff.
2. Run `scripts/scan-private-data.sh` with project-specific forbidden terms.
3. Remove local paths, secrets, private URLs, account IDs, private evidence, and unrelated personal data.
4. Link only committed, pushed, and appropriately visible artifacts.
5. State what repository, branch, and visibility are targeted.

Public-safe issue templates are available in `assets/github-templates/` and must be adapted rather than copied blindly.
