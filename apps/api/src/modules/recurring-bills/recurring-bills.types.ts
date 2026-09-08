import type {
  recurringBillOccurrencesTable,
  recurringBillsTable,
} from "@/db/schemas/recurring-bills.schema";
export type RecurringBillRecord = typeof recurringBillsTable.$inferSelect;
export type RecurringBillOccurrenceRecord = typeof recurringBillOccurrencesTable.$inferSelect;
