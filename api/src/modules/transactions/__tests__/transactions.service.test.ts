import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import * as accountsService from '@/modules/accounts/accounts.service';
import * as categoriesService from '@/modules/categories/categories.service';
import { fxService } from '@/modules/fx/fx.service';
import * as merchantsService from '@/modules/merchants/merchants.service';
import * as paymentMethodsService from '@/modules/payment-methods/payment-methods.service';
import * as tagsService from '@/modules/tags/tags.service';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import {
  buildAccountInput,
  buildCategoryInput,
  buildMerchantInput,
  buildTagInput,
} from '@/test/factories';
import * as transactionsService from '../transactions.service';

describe('transactions service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an expense transaction with multiple tags', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    const tripTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Gramado Trip', color: '#16A34A', icon: 'Ticket01Icon' }),
    );
    const annualTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: '2026 Travel Expenses', color: '#2563EB', icon: 'Calendar03Icon' }),
    );
    const familyTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Family', color: '#F97316', icon: 'UserGroupIcon' }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Bus ticket to Gramado',
      amount: 25_000,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      tagIds: [tripTag.id, annualTag.id, familyTag.id],
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    expect(transaction.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Gramado Trip', color: '#16A34A', icon: 'Ticket01Icon' }),
        expect.objectContaining({
          name: '2026 Travel Expenses',
          color: '#2563EB',
          icon: 'Calendar03Icon',
        }),
        expect.objectContaining({ name: 'Family', color: '#F97316', icon: 'UserGroupIcon' }),
      ]),
    );
  });

  it('rejects tag ids outside the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    const foreignTag = await tagsService.createTag(
      otherContext.householdContext,
      buildTagInput({ name: 'Foreign' }),
    );

    await expect(
      transactionsService.createTransaction(context.householdContext, {
        type: 'expense',
        description: 'Bus ticket to Gramado',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        tagIds: [foreignTag.id],
        purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
        postedDate: new Date('2026-03-24T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects accounts outside the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    const foreignAccount = await accountsService.createAccount(
      otherContext.householdContext,
      buildAccountInput({
        name: 'Foreign Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Travel',
        type: 'expense',
      }),
    );

    await expect(
      transactionsService.createTransaction(context.householdContext, {
        type: 'expense',
        description: 'Bus ticket to Gramado',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: foreignAccount.id,
        categoryId: category.id,
        purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
        postedDate: new Date('2026-03-24T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects categories with the wrong transaction type', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const incomeCategory = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Salary',
        type: 'income',
      }),
    );

    await expect(
      transactionsService.createTransaction(context.householdContext, {
        type: 'expense',
        description: 'Bus ticket to Gramado',
        amount: 25_000,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: incomeCategory.id,
        purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
        postedDate: new Date('2026-03-24T00:00:00.000Z'),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('creates a transaction with a household custom payment method', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Food',
        type: 'expense',
      }),
    );
    await paymentMethodsService.createPaymentMethod(context.householdContext, {
      name: 'Meal Voucher',
      code: 'meal_voucher',
    });

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Lunch',
      amount: 4_500,
      currencyCode: 'BRL',
      paymentMethodCode: 'meal_voucher',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    expect(transaction.paymentMethodCode).toBe('meal_voucher');
    expect(transaction.paymentMethodName).toBe('Meal Voucher');
    expect(transaction.paymentMethodScope).toBe('household');
    expect(transaction.paymentMethodTranslationKey).toBeNull();
  });

  it('prefers currency-specific custom payment methods over global custom methods', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Food',
        type: 'expense',
      }),
    );
    await paymentMethodsService.createPaymentMethod(context.householdContext, {
      name: 'Global Voucher',
      code: 'voucher',
    });
    await paymentMethodsService.createPaymentMethod(context.householdContext, {
      name: 'BRL Voucher',
      code: 'voucher',
      currencyCode: 'BRL',
    });

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Lunch',
      amount: 4_500,
      currencyCode: 'BRL',
      paymentMethodCode: 'voucher',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    expect(transaction.paymentMethodName).toBe('BRL Voucher');
  });

  it('creates an income transaction and updates the account balance', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Salary',
        type: 'income',
      }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'income',
      description: 'Salary',
      amount: 150_000,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    expect(transaction).toMatchObject({
      type: 'income',
      amount: 150_000,
      currencyCode: 'BRL',
      accountId: account.id,
      categoryId: category.id,
    });
    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).resolves.toMatchObject({
      balance: 150_000,
    });
  });

  it('lists only transactions from the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Food', type: 'expense' }),
    );
    const otherAccount = await accountsService.createAccount(
      otherContext.householdContext,
      buildAccountInput({ name: 'Other Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    const otherCategory = await categoriesService.createCategory(
      otherContext.householdContext,
      buildCategoryInput({ name: 'Other Food', type: 'expense' }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Lunch',
      amount: 4_500,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });
    await transactionsService.createTransaction(otherContext.householdContext, {
      type: 'expense',
      description: 'Other lunch',
      amount: 9_000,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: otherAccount.id,
      categoryId: otherCategory.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    await expect(transactionsService.listTransactions(context.householdContext)).resolves.toEqual([
      expect.objectContaining({ id: transaction.id, description: 'Lunch' }),
    ]);
  });

  it('creates adjustment transactions by setting the balance at the start of the posted date', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({
        name: 'Food',
        type: 'expense',
      }),
    );
    const juneFirst = new Date('2026-06-01T00:00:00.000Z');

    await transactionsService.createTransaction(context.householdContext, {
      type: 'adjustment',
      description: 'Opening balance',
      balance: 100_000,
      accountId: account.id,
      purchaseDate: juneFirst,
      postedDate: juneFirst,
    });

    for (const amount of [5_000, 5_000, 10_000]) {
      await transactionsService.createTransaction(context.householdContext, {
        type: 'expense',
        description: `Purchase ${amount}`,
        amount,
        currencyCode: 'BRL',
        paymentMethodCode: 'pix',
        accountId: account.id,
        categoryId: category.id,
        purchaseDate: juneFirst,
        postedDate: juneFirst,
      });
    }

    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).resolves.toMatchObject({
      balance: 80_000,
    });

    const adjustment = await transactionsService.createTransaction(context.householdContext, {
      type: 'adjustment',
      description: 'Bank statement readjustment',
      balance: 70_000,
      accountId: account.id,
      purchaseDate: juneFirst,
      postedDate: juneFirst,
    });

    expect(adjustment.amount).toBe(30_000);
    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).resolves.toMatchObject({
      balance: 50_000,
    });
  });

  it('allows adjustment transactions to set negative balances', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    await transactionsService.createTransaction(context.householdContext, {
      type: 'adjustment',
      description: 'Overdrawn balance',
      balance: -25_000,
      accountId: account.id,
      purchaseDate: new Date('2026-06-01T00:00:00.000Z'),
      postedDate: new Date('2026-06-01T00:00:00.000Z'),
    });

    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).resolves.toMatchObject({
      balance: -25_000,
    });
  });

  it('sets liability adjustment balances using the displayed liability amount', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Loan',
        type: 'loan',
        currencyCode: 'BRL',
      }),
    );

    await transactionsService.createTransaction(context.householdContext, {
      type: 'adjustment',
      description: 'Loan balance',
      balance: 120_000,
      accountId: account.id,
      purchaseDate: new Date('2026-06-01T00:00:00.000Z'),
      postedDate: new Date('2026-06-01T00:00:00.000Z'),
    });

    await expect(
      accountsService.getAccountDetails(context.householdContext, account.id),
    ).resolves.toMatchObject({
      balance: 120_000,
    });
  });

  it('creates cross-currency transfers with manual source and destination amounts', async () => {
    const context = await createAuthenticatedContext();

    const usdAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'USD Checking',
        type: 'depository',
        currencyCode: 'USD',
      }),
    );
    const brlAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'BRL Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'transfer',
      description: 'International transfer',
      fromAmount: 10_000,
      toAmount: 55_000,
      fromAccountId: usdAccount.id,
      toAccountId: brlAccount.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    expect(transaction.amount).toBe(10_000);
    expect(transaction.currencyCode).toBe('USD');
    expect(transaction.toAmount).toBe(55_000);
    expect(transaction.toCurrencyCode).toBe('BRL');

    const entries = await db
      .select({
        amount: entriesTable.amount,
        currencyCode: entriesTable.currencyId,
        ownerType: ledgerAccountsTable.ownerType,
        ownerId: ledgerAccountsTable.ownerId,
        systemKey: ledgerAccountsTable.systemKey,
      })
      .from(entriesTable)
      .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
      .where(eq(entriesTable.transactionId, transaction.id));

    expect(entries).toHaveLength(4);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: -10_000,
          currencyCode: 'USD',
          ownerType: 'account',
          ownerId: usdAccount.id,
        }),
        expect.objectContaining({
          amount: 10_000,
          currencyCode: 'USD',
          ownerType: 'system',
          systemKey: 'system:offshore-transfer:USD',
        }),
        expect.objectContaining({
          amount: 55_000,
          currencyCode: 'BRL',
          ownerType: 'account',
          ownerId: brlAccount.id,
        }),
        expect.objectContaining({
          amount: -55_000,
          currencyCode: 'BRL',
          ownerType: 'system',
          systemKey: 'system:offshore-transfer:BRL',
        }),
      ]),
    );
  });

  it('creates same-currency transfers with only account entries', async () => {
    const context = await createAuthenticatedContext();

    const fromAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    const toAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Savings', type: 'depository', currencyCode: 'BRL' }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'transfer',
      description: 'Move to savings',
      fromAmount: 10_000,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    const entries = await db
      .select({
        amount: entriesTable.amount,
        ownerType: ledgerAccountsTable.ownerType,
        ownerId: ledgerAccountsTable.ownerId,
      })
      .from(entriesTable)
      .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
      .where(eq(entriesTable.transactionId, transaction.id));

    expect(transaction).toMatchObject({
      amount: 10_000,
      currencyCode: 'BRL',
      toAmount: 10_000,
      toCurrencyCode: 'BRL',
    });
    expect(entries).toHaveLength(2);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: -10_000,
          ownerType: 'account',
          ownerId: fromAccount.id,
        }),
        expect.objectContaining({
          amount: 10_000,
          ownerType: 'account',
          ownerId: toAccount.id,
        }),
      ]),
    );
  });

  it('calculates the missing cross-currency transfer amount with FX', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(fxService, 'convertAmount').mockResolvedValue(55_000);

    const usdAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'USD Checking',
        type: 'depository',
        currencyCode: 'USD',
      }),
    );
    const brlAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'BRL Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const postedDate = new Date('2026-03-24T00:00:00.000Z');

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'transfer',
      description: 'International transfer',
      fromAmount: 10_000,
      fromAccountId: usdAccount.id,
      toAccountId: brlAccount.id,
      purchaseDate: postedDate,
      postedDate,
    });

    expect(fxService.convertAmount).toHaveBeenCalledWith({
      amount: 10_000,
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      date: postedDate,
    });
    expect(transaction.amount).toBe(10_000);
    expect(transaction.currencyCode).toBe('USD');
    expect(transaction.toAmount).toBe(55_000);
    expect(transaction.toCurrencyCode).toBe('BRL');
  });

  it('calculates the missing source transfer amount with reverse FX', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(fxService, 'convertAmount').mockResolvedValue(10_000);

    const usdAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'USD Checking',
        type: 'depository',
        currencyCode: 'USD',
      }),
    );
    const brlAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'BRL Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    const postedDate = new Date('2026-03-24T00:00:00.000Z');

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'transfer',
      description: 'International transfer',
      toAmount: 55_000,
      fromAccountId: usdAccount.id,
      toAccountId: brlAccount.id,
      purchaseDate: postedDate,
      postedDate,
    });

    expect(fxService.convertAmount).toHaveBeenCalledWith({
      amount: 55_000,
      fromCurrencyCode: 'BRL',
      toCurrencyCode: 'USD',
      date: postedDate,
    });
    expect(transaction.amount).toBe(10_000);
    expect(transaction.currencyCode).toBe('USD');
    expect(transaction.toAmount).toBe(55_000);
    expect(transaction.toCurrencyCode).toBe('BRL');
  });

  it('updates expense transaction metadata and tags', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );

    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Travel', type: 'expense' }),
    );
    const nextCategory = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Food', type: 'expense' }),
    );
    const merchant = await merchantsService.createMerchant(
      context.householdContext,
      buildMerchantInput({ name: 'Cafe Central' }),
    );

    await paymentMethodsService.createPaymentMethod(context.householdContext, {
      name: 'Meal Voucher',
      code: 'meal_voucher',
    });

    const initialTag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Initial', color: '#16A34A', icon: 'Tag01Icon' }),
    );
    const updatedTagOne = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Updated 1', color: '#2563EB', icon: 'Tag01Icon' }),
    );
    const updatedTagTwo = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: 'Updated 2', color: '#F97316', icon: 'Tag01Icon' }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Lunch',
      amount: 4_500,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      tagIds: [initialTag.id],
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    const updated = await transactionsService.updateTransaction(
      context.householdContext,
      transaction.id,
      {
        description: 'Updated lunch',
        purchaseDate: new Date('2026-04-01T00:00:00.000Z'),
        postedDate: new Date('2026-04-02T00:00:00.000Z'),
        includeInBudget: false,
        categoryId: nextCategory.id,
        merchantId: merchant.id,
        paymentMethodCode: 'meal_voucher',
        tagIds: [updatedTagOne.id, updatedTagTwo.id],
      },
    );

    expect(updated.description).toBe('Updated lunch');
    expect(updated.categoryId).toBe(nextCategory.id);
    expect(updated.merchantId).toBe(merchant.id);
    expect(updated.paymentMethodCode).toBe('meal_voucher');
    expect(updated.includeInBudget).toBe(false);
    expect(updated.purchaseDate).toBe('2026-04-01');
    expect(updated.postedDate).toBe('2026-04-02');
    expect(updated.tags).toHaveLength(2);
    expect(updated.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: updatedTagOne.id }),
        expect.objectContaining({ id: updatedTagTwo.id }),
      ]),
    );
  });

  it('rejects metadata updates not supported for transfer transactions', async () => {
    const context = await createAuthenticatedContext();

    const fromAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    const toAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Savings', type: 'depository', currencyCode: 'BRL' }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Travel', type: 'expense' }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'transfer',
      description: 'Move to savings',
      fromAmount: 10_000,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    await expect(
      transactionsService.updateTransaction(context.householdContext, transaction.id, {
        categoryId: category.id,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('deletes a transaction', async () => {
    const context = await createAuthenticatedContext();

    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Travel', type: 'expense' }),
    );

    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Taxi',
      amount: 2_500,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    await transactionsService.deleteTransaction(context.householdContext, transaction.id);

    await expect(
      transactionsService.deleteTransaction(context.householdContext, transaction.id),
    ).rejects.toThrow(NotFoundError);
  });
});
