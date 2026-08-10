import request from 'supertest';
import { vi } from 'vitest';
import app from '@/app';
import * as accountsService from '@/modules/accounts/accounts.service';
import type {
  CreateAccountRequestBody,
  UpdateAccountRequestBody,
} from '@/modules/accounts/accounts.types';
import * as categoriesService from '@/modules/categories/categories.service';
import * as creditCardsService from '@/modules/credit-cards/credit-cards.service';
import * as transactionsService from '@/modules/transactions/transactions.service';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createBalanceEntryForAccount,
  createHousehold,
  createHouseholdMembership,
} from '@/test/factories';

type TypedAccountHttpCase = {
  type: CreateAccountRequestBody['type'];
  createDetails: CreateAccountRequestBody['details'];
  updateDetails: NonNullable<UpdateAccountRequestBody['details']>;
};

const typedAccountHttpCases = [
  {
    type: 'cash',
    createDetails: { kind: 'cash', subtype: 'checking' },
    updateDetails: { kind: 'cash', subtype: 'savings' },
  },
  {
    type: 'investment',
    createDetails: { kind: 'investment', subtype: 'brokerage' },
    updateDetails: { kind: 'investment', subtype: 'retirement' },
  },
  {
    type: 'crypto',
    createDetails: {
      kind: 'crypto',
      subtype: 'wallet',
      walletAddress: '0xabc',
      network: 'Ethereum',
    },
    updateDetails: {
      kind: 'crypto',
      subtype: 'exchange',
      walletAddress: 'binance-user',
      network: 'Solana',
    },
  },
  {
    type: 'property',
    createDetails: {
      kind: 'property',
      subtype: 'house',
      addressLine1: '123 Main St',
      city: 'Sao Paulo',
      countryCode: 'BR',
      area: 120,
      areaUnit: 'sqm',
      yearBuilt: 2018,
    },
    updateDetails: {
      kind: 'property',
      subtype: 'apartment',
      addressLine1: '456 Market Ave',
      city: 'Rio de Janeiro',
      countryCode: 'BR',
      area: 88,
      areaUnit: 'sqm',
      yearBuilt: 2020,
    },
  },
  {
    type: 'vehicle',
    createDetails: {
      kind: 'vehicle',
      subtype: 'car',
      make: 'Toyota',
      model: 'Corolla',
      year: 2024,
      mileage: 12_000,
      mileageUnit: 'km',
    },
    updateDetails: {
      kind: 'vehicle',
      subtype: 'motorcycle',
      make: 'Honda',
      model: 'CB 500',
      year: 2025,
      mileage: 2_500,
      mileageUnit: 'km',
    },
  },
  {
    type: 'loan',
    createDetails: {
      kind: 'loan',
      subtype: 'personal',
      originalPrincipal: 100_000,
      annualInterestRate: 9.25,
      interestRateType: 'fixed',
      termMonths: 24,
      startDate: '2026-01-01',
      maturityDate: '2027-12-31',
      paymentAmount: 4_700,
      paymentFrequency: 'monthly',
    },
    updateDetails: {
      kind: 'loan',
      subtype: 'auto',
      originalPrincipal: 250_000,
      annualInterestRate: 7.5,
      interestRateType: 'variable',
      termMonths: 48,
      startDate: '2026-02-01',
      maturityDate: '2030-01-31',
      paymentAmount: 6_000,
      paymentFrequency: 'monthly',
    },
  },
  {
    type: 'other_asset',
    createDetails: { kind: 'other_asset', subtype: 'collectible' },
    updateDetails: { kind: 'other_asset', subtype: 'precious_metal' },
  },
  {
    type: 'other_liability',
    createDetails: { kind: 'other_liability', subtype: 'medical' },
    updateDetails: { kind: 'other_liability', subtype: 'tax' },
  },
] satisfies TypedAccountHttpCase[];

