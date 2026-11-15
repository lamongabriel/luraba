import { cardInstallmentAuditsTable, cardRoundingPatternsTable } from "@luraba/db/schema";
import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { creditCardInstallmentsTable } from "@luraba/db/schemas/credit-card-installments.schema";
import { creditCardPaymentAllocationsTable } from "@luraba/db/schemas/credit-card-payment-allocations.schema";
import { creditCardPaymentsTable } from "@luraba/db/schemas/credit-card-payments.schema";
import { creditCardPurchasesTable } from "@luraba/db/schemas/credit-card-purchases.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import {
  detectPartialRoundingPattern,
  formatISODate,
  type InstallmentRoundingMode,
  learnRoundingPattern,
  PAYMENT_MISMATCH_TOLERANCE,
  type RoundingPatternKind,
} from "@luraba/domain";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { AppError } from "@/shared/errors";
import type { BaseCreditCardCycleSummary } from "./credit-cards.types";

type Executor = TxClient | typeof db;

/** Plain decimal text for audit notes; the currency is the card's, so no symbol. */
export function formatMinor(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// -----------------------------------------------------------------------------------------------------------------
// Lock
// -----------------------------------------------------------------------------------------------------------------

/** 409 with a stable code the web and MCP recognize: the invoice is reconciled; retry with `override: true`. */
export class ReconciledInvoiceError extends AppError {
  constructor(message: string) {
    super(message, 409, "RECONCILED_INVOICE");
  }
}

/**
 * Refuses to touch installments on invoices that were reconciled with the issuer, unless `override` is true. Returns
 * the reconciled cycle ids that the caller overrode so it can unlock them after the edit (their total no longer
 * equals the issuer's).
 */
export async function assertInvoicesUnlocked(
  executor: Executor,
  cycleIds: string[],
  override: boolean | undefined,
): Promise<string[]> {
  const unique = [...new Set(cycleIds)];
  if (unique.length === 0) return [];
  const locked = await executor
    .select({
      id: creditCardBillingCyclesTable.id,
      dueDate: creditCardBillingCyclesTable.dueDate,
    })
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        inArray(creditCardBillingCyclesTable.id, unique),
        isNotNull(creditCardBillingCyclesTable.reconciledAt),
      ),
    );
  if (locked.length === 0) return [];
  if (!override) {
    const months = locked.map((cycle) => formatISODate(cycle.dueDate).slice(0, 7)).sort();
    throw new ReconciledInvoiceError(
      `The ${months.join(", ")} invoice${months.length > 1 ? "s are" : " is"} reconciled with the issuer and locked. ` +
        "Editing it makes the total differ from the issuer's; send override: true to edit anyway (the invoice is then unlocked and the change is logged).",
    );
  }
  return locked.map((cycle) => cycle.id);
}

export async function unlockCycles(executor: Executor, cycleIds: string[]): Promise<void> {
  if (cycleIds.length === 0) return;
  await executor
    .update(creditCardBillingCyclesTable)
    .set({ reconciledAt: null, issuerTotal: null })
    .where(inArray(creditCardBillingCyclesTable.id, cycleIds));
}

// -----------------------------------------------------------------------------------------------------------------
// Audit trail
// -----------------------------------------------------------------------------------------------------------------

export type InstallmentAuditInput = {
  householdId: string;
  creditCardId: string;
  purchaseId: string;
  installmentId: string | null;
  billingCycleId: string | null;
  installmentNumber: number;
  previousAmount: number;
  newAmount: number;
  source: "statement" | "override" | "manual";
  statementImportId?: string | null;
  /** The purchase description, for the readable note. */
  description: string;
  /** Appended to the note, e.g. "from Nubank 2026-10 statement". */
  origin?: string;
  userId?: string | null;
};

