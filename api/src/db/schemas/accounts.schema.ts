import { integer, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { accountTypeEnum } from './finance-enums.schema';
import { usersTable } from './users.schema';
import { currenciesTable } from './currencies.schema';

export const accountsTable = pgTable(
  'accounts',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    institutionName: varchar('institution_name', { length: 255 }),
    institutionDomain: varchar('institution_domain', { length: 255 }),
    notes: text(),
    type: accountTypeEnum().notNull(),
    currencyId: integer('currency_id').notNull().references(() => currenciesTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('accounts_user_name_unique').on(table.userId, table.name)],
);