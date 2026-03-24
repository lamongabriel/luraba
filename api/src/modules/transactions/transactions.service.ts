import { db } from '@/db';
import { ValidationError, NotFoundError } from '@/shared/errors';
import * as txRepository from './transactions.repository';
import { CreateTransactionDto } from './transactions.types';

type EntryInput = {
  ledgerAccountId: number;
  amount: bigint;
  currencyId: number;
  categoryId?: number;
  billingCycleId?: number;
  budgetMonth?: Date;
};

function budgetMonthFromDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function validateBalanced(entries: EntryInput[]): void {
  if (entries.length < 2) {
    throw new ValidationError('Every transaction must create at least two entries');
  }

  const sumsByCurrency = new Map<number, bigint>();

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

export async function createTransaction(userId: number, dto: CreateTransactionDto): Promise<{
  transaction: Awaited<ReturnType<typeof txRepository.createTransaction>>;
  entries: Awaited<ReturnType<typeof txRepository.createEntries>>;
}> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await txRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  if (dto.merchantId) {
    const merchant = await txRepository.findOwnedMerchant(dto.merchantId, userId);
    if (!merchant) throw new NotFoundError('Merchant');
  }

  const isExcluded = dto.isExcluded ?? false;
  const isOneTimeTransaction = dto.isOneTimeTransaction ?? false;

  return db.transaction(async (tx) => {
    const baseTransaction = await txRepository.createTransaction(tx, {
      userId,
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      isExcluded,
      isOneTimeTransaction,
      merchantId: dto.merchantId,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
    });

    const entries: EntryInput[] = [];
    const budgetMonth = budgetMonthFromDate(dto.purchaseDate);

    if (dto.type === 'expense' || dto.type === 'income') {
      if (!dto.accountId) throw new ValidationError('accountId is required for expense/income');
      if (!dto.paymentMethod) throw new ValidationError('paymentMethod is required for non-card transactions');
      if (dto.paymentMethod === 'credit_card') {
        throw new ValidationError('paymentMethod credit_card is only valid for card_purchase');
      }

      const account = await txRepository.findOwnedAccount(dto.accountId, userId);
      if (!account) throw new NotFoundError('Account');
      if (account.currencyId !== dto.currencyId) {
        throw new ValidationError('Transaction currency must match account currency');
      }

      const accountLedger = await txRepository.findLedgerAccountByOwner('account', account.id);
      if (!accountLedger) throw new NotFoundError('Account ledger');

      if (dto.type === 'expense') {
        const expenseLedger = await txRepository.findOrCreateSystemLedger(
          tx,
          `system:expense:${dto.currencyId}`,
          'expense',
          dto.currencyId,
        );

        entries.push(
          {
            ledgerAccountId: accountLedger.id,
            amount: -dto.amount,
            currencyId: dto.currencyId,
          },
          {
            ledgerAccountId: expenseLedger.id,
            amount: dto.amount,
            currencyId: dto.currencyId,
            categoryId: dto.categoryId,
            budgetMonth,
          },
        );
      } else {
        const incomeLedger = await txRepository.findOrCreateSystemLedger(
          tx,
          `system:income:${dto.currencyId}`,
          'income',
          dto.currencyId,
        );

        entries.push(
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
            budgetMonth,
          },
        );
      }
    } else if (dto.type === 'transfer') {
      if (!dto.accountId || !dto.toAccountId) {
        throw new ValidationError('accountId and toAccountId are required for transfers');
      }

      if (dto.accountId === dto.toAccountId) {
        throw new ValidationError('Transfer source and destination must be different accounts');
      }

      if (dto.paymentMethod === 'credit_card') {
        throw new ValidationError('Transfer cannot use credit_card paymentMethod');
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

      entries.push(
        {
          ledgerAccountId: fromLedger.id,
          amount: -dto.amount,
          currencyId: dto.currencyId,
        },
        {
          ledgerAccountId: toLedger.id,
          amount: dto.amount,
          currencyId: dto.currencyId,
        },
      );
    } else if (dto.type === 'card_purchase') {
      if (!dto.creditCardId) throw new ValidationError('creditCardId is required for card purchases');
      if (dto.paymentMethod !== 'credit_card') {
        throw new ValidationError('Card purchase requires paymentMethod=credit_card');
      }

      const card = await txRepository.findOwnedCreditCard(dto.creditCardId, userId);
      if (!card) throw new NotFoundError('Credit card');
      if (card.currencyId !== dto.currencyId) {
        throw new ValidationError('Transaction currency must match credit card currency');
      }

      const cardLedger = await txRepository.findLedgerAccountByOwner('credit_card', card.id);
      if (!cardLedger) throw new NotFoundError('Credit card ledger');

      const cycle = await txRepository.findCycleByPurchaseDate(card.id, dto.purchaseDate);
      if (!cycle) throw new ValidationError('No billing cycle found for purchase date');

      const expenseLedger = await txRepository.findOrCreateSystemLedger(
        tx,
        `system:expense:${dto.currencyId}`,
        'expense',
        dto.currencyId,
      );

      entries.push(
        {
          ledgerAccountId: cardLedger.id,
          amount: dto.amount,
          currencyId: dto.currencyId,
          billingCycleId: cycle.id,
        },
        {
          ledgerAccountId: expenseLedger.id,
          amount: -dto.amount,
          currencyId: dto.currencyId,
          categoryId: dto.categoryId,
          billingCycleId: cycle.id,
          budgetMonth,
        },
      );
    }

    validateBalanced(entries);

    const createdEntries = await txRepository.createEntries(
      tx,
      entries.map((entry) => ({
        transactionId: baseTransaction.id,
        ledgerAccountId: entry.ledgerAccountId,
        amount: entry.amount,
        currencyId: entry.currencyId,
        categoryId: entry.categoryId,
        billingCycleId: entry.billingCycleId,
        budgetMonth: entry.budgetMonth,
      })),
    );

    return {
      transaction: baseTransaction,
      entries: createdEntries,
    };
  });
}

export async function listTransactions(userId: number): Promise<Awaited<ReturnType<typeof txRepository.listByUserId>>> {
  const user = await txRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  return txRepository.listByUserId(userId);
}