---
name: develop-luraba
description: Coordinate Luraba root orchestration and isolated API/UI package work. Use for setup, diagnostics, Docker/database workflows, cross-package changes, local ports, skills, or deciding whether a change belongs in the root, api, or ui package.
---

# Develop Luraba

Use the root repository for orchestration, documentation, diagnostics, and skills. Treat `api/` and `ui/` as independently installable packages with their own manifests, lockfiles, commands, and application ownership.

## Workflow

1. Read the root `AGENTS.md`, `README.md`, and relevant package guidance before changing files.
2. Run `pnpm run doctor` before diagnosing local setup. It is read-only and warns about dirty package work.
3. Route ownership before editing:
   - Root: Compose, scripts, `config/`, docs, and `.agents/skills/`.
   - `api/`: Express behavior, contracts, database schema/migrations/seeds, and backend tests.
   - `ui/`: Next.js pages, components, client state, browser behavior, and UI tests.
4. Keep package installs explicit: `pnpm install --frozen-lockfile`, `pnpm --dir api install --frozen-lockfile`, and `pnpm --dir ui install --frozen-lockfile`.
5. Use root commands for the integrated stack: `pnpm dev`, `pnpm down`, `pnpm logs`, `pnpm status`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:seed:mock`, and confirmation-gated `pnpm db:reset`.
6. Use package commands directly for isolated work, for example `pnpm --dir api typecheck` or `pnpm --dir ui test`.

## Boundaries and safety

- Do not use pnpm recursive or filter commands; package isolation is intentional.
- Do not rewrite, clean, reset, switch, commit, or push package work unless the user explicitly requests it. Preserve existing env and credential files byte-for-byte.
- Root host defaults are UI `29670`, API `22677`, and PostgreSQL `29762`; override with `LURABA_UI_PORT`, `LURABA_API_PORT`, and `LURABA_DB_PORT`. Container ports remain 3000, 8080, and 5432.
- Optional Google/GitHub OAuth, SMTP, Brandfetch, and external FX providers may be unavailable; basic local startup should remain usable and API health may be degraded.
- The root Compose application is the canonical integrated workflow. The API package's local Compose file remains available with the same env-driven port defaults. There is no UI-local Compose workflow.

## Plane and branches

Plane is documentation-only at https://plane.apps.automatearmy.com/. Never create, mutate, transition, label, or comment on work items without explicit authorization. When a work-item key is supplied, use that exact uppercase key as the branch name in every affected package; do not add a slug. Draft tickets conversationally unless the user explicitly requests an external action.

## Skills

Canonical project skills live in `.agents/skills`; Claude Code and Kilo Code use the generated relative links in `.claude/skills` and `.kilocode/skills`. Codex and OpenCode consume `.agents/skills` directly. Run `pnpm skills:list`, `pnpm skills:install`, or `pnpm skills:update` explicitly and review the resulting diff.
