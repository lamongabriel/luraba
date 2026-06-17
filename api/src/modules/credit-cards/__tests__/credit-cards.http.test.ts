import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '@/app';
import * as accountsService from '@/modules/accounts/accounts.service';
import * as categoriesService from '@/modules/categories/categories.service';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createBalanceEntryForAccount,
} from '@/test/factories';

describe('credit cards routes', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('POST /api/v1/credit-cards reuses account institution branding logic', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    const response = await request(app)
      .post('/api/v1/credit-cards')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          name: 'HTTP Nu Card',
          institutionName: 'Nubank',
          institutionDomain: 'https://www.nubank.com.br/cartao',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        institutionDomain: 'nubank.com.br',
        institutionLogoUrl:
          'https://cdn.brandfetch.io/nubank.com.br/icon.png?c=brandfetch-client-id',
      }),
    );
  });

  it('GET /api/v1/credit-cards/:id/cycles returns enriched cycle fields', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Shopping', type: 'expense' }),
    );

    const createdCard = await request(app)
      .post('/api/v1/credit-cards')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          name: 'HTTP Card',
          closingDay: 25,
          dueDay: 5,
        }),
      );

    await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Shoes',
        amount: 20_000,
        categoryId: category.id,
        purchaseDate: '2026-04-20',
        postedDate: '2026-04-20',
        installmentCount: 1,
      });

    const response = await request(app)
      .get(`/api/v1/credit-cards/${createdCard.body.data.id}/cycles`)
      .query({ scope: 'all' })
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayStatus: 'due',
          isCurrent: false,
          isNext: false,
          hasActivity: true,
          statementAmount: 20_000,
          remainingAmount: 20_000,
        }),
      ]),
    );
  });

  it('GET/PATCH/DELETE purchase routes work through the credit card module', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Tech', type: 'expense' }),
    );
    const updatedCategory = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Office', type: 'expense' }),
    );

    const createdCard = await request(app)
      .post('/api/v1/credit-cards')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          name: 'HTTP Purchase Card',
          closingDay: 25,
          dueDay: 5,
        }),
      );

    const createdPurchase = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Desk',
        amount: 50_000,
        categoryId: category.id,
        purchaseDate: '2026-04-20',
        postedDate: '2026-04-20',
        installmentCount: 1,
      });

    const getResponse = await request(app)
      .get(
        `/api/v1/credit-cards/${createdCard.body.data.id}/purchases/${createdPurchase.body.data.purchaseId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data).toEqual(
      expect.objectContaining({
        description: 'Desk',
        categoryId: category.id,
      }),
    );

    const patchResponse = await request(app)
      .patch(
        `/api/v1/credit-cards/${createdCard.body.data.id}/purchases/${createdPurchase.body.data.purchaseId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Standing Desk',
        categoryId: updatedCategory.id,
        amount: 55_000,
        installmentCount: 2,
        postedDate: '2026-04-29',
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data).toEqual(
      expect.objectContaining({
        description: 'Standing Desk',
        categoryId: updatedCategory.id,
        amount: 55_000,
        installmentCount: 2,
      }),
    );

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/credit-cards/${createdCard.body.data.id}/purchases/${createdPurchase.body.data.purchaseId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(deleteResponse.status).toBe(204);
  });

  it('GET/PATCH/DELETE payment routes work through the credit card module', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Utilities', type: 'expense' }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'HTTP Checking A', type: 'depository', currencyCode: 'BRL' }),
    );
    const secondSourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'HTTP Checking B', type: 'depository', currencyCode: 'BRL' }),
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

    const createdCard = await request(app)
      .post('/api/v1/credit-cards')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildCreditCardInput({ name: 'HTTP Payment Card', closingDay: 25, dueDay: 5 }));

    await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Water bill',
        amount: 10_000,
        categoryId: category.id,
        purchaseDate: '2026-04-20',
        postedDate: '2026-04-20',
        installmentCount: 1,
      });

    const createdPayment = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/payments`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'HTTP payment',
        amount: 10_000,
        fromAccountId: sourceAccount.id,
        paymentDate: '2026-04-30',
      });

    expect(createdPayment.status).toBe(201);

    const getResponse = await request(app)
      .get(
        `/api/v1/credit-cards/${createdCard.body.data.id}/payments/${createdPayment.body.data.paymentId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data).toEqual(
      expect.objectContaining({
        description: 'HTTP payment',
        amount: 10_000,
        fromAccountId: sourceAccount.id,
      }),
    );

    const patchResponse = await request(app)
      .patch(
        `/api/v1/credit-cards/${createdCard.body.data.id}/payments/${createdPayment.body.data.paymentId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Updated HTTP payment',
        amount: 8_000,
        fromAccountId: secondSourceAccount.id,
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data).toEqual(
      expect.objectContaining({
        description: 'Updated HTTP payment',
        amount: 8_000,
        fromAccountId: secondSourceAccount.id,
      }),
    );

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/credit-cards/${createdCard.body.data.id}/payments/${createdPayment.body.data.paymentId}`,
      )
      .set(createAuthHeaders(context.token, context.household.id));

    expect(deleteResponse.status).toBe(204);
  });

  it('POST /api/v1/credit-cards/:id/payments rejects overpayments', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Utilities', type: 'expense' }),
    );
    const sourceAccount = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'HTTP Checking', type: 'depository', currencyCode: 'BRL' }),
    );
    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: sourceAccount.id,
      amount: 100_000,
    });

    const createdCard = await request(app)
      .post('/api/v1/credit-cards')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildCreditCardInput({ name: 'HTTP Payment Limit Card', closingDay: 25, dueDay: 5 }));

    await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Water bill',
        amount: 10_000,
        categoryId: category.id,
        purchaseDate: '2026-04-20',
        postedDate: '2026-04-20',
        installmentCount: 1,
      });

    const response = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/payments`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'HTTP overpayment',
        amount: 15_000,
        fromAccountId: sourceAccount.id,
        paymentDate: '2026-04-30',
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/credit-cards/:id/purchases enforces the remaining credit limit', async () => {
    const context = await createAuthenticatedContext();
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Tech', type: 'expense' }),
    );

    const createdCard = await request(app)
      .post('/api/v1/credit-cards')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCreditCardInput({
          name: 'HTTP Limit Card',
          closingDay: 25,
          dueDay: 5,
          creditLimitAmount: 50_000,
        }),
      );

    expect(createdCard.body.data).toEqual(
      expect.objectContaining({
        creditLimitAmount: 50_000,
        remainingCreditAmount: 50_000,
      }),
    );

    const firstPurchase = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Laptop',
        amount: 40_000,
        categoryId: category.id,
        purchaseDate: '2026-04-20',
        postedDate: '2026-04-20',
        installmentCount: 4,
      });

    expect(firstPurchase.status).toBe(201);

    const secondPurchase = await request(app)
      .post(`/api/v1/credit-cards/${createdCard.body.data.id}/purchases`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        description: 'Headphones',
        amount: 15_000,
        categoryId: category.id,
        purchaseDate: '2026-04-21',
        postedDate: '2026-04-21',
        installmentCount: 1,
      });

    expect(secondPurchase.status).toBe(422);
    expect(secondPurchase.body.success).toBe(false);
    expect(secondPurchase.body.error.code).toBe('VALIDATION_ERROR');
  });
});
