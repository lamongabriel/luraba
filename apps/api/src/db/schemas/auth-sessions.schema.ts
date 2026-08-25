import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

export const authSessionsTable = pgTable(
  'auth_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
  },
  (table) => [index('auth_sessions_user_id_idx').on(table.userId)],
);
