import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const currenciesTable = pgTable('currencies', {
  code: varchar({ length: 3 }).primaryKey(),
  symbol: varchar({ length: 8 }).notNull(),
  precision: integer().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
