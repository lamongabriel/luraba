import {
  listHouseholdInvitesQuerySchema,
  listHouseholdMembersQuerySchema,
  listHouseholdsQuerySchema,
  listMyHouseholdInvitesQuerySchema,
} from '@luraba/contracts/households';
import { describe, expect, it } from 'vitest';

describe('households list queries', () => {
  it('parses every household filter', () => {
    const query = listHouseholdsQuerySchema.parse({
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
      listHouseholdsQuerySchema.safeParse({
        budgetMonthStartsOnMin: 20,
        budgetMonthStartsOnMax: 10,
      }).success,
    ).toBe(false);
  });

  it('parses member and invite filters, including personal household IDs', () => {
    const id = '1456d4ee-2f8d-4cec-92be-a780d54312c2';
    const members = listHouseholdMembersQuerySchema.parse({
      roles: 'member',
      emailVerified: true,
      lastActiveAtFrom: '2025-01-01',
      lastActiveAtTo: '2025-12-31',
      sort: 'lastActiveAt',
    });
    expect(members.roles).toEqual(['member']);
    expect(members.emailVerified).toBe(true);
    expect(
      listHouseholdInvitesQuerySchema.parse({
        roles: 'admin',
        statuses: 'pending,expired,canceled',
        createdAtFrom: '2025-01-01',
        createdAtTo: '2025-12-31',
        expiresAtFrom: '2025-01-01',
        expiresAtTo: '2025-12-31',
        sort: 'expiresAt',
      }).statuses,
    ).toEqual(['pending', 'expired', 'canceled']);
    expect(listMyHouseholdInvitesQuerySchema.parse({ householdIds: id }).householdIds).toEqual([
      id,
    ]);
    expect(listHouseholdMembersQuerySchema.safeParse({ unknown: true }).success).toBe(false);
    expect(listHouseholdInvitesQuerySchema.safeParse({ statuses: 'revoked' }).success).toBe(false);
  });
});
