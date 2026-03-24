import { integer, pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  preferredLanguage: varchar('preferred_language', { length: 16 }).notNull().default('en'),
  preferredCurrency: varchar('preferred_currency', { length: 8 }).notNull().default('BRL'),
  preferredTimezone: varchar('preferred_timezone', { length: 64 }).notNull().default('America/Sao_Paulo'),
  preferredDateFormat: varchar('preferred_date_format', { length: 32 }).notNull().default('DD/MM/YYYY'),
  defaultPeriod: varchar('default_period', { length: 32 }).notNull().default('current_month'),
  defaultAccountOrder: varchar('default_account_order', { length: 32 }).notNull().default('name_asc'),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('BR'),
  budgetMonthStartsOn: integer('budget_month_starts_on').notNull().default(1),
  themePreference: varchar('theme_preference', { length: 16 }).notNull().default('system'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});