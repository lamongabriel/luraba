import type { HouseholdContext } from '@/config/permissions';
import type { TxClient } from '@/db/types';
import { accountsRepository } from '@/modules/accounts/accounts.repository';
import { categoriesRepository } from '@/modules/categories/categories.repository';
import * as entriesService from '@/modules/entries/entries.service';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { merchantsRepository } from '@/modules/merchants/merchants.repository';
import { paymentMethodsRepository } from '@/modules/payment-methods/payment-methods.repository';
import * as baseTxRepository from '@/modules/transactions/transactions.repository';
import { NotFoundError, ValidationError } from '@/shared/errors';
import type { CreditCardRow } from './credit-cards.helpers';
import type { CreditCardResponse } from './credit-cards.types';

export async function computeCardBalance(ledgerAccountId: string): Promise<number> {
  const ledger = await ledgerAccountsRepository.findByOwner('account', ledgerAccountId);
  if (!ledger) throw new NotFoundError('Credit card ledger');
  const balance = await ledgerAccountsRepository.getBalance(ledger.id);
  return -balance;
}

export function computeRemainingCreditAmount(
  card: CreditCardRow,
  usedAmount: number,
): number | null {
  if (card.creditLimitAmount < 0) {
    return null;
  }

  return Math.max(card.creditLimitAmount - usedAmount, 0);
}

export async function ensureCardHasAvailableCredit(
  card: CreditCardRow,
  requiredAmount: number,
  additionalAvailableAmount = 0,
): Promise<void> {
  if (card.creditLimitAmount < 0) {
    return;
  }

  const usedAmount = await computeCardBalance(card.ledgerAccountId);
  const availableCreditAmount = Math.max(
    card.creditLimitAmount - usedAmount + additionalAvailableAmount,
    0,
  );

  if (requiredAmount > availableCreditAmount) {
    throw new ValidationError('Purchase amount exceeds the remaining credit card limit');
  }
}

export async function mapCreditCard(card: CreditCardRow): Promise<CreditCardResponse> {
  const balance = await computeCardBalance(card.ledgerAccountId);
  return {
    ...card,
    balance,
    remainingCreditAmount: computeRemainingCreditAmount(card, balance),
  };
}

export async function ensureExpenseCategory(
  context: HouseholdContext,
  categoryId: string | null | undefined,
): Promise<void> {
  if (!categoryId) return;
  const category = await categoriesRepository.get(categoryId, context);
  if (!category) throw new NotFoundError('Category');
  if (category.type !== 'expense') {
    throw new ValidationError(`Category ${categoryId} must be of type expense`);
  }
}

export async function ensureMerchant(
  context: HouseholdContext,
  merchantId?: string,
): Promise<void> {
  if (!merchantId) return;
  const merchant = await merchantsRepository.get(merchantId, context);
  if (!merchant) throw new NotFoundError('Merchant');
}

export async function resolveCreditCardPaymentMethod(
  context: HouseholdContext,
  currencyCode: string,
) {
  const paymentMethod = await paymentMethodsRepository.findAvailableByCode(
    context,
    'credit_card',
    currencyCode,
  );
  if (!paymentMethod) {
    throw new ValidationError(
      `Payment method credit_card is not available for currency ${currencyCode}`,
    );
  }
  return paymentMethod;
}

export async function createUnderlyingExpenseTransaction(
  tx: TxClient,
  params: {
    householdId: string;
    card: CreditCardRow;
    paymentMethodId: string;
    description: string;
    amount: number;
    categoryId: string | null;
    merchantId?: string;
    purchaseDate: Date;
    postedDate: Date;
  },
) {
  const accountLedger = await ledgerAccountsRepository.findByOwner(
    'account',
    params.card.ledgerAccountId,
  );
  if (!accountLedger) throw new NotFoundError('Credit card ledger');

  const expenseLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:expense:${params.card.currencyCode}`,
    'liability',
    params.card.currencyCode,
  );

  const createdTransaction = await baseTxRepository.createTransaction(tx, {
    householdId: params.householdId,
    type: 'expense',
    paymentMethodId: params.paymentMethodId,
    categoryId: params.categoryId ?? undefined,
    description: params.description,
    includeInBudget: false,
    merchantId: params.merchantId,
    purchaseDate: params.purchaseDate,
    postedDate: params.postedDate,
  });

  await entriesService.createTransactionEntries(tx, createdTransaction.id, [
    {
      ledgerAccountId: accountLedger.id,
      amount: -params.amount,
      currencyCode: params.card.currencyCode,
      categoryId: params.categoryId ?? undefined,
    },
    {
      ledgerAccountId: expenseLedger.id,
      amount: params.amount,
      currencyCode: params.card.currencyCode,
    },
  ]);

  return createdTransaction;
}

export async function createUnderlyingPaymentTransaction(
  tx: TxClient,
  params: {
    householdId: string;
    card: CreditCardRow;
    fromAccountId: string;
    description: string;
    amount: number;
    paymentDate: Date;
    postedDate: Date;
  },
) {
  const fromLedger = await ledgerAccountsRepository.findByOwner('account', params.fromAccountId);
  const toLedger = await ledgerAccountsRepository.findByOwner(
    'account',
    params.card.ledgerAccountId,
  );
  if (!fromLedger || !toLedger) throw new NotFoundError('Account ledger');

  const createdTransaction = await baseTxRepository.createTransaction(tx, {
    householdId: params.householdId,
    type: 'transfer',
    paymentMethodId: null,
    categoryId: null,
    description: params.description,
    includeInBudget: false,
    merchantId: null,
    purchaseDate: params.paymentDate,
    postedDate: params.postedDate,
  });

  await entriesService.createTransactionEntries(tx, createdTransaction.id, [
    {
      ledgerAccountId: fromLedger.id,
      amount: -params.amount,
      currencyCode: params.card.currencyCode,
    },
    {
      ledgerAccountId: toLedger.id,
      amount: params.amount,
      currencyCode: params.card.currencyCode,
    },
  ]);

  return createdTransaction;
}

export async function deleteUnderlyingTransaction(
  householdId: string,
  transactionId: string,
): Promise<void> {
  const deleted = await baseTxRepository.deleteTransaction(householdId, transactionId);
  if (!deleted) throw new NotFoundError('Transaction');
}

export async function deleteUnderlyingTransactionInTransaction(
  tx: TxClient,
  householdId: string,
  transactionId: string,
): Promise<void> {
  const deleted = await baseTxRepository.deleteTransactionInTransaction(
    tx,
    householdId,
    transactionId,
  );
  if (!deleted) throw new NotFoundError('Transaction');
}

export async function updateUnderlyingTransaction(
  tx: TxClient,
  householdId: string,
  transactionId: string,
  values: Parameters<typeof baseTxRepository.updateTransaction>[3],
) {
  const updated = await baseTxRepository.updateTransaction(tx, householdId, transactionId, values);
  if (!updated) throw new NotFoundError('Transaction');
  return updated;
}

export async function ensureSourceAccountForPayment(
  context: HouseholdContext,
  card: CreditCardRow,
  fromAccountId: string,
) {
  const sourceAccount = await accountsRepository.get(fromAccountId, context);

  if (!sourceAccount) throw new NotFoundError('Payment source account');
  if (sourceAccount.classification !== 'asset') {
    throw new ValidationError('Credit card payments must come from an asset account');
  }
  if (sourceAccount.type === 'credit_card') {
    throw new ValidationError('Credit card payments cannot come from another credit card account');
  }
  if (sourceAccount.currencyId !== card.currencyCode) {
    throw new ValidationError('Payment source account currency must match credit card currency');
  }

  return sourceAccount;
}
