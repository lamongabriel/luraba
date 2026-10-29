# @luraba/worker

BullMQ consumers and scheduled jobs. Runs separately from the API (`apps/worker/src/main.ts`) and
shares Postgres (`@luraba/db`) and Redis.

- `notifications/` delivers pending notification deliveries (`deliver.ts`) and re-queues stale ones
  (`sweep.ts`). `channels/` has the email, web push and SMS senders; a channel is skipped when its
  provider is not configured.
- `bills/` generates upcoming bill occurrences and sends reminders (hourly, per household local
  time, deduplicated by key).
- Recurring work is registered as a job scheduler in `main.ts`.
- Config is parsed in `config/env.ts`; the worker uses the same variables as the API.

Rules: jobs must be idempotent (they can run twice); record outcomes in Postgres; unit-test pure
logic as `*.unit.test.ts` next to the code.
