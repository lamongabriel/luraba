# @luraba/db

Drizzle schema and database client shared by the API and the worker. Migrations are in
`apps/api/src/db/migrations`.

- One file per domain in `src/schemas/*.schema.ts`, imported by consumers as
  `@luraba/db/schemas/<name>.schema`. Register new files in `src/schema.ts`.
- Household-owned tables have `household_id uuid not null references households(id) on delete cascade`
  and an index on it, plus `created_at`/`updated_at`. That shape is what lets them extend
  `HouseholdScopedRepository`.
- User-created tables have a nullable `created_by_user_id uuid references users(id) on delete set null`
  (who created the row; see "Who created a record" in `apps/api/src/modules/README.md`).
- Child tables with no household column (`transaction_items`, entries, installments...) are only ever
  reached through a parent row already proven to belong to the household; their module README says so.
- Enum-like columns use zod enums from `@luraba/contracts` so the DB, API and web share one list
  (see `schemas/enums.schema.ts`).
- Money columns are `bigint` minor units; timestamps are `timestamp` without time zone in UTC.
- Rebuild after changes (`pnpm --filter @luraba/db build`); then write the matching SQL migration
  by hand (see `apps/api/README.md`).