export async function recordInstallmentAudit(
  executor: Executor,
  input: InstallmentAuditInput,
): Promise<void> {
  if (input.previousAmount === input.newAmount) return;
  const origin =
    input.origin ??
    (input.source === "override" ? "manual override of a reconciled invoice" : "manual edit");
  await executor.insert(cardInstallmentAuditsTable).values({
    householdId: input.householdId,
    creditCardId: input.creditCardId,
    purchaseId: input.purchaseId,
    installmentId: input.installmentId,
    billingCycleId: input.billingCycleId,
    installmentNumber: input.installmentNumber,
    previousAmount: input.previousAmount,
    newAmount: input.newAmount,
    source: input.source,
    statementImportId: input.statementImportId ?? null,
    note: `${input.description} inst ${input.installmentNumber}: ${formatMinor(input.previousAmount)} -> ${formatMinor(input.newAmount)}, ${origin}`,
    createdByUserId: input.userId ?? null,
  });
}

// -----------------------------------------------------------------------------------------------------------------
// Payment check
// -----------------------------------------------------------------------------------------------------------------

/**
 * Invoices a payment is a few cents off (paid minus invoice, 1 to 10 cents either way): the sign of a rounding
 * difference between Luraba's split and the issuer's. Reconciled invoices are left out (the statement was already
 * imported, so a difference left there is a real one). Derived on read: it never goes stale.
 */
export async function computeRoundingMismatches(
  creditCardId: string,
  cycles: Array<{ id: string; statementAmount: number; reconciledAt?: Date | null }>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const candidates = cycles.filter((cycle) => !cycle.reconciledAt && cycle.statementAmount > 0);
  if (candidates.length === 0) return result;
  const rows = await db
    .select({
      cycleId: creditCardPaymentAllocationsTable.billingCycleId,
      paymentAmount: creditCardPaymentsTable.amount,
    })
    .from(creditCardPaymentAllocationsTable)
    .innerJoin(
      creditCardPaymentsTable,
      eq(creditCardPaymentsTable.id, creditCardPaymentAllocationsTable.paymentId),
    )
    .where(
      and(
        eq(creditCardPaymentsTable.creditCardId, creditCardId),
        inArray(
          creditCardPaymentAllocationsTable.billingCycleId,
          candidates.map((cycle) => cycle.id),
        ),
      ),
    );
  const statementByCycle = new Map(candidates.map((cycle) => [cycle.id, cycle.statementAmount]));
  for (const row of rows) {
    if (!row.cycleId) continue;
    const difference = row.paymentAmount - (statementByCycle.get(row.cycleId) ?? 0);
    if (difference !== 0 && Math.abs(difference) <= PAYMENT_MISMATCH_TOLERANCE) {
      result.set(row.cycleId, difference);
    }
  }
  return result;
}

/** The invoice a single payment is a few cents off, if any (paid minus invoice). */
export function findPaymentRoundingMismatch(
  paymentAmount: number,
  cycles: Array<{ id: string; statementAmount: number; reconciledAt: Date | null }>,
): { billingCycleId: string; difference: number } | null {
  for (const cycle of cycles) {
    if (cycle.reconciledAt || cycle.statementAmount <= 0) continue;
    const difference = paymentAmount - cycle.statementAmount;
    if (difference !== 0 && Math.abs(difference) <= PAYMENT_MISMATCH_TOLERANCE) {
      return { billingCycleId: cycle.id, difference };
    }
  }
  return null;
}

/** Fills `roundingMismatch` on cycle summaries (the rest of the shape is untouched). */
export async function decorateCycles<
  T extends Pick<BaseCreditCardCycleSummary, "id" | "statementAmount" | "reconciledAt">,
>(creditCardId: string, cycles: T[]): Promise<Array<T & { roundingMismatch: number | null }>> {
  const mismatches = await computeRoundingMismatches(
    creditCardId,
    cycles.map((cycle) => ({
      id: cycle.id,
      statementAmount: cycle.statementAmount,
      reconciledAt: cycle.reconciledAt ? new Date(cycle.reconciledAt) : null,
    })),
  );
  return cycles.map((cycle) => ({ ...cycle, roundingMismatch: mismatches.get(cycle.id) ?? null }));
}

// -----------------------------------------------------------------------------------------------------------------
// Learned rounding pattern
// -----------------------------------------------------------------------------------------------------------------

