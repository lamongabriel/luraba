import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { notificationDeliveryStatusEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";
import { usersTable } from "./users.schema.js";

/** Explicit per-user overrides of the catalog defaults. Missing rows mean "use the default". */
export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    channel: varchar({ length: 16 }).notNull(),
    enabled: boolean().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_preferences_user_event_channel_unique").on(
      table.userId,
      table.eventType,
      table.channel,
    ),
  ],
);

export const pushSubscriptionsTable = pgTable(
  "push_subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    endpoint: text().notNull(),
    p256dh: text().notNull(),
    auth: text().notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    index("push_subscriptions_user_id_idx").on(table.userId),
  ],
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    householdId: uuid("household_id").references(() => householdsTable.id, {
      onDelete: "cascade",
    }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    url: varchar({ length: 512 }),
    data: jsonb().$type<Record<string, unknown>>(),
    /** Shown in the inbox. Off when the user only wants external channels. */
    inApp: boolean("in_app").notNull().default(true),
    /** Makes emission idempotent, for example one reminder per bill occurrence. */
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx")
      .on(table.userId)
      .where(sql`${table.readAt} is null and ${table.inApp}`),
    uniqueIndex("notifications_user_dedupe_unique")
      .on(table.userId, table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
  ],
);

export const notificationDeliveriesTable = pgTable(
  "notification_deliveries",
  {
    id: uuid().primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notificationsTable.id, { onDelete: "cascade" }),
    channel: varchar({ length: 16 }).notNull(),
    status: notificationDeliveryStatusEnum().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_deliveries_notification_channel_unique").on(
      table.notificationId,
      table.channel,
    ),
    index("notification_deliveries_pending_idx")
      .on(table.createdAt)
      .where(sql`${table.status} = 'pending'`),
  ],
);
