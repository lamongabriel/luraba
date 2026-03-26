import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { ensureBillingCycleWindow, getCycleOutstanding } from '@/modules/finance/billing-cycles.service';
import {
  deriveBillingCycleStatus,
  resolveBudgetMonth,
  splitInstallments,
} from '@/modules/finance/finance.helpers';
import { NotFoundError, ValidationError } from '@/shared/errors';
import * as txRepository from './transactions.repository';
import { CreateTransactionDto } from './transactions.types';

type EntryDraft = {
  ledgerAccountId: string;
  amount: bigint;
  currencyId: string;
  categoryId?: string;
  billingCycleId?: string;
  budgetMonth?: Date;
};

type CreatedTransaction = Awaited<ReturnType<typeof txRepository.createTransaction>>;
type CreatedEntry = Awaited<ReturnType<typeof txRepository.createEntries>>[number];
type CreatedInstallment = Awaited<ReturnType<typeof txRepository.createInstallment>>;
type CreatedInstallmentItem = Awaited<ReturnType<typeof txRepository.createInstallmentItems>>[number];
type CreatedCardPayment = Awaited<ReturnType<typeof txRepository.createCardPayment>>;

type CreateTransactionResult = {
  transaction: CreatedTransaction;
  entries: CreatedEntry[];
  installment?: CreatedInstallment;
  installmentItems?: CreatedInstallmentItem[];
  cardPayment?: CreatedCardPayment;
};

function validateBalanced(entries: EntryDraft[]): void {
  if (entries.length < 2) {
    throw new ValidationError('Every transaction must create at least two entries');
  }

  const sumsByCurrency = new Map<string, bigint>();

  for (const entry of entries) {
    const current = sumsByCurrency.get(entry.currencyId) ?? 0n;
    sumsByCurrency.set(entry.currencyId, current + entry.amount);
  }

  for (const [currencyId, total] of sumsByCurrency.entries()) {
    if (total !== 0n) {
      throw new ValidationError(`Entries are not balanced for currency ${currencyId}`);
    }
  }
}

function normalizeFlags(dto: CreateTransactionDto): {
  isExcluded: boolean;
  isOneTimeTransaction: boolean;
} {
  return {
    isExcluded: dto.isExcluded ?? false,
    isOneTimeTransaction: dto.isOneTimeTransaction ?? false,
  };
}

async function validateOptionalMerchant(userId: string, merchantId?: string): Promise<void> {
  if (!merchantId) return;

  const merchant = await txRepository.findOwnedMerchant(merchantId, userId);
  if (!merchant) throw new NotFoundError('Merchant');
}

async function validateOptionalCategory(
  userId: string,
  categoryId: string | undefined,
  expectedType: 'expense' | 'income',
): Promise<void> {
  if (!categoryId) return;

  const category = await txRepository.findOwnedCategory(categoryId, userId);
  if (!category) throw new NotFoundError('Category');
  if (category.type !== expectedType) {
    throw new ValidationError(`Category ${categoryId} must be of type ${expectedType}`);
  }
}

async function createBaseTransaction(
  tx: txRepository.TxClient,
  userId: string,
  values: {
    type: CreateTransactionDto['type'];
    paymentMethod?: 'cash' | 'debit' | 'pix' | 'boleto' | 'credit_card';
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    isExcluded: boolean;
    isOneTimeTransaction: boolean;
    merchantId?: string;
  },
): Promise<CreatedTransaction> {
  return txRepository.createTransaction(tx, {
    userId,
    type: values.type,
    paymentMethod: values.paymentMethod,
    description: values.description,
    isExcluded: values.isExcluded,
    isOneTimeTransaction: values.isOneTimeTransaction,
    merchantId: values.merchantId,
    purchaseDate: values.purchaseDate,
    postedDate: values.postedDate,
  });
}

async function persistEntries(
  tx: txRepository.TxClient,
  transactionId: string,
  entries: EntryDraft[],
): Promise<CreatedEntry[]> {
  validateBalanced(entries);

  return txRepository.createEntries(
    tx,
    entries.map((entry) => ({
      transactionId,
      ledgerAccountId: entry.ledgerAccountId,
      amount: entry.amount,
      currencyId: entry.currencyId,
      categoryId: entry.categoryId,
      billingCycleId: entry.billingCycleId,
      budgetMonth: entry.budgetMonth,
    })),
  );
}

async function findCycleInTransaction(
  tx: txRepository.TxClient,
  cardId: string,
  purchaseDate: Date,
): Promise<(typeof billingCyclesTable.$inferSelect) | undefined> {
  const rows = await tx
    .select()
    .from(billingCyclesTable)
    .where(
      and(
        eq(billingCyclesTable.creditCardId, cardId),
        lte(billingCyclesTable.startDate, purchaseDate),
        gte(billingCyclesTable.endDate, purchaseDate),
      ),
    );

  return rows[0];
}

