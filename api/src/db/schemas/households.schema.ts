import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { currenciesTable } from './currencies.schema';
import {
  creditExpenseTimingEnum,
  creditInstallmentBudgetModeEnum,
  householdInviteStatusEnum,
  householdRoleEnum,
  preferredTimezoneEnum,
} from './enums.schema';
import { usersTable } from './users.schema';

export const householdsTable = pgTable('households', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  defaultCurrencyId: varchar('default_currency_id', { length: 3 })
    .notNull()
    .references(() => currenciesTable.code, { onDelete: 'restrict' }),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('BR'),
  timezone: preferredTimezoneEnum('timezone').notNull().default('America/Sao_Paulo'),
  budgetMonthStartsOn: integer('budget_month_starts_on').notNull().default(1),
  creditExpenseTiming: creditExpenseTimingEnum('credit_expense_timing')
    .notNull()
    .default('spend_month'),
  creditInstallmentBudgetMode: creditInstallmentBudgetModeEnum('credit_installment_budget_mode')
    .notNull()
    .default('per_installment'),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const householdMembersTable = pgTable(
  'household_members',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => householdsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: householdRoleEnum().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('household_members_household_user_unique').on(table.householdId, table.userId),
  ],
);

export const householdInvitesTable = pgTable(
  'household_invites',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => householdsTable.id, { onDelete: 'cascade' }),
    email: varchar({ length: 255 }).notNull(),
    role: householdRoleEnum().notNull(),
    status: householdInviteStatusEnum().notNull().default('pending'),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at'),
    rejectedAt: timestamp('rejected_at'),
    canceledAt: timestamp('canceled_at'),
    expiresAt: timestamp('expires_at').notNull(),
    tokenHash: text('token_hash'),
  },
  (table) => [
    uniqueIndex('household_invites_pending_email_unique')
      .on(table.householdId, table.email)
      .where(sql`${table.status} = 'pending'`),
    uniqueIndex('household_invites_token_hash_unique')
      .on(table.tokenHash)
      .where(sql`${table.tokenHash} is not null`),
  ],
);
