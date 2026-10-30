import type {
  Notification,
  NotificationChannel,
  NotificationChannels,
  NotificationPreference,
  PushSubscriptionInput,
  SendTestNotificationInput,
  UpdateNotificationPreferencesInput,
} from "@luraba/contracts/notifications";
import { formatISODateTime } from "@luraba/domain";
import {
  buildPreferenceLookup,
  buildPreferenceMatrix,
  isChannelReady,
} from "@luraba/notifications";
import { env } from "@/config/env";
import { DependencyUnavailableError, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { isChannelAvailable } from "./notifications.channels";
import { notifier } from "./notifications.emitter";

import { queueDeliveries } from "./notifications.queue";
import * as repository from "./notifications.repository";
import type { ExternalChannel, NotificationRecord } from "./notifications.types";

function mapNotification(record: NotificationRecord): Notification {
  return {
    id: record.id,
    eventType: record.eventType as Notification["eventType"],
    title: record.title,
    body: record.body,
    url: record.url,
    readAt: record.readAt ? formatISODateTime(record.readAt) : null,
    createdAt: formatISODateTime(record.createdAt),
  };
}

export async function listNotifications(
  userId: string,
  query: { page: number; perPage: number; unread?: boolean },
): Promise<ListResult<Notification>> {
  const page = await repository.listPage(userId, query);

  return {
    data: page.rows.map(mapNotification),
    meta: createListMeta(query, page.totalCount, { count: page.unreadCount }),
  };
}

export async function getUnreadCount(userId: string): Promise<{ count: number }> {
  return { count: await repository.countUnread(userId) };
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  if (!(await repository.markRead(userId, notificationId))) throw new NotFoundError("Notification");
}

export async function markAllRead(userId: string): Promise<void> {
  await repository.markAllRead(userId);
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  if (!(await repository.deleteNotification(userId, notificationId))) {
    throw new NotFoundError("Notification");
  }
}

export async function getChannels(userId: string): Promise<NotificationChannels> {
  const [phoneNumber, pushSubscriptionCount] = await Promise.all([
    repository.getPhoneNumber(userId),
    repository.countPushSubscriptions(userId),
  ]);

  return {
    channels: {
      in_app: { available: true, ready: true },
      email: {
        available: isChannelAvailable("email"),
        ready: true,
      },
      push: {
        available: isChannelAvailable("push"),
        ready: pushSubscriptionCount > 0,
      },
      sms: {
        available: isChannelAvailable("sms"),
        ready: phoneNumber !== null,
      },
    },
    pushPublicKey: env.push?.publicKey ?? null,
    pushSubscriptionCount,
  };
}

export async function getPreferences(userId: string): Promise<NotificationPreference[]> {
  const overrides = await notifier.store.listPreferenceOverrides([userId]);
  return buildPreferenceMatrix(buildPreferenceLookup(overrides));
}

export async function updatePreferences(
  userId: string,
  body: UpdateNotificationPreferencesInput,
): Promise<NotificationPreference[]> {
  await repository.upsertPreferences(userId, body.preferences);
  return getPreferences(userId);
}

export async function subscribePush(
  userId: string,
  body: PushSubscriptionInput,
): Promise<NotificationChannels> {
  if (!isChannelAvailable("push")) {
    throw new DependencyUnavailableError("Push notifications are not configured on this server");
  }

  await repository.upsertPushSubscription(userId, {
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    userAgent: body.userAgent,
  });
  return getChannels(userId);
}

export async function unsubscribePush(
  userId: string,
  endpoint: string,
): Promise<NotificationChannels> {
  await repository.deletePushSubscription(userId, endpoint);
  return getChannels(userId);
}

/** Sends a test through one channel, ignoring the user's preference toggles. */
export async function sendTest(userId: string, body: SendTestNotificationInput): Promise<void> {
  const channel: NotificationChannel = body.channel;
  const values = {
    userId,
    eventType: "system.test",
    title: "Test notification",
    body: "If you can read this, this channel is working.",
    url: "/settings/notifications",
  };

  if (channel === "in_app") {
    await notifier.store.createWithDeliveries({ ...values, inApp: true }, []);
    return;
  }

  const external = channel as ExternalChannel;
  if (!isChannelAvailable(external)) {
    throw new DependencyUnavailableError(`The ${channel} channel is not configured on this server`);
  }

  const [recipient] = await notifier.store.getRecipients([userId]);
  if (!recipient || !isChannelReady(external, recipient)) {
    throw new ValidationError(
      channel === "sms"
        ? "Add a phone number to your profile before testing SMS"
        : channel === "push"
          ? "Enable push notifications in this browser before testing"
          : "Your account has no email address",
    );
  }

  const created = await notifier.store.createWithDeliveries({ ...values, inApp: false }, [
    external,
  ]);
  if (created) await queueDeliveries(created.deliveryIds);
}
