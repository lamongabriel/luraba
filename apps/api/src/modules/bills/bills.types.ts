import type { billOccurrencesTable, billsTable } from "@luraba/db/schemas/bills.schema";

export type BillRecord = typeof billsTable.$inferSelect;
export type OccurrenceRecord = typeof billOccurrencesTable.$inferSelect;
