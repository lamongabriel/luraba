"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { notificationQueryKeys } from "@/queries/notifications/use-notifications-queries";
import {
  deleteNotification,
  type getNotificationChannels,
  markAllNotificationsRead,
  markNotificationRead,
  sendTestNotification,
  subscribePush,
  unsubscribePush,
  updateNotificationPreferences,
} from "@/services/notifications.service";

type ChannelsResponse = Awaited<ReturnType<typeof getNotificationChannels>>;
type PreferencesBody = Parameters<typeof updateNotificationPreferences>[0];
type PreferencesResponse = Awaited<ReturnType<typeof updateNotificationPreferences>>;
type SubscribeBody = Parameters<typeof subscribePush>[0];
type TestBody = Parameters<typeof sendTestNotification>[0];

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
}

export const markNotificationReadMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't update this notification. Please try again.",
  mutationFn: markNotificationRead,
  mutationKey: ["notifications", "mark-read"],
});
export function useMarkNotificationReadMutation(options?: UseAppMutationOptions<void, string>) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(markNotificationReadMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  });
}

export const markAllNotificationsReadMutationDefinition = createAppMutationDefinition<void, void>({
  defaultErrorMessage: "We couldn't mark your notifications as read. Please try again.",
  mutationFn: markAllNotificationsRead,
  mutationKey: ["notifications", "mark-all-read"],
});
export function useMarkAllNotificationsReadMutation(options?: UseAppMutationOptions<void, void>) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(markAllNotificationsReadMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  });
}

export const deleteNotificationMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this notification. Please try again.",
  mutationFn: deleteNotification,
  mutationKey: ["notifications", "delete"],
});
export function useDeleteNotificationMutation(options?: UseAppMutationOptions<void, string>) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(deleteNotificationMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  });
}

export const updateNotificationPreferencesMutationDefinition = createAppMutationDefinition<
  PreferencesResponse,
  PreferencesBody
>({
  defaultErrorMessage: "We couldn't save your notification settings. Please try again.",
  mutationFn: updateNotificationPreferences,
  mutationKey: ["notifications", "update-preferences"],
});
export function useUpdateNotificationPreferencesMutation(
  options?: UseAppMutationOptions<PreferencesResponse, PreferencesBody>,
) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(updateNotificationPreferencesMutationDefinition, {
    ...options,
    onSettled: async (...args) => {
      await invalidate();
      await options?.onSettled?.(...args);
    },
  });
}

export const subscribePushMutationDefinition = createAppMutationDefinition<
  ChannelsResponse,
  SubscribeBody
>({
  defaultErrorMessage: "We couldn't enable push notifications. Please try again.",
  mutationFn: subscribePush,
  mutationKey: ["notifications", "subscribe-push"],
});
export function useSubscribePushMutation(
  options?: UseAppMutationOptions<ChannelsResponse, SubscribeBody>,
) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(subscribePushMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  });
}

export const unsubscribePushMutationDefinition = createAppMutationDefinition<
  ChannelsResponse,
  string
>({
  defaultErrorMessage: "We couldn't disable push notifications. Please try again.",
  mutationFn: unsubscribePush,
  mutationKey: ["notifications", "unsubscribe-push"],
});
export function useUnsubscribePushMutation(
  options?: UseAppMutationOptions<ChannelsResponse, string>,
) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(unsubscribePushMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  });
}

export const sendTestNotificationMutationDefinition = createAppMutationDefinition<void, TestBody>({
  defaultErrorMessage: "We couldn't send the test notification.",
  mutationFn: sendTestNotification,
  mutationKey: ["notifications", "send-test"],
});
export function useSendTestNotificationMutation(options?: UseAppMutationOptions<void, TestBody>) {
  const invalidate = useInvalidateNotifications();
  return useAppMutation(sendTestNotificationMutationDefinition, {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  });
}
