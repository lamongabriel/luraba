import type { Database } from "@luraba/db";
import {
  notificationDeliveriesTable,
  notificationPreferencesTable,
  notificationsTable,
  pushSubscriptionsTable,
  usersTable,
} from "@luraba/db";
import { count, inArray } from "drizzle-orm";
import type { ExternalChannel, PreferenceOverride, RecipientContact } from "./types.js";

export type NewNotification = Omit<
  typeof notificationsTable.$inferInsert,
  "id" | "createdAt" | "readAt"
>;
export type NotificationRow = typeof notificationsTable.$inferSelect;

export function createNotificationStore(db: Database) {
  return {
    async listPreferenceOverrides(userIds: readonly string[]): Promise<PreferenceOverride[]> {
      if (userIds.length === 0) return [];

      return db
        .select({
          userId: notificationPreferencesTable.userId,
          eventType: notificationPreferencesTable.eventType,
          channel: notificationPreferencesTable.channel,
          enabled: notificationPreferencesTable.enabled,
        })
        .from(notificationPreferencesTable)
        .where(inArray(notificationPreferencesTable.userId, [...userIds]));
    },

    async getRecipients(userIds: readonly string[]): Promise<RecipientContact[]> {
      if (userIds.length === 0) return [];
      const ids = [...userIds];

      const [users, subscriptionCounts] = await Promise.all([
        db
          .select({
            id: usersTable.id,
            email: usersTable.email,
            phoneNumber: usersTable.phoneNumber,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, ids)),
        db
          .select({ userId: pushSubscriptionsTable.userId, value: count() })
          .from(pushSubscriptionsTable)
          .where(inArray(pushSubscriptionsTable.userId, ids))
          .groupBy(pushSubscriptionsTable.userId),
      ]);

      const pushByUser = new Map(subscriptionCounts.map((row) => [row.userId, row.value]));

      return users.map((user) => ({
        userId: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        pushSubscriptionCount: pushByUser.get(user.id) ?? 0,
      }));
    },

    /**
     * Stores a notification and its pending deliveries atomically. Returns
     * undefined when `dedupeKey` was already used for this user. The caller
     * queues the returned delivery ids; the worker's sweep covers any that
     * never get queued.
     */
    async createWithDeliveries(
      values: NewNotification,
      channels: readonly ExternalChannel[],
    ): Promise<{ notification: NotificationRow; deliveryIds: string[] } | undefined> {
      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(notificationsTable)
          .values(values)
          .onConflictDoNothing()
          .returning();

        if (!created) return undefined;

        const deliveries =
          channels.length > 0
            ? await tx
                .insert(notificationDeliveriesTable)
                .values(channels.map((channel) => ({ notificationId: created.id, channel })))
                .returning({ id: notificationDeliveriesTable.id })
            : [];

        return { notification: created, deliveryIds: deliveries.map((row) => row.id) };
      });
    },
  };
}

export type NotificationStore = ReturnType<typeof createNotificationStore>;
