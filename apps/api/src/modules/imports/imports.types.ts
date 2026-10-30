import type { ImportIssue, ImportRowKind } from "@luraba/contracts/imports";
import type {
  importBatchesTable,
  importMappingsTable,
  importRecordsTable,
  importRowsTable,
  importTemplatesTable,
} from "@luraba/db/schemas/imports.schema";

export type ImportBatchRecord = typeof importBatchesTable.$inferSelect;
export type ImportRowRecord = typeof importRowsTable.$inferSelect;
export type ImportMappingRecord = typeof importMappingsTable.$inferSelect;
export type ImportTemplateRecord = typeof importTemplatesTable.$inferSelect;
export type ImportRecordRecord = typeof importRecordsTable.$inferSelect;

/** Marked on a row (inside `hints.duplicate`) when it already exists in Luraba. */
export type DuplicateMark = {
  /** `exact`: same bank id / fingerprint / installment plan. `possible`: same date and amount. */
  level: "exact" | "possible";
  message: string;
};

export type RowEvaluation = {
  kind: ImportRowKind | null;
  issues: ImportIssue[];
};