async function listCyclesFromTransaction(
  tx: txRepository.TxClient,
  cardId: string,
  startDate: Date,
): Promise<(typeof billingCyclesTable.$inferSelect)[]> {
  return tx
    .select()
    .from(billingCyclesTable)
    .where(and(eq(billingCyclesTable.creditCardId, cardId), gte(billingCyclesTable.startDate, startDate)))
    .orderBy(billingCyclesTable.startDate);
}

async function createExpense(userId: string, dto: Extract<CreateTransactionDto, { type: 'expense' }>): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  await validateOptionalMerchant(userId, dto.merchantId);
  await validateOptionalCategory(userId, dto.categoryId, 'expense');

  const account = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');
  if (account.currencyId !== dto.currencyId) {
    throw new ValidationError('Transaction currency must match account currency');
  }

  const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  return db.transaction(async (tx) => {
    const expenseLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:expense:${dto.currencyId}`,
      'expense',
      dto.currencyId,
    );

    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      ...normalizeFlags(dto),
    });

    const entries = await persistEntries(tx, transaction.id, [
      {
        ledgerAccountId: expenseLedger.id,
        amount: dto.amount,
        currencyId: dto.currencyId,
        categoryId: dto.categoryId,
        budgetMonth: resolveBudgetMonth('purchase', dto.purchaseDate),
      },
      {
        ledgerAccountId: accountLedger.id,
        amount: -dto.amount,
        currencyId: dto.currencyId,
      },
    ]);

    return { transaction, entries };
  });
}

async function createIncome(userId: string, dto: Extract<CreateTransactionDto, { type: 'income' }>): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  await validateOptionalMerchant(userId, dto.merchantId);
  await validateOptionalCategory(userId, dto.categoryId, 'income');

  const account = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');
  if (account.currencyId !== dto.currencyId) {
    throw new ValidationError('Transaction currency must match account currency');
  }

  const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  return db.transaction(async (tx) => {
    const incomeLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:income:${dto.currencyId}`,
      'income',
      dto.currencyId,
    );

    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      ...normalizeFlags(dto),
    });

    const entries = await persistEntries(tx, transaction.id, [
      {
        ledgerAccountId: accountLedger.id,
        amount: dto.amount,
        currencyId: dto.currencyId,
      },
      {
        ledgerAccountId: incomeLedger.id,
        amount: -dto.amount,
        currencyId: dto.currencyId,
        categoryId: dto.categoryId,
        budgetMonth: resolveBudgetMonth('purchase', dto.purchaseDate),
      },
    ]);

    return { transaction, entries };
  });
}

async function createTransfer(userId: string, dto: Extract<CreateTransactionDto, { type: 'transfer' }>): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  if (dto.accountId === dto.toAccountId) {
    throw new ValidationError('Transfer source and destination must be different accounts');
  }

  const fromAccount = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!fromAccount) throw new NotFoundError('Source account');

  const toAccount = await txRepository.findOwnedAccount(dto.toAccountId, userId);
  if (!toAccount) throw new NotFoundError('Destination account');

  if (fromAccount.currencyId !== dto.currencyId || toAccount.currencyId !== dto.currencyId) {
    throw new ValidationError('Transfer currency must match both account currencies');
  }

  const fromLedger = await txRepository.findLedgerAccountByOwner('account', fromAccount.id);
  const toLedger = await txRepository.findLedgerAccountByOwner('account', toAccount.id);
  if (!fromLedger || !toLedger) throw new NotFoundError('Account ledger');

  return db.transaction(async (tx) => {
    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      ...normalizeFlags(dto),
    });

    const entries = await persistEntries(tx, transaction.id, [
      {
        ledgerAccountId: toLedger.id,
        amount: dto.amount,
        currencyId: dto.currencyId,
      },
      {
        ledgerAccountId: fromLedger.id,
        amount: -dto.amount,
        currencyId: dto.currencyId,
      },
    ]);

    return { transaction, entries };
  });
}

