import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { creditCardPaymentAllocationsTable } from '@/db/schemas/credit-card-payment-allocations.schema';
import { creditCardPaymentsTable } from '@/db/schemas/credit-card-payments.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import type { TxClient } from '@/db/types';
import { entriesRepository } from '@/modules/entries/entries.repository';
import * as entriesService from '@/modules/entries/entries.service';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODate } from '@/shared/lib/date';
import { listPayableCycles, syncCardCycles } from './credit-card-cycles.service';
import type { CreditCardRow } from './credit-cards.helpers';
import * as creditCardsRepository from './credit-cards.repository';
import {
  computeCardBalance,
  createUnderlyingPaymentTransaction,
  deleteUnderlyingTransactionInTransaction,
  ensureSourceAccountForPayment,
  updateUnderlyingTransaction,
} from './credit-cards.shared';
import type {
  CreateCreditCardPaymentDto,
  CreditCardPaymentResponse,
  UpdateCreditCardPaymentDto,
} from './credit-cards.types';

type PaymentRow = {
  paymentId: string;
  creditCardId: string;
  transactionId: string;
  description: string;
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
        eq(ledgerAccountsTable.ownerType, 'account'),
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
  if (!payment) throw new NotFoundError('Credit card payment');
  return payment;
}

async function loadPaymentAllocations(paymentId: string) {
  return db
    .select({
      billingCycleId: creditCardPaymentAllocationsTable.billingCycleId,
      amount: creditCardPaymentAllocationsTable.amount,
    })
    .from(creditCardPaymentAllocationsTable)
    .where(eq(creditCardPaymentAllocationsTable.paymentId, paymentId))
    .orderBy(asc(creditCardPaymentAllocationsTable.createdAt));
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
    paymentDate: formatISODate(payment.paymentDate),
    postedDate: formatISODate(payment.postedDate),
    amount: payment.amount,
    fromAccountId: payment.fromAccountId,
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
  const fromLedger = await ledgerAccountsRepository.findByOwner('account', fromAccountId);
  const toLedger = await ledgerAccountsRepository.findByOwner('account', card.ledgerAccountId);
  if (!fromLedger || !toLedger) throw new NotFoundError('Account ledger');

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

async function applySinglePayment(
  tx: TxClient,
  card: CreditCardRow,
  timezone: string,
  payment: Pick<PaymentRow, 'paymentId' | 'amount'>,
) {
  const payableCycles = await listPayableCycles(tx, card, timezone);
  let remainingAmount = payment.amount;

  for (const cycle of payableCycles) {
    if (remainingAmount <= 0) break;
    const allocatedAmount = Math.min(cycle.remainingAmount, remainingAmount);
    if (allocatedAmount <= 0) continue;

    await tx.insert(creditCardPaymentAllocationsTable).values({
      paymentId: payment.paymentId,
      billingCycleId: cycle.id,
      amount: allocatedAmount,
    });

    remainingAmount -= allocatedAmount;
  }

  await syncCardCycles(tx, card, timezone);
}

async function rebuildAllPaymentAllocations(tx: TxClient, card: CreditCardRow, timezone: string) {
  const payments = await tx
    .select({
      paymentId: creditCardPaymentsTable.id,
      amount: creditCardPaymentsTable.amount,
      postedDate: transactionsTable.postedDate,
      createdAt: creditCardPaymentsTable.createdAt,
    })
    .from(creditCardPaymentsTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPaymentsTable.transactionId))
    .where(eq(creditCardPaymentsTable.creditCardId, card.id))
    .orderBy(asc(transactionsTable.postedDate), asc(creditCardPaymentsTable.createdAt));

  const paymentIds = payments.map((payment) => payment.paymentId);
  if (paymentIds.length > 0) {
    await tx
      .delete(creditCardPaymentAllocationsTable)
      .where(inArray(creditCardPaymentAllocationsTable.paymentId, paymentIds));
  }
  await syncCardCycles(tx, card, timezone);

  for (const payment of payments) {
    await applySinglePayment(tx, card, timezone, payment);
  }
}

async function ensurePaymentAmountWithinUsedLimit(
  card: CreditCardRow,
  amount: number,
  additionalAllowedAmount = 0,
) {
  const usedAmount = await computeCardBalance(card.ledgerAccountId);
  const maxPayableAmount = usedAmount + additionalAllowedAmount;

  if (amount > maxPayableAmount) {
    throw new ValidationError('Payment amount cannot be greater than the currently used credit');
  }
}

export async function createPayment(
  context: HouseholdContext,
  creditCardId: string,
  dto: CreateCreditCardPaymentDto,
): Promise<CreditCardPaymentResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  await ensureSourceAccountForPayment(context, card, dto.fromAccountId);
  await ensurePaymentAmountWithinUsedLimit(card, dto.amount);

  const postedDate = dto.postedDate ?? dto.paymentDate;

  const payment = await db.transaction(async (tx) => {
    const transaction = await createUnderlyingPaymentTransaction(tx, {
      householdId: context.householdId,
      card,
      fromAccountId: dto.fromAccountId,
      description: dto.description ?? `Payment to ${card.name}`,
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

  await ensureSourceAccountForPayment(context, card, fromAccountId);
  await ensurePaymentAmountWithinUsedLimit(card, amount, existingPayment.amount);

  await db.transaction(async (tx) => {
    await updateUnderlyingTransaction(tx, context.householdId, existingPayment.transactionId, {
      description,
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
