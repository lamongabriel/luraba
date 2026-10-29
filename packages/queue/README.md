# @luraba/queue

Queue and job names, job payload schemas and producer helpers shared by the API (producer) and the
worker (consumer), on BullMQ/Redis (`REDIS_URL`).

- `names.ts` is the only place queue and job names are spelled.
- `notifications.ts` payload schema and `enqueue...` helper. A delivery id is its job id, so a
  delivery is never queued twice.
- Producers must tolerate Redis being down (log and continue): Postgres stays the source of truth
  and the worker sweep re-queues pending work.
