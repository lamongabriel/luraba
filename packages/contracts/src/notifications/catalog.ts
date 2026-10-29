import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["in_app", "email", "push", "sms"] as const;
export const NOTIFICATION_CATEGORIES = ["transactions", "system"] as const;

/** SMS vendors Luraba can deliver through. Empty until a provider is implemented in the worker. */
export const SMS_PROVIDERS = [] as const satisfies readonly string[];

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationEventDefinition = {
  category: NotificationCategory;
  label: string;
  description: string;
  /** Channel toggles applied until the user saves an explicit preference. */
  defaults: Readonly<Record<NotificationChannel, boolean>>;
};

/**
 * Single source of truth for every notification Luraba can send. Adding an
 * event here makes it appear in the preferences matrix automatically; modules
 * emit it by key through the notifications service.
 */
export const NOTIFICATION_EVENTS = {
  "transaction.created": {
    category: "transactions",
    label: "New transaction",
    description: "A household member records a new transaction.",
    defaults: { in_app: true, email: false, push: false, sms: false },
  },
  "system.test": {
    category: "system",
    label: "Test notification",
    description: "Sent when you test a channel from your settings.",
    defaults: { in_app: true, email: true, push: true, sms: true },
  },
} as const satisfies Record<string, NotificationEventDefinition>;

export type NotificationEventType = keyof typeof NOTIFICATION_EVENTS;

export const NOTIFICATION_EVENT_TYPES = Object.keys(NOTIFICATION_EVENTS) as [
  NotificationEventType,
  ...NotificationEventType[],
];

export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
export const notificationCategorySchema = z.enum(NOTIFICATION_CATEGORIES);
export const notificationEventTypeSchema = z.enum(NOTIFICATION_EVENT_TYPES);

export function getNotificationEvent(type: NotificationEventType): NotificationEventDefinition {
  return NOTIFICATION_EVENTS[type];
}

export function isNotificationChannelEnabledByDefault(
  type: NotificationEventType,
  channel: NotificationChannel,
): boolean {
  return NOTIFICATION_EVENTS[type].defaults[channel];
}
