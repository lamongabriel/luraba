import { netWorthQuerySchema } from '@luraba/contracts/networth';
import { describe, expect, it } from 'vitest';

describe('net worth query', () => {
  it('applies bounded defaults and accepts display controls', () => {
    expect(
      netWorthQuerySchema.parse({ displayCurrencyCode: 'usd', granularity: 'month' }),
    ).toMatchObject({ displayCurrencyCode: 'USD', granularity: 'month', limit: 10 });
  });

  it('rejects reversed ranges and unsafe limits', () => {
    expect(
      netWorthQuerySchema.safeParse({ dateFrom: '2026-08-10', dateTo: '2026-08-01' }).success,
    ).toBe(false);
    expect(netWorthQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(netWorthQuerySchema.safeParse({ granularity: 'hour' }).success).toBe(false);
  });
});
