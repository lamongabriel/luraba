import type { HouseholdContext } from '@/config/permissions';
import { SYSTEM_LEDGER_CLASSIFICATIONS } from '@/config/transactions';
import { db } from '@/db';
import type { TxClient } from '@/db/types';
import { accountsRepository } from '@/modules/accounts/accounts.repository';
import { categoriesRepository } from '@/modules/categories/categories.repository';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import { entriesRepository } from '@/modules/entries/entries.repository';
import * as entriesService from '@/modules/entries/entries.service';
import type { EntryDraft } from '@/modules/entries/entries.types';
import { fxService } from '@/modules/fx/fx.service';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { merchantsRepository } from '@/modules/merchants/merchants.repository';
import { paymentMethodsRepository } from '@/modules/payment-methods/payment-methods.repository';
import { tagsRepository } from '@/modules/tags/tags.repository';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { startOfMonth as toBudgetMonth } from '@/shared/lib/date';
import {
  mapCreditCardInstallmentRowsToFeedRows,
  mapDetailedRows,
  mapTransactionResponsesToFeedRows,
  resolveTransferAmounts,
  toRawLedgerBalance,
} from './transactions.helpers';
import * as txRepository from './transactions.repository';
import type {
  CreateTransactionDto,
  TransactionFeedRow,
  TransactionResponse,
  UpdateTransactionRequestBody,
} from './transactions.types';

// -----------------------------------------------------------------------------
// Scoped Validation + Lookups
// -----------------------------------------------------------------------------

async function validateTags(
  context: HouseholdContext,
  tagIds: string[] | undefined,
): Promise<string[]> {
  const normalizedTagIds = Array.from(new Set(tagIds ?? []));
  if (normalizedTagIds.length === 0) {
    return [];
  }

  const tags = await tagsRepository.findByIds(context, normalizedTagIds);
  if (tags.length !== normalizedTagIds.length) {
    throw new NotFoundError('Tag');
  }

  return normalizedTagIds;
}

async function validateOptionalMerchant(
  context: HouseholdContext,
  merchantId?: string,
): Promise<void> {
  if (!merchantId) return;

  const merchant = await merchantsRepository.get(merchantId, context);
  if (!merchant) throw new NotFoundError('Merchant');
}

async function validateCategory(
  context: HouseholdContext,
  categoryId: string,
  expectedType: 'expense' | 'income',
): Promise<void> {
  const category = await categoriesRepository.get(categoryId, context);
  if (!category) throw new NotFoundError('Category');
  if (category.type !== expectedType) {
    throw new ValidationError(`Category ${categoryId} must be of type ${expectedType}`);
  }
}

async function resolvePaymentMethod(
  context: HouseholdContext,
  paymentMethodCode: string,
  currencyCode: string,
) {
  const paymentMethod = await paymentMethodsRepository.findAvailableByCode(
    context,
    paymentMethodCode,
    currencyCode,
  );
  if (!paymentMethod) {
    throw new ValidationError(
      `Payment method ${paymentMethodCode} is not available for currency ${currencyCode}`,
    );
  }

  return paymentMethod;
}

// -----------------------------------------------------------------------------
// Transaction Persistence Helpers
// -----------------------------------------------------------------------------

async function createBaseTransaction(
  tx: TxClient,
  context: HouseholdContext,
  values: {
    type: CreateTransactionDto['type'];
    paymentMethodId?: string | null;
    categoryId?: string | null;
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    includeInBudget: boolean;
    merchantId?: string;
  },
): Promise<string> {
  const transaction = await txRepository.createTransaction(tx, {
    householdId: context.householdId,
    type: values.type,
    paymentMethodId: values.paymentMethodId ?? null,
    categoryId: values.categoryId ?? null,
    description: values.description,
    includeInBudget: values.includeInBudget,
    merchantId: values.merchantId,
    purchaseDate: values.purchaseDate,
    postedDate: values.postedDate,
  });

  return transaction.id;
}

async function persistTags(tx: TxClient, transactionId: string, tagIds: string[]): Promise<void> {
  await txRepository.createTransactionTags(
    tx,
    tagIds.map((tagId) => ({
      transactionId,
      tagId,
    })),
  );
}

