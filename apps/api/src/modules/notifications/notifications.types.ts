import type { NotificationChannel, NotificationEventType } from "@luraba/contracts/notifications";
import type { notificationsTable } from "@luraba/db/schemas/notifications.schema";

export type NotificationRecord = typeof notificationsTable.$inferSelect;

/** Channels delivered by the worker; in-app notifications are rows in the inbox itself. */
export type ExternalChannel = Exclude<NotificationChannel, "in_app">;

export type NotifyInput = {
  userIds: readonly string[];
  eventType: NotificationEventType;
  title: string;
  body: string;
  /** In-app route (for example "/transactions"); channels turn it into a full link. */
  url?: string;
  data?: Record<string, unknown>;
  householdId?: string;
  /** Prevents duplicates when an event can fire more than once. */
  dedupeKey?: string;
};

/** What the API needs to know about a user to decide which channels can reach them. */
export type RecipientContact = {
  userId: string;
  email: string;
  phoneNumber: string | null;
  pushSubscriptionCount: number;
};
