import { ACCOUNT_TYPE_TO_CLASSIFICATION } from '@/config/accounts';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import {
  buildBrandfetchLogoUrl,
  normalizeBrandDomain,
} from '@/modules/integrations/brandfetch/brandfetch.utils';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import {
  mapDetailedRows,
  mapTransactionResponsesToFeedRows,
} from '@/modules/transactions/transactions.helpers';
import * as transactionsRepository from '@/modules/transactions/transactions.repository';
import type { TransactionFeedRow } from '@/modules/transactions/transactions.types';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { accountsRepository } from './accounts.repository';
import type {
  Account,
  AccountClassification,
  AccountDetails,
  AccountRecord,
  AccountType,
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
    createdAt: formatISODateTime(account.createdAt),
    updatedAt: formatISODateTime(account.updatedAt),
  };
}

function mapAccountDetails(account: AccountRecord, balance: number): AccountDetails {
  return {
    ...mapAccountRecord(account),
    balance: toDisplayedAmount(balance, account.classification),
  };
}

type CreateAccountRecordInput = {
  name: string;
  institutionName?: string;
  institutionDomain?: string;
  notes?: string;
  classification: AccountClassification;
  type: AccountType;
  currencyId: string;
};

type UpdateAccountRecordInput = {
  name?: string;
  institutionName?: string | null;
  institutionDomain?: string | null;
  notes?: string | null;
};

async function resolveInstitutionBranding(
  context: HouseholdContext,
  institutionDomain: string | undefined,
): Promise<{ institutionDomain: string | undefined; institutionLogoUrl: string | undefined }> {
  const normalizedInstitutionDomain = institutionDomain
    ? normalizeBrandDomain(institutionDomain)
    : undefined;

  let institutionLogoUrl: string | undefined;
  if (normalizedInstitutionDomain) {
    const brandfetchClientId = await brandfetchService.getBrandfetchClientId(context);
    if (brandfetchClientId) {
      institutionLogoUrl = buildBrandfetchLogoUrl(normalizedInstitutionDomain, brandfetchClientId);
    }
  }

  return {
    institutionDomain: normalizedInstitutionDomain,
    institutionLogoUrl,
  };
}

async function resolveUpdatedInstitutionBranding(
  context: HouseholdContext,
  institutionDomain: string | null | undefined,
): Promise<{
  institutionDomain: string | null | undefined;
  institutionLogoUrl: string | null | undefined;
}> {
  if (institutionDomain === null) {
    return {
      institutionDomain: null,
      institutionLogoUrl: null,
    };
  }

  const resolved = await resolveInstitutionBranding(context, institutionDomain);
  return {
    institutionDomain: resolved.institutionDomain,
    institutionLogoUrl: institutionDomain ? (resolved.institutionLogoUrl ?? null) : undefined,
  };
}

async function buildUpdatedAccountValues(
  context: HouseholdContext,
  values: UpdateAccountRecordInput,
): Promise<UpdateAccountRecordInput & { institutionLogoUrl?: string | null }> {
  const institution = await resolveUpdatedInstitutionBranding(context, values.institutionDomain);

  return {
    ...values,
    institutionDomain: institution.institutionDomain,
    institutionLogoUrl: institution.institutionLogoUrl,
  };
}

export async function createAccountRecordInTransaction(
  tx: Parameters<typeof accountsRepository.createInTransaction>[0],
  context: HouseholdContext,
  values: CreateAccountRecordInput,
): Promise<AccountRecord> {
  const institution = await resolveInstitutionBranding(context, values.institutionDomain);

  return accountsRepository.createInTransaction(tx, context, {
    ...values,
    institutionDomain: institution.institutionDomain,
    institutionLogoUrl: institution.institutionLogoUrl,
  });
}

export async function updateAccountRecordInTransaction(
  tx: Parameters<typeof accountsRepository.updateInTransaction>[0],
  context: HouseholdContext,
  accountId: string,
  values: UpdateAccountRecordInput,
): Promise<AccountRecord | undefined> {
  return accountsRepository.updateInTransaction(
    tx,
    context,
    accountId,
    await buildUpdatedAccountValues(context, values),
  );
}

export async function createAccount(
  context: HouseholdContext,
  dto: CreateAccountRequestBody,
): Promise<Account> {
  const currency = await currenciesRepository.findByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const existing = await accountsRepository.findByHouseholdAndName(context, dto.name);
  if (existing) throw new ConflictError('An account with this name already exists');
  const classification = ACCOUNT_TYPE_TO_CLASSIFICATION[dto.type];

  return db.transaction(async (tx) => {
    const account = await createAccountRecordInTransaction(tx, context, {
      name: dto.name,
      institutionName: dto.institutionName,
      institutionDomain: dto.institutionDomain,
      notes: dto.notes,
      classification,
      type: dto.type,
      currencyId: dto.currencyCode,
    });

    await ledgerAccountsRepository.createForAccount(tx, {
      accountId: account.id,
      classification: account.classification,
      currencyCode: account.currencyId,
    });

    return mapAccountRecord(account);
  });
}

export async function listAccounts(context: HouseholdContext): Promise<AccountDetails[]> {
  const accounts = await accountsRepository.list(context);

  return Promise.all(
    accounts.map(async (account) => {
      const ledger = await ledgerAccountsRepository.findByOwner('account', account.id);
      if (!ledger) throw new NotFoundError('Account ledger');

      const balance = await ledgerAccountsRepository.getBalance(ledger.id);
      return mapAccountDetails(account, balance);
    }),
  );
}

export async function getAccountDetails(
  context: HouseholdContext,
  accountId: string,
): Promise<AccountDetails> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError('Account');

  const ledger = await ledgerAccountsRepository.findByOwner('account', account.id);
  if (!ledger) throw new NotFoundError('Account ledger');

  const balance = await ledgerAccountsRepository.getBalance(ledger.id);
  return mapAccountDetails(account, balance);
}

export async function listAccountTransactions(
  context: HouseholdContext,
  accountId: string,
): Promise<TransactionFeedRow[]> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError('Account');
  if (account.type === 'credit_card') {
    throw new ValidationError(
      'Credit card account transactions must be viewed through credit card billing cycles',
    );
  }

  const rows = await transactionsRepository.listDetailedByAccountId(context, account.id);
  return mapTransactionResponsesToFeedRows(mapDetailedRows(rows));
}

export async function updateAccount(
  context: HouseholdContext,
  accountId: string,
  dto: UpdateAccountRequestBody,
): Promise<Account> {
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

  const updated = await accountsRepository.update(
    accountId,
    context,
    await buildUpdatedAccountValues(context, {
      name: dto.name,
      institutionName: dto.institutionName,
      institutionDomain: dto.institutionDomain,
      notes: dto.notes,
    }),
  );

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

  const ledger = await ledgerAccountsRepository.findByOwner('account', account.id);
  if (!ledger) {
    throw new NotFoundError('Account ledger');
  }

  await db.transaction(async (tx) => {
    await transactionsRepository.deleteByLedgerId(tx, context.householdId, ledger.id);
    await ledgerAccountsRepository.deleteByOwner(tx, 'account', account.id);

    const deleted = await accountsRepository.deleteInTransaction(tx, context, account.id);

    if (!deleted) {
      throw new NotFoundError('Account');
    }
  });
}
