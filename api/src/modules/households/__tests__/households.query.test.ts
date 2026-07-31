import { describe, expect, it } from 'vitest';
import {
  ListHouseholdInvitesRequestQuerySchema,
  ListHouseholdMembersRequestQuerySchema,
  ListHouseholdsRequestQuerySchema,
  ListMyHouseholdInvitesRequestQuerySchema,
} from '../households.query';

describe('households list queries', () => {
  it('parses every household filter', () => {
    const query = ListHouseholdsRequestQuerySchema.parse({
      roles: 'owner,member',
      countryCodes: 'BR,US',
      defaultCurrencyCodes: 'BRL,USD',
      timezones: 'America/Sao_Paulo,UTC',
      budgetMonthStartsOnMin: 1,
      budgetMonthStartsOnMax: 31,
      creditExpenseTimings: 'spend_month,payment_month',
      creditInstallmentBudgetModes: 'per_installment,full_amount',
      createdAtFrom: '2025-01-01',
      createdAtTo: '2025-12-31',
      updatedAtFrom: '2025-01-01',
      updatedAtTo: '2025-12-31',
    });

    expect(query.roles).toEqual(['owner', 'member']);
    expect(
      ListHouseholdsRequestQuerySchema.safeParse({
        budgetMonthStartsOnMin: 20,
        budgetMonthStartsOnMax: 10,
      }).success,
    ).toBe(false);
  });

  it('parses member and invite filters, including personal household IDs', () => {
    const id = '1456d4ee-2f8d-4cec-92be-a780d54312c2';
    expect(ListHouseholdMembersRequestQuerySchema.parse({ roles: 'member' }).roles).toEqual([
      'member',
    ]);
    expect(
      ListHouseholdInvitesRequestQuerySchema.parse({
        roles: 'admin',
        statuses: 'pending,revoked',
        createdAtFrom: '2025-01-01',
        createdAtTo: '2025-12-31',
      }).statuses,
    ).toEqual(['pending', 'revoked']);
    expect(
      ListMyHouseholdInvitesRequestQuerySchema.parse({ householdIds: id }).householdIds,
    ).toEqual([id]);
    expect(ListHouseholdMembersRequestQuerySchema.safeParse({ unknown: true }).success).toBe(false);
  });
});
