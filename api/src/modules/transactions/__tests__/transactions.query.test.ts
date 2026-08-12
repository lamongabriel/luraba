import { describe, expect, it } from 'vitest';
import { ListTransactionsRequestQuerySchema } from '../transactions.query';

describe('transactions list query', () => {
  it('parses every column filter and combines search with structured fields', () => {
    const id = '1456d4ee-2f8d-4cec-92be-a780d54312c2';
    const query = ListTransactionsRequestQuerySchema.parse({
      search: 'Salary',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      purchaseDateFrom: '2025-01-01',
      purchaseDateTo: '2025-12-31',
      originTypes: 'income,transfer',
      accountIds: id,
      creditCardIds: id,
      categoryIds: id,
      merchantIds: id,
      tagIds: id,
      paymentMethodCodes: 'pix,cash',
      currencyCodes: 'BRL,USD',
      amountMin: 1,
      amountMax: 100000,
      includeInBudget: 'true',
      uncategorized: 'true',
    });

    expect(query.search).toBe('Salary');
    expect(query.originTypes).toEqual(['income', 'transfer']);
    expect(query.includeInBudget).toBe(true);
    expect(query.uncategorized).toBe(true);
  });

  it('rejects invalid ranges, booleans, enums, and unknown fields', () => {
    expect(
      ListTransactionsRequestQuerySchema.safeParse({ amountMin: 2, amountMax: 1 }).success,
    ).toBe(false);
    expect(ListTransactionsRequestQuerySchema.safeParse({ includeInBudget: 'yes' }).success).toBe(
      false,
    );
    expect(ListTransactionsRequestQuerySchema.safeParse({ originTypes: 'refund' }).success).toBe(
      false,
    );
    expect(
      ListTransactionsRequestQuerySchema.safeParse({ excludedFromSpending: 'false' }).success,
    ).toBe(false);
    expect(
      ListTransactionsRequestQuerySchema.safeParse({ updatedAtFrom: '2025-01-01' }).success,
    ).toBe(false);
    expect(ListTransactionsRequestQuerySchema.safeParse({ unknown: true }).success).toBe(false);
  });
});
