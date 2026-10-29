import type { notificationsTable } from "@luraba/db/schemas/notifications.schema";

export type NotificationRecord = typeof notificationsTable.$inferSelect;
export type { ExternalChannel, NotifyInput, RecipientContact } from "@luraba/notifications";