describe('accounts routes', () => {
  it('POST /api/v1/accounts returns 201 for a valid authenticated request', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildAccountInput({
          name: 'HTTP Checking',
          type: 'cash',
          currencyCode: 'BRL',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('HTTP Checking');
    expect(response.body.data.classification).toBe('asset');
    expect(response.body.data.details).toEqual(
      expect.objectContaining({ kind: 'cash', subtype: 'other' }),
    );
  });

  it('POST /api/v1/accounts derives the institution logo from Brandfetch when configured', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await request(app)
      .put('/api/v1/integrations/brandfetch')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ clientId: 'brandfetch-client-id' });

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildAccountInput({
          name: 'HTTP Nubank',
          institutionName: 'Nubank',
          institutionDomain: 'https://www.nubank.com.br/conta',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data.institutionDomain).toBe('nubank.com.br');
    expect(response.body.data.institutionLogoUrl).toBe(
      'https://cdn.brandfetch.io/nubank.com.br/icon.png?c=brandfetch-client-id',
    );
  });

  it('POST /api/v1/accounts requires authentication', async () => {
    const response = await request(app).post('/api/v1/accounts').send(buildAccountInput());

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/accounts validates the request body', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: '',
        type: 'cash',
        currencyCode: 'BRL',
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/accounts rejects details for a different account type', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: 'Mismatched profile',
        type: 'property',
        currencyCode: 'BRL',
        details: { kind: 'vehicle', subtype: 'car' },
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each(typedAccountHttpCases)(
    'creates, updates, and deletes a $type account through HTTP',
    async (variant) => {
      const context = await createAuthenticatedContext();
      const name = `HTTP ${variant.type} account`;

      const created = await request(app)
        .post('/api/v1/accounts')
        .set(createAuthHeaders(context.token, context.household.id))
        .send({
          name,
          type: variant.type,
          currencyCode: 'BRL',
          details: variant.createDetails,
        });

      expect(created.status).toBe(201);
      expect(created.body.success).toBe(true);
      expect(created.body.data).toEqual(
        expect.objectContaining({
          name,
          type: variant.type,
          details: expect.objectContaining(variant.createDetails),
        }),
      );

      const updated = await request(app)
        .patch(`/api/v1/accounts/${created.body.data.id}`)
        .set(createAuthHeaders(context.token, context.household.id))
        .send({
          name: `${name} updated`,
          details: variant.updateDetails,
        });

      expect(updated.status).toBe(200);
      expect(updated.body.success).toBe(true);
      expect(updated.body.data).toEqual(
        expect.objectContaining({
          id: created.body.data.id,
          name: `${name} updated`,
          type: variant.type,
          details: expect.objectContaining(variant.updateDetails),
        }),
      );

      const deleted = await request(app)
        .delete(`/api/v1/accounts/${created.body.data.id}`)
        .set(createAuthHeaders(context.token, context.household.id));

      expect(deleted.status).toBe(204);

      const afterDelete = await request(app)
        .get(`/api/v1/accounts/${created.body.data.id}`)
        .set(createAuthHeaders(context.token, context.household.id));

      expect(afterDelete.status).toBe(404);
    },
  );

  it('PATCH /api/v1/accounts/:id rejects immutable type and currency fields', async () => {
    const context = await createAuthenticatedContext();
    const created = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Immutable account' }),
    );

    const response = await request(app)
      .patch(`/api/v1/accounts/${created.id}`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ type: 'loan', currencyCode: 'USD' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/accounts respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildAccountInput({ name: 'Viewer Attempt' }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/accounts returns only accounts from the active household', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Second Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'owner');

    const primaryAccountResponse = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildAccountInput({ name: 'Primary Household Account' }));

    const secondaryAccountResponse = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, secondHousehold.id))
      .send(buildAccountInput({ name: 'Secondary Household Account' }));

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: primaryAccountResponse.body.data.id,
      amount: 5_500,
    });

    await createBalanceEntryForAccount({
      householdId: secondHousehold.id,
      accountId: secondaryAccountResponse.body.data.id,
      amount: 8_800,
    });

    const primaryResponse = await request(app)
      .get('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .query({
        page: 1,
        perPage: 1,
        search: 'Primary Household',
        sort: 'name',
        sortDirection: 'desc',
        types: 'cash',
      });

    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.data).toHaveLength(1);
    expect(primaryResponse.body.data[0].name).toBe('Primary Household Account');
    expect(primaryResponse.body.data[0].balance).toBe(5_500);
    expect(primaryResponse.body.meta.pagination).toEqual({
      page: 1,
      perPage: 1,
      totalCount: 1,
      totalPages: 1,
    });

    const secondaryResponse = await request(app)
      .get('/api/v1/accounts')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(secondaryResponse.status).toBe(200);
    expect(secondaryResponse.body.data).toHaveLength(1);
    expect(secondaryResponse.body.data[0].name).toBe('Secondary Household Account');
    expect(secondaryResponse.body.data[0].balance).toBe(8_800);
  });

  it('GET /api/v1/accounts/:id returns 404 for missing accounts', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/accounts/1456d4ee-2f8d-4cec-92be-a780d54312c2')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/accounts/:id does not leak cross-household access', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const created = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send(buildAccountInput({ name: 'Protected Account' }));

    const response = await request(app)
      .get(`/api/v1/accounts/${created.body.data.id}`)
      .set(createAuthHeaders(outsider.token, outsider.household.id));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/accounts/:id/transactions requires authentication', async () => {
    const response = await request(app).get(
      '/api/v1/accounts/1456d4ee-2f8d-4cec-92be-a780d54312c2/transactions',
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/accounts/:id/transactions lists only transactions for the requested account', async () => {
    const context = await createAuthenticatedContext();
    const checking = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Checking', type: 'cash', currencyCode: 'BRL' }),
    );
    const savings = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Savings', type: 'cash', currencyCode: 'BRL' }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Groceries', type: 'expense' }),
    );

    await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Market',
      amount: 8_000,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: checking.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
      postedDate: new Date('2026-03-24T00:00:00.000Z'),
    });
    await transactionsService.createTransaction(context.householdContext, {
      type: 'transfer',
      description: 'Savings transfer',
      fromAmount: 10_000,
      fromAccountId: checking.id,
      toAccountId: savings.id,
      purchaseDate: new Date('2026-03-25T00:00:00.000Z'),
      postedDate: new Date('2026-03-25T00:00:00.000Z'),
    });

    const response = await request(app)
      .get(`/api/v1/accounts/${checking.id}/transactions`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        type: 'transfer',
        accountId: checking.id,
        toAccountId: savings.id,
      }),
      expect.objectContaining({
        type: 'expense',
        description: 'Market',
        accountId: checking.id,
      }),
    ]);

    const filtered = await request(app)
      .get(`/api/v1/accounts/${checking.id}/transactions`)
      .set(createAuthHeaders(context.token, context.household.id))
      .query({
        search: 'Market',
        dateFrom: '2026-03-24',
        dateTo: '2026-03-24',
        purchaseDateFrom: '2026-03-24',
        purchaseDateTo: '2026-03-24',
        originTypes: 'expense,transfer',
        categoryIds: category.id,
        paymentMethodCodes: 'pix',
        currencyCodes: 'BRL',
        amountMin: 8_000,
        amountMax: 8_000,
        includeInBudget: true,
        excludedFromSpending: false,
        sort: 'amount',
        perPage: 1,
      });

    expect(filtered.status).toBe(200);
    expect(filtered.body.data).toEqual([
      expect.objectContaining({ description: 'Market', accountId: checking.id }),
    ]);
    expect(filtered.body.meta.pagination.totalCount).toBe(1);
  });

  it('GET /api/v1/accounts/:id/transactions rejects credit card accounts', async () => {
    const context = await createAuthenticatedContext();
    const creditCard = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({ name: 'HTTP Nubank', closingDay: 25, dueDay: 5 }),
    );

    const response = await request(app)
      .get(`/api/v1/accounts/${creditCard.accountId}/transactions`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/v1/accounts/:id updates account details', async () => {
    const context = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildAccountInput({ name: 'Patch Account', institutionDomain: 'patch.example.com' }));

    const response = await request(app)
      .patch(`/api/v1/accounts/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: 'Patched Account',
        institutionDomain: null,
        notes: 'Updated from HTTP',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: created.body.data.id,
        name: 'Patched Account',
        institutionDomain: null,
        institutionLogoUrl: null,
        notes: 'Updated from HTTP',
      }),
    );
  });

  it('DELETE /api/v1/accounts/:id deletes an account and its history', async () => {
    const context = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildAccountInput({ name: 'Delete HTTP Account' }));

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: created.body.data.id,
      amount: 1_500,
    });

    const response = await request(app)
      .delete(`/api/v1/accounts/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const details = await request(app)
      .get(`/api/v1/accounts/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(details.status).toBe(404);
  });

  it('isolates list, transaction-list, update, and delete access across households', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send(buildAccountInput({ name: 'Isolated Account' }));
    const accountId = created.body.data.id;

    const inaccessibleList = await request(app)
      .get('/api/v1/accounts')
      .set(createAuthHeaders(outsider.token, owner.household.id));
    const inaccessibleTransactions = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions`)
      .set(createAuthHeaders(outsider.token, outsider.household.id));
    const inaccessibleUpdate = await request(app)
      .patch(`/api/v1/accounts/${accountId}`)
      .set(createAuthHeaders(outsider.token, outsider.household.id))
      .send({ name: 'Leaked' });
    const inaccessibleDelete = await request(app)
      .delete(`/api/v1/accounts/${accountId}`)
      .set(createAuthHeaders(outsider.token, outsider.household.id));

    expect(inaccessibleList.status).toBe(403);
    expect(inaccessibleTransactions.status).toBe(404);
    expect(inaccessibleUpdate.status).toBe(404);
    expect(inaccessibleDelete.status).toBe(404);
  });
});
