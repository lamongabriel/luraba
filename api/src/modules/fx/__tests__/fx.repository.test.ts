import { describe, expect, it } from 'vitest';
import { fxRateRepository } from '../fx.repository';

describe('fx rate repository', () => {
  it('stores and finds exchange rate dates as calendar dates', async () => {
    await fxRateRepository.upsertRates([
      {
        provider: 'frankfurter',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-01T00:00:00.000Z'),
        rateNumerator: 55018,
        rateDenominator: 10000,
      },
    ]);

    const exactRate = await fxRateRepository.findRateByDate(
      'frankfurter',
      'USD',
      'BRL',
      new Date('2026-05-01T00:00:00.000Z'),
    );
    const priorRate = await fxRateRepository.findRateOnOrBefore(
      'frankfurter',
      'USD',
      'BRL',
      new Date('2026-05-02T00:00:00.000Z'),
    );

    expect(exactRate?.rateDate).toBe('2026-05-01');
    expect(priorRate?.rateDate).toBe('2026-05-01');
  });
});
