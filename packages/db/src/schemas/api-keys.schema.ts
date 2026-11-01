import { now } from "@luraba/domain";
import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

/**
 * Better Auth `@better-auth/api-key` plugin table (model `apikey`, renamed to `apiKeys` in
 * `auth.ts`). The column names follow the plugin schema; the secret is only ever stored hashed.
 */
export const apiKeysTable = pgTable(
  "api_keys",
  {
    id: uuid().primaryKey().defaultRandom(),
    configId: text("config_id").notNull().default("default"),
    name: text(),
    start: text(),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    prefix: text(),
    key: text().notNull(),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at"),
    enabled: boolean().notNull().default(true),
    rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").notNull().default(0),
    remaining: integer(),
    lastRequest: timestamp("last_request"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(now),
    permissions: text(),
    metadata: text(),
  },
  (table) => [
    index("api_keys_reference_id_idx").on(table.referenceId),
    index("api_keys_config_id_idx").on(table.configId),
    index("api_keys_key_idx").on(table.key),
  ],
);
