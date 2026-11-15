import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { creditCardPaymentAllocationsTable } from "@luraba/db/schemas/credit-card-payment-allocations.schema";
import { creditCardPaymentsTable } from "@luraba/db/schemas/credit-card-payments.schema";
import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { ledgerAccountsTable } from "@luraba/db/schemas/ledger-accounts.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { formatISODate } from "@luraba/domain";
import { and, asc, eq, lt } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { assertNotArchived } from "@/modules/accounts/accounts.guards";
import { entriesRepository } from "@/modules/entries/entries.repository";
import * as entriesService from "@/modules/entries/entries.service";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { NotFoundError, ValidationError } from "@/shared/errors";
import {
  type AllocationChange,
  syncCardCycles,
  syncCardCyclesWithChanges,
} from "./credit-card-cycles.service";
import type { CreditCardRow } from "./credit-cards.helpers";
import * as creditCardsRepository from "./credit-cards.repository";
import {
  computeCardBalance,
  createUnderlyingPaymentTransaction,
  deleteUnderlyingTransactionInTransaction,
  ensureSourceAccountForPayment,
  updateUnderlyingTransaction,
} from "./credit-cards.shared";
import type {
  CreateCreditCardPaymentDto,
  CreditCardPaymentResponse,
  UpdateCreditCardPaymentDto,
} from "./credit-cards.types";

type PaymentRow = {
  paymentId: string;
  creditCardId: string;
  transactionId: string;
  description: string;
  originalDescription: string | null;
  notes: string | null;
  paymentDate: Date;
  postedDate: Date;
  amount: number;
  fromAccountId: string;
  createdAt: Date;
};

async function loadPayment(
  householdId: string,
  creditCardId: string,
  paymentId: string,
): Promise<PaymentRow> {
  const rows = await db
    .select({
      paymentId: creditCardPaymentsTable.id,
      creditCardId: creditCardPaymentsTable.creditCardId,
      transactionId: creditCardPaymentsTable.transactionId,
      description: transactionsTable.description,
      originalDescription: transactionsTable.originalDescription,
      notes: transactionsTable.notes,
      paymentDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      amount: creditCardPaymentsTable.amount,
      fromAccountId: accountsTable.id,
      createdAt: creditCardPaymentsTable.createdAt,
    })
    .from(creditCardPaymentsTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPaymentsTable.transactionId))
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .innerJoin(
      accountsTable,
      and(
        eq(accountsTable.id, ledgerAccountsTable.ownerId),
        eq(ledgerAccountsTable.ownerType, "account"),
      ),
    )
    .where(
      and(
        eq(creditCardPaymentsTable.id, paymentId),
        eq(creditCardPaymentsTable.creditCardId, creditCardId),
        eq(transactionsTable.householdId, householdId),
        lt(entriesTable.amount, 0),
      ),
    )
    .limit(1);

  const payment = rows[0];
  if (!payment) throw new NotFoundError("Credit card payment");
  return payment;
}

async function loadPaymentAllocations(paymentId: string) {
  return db
    .select({
      billingCycleId: creditCardPaymentAllocationsTable.billingCycleId,
      amount: creditCardPaymentAllocationsTable.amount,
    })
    .from(creditCardPaymentAllocationsTable)
    .innerJoin(
      creditCardBillingCyclesTable,
      eq(creditCardBillingCyclesTable.id, creditCardPaymentAllocationsTable.billingCycleId),
    )
    .where(eq(creditCardPaymentAllocationsTable.paymentId, paymentId))
    .orderBy(asc(creditCardBillingCyclesTable.dueDate));
}

async function mapPaymentResponse(
  _householdId: string,
  payment: PaymentRow,
): Promise<CreditCardPaymentResponse> {
  const allocations = await loadPaymentAllocations(payment.paymentId);

  return {
    paymentId: payment.paymentId,
    creditCardId: payment.creditCardId,
    transactionId: payment.transactionId,
    description: payment.description,
    originalDescription: payment.originalDescription,
    notes: payment.notes,
    paymentDate: formatISODate(payment.paymentDate),
    postedDate: formatISODate(payment.postedDate),
    amount: payment.amount,
    fromAccountId: payment.fromAccountId,
    /** The part of the payment no invoice absorbed: card credit carried forward. */
    creditAmount: Math.max(
      payment.amount - allocations.reduce((sum, allocation) => sum + allocation.amount, 0),
      0,
    ),
    allocations: allocations.flatMap((allocation) =>
      allocation.billingCycleId
        ? [
            {
              billingCycleId: allocation.billingCycleId,
              amount: allocation.amount,
            },
          ]
        : [],
    ),
    createdAt: payment.createdAt,
  };
}

async function createTransferEntriesForPayment(
  tx: TxClient,
  card: CreditCardRow,
  transactionId: string,
  fromAccountId: string,
  amount: number,
) {
  const fromLedger = await ledgerAccountsRepository.findByOwner("account", fromAccountId);
  const toLedger = await ledgerAccountsRepository.findByOwner("account", card.ledgerAccountId);
  if (!fromLedger || !toLedger) throw new NotFoundError("Account ledger");

  await entriesService.createTransactionEntries(tx, transactionId, [
    {
      ledgerAccountId: fromLedger.id,
      amount: -amount,
      currencyCode: card.currencyCode,
    },
    {
      ledgerAccountId: toLedger.id,
      amount,
      currencyCode: card.currencyCode,
    },
  ]);
}

