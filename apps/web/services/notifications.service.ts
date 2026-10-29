"use client";

import {
  type ListNotificationsQuery,
  type ListNotificationsResult,
  type NotificationChannelsResult,
  type NotificationPreferencesResult,
  type NotificationUnreadCountResult,
  notificationsEndpoints,
  type PushSubscriptionInput,
  type SendTestNotificationInput,
  type UpdateNotificationContactInput,
  type UpdateNotificationPreferencesInput,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listNotifications(
  query: ListNotificationsQuery = {},
): Promise<ListNotificationsResult> {
  return requestContract(notificationsEndpoints.list, { query });
}

export function getUnreadNotificationCount(): Promise<NotificationUnreadCountResult> {
  return requestContract(notificationsEndpoints.unreadCount, {});
}

export function markNotificationRead(id: string): Promise<void> {
  return requestContract(notificationsEndpoints.markRead, { params: { id } });
}

export function markAllNotificationsRead(): Promise<void> {
  return requestContract(notificationsEndpoints.markAllRead, {});
}

export function deleteNotification(id: string): Promise<void> {
  return requestContract(notificationsEndpoints.delete, { params: { id } });
}

export function getNotificationChannels(): Promise<NotificationChannelsResult> {
  return requestContract(notificationsEndpoints.channels, {});
}

export function updateNotificationContact(
  input: UpdateNotificationContactInput,
): Promise<NotificationChannelsResult> {
  return requestContract(notificationsEndpoints.updateContact, { body: input });
}

export function getNotificationPreferences(): Promise<NotificationPreferencesResult> {
  return requestContract(notificationsEndpoints.getPreferences, {});
}

export function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferencesResult> {
  return requestContract(notificationsEndpoints.updatePreferences, { body: input });
}

export function subscribePush(input: PushSubscriptionInput): Promise<NotificationChannelsResult> {
  return requestContract(notificationsEndpoints.subscribePush, { body: input });
}

export function unsubscribePush(endpoint: string): Promise<NotificationChannelsResult> {
  return requestContract(notificationsEndpoints.unsubscribePush, { body: { endpoint } });
}

export function sendTestNotification(input: SendTestNotificationInput): Promise<void> {
  return requestContract(notificationsEndpoints.sendTest, { body: input });
}
