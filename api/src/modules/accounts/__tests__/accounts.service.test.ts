import { ConflictError, NotFoundError } from '@/shared/errors';
import { accountsRepository } from '../accounts.repository';
import * as accountsService from '../accounts.service';
import { createAuthenticatedContext } from '@/test/auth';
import { buildAccountInput, createBalanceEntryForAccount } from '@/test/factories';

describe('accounts service', () => {
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

    const ledger = await accountsRepository.findLedgerByAccountId(account.id);
    expect(ledger).toBeDefined();
    expect(ledger?.classification).toBe('asset');
    expect(ledger?.currencyId).toBe('BRL');
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
