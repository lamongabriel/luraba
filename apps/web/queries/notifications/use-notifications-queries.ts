"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import {
  getNotificationChannels,
  getNotificationPreferences,
  getUnreadNotificationCount,
  listNotifications,
} from "@/services/notifications.service";

type ListNotificationsQuery = NonNullable<Parameters<typeof listNotifications>[0]>;
type ListNotificationsResponse = Awaited<ReturnType<typeof listNotifications>>;
type UnreadCountResponse = Awaited<ReturnType<typeof getUnreadNotificationCount>>;
type ChannelsResponse = Awaited<ReturnType<typeof getNotificationChannels>>;
type PreferencesResponse = Awaited<ReturnType<typeof getNotificationPreferences>>;

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationQueryKeys.all, "list"] as const,
  list: (query: ListNotificationsQuery = {}) => [...notificationQueryKeys.lists(), query] as const,
  unreadCount: () => [...notificationQueryKeys.all, "unread-count"] as const,
  channels: () => [...notificationQueryKeys.all, "channels"] as const,
  preferences: () => [...notificationQueryKeys.all, "preferences"] as const,
};

const UNREAD_POLL_INTERVAL_MS = 30_000;

export function useNotificationsQuery<TData = ListNotificationsResponse>(
  query: ListNotificationsQuery = {},
  options?: AppQueryOptions<ListNotificationsResponse, TData>,
) {
  return useQuery({
    queryKey: notificationQueryKeys.list(query),
    queryFn: () => listNotifications(query),
    ...options,
  });
}

export function useUnreadNotificationCountQuery(options?: AppQueryOptions<UnreadCountResponse>) {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
    refetchInterval: UNREAD_POLL_INTERVAL_MS,
    ...options,
  });
}

export function useNotificationChannelsQuery(options?: AppQueryOptions<ChannelsResponse>) {
  return useQuery({
    queryKey: notificationQueryKeys.channels(),
    queryFn: getNotificationChannels,
    ...options,
  });
}

export function useNotificationPreferencesQuery(options?: AppQueryOptions<PreferencesResponse>) {
  return useQuery({
    queryKey: notificationQueryKeys.preferences(),
    queryFn: getNotificationPreferences,
    ...options,
  });
}
