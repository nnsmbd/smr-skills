# Deployment and handoff

## Contents

1. Select a deployment model
2. Common preflight
3. VPS path
4. Other providers
5. Handoff

## Select a deployment model

Use project instructions when they explicitly decide the target. Otherwise ask the user to choose among an existing host, managed platform, static host, VPS, or another environment. Recommend based on runtime needs, operations capacity, cost, and existing infrastructure.

Never embed another user's deployment preference or server details in a generated project.
Merge the applicable rules from `assets/gitignore.snippet` before creating any local env file.

## Common preflight

- identify the exact repository, branch, commit, environment, domain, and rollback owner;
- confirm secrets exist without printing them;
- verify database/storage migrations and backups when applicable;
- run tests, typecheck, lint, and production build;
- confirm environment-specific URLs, callbacks, CSP, analytics, email, and forms;
- run the publication privacy scan;
- obtain explicit authorization for the specific production action.

## VPS path

Use `assets/deploy/` only after VPS is selected. Adapt the templates to the project's runtime.

Minimum behavior:

- reverse proxy and TLS plan;
- service runs as an unprivileged user;
- environment stays outside the repository;
- pre-deploy backup or immutable previous release;
- build completes before service restart;
- health check after restart;
- rollback restores a known working artifact;
- ownership, logs, disk space, and restart policy are documented.

Do not assume the server is a Git checkout. Deploy a complete, versioned artifact and preserve only explicitly designated runtime data.

## Other providers

Use provider-native deployment only after verifying current official documentation and project constraints. Record build command, output/runtime model, env setup, redirects, domain/DNS, preview behavior, rollback, and ownership. Do not describe a push as a deployment unless an active pipeline actually performs it.

## Handoff

Finish with:

- verified production and admin URLs where applicable;
- deployed commit and time;
- health-check result;
- rollback procedure;
- env variable names and their owner, not values;
- content editing process;
- analytics and form verification;
- known limitations and next issues;
- updated `.site-builder/project.yaml` with deploy approval and outcome.
