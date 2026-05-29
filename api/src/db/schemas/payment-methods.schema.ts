import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { currenciesTable } from './currencies.schema';
import { householdsTable } from './households.schema';

export const paymentMethodsTable = pgTable(
  'payment_methods',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id').references(() => householdsTable.id, { onDelete: 'cascade' }),
    code: varchar({ length: 32 }).notNull(),
    name: varchar({ length: 64 }).notNull(),
    currencyId: varchar('currency_id', { length: 3 }).references(() => currenciesTable.code, { onDelete: 'cascade' }),
    translationKey: varchar('translation_key', { length: 128 }),
    color: varchar({ length: 16 }),
    icon: varchar({ length: 128 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_methods_system_global_code_unique').on(table.code).where(sql`${table.householdId} is null and ${table.currencyId} is null`),
    uniqueIndex('payment_methods_system_currency_code_unique').on(table.code, table.currencyId).where(sql`${table.householdId} is null and ${table.currencyId} is not null`),
    uniqueIndex('payment_methods_household_global_code_unique').on(table.householdId, table.code).where(sql`${table.householdId} is not null and ${table.currencyId} is null`),
    uniqueIndex('payment_methods_household_currency_code_unique').on(table.householdId, table.code, table.currencyId).where(sql`${table.householdId} is not null and ${table.currencyId} is not null`),
  ],
);