async function loadCreatedTransaction(
  context: HouseholdContext,
  transactionId: string,
): Promise<TransactionResponse> {
  const rows = await txRepository.listDetailedByTransactionIds(context, [transactionId]);
  const [transaction] = mapDetailedRows(rows);

  if (!transaction) {
    throw new NotFoundError('Transaction');
  }

  return transaction;
}

// -----------------------------------------------------------------------------
// Create Transaction Flows
// -----------------------------------------------------------------------------

// Expense: money leaves an asset/liability account and lands in the system
// expense ledger for that currency.
async function createExpense(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: 'expense' }>,
): Promise<TransactionResponse> {
  const currency = await currenciesRepository.findByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const paymentMethod = await resolvePaymentMethod(
    context,
    dto.paymentMethodCode,
    dto.currencyCode,
  );

  await validateOptionalMerchant(context, dto.merchantId);
  await validateCategory(context, dto.categoryId, 'expense');
  const tagIds = await validateTags(context, dto.tagIds);

  const account = await accountsRepository.get(dto.accountId, context);
  if (!account) throw new NotFoundError('Account');
  if (account.type === 'credit_card') {
    throw new ValidationError(
      'Direct expense creation for credit card accounts must use the credit card purchase endpoint',
    );
  }
  if (account.currencyId !== dto.currencyCode) {
    throw new ValidationError('Transaction currency must match account currency');
  }

  const accountLedger = await ledgerAccountsRepository.findByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  const transactionId = await db.transaction(async (tx) => {
    const expenseLedger = await ledgerAccountsRepository.findOrCreateSystem(
      tx,
      `system:expense:${dto.currencyCode}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.expense,
      dto.currencyCode,
    );

    const createdTransactionId = await createBaseTransaction(tx, context, {
      type: dto.type,
      paymentMethodId: paymentMethod.id,
      categoryId: dto.categoryId,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      includeInBudget: dto.includeInBudget ?? true,
    });

    await entriesService.createTransactionEntries(tx, createdTransactionId, [
      {
        ledgerAccountId: accountLedger.id,
        amount: -dto.amount,
        currencyCode: dto.currencyCode,
        categoryId: dto.categoryId,
        budgetMonth: toBudgetMonth(dto.postedDate),
      },
      {
        ledgerAccountId: expenseLedger.id,
        amount: dto.amount,
        currencyCode: dto.currencyCode,
      },
    ]);
    await persistTags(tx, createdTransactionId, tagIds);

    return createdTransactionId;
  });

  return loadCreatedTransaction(context, transactionId);
}

// Income: money enters the account and is balanced by the system income ledger.
async function createIncome(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: 'income' }>,
): Promise<TransactionResponse> {
  const currency = await currenciesRepository.findByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const paymentMethod = await resolvePaymentMethod(
    context,
    dto.paymentMethodCode,
    dto.currencyCode,
  );

  await validateOptionalMerchant(context, dto.merchantId);
  await validateCategory(context, dto.categoryId, 'income');
  const tagIds = await validateTags(context, dto.tagIds);

  const account = await accountsRepository.get(dto.accountId, context);
  if (!account) throw new NotFoundError('Account');
  if (account.type === 'credit_card') {
    throw new ValidationError(
      'Direct income creation for credit card accounts must use the credit card purchase/payment APIs',
    );
  }
  if (account.currencyId !== dto.currencyCode) {
    throw new ValidationError('Transaction currency must match account currency');
  }

  const accountLedger = await ledgerAccountsRepository.findByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  const transactionId = await db.transaction(async (tx) => {
    const incomeLedger = await ledgerAccountsRepository.findOrCreateSystem(
      tx,
      `system:income:${dto.currencyCode}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.income,
      dto.currencyCode,
    );

    const createdTransactionId = await createBaseTransaction(tx, context, {
      type: dto.type,
      paymentMethodId: paymentMethod.id,
      categoryId: dto.categoryId,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      includeInBudget: dto.includeInBudget ?? true,
    });

    await entriesService.createTransactionEntries(tx, createdTransactionId, [
      {
        ledgerAccountId: accountLedger.id,
        amount: dto.amount,
        currencyCode: dto.currencyCode,
        categoryId: dto.categoryId,
        budgetMonth: toBudgetMonth(dto.postedDate),
      },
      {
        ledgerAccountId: incomeLedger.id,
        amount: -dto.amount,
        currencyCode: dto.currencyCode,
      },
    ]);
    await persistTags(tx, createdTransactionId, tagIds);

    return createdTransactionId;
  });

  return loadCreatedTransaction(context, transactionId);
}

