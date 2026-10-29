import {
  bigint,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { uploadKindEnum, uploadScopeEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";
import { usersTable } from "./users.schema.js";

/**
 * A file in object storage. User-scoped uploads belong to one person (a profile
 * picture) and have no household; household-scoped uploads belong to the
 * household. Either way the uploader is recorded.
 */
export const uploadsTable = pgTable(
  "uploads",
  {
    id: uuid().primaryKey().defaultRandom(),
    scope: uploadScopeEnum().notNull(),
    householdId: uuid("household_id").references(() => householdsTable.id, {
      onDelete: "cascade",
    }),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Where the bytes live in the bucket. Random, never derived from the filename. */
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    filename: varchar({ length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 255 }).notNull(),
    kind: uploadKindEnum().notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: varchar({ length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uploads_storage_key_unique").on(table.storageKey),
    index("uploads_household_created_idx").on(table.householdId, table.createdAt),
    index("uploads_uploaded_by_idx").on(table.uploadedByUserId),
  ],
);

/**
 * Uses an upload for something. The target is polymorphic (type + id) so new
 * uses need no schema change; `ATTACHMENT_TARGETS` in the contracts defines the
 * valid targets and roles. An upload with no attachments is unused.
 */
export const attachmentsTable = pgTable(
  "attachments",
  {
    id: uuid().primaryKey().defaultRandom(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploadsTable.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: uuid("target_id").notNull(),
    role: varchar({ length: 32 }).notNull(),
    position: integer().notNull().default(0),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attachments_upload_target_role_unique").on(
      table.uploadId,
      table.targetType,
      table.targetId,
      table.role,
    ),
    index("attachments_target_idx").on(table.targetType, table.targetId),
  ],
);
