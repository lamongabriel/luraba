import { now } from "@luraba/domain";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

/**
 * Better Auth `mcp` plugin tables (OAuth 2 for MCP clients). Model names and columns follow the
 * plugin schema (`oauthApplication`, `oauthAccessToken`, `oauthConsent`). An application is an
 * agent that registered itself (dynamic client registration); tokens and consents belong to the
 * user who allowed it.
 */
export const oauthApplicationTable = pgTable("oauth_applications", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  icon: text(),
  metadata: text(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  redirectUrls: text("redirect_urls").notNull(),
  type: text().notNull(),
  disabled: boolean().default(false),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(now),
});

export const oauthAccessTokenTable = pgTable(
  "oauth_access_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    accessToken: text("access_token").notNull().unique(),
    refreshToken: text("refresh_token").notNull().unique(),
    accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthApplicationTable.clientId, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    scopes: text().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(now),
  },
  (table) => [
    index("oauth_access_tokens_client_id_idx").on(table.clientId),
    index("oauth_access_tokens_user_id_idx").on(table.userId),
  ],
);

export const oauthConsentTable = pgTable(
  "oauth_consents",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthApplicationTable.clientId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    scopes: text().notNull(),
    consentGiven: boolean("consent_given"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(now),
  },
  (table) => [
    index("oauth_consents_client_id_idx").on(table.clientId),
    index("oauth_consents_user_id_idx").on(table.userId),
  ],
);
