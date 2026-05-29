import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { entriesTable } from '@/db/schemas/entries.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { ConflictError, NotFoundError } from '@/shared/errors';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import { accountsRepository } from '../accounts.repository';
import * as accountsService from '../accounts.service';
import { createAuthenticatedContext } from '@/test/auth';
import { buildAccountInput, createBalanceEntryForAccount } from '@/test/factories';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('accounts service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an account, derives classification, and creates a backing ledger account', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Main Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    expect(account.name).toBe('Main Checking');
    expect(account.classification).toBe('asset');
    expect(account.type).toBe('depository');
    expect(account.currencyCode).toBe('BRL');
    expect(account.institutionLogoUrl).toBeNull();

    const ledger = await accountsRepository.findLedgerByAccountId(account.id);
    expect(ledger).toBeDefined();
    expect(ledger?.classification).toBe('asset');
    expect(ledger?.currencyId).toBe('BRL');
  });

  it('creates an account with a Brandfetch institution logo when the integration is configured', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Nu Checking',
        institutionName: 'Nubank',
        institutionDomain: 'https://www.nubank.com.br/conta',
      }),
    );

    expect(account.institutionDomain).toBe('nubank.com.br');
    expect(account.institutionLogoUrl).toBe(
      'https://cdn.brandfetch.io/nubank.com.br/icon.png?c=brandfetch-client-id',
    );
  });

  it('rejects unknown currencies', async () => {
    const context = await createAuthenticatedContext();

    await expect(
      accountsService.createAccount(
        context.householdContext,
        buildAccountInput({
          currencyCode: 'ZZZ',
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects duplicate account names in the same household', async () => {
    const context = await createAuthenticatedContext();
    const input = buildAccountInput({ name: 'Emergency Fund' });

    await accountsService.createAccount(context.householdContext, input);

    await expect(accountsService.createAccount(context.householdContext, input)).rejects.toThrow(ConflictError);
  });

  it('allows the same account name in different households', async () => {
    const left = await createAuthenticatedContext();
    const right = await createAuthenticatedContext();
    const input = buildAccountInput({ name: 'Shared Name' });

    const leftAccount = await accountsService.createAccount(left.householdContext, input);
    const rightAccount = await accountsService.createAccount(right.householdContext, input);

    expect(leftAccount.id).not.toBe(rightAccount.id);
    expect(leftAccount.name).toBe(rightAccount.name);
  });

  it('lists only accounts from the active household with computed balances', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    const asset = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Cash',
        type: 'depository',
      }),
    );

    const liability = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Loan',
        type: 'loan',
      }),
    );

    await accountsService.createAccount(
      otherContext.householdContext,
      buildAccountInput({
        name: 'Foreign Household Account',
      }),
    );

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: asset.id,
      amount: 12_500,
      currencyCode: 'BRL',
    });

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: liability.id,
      amount: 4_000,
      currencyCode: 'BRL',
    });

    const accounts = await accountsService.listAccounts(context.householdContext);

    expect(accounts).toHaveLength(2);
    expect(accounts.map((account) => account.name).sort()).toEqual(['Cash', 'Loan']);
    expect(accounts.find((account) => account.id === asset.id)?.balance).toBe(12_500);
    expect(accounts.find((account) => account.id === liability.id)?.balance).toBe(-4_000);
  });

  it('returns account details with the displayed balance', async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Car Loan',
        type: 'loan',
      }),
    );

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: account.id,
      amount: 9_999,
      currencyCode: 'BRL',
    });

    const details = await accountsService.getAccountDetails(context.householdContext, account.id);

    expect(details.id).toBe(account.id);
    expect(details.balance).toBe(-9_999);
    expect(details.classification).toBe('liability');
  });

  it('updates account details and clears institution branding', async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Old Account',
        institutionName: 'Old Bank',
        institutionDomain: 'old.example.com',
      }),
    );

    const updated = await accountsService.updateAccount(context.householdContext, account.id, {
      name: 'New Account',
      institutionName: null,
      institutionDomain: null,
      notes: 'Kept simple',
    });

    expect(updated.name).toBe('New Account');
    expect(updated.institutionName).toBeNull();
    expect(updated.institutionDomain).toBeNull();
    expect(updated.institutionLogoUrl).toBeNull();
    expect(updated.notes).toBe('Kept simple');
  });

  it('deletes an account and its backing ledger when it has no entries', async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Delete Me' }),
    );

    await accountsService.deleteAccount(context.householdContext, account.id);

    await expect(accountsService.getAccountDetails(context.householdContext, account.id)).rejects.toThrow(NotFoundError);
    await expect(accountsRepository.findLedgerByAccountId(account.id)).resolves.toBeUndefined();
  });

  it('deletes account transactions, entries, and the backing ledger when deleting an account with history', async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Has History' }),
    );

    const entry = await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: account.id,
      amount: 2_500,
    });

    await accountsService.deleteAccount(context.householdContext, account.id);

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, entry.transactionId));
    const entries = await db.select().from(entriesTable).where(eq(entriesTable.transactionId, entry.transactionId));

    expect(transactions).toHaveLength(0);
    expect(entries).toHaveLength(0);
    await expect(accountsRepository.findLedgerByAccountId(account.id)).resolves.toBeUndefined();
    await expect(accountsService.getAccountDetails(context.householdContext, account.id)).rejects.toThrow(NotFoundError);
  });

  it('rejects access to account details across households', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({
        name: 'Private Account',
      }),
    );

    await expect(
      accountsService.getAccountDetails(
        {
          householdId: outsider.household.id,
          userId: outsider.user.id,
          role: 'owner',
          permissions: outsider.householdContext.permissions,
        },
        account.id,
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
