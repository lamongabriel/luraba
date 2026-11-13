# Dev runner (`scripts/dev.sh`)

One script runs local development: Postgres, Redis and MinIO in Docker (only those), then the
API, web app, worker and MCP server natively with hot reload. `pnpm dev` is just
`./scripts/dev.sh up`. Bash 3.2 compatible (macOS default); sourcing the file only defines functions,
which `scripts/tests/dev-sh.test.sh` (`pnpm test:dev-sh`) relies on.

## Commands

| Command | What it does |
| --- | --- |
| `up` (default) | Containers -> migrate -> API, web, worker, MCP. Flags: `--no-web --no-worker --no-mcp --no-migrate --light --email`. `--light` = API + web only, Node capped at 4 GB. Ctrl+C stops everything this run started and only the containers this run had to start. |
| `stop [--stale]` | Stops the recorded run and frees dev ports held by this checkout. `--stale` only cleans up after a crashed run. |
| `doctor` | Docker status, dev ports 3000/3001/3333 (+ studio, postgres, redis, minio) and who holds them, containers, recorded run. |
| `db` / `db-stop` | Start / stop only Postgres, Redis and MinIO. |
| `db-reset` | Drops and recreates `luraba_db` after a `y/N`, then migrates. `luraba_db_test*` are never touched. |
| `migrate` | Applies pending migrations. |
| `generate <name>` | Scaffolds the next numbered SQL file and `_journal.json` entry. Migrations are hand-written here (`drizzle-kit generate` is broken); it never calls drizzle-kit. |
| `studio` | Drizzle Studio on the local database (see below). |
| `db:dump [file]` | `pg_dump -Fc` of `luraba_db` (default `./luraba_<timestamp>.dump`, git-ignored). |
| `db:restore <file> [--yes]` | Makes `luraba_db` become that dump (see below). |
| `db:snapshot [name]` / `db:snapshot-restore [name]` | Cheap local copy of `luraba_db` inside Postgres (`CREATE DATABASE ... TEMPLATE`) and the way back. |
| `worker`, `mcp` | One service only. |
| `clean-web`, `build`, `test`, `web-test`, `lint`, `lint-fix`, `typecheck`, `help` | Shortcuts. `test` runs the API integration suite through `apps/api`'s `test:integration` (`.env.test`), never against the dev database. |

State of a run lives in `node_modules/.cache/luraba-dev/run.state` so `stop` and the next `up`
clean up after a crash.

## Port safety

A stale process on 3000/3001/3333 is stopped only if it runs from this checkout (cwd or command
line under the repo root; a worktree nested in the root counts as another checkout). Anything else is
reported, and asked about only when a terminal is attached. Nothing unrelated is ever killed.

## Docker discovery

If the default Docker context does not answer, the script tries OrbStack
(`~/.orbstack/run/docker.sock`), `/var/run/docker.sock`, Docker Desktop, Colima and Rancher Desktop,
retries while the daemon starts, and prints how to start each if none works.

## Email and web push are off in dev

The local database may hold production data (real addresses, push subscriptions). `up`, `worker` and
`mcp` therefore blank the `SMTP_*` and `VAPID_*` variables for the processes they start (process
variables win over `apps/api/.env`), so nothing is emailed or pushed. Pass `up --email` to keep them.
Running the API by hand with `pnpm --filter @luraba/api dev` does **not** do this; blank them yourself.

## Database studio

`./scripts/dev.sh studio` prints `https://local.drizzle.studio?port=4983` and opens it. The UI is hosted
by Drizzle but talks to the local studio server (127.0.0.1) only; Safari and Brave block that, use
Chrome or Firefox. `drizzle-kit studio` cannot load `apps/api/drizzle.config.ts` because its CommonJS
schema loader cannot resolve the ESM-only `@luraba/contracts/*` imports in `packages/db`, so
`scripts/studio-config.mjs` bundles `packages/db/src/schema.ts` (workspace packages inlined) into
`apps/api/node_modules/.cache/studio` and writes a matching config. Change `STUDIO_PORT` to move it.

## Loading production data

`./scripts/dev.sh db:restore ~/luraba_prod.dump`:

1. Checks the dump with `pg_restore -l` and that the container is healthy (pg tools run inside it; no
   local Postgres install needed).
2. Restores into `luraba_db_restoring` (`--no-owner --no-privileges`). A failed restore leaves the
   current database untouched.
3. Terminates any connections to `luraba_db`, renames the current one to `luraba_db_pre_restore`
   (timestamped if that exists) and the restored one to `luraba_db`.
4. Runs `pnpm --filter @luraba/api db:migrate` so migrations newer than the dump apply, then prints
   row counts (users, households, accounts, transactions, credit_cards, bills, goals).

Confirmation is asked unless `--yes`; without a terminal `--yes` is required. Restart any running dev
API/worker/web afterwards, their connections are cut.

> **The restored data is real.** It holds password hashes, sessions, API keys, OAuth and integration
> tokens, and real email addresses. Keep dumps out of git (`*.dump` is ignored) and out of chats, and
> keep email off (the default above). Uploaded files are not part of the dump, so attachments and
> avatars 404 locally until matching objects exist in MinIO.

### Refreshing the dump from production

Run these on your own machine with your own SSH config (no hosts or credentials belong in the repo):

```sh
ssh <prod-host> "docker exec <db container> sh -c 'pg_dump -U \"\$POSTGRES_USER\" -Fc luraba_db' > /tmp/luraba_prod.dump"
scp <prod-host>:/tmp/luraba_prod.dump ~/luraba_prod.dump
ssh <prod-host> "rm /tmp/luraba_prod.dump"
./scripts/dev.sh db:restore ~/luraba_prod.dump
```
