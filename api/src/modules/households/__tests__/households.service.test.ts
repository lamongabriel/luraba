import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import { createUser } from '@/test/factories';
import { householdsRepository } from '../households.repository';
import * as householdsService from '../households.service';

describe('households service', () => {
  it('listHouseholds auto-creates a default household for a user with none', async () => {
    const user = await createUser();

    const households = await householdsService.listHouseholds(user.id);

    expect(households).toHaveLength(1);
    expect(households[0]?.name).toContain(user.name);

    const defaults = await householdsRepository.findUserDefaults(user.id);
    expect(defaults?.defaultHouseholdId).toBe(households[0]?.id);
  });

  it('createHousehold creates an owner membership for the creator', async () => {
    const context = await createAuthenticatedContext();

    const household = await householdsService.createHousehold(context.user.id, {
      name: 'New Household',
      description: 'For testing',
      defaultCurrencyId: 'USD',
      countryCode: 'US',
      timezone: 'UTC',
      budgetMonthStartsOn: 5,
      creditExpenseTiming: 'payment_month',
      creditInstallmentBudgetMode: 'full_amount',
    });

    expect(household.name).toBe('New Household');
    expect(household.defaultCurrencyId).toBe('USD');
    expect(household.timezone).toBe('UTC');

    const membership = await householdsRepository.findMembership(household.id, context.user.id);
    expect(membership?.role).toBe('owner');
  });

  it('updateMemberRole does not allow demoting the last owner', async () => {
    const context = await createAuthenticatedContext();

    await expect(
      householdsService.updateMemberRole(context.householdContext, context.household.id, context.user.id, {
        role: 'admin',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('createInvite and acceptInvite add the invited user as a member', async () => {
    const owner = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'invited-household@example.com' });

    const invite = await householdsService.createInvite(owner.householdContext, owner.household.id, {
      email: invitedUser.email,
      role: 'member',
    });

    expect(invite.email).toBe(invitedUser.email);
    expect(invite.status).toBe('pending');

    await householdsService.acceptInvite(invitedUser.id, invitedUser.email, invite.id);

    const membership = await householdsRepository.findMembership(owner.household.id, invitedUser.id);
    expect(membership?.role).toBe('member');

    const pendingInvites = await householdsService.listMyPendingInvites(invitedUser.email);
    expect(pendingInvites).toHaveLength(0);
  });
});
