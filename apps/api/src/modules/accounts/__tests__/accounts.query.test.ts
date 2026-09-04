import { listAccountsQuerySchema } from '@luraba/contracts/accounts';
import { listAccountTransactionsQuerySchema } from '@luraba/contracts/transactions';
import { describe, expect, it } from 'vitest';

const id = '1456d4ee-2f8d-4cec-92be-a780d54312c2';

describe('accounts list queries', () => {
  it('parses every account column filter and rejects invalid ranges and unknown fields', () => {
    const query = listAccountsQuerySchema.parse({
      types: 'cash,loan',
      subtypes: 'checking,mortgage',
      classifications: 'asset',
      currencyCodes: 'BRL,USD',
      balanceMin: '-100',
      balanceMax: '100',
      hasInstitution: 'true',
      createdAtFrom: '2025-01-01',
      createdAtTo: '2025-12-31',
      updatedAtFrom: '2025-01-01',
      updatedAtTo: '2025-12-31',
    });

    expect(query.types).toEqual(['cash', 'loan']);
    expect(query.subtypes).toEqual(['checking', 'mortgage']);
    expect(query.hasInstitution).toBe(true);
    expect(listAccountsQuerySchema.safeParse({ balanceMin: 2, balanceMax: 1 }).success).toBe(false);
    expect(listAccountsQuerySchema.safeParse({ nope: true }).success).toBe(false);
  });

  it('reuses transaction filters without exposing account/card selectors', () => {
    expect(
      listAccountTransactionsQuerySchema.parse({
        search: 'salary',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        purchaseDateFrom: '2025-01-01',
        purchaseDateTo: '2025-12-31',
        originTypes: 'income,transfer',
        categoryIds: id,
        merchantIds: id,
        tagIds: id,
        paymentMethodCodes: 'pix',
        currencyCodes: 'BRL',
        amountMin: 1,
        amountMax: 100,
        includeInBudget: 'true',
      }).originTypes,
    ).toEqual(['income', 'transfer']);
    expect(listAccountTransactionsQuerySchema.safeParse({ accountIds: id }).success).toBe(false);
    expect(listAccountTransactionsQuerySchema.safeParse({ creditCardIds: id }).success).toBe(false);
  });
});
