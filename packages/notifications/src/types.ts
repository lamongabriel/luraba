import type { NotificationChannel, NotificationEventType } from "@luraba/contracts";

/** Channels delivered by the worker; in-app notifications are rows in the inbox itself. */
export type ExternalChannel = Exclude<NotificationChannel, "in_app">;
export const EXTERNAL_CHANNELS: readonly ExternalChannel[] = ["email", "push", "sms"];

export type PreferenceOverride = {
  userId: string;
  eventType: string;
  channel: string;
  enabled: boolean;
};

/** What the emitter needs to know about a user to decide which channels can reach them. */
export type RecipientContact = {
  userId: string;
  email: string;
  phoneNumber: string | null;
  pushSubscriptionCount: number;
};

export type NotifyInput = {
  userIds: readonly string[];
  eventType: NotificationEventType;
  title: string;
  body: string;
  /** In-app route (for example "/bills"); channels turn it into a full link. */
  url?: string;
  data?: Record<string, unknown>;
  householdId?: string;
  /** Prevents duplicates when an event can fire more than once. */
  dedupeKey?: string;
};

/** Whether this deployment can send on each external channel at all. */
export type ChannelAvailability = Readonly<Record<ExternalChannel, boolean>>;

export function isChannelReady(channel: ExternalChannel, recipient: RecipientContact): boolean {
  switch (channel) {
    case "email":
      return recipient.email.length > 0;
    case "push":
      return recipient.pushSubscriptionCount > 0;
    case "sms":
      return recipient.phoneNumber !== null;
  }
}
