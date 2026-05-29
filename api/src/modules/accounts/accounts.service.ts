import { ACCOUNT_TYPE_TO_CLASSIFICATION } from '@/config/accounts';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import { buildBrandfetchLogoUrl, normalizeBrandDomain } from '@/modules/integrations/brandfetch/brandfetch.utils';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { and, eq, inArray } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '@/shared/errors';
import type { HouseholdContext } from '@/config/permissions';
import { accountsRepository } from './accounts.repository';
import {
  Account,
  AccountClassification,
  AccountDetails,
  AccountRecord,
  CreateAccountRequestBody,
  UpdateAccountRequestBody,
} from './accounts.types';

function toDisplayedAmount(rawAmount: number, classification: AccountClassification): number {
  return classification === 'asset' ? rawAmount : -rawAmount;
}

function mapAccountRecord(account: AccountRecord): Account {
  return {
    id: account.id,
    name: account.name,
    institutionName: account.institutionName ?? null,
    institutionDomain: account.institutionDomain ?? null,
    institutionLogoUrl: account.institutionLogoUrl ?? null,
    notes: account.notes ?? null,
    classification: account.classification,
    type: account.type,
    currencyCode: account.currencyId,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function mapAccountDetails(account: AccountRecord, balance: number): AccountDetails {
  return {
    ...mapAccountRecord(account),
    balance: toDisplayedAmount(balance, account.classification),
  };
}

export async function createAccount(context: HouseholdContext, dto: CreateAccountRequestBody): Promise<Account> {
  const currency = await accountsRepository.findCurrencyByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const existing = await accountsRepository.findByHouseholdAndName(context, dto.name);
  if (existing) throw new ConflictError('An account with this name already exists');
  const classification = ACCOUNT_TYPE_TO_CLASSIFICATION[dto.type];
  const institutionDomain = dto.institutionDomain ? normalizeBrandDomain(dto.institutionDomain) : undefined;

  let institutionLogoUrl: string | undefined;
  if (institutionDomain) {
    const brandfetchClientId = await brandfetchService.getBrandfetchClientId(context);
    if (brandfetchClientId) {
      institutionLogoUrl = buildBrandfetchLogoUrl(institutionDomain, brandfetchClientId);
    }
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    const createdAccountRows = await tx
      .insert(accountsTable)
      .values({
        householdId: context.householdId,
        name: dto.name,
        institutionName: dto.institutionName,
        institutionDomain,
        institutionLogoUrl,
        notes: dto.notes,
        classification,
        type: dto.type,
        currencyId: dto.currencyCode,
        createdAt: now,
        updatedAt: now,
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

export async function listAccounts(context: HouseholdContext): Promise<AccountDetails[]> {
  const accounts = await accountsRepository.list(context);

  return Promise.all(
    accounts.map(async (account) => {
      const ledger = await accountsRepository.findLedgerByAccountId(account.id);
      if (!ledger) throw new NotFoundError('Account ledger');

      const balance = await accountsRepository.getAccountBalanceByLedgerId(ledger.id);
      return mapAccountDetails(account, balance);
    }),
  );
}

export async function getAccountDetails(context: HouseholdContext, accountId: string): Promise<AccountDetails> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError('Account');

  const ledger = await accountsRepository.findLedgerByAccountId(account.id);
  if (!ledger) throw new NotFoundError('Account ledger');

  const balance = await accountsRepository.getAccountBalanceByLedgerId(ledger.id);
  return mapAccountDetails(account, balance);
}

export async function updateAccount(context: HouseholdContext, accountId: string, dto: UpdateAccountRequestBody): Promise<Account> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) {
    throw new NotFoundError('Account');
  }

  if (dto.name && dto.name !== account.name) {
    const existing = await accountsRepository.findByHouseholdAndName(context, dto.name);
    if (existing && existing.id !== accountId) {
      throw new ConflictError('An account with this name already exists');
    }
  }

  const institutionDomain =
    dto.institutionDomain === null
      ? null
      : dto.institutionDomain
        ? normalizeBrandDomain(dto.institutionDomain)
        : undefined;

  let institutionLogoUrl: string | null | undefined;
  if (institutionDomain === null) {
    institutionLogoUrl = null;
  } else if (institutionDomain) {
    const brandfetchClientId = await brandfetchService.getBrandfetchClientId(context);
    institutionLogoUrl = brandfetchClientId
      ? buildBrandfetchLogoUrl(institutionDomain, brandfetchClientId)
      : null;
  }

  const updated = await accountsRepository.update(accountId, context, {
    name: dto.name,
    institutionName: dto.institutionName,
    institutionDomain,
    institutionLogoUrl,
    notes: dto.notes,
  });

  if (!updated) {
    throw new NotFoundError('Account');
  }

  return mapAccountRecord(updated);
}

export async function deleteAccount(context: HouseholdContext, accountId: string): Promise<void> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) {
    throw new NotFoundError('Account');
  }

  const ledger = await accountsRepository.findLedgerByAccountId(account.id);
  if (!ledger) {
    throw new NotFoundError('Account ledger');
  }

  await db.transaction(async (tx) => {
    const transactionRows = await tx
      .select({ id: entriesTable.transactionId })
      .from(entriesTable)
      .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
      .where(and(eq(entriesTable.ledgerAccountId, ledger.id), eq(transactionsTable.householdId, context.householdId)));

    const transactionIds = Array.from(new Set(transactionRows.map((row) => row.id)));
    if (transactionIds.length > 0) {
      await tx
        .delete(transactionsTable)
        .where(and(eq(transactionsTable.householdId, context.householdId), inArray(transactionsTable.id, transactionIds)));
    }

    await tx
      .delete(ledgerAccountsTable)
      .where(and(eq(ledgerAccountsTable.ownerType, 'account'), eq(ledgerAccountsTable.ownerId, account.id)));

    const deletedRows = await tx
      .delete(accountsTable)
      .where(and(eq(accountsTable.id, account.id), eq(accountsTable.householdId, context.householdId)))
      .returning();

    if (!deletedRows[0]) {
      throw new NotFoundError('Account');
    }
  });
}
