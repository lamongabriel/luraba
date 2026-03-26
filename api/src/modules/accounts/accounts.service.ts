import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { ConflictError, NotFoundError } from '@/shared/errors';
import * as accountsRepository from './accounts.repository';
import {
  AccountClassification,
  AccountListItemResponse,
  AccountResponse,
  CreateAccountDto,
  mapAccountRecord,
} from './accounts.types';

function toDisplayedAmount(rawAmount: bigint, classification: AccountClassification): bigint {
  return classification === 'asset' ? rawAmount : -rawAmount;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function createAccount(userId: string, dto: CreateAccountDto): Promise<AccountResponse> {
  const user = await accountsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await accountsRepository.findCurrencyByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const existing = await accountsRepository.findByUserAndName(userId, dto.name);
  if (existing) throw new ConflictError('An account with this name already exists');

  return db.transaction(async (tx) => {
    const createdAccountRows = await tx
      .insert(accountsTable)
      .values({
        userId,
        name: dto.name,
        institutionName: dto.institutionName,
        institutionDomain: dto.institutionDomain,
        notes: dto.notes,
        classification: dto.classification,
        type: dto.type,
        currencyId: dto.currencyCode,
      })
      .returning();

    const account = createdAccountRows[0];

    await tx.insert(ledgerAccountsTable).values({
      classification: account.classification,
      ownerType: 'account',
      ownerId: account.id,
      currencyId: account.currencyId,
    });

    return mapAccountRecord(account);
  });
}

export async function listAccounts(userId: string): Promise<AccountListItemResponse[]> {
  const user = await accountsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const accounts = await accountsRepository.listByUserId(userId);

  return Promise.all(
    accounts.map(async (account) => {
      const ledger = await accountsRepository.findLedgerByAccountId(account.id);
      if (!ledger) throw new NotFoundError('Account ledger');

      const balance = await accountsRepository.getAccountBalanceByLedgerId(ledger.id);

      return {
        ...mapAccountRecord(account),
        balance: toDisplayedAmount(balance, account.classification),
      };
    }),
  );
}

export async function getAccountHistory(userId: string, accountId: string): Promise<{
  account: AccountResponse;
  balance: bigint;
  items: Array<{
    entryId: string;
    transactionId: string;
    type: 'expense' | 'income' | 'transfer' | 'adjustment';
    paymentMethodId: string | null;
    paymentMethodCode: string | null;
    paymentMethodName: string | null;
    description: string;
    amount: bigint;
    currencyCode: string;
    merchantId: string | null;
    categoryId: string | null;
    purchaseDate: string;
    postedDate: string;
    createdAt: Date;
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

  return {
    account: mapAccountRecord(account),
    balance: toDisplayedAmount(balance, account.classification),
    items: items.map((item) => ({
      entryId: item.entryId,
      transactionId: item.transactionId,
      type: item.type,
      paymentMethodId: item.paymentMethodId ?? null,
      paymentMethodCode: item.paymentMethodCode ?? null,
      paymentMethodName: item.paymentMethodName ?? null,
      description: item.description,
      amount: toDisplayedAmount(item.rawAmount, account.classification),
      currencyCode: item.currencyCode,
      merchantId: item.merchantId ?? null,
      categoryId: item.categoryId ?? null,
      purchaseDate: formatDateOnly(item.purchaseDate),
      postedDate: formatDateOnly(item.postedDate),
      createdAt: item.createdAt,
    })),
  };
}
