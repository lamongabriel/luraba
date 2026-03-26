import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { ledgerClassificationEnum, ledgerOwnerTypeEnum } from './enums.schema';
import { currenciesTable } from './currencies.schema';

export const ledgerAccountsTable = pgTable(
  'ledger_accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    classification: ledgerClassificationEnum().notNull(),
    ownerType: ledgerOwnerTypeEnum('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    currencyId: varchar('currency_id', { length: 3 }).notNull().references(() => currenciesTable.code, { onDelete: 'restrict' }),
    systemKey: varchar('system_key', { length: 128 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ledger_accounts_owner_unique')
      .on(table.ownerType, table.ownerId)
      .where(sql`${table.ownerType} <> 'system'`),
    uniqueIndex('ledger_accounts_system_key_unique').on(table.systemKey),
  ],
);
