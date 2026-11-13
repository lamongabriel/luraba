# Luraba

Luraba is a self-hosted personal-finance workspace. It is a pnpm workspace and
Turborepo containing an Express API, a Next.js web application, and shared
contracts/domain packages. `apps/mcp` is an MCP server that lets AI agents use a household
through a personal API key ([docs](docs/api-keys-mcp/mcp.md)).

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

### Dev commands

`pnpm dev` runs `scripts/dev.sh` (details and port safety in [docs/dev-runner.md](docs/dev-runner.md)):

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm dev:light` | Postgres, Redis, MinIO, migrate, then API, web, worker, MCP (`--light`: API + web only). Ctrl+C stops what it started. |
| `pnpm dev:stop` / `pnpm dev:doctor` | Stop a run (also after a crash) / show Docker, ports, containers. |
| `pnpm db` / `pnpm db:migrate` / `pnpm db:reset` | Start the database services / migrate / recreate `luraba_db`. |
| `pnpm db:studio` | Drizzle Studio on the local database. |
| `pnpm db:restore <file>` / `pnpm db:dump` | Load a `pg_dump -Fc` file into `luraba_db` (old one kept) / write one. |

Restoring a production dump brings real password hashes, tokens and email addresses onto your machine;
dev runs blank SMTP and web-push credentials by default so nothing is sent. See
[docs/dev-runner.md](docs/dev-runner.md#loading-production-data) for the safe flow and how to refresh the dump.

Use `pnpm down` to wipe the local Docker stack and start fresh. It removes the containers,
networks, locally built images and **all volumes** (Postgres, Redis and MinIO data), so every
record and uploaded file is lost. Run `pnpm dev` afterwards to recreate everything.

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
