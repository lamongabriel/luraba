import type { ImportReconciliation } from "@luraba/contracts/imports";
import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { and, eq, lte, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { ledgerLinesBetween, loadTarget } from "./imports.ledger";
import { importRowsRepository } from "./imports.repository";
import { requireBatch } from "./imports.service";

const MAX_MISSING_LISTED = 100;

function iso(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

async function ledgerBalanceAsOf(householdId: string, ledgerAccountId: string, asOf: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${entriesTable.amount}), 0)`.mapWith(Number) })
    .from(entriesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
    .where(
      and(
        eq(entriesTable.ledgerAccountId, ledgerAccountId),
        eq(transactionsTable.householdId, householdId),
        lte(transactionsTable.postedDate, new Date(`${asOf}T00:00:00Z`)),
      ),
    );
  return row?.total ?? 0;
}

/**
 * Compares the file with Luraba: the closing balance the bank printed against the balance Luraba
 * computes for the same date, the in/out totals of the period, and the lines that exist on only
 * one side. Matching is by date and amount (count-aware), which is how a human would check it.
 */
export async function getReconciliation(
  context: HouseholdContext,
  id: string,
): Promise<ImportReconciliation> {
  const batch = await requireBatch(context, id);
  const target = await loadTarget(context, batch);
  const rows = await importRowsRepository.listAll(id);
  const isCard = batch.sourceKind === "credit_card";
  const notes: string[] = [];

  const fileRows = rows.filter((r) => r.amount !== null && r.postedDate !== null);
  const statementIn = fileRows.reduce((sum, r) => sum + Math.max(r.amount as number, 0), 0);
  const statementOut = fileRows.reduce((sum, r) => sum + Math.max(-(r.amount as number), 0), 0);

  const periodStart = iso(batch.periodStart);
  const periodEnd = iso(batch.periodEnd);
  const balanceDate = iso(batch.statementBalanceDate) ?? periodEnd;

  let lurabaBalance: number | null = null;
  let lurabaOpening: number | null = null;
  let lines: Awaited<ReturnType<typeof ledgerLinesBetween>> = [];
  if (target?.ledgerAccountId) {
    if (balanceDate) {
      const raw = await ledgerBalanceAsOf(context.householdId, target.ledgerAccountId, balanceDate);
      lurabaBalance = isCard ? -raw : raw;
    }
    if (periodStart && !isCard) {
      const dayBefore = new Date(`${periodStart}T00:00:00Z`);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      lurabaOpening = await ledgerBalanceAsOf(
        context.householdId,
        target.ledgerAccountId,
        dayBefore.toISOString().slice(0, 10),
      );
    }
    if (periodStart && periodEnd) {
      lines = await ledgerLinesBetween(
        context.householdId,
        target.ledgerAccountId,
        periodStart,
        periodEnd,
      );
    }
  } else {
    notes.push("Choose the Luraba account or card to compare against.");
  }
  if (batch.statementBalance === null)
    notes.push(
      "This file does not state a closing balance, so only the transactions can be compared. OFX exports usually include it.",
    );
  if (isCard)
    notes.push(
      "Luraba's card balance is the credit in use: it includes installments still to be billed, so it is normally higher than the amount owed on the latest invoice. Compare transactions to be sure.",
    );
  else
    notes.push(
      "The balances only agree when Luraba holds every transaction up to the statement date and an opening balance. Import earlier statements first if the difference looks like a round history gap.",
    );

  // Count-aware matching of file lines against Luraba lines by date and amount.
  const lurabaPool = new Map<string, typeof lines>();
  for (const line of lines) {
    const key = `${line.date}|${line.amount}`;
    lurabaPool.set(key, [...(lurabaPool.get(key) ?? []), line]);
  }
  let missingInLuraba = 0;
  for (const row of fileRows) {
    const key = `${iso(row.postedDate)}|${row.amount}`;
    const pool = lurabaPool.get(key);
    if (pool && pool.length > 0) pool.pop();
    else missingInLuraba += 1;
  }
  const missingInStatement = [...lurabaPool.values()]
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_MISSING_LISTED);
  if (fileRows.some((r) => r.installmentTotal && r.installmentTotal > 1))
    notes.push(
      "Installment purchases are stored as one purchase dated back to their first installment, so those lines are expected to show as unmatched by date.",
    );

  const balanceDifference =
    batch.statementBalance !== null && lurabaBalance !== null
      ? batch.statementBalance - lurabaBalance
      : null;

  const impliedOpening =
    !isCard && batch.statementBalance !== null
      ? batch.statementBalance - (statementIn - statementOut)
      : null;
  const openingDifference =
    impliedOpening !== null && lurabaOpening !== null ? impliedOpening - lurabaOpening : null;
  if (openingDifference !== null && openingDifference !== 0)
    notes.push(
      "The balance before this period differs, so Luraba is missing an opening balance or earlier history. Add an opening balance to the account or import earlier statements; the transactions in this file are not the problem.",
    );

  return {
    batchId: batch.id,
    currencyCode: batch.currencyCode,
    targetName: target?.name ?? null,
    statement: {
      periodStart,
      periodEnd,
      balance: batch.statementBalance,
      balanceDate,
      rowCount: fileRows.length,
      totalIn: statementIn,
      totalOut: statementOut,
      impliedOpeningBalance: impliedOpening,
    },
    luraba: {
      balance: lurabaBalance,
      openingBalance: lurabaOpening,
      rowCount: lines.length,
      totalIn: lines.reduce((sum, l) => sum + Math.max(l.amount, 0), 0),
      totalOut: lines.reduce((sum, l) => sum + Math.max(-l.amount, 0), 0),
    },
    openingDifference,
    balanceDifference,
    matches: balanceDifference === null ? null : balanceDifference === 0,
    missingInLuraba,
    missingInStatement,
    notes,
  };
}
