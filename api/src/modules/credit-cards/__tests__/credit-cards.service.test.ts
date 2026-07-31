import { afterEach, describe, expect, it, vi } from 'vitest';
import * as accountsService from '@/modules/accounts/accounts.service';
import * as categoriesService from '@/modules/categories/categories.service';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import { ValidationError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createBalanceEntryForAccount,
} from '@/test/factories';
import {
  ListCreditCardCyclesRequestQuerySchema,
  ListCreditCardsRequestQuerySchema,
} from '../credit-cards.query';
import * as creditCardsService from '../credit-cards.service';

describe('credit cards service', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function buildCyclesQuery(scope: 'default' | 'all' = 'default') {
    return ListCreditCardCyclesRequestQuerySchema.parse({ scope });
  }

  it('creates a card with normalized institution branding from the account flow', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Nu Card',
        institutionName: 'Nubank',
        institutionDomain: 'https://www.nubank.com.br/cartao',
      }),
    );

    expect(card.institutionDomain).toBe('nubank.com.br');
    expect(card.institutionLogoUrl).toBe(
      'https://cdn.brandfetch.io/nubank.com.br/icon.png?c=brandfetch-client-id',
    );
  });

  it('creates a card with current and next billing cycles available by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Nubank',
        closingDay: 25,
        dueDay: 5,
      }),
    );

    const cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery(),
    );

    expect(cycles.data).toHaveLength(2);
    expect(cycles.data[0]).toEqual(
      expect.objectContaining({
        displayStatus: 'upcoming',
        isNext: true,
        hasActivity: false,
      }),
    );
    expect(cycles.data[1]).toEqual(
      expect.objectContaining({
        displayStatus: 'current',
        isCurrent: true,
      }),
    );
  });

  it('assigns purchases to billing cycles using postedDate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Electronics', type: 'expense' }),
    );
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Mastercard',
        closingDay: 25,
        dueDay: 5,
      }),
    );

    const purchase = await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Laptop',
      amount: 120_000,
      categoryId: category.id,
      purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
      postedDate: new Date('2026-04-29T00:00:00.000Z'),
      installmentCount: 3,
    });

    expect(purchase.installments[0]).toEqual(
      expect.objectContaining({
        installmentNumber: 1,
        closingDate: '2026-05-25',
        dueDate: '2026-06-05',
      }),
    );

    const cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery('all'),
    );

    expect(cycles.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          closingDate: '2026-05-25',
          hasActivity: true,
        }),
      ]),
    );
  });

  it('updates cycle display status from due to paid after a payment', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Food', type: 'expense' }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({
        name: 'Checking',
        type: 'depository',
        currencyCode: 'BRL',
      }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: sourceAccount.id,
      amount: 50_000,
    });

    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Visa Gold',
        closingDay: 25,
        dueDay: 5,
      }),
    );

    await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Groceries',
      amount: 15_000,
      categoryId: category.id,
      purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
      postedDate: new Date('2026-04-20T00:00:00.000Z'),
      installmentCount: 1,
    });

    let cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery('all'),
    );
    const dueCycle = cycles.data.find((cycle) => cycle.closingDate === '2026-04-25');

    expect(dueCycle).toEqual(
      expect.objectContaining({
        displayStatus: 'due',
        remainingAmount: 15_000,
      }),
    );

    await creditCardsService.createPayment(context.householdContext, card.id, {
      amount: 15_000,
      fromAccountId: sourceAccount.id,
      paymentDate: new Date('2026-04-30T00:00:00.000Z'),
    });

    cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery('all'),
    );
    const paidCycle = cycles.data.find((cycle) => cycle.closingDate === '2026-04-25');

    expect(paidCycle).toEqual(
      expect.objectContaining({
        displayStatus: 'paid',
        remainingAmount: 0,
        paidAmount: 15_000,
      }),
    );
  });

  it('gets and updates a credit card purchase through the credit card module', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Electronics', type: 'expense' }),
    );
    const updatedCategory = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Home Office', type: 'expense' }),
    );
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Amex',
        closingDay: 25,
        dueDay: 5,
      }),
    );

    const createdPurchase = await creditCardsService.createPurchase(
      context.householdContext,
      card.id,
      {
        description: 'Monitor',
        amount: 80_000,
        categoryId: category.id,
        purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
        postedDate: new Date('2026-04-20T00:00:00.000Z'),
        installmentCount: 1,
      },
    );

    const loadedPurchase = await creditCardsService.getPurchase(
      context.householdContext,
      card.id,
      createdPurchase.purchaseId,
    );

    expect(loadedPurchase).toEqual(
      expect.objectContaining({
        description: 'Monitor',
        categoryId: category.id,
        postedDate: '2026-04-20',
        installmentCount: 1,
      }),
    );

    const updatedPurchase = await creditCardsService.updatePurchase(
      context.householdContext,
      card.id,
      createdPurchase.purchaseId,
      {
        description: 'Ultrawide Monitor',
        amount: 90_000,
        categoryId: updatedCategory.id,
        postedDate: new Date('2026-04-29T00:00:00.000Z'),
        installmentCount: 2,
      },
    );

    expect(updatedPurchase).toEqual(
      expect.objectContaining({
        description: 'Ultrawide Monitor',
        amount: 90_000,
        categoryId: updatedCategory.id,
        postedDate: '2026-04-29',
        installmentCount: 2,
      }),
    );
    expect(updatedPurchase.installments[0]).toEqual(
      expect.objectContaining({
        installmentNumber: 1,
        closingDate: '2026-05-25',
      }),
    );
  });

  it('marks a zeroed closing-day cycle as paid after deleting the only purchase', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Subscriptions', type: 'expense' }),
    );
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Delete Card',
        closingDay: 25,
        dueDay: 5,
      }),
    );

    const createdPurchase = await creditCardsService.createPurchase(
      context.householdContext,
      card.id,
      {
        description: 'Streaming',
        amount: 3_000,
        categoryId: category.id,
        purchaseDate: new Date('2026-04-24T00:00:00.000Z'),
        postedDate: new Date('2026-04-24T00:00:00.000Z'),
        installmentCount: 1,
      },
    );

    await creditCardsService.deletePurchase(
      context.householdContext,
      card.id,
      createdPurchase.purchaseId,
    );

    const cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery('all'),
    );
    const closingDayCycle = cycles.data.find((cycle) => cycle.closingDate === '2026-04-25');

    expect(closingDayCycle).toEqual(
      expect.objectContaining({
        status: 'paid',
        displayStatus: 'paid',
        remainingAmount: 0,
        statementAmount: 0,
      }),
    );
  });

  it('gets, updates, and deletes a credit card payment through the credit card module', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Bills', type: 'expense' }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking A', type: 'depository', currencyCode: 'BRL' }),
    );
    const secondSourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking B', type: 'depository', currencyCode: 'BRL' }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: sourceAccount.id,
      amount: 100_000,
    });
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: secondSourceAccount.id,
      amount: 100_000,
    });

    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({ name: 'Payment Card', closingDay: 25, dueDay: 5 }),
    );

    await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Phone',
      amount: 10_000,
      categoryId: category.id,
      purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
      postedDate: new Date('2026-04-20T00:00:00.000Z'),
      installmentCount: 1,
    });

    const createdPayment = await creditCardsService.createPayment(
      context.householdContext,
      card.id,
      {
        amount: 10_000,
        fromAccountId: sourceAccount.id,
        paymentDate: new Date('2026-04-30T00:00:00.000Z'),
        description: 'Card payment',
      },
    );

    const loadedPayment = await creditCardsService.getPayment(
      context.householdContext,
      card.id,
      createdPayment.paymentId,
    );

    expect(loadedPayment).toEqual(
      expect.objectContaining({
        description: 'Card payment',
        amount: 10_000,
        fromAccountId: sourceAccount.id,
        paymentDate: '2026-04-30',
        postedDate: '2026-04-30',
      }),
    );

    const updatedPayment = await creditCardsService.updatePayment(
      context.householdContext,
      card.id,
      createdPayment.paymentId,
      {
        amount: 8_000,
        fromAccountId: secondSourceAccount.id,
        description: 'Updated payment',
      },
    );

    expect(updatedPayment).toEqual(
      expect.objectContaining({
        description: 'Updated payment',
        amount: 8_000,
        fromAccountId: secondSourceAccount.id,
      }),
    );

    let cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery('all'),
    );
    let dueCycle = cycles.data.find((cycle) => cycle.closingDate === '2026-04-25');
    expect(dueCycle).toEqual(expect.objectContaining({ remainingAmount: 2_000 }));

    await creditCardsService.deletePayment(
      context.householdContext,
      card.id,
      createdPayment.paymentId,
    );

    cycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      buildCyclesQuery('all'),
    );
    dueCycle = cycles.data.find((cycle) => cycle.closingDate === '2026-04-25');
    expect(dueCycle).toEqual(expect.objectContaining({ remainingAmount: 10_000 }));
  });

  it('rejects payments greater than the current used credit amount', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Bills', type: 'expense' }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: sourceAccount.id,
      amount: 100_000,
    });

    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({ name: 'Payment Limit Card', closingDay: 25, dueDay: 5 }),
    );

    await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Phone',
      amount: 10_000,
      categoryId: category.id,
      purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
      postedDate: new Date('2026-04-20T00:00:00.000Z'),
      installmentCount: 1,
    });

    await expect(
      creditCardsService.createPayment(context.householdContext, card.id, {
        amount: 15_000,
        fromAccountId: sourceAccount.id,
        paymentDate: new Date('2026-04-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('blocks purchases that exceed the remaining credit limit', async () => {
    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Electronics', type: 'expense' }),
    );
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Limit Card',
        closingDay: 25,
        dueDay: 5,
        creditLimitAmount: 50_000,
      }),
    );

    const loadedCard = await creditCardsService.getCreditCard(context.householdContext, card.id);
    expect(loadedCard).toEqual(
      expect.objectContaining({
        creditLimitAmount: 50_000,
        remainingCreditAmount: 50_000,
      }),
    );

    await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Laptop',
      amount: 40_000,
      categoryId: category.id,
      purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
      postedDate: new Date('2026-04-20T00:00:00.000Z'),
      installmentCount: 4,
    });

    await expect(
      creditCardsService.createPurchase(context.householdContext, card.id, {
        description: 'Headphones',
        amount: 15_000,
        categoryId: category.id,
        purchaseDate: new Date('2026-04-21T00:00:00.000Z'),
        postedDate: new Date('2026-04-21T00:00:00.000Z'),
        installmentCount: 1,
      }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('credit card DB list filters', () => {
  it('filters card rows and computed cycle amounts before pagination', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Card Query Category', type: 'expense' }),
    );
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Card Query Target',
        institutionName: 'Query Bank',
        brand: 'Visa',
        closingDay: 25,
        dueDay: 5,
        creditLimitAmount: 50_000,
      }),
    );
    await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Card Query Purchase',
      amount: 10_000,
      categoryId: category.id,
      purchaseDate: new Date('2026-04-20T00:00:00.000Z'),
      postedDate: new Date('2026-04-20T00:00:00.000Z'),
      installmentCount: 1,
    });

    const cards = await creditCardsService.listCreditCards(
      context.householdContext,
      ListCreditCardsRequestQuerySchema.parse({
        search: 'Query Target',
        brands: 'Visa,Mastercard',
        currencyCodes: 'BRL',
        accountIds: card.accountId,
        closingDays: '25',
        dueDays: '5',
        balanceMin: 10_000,
        balanceMax: 10_000,
        creditLimitMin: 50_000,
        creditLimitMax: 50_000,
        hasCreditLimit: true,
        createdAtFrom: '2020-01-01',
        createdAtTo: '2030-01-01',
        updatedAtFrom: '2020-01-01',
        updatedAtTo: '2030-01-01',
        sort: 'balance',
        perPage: 1,
      }),
    );
    expect(cards.data).toEqual([expect.objectContaining({ id: card.id, balance: 10_000 })]);

    const allCycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      ListCreditCardCyclesRequestQuerySchema.parse({ scope: 'all' }),
    );
    const activeCycle = allCycles.data.find((cycle) => cycle.statementAmount === 10_000);
    expect(activeCycle).toBeDefined();

    const filteredCycles = await creditCardsService.listBillingCycles(
      context.householdContext,
      card.id,
      ListCreditCardCyclesRequestQuerySchema.parse({
        scope: 'all',
        search: activeCycle?.status,
        statuses: activeCycle?.status,
        displayStatuses: activeCycle?.displayStatus,
        closingDateFrom: activeCycle?.closingDate,
        closingDateTo: activeCycle?.closingDate,
        dueDateFrom: activeCycle?.dueDate,
        dueDateTo: activeCycle?.dueDate,
        statementAmountMin: 10_000,
        statementAmountMax: 10_000,
        paidAmountMin: 0,
        paidAmountMax: 0,
        remainingAmountMin: 10_000,
        remainingAmountMax: 10_000,
        sort: 'closingDate',
        perPage: 1,
      }),
    );

    expect(filteredCycles.data).toEqual([
      expect.objectContaining({ id: activeCycle?.id, statementAmount: 10_000 }),
    ]);
    expect(filteredCycles.meta.pagination.totalCount).toBe(1);
  });
});
