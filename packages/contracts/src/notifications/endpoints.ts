import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaWithSummarySchema } from "../list.js";
import {
  idParamsSchema,
  listNotificationsQuerySchema,
  pushSubscriptionBodySchema,
  pushUnsubscribeBodySchema,
  sendTestNotificationBodySchema,
  updateNotificationPreferencesBodySchema,
} from "./requests.js";
import {
  notificationChannelsSchema,
  notificationPreferencesSchema,
  notificationSchema,
  notificationUnreadCountSchema,
} from "./resource.js";

export const notificationsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/notifications",
    query: listNotificationsQuerySchema,
    response: z.array(notificationSchema),
    meta: listMetaWithSummarySchema(notificationUnreadCountSchema),
    status: 200,
  }),
  unreadCount: defineEndpoint({
    method: "get",
    path: "/notifications/unread-count",
    response: notificationUnreadCountSchema,
    status: 200,
  }),
  markRead: defineEndpoint({
    method: "post",
    path: "/notifications/:id/read",
    params: idParamsSchema,
    status: 204,
  }),
  markAllRead: defineEndpoint({
    method: "post",
    path: "/notifications/read-all",
    status: 204,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/notifications/:id",
    params: idParamsSchema,
    status: 204,
  }),
  channels: defineEndpoint({
    method: "get",
    path: "/notifications/channels",
    response: notificationChannelsSchema,
    status: 200,
  }),
  getPreferences: defineEndpoint({
    method: "get",
    path: "/notifications/preferences",
    response: notificationPreferencesSchema,
    status: 200,
  }),
  updatePreferences: defineEndpoint({
    method: "patch",
    path: "/notifications/preferences",
    body: updateNotificationPreferencesBodySchema,
    response: notificationPreferencesSchema,
    status: 200,
  }),
  subscribePush: defineEndpoint({
    method: "post",
    path: "/notifications/push-subscriptions",
    body: pushSubscriptionBodySchema,
    response: notificationChannelsSchema,
    status: 201,
  }),
  unsubscribePush: defineEndpoint({
    method: "post",
    path: "/notifications/push-subscriptions/remove",
    body: pushUnsubscribeBodySchema,
    response: notificationChannelsSchema,
    status: 200,
  }),
  sendTest: defineEndpoint({
    method: "post",
    path: "/notifications/test",
    body: sendTestNotificationBodySchema,
    status: 204,
  }),
} as const;
