import { bigint, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { accountsTable } from './accounts.schema';
import { currenciesTable } from './currencies.schema';

export const creditCardsTable = pgTable(
  'credit_cards',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accountsTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    brand: varchar({ length: 64 }).notNull(),
    last4: varchar({ length: 4 }).notNull(),
    limitAmount: bigint('limit_amount', { mode: 'bigint' }).notNull(),
    currencyId: integer('currency_id')
      .notNull()
      .references(() => currenciesTable.id, { onDelete: 'restrict' }),
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    graceDays: integer('grace_days').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('credit_cards_account_name_unique').on(table.accountId, table.name)],
);