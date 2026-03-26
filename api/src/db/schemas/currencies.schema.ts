import { integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const currenciesTable = pgTable(
  'currencies',
  {
    id: uuid().primaryKey().defaultRandom(),
    code: varchar({ length: 3 }).notNull(),
    symbol: varchar({ length: 8 }).notNull(),
    precision: integer().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('currencies_code_unique').on(table.code)],
);
