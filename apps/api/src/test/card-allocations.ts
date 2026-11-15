import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { creditCardPaymentAllocationsTable } from "@luraba/db/schemas/credit-card-payment-allocations.schema";
import { creditCardPaymentsTable } from "@luraba/db/schemas/credit-card-payments.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { allocatePayments } from "@luraba/domain";
import { asc, eq } from "drizzle-orm";
import { expect } from "vitest";
import { db } from "@/db";

/**
 * Reusable invariant for card payment allocations: for one card, sum(allocated) + credit balance
 * equals sum(payments), no invoice is paid above its statement, and every invoice's paid amount
 * equals what the oldest-first rule gives for the stored payments and statements (no phantom cents).
 * Returns the credit balance so a test can assert it.
 */
export async function assertCardAllocationInvariant(creditCardId: string): Promise<number> {
  const payments = await db
    .select({
      id: creditCardPaymentsTable.id,
      amount: creditCardPaymentsTable.amount,
    })
    .from(creditCardPaymentsTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPaymentsTable.transactionId))
    .where(eq(creditCardPaymentsTable.creditCardId, creditCardId))
    .orderBy(asc(transactionsTable.postedDate), asc(creditCardPaymentsTable.createdAt));
  const cycles = await db
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.creditCardId, creditCardId))
    .orderBy(asc(creditCardBillingCyclesTable.dueDate));
  const stored = await db
    .select({ amount: creditCardPaymentAllocationsTable.amount })
    .from(creditCardPaymentAllocationsTable)
    .innerJoin(
      creditCardPaymentsTable,
      eq(creditCardPaymentsTable.id, creditCardPaymentAllocationsTable.paymentId),
    )
    .where(eq(creditCardPaymentsTable.creditCardId, creditCardId));

  const expected = allocatePayments(
    payments,
    cycles.map((cycle) => ({ id: cycle.id, statementAmount: cycle.statementAmount })),
  );
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalAllocated = stored.reduce((sum, row) => sum + row.amount, 0);

  expect(totalAllocated + expected.creditBalance).toBe(totalPayments);
  for (const cycle of cycles) {
    expect(cycle.paidAmount).toBeLessThanOrEqual(cycle.statementAmount);
    expect(cycle.paidAmount).toBe(expected.paidByInvoice.get(cycle.id) ?? 0);
    expect(cycle.remainingAmount).toBe(cycle.statementAmount - cycle.paidAmount);
  }
  return expected.creditBalance;
}