async function createCardPurchase(
  userId: string,
  dto: Extract<CreateTransactionDto, { type: 'card_purchase' }>,
): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  await validateOptionalMerchant(userId, dto.merchantId);
  await validateOptionalCategory(userId, dto.categoryId, 'expense');

  const card = await txRepository.findOwnedCreditCard(dto.creditCardId, userId);
  if (!card) throw new NotFoundError('Credit card');
  if (card.currencyId !== dto.currencyId) {
    throw new ValidationError('Transaction currency must match credit card currency');
  }

  const cardLedger = await txRepository.findLedgerAccountByOwner('credit_card', card.id);
  if (!cardLedger) throw new NotFoundError('Credit card ledger');

  return db.transaction(async (tx) => {
    await ensureBillingCycleWindow(tx, card, dto.purchaseDate, 2, 12);

    const cycle = await findCycleInTransaction(tx, card.id, dto.purchaseDate);
    if (!cycle) throw new ValidationError('No billing cycle found for purchase date');

    const expenseLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:expense:${dto.currencyId}`,
      'expense',
      dto.currencyId,
    );

    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      ...normalizeFlags(dto),
    });

    const entries = await persistEntries(tx, transaction.id, [
      {
        ledgerAccountId: expenseLedger.id,
        amount: dto.amount,
        currencyId: dto.currencyId,
        categoryId: dto.categoryId,
        billingCycleId: cycle.id,
        budgetMonth: resolveBudgetMonth('purchase', dto.purchaseDate),
      },
      {
        ledgerAccountId: cardLedger.id,
        amount: -dto.amount,
        currencyId: dto.currencyId,
        billingCycleId: cycle.id,
      },
    ]);

    const outstanding = await getCycleOutstanding(tx, cardLedger.id, cycle.id);
    await txRepository.updateBillingCycleStatus(tx, cycle.id, deriveBillingCycleStatus(cycle, outstanding, new Date()));

    return { transaction, entries };
  });
}

async function createInstallmentPurchase(
  userId: string,
  dto: Extract<CreateTransactionDto, { type: 'installment' }>,
): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  await validateOptionalMerchant(userId, dto.merchantId);
  await validateOptionalCategory(userId, dto.categoryId, 'expense');

  const card = await txRepository.findOwnedCreditCard(dto.creditCardId, userId);
  if (!card) throw new NotFoundError('Credit card');
  if (card.currencyId !== dto.currencyId) {
    throw new ValidationError('Transaction currency must match credit card currency');
  }

  const cardLedger = await txRepository.findLedgerAccountByOwner('credit_card', card.id);
  if (!cardLedger) throw new NotFoundError('Credit card ledger');

  return db.transaction(async (tx) => {
    await ensureBillingCycleWindow(tx, card, dto.purchaseDate, 2, Math.max(12, dto.installmentCount + 2));

    const purchaseCycle = await findCycleInTransaction(tx, card.id, dto.purchaseDate);
    if (!purchaseCycle) throw new ValidationError('No billing cycle found for purchase date');

    const cycles = await listCyclesFromTransaction(tx, card.id, purchaseCycle.startDate);
    const targetCycles = cycles.slice(0, dto.installmentCount);

    if (targetCycles.length !== dto.installmentCount) {
      throw new ValidationError('Not enough future billing cycles available for the installment schedule');
    }

    const expenseLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:expense:${dto.currencyId}`,
      'expense',
      dto.currencyId,
    );

    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      ...normalizeFlags(dto),
    });

    const installmentSlices = splitInstallments(dto.amount, dto.installmentCount);
    const entryDrafts: EntryDraft[] = [];

    for (let index = 0; index < targetCycles.length; index += 1) {
      const cycle = targetCycles[index];
      const sliceAmount = installmentSlices[index];

      entryDrafts.push(
        {
          ledgerAccountId: expenseLedger.id,
          amount: sliceAmount,
          currencyId: dto.currencyId,
          categoryId: dto.categoryId,
          billingCycleId: cycle.id,
          budgetMonth: resolveBudgetMonth('cycle', dto.purchaseDate, cycle.closingDate),
        },
        {
          ledgerAccountId: cardLedger.id,
          amount: -sliceAmount,
          currencyId: dto.currencyId,
          billingCycleId: cycle.id,
        },
      );
    }

    const entries = await persistEntries(tx, transaction.id, entryDrafts);
    const installment = await txRepository.createInstallment(tx, {
      transactionId: transaction.id,
      creditCardId: card.id,
      totalAmount: dto.amount,
      count: dto.installmentCount,
    });

    const liabilityEntriesByCycle = new Map<string, CreatedEntry>();
    for (const entry of entries) {
      if (entry.ledgerAccountId === cardLedger.id && entry.billingCycleId && entry.amount < 0n) {
        liabilityEntriesByCycle.set(entry.billingCycleId, entry);
      }
    }

    const installmentItems = await txRepository.createInstallmentItems(
      tx,
      targetCycles.map((cycle, index) => {
        const liabilityEntry = liabilityEntriesByCycle.get(cycle.id);
        if (!liabilityEntry) {
          throw new ValidationError(`Missing liability entry for installment cycle ${cycle.id}`);
        }

        return {
          installmentId: installment.id,
          billingCycleId: cycle.id,
          amount: installmentSlices[index],
          entryId: liabilityEntry.id,
        };
      }),
    );

    for (const cycle of targetCycles) {
      const outstanding = await getCycleOutstanding(tx, cardLedger.id, cycle.id);
      await txRepository.updateBillingCycleStatus(tx, cycle.id, deriveBillingCycleStatus(cycle, outstanding, new Date()));
    }

    return {
      transaction,
      entries,
      installment,
      installmentItems,
    };
  });
}

