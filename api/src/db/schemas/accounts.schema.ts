import { pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { accountClassificationEnum, accountTypeEnum } from './enums.schema';
import { currenciesTable } from './currencies.schema';
import { householdsTable } from './households.schema';

export const accountsTable = pgTable(
  'accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => householdsTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    institutionName: varchar('institution_name', { length: 255 }),
    institutionDomain: varchar('institution_domain', { length: 255 }),
    institutionLogoUrl: varchar('institution_logo_url', { length: 512 }),
    notes: text(),
    classification: accountClassificationEnum().notNull(),
    type: accountTypeEnum().notNull(),
    currencyId: varchar('currency_id', { length: 3 }).notNull().references(() => currenciesTable.code, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('accounts_household_name_unique').on(table.householdId, table.name)],
);
