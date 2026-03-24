import { integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

export const merchantsTable = pgTable(
  'merchants',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    website: varchar({ length: 255 }),
    logoUrl: varchar('logo_url', { length: 512 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('merchants_user_name_unique').on(table.userId, table.name)],
);