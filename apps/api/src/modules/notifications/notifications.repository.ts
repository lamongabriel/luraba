import type { NotificationChannel } from "@luraba/contracts/notifications";
import { householdMembersTable } from "@luraba/db/schemas/households.schema";
import {
  notificationPreferencesTable,
  notificationsTable,
  pushSubscriptionsTable,
} from "@luraba/db/schemas/notifications.schema";
import { usersTable } from "@luraba/db/schemas/users.schema";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { type DbListPage, getPagination } from "@/shared/list";
import type { NotificationRecord } from "./notifications.types";

// ─── Preferences ─────────────────────────────────────────────────────────

export async function upsertPreferences(
  userId: string,
  items: ReadonlyArray<{ eventType: string; channel: NotificationChannel; enabled: boolean }>,
): Promise<void> {
  if (items.length === 0) return;

  await db
    .insert(notificationPreferencesTable)
    .values(items.map((item) => ({ userId, ...item })))
    .onConflictDoUpdate({
      target: [
        notificationPreferencesTable.userId,
        notificationPreferencesTable.eventType,
        notificationPreferencesTable.channel,
      ],
      set: { enabled: sql`excluded.enabled`, updatedAt: sql`now()` },
    });
}

// ─── Phone (from the user profile) & push subscriptions ────────────────────────────────────────

export async function getPhoneNumber(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ phoneNumber: usersTable.phoneNumber })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return row?.phoneNumber ?? null;
}

export async function countPushSubscriptions(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  return row?.value ?? 0;
}

export async function upsertPushSubscription(
  userId: string,
  values: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
): Promise<void> {
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      // A browser endpoint belongs to whoever is signed in on it now.
      set: {
        userId,
        p256dh: values.p256dh,
        auth: values.auth,
        userAgent: values.userAgent,
      },
    });
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptionsTable)
    .where(
      and(eq(pushSubscriptionsTable.userId, userId), eq(pushSubscriptionsTable.endpoint, endpoint)),
    );
}

// ─── Notifications ───────────────────────────────────────────────────────

export async function listPage(
  userId: string,
  query: { page: number; perPage: number; unread?: boolean },
): Promise<DbListPage<NotificationRecord> & { unreadCount: number }> {
  const inbox = and(eq(notificationsTable.userId, userId), eq(notificationsTable.inApp, true));
  const where = query.unread ? and(inbox, isNull(notificationsTable.readAt)) : inbox;
  const { limit, offset } = getPagination(query);

  const [countRow, rows, unreadCount] = await Promise.all([
    db.select({ value: count() }).from(notificationsTable).where(where),
    db
      .select()
      .from(notificationsTable)
      .where(where)
      .orderBy(desc(notificationsTable.createdAt), desc(notificationsTable.id))
      .limit(limit)
      .offset(offset),
    countUnread(userId),
  ]);

  return { rows, totalCount: countRow[0]?.value ?? 0, unreadCount };
}

export async function countUnread(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.inApp, true),
        isNull(notificationsTable.readAt),
      ),
    );

  return row?.value ?? 0;
}

export async function markRead(userId: string, notificationId: string): Promise<boolean> {
  const rows = await db
    .update(notificationsTable)
    .set({ readAt: sql`coalesce(${notificationsTable.readAt}, now())` })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning({ id: notificationsTable.id });

  return rows.length > 0;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notificationsTable)
    .set({ readAt: sql`now()` })
    .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
}

export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
  const rows = await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning({ id: notificationsTable.id });

  return rows.length > 0;
}

// ─── Household lookups ───────────────────────────────────────────────────

export async function listOtherHouseholdMemberIds(
  householdId: string,
  exceptUserId: string,
): Promise<string[]> {
  const rows = await db
    .select({ userId: householdMembersTable.userId })
    .from(householdMembersTable)
    .where(
      and(
        eq(householdMembersTable.householdId, householdId),
        sql`${householdMembersTable.userId} <> ${exceptUserId}`,
      ),
    );

  return rows.map((row) => row.userId);
}

export async function getUserName(userId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return row?.name;
}
