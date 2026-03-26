import { bigint, date, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
import { categoriesTable } from './categories.schema';
import { currenciesTable } from './currencies.schema';

export const budgetsTable = pgTable(
  'budgets',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    month: date('month', { mode: 'date' }).notNull(),
    categoryId: uuid('category_id').notNull().references(() => categoriesTable.id, { onDelete: 'restrict' }),
    amount: bigint({ mode: 'bigint' }).notNull(),
    currencyId: varchar('currency_id', { length: 3 }).notNull().references(() => currenciesTable.code, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('budgets_user_month_category_unique').on(table.userId, table.month, table.categoryId)],
);
