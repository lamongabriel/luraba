import {
  notificationContactsTable,
  notificationDeliveriesTable,
  notificationsTable,
  pushSubscriptionsTable,
  usersTable,
} from "@luraba/db";
import { and, eq, sql } from "drizzle-orm";
import type { Recipient } from "../channels/types.js";
import { db } from "../db.js";

export async function getDelivery(deliveryId: string) {
  const [row] = await db
    .select()
    .from(notificationDeliveriesTable)
    .where(eq(notificationDeliveriesTable.id, deliveryId))
    .limit(1);

  return row;
}

export async function getNotification(notificationId: string) {
  const [row] = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, notificationId))
    .limit(1);

  return row;
}

export async function getRecipient(userId: string): Promise<Recipient | undefined> {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return undefined;

  const [contact, subscriptions] = await Promise.all([
    db
      .select({ phoneNumber: notificationContactsTable.phoneNumber })
      .from(notificationContactsTable)
      .where(eq(notificationContactsTable.userId, userId))
      .limit(1),
    db
      .select({
        endpoint: pushSubscriptionsTable.endpoint,
        p256dh: pushSubscriptionsTable.p256dh,
        auth: pushSubscriptionsTable.auth,
      })
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId)),
  ]);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    phoneNumber: contact[0]?.phoneNumber ?? null,
    pushSubscriptions: subscriptions,
  };
}

export async function markSent(deliveryId: string, attempts: number): Promise<void> {
  await db
    .update(notificationDeliveriesTable)
    .set({ status: "sent", attempts, sentAt: sql`now()`, lastError: null, updatedAt: sql`now()` })
    .where(eq(notificationDeliveriesTable.id, deliveryId));
}

export async function markSkipped(deliveryId: string, reason: string): Promise<void> {
  await db
    .update(notificationDeliveriesTable)
    .set({ status: "skipped", lastError: reason, updatedAt: sql`now()` })
    .where(eq(notificationDeliveriesTable.id, deliveryId));
}

/** Records a failed attempt. `final` means BullMQ will not retry it again. */
export async function recordFailure(
  deliveryId: string,
  attempts: number,
  error: string,
  final: boolean,
): Promise<void> {
  await db
    .update(notificationDeliveriesTable)
    .set({
      status: final ? "failed" : "pending",
      attempts,
      lastError: error.slice(0, 1000),
      updatedAt: sql`now()`,
    })
    .where(eq(notificationDeliveriesTable.id, deliveryId));
}

/** Deliveries that are still pending although they were created a while ago. */
export async function listStalePendingDeliveryIds(
  olderThanSeconds: number,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({ id: notificationDeliveriesTable.id })
    .from(notificationDeliveriesTable)
    .where(
      and(
        eq(notificationDeliveriesTable.status, "pending"),
        sql`${notificationDeliveriesTable.createdAt} < now() - (${olderThanSeconds} * interval '1 second')`,
      ),
    )
    .orderBy(notificationDeliveriesTable.createdAt)
    .limit(limit);

  return rows.map((row) => row.id);
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
}

export async function deleteNotificationsOlderThan(days: number): Promise<number> {
  const rows = await db
    .delete(notificationsTable)
    .where(sql`${notificationsTable.createdAt} < now() - (${days} * interval '1 day')`)
    .returning({ id: notificationsTable.id });

  return rows.length;
}
