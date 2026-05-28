import { text, timestamp, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { householdsTable } from './households.schema';

export const brandfetchIntegrationsTable = pgTable(
  'brandfetch_integrations',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => householdsTable.id, { onDelete: 'cascade' }),
    encryptedClientId: text('encrypted_client_id').notNull(),
    lastCheckedAt: timestamp('last_checked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('brandfetch_integrations_household_unique').on(table.householdId)],
);
