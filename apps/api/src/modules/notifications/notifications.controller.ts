import { notificationsEndpoints } from "@luraba/contracts/notifications";
import { createAuthenticatedHandler } from "@/shared/controllers/authenticated.controller";
import { withApiMeta } from "@/shared/response";
import * as service from "./notifications.service";

export const list = createAuthenticatedHandler({
  query: notificationsEndpoints.list.query,
  response: notificationsEndpoints.list.response,
  meta: notificationsEndpoints.list.meta,
  handle: async ({ user, query }) => {
    const result = await service.listNotifications(user.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const unreadCount = createAuthenticatedHandler({
  response: notificationsEndpoints.unreadCount.response,
  handle: ({ user }) => service.getUnreadCount(user.id),
});

export const markRead = createAuthenticatedHandler({
  params: notificationsEndpoints.markRead.params,
  status: "no-content",
  handle: ({ user, params }) => service.markRead(user.id, params.id),
});

export const markAllRead = createAuthenticatedHandler({
  status: "no-content",
  handle: ({ user }) => service.markAllRead(user.id),
});

export const deleteNotification = createAuthenticatedHandler({
  params: notificationsEndpoints.delete.params,
  status: "no-content",
  handle: ({ user, params }) => service.deleteNotification(user.id, params.id),
});

export const channels = createAuthenticatedHandler({
  response: notificationsEndpoints.channels.response,
  handle: ({ user }) => service.getChannels(user.id),
});

export const getPreferences = createAuthenticatedHandler({
  response: notificationsEndpoints.getPreferences.response,
  handle: ({ user }) => service.getPreferences(user.id),
});

export const updatePreferences = createAuthenticatedHandler({
  body: notificationsEndpoints.updatePreferences.body,
  response: notificationsEndpoints.updatePreferences.response,
  handle: ({ user, body }) => service.updatePreferences(user.id, body),
});

export const subscribePush = createAuthenticatedHandler({
  body: notificationsEndpoints.subscribePush.body,
  response: notificationsEndpoints.subscribePush.response,
  status: "created",
  handle: ({ user, body }) => service.subscribePush(user.id, body),
});

export const unsubscribePush = createAuthenticatedHandler({
  body: notificationsEndpoints.unsubscribePush.body,
  response: notificationsEndpoints.unsubscribePush.response,
  handle: ({ user, body }) => service.unsubscribePush(user.id, body.endpoint),
});

export const sendTest = createAuthenticatedHandler({
  body: notificationsEndpoints.sendTest.body,
  status: "no-content",
  handle: ({ user, body }) => service.sendTest(user.id, body),
});
