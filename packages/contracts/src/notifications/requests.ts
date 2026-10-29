import { z } from "zod";
import { idParamsSchema } from "../common.js";
import { booleanQuerySchema, createListQuerySchema } from "../list.js";
import { notificationChannelSchema, notificationEventTypeSchema } from "./catalog.js";

export const listNotificationsQuerySchema = createListQuerySchema(
  { unread: booleanQuerySchema.optional() },
  ["createdAt"],
);

export const updateNotificationPreferencesBodySchema = z.object({
  preferences: z
    .array(
      z.object({
        eventType: notificationEventTypeSchema,
        channel: notificationChannelSchema,
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(200),
});

/** E.164: "+" followed by up to 15 digits, first digit non-zero. */
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/u, "Use international format, for example +5511999999999");

export const updateNotificationContactBodySchema = z.object({
  phoneNumber: phoneNumberSchema.nullable(),
});

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(512).optional(),
});

export const pushUnsubscribeBodySchema = z.object({ endpoint: z.url().max(2048) });

export const sendTestNotificationBodySchema = z.object({
  channel: notificationChannelSchema,
});

export { idParamsSchema };

export type ListNotificationsQuery = z.input<typeof listNotificationsQuerySchema>;
export type UpdateNotificationPreferencesInput = z.input<
  typeof updateNotificationPreferencesBodySchema
>;
export type UpdateNotificationContactInput = z.input<typeof updateNotificationContactBodySchema>;
export type PushSubscriptionInput = z.input<typeof pushSubscriptionBodySchema>;
export type PushUnsubscribeInput = z.input<typeof pushUnsubscribeBodySchema>;
export type SendTestNotificationInput = z.input<typeof sendTestNotificationBodySchema>;
