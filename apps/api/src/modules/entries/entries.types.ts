import type { entriesTable } from "@luraba/db/schemas/entries.schema";

export type EntryRecord = typeof entriesTable.$inferSelect;

export type EntryDraft = {
  ledgerAccountId: string;
  amount: number;
  currencyCode: string;
  categoryId?: string;
  budgetMonth?: Date;
};
