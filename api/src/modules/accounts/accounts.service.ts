import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { ConflictError, NotFoundError } from '@/shared/errors';
import * as accountsRepository from './accounts.repository';
import { Account, CreateAccountDto } from './accounts.types';

export async function createAccount(userId: string, dto: CreateAccountDto): Promise<Account> {
  const user = await accountsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await accountsRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  const existing = await accountsRepository.findByUserAndName(userId, dto.name);
  if (existing) throw new ConflictError('An account with this name already exists');

  return db.transaction(async (tx) => {
    const createdAccountRows = await tx
      .insert(accountsTable)
      .values({
        ...dto,
        userId,
      })
      .returning();

    const account = createdAccountRows[0];

    await tx.insert(ledgerAccountsTable).values({
      type: 'asset',
      ownerType: 'account',
      ownerId: account.id,
      currencyId: account.currencyId,
    });

    return account;
  });
}

export async function listAccounts(userId: string): Promise<Account[]> {
  const user = await accountsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');
  return accountsRepository.listByUserId(userId);
}

export async function getAccountBalance(userId: string, accountId: string): Promise<{
  account: Account;
  balance: bigint;
}> {
  const account = await accountsRepository.findOwnedAccount(accountId, userId);
  if (!account) throw new NotFoundError('Account');

  const ledger = await accountsRepository.findLedgerByAccountId(account.id);
  if (!ledger) throw new NotFoundError('Account ledger');

  const balance = await accountsRepository.getAccountBalanceByLedgerId(ledger.id);

  return {
    account,
    balance,
  };
}

export async function getAccountHistory(userId: string, accountId: string): Promise<{
  account: Account;
  balance: bigint;
  items: Array<{
    entryId: string;
    transactionId: string;
    type: 'expense' | 'income' | 'transfer' | 'card_purchase' | 'card_payment' | 'installment' | 'adjustment';
    paymentMethod: 'cash' | 'debit' | 'pix' | 'boleto' | 'credit_card' | null;
    description: string;
    amount: bigint;
    currencyId: string;
    purchaseDate: Date;
    postedDate: Date;
    createdAt: Date;
    cardPayment: null | {
      amount: bigint;
      billingCycleId: string;
      closingDate: Date;
      dueDate: Date;
      cardId: string;
      cardName: string;
    };
  }>;
}> {
  const account = await accountsRepository.findOwnedAccount(accountId, userId);
  if (!account) throw new NotFoundError('Account');

  const ledger = await accountsRepository.findLedgerByAccountId(account.id);
  if (!ledger) throw new NotFoundError('Account ledger');

  const [balance, items] = await Promise.all([
    accountsRepository.getAccountBalanceByLedgerId(ledger.id),
    accountsRepository.listHistoryByLedgerId(ledger.id),
  ]);

  const cardPayments = await accountsRepository.listCardPaymentsByTransactionIds(items.map((item) => item.transactionId));
  const paymentsByTransactionId = new Map(cardPayments.map((payment) => [payment.transactionId, payment]));

  return {
    account,
    balance,
    items: items.map((item) => ({
      entryId: item.entryId,
      transactionId: item.transactionId,
      type: item.type,
      paymentMethod: item.paymentMethod,
      description: item.description,
      amount: item.amount,
      currencyId: item.currencyId,
      purchaseDate: item.purchaseDate,
      postedDate: item.postedDate,
      createdAt: item.createdAt,
      cardPayment: paymentsByTransactionId.get(item.transactionId) ?? null,
    })),
  };
}
