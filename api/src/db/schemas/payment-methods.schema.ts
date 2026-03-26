import { sql } from 'drizzle-orm';
import { pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { currenciesTable } from './currencies.schema';

export const paymentMethodsTable = pgTable(
  'payment_methods',
  {
    id: uuid().primaryKey().defaultRandom(),
    code: varchar({ length: 32 }).notNull(),
    name: varchar({ length: 64 }).notNull(),
    currencyId: varchar('currency_id', { length: 3 }).references(() => currenciesTable.code, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('payment_methods_global_code_unique').on(table.code).where(sql`${table.currencyId} is null`),
    uniqueIndex('payment_methods_currency_code_unique')
      .on(table.code, table.currencyId)
      .where(sql`${table.currencyId} is not null`),
  ],
);
