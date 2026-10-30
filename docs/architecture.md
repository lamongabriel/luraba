# Architecture

Luraba is a single product release composed of four workspace packages:

| Area | Responsibility |
| --- | --- |
| `apps/api` | Express endpoints, authentication integration, authorization, database access, migrations, and service internals |
| `apps/web` | Next.js UI, browser state, form state, and contract-backed API services |
| `apps/worker` | BullMQ consumers and scheduled jobs: notification delivery over email, web push, and SMS |
| `packages/contracts` | Public HTTP endpoint definitions, request schemas, response resources, and wire types |
| `packages/db` | Drizzle schema and database client shared by the API and worker; migrations live in `apps/api` |
| `packages/queue` | Queue and job names, job payload schemas, and producer helpers shared by the API and worker |
| `packages/storage` | Provider-agnostic object storage (S3, R2, GCS, MinIO) used by the uploads module |
| `packages/domain` | Framework-free finance, date, and recurrency primitives shared safely between applications |

The API owns persistence. The contracts package owns the public REST boundary.
The web app must not redefine Luraba HTTP request, response, or resource types.
Better Auth SDK routes remain outside the REST contract registry.

Date parsing, formatting, timezone ranges, and calendar helpers live in
`packages/domain/src/date.ts`; applications import them from `@luraba/domain`.
Generic schedules live in `packages/domain/src/recurrency.ts`, where a rule can
be bounded by occurrences, an end date, or a requested range and mapped into a
module-specific result.

Required product reference data is part of the database migration history. Mock
fixtures are development-only and never required for a working application.

## Background jobs

The API never talks to email, push, or SMS providers. When something notable
happens it saves a notification and its pending deliveries in Postgres, then
enqueues one BullMQ job per delivery in Redis (the delivery id is the job id, so
a delivery is never queued twice). `apps/worker` consumes the queue, sends,
and records the outcome; failed sends retry with exponential backoff. Postgres is
the source of truth: a recurring sweep in the worker re-queues any delivery that
is still pending after two minutes, so a Redis outage or crash cannot lose an
alert. Recurring work is registered as a job scheduler in the worker.

### Recurring bills

A bill (`bills`) is a schedule; each due date is a row in `bill_occurrences`. An
occurrence's state is derived, never stored: paid when `paid_at` is set (by
linking a transaction or marking it paid), skipped, overdue once its date passes
unresolved, otherwise scheduled. Open-ended bills keep about 90 days of
occurrences, topped up by the worker's `bills.generate` job; finite plans
(loans, land) create every installment up front. The worker's hourly
`bills.remind` job notifies on the due date (and optionally N days before) and
again 1, 3 and 7 days after it is missed, once the household's local time passes
9:00. Dedupe keys keep the hourly job from repeating a reminder, and occurrences
dated before the bill was created (backfilled history) never remind.

### Split payments

A split (`splits`) is a purchase shared with people who pay you back. Each person
(`split_participants`) has any number of installments (`split_installments`),
each with its own due date, amount and optional grace date. As with bills, the
state is derived: received (an incoming transaction was linked, or it was marked
by hand), skipped, written off ("I'll take the loss"), overdue once the due date
and grace period pass, otherwise scheduled. Per-person and per-split totals
(received, outstanding, written off) are computed on read. Splits send no
notifications.

### Products and transaction items

`products` is the household's reusable catalog (name, picture, latest price). A transaction may list `transaction_items` (name, quantity, unit price snapshot, optional product link) via `PUT /transactions/:id/items`; saving an item can update the product's price so the catalog follows the latest store price while old transactions keep what was actually paid.

### Who created what

Records carry `created_by_user_id` (set once, from the signed-in member, in `HouseholdScopedRepository.create`
or by the explicit inserts) so a household can see who spent or created something. The web resolves ids
through the household members and shows them with `MemberDisplay`; transactions can be filtered by creator.
Older rows have no creator and show "Unknown".

### Budgets

A month's budget (`budgets`) is a planned amount per income or expense category; actuals are computed on
read from transactions plus credit-card budget recognitions. How card purchases count (purchase month,
bill due month or the month after; each installment or the full purchase) defaults on the household and
can be overridden per month (`budget_month_settings`); purchases are stamped with the resolved setting.
Details: `apps/api/src/modules/budgets/README.md`, `apps/web/components/budgets/README.md`.

### Goals

A goal (`goals`) is an amount to save or invest, optionally by a date and at a planned monthly
amount. Progress is the sum of its contributions (`goal_contributions`; a negative amount is a
withdrawal), each entered by hand or backed by a transaction. Nothing about progress is stored:
saved, achieved, on track or behind, and the estimate (the monthly amount needed, when the plan
finishes, and with an expected yearly return for investments, what it grows to) are computed on
read by `@luraba/domain`. Goals send no notifications.

## Import and export

Statements are imported in three steps (upload and preview, map and review, background import).
A `ParserAdapter` registry turns OFX and bank CSV files into normalized rows, staged in
`import_batches`/`import_rows`; a pure evaluator decides each row's kind and problems; per-kind
importers create records through the existing transaction, purchase and payment services. A BullMQ
worker (inside the API process) runs the import, and `import_records` make re-imports idempotent
(bank id, fingerprint, installment series, cross-statement pair keys). A reconciliation check compares
the file's balance and period with Luraba's. Exports use a registry of exporters (CSV/JSON). Both
live in Settings. Details: `apps/api/src/modules/imports/README.md`, `exports/README.md`.

## File storage

Files are stored as objects in an S3-compatible bucket (`@luraba/storage`), by default a bundled
MinIO. The API proxies uploads and downloads (`/uploads`), so the bucket stays private. `uploads`
rows describe stored files and who uploaded them (personal or household scope); `attachments` link an
upload to any record through a registry of targets and roles (a profile picture, a transaction
receipt). Unused uploads can be listed and cleaned up. Setup: [storage.md](storage.md).
