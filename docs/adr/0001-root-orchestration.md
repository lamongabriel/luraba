# ADR 0001: Root orchestration over package-local duplication

## Status

Accepted

## Decision

Keep `api/` and `ui/` independently installable with their own manifests and lockfiles. Put integrated local development in the root: one Compose application, root-owned development Dockerfiles, named health probes, setup/doctor scripts, and explicit package delegation.

## Rationale

The root can coordinate database setup, migrations, baseline data, hot reload, ports, and diagnostics without coupling application behavior or lockfiles. Developers can still run each package directly, while the integrated workflow has one discoverable command surface. This avoids duplicating orchestration in every package and preserves the existing API-local Compose workflow for backend-only work.

## Consequences

- There is no `pnpm-workspace.yaml` and no recursive/filter install.
- Root host ports are UI `29670`, API `22677`, and PostgreSQL `29762`, with `LURABA_*_PORT` overrides.
- Root Compose is the only UI container workflow; production deployment files remain outside this decision.
- Package behavior and package lockfiles remain owned by their package directories.