// Transfer: same-currency transfers use two account entries. Cross-currency
// transfers add two offshore clearing entries so each currency balances by
// itself while still allowing manual or FX-derived destination amounts.
async function createTransfer(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: 'transfer' }>,
): Promise<TransactionResponse> {
  if (dto.fromAccountId === dto.toAccountId) {
    throw new ValidationError('Transfer source and destination must be different accounts');
  }

  const fromAccount = await accountsRepository.get(dto.fromAccountId, context);
  if (!fromAccount) throw new NotFoundError('Source account');
  if (fromAccount.type === 'credit_card') {
    throw new ValidationError(
      'Direct transfers from credit card accounts must use the credit card payment endpoint',
    );
  }

  const toAccount = await accountsRepository.get(dto.toAccountId, context);
  if (!toAccount) throw new NotFoundError('Destination account');
  if (toAccount.type === 'credit_card') {
    throw new ValidationError(
      'Direct transfers to credit card accounts must use the credit card payment endpoint',
    );
  }

  const fromLedger = await ledgerAccountsRepository.findByOwner('account', fromAccount.id);
  const toLedger = await ledgerAccountsRepository.findByOwner('account', toAccount.id);
  if (!fromLedger || !toLedger) throw new NotFoundError('Account ledger');

  const tagIds = await validateTags(context, dto.tagIds);

  const { fromAmount, toAmount } = await resolveTransferAmounts({
    fromCurrencyCode: fromAccount.currencyId,
    toCurrencyCode: toAccount.currencyId,
    fromAmount: dto.fromAmount,
    toAmount: dto.toAmount,
    postedDate: dto.postedDate,
    convertAmount: (input) => fxService.convertAmount(input),
  });

  const sameCurrency = fromAccount.currencyId === toAccount.currencyId;

  const transactionId = await db.transaction(async (tx) => {
    const createdTransactionId = await createBaseTransaction(tx, context, {
      type: dto.type,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      includeInBudget: dto.includeInBudget ?? true,
    });

    const entries: EntryDraft[] = [
      {
        ledgerAccountId: fromLedger.id,
        amount: -fromAmount,
        currencyCode: fromAccount.currencyId,
      },
      {
        ledgerAccountId: toLedger.id,
        amount: toAmount,
        currencyCode: toAccount.currencyId,
      },
    ];

    if (!sameCurrency) {
      const fromTransferLedger = await ledgerAccountsRepository.findOrCreateSystem(
        tx,
        `system:offshore-transfer:${fromAccount.currencyId}`,
        SYSTEM_LEDGER_CLASSIFICATIONS.offshoreTransfer,
        fromAccount.currencyId,
      );
      const toTransferLedger = await ledgerAccountsRepository.findOrCreateSystem(
        tx,
        `system:offshore-transfer:${toAccount.currencyId}`,
        SYSTEM_LEDGER_CLASSIFICATIONS.offshoreTransfer,
        toAccount.currencyId,
      );

      entries.push(
        {
          ledgerAccountId: fromTransferLedger.id,
          amount: fromAmount,
          currencyCode: fromAccount.currencyId,
        },
        {
          ledgerAccountId: toTransferLedger.id,
          amount: -toAmount,
          currencyCode: toAccount.currencyId,
        },
      );
    }

    await entriesService.createTransactionEntries(tx, createdTransactionId, entries);
    await persistTags(tx, createdTransactionId, tagIds);

    return createdTransactionId;
  });

  return loadCreatedTransaction(context, transactionId);
}

