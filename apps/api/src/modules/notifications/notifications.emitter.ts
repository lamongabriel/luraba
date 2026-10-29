import { logger } from "@/shared/logger";
import { EXTERNAL_CHANNELS, isChannelAvailable, isChannelReady } from "./notifications.channels";
import {
  buildPreferenceLookup,
  type PreferenceLookup,
  resolveEnabledChannels,
} from "./notifications.preferences";
import { queueDeliveries } from "./notifications.queue";
import type { PreferenceOverride } from "./notifications.repository";
import * as repository from "./notifications.repository";
import type { ExternalChannel, NotifyInput, RecipientContact } from "./notifications.types";

function selectExternalChannels(
  recipient: RecipientContact,
  enabled: readonly string[],
): ExternalChannel[] {
  return EXTERNAL_CHANNELS.filter(
    (channel) =>
      enabled.includes(channel) &&
      isChannelAvailable(channel) &&
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

  const created = await repository.createWithDeliveries(
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

  await queueDeliveries(created.deliveryIds);
  return true;
}

/**
 * Emits an event to the given users, honouring each user's channel preferences.
 *
 * Never throws: a notification problem must not fail the request or job that
 * triggered it. Returns how many users were actually notified.
 */
export async function notify(input: NotifyInput): Promise<number> {
  try {
    const userIds = [...new Set(input.userIds)];
    const [overrides, recipients] = await Promise.all([
      repository.listPreferenceOverrides(userIds),
      repository.getRecipients(userIds),
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
      } catch (err) {
        logger.error(
          { err, userId: recipient.userId, eventType: input.eventType },
          "[notifications] Failed to emit notification",
        );
      }
    }

    return notified;
  } catch (err) {
    logger.error({ err, eventType: input.eventType }, "[notifications] Failed to emit event");
    return 0;
  }
}
