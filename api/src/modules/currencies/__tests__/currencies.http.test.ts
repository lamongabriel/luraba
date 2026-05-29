import request from 'supertest';
import app from '@/app';
import { fxRateRepository } from '@/modules/fx/fx.repository';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';

describe('currencies routes', () => {
  it('GET /api/v1/currencies requires authentication', async () => {
    const response = await request(app).get('/api/v1/currencies');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/currencies lists seeded currencies', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/currencies')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BRL', symbol: 'R$', precision: 2 }),
        expect.objectContaining({ code: 'USD', symbol: '$', precision: 2 }),
      ]),
    );
  });

  it('GET /api/v1/currencies/rate returns a cached exact exchange-rate quote', async () => {
    const context = await createAuthenticatedContext();
    await fxRateRepository.upsertRates([
      {
        provider: 'frankfurter',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-03T00:00:00.000Z'),
        rateNumerator: 49835,
        rateDenominator: 10000,
      },
    ]);

    const response = await request(app)
      .get('/api/v1/currencies/rate')
      .query({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        amount: 10_000,
        date: '2026-05-03',
      })
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      fromCurrency: { code: 'USD', symbol: '$', precision: 2 },
      toCurrency: { code: 'BRL', symbol: 'R$', precision: 2 },
      provider: 'frankfurter',
      rateDate: '2026-05-03',
      rate: 4.98,
      amount: 10_000,
      convertedAmount: 49_835,
    });
  });

  it('GET /api/v1/currencies/rate respects provider override', async () => {
    const context = await createAuthenticatedContext();
    await fxRateRepository.upsertRates([
      {
        provider: 'yahoo-finance2',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-03T00:00:00.000Z'),
        rateNumerator: 5,
        rateDenominator: 1,
      },
    ]);

    const response = await request(app)
      .get('/api/v1/currencies/rate')
      .query({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        amount: 10_000,
        date: '2026-05-03',
        provider: 'yahoo-finance2',
      })
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.data.provider).toBe('yahoo-finance2');
    expect(response.body.data.rateDate).toBe('2026-05-03');
    expect(response.body.data.convertedAmount).toBe(50_000);
  });

  it('GET /api/v1/currencies/rate validates query fields', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/currencies/rate')
      .query({
        fromCurrencyCode: 'US',
        toCurrencyCode: 'BRL',
        provider: 'bad-provider',
      })
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/currencies/rate returns 404 for unknown currency codes', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/currencies/rate')
      .query({
        fromCurrencyCode: 'ZZZ',
        toCurrencyCode: 'BRL',
        date: '2026-05-03',
      })
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
