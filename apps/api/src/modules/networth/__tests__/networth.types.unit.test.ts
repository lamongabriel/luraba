import { describe, expect, it } from 'vitest';
import { NetWorthQuerySchema } from '../networth.types';

describe('net worth query', () => {
  it('applies bounded defaults and accepts display controls', () => {
    expect(
      NetWorthQuerySchema.parse({ displayCurrencyCode: 'usd', granularity: 'month' }),
    ).toMatchObject({ displayCurrencyCode: 'USD', granularity: 'month', limit: 10 });
  });

  it('rejects reversed ranges and unsafe limits', () => {
    expect(
      NetWorthQuerySchema.safeParse({ dateFrom: '2026-08-10', dateTo: '2026-08-01' }).success,
    ).toBe(false);
    expect(NetWorthQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(NetWorthQuerySchema.safeParse({ granularity: 'hour' }).success).toBe(false);
  });
});
