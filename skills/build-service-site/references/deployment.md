# Deployment and handoff

## Contents

1. Select a deployment model
2. Common preflight
3. VPS path: static
4. VPS path: Node
5. Other providers
6. Handoff

## Select a deployment model

Use project instructions when they explicitly decide the target. Otherwise ask the user to choose among an existing host, managed platform, static host, VPS, or another environment. Recommend based on runtime needs, operations capacity, cost, and existing infrastructure.

Never embed another user's deployment preference or server details in a generated project.
Merge the applicable rules from `assets/gitignore.snippet` before creating any local env file.

## Common preflight

- identify the exact repository, branch, commit, environment, domain, and rollback owner;
- confirm secrets exist without printing them;
- verify database/storage migrations and backups when applicable;
- run tests, typecheck, lint, and production build;
- never silence a failing typecheck, lint, or build (for example by deleting generated types) to get a release out; investigate the failure;
- deploy only a committed state; the templates refuse a dirty working tree unless `DEPLOY_ALLOW_DIRTY=1` is set deliberately;
- confirm the revision running in production is an ancestor of the release commit, so a diverged branch cannot silently remove shipped work; the templates enforce this and accept `DEPLOY_ALLOW_NON_DESCENDANT=1` only after the user confirms the rollback is intended;
- confirm environment-specific URLs, callbacks, CSP, analytics, email, and forms;
- run the publication privacy scan;
- confirm DNS resolves to the intended target and TLS certificate validity (issued and not near expiry);
- confirm free disk space on the target for at least one more release plus logs;
- confirm the rollback path was exercised at least once before the first production deploy, not only documented;
- obtain explicit authorization for the specific production action.

## VPS path: static

Default for a landing page (see `references/stack-selection.md`). Set `deployment.runtime: vps_static`. Use `assets/deploy/vps-static-deploy.sh.template`, `assets/deploy/vps-static-rollback.sh.template`, and either `assets/deploy/vps-nginx-static.conf.template` or `assets/deploy/Caddyfile.template`.

Minimum behavior:

- build locally or in CI, never on the server;
- ship a complete, versioned artifact via `rsync` into `releases/<timestamp>-<sha>` on the server; never assume the server is a Git checkout;
- switch a `current` symlink to the new release directory atomically (symlink swap, not an in-place copy);
- health check requests `/version.txt` (or an equivalent marker) and confirms it equals the deployed commit SHA before declaring success;
- keep the last N releases (`deployment` config or `DEPLOY_RELEASES_TO_KEEP`) and prune older ones after a successful health check;
- roll back by pointing `current` at the previous kept release and re-running the health check;
- TLS via ACME (certbot) when using nginx, or automatic TLS when using Caddy;
- security headers, gzip, immutable caching for hashed assets, and no-cache for HTML as set in the bundled config templates — adapt CSP to the project's actual third-party origins before shipping.

## VPS path: Node

Use only when `references/stack-selection.md` establishes that a server runtime is required. Set `deployment.runtime: vps_node`. Use `assets/deploy/vps-deploy.sh.template`, `assets/deploy/vps-nginx.conf.template`, and `assets/deploy/vps-systemd.service.template`.

Minimum behavior:

- reverse proxy and TLS plan (same header and cert requirements as the static path);
- service runs as an unprivileged, purpose-created user with a hardened systemd unit (`ProtectSystem=strict`, `ProtectHome=true`, `NoNewPrivileges=true`, `PrivateTmp=true`, a narrow `CapabilityBoundingSet=`, `RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX`, and an explicit `ReadWritePaths=` limited to what the app writes);
- environment stays outside the repository;
- pre-deploy backup or immutable previous release;
- build completes before service restart;
- restart is triggered through the narrowest privilege escalation that works: a sudoers entry scoped to `systemctl restart <that one service>` only, or a user-level (`--user`) systemd unit that needs no elevation at all — never a blanket sudo grant;
- health check after restart confirms the deployed commit SHA (via `/version.txt` or a response header), not just an HTTP 200;
- rollback restores a known working artifact and is re-verified with the same SHA check;
- ownership, logs, disk space, and restart policy are documented.

Do not assume the server is a Git checkout. Deploy a complete, versioned artifact and preserve only explicitly designated runtime data.

## Other providers

Use provider-native deployment only after verifying current official documentation and project constraints. Record build command, output/runtime model, env setup, redirects, domain/DNS, preview behavior, rollback, and ownership. Do not describe a push as a deployment unless an active pipeline actually performs it.

## Handoff

Finish with:

- verified production and admin URLs where applicable;
- deployed commit and time;
- health-check result, including the SHA it verified;
- rollback procedure, confirmed tested;
- env variable names and their owner, not values;
- content editing process;
- analytics and form verification per `references/measurement.md`, including `analytics.verified`;
- experiments backlog path (`analytics.experiments_path`) for post-launch hypotheses;
- QA report path (`qa.screenshots_path`) for the recorded visual/functional QA evidence;
- known limitations and next issues;
- updated `.site-builder/project.yaml` with deploy approval and outcome.
