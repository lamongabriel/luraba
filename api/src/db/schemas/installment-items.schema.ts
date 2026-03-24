import { bigint, integer, pgTable, uniqueIndex } from 'drizzle-orm/pg-core';
import { installmentsTable } from './installments.schema';
import { billingCyclesTable } from './billing-cycles.schema';
import { entriesTable } from './entries.schema';

export const installmentItemsTable = pgTable(
  'installment_items',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    installmentId: integer('installment_id')
      .notNull()
      .references(() => installmentsTable.id, { onDelete: 'cascade' }),
    billingCycleId: integer('billing_cycle_id')
      .notNull()
      .references(() => billingCyclesTable.id, { onDelete: 'restrict' }),
    amount: bigint({ mode: 'bigint' }).notNull(),
    entryId: integer('entry_id').references(() => entriesTable.id, { onDelete: 'set null' }),
  },
  (table) => [uniqueIndex('installment_items_entry_unique').on(table.entryId)],
);