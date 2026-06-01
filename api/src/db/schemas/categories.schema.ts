import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { categoryTypeEnum } from './enums.schema';
import { householdsTable } from './households.schema';

export const categoriesTable = pgTable(
  'categories',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => householdsTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    parentId: uuid('parent_id'),
    type: categoryTypeEnum().notNull(),
    color: varchar({ length: 7 }),
    icon: varchar({ length: 128 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_household_name_unique').on(table.householdId, table.name)],
);
