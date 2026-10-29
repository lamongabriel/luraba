import type { Database } from "@luraba/db";
import {
  buildPreferenceLookup,
  type PreferenceLookup,
  resolveEnabledChannels,
} from "./preferences.js";
import { createNotificationStore, type NotificationStore } from "./store.js";
import {
  type ChannelAvailability,
  EXTERNAL_CHANNELS,
  type ExternalChannel,
  isChannelReady,
  type NotifyInput,
  type PreferenceOverride,
  type RecipientContact,
} from "./types.js";

export type NotifierOptions = {
  db: Database;
  availability: ChannelAvailability;
  /** Hands delivery ids to the queue. Must not throw; the worker sweep recovers misses. */
  enqueue: (deliveryIds: readonly string[]) => Promise<void>;
  onError?: (error: unknown, context: Record<string, unknown>) => void;
};

export function createNotifier(options: NotifierOptions) {
  const store: NotificationStore = createNotificationStore(options.db);

  function selectExternalChannels(
    recipient: RecipientContact,
    enabled: readonly string[],
  ): ExternalChannel[] {
    return EXTERNAL_CHANNELS.filter(
      (channel) =>
        enabled.includes(channel) &&
        options.availability[channel] &&
        isChannelReady(channel, recipient),
    );
  }

  async function emitToRecipient(
    input: NotifyInput,
    recipient: RecipientContact,
    lookup: PreferenceLookup,
  ): Promise<boolean> {
    const enabled = resolveEnabledChannels(lookup, input.eventType);
    const inApp = enabled.includes("in_app");
    const external = selectExternalChannels(recipient, enabled);

    if (!inApp && external.length === 0) return false;

    const created = await store.createWithDeliveries(
      {
        userId: recipient.userId,
        householdId: input.householdId,
        eventType: input.eventType,
        title: input.title,
        body: input.body,
        url: input.url,
        data: input.data,
        inApp,
        dedupeKey: input.dedupeKey,
      },
      external,
    );

    if (!created) return false;

    await options.enqueue(created.deliveryIds);
    return true;
  }

  /**
   * Emits an event to the given users, honouring each user's channel
   * preferences. Never throws: a notification problem must not fail the request
   * or job that triggered it. Returns how many users were actually notified.
   */
  async function notify(input: NotifyInput): Promise<number> {
    try {
      const userIds = [...new Set(input.userIds)];
      const [overrides, recipients] = await Promise.all([
        store.listPreferenceOverrides(userIds),
        store.getRecipients(userIds),
      ]);

      const overridesByUser = new Map<string, PreferenceOverride[]>();
      for (const row of overrides) {
        overridesByUser.set(row.userId, [...(overridesByUser.get(row.userId) ?? []), row]);
      }

      let notified = 0;
      for (const recipient of recipients) {
        try {
          const lookup = buildPreferenceLookup(overridesByUser.get(recipient.userId) ?? []);
          if (await emitToRecipient(input, recipient, lookup)) notified += 1;
        } catch (error) {
          options.onError?.(error, { userId: recipient.userId, eventType: input.eventType });
        }
      }

      return notified;
    } catch (error) {
      options.onError?.(error, { eventType: input.eventType });
      return 0;
    }
  }

  return { notify, store };
}

export type Notifier = ReturnType<typeof createNotifier>;
