import { normalizeKey } from "./parsers/text";
import type { ParsedRow } from "./parsers/types";

/** A parsed row plus the keys the staging and dedupe layers need. Pure: no database. */
export type NormalizedRow = ParsedRow & {
  rowIndex: number;
  sourceKey: string;
  externalKey: string | null;
  fingerprint: string | null;
  seriesKey: string | null;
};

const MAX_KEY_LENGTH = 200;

export function toSourceKey(row: Pick<ParsedRow, "counterparty" | "description">): string {
  return normalizeKey(row.counterparty || row.description).slice(0, MAX_KEY_LENGTH) || "(blank)";
}

/**
 * Computes the keys used to recognise a row on a later import:
 * - `externalKey`: the bank's id. When the file repeats an id (a charge and its IOF line share a
 *   FITID) the amount and the occurrence disambiguate, so each line stays unique.
 * - `fingerprint`: date + amount + description, numbered for identical lines in the same file, so
 *   two identical coffees on the same day are two rows and a re-import still matches both.
 * - `seriesKey`: one installment plan across monthly statements.
 */
export function normalizeRows(rows: ParsedRow[]): NormalizedRow[] {
  const idCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.externalId) idCounts.set(row.externalId, (idCounts.get(row.externalId) ?? 0) + 1);
  }

  const idOccurrences = new Map<string, number>();
  const fingerprintOccurrences = new Map<string, number>();

  return rows.map((row, rowIndex) => {
    let externalKey: string | null = null;
    if (row.externalId) {
      if ((idCounts.get(row.externalId) ?? 0) > 1) {
        const base = `${row.externalId}#${row.amount ?? "x"}`;
        const seen = idOccurrences.get(base) ?? 0;
        idOccurrences.set(base, seen + 1);
        externalKey = `${base}#${seen}`;
      } else {
        externalKey = row.externalId;
      }
    }

    let fingerprint: string | null = null;
    if (row.date && row.amount !== null) {
      const base = `${row.date}|${row.amount}|${normalizeKey(row.description)}`;
      const seen = fingerprintOccurrences.get(base) ?? 0;
      fingerprintOccurrences.set(base, seen + 1);
      fingerprint = `${base}#${seen}`;
    }

    const seriesKey =
      row.installment && row.seriesBase && row.amount !== null
        ? `${normalizeKey(row.seriesBase)}|${row.installment.total}|${Math.abs(row.amount)}`
        : null;

    return { ...row, rowIndex, sourceKey: toSourceKey(row), externalKey, fingerprint, seriesKey };
  });
}
