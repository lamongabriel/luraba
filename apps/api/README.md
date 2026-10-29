# @luraba/api

Express 5 API (ESM, `@/` path alias to `src/`). Drizzle on Postgres, Better Auth for sessions,
BullMQ producers for the worker, S3-compatible storage for uploads.

```
src/
  app.ts, server.ts   Express app and process entry
  config/             env parsing (zod), permission helpers, per-domain config
  db/                 Drizzle client, migrations (hand-written SQL + meta/_journal.json), mock seed
  middleware/         access.middleware.ts (requireAccess), error handling, logging
  modules/            one folder per domain: see modules/README.md
  routes/v1.routes.ts mounts every module router under /api/v1
  shared/             base controllers/repositories, list helpers, errors, responses: see shared/README.md
  test/               test helpers: see test/README.md
```

## Request lifecycle

`router` -> `requireAccess({ permission })` (resolves the session, then the household from the
`X-Household-Id` header, route param or the user's default, and checks the role's permission) ->
controller (parses params/query/body with the contract's zod schemas, validates the response) ->
service -> repository.

Errors are thrown as the classes in `shared/errors.ts` (`NotFoundError` 404, `ConflictError` 409,
`ValidationError` 422, `ForbiddenError` 403, `DependencyUnavailableError` 503...) and turned into the
API envelope by the error middleware.

## Environment

All variables are parsed in `src/config/env.ts` (copy `.env.example` to `.env`). Optional features
stay off until their variables are present: SMTP, web push, SMS, Redis, Brandfetch, social login.
File storage defaults to the bundled MinIO (`USE_MINIO=true`); see [docs/storage.md](../../docs/storage.md).

## Migrations

Add `src/db/migrations/NNNN_name.sql` by hand, add its entry to `migrations/meta/_journal.json`
(next `idx`, a `when` larger than the previous one) and update the Drizzle schema in `packages/db`.
Run `pnpm db:migrate`. Reference data the product needs is part of migrations, not seeds.

## Adding an endpoint

1. Contract in `packages/contracts/src/<module>/` (see its README), register it, update the
   contract inventory test.
2. Permission if needed (`packages/contracts/src/permissions.ts`).
3. Repository -> service -> controller -> route -> mount in `routes/v1.routes.ts`.
4. Integration test in `modules/<module>/__tests__/`.
5. Web service/query/mutation (see `apps/web/README.md`).
