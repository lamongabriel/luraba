import { ACCOUNT_TYPE_TO_CLASSIFICATION } from '@/config/accounts';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import * as creditCardsRepository from '@/modules/credit-cards/credit-cards.repository';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import {
  buildBrandfetchLogoUrl,
  normalizeBrandDomain,
} from '@/modules/integrations/brandfetch/brandfetch.utils';
import { ledgerAccountsRepository } from '@/modules/ledger-accounts/ledger-accounts.repository';
import type { ListTransactionsRequestQuery } from '@/modules/transactions/transactions.query';
import * as transactionsRepository from '@/modules/transactions/transactions.repository';
import {
  createBalanceAdjustmentInTransaction,
  listTransactions as listTransactionFeed,
} from '@/modules/transactions/transactions.service';
import type { TransactionFeedRow } from '@/modules/transactions/transactions.types';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime, getTodayInTimezone, parseISODate } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import type { CreateAccountProfile, UpdateAccountProfile } from './accounts.profiles';
import {
  createAccountProfile,
  getAccountProfile,
  updateAccountProfile,
} from './accounts.profiles.repository';
import type {
  ListAccountsRequestQuery,
  ListAccountTransactionsRequestQuery,
} from './accounts.query';
import { accountsRepository } from './accounts.repository';
import type {
  Account,
  AccountClassification,
  AccountDetails,
  AccountRecord,
  AccountSummary,
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

function mapAccountWithProfile(
  account: AccountRecord,
  balance: number,
  details: AccountDetails['details'],
): AccountDetails {
  return {
    ...mapAccountRecord(account),
    balance: toDisplayedAmount(balance, account.classification),
    details,
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

export async function resolveInstitutionBranding(
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

export async function resolveUpdatedInstitutionBranding(
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

async function validateSecuredAsset(
  context: HouseholdContext,
  details: CreateAccountProfile | UpdateAccountProfile,
  accountId: string | undefined,
): Promise<void> {
  if (details.kind !== 'loan' || !details.securedAssetAccountId) return;
  if (details.securedAssetAccountId === accountId) {
    throw new ValidationError('A loan cannot be secured by itself');
  }

  const securedAsset = await accountsRepository.get(details.securedAssetAccountId, context);
  if (securedAsset?.classification !== 'asset') {
    throw new NotFoundError('Secured asset account');
  }
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
): Promise<AccountDetails> {
  const currency = await currenciesRepository.findByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError('Currency');

  const existing = await accountsRepository.findByHouseholdAndName(context, dto.name);
  if (existing) throw new ConflictError('An account with this name already exists');
  const classification = ACCOUNT_TYPE_TO_CLASSIFICATION[dto.type];

  await validateSecuredAsset(context, dto.details, undefined);

  const account = await db.transaction(async (tx) => {
    const account = await createAccountRecordInTransaction(tx, context, {
      name: dto.name,
      institutionName: dto.institutionName,
      institutionDomain: dto.institutionDomain,
      notes: dto.notes,
      classification,
      type: dto.type,
      currencyId: dto.currencyCode,
    });

    const ledger = await ledgerAccountsRepository.createForAccount(tx, {
      accountId: account.id,
      classification: account.classification,
      currencyCode: account.currencyId,
    });

    await createAccountProfile(tx, account.id, dto.details);

    if (dto.openingBalance !== undefined && dto.openingBalance !== 0) {
      const postedDate = dto.balanceAsOfDate
        ? parseISODate(dto.balanceAsOfDate)
        : getTodayInTimezone(context.timezone);

      await createBalanceAdjustmentInTransaction(tx, context, {
        account,
        accountLedgerId: ledger.id,
        balance: dto.openingBalance,
        description: 'Opening balance',
        includeInBudget: false,
        purchaseDate: postedDate,
        postedDate,
      });
    }

    return account;
  });

  return getAccountDetails(context, account.id);
}

export async function listAccounts(
  context: HouseholdContext,
  query: ListAccountsRequestQuery,
): Promise<ListResult<AccountSummary>> {
  const page = await accountsRepository.listPage(context, query);

  return {
    data: page.rows.map(
      (account): AccountSummary => ({
        ...mapAccountRecord(account),
        subtype: account.subtype,
        balance: toDisplayedAmount(account.balance, account.classification),
      }),
    ),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function getAccountDetails(
  context: HouseholdContext,
  accountId: string,
): Promise<AccountDetails> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError('Account');
  if (account.type === 'credit_card') throw new NotFoundError('Account');

  const ledger = await ledgerAccountsRepository.findByOwner('account', account.id);
  if (!ledger) throw new NotFoundError('Account ledger');

  const balance = await ledgerAccountsRepository.getBalance(ledger.id);
  const profile = await getAccountProfile(account.id, account.type);
  if (!profile) throw new NotFoundError('Account profile');

  return mapAccountWithProfile(account, balance, profile);
}

export async function listAccountTransactions(
  context: HouseholdContext,
  accountId: string,
  query: ListAccountTransactionsRequestQuery,
): Promise<ListResult<TransactionFeedRow>> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError('Account');
  if (account.type === 'credit_card') {
    throw new NotFoundError('Account');
  }

  const transactionsQuery: ListTransactionsRequestQuery = {
    ...query,
    accountIds: [account.id],
    creditCardIds: [],
  };

  return listTransactionFeed(context, transactionsQuery, { includeAdjustments: true });
}

export async function updateAccount(
  context: HouseholdContext,
  accountId: string,
  dto: UpdateAccountRequestBody,
): Promise<AccountDetails> {
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

  if (dto.details && dto.details.kind !== account.type) {
    throw new ValidationError('Account details must match the existing account type');
  }
  if (dto.details) {
    await validateSecuredAsset(context, dto.details, account.id);
    if (dto.details.kind === 'loan') {
      const currentProfile = await getAccountProfile(account.id, account.type);
      if (currentProfile?.kind !== 'loan') throw new NotFoundError('Account profile');
      const startDate =
        dto.details.startDate === undefined ? currentProfile.startDate : dto.details.startDate;
      const maturityDate =
        dto.details.maturityDate === undefined
          ? currentProfile.maturityDate
          : dto.details.maturityDate;
      if (startDate && maturityDate && startDate > maturityDate) {
        throw new ValidationError('Maturity date must be on or after the start date');
      }
    }
  }

  const updated = await db.transaction(async (tx) => {
    const nextAccount = await updateAccountRecordInTransaction(tx, context, accountId, {
      name: dto.name,
      institutionName: dto.institutionName,
      institutionDomain: dto.institutionDomain,
      notes: dto.notes,
    });

    if (dto.details) {
      await updateAccountProfile(tx, accountId, dto.details);
    }

    return nextAccount;
  });

  if (!updated) {
    throw new NotFoundError('Account');
  }

  return getAccountDetails(context, updated.id);
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

  const ownedCardLedgerIds =
    account.type === 'cash'
      ? await creditCardsRepository.findLedgerAccountIdsByOwnerAccountId(
          context.householdId,
          account.id,
        )
      : [];

  await db.transaction(async (tx) => {
    await transactionsRepository.deleteByLedgerId(tx, context.householdId, ledger.id);
    await ledgerAccountsRepository.deleteByOwner(tx, 'account', account.id);

    for (const cardLedgerAccountId of ownedCardLedgerIds) {
      await transactionsRepository.deleteByLedgerId(tx, context.householdId, cardLedgerAccountId);
      await ledgerAccountsRepository.deleteByOwner(tx, 'account', cardLedgerAccountId);
      await accountsRepository.deleteInTransaction(tx, context, cardLedgerAccountId);
    }

    const deleted = await accountsRepository.deleteInTransaction(tx, context, account.id);

    if (!deleted) {
      throw new NotFoundError('Account');
    }
  });
}
