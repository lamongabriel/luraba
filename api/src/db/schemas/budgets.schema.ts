import { bigint, date, integer, pgTable, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
import { categoriesTable } from './categories.schema';
import { currenciesTable } from './currencies.schema';

export const budgetsTable = pgTable(
  'budgets',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    month: date('month', { mode: 'date' }).notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categoriesTable.id, { onDelete: 'restrict' }),
    amount: bigint({ mode: 'bigint' }).notNull(),
    currencyId: integer('currency_id')
      .notNull()
      .references(() => currenciesTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('budgets_user_month_category_unique').on(table.userId, table.month, table.categoryId)],
);