import { pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { transactionsTable } from './transactions.schema';
import { tagsTable } from './tags.schema';

export const transactionTagsTable = pgTable(
  'transaction_tags',
  {
    transactionId: uuid('transaction_id').notNull().references(() => transactionsTable.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tagsTable.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.transactionId, table.tagId], name: 'transaction_tags_pk' })],
);
