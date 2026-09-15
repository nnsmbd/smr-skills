# Stack and architecture selection

## Contents

1. Decision inputs
2. Selection guidance
3. Landing page default: static build
4. When a server runtime is required
5. Architecture record

## Decision inputs

Determine:

- static versus frequently changing content;
- forms, server APIs, authentication, admin, payments, search, or personalization;
- content editor and publishing workflow;
- expected integrations and data ownership;
- localization requirements;
- motion and media complexity;
- deployment constraints, team skills, budget, and maintenance horizon;
- **action adapter needs**: does the approved `primary_action`/`secondary_action` require private server processing? If so, which option — an existing endpoint the user already operates, a third-party form backend, a messenger/bot handoff, or a Node runtime this project stands up;
- **app domain separation**: does the product need its own app/dashboard domain or subdomain distinct from the marketing landing, with its own deployment lifecycle;
- **billing provider**: when a `checkout` adapter is in scope, which payment provider handles the transaction and legal terms, and whether it needs server-side webhooks.

## Selection guidance

- Prefer a static-first approach for content-led sites without private server behavior.
- Use a server-capable framework when forms require private processing, auth/admin exists, or runtime data is essential.
- Add a CMS only when a named content owner needs independent editing and the operational cost is justified.
- Add a database only when durable structured data cannot live safely in an existing system.
- Select one package manager and one authoritative lockfile.
- Use the existing stack for redesigns when it can meet the approved requirements without disproportionate risk.
- Avoid new animation libraries when the current stack supports the selected motion system.

Do not select a platform merely because a starter exists. Do not force a VPS, managed platform, static host, or serverless model without the user's constraints.

## Landing page default: static build

Default a service or product landing page to a static build (for example Astro or Vite) served as plain files. Static-first keeps the attack surface, hosting cost, and operational load minimal, and is compatible with every CTA adapter that does not need private server processing (`bot_deeplink`, `external`, most `booking` embeds, forms routed to a third-party form backend or an existing endpoint the user already operates).

Record `deployment.runtime: vps_static` (or the equivalent managed static host) whenever the approved requirements fit this default.

## When a server runtime is required

Choose a server runtime — `deployment.runtime: vps_node` or an equivalent managed runtime — only when one of the following is actually in the approved scope:

- server-side rendering (SSR) or per-request personalization the static build cannot express;
- private form processing that must run on infrastructure the project itself owns (no existing endpoint or third-party form backend fits);
- authentication, an authenticated admin area, or session-bound logic;
- payments or other server-side business logic (webhook handling, entitlement checks);
- Meta Conversions API or another server-side analytics call (see `references/measurement.md`).

If none of these apply, keep the runtime static even when the project also has a bot or an external signup — those are adapters, not server requirements. Record the reasoning for the choice, including rejected alternatives, in the architecture record.

## Architecture record

Record in project state and a short decision document:

- selected stack and version constraints;
- rendering and routing model;
- content and data sources;
- form and integration flow;
- package manager;
- optional modules enabled;
- deployment model and `deployment.runtime` (`vps_static`, `vps_node`, or another recorded value);
- rejected alternatives and reasons;
- migration and rollback concerns;
- verification commands.

The pre-production gate requires this record, the final module list, acceptance criteria, and a deployment target class. Secret connection values are not part of the record.
