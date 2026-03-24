import { integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { categoryTypeEnum } from './finance-enums.schema';
import { usersTable } from './users.schema';

export const categoriesTable = pgTable(
  'categories',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    parentId: integer('parent_id'),
    type: categoryTypeEnum().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_user_name_unique').on(table.userId, table.name)],
);