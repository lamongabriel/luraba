# Luraba

Luraba is a self-hosted personal-finance workspace. It is a pnpm workspace and
Turborepo containing an Express API, a Next.js web application, and shared
contracts/domain packages.

## Quick start

Requirements: Node.js 22+, pnpm 10.28.2+, and Docker Compose v2.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Set `AUTH_SECRET` and `INTEGRATIONS_ENCRYPTION_KEY` in `apps/api/.env` before
starting the API. Generate them with `openssl rand -base64 32` and
`openssl rand -hex 32`, respectively. `pnpm dev` starts Postgres, applies all
migrations (including required reference data), and starts the API, web app,
and shared-package watchers.

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Postgres: `localhost:5432`

Use `pnpm seed:mock` only when you want optional demo data.

## Workspace commands

```sh
pnpm lint       # lint the complete workspace
pnpm format     # verify formatting
pnpm fix        # apply safe Biome fixes and formatting
pnpm check      # run all Biome checks
pnpm typecheck  # typecheck every package
pnpm test       # unit suites plus API integration tests
pnpm build      # production builds in dependency order
pnpm verify     # check, typecheck, test, and build
```

Run a package-specific command with pnpm filtering, for example
`pnpm --filter @luraba/api test:integration`.

## Self-hosting

The root [`compose.yaml`](compose.yaml) runs Postgres, migrations, API, and web
in production mode:

```sh
docker compose up --build -d
```

The API environment file is required for this Compose setup. Set public
origins and optional host-port overrides with `BASE_URL`, `FRONTEND_ORIGIN`,
`NEXT_PUBLIC_API_URL`, `API_PORT`, `WEB_PORT`, and `POSTGRES_PORT` as needed.

For Coolify, use [`compose.coolify.yaml`](compose.coolify.yaml). It generates
database and application secrets, exposes optional email/OAuth settings, and
serves the web app and API on one HTTPS domain. Follow the
[Coolify deployment guide](docs/coolify.md).

See [development](docs/development.md), [deployment](docs/deployment.md), and
[architecture](docs/architecture.md) for the complete guide. Contributions are
welcome—start with [CONTRIBUTING.md](CONTRIBUTING.md).
