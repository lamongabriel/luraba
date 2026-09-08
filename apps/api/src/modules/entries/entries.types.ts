import type { entriesTable } from "@/db/schemas/entries.schema";

export type EntryRecord = typeof entriesTable.$inferSelect;

export type EntryDraft = {
  ledgerAccountId: string;
  amount: number;
  currencyCode: string;
  categoryId?: string;
  budgetMonth?: Date;
};
