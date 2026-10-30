import type { HouseholdContext } from "@/config/permissions";
import { type ImportTarget, ledgerLinesBetween } from "./imports.ledger";
import { importRecordsRepository } from "./imports.repository";
import type { DuplicateMark, ImportRowRecord } from "./imports.types";

export type RowDefaults = { id: string; hints: Record<string, unknown>; skip: boolean };

function iso(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * Marks rows that already exist in Luraba, in three tiers:
 * 1. exact: the bank id, the date+amount+description fingerprint or the installment plan was
 *    imported before (idempotent re-imports, and OFX then CSV of the same period);
 * 2. possible: same date and amount as a transaction already on the target, whoever created it
 *    (count-aware: two identical rows need two transactions);
 * 3. netted: inside a card file, a charge and a credit of the same amount on the same day offset
 *    each other. Refund credits that stay unmatched are skipped by default.
 * Marked rows start as skipped; the user can include them again (exact duplicates are still never
 * imported twice, the importer rechecks).
 */
export async function detectDefaults(
  context: HouseholdContext,
  target: ImportTarget,
  rows: ImportRowRecord[],
): Promise<RowDefaults[]> {
  const records = await importRecordsRepository.listForTarget(context, target.type, target.id);
  const externalIds = new Set(records.flatMap((r) => (r.externalId ? [r.externalId] : [])));
  const fingerprints = new Set(records.flatMap((r) => (r.fingerprint ? [r.fingerprint] : [])));
  const seriesKeys = new Set(records.flatMap((r) => (r.seriesKey ? [r.seriesKey] : [])));

  const dates = rows.flatMap((r) => (r.postedDate ? [iso(r.postedDate) as string] : [])).sort();
  const available = new Map<string, number>();
  if (target.ledgerAccountId && dates.length > 0) {
    const lines = await ledgerLinesBetween(
      context.householdId,
      target.ledgerAccountId,
      dates[0] as string,
      dates[dates.length - 1] as string,
    );
    for (const line of lines) {
      const key = `${line.date}|${line.amount}`;
      available.set(key, (available.get(key) ?? 0) + 1);
    }
  }

  const marks = new Map<string, DuplicateMark>();
  const consume = (row: ImportRowRecord) => {
    const key = `${iso(row.postedDate)}|${row.amount}`;
    const left = available.get(key) ?? 0;
    if (left > 0) available.set(key, left - 1);
    return left > 0;
  };

  for (const row of rows) {
    if (row.externalId && externalIds.has(row.externalId)) {
      marks.set(row.id, { level: "exact", message: "Already imported (same ID)." });
    } else if (row.fingerprint && fingerprints.has(row.fingerprint)) {
      marks.set(row.id, {
        level: "exact",
        message: "Already imported.",
      });
    } else if (row.seriesKey && seriesKeys.has(row.seriesKey)) {
      marks.set(row.id, {
        level: "exact",
        message: `Installment plan already imported.`,
      });
    }
    if (marks.has(row.id)) consume(row);
  }
  for (const row of rows) {
    if (marks.has(row.id) || row.amount === null || !row.postedDate) continue;
    if (row.seriesKey) continue;
    if (consume(row)) {
      marks.set(row.id, {
        level: "possible",
        message: "Same date and amount already in Luraba.",
      });
    }
  }

  // Netting: a credit that is not a payment cancels one equal charge on the same day.
  const netted = new Set<string>();
  if (target.type === "credit_card") {
    const charges = new Map<string, string[]>();
    for (const row of rows) {
      if (row.amount !== null && row.amount < 0 && !marks.has(row.id))
        charges.set(`${iso(row.postedDate)}|${-row.amount}`, [
          ...(charges.get(`${iso(row.postedDate)}|${-row.amount}`) ?? []),
          row.id,
        ]);
    }
    for (const row of rows) {
      if (row.hints.movement === "card_payment" || row.amount === null || row.amount <= 0) continue;
      const candidates = charges.get(`${iso(row.postedDate)}|${row.amount}`);
      const chargeId = candidates?.pop();
      if (chargeId) {
        netted.add(row.id);
        netted.add(chargeId);
      }
    }
  }

  return rows.map((row) => {
    const { duplicate: _old, netted: _oldNetted, ...hints } = row.hints;
    const mark = marks.get(row.id);
    const isNetted = netted.has(row.id);
    const isRefund = hints.movement === "card_refund";
    return {
      id: row.id,
      hints: {
        ...hints,
        ...(mark ? { duplicate: mark } : {}),
        ...(isNetted ? { netted: true } : {}),
      },
      skip: Boolean(mark) || isNetted || isRefund,
    };
  });
}
