import { integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { ledgerAccountTypeEnum, ledgerOwnerTypeEnum } from './finance-enums.schema';
import { currenciesTable } from './currencies.schema';

export const ledgerAccountsTable = pgTable(
  'ledger_accounts',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    type: ledgerAccountTypeEnum().notNull(),
    ownerType: ledgerOwnerTypeEnum('owner_type').notNull(),
    ownerId: integer('owner_id').notNull(),
    currencyId: integer('currency_id')
      .notNull()
      .references(() => currenciesTable.id, { onDelete: 'restrict' }),
    systemKey: varchar('system_key', { length: 128 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ledger_accounts_owner_unique').on(table.ownerType, table.ownerId),
    uniqueIndex('ledger_accounts_system_key_unique').on(table.systemKey),
  ],
);