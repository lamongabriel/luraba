# notifications

Configurable alerts over in-app, email, web push and SMS.

## Flow

1. A service calls a function from `notifications.listeners.ts` (e.g. `notifyTransactionCreated`),
   which calls `notify` from `notifications.emitter.ts` (a `@luraba/notifications` notifier).
2. The notifier saves the notification and one pending delivery per enabled channel in Postgres
   (preferences decide which), then `notifications.queue.ts` enqueues a BullMQ job per delivery.
3. `apps/worker` sends and records the outcome; a sweep re-queues anything still pending after two
   minutes, so Redis being down cannot lose an alert.

## Rules

- Notifications are user-level data: this module is function-style and keyed by `userId`, so it does
  not use `HouseholdScopedRepository`.
- Never send email/push from a request handler; add an event in `@luraba/notifications` and a
  listener here.
- Channel availability (`notifications.channels.ts`) reflects which providers are configured.

General module conventions: [../README.md](../README.md).
