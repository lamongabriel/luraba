import { now } from "@luraba/domain";
import { boolean, date, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { currenciesTable } from "./currencies.schema.js";
import {
  defaultPeriodEnum,
  preferredDateFormatEnum,
  preferredLanguageEnum,
  themePreferenceEnum,
} from "./enums.schema.js";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: varchar({ length: 512 }),
  /** E.164, e.g. +15551234567. Used for SMS notifications; null until the user adds one. */
  phoneNumber: varchar("phone_number", { length: 20 }),
  /** ISO 3166-1 alpha-2 country the user lives in. */
  countryCode: varchar("country_code", { length: 2 }),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  defaultHouseholdId: uuid("default_household_id"),
  preferredLanguage: preferredLanguageEnum("preferred_language").notNull().default("en"),
  preferredCurrency: varchar("preferred_currency", { length: 3 })
    .notNull()
    .default("BRL")
    .references(() => currenciesTable.code, { onDelete: "restrict" }),
  preferredTimezone: varchar("preferred_timezone", { length: 64 })
    .notNull()
    .default("America/Sao_Paulo"),
  preferredDateFormat: preferredDateFormatEnum("preferred_date_format")
    .notNull()
    .default("DD/MM/YYYY"),
  preferredPeriod: defaultPeriodEnum("preferred_period").notNull().default("current_month"),
  preferredTheme: themePreferenceEnum("preferred_theme").notNull().default("system"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(now),
});
