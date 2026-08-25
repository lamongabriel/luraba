# Luraba

Luraba is a self-hosted personal finance workspace built as a pnpm/Turborepo
monorepo.

## Workspace

```text
apps/api             @luraba/api       Express API, database, migrations, seeds
apps/web             @luraba/web       Next.js application
packages/contracts   @luraba/contracts Public HTTP schemas and stable wire types
packages/domain      @luraba/domain    Framework-free finance primitives
```

The root `pnpm-lock.yaml` is authoritative. Applications must consume shared
code through the package exports rather than source-path aliases.

## Local Development

Requirements: Node.js 22+, pnpm 10.28.2+, and Docker with Compose v2.

```sh
pnpm install
pnpm setup
pnpm dev
```

`pnpm dev` starts Postgres, applies API migrations, and runs the API, web app,
and shared-package watchers through Turbo. The default host ports are:

- Web: `http://localhost:29670`
- API: `http://localhost:22677`
- Postgres: `localhost:29762`

Use `pnpm dev:docker` for the fully containerized development stack. Use
`pnpm db:seed:mock` to load the local demo fixture.

## Commands

```sh
pnpm check                 # workspace Biome checks through Turbo
pnpm lint                  # workspace linting through Turbo
pnpm typecheck             # workspace TypeScript checks through Turbo
pnpm test                  # fast unit tests
pnpm test:api:integration  # API integration/database tests with Postgres
pnpm build                 # production builds in dependency order
pnpm validate              # check, typecheck, unit tests, and builds
pnpm --filter @luraba/api typecheck
pnpm --filter @luraba/web test
```

## Ownership

The API owns authentication integration, authorization policy, persistence,
database migrations, seeds, and internal domain services. The web app owns
presentation and browser state. Contracts contains only public HTTP boundaries,
stable enums, and runtime schemas. Domain contains framework-free finance
logic that is safe for both applications to consume.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for pull request checks and
[`docs/adr/0001-root-orchestration.md`](docs/adr/0001-root-orchestration.md)
for the workspace decision.
