import type { EndpointParams, EndpointResult } from "../api.js";
import type { notificationsEndpoints } from "./endpoints.js";

export type MarkNotificationReadParams = EndpointParams<typeof notificationsEndpoints.markRead>;
export type DeleteNotificationParams = EndpointParams<typeof notificationsEndpoints.delete>;
export type ListNotificationsResult = EndpointResult<typeof notificationsEndpoints.list>;
export type NotificationUnreadCountResult = EndpointResult<
  typeof notificationsEndpoints.unreadCount
>;
export type NotificationChannelsResult = EndpointResult<typeof notificationsEndpoints.channels>;
export type NotificationPreferencesResult = EndpointResult<
  typeof notificationsEndpoints.getPreferences
>;