async function createCardPayment(
  userId: string,
  dto: Extract<CreateTransactionDto, { type: 'card_payment' }>,
): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const account = await txRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');

  const cycle = await txRepository.findOwnedBillingCycle(dto.billingCycleId, userId);
  if (!cycle) throw new NotFoundError('Billing cycle');

  if (account.currencyId !== cycle.cardCurrencyId) {
    throw new ValidationError('Card payment account currency must match the card currency');
  }

  const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
  if (!accountLedger) throw new NotFoundError('Account ledger');

  const cardLedger = await txRepository.findLedgerAccountByOwner('credit_card', cycle.creditCardId);
  if (!cardLedger) throw new NotFoundError('Credit card ledger');

  return db.transaction(async (tx) => {
    const outstanding = await getCycleOutstanding(tx, cardLedger.id, cycle.id);
    if (outstanding <= 0n) {
      throw new ValidationError('Billing cycle is already fully paid');
    }

    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description:
        dto.description ?? `${cycle.cardName} payment for cycle closing ${cycle.closingDate.toISOString().slice(0, 10)}`,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      ...normalizeFlags(dto),
    });

    const entries = await persistEntries(tx, transaction.id, [
      {
        ledgerAccountId: cardLedger.id,
        amount: outstanding,
        currencyId: cycle.cardCurrencyId,
        billingCycleId: cycle.id,
      },
      {
        ledgerAccountId: accountLedger.id,
        amount: -outstanding,
        currencyId: cycle.cardCurrencyId,
      },
    ]);

    const cardPayment = await txRepository.createCardPayment(tx, {
      transactionId: transaction.id,
      billingCycleId: cycle.id,
      amount: outstanding,
    });

    await txRepository.updateBillingCycleStatus(tx, cycle.id, deriveBillingCycleStatus(cycle, 0n, new Date()));

    return {
      transaction,
      entries,
      cardPayment,
    };
  });
}

async function createAdjustment(
  userId: string,
  dto: Extract<CreateTransactionDto, { type: 'adjustment' }>,
): Promise<CreateTransactionResult> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const target =
    dto.targetType === 'account'
      ? await txRepository.findOwnedAccount(dto.targetId, userId)
      : await txRepository.findOwnedCreditCard(dto.targetId, userId);

  if (!target) {
    throw new NotFoundError(dto.targetType === 'account' ? 'Account' : 'Credit card');
  }

  const targetLedger = await txRepository.findLedgerAccountByOwner(dto.targetType, dto.targetId);
  if (!targetLedger) {
    throw new NotFoundError(dto.targetType === 'account' ? 'Account ledger' : 'Credit card ledger');
  }

  return db.transaction(async (tx) => {
    const equityLedger = await txRepository.findOrCreateSystemLedger(
      tx,
      `system:equity:${targetLedger.currencyId}`,
      'equity',
      targetLedger.currencyId,
    );

    const transaction = await createBaseTransaction(tx, userId, {
      type: dto.type,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      ...normalizeFlags(dto),
    });

    const targetIncreaseAmount =
      targetLedger.type === 'asset'
        ? dto.direction === 'increase'
          ? dto.amount
          : -dto.amount
        : dto.direction === 'increase'
          ? -dto.amount
          : dto.amount;

    const entries = await persistEntries(tx, transaction.id, [
      {
        ledgerAccountId: targetLedger.id,
        amount: targetIncreaseAmount,
        currencyId: targetLedger.currencyId,
      },
      {
        ledgerAccountId: equityLedger.id,
        amount: -targetIncreaseAmount,
        currencyId: targetLedger.currencyId,
      },
    ]);

    return { transaction, entries };
  });
}

export async function createTransaction(userId: string, dto: CreateTransactionDto): Promise<CreateTransactionResult> {
  switch (dto.type) {
    case 'expense':
      return createExpense(userId, dto);
    case 'income':
      return createIncome(userId, dto);
    case 'transfer':
      return createTransfer(userId, dto);
    case 'card_purchase':
      return createCardPurchase(userId, dto);
    case 'installment':
      return createInstallmentPurchase(userId, dto);
    case 'card_payment':
      return createCardPayment(userId, dto);
    case 'adjustment':
      return createAdjustment(userId, dto);
    default: {
      const exhaustiveCheck: never = dto;
      return exhaustiveCheck;
    }
  }
}

export async function listTransactions(userId: string): Promise<Awaited<ReturnType<typeof txRepository.listByUserId>>> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  return txRepository.listByUserId(userId);
}

export { deriveBillingCycleStatus };
