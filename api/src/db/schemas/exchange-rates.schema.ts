import { date, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { currenciesTable } from './currencies.schema';

export const exchangeRatesTable = pgTable(
  'exchange_rates',
  {
    id: uuid().primaryKey().defaultRandom(),
    fromCurrencyId: varchar('from_currency_id', { length: 3 }).notNull().references(() => currenciesTable.code, { onDelete: 'restrict' }),
    toCurrencyId: varchar('to_currency_id', { length: 3 }).notNull().references(() => currenciesTable.code, { onDelete: 'restrict' }),
    rateNumerator: integer('rate_numerator').notNull(),
    rateDenominator: integer('rate_denominator').notNull(),
    rateDate: date('rate_date', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('exchange_rates_pair_date_unique').on(
      table.fromCurrencyId,
      table.toCurrencyId,
      table.rateDate,
    ),
  ],
);
