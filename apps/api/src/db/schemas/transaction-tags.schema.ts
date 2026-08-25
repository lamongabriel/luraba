import { integer, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tagsTable } from './tags.schema';
import { transactionsTable } from './transactions.schema';

export const transactionTagsTable = pgTable(
  'transaction_tags',
  {
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactionsTable.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tagsTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.transactionId, table.tagId], name: 'transaction_tags_pk' }),
  ],
);
