import type { ImportFilter } from "@luraba/contracts/imports";
import { importRowsTable } from "@luraba/db/schemas/imports.schema";
import { and, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

const hasError = sql`jsonb_path_exists(${importRowsTable.issues}, '$[*] ? (@.severity == "error")')`;
const hasWarning = sql`jsonb_path_exists(${importRowsTable.issues}, '$[*] ? (@.severity == "warning")')`;
const hasDuplicate = sql`jsonb_path_exists(${importRowsTable.issues}, '$[*] ? (@.code == "duplicate")')`;
const needsMapping = sql`jsonb_path_exists(${importRowsTable.issues}, '$[*] ? (@.code == "needs_mapping")')`;

/** SQL twins of `deriveRowStatus`: keep them in step. */
export function buildRowFilter(
  batchId: string,
  filter: ImportFilter,
  search: string | undefined,
): SQL | undefined {
  const base = eq(importRowsTable.batchId, batchId);
  const pending = isNull(importRowsTable.outcome);
  const byFilter: Record<ImportFilter, SQL | undefined> = {
    all: undefined,
    attention: and(pending, or(hasError, hasWarning)),
    invalid: and(pending, sql`not ${importRowsTable.skip}`, sql`not ${hasDuplicate}`, hasError),
    duplicates: or(hasDuplicate, eq(importRowsTable.outcome, "duplicate")),
    skipped: and(pending, importRowsTable.skip, sql`not ${hasDuplicate}`),
    unmapped: and(pending, sql`not ${importRowsTable.skip}`, needsMapping),
    created: eq(importRowsTable.outcome, "created"),
    failed: eq(importRowsTable.outcome, "failed"),
  };
  const term = search ? `%${search}%` : undefined;
  return and(
    base,
    byFilter[filter],
    term
      ? or(ilike(importRowsTable.description, term), ilike(importRowsTable.counterparty, term))
      : undefined,
  );
}

/** Per-batch summary counters computed by the database (rows can number in the thousands). */
export const batchSummarySelect = {
  ready:
    sql<number>`count(*) filter (where ${importRowsTable.outcome} is null and not ${importRowsTable.skip} and not ${hasDuplicate} and not ${hasError})`.mapWith(
      Number,
    ),
  invalid:
    sql<number>`count(*) filter (where ${importRowsTable.outcome} is null and not ${importRowsTable.skip} and not ${hasDuplicate} and ${hasError})`.mapWith(
      Number,
    ),
  duplicates:
    sql<number>`count(*) filter (where ${importRowsTable.outcome} is null and ${hasDuplicate})`.mapWith(
      Number,
    ),
  skipped:
    sql<number>`count(*) filter (where ${importRowsTable.outcome} is null and ${importRowsTable.skip} and not ${hasDuplicate})`.mapWith(
      Number,
    ),
  warnings:
    sql<number>`count(*) filter (where ${importRowsTable.outcome} is null and not ${importRowsTable.skip} and not ${hasDuplicate} and not ${hasError} and ${hasWarning})`.mapWith(
      Number,
    ),
};
