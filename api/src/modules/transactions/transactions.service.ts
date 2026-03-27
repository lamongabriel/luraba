import { db } from '@/db';
import { NotFoundError, ValidationError } from '@/shared/errors';
import * as txRepository from './transactions.repository';
import { CreateTransactionDto, TransactionResponse } from './transactions.types';

type EntryDraft = {
  ledgerAccountId: string;
  amount: number;
  currencyCode: string;
  categoryId?: string;
  budgetMonth?: Date;
};

type DetailedTransactionRow = Awaited<ReturnType<typeof txRepository.listDetailedByUserId>>[number];

const SYSTEM_LEDGER_CLASSIFICATIONS = {
  expense: 'liability',
  income: 'asset',
  adjustment: 'liability',
} as const;

function absoluteAmount(value: number): number {
  return value < 0 ? -value : value;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toBudgetMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function validateBalanced(entries: EntryDraft[]): void {
  if (entries.length < 2) {
    throw new ValidationError('Every transaction must create at least two entries');
  }

  const sumsByCurrency = new Map<string, number>();

  for (const entry of entries) {
    const current = sumsByCurrency.get(entry.currencyCode) ?? 0;
    sumsByCurrency.set(entry.currencyCode, current + entry.amount);
  }

  for (const [currencyCode, total] of sumsByCurrency.entries()) {
    if (total !== 0) {
      throw new ValidationError(`Entries are not balanced for currency ${currencyCode}`);
    }
  }
}

function normalizeBudgetInclusion(dto: CreateTransactionDto): {
  includeInBudget: boolean;
} {
  return {
    includeInBudget: dto.includeInBudget ?? true,
  };
}

function mapDetailedRows(rows: DetailedTransactionRow[]): TransactionResponse[] {
  const rowsByTransaction = new Map<string, DetailedTransactionRow[]>();

  for (const row of rows) {
    const grouped = rowsByTransaction.get(row.transactionId);
    if (grouped) {
      grouped.push(row);
      continue;
    }

    rowsByTransaction.set(row.transactionId, [row]);
  }

  return Array.from(rowsByTransaction.values()).map((group) => {
    const first = group[0];
    const categoryId = first.categoryId ?? null;
    const accountEntries = group.filter((row) => row.accountId);

    if (first.type === 'transfer') {
      const fromEntry = accountEntries.find((row) => row.entryAmount < 0) ?? accountEntries[0] ?? null;
      const toEntry =
        accountEntries.find((row) => row.entryAmount > 0 && row.accountId !== fromEntry?.accountId) ??
        accountEntries.find((row) => row.accountId !== fromEntry?.accountId) ??
        null;

      return {
        id: first.transactionId,
        userId: first.userId,
        type: first.type,
        description: first.description,
        amount: absoluteAmount(fromEntry?.entryAmount ?? toEntry?.entryAmount ?? 0),
        currencyCode: fromEntry?.entryCurrencyCode ?? toEntry?.entryCurrencyCode ?? first.entryCurrencyCode,
        accountId: fromEntry?.accountId ?? null,
        accountName: fromEntry?.accountName ?? null,
        accountClassification: fromEntry?.accountClassification ?? null,
        toAccountId: toEntry?.accountId ?? null,
        toAccountName: toEntry?.accountName ?? null,
        toAccountClassification: toEntry?.accountClassification ?? null,
        categoryId,
        merchantId: first.merchantId ?? null,
        paymentMethodId: first.paymentMethodId ?? null,
        paymentMethodCode: first.paymentMethodCode ?? null,
        paymentMethodName: first.paymentMethodName ?? null,
        includeInBudget: first.includeInBudget,
        purchaseDate: formatDateOnly(first.purchaseDate),
        postedDate: formatDateOnly(first.postedDate),
        createdAt: first.createdAt,
        updatedAt: first.updatedAt,
      };
    }

    const accountEntry = accountEntries[0] ?? null;

    return {
      id: first.transactionId,
      userId: first.userId,
      type: first.type,
      description: first.description,
      amount: absoluteAmount(accountEntry?.entryAmount ?? first.entryAmount),
      currencyCode: accountEntry?.entryCurrencyCode ?? first.entryCurrencyCode,
      accountId: accountEntry?.accountId ?? null,
      accountName: accountEntry?.accountName ?? null,
      accountClassification: accountEntry?.accountClassification ?? null,
      toAccountId: null,
      toAccountName: null,
      toAccountClassification: null,
      categoryId,
      merchantId: first.merchantId ?? null,
      paymentMethodId: first.paymentMethodId ?? null,
      paymentMethodCode: first.paymentMethodCode ?? null,
      paymentMethodName: first.paymentMethodName ?? null,
      includeInBudget: first.includeInBudget,
      purchaseDate: formatDateOnly(first.purchaseDate),
      postedDate: formatDateOnly(first.postedDate),
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
    };
  });
}

async function validateOptionalMerchant(userId: string, merchantId?: string): Promise<void> {
  if (!merchantId) return;

  const merchant = await txRepository.findOwnedMerchant(merchantId, userId);
  if (!merchant) throw new NotFoundError('Merchant');
}

async function validateCategory(
  userId: string,
  categoryId: string,
  expectedType: 'expense' | 'income',
): Promise<void> {
  const category = await txRepository.findOwnedCategory(categoryId, userId);
  if (!category) throw new NotFoundError('Category');
  if (category.type !== expectedType) {
    throw new ValidationError(`Category ${categoryId} must be of type ${expectedType}`);
  }
}

async function resolvePaymentMethod(paymentMethodCode: string, currencyCode: string) {
  const paymentMethod = await txRepository.findPaymentMethodByCode(paymentMethodCode, currencyCode);
  if (!paymentMethod) {
    throw new ValidationError(`Payment method ${paymentMethodCode} is not available for currency ${currencyCode}`);
  }

  return paymentMethod;
}

async function createBaseTransaction(
  tx: txRepository.TxClient,
  userId: string,
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
    userId,
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

async function persistEntries(tx: txRepository.TxClient, transactionId: string, entries: EntryDraft[]): Promise<void> {
  validateBalanced(entries);

  await txRepository.createEntries(
    tx,
    entries.map((entry) => ({
      transactionId,
      ledgerAccountId: entry.ledgerAccountId,
      amount: entry.amount,
      currencyId: entry.currencyCode,
      categoryId: entry.categoryId,
      budgetMonth: entry.budgetMonth,
    })),
  );
}

async function loadCreatedTransaction(userId: string, transactionId: string): Promise<TransactionResponse> {
  const rows = await txRepository.listDetailedByTransactionIds(userId, [transactionId]);
  const [transaction] = mapDetailedRows(rows);

  if (!transaction) {
    throw new NotFoundError('Transaction');
  }

  return transaction;
}

async function createExpense(userId: string, dto: Extract<CreateTransactionDto, { type: 'expense' }>): Promise<TransactionResponse> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const paymentMethod = await resolvePaymentMethod(dto.paymentMethodCode, dto.currencyCode);

  await validateOptionalMerchant(userId, dto.merchantId);
  await validateCategory(userId, dto.categoryId, 'expense');

  const account = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');
  if (account.currencyId !== dto.currencyCode) {
    throw new ValidationError('Transaction currency must match account currency');
  }

  const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  const transactionId = await db.transaction(async (tx) => {
    const expenseLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:expense:${dto.currencyCode}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.expense,
      dto.currencyCode,
    );

    const createdTransactionId = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethodId: paymentMethod.id,
      categoryId: dto.categoryId,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      ...normalizeBudgetInclusion(dto),
    });

    await persistEntries(tx, createdTransactionId, [
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

    return createdTransactionId;
  });

  return loadCreatedTransaction(userId, transactionId);
}

