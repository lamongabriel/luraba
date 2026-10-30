import { z } from "zod";
import { wireDateTimeSchema } from "../common.js";
import {
  notificationCategorySchema,
  notificationChannelSchema,
  notificationEventTypeSchema,
} from "./catalog.js";

export const notificationSchema = z.object({
  id: z.uuid(),
  eventType: notificationEventTypeSchema,
  title: z.string(),
  body: z.string(),
  /** In-app route the notification points to, when it has one. */
  url: z.string().nullable(),
  readAt: wireDateTimeSchema.nullable(),
  createdAt: wireDateTimeSchema,
});

export const notificationUnreadCountSchema = z.object({ count: z.number().int().nonnegative() });

export const notificationChannelStateSchema = z.object({
  /** The server can deliver on this channel right now. */
  available: z.boolean(),
  /** The user has what the channel needs (a phone number on the profile, a registered browser). */
  ready: z.boolean(),
});

export const notificationChannelsSchema = z.object({
  channels: z.object({
    in_app: notificationChannelStateSchema,
    email: notificationChannelStateSchema,
    push: notificationChannelStateSchema,
    sms: notificationChannelStateSchema,
  }),
  /** VAPID application server key the browser needs to subscribe; null when push is off. */
  pushPublicKey: z.string().nullable(),
  pushSubscriptionCount: z.number().int().nonnegative(),
});

export const notificationPreferenceSchema = z.object({
  eventType: notificationEventTypeSchema,
  category: notificationCategorySchema,
  label: z.string(),
  description: z.string(),
  channels: z.record(notificationChannelSchema, z.boolean()),
});

export const notificationPreferencesSchema = z.array(notificationPreferenceSchema);

export type Notification = z.output<typeof notificationSchema>;
export type NotificationChannels = z.output<typeof notificationChannelsSchema>;
export type NotificationPreference = z.output<typeof notificationPreferenceSchema>;