export type StoredRoundingPattern = {
  pattern: "first" | "last" | "middle" | "none";
  roundingMode: InstallmentRoundingMode | null;
  samples: number;
};

/**
 * Rebuilds the card's learned rounding pattern from the installments on reconciled invoices: one vote per purchase
 * (read with `detectPartialRoundingPattern`), oldest purchase first, for the whole card and for each merchant.
 */
export async function learnRoundingPatterns(
  executor: Executor,
  context: Pick<HouseholdContext, "householdId">,
  creditCardId: string,
): Promise<void> {
  const rows = await executor
    .select({
      purchaseId: creditCardInstallmentsTable.purchaseId,
      number: creditCardInstallmentsTable.installmentNumber,
      amount: creditCardInstallmentsTable.amount,
      count: creditCardPurchasesTable.installmentCount,
      merchantId: transactionsTable.merchantId,
      postedDate: transactionsTable.postedDate,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardBillingCyclesTable,
      eq(creditCardBillingCyclesTable.id, creditCardInstallmentsTable.billingCycleId),
    )
    .innerJoin(
      creditCardPurchasesTable,
      eq(creditCardPurchasesTable.id, creditCardInstallmentsTable.purchaseId),
    )
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .where(
      and(
        eq(creditCardInstallmentsTable.creditCardId, creditCardId),
        isNotNull(creditCardBillingCyclesTable.reconciledAt),
      ),
    )
    .orderBy(asc(transactionsTable.postedDate), asc(creditCardInstallmentsTable.purchaseId));

  const purchases = new Map<
    string,
    {
      count: number;
      merchantId: string | null;
      entries: Array<{ number: number; amount: number }>;
    }
  >();
  for (const row of rows) {
    const purchase = purchases.get(row.purchaseId) ?? {
      count: row.count,
      merchantId: row.merchantId,
      entries: [],
    };
    purchase.entries.push({ number: row.number, amount: row.amount });
    purchases.set(row.purchaseId, purchase);
  }

  const cardVotes: RoundingPatternKind[] = [];
  const merchantVotes = new Map<string, RoundingPatternKind[]>();
  for (const purchase of purchases.values()) {
    const kind = detectPartialRoundingPattern(purchase.entries, purchase.count);
    if (kind === null) continue;
    cardVotes.push(kind);
    if (purchase.merchantId) {
      merchantVotes.set(purchase.merchantId, [
        ...(merchantVotes.get(purchase.merchantId) ?? []),
        kind,
      ]);
    }
  }

  await executor
    .delete(cardRoundingPatternsTable)
    .where(eq(cardRoundingPatternsTable.creditCardId, creditCardId));
  const values: Array<typeof cardRoundingPatternsTable.$inferInsert> = [];
  const card = learnRoundingPattern(cardVotes);
  if (card) {
    values.push({ householdId: context.householdId, creditCardId, merchantKey: "", ...card });
  }
  for (const [merchantId, votes] of merchantVotes) {
    const learned = learnRoundingPattern(votes);
    if (learned) {
      values.push({
        householdId: context.householdId,
        creditCardId,
        merchantKey: merchantId,
        ...learned,
      });
    }
  }
  if (values.length > 0) await executor.insert(cardRoundingPatternsTable).values(values);
}

/** The learned pattern's rounding mode for a new purchase: the merchant's first, then the card's. */
export async function findLearnedRoundingMode(
  creditCardId: string,
  merchantId: string | null | undefined,
): Promise<InstallmentRoundingMode | null> {
  const rows = await db
    .select({
      merchantKey: cardRoundingPatternsTable.merchantKey,
      roundingMode: cardRoundingPatternsTable.roundingMode,
    })
    .from(cardRoundingPatternsTable)
    .where(eq(cardRoundingPatternsTable.creditCardId, creditCardId));
  const merchantMode = merchantId
    ? rows.find((row) => row.merchantKey === merchantId)?.roundingMode
    : null;
  const mode = merchantMode ?? rows.find((row) => row.merchantKey === "")?.roundingMode ?? null;
  return (mode as InstallmentRoundingMode | null) ?? null;
}
