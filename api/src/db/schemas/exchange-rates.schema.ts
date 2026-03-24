import { date, integer, pgTable, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { currenciesTable } from './currencies.schema';

export const exchangeRatesTable = pgTable(
  'exchange_rates',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    fromCurrencyId: integer('from_currency_id').notNull().references(() => currenciesTable.id, { onDelete: 'restrict' }),
    toCurrencyId: integer('to_currency_id').notNull().references(() => currenciesTable.id, { onDelete: 'restrict' }),
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