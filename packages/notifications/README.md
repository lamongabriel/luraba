# @luraba/notifications

The notification engine shared by the API and worker: events, per-user channel preferences, and the
store that saves a notification plus one pending delivery per enabled channel.

- `createNotifier({ db, availability, enqueue, onError })` returns `notify`. The API wires it in
  `apps/api/src/modules/notifications/notifications.emitter.ts`.
- `preferences.ts` resolves which channels are enabled for an event type (with defaults).
- Sending is not done here: the worker (`apps/worker`) delivers each pending row.
- Adding an event type: add it to the contracts' notification catalog, give it default preferences,
  emit it from `notifications.listeners.ts`.
