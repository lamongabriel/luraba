import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { ConflictError, NotFoundError } from '@/shared/errors';
import * as accountsRepository from './accounts.repository';
import { Account, CreateAccountDto } from './accounts.types';

export async function createAccount(userId: number, dto: CreateAccountDto): Promise<Account> {
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

export async function listAccounts(userId: number): Promise<Account[]> {
  const user = await accountsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');
  return accountsRepository.listByUserId(userId);
}