/** Payments never write allocations themselves: the one recompute for the whole card does. */
async function rebuildAllPaymentAllocations(tx: TxClient, card: CreditCardRow, timezone: string) {
  await syncCardCycles(tx, card, timezone);
}

async function ensurePaymentAmountWithinUsedLimit(
  card: CreditCardRow,
  amount: number,
  additionalAllowedAmount = 0,
) {
  const usedAmount = await computeCardBalance(card.ledgerAccountId);
  const maxPayableAmount = usedAmount + additionalAllowedAmount;

  if (amount > maxPayableAmount) {
    throw new ValidationError("Payment amount cannot be greater than the currently used credit");
  }
}

export async function createPayment(
  context: HouseholdContext,
  creditCardId: string,
  dto: CreateCreditCardPaymentDto,
): Promise<CreditCardPaymentResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  assertNotArchived(card, "Credit card");
  await ensureSourceAccountForPayment(context, card, dto.fromAccountId);
  await ensurePaymentAmountWithinUsedLimit(card, dto.amount);

  const postedDate = dto.postedDate ?? dto.paymentDate;

  const payment = await db.transaction(async (tx) => {
    const transaction = await createUnderlyingPaymentTransaction(tx, {
      householdId: context.householdId,
      createdByUserId: context.userId,
      card,
      fromAccountId: dto.fromAccountId,
      description: dto.description ?? `Payment to ${card.name}`,
      originalDescription: dto.originalDescription,
      notes: dto.notes,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      postedDate,
    });

    const [payment] = await tx
      .insert(creditCardPaymentsTable)
      .values({
        creditCardId: card.id,
        transactionId: transaction.id,
        amount: dto.amount,
      })
      .returning();

    await rebuildAllPaymentAllocations(tx, card, context.timezone);
    return payment;
  });

  return getPayment(context, creditCardId, payment.id);
}

export async function getPayment(
  context: HouseholdContext,
  creditCardId: string,
  paymentId: string,
): Promise<CreditCardPaymentResponse> {
  await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const payment = await loadPayment(context.householdId, creditCardId, paymentId);
  return mapPaymentResponse(context.householdId, payment);
}

export async function updatePayment(
  context: HouseholdContext,
  creditCardId: string,
  paymentId: string,
  dto: UpdateCreditCardPaymentDto,
): Promise<CreditCardPaymentResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const existingPayment = await loadPayment(context.householdId, creditCardId, paymentId);

  const fromAccountId = dto.fromAccountId ?? existingPayment.fromAccountId;
  const amount = dto.amount ?? existingPayment.amount;
  const paymentDate = dto.paymentDate ?? existingPayment.paymentDate;
  const postedDate = dto.postedDate ?? existingPayment.postedDate;
  const description = dto.description ?? existingPayment.description;
  const originalDescription =
    dto.originalDescription === undefined
      ? existingPayment.originalDescription
      : dto.originalDescription;
  const notes = dto.notes === undefined ? existingPayment.notes : dto.notes;

  await ensureSourceAccountForPayment(context, card, fromAccountId);
  await ensurePaymentAmountWithinUsedLimit(card, amount, existingPayment.amount);

  await db.transaction(async (tx) => {
    await updateUnderlyingTransaction(tx, context.householdId, existingPayment.transactionId, {
      description,
      originalDescription,
      notes,
      purchaseDate: paymentDate,
      postedDate,
    });

    await tx
      .update(creditCardPaymentsTable)
      .set({ amount })
      .where(eq(creditCardPaymentsTable.id, paymentId));

    await entriesRepository.deleteByTransactionId(tx, existingPayment.transactionId);
    await createTransferEntriesForPayment(
      tx,
      card,
      existingPayment.transactionId,
      fromAccountId,
      amount,
    );

    await rebuildAllPaymentAllocations(tx, card, context.timezone);
  });

  return getPayment(context, creditCardId, paymentId);
}

export async function deletePayment(
  context: HouseholdContext,
  creditCardId: string,
  paymentId: string,
): Promise<void> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const existingPayment = await loadPayment(context.householdId, creditCardId, paymentId);

  await db.transaction(async (tx) => {
    await deleteUnderlyingTransactionInTransaction(
      tx,
      context.householdId,
      existingPayment.transactionId,
    );
    await rebuildAllPaymentAllocations(tx, card, context.timezone);
  });
}

export type RecomputeAllocationsResult = {
  creditCardId: string;
  dryRun: boolean;
  /** Invoices whose paid amount changes (dry run) or changed (write). */
  changedInvoices: AllocationChange[];
  /** Payments no invoice absorbs, in minor units. */
  creditBalance: number;
};

/**
 * Recomputes every allocation of one card from its payments and statements (idempotent). With
 * `dryRun` it only reports the invoices whose paid amount would change.
 */
export async function recomputeCardAllocations(
  context: HouseholdContext,
  creditCardId: string,
  options: { dryRun?: boolean } = {},
): Promise<RecomputeAllocationsResult> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const dryRun = options.dryRun ?? false;
  const result = await db.transaction((tx) =>
    syncCardCyclesWithChanges(tx, card, context.timezone, { dryRun }),
  );
  return {
    creditCardId,
    dryRun,
    changedInvoices: result.changes,
    creditBalance: result.creditBalance,
  };
}
