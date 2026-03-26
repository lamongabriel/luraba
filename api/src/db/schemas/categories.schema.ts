import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { categoryTypeEnum } from './enums.schema';
import { usersTable } from './users.schema';

export const categoriesTable = pgTable(
  'categories',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    parentId: uuid('parent_id'),
    type: categoryTypeEnum().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_user_name_unique').on(table.userId, table.name)],
);