// Adjustment: the request sends the target displayed balance. We compare that
// target to the account's anchor balance at the posted date and persist only the
// delta needed to make future balances start from the corrected value.
async function createAdjustment(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: 'adjustment' }>,
): Promise<TransactionResponse> {
  const account = await accountsRepository.get(dto.accountId, context);
  if (!account) throw new NotFoundError('Account');
  if (account.type === 'credit_card') {
    throw new ValidationError('Direct adjustments for credit card accounts are not supported');
  }

  const accountLedger = await ledgerAccountsRepository.findByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');
  const tagIds = await validateTags(context, dto.tagIds);

  const anchorBalance = await ledgerAccountsRepository.getAdjustmentAnchorBalance(
    context.householdId,
    accountLedger.id,
    dto.postedDate,
  );
  const targetBalance = toRawLedgerBalance(dto.balance, account.classification);
  const accountAmount = targetBalance - anchorBalance;

  if (accountAmount === 0) {
    throw new ValidationError('Adjustment balance already matches the account balance');
  }

  const transactionId = await db.transaction(async (tx) => {
    const adjustmentLedger = await ledgerAccountsRepository.findOrCreateSystem(
      tx,
      `system:adjustment:${account.currencyId}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.adjustment,
      account.currencyId,
    );

    const createdTransactionId = await createBaseTransaction(tx, context, {
      type: dto.type,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      includeInBudget: dto.includeInBudget ?? true,
    });

    await entriesService.createTransactionEntries(tx, createdTransactionId, [
      {
        ledgerAccountId: accountLedger.id,
        amount: accountAmount,
        currencyCode: account.currencyId,
      },
      {
        ledgerAccountId: adjustmentLedger.id,
        amount: -accountAmount,
        currencyCode: account.currencyId,
      },
    ]);
    await persistTags(tx, createdTransactionId, tagIds);

    return createdTransactionId;
  });

  return loadCreatedTransaction(context, transactionId);
}

// -----------------------------------------------------------------------------
// Public Service API
// -----------------------------------------------------------------------------

export async function createTransaction(
  context: HouseholdContext,
  dto: CreateTransactionDto,
): Promise<TransactionResponse> {
  switch (dto.type) {
    case 'expense':
      return createExpense(context, dto);
    case 'income':
      return createIncome(context, dto);
    case 'transfer':
      return createTransfer(context, dto);
    case 'adjustment':
      return createAdjustment(context, dto);
    default:
      throw new ValidationError('Invalid transaction type');
  }
}

function sortFeedRows(rows: TransactionFeedRow[]): TransactionFeedRow[] {
  return [...rows].sort((left, right) => {
    if (left.postedDate !== right.postedDate) {
      return right.postedDate.localeCompare(left.postedDate);
    }

    const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return right.rowId.localeCompare(left.rowId);
  });
}

export async function listTransactions(context: HouseholdContext): Promise<TransactionFeedRow[]> {
  const [standardRows, installmentRows] = await Promise.all([
    txRepository.listDetailedByHouseholdId(context.householdId),
    txRepository.listCreditCardInstallmentFeedRows(context.householdId),
  ]);

  const standardTransactions = mapDetailedRows(standardRows);
  const accountIds = Array.from(
    new Set(
      standardTransactions.flatMap((transaction) =>
        [transaction.accountId, transaction.toAccountId].filter((accountId): accountId is string =>
          Boolean(accountId),
        ),
      ),
    ),
  );
  const creditCardMappings = await txRepository.listCreditCardIdsByAccountIds(
    context.householdId,
    accountIds,
  );
  const creditCardIdsByAccountId = new Map(
    creditCardMappings.map((mapping) => [mapping.accountId, mapping.creditCardId]),
  );

  return sortFeedRows([
    ...mapTransactionResponsesToFeedRows(standardTransactions, creditCardIdsByAccountId),
    ...mapCreditCardInstallmentRowsToFeedRows(installmentRows),
  ]);
}

// -----------------------------------------------------------------------------
// Update + Delete Flows
// -----------------------------------------------------------------------------

export async function updateTransaction(
  context: HouseholdContext,
  transactionId: string,
  body: UpdateTransactionRequestBody,
): Promise<TransactionResponse> {
  const rows = await txRepository.listDetailedByTransactionIds(context, [transactionId]);
  const [transaction] = mapDetailedRows(rows);

  if (!transaction) {
    throw new NotFoundError('Transaction');
  }

  let paymentMethodId = transaction.paymentMethodId ?? null;
  const nextCategoryId = body.categoryId ?? transaction.categoryId ?? null;

  if (transaction.type === 'expense' || transaction.type === 'income') {
    if (!nextCategoryId) {
      throw new ValidationError(`Category is required for ${transaction.type} transactions`);
    }

    await validateCategory(context, nextCategoryId, transaction.type);

    if (body.paymentMethodCode !== undefined) {
      const paymentMethod = await resolvePaymentMethod(
        context,
        body.paymentMethodCode,
        transaction.currencyCode,
      );
      paymentMethodId = paymentMethod.id;
    }

    if (!paymentMethodId) {
      throw new ValidationError(`Payment method is required for ${transaction.type} transactions`);
    }

    if (body.merchantId !== undefined) {
      await validateOptionalMerchant(context, body.merchantId);
    }
  } else {
    if (body.categoryId !== undefined) {
      throw new ValidationError(
        `Category updates are not supported for ${transaction.type} transactions`,
      );
    }

    if (body.paymentMethodCode !== undefined) {
      throw new ValidationError(
        `Payment method updates are not supported for ${transaction.type} transactions`,
      );
    }

    if (body.merchantId !== undefined) {
      throw new ValidationError(
        `Merchant updates are not supported for ${transaction.type} transactions`,
      );
    }
  }

  let tagIds: string[] | undefined;
  if (body.tagIds !== undefined) {
    tagIds = await validateTags(context, body.tagIds);
  }

  const transactionUpdates: Partial<{
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    includeInBudget: boolean;
    categoryId: string | null;
    merchantId: string | null;
    paymentMethodId: string | null;
  }> = {};

  if (body.description !== undefined) transactionUpdates.description = body.description;
  if (body.purchaseDate !== undefined) transactionUpdates.purchaseDate = body.purchaseDate;
  if (body.postedDate !== undefined) transactionUpdates.postedDate = body.postedDate;
  if (body.includeInBudget !== undefined) transactionUpdates.includeInBudget = body.includeInBudget;
  if (body.categoryId !== undefined) transactionUpdates.categoryId = body.categoryId;
  if (body.merchantId !== undefined) transactionUpdates.merchantId = body.merchantId;
  if (body.paymentMethodCode !== undefined) transactionUpdates.paymentMethodId = paymentMethodId;

  await db.transaction(async (tx) => {
    if (Object.keys(transactionUpdates).length > 0 || body.tagIds !== undefined) {
      const updated = await txRepository.updateTransaction(
        tx,
        context.householdId,
        transactionId,
        transactionUpdates,
      );
      if (!updated) {
        throw new NotFoundError('Transaction');
      }
    }

    if (body.postedDate !== undefined) {
      await entriesRepository.updateBudgetMonth(tx, transactionId, toBudgetMonth(body.postedDate));
    }

    if (body.categoryId !== undefined) {
      await entriesRepository.updateCategoryId(tx, transactionId, body.categoryId);
    }

    if (body.tagIds !== undefined) {
      await txRepository.deleteTransactionTags(tx, transactionId);
      if (tagIds && tagIds.length > 0) {
        await txRepository.createTransactionTags(
          tx,
          tagIds.map((tagId) => ({
            transactionId,
            tagId,
          })),
        );
      }
    }
  });

  return loadCreatedTransaction(context, transactionId);
}

export async function deleteTransaction(
  context: HouseholdContext,
  transactionId: string,
): Promise<void> {
  const deleted = await txRepository.deleteTransaction(context.householdId, transactionId);
  if (!deleted) {
    throw new NotFoundError('Transaction');
  }
}
