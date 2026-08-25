# ADR 0001: Root pnpm workspace and Turbo orchestration

## Status

Accepted

## Decision

Keep one pnpm workspace with applications under `apps/` and focused shared packages under `packages/`. Use Turbo for dependency-aware task orchestration while keeping database infrastructure and application internals private to `apps/api` and frontend implementation private to `apps/web`.

## Rationale

The root coordinates database setup, migrations, baseline data, hot reload, ports, diagnostics, CI, and releases without duplicating installation or task wiring. Compiled `@luraba/contracts` and `@luraba/domain` packages make the API/web boundary explicit and ensure development and production resolve the same exports.

## Consequences

- `pnpm-workspace.yaml` and the root `pnpm-lock.yaml` are authoritative.
- `apps/api` is `@luraba/api`; `apps/web` is `@luraba/web`.
- `packages/contracts` is the public HTTP contract boundary; `packages/domain` is framework-free finance logic.
- Turbo tasks use workspace dependencies and `^build` ordering.
- Root host ports are UI `29670`, API `22677`, and PostgreSQL `29762`, with `LURABA_*_PORT` overrides.
- Root Compose is the integrated development workflow. App-local Compose files remain available for focused backend workflows.
- Release Please tracks one repository version from the root manifest.
