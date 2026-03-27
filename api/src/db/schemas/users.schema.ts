import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import {
  preferredLanguageEnum,
  preferredCurrencyEnum,
  preferredTimezoneEnum,
  preferredDateFormatEnum,
  defaultPeriodEnum,
  defaultAccountOrderEnum,
  countryCodeEnum,
  themePreferenceEnum,
  creditExpenseTimingEnum,
  creditInstallmentBudgetModeEnum,
} from './enums.schema';

export const usersTable = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  preferredLanguage: preferredLanguageEnum('preferred_language').notNull().default('en'),
  preferredCurrency: preferredCurrencyEnum('preferred_currency').notNull().default('BRL'),
  preferredTimezone: preferredTimezoneEnum('preferred_timezone').notNull().default('America/Sao_Paulo'),
  preferredDateFormat: preferredDateFormatEnum('preferred_date_format').notNull().default('DD/MM/YYYY'),
  defaultPeriod: defaultPeriodEnum('default_period').notNull().default('current_month'),
  defaultAccountOrder: defaultAccountOrderEnum('default_account_order').notNull().default('name_asc'),
  countryCode: countryCodeEnum('country_code').notNull().default('BR'),
  budgetMonthStartsOn: integer('budget_month_starts_on').notNull().default(1),
  creditExpenseTiming: creditExpenseTimingEnum('credit_expense_timing').notNull().default('spend_month'),
  creditInstallmentBudgetMode: creditInstallmentBudgetModeEnum('credit_installment_budget_mode')
    .notNull()
    .default('per_installment'),
  themePreference: themePreferenceEnum('theme_preference').notNull().default('system'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
