# Development

## Prerequisites

- Node.js 22 or newer
- pnpm 10.28.2 or newer
- Docker Engine or Docker Desktop with Compose v2

## First run

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Before the first run, replace the API template’s placeholder secrets:

```sh
openssl rand -base64 32
openssl rand -hex 32
```

Assign the first value to `AUTH_SECRET` and the second to
`INTEGRATIONS_ENCRYPTION_KEY`. OAuth, SMTP, and provider credentials are
optional for local development.

Run `pnpm dev`. It starts the `db` Compose service, migrates the database, and
runs every workspace development task through Turbo. There is no separate
setup, seed, or Docker development command.

## Commands

Root commands are workspace-wide. `lint`, `format`, `fix`, `check`,
`typecheck`, `test`, `build`, and `verify` always cover every package. Use
`pnpm --filter <package> <script>` for isolated work.

`pnpm test` starts Postgres when necessary, runs every unit suite, then runs the
API integration suite against `luraba_db_test`. Required currencies and system
payment methods are installed by migration, not a seed command.

`pnpm seed:mock` is deliberately optional. It loads a local demonstration user
and data only after migrations complete.

## Environment files

`apps/api/.env` contains API secrets, origins, and local database connection
settings. `apps/web/.env.local` contains browser-safe values only. Keep both
untracked. Application ports are `3001` for API and `3000` for web; Postgres
uses `5432`.

Compose accepts unprefixed host-port overrides: `API_PORT`, `WEB_PORT`, and
`POSTGRES_PORT`. Application configuration uses direct names such as `PORT`,
`DB_HOST`, and `NEXT_PUBLIC_API_URL` instead of project-prefixed aliases.
