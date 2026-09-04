import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '@/app';
import * as accountsService from '@/modules/accounts/accounts.service';
import * as categoriesService from '@/modules/categories/categories.service';
import * as creditCardsService from '@/modules/credit-cards/credit-cards.service';
import * as transactionsService from '@/modules/transactions/transactions.service';
import { getTodayInTimezone } from '@/shared/lib/date';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createCreditCardOwner,
} from '@/test/factories';

describe('transaction analytics routes', () => {
  it('requires authentication for analytics and upcoming feeds', async () => {
    const [analytics, upcoming] = await Promise.all([
      request(app).get('/api/v1/transactions/analytics'),
      request(app).get('/api/v1/transactions/upcoming'),
    ]);

    expect(analytics.status).toBe(401);
    expect(upcoming.status).toBe(401);
  });

  it('aggregates the complete filtered result and clamps future dates', async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: 'Analytics Checking', type: 'cash', currencyCode: 'BRL' }),
    );
    const category = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: 'Analytics Food', type: 'expense' }),
    );

    await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Analytics Coffee',
      amount: 12_500,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-08-05T00:00:00.000Z'),
      postedDate: new Date('2026-08-05T00:00:00.000Z'),
    });
    await transactionsService.createTransaction(context.householdContext, {
      type: 'expense',
      description: 'Other expense',
      amount: 99_000,
      currencyCode: 'BRL',
      paymentMethodCode: 'pix',
      accountId: account.id,
      categoryId: category.id,
      purchaseDate: new Date('2026-08-05T00:00:00.000Z'),
      postedDate: new Date('2026-08-05T00:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/v1/transactions/analytics')
      .set(createAuthHeaders(context.token, context.household.id))
      .query({
        search: 'Coffee',
        originTypes: 'expense',
        accountIds: account.id,
        categoryIds: category.id,
        dateFrom: '2026-08-01',
        dateTo: '2099-12-31',
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      currencyCode: 'BRL',
      dateFrom: '2026-08-01',
      dateTo: getTodayInTimezone(context.householdContext.timezone).toISOString().slice(0, 10),
      metrics: {
        moneyIn: { value: 0 },
        moneyOut: { value: 12_500 },
        net: { value: -12_500 },
      },
      expenseBreakdown: {
        items: [
          expect.objectContaining({
            id: category.id,
            name: 'Analytics Food',
            amount: 12_500,
            percentage: 100,
          }),
        ],
      },
    });
  });

  it('returns future installments as normalized upcoming rows', async () => {
    const context = await createAuthenticatedContext();
    const ownerAccount = await createCreditCardOwner(context.householdContext);
    const card = await creditCardsService.createCreditCard(
      context.householdContext,
      buildCreditCardInput({
        name: 'Analytics Card',
        closingDay: 20,
        dueDay: 5,
        ownerAccountId: ownerAccount.id,
      }),
    );
    const purchase = await creditCardsService.createPurchase(context.householdContext, card.id, {
      description: 'Upcoming Laptop',
      amount: 100_000,
      purchaseDate: new Date('2026-08-10T00:00:00.000Z'),
      postedDate: new Date('2026-08-10T00:00:00.000Z'),
      installmentCount: 2,
    });

    const response = await request(app)
      .get('/api/v1/transactions/upcoming')
      .set(createAuthHeaders(context.token, context.household.id))
      .query({ search: 'Upcoming Laptop', perPage: 10 });

    expect(response.status).toBe(200);
    const upcomingInstallment = response.body.data.find(
      (row: { sourceType: string }) => row.sourceType === 'credit_card_installment',
    );
    expect(purchase.installments.map(({ installmentId }) => installmentId)).toContain(
      upcomingInstallment?.sourceId,
    );
    expect(upcomingInstallment).toEqual(
      expect.objectContaining({
        sourceType: 'credit_card_installment',
        parentId: purchase.purchaseId,
        creditCardId: card.id,
        description: 'Upcoming Laptop',
      }),
    );
    expect(response.body.meta.pagination).toMatchObject({
      page: 1,
      perPage: 10,
    });
  });
});
