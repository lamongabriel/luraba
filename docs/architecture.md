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