async function createIncome(userId: string, dto: Extract<CreateTransactionDto, { type: 'income' }>): Promise<TransactionResponse> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const paymentMethod = await resolvePaymentMethod(dto.paymentMethodCode, dto.currencyCode);

  await validateOptionalMerchant(userId, dto.merchantId);
  await validateCategory(userId, dto.categoryId, 'income');

  const account = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');
  if (account.currencyId !== dto.currencyCode) {
    throw new ValidationError('Transaction currency must match account currency');
  }

  const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  const transactionId = await db.transaction(async (tx) => {
    const incomeLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:income:${dto.currencyCode}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.income,
      dto.currencyCode,
    );

    const createdTransactionId = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethodId: paymentMethod.id,
      categoryId: dto.categoryId,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      ...normalizeBudgetInclusion(dto),
    });

    await persistEntries(tx, createdTransactionId, [
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

    return createdTransactionId;
  });

  return loadCreatedTransaction(userId, transactionId);
}

async function createTransfer(userId: string, dto: Extract<CreateTransactionDto, { type: 'transfer' }>): Promise<TransactionResponse> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  if (dto.fromAccountId === dto.toAccountId) {
    throw new ValidationError('Transfer source and destination must be different accounts');
  }

  const fromAccount = await txRepository.findOwnedAccount(dto.fromAccountId, userId);
  if (!fromAccount) throw new NotFoundError('Source account');

  const toAccount = await txRepository.findOwnedAccount(dto.toAccountId, userId);
  if (!toAccount) throw new NotFoundError('Destination account');

  if (fromAccount.currencyId !== dto.currencyCode || toAccount.currencyId !== dto.currencyCode) {
    throw new ValidationError('Transfer currency must match both account currencies');
  }

  const fromLedger = await txRepository.findLedgerAccountByOwner('account', fromAccount.id);
  const toLedger = await txRepository.findLedgerAccountByOwner('account', toAccount.id);
  if (!fromLedger || !toLedger) throw new NotFoundError('Account ledger');

  const transactionId = await db.transaction(async (tx) => {
    const createdTransactionId = await createBaseTransaction(tx, userId, {
      type: dto.type,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      ...normalizeBudgetInclusion(dto),
    });

    await persistEntries(tx, createdTransactionId, [
      {
        ledgerAccountId: fromLedger.id,
        amount: -dto.amount,
        currencyCode: dto.currencyCode,
      },
      {
        ledgerAccountId: toLedger.id,
        amount: dto.amount,
        currencyCode: dto.currencyCode,
      },
    ]);

    return createdTransactionId;
  });

  return loadCreatedTransaction(userId, transactionId);
}

