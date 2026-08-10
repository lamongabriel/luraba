import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accountsTable } from './accounts.schema';
import { categoriesTable } from './categories.schema';
import { householdsTable } from './households.schema';
import { merchantsTable } from './merchants.schema';
import { paymentMethodsTable } from './payment-methods.schema';
import { transactionsTable } from './transactions.schema';
import { usersTable } from './users.schema';

export const recurringBillsTable = pgTable(
  'recurring_bills',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => householdsTable.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    type: varchar({ length: 16 }).notNull(),
    status: varchar({ length: 16 }).notNull().default('active'),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accountsTable.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => categoriesTable.id, { onDelete: 'set null' }),
    merchantId: uuid('merchant_id').references(() => merchantsTable.id, { onDelete: 'set null' }),
    paymentMethodId: uuid('payment_method_id').references(() => paymentMethodsTable.id, {
      onDelete: 'set null',
    }),
    amount: bigint({ mode: 'number' }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    startDate: date('start_date', { mode: 'date' }).notNull(),
    endDate: date('end_date', { mode: 'date' }),
    frequency: varchar({ length: 16 }).notNull(),
    dayOfMonth: integer('day_of_month'),
    dayOfWeek: integer('day_of_week'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('recurring_bills_household_idx').on(table.householdId),
    index('recurring_bills_status_idx').on(table.householdId, table.status),
  ],
);

export const recurringBillOccurrencesTable = pgTable(
  'recurring_bill_occurrences',
  {
    id: uuid().primaryKey().defaultRandom(),
    recurringBillId: uuid('recurring_bill_id')
      .notNull()
      .references(() => recurringBillsTable.id, { onDelete: 'cascade' }),
    occurrenceDate: date('occurrence_date', { mode: 'date' }).notNull(),
    status: varchar({ length: 16 }).notNull().default('scheduled'),
    rescheduledDate: date('rescheduled_date', { mode: 'date' }),
    transactionId: uuid('transaction_id').references(() => transactionsTable.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('recurring_bill_occurrences_bill_date_unique').on(
      table.recurringBillId,
      table.occurrenceDate,
    ),
    index('recurring_bill_occurrences_date_idx').on(table.occurrenceDate),
  ],
);
