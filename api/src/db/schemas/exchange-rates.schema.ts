import { bigint, date, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { currenciesTable } from './currencies.schema';

export const exchangeRatesTable = pgTable(
  'exchange_rates',
  {
    id: uuid().primaryKey().defaultRandom(),
    provider: varchar({ length: 64 }).notNull().default('frankfurter'),
    fromCurrencyId: varchar('from_currency_id', { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: 'restrict' }),
    toCurrencyId: varchar('to_currency_id', { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: 'restrict' }),
    rateNumerator: bigint('rate_numerator', { mode: 'number' }).notNull(),
    rateDenominator: bigint('rate_denominator', { mode: 'number' }).notNull(),
    rateDate: date('rate_date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('exchange_rates_pair_date_unique').on(
      table.provider,
      table.fromCurrencyId,
      table.toCurrencyId,
      table.rateDate,
    ),
  ],
);
