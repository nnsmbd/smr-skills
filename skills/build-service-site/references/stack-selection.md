# Stack and architecture selection

## Contents

1. Decision inputs
2. Selection guidance
3. Architecture record

## Decision inputs

Determine:

- static versus frequently changing content;
- forms, server APIs, authentication, admin, payments, search, or personalization;
- content editor and publishing workflow;
- expected integrations and data ownership;
- localization requirements;
- motion and media complexity;
- deployment constraints, team skills, budget, and maintenance horizon.

## Selection guidance

- Prefer a static-first approach for content-led sites without private server behavior.
- Use a server-capable framework when forms require private processing, auth/admin exists, or runtime data is essential.
- Add a CMS only when a named content owner needs independent editing and the operational cost is justified.
- Add a database only when durable structured data cannot live safely in an existing system.
- Select one package manager and one authoritative lockfile.
- Use the existing stack for redesigns when it can meet the approved requirements without disproportionate risk.
- Avoid new animation libraries when the current stack supports the selected motion system.

Do not select a platform merely because a starter exists. Do not force a VPS, managed platform, static host, or serverless model without the user's constraints.

## Architecture record

Record in project state and a short decision document:

- selected stack and version constraints;
- rendering and routing model;
- content and data sources;
- form and integration flow;
- package manager;
- optional modules enabled;
- deployment model;
- rejected alternatives and reasons;
- migration and rollback concerns;
- verification commands.

The pre-production gate requires this record, the final module list, acceptance criteria, and a deployment target class. Secret connection values are not part of the record.