async function createAdjustment(
  userId: string,
  dto: Extract<CreateTransactionDto, { type: 'adjustment' }>,
): Promise<TransactionResponse> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const account = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');

  const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  const accountAmount =
    account.classification === 'asset'
      ? dto.direction === 'increase'
        ? dto.amount
        : -dto.amount
      : dto.direction === 'increase'
        ? -dto.amount
        : dto.amount;

  const transactionId = await db.transaction(async (tx) => {
    const adjustmentLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:adjustment:${account.currencyId}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.adjustment,
      account.currencyId,
    );

    const createdTransactionId = await createBaseTransaction(tx, userId, {
      type: dto.type,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      ...normalizeBudgetInclusion(dto),
    });

    await persistEntries(tx, createdTransactionId, [
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

    return createdTransactionId;
  });

  return loadCreatedTransaction(userId, transactionId);
}

export async function createTransaction(userId: string, dto: CreateTransactionDto): Promise<TransactionResponse> {
  switch (dto.type) {
    case 'expense':
      return createExpense(userId, dto);
    case 'income':
      return createIncome(userId, dto);
    case 'transfer':
      return createTransfer(userId, dto);
    case 'adjustment':
      return createAdjustment(userId, dto);
    default:
      throw new ValidationError('Invalid transaction type');
  }
}

export async function listTransactions(userId: string): Promise<TransactionResponse[]> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const rows = await txRepository.listDetailedByUserId(userId);
  return mapDetailedRows(rows);
}
